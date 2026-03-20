import { NextRequest, NextResponse } from 'next/server';

/**
 * In-memory sliding-window rate limiter.
 *
 * Works correctly for standalone (single-process) deployments.
 * For multi-instance or serverless environments, replace `rateLimitStore`
 * with a shared store such as Upstash Redis or Vercel KV.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// Module-level store – persists across requests in the same process.
const rateLimitStore = new Map<string, RateLimitEntry>();

// Evict stale entries every 60 seconds to prevent unbounded memory growth.
const CLEANUP_INTERVAL_MS = 60_000;
// Entries older than 2× the cleanup interval are considered expired.
const EVICTION_AGE_MS = CLEANUP_INTERVAL_MS * 2;
let lastCleanup = Date.now();

interface RateLimitRule {
  pattern: RegExp;
  /** Maximum requests allowed within `windowMs`. */
  limit: number;
  /** Time window length in milliseconds. */
  windowMs: number;
}

/**
 * Rules are evaluated in order; the first match wins.
 * Tighten limits on expensive endpoints (AI, large exports) first.
 */
const RATE_LIMIT_RULES: RateLimitRule[] = [
  // AI endpoint – each request calls an external LLM API.
  { pattern: /^\/api\/safaricharge-ai/, limit: 10, windowMs: 60_000 },
  // Report generation – CPU and memory intensive.
  { pattern: /^\/api\/formal-report/, limit: 5, windowMs: 60_000 },
  // CSV export – iterates over up to millions of data points.
  { pattern: /^\/api\/export-report/, limit: 5, windowMs: 60_000 },
  // Catch-all for any other API routes.
  { pattern: /^\/api\//, limit: 60, windowMs: 60_000 },
];

/** Extract the real client IP, respecting common proxy headers. */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Returns `true` when the given key has exceeded `limit` requests
 * within the sliding `windowMs` period, `false` otherwise.
 */
function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  // Periodic eviction of expired entries.
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    lastCleanup = now;
    for (const [k, v] of rateLimitStore.entries()) {
      if (now - v.windowStart > EVICTION_AGE_MS) {
        rateLimitStore.delete(k);
      }
    }
  }

  const entry = rateLimitStore.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    // Start a fresh window.
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= limit) {
    return true;
  }

  entry.count += 1;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rule = RATE_LIMIT_RULES.find((r) => r.pattern.test(pathname));
  if (!rule) return NextResponse.next();

  const ip = getClientIp(request);
  // Key by rule pattern (not full pathname) so all sub-paths of an endpoint
  // share the same counter – prevents bypassing limits via path variations.
  const key = `${rule.pattern.source}::${ip}`;

  if (isRateLimited(key, rule.limit, rule.windowMs)) {
    return new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(rule.windowMs / 1000)),
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  // Only run the middleware on API routes.
  matcher: ['/api/:path*'],
};
