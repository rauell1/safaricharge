import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public paths that never require authentication
const PUBLIC_PATHS = ['/', '/login', '/landing', '/auth/callback', '/auth/confirm']

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Always pass through public paths immediately — no Supabase call needed.
  // This is critical for /auth/callback: the session cookie hasn't been set
  // yet when this route is hit, so calling getUser() here would see no user
  // and redirect away before the code-exchange can complete.
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  const isProtectedPath = pathname === '/dashboard' || pathname.startsWith('/dashboard/')
  if (!isProtectedPath) return NextResponse.next()

  // Only hit Supabase for protected routes
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
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

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    // Redirect to /login (not /) preserving the intended destination
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  // Exclude static assets, images, favicons, AND auth routes from middleware
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ],
}
