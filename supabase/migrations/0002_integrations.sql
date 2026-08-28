-- V.E.R.A — Integraciones móviles (Telegram / WhatsApp)
-- Vincula un chat externo (chat_id de Telegram, wa_id de WhatsApp) a un
-- usuario de V.E.R.A mediante un token de un solo uso y caducidad corta.
-- Los webhooks de Telegram/WhatsApp no llevan sesión de Supabase (no hay
-- auth.uid()), así que se leen/escriben con la service role key desde el
-- servidor — de ahí que las políticas de select/insert/update solo cubran
-- el propio usuario autenticado gestionando sus tokens y vínculos desde el
-- panel, no el acceso del webhook (que bypassa RLS a propósito).

-- =========================================================
-- integration_link_tokens
-- =========================================================
create table if not exists public.integration_link_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

alter table public.integration_link_tokens enable row level security;

create policy "Los usuarios ven solo sus propios tokens de vinculación"
  on public.integration_link_tokens for select
  using (auth.uid() = user_id);

create policy "Los usuarios crean solo sus propios tokens de vinculación"
  on public.integration_link_tokens for insert
  with check (auth.uid() = user_id);

create index if not exists integration_link_tokens_user_id_idx
  on public.integration_link_tokens (user_id);

-- =========================================================
-- integration_links
-- =========================================================
create table if not exists public.integration_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('telegram', 'whatsapp')),
  external_id text not null,
  linked_at timestamptz not null default now(),
  unique (provider, external_id)
);

alter table public.integration_links enable row level security;

create policy "Los usuarios ven solo sus propios vínculos"
  on public.integration_links for select
  using (auth.uid() = user_id);

create policy "Los usuarios eliminan solo sus propios vínculos"
  on public.integration_links for delete
  using (auth.uid() = user_id);

create index if not exists integration_links_user_id_idx
  on public.integration_links (user_id);
