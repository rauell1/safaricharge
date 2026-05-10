import { describe, expect, it } from 'vitest';

import { DEFAULT_SOLAR_SITE_CONFIG } from './solar-site-config';

describe('DEFAULT_SOLAR_SITE_CONFIG', () => {
  it('provides Nairobi defaults with monthly peak sun hours', () => {
    expect(DEFAULT_SOLAR_SITE_CONFIG.latitudeDeg).toBeCloseTo(-1.28, 2);
    expect(DEFAULT_SOLAR_SITE_CONFIG.sunriseHour).toBe(6);
    expect(DEFAULT_SOLAR_SITE_CONFIG.sunsetHour).toBe(18);
    expect(DEFAULT_SOLAR_SITE_CONFIG.peakSunHoursByMonth).toHaveLength(12);
  });
});
