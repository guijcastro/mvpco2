-- ============================================================
-- MVPCO — Script 01: Auth e Storage Bucket
-- Execute no Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/kikhexoxlkzofccnnkze/sql
-- ============================================================

-- 1. Criar bucket privado para áudios
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audios',
  'audios',
  false,
  524288000,  -- 500 MB por arquivo
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/m4a', 'audio/x-m4a']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: usuário só acessa seus próprios arquivos (pasta = user_id/)
CREATE POLICY "users_own_audio_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audios' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users_own_audio_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audios' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users_own_audio_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'audios' AND auth.uid()::text = (storage.foldername(name))[1]);
