/**
 * Next.js edge middleware — auth gate for all /api/* routes.
 *
 * Responsibilities:
 *  1. Validate the Supabase session JWT for protected routes.
 *  2. Attach x-user-id and x-request-id headers so downstream route handlers
 *     can skip re-validating the session for identity (they still call getUser()
 *     for data operations — this is defence-in-depth, not a replacement).
 *  3. Return 401 early for any protected route with no valid session.
 *
 * Route classification:
 *  • PUBLIC  — no auth required (reference data, health check, auth endpoints)
 *  • ADMIN   — use their own HMAC token validation; middleware passes through
 *  • PROTECTED — everything else; requires a valid Supabase JWT
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { randomUUID } from 'crypto';

// Routes that do not require a Supabase session
const PUBLIC_PREFIXES = [
  '/api/health',
  '/api/admin/',            // admin routes validate their own HMAC tokens
  '/api/component-library', // public catalog (GET only; RLS still filters writes)
  '/api/battery-modules',   // public reference data
  '/api/irradiance-presets',
  '/api/locations',
  '/api/signup',            // account creation
  '/auth/',                 // Supabase OAuth callbacks
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Only intercept API routes
  if (!pathname.startsWith('/api/') && !pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  // Stamp every API request with a correlation ID
  const requestId = randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  if (isPublic(pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Validate Supabase session
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[middleware] Missing Supabase env vars — cannot validate session');
    return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 });
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) =>
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        ),
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401, headers: { 'x-request-id': requestId } }
    );
  }

  // Pass verified identity downstream (defence-in-depth; routes still call getUser())
  response.headers.set('x-user-id', user.id);
  response.headers.set('x-request-id', requestId);

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/auth/:path*'],
};
