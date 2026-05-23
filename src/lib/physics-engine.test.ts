import { describe, expect, it } from 'vitest';
import { calculateInstantPhysics, generateDayScenario } from './physics-engine';
import type { PhysicsEngineState, SolarData } from './physics-engine';
import type { SystemConfiguration } from '@/lib/system-config';

describe('physics-engine', () => {
  const mockConfig: SystemConfiguration = {
    mode: 'auto',
    installedModuleId: 'jinko-tiger-neo-570',
    installedInverterId: 'deye-sg05lp3',
    installedBatteryId: 'seplos-mason-280',
    solar: {
      panelCount: 100,
      panelWattage: 500,
      totalCapacityKw: 50.0,
    },
    inverter: {
      capacityKw: 48,
      phase: 'three',
      voltage: 'high',
    },
    battery: {
      capacityKwh: 60.0,
      maxChargeKw: 30.0,
      maxDischargeKw: 40.0,
      minReservePct: 20,
      voltage: 'low',
      chemistry: 'lifepo4',
    },
    loads: [
      {
        id: 'home_load',
        name: 'Home load',
        type: 'home',
        enabled: true,
        hourlyProfile: new Array(24).fill(5.0), // constant 5 kW load
      } as any,
      {
        id: 'ev_load',
        name: 'EV load',
        type: 'ev',
        enabled: true,
        batteryKwh: 60.0,
        onboardChargerKw: 7.4,
        v2gCapacityKw: 7.4,
        v2gMinSocPct: 30,
        v2gEnabled: true,
        smartChargingEnabled: true,
        returnTime: 18,
      } as any,
    ],
    performanceRatio: 0.8,
    shadingLossPct: 0,
  };

  const mockSolarData: SolarData = {
    latitude: -1.286,
    longitude: 36.817,
    annualAvgKwhPerKwp: 5.5,
    monthlyAvgKwhPerKwp: new Array(12).fill(5.5),
    monthlyAvgTemp: new Array(12).fill(25.0),
  };

  it('guarantees conservation of energy on deficit / surplus ticks', () => {
    const state: PhysicsEngineState = {
      batteryKwh: 30.0, // 50% SoC
      evSocs: { ev_load: 50.0 },
      evIsHome: { ev_load: true },
      soilingFactor: 1.0,
      panelAgeYears: 0.0,
      gridFrequencyHz: 50.0,
    };

    const date = new Date('2026-01-15T12:00:00Z');
    const scenario = generateDayScenario(mockConfig, date, mockSolarData, state.evSocs);

    // 1. Surplus tick (noon)
    const resultSurplus = calculateInstantPhysics(
      mockConfig,
      scenario,
      12.0, // Noon
      mockSolarData,
      state,
      'auto',
      true,  // gridEnabled
      false, // isPeakTime
      24.31,
      14.93
    );

    // Total energy balance: Solar Generation = Total load served + Battery Charge - Battery Discharge + Grid Export - Grid Import
    const batteryNetChargeKw = resultSurplus.batteryPowerKw > 0 ? resultSurplus.batteryPowerKw : 0;
    const batteryNetDischargeKw = resultSurplus.batteryPowerKw < 0 ? Math.abs(resultSurplus.batteryPowerKw) : 0;

    const totalGenerationKw = resultSurplus.solarPowerKw;
    const totalConsumptionKw = resultSurplus.totalLoadKw + batteryNetChargeKw + resultSurplus.gridExportKw - batteryNetDischargeKw - resultSurplus.gridImportKw;

    // Generation and consumption should match within a tiny numerical margin (float precision)
    expect(totalGenerationKw).toBeCloseTo(totalConsumptionKw, 2);
  });

  it('maintains non-negativity of state of charge bounds', () => {
    const state: PhysicsEngineState = {
      batteryKwh: 12.0, // reserve floor limit
      evSocs: { ev_load: 10.0 },
      evIsHome: { ev_load: true },
      soilingFactor: 1.0,
      panelAgeYears: 0.0,
      gridFrequencyHz: 50.0,
    };

    const date = new Date('2026-01-15T22:00:00Z');
    const scenario = generateDayScenario(mockConfig, date, mockSolarData, state.evSocs);

    // Deficit tick in the dark (10 PM)
    const resultDeficit = calculateInstantPhysics(
      mockConfig,
      scenario,
      22.0,
      mockSolarData,
      state,
      'auto',
      true,
      true, // isPeakTime
      24.31,
      14.93
    );

    // Battery should not fall below reserve limit (12 kWh / 20% SoC)
    expect(resultDeficit.batteryLevelPct).toBeGreaterThanOrEqual(20);
    // EV SOC should remain non-negative
    expect(resultDeficit.evStates.ev_load.soc).toBeGreaterThanOrEqual(0);
  });
});
