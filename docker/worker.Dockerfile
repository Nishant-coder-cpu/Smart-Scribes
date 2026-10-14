# Smart Scribes processing worker (Python_Codes/worker.py).
#
# Build from the repository root:
#   docker compose build worker
#
# The worker renders LLM-generated Manim code, so it runs as an unprivileged
# user in its own container (see docker-compose.yml for the hardening flags).
FROM python:3.10-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    MPLBACKEND=Agg

# ffmpeg: audio/video decoding and Manim output
# cairo/pango + build tools: Manim's rendering stack
# libgl1/libglib2.0-0: OpenCV / EasyOCR runtime libraries
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg build-essential pkg-config \
        libcairo2-dev libpango1.0-dev \
        libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first so code changes don't re-download PyTorch.
COPY requirements.txt /tmp/requirements.txt
RUN pip install -r /tmp/requirements.txt

RUN useradd --create-home --uid 10001 scribe \
    && chown scribe:scribe /app
COPY --chown=scribe:scribe Python_Codes/ /app/

USER scribe
CMD ["python", "worker.py"]
