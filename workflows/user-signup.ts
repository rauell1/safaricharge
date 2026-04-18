/**
 * workflows/user-signup.ts
 *
 * This file is intentionally kept as a no-op stub.
 * The real signup flow is handled by:
 *   - Client: supabase.auth.signUp() in src/app/login/page.tsx
 *   - Server: /api/signup/route.ts (admin helper)
 *   - Post-confirm: /auth/callback/route.ts (profile upsert)
 *
 * The `workflow` package is retained as a dev dependency for potential
 * future background job orchestration (e.g. onboarding drip sequences).
 */

export async function handleUserSignup(email: string) {
  // No-op: real signup is handled by Supabase Auth + /auth/callback
  console.log('[workflow stub] handleUserSignup called for:', email)
  return { status: 'noop', message: 'Use /api/signup or supabase.auth.signUp() directly.' }
}
