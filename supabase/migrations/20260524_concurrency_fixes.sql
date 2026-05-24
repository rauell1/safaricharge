-- =============================================================================
-- SafariCharge – Concurrency Fixes
-- Generated: 2026-05-24
--
-- 1. Adds a `version` column to saved_scenarios for optimistic locking.
-- 2. Creates upsert_scenario_versioned() – atomic scenario save that tracks
--    version and can detect concurrent-edit conflicts.
-- 3. Creates save_simulation_run_atomic() – saves a run header + all minute
--    data in one transaction so partial saves are impossible.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Version column on saved_scenarios
--    Default = 1 so existing rows are valid without a backfill.
-- ---------------------------------------------------------------------------
alter table public.saved_scenarios
  add column if not exists version integer not null default 1;


-- ---------------------------------------------------------------------------
-- 2. upsert_scenario_versioned
--
--    Atomically inserts or updates a saved_scenario row.
--    • p_expected_version = 0  → caller doesn't care about current version
--      (always insert-or-overwrite).  Used for brand-new scenarios.
--    • p_expected_version = N  → caller expects DB version to be N.  If the
--      DB row has a different version a conflict row is returned instead of
--      updating, letting the caller surface a "another device changed this"
--      error without clobbering the newer data.
--
--    Returns a single row: (success, new_version, conflict).
--    Runs as SECURITY INVOKER so RLS policies still apply.
-- ---------------------------------------------------------------------------
create or replace function public.upsert_scenario_versioned(
  p_id               uuid,
  p_name             text,
  p_config           jsonb,
  p_finance          jsonb,
  p_performance      jsonb,
  p_location         jsonb,
  p_engineering      jsonb,
  p_expected_version integer
)
returns table (success boolean, new_version integer, conflict boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid         uuid    := auth.uid();
  v_current_ver integer;
  v_new_ver     integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select version
    into v_current_ver
    from public.saved_scenarios
   where id = p_id and user_id = v_uid;

  if not found then
    -- Brand-new row — insert with version = 1
    insert into public.saved_scenarios
      (id, user_id, name, config, finance, performance, location, engineering, version)
    values
      (p_id, v_uid, p_name, p_config, p_finance, p_performance, p_location, p_engineering, 1);

    return query select true::boolean, 1::integer, false::boolean;
    return;
  end if;

  -- Existing row: check version when caller supplied one
  if p_expected_version <> 0 and v_current_ver <> p_expected_version then
    return query select false::boolean, v_current_ver, true::boolean;
    return;
  end if;

  v_new_ver := v_current_ver + 1;

  update public.saved_scenarios
     set name        = p_name,
         config      = p_config,
         finance     = p_finance,
         performance = p_performance,
         location    = p_location,
         engineering = p_engineering,
         version     = v_new_ver,
         updated_at  = now()
   where id = p_id and user_id = v_uid;

  return query select true::boolean, v_new_ver, false::boolean;
end;
$$;

grant execute on function public.upsert_scenario_versioned(
  uuid, text, jsonb, jsonb, jsonb, jsonb, jsonb, integer
) to authenticated;


-- ---------------------------------------------------------------------------
-- 3. save_simulation_run_atomic
--
--    Inserts a simulation_runs header row and ALL minute data rows inside a
--    single PL/pgSQL call, which Postgres wraps in one transaction.  If any
--    minute-data insert fails the header is automatically rolled back — no
--    partial saves, no orphaned rows.
--
--    p_minute_data  – jsonb array of objects with snake_case keys matching
--                     the simulation_data column names (ts, solar_kw, …).
--
--    Returns the new run UUID.
--    Runs as SECURITY INVOKER so RLS policies still apply.
-- ---------------------------------------------------------------------------
create or replace function public.save_simulation_run_atomic(
  p_scenario_id          uuid,
  p_name                 text,
  p_solar_capacity_kw    numeric,
  p_battery_capacity_kwh numeric,
  p_inverter_kw          numeric,
  p_system_mode          text,
  p_location_name        text,
  p_latitude             numeric,
  p_longitude            numeric,
  p_summary_json         jsonb,
  p_minute_data          jsonb   -- array of minute-data point objects
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_run_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Insert header; any failure here aborts everything
  insert into public.simulation_runs (
    user_id, scenario_id, name,
    solar_capacity_kw, battery_capacity_kwh, inverter_kw,
    system_mode, location_name, latitude, longitude,
    summary_json
  )
  values (
    v_uid, p_scenario_id, p_name,
    p_solar_capacity_kw, p_battery_capacity_kwh, p_inverter_kw,
    p_system_mode, p_location_name, p_latitude, p_longitude,
    p_summary_json
  )
  returning id into v_run_id;

  -- Insert all minute data in one statement; failure rolls back the header too
  insert into public.simulation_data (
    run_id, ts,
    solar_kw, home_load_kw, ev1_load_kw, ev2_load_kw,
    battery_level_pct, grid_import_kw, grid_export_kw,
    savings_kes, tariff_rate, is_peak_time
  )
  select
    v_run_id,
    (pt->>'ts')::timestamptz,
    (pt->>'solar_kw')::numeric,
    (pt->>'home_load_kw')::numeric,
    (pt->>'ev1_load_kw')::numeric,
    (pt->>'ev2_load_kw')::numeric,
    (pt->>'battery_level_pct')::numeric,
    (pt->>'grid_import_kw')::numeric,
    (pt->>'grid_export_kw')::numeric,
    (pt->>'savings_kes')::numeric,
    (pt->>'tariff_rate')::numeric,
    (pt->>'is_peak_time')::boolean
  from jsonb_array_elements(p_minute_data) as pt;

  return v_run_id;
end;
$$;

grant execute on function public.save_simulation_run_atomic(
  uuid, text, numeric, numeric, numeric, text, text, numeric, numeric, jsonb, jsonb
) to authenticated;
