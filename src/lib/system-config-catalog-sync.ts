import type { SolarComponentEntry } from './solar-component-catalog';
import type { SystemConfiguration } from './system-config';
import {
  BATTERY_MODULE_CATALOG,
  resolveBatteryBankConfig,
} from './catalog-physics-bridge';

function parseMaxEfficiency(entry: SolarComponentEntry): number | undefined {
  const raw = entry.specs.find((s) => /max efficiency|efficiency/i.test(s.label))?.value;
  if (!raw) return undefined;
  const m = raw.match(/(\d+\.?\d*)\s*%/);
  if (!m) return undefined;
  const pct = Number(m[1]);
  return Number.isFinite(pct) ? pct / 100 : undefined;
}

function parseInverterKw(entry: SolarComponentEntry): number | undefined {
  const fromModel = entry.model.match(/(\d+\.?\d*)\s*kW/i);
  if (fromModel) return Number(fromModel[1]);
  const fromSpec = entry.specs.find((s) => /ac nominal power|rated power/i.test(s.label))?.value.match(/(\d+\.?\d*)\s*kW/i);
  return fromSpec ? Number(fromSpec[1]) : undefined;
}

export function applyCatalogComponentToSystemConfig(
  base: SystemConfiguration,
  entry: SolarComponentEntry
): SystemConfiguration {
  if (entry.category === 'Solar Module') {
    return { ...base, installedModuleId: entry.id };
  }

  if (entry.category === 'Inverter') {
    const kw = parseInverterKw(entry) ?? base.inverter.capacityKw;
    const phase = /three-phase|three phase|3-phase|3Ø/i.test(`${entry.model} ${entry.summary}`) ? 'three' : 'single';
    const maxEfficiency = parseMaxEfficiency(entry) ?? base.inverter.maxEfficiency;
    return {
      ...base,
      installedInverterId: entry.id,
      inverter: {
        ...base.inverter,
        capacityKw: kw,
        phase,
        voltage: phase === 'three' ? 'high' : 'low',
        maxEfficiency,
      },
    };
  }

  if (entry.category === 'Battery Storage') {
    const moduleSpec = BATTERY_MODULE_CATALOG.find((s) => s.catalogId === entry.id || s.id === entry.id);
    if (!moduleSpec) {
      return { ...base, installedBatteryId: entry.id };
    }
    const modules = base.battery.bankModules ?? moduleSpec.minModules;
    const resolved = resolveBatteryBankConfig(moduleSpec, modules);
    return {
      ...base,
      installedBatteryId: entry.id,
      battery: {
        ...base.battery,
        ...resolved,
      },
    };
  }

  return base;
}
