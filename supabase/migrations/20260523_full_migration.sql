-- =============================================================================
-- SafariCharge – Full Schema Migration
-- Generated: 2026-05-23
--
-- Creates all application tables with RLS policies.
-- Idempotent: uses CREATE TABLE IF NOT EXISTS, CREATE POLICY IF NOT EXISTS,
-- CREATE INDEX IF NOT EXISTS throughout.
--
-- Prerequisites: public.profiles must already exist (see 20260523_profiles.sql).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Shared trigger function: set_updated_at
-- Reuse the one created in the profiles migration; create only if missing.
-- ---------------------------------------------------------------------------
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


-- =============================================================================
-- 1. public.saved_scenarios
--    Persists named snapshots of a user's system configuration, financials,
--    performance estimates, location, and optional engineering details.
-- =============================================================================
create table if not exists public.saved_scenarios (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users on delete cascade,
  name        text        not null,
  config      jsonb       not null default '{}',   -- SystemConfigSnapshot
  finance     jsonb       not null default '{}',   -- FinancialSnapshot
  performance jsonb       not null default '{}',   -- PerformanceSnapshot
  location    jsonb       not null default '{}',   -- LocationCoordinatesSnapshot
  engineering jsonb,                               -- EngineeringSnapshot (optional)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.saved_scenarios enable row level security;

create policy if not exists "saved_scenarios: users select own"
  on public.saved_scenarios
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy if not exists "saved_scenarios: users insert own"
  on public.saved_scenarios
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy if not exists "saved_scenarios: users update own"
  on public.saved_scenarios
  for update
  to authenticated
  using  ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy if not exists "saved_scenarios: users delete own"
  on public.saved_scenarios
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Auto-update updated_at
drop trigger if exists saved_scenarios_set_updated_at on public.saved_scenarios;
create trigger saved_scenarios_set_updated_at
  before update on public.saved_scenarios
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 2. public.solar_components_catalog
--    Global catalog of solar hardware components. Built-in entries are seeded
--    by service_role (is_builtin = true, user_id = null). Users may add their
--    own entries (user_id = auth.uid()).
-- =============================================================================
create table if not exists public.solar_components_catalog (
  id            text        primary key,
  brand         text        not null,
  model         text        not null,
  category      text        not null
                  check (category in (
                    'Solar Module',
                    'Inverter',
                    'Battery Storage',
                    'EV Charger',
                    'Monitoring'
                  )),
  summary       text        not null default '',
  typical_use   text        not null default '',
  -- Array of {label: string, value: string} objects
  specs         jsonb       not null default '[]',
  datasheet_url text        not null default '',
  manual_url    text        not null default '',
  source        text        not null default '',
  is_builtin    boolean     not null default false,
  -- null for built-in seeded entries; set to owner's uid for user-created rows
  user_id       uuid        references auth.users on delete cascade,
  created_at    timestamptz not null default now()
);

alter table public.solar_components_catalog enable row level security;

-- Anyone (anon + authenticated) may read the full catalog
create policy if not exists "solar_components_catalog: public read"
  on public.solar_components_catalog
  for select
  to anon, authenticated
  using (true);

-- Authenticated users may insert their own (non-built-in) rows
create policy if not exists "solar_components_catalog: users insert own"
  on public.solar_components_catalog
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and is_builtin = false
  );

-- Authenticated users may update only their own non-built-in rows
create policy if not exists "solar_components_catalog: users update own"
  on public.solar_components_catalog
  for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and is_builtin = false
  )
  with check (
    (select auth.uid()) = user_id
    and is_builtin = false
  );

-- Authenticated users may delete only their own non-built-in rows
create policy if not exists "solar_components_catalog: users delete own"
  on public.solar_components_catalog
  for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and is_builtin = false
  );

-- Built-in rows (is_builtin = true) are protected: only service_role can
-- modify them (service_role bypasses RLS entirely, so no extra policy needed).


-- =============================================================================
-- 3. public.component_assets
--    Files (images, PDFs) uploaded by users and associated with catalog
--    components. Paths point into Supabase Storage.
-- =============================================================================
create table if not exists public.component_assets (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users on delete cascade,
  -- May be null if the referenced component is later deleted
  component_id     text        references public.solar_components_catalog(id) on delete set null,
  name             text        not null,
  category         text        not null,
  storage_path     text        not null,  -- path inside the Storage bucket
  url              text        not null,  -- public URL returned by Storage
  file_size_bytes  int,
  mime_type        text,
  uploaded_at      timestamptz not null default now()
);

alter table public.component_assets enable row level security;

create policy if not exists "component_assets: users select own"
  on public.component_assets
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy if not exists "component_assets: users insert own"
  on public.component_assets
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy if not exists "component_assets: users update own"
  on public.component_assets
  for update
  to authenticated
  using  ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy if not exists "component_assets: users delete own"
  on public.component_assets
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- =============================================================================
-- 4. public.ai_conversations
--    Top-level container for a multi-turn AI chat session.
-- =============================================================================
create table if not exists public.ai_conversations (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users on delete cascade,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ai_conversations enable row level security;

create policy if not exists "ai_conversations: users select own"
  on public.ai_conversations
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy if not exists "ai_conversations: users insert own"
  on public.ai_conversations
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy if not exists "ai_conversations: users update own"
  on public.ai_conversations
  for update
  to authenticated
  using  ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy if not exists "ai_conversations: users delete own"
  on public.ai_conversations
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Auto-update updated_at
drop trigger if exists ai_conversations_set_updated_at on public.ai_conversations;
create trigger ai_conversations_set_updated_at
  before update on public.ai_conversations
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 5. public.ai_messages
--    Individual messages within an AI conversation.
--    RLS checks ownership via a join to ai_conversations.
-- =============================================================================
create table if not exists public.ai_messages (
  id                     uuid        primary key default gen_random_uuid(),
  conversation_id        uuid        not null references public.ai_conversations on delete cascade,
  role                   text        not null check (role in ('user', 'assistant')),
  content                text        not null,
  -- Snapshot of the energy system state at the time this message was created
  system_data_snapshot   jsonb,
  created_at             timestamptz not null default now()
);

alter table public.ai_messages enable row level security;

-- Users may read messages that belong to their own conversations
create policy if not exists "ai_messages: users select own"
  on public.ai_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.ai_conversations c
      where c.id = conversation_id
        and c.user_id = (select auth.uid())
    )
  );

create policy if not exists "ai_messages: users insert own"
  on public.ai_messages
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.ai_conversations c
      where c.id = conversation_id
        and c.user_id = (select auth.uid())
    )
  );

create policy if not exists "ai_messages: users update own"
  on public.ai_messages
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.ai_conversations c
      where c.id = conversation_id
        and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.ai_conversations c
      where c.id = conversation_id
        and c.user_id = (select auth.uid())
    )
  );

create policy if not exists "ai_messages: users delete own"
  on public.ai_messages
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.ai_conversations c
      where c.id = conversation_id
        and c.user_id = (select auth.uid())
    )
  );

-- Index to speed up per-conversation message lookups
create index if not exists ai_messages_conversation_id_idx
  on public.ai_messages (conversation_id);


-- =============================================================================
-- 6. public.ai_response_cache
--    Server-side cache for AI responses keyed by a deterministic hash.
--    No public access — service_role only (RLS enabled, no permissive policies).
-- =============================================================================
create table if not exists public.ai_response_cache (
  cache_key  text        primary key,
  response   text        not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.ai_response_cache enable row level security;

-- No RLS policies → only service_role (which bypasses RLS) can access this table.

-- Index to make expiry-based purge queries fast
create index if not exists ai_response_cache_expires_at_idx
  on public.ai_response_cache (expires_at);


-- =============================================================================
-- 7. public.simulation_runs
--    Header record for each simulation run, linking to an optional saved
--    scenario and storing a summary of aggregated results.
-- =============================================================================
create table if not exists public.simulation_runs (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null references auth.users on delete cascade,
  scenario_id          uuid        references public.saved_scenarios(id) on delete set null,
  name                 text        not null default 'Unnamed Run',
  solar_capacity_kw    numeric,
  battery_capacity_kwh numeric,
  inverter_kw          numeric,
  system_mode          text,
  location_name        text,
  latitude             numeric,
  longitude            numeric,
  total_minutes        int,
  -- Aggregated stats: totalSolarKwh, totalSavingsKes, selfSufficiencyPct, etc.
  summary_json         jsonb,
  created_at           timestamptz not null default now()
);

alter table public.simulation_runs enable row level security;

create policy if not exists "simulation_runs: users select own"
  on public.simulation_runs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy if not exists "simulation_runs: users insert own"
  on public.simulation_runs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy if not exists "simulation_runs: users update own"
  on public.simulation_runs
  for update
  to authenticated
  using  ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy if not exists "simulation_runs: users delete own"
  on public.simulation_runs
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- =============================================================================
-- 8. public.simulation_data
--    Time-series data points produced by a simulation run.
--    Uses bigserial PK for efficient append writes.
--    RLS checks ownership via join to simulation_runs.
-- =============================================================================
create table if not exists public.simulation_data (
  id               bigserial   primary key,
  run_id           uuid        not null references public.simulation_runs on delete cascade,
  ts               timestamptz not null,
  solar_kw         numeric,
  home_load_kw     numeric,
  ev1_load_kw      numeric,
  ev2_load_kw      numeric,
  battery_level_pct numeric,
  grid_import_kw   numeric,
  grid_export_kw   numeric,
  savings_kes      numeric,
  tariff_rate      numeric,
  is_peak_time     boolean
);

alter table public.simulation_data enable row level security;

-- Composite index for the primary query pattern: fetch all points for a run
-- in time order.
create index if not exists simulation_data_run_id_ts_idx
  on public.simulation_data (run_id, ts);

-- Users may select data rows for their own runs
create policy if not exists "simulation_data: users select own"
  on public.simulation_data
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.simulation_runs r
      where r.id = run_id
        and r.user_id = (select auth.uid())
    )
  );

create policy if not exists "simulation_data: users insert own"
  on public.simulation_data
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.simulation_runs r
      where r.id = run_id
        and r.user_id = (select auth.uid())
    )
  );

create policy if not exists "simulation_data: users delete own"
  on public.simulation_data
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.simulation_runs r
      where r.id = run_id
        and r.user_id = (select auth.uid())
    )
  );


-- =============================================================================
-- 9. public.rate_limit_counters
--    Postgres-based rate limiting buckets. Key format: "tier:ip".
--    No public access — service_role only.
-- =============================================================================
create table if not exists public.rate_limit_counters (
  key          text        primary key,  -- "tier:ip"
  count        int         not null default 1,
  window_start timestamptz not null,
  expires_at   timestamptz not null
);

alter table public.rate_limit_counters enable row level security;

-- No RLS policies → only service_role can access this table.

-- Index to make expiry-based purge queries fast
create index if not exists rate_limit_counters_expires_at_idx
  on public.rate_limit_counters (expires_at);


-- =============================================================================
-- Rate-limit function: public.increment_rate_limit
--
-- Atomically upserts a rate-limit counter for the given key and window.
-- Returns:
--   allowed         boolean  – true if the request is within the limit
--   count           int      – current request count in this window
--   retry_after_ms  int      – ms until the window resets (0 when allowed)
--
-- Security: SECURITY DEFINER so it can write to rate_limit_counters (which
-- has no public RLS policy). The function is kept in public but all writes
-- go through this controlled entry point. Callers cannot read the table
-- directly.
--
-- Concurrency: uses INSERT … ON CONFLICT … DO UPDATE with a single statement
-- to avoid race conditions under concurrent requests.
--
-- Expired cache rows are purged opportunistically inside this function to
-- avoid needing a separate background job (pg_cron is used if available).
-- =============================================================================
create or replace function public.increment_rate_limit(
  p_key        text,
  p_limit      int,
  p_window_ms  int   -- sliding-window duration in milliseconds
)
returns table (
  allowed        boolean,
  count          int,
  retry_after_ms int
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now          timestamptz := now();
  v_window_start timestamptz;
  v_expires_at   timestamptz;
  v_count        int;
  v_allowed      boolean;
  v_retry_ms     int;
begin
  v_window_start := v_now;
  v_expires_at   := v_now + (p_window_ms || ' milliseconds')::interval;

  -- Atomic upsert:
  --   • If no row exists, insert with count = 1 and a fresh window.
  --   • If a non-expired row exists in the same window, increment count.
  --   • If the existing row has expired (window passed), reset it.
  insert into public.rate_limit_counters (key, count, window_start, expires_at)
  values (p_key, 1, v_window_start, v_expires_at)
  on conflict (key) do update
    set
      -- Reset if the existing window has expired
      count        = case
                       when public.rate_limit_counters.expires_at < v_now
                       then 1
                       else public.rate_limit_counters.count + 1
                     end,
      window_start = case
                       when public.rate_limit_counters.expires_at < v_now
                       then v_window_start
                       else public.rate_limit_counters.window_start
                     end,
      expires_at   = case
                       when public.rate_limit_counters.expires_at < v_now
                       then v_expires_at
                       else public.rate_limit_counters.expires_at
                     end
  returning
    public.rate_limit_counters.count,
    public.rate_limit_counters.expires_at
  into v_count, v_expires_at;

  v_allowed := v_count <= p_limit;
  v_retry_ms := case
                  when v_allowed then 0
                  else extract(epoch from (v_expires_at - v_now))::int * 1000
                end;

  -- Opportunistic cleanup of expired rows (best-effort; non-fatal)
  begin
    delete from public.rate_limit_counters
    where expires_at < v_now;
  exception when others then
    -- Ignore cleanup errors; they must not block the rate-limit response
    null;
  end;

  -- Also purge expired AI response cache rows opportunistically
  begin
    delete from public.ai_response_cache
    where expires_at < v_now;
  exception when others then
    null;
  end;

  return query select v_allowed, v_count, v_retry_ms;
end;
$$;

-- Revoke public execute on the rate-limit function; only service_role should
-- call it directly. Application code must go through the server-side API layer.
revoke execute on function public.increment_rate_limit(text, int, int) from public;
revoke execute on function public.increment_rate_limit(text, int, int) from anon;
revoke execute on function public.increment_rate_limit(text, int, int) from authenticated;


-- =============================================================================
-- pg_cron scheduled cleanup jobs (enabled only when pg_cron extension exists)
--
-- These jobs provide a reliable scheduled sweep to complement the
-- opportunistic cleanup inside increment_rate_limit.
-- =============================================================================
do $$
begin
  -- Check whether pg_cron is available
  if exists (
    select 1
    from pg_extension
    where extname = 'pg_cron'
  ) then

    -- Purge expired rate_limit_counters every 5 minutes
    perform cron.schedule(
      'purge-rate-limit-counters',   -- job name (idempotent: unschedule first)
      '*/5 * * * *',
      $cron$
        delete from public.rate_limit_counters where expires_at < now();
      $cron$
    );

    -- Purge expired ai_response_cache entries every 10 minutes
    perform cron.schedule(
      'purge-ai-response-cache',
      '*/10 * * * *',
      $cron$
        delete from public.ai_response_cache where expires_at < now();
      $cron$
    );

  end if;
exception when others then
  -- pg_cron may not be available or cron.schedule may fail; silently continue
  null;
end;
$$;
