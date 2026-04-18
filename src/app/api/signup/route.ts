import { NextResponse } from 'next/server'

/**
 * POST /api/signup — REMOVED
 *
 * This route previously used the service-role admin API to create users
 * server-side, but it was never called by the application. The login page
 * uses supabase.auth.signUp() directly on the client, which is the correct
 * approach for email-confirmation flows.
 *
 * The route is replaced with a clear 410 Gone response so that any stale
 * clients or external callers receive an explicit signal rather than a 404.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint has been removed. Use the standard Supabase signUp flow.' },
    { status: 410 }
  )
}
