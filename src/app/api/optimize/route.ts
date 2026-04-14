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
import type { OptimizeRequest } from '@/lib/optimizer-client';
import { buildPriceVector, callOptimizer } from '@/lib/optimizer-client';
import { TARIFF_PROFILES, type TariffProfileType } from '@/lib/tariff-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: OptimizeRequest & {
    tariff_profile_id?: TariffProfileType;
    reference_date?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // ------------------------------------------------------------------
  // Convenience: auto-populate price vectors from a tariff profile ID
  // ------------------------------------------------------------------
  if (body.tariff_profile_id) {
    const profile = TARIFF_PROFILES[body.tariff_profile_id];
    if (!profile) {
      return NextResponse.json(
        { error: `Unknown tariff_profile_id: ${body.tariff_profile_id}` },
        { status: 400 }
      );
    }

    const refDate = body.reference_date
      ? new Date(body.reference_date)
      : new Date();

    const horizonH = body.horizon_steps * body.step_hours;
    const { importPrices, exportPrices } = buildPriceVector(
      profile,
      horizonH,
      body.step_hours,
      refDate
    );

    body.grid = {
      ...body.grid,
      import_price_kes_kwh: importPrices,
      export_price_kes_kwh: exportPrices,
    };
  }

  // ------------------------------------------------------------------
  // Validate required fields
  // ------------------------------------------------------------------
  if (!body.horizon_steps || !body.pv || !body.load || !body.bess || !body.grid) {
    return NextResponse.json(
      { error: 'Missing required fields: horizon_steps, pv, load, bess, grid' },
      { status: 422 }
    );
  }

  // ------------------------------------------------------------------
  // Forward to the optimizer service
  // ------------------------------------------------------------------
  try {
    const result = await callOptimizer(body);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'SafariCharge MILP Optimizer Proxy',
    methods: ['POST'],
    docs: '/api/optimize — POST an OptimizeRequest to receive an OptimizeResponse',
  });
}
