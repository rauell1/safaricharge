import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { mapCatalogResponse } from '@/lib/sizing/catalogTypes';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const [inverters, panels, batteries, bosRates, bosComponents, cabinetSizes, cableReference] = await Promise.all([
    supabase.from('sizing_inverters').select('*').order('rated_ac_w'),
    supabase.from('sizing_panels').select('*').order('wattage'),
    supabase.from('sizing_batteries').select('*').order('product_line'),
    supabase.from('sizing_bos_rates').select('*').order('item'),
    supabase.from('sizing_bos_components').select('*').order('category'),
    supabase.from('sizing_battery_cabinet_sizes').select('*').order('slots'),
    supabase.from('sizing_cable_reference').select('*').order('size_mm2'),
  ]);

  const firstError = [inverters, panels, batteries, bosRates, bosComponents, cabinetSizes, cableReference]
    .find((r) => r.error)?.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const catalog = mapCatalogResponse({
    inverters: inverters.data ?? [],
    panels: panels.data ?? [],
    batteries: batteries.data ?? [],
    bosRates: bosRates.data ?? [],
    bosComponents: bosComponents.data ?? [],
    cabinetSizes: cabinetSizes.data ?? [],
    cableReference: cableReference.data ?? [],
  });

  return NextResponse.json(catalog);
}
