import { describe, expect, it } from 'vitest';
import {
  computeDaysOfAutonomy,
  computeNetMeteringCreditKesPerMonth,
  computeOffGridPvRecommendation,
} from './system-mode-metrics';
import { computeAllInRate, TARIFF_PROFILES } from './tariff-config';

describe('system mode metrics', () => {
  it('computes days of autonomy from battery, DoD and daily load', () => {
    expect(computeDaysOfAutonomy(20, 80, 10)).toBeCloseTo(1.6);
  });

  it('recommends off-grid PV at +25%', () => {
    expect(computeOffGridPvRecommendation(12)).toBe(15);
  });

  it('returns zero net-metering credit when no export', () => {
    expect(computeNetMeteringCreditKesPerMonth(0)).toBe(0);
  });

  it('computes net-metering credit for positive export', () => {
    const domestic = TARIFF_PROFILES.domestic;
    const expectedRate = computeAllInRate(domestic.energy.lowRateBase, domestic);
    expect(computeNetMeteringCreditKesPerMonth(10)).toBeCloseTo(10 * 30 * expectedRate);
  });
});
