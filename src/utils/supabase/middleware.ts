import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/**
 * Refreshes the Supabase session on every request.
 * Call this from src/middleware.ts BEFORE your NextAuth token check
 * so the session cookie stays alive.
 *
 * Usage in src/middleware.ts:
 *   import { updateSession } from '@/utils/supabase/middleware'
 *   ...
 *   const supabaseResponse = await updateSession(request)
 *   // then do your NextAuth check on top
 */
export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session — do NOT remove this call.
  await supabase.auth.getUser();

  return supabaseResponse;
};
