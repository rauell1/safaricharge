/**
 * SafariCharge Battery Economics Optimizer
 *
 * Analyzes multiple battery sizes to find the optimal configuration based on
 * ROI, lifecycle costs, and economic value. Shifts from "how big?" to "what's worth it?"
 *
 * Key insight: Bigger battery ≠ better economics. There's a sweet spot where
 * lifecycle cost per kWh is minimized and NPV is maximized.
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

  /** Annual grid savings in KES */
  annualGridSavings_KES: number;

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
  /** Analyses for all tested sizes */
  analyses: BatteryEconomicAnalysis[];

  /** Best size for ROI */
  bestForROI: BatteryEconomicAnalysis;

  /** Best size for grid independence */
  bestForIndependence: BatteryEconomicAnalysis;

  /** Best size for lifecycle cost */
  bestForCost: BatteryEconomicAnalysis;

  /** Overall recommendation */
  recommendation: BatteryEconomicAnalysis;

  /** Summary message */
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

  /** Grid electricity price in KES/kWh */
  gridPrice_per_kWh: number;

  /** Battery cost in KES/kWh */
  batteryCost_per_kWh?: number;

  /** Discount rate for NPV calculation */
  discountRate?: number;

  /** Assumed battery chemistry */
  chemistry?: 'lifepo4' | 'lead-acid';
}

/**
 * Optimize battery size based on economic analysis
 */
export function optimizeBatterySize(input: OptimizationInput): BatteryOptimizationResult {
  const {
    dailyConsumption_kWh,
    avgNightPower_kW,
    peakSunHours,
    solarCapacity_kW,
    gridPrice_per_kWh,
    batteryCost_per_kWh = 25000, // Default: 25,000 KES/kWh for LiFePO4
    discountRate = 0.05, // Default: 5% discount rate
    chemistry = 'lifepo4',
  } = input;

  // Battery sizes to test (kWh)
  const sizesToTest = generateBatterySizesToTest(dailyConsumption_kWh, avgNightPower_kW);

  const analyses: BatteryEconomicAnalysis[] = [];

  // Analyze each size
  for (const capacity_kWh of sizesToTest) {
    const analysis = analyzeBatterySize(
      capacity_kWh,
      dailyConsumption_kWh,
      avgNightPower_kW,
      peakSunHours,
      solarCapacity_kW,
      gridPrice_per_kWh,
      batteryCost_per_kWh,
      discountRate,
      chemistry
    );
    analyses.push(analysis);
  }

  // Find best options
  const bestForROI = [...analyses].sort((a, b) => b.roi25Years_pct - a.roi25Years_pct)[0];
  const bestForCost = [...analyses].sort((a, b) => a.costPerKwh_KES - b.costPerKwh_KES)[0];
  const bestForIndependence = [...analyses].sort((a, b) => b.capacity_kWh - a.capacity_kWh)[0];

  // Overall recommendation: Best NPV
  const recommendation = [...analyses].sort((a, b) => b.npv25Years_KES - a.npv25Years_KES)[0];
  recommendation.isRecommended = true;

  const summary = `Recommended ${recommendation.capacity_kWh} kWh battery provides best economic value with ${recommendation.roi25Years_pct.toFixed(0)}% ROI over 25 years (payback: ${recommendation.paybackPeriod_years.toFixed(1)} years, NPV: KES ${(recommendation.npv25Years_KES / 1_000_000).toFixed(2)}M).`;

  return {
    analyses,
    bestForROI,
    bestForIndependence,
    bestForCost,
    recommendation,
    summary,
  };
}

/**
 * Analyze a specific battery size
 */
function analyzeBatterySize(
  capacity_kWh: number,
  dailyConsumption_kWh: number,
  avgNightPower_kW: number,
  peakSunHours: number,
  solarCapacity_kW: number,
  gridPrice_per_kWh: number,
  batteryCost_per_kWh: number,
  discountRate: number,
  chemistry: 'lifepo4' | 'lead-acid'
): BatteryEconomicAnalysis {
  // ========================================================================
  // Calculate Upfront Cost
  // ========================================================================
  const upfrontCost_KES = capacity_kWh * batteryCost_per_kWh;

  // ========================================================================
  // Estimate Daily Cycles and DoD
  // ========================================================================

  // Daily solar generation (simplified)
  const dailySolarGeneration_kWh = solarCapacity_kW * peakSunHours * 0.75; // 75% efficiency

  // Energy that goes through battery daily
  const nightConsumption_kWh = avgNightPower_kW * 12; // 12 hours night
  const dayExcess_kWh = Math.max(0, dailySolarGeneration_kWh - (dailyConsumption_kWh - nightConsumption_kWh));

  // Energy cycled through battery = min(night consumption, day excess, battery capacity)
  const dailyCycledEnergy_kWh = Math.min(nightConsumption_kWh, dayExcess_kWh, capacity_kWh * 0.8); // Use up to 80% DoD

  // Average daily cycles
  const avgDailyCycles = dailyCycledEnergy_kWh / capacity_kWh;
  const avgDoD = avgDailyCycles; // For full charge/discharge cycle, DoD = cycles
  const cyclesPerYear = avgDailyCycles * 365;

  // ========================================================================
  // Calculate Expected Lifetime
  // ========================================================================

  const lifetimeCycles = estimateCycleLife(avgDoD, chemistry);
  const calendarLife_years = chemistry === 'lifepo4' ? 15 : 7; // Calendar aging limit
  const cycleLife_years = cyclesPerYear > 0 ? lifetimeCycles / cyclesPerYear : calendarLife_years;

  const expectedLifetime_years = Math.min(cycleLife_years, calendarLife_years);

  // ========================================================================
  // Calculate Lifetime Energy and Cost
  // ========================================================================

  const BATTERY_EFFICIENCY = 0.96; // 96% round-trip
  const lifetimeEnergy_kWh = capacity_kWh * lifetimeCycles * BATTERY_EFFICIENCY;
  const costPerKwh_KES = upfrontCost_KES / lifetimeEnergy_kWh;

  // ========================================================================
  // Calculate Annual Grid Savings
  // ========================================================================

  // Energy saved from grid = energy cycled through battery daily
  const annualEnergyFromBattery_kWh = dailyCycledEnergy_kWh * 365;
  const annualGridSavings_KES = annualEnergyFromBattery_kWh * gridPrice_per_kWh;

  // ========================================================================
  // Calculate Payback Period
  // ========================================================================

  // Account for maintenance (2% annually)
  const annualMaintenance_KES = upfrontCost_KES * 0.02;
  const netAnnualSavings_KES = annualGridSavings_KES - annualMaintenance_KES;

  const paybackPeriod_years = netAnnualSavings_KES > 0 ? upfrontCost_KES / netAnnualSavings_KES : 999;

  // ========================================================================
  // Calculate 25-Year NPV
  // ========================================================================

  const npv25Years_KES = calculateNPV(
    upfrontCost_KES,
    annualGridSavings_KES,
    annualMaintenance_KES,
    expectedLifetime_years,
    batteryCost_per_kWh * capacity_kWh, // Replacement cost
    25,
    discountRate
  );

  const roi25Years_pct = (npv25Years_KES / upfrontCost_KES) * 100;

  // ========================================================================
  // Generate Reasoning
  // ========================================================================

  let reasoning: string;

  if (capacity_kWh < nightConsumption_kWh * 0.5) {
    reasoning = `Too small - only ${(capacity_kWh / nightConsumption_kWh * 100).toFixed(0)}% of night consumption. Limited grid independence.`;
  } else if (capacity_kWh > dailyConsumption_kWh * 2) {
    reasoning = `Oversized - ${(capacity_kWh / dailyConsumption_kWh).toFixed(1)}× daily consumption. Expensive with poor ROI due to underutilization.`;
  } else if (paybackPeriod_years < 5) {
    reasoning = `Excellent ROI - pays back in ${paybackPeriod_years.toFixed(1)} years. Highly cost-effective.`;
  } else if (paybackPeriod_years < 8) {
    reasoning = `Good ROI - ${paybackPeriod_years.toFixed(1)} year payback. Solid investment for energy independence.`;
  } else if (paybackPeriod_years < 12) {
    reasoning = `Acceptable ROI - ${paybackPeriod_years.toFixed(1)} year payback. Consider if grid reliability is poor.`;
  } else {
    reasoning = `Poor ROI - ${paybackPeriod_years.toFixed(1)} year payback exceeds battery lifetime. Not economically justified.`;
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
    paybackPeriod_years,
    npv25Years_KES,
    roi25Years_pct,
    isRecommended: false,
    reasoning,
  };
}

/**
 * Generate battery sizes to test based on consumption
 */
function generateBatterySizesToTest(dailyConsumption_kWh: number, avgNightPower_kW: number): number[] {
  const nightConsumption_kWh = avgNightPower_kW * 12;

  const sizes: number[] = [];

  // Start from 0.5× night consumption, up to 2× daily consumption
  const minSize = Math.max(20, Math.floor(nightConsumption_kWh * 0.5 / 10) * 10); // Round to 10 kWh
  const maxSize = Math.min(200, Math.ceil(dailyConsumption_kWh * 2 / 10) * 10);

  // Generate sizes in 10 kWh or 20 kWh increments
  const increment = dailyConsumption_kWh < 100 ? 10 : 20;

  for (let size = minSize; size <= maxSize; size += increment) {
    sizes.push(size);
  }

  // Always include: 0 (no battery), standard sizes
  sizes.unshift(0);
  if (!sizes.includes(40)) sizes.push(40);
  if (!sizes.includes(60)) sizes.push(60);
  if (!sizes.includes(80)) sizes.push(80);
  if (!sizes.includes(100)) sizes.push(100);

  return [...new Set(sizes)].sort((a, b) => a - b);
}

/**
 * Estimate cycle life based on DoD and chemistry
 * Data from real LiFePO4 and Lead-Acid datasheets
 */
function estimateCycleLife(avgDoD: number, chemistry: 'lifepo4' | 'lead-acid'): number {
  if (chemistry === 'lifepo4') {
    // LiFePO4 cycle life curve
    // Source: CATL, BYD, Dyness datasheets
    if (avgDoD <= 0.20) return 10000; // 20% DoD: 10,000 cycles
    if (avgDoD <= 0.30) return 8000; // 30% DoD: 8,000 cycles
    if (avgDoD <= 0.50) return 6000; // 50% DoD: 6,000 cycles
    if (avgDoD <= 0.70) return 4000; // 70% DoD: 4,000 cycles
    if (avgDoD <= 0.80) return 3000; // 80% DoD: 3,000 cycles
    return 2000; // >80% DoD: 2,000 cycles
  } else {
    // Lead-Acid cycle life curve
    // Source: Trojan, Crown datasheets
    if (avgDoD <= 0.20) return 3000; // 20% DoD: 3,000 cycles
    if (avgDoD <= 0.30) return 2000; // 30% DoD: 2,000 cycles
    if (avgDoD <= 0.50) return 1200; // 50% DoD: 1,200 cycles
    if (avgDoD <= 0.70) return 700; // 70% DoD: 700 cycles
    if (avgDoD <= 0.80) return 500; // 80% DoD: 500 cycles
    return 300; // >80% DoD: 300 cycles
  }
}

/**
 * Calculate Net Present Value with battery replacements
 */
function calculateNPV(
  upfrontCost: number,
  annualSavings: number,
  annualMaintenance: number,
  batteryLifetime_years: number,
  replacementCost: number,
  totalYears: number,
  discountRate: number
): number {
  let npv = -upfrontCost; // Initial investment (negative)

  for (let year = 1; year <= totalYears; year++) {
    // Annual savings (discounted)
    const savingsPresentValue = annualSavings / Math.pow(1 + discountRate, year);
    npv += savingsPresentValue;

    // Annual maintenance (discounted, negative)
    const maintenancePresentValue = annualMaintenance / Math.pow(1 + discountRate, year);
    npv -= maintenancePresentValue;

    // Battery replacement (if needed)
    if (year % batteryLifetime_years === 0 && year < totalYears) {
      const replacementPresentValue = replacementCost / Math.pow(1 + discountRate, year);
      npv -= replacementPresentValue;
    }
  }

  return npv;
}
