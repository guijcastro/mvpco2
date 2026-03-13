-- supabase/06_benchmark_votes.sql

-- Tabela para armazenar votos da batalha visual de LLMs (Fase A.2)
CREATE TABLE IF NOT EXISTS public.benchmark_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agent_id TEXT NOT NULL,
    model_a TEXT NOT NULL,
    model_b TEXT NOT NULL,
    winner_model TEXT NOT NULL,  -- Pode ser o nome do modelo A, B, ou "TIE" (empate)
    notes TEXT,
    audio_reference TEXT,        -- Opcional: qual audio gerou a transcrição testada
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Segurança: RLS (Row Level Security)
ALTER TABLE public.benchmark_votes ENABLE ROW LEVEL SECURITY;

-- Policy: Usuário só pode ler seus próprios votos
CREATE POLICY "Users can view their own benchmark votes" 
ON public.benchmark_votes FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Usuário só pode inserir seus próprios votos
CREATE POLICY "Users can insert their own benchmark votes" 
ON public.benchmark_votes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Usuário só pode atualizar seus próprios votos
CREATE POLICY "Users can update their own benchmark votes" 
ON public.benchmark_votes FOR UPDATE 
USING (auth.uid() = user_id);

-- Indice para pesquisas rápidas
CREATE INDEX IF NOT EXISTS idx_benchmark_votes_user_id ON public.benchmark_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_votes_agent_id ON public.benchmark_votes(agent_id);
