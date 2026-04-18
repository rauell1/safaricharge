export interface GridNode {
  id: string;
  loadKw: number;
  generationKw: number;
  voltageKv: number;
  cableLengthM: number;
  cableMm2: number;
}

export interface GridConfig {
  nominalVoltageKv: number;
  powerFactor: number;
  inertiaConstantS: number;
  prevFrequencyHz: number;
  dtSeconds: number;
  batteryCapacityKwh?: number;
  initialBatteryKwh?: number;
  maxBatteryChargeKw?: number;
  maxBatteryDischargeKw?: number;
}

export interface GridResult {
  totalLossesKw: number;
  frequencyHz: number;
  voltageDeviations: Record<string, number>;
  derDispatch: Record<string, number>;
  totalGenerationKw: number;
  totalLoadKw: number;
  netGridImportKw: number;
  batteryStateKwh: number;
}

const COPPER_RESISTIVITY_OHM_M = 1.72e-8;
const NOMINAL_FREQUENCY_HZ = 50;

const safeDivision = (num: number, den: number) => (den !== 0 ? num / den : 0);

export function simulatePowerFlow(nodes: GridNode[], config: GridConfig): GridResult {
  const nominalVoltageKv = config.nominalVoltageKv > 0 ? config.nominalVoltageKv : 0.4;
  const powerFactor = config.powerFactor > 0 ? config.powerFactor : 1;
  const inertiaConstantS = config.inertiaConstantS > 0 ? config.inertiaConstantS : 5;
  const dtSeconds = config.dtSeconds > 0 ? config.dtSeconds : 60;

  const voltageDeviations: Record<string, number> = {};

  let totalLoadKw = 0;
  let totalGenerationKw = 0;
  let totalLossesKw = 0;

  let solarDispatchKw = 0;
  let batteryDispatchKw = 0;
  let gridImportKw = 0;
  let gridExportKw = 0;

  const batteryCapacityKwh = Math.max(0, config.batteryCapacityKwh ?? 0);
  let batteryStateKwh = Math.min(
    batteryCapacityKwh,
    Math.max(0, config.initialBatteryKwh ?? 0),
  );
  const maxBatteryChargeKw = Math.max(0, config.maxBatteryChargeKw ?? Number.POSITIVE_INFINITY);
  const maxBatteryDischargeKw = Math.max(0, config.maxBatteryDischargeKw ?? Number.POSITIVE_INFINITY);
  const dtHours = dtSeconds / 3600;

  for (const node of nodes) {
    const loadKw = Math.max(0, node.loadKw);
    const generationKw = Math.max(0, node.generationKw);
    const nominalVoltageV = (node.voltageKv > 0 ? node.voltageKv : nominalVoltageKv) * 1000;

    totalLoadKw += loadKw;
    totalGenerationKw += generationKw;

    const areaM2 = node.cableMm2 > 0 ? node.cableMm2 * 1e-6 : 0;
    const resistanceOhm = areaM2 > 0 && node.cableLengthM > 0
      ? (COPPER_RESISTIVITY_OHM_M * node.cableLengthM) / areaM2
      : 0;

    const netKw = loadKw - generationKw;
    const lineCurrentA = safeDivision((netKw * 1000), nominalVoltageV * powerFactor);
    const lineLossKw = (lineCurrentA * lineCurrentA * resistanceOhm) / 1000;
    totalLossesKw += lineLossKw;

    const voltageDropV = lineCurrentA * resistanceOhm;
    voltageDeviations[node.id] = safeDivision(voltageDropV, nominalVoltageV);

    if (generationKw >= loadKw) {
      solarDispatchKw += loadKw;
      const surplusKw = generationKw - loadKw;
      const availableStorageKwh = Math.max(0, batteryCapacityKwh - batteryStateKwh);
      const chargeKw = Math.min(surplusKw, maxBatteryChargeKw, safeDivision(availableStorageKwh, dtHours));
      batteryStateKwh += chargeKw * dtHours;
      gridExportKw += Math.max(0, surplusKw - chargeKw);
    } else {
      solarDispatchKw += generationKw;
      const deficitKw = loadKw - generationKw;
      const batteryAvailableKw = Math.min(
        maxBatteryDischargeKw,
        Math.max(0, safeDivision(batteryStateKwh, dtHours)),
      );
      const dischargedKw = Math.min(deficitKw, batteryAvailableKw);
      batteryStateKwh = Math.max(0, batteryStateKwh - dischargedKw * dtHours);
      batteryDispatchKw += dischargedKw;
      gridImportKw += Math.max(0, deficitKw - dischargedKw);
    }
  }

  const netGridImportKw = gridImportKw - gridExportKw;
  const dfDt = (totalGenerationKw - totalLoadKw) / (2 * inertiaConstantS * NOMINAL_FREQUENCY_HZ);
  const frequencyHz = (config.prevFrequencyHz || NOMINAL_FREQUENCY_HZ) + dfDt * dtSeconds;

  return {
    totalLossesKw,
    frequencyHz,
    voltageDeviations,
    derDispatch: {
      solar: solarDispatchKw,
      battery: batteryDispatchKw,
      grid: netGridImportKw,
    },
    totalGenerationKw,
    totalLoadKw,
    netGridImportKw,
    batteryStateKwh,
  };
}

export function defaultGridConfig(): GridConfig {
  return {
    nominalVoltageKv: 0.4,
    powerFactor: 0.95,
    inertiaConstantS: 5,
    prevFrequencyHz: 50,
    dtSeconds: 60,
    batteryCapacityKwh: 0,
    initialBatteryKwh: 0,
  };
}
