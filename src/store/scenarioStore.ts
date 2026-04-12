/**
 * Scenario Management Store
 * ─────────────────────────
 * Manages the full lifecycle of system-sizing scenarios:
 *   - Create / clone / rename / delete
 *   - Edit parameters (PV array, battery, load, tariff)
 *   - Run comparison engine (NPV, LCOE, self-sufficiency, payback)
 *   - Persist active scenario list to localStorage (in-memory fallback for sandbox)
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// ─── Types ──────────────────────────────────────────────────────────────────

export type BatteryChemistry = 'lfp' | 'nmc' | 'lead_acid';
export type TariffType = 'flat' | 'tou' | 'feed_in';

export interface ScenarioConfig {
  // PV array
  pvCapacityKwp: number;
  pvPanelEfficiency: number;      // 0–1
  pvSystemLosses: number;         // 0–1  (wiring, shading, mismatch)
  pvTiltDeg: number;
  pvAzimuthDeg: number;

  // Battery
  batteryCapacityKwh: number;
  batteryChemistry: BatteryChemistry;
  batteryRoundTripEfficiency: number; // 0–1
  batteryMaxDodPct: number;          // 0–100
  batteryCycleLifeAt80Dod: number;

  // Load
  annualLoadKwh: number;
  peakLoadKw: number;
  loadGrowthPctPerYear: number;   // e.g. 3 = 3 %/yr

  // Tariff
  tariffType: TariffType;
  importTariffKwhRate: number;    // KES / kWh
  exportTariffKwhRate: number;    // KES / kWh (feed-in)
  annualTariffEscalationPct: number;

  // Financials
  pvCapexPerKwp: number;          // KES / kWp
  batteryCapexPerKwh: number;     // KES / kWh
  omCostPerYearKes: number;
  discountRatePct: number;        // e.g. 10
  projectLifeYears: number;       // e.g. 25
  vatPct: number;                 // e.g. 16

  // Site (Nairobi defaults)
  siteLatitude: number;
  siteLongitude: number;
  specificYieldKwhPerKwp: number; // e.g. 1400 (from pvlib or SAM)
}

export interface ScenarioResults {
  // Energy
  annualPvYieldKwh: number;
  selfSufficiencyPct: number;
  selfConsumptionPct: number;
  gridImportKwh: number;
  gridExportKwh: number;
  batteryThroughputKwhPerYear: number;
  performanceRatioPct: number;

  // Financial (KES)
  totalCapexKes: number;
  annualSavingsKes: number;
  simplePaybackYears: number;
  npv25Kes: number;
  irr25Pct: number;
  lcoeKesPerKwh: number;
  co2SavedKgPerYear: number;

  // Battery life
  estimatedBatteryLifeYears: number;
}

export interface Scenario {
  id: string;
  name: string;
  createdAt: string;     // ISO
  updatedAt: string;     // ISO
  config: ScenarioConfig;
  results: ScenarioResults | null;
  isCalculating: boolean;
  error: string | null;
  colour: string;        // chart series colour
  isPinned: boolean;     // pinned scenarios stay visible in comparison
}

interface ScenarioState {
  scenarios: Scenario[];
  activeScenarioId: string | null;
  comparisonIds: string[];           // up to 4 scenarios for side-by-side
  comparisonMetric: keyof ScenarioResults;

  // Actions
  createScenario: (name?: string, base?: Partial<ScenarioConfig>) => string;
  cloneScenario: (id: string) => string;
  deleteScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  updateConfig: (id: string, patch: Partial<ScenarioConfig>) => void;
  runCalculation: (id: string) => Promise<void>;
  setActive: (id: string) => void;
  toggleComparison: (id: string) => void;
  clearComparison: () => void;
  setComparisonMetric: (metric: keyof ScenarioResults) => void;
  pinScenario: (id: string, pinned: boolean) => void;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const NAIROBI_DEFAULTS: ScenarioConfig = {
  pvCapacityKwp: 10,
  pvPanelEfficiency: 0.20,
  pvSystemLosses: 0.14,
  pvTiltDeg: 5,
  pvAzimuthDeg: 0,

  batteryCapacityKwh: 20,
  batteryChemistry: 'lfp',
  batteryRoundTripEfficiency: 0.95,
  batteryMaxDodPct: 90,
  batteryCycleLifeAt80Dod: 4000,

  annualLoadKwh: 14600,   // ~40 kWh/day
  peakLoadKw: 8,
  loadGrowthPctPerYear: 3,

  tariffType: 'flat',
  importTariffKwhRate: 25,   // KES 25/kWh (Kenya Power approx)
  exportTariffKwhRate: 10,
  annualTariffEscalationPct: 5,

  pvCapexPerKwp: 85000,       // KES 85k/kWp installed
  batteryCapexPerKwh: 35000,  // KES 35k/kWh
  omCostPerYearKes: 30000,
  discountRatePct: 10,
  projectLifeYears: 25,
  vatPct: 16,

  siteLatitude: -1.286,
  siteLongitude: 36.817,
  specificYieldKwhPerKwp: 1400,
};

const CHART_COLOURS = [
  '#0a4a3a', '#e8920a', '#2d6a9f', '#a12c7b',
  '#4a7c59', '#e8c20a', '#6d4abd', '#c44b2b',
];

const GRID_EMISSION_FACTOR = 0.339; // kg CO₂/kWh (Kenya national grid)

// ─── Calculation engine (client-side simplified model) ────────────────────────
// A lightweight analytical model suitable for scenario comparison.
// For bankability-grade numbers the forecasting micro-service (pvlib/SAM) is used.

function calcResults(cfg: ScenarioConfig): ScenarioResults {
  const {
    pvCapacityKwp, specificYieldKwhPerKwp, pvSystemLosses,
    batteryCapacityKwh, batteryChemistry, batteryRoundTripEfficiency,
    batteryMaxDodPct, batteryCycleLifeAt80Dod,
    annualLoadKwh, loadGrowthPctPerYear,
    importTariffKwhRate, exportTariffKwhRate, annualTariffEscalationPct,
    pvCapexPerKwp, batteryCapexPerKwh, omCostPerYearKes,
    discountRatePct, projectLifeYears, vatPct,
  } = cfg;

  // Energy
  const annualPvYieldKwh   = pvCapacityKwp * specificYieldKwhPerKwp * (1 - pvSystemLosses);
  const usableBatteryKwh   = batteryCapacityKwh * (batteryMaxDodPct / 100) * batteryRoundTripEfficiency;
  // Simple dispatch: PV covers load first, surplus charges battery, surplus exports
  const directUseKwh       = Math.min(annualPvYieldKwh, annualLoadKwh);
  const surplusAfterLoad   = Math.max(0, annualPvYieldKwh - annualLoadKwh);
  const chargedToStore     = Math.min(surplusAfterLoad, usableBatteryKwh * 365 * 0.8);
  const exportedKwh        = Math.max(0, surplusAfterLoad - chargedToStore);
  const fromBattery        = Math.min(chargedToStore * batteryRoundTripEfficiency, Math.max(0, annualLoadKwh - directUseKwh));
  const gridImportKwh      = Math.max(0, annualLoadKwh - directUseKwh - fromBattery);
  const selfConsumptionPct = Math.min(100, ((directUseKwh + fromBattery) / annualPvYieldKwh) * 100);
  const selfSufficiencyPct = Math.min(100, ((directUseKwh + fromBattery) / annualLoadKwh) * 100);
  const batteryThroughput  = chargedToStore;
  const performanceRatioPct = (annualPvYieldKwh / (pvCapacityKwp * specificYieldKwhPerKwp)) * 100;

  // Financials (KES)
  const capexPv      = pvCapacityKwp * pvCapexPerKwp * (1 + vatPct / 100);
  const capexBattery = batteryCapacityKwh * batteryCapexPerKwh * (1 + vatPct / 100);
  const totalCapex   = capexPv + capexBattery;

  // Year-1 savings (reduced imports + feed-in revenue)
  const yr1ImportSavings = (annualLoadKwh - gridImportKwh) * importTariffKwhRate - annualLoadKwh * importTariffKwhRate;
  const yr1FeedIn        = exportedKwh * exportTariffKwhRate;
  const yr1GrossImportSavings = gridImportKwh === 0
    ? annualLoadKwh * importTariffKwhRate    // full displacement
    : (annualLoadKwh - gridImportKwh) * importTariffKwhRate;
  const yr1Savings = yr1GrossImportSavings + yr1FeedIn;

  const simplePayback = yr1Savings > 0 ? totalCapex / yr1Savings : 999;

  // NPV & IRR over project life
  const r = discountRatePct / 100;
  let npv = -totalCapex;
  let cashFlows: number[] = [-totalCapex];
  let load = annualLoadKwh;
  let tariff = importTariffKwhRate;
  let export_ = exportTariffKwhRate;
  for (let y = 1; y <= projectLifeYears; y++) {
    load   *= (1 + loadGrowthPctPerYear / 100);
    tariff *= (1 + annualTariffEscalationPct / 100);
    export_ *= (1 + annualTariffEscalationPct / 100);
    const savings = (load * selfSufficiencyPct / 100) * tariff + exportedKwh * export_ - omCostPerYearKes;
    npv += savings / Math.pow(1 + r, y);
    cashFlows.push(savings);
  }

  // IRR via Newton's method
  let irr = 0.15;
  for (let iter = 0; iter < 50; iter++) {
    let f = 0, df = 0;
    cashFlows.forEach((cf, t) => {
      f  += cf / Math.pow(1 + irr, t);
      df -= t * cf / Math.pow(1 + irr, t + 1);
    });
    const step = f / df;
    irr -= step;
    if (Math.abs(step) < 1e-7) break;
  }

  // LCOE = total lifetime cost / total lifetime yield
  let lcoeNum = totalCapex;
  let lcoeDen = 0;
  for (let y = 1; y <= projectLifeYears; y++) {
    lcoeNum += omCostPerYearKes / Math.pow(1 + r, y);
    lcoeDen += annualPvYieldKwh / Math.pow(1 + r, y);
  }
  const lcoe = lcoeDen > 0 ? lcoeNum / lcoeDen : 0;

  // Battery life
  const dailyCycles = batteryThroughput / 365 / usableBatteryKwh;
  const batteryLifeYears = dailyCycles > 0
    ? batteryCycleLifeAt80Dod / (dailyCycles * 365)
    : 25;

  // Chemistry-based life adjustment
  const chemAdj: Record<BatteryChemistry, number> = { lfp: 1.0, nmc: 0.85, lead_acid: 0.55 };
  const adjBatteryLife = batteryLifeYears * chemAdj[batteryChemistry];

  const co2Saved = gridImportKwh > 0
    ? (annualLoadKwh - gridImportKwh) * GRID_EMISSION_FACTOR
    : annualLoadKwh * GRID_EMISSION_FACTOR;

  return {
    annualPvYieldKwh:           Math.round(annualPvYieldKwh),
    selfSufficiencyPct:         Math.round(selfSufficiencyPct * 10) / 10,
    selfConsumptionPct:         Math.round(selfConsumptionPct * 10) / 10,
    gridImportKwh:              Math.round(gridImportKwh),
    gridExportKwh:              Math.round(exportedKwh),
    batteryThroughputKwhPerYear: Math.round(batteryThroughput),
    performanceRatioPct:        Math.round(performanceRatioPct * 10) / 10,
    totalCapexKes:              Math.round(totalCapex),
    annualSavingsKes:           Math.round(yr1Savings),
    simplePaybackYears:         Math.round(simplePayback * 10) / 10,
    npv25Kes:                   Math.round(npv),
    irr25Pct:                   Math.round(irr * 1000) / 10,
    lcoeKesPerKwh:              Math.round(lcoe * 10) / 10,
    co2SavedKgPerYear:          Math.round(co2Saved),
    estimatedBatteryLifeYears:  Math.round(adjBatteryLife * 10) / 10,
  };
}

// ─── Store ───────────────────────────────────────────────────────────────────

let colourIndex = 0;
const nextColour = () => CHART_COLOURS[colourIndex++ % CHART_COLOURS.length];

const makeScenario = (name: string, config: ScenarioConfig): Scenario => ({
  id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  name,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  config,
  results: null,
  isCalculating: false,
  error: null,
  colour: nextColour(),
  isPinned: false,
});

export const useScenarioStore = create<ScenarioState>()(immer((set, get) => ({
  scenarios: [
    (() => {
      const s = makeScenario('Baseline (10 kWp / 20 kWh)', NAIROBI_DEFAULTS);
      s.results = calcResults(NAIROBI_DEFAULTS);
      return s;
    })(),
  ],
  activeScenarioId: null,
  comparisonIds: [],
  comparisonMetric: 'npv25Kes',

  createScenario(name, base) {
    const cfg = { ...NAIROBI_DEFAULTS, ...base };
    const s = makeScenario(name ?? `Scenario ${get().scenarios.length + 1}`, cfg);
    set(state => { state.scenarios.push(s); state.activeScenarioId = s.id; });
    return s.id;
  },

  cloneScenario(id) {
    const src = get().scenarios.find(s => s.id === id);
    if (!src) return '';
    const clone = makeScenario(`${src.name} (copy)`, { ...src.config });
    clone.results = src.results ? { ...src.results } : null;
    set(state => { state.scenarios.push(clone); state.activeScenarioId = clone.id; });
    return clone.id;
  },

  deleteScenario(id) {
    set(state => {
      state.scenarios = state.scenarios.filter(s => s.id !== id);
      state.comparisonIds = state.comparisonIds.filter(cid => cid !== id);
      if (state.activeScenarioId === id) state.activeScenarioId = state.scenarios[0]?.id ?? null;
    });
  },

  renameScenario(id, name) {
    set(state => {
      const s = state.scenarios.find(s => s.id === id);
      if (s) { s.name = name; s.updatedAt = new Date().toISOString(); }
    });
  },

  updateConfig(id, patch) {
    set(state => {
      const s = state.scenarios.find(s => s.id === id);
      if (s) {
        Object.assign(s.config, patch);
        s.updatedAt = new Date().toISOString();
        s.results = null; // invalidate until recalculated
      }
    });
  },

  async runCalculation(id) {
    set(state => {
      const s = state.scenarios.find(s => s.id === id);
      if (s) { s.isCalculating = true; s.error = null; }
    });
    // Simulate async (in production this would call /api/forecast/scenario)
    await new Promise(r => setTimeout(r, 600));
    set(state => {
      const s = state.scenarios.find(s => s.id === id);
      if (!s) return;
      try {
        s.results = calcResults(s.config);
      } catch (err) {
        s.error = String(err);
      } finally {
        s.isCalculating = false;
        s.updatedAt = new Date().toISOString();
      }
    });
  },

  setActive(id) {
    set(state => { state.activeScenarioId = id; });
  },

  toggleComparison(id) {
    set(state => {
      const idx = state.comparisonIds.indexOf(id);
      if (idx >= 0) {
        state.comparisonIds.splice(idx, 1);
      } else if (state.comparisonIds.length < 4) {
        state.comparisonIds.push(id);
      }
    });
  },

  clearComparison() {
    set(state => { state.comparisonIds = []; });
  },

  setComparisonMetric(metric) {
    set(state => { state.comparisonMetric = metric; });
  },

  pinScenario(id, pinned) {
    set(state => {
      const s = state.scenarios.find(s => s.id === id);
      if (s) s.isPinned = pinned;
    });
  },
})));
