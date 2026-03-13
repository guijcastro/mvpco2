-- ============================================================
-- MVPCO — Script 05: Tabela de Chaves de API (criptografadas)
-- Execute APÓS 04_rls_policies.sql
-- ============================================================

-- Tabela de chaves de API por usuário (armazenadas criptografadas via Fernet)
CREATE TABLE IF NOT EXISTS user_api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider      TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'xai')),
  encrypted_key TEXT NOT NULL,          -- chave criptografada com Fernet (server-side)
  key_hint      TEXT,                   -- últimos 4 caracteres da chave (visível ao usuário)
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, provider)
);

-- RLS: cada usuário acessa apenas suas próprias chaves
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_isolation" ON user_api_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Índice
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON user_api_keys(user_id);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
