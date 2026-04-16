import { describe, expect, it } from 'vitest';
import { computeProfessionalEngineeringKpis } from './engineeringKpis';

describe('computeProfessionalEngineeringKpis', () => {
  it('matches Nairobi specific-yield sanity check for 4 kWp, 80% PR, 5 sun-hours/day', () => {
    const dailySolarKwh = 4 * 5 * 0.8; // 16 kWh/day
    const minuteData = Array.from({ length: 420 }, (_, idx) => ({
      date: '2026-01-01',
      solarEnergyKWh: dailySolarKwh / 420,
      homeLoadKWh: 0.06,
      ev1LoadKWh: 0,
      ev2LoadKWh: 0,
      gridImportKWh: 0.01,
      gridExportKWh: 0,
      batteryPowerKW: idx % 100 === 0 ? -1 : 0,
    }));

    const result = computeProfessionalEngineeringKpis({
      minuteData,
      systemCapacityKwp: 4,
      avgDailySunHours: 5,
    });

    expect(result.specificYield).toBeGreaterThanOrEqual(1459.9);
    expect(result.specificYield).toBeLessThanOrEqual(1500);
    expect(result.performanceRatio).toBeCloseTo(0.8, 2);
  });
});
