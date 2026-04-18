import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defaultEVFleetConfig,
  simulateEVFleet,
} from './evMobilityEngine';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('simulateEVFleet', () => {
  it('residential: no charging outside 22:00–07:00 window', () => {
    const config = {
      ...defaultEVFleetConfig(),
      useCase: 'residential' as const,
      vehicleCount: 3,
      batteryKwh: 60,
      smartChargingEnabled: false,
      v2gEnabled: false,
    };
    const result = simulateEVFleet(
      14.5,
      [0.2, 0.25, 0.3],
      config,
      0,
      20,
      false,
      50,
      1,
    );
    expect(result.totalLoadKw).toBe(0);
  });

  it('fleet-depot: all vehicles connect after depotReturnHour', () => {
    const config = {
      ...defaultEVFleetConfig(),
      useCase: 'fleet-depot' as const,
      vehicleCount: 6,
      chargerKw: 22,
      batteryKwh: 80,
      depotReturnHour: 18,
      smartChargingEnabled: false,
    };

    const beforeReturn = simulateEVFleet(
      17.9,
      [0.3, 0.3, 0.3, 0.3, 0.3, 0.3],
      config,
      0,
      20,
      false,
      50,
      0.25,
    );
    const afterStaggerWindow = simulateEVFleet(
      18.6,
      [0.3, 0.3, 0.3, 0.3, 0.3, 0.3],
      config,
      0,
      20,
      false,
      50,
      0.25,
    );

    expect(beforeReturn.sessionCount).toBe(0);
    expect(afterStaggerWindow.sessionCount).toBe(config.vehicleCount);
  });

  it('V2G: exports only when SoC > min and peak period', () => {
    const config = {
      ...defaultEVFleetConfig(),
      useCase: 'residential' as const,
      vehicleCount: 2,
      batteryKwh: 60,
      v2gEnabled: true,
      minSocForV2g: 0.3,
      onboardInverterKw: 7,
      smartChargingEnabled: false,
    };

    const peak = simulateEVFleet(
      19,
      [0.8, 0.2],
      config,
      0,
      30,
      true,
      50,
      0.5,
    );
    const offPeak = simulateEVFleet(
      19,
      [0.8, 0.2],
      config,
      0,
      30,
      false,
      50,
      0.5,
    );

    expect(peak.v2gExportKw).toBeGreaterThan(0);
    expect(offPeak.v2gExportKw).toBe(0);
  });

  it('smart charging: shifts load toward solar surplus window', () => {
    const prevSocs = [0.4, 0.45, 0.5];
    const baseConfig = {
      ...defaultEVFleetConfig(),
      useCase: 'fleet-depot' as const,
      vehicleCount: 3,
      batteryKwh: 70,
      depotReturnHour: 18,
      chargerKw: 22,
    };

    const withoutSmart = simulateEVFleet(
      10,
      prevSocs,
      { ...baseConfig, smartChargingEnabled: false },
      30,
      12,
      false,
      50,
      1,
    );
    const withSmart = simulateEVFleet(
      10,
      prevSocs,
      { ...baseConfig, smartChargingEnabled: true },
      30,
      12,
      false,
      50,
      1,
    );

    expect(withoutSmart.totalLoadKw).toBe(0);
    expect(withSmart.totalLoadKw).toBeGreaterThan(0);
  });

  it('demand response: sheds 50% of EV load below 49.8Hz', () => {
    const config = {
      ...defaultEVFleetConfig(),
      useCase: 'residential' as const,
      vehicleCount: 2,
      batteryKwh: 60,
      smartChargingEnabled: false,
      v2gEnabled: false,
    };
    const normal = simulateEVFleet(
      23,
      [0.2, 0.2],
      config,
      0,
      25,
      false,
      50,
      1,
    );
    const shed = simulateEVFleet(
      23,
      [0.2, 0.2],
      config,
      0,
      25,
      false,
      49.7,
      1,
    );

    expect(shed.demandResponseShedKw).toBeCloseTo(normal.totalLoadKw * 0.5, 6);
    expect(shed.totalLoadKw).toBeCloseTo(normal.totalLoadKw * 0.5, 6);
  });

  it('public-station: session count never exceeds vehicleCount', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const config = {
      ...defaultEVFleetConfig(),
      useCase: 'public-station' as const,
      vehicleCount: 4,
      chargerKw: 50,
      batteryKwh: 60,
    };
    const result = simulateEVFleet(
      8,
      [1, 1, 1, 1],
      config,
      0,
      20,
      false,
      50,
      1,
    );

    expect(result.sessionCount).toBeLessThanOrEqual(config.vehicleCount);
  });
});
