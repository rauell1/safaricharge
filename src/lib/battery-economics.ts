/**
 * SafariCharge Battery Economics Optimizer
 *
 * Analyzes multiple battery sizes to find the optimal configuration based on
 * ROI, lifecycle costs, and economic value. Shifts from "how big?" to "what's worth it?"
 *
 * Key insight: Bigger battery ≠ better economics. There's a sweet spot where
 * lifecycle cost per kWh is minimized and NPV is maximized.
 *
 * Audit fixes (2026-04):
 *   - Rate-dependent round-trip efficiency (was flat 96%)
 *   - Maintenance rate corrected to 0.8% pa (NREL ESRP 2023 benchmark)
 *   - Inflation-adjusted battery replacement cost in NPV (6% pa)
 *   - Demand-charge savings included for commercial tariff classes
 */

export interface BatteryEconomicAnalysis {
  /** Battery capacity in kWh */
  capacity_kWh: number;
  /** Upfront cost in KES */
  upfrontCost_KES: number;
  /** Average daily cycles (fractional) */
  avgDailyCycles: number;
  /** Average depth of discharge (0-1) */
  avgDoD: number;
  /** Expected cycles per year */
  cyclesPerYear: number;
  /** Expected battery lifetime in years */
  expectedLifetime_years: number;
  /** Total lifetime cycles */
  lifetimeCycles: number;
  /** Total lifetime energy throughput in kWh */
  lifetimeEnergy_kWh: number;
  /** Levelized cost per kWh (lifetime cost / lifetime energy) */
  costPerKwh_KES: number;
  /** Annual grid energy savings in KES */
  annualGridSavings_KES: number;
  /** Annual demand-charge savings in KES (non-zero for commercial tariffs) */
  annualDemandSavings_KES: number;
  /** Total annual savings (energy + demand) */
  annualTotalSavings_KES: number;
  /** Simple payback period in years */
  paybackPeriod_years: number;
  /** Net Present Value over 25 years in KES */
  npv25Years_KES: number;
  /** Return on Investment over 25 years (%) */
  roi25Years_pct: number;
  /** Is this the recommended size? */
  isRecommended: boolean;
  /** Why this size is/isn't recommended */
  reasoning: string;
}

export interface BatteryOptimizationResult {
  analyses: BatteryEconomicAnalysis[];
  bestForROI: BatteryEconomicAnalysis;
  bestForIndependence: BatteryEconomicAnalysis;
  bestForCost: BatteryEconomicAnalysis;
  recommendation: BatteryEconomicAnalysis;
  summary: string;
}

interface OptimizationInput {
  /** Daily energy consumption in kWh */
  dailyConsumption_kWh: number;
  /** Average night power in kW */
  avgNightPower_kW: number;
  /** Peak sun hours for solar generation estimation */
  peakSunHours: number;
  /** Solar array capacity in kW */
  solarCapacity_kW: number;
  /** Grid electricity price in KES/kWh (blended effective rate) */
  gridPrice_per_kWh: number;
  /** Battery cost in KES/kWh */
  batteryCost_per_kWh?: number;
  /** Discount rate for NPV calculation */
  discountRate?: number;
  /** Assumed battery chemistry */
  chemistry?: 'lifepo4' | 'lead-acid';
  /**
   * Monthly peak demand in kW — required to calculate demand-charge savings.
   * Leave undefined for domestic/EV tariffs (no demand charge).
   */
  peakDemand_kW?: number;
  /**
   * Demand charge rate in KES/kVA/month.
   * Set from TariffProfile.demandChargeKesPerKva.
   * Default 0 (domestic / EV — no demand charge).
   */
  demandChargeRate_KesPerKva?: number;
  /**
   * Assumed power factor for kW → kVA conversion.
   * Typical commercial PF: 0.92.
   */
  powerFactor?: number;
  /**
   * Annual electricity price inflation rate (KES/kWh escalation).
   * Default 0.06 (6% pa — Kenya CPI energy component, KNBS 2024).
   */
  electricityInflation?: number;
}

/**
 * Round-trip efficiency lookup keyed on charge/discharge rate fraction (0–1).
 *
 * Source: EG4, CATL, Dyness LiFePO4 datasheets; NREL Storage Futures Study.
 * Actual measured RTE varies from ~92% at high C-rate to ~97% at low C-rate.
 * Using a flat 96% (previous value) overestimates throughput at high rates.
 */
function getRoundTripEfficiency(
  rateFraction: number,
  chemistry: 'lifepo4' | 'lead-acid'
): number {
  if (chemistry === 'lead-acid') {
    // Lead-acid RTE: ~80–88%
    return Math.max(0.80, 0.88 - 0.08 * Math.min(1.0, rateFraction));
  }
  // LiFePO4 RTE: ~92–97%
  if (rateFraction <= 0.20) return 0.97;
  if (rateFraction <= 0.40) return 0.96;
  if (rateFraction <= 0.60) return 0.95;
  if (rateFraction <= 0.80) return 0.93;
  return 0.92; // high C-rate
}

export function optimizeBatterySize(input: OptimizationInput): BatteryOptimizationResult {
  const {
    dailyConsumption_kWh,
    avgNightPower_kW,
    peakSunHours,
    solarCapacity_kW,
    gridPrice_per_kWh,
    batteryCost_per_kWh = 25000,
    discountRate = 0.05,
    chemistry = 'lifepo4',
    peakDemand_kW,
    demandChargeRate_KesPerKva = 0,
    powerFactor = 0.92,
    electricityInflation = 0.06,
  } = input;

  const sizesToTest = generateBatterySizesToTest(dailyConsumption_kWh, avgNightPower_kW);
  const analyses: BatteryEconomicAnalysis[] = [];

  for (const capacity_kWh of sizesToTest) {
    analyses.push(
      analyzeBatterySize(
        capacity_kWh,
        dailyConsumption_kWh,
        avgNightPower_kW,
        peakSunHours,
        solarCapacity_kW,
        gridPrice_per_kWh,
        batteryCost_per_kWh,
        discountRate,
        chemistry,
        peakDemand_kW,
        demandChargeRate_KesPerKva,
        powerFactor,
        electricityInflation
      )
    );
  }

  const bestForROI = [...analyses].sort((a, b) => b.roi25Years_pct - a.roi25Years_pct)[0];
  const bestForCost = [...analyses].sort((a, b) => a.costPerKwh_KES - b.costPerKwh_KES)[0];
  const bestForIndependence = [...analyses].sort((a, b) => b.capacity_kWh - a.capacity_kWh)[0];
  const recommendation = [...analyses].sort((a, b) => b.npv25Years_KES - a.npv25Years_KES)[0];
  recommendation.isRecommended = true;

  const summary = `Recommended ${recommendation.capacity_kWh} kWh battery provides best economic value with ${recommendation.roi25Years_pct.toFixed(0)}% ROI over 25 years (payback: ${recommendation.paybackPeriod_years.toFixed(1)} years, NPV: KES ${(recommendation.npv25Years_KES / 1_000_000).toFixed(2)}M).`;

  return { analyses, bestForROI, bestForIndependence, bestForCost, recommendation, summary };
}

function analyzeBatterySize(
  capacity_kWh: number,
  dailyConsumption_kWh: number,
  avgNightPower_kW: number,
  peakSunHours: number,
  solarCapacity_kW: number,
  gridPrice_per_kWh: number,
  batteryCost_per_kWh: number,
  discountRate: number,
  chemistry: 'lifepo4' | 'lead-acid',
  peakDemand_kW: number | undefined,
  demandChargeRate_KesPerKva: number,
  powerFactor: number,
  electricityInflation: number
): BatteryEconomicAnalysis {
  const upfrontCost_KES = capacity_kWh * batteryCost_per_kWh;

  const dailySolarGeneration_kWh = solarCapacity_kW * peakSunHours * 0.75;
  const nightConsumption_kWh = avgNightPower_kW * 12;
  const dayExcess_kWh = Math.max(0, dailySolarGeneration_kWh - (dailyConsumption_kWh - nightConsumption_kWh));
  const dailyCycledEnergy_kWh = Math.min(nightConsumption_kWh, dayExcess_kWh, capacity_kWh * 0.8);

  const avgDailyCycles = capacity_kWh > 0 ? dailyCycledEnergy_kWh / capacity_kWh : 0;
  const avgDoD = avgDailyCycles;
  const cyclesPerYear = avgDailyCycles * 365;

  const lifetimeCycles = estimateCycleLife(avgDoD, chemistry);
  const calendarLife_years = chemistry === 'lifepo4' ? 15 : 7;
  const cycleLife_years = cyclesPerYear > 0 ? lifetimeCycles / cyclesPerYear : calendarLife_years;
  const expectedLifetime_years = Math.min(cycleLife_years, calendarLife_years);

  // Rate-dependent RTE: typical daily cycle is at modest C-rate (~0.2–0.4C)
  const typicalRateFraction = Math.min(1, avgDailyCycles * 1.2);
  const rte = getRoundTripEfficiency(typicalRateFraction, chemistry);

  const lifetimeEnergy_kWh = capacity_kWh * lifetimeCycles * rte;
  const costPerKwh_KES = lifetimeEnergy_kWh > 0 ? upfrontCost_KES / lifetimeEnergy_kWh : Infinity;

  const annualEnergyFromBattery_kWh = dailyCycledEnergy_kWh * 365;
  const annualGridSavings_KES = annualEnergyFromBattery_kWh * gridPrice_per_kWh;

  // -----------------------------------------------------------------------
  // Demand-charge savings
  // -----------------------------------------------------------------------
  // A BESS can shave the peak demand recorded by the meter by discharging
  // during the utility's demand-measurement window (typically 30-min peak).
  // Saving is proportional to the battery's discharge rate relative to peak.
  // Conservative estimate: battery covers 60% of peak demand shaving potential.
  let annualDemandSavings_KES = 0;
  if (peakDemand_kW && demandChargeRate_KesPerKva > 0 && capacity_kWh > 0) {
    const maxDischargeKw = capacity_kWh / 2; // assume 0.5C discharge
    const peakShavingKw = Math.min(peakDemand_kW * 0.6, maxDischargeKw);
    const kvaReduction = peakShavingKw / powerFactor;
    annualDemandSavings_KES = kvaReduction * demandChargeRate_KesPerKva * 12; // 12 months
  }

  const annualTotalSavings_KES = annualGridSavings_KES + annualDemandSavings_KES;

  // Maintenance: 0.8% pa (NREL ESRP 2023 benchmark for residential/commercial BESS)
  // Previous value of 2% was ~2.5x the industry norm and overstated costs.
  const annualMaintenance_KES = upfrontCost_KES * 0.008;
  const netAnnualSavings_KES = annualTotalSavings_KES - annualMaintenance_KES;
  const paybackPeriod_years = netAnnualSavings_KES > 0 ? upfrontCost_KES / netAnnualSavings_KES : 999;

  const npv25Years_KES = calculateNPV(
    upfrontCost_KES,
    annualTotalSavings_KES,
    annualMaintenance_KES,
    expectedLifetime_years,
    batteryCost_per_kWh * capacity_kWh,
    25,
    discountRate,
    electricityInflation
  );

  const roi25Years_pct = upfrontCost_KES > 0 ? (npv25Years_KES / upfrontCost_KES) * 100 : 0;

  let reasoning: string;
  if (capacity_kWh < nightConsumption_kWh * 0.5) {
    reasoning = `Too small — only ${(capacity_kWh / nightConsumption_kWh * 100).toFixed(0)}% of night consumption. Limited grid independence.`;
  } else if (capacity_kWh > dailyConsumption_kWh * 2) {
    reasoning = `Oversized — ${(capacity_kWh / dailyConsumption_kWh).toFixed(1)}× daily consumption. Expensive with poor ROI due to underutilisation.`;
  } else if (paybackPeriod_years < 5) {
    reasoning = `Excellent ROI — pays back in ${paybackPeriod_years.toFixed(1)} years. Highly cost-effective.`;
  } else if (paybackPeriod_years < 8) {
    reasoning = `Good ROI — ${paybackPeriod_years.toFixed(1)} year payback. Solid investment for energy independence.`;
  } else if (paybackPeriod_years < 12) {
    reasoning = `Acceptable ROI — ${paybackPeriod_years.toFixed(1)} year payback. Consider if grid reliability is poor.`;
  } else {
    reasoning = `Poor ROI — ${paybackPeriod_years.toFixed(1)} year payback exceeds battery lifetime. Not economically justified.`;
  }

  return {
    capacity_kWh,
    upfrontCost_KES,
    avgDailyCycles,
    avgDoD,
    cyclesPerYear,
    expectedLifetime_years,
    lifetimeCycles,
    lifetimeEnergy_kWh,
    costPerKwh_KES,
    annualGridSavings_KES,
    annualDemandSavings_KES,
    annualTotalSavings_KES,
    paybackPeriod_years,
    npv25Years_KES,
    roi25Years_pct,
    isRecommended: false,
    reasoning,
  };
}

function generateBatterySizesToTest(dailyConsumption_kWh: number, avgNightPower_kW: number): number[] {
  const nightConsumption_kWh = avgNightPower_kW * 12;
  const minSize = Math.max(20, Math.floor(nightConsumption_kWh * 0.5 / 10) * 10);
  const maxSize = Math.min(200, Math.ceil(dailyConsumption_kWh * 2 / 10) * 10);
  const increment = dailyConsumption_kWh < 100 ? 10 : 20;
  const sizes: number[] = [];
  for (let size = minSize; size <= maxSize; size += increment) sizes.push(size);
  sizes.unshift(0);
  for (const s of [40, 60, 80, 100]) if (!sizes.includes(s)) sizes.push(s);
  return [...new Set(sizes)].sort((a, b) => a - b);
}

/**
 * Estimate cycle life based on DoD and chemistry.
 * Sources: CATL, BYD, Dyness (LiFePO4); Trojan, Crown (Lead-Acid).
 */
function estimateCycleLife(avgDoD: number, chemistry: 'lifepo4' | 'lead-acid'): number {
  if (chemistry === 'lifepo4') {
    if (avgDoD <= 0.20) return 10000;
    if (avgDoD <= 0.30) return 8000;
    if (avgDoD <= 0.50) return 6000;
    if (avgDoD <= 0.70) return 4000;
    if (avgDoD <= 0.80) return 3000;
    return 2000;
  }
  if (avgDoD <= 0.20) return 3000;
  if (avgDoD <= 0.30) return 2000;
  if (avgDoD <= 0.50) return 1200;
  if (avgDoD <= 0.70) return 700;
  if (avgDoD <= 0.80) return 500;
  return 300;
}

/**
 * Calculate Net Present Value with battery replacements and electricity price inflation.
 *
 * Inflation adjustment: replacement cost at year Y is escalated by (1 + inflation)^Y
 * to reflect KES cost growth. This corrects the previous bug where replacement costs
 * were passed as nominal (today's) prices regardless of when the replacement occurs.
 */
function calculateNPV(
  upfrontCost: number,
  annualSavings: number,
  annualMaintenance: number,
  batteryLifetime_years: number,
  replacementCostNominal: number,
  totalYears: number,
  discountRate: number,
  electricityInflation: number = 0.06
): number {
  let npv = -upfrontCost;

  for (let year = 1; year <= totalYears; year++) {
    // Savings escalate with electricity price inflation
    const escalatedSavings = annualSavings * Math.pow(1 + electricityInflation, year - 1);
    npv += escalatedSavings / Math.pow(1 + discountRate, year);
    npv -= annualMaintenance / Math.pow(1 + discountRate, year);

    // Battery replacement at end of each lifetime cycle
    if (year % Math.round(batteryLifetime_years) === 0 && year < totalYears) {
      // Replacement cost inflated by battery cost trend (conservative: same inflation rate)
      const inflatedReplacement = replacementCostNominal * Math.pow(1 + electricityInflation, year);
      npv -= inflatedReplacement / Math.pow(1 + discountRate, year);
    }
  }

  return npv;
}
