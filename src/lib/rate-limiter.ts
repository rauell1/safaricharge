/**
 * Postgres-backed sliding-window rate limiter for Next.js API routes.
 *
 * Uses Supabase RPC `increment_rate_limit` to atomically increment and check
 * counters stored in the `rate_limit_counters` table. This implementation
 * scales across multiple server instances and survives restarts.
 *
 * Fail-open: if Supabase is unavailable the request is allowed and a warning
 * is logged -  rate-limiter failures never block legitimate traffic.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_API_PER_WINDOW,
  RATE_LIMIT_AI_PER_WINDOW,
  RATE_LIMIT_REPORT_PER_WINDOW,
} from './serverConfig';

export type RateLimitTier = 'api' | 'ai' | 'report';

const limitForTier = (tier: RateLimitTier): number => {
  if (tier === 'ai') return RATE_LIMIT_AI_PER_WINDOW;
  if (tier === 'report') return RATE_LIMIT_REPORT_PER_WINDOW;
  return RATE_LIMIT_API_PER_WINDOW;
};

// Lazy singleton for the service-role admin client
let _adminClient: ReturnType<typeof createClient> | null = null;
function getAdminClient() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return _adminClient;
}

/**
 * Returns a 429 NextResponse if the client has exceeded the tier limit,
 * otherwise returns null and increments the counter.
 *
 * @param request  Incoming Next.js request (used to derive the client IP).
 * @param tier     Rate-limit bucket ('api' | 'ai' | 'report').
 * @param headers  Response headers to attach to the 429 (for CORS etc.).
 */
export async function checkRateLimit(
  request: NextRequest,
  tier: RateLimitTier,
  headers: Headers,
): Promise<NextResponse | null> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.warn('[RateLimit] SUPABASE_SERVICE_ROLE_KEY not set -  skipping rate limit check');
    return null;
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const key = `${tier}:${ip}`;
  const limit = limitForTier(tier);

  try {
    const supabase = getAdminClient();
    type RpcResult = { allowed: boolean; count: number; retry_after_ms: number };
    const rpc = supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: RpcResult[] | null; error: { message: string } | null }>;
    const { data, error } = await rpc('increment_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_ms: RATE_LIMIT_WINDOW_MS,
    });

    if (error) {
      console.warn('[RateLimit] RPC error -  allowing request (fail open):', error.message);
      return null;
    }

    const result = Array.isArray(data) ? data[0] : (data as RpcResult | null);

    if (result && result.allowed === false) {
      const retryAfterMs: number = result.retry_after_ms ?? RATE_LIMIT_WINDOW_MS;
      const retryAfterSec = Math.ceil(retryAfterMs / 1_000);
      const rl = new Headers(headers);
      rl.set('Retry-After', String(retryAfterSec));
      rl.set('X-RateLimit-Limit', String(limit));
      rl.set('X-RateLimit-Remaining', '0');
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: rl },
      );
    }

    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[RateLimit] Unexpected error -  allowing request (fail open):', message);
    return null;
  }
}
