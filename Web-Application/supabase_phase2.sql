-- Create lectures_processing table for background jobs
CREATE TABLE IF NOT EXISTS lectures_processing (
    id TEXT PRIMARY KEY,
    lecture_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'uploading', 'processing', 'generating', 'completed', 'failed')),
    stage TEXT,
    progress INTEGER DEFAULT 0,
    error TEXT,
    attempts INTEGER DEFAULT 0,
    audio_file TEXT,
    video_file TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_lecture FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
);

-- Turn on Row Level Security
ALTER TABLE lectures_processing ENABLE ROW LEVEL SECURITY;

-- Professors and service_role can read/write
CREATE POLICY "Professors can manage processing jobs" ON lectures_processing FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'professor')
);

-- Enable realtime on lectures_processing so the UI can update live
alter publication supabase_realtime add table lectures_processing;
