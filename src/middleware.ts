import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Routes that require an active Supabase session.
 * Any path that starts with one of these prefixes will redirect to /login
 * when there is no authenticated user.
 */
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/simulation',
  '/configuration',
  '/financial',
  '/scenarios',
  '/onboarding',
  '/ai-assistant',
  '/energy-intelligence',
  '/live-results',
  '/recommendation',
  '/site-setup',
  '/export',
  '/sizing',
  '/component-knowledge-base',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - /api/* (API routes handle their own auth)
     * - /auth/* (auth callback must remain public)
     * - /login, /signup, /pricing, /demo, /landing (public pages)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|api/|auth/|login|signup|pricing|demo|landing|forgot-password|reset-password).*)',
  ],
};
