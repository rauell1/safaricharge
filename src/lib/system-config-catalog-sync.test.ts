import { describe, expect, it } from 'vitest';

import { SOLAR_COMPONENT_CATALOG } from './solar-component-catalog';
import { applyCatalogComponentToSystemConfig } from './system-config-catalog-sync';
import { DEFAULT_SYSTEM_CONFIG } from './system-config';

describe('applyCatalogComponentToSystemConfig', () => {
  it('applies inverter catalog preset into system configuration', () => {
    const inverter = SOLAR_COMPONENT_CATALOG.find((entry) => entry.id === 'sungrow-sh8rs');
    expect(inverter).toBeDefined();

    const next = applyCatalogComponentToSystemConfig(DEFAULT_SYSTEM_CONFIG, inverter!);
    expect(next.installedInverterId).toBe('sungrow-sh8rs');
    expect(next.inverter.capacityKw).toBeCloseTo(8);
    expect(next.inverter.phase).toBe('single');
    expect(next.inverter.maxEfficiency).toBeCloseTo(0.977, 3);
  });

  it('applies battery module catalog and recomputes totals from modules', () => {
    const battery = SOLAR_COMPONENT_CATALOG.find((entry) => entry.id === 'pylontech-us5000');
    expect(battery).toBeDefined();

    const seeded = {
      ...DEFAULT_SYSTEM_CONFIG,
      battery: {
        ...DEFAULT_SYSTEM_CONFIG.battery,
        bankModules: 3,
      },
    };

    const next = applyCatalogComponentToSystemConfig(seeded, battery!);
    expect(next.installedBatteryId).toBe('pylontech-us5000');
    expect(next.battery.capacityKwh).toBeCloseTo(14.4, 1);
    expect(next.battery.maxChargeKw).toBeCloseTo(7.2, 1);
    expect(next.battery.maxDischargeKw).toBeCloseTo(7.2, 1);
    expect(next.battery.chemistry).toBe('lifepo4');
  });
});
