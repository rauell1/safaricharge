-- SafariCharge — Sizing snapshot on simulation runs
-- Adds sizing_snapshot JSONB to simulation_runs so every saved physics-sim run
-- also stores the BOM / financial summary produced by the sizing engine.
-- Also enriches sizing_simulation_logs with additional financial columns.

-- ── 1. simulation_runs: add sizing_snapshot column ────────────────────────────
alter table public.simulation_runs
  add column if not exists sizing_snapshot jsonb;

-- ── 2. sizing_simulation_logs: add financial detail columns ───────────────────
alter table public.sizing_simulation_logs
  add column if not exists annual_savings_usd    numeric,
  add column if not exists annual_pv_kwh         numeric,
  add column if not exists system_autonomy_pct   numeric,
  add column if not exists lcoe_usd_per_kwh      numeric,
  add column if not exists total_capex_ksh       numeric;

-- ── 3. Update RPC to accept optional sizing_snapshot ─────────────────────────
-- Uses CREATE OR REPLACE so existing callers (without the new param) still work
-- because p_sizing_snapshot has a DEFAULT NULL.

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
  p_minute_data          jsonb,
  p_sizing_snapshot      jsonb default null
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

  insert into public.simulation_runs (
    user_id, scenario_id, name,
    solar_capacity_kw, battery_capacity_kwh, inverter_kw,
    system_mode, location_name, latitude, longitude,
    summary_json, sizing_snapshot
  )
  values (
    v_uid, p_scenario_id, p_name,
    p_solar_capacity_kw, p_battery_capacity_kwh, p_inverter_kw,
    p_system_mode, p_location_name, p_latitude, p_longitude,
    p_summary_json, p_sizing_snapshot
  )
  returning id into v_run_id;

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

-- Grant to authenticated (replaces the previous grant for the old signature)
grant execute on function public.save_simulation_run_atomic(
  uuid, text, numeric, numeric, numeric, text, text, numeric, numeric, jsonb, jsonb, jsonb
) to authenticated;
