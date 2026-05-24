/**
 * GET /api/audit
 *
 * Returns the authenticated user's immutable audit trail from audit_log.
 *
 * Query parameters:
 *   resource  — filter by table name (e.g. "saved_scenarios")
 *   action    — filter by operation (e.g. "saved_scenarios.update")
 *   since     — ISO timestamp lower bound (default: 30 days ago)
 *   until     — ISO timestamp upper bound (default: now)
 *   limit     — max rows to return (default: 50, max: 200)
 *   offset    — pagination offset (default: 0)
 *
 * The query only returns rows where actor_id = auth.uid() (enforced by RLS).
 * Service-role access to audit_log is intentionally not exposed via this route.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const DEFAULT_SINCE_DAYS = 30;

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;

  const resource = searchParams.get('resource');
  const action   = searchParams.get('action');

  const sinceParam = searchParams.get('since');
  const untilParam = searchParams.get('until');
  const since = sinceParam
    ? new Date(sinceParam).toISOString()
    : new Date(Date.now() - DEFAULT_SINCE_DAYS * 86_400_000).toISOString();
  const until = untilParam ? new Date(untilParam).toISOString() : new Date().toISOString();

  const limitParam = parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
  const limit = Math.min(isNaN(limitParam) ? DEFAULT_LIMIT : limitParam, MAX_LIMIT);
  const offsetParam = parseInt(searchParams.get('offset') ?? '0', 10);
  const offset = isNaN(offsetParam) ? 0 : Math.max(0, offsetParam);

  let query = supabase
    .from('audit_log')
    .select('id, ts, action, resource, resource_id, org_id, old_data, new_data, metadata', {
      count: 'exact',
    })
    .eq('actor_id', user.id)   // redundant with RLS — belt-and-suspenders
    .gte('ts', since)
    .lte('ts', until)
    .order('ts', { ascending: false })
    .range(offset, offset + limit - 1);

  if (resource) query = query.eq('resource', resource);
  if (action)   query = query.eq('action', action);

  const { data, error, count } = await query;

  if (error) {
    console.error('[audit] query error:', error.message);
    return NextResponse.json({ error: 'Failed to query audit log.' }, { status: 500 });
  }

  return NextResponse.json({
    entries: data,
    total:   count ?? 0,
    limit,
    offset,
    since,
    until,
  });
}
