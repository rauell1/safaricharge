import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that never require authentication — always pass through immediately.
// /auth/* is especially critical: the session cookie hasn't been written yet
// when /auth/callback is hit, so calling getUser() here would see no user
// and redirect away before the code-exchange can complete.
const PUBLIC_PREFIXES = ['/', '/login', '/landing', '/pricing', '/auth', '/api']

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    p => pathname === p || pathname.startsWith(p + '/')
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Fast-path: no Supabase call needed for public routes
  if (isPublic(pathname)) return NextResponse.next()

  // Only protected routes reach here
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() validates the JWT server-side — never stale
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Exclude all static assets and auth routes at pattern level
    '/((?!_next/static|_next/image|favicon.ico|auth/|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ],
}
