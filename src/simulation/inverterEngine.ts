export interface InverterConfig {
  ratedKw: number;
  acCableLengthM: number;
  acCableMm2: number;
  maxGridExportKw: number;
  standbyWatts: number;
  powerFactor: number;
  phaseType: 'single' | 'three';
  gridConnected: boolean;
}

export interface InverterResult {
  acOutputKw: number;
  efficiency: number;
  clippingLossKw: number;
  standbyDrawKw: number;
  acCableLossKw: number;
  netAcToGridKw: number;
  gridExportLimitedKw: number;
  apparentPowerKva: number;
}

const EFFICIENCY_POINTS: ReadonlyArray<{ loadFraction: number; efficiency: number }> = [
  { loadFraction: 0.05, efficiency: 0.82 },
  { loadFraction: 0.1, efficiency: 0.93 },
  { loadFraction: 0.3, efficiency: 0.96 },
  { loadFraction: 0.5, efficiency: 0.97 },
  { loadFraction: 0.75, efficiency: 0.965 },
  { loadFraction: 1.0, efficiency: 0.94 },
];

const CONDUCTIVITY_COPPER = 56;
const SINGLE_PHASE_VOLTAGE = 230;
const THREE_PHASE_VOLTAGE = 400;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export function getInverterEfficiency(loadFraction: number): number {
  if (loadFraction <= EFFICIENCY_POINTS[0].loadFraction) {
    return EFFICIENCY_POINTS[0].efficiency;
  }

  if (loadFraction >= EFFICIENCY_POINTS[EFFICIENCY_POINTS.length - 1].loadFraction) {
    return EFFICIENCY_POINTS[EFFICIENCY_POINTS.length - 1].efficiency;
  }

  for (let i = 0; i < EFFICIENCY_POINTS.length - 1; i += 1) {
    const left = EFFICIENCY_POINTS[i];
    const right = EFFICIENCY_POINTS[i + 1];

    if (loadFraction <= right.loadFraction) {
      const range = right.loadFraction - left.loadFraction;
      const ratio = range > 0 ? (loadFraction - left.loadFraction) / range : 0;
      return left.efficiency + ratio * (right.efficiency - left.efficiency);
    }
  }

  return EFFICIENCY_POINTS[EFFICIENCY_POINTS.length - 1].efficiency;
}

export function defaultInverterConfig(): InverterConfig {
  return {
    ratedKw: 5,
    acCableLengthM: 20,
    acCableMm2: 6,
    maxGridExportKw: 5,
    standbyWatts: 20,
    powerFactor: 0.95,
    phaseType: 'single',
    gridConnected: true,
  };
}

export function simulateInverter(dcInputKw: number, config: InverterConfig): InverterResult {
  const safeDcInputKw = Math.max(0, dcInputKw);
  const ratedKw = Math.max(0, config.ratedKw);

  if (safeDcInputKw < 0.02 || ratedKw === 0) {
    const standbyDrawKw = Math.max(0, config.standbyWatts) / 1000;
    return {
      acOutputKw: 0,
      efficiency: 0,
      clippingLossKw: 0,
      standbyDrawKw,
      acCableLossKw: 0,
      netAcToGridKw: 0,
      gridExportLimitedKw: 0,
      apparentPowerKva: 0,
    };
  }

  const loadFraction = clamp(safeDcInputKw / ratedKw, 0, 1);
  const efficiency = getInverterEfficiency(loadFraction);

  const convertedAcKw = safeDcInputKw * efficiency;
  const clippingThresholdDcKw = efficiency > 0 ? ratedKw / efficiency : Number.POSITIVE_INFINITY;
  const clippingApplies = safeDcInputKw > clippingThresholdDcKw;
  const acOutputKw = clippingApplies ? ratedKw : convertedAcKw;
  const clippingLossKw = clippingApplies ? Math.max(0, convertedAcKw - ratedKw) : 0;

  const voltage = config.phaseType === 'three' ? THREE_PHASE_VOLTAGE : SINGLE_PHASE_VOLTAGE;
  const hasValidCable = config.acCableLengthM > 0 && config.acCableMm2 > 0;
  const acCableLossKw = hasValidCable
    ? (acOutputKw ** 2 * config.acCableLengthM) /
      (CONDUCTIVITY_COPPER * config.acCableMm2 * voltage ** 2)
    : 0;

  const activePowerAfterCableKw = Math.max(0, acOutputKw - acCableLossKw);

  let netAcToGridKw = activePowerAfterCableKw;
  let gridExportLimitedKw = 0;

  if (!config.gridConnected) {
    gridExportLimitedKw = activePowerAfterCableKw;
    netAcToGridKw = 0;
  } else if (netAcToGridKw > config.maxGridExportKw) {
    gridExportLimitedKw = netAcToGridKw - config.maxGridExportKw;
    netAcToGridKw = config.maxGridExportKw;
  }

  const apparentPowerKva = netAcToGridKw * config.powerFactor;

  return {
    acOutputKw,
    efficiency,
    clippingLossKw,
    standbyDrawKw: 0,
    acCableLossKw,
    netAcToGridKw,
    gridExportLimitedKw,
    apparentPowerKva,
  };
}
