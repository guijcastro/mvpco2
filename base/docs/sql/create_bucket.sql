-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Create the storage bucket 'audios'
INSERT INTO storage.buckets (id, name, public)
VALUES ('audios', 'audios', false) -- Private bucket, access via signed URLs
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS policies for the bucket (allow authenticated users to upload/view)
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'audios');

CREATE POLICY "Authenticated users can view their own files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'audios' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can update their own files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'audios' AND auth.uid()::text = (storage.foldername(name))[1]);

-- If you are still testing and want easier access, uncomment below (LESS SECURE):
-- CREATE POLICY "Give me access to everything" ON storage.objects FOR ALL USING (bucket_id = 'audios');
