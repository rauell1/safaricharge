// EPRA Retail Electricity Tariffs schedule + October 2026 pass-through surcharges
// KPLC billing rules: VAT (16%) applies to base energy + Fuel Cost Charge (FCC) + FERFA only;
// Inflation Adjustment (INFA), ERC levy, WARMA/WRA levy, and REP levy (5% of base) are outside VAT.
export type TariffProfileType = 'ev' | 'domestic' | 'small-commercial';

export const KPLC_OCT_2026_SURCHARGES = {
  effectiveFrom: '2026-10-01',
  fuelEnergyCost: 3.22,
  ferfa: 0.87,
  infa: 0.48,
  ercLevy: 0.08,
  wraLevy: 0.01,
  repRate: 0.05,
  vatRate: 0.16,
} as const;

export interface TariffProfile {
  id: TariffProfileType;
  label: string;
  sourceUrl: string;
  effectiveFrom: string; // ISO date
  version: string;
  peakHours: Array<{ start: number; end: number }>;
  /** Hours classed as medium-rate (shoulder) - only populated where the tariff has a 3-tier TOU */
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
    /** Rural Electrification Programme levy as fraction of base energy charge (default 0.05). */
    repRate?: number;
    vatRate: number;
  };
}

export interface AllInRateBreakdownLine {
  id: 'base' | 'fcc' | 'ferfa' | 'infa' | 'erc' | 'warma' | 'rep' | 'vat';
  label: string;
  perKwhKes: number;
}

export function allInRateBreakdown(
  baseRate: number,
  profile: Pick<TariffProfile, 'energy'>
): AllInRateBreakdownLine[] {
  const { fuelEnergyCost, ferfa, infa, ercLevy, wraLevy, vatRate, repRate = 0.05 } = profile.energy;
  const rep = baseRate * repRate;
  // VAT applies only to base energy charge, FCC, and FERFA
  const vat = (baseRate + fuelEnergyCost + ferfa) * vatRate;
  return [
    { id: 'base', label: 'Energy charge', perKwhKes: baseRate },
    { id: 'fcc', label: 'Fuel cost charge (FCC)', perKwhKes: fuelEnergyCost },
    { id: 'ferfa', label: 'Forex adjustment (FERFA)', perKwhKes: ferfa },
    { id: 'infa', label: 'Inflation adjustment (INFA)', perKwhKes: infa },
    { id: 'erc', label: 'ERC levy', perKwhKes: ercLevy },
    { id: 'warma', label: 'Water levy (WARMA)', perKwhKes: wraLevy },
    { id: 'rep', label: `REP levy (${Math.round(repRate * 100)}% of base)`, perKwhKes: rep },
    { id: 'vat', label: `VAT (${Math.round(vatRate * 100)}% on base + FCC + FERFA)`, perKwhKes: vat },
  ];
}

/**
 * Compute the all-in KES/kWh price for a given base rate.
 * Formula: base + FCC + FERFA + INFA + ERC + WRA + (base × REP) + VAT × (base + FCC + FERFA)
 */
export function computeAllInRate(
  baseRate: number,
  profile: Pick<TariffProfile, 'energy'>
): number {
  return allInRateBreakdown(baseRate, profile).reduce((sum, line) => sum + line.perKwhKes, 0);
}

export const TARIFF_PROFILES: Record<TariffProfileType, TariffProfile> = {
  ev: {
    id: 'ev',
    label: 'E-Mobility (TOU)',
    sourceUrl: 'https://www.epra.go.ke/',
    effectiveFrom: '2026-10-01',
    version: 'epra-ev-2026-10',
    peakHours: [
      { start: 6, end: 10 },
      { start: 18, end: 22 },
    ],
    weekendOffPeak: true,
    energy: {
      highRateBase: 16.00,
      mediumRateBase: 10.50,
      lowRateBase: 8.00,
      fuelEnergyCost: KPLC_OCT_2026_SURCHARGES.fuelEnergyCost,
      ferfa: KPLC_OCT_2026_SURCHARGES.ferfa,
      infa: KPLC_OCT_2026_SURCHARGES.infa,
      ercLevy: KPLC_OCT_2026_SURCHARGES.ercLevy,
      wraLevy: KPLC_OCT_2026_SURCHARGES.wraLevy,
      repRate: KPLC_OCT_2026_SURCHARGES.repRate,
      vatRate: KPLC_OCT_2026_SURCHARGES.vatRate,
    },
  },
  domestic: {
    id: 'domestic',
    label: 'Domestic (DC tariff)',
    sourceUrl: 'https://www.epra.go.ke/',
    effectiveFrom: '2026-10-01',
    version: 'epra-domestic-2026-10',
    peakHours: [{ start: 18, end: 23 }],
    weekendOffPeak: false,
    energy: {
      highRateBase: 18.00,
      lowRateBase: 11.10,
      fuelEnergyCost: KPLC_OCT_2026_SURCHARGES.fuelEnergyCost,
      ferfa: KPLC_OCT_2026_SURCHARGES.ferfa,
      infa: KPLC_OCT_2026_SURCHARGES.infa,
      ercLevy: KPLC_OCT_2026_SURCHARGES.ercLevy,
      wraLevy: KPLC_OCT_2026_SURCHARGES.wraLevy,
      repRate: KPLC_OCT_2026_SURCHARGES.repRate,
      vatRate: KPLC_OCT_2026_SURCHARGES.vatRate,
    },
  },
  'small-commercial': {
    id: 'small-commercial',
    label: 'Small Commercial (SC tariff)',
    sourceUrl: 'https://www.epra.go.ke/',
    effectiveFrom: '2026-10-01',
    version: 'epra-sc-2026-10',
    peakHours: [
      { start: 7, end: 10 },
      { start: 18, end: 22 },
    ],
    shoulderHours: [{ start: 10, end: 18 }],
    weekendOffPeak: false,
    energy: {
      highRateBase: 19.50,
      mediumRateBase: 13.80,
      lowRateBase: 11.40,
      fuelEnergyCost: KPLC_OCT_2026_SURCHARGES.fuelEnergyCost,
      ferfa: KPLC_OCT_2026_SURCHARGES.ferfa,
      infa: KPLC_OCT_2026_SURCHARGES.infa,
      ercLevy: KPLC_OCT_2026_SURCHARGES.ercLevy,
      wraLevy: KPLC_OCT_2026_SURCHARGES.wraLevy,
      repRate: KPLC_OCT_2026_SURCHARGES.repRate,
      vatRate: KPLC_OCT_2026_SURCHARGES.vatRate,
    },
  },
};
