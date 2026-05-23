-- =============================================================================
-- SafariCharge – Additional Tables Migration
-- Adds: user_preferences, battery_modules, irradiance_presets, africa_locations
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. public.user_preferences
--    Per-user key/value store for UI state, cross-page config, and store inputs.
--    Authenticated users only. Anonymous users fall back to localStorage.
-- ---------------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id    uuid        not null references auth.users on delete cascade,
  key        text        not null,
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences: users select own" on public.user_preferences;
create policy "user_preferences: users select own"
  on public.user_preferences
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_preferences: users insert own" on public.user_preferences;
create policy "user_preferences: users insert own"
  on public.user_preferences
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_preferences: users update own" on public.user_preferences;
create policy "user_preferences: users update own"
  on public.user_preferences
  for update
  to authenticated
  using  ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_preferences: users delete own" on public.user_preferences;
create policy "user_preferences: users delete own"
  on public.user_preferences
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

create index if not exists user_preferences_user_id_idx
  on public.user_preferences (user_id);


-- ---------------------------------------------------------------------------
-- 2. public.battery_modules
--    Battery module catalog. Seeded from the static BATTERY_MODULE_CATALOG TS
--    array. Users may add custom entries (is_builtin = false).
-- ---------------------------------------------------------------------------
create table if not exists public.battery_modules (
  id                        text        primary key,
  label                     text        not null,
  usable_kwh                numeric     not null,
  nominal_voltage_v         numeric     not null,
  max_charge_kw_per_module  numeric     not null,
  max_discharge_kw_per_module numeric   not null,
  chemistry                 text        not null
                              check (chemistry in ('lifepo4', 'lead-acid', 'nmc')),
  rte                       numeric     not null,
  min_modules               int         not null,
  max_modules               int         not null,
  catalog_id                text        not null,
  is_builtin                boolean     not null default false,
  user_id                   uuid        references auth.users on delete cascade,
  created_at                timestamptz not null default now()
);

alter table public.battery_modules enable row level security;

drop policy if exists "battery_modules: public read" on public.battery_modules;
create policy "battery_modules: public read"
  on public.battery_modules
  for select
  to anon, authenticated
  using (true);

drop policy if exists "battery_modules: users insert own" on public.battery_modules;
create policy "battery_modules: users insert own"
  on public.battery_modules
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id and is_builtin = false);

drop policy if exists "battery_modules: users update own" on public.battery_modules;
create policy "battery_modules: users update own"
  on public.battery_modules
  for update
  to authenticated
  using  ((select auth.uid()) = user_id and is_builtin = false)
  with check ((select auth.uid()) = user_id and is_builtin = false);

drop policy if exists "battery_modules: users delete own" on public.battery_modules;
create policy "battery_modules: users delete own"
  on public.battery_modules
  for delete
  to authenticated
  using ((select auth.uid()) = user_id and is_builtin = false);


-- ---------------------------------------------------------------------------
-- 3. public.irradiance_presets
--    Kenya county-level solar irradiance presets (49 counties).
--    Full data stored as JSONB for flexibility; key columns indexed.
-- ---------------------------------------------------------------------------
create table if not exists public.irradiance_presets (
  code            text        primary key,  -- ISO 3166-2:KE code e.g. "KE-NBI"
  county          text        not null,
  lat             numeric     not null,
  lon             numeric     not null,
  avg_daily_psh   numeric     not null,
  annual_yield    numeric     not null,     -- kWh/kWp/year
  climate_zone    text        not null,
  is_kosap        boolean     not null default false,
  grid_reliability int,
  data            jsonb       not null default '{}',  -- full KenyaCountyIrradiance shape
  created_at      timestamptz not null default now()
);

alter table public.irradiance_presets enable row level security;

drop policy if exists "irradiance_presets: public read" on public.irradiance_presets;
create policy "irradiance_presets: public read"
  on public.irradiance_presets
  for select
  to anon, authenticated
  using (true);

create index if not exists irradiance_presets_county_idx
  on public.irradiance_presets (county);


-- ---------------------------------------------------------------------------
-- 4. public.africa_locations
--    213 African city solar resource records.
-- ---------------------------------------------------------------------------
create table if not exists public.africa_locations (
  id           text        primary key,  -- slug: "cairo-eg"
  name         text        not null,
  country      text        not null,
  country_code text        not null,
  region       text        not null,
  lat          numeric     not null,
  lon          numeric     not null,
  elevation    int         not null,
  avg_daily_psh numeric    not null,
  annual_ghi   numeric     not null,
  avg_temp_c   numeric     not null,
  created_at   timestamptz not null default now()
);

alter table public.africa_locations enable row level security;

drop policy if exists "africa_locations: public read" on public.africa_locations;
create policy "africa_locations: public read"
  on public.africa_locations
  for select
  to anon, authenticated
  using (true);

create index if not exists africa_locations_country_idx
  on public.africa_locations (country_code);

create index if not exists africa_locations_region_idx
  on public.africa_locations (region);
