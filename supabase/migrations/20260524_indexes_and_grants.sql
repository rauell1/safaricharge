-- =============================================================================
-- SafariCharge – Index & Grant Patch
-- Generated: 2026-05-24
--
-- Addresses schema audit findings from the initial migration review:
--
--   1. Missing user_id indexes on tables whose RLS USING clauses filter by
--      user_id.  Without these, every RLS check forces a sequential scan of
--      the entire table — catastrophic at scale.
--
--   2. Missing FK-support indexes (scenario_id, component_id) that Postgres
--      needs to avoid sequential scans on FK lookups and ON DELETE cascades.
--
--   3. Missing catalog filter indexes (category, is_builtin) for the
--      component-library API's WHERE clauses.
--
--   4. Explicit GRANT statements for the Supabase Data API (PostgREST).
--      Supabase does NOT automatically grant SELECT/DML to anon/authenticated
--      on tables created outside its Studio UI.  Without these, the JS client
--      returns 401/403 errors even when RLS would otherwise allow access.
--
--   5. bigserial SEQUENCE usage grant so the authenticated role can INSERT
--      into simulation_data and have the PK auto-generated correctly.
--
-- All statements are idempotent (IF NOT EXISTS / IF EXISTS guards).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- SECTION 1 — User-ownership indexes
--
-- RLS policies of the form  USING ((select auth.uid()) = user_id)  require
-- an index on user_id to avoid sequential scans.  Postgres cannot use the
-- primary-key index for this because the search predicate is on user_id, not
-- on id.
--
-- Rule of thumb: every table with a user_id FK that carries an RLS policy
-- needs an index on that column.
-- ---------------------------------------------------------------------------

-- saved_scenarios: all four CRUD policies filter on user_id
create index if not exists saved_scenarios_user_id_idx
  on public.saved_scenarios (user_id);

-- simulation_runs: SELECT, INSERT, UPDATE, DELETE policies filter on user_id
create index if not exists simulation_runs_user_id_idx
  on public.simulation_runs (user_id);

-- ai_conversations: all four CRUD policies filter on user_id
create index if not exists ai_conversations_user_id_idx
  on public.ai_conversations (user_id);

-- component_assets: all four CRUD policies filter on user_id
create index if not exists component_assets_user_id_idx
  on public.component_assets (user_id);

-- solar_components_catalog: user-owned entries filtered by user_id in INSERT/
-- UPDATE/DELETE policies
create index if not exists solar_components_catalog_user_id_idx
  on public.solar_components_catalog (user_id)
  where user_id is not null;   -- partial index: skip built-in rows (user_id NULL)


-- ---------------------------------------------------------------------------
-- SECTION 2 — Foreign-key support indexes
--
-- Postgres does not automatically create indexes on FK columns.  Missing FK
-- indexes cause:
--   • Sequential scans on JOIN lookups (e.g., simulation_data JOIN simulation_runs)
--   • Slow ON DELETE CASCADE (Postgres must full-scan the child table for each
--     deleted parent row)
-- ---------------------------------------------------------------------------

-- simulation_runs.scenario_id references saved_scenarios(id) ON DELETE SET NULL
create index if not exists simulation_runs_scenario_id_idx
  on public.simulation_runs (scenario_id)
  where scenario_id is not null;

-- component_assets.component_id references solar_components_catalog(id)
-- ON DELETE SET NULL
create index if not exists component_assets_component_id_idx
  on public.component_assets (component_id)
  where component_id is not null;

-- ai_messages.conversation_id references ai_conversations(id) ON DELETE CASCADE
-- (already defined in the full_migration, included here for completeness)
create index if not exists ai_messages_conversation_id_idx
  on public.ai_messages (conversation_id);


-- ---------------------------------------------------------------------------
-- SECTION 3 — Catalog filter indexes
--
-- The component-library API and client-side filtering frequently query:
--   WHERE category = $1
--   WHERE is_builtin = true
--   WHERE catalog_id = $1  (battery_modules grouped by catalog family)
-- ---------------------------------------------------------------------------

create index if not exists solar_components_catalog_category_idx
  on public.solar_components_catalog (category);

create index if not exists solar_components_catalog_is_builtin_idx
  on public.solar_components_catalog (is_builtin);

create index if not exists battery_modules_catalog_id_idx
  on public.battery_modules (catalog_id);

-- irradiance_presets: climate zone filtering (future feature support)
create index if not exists irradiance_presets_climate_zone_idx
  on public.irradiance_presets (climate_zone);


-- ---------------------------------------------------------------------------
-- SECTION 4 — Data API role grants
--
-- PostgREST (the Supabase REST layer) runs queries as the `anon` role for
-- unauthenticated requests and the `authenticated` role for JWT-authenticated
-- requests.  Without explicit GRANT statements these roles cannot touch the
-- tables at all — RLS policies are irrelevant if the table itself is
-- inaccessible at the role level.
--
-- Conventions used here:
--   • Public catalogs  → SELECT granted to both anon AND authenticated
--   • User-private tables → full CRUD granted to authenticated only
--   • Service-only tables  → no grants (rate_limit_counters, ai_response_cache)
--
-- Note: service_role bypasses RLS and Postgres GRANT checks entirely; no
-- explicit grant is required for server-side service_role operations.
-- ---------------------------------------------------------------------------

-- ── Public read-only catalogs ────────────────────────────────────────────────

grant select on public.battery_modules
  to anon, authenticated;

grant select on public.irradiance_presets
  to anon, authenticated;

grant select on public.africa_locations
  to anon, authenticated;

grant select on public.solar_components_catalog
  to anon, authenticated;

-- ── Authenticated user tables ────────────────────────────────────────────────

-- profiles: users manage their own row; subscription_status/plan set server-side
grant select, update on public.profiles
  to authenticated;

-- saved_scenarios: full CRUD (RLS limits to own rows)
grant select, insert, update, delete on public.saved_scenarios
  to authenticated;

-- user_preferences: full CRUD (RLS limits to own rows)
grant select, insert, update, delete on public.user_preferences
  to authenticated;

-- ai_conversations: full CRUD
grant select, insert, update, delete on public.ai_conversations
  to authenticated;

-- ai_messages: full CRUD (RLS checks via conversation ownership)
grant select, insert, update, delete on public.ai_messages
  to authenticated;

-- simulation_runs: full CRUD
grant select, insert, update, delete on public.simulation_runs
  to authenticated;

-- simulation_data: no UPDATE (time-series data is immutable once written)
grant select, insert, delete on public.simulation_data
  to authenticated;

-- component_assets: full CRUD
grant select, insert, update, delete on public.component_assets
  to authenticated;

-- solar_components_catalog: SELECT (public, already granted above) + user CRUD
-- Re-granting insert/update/delete on top of the select grant above
grant insert, update, delete on public.solar_components_catalog
  to authenticated;

-- battery_modules: user-created entries
grant insert, update, delete on public.battery_modules
  to authenticated;

-- ── Sequence grants ──────────────────────────────────────────────────────────
--
-- bigserial columns need the authenticated role to have USAGE + SELECT on the
-- backing sequence, otherwise auto-generated PKs fail with a permission error.

grant usage, select on sequence public.simulation_data_id_seq
  to authenticated;


-- ---------------------------------------------------------------------------
-- SECTION 5 — total_minutes back-fill
--
-- The saveSimulationRun() helper in supabase-db.ts originally omitted
-- total_minutes from the INSERT payload.  This computed column can be derived
-- from simulation_data but it is cheaper to materialise it at write time.
-- The column already exists (added in full_migration.sql); this section adds
-- a DB-level trigger so future runs auto-populate it even if the application
-- layer forgets to set it.
-- ---------------------------------------------------------------------------

create or replace function public.refresh_run_total_minutes()
  returns trigger
  language plpgsql
  security invoker
  set search_path = ''
as $$
begin
  -- Count how many data rows belong to the run that just changed.
  -- Fired AFTER INSERT on simulation_data so the new row is already visible.
  update public.simulation_runs
  set total_minutes = (
    select count(*)::int
    from public.simulation_data
    where run_id = new.run_id
  )
  where id = new.run_id;
  return null;
end;
$$;

drop trigger if exists simulation_data_refresh_run_minutes on public.simulation_data;
create trigger simulation_data_refresh_run_minutes
  after insert on public.simulation_data
  for each statement
  execute function public.refresh_run_total_minutes();
