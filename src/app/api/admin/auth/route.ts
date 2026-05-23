/**
 * POST /api/admin/auth
 *
 * Server-side admin authentication. Credentials are read from environment
 * variables only — they never appear in browser-reachable code.
 *
 * On success: sets a signed, httpOnly session cookie and returns { ok: true }.
 * On failure: returns 401.
 *
 * Required Vercel env vars:
 *   ADMIN_EMAIL           — the administrator email address
 *   ADMIN_PASSWORD        — the administrator password
 *   ADMIN_SESSION_SECRET  — a long random string used to sign session tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

const SESSION_MAX_AGE_S = 60 * 60; // 1 hour

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function createAdminToken(secret: string): string {
  const payload = `admin:${Date.now()}`;
  const sig = sign(payload, secret);
  return Buffer.from(`${payload}.${sig}`).toString('base64url');
}

export function validateAdminToken(token: string, secret: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const lastDot = decoded.lastIndexOf('.');
    if (lastDot === -1) return false;
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const [role, tsStr] = payload.split(':');
    if (role !== 'admin') return false;
    const ts = parseInt(tsStr, 10);
    if (!ts || Date.now() - ts > SESSION_MAX_AGE_S * 1000) return false;
    const expectedSig = sign(payload, secret);
    // Constant-time compare to prevent timing attacks
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!adminEmail || !adminPassword || !sessionSecret) {
    console.error('[admin/auth] Missing ADMIN_EMAIL, ADMIN_PASSWORD, or ADMIN_SESSION_SECRET env vars');
    return NextResponse.json({ error: 'Admin authentication not configured' }, { status: 503 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const inputEmail = (body.email ?? '').trim().toLowerCase();
  const inputPassword = (body.password ?? '').trim();

  const emailOk = inputEmail === adminEmail.toLowerCase();
  const passwordOk = inputPassword === adminPassword;

  if (!emailOk || !passwordOk) {
    // Always wait a fixed time to prevent user-enumeration via timing
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const token = createAdminToken(sessionSecret);

  const response = NextResponse.json({ ok: true });
  response.cookies.set('sc_admin_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE_S,
  });
  return response;
}
