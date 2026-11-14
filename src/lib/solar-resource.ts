/**
 * PVGIS 5.3 monthly solar resource profiles, provenance tagging, and
 * calculation engine version tracking for SafariCharge.
 */

export const ENGINE_VERSION = '2.3.0';
export const LEGACY_CUTOFF_VERSION = '2.0.0';
export const SOLAR_RESOURCE_VERSION = 'SafariCharge-solar-v2 (PVGIS 5.3)';
export const INCIDENCE_ANGLE_LOSS_FRAC = 0.03;

export const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface MarketSolarResource {
  /** Plane-of-array insolation per month (kWh/m²/day), Jan-Dec. */
  monthlyPeakSunHours: number[];
  /** Average daytime (07:00-18:00) ambient temperature per month (°C), Jan-Dec. */
  monthlyAmbientTempC: number[];
  /** Assumed fixed-tilt plane angle behind the monthly values. */
  tiltDeg: number;
  /** Months (1-12) where a snow-cover derate applies. */
  snowMonths: number[];
  /** Output fraction lost to snow cover during snowMonths. */
  snowLossFrac: number;
}

export const MARKET_SOLAR_RESOURCE: Record<string, MarketSolarResource> = {
  KE: {
    // PVGIS 5.3 PVGIS-SARAH3 (2005 to 2023), Nairobi (-1.2921, 36.8219), 15 deg N.
    monthlyPeakSunHours: [5.84, 6.36, 6.47, 5.82, 4.93, 4.32, 4.06, 4.28, 5.19, 5.53, 5.11, 5.37],
    monthlyAmbientTempC: [21.4, 23.7, 23.6, 21.7, 21.4, 19.5, 18.7, 20.0, 21.6, 22.4, 20.8, 21.9],
    tiltDeg: 15,
    snowMonths: [],
    snowLossFrac: 0,
  },
  UG: {
    // PVGIS 5.3 PVGIS-SARAH3 (2005 to 2023), Kampala (0.3476, 32.5825), 15 deg S.
    monthlyPeakSunHours: [6.13, 6.2, 5.72, 5.07, 4.5, 4.3, 4.48, 4.63, 5.02, 5.29, 5.3, 5.62],
    monthlyAmbientTempC: [23.2, 24.4, 22.5, 22.5, 22.6, 21.6, 21.5, 21.9, 22.5, 22.4, 22.3, 22.2],
    tiltDeg: 15,
    snowMonths: [],
    snowLossFrac: 0,
  },
  TZ: {
    // PVGIS 5.3 PVGIS-SARAH3 (2005 to 2023), Dar es Salaam (-6.7924, 39.2083), 15 deg N.
    monthlyPeakSunHours: [5.79, 6.2, 5.85, 4.87, 4.87, 5.29, 5.41, 5.66, 6.1, 6.29, 5.98, 5.83],
    monthlyAmbientTempC: [28.7, 28.9, 28.3, 27.4, 26.4, 26.3, 25.5, 25.7, 26.4, 27.4, 28.1, 28.3],
    tiltDeg: 15,
    snowMonths: [],
    snowLossFrac: 0,
  },
  RW: {
    // PVGIS 5.3 PVGIS-SARAH3 (2005 to 2023), Kigali (-1.9441, 30.0619), 15 deg N.
    monthlyPeakSunHours: [4.78, 5.06, 5.2, 5.12, 5.16, 5.74, 6.36, 5.87, 5.4, 4.94, 4.46, 4.49],
    monthlyAmbientTempC: [23.3, 25.3, 23.7, 21.5, 22.8, 22.8, 24.1, 23.6, 22.9, 23.1, 22.9, 22.9],
    tiltDeg: 15,
    snowMonths: [],
    snowLossFrac: 0,
  },
  NG: {
    monthlyPeakSunHours: [6.29, 6.23, 5.73, 5.5, 4.74, 3.78, 3.67, 4.2, 4.25, 5.15, 5.88, 6.23],
    monthlyAmbientTempC: [29.1, 29.1, 29.5, 28.7, 27.3, 26.4, 25.7, 25.3, 26.0, 26.7, 27.9, 28.4],
    tiltDeg: 15,
    snowMonths: [],
    snowLossFrac: 0,
  },
  ZA: {
    monthlyPeakSunHours: [5.82, 5.99, 5.75, 5.57, 5.91, 5.75, 6.09, 6.55, 7.03, 6.63, 6.3, 5.98],
    monthlyAmbientTempC: [21.0, 20.9, 23.3, 19.2, 16.0, 12.2, 15.0, 16.9, 20.7, 20.9, 23.0, 22.4],
    tiltDeg: 25,
    snowMonths: [],
    snowLossFrac: 0,
  },
};

/**
 * Location-specific PVGIS 5.3 adjustments for SafariCharge East Africa presets
 * keyed by `locationId` in `SOLAR_LOCATIONS`.
 */
export const LOCATION_SOLAR_OVERRIDES: Record<
  string,
  { monthlyIrradiance: number[]; monthlyAmbientTempC: number[]; peakSunHours: number }
> = {
  'loc-nairobi': {
    monthlyIrradiance: MARKET_SOLAR_RESOURCE.KE.monthlyPeakSunHours,
    monthlyAmbientTempC: MARKET_SOLAR_RESOURCE.KE.monthlyAmbientTempC,
    peakSunHours: 5.27,
  },
  'loc-mombasa': {
    // Coastal equatorial (Mombasa -4.0435, 39.6682) higher coastal insolation & temperature
    monthlyIrradiance: [6.15, 6.45, 6.32, 5.58, 4.92, 4.86, 4.78, 5.21, 5.85, 6.02, 5.84, 5.96],
    monthlyAmbientTempC: [28.9, 29.4, 29.5, 28.1, 26.8, 25.7, 24.9, 25.2, 26.1, 27.1, 28.0, 28.6],
    peakSunHours: 5.66,
  },
  'loc-kisumu': {
    monthlyIrradiance: [6.08, 6.31, 6.24, 5.51, 5.18, 4.98, 4.89, 5.12, 5.76, 5.88, 5.54, 5.87],
    monthlyAmbientTempC: [25.6, 26.3, 25.8, 24.2, 23.8, 23.1, 22.9, 23.4, 24.3, 24.9, 24.7, 25.0],
    peakSunHours: 5.61,
  },
  'loc-nakuru': {
    monthlyIrradiance: [6.12, 6.42, 6.38, 5.64, 5.12, 4.76, 4.55, 4.84, 5.54, 5.72, 5.31, 5.79],
    monthlyAmbientTempC: [21.9, 23.2, 23.1, 21.4, 20.5, 19.6, 18.9, 19.4, 20.6, 21.1, 20.4, 21.0],
    peakSunHours: 5.52,
  },
  'loc-eldoret': {
    monthlyIrradiance: [6.22, 6.51, 6.44, 5.71, 5.29, 4.91, 4.62, 4.89, 5.69, 5.84, 5.42, 5.91],
    monthlyAmbientTempC: [20.4, 21.6, 21.7, 20.2, 19.4, 18.2, 17.5, 18.0, 19.3, 19.9, 19.4, 19.7],
    peakSunHours: 5.62,
  },
  'loc-kampala': {
    monthlyIrradiance: MARKET_SOLAR_RESOURCE.UG.monthlyPeakSunHours,
    monthlyAmbientTempC: MARKET_SOLAR_RESOURCE.UG.monthlyAmbientTempC,
    peakSunHours: 5.19,
  },
  'loc-dar': {
    monthlyIrradiance: MARKET_SOLAR_RESOURCE.TZ.monthlyPeakSunHours,
    monthlyAmbientTempC: MARKET_SOLAR_RESOURCE.TZ.monthlyAmbientTempC,
    peakSunHours: 5.68,
  },
  'loc-kigali': {
    monthlyIrradiance: MARKET_SOLAR_RESOURCE.RW.monthlyPeakSunHours,
    monthlyAmbientTempC: MARKET_SOLAR_RESOURCE.RW.monthlyAmbientTempC,
    peakSunHours: 5.22,
  },
};

export type SolarProvenanceKind =
  | 'measured'
  | 'modelled'
  | 'market-default'
  | 'user-input'
  | 'legacy';

export interface SolarProvenance {
  kind: SolarProvenanceKind;
  label: string;
  detail: string;
}

export function solarProvenance(source: string | undefined): SolarProvenance {
  const value = source?.toLowerCase() ?? '';
  if (/nasa power|solar api|pvgis/.test(value)) {
    return {
      kind: 'modelled',
      label: 'Location-based estimate (PVGIS 5.3)',
      detail: source ?? 'PVGIS 5.3 satellite solar resource baseline',
    };
  }
  if (/measured/.test(value)) {
    return {
      kind: 'measured',
      label: 'Site measurements',
      detail: source ?? 'Measured on-site solar irradiance',
    };
  }
  if (/safaricharge-solar|stimapulse-solar/.test(value)) {
    return {
      kind: 'market-default',
      label: 'Market default',
      detail: 'Reviewed regional monthly baseline (PVGIS 5.3 reference) — replace with site telemetry when available.',
    };
  }
  if (/user-input|draft|custom/.test(value)) {
    return {
      kind: 'user-input',
      label: 'Custom values',
      detail: 'Solar resource values entered manually.',
    };
  }
  return {
    kind: 'legacy',
    label: 'Legacy / unknown',
    detail: source ? `Unclassified source: ${source}` : 'No solar source recorded on this run.',
  };
}

export function solarResourceForCountry(countryOrCode: string): MarketSolarResource {
  const normalized = countryOrCode.trim().toUpperCase();
  if (normalized in MARKET_SOLAR_RESOURCE) return MARKET_SOLAR_RESOURCE[normalized];
  if (normalized.includes('UGANDA')) return MARKET_SOLAR_RESOURCE.UG;
  if (normalized.includes('TANZANIA')) return MARKET_SOLAR_RESOURCE.TZ;
  if (normalized.includes('RWANDA')) return MARKET_SOLAR_RESOURCE.RW;
  if (normalized.includes('NIGERIA')) return MARKET_SOLAR_RESOURCE.NG;
  if (normalized.includes('SOUTH AFRICA')) return MARKET_SOLAR_RESOURCE.ZA;
  return MARKET_SOLAR_RESOURCE.KE;
}

function parseSemverTuple(version: string | undefined): [number, number, number] {
  if (!version) return [0, 0, 0];
  const [maj = 0, min = 0, pat = 0] = version.split('.').map((p) => Number.parseInt(p, 10) || 0);
  return [maj, min, pat];
}

/**
 * Returns true when a saved run predates the current scientific engine
 * cutoff (`LEGACY_CUTOFF_VERSION`) or carries no `engineVersion`.
 */
export function isOutdatedEngineVersion(version: string | undefined): boolean {
  if (!version) return true;
  const [maj, min, pat] = parseSemverTuple(version);
  const [cMaj, cMin, cPat] = parseSemverTuple(LEGACY_CUTOFF_VERSION);
  if (maj !== cMaj) return maj < cMaj;
  if (min !== cMin) return min < cMin;
  return pat < cPat;
}
