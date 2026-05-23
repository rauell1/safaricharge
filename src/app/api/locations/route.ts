import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { AFRICA_CITIES } from '@/lib/africa-locations-data';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function toSlug(name: string, code: string) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${code.toLowerCase()}`;
}

export async function GET(request: Request) {
  const admin = createAdminClient();

  const { count } = await admin
    .from('africa_locations')
    .select('id', { count: 'exact', head: true });

  if (count === 0) {
    const rows = AFRICA_CITIES.map((c) => ({
      id: toSlug(c.name, c.countryCode),
      name: c.name,
      country: c.country,
      country_code: c.countryCode,
      region: c.region,
      lat: c.lat,
      lon: c.lon,
      elevation: c.elevation,
      avg_daily_psh: c.avgDailyPsh,
      annual_ghi: c.annualGHI,
      avg_temp_c: c.avgTempC,
    }));
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      await admin
        .from('africa_locations')
        .upsert(rows.slice(i, i + BATCH), { onConflict: 'id' });
    }
  }

  const url = new URL(request.url);
  const region = url.searchParams.get('region');
  const q = url.searchParams.get('q');

  let query = admin.from('africa_locations').select('*').order('name');
  if (region) query = query.eq('region', region);
  if (q) query = query.or(`name.ilike.%${q}%,country.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ locations: data ?? [], total: (data ?? []).length });
}
