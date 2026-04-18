import { describe, expect, it } from 'vitest';
import {
  defaultInverterConfig,
  getInverterEfficiency,
  simulateInverter,
  type InverterConfig,
} from './inverterEngine';

describe('inverterEngine', () => {
  it('returns efficiency at each lookup point', () => {
    expect(getInverterEfficiency(0.05)).toBeCloseTo(0.82);
    expect(getInverterEfficiency(0.1)).toBeCloseTo(0.93);
    expect(getInverterEfficiency(0.3)).toBeCloseTo(0.96);
    expect(getInverterEfficiency(0.5)).toBeCloseTo(0.97);
    expect(getInverterEfficiency(0.75)).toBeCloseTo(0.965);
    expect(getInverterEfficiency(1.0)).toBeCloseTo(0.94);
  });

  it('activates clipping when dc input exceeds rated conversion threshold', () => {
    const config: InverterConfig = {
      ...defaultInverterConfig(),
      ratedKw: 5,
      maxGridExportKw: 50,
      acCableLengthM: 0,
      acCableMm2: 6,
    };

    const result = simulateInverter(6, config);

    expect(result.acOutputKw).toBeCloseTo(5);
    expect(result.clippingLossKw).toBeGreaterThan(0);
  });

  it('draws standby power when dc input is near zero', () => {
    const result = simulateInverter(0.0, {
      ...defaultInverterConfig(),
      standbyWatts: 20,
    });

    expect(result.standbyDrawKw).toBeCloseTo(0.02);
    expect(result.acOutputKw).toBe(0);
  });

  it('increases cable loss with longer cable length', () => {
    const baseConfig = {
      ...defaultInverterConfig(),
      ratedKw: 5,
      maxGridExportKw: 50,
      acCableMm2: 6,
    };

    const shortCable = simulateInverter(4, {
      ...baseConfig,
      acCableLengthM: 10,
    });
    const longCable = simulateInverter(4, {
      ...baseConfig,
      acCableLengthM: 40,
    });

    expect(longCable.acCableLossKw).toBeGreaterThan(shortCable.acCableLossKw);
  });

  it('caps export at max grid export limit', () => {
    const result = simulateInverter(4, {
      ...defaultInverterConfig(),
      maxGridExportKw: 1,
      acCableLengthM: 0,
      acCableMm2: 6,
    });

    expect(result.netAcToGridKw).toBeCloseTo(1);
    expect(result.gridExportLimitedKw).toBeGreaterThan(0);
  });

  it('blocks all export when anti-islanding is active', () => {
    const result = simulateInverter(4, {
      ...defaultInverterConfig(),
      gridConnected: false,
      acCableLengthM: 0,
      acCableMm2: 6,
      maxGridExportKw: 100,
    });

    expect(result.netAcToGridKw).toBe(0);
    expect(result.gridExportLimitedKw).toBeCloseTo(result.acOutputKw);
  });
});
