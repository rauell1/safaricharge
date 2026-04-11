/**
 * Engineering KPI computation for PV system benchmarking.
 *
 * Computes standard photovoltaic performance indicators from annual
 * simulation data and system configuration, suitable for comparison
 * against industry norms and pvlib/SAM validation outputs.
 */

import type { MinuteDataPoint } from '@/stores/energySystemStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EngineeringKPIConfig {
  /** PV array peak capacity in kWp (DC nameplate) */
  pvCapacityKwp: number;
  /** Battery usable capacity in kWh */
  batteryCapacityKwh: number;
  /** Battery minimum reserve percentage (0–100) */
  minReservePct: number;
  /** Average peak sun hours per day at the site (from NASA POWER or similar) */
  peakSunHoursPerDay: number;
}

export interface EngineeringKPIs {
  /** kWh generated per kWp of installed capacity per year */
  specificYield: number;
  /** Ratio of actual vs theoretical maximum energy yield (0–100 %) */
  performanceRatio: number;
  /** Average power output as fraction of nameplate capacity (0–100 %) */
  capacityFactor: number;
  /** Number of equivalent full charge/discharge battery cycles per year */
  batteryCyclesPerYear: number;
  /** Maximum depth-of-discharge allowed by configuration (0–100 %) */
  maxDod: number;
  /** Annual solar energy generated (kWh) — used for derived KPIs */
  annualEnergyKwh: number;
  /** Total battery charge throughput for the period (kWh) — used for cycles */
  totalChargeKwh: number;
}

// ---------------------------------------------------------------------------
// Kenya reference ranges for KPI status indicators
// ---------------------------------------------------------------------------

export interface KPIRange {
  low: number;
  high: number;
  unit: string;
  label: string;
  description: string;
}

export const KENYA_KPI_RANGES: Record<keyof Omit<EngineeringKPIs, 'annualEnergyKwh' | 'totalChargeKwh'>, KPIRange> = {
  specificYield: {
    low: 1400,
    high: 1800,
    unit: 'kWh/kWp/yr',
    label: 'Specific Yield',
    description: 'Expected 1 400–1 800 kWh/kWp/year for Kenya sites',
  },
  performanceRatio: {
    low: 70,
    high: 85,
    unit: '%',
    label: 'Performance Ratio',
    description: 'Kenya PR typically 70–85 %',
  },
  capacityFactor: {
    low: 16,
    high: 21,
    unit: '%',
    label: 'Capacity Factor',
    description: 'Kenya capacity factor typically 16–21 %',
  },
  batteryCyclesPerYear: {
    low: 200,
    high: 365,
    unit: 'cycles/yr',
    label: 'Battery Cycles/Year',
    description: 'Healthy range 200–365 cycles/year for LiFePO₄',
  },
  maxDod: {
    low: 70,
    high: 90,
    unit: '%',
    label: 'Max DoD',
    description: 'DoD 70–90 % balances capacity and longevity',
  },
};

export type KPIStatus = 'good' | 'warning' | 'poor' | 'unknown';

/**
 * Return a traffic-light status for a KPI value against its reference range.
 *
 * - 'good'    : value is within [low, high]
 * - 'warning' : value is within 10 % of the threshold values (low * 0.9 or high * 1.1)
 * - 'poor'    : value is more than 10 % outside the threshold values
 * - 'unknown' : value is 0 or NaN (no data)
 */
export function getKPIStatus(
  value: number,
  range: KPIRange
): KPIStatus {
  if (!Number.isFinite(value) || value === 0) return 'unknown';
  if (value >= range.low && value <= range.high) return 'good';
  // Warning band: within 10% below low or 10% above high (relative to the threshold)
  if (value >= range.low * 0.9 && value <= range.high * 1.1) return 'warning';
  return 'poor';
}

// ---------------------------------------------------------------------------
// Computation
// ---------------------------------------------------------------------------

/**
 * Compute engineering KPIs from an array of `MinuteDataPoint` records and
 * the active system configuration.
 *
 * The function is pure and deterministic — identical inputs always produce
 * identical outputs.
 *
 * @param minuteData - Simulation history (any time range; annualised internally)
 * @param config     - Active system configuration parameters
 */
export function computeEngineeringKPIs(
  minuteData: MinuteDataPoint[],
  config: EngineeringKPIConfig
): EngineeringKPIs {
  const { pvCapacityKwp, batteryCapacityKwh, minReservePct, peakSunHoursPerDay } = config;

  // maxDod is purely config-driven — always return as percentage regardless of battery size
  const maxDod = 100 - minReservePct;

  // Guard: return zeroed KPIs when there is no data or invalid config
  if (
    minuteData.length === 0 ||
    pvCapacityKwp <= 0 ||
    !Number.isFinite(pvCapacityKwp)
  ) {
    return {
      specificYield: 0,
      performanceRatio: 0,
      capacityFactor: 0,
      batteryCyclesPerYear: 0,
      maxDod,
      annualEnergyKwh: 0,
      totalChargeKwh: 0,
    };
  }

  // --- Derive dataset timestep from consecutive timestamps ---
  // Done once up-front so nighttime/grid charging periods use the correct step.
  const getTimestampMs = (value?: string): number => {
    if (!value) return Number.NaN;
    return Date.parse(value);
  };

  let datasetStepHours = 1 / 60; // default: 1-minute resolution
  for (let i = 0; i < minuteData.length - 1; i++) {
    const currentMs = getTimestampMs(minuteData[i].timestamp);
    const nextMs = getTimestampMs(minuteData[i + 1].timestamp);
    const deltaMs = nextMs - currentMs;
    if (Number.isFinite(deltaMs) && deltaMs > 0) {
      datasetStepHours = deltaMs / (1000 * 60 * 60);
      break;
    }
  }

  // --- Aggregate energy from simulation data ---
  let totalSolarKwh = 0;
  let totalBatChargeKwh = 0;

  for (let i = 0; i < minuteData.length; i++) {
    const d = minuteData[i];
    totalSolarKwh += d.solarEnergyKWh ?? 0;

    // batteryPowerKW > 0 means charging
    if (d.batteryPowerKW > 0) {
      // Derive this step's duration from consecutive timestamps; fall back to dataset default.
      const currentMs = getTimestampMs(d.timestamp);
      const nextMs = i < minuteData.length - 1
        ? getTimestampMs(minuteData[i + 1].timestamp)
        : Number.NaN;
      const deltaMs = nextMs - currentMs;
      const dtHours =
        Number.isFinite(deltaMs) && deltaMs > 0
          ? deltaMs / (1000 * 60 * 60)
          : datasetStepHours;
      totalBatChargeKwh += d.batteryPowerKW * dtHours;
    }
  }

  // --- Annualise if data does not span a full year ---
  const uniqueDates = new Set(minuteData.map((d) => d.date ?? d.timestamp?.slice(0, 10)));
  const trackedDays = Math.max(1, uniqueDates.size);
  const annualisationFactor = 365 / trackedDays;

  const annualEnergyKwh = totalSolarKwh * annualisationFactor;
  const annualChargeKwh = totalBatChargeKwh * annualisationFactor;

  // --- KPI formulas ---

  // Specific yield: kWh generated per kWp per year
  const specificYield = annualEnergyKwh / pvCapacityKwp;

  // Performance ratio: actual yield / theoretical maximum yield
  const theoreticalYield = peakSunHoursPerDay * 365;
  const performanceRatio =
    theoreticalYield > 0 ? (specificYield / theoreticalYield) * 100 : 0;

  // Capacity factor: average power / nameplate capacity
  const capacityFactor =
    pvCapacityKwp > 0 ? (annualEnergyKwh / (pvCapacityKwp * 8760)) * 100 : 0;

  // Battery cycles per year: total charge throughput / battery capacity
  const batteryCyclesPerYear =
    batteryCapacityKwh > 0 ? annualChargeKwh / batteryCapacityKwh : 0;

  return {
    specificYield: Number(specificYield.toFixed(1)),
    performanceRatio: Number(performanceRatio.toFixed(1)),
    capacityFactor: Number(capacityFactor.toFixed(1)),
    batteryCyclesPerYear: Number(batteryCyclesPerYear.toFixed(0)),
    maxDod: Number(maxDod.toFixed(1)),
    annualEnergyKwh: Number(annualEnergyKwh.toFixed(1)),
    totalChargeKwh: Number(annualChargeKwh.toFixed(1)),
  };
}
