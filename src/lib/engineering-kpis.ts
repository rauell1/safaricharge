/**
 * Engineering KPI computation for SafariCharge PV systems
 *
 * All five KPIs are derived from MinuteDataPoint simulation history.
 * Sub-annual datasets are annualised automatically via unique-date counting.
 * Pure function — no side effects, deterministic for identical inputs.
 */

import type { MinuteDataPoint } from '@/stores/energySystemStore';

// ── Types ────────────────────────────────────────────────────────────────────

export interface EngineeringKPIConfig {
  /** Installed PV capacity (kWp) */
  pvCapacityKwp: number;
  /** Battery usable capacity (kWh) */
  batteryCapacityKwh: number;
  /** Battery minimum reserve as a percentage (0–100). Defaults to 20. */
  minReservePct?: number;
  /** Location peak sun hours (h/day). Defaults to 5.4 for Nairobi. */
  peakSunHours?: number;
}

export interface EngineeringKPIs {
  /** kWh generated per kWp installed per year */
  specificYieldKwhPerKwp: number;
  /** Ratio of actual to ideal energy output (%) */
  performanceRatioPct: number;
  /** Fraction of nameplate capacity used over a year (%) */
  capacityFactorPct: number;
  /** Full charge–discharge cycles per year */
  batteryCyclesPerYear: number;
  /** Maximum depth of discharge allowed by system config (%) */
  maxDodPct: number;
  /** ISO date string of earliest data point used */
  dataFromDate: string;
  /** ISO date string of latest data point used */
  dataToDate: string;
  /** Number of unique simulation days used for annualisation */
  uniqueDaysCount: number;
}

// ── Kenya industry reference ranges ──────────────────────────────────────────

export interface KPIRange {
  low: number;
  high: number;
  unit: string;
  label: string;
  description: string;
}

export const KENYA_KPI_RANGES: Record<keyof Omit<EngineeringKPIs, 'dataFromDate' | 'dataToDate' | 'uniqueDaysCount'>, KPIRange> = {
  specificYieldKwhPerKwp: {
    low: 1400,
    high: 1800,
    unit: 'kWh/kWp/yr',
    label: 'Specific Yield',
    description: 'Annual energy output per unit of installed PV capacity',
  },
  performanceRatioPct: {
    low: 75,
    high: 85,
    unit: '%',
    label: 'Performance Ratio',
    description: 'Ratio of actual vs theoretical maximum energy output',
  },
  capacityFactorPct: {
    low: 16,
    high: 22,
    unit: '%',
    label: 'Capacity Factor',
    description: 'Fraction of nameplate capacity utilised over a year',
  },
  batteryCyclesPerYear: {
    low: 200,
    high: 365,
    unit: 'cycles/yr',
    label: 'Battery Cycles/yr',
    description: 'Full equivalent charge–discharge cycles per year',
  },
  maxDodPct: {
    low: 70,
    high: 90,
    unit: '%',
    label: 'Max DoD',
    description: 'Maximum depth of discharge — deeper = more usable capacity',
  },
};

// ── Status helper ─────────────────────────────────────────────────────────────

export type KPIStatus = 'good' | 'warning' | 'poor';

/**
 * Returns a traffic-light status for a KPI value against its reference range.
 * Warning band = 10 % beyond each threshold before turning poor.
 */
export function getKPIStatus(
  key: keyof typeof KENYA_KPI_RANGES,
  value: number
): KPIStatus {
  const range = KENYA_KPI_RANGES[key];
  const warnLow = range.low * 0.9;
  const warnHigh = range.high * 1.1;

  if (value >= range.low && value <= range.high) return 'good';
  if (value >= warnLow && value <= warnHigh) return 'warning';
  return 'poor';
}

// ── Core computation ──────────────────────────────────────────────────────────

/**
 * Compute all 5 engineering KPIs from a MinuteDataPoint array.
 *
 * Returns null when the input array is empty or pvCapacityKwp is zero.
 */
export function computeEngineeringKPIs(
  minuteData: MinuteDataPoint[],
  config: EngineeringKPIConfig
): EngineeringKPIs | null {
  if (minuteData.length === 0 || config.pvCapacityKwp <= 0) return null;

  const peakSunHours = config.peakSunHours ?? 5.4; // Nairobi annual average
  const minReservePct = config.minReservePct ?? 20;

  // ── 1. Total solar energy generated (kWh) ──────────────────────────────────
  let totalSolarKwh = 0;
  let totalChargeKwh = 0;

  const uniqueDates = new Set<string>();

  for (const d of minuteData) {
    totalSolarKwh += d.solarEnergyKWh;
    // Battery charge energy: positive batteryPowerKW = charging
    if (d.batteryPowerKW > 0) {
      totalChargeKwh += d.batteryPowerKW * (1 / 60); // 1-minute intervals → kWh
    }
    uniqueDates.add(d.date);
  }

  const uniqueDaysCount = uniqueDates.size;
  const annualisationFactor = 365 / uniqueDaysCount;

  // ── 2. Annualised solar energy ─────────────────────────────────────────────
  const annualSolarKwh = totalSolarKwh * annualisationFactor;
  const annualChargeKwh = totalChargeKwh * annualisationFactor;

  // ── 3. KPI calculations ────────────────────────────────────────────────────

  // Specific Yield (kWh/kWp/yr)
  const specificYieldKwhPerKwp = annualSolarKwh / config.pvCapacityKwp;

  // Performance Ratio (%)
  // PR = SpecificYield / (peakSunHours × 365) × 100
  const theoreticalYield = peakSunHours * 365;
  const performanceRatioPct = theoreticalYield > 0
    ? (specificYieldKwhPerKwp / theoreticalYield) * 100
    : 0;

  // Capacity Factor (%)
  // CF = annualEnergy / (pvCapacityKwp × 8760) × 100
  const capacityFactorPct =
    (annualSolarKwh / (config.pvCapacityKwp * 8760)) * 100;

  // Battery Cycles/yr
  // One full cycle = batteryCapacityKwh of charge throughput
  const batteryCyclesPerYear =
    config.batteryCapacityKwh > 0
      ? annualChargeKwh / config.batteryCapacityKwh
      : 0;

  // Max DoD (%)
  // DoD = (1 - minReservePct / 100) × 100
  const maxDodPct = 100 - minReservePct;

  return {
    specificYieldKwhPerKwp: Math.round(specificYieldKwhPerKwp),
    performanceRatioPct: Math.round(performanceRatioPct * 10) / 10,
    capacityFactorPct: Math.round(capacityFactorPct * 10) / 10,
    batteryCyclesPerYear: Math.round(batteryCyclesPerYear),
    maxDodPct,
    dataFromDate: minuteData[0].date,
    dataToDate: minuteData[minuteData.length - 1].date,
    uniqueDaysCount,
  };
}
