#!/usr/bin/env python3
"""
upload_lecture_content.py

Usage:
    pip install python-dotenv requests
    python upload_lecture_content.py --file lecture_content.json

This script does an UPSERT into the `lecture_content` table using Supabase PostgREST:
  POST <SUPABASE_URL>/rest/v1/lecture_content?on_conflict=lecture_id
Headers:
  - apikey: <SUPABASE_KEY>
  - Authorization: Bearer <SUPABASE_KEY>
  - Prefer: resolution=merge-duplicates
"""

import os
import json
import argparse
from datetime import date, datetime, timezone
from dotenv import load_dotenv
import requests
from typing import List, Dict, Optional

load_dotenv()  # loads variables from .env

SUPABASE_URL = os.getenv("SUPABASE_URL")
# Prefer the service-role key for this trusted server-side job; fall back to SUPABASE_KEY.
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

REST_ENDPOINT = f"{(SUPABASE_URL or '').rstrip('/')}/rest/v1/lecture_content"
REST_LECTURES_ENDPOINT = f"{(SUPABASE_URL or '').rstrip('/')}/rest/v1/lectures"

HEADERS = {
    "apikey": SUPABASE_KEY or "",
    "Authorization": f"Bearer {SUPABASE_KEY or ''}",
    "Content-Type": "application/json",
    # Merge duplicates on conflict (upsert behavior)
    "Prefer": "resolution=merge-duplicates, return=representation"
}


def _require_env() -> None:
    """Validate credentials lazily so importing this module never kills the process."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) must be set in the .env file"
        )

def read_json_file(path: str) -> List[Dict]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("JSON file must contain an array of objects at top-level")
    return data

def upload_batch(records: List[Dict]) -> requests.Response:
    """
    Upload a batch of records via POST with on_conflict=lecture_id (upsert).
    Returns the requests.Response object.
    """
    params = {"on_conflict": "lecture_id"}
    payload = json.dumps(records)
    resp = requests.post(REST_ENDPOINT, headers=HEADERS, params=params, data=payload, timeout=30)
    return resp


def lecture_exists(lecture_id: str) -> bool:
    """Check whether a lecture with the given id exists in the `lectures` table."""
    try:
        resp = requests.get(
            REST_LECTURES_ENDPOINT,
            headers=HEADERS,
            params={"id": f"eq.{lecture_id}", "select": "id"},
            timeout=15,
        )
        if resp.status_code == 200:
            data = resp.json()
            return len(data) > 0
        else:
            print(f"Warning: could not check lecture existence (HTTP {resp.status_code}), assuming missing")
            return False
    except requests.RequestException as e:
        print("Warning: request failed when checking lecture existence:", e)
        return False


def create_lecture(
    lecture_id: str,
    course_id: str,
    number: int,
    topic: Optional[str] = None,
    lecture_date: Optional[str] = None,
) -> bool:
    """Create a parent row in `lectures` matching the schema
    (id, number, date, topic, course_id).

    Returns True on success (201/200), False otherwise.
    """
    payload = {
        "id": lecture_id,
        "number": number,
        "date": lecture_date or date.today().isoformat(),
        "topic": topic or f"Lecture {number}",
        "course_id": course_id,
    }
    try:
        resp = requests.post(REST_LECTURES_ENDPOINT, headers=HEADERS, data=json.dumps([payload]), timeout=15)
        if resp.status_code in (200, 201):
            print(f"Created lecture '{lecture_id}'")
            return True
        else:
            print(f"Failed to create lecture {lecture_id}: HTTP {resp.status_code}")
            try:
                print("Response:", resp.json())
            except ValueError:
                print("Response text:", resp.text)
            return False
    except requests.RequestException as e:
        print("Request failed when creating lecture:", e)
        return False

# Columns of the lecture_content table. Anything else the LLM adds to the merged
# JSON (e.g. "meta") would make PostgREST reject the whole batch.
LECTURE_CONTENT_COLUMNS = {
    "id", "lecture_id", "topic", "definition", "recording_url", "book_reference", "content_data",
}


def prepare_record(record: Dict) -> Dict:
    """
    Keep only real table columns, ensure content_data is proper JSON,
    and refresh updated_at so the web app can tell the content changed.
    """
    rec = {k: v for k, v in record.items() if k in LECTURE_CONTENT_COLUMNS}
    rec["updated_at"] = datetime.now(timezone.utc).isoformat()
    # Ensure content_data is a JSON serializable object (dict/list/primitive)
    if "content_data" in rec and rec["content_data"] is None:
        rec["content_data"] = {}  # or keep null if you prefer
    return rec

def run_code(
    file_path: str = "merged_all_in_one_gemini.json",
    create_missing_lectures: bool = False,
    course_id: Optional[str] = None,
    lecture_number: Optional[int] = None,
    batch_size: int = 50,
) -> None:
    """Upsert lecture_content rows from a JSON array file into Supabase.

    When create_missing_lectures is True, course_id and lecture_number are used to
    create the parent `lectures` row if it does not exist yet (avoids FK errors).
    """
    _require_env()
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"JSON file not found: {file_path} -- pass --file / create the default file")

    records = read_json_file(file_path)
    print(f"Read {len(records)} records from {file_path}")

    # Prepare records
    prepared = [prepare_record(r) for r in records]

    # Optionally ensure parent `lectures` rows exist to avoid FK constraint errors
    if create_missing_lectures:
        if not course_id or lecture_number is None:
            raise ValueError("course_id and lecture_number are required when create_missing_lectures=True")
        print("Checking for missing parent lectures (this may create rows)...")
        checked: set = set()
        for rec in prepared:
            lecture_id = rec.get("lecture_id")
            if not lecture_id:
                continue
            if lecture_id in checked:
                continue
            checked.add(lecture_id)
            if not lecture_exists(lecture_id):
                ok = create_lecture(
                    lecture_id,
                    course_id=course_id,
                    number=lecture_number,
                    topic=rec.get("topic"),
                )
                if not ok:
                    print(f"Warning: failed to create parent lecture {lecture_id}. Upload may still fail.")

    # Upload in batches (helps with large files)
    batch_size = max(1, batch_size)
    for i in range(0, len(prepared), batch_size):
        batch = prepared[i:i + batch_size]
        print(f"Uploading batch {i // batch_size + 1} ({len(batch)} records)...")
        resp = upload_batch(batch)  # network errors propagate to the caller

        if resp.status_code in (200, 201, 204):
            # 200/201 may return JSON of inserted/updated rows if 'return=representation' requested.
            print(f"Batch uploaded successfully (status {resp.status_code})")
        else:
            # Show server error message/body if available
            try:
                body = resp.json()
            except ValueError:
                body = resp.text
            raise RuntimeError(f"Error uploading batch: HTTP {resp.status_code}: {body}")

    print("All batches uploaded successfully.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload lecture_content JSON to Supabase")
    parser.add_argument("--file", "-f", default="merged_all_in_one_gemini.json", help="Path to JSON file (array of objects). Defaults to 'merged_all_in_one_gemini.json' if omitted.")
    parser.add_argument("--create-missing-lectures", action="store_true", help="If set, the script will attempt to create missing parent rows in `lectures` before uploading lecture_content.")
    parser.add_argument("--course-id", help="Course id (e.g. ic-112); required with --create-missing-lectures")
    parser.add_argument("--lecture-number", type=int, help="Lecture number; required with --create-missing-lectures")
    parser.add_argument("--batch-size", "-b", type=int, default=50, help="How many rows to send per request")
    args = parser.parse_args()
    try:
        run_code(
            file_path=args.file,
            create_missing_lectures=args.create_missing_lectures,
            course_id=args.course_id,
            lecture_number=args.lecture_number,
            batch_size=args.batch_size,
        )
    except Exception as e:
        raise SystemExit(f"Error: {e}")


if __name__ == "__main__":
    main()
