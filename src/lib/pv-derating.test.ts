import { describe, expect, it } from 'vitest';
import { calculateInstantPhysics, type DayScenario, type PhysicsEngineState, type SolarData } from './physics-engine';
import { DEFAULT_SYSTEM_CONFIG } from './system-config';

const TICK_HOURS = 24 / 420;

function computeDailySolarKwh(performanceRatio: number): number {
  const config = {
    ...DEFAULT_SYSTEM_CONFIG,
    loads: [],
    performanceRatio,
    shadingLossPct: 0,
  };

  const scenario: DayScenario = {
    totalLoadHourlyKw: new Array(24).fill(0),
    loadProfiles: {},
    evIsHome: {},
    solarMultiplier: 1,
    monthIndex: 0,
  };

  const solarData: SolarData = {
    latitude: -1.2921,
    longitude: 36.8219,
    annualAvgKwhPerKwp: 5.4,
    monthlyAvgKwhPerKwp: new Array(12).fill(5.4),
    monthlyAvgTemp: new Array(12).fill(25),
  };

  const state: PhysicsEngineState = {
    batteryKwh: config.battery.capacityKwh * 0.5,
    evSocs: {},
    evIsHome: {},
    soilingFactor: 1,
  };

  let total = 0;
  for (let i = 0; i < 420; i++) {
    const timeOfDay = i * TICK_HOURS;
    const tick = calculateInstantPhysics(
      config,
      scenario,
      timeOfDay,
      solarData,
      state,
      'auto',
      true,
      false,
      24.31,
      14.93
    );
    total += tick.solarPowerKw * TICK_HOURS;
  }

  return total;
}

describe('PV derating: performance ratio and shading', () => {
  it('reduces daily physics-engine output by ~6.25% when PR changes 0.80 -> 0.75', () => {
    const baseline = computeDailySolarKwh(0.8);
    const reduced = computeDailySolarKwh(0.75);
    const relativeReduction = (baseline - reduced) / baseline;

    expect(relativeReduction).toBeCloseTo(0.0625, 3);
  });
});
