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

