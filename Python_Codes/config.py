"""
Central configuration for the Smart Scribes pipeline.

Everything that used to be hardcoded (ffmpeg path, bucket name, book file
names, model names) lives here and can be overridden via environment
variables / the .env file.
"""

import os
import shutil
from pathlib import Path

from dotenv import load_dotenv

# Always load the pipeline configuration next to this module.  Relying on the
# process working directory made credentials disappear when the worker started
# from the repository root or a service manager.
load_dotenv(Path(__file__).with_name(".env"))


def _resolve_ffmpeg() -> str:
    """Find ffmpeg: FFMPEG_PATH env var first, then the system PATH."""
    env_path = os.getenv("FFMPEG_PATH")
    if env_path:
        return env_path
    found = shutil.which("ffmpeg")
    if found:
        return found
    raise RuntimeError(
        "ffmpeg not found. Install it and add it to PATH, "
        "or set FFMPEG_PATH in your .env file."
    )


# --- External tools ---------------------------------------------------------
FFMPEG_PATH = _resolve_ffmpeg()

# --- Google Cloud Storage ---------------------------------------------------
BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "smart-scribes")

# --- Book / reference material ---------------------------------------------
# Name used for the locally downloaded course PDF and its derived artifacts.
BOOK_NAME = os.getenv("BOOK_NAME", "course_book")
BOOK_DIR = "book"
BOOK_PDF_PATH = os.path.join(BOOK_DIR, f"{BOOK_NAME}.pdf")
BOOK_METADATA_PATH = os.path.join("output", f"{BOOK_NAME}_metadata.json")
BOOK_EMBEDDINGS_PATH = os.path.join("book_embeddings", BOOK_NAME)

# --- LLM models -------------------------------------------------------------
# Provider: "aws" (Bedrock/Claude) or "gemini"
DEFAULT_LLM_PROVIDER = os.getenv("DEFAULT_LLM_PROVIDER", "aws")


def make_lecture_id(course_id: str, lecture_folder: str) -> str:
    """
    Canonical lecture ID shared by the pipeline and the web app.

    Matches the seed data format, e.g. course 'ic-112' + folder '1-1761663067632'
    -> 'ic112-l1'. Keep in sync with makeLectureId() in
    Web-Application/src/lib/ids.ts.
    """
    lecture_number = str(lecture_folder).split("-")[0]
    return f"{course_id.replace('-', '')}-l{lecture_number}"


def lecture_number_from_folder(lecture_folder: str) -> int | None:
    """Extract the numeric lecture number from a GCS folder like '19-1761641030325'."""
    head = str(lecture_folder).split("-")[0]
    return int(head) if head.isdigit() else None
