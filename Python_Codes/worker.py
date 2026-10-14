import os
import time
import traceback
from pathlib import Path
from urllib.parse import unquote, urlparse
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))

def get_supabase_client() -> Client:
    # Use the service role key to bypass RLS for the background worker
    url: str = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    
    if not url or not key:
        raise ValueError("Supabase URL and Key must be set in .env")
        
    return create_client(url, key)

def update_job_status(supabase: Client, job_id: str, status: str, stage: str = None, error: str = None, progress: int = None):
    update_data = {"status": status}
    if stage:
        update_data["stage"] = stage
    if error is not None:
        update_data["error"] = error
    if progress is not None:
        update_data["progress"] = progress
        
    try:
        supabase.table("lectures_processing").update(update_data).eq("id", job_id).execute()
        print(f"[{job_id}] Status updated to '{status}' (Stage: {stage})")
    except Exception as e:
        print(f"Failed to update job status for {job_id}: {e}")

def task_from_media_url(media_url: str | None, lecture_id: str) -> list[str]:
    """Return the exact GCS course/folder path used by the web uploader."""
    if media_url:
        path = unquote(urlparse(media_url).path).lstrip("/")
        marker = "/courses/"
        if marker in f"/{path}":
            parts = f"/{path}".split(marker, 1)[1].split("/")
            if len(parts) >= 4 and parts[1] == "lectures":
                return [parts[0], parts[2]]
    # Legacy fallback. IDs lose dashes, so queued media URLs are preferred.
    if "-l" not in lecture_id:
        raise ValueError(f"Invalid lecture_id format: {lecture_id}")
    course_id, lecture_number = lecture_id.rsplit("-l", 1)
    return [course_id, lecture_number]

def claim_job(supabase: Client, job: dict) -> bool:
    """
    Atomically move a job from 'pending' to 'processing'.

    The update only matches while the row is still pending, so when several
    workers poll at once only one of them gets the row back.
    """
    response = (
        supabase.table("lectures_processing")
        .update({
            "status": "processing",
            "stage": "initializing",
            "progress": 2,
            "error": None,
            "attempts": (job.get("attempts") or 0) + 1,
        })
        .eq("id", job["id"])
        .eq("status", "pending")
        .execute()
    )
    return bool(response.data)


def process_jobs():
    # Imported here so the worker's helpers can be tested without loading the
    # ML stack (torch, transformers, ...).
    from pipeline import run_pipeline

    supabase = get_supabase_client()
    print("🚀 Worker started. Listening for new jobs...")
    
    while True:
        # Reset every iteration: a failure while polling must never mark the
        # previous (already finished) job as failed.
        job_id = None
        try:
            # Find a pending job
            response = supabase.table("lectures_processing").select("*").eq("status", "pending").order("created_at").limit(1).execute()
            jobs = response.data
            
            if not jobs:
                time.sleep(5)  # Wait for 5 seconds before checking again
                continue
                
            job = jobs[0]
            if not claim_job(supabase, job):
                continue  # another worker took it first
            job_id = job["id"]
            lecture_id = job["lecture_id"]
            
            print(f"\n" + "="*50)
            print(f"📥 Picked up new job: {job_id} for lecture: {lecture_id}")
            
            task = task_from_media_url(job.get("audio_file") or job.get("video_file"), lecture_id)
            
            # Progress callback for the pipeline
            def progress_callback(progress, stage):
                update_job_status(supabase, job_id, "processing", stage=stage, progress=progress)
            
            # Run the existing pipeline
            # The pipeline might throw exceptions, we catch them to fail the job
            run_pipeline(task, progress_callback=progress_callback)
            
            update_job_status(supabase, job_id, "completed", stage="done", progress=100)
            print(f"✅ Job {job_id} completed successfully!")
            
        except KeyboardInterrupt:
            if job_id:
                update_job_status(supabase, job_id, "failed", error="Worker stopped while processing")
            raise
        except Exception as e:
            print(f"❌ Error processing job: {e}")
            traceback.print_exc()
            if job_id:
                update_job_status(supabase, job_id, "failed", error=str(e)[:2000])
            time.sleep(5)  # Wait a bit before retrying another job

if __name__ == "__main__":
    process_jobs()
