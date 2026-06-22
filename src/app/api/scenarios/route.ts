/**
 * /api/scenarios -  Saved Scenarios CRUD
 *
 * Route handlers for listing and creating/updating a user's saved scenarios.
 * Per-scenario mutations (rename, delete) live in ./[id]/route.ts.
 *
 * Authentication model
 * ──────────────────────
 * All handlers use the SSR cookie-based Supabase client (createServerSupabaseClient)
 * so the logged-in user's JWT is read from the http-only session cookie that
 * @supabase/ssr writes at /auth/callback.  This means:
 *
 *   • RLS policies run as the signed-in user -  no manual user_id filtering needed.
 *   • The server never trusts a user-supplied user_id in the request body.
 *   • 401 is returned when the cookie is absent or the session has expired.
 *
 * The service_role client is used only for the admin audit log (see POST handler)
 * to demonstrate how to write to a service-only table that has no public RLS policy.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { Database } from '@/types/supabase';

// ── Type aliases from the generated Database definition ──────────────────────

type ScenarioRow = Database['public']['Tables']['saved_scenarios']['Row'];
type ScenarioInsert = Database['public']['Tables']['saved_scenarios']['Insert'];

// ── Shape returned to clients ─────────────────────────────────────────────────

interface ScenarioResponse {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  system: ScenarioRow['config'];
  finance: ScenarioRow['finance'];
  performance: ScenarioRow['performance'];
  location: ScenarioRow['location'];
  engineering?: ScenarioRow['engineering'];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a DB row → camelCase API response shape. */
function rowToResponse(row: ScenarioRow): ScenarioResponse {
  const out: ScenarioResponse = {
    id:          row.id,
    name:        row.name,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
    system:      row.config,
    finance:     row.finance,
    performance: row.performance,
    location:    row.location,
  };
  if (row.engineering) out.engineering = row.engineering;
  return out;
}

/**
 * Create a service_role client for admin operations.
 *
 * MUST only be called from server-side code (Route Handlers, Server Actions).
 * NEVER expose the service_role key to the browser -  it bypasses ALL RLS.
 */
function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error('[scenarios] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SECRET_KEY');
  }

  return createSupabaseAdmin<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── GET /api/scenarios ────────────────────────────────────────────────────────

/**
 * List all saved scenarios for the authenticated user, ordered by creation time.
 *
 * Response 200: { scenarios: ScenarioResponse[], total: number }
 * Response 401: { error: 'Unauthorized' }
 * Response 500: { error: string }
 */
export async function GET(): Promise<NextResponse> {
  // 1. Build the SSR client -  reads the user's session from the http-only cookie.
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfiguration: missing Supabase credentials.' }, { status: 500 });
  }

  // 2. Verify the session.  getUser() always makes a network call to Supabase Auth
  //    to validate the JWT, unlike getSession() which only checks local storage.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3. Fetch scenarios.
  //    RLS policy "saved_scenarios: users select own" automatically restricts
  //    rows to those where user_id = auth.uid() -  no .eq('user_id', user.id) needed.
  const { data, error } = await supabase
    .from('saved_scenarios')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[GET /api/scenarios] Supabase error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const scenarios = (data as ScenarioRow[]).map(rowToResponse);

  return NextResponse.json({ scenarios, total: scenarios.length });
}

// ── POST /api/scenarios ───────────────────────────────────────────────────────

/**
 * Create or update (upsert) a saved scenario.
 *
 * Request body must match the SavedScenario application shape.  The server
 * derives user_id from the verified session -  never from the request body.
 *
 * Body schema:
 * {
 *   id?:         string          // omit to auto-generate; provide to upsert
 *   name:        string
 *   system:      SystemConfigSnapshot
 *   finance:     FinancialSnapshot
 *   performance: PerformanceSnapshot
 *   location:    LocationCoordinatesSnapshot
 *   engineering?: EngineeringSnapshot
 * }
 *
 * Response 200: { scenario: ScenarioResponse }
 * Response 400: { error: string }
 * Response 401: { error: 'Unauthorized' }
 * Response 500: { error: string }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server misconfiguration: missing Supabase credentials.' }, { status: 500 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse and validate the request body.
  let body: {
    id?: string;
    name?: string;
    system?: unknown;
    finance?: unknown;
    performance?: unknown;
    location?: unknown;
    engineering?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  if (!body.system || !body.finance || !body.performance || !body.location) {
    return NextResponse.json(
      { error: 'system, finance, performance, and location are required' },
      { status: 400 }
    );
  }

  // Build the DB row.  user_id is always taken from the verified JWT -  the
  // client cannot supply or override it.
  const row: ScenarioInsert = {
    ...(body.id ? { id: body.id } : {}),
    user_id:     user.id,
    name:        body.name.trim(),
    config:      body.system as ScenarioRow['config'],
    finance:     body.finance as ScenarioRow['finance'],
    performance: body.performance as ScenarioRow['performance'],
    location:    body.location as ScenarioRow['location'],
    engineering: (body.engineering as ScenarioRow['engineering']) ?? null,
  };

  // Upsert: if id was provided and already exists, update it; otherwise insert.
  const { data, error } = await supabase
    .from('saved_scenarios')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[POST /api/scenarios] Supabase error:', error?.message);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to save scenario' },
      { status: 500 }
    );
  }

  // ── Admin audit log (service_role bypass example) ─────────────────────────
  //
  // The admin client bypasses RLS entirely, so it can write to
  // rate_limit_counters or any other service-only table without needing a
  // permissive RLS policy.  This is appropriate for server-side audit logging
  // where you want to record ALL write operations regardless of who triggered
  // them -  something you should NEVER do with the user-session client.
  try {
    const admin = createAdminClient();
    await admin
      .from('user_preferences')
      .upsert(
        {
          user_id:    user.id,
          key:        '__last_scenario_saved_at',
          value:      new Date().toISOString() as unknown as Database['public']['Tables']['user_preferences']['Insert']['value'],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,key' }
      );
  } catch (adminErr) {
    // Non-fatal -  audit log failure must never block the user response.
    console.warn('[POST /api/scenarios] Admin audit log failed:', adminErr);
  }

  return NextResponse.json({ scenario: rowToResponse(data as ScenarioRow) });
}
