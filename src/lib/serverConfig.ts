/**
 * Server-only configuration derived from environment variables.
 *
 * Values defined here should never be imported into client components to
 * avoid leaking secrets into the browser bundle.
 */

const parseList = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) return fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/** Comma-separated list of origins allowed to call our APIs. */
export const API_ALLOWED_ORIGINS = parseList(process.env.API_ALLOWED_ORIGINS, [
  'https://sc-solar-dashboard.vercel.app',
  'http://localhost:3000',
]);

/** Shared bearer token for server-to-server API calls. */
export const API_SERVICE_TOKEN = process.env.API_SERVICE_TOKEN ?? '';

/** Enable role checks via the `x-sc-role` header when true. */
export const ENABLE_RBAC = (process.env.ENABLE_RBAC ?? 'false').toLowerCase() === 'true';

/** Optional shared secret for HMAC verification of incoming POST bodies. */
export const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';

/** Milliseconds to wait before timing out upstream API requests. */
export const DEFAULT_API_TIMEOUT_MS = Number(process.env.DEFAULT_API_TIMEOUT_MS ?? 12000);

/** Allowed roles for RBAC header validation. */
export const ALLOWED_ROLES = parseList(process.env.API_ALLOWED_ROLES, [
  'viewer',
  'operator',
  'analyst',
  'admin',
]);

/** Header name used for RBAC role propagation. */
export const ROLE_HEADER = process.env.API_ROLE_HEADER ?? 'x-sc-role';

/** Sliding window size for middleware rate limiting (ms). */
export const RATE_LIMIT_WINDOW_MS = parseNumber(process.env.RATE_LIMIT_WINDOW_MS, 60_000);

/** Generic API limit per window for non-expensive routes. */
export const RATE_LIMIT_API_PER_WINDOW = parseNumber(process.env.RATE_LIMIT_API_PER_WINDOW, 60);

/** AI route request limit per window. */
export const RATE_LIMIT_AI_PER_WINDOW = parseNumber(process.env.RATE_LIMIT_AI_PER_WINDOW, 10);

/** Export/formal report route limit per window. */
export const RATE_LIMIT_REPORT_PER_WINDOW = parseNumber(
  process.env.RATE_LIMIT_REPORT_PER_WINDOW,
  5
);
