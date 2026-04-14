import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/**
 * Browser-side Supabase client for use in Client Components ('use client').
 *
 * Usage:
 *   const supabase = createClient()
 *   const { data, error } = await supabase.auth.signInWithPassword({ email, password })
 */
export const createClient = () =>
  createBrowserClient(supabaseUrl, supabaseKey);
