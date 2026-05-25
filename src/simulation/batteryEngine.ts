import type { DerivedSystemConfig } from '@/types/simulation-core';
import {
  BATTERY_PEUKERT_ALPHA,
  BATTERY_PEUKERT_K,
  BATTERY_PEUKERT_ETA0,
  BATTERY_CALENDAR_FADE_PER_DAY,
} from '@/lib/config';

export interface BatteryState {
  socPct: number;
  capacityKwh: number;
  cycleCount: number;
  healthPct: number;
  temperatureC: number;
  chargePowerKw: number;
  dischargePowerKw: number;
  thermalDeratingFactor: number;
  chargeAcceptancePct: number;
  turningPoints?: number[]; // Rolling turning point buffer for rainflow-counting
  marginalLcos: number;      // Dynamic marginal Levelized Cost of Storage (KES/kWh)
}

export type BatteryStrategy = 'self-consumption' | 'peak-shaving' | 'backup-resilience';

const INITIAL_SOC_PERCENT = 30;
const BACKUP_RESERVE_PERCENT = 30;

const MIN_EFFICIENCY = 0.75;
const MAX_FADE_FRACTION = 0.25; // Retain up to 75% capacity end-of-life limit

const HIGH_TEMP_DERATE_THRESHOLD_C = 35;
const LOW_TEMP_DERATE_THRESHOLD_C = 10;
const HIGH_TEMP_DERATE_PER_DEG = 0.005;
const LOW_TEMP_DERATE_PER_DEG = 0.008;

const BATTERY_REPLACEMENT_COST_KES_PER_KWH = 25000;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const safePositive = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);

const getThermalDeratingFactor = (temperatureC: number): number => {
  if (temperatureC > HIGH_TEMP_DERATE_THRESHOLD_C) {
    return Math.max(0, 1 - (temperatureC - HIGH_TEMP_DERATE_THRESHOLD_C) * HIGH_TEMP_DERATE_PER_DEG);
  }
  if (temperatureC < LOW_TEMP_DERATE_THRESHOLD_C) {
    return Math.max(0, 1 - (LOW_TEMP_DERATE_THRESHOLD_C - temperatureC) * LOW_TEMP_DERATE_PER_DEG);
  }
  return 1;
};

/**
 * Peukert adjusted round-trip efficiency.
 */
export const getPeukertAdjustedEfficiency = (cRate: number): number => {
  const clampedCRate = clamp(cRate, 0, 3);
  const efficiency = BATTERY_PEUKERT_ETA0 - BATTERY_PEUKERT_K * Math.pow(clampedCRate, BATTERY_PEUKERT_ALPHA);
  return clamp(efficiency, MIN_EFFICIENCY, 0.99);
};

const getPeukertAdjustedEfficiencyInternal = (powerKw: number, ratedPowerKw: number): number => {
  const safeRated = Math.max(0.1, ratedPowerKw);
  const cRate = clamp(powerKw / safeRated, 0, 3);
  return getPeukertAdjustedEfficiency(cRate);
};

const getReservePercent = (strategy: BatteryStrategy, config: DerivedSystemConfig): number => {
  if (strategy === 'backup-resilience') return BACKUP_RESERVE_PERCENT;
  return (config as any).minReservePct ?? 20; // default cell protection limit in SafariCharge
};

export function initBatteryState(config: DerivedSystemConfig): BatteryState {
  return {
    socPct: INITIAL_SOC_PERCENT,
    capacityKwh: safePositive(config.batteryKwh),
    cycleCount: 0,
    healthPct: 100,
    temperatureC: 25,
    chargePowerKw: 0,
    dischargePowerKw: 0,
    thermalDeratingFactor: 1,
    chargeAcceptancePct: 100,
    turningPoints: [INITIAL_SOC_PERCENT],
    marginalLcos: 9.2, // standard nominal storage LCOS
  };
}

export function stepBattery(
  prev: BatteryState,
  solarSurplusKw: number,
  deficitKw: number,
  strategy: BatteryStrategy,
  config: DerivedSystemConfig,
  ambientTempC: number,
  isPeakTime: boolean,
  dtHours: number
): BatteryState {
  const stepHours = Math.max(dtHours, 1 / 3600);
  const nominalCapacityKwh = Math.max(0.1, safePositive(config.batteryKwh));
  const ratedChargeKw = Math.max(0.1, safePositive(config.maxChargeKw));
  const ratedDischargeKw = Math.max(0.1, safePositive(config.maxDischargeKw));
  const ratedPowerKw = Math.max(ratedChargeKw, ratedDischargeKw);

  const temperatureC = Number.isFinite(ambientTempC) ? ambientTempC : prev.temperatureC;
  const thermalDeratingFactor = getThermalDeratingFactor(temperatureC);

  const previousUsableCapacityKwh = nominalCapacityKwh * clamp(prev.healthPct / 100, 0, 1) * clamp(prev.thermalDeratingFactor, 0, 1);
  const currentUsableCapacityKwh = nominalCapacityKwh * clamp(prev.healthPct / 100, 0, 1) * thermalDeratingFactor;

  let storedEnergyKwh = clamp(prev.socPct / 100, 0, 1) * Math.max(previousUsableCapacityKwh, 0.0001);
  storedEnergyKwh = Math.min(storedEnergyKwh, currentUsableCapacityKwh);

  const reserveEnergyKwh = currentUsableCapacityKwh * (getReservePercent(strategy, config) / 100);
  
  // Real batteries switch from constant-current (CC) to constant-voltage (CV) at ~80% SoC.
  const chargeAcceptanceFactor = prev.socPct < 80
    ? 1.0
    : Math.max(0, 1.0 - (prev.socPct - 80) / 20);
  const chargeAcceptancePct = Math.round(chargeAcceptanceFactor * 100);

  const maxChargePowerKw = ratedChargeKw * thermalDeratingFactor * chargeAcceptanceFactor;
  const maxDischargePowerKw = ratedDischargeKw * thermalDeratingFactor;

  const positiveSurplusKw = safePositive(solarSurplusKw);
  const positiveDeficitKw = safePositive(deficitKw);

  let chargePowerKw = 0;
  let dischargePowerKw = 0;

  if (positiveSurplusKw > positiveDeficitKw) {
    const requestedChargeKw = Math.min(maxChargePowerKw, positiveSurplusKw);
    const chargeEfficiency = getPeukertAdjustedEfficiencyInternal(requestedChargeKw, ratedPowerKw);
    const availableStorageHeadroomKwh = Math.max(0, currentUsableCapacityKwh - storedEnergyKwh);
    const cappedChargeKw = Math.min(requestedChargeKw, availableStorageHeadroomKwh / (stepHours * chargeEfficiency));
    chargePowerKw = Math.max(0, cappedChargeKw);
  } else if (positiveDeficitKw > 0) {
    const shouldDischarge =
      strategy === 'self-consumption' ||
      strategy === 'backup-resilience' ||
      (strategy === 'peak-shaving' && isPeakTime);

    if (shouldDischarge) {
      const requestedDischargeKw = Math.min(maxDischargePowerKw, positiveDeficitKw);
      const dischargeEfficiency = getPeukertAdjustedEfficiencyInternal(requestedDischargeKw, ratedPowerKw);
      const availableDischargeEnergyKwh = Math.max(0, storedEnergyKwh - reserveEnergyKwh);
      const maxDeliverableKw = (availableDischargeEnergyKwh * dischargeEfficiency) / stepHours;
      const cappedDischargeKw = Math.min(requestedDischargeKw, maxDeliverableKw);
      dischargePowerKw = Math.max(0, cappedDischargeKw);
    }
  }

  const chargeEfficiency = getPeukertAdjustedEfficiencyInternal(Math.max(chargePowerKw, 0.001), ratedPowerKw);
  const dischargeEfficiency = getPeukertAdjustedEfficiencyInternal(Math.max(dischargePowerKw, 0.001), ratedPowerKw);
  const chargedEnergyKwh = chargePowerKw * stepHours * chargeEfficiency;
  const dischargedEnergyKwh = (dischargePowerKw * stepHours) / dischargeEfficiency;

  storedEnergyKwh = clamp(storedEnergyKwh + chargedEnergyKwh - dischargedEnergyKwh, 0, currentUsableCapacityKwh);
  const updatedUsableCapacityKwh = nominalCapacityKwh * (prev.healthPct / 100) * thermalDeratingFactor;
  const socPct = updatedUsableCapacityKwh > 0 ? (storedEnergyKwh / updatedUsableCapacityKwh) * 100 : 0;
  const clampedSoc = clamp(socPct, 0, 100);

  // ------------------------------------------------------------------
  // ASTM E1049-85 Compliant Continuous Rainflow Cycle fatigue analysis
  // ------------------------------------------------------------------
  const pts = prev.turningPoints ? [...prev.turningPoints] : [prev.socPct];
  if (pts.length < 2) {
    if (Math.abs(clampedSoc - pts[0]) > 0.01) {
      pts.push(clampedSoc);
    }
  } else {
    const s0 = pts[pts.length - 2];
    const s1 = pts[pts.length - 1];
    const prevDir = s1 - s0;
    const curDir = clampedSoc - s1;
    if (prevDir * curDir < -1e-4) {
      // Reversal detected! s1 is a true turning point.
      pts.push(clampedSoc);
    } else {
      // Continue in same direction, stretch last point to current soc
      pts[pts.length - 1] = clampedSoc;
    }
  }

  let cycleDegradationAccumulator = 0;
  let i = 0;
  while (pts.length >= 3 && i < pts.length - 2) {
    const s0 = pts[i];
    const s1 = pts[i + 1];
    const s2 = pts[i + 2];
    const r0 = Math.abs(s1 - s0);
    const r1 = Math.abs(s2 - s1);
    
    if (r0 <= r1) {
      // Cycle identified of range r0 (Depth of Discharge = r0 / 100)
      const dod = r0 / 100;
      if (dod > 0.01) {
        // Jinko/LFP power-law cycle life curve: N_cycles = 4200 * DoD^(-1.66)
        const cycleLife = 4200 * Math.pow(dod, -1.66);
        const degradation = 1.0 / cycleLife;
        cycleDegradationAccumulator += degradation;
      }
      // Remove s0 and s1 turning points from rolling buffer
      pts.splice(i, 2);
      // Restart cycle check
      i = 0;
    } else {
      i++;
    }
  }

  // Calculate calendar fade (fraction per step)
  const calendarFade = BATTERY_CALENDAR_FADE_PER_DAY * (stepHours / 24);
  const totalFadeFraction = cycleDegradationAccumulator + calendarFade;

  // Update battery health percentage with an 80% minimum floor (MAX_FADE_FRACTION = 0.20)
  const currentFade = 1.0 - prev.healthPct / 100;
  const nextFade = clamp(currentFade + totalFadeFraction, 0, 0.20);
  const healthPct = (1.0 - nextFade) * 100;

  // Throughput and simple cycle count increment (legacy sync)
  const throughputKwh = chargedEnergyKwh + dischargedEnergyKwh;
  const cycleIncrement = throughputKwh / (2 * nominalCapacityKwh);
  const cycleCount = Math.max(0, prev.cycleCount + cycleIncrement);

  // Compute live marginal Levelized Cost of Storage (LCOS)
  let marginalLcos = prev.marginalLcos;
  if (dischargedEnergyKwh > 0.001) {
    const replacementCostKes = nominalCapacityKwh * BATTERY_REPLACEMENT_COST_KES_PER_KWH;
    const degradationCostKes = cycleDegradationAccumulator * replacementCostKes;
    marginalLcos = degradationCostKes / dischargedEnergyKwh;
  }
  // Clamp to realistic bounds (e.g. 5 to 50 KES/kWh)
  marginalLcos = clamp(marginalLcos, 5.0, 50.0);

  return {
    socPct: clampedSoc,
    capacityKwh: updatedUsableCapacityKwh,
    cycleCount,
    healthPct,
    temperatureC,
    chargePowerKw,
    dischargePowerKw,
    thermalDeratingFactor,
    chargeAcceptancePct,
    turningPoints: pts,
    marginalLcos,
  };
}
