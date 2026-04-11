/**
 * SafariCharge Hardware Recommendation Engine
 *
 * Analyzes energy consumption patterns and provides specific hardware recommendations
 * for solar panels, batteries, and inverters with ROI calculations.
 */

import type { SolarIrradianceData } from './nasa-power-api';

export interface LoadProfile {
  // Daily energy consumption (kWh/day)
  dailyConsumption: number;
  // Peak power demand (kW)
  peakPower: number;
  // Average power during day (kW)
  avgDayPower: number;
  // Average power during night (kW)
  avgNightPower: number;
  // Percentage of load during peak hours
  peakHoursLoadPct: number;
}

export interface HardwareRecommendation {
  // Solar Panel System
  solarPanels: {
    totalCapacityKw: number;
    numberOfPanels: number;
    panelWattage: number; // typical panel size
    estimatedCostKES: number;
    monthlySavingsKES: number;
  };

  // Battery Storage
  battery: {
    capacityKwh: number;
    typeRecommended: string; // 'LiFePO4' or 'Lead-Acid'
    numberOfBatteries: number;
    batteryCapacityAhPer: number; // Ah per battery unit
    voltageSystem: number; // 48V typical
    estimatedCostKES: number;
  };

  // Inverter
  inverter: {
    ratedCapacityKw: number;
    typeRecommended: string; // 'Hybrid' or 'Grid-Tie'
    estimatedCostKES: number;
  };

  // Financial Analysis
  financial: {
    totalSystemCostKES: number;
    installationCostKES: number;
    totalInvestmentKES: number;
    monthlyGridSavingsKES: number;
    annualGridSavingsKES: number;
    paybackPeriodYears: number;
    npvKES: number;
    irrPct: number;
    lcoeKESPerKwh: number;
    roi25YearsPct: number;
    netSavings25YearsKES: number;
  };

  // Energy Performance
  performance: {
    dailySolarGenerationKwh: number;
    gridDependencyReductionPct: number;
    annualCO2SavingsKg: number;
    equivalentTreesPlanted: number;
  };

  // Summary
  summary: string;
  confidence: 'high' | 'medium' | 'low';
  notes: string[];
}

// Kenya market pricing (2026 Nairobi benchmarks) - UPDATED WITH ACTUAL SUPPLIER PRICES
// Pricing based on verified Nairobi suppliers (Jinko panels, Deye/Solis inverters, Dyness batteries)
// Base supplier costs with 1.5x markup for proper margin
const PRICING = {
  // Solar panels (per watt) - Based on Jinko 585W/620W @ 18 KES/W supplier cost
  SOLAR_PER_WATT_KES: 27, // 18 KES/W base * 1.5x markup = 27 KES/W

  // Battery storage - Based on Dyness LiFePO4 5.12kWh @ 85,000 KES (16,602 KES/kWh supplier cost)
  LIFEPO4_PER_KWH_KES: 25000, // 16,602 KES/kWh base * 1.5x markup ≈ 25,000 KES/kWh
  LEAD_ACID_PER_KWH_KES: 15000, // Proportionally adjusted from LiFePO4 pricing (60% of LiFePO4 cost)

  // Inverters (per kW) - Based on Deye/Solis pricing (avg ~20,000 KES/kW supplier cost)
  HYBRID_INVERTER_PER_KW_KES: 30000, // 20,000 KES/kW base * 1.5x markup = 30,000 KES/kW
  GRID_TIE_INVERTER_PER_KW_KES: 20000, // Grid-tie only (proportionally lower at ~67% of hybrid cost)

  // Installation (percentage of equipment cost)
  INSTALLATION_PCT: 0.20, // 20% for labor, mounting, wiring, permits (increased from 15%)

  // Annual maintenance (percentage of total investment)
  MAINTENANCE_ANNUAL_PCT: 0.02, // 2% annually for cleaning, inspection, repairs

  // Battery replacement cycles
  LIFEPO4_REPLACEMENT_YEARS: 10, // LiFePO4 lasts 10-15 years
  LEAD_ACID_REPLACEMENT_YEARS: 5, // Lead-acid needs replacement every 5 years

  // Tariff escalation
  TARIFF_ESCALATION_ANNUAL_PCT: 0.06, // 6% annual electricity price increase

  // Kenya Power rates (from actual KPLC bills)
  KPLC_PEAK_RATE_KES: 24.3, // Updated to match actual all-in peak rate
  KPLC_OFFPEAK_RATE_KES: 14.9, // Updated to match actual all-in off-peak rate
  KPLC_AVG_RATE_KES: 18.5, // Weighted average

  // Grid emission factor
  GRID_EMISSION_KG_CO2_PER_KWH: 0.47,
  TREE_CO2_ABSORPTION_KG_PER_YEAR: 21.77,
};

/**
 * Generate hardware recommendations based on load profile and location data
 */
export function generateRecommendation(
  loadProfile: LoadProfile,
  solarData: SolarIrradianceData,
  options: {
    budgetConstraint?: number; // Optional max budget in KES
    batteryPreference?: 'lifepo4' | 'lead-acid' | 'auto';
    gridBackupRequired?: boolean;
    autonomyDays?: number; // Days of battery backup needed
  } = {}
): HardwareRecommendation {
  const {
    budgetConstraint,
    batteryPreference = 'auto',
    gridBackupRequired = true,
    autonomyDays = 1.5,
  } = options;

  // Calculate solar panel size
  const avgDailySolarKwh = solarData.annualAverage; // kWh/m²/day
  const solarCapacityKw = calculateSolarCapacity(
    loadProfile.dailyConsumption,
    avgDailySolarKwh
  );

  // Panel configuration (assume 400W-550W panels typical in Kenya market)
  const panelWattage = 550; // Modern high-efficiency panels
  const numberOfPanels = Math.ceil((solarCapacityKw * 1000) / panelWattage);
  const actualSolarKw = (numberOfPanels * panelWattage) / 1000;

  // Solar cost
  const solarCost = actualSolarKw * 1000 * PRICING.SOLAR_PER_WATT_KES;

  // Calculate battery size
  const batteryKwh = calculateBatteryCapacity(
    loadProfile.dailyConsumption,
    loadProfile.avgNightPower,
    autonomyDays
  );

  // Battery type selection
  const useLiFePO4 =
    batteryPreference === 'lifepo4' ||
    (batteryPreference === 'auto' && (!budgetConstraint || budgetConstraint > 3000000));

  const batteryCostPerKwh = useLiFePO4
    ? PRICING.LIFEPO4_PER_KWH_KES
    : PRICING.LEAD_ACID_PER_KWH_KES;
  const batteryCost = batteryKwh * batteryCostPerKwh;

  // Battery configuration (48V system typical)
  const voltageSystem = 48;
  const batteryType = useLiFePO4 ? 'LiFePO4 (Lithium Iron Phosphate)' : 'AGM Lead-Acid';
  const batteryAhPer = 200; // Typical battery module size
  const numberOfBatteries = Math.ceil(batteryKwh / ((voltageSystem * batteryAhPer) / 1000));

  // Calculate inverter size (must handle peak load + safety margin)
  const inverterKw = Math.ceil(loadProfile.peakPower * 1.25 * 2) / 2; // Round to nearest 0.5 kW

  // Inverter cost
  const inverterType = gridBackupRequired ? 'Hybrid Grid-Tie + Backup' : 'Grid-Tie';
  const inverterCostPerKw = gridBackupRequired
    ? PRICING.HYBRID_INVERTER_PER_KW_KES
    : PRICING.GRID_TIE_INVERTER_PER_KW_KES;
  const inverterCost = inverterKw * inverterCostPerKw;

  // Total costs
  const equipmentCost = solarCost + batteryCost + inverterCost;
  const installationCost = equipmentCost * PRICING.INSTALLATION_PCT;
  const totalInvestment = equipmentCost + installationCost;

  // Financial calculations with realistic derating
  const dailySolarGeneration = actualSolarKw * avgDailySolarKwh * 0.75; // 75% system efficiency (realistic)
  const gridDependencyReduction = Math.min(
    0.95,
    dailySolarGeneration / loadProfile.dailyConsumption
  );

  // Monthly savings (weighted by peak/off-peak usage)
  const monthlySolarKwh = dailySolarGeneration * 30;
  const peakSavingsKwh = monthlySolarKwh * (loadProfile.peakHoursLoadPct / 100);
  const offPeakSavingsKwh = monthlySolarKwh * (1 - loadProfile.peakHoursLoadPct / 100);

  const monthlyGridSavings =
    peakSavingsKwh * PRICING.KPLC_PEAK_RATE_KES +
    offPeakSavingsKwh * PRICING.KPLC_OFFPEAK_RATE_KES;

  // Calculate 25-year financials with realistic assumptions
  let cumulativeSavings = 0;
  let cumulativeCosts = totalInvestment;
  let currentAnnualSavings = monthlyGridSavings * 12;
  const yearlyNetCashflows: number[] = [];
  const initialAnnualSolarKwh = dailySolarGeneration * 365;
  const pvDegradationAnnual = 0.006; // 0.6%/year baseline
  const batteryReplacementYear = useLiFePO4
    ? PRICING.LIFEPO4_REPLACEMENT_YEARS
    : PRICING.LEAD_ACID_REPLACEMENT_YEARS;

  for (let year = 1; year <= 25; year++) {
    // Escalate tariff and include PV degradation on delivered kWh
    currentAnnualSavings *= (1 + PRICING.TARIFF_ESCALATION_ANNUAL_PCT) * (1 - pvDegradationAnnual);

    // Add annual maintenance cost
    const maintenanceCost = totalInvestment * PRICING.MAINTENANCE_ANNUAL_PCT;
    cumulativeCosts += maintenanceCost;

    // Battery replacement costs
    if (year % batteryReplacementYear === 0 && year < 25) {
      cumulativeCosts += batteryCost; // Replace batteries
    }

    // Add net savings
    cumulativeSavings += currentAnnualSavings;
    yearlyNetCashflows.push(currentAnnualSavings - maintenanceCost - (year % batteryReplacementYear === 0 && year < 25 ? batteryCost : 0));
  }

  const netSavings25Years = cumulativeSavings - cumulativeCosts;
  const roi25Years = (netSavings25Years / totalInvestment) * 100;

  // Payback period (simple, accounting for maintenance)
  const annualMaintenance = totalInvestment * PRICING.MAINTENANCE_ANNUAL_PCT;
  const netAnnualSavings = monthlyGridSavings * 12 - annualMaintenance;
  const paybackYears = netAnnualSavings > 0 ? totalInvestment / netAnnualSavings : 99;
  const discountRate = 0.12;
  const npv = computeNPV(totalInvestment, yearlyNetCashflows, discountRate);
  const irr = computeIRR([-totalInvestment, ...yearlyNetCashflows]);
  const discountedLifetimeKwh = Array.from({ length: 25 }, (_, year) =>
    (initialAnnualSolarKwh * Math.pow(1 - pvDegradationAnnual, year)) / Math.pow(1 + discountRate, year + 1)
  ).reduce((sum, v) => sum + v, 0);
  const discountedOpexKes = Array.from({ length: 25 }, (_, year) =>
    (annualMaintenance + ((year + 1) % batteryReplacementYear === 0 && year + 1 < 25 ? batteryCost : 0)) /
    Math.pow(1 + discountRate, year + 1)
  ).reduce((sum, v) => sum + v, 0);
  const lcoeKesPerKwh = discountedLifetimeKwh > 0 ? (totalInvestment + discountedOpexKes) / discountedLifetimeKwh : 0;

  // Environmental impact
  const annualSolarKwh = dailySolarGeneration * 365;
  const annualCO2Savings = annualSolarKwh * PRICING.GRID_EMISSION_KG_CO2_PER_KWH;
  const equivalentTrees = annualCO2Savings / PRICING.TREE_CO2_ABSORPTION_KG_PER_YEAR;

  // Generate summary and notes
  const summary = generateSummary(
    actualSolarKw,
    batteryKwh,
    inverterKw,
    paybackYears,
    monthlyGridSavings,
    gridDependencyReduction
  );

  const notes = generateNotes(
    loadProfile,
    solarData,
    useLiFePO4,
    paybackYears,
    gridDependencyReduction
  );

  // Confidence assessment
  const confidence = assessConfidence(loadProfile, solarData, budgetConstraint);

  // SANITY CHECKS: Warn if system size is unrealistic
  const warnings: string[] = [];

  // Typical residential: 3-15 kW, Commercial small: 50-300 kW, Industrial: 1-5 MW
  if (actualSolarKw > 1000) {
    warnings.push(`⚠️ ALERT: System size (${actualSolarKw.toFixed(0)} kW) is extremely large. This suggests a potential calculation error. Please verify simulation data covers the intended time period.`);
    console.error('SANITY CHECK FAILED: System size > 1 MW', {
      solarCapacityKw: actualSolarKw,
      dailyConsumption: loadProfile.dailyConsumption,
      numberOfPanels,
      batteryKwh,
    });
  } else if (actualSolarKw > 500) {
    warnings.push(`⚠️ CAUTION: Large industrial-scale system (${actualSolarKw.toFixed(0)} kW). Verify this matches your facility requirements.`);
  }

  if (batteryKwh > 5000) {
    warnings.push(`⚠️ ALERT: Battery capacity (${batteryKwh.toFixed(0)} kWh) is extremely large. This suggests a potential calculation error.`);
    console.error('SANITY CHECK FAILED: Battery > 5 MWh', {
      batteryKwh,
      avgNightPower: loadProfile.avgNightPower,
      autonomyDays,
    });
  }

  if (totalInvestment > 1000000000) { // 1 billion KES
    warnings.push(`⚠️ ALERT: Investment cost (KES ${(totalInvestment / 1000000000).toFixed(2)}B) is unrealistically high. Please check input data.`);
    console.error('SANITY CHECK FAILED: Cost > 1 billion KES', {
      totalInvestment,
      equipmentCost,
      actualSolarKw,
      batteryKwh,
    });
  }

  // Add warnings to notes if any exist
  if (warnings.length > 0) {
    notes.unshift(...warnings);
  }

  return {
    solarPanels: {
      totalCapacityKw: parseFloat(actualSolarKw.toFixed(2)),
      numberOfPanels,
      panelWattage,
      estimatedCostKES: Math.round(solarCost),
      monthlySavingsKES: Math.round(monthlyGridSavings * (solarCost / equipmentCost)),
    },
    battery: {
      capacityKwh: parseFloat(batteryKwh.toFixed(2)),
      typeRecommended: batteryType,
      numberOfBatteries,
      batteryCapacityAhPer: batteryAhPer,
      voltageSystem,
      estimatedCostKES: Math.round(batteryCost),
    },
    inverter: {
      ratedCapacityKw: inverterKw,
      typeRecommended: inverterType,
      estimatedCostKES: Math.round(inverterCost),
    },
    financial: {
      totalSystemCostKES: Math.round(equipmentCost),
      installationCostKES: Math.round(installationCost),
      totalInvestmentKES: Math.round(totalInvestment),
      monthlyGridSavingsKES: Math.round(monthlyGridSavings),
      annualGridSavingsKES: Math.round(monthlyGridSavings * 12),
      paybackPeriodYears: parseFloat(paybackYears.toFixed(1)),
      npvKES: Math.round(npv),
      irrPct: parseFloat((irr * 100).toFixed(1)),
      lcoeKESPerKwh: parseFloat(lcoeKesPerKwh.toFixed(2)),
      roi25YearsPct: parseFloat(roi25Years.toFixed(1)),
      netSavings25YearsKES: Math.round(netSavings25Years),
    },
    performance: {
      dailySolarGenerationKwh: parseFloat(dailySolarGeneration.toFixed(2)),
      gridDependencyReductionPct: parseFloat((gridDependencyReduction * 100).toFixed(1)),
      annualCO2SavingsKg: Math.round(annualCO2Savings),
      equivalentTreesPlanted: Math.round(equivalentTrees),
    },
    summary,
    confidence,
    notes,
  };
}

/**
 * Calculate recommended solar panel capacity
 *
 * FIXED: Previous formula caused unrealistic values (9000 panels) due to:
 * - Missing system derating factors
 * - Not accounting for real-world losses properly
 * - Incorrect efficiency application
 *
 * Correct formula:
 * Panel Output per day = Panel_Wattage × Peak Sun Hours × System Efficiency
 * Number of Panels = Required Energy / Panel Output per day
 *
 * System Efficiency includes:
 * - Inverter losses: 3-8% (we use 5%)
 * - Temperature losses: 5-15% (we use 10% for Kenya climate)
 * - Soiling/dust: 3-5% (we use 5% for Kenya)
 * - Cable losses: 2-3% (we use 2%)
 * - Mismatch losses: 1-2% (we use 2%)
 * - Overall system efficiency: ~75% (0.75)
 */
function calculateSolarCapacity(dailyConsumptionKwh: number, avgDailySolarKwhM2: number): number {
  // Target: generate slightly more than daily consumption to account for variability
  const targetGeneration = dailyConsumptionKwh * 1.10; // 10% buffer for cloudy days

  // Real-world system efficiency (accounting for all losses)
  const systemEfficiency = 0.75; // Conservative 75% efficiency

  // Peak sun hours = irradiance (kWh/m²/day)
  const peakSunHours = avgDailySolarKwhM2;

  // Solar capacity (kW) = target / (peak sun hours × efficiency)
  // This gives us the RATED capacity needed
  const requiredCapacityKw = targetGeneration / (peakSunHours * systemEfficiency);

  return requiredCapacityKw;
}

/**
 * Calculate recommended battery capacity
 */
function calculateBatteryCapacity(
  dailyConsumptionKwh: number,
  avgNightPowerKw: number,
  autonomyDays: number
): number {
  // Battery should cover nighttime consumption + autonomy days
  // Typical night duration: 12 hours
  const nightConsumption = avgNightPowerKw * 12;

  // Minimum: 1 night + safety margin
  // Maximum: autonomyDays worth of full consumption
  const minCapacity = nightConsumption * 1.3;
  const targetCapacity = dailyConsumptionKwh * autonomyDays;

  // Use larger of the two, but cap at 2x daily consumption for cost-effectiveness
  return Math.min(Math.max(minCapacity, targetCapacity), dailyConsumptionKwh * 2);
}

/**
 * Generate human-readable summary
 */
function generateSummary(
  solarKw: number,
  batteryKwh: number,
  inverterKw: number,
  paybackYears: number,
  monthlySavings: number,
  gridReduction: number
): string {
  return `Install a ${solarKw.toFixed(1)} kW solar system with ${batteryKwh.toFixed(
    1
  )} kWh battery storage and ${inverterKw} kW inverter. This configuration will reduce your grid dependency by ${(
    gridReduction * 100
  ).toFixed(0)}%, save you approximately KES ${monthlySavings.toLocaleString()}/month, and pay for itself in ${paybackYears.toFixed(
    1
  )} years.`;
}

/**
 * Generate helpful notes and recommendations
 */
function generateNotes(
  loadProfile: LoadProfile,
  solarData: SolarIrradianceData,
  useLiFePO4: boolean,
  paybackYears: number,
  gridReduction: number
): string[] {
  const notes: string[] = [];

  // Location-specific advice
  if (solarData.annualAverage > 6.0) {
    notes.push(
      `Excellent solar resource at ${solarData.location} (${solarData.annualAverage.toFixed(
        1
      )} kWh/m²/day). This location is ideal for solar investment.`
    );
  } else if (solarData.annualAverage < 4.5) {
    notes.push(
      `Moderate solar resource at ${solarData.location} (${solarData.annualAverage.toFixed(
        1
      )} kWh/m²/day). Consider oversizing the array slightly.`
    );
  }

  // Battery advice
  if (useLiFePO4) {
    notes.push(
      'LiFePO4 batteries recommended for 10-15 year lifespan, 4000-6000 cycles, and minimal maintenance.'
    );
  } else {
    notes.push(
      'Lead-acid batteries are more affordable upfront but require replacement every 3-5 years and regular maintenance.'
    );
  }

  // Payback advice
  if (paybackYears < 5) {
    notes.push('Excellent ROI - this system will pay for itself quickly given your consumption pattern.');
  } else if (paybackYears > 8) {
    notes.push(
      'Consider reducing battery capacity or exploring utility incentives to improve payback period.'
    );
  }

  // Grid dependency
  if (gridReduction > 0.8) {
    notes.push('This system provides near-complete energy independence from the grid.');
  } else if (gridReduction < 0.5) {
    notes.push(
      'For higher grid independence, consider increasing solar capacity or shifting loads to daytime.'
    );
  }

  // High peak load warning
  if (loadProfile.peakPower > loadProfile.avgDayPower * 3) {
    notes.push(
      'High peak demand detected. Consider load management strategies or a larger inverter for surge capacity.'
    );
  }

  return notes;
}

/**
 * Assess confidence level in the recommendation
 */
function assessConfidence(
  loadProfile: LoadProfile,
  solarData: SolarIrradianceData,
  budgetConstraint?: number
): 'high' | 'medium' | 'low' {
  let score = 10;

  // Penalize if load data seems incomplete
  if (loadProfile.dailyConsumption < 10) score -= 2;
  if (loadProfile.peakPower < 2) score -= 2;

  // Penalize if solar data is from fallback
  if (solarData.location.includes('°')) score -= 1; // fallback uses coordinates

  // Penalize if budget constraint might not be met
  if (budgetConstraint && budgetConstraint < 500000) score -= 3;

  if (score >= 8) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

function computeNPV(initialInvestment: number, cashflows: number[], discountRate: number): number {
  return -initialInvestment + cashflows.reduce(
    (acc, cf, idx) => acc + cf / Math.pow(1 + discountRate, idx + 1),
    0
  );
}

function computeIRR(cashflows: number[]): number {
  let low = -0.9;
  let high = 1.5;

  const npvAt = (rate: number): number =>
    cashflows.reduce((npv, cf, i) => npv + cf / Math.pow(1 + rate, i), 0);

  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    const npvMid = npvAt(mid);
    if (Math.abs(npvMid) < 1e-3) return mid;

    const npvLow = npvAt(low);
    if (Math.sign(npvLow) === Math.sign(npvMid)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Analyze simulation data to create load profile
 */
export function createLoadProfileFromSimulation(simulationData: Array<{
  homeLoadKWh: number;
  ev1LoadKWh: number;
  ev2LoadKWh: number;
  isPeakTime: boolean;
  hour: number;
}>): LoadProfile {
  if (simulationData.length === 0) {
    // Default fallback profile
    return {
      dailyConsumption: 150,
      peakPower: 40,
      avgDayPower: 8,
      avgNightPower: 3,
      peakHoursLoadPct: 35,
    };
  }

  // Calculate totals
  const totalLoad = simulationData.reduce(
    (sum, d) => sum + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh,
    0
  );

  // CRITICAL FIX: Calculate AVERAGE daily consumption, not total
  // Determine number of unique days in simulation
  // Each day has 420 timesteps (24h * 60min / (24/420))
  const TIMESTEPS_PER_DAY = 420;
  const numberOfDays = Math.max(1, Math.round(simulationData.length / TIMESTEPS_PER_DAY));
  const dailyConsumption = totalLoad / numberOfDays;

  // Find peak power (convert kWh to kW based on timestep)
  // CRITICAL FIX: timeStepHours should be per-timestep (24/420), NOT based on total simulation length
  // NOTE: avoid Math.max(...largeArray) because large simulations (100k+ points)
  // can exceed V8's argument limit and throw "Maximum call stack size exceeded".
  const timeStepHours = 24 / TIMESTEPS_PER_DAY; // ~0.0571 hours per timestep (~3.43 minutes)
  let peakPower = 0;
  for (const d of simulationData) {
    const pointPowerKw = (d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh) / timeStepHours;
    if (pointPowerKw > peakPower) peakPower = pointPowerKw;
  }

  // Calculate day vs night averages (6 AM to 6 PM is day)
  const dayData = simulationData.filter(d => d.hour >= 6 && d.hour < 18);
  const nightData = simulationData.filter(d => d.hour < 6 || d.hour >= 18);

  const avgDayPower = dayData.length > 0
    ? dayData.reduce((sum, d) => sum + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh, 0) /
      dayData.length /
      timeStepHours
    : 0;
  const avgNightPower = nightData.length > 0
    ? nightData.reduce((sum, d) => sum + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh, 0) /
      nightData.length /
      timeStepHours
    : 0;

  // Peak hours load percentage
  const peakLoad = simulationData
    .filter(d => d.isPeakTime)
    .reduce((sum, d) => sum + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh, 0);
  const peakHoursLoadPct = (peakLoad / totalLoad) * 100;

  return {
    dailyConsumption,
    peakPower,
    avgDayPower,
    avgNightPower,
    peakHoursLoadPct,
  };
}

// ---------------------------------------------------------------------------
// Forecast-based Recommendations
// ---------------------------------------------------------------------------

/** Minimal subset of ForecastPoint used by generateForecastRecommendations. */
export interface ForecastPointLike {
  timestamp: string;
  solar_kw: number;
  load_kw: number;
}

/** Lightweight actionable recommendation returned by the forecast engine. */
export interface Recommendation {
  type: 'surplus' | 'deficit' | 'shift';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedImpactKwh?: number;
}

/**
 * Generate 2-3 actionable recommendations from a 24h forecast.
 *
 * Identifies surplus hours (solar > load), deficit hours (load > solar),
 * and recommends load-shifting or battery charging actions accordingly.
 *
 * @param forecast    Array of hourly forecast points.
 * @param systemConfig  Minimal system configuration (battery capacity, tariff).
 * @param currentSoc    Current battery state of charge 0-100 (%).
 */
export function generateForecastRecommendations(
  forecast: ForecastPointLike[],
  systemConfig: {
    batteryCapacityKWh: number;
    solarCapacityKW: number;
    gridTariff?: { peakRate: number; offPeakRate: number };
  },
  currentSoc: number,
): Recommendation[] {
  if (!forecast || forecast.length === 0) return [];

  const recommendations: Recommendation[] = [];

  // ---- Identify surplus and deficit windows --------------------------------
  const surplusHours: { hour: number; excessKw: number }[] = [];
  const deficitHours: { hour: number; shortfallKw: number }[] = [];
  let totalSurplusKwh = 0;
  let totalDeficitKwh = 0;

  for (const point of forecast) {
    const ts = new Date(point.timestamp);
    const hour = ts.getHours();
    const diff = point.solar_kw - point.load_kw; // positive = surplus
    if (diff > 0.1) {
      surplusHours.push({ hour, excessKw: diff });
      totalSurplusKwh += diff; // hourly integral ≈ diff × 1h
    } else if (diff < -0.1) {
      deficitHours.push({ hour, shortfallKw: -diff });
      totalDeficitKwh += -diff;
    }
  }

  // ---- Recommendation 1: Battery pre-charge or export surplus ---------------
  if (surplusHours.length > 0) {
    const peakSurplus = surplusHours.reduce(
      (max, h) => (h.excessKw > max.excessKw ? h : max),
      surplusHours[0],
    );
    const availableBatteryKwh =
      systemConfig.batteryCapacityKWh * ((100 - currentSoc) / 100);
    const chargeableKwh = Math.min(totalSurplusKwh, availableBatteryKwh);

    recommendations.push({
      type: 'surplus',
      priority: chargeableKwh > 5 ? 'high' : 'medium',
      title: `Solar surplus expected around ${peakSurplus.hour.toString().padStart(2, '0')}:00`,
      description:
        `${totalSurplusKwh.toFixed(1)} kWh of surplus solar is forecast. ` +
        (chargeableKwh > 0.5
          ? `Charge battery now (${chargeableKwh.toFixed(1)} kWh available headroom) to store the excess.`
          : 'Battery is near full — consider exporting surplus to the grid for feed-in credit.'),
      estimatedImpactKwh: chargeableKwh,
    });
  }

  // ---- Recommendation 2: Shift peak loads into surplus window ---------------
  const peakHourDeficits = deficitHours.filter(h => h.hour >= 17 && h.hour <= 21);
  const hasSurplusMidDay = surplusHours.some(h => h.hour >= 10 && h.hour <= 15);

  if (peakHourDeficits.length > 0 && hasSurplusMidDay) {
    const totalPeakDeficitKwh = peakHourDeficits.reduce((s, h) => s + h.shortfallKw, 0);
    const peakRate = systemConfig.gridTariff?.peakRate ?? 24.3;
    const offPeakRate = systemConfig.gridTariff?.offPeakRate ?? 14.9;
    const potentialSavingsKES = totalPeakDeficitKwh * (peakRate - offPeakRate);

    recommendations.push({
      type: 'shift',
      priority: 'high',
      title: 'Shift heavy loads to midday solar window',
      description:
        `${totalPeakDeficitKwh.toFixed(1)} kWh demand is forecast during peak-tariff hours (17:00-21:00). ` +
        `Moving dishwasher, washing machine, or EV charging to 10:00-15:00 could save up to KES ${potentialSavingsKES.toFixed(0)} today.`,
      estimatedImpactKwh: totalPeakDeficitKwh,
    });
  }

  // ---- Recommendation 3: Low solar day → conserve battery SOC ---------------
  const totalForecastSolarKwh = forecast.reduce((s, p) => s + p.solar_kw, 0);
  const expectedSolarAtFullCapacity = systemConfig.solarCapacityKW * 5; // assume 5 peak-sun-hours
  const cloudyDay = totalForecastSolarKwh < expectedSolarAtFullCapacity * 0.4;

  if (cloudyDay && currentSoc < 60) {
    recommendations.push({
      type: 'deficit',
      priority: 'high',
      title: 'Low solar generation forecast — preserve battery reserves',
      description:
        `Only ${totalForecastSolarKwh.toFixed(1)} kWh of solar is expected today (below 40 % of capacity). ` +
        `With battery at ${currentSoc.toFixed(0)}% SOC, avoid non-essential loads during evening hours to maintain backup capability.`,
      estimatedImpactKwh: totalDeficitKwh,
    });
  } else if (deficitHours.length > 0 && recommendations.length < 2) {
    recommendations.push({
      type: 'deficit',
      priority: 'medium',
      title: `Grid import likely during ${deficitHours.length} forecast hours`,
      description:
        `Total expected shortfall: ${totalDeficitKwh.toFixed(1)} kWh. ` +
        'Consider reducing non-critical loads or ensuring battery is sufficiently charged before evening.',
      estimatedImpactKwh: totalDeficitKwh,
    });
  }

  // Return at most 3
  return recommendations.slice(0, 3);
}
