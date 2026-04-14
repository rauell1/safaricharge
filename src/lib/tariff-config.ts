// EPRA 2025/26 tariff schedule — effective 1 Feb 2026
// Source: EPRA Retail Electricity Tariffs Order, Gazette Notice No. 1752 (Jan 2026)
// Off-peak base rates corrected from prior 8.0/14.0/15.5 (overstated by ~27%)
export type TariffProfileType = 'ev' | 'domestic' | 'small-commercial';

export interface TariffProfile {
  id: TariffProfileType;
  label: string;
  sourceUrl: string;
  effectiveFrom: string; // ISO date
  version: string;
  peakHours: Array<{ start: number; end: number }>;
  /** Hours classed as medium-rate (shoulder) — only populated where the tariff has a 3-tier TOU */
  shoulderHours?: Array<{ start: number; end: number }>;
  weekendOffPeak: boolean;
  energy: {
    /** Peak (high) rate before levies, KES/kWh */
    highRateBase: number;
    /** Shoulder / medium rate before levies, KES/kWh (undefined for 2-tier tariffs) */
    mediumRateBase?: number;
    /** Off-peak (low) rate before levies, KES/kWh */
    lowRateBase: number;
    fuelEnergyCost: number;
    ferfa: number;
    infa: number;
    ercLevy: number;
    wraLevy: number;
    vatRate: number;
  };
}

/**
 * Compute the all-in KES/kWh price for a given base rate.
 * Formula: (base + fuel + FERFA + INFA + ERC + WRA) × (1 + VAT)
 */
export function computeAllInRate(
  baseRate: number,
  profile: TariffProfile
): number {
  const { fuelEnergyCost, ferfa, infa, ercLevy, wraLevy, vatRate } = profile.energy;
  return (baseRate + fuelEnergyCost + ferfa + infa + ercLevy + wraLevy) * (1 + vatRate);
}

export const TARIFF_PROFILES: Record<TariffProfileType, TariffProfile> = {
  ev: {
    id: 'ev',
    label: 'E-Mobility (TOU)',
    sourceUrl: 'https://www.epra.go.ke/',
    effectiveFrom: '2026-02-01',
    version: 'epra-ev-2026-02',
    peakHours: [
      { start: 6, end: 10 },
      { start: 18, end: 22 },
    ],
    weekendOffPeak: true,
    energy: {
      // EPRA 2025/26 EV-TOU schedule
      highRateBase: 16.00,   // peak: unchanged
      mediumRateBase: 10.50, // shoulder tier (10:00–18:00, 22:00–06:00 on weekdays)
      lowRateBase: 6.30,     // off-peak corrected (was 8.0 — 27% overstated)
      fuelEnergyCost: 3.10,
      ferfa: 1.2061,
      infa: 0.46,
      ercLevy: 0.08,
      wraLevy: 0.0121,
      vatRate: 0.16,
    },
  },
  domestic: {
    id: 'domestic',
    label: 'Domestic (DC tariff)',
    sourceUrl: 'https://www.epra.go.ke/',
    effectiveFrom: '2026-02-01',
    version: 'epra-domestic-2026-02',
    peakHours: [{ start: 18, end: 23 }],
    weekendOffPeak: false,
    energy: {
      // Domestic is a 2-tier TOU; no shoulder band
      highRateBase: 18.00,   // evening peak: unchanged
      lowRateBase: 11.10,    // off-peak corrected (was 14.0 — ~27% overstated)
      fuelEnergyCost: 3.10,
      ferfa: 1.2061,
      infa: 0.46,
      ercLevy: 0.08,
      wraLevy: 0.0121,
      vatRate: 0.16,
    },
  },
  'small-commercial': {
    id: 'small-commercial',
    label: 'Small Commercial (SC tariff)',
    sourceUrl: 'https://www.epra.go.ke/',
    effectiveFrom: '2026-02-01',
    version: 'epra-sc-2026-02',
    peakHours: [
      { start: 7, end: 10 },
      { start: 18, end: 22 },
    ],
    shoulderHours: [
      { start: 10, end: 18 },
    ],
    weekendOffPeak: false,
    energy: {
      highRateBase: 19.50,   // peak: unchanged
      mediumRateBase: 13.80, // shoulder: added for 3-tier SC tariff
      lowRateBase: 11.40,    // off-peak corrected (was 15.5 — ~36% overstated)
      fuelEnergyCost: 3.10,
      ferfa: 1.2061,
      infa: 0.46,
      ercLevy: 0.08,
      wraLevy: 0.0121,
      vatRate: 0.16,
    },
  },
};
