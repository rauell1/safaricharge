/**
 * In-memory sliding-window rate limiter for Next.js Node.js API routes.
 *
 * Each call to `checkRateLimit` is O(1) amortised. Counters are keyed by
 * `${bucket}:${clientKey}` so different route tiers share one Map.
 *
 * Limitations: counter state is per-process; does not survive restarts or
 * scale across multiple server instances. Suitable for single-instance
 * deployments; replace with Upstash/Redis for multi-instance production.
 */

import { NextRequest, NextResponse } from 'next/server';
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

interface WindowEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, WindowEntry>();

// Purge stale entries every ~5 minutes to prevent unbounded memory growth.
const PURGE_INTERVAL_MS = 5 * 60 * 1_000;
let lastPurge = Date.now();

function maybePurge(now: number) {
  if (now - lastPurge < PURGE_INTERVAL_MS) return;
  lastPurge = now;
  for (const [key, entry] of store) {
    if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
      store.delete(key);
    }
  }
}

/**
 * Returns a 429 NextResponse if the client has exceeded the tier limit,
 * otherwise returns null and increments the counter.
 *
 * @param request  Incoming Next.js request (used to derive the client IP).
 * @param tier     Rate-limit bucket ('api' | 'ai' | 'report').
 * @param headers  Response headers to attach to the 429 (for CORS etc.).
 */
export function checkRateLimit(
  request: NextRequest,
  tier: RateLimitTier,
  headers: Headers,
): NextResponse | null {
  const now = Date.now();
  maybePurge(now);

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  const key = `${tier}:${ip}`;
  const limit = limitForTier(tier);
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now });
    return null;
  }

  if (entry.count >= limit) {
    const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1_000);
    const rl = new Headers(headers);
    rl.set('Retry-After', String(retryAfterSec));
    rl.set('X-RateLimit-Limit', String(limit));
    rl.set('X-RateLimit-Remaining', '0');
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: rl },
    );
  }

  entry.count += 1;
  return null;
}
