-- Fix RLS policies for user_settings table
-- Run this in Supabase SQL Editor

-- 1. Enable RLS on user_settings (if not already enabled)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (if any)
DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;

-- 3. Create new policies
-- Allow users to SELECT their own settings
CREATE POLICY "Users can view own settings"
ON user_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to INSERT their own settings
CREATE POLICY "Users can insert own settings"
ON user_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE their own settings
CREATE POLICY "Users can update own settings"
ON user_settings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RLS policies for audio_files table
-- ============================================
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own audio files" ON audio_files;
DROP POLICY IF EXISTS "Users can insert own audio files" ON audio_files;
DROP POLICY IF EXISTS "Users can update own audio files" ON audio_files;
DROP POLICY IF EXISTS "Users can delete own audio files" ON audio_files;

CREATE POLICY "Users can view own audio files"
ON audio_files
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audio files"
ON audio_files
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audio files"
ON audio_files
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own audio files"
ON audio_files
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- RLS policies for transcriptions table
-- ============================================
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Users can insert own transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Users can update own transcriptions" ON transcriptions;
DROP POLICY IF EXISTS "Users can delete own transcriptions" ON transcriptions;

-- Users can view transcriptions for their own audio files
CREATE POLICY "Users can view own transcriptions"
ON transcriptions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM audio_files
        WHERE audio_files.id = transcriptions.audio_id
        AND audio_files.user_id = auth.uid()
    )
);

-- Users can insert transcriptions for their own audio files
CREATE POLICY "Users can insert own transcriptions"
ON transcriptions
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM audio_files
        WHERE audio_files.id = transcriptions.audio_id
        AND audio_files.user_id = auth.uid()
    )
);

-- Users can update transcriptions for their own audio files
CREATE POLICY "Users can update own transcriptions"
ON transcriptions
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM audio_files
        WHERE audio_files.id = transcriptions.audio_id
        AND audio_files.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM audio_files
        WHERE audio_files.id = transcriptions.audio_id
        AND audio_files.user_id = auth.uid()
    )
);

-- Users can delete transcriptions for their own audio files
CREATE POLICY "Users can delete own transcriptions"
ON transcriptions
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM audio_files
        WHERE audio_files.id = transcriptions.audio_id
        AND audio_files.user_id = auth.uid()
    )
);
