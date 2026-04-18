import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  calculateFinancials,
  defaultFinancialInputs,
  type FinancialInputs,
} from '@/simulation/financialEngine';

const financialInputsSchema = z.object({
  panelCostKesPerWp: z.number().nonnegative(),
  batteryKesPerKwh: z.number().nonnegative(),
  inverterKesPerKw: z.number().nonnegative(),
  installationKes: z.number().nonnegative(),
  bosPercent: z.number().min(0).max(100),
  annualOpexKes: z.number().nonnegative(),
  discountRate: z.number().min(0),
  tariffEscalation: z.number().min(-0.99),
  gridTariffKesPerKwh: z.number().nonnegative(),
  annualSolarKwh: z.number().nonnegative(),
  selfConsumptionRatio: z.number().min(0).max(1),
  gridExportTariffKes: z.number().nonnegative(),
}) satisfies z.ZodType<FinancialInputs>;

const bodySchema = z.object({
  inputs: financialInputsSchema,
  pvCapacityKw: z.number().nonnegative(),
  batteryCapacityKwh: z.number().nonnegative(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = calculateFinancials(
    parsed.data.inputs,
    parsed.data.pvCapacityKw,
    parsed.data.batteryCapacityKwh,
  );

  return NextResponse.json(result);
}

export function GET() {
  return NextResponse.json({
    description: 'Calculate LCOE, NPV, IRR, ROI, payback and cash flows for a PV+battery project.',
    requiredFields: {
      inputs: Object.keys(financialInputsSchema.shape),
      pvCapacityKw: 'number',
      batteryCapacityKwh: 'number',
    },
    defaults: defaultFinancialInputs(),
  });
}
