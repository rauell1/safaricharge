/**
 * Engineering KPI calculations for SafariCharge.
 *
 * Definitions follow IEC 61724-1 / SolarPower Europe terminology:
 *
 * Specific Yield  (kWh/kWp)    = E_solar / P_dc_installed
 * Performance Ratio (PR, %)    = Specific Yield / (H_irr / G_stc)
 *                                where H_irr is plane-of-array irradiance (kWh/m²)
 *                                and G_stc = 1.0 kW/m² (STC reference)
 * Capacity Factor (CF, %)      = E_solar / (P_dc * 8760)
 * Battery Cycles                = Total discharge energy / nominal battery capacity
 * Self-Sufficiency (%)         = 1 − (grid import / total load)   × 100
 * Grid Dependency (%)          = (grid import / total load)        × 100
 *
 * When irradiance is unavailable (common in simulation), PR is estimated from
 * local peak-sun-hours (PSH) for the selected location.
 */

export interface EngineeringKpiInput {
  /** Total PV energy generated over the simulation period (kWh). */
  totalSolarKWh: number;
  /** Installed DC PV capacity (kWp). */
  dcCapacityKWp: number;
  /** Simulation duration in hours (e.g. 8760 for a full year). */
  durationHours: number;
  /** Total battery discharge energy over the period (kWh). */
  totalBatDischargeKWh: number;
  /** Nominal battery capacity (kWh). */
  batteryCapacityKWh: number;
  /**
   * Total electrical load (home + EV) over the period (kWh).
   * Used to compute self-sufficiency and grid dependency.
   */
  totalLoadKWh?: number;
  /**
   * Total energy imported from the grid over the period (kWh).
   * Used to compute self-sufficiency and grid dependency.
   */
  gridImportKWh?: number;
  /**
   * Optional: plane-of-array irradiance over the period (kWh/m²).
   * If omitted, PR is estimated using peakSunHours.
   */
  planeIrradianceKWhPerM2?: number;
  /**
   * Fallback daily peak sun hours for PR estimation (default: 5.5 h/day
   * — representative for Nairobi, Kenya).
   */
  peakSunHoursPerDay?: number;
}

export interface EngineeringKpiResult {
  specificYieldKWhPerKWp: number;
  performanceRatioPct: number;
  capacityFactorPct: number;
  batteryCycles: number;
  /** Fraction of total load met without grid import (0–100 %). */
  selfSufficiencyPct: number;
  /** Fraction of total load that came from the grid (0–100 %). */
  gridDependencyPct: number;
  /** True when PR was estimated from PSH rather than measured irradiance. */
  prIsEstimated: boolean;
}

export function computeEngineeringKpis(input: EngineeringKpiInput): EngineeringKpiResult {
  const {
    totalSolarKWh,
    dcCapacityKWp,
    durationHours,
    totalBatDischargeKWh,
    batteryCapacityKWh,
    totalLoadKWh,
    gridImportKWh,
    planeIrradianceKWhPerM2,
    peakSunHoursPerDay = 5.5,
  } = input;

  // ── Specific yield ───────────────────────────────────────────────────────
  const specificYieldKWhPerKWp =
    dcCapacityKWp > 0 ? totalSolarKWh / dcCapacityKWp : 0;

  // ── Performance Ratio ────────────────────────────────────────────────────
  let performanceRatioPct = 0;
  let prIsEstimated = false;

  if (planeIrradianceKWhPerM2 && planeIrradianceKWhPerM2 > 0) {
    // IEC 61724-1: PR = (E_AC / P_dc) / (H_poa / G_stc)
    // G_stc = 1 kW/m², so H_poa/G_stc = H_poa numerically
    performanceRatioPct =
      (specificYieldKWhPerKWp / planeIrradianceKWhPerM2) * 100;
  } else {
    // Estimate: use PSH × days to approximate H_poa
    const durationDays = durationHours / 24;
    const estimatedIrradiance = peakSunHoursPerDay * durationDays;
    performanceRatioPct =
      estimatedIrradiance > 0
        ? (specificYieldKWhPerKWp / estimatedIrradiance) * 100
        : 0;
    prIsEstimated = true;
  }

  // ── Capacity Factor ──────────────────────────────────────────────────────
  const capacityFactorPct =
    dcCapacityKWp > 0 && durationHours > 0
      ? (totalSolarKWh / (dcCapacityKWp * durationHours)) * 100
      : 0;

  // ── Battery Cycles ───────────────────────────────────────────────────────
  const batteryCycles =
    batteryCapacityKWh > 0 ? totalBatDischargeKWh / batteryCapacityKWh : 0;

  // ── Self-Sufficiency & Grid Dependency ───────────────────────────────────
  const load = totalLoadKWh ?? 0;
  const gridIn = gridImportKWh ?? 0;
  const gridDependencyPct =
    load > 0 ? Math.min((gridIn / load) * 100, 100) : 0;
  const selfSufficiencyPct = Math.max(100 - gridDependencyPct, 0);

  return {
    specificYieldKWhPerKWp: parseFloat(specificYieldKWhPerKWp.toFixed(1)),
    performanceRatioPct: parseFloat(Math.min(performanceRatioPct, 100).toFixed(1)),
    capacityFactorPct: parseFloat(Math.min(capacityFactorPct, 100).toFixed(1)),
    batteryCycles: parseFloat(batteryCycles.toFixed(2)),
    selfSufficiencyPct: parseFloat(selfSufficiencyPct.toFixed(1)),
    gridDependencyPct: parseFloat(gridDependencyPct.toFixed(1)),
    prIsEstimated,
  };
}
