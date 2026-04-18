import { describe, expect, it } from 'vitest';
import { initBatteryState, stepBattery, type BatteryState } from './batteryEngine';
import type { DerivedSystemConfig } from '@/types/simulation-core';

const SYSTEM_CONFIG: DerivedSystemConfig = {
  mode: 'auto',
  panelCount: 120,
  panelWatt: 420,
  inverterKw: 48,
  inverterUnits: 1,
  batteryKwh: 60,
  maxChargeKw: 30,
  maxDischargeKw: 40,
  evChargerKw: 22,
  loadScale: 1,
  loadProfile: 'residential',
  evCommuterScale: 1,
  evFleetScale: 1,
  homeLoadEnabled: true,
  homeLoadKw: 6,
  commercialLoadEnabled: false,
  commercialLoadKw: 0,
  industrialLoadEnabled: false,
  industrialLoadKw: 0,
  accessoryLoadKw: 0,
  accessoryScale: 1,
  performanceRatio: 0.8,
  shadingLossPct: 0,
  pvCapacityKw: 50.4,
};

describe('batteryEngine', () => {
  it('initializes default battery state from system config', () => {
    const state = initBatteryState(SYSTEM_CONFIG);
    expect(state.capacityKwh).toBe(60);
    expect(state.healthPct).toBe(100);
    expect(state.socPct).toBe(30);
    expect(state.thermalDeratingFactor).toBe(1);
  });

  it('charges with solar surplus in self-consumption mode', () => {
    const prev = initBatteryState(SYSTEM_CONFIG);
    const next = stepBattery(
      prev,
      18,
      0,
      'self-consumption',
      SYSTEM_CONFIG,
      25,
      false,
      1
    );

    expect(next.chargePowerKw).toBeGreaterThan(0);
    expect(next.dischargePowerKw).toBe(0);
    expect(next.socPct).toBeGreaterThan(prev.socPct);
  });

  it('holds battery in non-peak periods for peak-shaving strategy', () => {
    const prev: BatteryState = {
      ...initBatteryState(SYSTEM_CONFIG),
      socPct: 80,
    };

    const offPeak = stepBattery(
      prev,
      0,
      10,
      'peak-shaving',
      SYSTEM_CONFIG,
      25,
      false,
      1
    );
    const peak = stepBattery(
      prev,
      0,
      10,
      'peak-shaving',
      SYSTEM_CONFIG,
      25,
      true,
      1
    );

    expect(offPeak.dischargePowerKw).toBe(0);
    expect(peak.dischargePowerKw).toBeGreaterThan(0);
  });

  it('maintains reserve floor in backup-resilience strategy', () => {
    const prev: BatteryState = {
      ...initBatteryState(SYSTEM_CONFIG),
      socPct: 32,
    };

    const next = stepBattery(
      prev,
      0,
      30,
      'backup-resilience',
      SYSTEM_CONFIG,
      25,
      true,
      1
    );

    expect(next.socPct).toBeGreaterThanOrEqual(30);
  });

  it('applies thermal derating and degradation floor', () => {
    const prev: BatteryState = {
      ...initBatteryState(SYSTEM_CONFIG),
      socPct: 60,
      cycleCount: 1_000_000,
      healthPct: 80,
      thermalDeratingFactor: 1,
    };

    const next = stepBattery(
      prev,
      0,
      5,
      'self-consumption',
      SYSTEM_CONFIG,
      45,
      true,
      1
    );

    expect(next.thermalDeratingFactor).toBeLessThan(1);
    expect(next.healthPct).toBeGreaterThanOrEqual(80);
    expect(next.capacityKwh).toBeLessThanOrEqual(SYSTEM_CONFIG.batteryKwh);
  });

  it('tracks moderate cycle degradation close to expected curve', () => {
    const prev: BatteryState = {
      ...initBatteryState(SYSTEM_CONFIG),
      socPct: 50,
      cycleCount: 1000,
      healthPct: 99.05,
      thermalDeratingFactor: 1,
    };

    const next = stepBattery(
      prev,
      0,
      0,
      'self-consumption',
      SYSTEM_CONFIG,
      25,
      false,
      24
    );

    expect(next.healthPct).toBeLessThan(prev.healthPct);
    expect(next.healthPct).toBeCloseTo(99.048, 3);
  });
});
