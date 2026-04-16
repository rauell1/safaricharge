/**
 * SafariCharge Auto-Sizing Wizard
 *
 * Intelligent system sizing engine that transforms user requirements into
 * optimized hardware configurations. This is the entry point for non-experts.
 *
 * Shift: From "configure components" → "tell us your needs"
 */

import type { SystemConfiguration } from './system-config';
import type { SolarIrradianceData } from './nasa-power-api';

export interface SizingWizardInput {
  /** User's daily energy consumption in kWh/day */
  dailyConsumption_kWh: number;

  /** Target solar offset: 0.5 = 50%, 1.0 = 100%, 1.5 = off-grid with autonomy */
  offsetTarget: 0.5 | 0.75 | 1.0 | 1.5;

  /** User's primary goal */
  goal: 'save-money' | 'backup-power' | 'energy-independence' | 'off-grid';

  /** Optional budget constraint in KES */
  budgetConstraint?: number;

  /** Location data for solar resource estimation */
  location: {
    latitude: number;
    longitude: number;
    peakSunHours: number; // From NASA POWER data
  };

  /** Optional physical constraints */
  constraints?: {
    /** Available roof area in m² */
    roofArea_sqm?: number;
    /** Maximum inverter size (electrical panel limitation) */
    maxInverterKw?: number;
    /** Existing loads that must be supported */
    criticalLoads_kW?: number;
  };

  /** Peak power demand in kW (if known) */
  peakPower_kW?: number;
}

export interface SizingRecommendation {
  /** Recommended system configuration */
  config: SystemConfiguration;

  /** DC:AC ratio analysis */
  dcAcRatio: {
    ratio: number;
    status: 'optimal' | 'acceptable' | 'suboptimal';
    message: string;
  };

  /** System validation */
  validation: {
    canHandlePeakLoad: boolean;
    inverterHeadroom_pct: number;
    batteryAutonomy_hours: number;
    warnings: string[];
  };

  /** Economic analysis */
  economics: {
    estimatedCost_KES: number;
    monthlyGridSavings_KES: number;
    paybackPeriod_years: number;
    roi25Years_pct: number;
  };

  /** Confidence in the recommendation */
  confidence: 'high' | 'medium' | 'low';

  /** Human-readable summary */
  summary: string;

  /** Detailed reasoning */
  reasoning: string[];
}

/**
 * Auto-size a solar system based on user requirements
 *
 * This is the main decision engine that replaces manual component selection
 */
export function autoSizeSystem(input: SizingWizardInput): SizingRecommendation {
  const reasoning: string[] = [];

  // ========================================================================
  // STEP 1: Calculate Required Solar Capacity
  // ========================================================================

  // Real-world system efficiency accounting for all losses
  const SYSTEM_EFFICIENCY = 0.75; // 75% overall (inverter, temp, soiling, cable, mismatch)

  // Target generation with buffer for variability
  const targetGeneration_kWh = input.dailyConsumption_kWh * input.offsetTarget;
  const generationWithBuffer_kWh = targetGeneration_kWh * 1.10; // 10% buffer for cloudy days

  // Solar capacity formula: Required_kW = Target_kWh / (Peak_Sun_Hours × Efficiency)
  const requiredSolar_kW = generationWithBuffer_kWh / (input.location.peakSunHours * SYSTEM_EFFICIENCY);

  reasoning.push(
    `Target: ${input.offsetTarget * 100}% solar offset for ${input.dailyConsumption_kWh.toFixed(1)} kWh/day consumption`,
    `Peak sun hours: ${input.location.peakSunHours.toFixed(1)} hr/day`,
    `Required solar capacity: ${requiredSolar_kW.toFixed(1)} kW (accounting for 75% system efficiency)`
  );

  // ========================================================================
  // STEP 2: Optimize DC:AC Ratio (Inverter Sizing)
  // ========================================================================

  // Industry best practice: 1.20:1 to 1.30:1 DC:AC ratio
  // - Captures more energy during low-light hours
  // - Clipping occurs only 2-5% of the year
  // - Sweet spot: 1.25:1
  const OPTIMAL_DC_AC_RATIO = 1.25;

  let inverter_kW = requiredSolar_kW / OPTIMAL_DC_AC_RATIO;

  // Round to practical inverter sizes (multiples of 0.5 kW)
  inverter_kW = Math.ceil(inverter_kW * 2) / 2;

  // Recalculate actual solar capacity based on inverter size
  const actualSolar_kW = inverter_kW * OPTIMAL_DC_AC_RATIO;

  // Check against peak load requirement
  const estimatedPeakLoad_kW = input.peakPower_kW || (input.dailyConsumption_kWh / 24) * 2.5;
  const minInverterForPeakLoad_kW = estimatedPeakLoad_kW * 1.25; // 25% safety margin

  if (inverter_kW < minInverterForPeakLoad_kW) {
    inverter_kW = Math.ceil(minInverterForPeakLoad_kW * 2) / 2;
    reasoning.push(
      `Inverter increased to ${inverter_kW} kW to handle peak load of ${estimatedPeakLoad_kW.toFixed(1)} kW with 25% safety margin`
    );
  }

  // Apply physical constraints
  if (input.constraints?.maxInverterKw && inverter_kW > input.constraints.maxInverterKw) {
    inverter_kW = input.constraints.maxInverterKw;
    reasoning.push(`Inverter limited to ${inverter_kW} kW due to electrical panel constraint`);
  }

  const dcAcRatio = actualSolar_kW / inverter_kW;

  reasoning.push(
    `Optimal DC:AC ratio: ${dcAcRatio.toFixed(2)}:1 (industry sweet spot: 1.2-1.3:1)`,
    `Inverter sized: ${inverter_kW} kW, Solar array: ${actualSolar_kW.toFixed(1)} kW`
  );

  // ========================================================================
  // STEP 3: Battery Sizing Based on Goal
  // ========================================================================

  let battery_kWh: number;
  let autonomyDays: number;

  // Average night power (assuming 40% of daily consumption occurs at night)
  const avgNightPower_kW = (input.dailyConsumption_kWh * 0.4) / 12; // 12 hours of night
  const nightConsumption_kWh = avgNightPower_kW * 12;

  switch (input.goal) {
    case 'save-money':
      // Minimize battery - just enough for peak shaving
      autonomyDays = 0.5;
      battery_kWh = Math.max(nightConsumption_kWh * 0.5, 20); // At least 20 kWh
      reasoning.push(
        `Goal: Save money → Minimal battery for peak shaving`,
        `Battery: ${battery_kWh.toFixed(1)} kWh (0.5 days autonomy)`
      );
      break;

    case 'backup-power':
      // 1 full night of autonomy
      autonomyDays = 1.0;
      battery_kWh = nightConsumption_kWh * 1.3; // 30% buffer
      reasoning.push(
        `Goal: Backup power → Full night autonomy`,
        `Battery: ${battery_kWh.toFixed(1)} kWh (1.0 days autonomy)`
      );
      break;

    case 'energy-independence':
      // 1.5 days autonomy
      autonomyDays = 1.5;
      battery_kWh = input.dailyConsumption_kWh * 1.5;
      reasoning.push(
        `Goal: Energy independence → 1.5 days autonomy`,
        `Battery: ${battery_kWh.toFixed(1)} kWh (1.5 days autonomy)`
      );
      break;

    case 'off-grid':
      // 3 days autonomy for true off-grid
      autonomyDays = 3.0;
      battery_kWh = input.dailyConsumption_kWh * 3.0;
      reasoning.push(
        `Goal: Off-grid → 3 days autonomy for weather variability`,
        `Battery: ${battery_kWh.toFixed(1)} kWh (3.0 days autonomy)`
      );
      break;
  }

  // Cap battery at 2× daily consumption for cost-effectiveness (unless off-grid)
  if (input.goal !== 'off-grid' && battery_kWh > input.dailyConsumption_kWh * 2) {
    battery_kWh = input.dailyConsumption_kWh * 2;
    reasoning.push(`Battery capped at 2× daily consumption for cost-effectiveness`);
  }

  // Round to practical battery sizes (multiples of 5 kWh)
  battery_kWh = Math.ceil(battery_kWh / 5) * 5;

  // ========================================================================
  // STEP 4: Optimize Battery C-Rate for Longevity
  // ========================================================================

  // LiFePO4 optimal: 0.5C charge, 1.0C discharge
  const optimalCharge_kW = battery_kWh * 0.5;
  const optimalDischarge_kW = battery_kWh * 1.0;

  // Ensure charge rate doesn't exceed inverter capacity
  const maxCharge_kW = Math.min(optimalCharge_kW, inverter_kW * 0.8); // 80% of inverter
  const maxDischarge_kW = Math.min(optimalDischarge_kW, inverter_kW * 0.9); // 90% of inverter

  reasoning.push(
    `Battery charge/discharge rates optimized for cycle life`,
    `Max charge: ${maxCharge_kW.toFixed(1)} kW (${(maxCharge_kW / battery_kWh).toFixed(2)}C)`,
    `Max discharge: ${maxDischarge_kW.toFixed(1)} kW (${(maxDischarge_kW / battery_kWh).toFixed(2)}C)`
  );

  // ========================================================================
  // STEP 5: Panel Configuration
  // ========================================================================

  // Modern high-efficiency panels: 550W typical
  const PANEL_WATTAGE = 550;
  const panelCount = Math.ceil((actualSolar_kW * 1000) / PANEL_WATTAGE);
  const actualPanelCapacity_kW = (panelCount * PANEL_WATTAGE) / 1000;

  // Check roof area constraint
  const PANEL_AREA_M2 = 2.8; // Typical 550W panel area
  const requiredRoofArea_m2 = panelCount * PANEL_AREA_M2;

  if (input.constraints?.roofArea_sqm && requiredRoofArea_m2 > input.constraints.roofArea_sqm) {
    const maxPanels = Math.floor(input.constraints.roofArea_sqm / PANEL_AREA_M2);
    reasoning.push(
      `⚠️ Roof area constraint: ${input.constraints.roofArea_sqm} m² available, ${requiredRoofArea_m2.toFixed(0)} m² needed`,
      `Reducing to ${maxPanels} panels (${((maxPanels * PANEL_WATTAGE) / 1000).toFixed(1)} kW)`
    );
  }

  reasoning.push(
    `Panel configuration: ${panelCount} × ${PANEL_WATTAGE}W = ${actualPanelCapacity_kW.toFixed(1)} kW`,
    `Required roof area: ~${requiredRoofArea_m2.toFixed(0)} m²`
  );

  // ========================================================================
  // STEP 6: Budget Optimization (if constraint exists)
  // ========================================================================

  if (input.budgetConstraint) {
    // Rough cost estimation (KES)
    const SOLAR_COST_PER_W = 27; // KES/W
    const BATTERY_COST_PER_KWH = 25000; // KES/kWh for LiFePO4
    const INVERTER_COST_PER_KW = 30000; // KES/kW for hybrid
    const INSTALLATION_PCT = 0.20; // 20% installation

    const equipmentCost =
      (actualPanelCapacity_kW * 1000 * SOLAR_COST_PER_W) +
      (battery_kWh * BATTERY_COST_PER_KWH) +
      (inverter_kW * INVERTER_COST_PER_KW);

    const totalCost = equipmentCost * (1 + INSTALLATION_PCT);

    if (totalCost > input.budgetConstraint) {
      reasoning.push(
        `⚠️ Budget constraint: System costs ${(totalCost / 1_000_000).toFixed(2)}M KES, budget is ${(input.budgetConstraint / 1_000_000).toFixed(2)}M KES`,
        `Consider: (1) Smaller battery, (2) Phased installation, or (3) Grid-tie without battery`
      );
    }
  }

  // ========================================================================
  // STEP 7: Build System Configuration
  // ========================================================================

  const config: SystemConfiguration = {
    mode: 'advanced', // User chose specific requirements, so we're in advanced mode
    solar: {
      panelCount,
      panelWattage: PANEL_WATTAGE,
      totalCapacityKw: actualPanelCapacity_kW,
    },
    inverter: {
      capacityKw: inverter_kW,
      phase: 'three', // Assume three-phase for systems > 10 kW
      voltage: 'high',
    },
    battery: {
      capacityKwh: battery_kWh,
      voltage: 'high',
      chemistry: 'lifepo4',
      maxChargeKw: maxCharge_kW,
      maxDischargeKw: maxDischarge_kW,
      minReservePct: 20, // Standard 20% reserve
    },
    loads: [], // Will be populated based on user's actual loads
    performanceRatio: 0.8,
    shadingLossPct: 0,
  };

  // ========================================================================
  // STEP 8: DC:AC Ratio Analysis
  // ========================================================================

  let dcAcStatus: 'optimal' | 'acceptable' | 'suboptimal';
  let dcAcMessage: string;

  if (dcAcRatio >= 1.20 && dcAcRatio <= 1.30) {
    dcAcStatus = 'optimal';
    dcAcMessage = `DC:AC ratio of ${dcAcRatio.toFixed(2)}:1 is optimal. Excellent energy capture with minimal clipping.`;
  } else if (dcAcRatio >= 1.10 && dcAcRatio < 1.20) {
    dcAcStatus = 'acceptable';
    dcAcMessage = `DC:AC ratio of ${dcAcRatio.toFixed(2)}:1 is acceptable but conservative. Consider downsizing inverter for better economics.`;
  } else if (dcAcRatio > 1.30 && dcAcRatio <= 1.40) {
    dcAcStatus = 'acceptable';
    dcAcMessage = `DC:AC ratio of ${dcAcRatio.toFixed(2)}:1 is acceptable but will have ~${((dcAcRatio - 1.25) * 100).toFixed(0)}% additional clipping losses.`;
  } else {
    dcAcStatus = 'suboptimal';
    dcAcMessage = dcAcRatio < 1.10
      ? `DC:AC ratio of ${dcAcRatio.toFixed(2)}:1 is too low. Inverter is oversized - you're losing ~${((1.25 - dcAcRatio) * 15).toFixed(0)}% potential energy capture.`
      : `DC:AC ratio of ${dcAcRatio.toFixed(2)}:1 is too high. Excessive clipping will waste ~${((dcAcRatio - 1.25) * 100).toFixed(0)}% of solar production.`;
  }

  // ========================================================================
  // STEP 9: System Validation
  // ========================================================================

  const validation = validateSystemCapabilities(config, input);

  // ========================================================================
  // STEP 10: Economic Analysis
  // ========================================================================

  const economics = estimateEconomics(config, input);

  // ========================================================================
  // STEP 11: Confidence Assessment
  // ========================================================================

  let confidence: 'high' | 'medium' | 'low' = 'high';

  if (!input.peakPower_kW) {
    confidence = 'medium';
    reasoning.push('ℹ️ Confidence: Medium - peak power was estimated, not measured');
  }

  if (input.dailyConsumption_kWh < 10) {
    confidence = 'low';
    reasoning.push('⚠️ Confidence: Low - daily consumption seems too small, please verify');
  }

  if (validation.warnings.length > 2) {
    confidence = confidence === 'high' ? 'medium' : 'low';
  }

  // ========================================================================
  // STEP 12: Generate Summary
  // ========================================================================

  const summary = `Recommended ${actualPanelCapacity_kW.toFixed(1)} kW solar system with ${battery_kWh} kWh battery and ${inverter_kW} kW inverter. This configuration achieves ${(input.offsetTarget * 100).toFixed(0)}% solar offset, provides ${autonomyDays} days autonomy, and delivers ${(validation.inverterHeadroom_pct).toFixed(0)}% inverter headroom for peak loads. Estimated payback: ${economics.paybackPeriod_years.toFixed(1)} years.`;

  return {
    config,
    dcAcRatio: {
      ratio: dcAcRatio,
      status: dcAcStatus,
      message: dcAcMessage,
    },
    validation,
    economics,
    confidence,
    summary,
    reasoning,
  };
}

/**
 * Validate that the system can handle the user's requirements
 */
function validateSystemCapabilities(
  config: SystemConfiguration,
  input: SizingWizardInput
): {
  canHandlePeakLoad: boolean;
  inverterHeadroom_pct: number;
  batteryAutonomy_hours: number;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Estimate peak load if not provided
  const peakLoad_kW = input.peakPower_kW || (input.dailyConsumption_kWh / 24) * 2.5;

  // Check inverter capacity with surge margin
  const peakWithSurge_kW = peakLoad_kW * 1.25; // 25% surge for motor starts
  const inverterHeadroom_pct = ((config.inverter.capacityKw - peakWithSurge_kW) / config.inverter.capacityKw) * 100;
  const canHandlePeakLoad = inverterHeadroom_pct > 0;

  if (!canHandlePeakLoad) {
    warnings.push(
      `⚠️ CRITICAL: Inverter (${config.inverter.capacityKw} kW) cannot handle peak load (${peakWithSurge_kW.toFixed(1)} kW with surge). Increase to ${Math.ceil(peakWithSurge_kW * 1.2)} kW.`
    );
  } else if (inverterHeadroom_pct < 10) {
    warnings.push(
      `⚠️ WARNING: Tight inverter capacity. Only ${inverterHeadroom_pct.toFixed(0)}% headroom above peak load.`
    );
  }

  // Check battery autonomy
  const avgNightPower_kW = (input.dailyConsumption_kWh * 0.4) / 12;
  const usableBattery_kWh = config.battery.capacityKwh * (1 - config.battery.minReservePct / 100);
  const batteryAutonomy_hours = usableBattery_kWh / avgNightPower_kW;

  if (batteryAutonomy_hours < 8 && input.goal !== 'save-money') {
    warnings.push(
      `⚠️ Battery provides only ${batteryAutonomy_hours.toFixed(1)} hours autonomy. Consider increasing to ${Math.ceil(avgNightPower_kW * 12 / 5) * 5} kWh for full night coverage.`
    );
  }

  // Check battery C-rate
  const chargeRate_C = config.battery.maxChargeKw / config.battery.capacityKwh;
  const dischargeRate_C = config.battery.maxDischargeKw / config.battery.capacityKwh;

  if (chargeRate_C > 1.0) {
    warnings.push(
      `⚠️ Battery charge rate (${chargeRate_C.toFixed(2)}C) exceeds recommended 1C. May reduce lifespan.`
    );
  }

  if (dischargeRate_C > 2.0) {
    warnings.push(
      `⚠️ Battery discharge rate (${dischargeRate_C.toFixed(2)}C) exceeds recommended 2C. May reduce lifespan.`
    );
  }

  // Check critical loads constraint
  if (input.constraints?.criticalLoads_kW && input.constraints.criticalLoads_kW > config.inverter.capacityKw) {
    warnings.push(
      `⚠️ Critical loads (${input.constraints.criticalLoads_kW} kW) exceed inverter capacity. Increase inverter or reduce critical loads.`
    );
  }

  return {
    canHandlePeakLoad,
    inverterHeadroom_pct,
    batteryAutonomy_hours,
    warnings,
  };
}

/**
 * Estimate system economics
 */
function estimateEconomics(
  config: SystemConfiguration,
  input: SizingWizardInput
): {
  estimatedCost_KES: number;
  monthlyGridSavings_KES: number;
  paybackPeriod_years: number;
  roi25Years_pct: number;
} {
  // Component costs (Kenya market 2026)
  const SOLAR_COST_PER_W = 27; // KES/W
  const BATTERY_COST_PER_KWH = 25000; // KES/kWh for LiFePO4
  const INVERTER_COST_PER_KW = 30000; // KES/kW for hybrid
  const INSTALLATION_PCT = 0.20; // 20% installation

  const solarCost = config.solar.totalCapacityKw * 1000 * SOLAR_COST_PER_W;
  const batteryCost = config.battery.capacityKwh * BATTERY_COST_PER_KWH;
  const inverterCost = config.inverter.capacityKw * INVERTER_COST_PER_KW;

  const equipmentCost = solarCost + batteryCost + inverterCost;
  const totalCost = equipmentCost * (1 + INSTALLATION_PCT);

  // Estimate daily solar generation
  const dailySolarGeneration_kWh = config.solar.totalCapacityKw * input.location.peakSunHours * 0.75;

  // Grid savings (assuming average KPLC rate of 18.5 KES/kWh)
  const KPLC_AVG_RATE = 18.5;
  const monthlyGridSavings = Math.min(dailySolarGeneration_kWh, input.dailyConsumption_kWh) * 30 * KPLC_AVG_RATE;

  // Simple payback (without maintenance)
  const annualSavings = monthlyGridSavings * 12;
  const paybackPeriod = totalCost / annualSavings;

  // 25-year ROI (simplified)
  const lifetimeSavings = annualSavings * 25;
  const roi25Years = ((lifetimeSavings - totalCost) / totalCost) * 100;

  return {
    estimatedCost_KES: totalCost,
    monthlyGridSavings_KES: monthlyGridSavings,
    paybackPeriod_years: paybackPeriod,
    roi25Years_pct: roi25Years,
  };
}
