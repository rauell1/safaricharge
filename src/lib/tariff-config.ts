export type TariffProfileType = 'ev' | 'domestic' | 'small-commercial';

export interface TariffProfile {
  id: TariffProfileType;
  label: string;
  sourceUrl: string;
  effectiveFrom: string; // ISO date
  version: string;
  peakHours: Array<{ start: number; end: number }>;
  weekendOffPeak: boolean;
  energy: {
    highRateBase: number;
    lowRateBase: number;
    fuelEnergyCost: number;
    ferfa: number;
    infa: number;
    ercLevy: number;
    wraLevy: number;
    vatRate: number;
  };
}

export const TARIFF_PROFILES: Record<TariffProfileType, TariffProfile> = {
  ev: {
    id: 'ev',
    label: 'E-Mobility (TOU)',
    sourceUrl: 'https://www.kplc.co.ke/',
    effectiveFrom: '2026-02-01',
    version: 'kplc-ev-2026-02',
    peakHours: [
      { start: 6, end: 10 },
      { start: 18, end: 22 },
    ],
    weekendOffPeak: true,
    energy: {
      highRateBase: 16.0,
      lowRateBase: 8.0,
      fuelEnergyCost: 3.1,
      ferfa: 1.2061,
      infa: 0.46,
      ercLevy: 0.08,
      wraLevy: 0.0121,
      vatRate: 0.16,
    },
  },
  domestic: {
    id: 'domestic',
    label: 'Domestic (effective blended)',
    sourceUrl: 'https://www.kplc.co.ke/',
    effectiveFrom: '2026-02-01',
    version: 'kplc-domestic-2026-02',
    peakHours: [{ start: 18, end: 23 }],
    weekendOffPeak: false,
    energy: {
      highRateBase: 18.0,
      lowRateBase: 14.0,
      fuelEnergyCost: 3.1,
      ferfa: 1.2061,
      infa: 0.46,
      ercLevy: 0.08,
      wraLevy: 0.0121,
      vatRate: 0.16,
    },
  },
  'small-commercial': {
    id: 'small-commercial',
    label: 'Small Commercial (effective blended)',
    sourceUrl: 'https://www.kplc.co.ke/',
    effectiveFrom: '2026-02-01',
    version: 'kplc-small-commercial-2026-02',
    peakHours: [
      { start: 7, end: 10 },
      { start: 18, end: 22 },
    ],
    weekendOffPeak: false,
    energy: {
      highRateBase: 19.5,
      lowRateBase: 15.5,
      fuelEnergyCost: 3.1,
      ferfa: 1.2061,
      infa: 0.46,
      ercLevy: 0.08,
      wraLevy: 0.0121,
      vatRate: 0.16,
    },
  },
};
