-- Estrutura de Tabela para Telemetria Avançada e Custos

-- 1. Criaçao da tabela
-- Drop the table if you are recreating the schema (be careful if there is production data)
drop table if exists usage_telemetry;

create table usage_telemetry (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  operation_type text not null, -- 'chat', 'transcription', etc.
  provider text, -- 'openai', 'gemini'
  model text, -- 'gpt-4o', 'gemini-1.5-pro'
  prompt_tokens integer default 0,
  completion_tokens integer default 0,
  total_tokens integer default 0,
  estimated_cost_usd decimal(10, 6) default 0, -- Custo estrito da IA
  latency_ms integer default 0, -- Latência ponta-a-ponta na rede da IA
  server_processing_ms integer default 0, -- Esforço local da CPU no Node/Bun
  server_cost_usd decimal(10, 6) default 0, -- Rastreamento Financeiro da transação no Servidor local
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilita RLS
alter table usage_telemetry enable row level security;

-- 3. Políticas RLS (Somente o proprio usuario pode inserir e ver seus dados)
-- Users can insert their own telemetry
create policy "Users can insert their own telemetry"
  on usage_telemetry for insert
  with check ( auth.uid() = user_id );

-- Users can read their own telemetry
create policy "Users can view their own telemetry"
  on usage_telemetry for select
  using ( auth.uid() = user_id );

-- 4. Criação de indices para melhorar o dashboard de relatório futuramente
create index usage_telemetry_user_id_idx on usage_telemetry (user_id);
create index usage_telemetry_created_at_idx on usage_telemetry (created_at desc);
CREATE INDEX idx_telemetry_model ON public.usage_telemetry(model);
