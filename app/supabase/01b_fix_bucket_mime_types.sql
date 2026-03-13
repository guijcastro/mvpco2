-- ============================================================
-- MVPCO — Script 01b: Correção do Bucket de Áudio
-- Execute no Supabase SQL Editor se o 01 não configurou os tipos corretos
-- https://supabase.com/dashboard/project/kikhexoxlkzofccnnkze/sql
-- ============================================================

-- Atualiza o bucket com todos os formatos de áudio aceitos
-- `audio/mpeg` é o MIME type correto para arquivos .mp3
UPDATE storage.buckets
SET
  file_size_limit = 524288000,   -- 500 MB
  allowed_mime_types = ARRAY[
    'audio/mpeg',      -- .mp3 (formato principal)
    'audio/mp3',       -- .mp3 variante
    'audio/mp4',       -- .m4a / .mp4 audio
    'audio/m4a',       -- .m4a
    'audio/x-m4a',     -- .m4a variante
    'audio/wav',       -- .wav
    'audio/wave',      -- .wav variante
    'audio/x-wav',     -- .wav variante
    'audio/ogg',       -- .ogg
    'audio/webm',      -- .webm audio
    'audio/aac',       -- .aac
    'audio/flac',      -- .flac
    'audio/x-flac',    -- .flac variante
    'video/mp4',       -- alguns gravadores salvam áudio como .mp4
    'video/mpeg'       -- .mpeg
  ]
WHERE id = 'audios';

-- Verifica o resultado
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'audios';
