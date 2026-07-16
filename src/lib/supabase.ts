import { createBrowserClient } from '@supabase/ssr'

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function createClient() {
  // Use a valid local-shaped endpoint in an unconfigured checkout so creating
  // the client never throws during render. Auth forms guard network actions
  // with isSupabaseConfigured(), while public/demo pages remain usable.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'offline-anon-key'
  return createBrowserClient(url, key)
}
