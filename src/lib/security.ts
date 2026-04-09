import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  API_ALLOWED_ORIGINS,
  API_SERVICE_TOKEN,
  ENABLE_RBAC,
  WEBHOOK_SECRET,
  DEFAULT_API_TIMEOUT_MS,
  ALLOWED_ROLES,
  ROLE_HEADER,
} from './serverConfig';

interface CorsOptions {
  methods?: string[];
  allowedHeaders?: string[];
}

/**
  * Build CORS headers for API responses. When the request origin is on the
  * allowlist, echo it back to enable credentialed requests. Otherwise, fall
  * back to a strict same-origin policy.
  */
export function buildCorsHeaders(request: NextRequest, options: CorsOptions = {}) {
  const origin = request.headers.get('origin');
  const allowedHeaders = options.allowedHeaders ?? [
    'Content-Type',
    'Authorization',
    ROLE_HEADER,
    'X-SC-Signature',
  ];
  const headers = new Headers({
    'Access-Control-Allow-Methods': (options.methods ?? ['POST', 'OPTIONS']).join(','),
    'Access-Control-Allow-Headers': allowedHeaders.join(', '),
  });

  const allowlist = API_ALLOWED_ORIGINS;
  const isAllowed =
    !origin || allowlist.includes('*') || allowlist.some((entry) => origin.endsWith(entry));
  if (isAllowed && origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  } else if (allowlist.includes('*')) {
    headers.set('Access-Control-Allow-Origin', '*');
  } else {
    headers.set('Access-Control-Allow-Origin', 'same-origin');
  }

  if (request.method === 'OPTIONS') {
    return { preflight: new NextResponse(null, { status: 204, headers }), headers };
  }

  return { headers };
}

/**
 * Reject requests that exceed the configured maximum body size without
 * attempting to parse them.
 */
export function enforceBodySize(
  request: NextRequest,
  maxBytes: number,
  headers: Headers
): NextResponse | null {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return NextResponse.json(
      { error: `Request body too large (>${maxBytes} bytes).` },
      { status: 413, headers }
    );
  }
  return null;
}

/**
 * Enforce bearer token authentication when `API_SERVICE_TOKEN` is configured.
 */
export function enforceServiceAuth(request: NextRequest, headers: Headers): NextResponse | null {
  if (!API_SERVICE_TOKEN) return null;
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing bearer token.' }, { status: 401, headers });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const expectedBuf = Buffer.from(API_SERVICE_TOKEN, 'utf-8');
  const providedBuf = Buffer.from(token, 'utf-8');
  // Pad the provided token to the expected length so timingSafeEqual always
  // runs (short-circuiting on a length mismatch leaks timing information).
  // The separate length check is evaluated after the constant-time compare.
  const paddedProvided = Buffer.alloc(expectedBuf.length);
  providedBuf.copy(paddedProvided, 0, 0, Math.min(providedBuf.length, paddedProvided.length));
  if (!crypto.timingSafeEqual(expectedBuf, paddedProvided) || expectedBuf.length !== providedBuf.length) {
    return NextResponse.json({ error: 'Invalid bearer token.' }, { status: 401, headers });
  }
  return null;
}

/**
 * Validate the caller's role header against an allowlist when RBAC is enabled.
 */
export function enforceRbac(
  request: NextRequest,
  headers: Headers,
  allowedRoles: string[]
): NextResponse | null {
  if (!ENABLE_RBAC) return null;
  const roleHeader = request.headers.get(ROLE_HEADER);
  if (!roleHeader) {
    return NextResponse.json({ error: 'Missing role header.' }, { status: 403, headers });
  }
  const role = roleHeader.toLowerCase();
  const canonicalAllowed = allowedRoles.map((r) => r.toLowerCase());
  const canonicalKnown = ALLOWED_ROLES.map((r) => r.toLowerCase());

  if (!canonicalKnown.includes(role)) {
    return NextResponse.json({ error: `Unknown role "${role}".` }, { status: 403, headers });
  }

  if (!canonicalAllowed.includes(role)) {
    return NextResponse.json({ error: 'Insufficient role for this action.' }, { status: 403, headers });
  }

  return null;
}

/**
 * Read and parse JSON while preserving the raw body for signature validation.
 */
export async function readJsonWithRaw<T>(request: NextRequest): Promise<{
  raw: Buffer;
  data: T;
}> {
  const rawBuffer = Buffer.from(await request.arrayBuffer());
  const text = rawBuffer.toString('utf-8');
  const data = JSON.parse(text) as T;
  return { raw: rawBuffer, data };
}

/**
 * Verify an HMAC signature when a webhook secret is configured.
 */
export function verifyRequestSignature(
  request: NextRequest,
  rawBody: Buffer,
  headers: Headers
): NextResponse | null {
  if (!WEBHOOK_SECRET) return null;
  const provided = request.headers.get('x-sc-signature');
  if (!provided) {
    return NextResponse.json({ error: 'Missing signature.' }, { status: 401, headers });
  }

  const computed = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  const providedBuf = Buffer.from(provided);
  const computedBuf = Buffer.from(computed);
  if (providedBuf.length !== computedBuf.length) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401, headers });
  }

  const isValid = crypto.timingSafeEqual(providedBuf, computedBuf);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401, headers });
  }
  return null;
}

/**
 * Wrap NextResponse.json to ensure CORS headers propagate to clients.
 */
export function jsonResponse(data: unknown, init: { status?: number; headers: Headers }) {
  return NextResponse.json(data, init);
}

/**
 * Timeout helper for fetch calls to external providers.
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs = DEFAULT_API_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('Request timed out')), timeoutMs);
    promise
      .then((res) => {
        clearTimeout(id);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(id);
        reject(err);
      });
  });
}
