import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { KENYA_COUNTY_IRRADIANCE } from '@/lib/kenya-irradiance-data';
import presetsJson from '../../../../forecasting/kenya-irradiance-presets.json';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(request: Request) {
  const admin = createAdminClient();

  const { count } = await admin
    .from('irradiance_presets')
    .select('code', { count: 'exact', head: true });

  if (count === 0) {
    const rows = KENYA_COUNTY_IRRADIANCE.map((c) => ({
      code: c.code,
      county: c.county,
      lat: c.lat,
      lon: c.lon,
      avg_daily_psh: c.avgDailyPsh,
      annual_yield: c.annualYieldKwhPerKwp,
      climate_zone: c.climateZone,
      is_kosap: c.isKosap,
      grid_reliability: c.gridReliability ?? null,
      data: c,
    }));
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      await admin
        .from('irradiance_presets')
        .upsert(rows.slice(i, i + BATCH), { onConflict: 'code' });
    }
  }

  const url = new URL(request.url);
  const format = url.searchParams.get('format');

  if (format === 'sizing') {
    // Return the simplified preset format used by the sizing calculator
    return NextResponse.json({ presets: presetsJson.presets, source: presetsJson.source });
  }

  const { data, error } = await admin
    .from('irradiance_presets')
    .select('*')
    .order('county');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ presets: data ?? [], total: (data ?? []).length });
}
