// IEC 60364-5-52 Method C cable sizing engine.
// Mirrors "Cable Sizing" sheet sections B-D (string/DC-main/AC-output), E (battery
// interconnect, Dyness 120A/pair rule), G (derating factors), H (PV string voltage window).

import type { CatalogCableSpec } from './catalogTypes';

export interface CableSelection {
  sizeMM2: number;
  parallelRuns: number;
  pricePerM: number;
}

export function selectCable(
  cableReference: CatalogCableSpec[],
  designCurrentA: number,
  voltageV: number,
  oneWayLengthM: number,
  maxVoltageDropPercent: number,
  isAC: boolean,
): CableSelection {
  const sorted = [...cableReference].sort((a, b) => a.sizeMm2 - b.sizeMm2);
  const largestSpec = sorted[sorted.length - 1];
  const runs = Math.max(1, Math.ceil(designCurrentA / largestSpec.ampacityA));
  const currentPerRun = designCurrentA / runs;

  for (const spec of sorted) {
    if (spec.ampacityA < currentPerRun) continue;
    const voltageDropV = (spec.mvPerAm / 1000) * currentPerRun * oneWayLengthM;
    const voltageDropPercent = (voltageDropV / voltageV) * 100;
    if (voltageDropPercent <= maxVoltageDropPercent) {
      return { sizeMM2: spec.sizeMm2, parallelRuns: runs, pricePerM: isAC ? spec.acPricePerM : spec.dcPricePerM };
    }
  }

  return {
    sizeMM2: largestSpec.sizeMm2,
    parallelRuns: runs,
    pricePerM: isAC ? largestSpec.acPricePerM : largestSpec.dcPricePerM,
  };
}

// Battery interconnect follows a separate rule per Dyness installation guidance:
// each cable pair is rated for up to 120A continuous, so parallel pairs are added
// before falling back to ampacity-table parallel-run logic.
export function selectBatteryCable(
  cableReference: CatalogCableSpec[],
  designCurrentA: number,
  voltageV: number,
  oneWayLengthM: number,
  maxVoltageDropPercent: number,
): CableSelection {
  const parallelPairs = Math.max(1, Math.ceil(designCurrentA / 120));
  const currentPerPair = designCurrentA / parallelPairs;
  const sel = selectCable(cableReference, currentPerPair, voltageV, oneWayLengthM, maxVoltageDropPercent, false);
  return { ...sel, parallelRuns: parallelPairs };
}

// ─── SECTION G: DERATING FACTORS ───────────────────────────────────────────

export type InstallationMethod = 'clipped_direct' | 'conduit_trunking' | 'buried' | 'bundled';

const INSTALL_METHOD_FACTORS: Record<InstallationMethod, number> = {
  clipped_direct: 1.00,
  conduit_trunking: 0.80,
  buried: 0.87,
  bundled: 0.70,
};

export const INSTALL_METHOD_LABELS: Record<InstallationMethod, string> = {
  clipped_direct: 'Clipped direct (free air)',
  conduit_trunking: 'In conduit/trunking',
  buried: 'Direct buried',
  bundled: 'Bundled with other circuits',
};

// PVC-insulated copper ambient-temperature correction factors, IEC 60364-5-52
// Table B.52.14 (base ampacity assumes 30degC).
const AMBIENT_TEMP_FACTORS: [number, number][] = [
  [10, 1.20], [15, 1.14], [20, 1.09], [25, 1.03], [30, 1.00],
  [35, 0.94], [40, 0.87], [45, 0.79], [50, 0.71],
];

export function ambientTempDeratingFactor(ambientC: number): number {
  const sorted = AMBIENT_TEMP_FACTORS;
  if (ambientC <= sorted[0][0]) return sorted[0][1];
  if (ambientC >= sorted[sorted.length - 1][0]) return sorted[sorted.length - 1][1];
  for (let i = 0; i < sorted.length - 1; i++) {
    const [t1, f1] = sorted[i];
    const [t2, f2] = sorted[i + 1];
    if (ambientC >= t1 && ambientC <= t2) {
      const frac = (ambientC - t1) / (t2 - t1);
      return f1 + frac * (f2 - f1);
    }
  }
  return 1.0;
}

export interface DeratingResult {
  installMethodFactor: number;
  ambientTempFactor: number;
  combinedFactor: number;
}

export function computeDerating(installMethod: InstallationMethod, ambientC: number): DeratingResult {
  const installMethodFactor = INSTALL_METHOD_FACTORS[installMethod];
  const ambientTempFactor = ambientTempDeratingFactor(ambientC);
  return { installMethodFactor, ambientTempFactor, combinedFactor: installMethodFactor * ambientTempFactor };
}

export interface DeratingCheckRow {
  circuit: string;
  baseAmpacityA: number;
  deratedAmpacityA: number;
  designCurrentA: number;
  ok: boolean;
}

export function checkDeratedAmpacity(
  cableReference: CatalogCableSpec[],
  circuit: string,
  sizeMM2: number,
  designCurrentA: number,
  derating: DeratingResult,
): DeratingCheckRow {
  const spec = cableReference.find((c) => c.sizeMm2 === sizeMM2);
  const baseAmpacityA = spec?.ampacityA ?? 0;
  const deratedAmpacityA = Math.round(baseAmpacityA * derating.combinedFactor * 10) / 10;
  return { circuit, baseAmpacityA, deratedAmpacityA, designCurrentA: Math.round(designCurrentA * 10) / 10, ok: deratedAmpacityA >= designCurrentA };
}

// ─── SECTION H: PV STRING VOLTAGE WINDOW CHECK ─────────────────────────────

// Approximates panel Voc at STC from Vmp (typical crystalline-silicon Vmp/Voc ratio).
const VMP_TO_VOC_RATIO = 0.85;
const VOC_TEMP_COEFF_PCT_PER_C = 0.0029; // -0.29%/degC vs 25degC STC

export function genericMpptMaxVoltage(voltageClass: string | null): number {
  const vc = voltageClass ?? '';
  if (vc.includes('850')) return 850;
  if (vc.includes('800')) return 800;
  if (vc.includes('700')) return 700;
  if (vc.includes('HV')) return 700;
  return 500; // LV / off-grid / grid-tied string inverter generic ceiling
}

export interface VoltageWindowCheckResult {
  vocTempCorrectionFactor: number;
  coldestCaseStringVocV: number;
  mpptMaxVoltageV: number;
  ok: boolean;
  message: string;
}

export function checkPvStringVoltageWindow(
  panelVmp: number,
  panelsPerString: number,
  minDesignAmbientC: number,
  voltageClass: string | null,
): VoltageWindowCheckResult {
  const deltaT = 25 - minDesignAmbientC;
  const vocTempCorrectionFactor = 1 + VOC_TEMP_COEFF_PCT_PER_C * deltaT;
  const panelVocApprox = panelVmp / VMP_TO_VOC_RATIO;
  const coldestCaseStringVocV = Math.round(panelsPerString * panelVocApprox * vocTempCorrectionFactor * 10) / 10;
  const mpptMaxVoltageV = genericMpptMaxVoltage(voltageClass);
  const ok = coldestCaseStringVocV <= mpptMaxVoltageV;
  const message = ok
    ? `OK - coldest-case string Voc ~${coldestCaseStringVocV}V within ${mpptMaxVoltageV}V MPPT window`
    : `OVER VOLTAGE LIMIT - coldest-case string Voc ~${coldestCaseStringVocV}V exceeds ${mpptMaxVoltageV}V MPPT window. Reduce panels per string.`;
  return { vocTempCorrectionFactor: Math.round(vocTempCorrectionFactor * 1000) / 1000, coldestCaseStringVocV, mpptMaxVoltageV, ok, message };
}
