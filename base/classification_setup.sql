-- Cria a nova tabela de classificações se ela não existir, sem afetar as tabelas existentes
create table if not exists
  public.audio_classifications (
    id uuid not null default gen_random_uuid (),
    audio_id uuid not null,
    user_id uuid not null,
    classification_data jsonb null,
    model_used text null,
    created_at timestamp with time zone not null default now(),
    constraint audio_classifications_pkey primary key (id),
    constraint audio_classifications_audio_id_fkey foreign key (audio_id) references audio_files (id) on delete cascade,
    constraint audio_classifications_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
  ) tablespace pg_default;

-- Cria índice para pesquisas rápidas
create index if not exists audio_classifications_user_id_idx on public.audio_classifications using btree (user_id);
create index if not exists audio_classifications_audio_id_idx on public.audio_classifications using btree (audio_id);

-- Habilita Row Level Security (RLS)
alter table public.audio_classifications enable row level security;

-- Cria políticas de segurança para o usuário autenticado gerenciar apenas suas classificações
create policy "Users can viem own classifications"
on public.audio_classifications
for select
to authenticated
using ((auth.uid() = user_id));

create policy "Users can insert own classifications"
on public.audio_classifications
for insert
to authenticated
with check ((auth.uid() = user_id));

create policy "Users can update own classifications"
on public.audio_classifications
for update
to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));

create policy "Users can delete own classifications"
on public.audio_classifications
for delete
to authenticated
using ((auth.uid() = user_id));
