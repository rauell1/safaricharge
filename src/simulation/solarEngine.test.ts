import { describe, expect, it } from 'vitest';
import { simulateSolar } from './solarEngine';
import type { SolarEngineInputs } from './solarEngine';
import type { DerivedSystemConfig } from '@/types/simulation-core';
import type { DayScenario } from './timeEngine';

describe('solarEngine', () => {
  const mockConfig: DerivedSystemConfig = {
    mode: 'auto',
    panelCount: 100,
    panelWatt: 500,
    pvCapacityKw: 50.0,
    inverterKw: 48,
    inverterUnits: 1,
    batteryKwh: 60,
    maxChargeKw: 30,
    maxDischargeKw: 40,
    evChargerKw: 22,
    loadScale: 1.0,
    loadProfile: 'residential',
    evCommuterScale: 1.0,
    evFleetScale: 1.0,
    homeLoadEnabled: true,
    homeLoadKw: 5,
    commercialLoadEnabled: false,
    commercialLoadKw: 0,
    industrialLoadEnabled: false,
    industrialLoadKw: 0,
    accessoryLoadKw: 0,
    accessoryScale: 1.0,
    performanceRatio: 0.8,
    shadingLossPct: 0,
  };

  const mockScenario: DayScenario = {
    initialBatSoc: 50,
    month: 1,
    dayOfWeek: 1,
    isWeekend: false,
    peakSolarHour: 12.5,
    soilingFactor: 1.0,
    latitude: -1.286,
    weatherFactor: 1.0,
    cloudNoiseSeed: 42,
    houseLoadProfile: new Array(24).fill(2.0),
    ev1: { startSoc: 0.5, depart: 8, return: 18, emergency: null, drainRate: 0.2, cap: 60, onboard: 7.4 },
    ev2: { startSoc: 0.5, depart: 8, return: 18, emergency: null, drainRate: 0.2, cap: 60, onboard: 7.4 },
  };

  it('calculates correct dynamic soiling timeline', () => {
    // Day 0 should have 1.0 soiling factor (no soiling)
    const genDay0 = simulateSolar({
      timeOfDay: 12.0,
      scenario: mockScenario,
      systemConfig: mockConfig,
      cloudNoise: 0,
      dayOfSimulation: 0,
      systemAgeYears: 0,
    });

    // Day 10 should have 1.0 - 0.005 * 10 = 0.95 soiling factor
    const genDay10 = simulateSolar({
      timeOfDay: 12.0,
      scenario: mockScenario,
      systemConfig: mockConfig,
      cloudNoise: 0,
      dayOfSimulation: 10,
      systemAgeYears: 0,
    });

    // Day 30 should reach the 0.85 floor
    const genDay30 = simulateSolar({
      timeOfDay: 12.0,
      scenario: mockScenario,
      systemConfig: mockConfig,
      cloudNoise: 0,
      dayOfSimulation: 30,
      systemAgeYears: 0,
    });

    // Day 40 should still be at 0.85 floor
    const genDay40 = simulateSolar({
      timeOfDay: 12.0,
      scenario: mockScenario,
      systemConfig: mockConfig,
      cloudNoise: 0,
      dayOfSimulation: 40,
      systemAgeYears: 0,
    });

    expect(genDay10).toBeLessThan(genDay0);
    expect(genDay30).toBeLessThan(genDay10);
    expect(genDay40).toBeCloseTo(genDay30, 4);
  });

  it('applies solar panel lifetime degradation', () => {
    const genYear0 = simulateSolar({
      timeOfDay: 12.0,
      scenario: mockScenario,
      systemConfig: mockConfig,
      cloudNoise: 0,
      dayOfSimulation: 0,
      systemAgeYears: 0,
    });

    // Year 1 should have 1% degradation
    const genYear1 = simulateSolar({
      timeOfDay: 12.0,
      scenario: mockScenario,
      systemConfig: mockConfig,
      cloudNoise: 0,
      dayOfSimulation: 0,
      systemAgeYears: 1,
    });

    // Year 10 should have 1% first year + 9 * 0.4% annual = ~4.6% total degradation
    const genYear10 = simulateSolar({
      timeOfDay: 12.0,
      scenario: mockScenario,
      systemConfig: mockConfig,
      cloudNoise: 0,
      dayOfSimulation: 0,
      systemAgeYears: 10,
    });

    expect(genYear1).toBeLessThan(genYear0);
    expect(genYear10).toBeLessThan(genYear1);
    expect(genYear1 / genYear0).toBeCloseTo(0.99, 4);
  });
});
