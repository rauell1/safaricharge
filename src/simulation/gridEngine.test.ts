import { describe, expect, it } from 'vitest';
import { defaultGridConfig, simulatePowerFlow } from './gridEngine';

describe('gridEngine', () => {
  it('has positive losses when load is present', () => {
    const result = simulatePowerFlow(
      [
        {
          id: 'n1',
          loadKw: 10,
          generationKw: 0,
          voltageKv: 0.4,
          cableLengthM: 100,
          cableMm2: 35,
        },
      ],
      defaultGridConfig(),
    );

    expect(result.totalLossesKw).toBeGreaterThan(0);
  });

  it('drops frequency when load exceeds generation', () => {
    const result = simulatePowerFlow(
      [
        {
          id: 'n1',
          loadKw: 12,
          generationKw: 4,
          voltageKv: 0.4,
          cableLengthM: 50,
          cableMm2: 35,
        },
      ],
      defaultGridConfig(),
    );

    expect(result.frequencyHz).toBeLessThan(50);
  });

  it('raises frequency when generation exceeds load', () => {
    const result = simulatePowerFlow(
      [
        {
          id: 'n1',
          loadKw: 3,
          generationKw: 11,
          voltageKv: 0.4,
          cableLengthM: 50,
          cableMm2: 35,
        },
      ],
      defaultGridConfig(),
    );

    expect(result.frequencyHz).toBeGreaterThan(50);
  });

  it('has zero voltage deviation at zero resistance and balanced node power', () => {
    const result = simulatePowerFlow(
      [
        {
          id: 'n1',
          loadKw: 7,
          generationKw: 7,
          voltageKv: 0.4,
          cableLengthM: 0,
          cableMm2: 35,
        },
      ],
      defaultGridConfig(),
    );

    expect(result.voltageDeviations.n1).toBe(0);
  });

  it('returns negative netGridImportKw when there is solar surplus', () => {
    const result = simulatePowerFlow(
      [
        {
          id: 'n1',
          loadKw: 2,
          generationKw: 8,
          voltageKv: 0.4,
          cableLengthM: 25,
          cableMm2: 35,
        },
      ],
      defaultGridConfig(),
    );

    expect(result.netGridImportKw).toBeLessThan(0);
  });
});
