/**
 * Engineering KPI calculation library
 * ───────────────────────────────────────────────────────────────────
 * Implements the six primary IEC 61724 PV performance metrics used in
 * engineering and bankability reports:
 *
 *   PR  — Performance Ratio          (dimensionless, 0–1)
 *   SY  — Specific Yield             (kWh / kWp / yr)
 *   CF  — Capacity Factor            (%, hours/8760)
 *   SS  — Self-Sufficiency Ratio     (%, load met by own generation)
 *   SC  — Self-Consumption Ratio     (%, generation consumed locally)
 *   CO2 — CO₂ Avoidance             (kg / yr)
 *
 * All functions are pure; they take measured/simulated values and
 * return the KPI with its trend direction versus a comparison period.
 */

export const GRID_EMISSION_FACTOR_KG_KWH = 0.339; // Kenya national grid

export interface KpiValue {
  value: number;
  unit: string;
  trend: number;          // % change vs previous period (positive = improvement)
  trendIsGood: boolean;   // true when positive trend means good news
  label: string;
  description: string;
  iecRef: string;         // IEC 61724 clause
  target?: number;        // design target for gauge
  sparkline: number[];    // last N period values for mini sparkline
}

export interface KpiInputs {
  // Current period
  pvYieldKwh: number;
  loadKwh: number;
  gridImportKwh: number;
  gridExportKwh: number;
  pvCapacityKwp: number;
  peakSunHours: number;   // PSH for the period (irradiation / 1 kW/m²)
  periodHours: number;    // e.g. 8760 for annual, 720 for monthly

  // Previous period (for trend)
  prev?: Omit<KpiInputs, 'prev'>;

  // Historical sparkline (oldest → newest, current period NOT included)
  history?: number[][];
  // history[i] = [pvYield, load, gridImport, gridExport, cap, psh, periodH]
}

function pr(i: KpiInputs): number {
  const theoretical = i.pvCapacityKwp * i.peakSunHours;
  return theoretical > 0 ? Math.min(1, i.pvYieldKwh / theoretical) : 0;
}
function sy(i: KpiInputs): number {
  return i.pvCapacityKwp > 0 ? i.pvYieldKwh / i.pvCapacityKwp : 0;
}
function cf(i: KpiInputs): number {
  const max = i.pvCapacityKwp * i.periodHours;
  return max > 0 ? Math.min(1, i.pvYieldKwh / max) * 100 : 0;
}
function ss(i: KpiInputs): number {
  const selfUsed = i.pvYieldKwh - i.gridExportKwh;
  return i.loadKwh > 0 ? Math.min(100, (selfUsed / i.loadKwh) * 100) : 0;
}
function sc(i: KpiInputs): number {
  const selfUsed = i.pvYieldKwh - i.gridExportKwh;
  return i.pvYieldKwh > 0 ? Math.min(100, (selfUsed / i.pvYieldKwh) * 100) : 0;
}
function co2(i: KpiInputs): number {
  const displaced = Math.max(0, i.loadKwh - i.gridImportKwh);
  return displaced * GRID_EMISSION_FACTOR_KG_KWH;
}

function trendPct(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function sparkFor(
  hist: number[][] | undefined,
  fn: (i: KpiInputs) => number,
  current: number,
): number[] {
  const base = (hist ?? []).map(h => fn({
    pvYieldKwh: h[0], loadKwh: h[1], gridImportKwh: h[2],
    gridExportKwh: h[3], pvCapacityKwp: h[4], peakSunHours: h[5], periodHours: h[6],
  }));
  return [...base.slice(-7), current];
}

export function computeKpis(inputs: KpiInputs): KpiValue[] {
  const curr = {
    PR:  pr(inputs),
    SY:  sy(inputs),
    CF:  cf(inputs),
    SS:  ss(inputs),
    SC:  sc(inputs),
    CO2: co2(inputs),
  };
  const prev = inputs.prev ? {
    PR:  pr(inputs.prev),
    SY:  sy(inputs.prev),
    CF:  cf(inputs.prev),
    SS:  ss(inputs.prev),
    SC:  sc(inputs.prev),
    CO2: co2(inputs.prev),
  } : null;

  return [
    {
      label: 'Performance Ratio',
      value: Math.round(curr.PR * 1000) / 10,
      unit: '%',
      trend: prev ? trendPct(curr.PR, prev.PR) : 0,
      trendIsGood: true,
      description: 'Ratio of actual to theoretical PV yield. Accounts for temperature, shading, wiring and inverter losses.',
      iecRef: 'IEC 61724-1 §6.3',
      target: 80,
      sparkline: sparkFor(inputs.history, i => pr(i) * 100, curr.PR * 100),
    },
    {
      label: 'Specific Yield',
      value: Math.round(curr.SY),
      unit: 'kWh/kWp',
      trend: prev ? trendPct(curr.SY, prev.SY) : 0,
      trendIsGood: true,
      description: 'Annual energy output per installed kWp. Normalises yield across different system sizes.',
      iecRef: 'IEC 61724-1 §6.1',
      target: 1400,
      sparkline: sparkFor(inputs.history, sy, curr.SY),
    },
    {
      label: 'Capacity Factor',
      value: Math.round(curr.CF * 10) / 10,
      unit: '%',
      trend: prev ? trendPct(curr.CF, prev.CF) : 0,
      trendIsGood: true,
      description: 'Ratio of actual output to theoretical maximum if operating at rated power continuously.',
      iecRef: 'IEC 61724-1 §6.2',
      target: 18,
      sparkline: sparkFor(inputs.history, cf, curr.CF),
    },
    {
      label: 'Self-Sufficiency',
      value: Math.round(curr.SS * 10) / 10,
      unit: '%',
      trend: prev ? trendPct(curr.SS, prev.SS) : 0,
      trendIsGood: true,
      description: 'Fraction of load met by own PV generation and battery. Key for off-grid viability.',
      iecRef: 'IEC 61724-1 §6.6',
      target: 85,
      sparkline: sparkFor(inputs.history, ss, curr.SS),
    },
    {
      label: 'Self-Consumption',
      value: Math.round(curr.SC * 10) / 10,
      unit: '%',
      trend: prev ? trendPct(curr.SC, prev.SC) : 0,
      trendIsGood: true,
      description: 'Fraction of PV generation used on-site rather than exported. Maximise to reduce tariff exposure.',
      iecRef: 'IEC 61724-1 §6.7',
      target: 75,
      sparkline: sparkFor(inputs.history, sc, curr.SC),
    },
    {
      label: 'CO\u2082 Avoided',
      value: Math.round(curr.CO2),
      unit: 'kg/yr',
      trend: prev ? trendPct(curr.CO2, prev.CO2) : 0,
      trendIsGood: true,
      description: `Grid emission displacement at ${GRID_EMISSION_FACTOR_KG_KWH} kg CO\u2082/kWh (Kenya national grid factor).`,
      iecRef: 'IEC TR 63061',
      sparkline: sparkFor(inputs.history, co2, curr.CO2),
    },
  ];
}

/**
 * Generate demo KPI inputs from current energy store values.
 * Used when live readings are unavailable.
 */
export function demoKpiInputs(): KpiInputs {
  return {
    pvYieldKwh:    14280,
    loadKwh:       12600,
    gridImportKwh:  1890,
    gridExportKwh:  2940,
    pvCapacityKwp:  10,
    peakSunHours:  1820,
    periodHours:   8760,
    prev: {
      pvYieldKwh:    13650,
      loadKwh:       12100,
      gridImportKwh:  2100,
      gridExportKwh:  2550,
      pvCapacityKwp:  10,
      peakSunHours:  1780,
      periodHours:   8760,
    },
    history: [
      [12800, 11200, 2400, 2200, 10, 1680, 8760],
      [13100, 11600, 2200, 2350, 10, 1720, 8760],
      [13400, 11900, 2050, 2480, 10, 1760, 8760],
      [13650, 12100, 2100, 2550, 10, 1780, 8760],
      [14000, 12400, 1950, 2800, 10, 1800, 8760],
      [13900, 12300, 2000, 2700, 10, 1790, 8760],
      [14100, 12500, 1920, 2850, 10, 1810, 8760],
    ],
  };
}
