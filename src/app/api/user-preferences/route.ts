import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

function createAdminClient() {
  return createClient(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!,
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY)!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function getAuthUser() {
  try {
    const client = await createServerSupabaseClient();
    if (!client) return null;
    const { data: { user } } = await client.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/** GET /api/user-preferences?keys=key1,key2  -  returns { prefs: { key: value } } */
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ prefs: {} });

  const url = new URL(request.url);
  const keysRaw = url.searchParams.get('keys');
  const admin = createAdminClient();

  let query = admin
    .from('user_preferences')
    .select('key, value')
    .eq('user_id', user.id);

  if (keysRaw) {
    const keys = keysRaw.split(',').map((k) => k.trim()).filter(Boolean);
    query = query.in('key', keys);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const prefs = Object.fromEntries(
    (data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value])
  );
  return NextResponse.json({ prefs });
}

/** PATCH /api/user-preferences  body: { key: string; value: unknown }  */
export async function PATCH(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const { key, value } = await request.json() as { key: string; value: unknown };
  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('user_preferences')
    .upsert(
      { user_id: user.id, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,key' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
