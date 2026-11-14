/**
 * Reviewed EPRA maximum pump prices for Nairobi.
 *
 * EPRA (Energy and Petroleum Regulatory Authority) sets maximum retail pump
 * prices for each pricing cycle, which runs from the 15th of one month to the
 * 14th of the next. Prices are stored in KES minor units (cents) per litre,
 * including taxes, as announced for Nairobi.
 */
export interface FuelPriceCycle {
  /** First day of the cycle (the 15th). */
  effectiveFrom: string;
  /** Last day of the cycle (the 14th of the next month), or null for the current cycle. */
  effectiveTo: string | null;
  superPetrolMinor: number;
  dieselMinor: number;
  keroseneMinor: number;
  sourceTitle: string;
  sourceUrl: string;
  lastReviewed: string;
}

export const EPRA_NAIROBI_PUMP_PRICES: readonly FuelPriceCycle[] = [
  {
    effectiveFrom: '2026-10-15',
    effectiveTo: null,
    superPetrolMinor: 22696,
    dieselMinor: 22776,
    keroseneMinor: 21987,
    sourceTitle: 'EPRA pump price review, 15 October to 14 November 2026',
    sourceUrl: 'https://www.the-star.co.ke/news/2026-10-14-epra-raises-petrol-by-sh1293',
    lastReviewed: '2026-10-15',
  },
  {
    effectiveFrom: '2026-09-15',
    effectiveTo: '2026-10-14',
    superPetrolMinor: 21403,
    dieselMinor: 21786,
    keroseneMinor: 19138,
    sourceTitle: 'EPRA pump price review, 15 September to 14 October 2026',
    sourceUrl: 'https://www.the-star.co.ke/news/2026-10-14-epra-raises-petrol-by-sh1293',
    lastReviewed: '2026-10-15',
  },
];

/** The cycle in force on a date (YYYY-MM-DD), or the latest reviewed cycle if the date is past it. */
export function fuelPricesOn(
  date: string,
  cycles: readonly FuelPriceCycle[] = EPRA_NAIROBI_PUMP_PRICES
): FuelPriceCycle | null {
  const inForce = cycles.find(
    (cycle) => cycle.effectiveFrom <= date && (cycle.effectiveTo === null || date <= cycle.effectiveTo)
  );
  if (inForce) return inForce;
  const latest = [...cycles].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
  return latest && latest.effectiveFrom <= date ? latest : null;
}

/** The latest reviewed cycle. */
export function latestFuelPrices(
  cycles: readonly FuelPriceCycle[] = EPRA_NAIROBI_PUMP_PRICES
): FuelPriceCycle {
  return [...cycles].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}

/** The previous reviewed cycle, for showing the latest change. */
export function previousFuelPrices(
  cycles: readonly FuelPriceCycle[] = EPRA_NAIROBI_PUMP_PRICES
): FuelPriceCycle | null {
  return [...cycles].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[1] ?? null;
}

/** Latest Nairobi retail diesel pump price in KES per litre. */
export function latestDieselPriceKesPerLitre(): number {
  return Math.round((latestFuelPrices().dieselMinor / 100) * 100) / 100;
}
