-- Smart Scribes: bring an existing lectures_processing table up to date.
-- Safe to run more than once. Run in the Supabase SQL Editor.
--
-- Needed if the table was created from the old lectures_processing_table.sql,
-- whose CHECK constraint rejects the 'pending' / 'failed' statuses the worker
-- uses and which lacks the stage / progress / error / attempts columns.

ALTER TABLE public.lectures_processing ADD COLUMN IF NOT EXISTS stage TEXT;
ALTER TABLE public.lectures_processing ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
ALTER TABLE public.lectures_processing ADD COLUMN IF NOT EXISTS error TEXT;
ALTER TABLE public.lectures_processing ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;

ALTER TABLE public.lectures_processing DROP CONSTRAINT IF EXISTS lectures_processing_status_check;
ALTER TABLE public.lectures_processing ADD CONSTRAINT lectures_processing_status_check
  CHECK (status IN ('pending', 'uploading', 'processing', 'generating', 'completed', 'failed'));

-- The worker polls for the oldest pending job.
CREATE INDEX IF NOT EXISTS idx_lectures_processing_status_created
  ON public.lectures_processing (status, created_at);
CREATE INDEX IF NOT EXISTS idx_lectures_processing_lecture_id
  ON public.lectures_processing (lecture_id);

-- Keep updated_at fresh so the dashboard shows when the worker last reported.
CREATE OR REPLACE FUNCTION update_lectures_processing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lectures_processing_timestamp ON public.lectures_processing;
CREATE TRIGGER update_lectures_processing_timestamp
BEFORE UPDATE ON public.lectures_processing
FOR EACH ROW
EXECUTE FUNCTION update_lectures_processing_updated_at();
