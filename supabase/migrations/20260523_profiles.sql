-- ─── Profiles table ──────────────────────────────────────────────────────────
-- Stores per-user subscription state and optional profile fields.
-- auth.users is the source of truth for identity; this table extends it.

create table if not exists public.profiles (
  id                  uuid        primary key references auth.users on delete cascade,
  email               text,
  subscription_status text        not null default 'inactive',
  plan                text        not null default 'free',
  full_name           text,
  phone               text,
  organization        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Add missing columns if the table already exists from the README snippet
alter table public.profiles add column if not exists full_name    text;
alter table public.profiles add column if not exists phone        text;
alter table public.profiles add column if not exists organization text;
alter table public.profiles add column if not exists updated_at   timestamptz not null default now();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- Authenticated users may read their own row
create policy if not exists "profiles: users read own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- Authenticated users may update their own row
-- (subscription_status and plan are set server-side only via service_role)
create policy if not exists "profiles: users update own"
  on public.profiles
  for update
  to authenticated
  using  ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Service-role (used by /api/profile and /auth/callback) bypasses RLS automatically.

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
