/**
 * catalog-physics-bridge.ts
 *
 * Bridges SOLAR_COMPONENT_CATALOG datasheet specs → physics-engine parameters.
 *
 * The catalog stores verified manufacturer spec strings (e.g. "−0.29 %/°C").
 * This module parses those strings into numeric physics constants so the
 * simulation reflects the actual installed components rather than generic
 * industry defaults.
 *
 * Usage:
 *   import { resolveCatalogPhysicsParams } from '@/lib/catalog-physics-bridge';
 *   const params = resolveCatalogPhysicsParams(installedModuleId, installedInverterId, installedBatteryId);
 *   // pass `params` into calculateInstantPhysics
 */

import {
  SOLAR_COMPONENT_CATALOG,
  type SolarComponentEntry,
} from '@/lib/solar-component-catalog';
import {
  PANEL_TEMP_COEFFICIENT_PER_DEG_C,
  PANEL_ANNUAL_DEGRADATION_RATE,
  PANEL_FIRST_YEAR_DEGRADATION,
  BIFACIAL_GAIN_FACTOR,
  INVERTER_MAX_EFFICIENCY,
  MPPT_EFFICIENCY,
  BATTERY_ROUND_TRIP_EFFICIENCY,
} from '@/lib/config';

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

/**
 * Physics parameters resolved from catalog specs.
 * All values fall back to config.ts constants when a catalog entry is
 * not found or its spec string cannot be parsed.
 */
export interface CatalogPhysicsParams {
  /** PV temperature derating per °C above 25 °C (negative fraction, e.g. −0.0029). */
  panelTempCoefficientPerDegC: number;
  /** First-year LID/LeTID degradation fraction (e.g. 0.01 = 1 %). */
  panelFirstYearDegradation: number;
  /** Annual linear degradation after year 1 (fraction, e.g. 0.004 = 0.40 %/yr). */
  panelAnnualDegradationRate: number;
  /** Whether the installed module is bifacial. */
  isBifacial: boolean;
  /** Bifacial rear-side energy gain (fraction, e.g. 0.10 = 10 %). */
  bifacialGainFactor: number;
  /** Inverter max efficiency (fraction, e.g. 0.976). */
  inverterMaxEfficiency: number;
  /** MPPT tracker efficiency (fraction, e.g. 0.99). */
  mpptEfficiency: number;
  /** Battery round-trip efficiency (fraction, e.g. 0.96). */
  batteryRoundTripEfficiency: number;
  /** Debug: source labels used (for logging/diagnostics). */
  sources: {
    module: string;
    inverter: string;
    battery: string;
  };
}

// ---------------------------------------------------------------------------
// Internal parsers
// ---------------------------------------------------------------------------

/** Find a catalog entry by id (case-insensitive). */
function findEntry(id: string): SolarComponentEntry | undefined {
  return SOLAR_COMPONENT_CATALOG.find(
    (e) => e.id.toLowerCase() === id.toLowerCase()
  );
}

/** Find the first spec value matching a label substring (case-insensitive). */
function findSpec(entry: SolarComponentEntry, labelFragment: string): string | undefined {
  const frag = labelFragment.toLowerCase();
  return entry.specs.find((s) => s.label.toLowerCase().includes(frag))?.value;
}

/**
 * Parse a temperature coefficient spec string like "−0.29 %/°C" or "-0.40 %/°C".
 * Returns the value as a negative fraction (e.g. −0.0029) or undefined on failure.
 */
function parseTempCoeff(raw: string): number | undefined {
  // Match optional minus/dash variants followed by decimal digits
  const m = raw.match(/[\-\u2212\u2013](\d+\.?\d*)\s*%/);
  if (!m) return undefined;
  const pct = parseFloat(m[1]);
  return isNaN(pct) ? undefined : -(pct / 100);
}

/**
 * Parse a degradation spec string like "1 % / 0.40 %/yr" → { yr1: 0.01, annual: 0.004 }.
 * Falls back to undefined when format not recognised.
 */
function parseDegradation(raw: string): { yr1: number; annual: number } | undefined {
  // Format: "<yr1> % / <annual> %/yr"
  const m = raw.match(/(\d+\.?\d*)\s*%\s*\/\s*(\d+\.?\d*)\s*%/);
  if (!m) return undefined;
  const yr1 = parseFloat(m[1]);
  const annual = parseFloat(m[2]);
  return isNaN(yr1) || isNaN(annual) ? undefined : { yr1: yr1 / 100, annual: annual / 100 };
}

/**
 * Parse an inverter efficiency string like "97.6 %" → 0.976.
 */
function parseEfficiency(raw: string): number | undefined {
  const m = raw.match(/(\d+\.?\d*)\s*%/);
  if (!m) return undefined;
  const pct = parseFloat(m[1]);
  return isNaN(pct) ? undefined : pct / 100;
}

/**
 * Determine whether a catalog module entry is bifacial from its model name
 * or spec labels (looks for 'bifacial', 'BDV', 'dual-glass', 'BNPI').
 */
function detectBifacial(entry: SolarComponentEntry): boolean {
  const text = [
    entry.model,
    entry.summary,
    ...entry.specs.map((s) => s.value),
  ]
    .join(' ')
    .toLowerCase();
  return /bifacial|bdv|dual.glass|bnpi/.test(text);
}

// ---------------------------------------------------------------------------
// Battery datasheet library
// ---------------------------------------------------------------------------
// Real-world round-trip efficiency (RTE) values from manufacturer datasheets.
// Keyed by catalog ID. Used as the primary source when the catalog entry does
// not have an explicit efficiency spec string (most battery entries only list
// chemistry and capacity; RTE is documented in installation manuals).

const BATTERY_RTE_LIBRARY: Record<string, number> = {
  // BYD Battery-Box Premium HVS series — datasheet: 96 % RTE (LFP)
  'byd-hvs':                   0.96,
  'byd-hvs-5.1':               0.96,
  'byd-hvs-10.2':              0.96,
  'byd-hvs-15.4':              0.96,
  // BYD Battery-Box Premium HVM series — datasheet: 96 % RTE
  'byd-hvm':                   0.96,
  'byd-hvm-8.3':               0.96,
  'byd-hvm-11.0':              0.96,
  'byd-hvm-13.8':              0.96,
  'byd-hvm-16.6':              0.96,
  'byd-hvm-22.1':              0.96,
  // Pylontech US5000 — datasheet: ≥96 % RTE (LFP, 48V)
  'pylontech-us5000':          0.96,
  'pylontech-up5000':          0.96,
  // Sungrow SBR series — datasheet: 96 % RTE (LFP)
  'sungrow-sbr096':            0.96,
  'sungrow-sbr128':            0.96,
  'sungrow-sbr160':            0.96,
  'sungrow-sbr192':            0.96,
  'sungrow-sbr224':            0.96,
  'sungrow-sbr256':            0.96,
  // Tesla Powerwall 3 — datasheet: 90 % RTE (AC-coupled, NMC)
  'tesla-powerwall-3':         0.90,
  // CATL Tener — datasheet: 95 % RTE (LFP)
  'catl-tener':                0.95,
  'catl-tener-5mwh':           0.95,
  // Huawei LUNA2000 — datasheet: 95.5 % RTE
  'huawei-luna2000':           0.955,
  // Alpha ESS Smile B3 / B5 — datasheet: 95.2 % RTE
  'alpha-ess-smile-b3':        0.952,
  'alpha-ess-smile-b5':        0.952,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve physics simulation parameters from installed catalog component IDs.
 *
 * @param moduleId    - SOLAR_COMPONENT_CATALOG id for the installed PV module.
 * @param inverterId  - SOLAR_COMPONENT_CATALOG id for the installed inverter.
 * @param batteryId   - SOLAR_COMPONENT_CATALOG id for the installed battery.
 *
 * Any id that is not found in the catalog falls back to the constants in
 * config.ts, so the simulation always has valid numeric inputs.
 */
export function resolveCatalogPhysicsParams(
  moduleId?: string,
  inverterId?: string,
  batteryId?: string
): CatalogPhysicsParams {
  // ── Module ──────────────────────────────────────────────────────────────
  const moduleEntry = moduleId ? findEntry(moduleId) : undefined;
  let panelTempCoefficientPerDegC = PANEL_TEMP_COEFFICIENT_PER_DEG_C;
  let panelFirstYearDegradation = PANEL_FIRST_YEAR_DEGRADATION;
  let panelAnnualDegradationRate = PANEL_ANNUAL_DEGRADATION_RATE;
  let isBifacial = false;
  let bifacialGainFactor = BIFACIAL_GAIN_FACTOR;
  const moduleSource = moduleEntry ? `${moduleEntry.brand} ${moduleEntry.model}` : 'config.ts defaults';

  if (moduleEntry) {
    // Temperature coefficient
    const tcRaw = findSpec(moduleEntry, 'temp coeff');
    if (tcRaw) {
      const tc = parseTempCoeff(tcRaw);
      if (tc !== undefined) panelTempCoefficientPerDegC = tc;
    }

    // Degradation
    const degRaw = findSpec(moduleEntry, 'degradation');
    if (degRaw) {
      const deg = parseDegradation(degRaw);
      if (deg) {
        panelFirstYearDegradation = deg.yr1;
        panelAnnualDegradationRate = deg.annual;
      }
    }

    // Bifacial detection
    isBifacial = detectBifacial(moduleEntry);
    // Use BIFACIAL_GAIN_FACTOR from config.ts as authoritative value;
    // catalog entry corroborates rather than overriding it.
    if (isBifacial) bifacialGainFactor = BIFACIAL_GAIN_FACTOR;
  }

  // ── Inverter ────────────────────────────────────────────────────────────
  const inverterEntry = inverterId ? findEntry(inverterId) : undefined;
  let inverterMaxEfficiency = INVERTER_MAX_EFFICIENCY;
  let mpptEfficiency = MPPT_EFFICIENCY;
  const inverterSource = inverterEntry
    ? `${inverterEntry.brand} ${inverterEntry.model}`
    : 'config.ts defaults';

  if (inverterEntry) {
    const effRaw =
      findSpec(inverterEntry, 'max efficiency') ??
      findSpec(inverterEntry, 'efficiency') ??
      findSpec(inverterEntry, 'electrical details');
    if (effRaw) {
      const eff = parseEfficiency(effRaw);
      // Only accept plausible inverter efficiencies (0.90–0.999)
      if (eff !== undefined && eff >= 0.9 && eff <= 0.999) {
        inverterMaxEfficiency = eff;
      }
    }
    const mpptRaw = findSpec(inverterEntry, 'mppt');
    if (mpptRaw) {
      const mppt = parseEfficiency(mpptRaw);
      if (mppt !== undefined && mppt >= 0.95 && mppt <= 1.0) {
        mpptEfficiency = mppt;
      }
    }
  }

  // ── Battery ─────────────────────────────────────────────────────────────
  const batteryEntry = batteryId ? findEntry(batteryId) : undefined;
  let batteryRoundTripEfficiency = BATTERY_ROUND_TRIP_EFFICIENCY;
  const batterySource = batteryEntry
    ? `${batteryEntry.brand} ${batteryEntry.model}`
    : 'config.ts defaults';

  if (batteryEntry || batteryId) {
    // 1. Try the datasheet library first (most reliable for batteries
    //    whose catalog entries don't carry an explicit RTE string).
    const libId = batteryId?.toLowerCase() ?? '';
    const libRte = BATTERY_RTE_LIBRARY[libId];
    if (libRte !== undefined) {
      batteryRoundTripEfficiency = libRte;
    } else if (batteryEntry) {
      // 2. Fall back to parsing the catalog entry spec string.
      const rteRaw =
        findSpec(batteryEntry, 'round-trip') ??
        findSpec(batteryEntry, 'efficiency') ??
        findSpec(batteryEntry, 'chemistry');
      if (rteRaw) {
        const rte = parseEfficiency(rteRaw);
        if (rte !== undefined && rte >= 0.85 && rte <= 1.0) {
          batteryRoundTripEfficiency = rte;
        }
      }
    }
  }

  return {
    panelTempCoefficientPerDegC,
    panelFirstYearDegradation,
    panelAnnualDegradationRate,
    isBifacial,
    bifacialGainFactor,
    inverterMaxEfficiency,
    mpptEfficiency,
    batteryRoundTripEfficiency,
    sources: {
      module: moduleSource,
      inverter: inverterSource,
      battery: batterySource,
    },
  };
}

/**
 * Default params resolved with the catalog IDs that match the components
 * already documented in config.ts (Jinko Tiger Neo + Deye SG + LiFePO₄).
 *
 * Use this as a drop-in when no specific installed IDs are configured.
 */
export const DEFAULT_CATALOG_PHYSICS_PARAMS: CatalogPhysicsParams =
  resolveCatalogPhysicsParams(
    'jinko-tiger-neo-66hl4m-bdv',   // Jinko Tiger Neo 66HL4M-BDV — verified datasheet
    'deye-sun-sg04lp1-3-6k',         // Deye SG04LP1 series — verified datasheet
    'pylontech-us5000'               // Pylontech US5000 — 96 % RTE from datasheet library
  );

// ---------------------------------------------------------------------------
// Battery bank sizing helper
// ---------------------------------------------------------------------------

/**
 * Per-module datasheet values for battery brands/families.
 * All values verified from manufacturer installation manuals and datasheets.
 */
export interface BatteryModuleSpec {
  /** Catalog ID prefix or exact ID that this spec applies to. */
  id: string;
  /** Human-readable label (brand + family). */
  label: string;
  /** Usable energy per module (kWh). */
  usableKwh: number;
  /** Nominal voltage (V). */
  nominalVoltageV: number;
  /** Max continuous charge power per module (kW). */
  maxChargeKwPerModule: number;
  /** Max continuous discharge power per module (kW). */
  maxDischargeKwPerModule: number;
  /** Chemistry. */
  chemistry: 'lifepo4' | 'lead-acid' | 'nmc';
  /** Datasheet round-trip efficiency. */
  rte: number;
  /** Min modules in a stack. */
  minModules: number;
  /** Max modules in a stack. */
  maxModules: number;
  /** Catalog ID to assign to installedBatteryId when this module is selected. */
  catalogId: string;
}

export const BATTERY_MODULE_CATALOG: BatteryModuleSpec[] = [
  {
    id: 'byd-hvs-5.1',
    label: 'BYD Battery-Box Premium HVS 5.1 kWh',
    usableKwh: 5.1,
    nominalVoltageV: 102.4,
    maxChargeKwPerModule: 3.84,
    maxDischargeKwPerModule: 3.84,
    chemistry: 'lifepo4',
    rte: 0.96,
    minModules: 2,
    maxModules: 8,
    catalogId: 'byd-hvs-5.1',
  },
  {
    id: 'byd-hvm-2.76',
    label: 'BYD Battery-Box Premium HVM 2.76 kWh',
    usableKwh: 2.76,
    nominalVoltageV: 51.2,
    maxChargeKwPerModule: 2.76,
    maxDischargeKwPerModule: 2.76,
    chemistry: 'lifepo4',
    rte: 0.96,
    minModules: 3,
    maxModules: 8,
    catalogId: 'byd-hvm',
  },
  {
    id: 'pylontech-us5000',
    label: 'Pylontech US5000 4.8 kWh',
    usableKwh: 4.8,
    nominalVoltageV: 48,
    maxChargeKwPerModule: 2.4,
    maxDischargeKwPerModule: 2.4,
    chemistry: 'lifepo4',
    rte: 0.96,
    minModules: 1,
    maxModules: 15,
    catalogId: 'pylontech-us5000',
  },
  {
    id: 'pylontech-up5000',
    label: 'Pylontech UP5000 4.8 kWh',
    usableKwh: 4.8,
    nominalVoltageV: 48,
    maxChargeKwPerModule: 2.4,
    maxDischargeKwPerModule: 2.4,
    chemistry: 'lifepo4',
    rte: 0.96,
    minModules: 1,
    maxModules: 15,
    catalogId: 'pylontech-up5000',
  },
  {
    id: 'sungrow-sbr096',
    label: 'Sungrow SBR096 9.6 kWh',
    usableKwh: 9.6,
    nominalVoltageV: 100,
    maxChargeKwPerModule: 5.0,
    maxDischargeKwPerModule: 5.0,
    chemistry: 'lifepo4',
    rte: 0.96,
    minModules: 1,
    maxModules: 4,
    catalogId: 'sungrow-sbr096',
  },
  {
    id: 'sungrow-sbr128',
    label: 'Sungrow SBR128 12.8 kWh',
    usableKwh: 12.8,
    nominalVoltageV: 100,
    maxChargeKwPerModule: 6.4,
    maxDischargeKwPerModule: 6.4,
    chemistry: 'lifepo4',
    rte: 0.96,
    minModules: 1,
    maxModules: 4,
    catalogId: 'sungrow-sbr128',
  },
  {
    id: 'sungrow-sbr192',
    label: 'Sungrow SBR192 19.2 kWh',
    usableKwh: 19.2,
    nominalVoltageV: 100,
    maxChargeKwPerModule: 9.6,
    maxDischargeKwPerModule: 9.6,
    chemistry: 'lifepo4',
    rte: 0.96,
    minModules: 1,
    maxModules: 4,
    catalogId: 'sungrow-sbr192',
  },
  {
    id: 'sungrow-sbr256',
    label: 'Sungrow SBR256 25.6 kWh',
    usableKwh: 25.6,
    nominalVoltageV: 100,
    maxChargeKwPerModule: 12.8,
    maxDischargeKwPerModule: 12.8,
    chemistry: 'lifepo4',
    rte: 0.96,
    minModules: 1,
    maxModules: 4,
    catalogId: 'sungrow-sbr256',
  },
  {
    id: 'tesla-powerwall-3',
    label: 'Tesla Powerwall 3 (13.5 kWh)',
    usableKwh: 13.5,
    nominalVoltageV: 50,
    maxChargeKwPerModule: 11.5,
    maxDischargeKwPerModule: 11.5,
    chemistry: 'nmc',
    rte: 0.90,
    minModules: 1,
    maxModules: 10,
    catalogId: 'tesla-powerwall-3',
  },
  {
    id: 'huawei-luna2000-5',
    label: 'Huawei LUNA2000 5 kWh module',
    usableKwh: 5.0,
    nominalVoltageV: 48,
    maxChargeKwPerModule: 2.5,
    maxDischargeKwPerModule: 2.5,
    chemistry: 'lifepo4',
    rte: 0.955,
    minModules: 1,
    maxModules: 3,
    catalogId: 'huawei-luna2000',
  },
];

/**
 * Compute BatteryConfig totals from a module spec and a module count.
 *
 * Use this in the UI configurator so that SystemConfiguration is always
 * derived from (moduleSpec + bankModules) rather than entered as raw kWh.
 * The UI writes the returned object directly into config.battery.
 */
export function resolveBatteryBankConfig(
  spec: BatteryModuleSpec,
  bankModules: number
): {
  capacityKwh: number;
  maxChargeKw: number;
  maxDischargeKw: number;
  chemistry: 'lifepo4' | 'lead-acid' | 'nmc';
  voltage: 'low' | 'high';
  minReservePct: number;
  bankModules: number;
} {
  const modules = Math.max(spec.minModules, Math.min(spec.maxModules, bankModules));
  return {
    capacityKwh:      Math.round(spec.usableKwh * modules * 10) / 10,
    maxChargeKw:      Math.round(spec.maxChargeKwPerModule * modules * 10) / 10,
    maxDischargeKw:   Math.round(spec.maxDischargeKwPerModule * modules * 10) / 10,
    chemistry:        spec.chemistry,
    voltage:          spec.nominalVoltageV >= 96 ? 'high' : 'low',
    minReservePct:    20,
    bankModules:      modules,
  };
}
