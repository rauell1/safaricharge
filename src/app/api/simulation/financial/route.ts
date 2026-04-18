import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildFinancialSnapshot } from '@/lib/financial-dashboard';
import type { FinancialInputs } from '@/lib/financial-dashboard';

const DEFAULT_SOLAR_DATA = {
  annualAverage: 5.4,
  monthlyAverage: [
    5.62, 5.98, 5.89, 5.51, 5.18, 4.95,
    4.87, 5.03, 5.41, 5.68, 5.55, 5.38,
  ] as number[],
  peakSunHours: [
    5.62, 5.98, 5.89, 5.51, 5.18, 4.95,
    4.87, 5.03, 5.41, 5.68, 5.55, 5.38,
  ] as number[],
  latitude: -1.286,
  longitude: 36.817,
  location: 'Nairobi',
  monthlyTemperature: [
    22, 23, 22, 21, 20, 18, 17, 18, 19, 21, 21, 22,
  ] as number[],
};

function buildSyntheticMinuteData(
  dailySolarKwh: number,
  dailyEvKwh: number,
  tariffRate: number
) {
  const points: {
    date: string;
    solarKW: number;
    solarEnergyKWh: number;
    ev1LoadKW: number;
    ev2LoadKW: number;
    ev1LoadKWh: number;
    ev2LoadKWh: number;
    homeLoadKW: number;
    homeLoadKWh: number;
    gridImportKW: number;
    gridImportKWh: number;
    tariffRate: number;
  }[] = [];

  const dtH = 1 / 60;

  for (let m = 0; m < 1440; m++) {
    const t = m / 60;
    const solarFrac =
      t >= 6.5 && t <= 18.5
        ? Math.sin(((t - 6.5) / 12) * Math.PI) *
          ((dailySolarKwh / 12) / (Math.PI / 2))
        : 0;
    const solar = Math.max(0, solarFrac);
    const evLoad = (dailyEvKwh / 24) * (t >= 18 && t <= 24 ? 2.5 : 0.3);

    points.push({
      date: '2026-01-01',
      solarKW: solar,
      solarEnergyKWh: solar * dtH,
      ev1LoadKW: evLoad * 0.6,
      ev2LoadKW: evLoad * 0.4,
      ev1LoadKWh: evLoad * 0.6 * dtH,
      ev2LoadKWh: evLoad * 0.4 * dtH,
      homeLoadKW: 2.0,
      homeLoadKWh: 2.0 * dtH,
      gridImportKW: Math.max(0, 2.0 + evLoad - solar),
      gridImportKWh: Math.max(0, 2.0 + evLoad - solar) * dtH,
      tariffRate,
    });
  }

  return points;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      inputs: FinancialInputs;
      solarCapacityKw?: number;
      evCapacityKw?: number;
      dailySolarKwh?: number;
      dailyEvKwh?: number;
    };

    const inputs: FinancialInputs = {
      chargingTariffKes: body.inputs.chargingTariffKes ?? 25,
      discountRatePct: body.inputs.discountRatePct ?? 12,
      stationCount: body.inputs.stationCount ?? 1,
      targetUtilizationPct: body.inputs.targetUtilizationPct ?? 50,
      projectYears: body.inputs.projectYears ?? 20,
    };

    const dailySolarKwh = body.dailySolarKwh ?? (body.solarCapacityKw ?? 10) * 0.18 * 24;
    const dailyEvKwh = body.dailyEvKwh ?? 20;
    const evCapacityKw = body.evCapacityKw ?? 7.4;

    const minuteData = buildSyntheticMinuteData(
      dailySolarKwh,
      dailyEvKwh,
      inputs.chargingTariffKes
    );

    const snapshot = buildFinancialSnapshot({
      minuteData,
      solarData: DEFAULT_SOLAR_DATA,
      inputs,
      evCapacityKw,
    });

    return NextResponse.json({ snapshot });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
