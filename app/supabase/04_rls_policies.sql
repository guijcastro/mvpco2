-- ============================================================
-- MVPCO — Script 04: Row Level Security (RLS)
-- Execute APÓS 03_classification_tables.sql
-- ============================================================

-- ── Habilitar RLS em todas as tabelas ────────────────────────
ALTER TABLE audio_files              ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_telemetry          ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_turns       ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_entities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_results        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_analysis    ENABLE ROW LEVEL SECURITY;
ALTER TABLE objections               ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_opportunities       ENABLE ROW LEVEL SECURITY;

-- ── Macro: política padrão de isolamento por usuário ─────────
-- (cada tabela precisa de sua própria policy)

-- audio_files
CREATE POLICY "user_isolation" ON audio_files
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- transcriptions
CREATE POLICY "user_isolation" ON transcriptions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- usage_telemetry
CREATE POLICY "user_isolation" ON usage_telemetry
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- conversation_turns
CREATE POLICY "user_isolation" ON conversation_turns
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- conversation_entities
CREATE POLICY "user_isolation" ON conversation_entities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- checklist_results
CREATE POLICY "user_isolation" ON checklist_results
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- conversation_analysis
CREATE POLICY "user_isolation" ON conversation_analysis
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- objections
CREATE POLICY "user_isolation" ON objections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- lost_opportunities
CREATE POLICY "user_isolation" ON lost_opportunities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Como testar ───────────────────────────────────────────────
-- 1. Crie dois usuários (A e B) via Supabase Auth
-- 2. Insira um audio_file com user_id = A
-- 3. Faça SELECT * FROM audio_files com sessão de B → deve retornar 0 linhas
-- 4. Com sessão de A → deve retornar 1 linha
