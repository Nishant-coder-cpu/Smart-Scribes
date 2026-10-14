-- Security Schema Updates for Smart Scribes

-- 1. Create Profiles Table (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('student', 'professor', 'admin')),
    full_name TEXT NOT NULL,
    institute_id TEXT REFERENCES institutes(id),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on Row Level Security for all tables
ALTER TABLE institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecture_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Institutes: everyone can read
CREATE POLICY "Institutes are readable by everyone" ON institutes FOR SELECT USING (true);

-- Courses: everyone can read, professors can insert/update
CREATE POLICY "Courses are readable by everyone" ON courses FOR SELECT USING (true);
CREATE POLICY "Professors can insert courses" ON courses FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'professor')
);

-- Lectures & Lecture Content: everyone can read, professors can insert/update
CREATE POLICY "Lectures are readable by everyone" ON lectures FOR SELECT USING (true);
CREATE POLICY "Professors can insert lectures" ON lectures FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'professor')
);
CREATE POLICY "Lecture content is readable by everyone" ON lecture_content FOR SELECT USING (true);
CREATE POLICY "Professors can insert/update lecture content" ON lecture_content FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'professor')
);

-- Profiles: users can read their own profile, everyone can read names/roles
CREATE POLICY "Profiles are readable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Doubts: students can insert, professors can reply
CREATE POLICY "Doubts are readable by everyone" ON doubts FOR SELECT USING (true);
CREATE POLICY "Students can insert doubts" ON doubts FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
);
CREATE POLICY "Professors can update doubts (reply)" ON doubts FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'professor')
);

-- Slides: everyone can read, professors can upload (requires slides_table.sql)
ALTER TABLE slides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Slides are readable by everyone" ON slides FOR SELECT USING (true);
CREATE POLICY "Professors can insert slides" ON slides FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'professor')
);
