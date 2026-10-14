import os
import sys
from pathlib import Path

# Make the pipeline modules importable as top-level modules, as worker.py does.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# config.py resolves ffmpeg at import time; tests never actually run it.
os.environ.setdefault("FFMPEG_PATH", "ffmpeg")
