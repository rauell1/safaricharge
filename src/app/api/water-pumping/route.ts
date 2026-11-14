import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sizeSolarWaterPumping } from '@/lib/sizing/waterPumpingSizing';

const waterPumpingSchema = z.object({
  dailyDemandM3: z.number().positive().max(100_000),
  staticWaterLevelM: z.number().min(0).max(1_000),
  drawdownM: z.number().min(0).max(300).optional(),
  dischargeElevationM: z.number().min(0).max(500).optional(),
  pressureHeadM: z.number().min(0).max(200).optional(),
  pipeLengthM: z.number().positive().max(20_000).optional(),
  pipeDiameterMm: z.number().positive().max(1_000).optional(),
  peakSunHours: z.number().min(2).max(10).optional(),
  pumpEfficiencyFrac: z.number().min(0.25).max(0.85).optional(),
  motorEfficiencyFrac: z.number().min(0.5).max(0.95).optional(),
  pvDerateFrac: z.number().min(0.5).max(0.95).optional(),
  seasonalWaterTableDropM: z.number().min(0).max(200).optional(),
  capexKSh: z.number().min(0).optional(),
  annualOmFrac: z.number().min(0).max(0.25).optional(),
  discountRateFrac: z.number().min(0).max(0.35).optional(),
  projectYears: z.number().int().min(1).max(35).optional(),
  dieselLitersPerKwh: z.number().min(0.1).max(1).optional(),
  dieselPriceKShPerLiter: z.number().min(1).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = waterPumpingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid water pumping sizing parameters', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const result = sizeSolarWaterPumping(parsed.data);
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
