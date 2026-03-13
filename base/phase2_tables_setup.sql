-- ==============================================================================
-- SETUP: Fase 2 - Tabelas Analíticas Avançadas (E5 Persist)
-- ==============================================================================

-- Remover tabelas antigas se existirem (Pois pode estar causando conflitos de schema antigo sem 'audio_file_id', 'id', ou colunas vitais)
DROP TABLE IF EXISTS public.conversation_turns CASCADE;
DROP TABLE IF EXISTS public.conversation_analysis CASCADE;
DROP TABLE IF EXISTS public.checklist_results CASCADE;
DROP TABLE IF EXISTS public.objections CASCADE;
DROP TABLE IF EXISTS public.lost_opportunities CASCADE;
DROP TABLE IF EXISTS public.conversation_entities CASCADE;

-- 1. conversation_turns
create table if not exists public.conversation_turns (
    id uuid not null default gen_random_uuid (),
    audio_file_id uuid not null references public.audio_files (id) on delete cascade,
    turn_index integer not null,
    role text not null,
    text text not null,
    start_time numeric,
    end_time numeric,
    created_at timestamp with time zone not null default now(),
    constraint conversation_turns_pkey primary key (id)
) tablespace pg_default;

create index if not exists idx_conversation_turns_audio_id on public.conversation_turns (audio_file_id);

-- 2. conversation_analysis
create table if not exists public.conversation_analysis (
    id uuid not null default gen_random_uuid (),
    audio_file_id uuid not null references public.audio_files (id) on delete cascade,
    analysis_data jsonb not null,
    overall_score numeric,
    created_at timestamp with time zone not null default now(),
    constraint conversation_analysis_pkey primary key (id)
) tablespace pg_default;

create index if not exists idx_conversation_analysis_audio_id on public.conversation_analysis (audio_file_id);

-- 3. checklist_results
create table if not exists public.checklist_results (
    id uuid not null default gen_random_uuid (),
    audio_file_id uuid not null references public.audio_files (id) on delete cascade,
    item_key text,
    item_label text,
    result text,
    source text,
    evidence text,
    confidence numeric,
    weight integer,
    created_at timestamp with time zone not null default now(),
    constraint checklist_results_pkey primary key (id)
) tablespace pg_default;

create index if not exists idx_checklist_results_audio_id on public.checklist_results (audio_file_id);

-- 4. objections
create table if not exists public.objections (
    id uuid not null default gen_random_uuid (),
    audio_file_id uuid not null references public.audio_files (id) on delete cascade,
    objection_type text,
    objection_text text,
    turn_id text,
    vendor_response_text text,
    objection_resolved boolean,
    phase text,
    created_at timestamp with time zone not null default now(),
    constraint objections_pkey primary key (id)
) tablespace pg_default;

create index if not exists idx_objections_audio_id on public.objections (audio_file_id);

-- 5. lost_opportunities
create table if not exists public.lost_opportunities (
    id uuid not null default gen_random_uuid (),
    audio_file_id uuid not null references public.audio_files (id) on delete cascade,
    data jsonb not null,
    created_at timestamp with time zone not null default now(),
    constraint lost_opportunities_pkey primary key (id)
) tablespace pg_default;

create index if not exists idx_lost_opportunities_audio_id on public.lost_opportunities (audio_file_id);

-- 6. conversation_entities
create table if not exists public.conversation_entities (
    id uuid not null default gen_random_uuid (),
    audio_file_id uuid not null references public.audio_files (id) on delete cascade,
    entities_json jsonb not null,
    created_at timestamp with time zone not null default now(),
    constraint conversation_entities_pkey primary key (id)
) tablespace pg_default;

create index if not exists idx_conversation_entities_audio_id on public.conversation_entities (audio_file_id);

----------
-- Habilitar RLS (Opcional, mas recomendado para bypass explícito com token)
----------
alter table public.conversation_turns enable row level security;
alter table public.conversation_analysis enable row level security;
alter table public.checklist_results enable row level security;
alter table public.objections enable row level security;
alter table public.lost_opportunities enable row level security;
alter table public.conversation_entities enable row level security;

-- Politicas basicas liberando insert/select anonimo mas associado ao token atual
create policy "allow auth select turns" on public.conversation_turns for select to anon, authenticated using (true);
create policy "allow auth insert turns" on public.conversation_turns for insert to anon, authenticated with check (true);

create policy "allow auth select analysis" on public.conversation_analysis for select to anon, authenticated using (true);
create policy "allow auth insert analysis" on public.conversation_analysis for insert to anon, authenticated with check (true);

create policy "allow auth select checklist" on public.checklist_results for select to anon, authenticated using (true);
create policy "allow auth insert checklist" on public.checklist_results for insert to anon, authenticated with check (true);

create policy "allow auth select obj" on public.objections for select to anon, authenticated using (true);
create policy "allow auth insert obj" on public.objections for insert to anon, authenticated with check (true);

create policy "allow auth select opp" on public.lost_opportunities for select to anon, authenticated using (true);
create policy "allow auth insert opp" on public.lost_opportunities for insert to anon, authenticated with check (true);

create policy "allow auth select ent" on public.conversation_entities for select to anon, authenticated using (true);
create policy "allow auth insert ent" on public.conversation_entities for insert to anon, authenticated with check (true);
