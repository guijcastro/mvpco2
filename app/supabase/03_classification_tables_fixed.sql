-- ============================================================
-- MVPCO — Script 03: Tabelas de Classificação (Pipeline v2)
-- Execute APÓS 02_base_tables.sql
-- ============================================================

DROP TABLE IF EXISTS lost_opportunities CASCADE;
DROP TABLE IF EXISTS objections CASCADE;
DROP TABLE IF EXISTS conversation_analysis CASCADE;
DROP TABLE IF EXISTS checklist_results CASCADE;
DROP TABLE IF EXISTS conversation_entities CASCADE;
DROP TABLE IF EXISTS conversation_turns CASCADE;

-- 1. Turnos da conversa (output do E1 — Parser spaCy)
CREATE TABLE IF NOT EXISTS conversation_turns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_file_id    UUID REFERENCES audio_files(id) ON DELETE CASCADE NOT NULL,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  turn_index       INTEGER NOT NULL,
  role             TEXT NOT NULL,
  text             TEXT NOT NULL,
  char_start       INTEGER,                 -- offset de caractere no texto original
  char_end         INTEGER,
  token_count      INTEGER,
  confidence       NUMERIC(3,2),            -- confiança do parser para este turno (0-1)
  start_time       NUMERIC(10,2),           -- timestamp de inicio no audio (fallback)
  end_time         NUMERIC(10,2),           -- timestamp de fim no audio
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 2. Entidades detectadas pelo NER spaCy + E2 (produtos, preços, marcas)
CREATE TABLE IF NOT EXISTS conversation_entities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_file_id    UUID REFERENCES audio_files(id) ON DELETE CASCADE NOT NULL,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entity_type      TEXT,
  value            TEXT NOT NULL,
  normalized_value TEXT,                    -- valor canônico (ex: "DriveSafe" mesmo se dito "drive safe")
  turn_id          UUID REFERENCES conversation_turns(id) ON DELETE SET NULL,
  source           TEXT DEFAULT 'DETERMINISTIC'  -- 'DETERMINISTIC' | 'SPACY_NER'
);

-- 3. Resultados do checklist (E2 determinístico + Agente 1 LLM)
CREATE TABLE IF NOT EXISTS checklist_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_file_id    UUID REFERENCES audio_files(id) ON DELETE CASCADE NOT NULL,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_key         TEXT NOT NULL,           -- ex: 'cumprimentou_cliente'
  item_label       TEXT,                    -- ex: 'Cumprimentou o cliente'
  verdict          TEXT NOT NULL,
  confidence       NUMERIC(3,2),            -- 0.0 a 1.0
  evidence         TEXT,                    -- trecho da transcrição que suporta o veredicto
  source           TEXT,
  weight           INTEGER DEFAULT 5,       -- peso do item no score final
  turn_id          UUID REFERENCES conversation_turns(id) ON DELETE SET NULL
);

-- 4. Análise consolidada completa (output final do pipeline E4+E5)
CREATE TABLE IF NOT EXISTS conversation_analysis (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_file_id         UUID REFERENCES audio_files(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis_data         JSONB NOT NULL,     -- 20 top-level keys (schema fixo Fase 2)
  schema_version        TEXT DEFAULT '2.0',
  parser_confidence     NUMERIC(3,2),       -- confiança do parser E1 para esta transcrição
  overall_score         NUMERIC(5,2) DEFAULT 0.0,
  total_agent_cost_usd  NUMERIC(10,6),      -- custo total dos 7 agentes
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- 5. Objeções detectadas (Agente 2)
CREATE TABLE IF NOT EXISTS objections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_file_id        UUID REFERENCES audio_files(id) ON DELETE CASCADE NOT NULL,
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  objection_type       TEXT NOT NULL,       -- ex: 'PRECO_ALTO' (da taxonomy)
  objection_text       TEXT,               -- trecho literal da transcrição
  turn_id              UUID REFERENCES conversation_turns(id) ON DELETE SET NULL,
  vendor_response_text TEXT,               -- resposta do vendedor
  efficacy             TEXT,
  phase                TEXT                -- fase da conversa em que ocorreu
);

-- 6. Oportunidades perdidas de venda (Agente 6)
CREATE TABLE IF NOT EXISTS lost_opportunities (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_file_id    UUID REFERENCES audio_files(id) ON DELETE CASCADE NOT NULL,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  opportunity_type TEXT,
  product          TEXT,                   -- produto que poderia ter sido ofertado
  estimated_value  NUMERIC(10,2),          -- valor potencial perdido
  client_signal    TEXT                    -- sinal do cliente que indicava a oportunidade
);

-- Índices para as novas tabelas
CREATE INDEX IF NOT EXISTS idx_turns_audio_file_id       ON conversation_turns(audio_file_id);
CREATE INDEX IF NOT EXISTS idx_entities_audio_file_id    ON conversation_entities(audio_file_id);
CREATE INDEX IF NOT EXISTS idx_checklist_audio_file_id   ON checklist_results(audio_file_id);
CREATE INDEX IF NOT EXISTS idx_analysis_audio_file_id    ON conversation_analysis(audio_file_id);
CREATE INDEX IF NOT EXISTS idx_analysis_user_id          ON conversation_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_data             ON conversation_analysis USING gin(analysis_data);
CREATE INDEX IF NOT EXISTS idx_objections_audio_file_id  ON objections(audio_file_id);
CREATE INDEX IF NOT EXISTS idx_objections_type           ON objections(objection_type);
CREATE INDEX IF NOT EXISTS idx_lost_opp_audio_file_id    ON lost_opportunities(audio_file_id);
