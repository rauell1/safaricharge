import type { DerivedSystemConfig } from '@/types/simulation-core';

export interface BatteryState {
  socPct: number;
  capacityKwh: number;
  cycleCount: number;
  healthPct: number;
  temperatureC: number;
  chargePowerKw: number;
  dischargePowerKw: number;
  thermalDeratingFactor: number;
}

export type BatteryStrategy = 'self-consumption' | 'peak-shaving' | 'backup-resilience';

const INITIAL_SOC_PERCENT = 30;
const BACKUP_RESERVE_PERCENT = 30;

const BATTERY_EFFICIENCY_ALPHA = 1.1;
const BATTERY_EFFICIENCY_K = 0.04;
const BATTERY_EFFICIENCY_ETA0 = 0.97;
const MIN_EFFICIENCY = 0.75;

const CYCLE_FADE_COEFFICIENT = 0.0003;
const CALENDAR_FADE_COEFFICIENT = 0.00002;
const MAX_FADE_FRACTION = 0.2;

const HIGH_TEMP_DERATE_THRESHOLD_C = 35;
const LOW_TEMP_DERATE_THRESHOLD_C = 10;
const HIGH_TEMP_DERATE_PER_DEG = 0.005;
const LOW_TEMP_DERATE_PER_DEG = 0.008;

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

const getPeukertAdjustedEfficiency = (powerKw: number, ratedPowerKw: number): number => {
  const safeRated = Math.max(0.1, ratedPowerKw);
  const cRate = clamp(powerKw / safeRated, 0, 3);
  const efficiency = BATTERY_EFFICIENCY_ETA0 - BATTERY_EFFICIENCY_K * Math.pow(cRate, BATTERY_EFFICIENCY_ALPHA);
  return clamp(efficiency, MIN_EFFICIENCY, 0.99);
};

const getFadeFromCyclesAndAge = (cycles: number, ageDays: number): number => {
  const cycleTerm = CYCLE_FADE_COEFFICIENT * Math.sqrt(Math.max(0, cycles));
  const ageTerm = CALENDAR_FADE_COEFFICIENT * Math.max(0, ageDays);
  return Math.min(MAX_FADE_FRACTION, cycleTerm + ageTerm);
};

const inferAgeDaysFromHealth = (healthPct: number, cycles: number): number => {
  const fade = clamp(1 - healthPct / 100, 0, MAX_FADE_FRACTION);
  const cycleTerm = CYCLE_FADE_COEFFICIENT * Math.sqrt(Math.max(0, cycles));
  if (fade <= cycleTerm) return 0;
  return (fade - cycleTerm) / CALENDAR_FADE_COEFFICIENT;
};

const getReservePercent = (strategy: BatteryStrategy): number => {
  if (strategy === 'backup-resilience') return BACKUP_RESERVE_PERCENT;
  return 0;
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

  const reserveEnergyKwh = currentUsableCapacityKwh * (getReservePercent(strategy) / 100);
  const maxChargePowerKw = ratedChargeKw * thermalDeratingFactor;
  const maxDischargePowerKw = ratedDischargeKw * thermalDeratingFactor;

  const positiveSurplusKw = safePositive(solarSurplusKw);
  const positiveDeficitKw = safePositive(deficitKw);

  let chargePowerKw = 0;
  let dischargePowerKw = 0;

  if (positiveSurplusKw > positiveDeficitKw) {
    const requestedChargeKw = Math.min(maxChargePowerKw, positiveSurplusKw);
    const chargeEfficiency = getPeukertAdjustedEfficiency(requestedChargeKw, ratedPowerKw);
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
      const dischargeEfficiency = getPeukertAdjustedEfficiency(requestedDischargeKw, ratedPowerKw);
      const availableDischargeEnergyKwh = Math.max(0, storedEnergyKwh - reserveEnergyKwh);
      const maxDeliverableKw = (availableDischargeEnergyKwh * dischargeEfficiency) / stepHours;
      const cappedDischargeKw = Math.min(requestedDischargeKw, maxDeliverableKw);
      dischargePowerKw = Math.max(0, cappedDischargeKw);
    }
  }

  const chargeEfficiency = getPeukertAdjustedEfficiency(Math.max(chargePowerKw, 0.001), ratedPowerKw);
  const dischargeEfficiency = getPeukertAdjustedEfficiency(Math.max(dischargePowerKw, 0.001), ratedPowerKw);
  const chargedEnergyKwh = chargePowerKw * stepHours * chargeEfficiency;
  const dischargedEnergyKwh = dischargePowerKw * stepHours / dischargeEfficiency;

  storedEnergyKwh = clamp(storedEnergyKwh + chargedEnergyKwh - dischargedEnergyKwh, 0, currentUsableCapacityKwh);

  const throughputKwh = chargedEnergyKwh + dischargedEnergyKwh;
  const cycleIncrement = throughputKwh / (2 * nominalCapacityKwh);
  const cycleCount = Math.max(0, prev.cycleCount + cycleIncrement);

  const previousAgeDays = inferAgeDaysFromHealth(prev.healthPct, prev.cycleCount);
  const ageDays = previousAgeDays + stepHours / 24;
  const fade = getFadeFromCyclesAndAge(cycleCount, ageDays);
  const healthPct = (1 - fade) * 100;

  const updatedUsableCapacityKwh = nominalCapacityKwh * (healthPct / 100) * thermalDeratingFactor;
  storedEnergyKwh = Math.min(storedEnergyKwh, updatedUsableCapacityKwh);
  const socPct = updatedUsableCapacityKwh > 0 ? (storedEnergyKwh / updatedUsableCapacityKwh) * 100 : 0;

  return {
    socPct: clamp(socPct, 0, 100),
    capacityKwh: updatedUsableCapacityKwh,
    cycleCount,
    healthPct,
    temperatureC,
    chargePowerKw,
    dischargePowerKw,
    thermalDeratingFactor,
  };
}
