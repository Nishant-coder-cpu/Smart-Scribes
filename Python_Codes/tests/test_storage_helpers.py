import json
import os

import google_storage_code as gsc


def test_filtered_images_handles_metadata_dicts(tmp_path, monkeypatch):
    # Regression: image metadata entries are dicts, which used to crash os.path.join.
    monkeypatch.chdir(tmp_path)
    os.makedirs("output/book_images")
    (tmp_path / "output/book_images/page_12img1.png").write_bytes(b"png")
    metadata = [
        {"page": 12, "images": [{"file_path": "output/book_images/page_12img1.png", "page": 12, "image_id": "12_1"}]},
        {"page": 13, "images": []},
    ]
    os.makedirs(os.path.dirname(gsc.BOOK_METADATA_PATH), exist_ok=True)
    with open(gsc.BOOK_METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f)
    with open("merged_all_in_one_gemini.json", "w", encoding="utf-8") as f:
        json.dump({"topics": [{"book_references": ["course_book, Page 12 (Relevance: 40%)", {"bad": "ref"}]}]}, f)

    images = gsc.filtered_images()

    assert images == [("page_12img1.png", 12)]
    assert (tmp_path / "segregated_images/page_12img1.png").exists()


def test_filtered_images_without_book(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    assert gsc.filtered_images() == []
