export type TariffProfileType = 'ev' | 'domestic' | 'small-commercial';

export interface TariffProfile {
  id: TariffProfileType;
  label: string;
  sourceUrl: string;
  effectiveFrom: string; // ISO date
  version: string;
  peakHours: Array<{ start: number; end: number }>;
  weekendOffPeak: boolean;
  /**
   * Demand charge (KES per kVA of monthly peak demand).
   * Non-zero only for commercial/industrial tariff classes.
   * Used by battery-economics to calculate demand-shaving savings.
   */
  demandChargeKesPerKva?: number;
  energy: {
    /** On-peak (high) energy rate, KES/kWh, excl. levies & VAT */
    highRateBase: number;
    /** Shoulder / standard energy rate, KES/kWh — 3-band TOU only */
    mediumRateBase?: number;
    /** Off-peak (low) energy rate, KES/kWh, excl. levies & VAT */
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
 * KPLC / EPRA tariff profiles — effective 2025/26 schedule.
 *
 * Source: EPRA approved tariff schedule 2025/26
 * https://www.epra.go.ke/electricity-tariff-overview
 *
 * Rate components (excl. VAT @ 16%):
 *   all-in price = (base + fuelEnergyCost + ferfa + infa + ercLevy + wraLevy) * (1 + vatRate)
 *
 * Levies are common across all tariff classes:
 *   Fuel Energy Cost  3.10 KES/kWh  (variable, updated monthly)
 *   FERFA             1.2061
 *   INFA              0.46
 *   ERC Levy          0.08
 *   WRA Levy          0.0121
 *
 * Demand charges apply to SC and CI classes (KES per kVA of recorded
 * monthly maximum demand).  Domestic / EV have no demand charge.
 */
export const TARIFF_PROFILES: Record<TariffProfileType, TariffProfile> = {
  ev: {
    id: 'ev',
    label: 'E-Mobility (TOU)',
    sourceUrl: 'https://www.epra.go.ke/electricity-tariff-overview',
    effectiveFrom: '2025-07-01',
    version: 'epra-ev-2025-07',
    peakHours: [
      { start: 6, end: 10 },
      { start: 18, end: 22 },
    ],
    weekendOffPeak: true,
    // No demand charge for EV/domestic customers
    demandChargeKesPerKva: 0,
    energy: {
      highRateBase: 16.0,   // EV peak rate KES/kWh
      lowRateBase: 8.0,     // EV off-peak rate KES/kWh
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
    label: 'Domestic Ordinary (DC)',
    sourceUrl: 'https://www.epra.go.ke/electricity-tariff-overview',
    effectiveFrom: '2025-07-01',
    version: 'epra-domestic-2025-07',
    // Peak: 18:00-23:00 weekdays (KPLC domestic TOU)
    peakHours: [{ start: 18, end: 23 }],
    weekendOffPeak: false,
    demandChargeKesPerKva: 0,
    energy: {
      // EPRA 2025/26 Domestic Ordinary above-100kWh block:
      //   Base energy charge: ~19.08 KES/kWh (peak)
      //   Off-peak:           ~10.72 KES/kWh
      highRateBase: 19.08,
      lowRateBase: 10.72,
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
    label: 'Small Commercial (SC)',
    sourceUrl: 'https://www.epra.go.ke/electricity-tariff-overview',
    effectiveFrom: '2025-07-01',
    version: 'epra-sc-2025-07',
    // SC uses 3-band TOU: peak 07-10 & 18-22, shoulder 10-18, off-peak 22-07
    peakHours: [
      { start: 7, end: 10 },
      { start: 18, end: 22 },
    ],
    weekendOffPeak: false,
    // SC demand charge: ~150 KES/kVA/month (EPRA 2025/26)
    demandChargeKesPerKva: 150,
    energy: {
      // EPRA 2025/26 SC rates:
      //   Peak:    19.50 KES/kWh
      //   Shoulder:15.80 KES/kWh  (new mediumRateBase)
      //   Off-peak:12.16 KES/kWh  (corrected from 15.50 — was 27% overstated)
      highRateBase: 19.50,
      mediumRateBase: 15.80,
      lowRateBase: 12.16,
      fuelEnergyCost: 3.10,
      ferfa: 1.2061,
      infa: 0.46,
      ercLevy: 0.08,
      wraLevy: 0.0121,
      vatRate: 0.16,
    },
  },
};

/**
 * Return the all-in energy price (KES/kWh, incl. all levies + VAT)
 * for a given tariff profile and hour-of-day.
 *
 * Uses mediumRateBase for shoulder hours when defined (3-band TOU),
 * otherwise falls back to highRateBase / lowRateBase.
 */
export function getHourlyRate(
  profile: TariffProfile,
  hour: number,
  isWeekend: boolean
): number {
  const e = profile.energy;
  const levies = e.fuelEnergyCost + e.ferfa + e.infa + e.ercLevy + e.wraLevy;

  if (isWeekend && profile.weekendOffPeak) {
    return (e.lowRateBase + levies) * (1 + e.vatRate);
  }

  const isPeak = profile.peakHours.some(p => hour >= p.start && hour < p.end);
  if (isPeak) return (e.highRateBase + levies) * (1 + e.vatRate);

  // Shoulder band: defined hours that are neither peak nor true off-peak.
  // For SC profile: 10:00–18:00 and 22:00–07:00 are shoulder / off-peak.
  // If a mediumRateBase is defined we apply it for daytime non-peak hours.
  if (e.mediumRateBase !== undefined && hour >= 10 && hour < 18) {
    return (e.mediumRateBase + levies) * (1 + e.vatRate);
  }

  return (e.lowRateBase + levies) * (1 + e.vatRate);
}
