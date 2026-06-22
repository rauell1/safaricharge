/**
 * /api/scenarios/[id] -  Per-scenario mutations
 *
 * PATCH  → rename a scenario
 * DELETE → permanently delete a scenario
 *
 * Both handlers verify the session and rely on RLS to ensure a user can only
 * mutate their own scenarios.  No extra .eq('user_id', user.id) filter is
 * needed -  the policy enforces it at the DB level.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ── PATCH /api/scenarios/[id] ─────────────────────────────────────────────────

/**
 * Rename a saved scenario.
 *
 * Body: { name: string }
 *
 * Response 200: { id: string, name: string, updatedAt: string }
 * Response 400: { error: string }
 * Response 401: { error: 'Unauthorized' }
 * Response 404: { error: 'Not found' }   (scenario doesn't exist or belongs to another user)
 * Response 500: { error: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Missing scenario id' }, { status: 400 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  // The RLS UPDATE policy ensures this only touches rows the user owns.
  // If the row belongs to another user, Postgres silently matches 0 rows and
  // we return 404.
  const { data, error } = await supabase
    .from('saved_scenarios')
    .update({
      name:       body.name.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, name, updated_at')
    .maybeSingle();

  if (error) {
    console.error(`[PATCH /api/scenarios/${id}] Supabase error:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    // Row wasn't updated -  either it doesn't exist or belongs to another user.
    // Both cases are presented as 404 to avoid leaking information.
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    id:        (data as { id: string; name: string; updated_at: string }).id,
    name:      (data as { id: string; name: string; updated_at: string }).name,
    updatedAt: (data as { id: string; name: string; updated_at: string }).updated_at,
  });
}

// ── DELETE /api/scenarios/[id] ────────────────────────────────────────────────

/**
 * Permanently delete a saved scenario.
 *
 * Response 204: (no body)
 * Response 401: { error: 'Unauthorized' }
 * Response 404: { error: 'Not found' }
 * Response 500: { error: string }
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: 'Missing scenario id' }, { status: 400 });
  }

  // count: 'exact' lets us detect whether the row was matched + deleted.
  const { count, error } = await supabase
    .from('saved_scenarios')
    .delete({ count: 'exact' })
    .eq('id', id);

  if (error) {
    console.error(`[DELETE /api/scenarios/${id}] Supabase error:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
