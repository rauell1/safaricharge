/**
 * Supabase DB service layer -  typed CRUD helpers for the SafariCharge data model.
 *
 * All scenario/simulation functions use the BROWSER client so RLS policies run
 * against the signed-in user's session.
 *
 * The AI cache helpers use the SERVICE ROLE client (server-only) because the
 * ai_response_cache table has no public RLS.
 */

import { createClient } from '@/lib/supabase';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type {
  SavedScenario,
  FinancialSnapshot,
  PerformanceSnapshot,
  LocationCoordinatesSnapshot,
  EngineeringSnapshot,
  SystemConfigSnapshot,
} from '@/stores/energySystemStore';

// ── DB row shapes ─────────────────────────────────────────────────────────────

interface SavedScenarioRow {
  id: string;
  user_id: string;
  name: string;
  config: SystemConfigSnapshot;
  finance: FinancialSnapshot;
  performance: PerformanceSnapshot;
  location: LocationCoordinatesSnapshot;
  engineering: EngineeringSnapshot | null;
  created_at: string;
  updated_at: string;
  version: number;
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

function rowToScenario(row: SavedScenarioRow): SavedScenario {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    version: row.version,
    system: row.config,
    finance: row.finance,
    performance: row.performance,
    location: row.location,
    ...(row.engineering ? { engineering: row.engineering } : {}),
  };
}

function scenarioToRow(
  scenario: SavedScenario,
  userId: string
): Omit<SavedScenarioRow, 'created_at' | 'updated_at' | 'version'> {
  return {
    id: scenario.id,
    user_id: userId,
    name: scenario.name,
    config: scenario.system,
    finance: scenario.finance,
    performance: scenario.performance,
    location: scenario.location,
    engineering: scenario.engineering ?? null,
  };
}

// ── Scenarios ─────────────────────────────────────────────────────────────────

/**
 * Fetch all saved scenarios for the current user, ordered by creation time.
 * Returns an empty array if the user is not logged in or on any error.
 */
export async function fetchScenarios(): Promise<SavedScenario[]> {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from('saved_scenarios')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[supabase-db] fetchScenarios error:', error.message);
      return [];
    }

    return (data as SavedScenarioRow[]).map(rowToScenario);
  } catch (err) {
    console.error('[supabase-db] fetchScenarios unexpected error:', err);
    return [];
  }
}

/**
 * Insert or update a scenario row using an atomic versioned RPC.
 *
 * Pass scenario.version (from a previous DB read) so the server can detect
 * concurrent edits from other tabs/devices.  New scenarios have no version
 * yet -  omit it (undefined) and the RPC skips the conflict check.
 *
 * Returns the version number the DB assigned to the saved row.
 * Throws on any DB/network error or version conflict.
 */
export async function upsertScenario(
  scenario: SavedScenario
): Promise<{ newVersion: number }> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  const row = scenarioToRow(scenario, user.id);

  const { data, error } = await supabase.rpc('upsert_scenario_versioned', {
    p_id: row.id,
    p_name: row.name,
    p_config: row.config,
    p_finance: row.finance,
    p_performance: row.performance,
    p_location: row.location,
    p_engineering: row.engineering ?? null,
    p_expected_version: scenario.version ?? 0,
  });

  if (error) throw new Error(error.message);

  const result = (
    data as Array<{ success: boolean; new_version: number; conflict: boolean }>
  )[0];

  if (result.conflict) {
    throw new Error(
      'VERSION_CONFLICT: another session updated this scenario. Reload to see the latest version.'
    );
  }

  return { newVersion: result.new_version };
}

/**
 * Delete a scenario row by its id.
 * Throws on any DB/network error so callers can roll back optimistic UI updates.
 */
export async function deleteScenarioById(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('saved_scenarios')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/**
 * Rename a scenario row (update `name` and touch `updated_at`).
 * Throws on any DB/network error so callers can roll back optimistic UI updates.
 */
export async function renameScenario(id: string, name: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('saved_scenarios')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ── Simulation runs ───────────────────────────────────────────────────────────

export interface SimulationMinutePoint {
  ts: string;
  solarKw: number;
  homeLoadKw: number;
  ev1LoadKw: number;
  ev2LoadKw: number;
  batteryLevelPct: number;
  gridImportKw: number;
  gridExportKw: number;
  savingsKes: number;
  tariffRate: number;
  isPeakTime: boolean;
}

export interface SaveSimulationRunInput {
  scenarioId?: string;
  name: string;
  solarCapacityKw: number;
  batteryCapacityKwh: number;
  inverterKw: number;
  systemMode: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  summaryJson: Record<string, unknown>;
  minuteData: SimulationMinutePoint[];
  /** BOM / financial snapshot from the sizing engine (stored in sizing_snapshot column) */
  sizingSnapshot?: Record<string, unknown>;
}

/**
 * Persist a simulation run and its minute-by-minute data to Supabase atomically.
 *
 * Uses the save_simulation_run_atomic RPC, which inserts the header row and
 * all minute data in a single transaction.  If any insert fails the entire
 * save is rolled back -  no orphaned headers or partial data sets.
 *
 * Returns the new run's UUID.
 */
export async function saveSimulationRun(
  run: SaveSimulationRunInput
): Promise<string> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  const minuteData = run.minuteData.map((pt) => ({
    ts: pt.ts,
    solar_kw: pt.solarKw,
    home_load_kw: pt.homeLoadKw,
    ev1_load_kw: pt.ev1LoadKw,
    ev2_load_kw: pt.ev2LoadKw,
    battery_level_pct: pt.batteryLevelPct,
    grid_import_kw: pt.gridImportKw,
    grid_export_kw: pt.gridExportKw,
    savings_kes: pt.savingsKes,
    tariff_rate: pt.tariffRate,
    is_peak_time: pt.isPeakTime,
  }));
  // total_minutes is populated automatically by the refresh_run_total_minutes trigger

  const { data, error } = await supabase.rpc('save_simulation_run_atomic', {
    p_scenario_id: run.scenarioId ?? null,
    p_name: run.name,
    p_solar_capacity_kw: run.solarCapacityKw,
    p_battery_capacity_kwh: run.batteryCapacityKwh,
    p_inverter_kw: run.inverterKw,
    p_system_mode: run.systemMode,
    p_location_name: run.locationName ?? null,
    p_latitude: run.latitude ?? null,
    p_longitude: run.longitude ?? null,
    p_summary_json: run.summaryJson,
    p_minute_data: minuteData,
    p_sizing_snapshot: run.sizingSnapshot ?? null,
  });

  if (error) {
    throw new Error(`[supabase-db] saveSimulationRun error: ${error.message}`);
  }

  return data as string;
}

// ── AI response cache (server-only, service role) ─────────────────────────────

/**
 * Create a Supabase client using the service role key.
 * MUST only be called from server-side code (API routes, Server Actions).
 */
function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      '[supabase-db] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars'
    );
  }

  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Look up a cached AI response by cache key.
 * Returns `null` if the key doesn't exist or has expired.
 * SERVER-ONLY.
 */
export async function getCachedAIResponse(
  cacheKey: string
): Promise<string | null> {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('ai_response_cache')
      .select('response, expires_at')
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (error) {
      console.error('[supabase-db] getCachedAIResponse error:', error.message);
      return null;
    }

    if (!data) return null;

    // Respect TTL: if expires_at is in the past, treat as a miss
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    return data.response as string;
  } catch (err) {
    console.error('[supabase-db] getCachedAIResponse unexpected error:', err);
    return null;
  }
}

/**
 * Write (or overwrite) a cached AI response.
 * `ttlMs` is the time-to-live in milliseconds from now.
 * SERVER-ONLY.
 */
export async function setCachedAIResponse(
  cacheKey: string,
  response: string,
  ttlMs: number
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const expiresAt = new Date(Date.now() + ttlMs).toISOString();

    const { error } = await supabase
      .from('ai_response_cache')
      .upsert(
        { cache_key: cacheKey, response, expires_at: expiresAt },
        { onConflict: 'cache_key' }
      );

    if (error) {
      console.error('[supabase-db] setCachedAIResponse error:', error.message);
    }
  } catch (err) {
    console.error('[supabase-db] setCachedAIResponse unexpected error:', err);
  }
}

// ── User preferences ──────────────────────────────────────────────────────────

/**
 * Fetch a single user preference by key. Returns null if not found or not auth'd.
 */
export async function getUserPreference<T>(key: string): Promise<T | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('user_preferences')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', key)
      .maybeSingle();

    return (data?.value as T) ?? null;
  } catch {
    return null;
  }
}

/**
 * Upsert a user preference. Fire-and-forget -  callers should not await.
 */
export async function setUserPreference(key: string, value: unknown): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_preferences')
      .upsert(
        { user_id: user.id, key, value, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,key' }
      );
  } catch {
    // Silently swallow -  preferences are best-effort
  }
}

/**
 * Fetch multiple preferences in a single query. Returns a map of key → value.
 */
export async function getMultiplePreferences(keys: string[]): Promise<Record<string, unknown>> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { data } = await supabase
      .from('user_preferences')
      .select('key, value')
      .eq('user_id', user.id)
      .in('key', keys);

    return Object.fromEntries((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));
  } catch {
    return {};
  }
}

// ── AI conversations ──────────────────────────────────────────────────────────

/**
 * Create a new AI conversation row. Returns the new conversation id, or null
 * if the user is not authenticated or the insert fails.
 */
export async function createConversation(title?: string): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({ user_id: user.id, title: title ?? null })
      .select('id')
      .single();

    if (error) {
      console.error('[supabase-db] createConversation error:', error.message);
      return null;
    }
    return (data as { id: string }).id;
  } catch {
    return null;
  }
}

/**
 * Append a message to an existing conversation (fire-and-forget safe).
 */
export async function appendMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  systemDataSnapshot?: unknown,
): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      role,
      content,
      system_data_snapshot: systemDataSnapshot ?? null,
    });
  } catch {
    // Fire-and-forget; never block the UI on a failed DB write
  }
}

export interface SimulationRun {
  id: string;
  user_id: string;
  scenario_id: string | null;
  name: string;
  solar_capacity_kw: number | null;
  battery_capacity_kwh: number | null;
  inverter_kw: number | null;
  system_mode: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  total_minutes: number | null;
  summary_json: Record<string, any> | null;
  created_at: string;
}

/**
 * Fetch all past simulation runs for the authenticated user, ordered by date descending.
 */
export async function fetchSimulationRuns(): Promise<SimulationRun[]> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('simulation_runs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[supabase-db] fetchSimulationRuns error:', error.message);
      return [];
    }

    return (data || []) as SimulationRun[];
  } catch (err) {
    console.error('[supabase-db] fetchSimulationRuns unexpected error:', err);
    return [];
  }
}

/**
 * Fetch and map time-series minute data points for a specific simulation run.
 */
export async function fetchSimulationDataPoints(runId: string): Promise<any[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('simulation_data')
      .select('*')
      .eq('run_id', runId)
      .order('ts', { ascending: true });

    if (error) {
      console.error('[supabase-db] fetchSimulationDataPoints error:', error.message);
      return [];
    }

    return (data || []).map((row) => {
      const d = new Date(row.ts);
      return {
        timestamp: row.ts,
        date: row.ts.slice(0, 10),
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        week: 1,
        day: d.getDate(),
        hour: d.getHours(),
        minute: d.getMinutes(),
        solarKW: Number(row.solar_kw || 0),
        homeLoadKW: Number(row.home_load_kw || 0),
        ev1LoadKW: Number(row.ev1_load_kw || 0),
        ev2LoadKW: Number(row.ev2_load_kw || 0),
        batteryPowerKW: 0,
        batteryLevelPct: Number(row.battery_level_pct || 0),
        gridImportKW: Number(row.grid_import_kw || 0),
        gridExportKW: Number(row.grid_export_kw || 0),
        ev1SocPct: 50,
        ev2SocPct: 50,
        tariffRate: Number(row.tariff_rate || 22),
        isPeakTime: Boolean(row.is_peak_time),
        savingsKES: Number(row.savings_kes || 0),
        solarEnergyKWh: Number(row.solar_kw || 0) / 60,
        homeLoadKWh: Number(row.home_load_kw || 0) / 60,
        ev1LoadKWh: Number(row.ev1_load_kw || 0) / 60,
        ev2LoadKWh: Number(row.ev2_load_kw || 0) / 60,
        gridImportKWh: Number(row.grid_import_kw || 0) / 60,
        gridExportKWh: Number(row.grid_export_kw || 0) / 60,
      };
    });
  } catch (err) {
    console.error('[supabase-db] fetchSimulationDataPoints unexpected error:', err);
    return [];
  }
}

/**
 * Delete a simulation run by its ID.
 */
export async function deleteSimulationRun(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('simulation_runs')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}


