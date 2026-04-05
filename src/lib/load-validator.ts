/**
 * SafariCharge Load Validation System
 *
 * Validates that the configured system can actually handle the user's loads.
 * This is critical engineering logic that prevents under-sizing mistakes.
 *
 * Key checks:
 * 1. Can inverter supply peak simultaneous load?
 * 2. Can battery cover nighttime consumption?
 * 3. Are there any safety margin violations?
 */

import type { SystemConfiguration, LoadConfig } from './system-config';

export interface LoadValidationResult {
  /** Overall system status */
  status: 'adequate' | 'marginal' | 'insufficient';

  /** Can system handle peak simultaneous load? */
  canHandlePeakLoad: boolean;

  /** Peak simultaneous load in kW */
  peakSimultaneousLoad_kW: number;

  /** Peak load with surge margin (25%) */
  peakWithSurge_kW: number;

  /** Inverter capacity headroom percentage */
  inverterHeadroom_pct: number;

  /** Night energy demand in kWh */
  nightEnergyDemand_kWh: number;

  /** Usable battery capacity in kWh */
  usableBatteryCapacity_kWh: number;

  /** Battery can cover full night? */
  batteryCoversNight: boolean;

  /** Battery autonomy in hours */
  batteryAutonomy_hours: number;

  /** Critical warnings that must be addressed */
  criticalWarnings: string[];

  /** Advisory warnings */
  warnings: string[];

  /** Recommendations for improvement */
  recommendations: string[];

  /** Hourly load breakdown */
  hourlyLoadBreakdown: {
    hour: number;
    homeLoad_kW: number;
    evLoad_kW: number;
    commercialLoad_kW: number;
    hvacLoad_kW: number;
    total_kW: number;
  }[];
}

/**
 * Validate system configuration against configured loads
 */
export function validateSystemForLoads(config: SystemConfiguration): LoadValidationResult {
  const criticalWarnings: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // ========================================================================
  // STEP 1: Calculate Peak Simultaneous Load
  // ========================================================================

  const hourlyLoadBreakdown = calculateHourlyLoadProfile(config.loads);
  const peakSimultaneousLoad_kW = Math.max(...hourlyLoadBreakdown.map(h => h.total_kW));

  // Add 25% surge margin for motor loads (AC, pumps, compressors)
  const SURGE_MARGIN = 1.25;
  const peakWithSurge_kW = peakSimultaneousLoad_kW * SURGE_MARGIN;

  // ========================================================================
  // STEP 2: Check Inverter Capacity
  // ========================================================================

  const inverterHeadroom_pct = ((config.inverter.capacityKw - peakWithSurge_kW) / config.inverter.capacityKw) * 100;
  const canHandlePeakLoad = inverterHeadroom_pct >= 0;

  if (!canHandlePeakLoad) {
    criticalWarnings.push(
      `🚨 CRITICAL: Inverter capacity (${config.inverter.capacityKw} kW) cannot handle peak load (${peakWithSurge_kW.toFixed(1)} kW with 25% surge margin). System will trip or fail to start motors.`
    );
    recommendations.push(
      `Increase inverter to minimum ${Math.ceil(peakWithSurge_kW * 1.2)} kW for safe operation`
    );
  } else if (inverterHeadroom_pct < 10) {
    warnings.push(
      `⚠️ Tight inverter capacity: Only ${inverterHeadroom_pct.toFixed(1)}% headroom above peak load (${peakWithSurge_kW.toFixed(1)} kW). Risk of overload during simultaneous high loads.`
    );
    recommendations.push(
      `Consider ${Math.ceil(peakWithSurge_kW * 1.20)} kW inverter for 20% safety margin`
    );
  } else if (inverterHeadroom_pct > 50) {
    warnings.push(
      `ℹ️ Inverter is oversized: ${inverterHeadroom_pct.toFixed(0)}% headroom. You may be overpaying for capacity you don't need.`
    );
    recommendations.push(
      `Consider downsizing to ${Math.ceil(peakWithSurge_kW * 1.25 / 0.5) * 0.5} kW inverter to save costs`
    );
  }

  // ========================================================================
  // STEP 3: Calculate Night Energy Demand
  // ========================================================================

  const nightEnergyDemand_kWh = calculateNightEnergyDemand(hourlyLoadBreakdown);

  // Usable battery capacity (accounting for reserve)
  const usableBatteryCapacity_kWh = config.battery.capacityKwh * (1 - config.battery.minReservePct / 100);

  const batteryCoversNight = usableBatteryCapacity_kWh >= nightEnergyDemand_kWh;

  // Calculate autonomy hours
  const avgNightLoad_kW = nightEnergyDemand_kWh / 12; // 12 hours of night
  const batteryAutonomy_hours = avgNightLoad_kW > 0 ? usableBatteryCapacity_kWh / avgNightLoad_kW : 999;

  if (!batteryCoversNight && config.loads.length > 0) {
    warnings.push(
      `⚠️ Battery capacity (${usableBatteryCapacity_kWh.toFixed(1)} kWh usable) may not cover full night demand (${nightEnergyDemand_kWh.toFixed(1)} kWh). Expect grid import during nights.`
    );
    recommendations.push(
      `Increase battery to ${Math.ceil(nightEnergyDemand_kWh * 1.3 / 10) * 10} kWh for full night autonomy`
    );
  } else if (batteryAutonomy_hours < 8 && config.loads.length > 0) {
    warnings.push(
      `⚠️ Battery provides only ${batteryAutonomy_hours.toFixed(1)} hours autonomy at average night load.`
    );
  }

  // ========================================================================
  // STEP 4: Check Battery C-Rate
  // ========================================================================

  const chargeRate_C = config.battery.maxChargeKw / config.battery.capacityKwh;
  const dischargeRate_C = config.battery.maxDischargeKw / config.battery.capacityKwh;

  if (chargeRate_C > 1.0) {
    warnings.push(
      `⚠️ Battery charge rate (${chargeRate_C.toFixed(2)}C = ${config.battery.maxChargeKw} kW / ${config.battery.capacityKwh} kWh) exceeds recommended 1C. May reduce battery lifespan by 20-30%.`
    );
    recommendations.push(
      `Reduce max charge rate to ${config.battery.capacityKwh.toFixed(1)} kW (1C) or increase battery capacity`
    );
  }

  if (dischargeRate_C > 2.0) {
    warnings.push(
      `⚠️ Battery discharge rate (${dischargeRate_C.toFixed(2)}C = ${config.battery.maxDischargeKw} kW / ${config.battery.capacityKwh} kWh) exceeds recommended 2C. May reduce battery lifespan.`
    );
    recommendations.push(
      `Reduce max discharge rate to ${(config.battery.capacityKwh * 2).toFixed(1)} kW (2C) or increase battery capacity`
    );
  }

  // ========================================================================
  // STEP 5: Check EV Charger Rates
  // ========================================================================

  config.loads.forEach(load => {
    if (load.type === 'ev' && load.enabled) {
      if (load.onboardChargerKw > config.inverter.capacityKw) {
        criticalWarnings.push(
          `🚨 ${load.name}: Charger rate (${load.onboardChargerKw} kW) exceeds inverter capacity (${config.inverter.capacityKw} kW). EV will charge slower than specified.`
        );
      } else if (load.onboardChargerKw > config.inverter.capacityKw * 0.7) {
        warnings.push(
          `⚠️ ${load.name}: Charger uses ${((load.onboardChargerKw / config.inverter.capacityKw) * 100).toFixed(0)}% of inverter capacity. Little headroom for other loads during charging.`
        );
      }

      // Check if battery can charge EV
      const evChargeDuration_hours = load.batteryKwh / load.onboardChargerKw;
      const evChargeEnergy_kWh = load.batteryKwh * 0.5; // Assume 50% charge needed daily

      if (evChargeEnergy_kWh > usableBatteryCapacity_kWh) {
        warnings.push(
          `⚠️ ${load.name}: Requires ${evChargeEnergy_kWh.toFixed(1)} kWh to charge, but battery only has ${usableBatteryCapacity_kWh.toFixed(1)} kWh usable. Will rely on grid.`
        );
      }
    }
  });

  // ========================================================================
  // STEP 6: Check Commercial/Industrial Load Compatibility
  // ========================================================================

  config.loads.forEach(load => {
    if (load.type === 'commercial' && load.enabled) {
      const maxCommercialLoad = Math.max(...load.schedule.map(s => s.powerKw), load.constantKw);
      if (maxCommercialLoad > config.inverter.capacityKw * 0.5) {
        warnings.push(
          `⚠️ ${load.name}: Peak ${maxCommercialLoad} kW uses ${((maxCommercialLoad / config.inverter.capacityKw) * 100).toFixed(0)}% of inverter. Consider larger inverter for commercial operations.`
        );
      }
    }

    if (load.type === 'hvac' && load.enabled) {
      // HVAC has high startup surge (3-5x running current)
      const hvacSurge_kW = load.capacityKw * 4; // 4x surge
      if (hvacSurge_kW > config.inverter.capacityKw) {
        criticalWarnings.push(
          `🚨 ${load.name}: Startup surge (${hvacSurge_kW.toFixed(1)} kW) exceeds inverter capacity. HVAC may fail to start.`
        );
        recommendations.push(
          `Use soft-start kit for HVAC or increase inverter to ${Math.ceil(hvacSurge_kW * 1.2)} kW`
        );
      }
    }
  });

  // ========================================================================
  // STEP 7: Overall Status Assessment
  // ========================================================================

  let status: LoadValidationResult['status'];

  if (criticalWarnings.length > 0) {
    status = 'insufficient';
  } else if (warnings.length > 2 || inverterHeadroom_pct < 10) {
    status = 'marginal';
  } else {
    status = 'adequate';
  }

  return {
    status,
    canHandlePeakLoad,
    peakSimultaneousLoad_kW,
    peakWithSurge_kW,
    inverterHeadroom_pct,
    nightEnergyDemand_kWh,
    usableBatteryCapacity_kWh,
    batteryCoversNight,
    batteryAutonomy_hours,
    criticalWarnings,
    warnings,
    recommendations,
    hourlyLoadBreakdown,
  };
}

/**
 * Calculate hourly load profile from all enabled loads
 */
function calculateHourlyLoadProfile(loads: LoadConfig[]): LoadValidationResult['hourlyLoadBreakdown'] {
  const hourlyBreakdown: LoadValidationResult['hourlyLoadBreakdown'] = [];

  for (let hour = 0; hour < 24; hour++) {
    let homeLoad_kW = 0;
    let evLoad_kW = 0;
    let commercialLoad_kW = 0;
    let hvacLoad_kW = 0;

    loads.forEach(load => {
      if (!load.enabled) return;

      switch (load.type) {
        case 'home':
          homeLoad_kW += load.hourlyProfile[hour] || 0;
          if (load.includeHVAC) {
            hvacLoad_kW += load.hvacBaseKw || 0;
          }
          break;

        case 'ev':
          // Assume EV charges between return time and depart time
          const isCharging = hour >= load.returnTime && hour < 24 || hour < load.departTime;
          if (isCharging) {
            evLoad_kW += load.onboardChargerKw;
          }
          break;

        case 'commercial':
          // Check if hour falls within any schedule window
          const activeSchedule = load.schedule.find(s => hour >= s.start && hour < s.end);
          if (activeSchedule) {
            commercialLoad_kW += activeSchedule.powerKw;
          } else {
            commercialLoad_kW += load.constantKw;
          }
          break;

        case 'hvac':
          if (hour >= load.operatingHours.start && hour < load.operatingHours.end) {
            // Assume average weather multiplier of 1.0
            hvacLoad_kW += load.capacityKw;
          }
          break;

        case 'custom':
          if (load.mode === 'constant') {
            homeLoad_kW += load.constantKw || 0;
          } else if (load.mode === 'profile' && load.hourlyProfile) {
            homeLoad_kW += load.hourlyProfile[hour] || 0;
          }
          break;
      }
    });

    hourlyBreakdown.push({
      hour,
      homeLoad_kW,
      evLoad_kW,
      commercialLoad_kW,
      hvacLoad_kW,
      total_kW: homeLoad_kW + evLoad_kW + commercialLoad_kW + hvacLoad_kW,
    });
  }

  return hourlyBreakdown;
}

/**
 * Calculate total energy demand during night hours (6 PM - 6 AM)
 */
function calculateNightEnergyDemand(hourlyBreakdown: LoadValidationResult['hourlyLoadBreakdown']): number {
  // Night hours: 18:00 to 06:00 (12 hours)
  const nightHours = hourlyBreakdown.filter(h => h.hour >= 18 || h.hour < 6);
  return nightHours.reduce((sum, h) => sum + h.total_kW, 0); // kWh (1 hour × kW = kWh)
}

/**
 * Get quick validation status badge
 */
export function getValidationBadge(status: LoadValidationResult['status']): {
  text: string;
  color: 'green' | 'yellow' | 'red';
  emoji: string;
} {
  switch (status) {
    case 'adequate':
      return { text: 'System Adequate', color: 'green', emoji: '✓' };
    case 'marginal':
      return { text: 'Marginal Capacity', color: 'yellow', emoji: '⚠' };
    case 'insufficient':
      return { text: 'Insufficient Capacity', color: 'red', emoji: '✗' };
  }
}
