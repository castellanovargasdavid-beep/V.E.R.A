-- V.E.R.A — esquema inicial
-- Tablas: profiles, projects, generations. RLS activado en todas.

-- =========================================================
-- profiles
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Los usuarios pueden ver su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Los usuarios pueden actualizar su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Los usuarios pueden crear su propio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Crea automáticamente un perfil al registrarse un nuevo usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- projects
-- =========================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  platform text not null default 'web' check (platform in ('web', 'landing', 'ecommerce', 'portfolio')),
  status text not null default 'draft' check (status in ('draft', 'generating', 'ready', 'published', 'archived')),
  code text,
  thumbnail_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Los usuarios gestionan solo sus propios proyectos (select)"
  on public.projects for select
  using (auth.uid() = user_id);

create policy "Los usuarios gestionan solo sus propios proyectos (insert)"
  on public.projects for insert
  with check (auth.uid() = user_id);

create policy "Los usuarios gestionan solo sus propios proyectos (update)"
  on public.projects for update
  using (auth.uid() = user_id);

create policy "Los usuarios gestionan solo sus propios proyectos (delete)"
  on public.projects for delete
  using (auth.uid() = user_id);

create index if not exists projects_user_id_idx on public.projects (user_id);

-- =========================================================
-- generations
-- =========================================================
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('ui_component', 'social_copy', 'chat_reply')),
  prompt text not null,
  result text not null,
  model_id text not null,
  created_at timestamptz not null default now()
);

alter table public.generations enable row level security;

create policy "Los usuarios ven solo sus propias generaciones (select)"
  on public.generations for select
  using (auth.uid() = user_id);

create policy "Los usuarios crean solo sus propias generaciones (insert)"
  on public.generations for insert
  with check (auth.uid() = user_id);

create index if not exists generations_user_id_idx on public.generations (user_id);
create index if not exists generations_project_id_idx on public.generations (project_id);

-- =========================================================
-- updated_at automático
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
