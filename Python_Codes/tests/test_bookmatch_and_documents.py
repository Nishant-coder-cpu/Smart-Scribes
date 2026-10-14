import json

import numpy as np

from MultiModal.generate import LectureDocumentGenerator
from MultiModal.lecture_to_bookmatch import LectureBookMatcher, combine_embeddings


def test_combine_embeddings_weights_by_available_content():
    audio = np.array([[1.0, 0.0], [1.0, 0.0], [0.0, 0.0]])
    video = np.array([[0.0, 1.0], [0.0, 0.0], [0.0, 2.0]])
    transcripts = ["we discuss sorting", "pivot choice", ""]
    out = combine_embeddings(audio, video, transcripts, audio_weight=0.7)
    np.testing.assert_allclose(out[0], [0.7, 0.3])   # both sides present
    np.testing.assert_allclose(out[1], [1.0, 0.0])   # no screen text -> audio only
    np.testing.assert_allclose(out[2], [0.0, 1.0])   # silent segment -> video only


def test_empty_transcript_ignores_audio_vector():
    # Whisper output for silence still embeds to a non-zero vector.
    out = combine_embeddings(np.array([[1.0, 0.0]]), np.array([[0.0, 1.0]]), [""], 0.7)
    np.testing.assert_allclose(out[0], [0.0, 1.0])


def test_matching_without_a_book_returns_no_references():
    matcher = LectureBookMatcher()
    assert matcher.find_relevant_book_sections(np.ones((3, 4))) == []


def test_matching_skips_all_zero_segments():
    matcher = LectureBookMatcher(similarity_threshold=0.5)
    matcher.book_embeddings = np.array([[1.0, 0.0], [0.0, 1.0]])
    matcher.book_metadata = [
        {"text": "a", "page": 1, "book_name": "book"},
        {"text": "b", "page": 2, "book_name": "book"},
    ]
    refs = matcher.find_relevant_book_sections(np.array([[1.0, 0.0], [0.0, 0.0]]), top_k=1)
    assert [r["page"] for r in refs] == [1]


def test_full_document_accepts_segment_dict(tmp_path, monkeypatch):
    # Regression: the dict branch used key.split(''), which always raised ValueError.
    monkeypatch.setenv("PIPELINE_DISABLE_LLM", "true")
    segments = {
        "segment_2": {"timestamp_start": 5, "timestamp_end": 10, "lecture_audio_text": "second", "book_references": []},
        "segment_1": {"timestamp_start": 0, "timestamp_end": 5, "lecture_audio_text": "first", "book_references": []},
    }
    out = tmp_path / "doc.txt"
    document = LectureDocumentGenerator().generate_full_document(segments, output_path=str(out))
    assert document.index("SEGMENT 1:") < document.index("SEGMENT 2:")
    assert out.read_text(encoding="utf-8") == document
