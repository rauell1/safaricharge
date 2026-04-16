import { computeAllInRate, TARIFF_PROFILES } from './tariff-config';

export const DEFAULT_BATTERY_DOD_PCT = 80;
export const DEFAULT_GENERATOR_THRESHOLD_PCT = 20;
export const SYSTEM_MODE_LABELS: Record<'on-grid' | 'off-grid' | 'hybrid', string> = {
  'on-grid': 'On-Grid',
  'off-grid': 'Off-Grid',
  hybrid: 'Hybrid',
};

export function computeDaysOfAutonomy(
  batteryCapacityKwh: number,
  dodPct: number,
  dailyLoadKwh: number
): number {
  if (batteryCapacityKwh <= 0 || dailyLoadKwh <= 0 || dodPct <= 0) return 0;
  return (batteryCapacityKwh * (dodPct / 100)) / dailyLoadKwh;
}

export function computeOffGridPvRecommendation(onGridEquivalentKw: number): number {
  return Math.max(0, onGridEquivalentKw) * 1.25;
}

export function computeNetMeteringCreditKesPerMonth(gridExportKwhPerDay: number): number {
  if (gridExportKwhPerDay <= 0) return 0;
  const domestic = TARIFF_PROFILES.domestic;
  const creditRateKesPerKwh = computeAllInRate(domestic.energy.lowRateBase, domestic);
  return gridExportKwhPerDay * 30 * creditRateKesPerKwh;
}
