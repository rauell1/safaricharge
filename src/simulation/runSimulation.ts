import type { DerivedSystemConfig } from '@/types/simulation-core';
import type { DayScenario } from './timeEngine';
import { simulateSolar } from './solarEngine';

export interface EVSpecs {
  ev1: { drainRate: number; cap: number; onboard: number };
  ev2: { drainRate: number; cap: number; onboard: number };
}

export interface SolarSimulationResult {
  solar: number;
  load: number;
  houseLoad: number;
  ev1Kw: number;
  ev2Kw: number;
  ev1IsHome: boolean;
  ev2IsHome: boolean;
  ev1V2g?: boolean;
  ev2V2g?: boolean;
  batPower: number;
  batDischargeKw: number;
  batKwh: number;
  ev1Soc: number;
  ev2Soc: number;
  gridImport: number;
  gridExport: number;
}

const getInverterEfficiency = (loadFraction: number): number => {
  if (loadFraction <= 0.05) return 0.82;
  if (loadFraction <= 0.20) return 0.93;
  if (loadFraction <= 0.60) return 0.97;
  if (loadFraction <= 0.90) return 0.96;
  return 0.94;
};

const getBatteryEfficiency = (rateFraction: number): number => {
  return Math.max(0.85, 0.95 - 0.10 * Math.min(1.0, rateFraction));
};

const gaussianRandom = (mean: number, std: number): number => {
  const u1 = Math.max(1e-10, Math.random());
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
};

const getEVTaperedRate = (soc: number, maxRate: number): number => {
  if (soc >= 100) return 0;
  if (soc >= 80) return maxRate * (100 - soc) / 20;
  return maxRate;
};

export const runSolarSimulation = (
  t: number,
  prevBatKwh: number,
  prevEv1Soc: number,
  prevEv2Soc: number,
  scenario: DayScenario,
  evSpecs: EVSpecs,
  systemConfig: DerivedSystemConfig,
  cloudNoise: number,
  batteryHealth: number,
  actualTimeStep: number,
  priorityMode: string,
  isPeakTime: boolean
): SolarSimulationResult => {
  const timeStep = actualTimeStep;
  const soiling = scenario.soilingFactor ?? 1.0;

  const solar = simulateSolar(t, scenario, systemConfig, cloudNoise);

  // Constrain solar power to inverter capacity
  // The inverter is the bottleneck - can't convert more DC power than its rating
  const solarConstrainedByInverter = Math.min(solar, systemConfig.inverterKw);

  const hIdx = Math.floor(t);

  // Calculate home load based on profile and configuration
  let houseLoad = 0;
  if (systemConfig.homeLoadEnabled) {
    const profileLoad = scenario.houseLoadProfile[hIdx % 24] * Math.max(0.5, 1 + gaussianRandom(0, 0.08));
    // Scale the profile load to match the configured homeLoadKw
    const profileAvg = scenario.houseLoadProfile.reduce((a, b) => a + b, 0) / scenario.houseLoadProfile.length;
    houseLoad = (profileLoad / profileAvg) * systemConfig.homeLoadKw;
  }

  // Add commercial load if enabled (constant throughout the day)
  if (systemConfig.commercialLoadEnabled) {
    houseLoad += systemConfig.commercialLoadKw * Math.max(0.9, 1 + gaussianRandom(0, 0.05));
  }

  const effectiveCapacity = systemConfig.batteryKwh * batteryHealth;
  const effectiveReserve = Math.max(systemConfig.batteryKwh * 0.15, 8) * batteryHealth;

  let ev1Load = 0;
  let ev2Load = 0;
  let ev1IsHome = true;
  let ev2IsHome = true;

  if ((t > scenario.ev1.depart && t < scenario.ev1.return) ||
      (scenario.ev1.emergency && t > scenario.ev1.emergency.start && t < scenario.ev1.emergency.end)) {
    ev1IsHome = false;
    prevEv1Soc = Math.max(5, prevEv1Soc - (evSpecs.ev1.drainRate * (systemConfig.evCommuterScale ?? 1) * timeStep / evSpecs.ev1.cap * 100));
  } else if (prevEv1Soc < 100) {
    const taperedRate = getEVTaperedRate(
      prevEv1Soc,
      Math.min(systemConfig.evChargerKw, evSpecs.ev1.onboard) * (systemConfig.evCommuterScale ?? 1)
    );
    const needed = (100 - prevEv1Soc) / 100 * evSpecs.ev1.cap;
    ev1Load = Math.min(taperedRate, needed / timeStep) * (systemConfig.evCommuterScale ?? 1);
  }

  if ((t > scenario.ev2.depart && t < scenario.ev2.lunchStart) ||
      (t > scenario.ev2.lunchEnd && t < scenario.ev2.return)) {
    ev2IsHome = false;
    prevEv2Soc = Math.max(5, prevEv2Soc - (evSpecs.ev2.drainRate * (systemConfig.evFleetScale ?? 1) * timeStep / evSpecs.ev2.cap * 100));
  } else if (prevEv2Soc < 100) {
    const taperedRate = getEVTaperedRate(
      prevEv2Soc,
      Math.min(systemConfig.evChargerKw, evSpecs.ev2.onboard) * (systemConfig.evFleetScale ?? 1)
    );
    const needed = (100 - prevEv2Soc) / 100 * evSpecs.ev2.cap;
    ev2Load = Math.min(taperedRate, needed / timeStep) * (systemConfig.evFleetScale ?? 1);
  }

  let totalLoad = houseLoad + ev1Load + ev2Load;
  if (totalLoad > systemConfig.inverterKw) {
    const available = Math.max(0, systemConfig.inverterKw - houseLoad);
    if (ev1Load + ev2Load > 0) {
      const factor = available / (ev1Load + ev2Load);
      ev1Load *= factor;
      ev2Load *= factor;
      totalLoad = systemConfig.inverterKw;
    }
  }

  const inverterEff = getInverterEfficiency(totalLoad / systemConfig.inverterKw);
  const effectiveSolar = solarConstrainedByInverter * inverterEff;

  if (ev1Load > 0) prevEv1Soc = Math.min(100, prevEv1Soc + (ev1Load * timeStep / evSpecs.ev1.cap * 100));
  if (ev2Load > 0) prevEv2Soc = Math.min(100, prevEv2Soc + (ev2Load * timeStep / evSpecs.ev2.cap * 100));

  let batCharge = 0;
  let batDischarge = 0;
  let gridImport = 0;
  let gridExport = 0;
  let newBatKwh = prevBatKwh;

  let v2gKw = 0;
  let ev1V2g = false;
  let ev2V2g = false;
  if (isPeakTime) {
    const batSocPct = (newBatKwh / effectiveCapacity) * 100;
    if (ev1IsHome && prevEv1Soc > 50 && batSocPct < 30) {
      const rate = Math.min(5, evSpecs.ev1.onboard);
      v2gKw += rate;
      ev1V2g = true;
      prevEv1Soc = Math.max(20, prevEv1Soc - (rate * timeStep / evSpecs.ev1.cap * 100));
    }
    if (ev2IsHome && prevEv2Soc > 50 && batSocPct < 30) {
      const rate = Math.min(5, evSpecs.ev2.onboard);
      v2gKw += rate;
      ev2V2g = true;
      prevEv2Soc = Math.max(20, prevEv2Soc - (rate * timeStep / evSpecs.ev2.cap * 100));
    }
  }
  const augmentedSolar = effectiveSolar + v2gKw;

  if (augmentedSolar >= totalLoad) {
    let excess = augmentedSolar - totalLoad;

    if (priorityMode === 'battery') {
      if (newBatKwh < effectiveCapacity) {
        const capRem = effectiveCapacity - newBatKwh;
        // Realistic battery charging physics:
        // - Constrained by maxChargeKw (inverter/charger limit)
        // - Constrained by available excess solar power
        // - Constrained by remaining battery capacity
        // Result: Larger batteries take longer to charge with same solar array
        //         More panels charge battery faster (more excess power)
        const chargeFraction = Math.min(excess, systemConfig.maxChargeKw) / systemConfig.maxChargeKw;
        const batEff = getBatteryEfficiency(chargeFraction);
        batCharge = Math.min(excess, systemConfig.maxChargeKw, (capRem / batEff) / timeStep);
        newBatKwh += batCharge * timeStep * batEff;
        excess -= batCharge;
      }
      gridExport = excess;
    } else {
      if (newBatKwh < effectiveCapacity) {
        const capRem = effectiveCapacity - newBatKwh;
        const chargeFraction = Math.min(excess, systemConfig.maxChargeKw) / systemConfig.maxChargeKw;
        const batEff = getBatteryEfficiency(chargeFraction);
        batCharge = Math.min(excess, systemConfig.maxChargeKw, (capRem / batEff) / timeStep);
        newBatKwh += batCharge * timeStep * batEff;
        excess -= batCharge;
      }
      gridExport = excess;
    }
  } else {
    let deficit = totalLoad - augmentedSolar;
    if (newBatKwh > effectiveReserve) {
      const enAvail = newBatKwh - effectiveReserve;
      // Realistic battery discharge physics:
      // - Constrained by maxDischargeKw (inverter limit)
      // - Constrained by load deficit (demand)
      // - Constrained by available battery energy (minus reserve)
      const dischargeFraction = Math.min(deficit, systemConfig.maxDischargeKw) / systemConfig.maxDischargeKw;
      const batEff = getBatteryEfficiency(dischargeFraction);
      batDischarge = Math.min(deficit, systemConfig.maxDischargeKw, (enAvail * batEff) / timeStep);
      newBatKwh -= (batDischarge * timeStep) / batEff;
      deficit -= batDischarge;
    }
    gridImport = deficit;
  }

  return {
    solar,
    load: totalLoad,
    houseLoad,
    ev1Kw: ev1Load,
    ev2Kw: ev2Load,
    ev1IsHome,
    ev2IsHome,
    ev1V2g,
    ev2V2g,
    gridImport,
    gridExport,
    batPower: batCharge > 0 ? batCharge : -batDischarge,
    batDischargeKw: batDischarge,
    batKwh: Math.max(0, Math.min(effectiveCapacity, newBatKwh)),
    ev1Soc: prevEv1Soc,
    ev2Soc: prevEv2Soc,
  };
};
