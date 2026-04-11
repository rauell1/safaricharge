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
 * - 'warning' : value is within 10 % below low or above high
 * - 'poor'    : value is more than 10 % outside the range
 * - 'unknown' : value is 0 or NaN (no data)
 */
export function getKPIStatus(
  value: number,
  range: KPIRange
): KPIStatus {
  if (!Number.isFinite(value) || value === 0) return 'unknown';
  const margin = (range.high - range.low) * 0.1;
  if (value >= range.low && value <= range.high) return 'good';
  if (value >= range.low - margin && value <= range.high + margin) return 'warning';
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
      maxDod: batteryCapacityKwh > 0 ? 1 - minReservePct / 100 : 0,
      annualEnergyKwh: 0,
      totalChargeKwh: 0,
    };
  }

  // --- Aggregate energy from simulation data ---

  let totalSolarKwh = 0;
  let totalBatChargeKwh = 0;

  for (const d of minuteData) {
    totalSolarKwh += d.solarEnergyKWh ?? 0;
    // batteryPowerKW > 0 means charging; accumulate positive energy per timestep.
    // solarEnergyKWh is already the kWh per timestep — use the same timestep for battery.
    if (d.batteryPowerKW > 0) {
      // Derive timestep duration from solarEnergyKWh / solarKW when possible,
      // otherwise fall back to 1 min (1/60 h) as the standard simulation resolution.
      const dtHours =
        d.solarKW > 0 && d.solarEnergyKWh > 0
          ? d.solarEnergyKWh / d.solarKW
          : 1 / 60;
      totalBatChargeKwh += d.batteryPowerKW * dtHours;
    }
  }

  // --- Annualise if data does not span a full year ---
  // Estimate number of unique days in the dataset.
  const uniqueDates = new Set(minuteData.map((d) => d.date ?? d.timestamp?.slice(0, 10)));
  const trackedDays = Math.max(1, uniqueDates.size);
  const annualisationFactor = 365 / trackedDays;

  const annualEnergyKwh = totalSolarKwh * annualisationFactor;
  const annualChargeKwh = totalBatChargeKwh * annualisationFactor;

  // --- KPI formulas ---

  // Specific yield: kWh generated per kWp per year
  const specificYield = annualEnergyKwh / pvCapacityKwp;

  // Performance ratio: actual yield / theoretical maximum yield
  // Theoretical max = peakSunHours * 365 * 1 kWh/kWp/day
  const theoreticalYield = peakSunHoursPerDay * 365;
  const performanceRatio =
    theoreticalYield > 0 ? (specificYield / theoreticalYield) * 100 : 0;

  // Capacity factor: average power / nameplate capacity
  // = annualEnergy / (capacity_kW * 8760 h)
  const capacityFactor =
    pvCapacityKwp > 0 ? (annualEnergyKwh / (pvCapacityKwp * 8760)) * 100 : 0;

  // Battery cycles per year: total charge throughput / battery capacity
  const batteryCyclesPerYear =
    batteryCapacityKwh > 0 ? annualChargeKwh / batteryCapacityKwh : 0;

  // Max DoD: fraction of capacity available for use
  const maxDod = (1 - minReservePct / 100) * 100;

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
