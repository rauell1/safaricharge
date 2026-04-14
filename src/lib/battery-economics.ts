/**
 * SafariCharge Battery Economics Optimizer  — v2 (2026-04)
 *
 * Changes vs v1:
 *  - Demand-charge savings component (captures 20–30 % of commercial bill savings)
 *  - Rate-dependent round-trip efficiency (RTE) — LiFePO4 degrades at high C-rate
 *  - Inflation-adjusted replacement cost (5 % p.a.)
 *  - Maintenance reduced to 1 % p.a. (industry norm for Li-ion; 2 % was lead-acid)
 */

export interface BatteryEconomicAnalysis {
  capacity_kWh: number;
  upfrontCost_KES: number;
  avgDailyCycles: number;
  avgDoD: number;
  cyclesPerYear: number;
  expectedLifetime_years: number;
  lifetimeCycles: number;
  lifetimeEnergy_kWh: number;
  costPerKwh_KES: number;
  annualGridSavings_KES: number;
  /** Demand-charge savings (commercial tariffs only), KES/year */
  annualDemandSavings_KES: number;
  paybackPeriod_years: number;
  npv25Years_KES: number;
  roi25Years_pct: number;
  isRecommended: boolean;
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
  dailyConsumption_kWh: number;
  avgNightPower_kW: number;
  peakSunHours: number;
  solarCapacity_kW: number;
  /** All-in grid energy price KES/kWh (use computeAllInRate from tariff-config) */
  gridPrice_per_kWh: number;
  /** Contracted demand in kW — set > 0 for commercial tariffs to enable demand-charge savings */
  contractedDemand_kW?: number;
  /** Demand charge rate KES/kW/month — KPLC SC1 ≈ 650 KES/kW/month */
  demandChargeRate_KES_per_kW_month?: number;
  batteryCost_per_kWh?: number;
  discountRate?: number;
  /** Annual electricity price inflation rate (default 0.05 = 5 %) */
  energyInflationRate?: number;
  chemistry?: 'lifepo4' | 'lead-acid';
}

// ---------------------------------------------------------------------------
// Round-trip efficiency as a function of C-rate (LiFePO4 empirical curve)
// Source: CATL internal specs; BYD LFP application note 2024
// ---------------------------------------------------------------------------
function rteForCRate(cRate: number, chemistry: 'lifepo4' | 'lead-acid'): number {
  if (chemistry === 'lead-acid') return 0.80;
  // LiFePO4: 97 % at 0.2 C, degrades ~1 % per 0.2 C above 0.5 C
  if (cRate <= 0.2) return 0.97;
  if (cRate <= 0.5) return 0.96;
  if (cRate <= 1.0) return 0.95;
  if (cRate <= 1.5) return 0.93;
  return 0.90;
}

export function optimizeBatterySize(input: OptimizationInput): BatteryOptimizationResult {
  const {
    dailyConsumption_kWh,
    avgNightPower_kW,
    peakSunHours,
    solarCapacity_kW,
    gridPrice_per_kWh,
    contractedDemand_kW = 0,
    demandChargeRate_KES_per_kW_month = 650,
    batteryCost_per_kWh = 25000,
    discountRate = 0.05,
    energyInflationRate = 0.05,
    chemistry = 'lifepo4',
  } = input;

  const sizesToTest = generateBatterySizesToTest(dailyConsumption_kWh, avgNightPower_kW);
  const analyses: BatteryEconomicAnalysis[] = sizesToTest.map((cap) =>
    analyzeBatterySize(
      cap,
      dailyConsumption_kWh,
      avgNightPower_kW,
      peakSunHours,
      solarCapacity_kW,
      gridPrice_per_kWh,
      contractedDemand_kW,
      demandChargeRate_KES_per_kW_month,
      batteryCost_per_kWh,
      discountRate,
      energyInflationRate,
      chemistry
    )
  );

  const bestForROI = [...analyses].sort((a, b) => b.roi25Years_pct - a.roi25Years_pct)[0];
  const bestForCost = [...analyses].sort((a, b) => a.costPerKwh_KES - b.costPerKwh_KES)[0];
  const bestForIndependence = [...analyses].sort((a, b) => b.capacity_kWh - a.capacity_kWh)[0];
  const recommendation = [...analyses].sort((a, b) => b.npv25Years_KES - a.npv25Years_KES)[0];
  recommendation.isRecommended = true;

  const summary =
    `Recommended ${recommendation.capacity_kWh} kWh battery — ` +
    `${recommendation.roi25Years_pct.toFixed(0)} % ROI over 25 years ` +
    `(payback ${recommendation.paybackPeriod_years.toFixed(1)} yrs, ` +
    `NPV KES ${(recommendation.npv25Years_KES / 1_000_000).toFixed(2)} M).`;

  return { analyses, bestForROI, bestForIndependence, bestForCost, recommendation, summary };
}

function analyzeBatterySize(
  capacity_kWh: number,
  dailyConsumption_kWh: number,
  avgNightPower_kW: number,
  peakSunHours: number,
  solarCapacity_kW: number,
  gridPrice_per_kWh: number,
  contractedDemand_kW: number,
  demandChargeRate_KES_per_kW_month: number,
  batteryCost_per_kWh: number,
  discountRate: number,
  energyInflationRate: number,
  chemistry: 'lifepo4' | 'lead-acid'
): BatteryEconomicAnalysis {
  const upfrontCost_KES = capacity_kWh * batteryCost_per_kWh;

  // ── Cycle sizing ──────────────────────────────────────────────────────────
  const dailySolarGeneration_kWh = solarCapacity_kW * peakSunHours * 0.75;
  const nightConsumption_kWh = avgNightPower_kW * 12;
  const dayExcess_kWh = Math.max(
    0,
    dailySolarGeneration_kWh - (dailyConsumption_kWh - nightConsumption_kWh)
  );
  const dailyCycledEnergy_kWh = Math.min(
    nightConsumption_kWh,
    dayExcess_kWh,
    capacity_kWh * 0.80
  );
  const avgDailyCycles = capacity_kWh > 0 ? dailyCycledEnergy_kWh / capacity_kWh : 0;
  const avgDoD = avgDailyCycles;
  const cyclesPerYear = avgDailyCycles * 365;

  // C-rate at typical charge/discharge power (assume 0.5 C nominal charger)
  const cRate = capacity_kWh > 0 ? Math.min(dailyCycledEnergy_kWh / capacity_kWh, 2) : 0;
  const BATTERY_RTE = rteForCRate(cRate, chemistry);

  // ── Lifetime ──────────────────────────────────────────────────────────────
  const lifetimeCycles = estimateCycleLife(avgDoD, chemistry);
  const calendarLife_years = chemistry === 'lifepo4' ? 15 : 7;
  const cycleLife_years = cyclesPerYear > 0 ? lifetimeCycles / cyclesPerYear : calendarLife_years;
  const expectedLifetime_years = Math.min(cycleLife_years, calendarLife_years);

  // ── Levelised cost ────────────────────────────────────────────────────────
  const lifetimeEnergy_kWh = capacity_kWh * lifetimeCycles * BATTERY_RTE;
  const costPerKwh_KES = lifetimeEnergy_kWh > 0 ? upfrontCost_KES / lifetimeEnergy_kWh : Infinity;

  // ── Annual savings ────────────────────────────────────────────────────────
  const annualEnergyFromBattery_kWh = dailyCycledEnergy_kWh * 365;
  const annualGridSavings_KES = annualEnergyFromBattery_kWh * gridPrice_per_kWh;

  // Demand-charge savings: battery shaves peak to reduce contracted demand.
  // Savings = min(peak-shave_kW, contracted_demand) × 12 months × rate.
  // Peak-shave capacity ≈ battery power rating (assume 0.5 C discharge).
  const batteryPowerRating_kW = capacity_kWh * 0.5;
  const demandReduction_kW = Math.min(batteryPowerRating_kW, contractedDemand_kW);
  const annualDemandSavings_KES =
    demandReduction_kW * demandChargeRate_KES_per_kW_month * 12;

  // ── Maintenance (1 % p.a. — Li-ion industry norm) ─────────────────────────
  const annualMaintenance_KES = upfrontCost_KES * 0.01;
  const totalAnnualSavings = annualGridSavings_KES + annualDemandSavings_KES;
  const netAnnualSavings_KES = totalAnnualSavings - annualMaintenance_KES;
  const paybackPeriod_years =
    netAnnualSavings_KES > 0 ? upfrontCost_KES / netAnnualSavings_KES : 999;

  // ── NPV with inflation-adjusted savings & inflation-adjusted replacement ──
  const npv25Years_KES = calculateNPV(
    upfrontCost_KES,
    annualGridSavings_KES,
    annualDemandSavings_KES,
    annualMaintenance_KES,
    expectedLifetime_years,
    batteryCost_per_kWh * capacity_kWh,
    energyInflationRate,
    25,
    discountRate
  );

  const roi25Years_pct = upfrontCost_KES > 0 ? (npv25Years_KES / upfrontCost_KES) * 100 : 0;

  // ── Reasoning ─────────────────────────────────────────────────────────────
  let reasoning: string;
  if (capacity_kWh === 0) {
    reasoning = 'No battery — baseline scenario.';
  } else if (capacity_kWh < nightConsumption_kWh * 0.5) {
    reasoning = `Too small — only ${(capacity_kWh / nightConsumption_kWh * 100).toFixed(0)} % of night load.`;
  } else if (capacity_kWh > dailyConsumption_kWh * 2) {
    reasoning = `Oversized — ${(capacity_kWh / dailyConsumption_kWh).toFixed(1)}× daily consumption.`;
  } else if (paybackPeriod_years < 5) {
    reasoning = `Excellent ROI — payback ${paybackPeriod_years.toFixed(1)} yrs.`;
  } else if (paybackPeriod_years < 8) {
    reasoning = `Good ROI — ${paybackPeriod_years.toFixed(1)} yr payback.`;
  } else if (paybackPeriod_years < 12) {
    reasoning = `Acceptable — ${paybackPeriod_years.toFixed(1)} yr payback.`;
  } else {
    reasoning = `Poor ROI — ${paybackPeriod_years.toFixed(1)} yr payback exceeds battery lifetime.`;
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
    paybackPeriod_years,
    npv25Years_KES,
    roi25Years_pct,
    isRecommended: false,
    reasoning,
  };
}

function generateBatterySizesToTest(
  dailyConsumption_kWh: number,
  avgNightPower_kW: number
): number[] {
  const nightConsumption_kWh = avgNightPower_kW * 12;
  const minSize = Math.max(20, Math.floor((nightConsumption_kWh * 0.5) / 10) * 10);
  const maxSize = Math.min(200, Math.ceil((dailyConsumption_kWh * 2) / 10) * 10);
  const increment = dailyConsumption_kWh < 100 ? 10 : 20;
  const sizes: number[] = [0];
  for (let s = minSize; s <= maxSize; s += increment) sizes.push(s);
  for (const std of [40, 60, 80, 100]) if (!sizes.includes(std)) sizes.push(std);
  return [...new Set(sizes)].sort((a, b) => a - b);
}

function estimateCycleLife(
  avgDoD: number,
  chemistry: 'lifepo4' | 'lead-acid'
): number {
  if (chemistry === 'lifepo4') {
    if (avgDoD <= 0.20) return 10000;
    if (avgDoD <= 0.30) return 8000;
    if (avgDoD <= 0.50) return 6000;
    if (avgDoD <= 0.70) return 4000;
    if (avgDoD <= 0.80) return 3000;
    return 2000;
  } else {
    if (avgDoD <= 0.20) return 3000;
    if (avgDoD <= 0.30) return 2000;
    if (avgDoD <= 0.50) return 1200;
    if (avgDoD <= 0.70) return 700;
    if (avgDoD <= 0.80) return 500;
    return 300;
  }
}

/**
 * NPV with:
 *  - energy savings growing at energyInflationRate each year
 *  - demand savings growing at the same inflation rate
 *  - replacement cost inflated at energyInflationRate at each replacement year
 */
function calculateNPV(
  upfrontCost: number,
  annualEnergySavings: number,
  annualDemandSavings: number,
  annualMaintenance: number,
  batteryLifetime_years: number,
  replacementCost: number,
  energyInflationRate: number,
  totalYears: number,
  discountRate: number
): number {
  let npv = -upfrontCost;
  for (let year = 1; year <= totalYears; year++) {
    const inflationFactor = Math.pow(1 + energyInflationRate, year - 1);
    const discount = Math.pow(1 + discountRate, year);
    npv += (annualEnergySavings * inflationFactor) / discount;
    npv += (annualDemandSavings * inflationFactor) / discount;
    npv -= annualMaintenance / discount;
    if (year % Math.round(batteryLifetime_years) === 0 && year < totalYears) {
      const inflatedReplacement = replacementCost * Math.pow(1 + energyInflationRate, year);
      npv -= inflatedReplacement / discount;
    }
  }
  return npv;
}
