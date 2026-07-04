import { selectCable } from '@/lib/sizing/cableSizing';
import type { CatalogCableSpec } from '@/lib/sizing/catalogTypes';

export interface GridNode {
  id: string;
  loadKw: number;
  generationKw: number;
  voltageKv: number;
  cableLengthM: number;
  cableMm2: number;
}

// IEC 60364-5-52 Method C reference table (PVC-insulated copper, 30degC ambient).
// Static copy of the same physics constants the /sizing engine reads from
// Supabase (sizing_cable_reference) - kept inline here so the real-time tick
// loop has no network dependency, since this is physics data, not pricing.
const AC_CABLE_REFERENCE: CatalogCableSpec[] = [
  { sizeMm2: 1.5, ampacityA: 19.5, mvPerAm: 29.0, dcPricePerM: 58, acPricePerM: 99 },
  { sizeMm2: 2.5, ampacityA: 27.0, mvPerAm: 18.0, dcPricePerM: 88, acPricePerM: 150 },
  { sizeMm2: 4.0, ampacityA: 36.0, mvPerAm: 11.0, dcPricePerM: 95, acPricePerM: 162 },
  { sizeMm2: 6.0, ampacityA: 46.0, mvPerAm: 7.3, dcPricePerM: 140, acPricePerM: 238 },
  { sizeMm2: 10.0, ampacityA: 63.0, mvPerAm: 4.4, dcPricePerM: 268, acPricePerM: 456 },
  { sizeMm2: 16.0, ampacityA: 85.0, mvPerAm: 2.8, dcPricePerM: 391, acPricePerM: 665 },
  { sizeMm2: 25.0, ampacityA: 112.0, mvPerAm: 1.75, dcPricePerM: 754, acPricePerM: 1282 },
  { sizeMm2: 35.0, ampacityA: 138.0, mvPerAm: 1.25, dcPricePerM: 1508, acPricePerM: 2564 },
  { sizeMm2: 50.0, ampacityA: 168.0, mvPerAm: 0.93, dcPricePerM: 977, acPricePerM: 1661 },
  { sizeMm2: 70.0, ampacityA: 213.0, mvPerAm: 0.63, dcPricePerM: 1281, acPricePerM: 2178 },
  { sizeMm2: 95.0, ampacityA: 258.0, mvPerAm: 0.46, dcPricePerM: 1637, acPricePerM: 2783 },
  { sizeMm2: 120.0, ampacityA: 299.0, mvPerAm: 0.37, dcPricePerM: 1975, acPricePerM: 3358 },
  { sizeMm2: 150.0, ampacityA: 344.0, mvPerAm: 0.30, dcPricePerM: 2363, acPricePerM: 4017 },
  { sizeMm2: 185.0, ampacityA: 392.0, mvPerAm: 0.24, dcPricePerM: 2797, acPricePerM: 4755 },
  { sizeMm2: 240.0, ampacityA: 461.0, mvPerAm: 0.18, dcPricePerM: 3448, acPricePerM: 5862 },
  { sizeMm2: 300.0, ampacityA: 530.0, mvPerAm: 0.15, dcPricePerM: 4125, acPricePerM: 7013 },
];

/**
 * Sizes the AC output cable (inverter to distribution board) to the actual
 * inverter capacity, the same IEC 60364-5-52 ampacity/voltage-drop method the
 * /sizing engine uses - so a 5kW and a 100kW system show genuinely different
 * line losses instead of both running through a fixed 10m/16mm2 circuit.
 */
export function selectAcOutputCable(inverterCapacityKw: number, runLengthM = 20): { cableLengthM: number; cableMm2: number } {
  const voltageV = 230;
  const designCurrentA = Math.max(1, (inverterCapacityKw * 1000) / (voltageV * 0.95));
  const { sizeMM2 } = selectCable(AC_CABLE_REFERENCE, designCurrentA, voltageV, runLengthM, 2.5, true);
  return { cableLengthM: runLengthM, cableMm2: sizeMM2 };
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
