import type { SystemConfiguration } from '@/lib/system-config';
import {
  SOLAR_COMPONENT_CATALOG,
  type SolarComponentEntry,
  type SolarComponentCategory,
} from '@/lib/solar-component-catalog';

/**
 * Normalised summary for a single installed component
 * (module, inverter, or battery).
 */
export interface InstalledComponentSummary {
  /** 'module' | 'inverter' | 'battery' */
  role: 'module' | 'inverter' | 'battery';
  /** Catalog id, if wired (e.g. 'jinko-tiger-neo-66hl4m-bdv') */
  catalogId?: string;
  /** Brand from catalog, or fallback label. */
  brand: string;
  /** Model/family name from catalog, or fallback label. */
  model: string;
  /** Catalog category ('Solar Module' | 'Inverter' | 'Battery Storage' ...) */
  category?: SolarComponentCategory;
  /** Human-readable description for UI tooltips. */
  summary?: string;
  /** Datasheet URL, suitable for "View datasheet" links. */
  datasheetUrl?: string;
  /** Install/owner manual URL. */
  manualUrl?: string;

  /** Electrical / sizing details taken from SystemConfiguration. */
  sizing: {
    /** PV DC capacity (kWp) for modules; inverter AC capacity for inverters. */
    capacityKw?: number;
    /** Battery usable capacity (kWh). */
    capacityKwh?: number;
    /** Max continuous charge power (kW). */
    maxChargeKw?: number;
    /** Max continuous discharge power (kW). */
    maxDischargeKw?: number;
    /** Array panel count & panel wattage for modules. */
    panelCount?: number;
    panelWattage?: number;
    /**
     * Battery bank module count.
     * Set when config.battery.bankModules is defined.
     * Used to render labels like "4 × Pylontech US5000 (19.2 kWh total)".
     */
    bankModules?: number;
  };

  /** Optional flags useful for badges / filters. */
  flags: {
    /** True when this entry can be resolved in catalog. */
    fromCatalog: boolean;
    /** True when this looks like a hybrid inverter (rough heuristic). */
    hybridInverter?: boolean;
  };
}

/** Internal helper: find a catalog entry by id (case-insensitive). */
function findEntry(id?: string): SolarComponentEntry | undefined {
  if (!id) return undefined;
  const needle = id.toLowerCase();
  return SOLAR_COMPONENT_CATALOG.find((e) => e.id.toLowerCase() === needle);
}

/**
 * Build a fully-resolved list of installed components from the current system config.
 * This is the single source of truth for the config panel, docs hub, and any
 * "Installed Components" table in the dashboard UI.
 *
 * Each row is derived from SystemConfiguration (for electrical sizing) + the
 * SOLAR_COMPONENT_CATALOG entry (for brand, model, datasheet URLs). Any
 * component without a catalogId falls back to human-readable sizing labels.
 */
export function buildInstalledComponentSummaries(
  config: SystemConfiguration
): InstalledComponentSummary[] {
  const summaries: InstalledComponentSummary[] = [];

  // ── PV Module ─────────────────────────────────────────────────────────────
  {
    const entry = findEntry(config.installedModuleId);
    summaries.push({
      role: 'module',
      catalogId: config.installedModuleId,
      brand: entry?.brand ?? 'PV Array',
      model: entry?.model ?? `${config.solar.totalCapacityKw.toFixed(1)} kWp`,
      category: entry?.category,
      summary: entry?.summary,
      datasheetUrl: entry?.datasheetUrl,
      manualUrl: entry?.manualUrl,
      sizing: {
        capacityKw: config.solar.totalCapacityKw,
        panelCount: config.solar.panelCount,
        panelWattage: config.solar.panelWattage,
      },
      flags: {
        fromCatalog: !!entry,
      },
    });
  }

  // ── Inverter ──────────────────────────────────────────────────────────────
  {
    const entry = findEntry(config.installedInverterId);
    const modelSuffix = `${config.inverter.capacityKw.toFixed(1)} kW ${config.inverter.phase}-phase`;
    summaries.push({
      role: 'inverter',
      catalogId: config.installedInverterId,
      brand: entry?.brand ?? 'Inverter',
      model: entry?.model ?? modelSuffix,
      category: entry?.category,
      summary: entry?.summary,
      datasheetUrl: entry?.datasheetUrl,
      manualUrl: entry?.manualUrl,
      sizing: {
        capacityKw: config.inverter.capacityKw,
      },
      flags: {
        fromCatalog: !!entry,
        hybridInverter:
          !!entry &&
          /hybrid|gen24|sg0|et|eh|hybrid inverter/i.test(
            `${entry.model} ${entry.summary}`
          ),
      },
    });
  }

  // ── Battery ───────────────────────────────────────────────────────────────
  {
    const entry = findEntry(config.installedBatteryId);
    const modelSuffix = `${config.battery.capacityKwh.toFixed(1)} kWh ${config.battery.chemistry}`;
    summaries.push({
      role: 'battery',
      catalogId: config.installedBatteryId,
      brand: entry?.brand ?? 'Battery Bank',
      model: entry?.model ?? modelSuffix,
      category: entry?.category,
      summary: entry?.summary,
      datasheetUrl: entry?.datasheetUrl,
      manualUrl: entry?.manualUrl,
      sizing: {
        capacityKwh: config.battery.capacityKwh,
        maxChargeKw: config.battery.maxChargeKw,
        maxDischargeKw: config.battery.maxDischargeKw,
        // bankModules: if config carries the module count, surface it
        // so the UI can render "4 × Pylontech US5000" labels.
        bankModules: (config.battery as { bankModules?: number }).bankModules,
      },
      flags: {
        fromCatalog: !!entry,
      },
    });
  }

  return summaries;
}
