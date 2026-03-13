-- Script Seguro para Criação da Infraestrutura do Visualizador de Históricos de Chat
-- GARANTIA: Como estamos utilizando a diretiva "IF NOT EXISTS", mesmo que os metadados já existissem, essas tabelas NÃO sobreescrevem nenhuma outra tabela como "audio_files" ou "user_settings" de seus relatórios. Os dados anteriores ficarão blindados!

-- Tabela: chat_sessions (Para armazenar o índice lateral esquerdo com o Titulo)
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security) para chat_sessions
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para chat_sessions (O usuário só vê e interage com o que é dele)
DROP POLICY IF EXISTS "Usuários podem ver suas próprias sessões" ON chat_sessions;
CREATE POLICY "Usuários podem ver suas próprias sessões" 
ON chat_sessions FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar suas próprias sessões" ON chat_sessions;
CREATE POLICY "Usuários podem deletar suas próprias sessões" 
ON chat_sessions FOR DELETE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem criar suas próprias sessões" ON chat_sessions;
CREATE POLICY "Usuários podem criar suas próprias sessões" 
ON chat_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);


-- Tabela: chat_messages (Armazena como um Histórico o conteúdo escrito por humano/bot)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'ai', 'system')),
    content TEXT NOT NULL,
    model TEXT,            -- Ex: 'gpt-4o', 'claude-3.5', null para 'user'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para chat_messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para chat_messages
DROP POLICY IF EXISTS "Usuários podem ver suas próprias mensagens" ON chat_messages;
CREATE POLICY "Usuários podem ver suas próprias mensagens" 
ON chat_messages FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem criar suas próprias mensagens" ON chat_messages;
CREATE POLICY "Usuários podem criar suas próprias mensagens" 
ON chat_messages FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Índice opcional para ganho extremo de performance nas consultas dos Relatórios
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
