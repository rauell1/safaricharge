import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const db = getAdminClient();

    const [
      usersRes,
      scenariosRes,
      runsRes,
      aiConvRes,
      aiMsgRes,
      recentUsersRes,
      recentScenariosRes,
    ] = await Promise.all([
      db.from('profiles').select('*', { count: 'exact', head: true }),
      db.from('saved_scenarios').select('*', { count: 'exact', head: true }),
      db.from('simulation_runs').select('*', { count: 'exact', head: true }),
      db.from('ai_conversations').select('*', { count: 'exact', head: true }),
      db.from('ai_messages').select('*', { count: 'exact', head: true }),
      db.from('profiles').select('id, email, subscription_status, plan, created_at').order('created_at', { ascending: false }).limit(5),
      db.from('saved_scenarios').select('id, name, created_at, updated_at').order('updated_at', { ascending: false }).limit(5),
    ]);

    return NextResponse.json({
      users: usersRes.count ?? 0,
      scenarios: scenariosRes.count ?? 0,
      simulation_runs: runsRes.count ?? 0,
      ai_conversations: aiConvRes.count ?? 0,
      ai_messages: aiMsgRes.count ?? 0,
      recent_users: recentUsersRes.data ?? [],
      recent_scenarios: recentScenariosRes.data ?? [],
    });
  } catch (err) {
    console.error('[admin/stats]', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
