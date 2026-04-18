import { clamp, gaussianRandom } from './mathUtils';

export interface EVFleetConfig {
  useCase: 'residential' | 'fleet-depot' | 'public-station';
  vehicleCount: number;
  batteryKwh: number;
  chargerKw: number;
  onboardInverterKw: number;
  v2gEnabled: boolean;
  minSocForV2g: number;
  smartChargingEnabled: boolean;
  depotReturnHour: number;
}

export interface EVFleetResult {
  totalLoadKw: number;
  v2gExportKw: number;
  vehicleSocs: number[];
  sessionCount: number;
  demandResponseShedKw: number;
  smartChargingDeferralKw: number;
}

let demandResponseActive = false;
let observedPeakTariff = 40;

const TARGET_SOC_RESIDENTIAL = 0.9;
const TARGET_SOC_DEPOT = 0.92;
const TARGET_SOC_PUBLIC = 0.9;
const V2G_DISCHARGE_WINDOW_HOURS = 1;
const SOC_DEFERRAL_BUFFER = 0.1;
const MAX_DEFERRAL_HOURS_UNTIL_SOLAR = 2;
const CHEAP_TARIFF_CHARGING_MULTIPLIER = 1.15;

const normalizeHour = (t: number): number => ((t % 24) + 24) % 24;

const isWithinWindow = (t: number, startHour: number, endHour: number): boolean => {
  const hour = normalizeHour(t);
  const start = normalizeHour(startHour);
  const end = normalizeHour(endHour);
  if (start <= end) return hour >= start && hour < end;
  return hour >= start || hour < end;
};

const sampleLogNormal = (mean: number, stdDev: number): number => {
  const variance = stdDev ** 2;
  const sigma2 = Math.log(1 + variance / (mean ** 2));
  const sigma = Math.sqrt(sigma2);
  const mu = Math.log(mean) - sigma2 / 2;
  const normal = gaussianRandom(mu, sigma);
  return Math.exp(normal);
};

const samplePoisson = (lambda: number): number => {
  const l = Math.exp(-lambda);
  let p = 1;
  let k = 0;
  do {
    k += 1;
    p *= Math.random();
  } while (p > l);
  return k - 1;
};

const smartCanDefer = (
  soc: number,
  minSocForV2g: number,
  t: number,
): boolean => {
  const hoursUntilSolar = (() => {
    const hour = normalizeHour(t);
    if (hour >= 9 && hour < 16) return 0;
    if (hour < 9) return 9 - hour;
    return 24 - hour + 9;
  })();

  return (
    soc > minSocForV2g + SOC_DEFERRAL_BUFFER &&
    hoursUntilSolar <= MAX_DEFERRAL_HOURS_UNTIL_SOLAR
  );
};

const loadForVehicle = (
  soc: number,
  targetSoc: number,
  batteryKwh: number,
  chargerKw: number,
  dtHours: number,
): number => {
  if (soc >= targetSoc || dtHours <= 0) return 0;
  const neededKwh = (targetSoc - soc) * batteryKwh;
  return Math.max(0, Math.min(chargerKw, neededKwh / dtHours));
};

export function defaultEVFleetConfig(): EVFleetConfig {
  return {
    useCase: 'residential',
    vehicleCount: 20,
    batteryKwh: 60,
    chargerKw: 7.4,
    onboardInverterKw: 7.4,
    v2gEnabled: false,
    minSocForV2g: 0.3,
    smartChargingEnabled: false,
    depotReturnHour: 18,
  };
}

export function initEVFleetSocs(config: EVFleetConfig): number[] {
  const count = Math.max(0, Math.floor(config.vehicleCount));
  const socs: number[] = [];
  for (let i = 0; i < count; i += 1) {
    if (config.useCase === 'public-station') {
      socs.push(clamp(sampleLogNormal(0.45, 0.18), 0.05, 0.85));
    } else {
      socs.push(clamp(gaussianRandom(0.35, 0.15), 0.1, 0.9));
    }
  }
  return socs;
}

export function simulateEVFleet(
  t: number,
  prevSocs: number[],
  config: EVFleetConfig,
  solarSurplusKw: number,
  tariffRate: number,
  isPeakTime: boolean,
  gridFrequencyHz: number,
  dtHours: number,
): EVFleetResult {
  const safeDt = Math.max(0, dtHours);
  const vehicleCount = Math.max(0, Math.floor(config.vehicleCount));
  const batteryKwh = Math.max(0.1, config.batteryKwh);
  const chargerKw = Math.max(0, config.chargerKw);
  const vehicleSocs = Array.from({ length: vehicleCount }, (_, i) =>
    clamp(prevSocs[i] ?? 0.5, 0, 1),
  );
  const hour = normalizeHour(t);

  if (isPeakTime) observedPeakTariff = Math.max(observedPeakTariff, tariffRate);
  const cheapTariff = tariffRate < 0.5 * Math.max(1e-6, observedPeakTariff);

  let totalLoadKw = 0;
  let sessionCount = 0;
  let smartChargingDeferralKw = 0;

  if (config.useCase === 'public-station') {
    const inPeakArrivalWindow = isWithinWindow(hour, 7, 9) || isWithinWindow(hour, 17, 20);
    const lambdaPerHour = inPeakArrivalWindow ? 4 : 1.5;
    const arrivals = samplePoisson(lambdaPerHour * safeDt);

    const connected = vehicleSocs.filter((soc) => soc < TARGET_SOC_PUBLIC).length;
    const idleSlots = Math.max(0, vehicleCount - connected);
    const newSessions = Math.min(arrivals, idleSlots);

    let assigned = 0;
    for (let i = 0; i < vehicleSocs.length && assigned < newSessions; i += 1) {
      if (vehicleSocs[i] >= TARGET_SOC_PUBLIC) {
        vehicleSocs[i] = clamp(sampleLogNormal(0.45, 0.18), 0.05, 0.85);
        assigned += 1;
      }
    }

    for (let i = 0; i < vehicleSocs.length; i += 1) {
      const soc = vehicleSocs[i];
      if (soc >= TARGET_SOC_PUBLIC) continue;
      const durationMinutes = Math.max(10, gaussianRandom(45, 20));
      const fractionOfStep = Math.min(1, (safeDt * 60) / durationMinutes);
      const powerKw = chargerKw * fractionOfStep;
      const deliveredKwh = powerKw * safeDt;
      vehicleSocs[i] = clamp(soc + deliveredKwh / batteryKwh, 0, 1);
      totalLoadKw += powerKw;
      sessionCount += 1;
    }
    sessionCount = Math.min(sessionCount, vehicleCount);
  } else {
    const chargingWindow = config.useCase === 'residential'
      ? isWithinWindow(hour, 22, 7)
      : isWithinWindow(hour, config.depotReturnHour, config.depotReturnHour + 12);
    const baseChargerKw = config.useCase === 'residential' ? 7.4 : chargerKw;
    const targetSoc = config.useCase === 'residential' ? TARGET_SOC_RESIDENTIAL : TARGET_SOC_DEPOT;

    for (let i = 0; i < vehicleSocs.length; i += 1) {
      const soc = vehicleSocs[i];
      const connectedBySchedule = config.useCase === 'fleet-depot'
        ? isWithinWindow(hour, config.depotReturnHour + ((i / Math.max(1, vehicleCount)) * 0.5), config.depotReturnHour + 12)
        : chargingWindow;
      const inSolarWindow = isWithinWindow(hour, 9, 16);
      const connected = connectedBySchedule || (
        config.smartChargingEnabled &&
        inSolarWindow &&
        solarSurplusKw > 0
      );

      if (!connected) continue;
      const baseLoad = loadForVehicle(soc, targetSoc, batteryKwh, baseChargerKw, safeDt);
      if (baseLoad <= 0) continue;

      let shouldCharge = chargingWindow;
      if (config.smartChargingEnabled) {
        if (inSolarWindow && solarSurplusKw > 0) {
          shouldCharge = true;
        } else if (!isPeakTime && !cheapTariff && smartCanDefer(soc, config.minSocForV2g, hour)) {
          shouldCharge = false;
          smartChargingDeferralKw += baseLoad;
        }
      }

      if (!shouldCharge) continue;

      const aggressiveMultiplier = config.smartChargingEnabled && cheapTariff
        ? CHEAP_TARIFF_CHARGING_MULTIPLIER
        : 1;
      const effectiveLoad = Math.min(baseChargerKw, baseLoad * aggressiveMultiplier);
      const deliveredKwh = effectiveLoad * safeDt;
      vehicleSocs[i] = clamp(soc + deliveredKwh / batteryKwh, 0, 1);
      totalLoadKw += effectiveLoad;
      sessionCount += 1;
    }
  }

  let v2gExportKw = 0;
  if (config.v2gEnabled && isPeakTime && safeDt > 0) {
    for (let i = 0; i < vehicleSocs.length; i += 1) {
      const soc = vehicleSocs[i];
      if (soc <= config.minSocForV2g) continue;
      const dischargeRoomKwh = (soc - config.minSocForV2g) * batteryKwh;
      const dischargeLimitKw = dischargeRoomKwh / V2G_DISCHARGE_WINDOW_HOURS;
      const exportKw = Math.min(config.onboardInverterKw, dischargeLimitKw);
      if (exportKw <= 0) continue;
      v2gExportKw += exportKw;
      const newSoc = soc - (exportKw * safeDt) / batteryKwh;
      vehicleSocs[i] = clamp(newSoc, config.minSocForV2g, 1);
    }
    v2gExportKw = Math.min(v2gExportKw, vehicleCount * Math.max(0, config.onboardInverterKw));
  }

  if (gridFrequencyHz < 49.8) demandResponseActive = true;
  else if (gridFrequencyHz > 49.95) demandResponseActive = false;

  let demandResponseShedKw = 0;
  if (demandResponseActive && totalLoadKw > 0) {
    demandResponseShedKw = totalLoadKw * 0.5;
    totalLoadKw -= demandResponseShedKw;
  }

  return {
    totalLoadKw,
    v2gExportKw,
    vehicleSocs,
    sessionCount: Math.min(sessionCount, vehicleCount),
    demandResponseShedKw,
    smartChargingDeferralKw,
  };
}
