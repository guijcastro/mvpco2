-- ============================================================
-- MVPCO — Script 02: Tabelas Base
-- Execute APÓS 01_auth_and_storage.sql
-- ============================================================

-- 1. Arquivos de áudio enviados pelo usuário
CREATE TABLE IF NOT EXISTS audio_files (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename         TEXT NOT NULL,
  storage_path     TEXT NOT NULL,           -- caminho no bucket: user_id/filename
  store_name       TEXT,                    -- nome da loja
  vendor_name      TEXT,                    -- nome do vendedor
  visit_date       DATE,                    -- data da visita
  duration_seconds INTEGER,                 -- duração do áudio em segundos
  file_size_bytes  BIGINT,
  manual_review    BOOLEAN DEFAULT false,   -- flaggado para revisão humana
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 2. Transcrições do áudio (Whisper / Gemini)
CREATE TABLE IF NOT EXISTS transcriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_file_id   UUID REFERENCES audio_files(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text            TEXT NOT NULL,
  model           TEXT,                     -- 'whisper-1' | 'gemini-2.0-flash' etc
  language        TEXT DEFAULT 'pt',
  cost_usd        NUMERIC(10,6),
  word_count      INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 3. Telemetria de uso (tokens, custo, latência por operação)
CREATE TABLE IF NOT EXISTS usage_telemetry (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transcription_id    UUID REFERENCES transcriptions(id) ON DELETE SET NULL,
  operation_type      TEXT,                 -- 'transcribe' | 'agent_1' ... 'agent_7' | 'benchmark_*'
  tokens_input        INTEGER,
  tokens_output       INTEGER,
  cost_usd            NUMERIC(10,6),
  model               TEXT,
  latency_ms          INTEGER,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_audio_files_user_id     ON audio_files(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id  ON transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_audio_id ON transcriptions(audio_file_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_user_id       ON usage_telemetry(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at    ON usage_telemetry(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_operation     ON usage_telemetry(operation_type);
