import type { DerivedSystemConfig } from '@/types/simulation-core';
import type { DayScenario } from './timeEngine';
import { simulateSolar } from './solarEngine';
import { gaussianRandom } from './mathUtils';
import { defaultInverterConfig, simulateInverter } from './inverterEngine';

export interface EVSpecs {
  ev1: { drainRate: number; cap: number; onboard: number };
  ev2: { drainRate: number; cap: number; onboard: number };
}

export interface SolarSimulationResult {
  solar: number;
  availableSolarKw: number;
  solarLossKw: number;
  load: number;
  houseLoad: number;
  residentialLoad: number;
  commercialLoad: number;
  industrialLoad: number;
  accessoryLoad: number;
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
  inverterEfficiency: number;
  inverterClippingKw: number;
  acCableLossKw: number;
}

/** Minimum V2G export power below which we treat discharge as zero (avoids
 *  amplified inverter-efficiency losses on trivial V2G contributions). */
const V2G_DEADBAND_KW = 0.05;

const getBatteryEfficiency = (rateFraction: number): number => {
  return Math.max(0.85, 0.95 - 0.10 * Math.min(1.0, rateFraction));
};

const getEVTaperedRate = (soc: number, maxRate: number): number => {
  if (soc >= 100) return 0;
  if (soc >= 80) return maxRate * (100 - soc) / 20;
  return maxRate;
};

const DC_CABLE_LOSS_FRACTION = 0.015;

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
  const rawSolar = simulateSolar(t, scenario, systemConfig, cloudNoise, scenario.solarData);
  const solarConstrainedByInverter = Math.min(rawSolar, systemConfig.inverterKw);
  const hIdx = Math.floor(t);

  // ── Loads ─────────────────────────────────────────────────────────────────
  let residentialLoad = 0;
  if (systemConfig.homeLoadEnabled) {
    const profileLoad = scenario.houseLoadProfile[hIdx % 24] * Math.max(0.5, 1 + gaussianRandom(0, 0.08));
    const profileAvg = scenario.houseLoadProfile.reduce((a, b) => a + b, 0) / scenario.houseLoadProfile.length;
    residentialLoad = (profileLoad / profileAvg) * systemConfig.homeLoadKw;
  }

  const commercialLoad = systemConfig.commercialLoadEnabled
    ? systemConfig.commercialLoadKw * Math.max(0.9, 1 + gaussianRandom(0, 0.05))
    : 0;

  const industrialProfile = [
    3.8, 3.6, 3.4, 3.2, 3.0, 3.5, 5.5, 6.2, 6.5, 6.8, 7.0, 7.1,
    7.2, 7.0, 6.8, 6.5, 6.0, 5.6, 4.8, 4.4, 4.0, 3.8, 3.6, 3.4,
  ];
  const industrialAvg = industrialProfile.reduce((a, b) => a + b, 0) / industrialProfile.length;
  const industrialLoad = systemConfig.industrialLoadEnabled
    ? (industrialProfile[hIdx % 24] / Math.max(industrialAvg, 0.1)) *
        systemConfig.industrialLoadKw *
        Math.max(0.9, Math.min(1.15, 1 + gaussianRandom(0, 0.04))) *
        (scenario.isWeekend ? 0.8 : 1)
    : 0;

  const accessoryLoad = Math.max(0, (systemConfig.accessoryLoadKw ?? 0) * (systemConfig.accessoryScale ?? 1));
  const houseLoad = residentialLoad + commercialLoad + industrialLoad + accessoryLoad;

  const effectiveCapacity = systemConfig.batteryKwh * batteryHealth;
  const effectiveReserve = Math.max(systemConfig.batteryKwh * 0.15, 8) * batteryHealth;

  // ── EV charging/draining ──────────────────────────────────────────────────
  let ev1Load = 0;
  let ev2Load = 0;
  let ev1IsHome = true;
  let ev2IsHome = true;

  if (
    (t > scenario.ev1.depart && t < scenario.ev1.return) ||
    (scenario.ev1.emergency && t > scenario.ev1.emergency.start && t < scenario.ev1.emergency.end)
  ) {
    ev1IsHome = false;
    prevEv1Soc = Math.max(
      5,
      prevEv1Soc - (evSpecs.ev1.drainRate * (systemConfig.evCommuterScale ?? 1) * actualTimeStep / evSpecs.ev1.cap * 100)
    );
  } else if (prevEv1Soc < 100) {
    const taperedRate = getEVTaperedRate(
      prevEv1Soc,
      Math.min(systemConfig.evChargerKw, evSpecs.ev1.onboard) * (systemConfig.evCommuterScale ?? 1)
    );
    const needed = (100 - prevEv1Soc) / 100 * evSpecs.ev1.cap;
    ev1Load = Math.min(taperedRate, needed / actualTimeStep) * (systemConfig.evCommuterScale ?? 1);
  }

  if (
    (t > scenario.ev2.depart && t < (scenario.ev2.lunchStart ?? Infinity)) ||
    (t > (scenario.ev2.lunchEnd ?? 0) && t < scenario.ev2.return)
  ) {
    ev2IsHome = false;
    prevEv2Soc = Math.max(
      5,
      prevEv2Soc - (evSpecs.ev2.drainRate * (systemConfig.evFleetScale ?? 1) * actualTimeStep / evSpecs.ev2.cap * 100)
    );
  } else if (prevEv2Soc < 100) {
    const taperedRate = getEVTaperedRate(
      prevEv2Soc,
      Math.min(systemConfig.evChargerKw, evSpecs.ev2.onboard) * (systemConfig.evFleetScale ?? 1)
    );
    const needed = (100 - prevEv2Soc) / 100 * evSpecs.ev2.cap;
    ev2Load = Math.min(taperedRate, needed / actualTimeStep) * (systemConfig.evFleetScale ?? 1);
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

  // ── Solar through inverter ────────────────────────────────────────────────
  const inverterConfig = defaultInverterConfig();
  const dcLoss = solarConstrainedByInverter * DC_CABLE_LOSS_FRACTION;
  const solarAfterDc = Math.max(0, solarConstrainedByInverter - dcLoss);
  const inverterResult = simulateInverter(solarAfterDc, {
    ...inverterConfig,
    ratedKw: systemConfig.inverterKw,
    maxGridExportKw: systemConfig.inverterKw,
  });
  const effectiveSolar = Math.max(0, inverterResult.acOutputKw - inverterResult.acCableLossKw);
  const solarLossKw = Math.max(0, rawSolar - effectiveSolar);

  if (ev1Load > 0) prevEv1Soc = Math.min(100, prevEv1Soc + (ev1Load * actualTimeStep / evSpecs.ev1.cap * 100));
  if (ev2Load > 0) prevEv2Soc = Math.min(100, prevEv2Soc + (ev2Load * actualTimeStep / evSpecs.ev2.cap * 100));

  // ── V2G — routed directly to AC bus, bypassing inverter-efficiency path ───
  // V2G power comes from EV onboard inverters (already AC-side), so it should
  // NOT be multiplied by getInverterEfficiency again. A dead-band of 0.05 kW
  // prevents trivial V2G events from creating noise in the energy balance.
  let v2gKw = 0;
  let ev1V2g = false;
  let ev2V2g = false;
  if (isPeakTime) {
    const batSocPct = (prevBatKwh / effectiveCapacity) * 100;
    if (ev1IsHome && prevEv1Soc > 50 && batSocPct < 30) {
      const rate = Math.min(5, evSpecs.ev1.onboard);
      if (rate >= V2G_DEADBAND_KW) {
        v2gKw += rate;
        ev1V2g = true;
        prevEv1Soc = Math.max(20, prevEv1Soc - (rate * actualTimeStep / evSpecs.ev1.cap * 100));
      }
    }
    if (ev2IsHome && prevEv2Soc > 50 && batSocPct < 30) {
      const rate = Math.min(5, evSpecs.ev2.onboard);
      if (rate >= V2G_DEADBAND_KW) {
        v2gKw += rate;
        ev2V2g = true;
        prevEv2Soc = Math.max(20, prevEv2Soc - (rate * actualTimeStep / evSpecs.ev2.cap * 100));
      }
    }
  }

  // V2G is added AFTER inverter conversion — it is already AC power
  const augmentedSolar = effectiveSolar + v2gKw;

  // ── Dispatch ──────────────────────────────────────────────────────────────
  let batCharge = 0;
  let batDischarge = 0;
  let gridImport = 0;
  let gridExport = 0;
  let newBatKwh = prevBatKwh;

  if (augmentedSolar >= totalLoad) {
    let excess = augmentedSolar - totalLoad;
    if (priorityMode === 'battery') {
      if (newBatKwh < effectiveCapacity) {
        const capRem = effectiveCapacity - newBatKwh;
        const chargeFraction = Math.min(excess, systemConfig.maxChargeKw) / systemConfig.maxChargeKw;
        const batEff = getBatteryEfficiency(chargeFraction);
        batCharge = Math.min(excess, systemConfig.maxChargeKw, (capRem / batEff) / actualTimeStep);
        newBatKwh += batCharge * actualTimeStep * batEff;
        excess -= batCharge;
      }
      gridExport = excess;
    } else {
      gridExport = excess;
    }
  } else {
    let deficit = totalLoad - augmentedSolar;
    if (newBatKwh > effectiveReserve) {
      const enAvail = newBatKwh - effectiveReserve;
      const dischargeFraction = Math.min(deficit, systemConfig.maxDischargeKw) / systemConfig.maxDischargeKw;
      const batEff = getBatteryEfficiency(dischargeFraction);
      batDischarge = Math.min(deficit, systemConfig.maxDischargeKw, (enAvail * batEff) / actualTimeStep);
      newBatKwh -= (batDischarge * actualTimeStep) / batEff;
      deficit -= batDischarge;
    }
    gridImport = deficit;
  }

  return {
    solar: effectiveSolar,
    availableSolarKw: rawSolar,
    solarLossKw,
    load: totalLoad,
    houseLoad,
    residentialLoad,
    commercialLoad,
    industrialLoad,
    accessoryLoad,
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
    inverterEfficiency: inverterResult.efficiency,
    inverterClippingKw: inverterResult.clippingLossKw,
    acCableLossKw: inverterResult.acCableLossKw,
  };
};
