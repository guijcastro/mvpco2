-- Add model column to transcriptions to keep track of which AI generated the text.
-- This WILL NOT delete or overwrite any existing transcriptions (text or date).
ALTER TABLE transcriptions ADD COLUMN IF NOT EXISTS model text;

-- Inteligência de Recuperação de Dados Históricos:
-- Muitos áudios antigos foram transcritos pelo Gemini, Claude e Whisper. 
-- Como a tabela 'transcriptions' não tinha essa coluna antes de hoje, vamos recuperar 
-- essa informação cruzando o horário exato em que a transcrição foi salva 
-- com o horário em que o custo foi registrado na tabela 'usage_telemetry'.

UPDATE transcriptions t
SET model = (
    SELECT provider || '|' || model 
    FROM usage_telemetry u
    WHERE u.user_id = t.user_id 
      AND u.operation_type = 'transcription'
      -- Cruza o horário da telemetria com a transcrição (margem de 1 minuto)
      AND u.created_at >= t.created_at - interval '1 minute'
      AND u.created_at <= t.created_at + interval '1 minute'
    ORDER BY abs(extract(epoch from (u.created_at - t.created_at)))
    LIMIT 1
)
WHERE t.model IS NULL OR t.model = 'openai|whisper-1';

-- Para qualquer áudio jurássico que não tenha nem registro de custo na telemetria
-- (antes da tabela de telemetria existir), colocamos o Whisper como fallback.
UPDATE transcriptions 
SET model = 'openai|whisper-1' 
WHERE model IS NULL;

-- VERY IMPORTANT: Tell Supabase API to reload its cached schema so it sees the new column 
NOTIFY pgrst, 'reload schema';
