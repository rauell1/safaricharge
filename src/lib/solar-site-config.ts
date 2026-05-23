export interface SolarSiteConfig {
  /** Site latitude in decimal degrees (south = negative). */
  latitudeDeg: number;
  /** Assumed sunrise hour in local solar time. */
  sunriseHour: number;
  /** Assumed sunset hour in local solar time. */
  sunsetHour: number;
  /** Monthly peak sun hours (kWh/m²/day) for Jan..Dec. */
  peakSunHoursByMonth: number[];
}

/** Nairobi defaults (PVGIS/NASA-style monthly climatology). */
export const DEFAULT_SOLAR_SITE_CONFIG: SolarSiteConfig = {
  latitudeDeg: -1.28,
  sunriseHour: 6,
  sunsetHour: 18,
  peakSunHoursByMonth: [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3],
};
