/**
 * Supabase DB service layer — typed CRUD helpers for the SafariCharge data model.
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
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

function rowToScenario(row: SavedScenarioRow): SavedScenario {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
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
): Omit<SavedScenarioRow, 'created_at' | 'updated_at'> {
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
 * Insert or update a scenario row (matched on `id`).
 */
export async function upsertScenario(scenario: SavedScenario): Promise<void> {
  try {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const row = scenarioToRow(scenario, user.id);

    const { error } = await supabase
      .from('saved_scenarios')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('[supabase-db] upsertScenario error:', error.message);
    }
  } catch (err) {
    console.error('[supabase-db] upsertScenario unexpected error:', err);
  }
}

/**
 * Delete a scenario row by its id.
 */
export async function deleteScenarioById(id: string): Promise<void> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('saved_scenarios')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[supabase-db] deleteScenarioById error:', error.message);
    }
  } catch (err) {
    console.error('[supabase-db] deleteScenarioById unexpected error:', err);
  }
}

/**
 * Rename a scenario row (update `name` and touch `updated_at`).
 */
export async function renameScenario(id: string, name: string): Promise<void> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('saved_scenarios')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[supabase-db] renameScenario error:', error.message);
    }
  } catch (err) {
    console.error('[supabase-db] renameScenario unexpected error:', err);
  }
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
}

const CHUNK_SIZE = 500;

/**
 * Persist a simulation run and its minute-by-minute data to Supabase.
 *
 * 1. Inserts a header row into `simulation_runs`.
 * 2. Batch-inserts `minuteData` into `simulation_data` in chunks of 500.
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

  // 1. Insert the run header
  const { data: runRow, error: runError } = await supabase
    .from('simulation_runs')
    .insert({
      user_id: user.id,
      scenario_id: run.scenarioId ?? null,
      name: run.name,
      solar_capacity_kw: run.solarCapacityKw,
      battery_capacity_kwh: run.batteryCapacityKwh,
      inverter_kw: run.inverterKw,
      system_mode: run.systemMode,
      location_name: run.locationName ?? null,
      latitude: run.latitude ?? null,
      longitude: run.longitude ?? null,
      summary_json: run.summaryJson,
      total_minutes: run.minuteData.length,
    })
    .select('id')
    .single();

  if (runError || !runRow) {
    throw new Error(
      `[supabase-db] saveSimulationRun insert error: ${runError?.message}`
    );
  }

  const runId: string = runRow.id;

  // 2. Batch-insert minute data in chunks
  for (let i = 0; i < run.minuteData.length; i += CHUNK_SIZE) {
    const chunk = run.minuteData.slice(i, i + CHUNK_SIZE).map((pt) => ({
      run_id: runId,
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

    const { error: chunkError } = await supabase
      .from('simulation_data')
      .insert(chunk);

    if (chunkError) {
      console.error(
        `[supabase-db] saveSimulationRun chunk ${i / CHUNK_SIZE} error:`,
        chunkError.message
      );
    }
  }

  return runId;
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
 * Upsert a user preference. Fire-and-forget — callers should not await.
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
    // Silently swallow — preferences are best-effort
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
