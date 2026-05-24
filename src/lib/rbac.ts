/**
 * RBAC helpers for SafariCharge.
 *
 * Role hierarchy (lowest → highest):
 *   viewer < operator < analyst < admin < owner
 *
 * Usage — check that the current user has at least a given role in an org:
 *
 *   const role = await getOrgRole(supabase, userId, orgId);
 *   if (!hasMinRole(role, 'analyst')) return forbidden();
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export type OrgRole = 'viewer' | 'operator' | 'analyst' | 'admin' | 'owner';

const ROLE_RANK: Record<OrgRole, number> = {
  viewer:   1,
  operator: 2,
  analyst:  3,
  admin:    4,
  owner:    5,
};

/** Returns true when `role` meets or exceeds `minimum`. */
export function hasMinRole(role: OrgRole | null, minimum: OrgRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

/** Fetch the current user's role in `orgId`, or null if not a member. */
export async function getOrgRole(
  supabase: SupabaseClient,
  userId: string,
  orgId: string
): Promise<OrgRole | null> {
  const { data, error } = await supabase
    .from('org_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data.role as OrgRole;
}

/**
 * Assert that the current user has at least `minRole` in `orgId`.
 * Returns a 403 NextResponse on failure, or null on success.
 */
export async function requireOrgRole(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  minRole: OrgRole
): Promise<NextResponse | null> {
  const role = await getOrgRole(supabase, userId, orgId);
  if (!hasMinRole(role, minRole)) {
    return NextResponse.json(
      { error: `Requires at least "${minRole}" role in this organisation.` },
      { status: 403 }
    );
  }
  return null;
}

/** Build a 403 Forbidden response (convenience). */
export function forbidden(message = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
