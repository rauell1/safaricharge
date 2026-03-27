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

// Kenya market pricing (2026 estimates in KES)
const PRICING = {
  // Solar panels (per watt)
  SOLAR_PER_WATT_KES: 55, // KES 50-60/W typical for quality panels

  // Battery storage
  LIFEPO4_PER_KWH_KES: 45000, // Premium LiFePO4
  LEAD_ACID_PER_KWH_KES: 18000, // AGM/Gel Lead-Acid

  // Inverters (per kW)
  HYBRID_INVERTER_PER_KW_KES: 35000, // Hybrid grid-tie with backup
  GRID_TIE_INVERTER_PER_KW_KES: 22000, // Grid-tie only

  // Installation (percentage of equipment cost)
  INSTALLATION_PCT: 0.15, // 15% for labor, mounting, wiring, etc.

  // Kenya Power rates (from config)
  KPLC_PEAK_RATE_KES: 26.0, // Approximate all-in peak rate
  KPLC_OFFPEAK_RATE_KES: 16.0, // Approximate all-in off-peak rate
  KPLC_AVG_RATE_KES: 19.0, // Weighted average

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

  // Financial calculations
  const dailySolarGeneration = actualSolarKw * avgDailySolarKwh * 0.85; // 85% system efficiency
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

  const annualGridSavings = monthlyGridSavings * 12;

  // Payback period (accounting for maintenance at 1.5% annually)
  const annualMaintenance = totalInvestment * 0.015;
  const netAnnualSavings = annualGridSavings - annualMaintenance;
  const paybackYears = totalInvestment / netAnnualSavings;

  // 25-year ROI (typical solar system life)
  const savings25Years = netAnnualSavings * 25;
  const netSavings25Years = savings25Years - totalInvestment;
  const roi25Years = (netSavings25Years / totalInvestment) * 100;

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
      annualGridSavingsKES: Math.round(annualGridSavings),
      paybackPeriodYears: parseFloat(paybackYears.toFixed(1)),
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
 */
function calculateSolarCapacity(dailyConsumptionKwh: number, avgDailySolarKwhM2: number): number {
  // Target: generate 110-120% of daily consumption to account for losses
  // System efficiency: ~85% (inverter, wiring, soiling, temp losses)
  const targetGeneration = dailyConsumptionKwh * 1.15;
  const systemEfficiency = 0.85;

  // Solar capacity (kW) = target / (peak sun hours × efficiency)
  return targetGeneration / (avgDailySolarKwhM2 * systemEfficiency);
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
  const dailyConsumption = totalLoad;

  // Find peak power (convert kWh to kW based on timestep)
  const timeStepHours = 24 / simulationData.length;
  const peakPower = Math.max(
    ...simulationData.map(d => (d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh) / timeStepHours)
  );

  // Calculate day vs night averages (6 AM to 6 PM is day)
  const dayData = simulationData.filter(d => d.hour >= 6 && d.hour < 18);
  const nightData = simulationData.filter(d => d.hour < 6 || d.hour >= 18);

  const avgDayPower =
    dayData.reduce((sum, d) => sum + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh, 0) /
    dayData.length /
    timeStepHours;
  const avgNightPower =
    nightData.reduce((sum, d) => sum + d.homeLoadKWh + d.ev2LoadKWh + d.ev2LoadKWh, 0) /
    nightData.length /
    timeStepHours;

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
