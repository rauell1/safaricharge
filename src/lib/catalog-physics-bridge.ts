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
  const m = raw.match(/[\-−–](\d+\.?\d*)\s*%/);
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
    // BNPI bifacial gain: parse from spec if available (e.g. rear 135 W/m² → ~10 %)
    // Use the fixed BIFACIAL_GAIN_FACTOR from config.ts as the authoritative value;
    // the catalog entry corroborates it rather than overriding it.
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
    // Try to find an efficiency spec in the catalog entry specs
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
    // MPPT efficiency: kept at config default (>99 % industry standard)
    // unless the catalog entry explicitly states otherwise.
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

  if (batteryEntry) {
    // LiFePO₄ round-trip efficiency is typically 95–97 %.
    // Kept at config default unless a specific spec string is found.
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
    undefined,                       // Deye inverter not in catalog yet; uses config.ts
    undefined                        // BYD/Pylontech not in catalog yet; uses config.ts
  );
