export type BusId = 'source' | 'feeder' | 'load';

export interface BusResult {
  id: BusId;
  netPowerKw: number;
  voltageDeviationPct: number;
  status: 'surplus' | 'balanced' | 'deficit';
  generationKw: number;
  loadKw: number;
}

export interface LineLoss {
  from: BusId;
  to: BusId;
  lossKw: number;
}

export interface PowerFlowResult {
  buses: BusResult[];
  lineLossesKw: LineLoss[];
  totalLossKw: number;
  frequencyHz: number;
  netImportExportKw: number;
  voltageDeviationMaxPct: number;
}

const NOMINAL_FREQUENCY_HZ = 50;
/** Hz deviation per 1 % power imbalance (load-side droop) */
const FREQUENCY_DROOP_HZ_PER_PCT = 0.02;
const LINE_RESISTANCE_OHM = 0.05;
const SYSTEM_VOLTAGE_KV = 0.4;

function lineLoss(flowKw: number): number {
  const v2 = SYSTEM_VOLTAGE_KV * SYSTEM_VOLTAGE_KV * 1000;
  return v2 > 0 ? (flowKw * flowKw * LINE_RESISTANCE_OHM) / v2 : 0;
}

function busStatus(gen: number, load: number): 'surplus' | 'balanced' | 'deficit' {
  const diff = gen - load;
  if (diff > 0.1) return 'surplus';
  if (diff < -0.1) return 'deficit';
  return 'balanced';
}

/**
 * Simple 3-bus power flow model.
 * - Bus 1 (source): 80 % of generation, 15 % of load
 * - Bus 2 (feeder): 20 % of generation, 35 % of load
 * - Bus 3 (load):    0 % of generation, 50 % of load
 *
 * Line losses are approximated with Joule heating at 400 V.
 * Island-mode frequency deviation uses a droop coefficient.
 */
export function simulatePowerFlow(
  generationKw: number,
  loadKw: number,
  gridConnected: boolean,
  ambientFrequencyHz: number = NOMINAL_FREQUENCY_HZ
): PowerFlowResult {
  const gen = Math.max(0, generationKw);
  const load = Math.max(0, loadKw);

  const srcGen = gen * 0.8;
  const fdrGen = gen * 0.2;

  const srcLoad = load * 0.15;
  const fdrLoad = load * 0.35;
  const endLoad = load * 0.5;

  const srcNet = srcGen - srcLoad;
  const fdrNet = srcNet + fdrGen - fdrLoad;

  const loss1 = Math.max(0, lineLoss(srcNet));
  const loss2 = Math.max(0, lineLoss(fdrNet));
  const totalLossKw = loss1 + loss2;

  const netImportExportKw = gen - load;
  const imbalancePct = load > 0 ? (netImportExportKw / load) * 100 : 0;

  const frequencyHz = gridConnected
    ? ambientFrequencyHz
    : NOMINAL_FREQUENCY_HZ + FREQUENCY_DROOP_HZ_PER_PCT * imbalancePct;

  const srcVDev = srcLoad > 0 ? (srcLoad / (srcGen + srcLoad + 0.001)) * 1.5 : 0;
  const fdrVDev = fdrLoad > 0 ? (fdrLoad / (fdrGen + fdrLoad + 0.001)) * 2.5 : 0;
  const endVDev = endLoad > 0 ? (endLoad / (fdrNet + endLoad + 0.001)) * 4.0 : 0;

  return {
    buses: [
      {
        id: 'source',
        netPowerKw: srcNet,
        voltageDeviationPct: Math.min(10, srcVDev),
        status: busStatus(srcGen, srcLoad),
        generationKw: srcGen,
        loadKw: srcLoad,
      },
      {
        id: 'feeder',
        netPowerKw: fdrNet,
        voltageDeviationPct: Math.min(10, fdrVDev),
        status: busStatus(fdrGen, fdrLoad),
        generationKw: fdrGen,
        loadKw: fdrLoad,
      },
      {
        id: 'load',
        netPowerKw: -endLoad,
        voltageDeviationPct: Math.min(10, Math.max(0, endVDev)),
        status: busStatus(0, endLoad),
        generationKw: 0,
        loadKw: endLoad,
      },
    ],
    lineLossesKw: [
      { from: 'source', to: 'feeder', lossKw: loss1 },
      { from: 'feeder', to: 'load', lossKw: loss2 },
    ],
    totalLossKw,
    frequencyHz: Math.max(45, Math.min(55, frequencyHz)),
    netImportExportKw,
    voltageDeviationMaxPct: Math.max(srcVDev, fdrVDev, endVDev),
  };
}
