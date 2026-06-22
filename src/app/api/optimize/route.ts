/**
 * POST /api/optimize
 *
 * Next.js Route Handler that bridges the browser to the Python MILP
 * optimizer service.  Accepts the same OptimizeRequest payload the
 * Python service expects, forwards it, and returns the dispatch result.
 *
 * The route also handles the convenience case where a caller passes a
 * `tariff_profile_id` + raw forecast arrays: it resolves the price
 * vectors from the TypeScript TariffProfile registry before forwarding.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { buildPriceVector, callOptimizer } from '@/lib/optimizer-client';
import { TARIFF_PROFILES, type TariffProfileType } from '@/lib/tariff-config';
import { buildCorsHeaders } from '@/lib/security';
import { checkRateLimit } from '@/lib/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const priceArraySchema = z.array(z.number()).min(1).max(8760);

const bodySchema = z.object({
  horizon_steps: z.number().int().positive().max(8760),
  step_hours: z.number().positive().max(24),
  pv: z.object({
    dc_capacity_kwp: z.number().positive(),
    inverter_capacity_kw: z.number().positive(),
    pv_forecast_kw: z.array(z.number().nonnegative()).min(1).max(8760),
  }),
  load: z.object({
    load_forecast_kw: z.array(z.number().nonnegative()).min(1).max(8760),
  }),
  bess: z.object({
    capacity_kwh: z.number().positive(),
    max_charge_kw: z.number().positive(),
    max_discharge_kw: z.number().positive(),
    roundtrip_efficiency: z.number().min(0.5).max(1).optional(),
    soc_min_pct: z.number().min(0).max(1).optional(),
    soc_max_pct: z.number().min(0).max(1).optional(),
    soc_initial_pct: z.number().min(0).max(1).optional(),
  }),
  grid: z.object({
    max_import_kw: z.number().nonnegative(),
    import_price_kes_kwh: priceArraySchema,
    export_price_kes_kwh: priceArraySchema,
    allow_export: z.boolean().optional(),
  }),
  solver: z.enum(['cbc', 'glpk']).optional(),
  tariff_profile_id: z.string().optional(),
  reference_date: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { headers } = buildCorsHeaders(req);

  const rl = await checkRateLimit(req, 'api', headers);
  if (rl) return rl;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400, headers },
    );
  }
  const body = parsed.data;

  // ------------------------------------------------------------------
  // Convenience: auto-populate price vectors from a tariff profile ID
  // ------------------------------------------------------------------
  if (body.tariff_profile_id) {
    const profile = TARIFF_PROFILES[body.tariff_profile_id as TariffProfileType];
    if (!profile) {
      return NextResponse.json(
        { error: `Unknown tariff_profile_id: ${body.tariff_profile_id}` },
        { status: 400, headers },
      );
    }

    const refDate = body.reference_date ? new Date(body.reference_date) : new Date();
    const horizonH = body.horizon_steps * body.step_hours;
    const { importPrices, exportPrices } = buildPriceVector(
      profile,
      horizonH,
      body.step_hours,
      refDate,
    );

    body.grid = {
      ...body.grid,
      import_price_kes_kwh: importPrices,
      export_price_kes_kwh: exportPrices,
    };
  }

  // ------------------------------------------------------------------
  // Forward to the optimizer service
  // ------------------------------------------------------------------
  try {
    const result = await callOptimizer(body);
    return NextResponse.json(result, { headers });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502, headers });
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'SafariCharge MILP Optimizer Proxy',
    methods: ['POST'],
    docs: '/api/optimize -  POST an OptimizeRequest to receive an OptimizeResponse',
  });
}
