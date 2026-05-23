import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { BATTERY_MODULE_CATALOG } from '@/lib/catalog-physics-bridge';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET() {
  const admin = createAdminClient();

  const { count } = await admin
    .from('battery_modules')
    .select('id', { count: 'exact', head: true });

  if (count === 0) {
    const rows = BATTERY_MODULE_CATALOG.map((m) => ({
      id: m.id,
      label: m.label,
      usable_kwh: m.usableKwh,
      nominal_voltage_v: m.nominalVoltageV,
      max_charge_kw_per_module: m.maxChargeKwPerModule,
      max_discharge_kw_per_module: m.maxDischargeKwPerModule,
      chemistry: m.chemistry,
      rte: m.rte,
      min_modules: m.minModules,
      max_modules: m.maxModules,
      catalog_id: m.catalogId,
      is_builtin: true,
      user_id: null,
    }));
    await admin.from('battery_modules').upsert(rows, { onConflict: 'id' });
  }

  const { data, error } = await admin
    .from('battery_modules')
    .select('*')
    .order('label');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const modules = (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    label: r.label as string,
    usableKwh: r.usable_kwh as number,
    nominalVoltageV: r.nominal_voltage_v as number,
    maxChargeKwPerModule: r.max_charge_kw_per_module as number,
    maxDischargeKwPerModule: r.max_discharge_kw_per_module as number,
    chemistry: r.chemistry as string,
    rte: r.rte as number,
    minModules: r.min_modules as number,
    maxModules: r.max_modules as number,
    catalogId: r.catalog_id as string,
    isBuiltin: r.is_builtin as boolean,
  }));

  return NextResponse.json({ modules, total: modules.length });
}
