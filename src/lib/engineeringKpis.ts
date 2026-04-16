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

export interface ProfessionalEngineeringKpiInput {
  minuteData: Array<{
    date?: string;
    solarEnergyKWh?: number;
    solarKW?: number;
    homeLoadKWh?: number;
    homeLoadKW?: number;
    ev1LoadKWh?: number;
    ev1LoadKW?: number;
    ev2LoadKWh?: number;
    ev2LoadKW?: number;
    gridImportKWh?: number;
    gridExportKWh?: number;
    batteryPowerKW?: number;
  }>;
  systemCapacityKwp: number;
  avgDailySunHours: number;
  co2KgPerKwh?: number;
}

export interface ProfessionalEngineeringKpiResult {
  simulationDays: number;
  annualEnergyKwh: number;
  totalSolarGeneratedKwh: number;
  solarUsedOnSiteKwh: number;
  totalLoadKwh: number;
  gridImportKwh: number;
  gridImportDisplacedKwh: number;
  specificYield: number;
  performanceRatio: number;
  capacityFactor: number;
  selfConsumptionRate: number;
  gridIndependence: number;
  batteryCyclesPerYear: number;
  co2AvoidedKgPerYear: number;
  batteryDischargeEvents: number;
}

export function computeProfessionalEngineeringKpis(
  input: ProfessionalEngineeringKpiInput
): ProfessionalEngineeringKpiResult {
  const SAMPLES_PER_DAY = 420;
  const HOURS_PER_SAMPLE = 24 / SAMPLES_PER_DAY;
  const DEFAULT_CO2_KG_PER_KWH = 0.4;
  const DISCHARGE_THRESHOLD_KW = -0.05;
  const { minuteData, systemCapacityKwp, avgDailySunHours, co2KgPerKwh = DEFAULT_CO2_KG_PER_KWH } = input;
  const dates = new Set(minuteData.map((d) => d.date).filter((d): d is string => Boolean(d)));
  const simulationDays = Math.max(dates.size || minuteData.length / 420, 1);
  const annualizationFactor = 365 / simulationDays;

  const totalSolarGeneratedKwh = minuteData.reduce(
    (sum, d) => sum + (d.solarEnergyKWh ?? (d.solarKW ?? 0) * HOURS_PER_SAMPLE),
    0
  );
  const totalLoadKwh = minuteData.reduce((sum, d) => {
    const home = d.homeLoadKWh ?? (d.homeLoadKW ?? 0) * HOURS_PER_SAMPLE;
    const ev1 = d.ev1LoadKWh ?? (d.ev1LoadKW ?? 0) * HOURS_PER_SAMPLE;
    const ev2 = d.ev2LoadKWh ?? (d.ev2LoadKW ?? 0) * HOURS_PER_SAMPLE;
    return sum + home + ev1 + ev2;
  }, 0);
  const gridImportKwh = minuteData.reduce((sum, d) => sum + (d.gridImportKWh ?? 0), 0);
  const totalGridExportKwh = minuteData.reduce((sum, d) => sum + (d.gridExportKWh ?? 0), 0);

  const annualEnergyKwh = totalSolarGeneratedKwh * annualizationFactor;
  const solarUsedOnSiteKwh = Math.max(totalSolarGeneratedKwh - totalGridExportKwh, 0);
  const gridImportDisplacedKwh = Math.max(totalLoadKwh - gridImportKwh, 0) * annualizationFactor;

  const specificYield = systemCapacityKwp > 0 ? annualEnergyKwh / systemCapacityKwp : 0;
  const performanceRatioDenominator = Math.max(avgDailySunHours, 0) * 365;
  const performanceRatio = performanceRatioDenominator > 0 ? specificYield / performanceRatioDenominator : 0;
  const capacityFactor = systemCapacityKwp > 0 ? annualEnergyKwh / (systemCapacityKwp * 8760) : 0;
  const selfConsumptionRate = totalSolarGeneratedKwh > 0 ? solarUsedOnSiteKwh / totalSolarGeneratedKwh : 0;
  const gridIndependence = totalLoadKwh > 0 ? Math.max((totalLoadKwh - gridImportKwh) / totalLoadKwh, 0) : 0;

  let batteryDischargeEvents = 0;
  let wasDischarging = false;
  for (const point of minuteData) {
    const isDischarging = (point.batteryPowerKW ?? 0) < DISCHARGE_THRESHOLD_KW;
    if (isDischarging && !wasDischarging) batteryDischargeEvents += 1;
    wasDischarging = isDischarging;
  }

  const batteryCyclesPerYear = (batteryDischargeEvents / simulationDays) * 365;
  const co2AvoidedKgPerYear = gridImportDisplacedKwh * co2KgPerKwh;

  return {
    simulationDays,
    annualEnergyKwh,
    totalSolarGeneratedKwh,
    solarUsedOnSiteKwh,
    totalLoadKwh,
    gridImportKwh,
    gridImportDisplacedKwh,
    specificYield,
    performanceRatio,
    capacityFactor,
    selfConsumptionRate,
    gridIndependence,
    batteryCyclesPerYear,
    co2AvoidedKgPerYear,
    batteryDischargeEvents,
  };
}
