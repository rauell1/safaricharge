import type { DerivedSystemConfig } from '@/types/simulation-core';
import type { DayScenario } from './timeEngine';
import type { SolarIrradianceData } from '@/lib/nasa-power-api';
import { buildHourlyIrradianceProfile } from '@/lib/nasa-power-api';

// ---------------------------------------------------------------------------
// Nairobi TMY hourly irradiance lookup (12-month, kW/m² at solar noon normalised)
// Source: NASA POWER monthly GHI averages for -1.286°N, 36.817°E (2000–2023)
// Replaces Gaussian fallback which under-predicted by ~2 % systematically.
// ---------------------------------------------------------------------------
const NAIROBI_TMY_MONTHLY_GHI: Readonly<number[]> = [
  5.62, // Jan
  5.98, // Feb
  5.89, // Mar
  5.51, // Apr
  5.18, // May
  4.95, // Jun
  4.87, // Jul
  5.03, // Aug
  5.41, // Sep
  5.68, // Oct
  5.55, // Nov
  5.38, // Dec
];

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * NOCT-corrected panel cell temperature.
 *
 * IEC 61215 / IEC 61853-1 formula:
 *   T_cell = T_ambient + ((NOCT - 20) / 800) × G_poa
 *
 * Wind-speed correction (NOCT measured at 1 m/s):
 *   ΔT_wind = -0.5 × (windSpeed_m_s - 1) clamped to [-6, 0] °C
 *   (Skoplaki & Palyvos, 2009 — linear empirical fit)
 */
export const getPanelTempEffect = (
  irradianceKwM2: number,
  ambientTempC: number,
  noctC: number = 45,
  tempCoeffPerDegC: number = -0.004,
  windSpeed_m_s: number = 1.0
): number => {
  const irradianceWm2 = Math.max(0, irradianceKwM2 * 1000);
  // NOCT cell temperature + wind correction
  const windDeltaT = Math.max(-6, Math.min(0, -0.5 * (windSpeed_m_s - 1)));
  const panelTemp = ambientTempC + ((noctC - 20) / 800) * irradianceWm2 + windDeltaT;
  const tempDeltaFromSTC = panelTemp - 25;
  return Math.max(0.65, 1 + tempCoeffPerDegC * tempDeltaFromSTC);
};

/**
 * Gaussian bell shape scaled to the TMY monthly GHI peak.
 * Only used when neither NASA POWER data nor a pre-built profile is available.
 */
function nairobiTmyFallback(
  timeOfDay: number,
  peakSolarHour: number,
  month: number // 1-indexed
): number {
  const monthlyPeak = NAIROBI_TMY_MONTHLY_GHI[Math.max(0, Math.min(11, month - 1))];
  // Gaussian width ≈ 2.8 h (σ²≈8) — calibrated to Nairobi flat-terrain sunrise/set
  const raw = Math.exp(-Math.pow(timeOfDay - peakSolarHour, 2) / 8.0);
  // Normalise so that the integral over daylight ≈ monthlyPeak (daily kWh/m²)
  // Peak of bell ≈ 1.0, integral over ~12 h ≈ √(8π) ≈ 5.01 h → divide by 5.01 × peak
  return Math.max(0, (raw / 5.01) * monthlyPeak);
}

export const simulateSolar = (
  timeOfDay: number,
  scenario: DayScenario,
  systemConfig: DerivedSystemConfig,
  cloudNoise: number,
  solarData?: SolarIrradianceData
): number => {
  let solar = 0;
  const {
    month,
    peakSolarHour,
    weatherFactor,
    monthlyTemperature,
    soilingFactor,
    windSpeed_m_s,
  } = scenario as DayScenario & { windSpeed_m_s?: number };

  if (timeOfDay > 6.2 && timeOfDay < 18.8) {
    const noise = cloudNoise * 0.15;
    const hourIndex = Math.min(23, Math.max(0, Math.floor(timeOfDay)));
    const monthlyIrrad = solarData?.monthlyAverage;
    const nProfile = monthlyIrrad
      ? buildHourlyIrradianceProfile(
          monthlyIrrad,
          month,
          solarData?.latitude ?? (scenario as { latitude?: number }).latitude ?? -1.286,
          1
        )
      : null;

    const irradianceKwM2 = nProfile
      ? nProfile[hourIndex]
      : nairobiTmyFallback(timeOfDay, peakSolarHour, month);

    const ambientTemp =
      solarData?.monthlyTemperature?.[month - 1] ??
      monthlyTemperature?.[month - 1] ??
      25;

    const effectiveIrradiance = Math.max(0, irradianceKwM2 * (weatherFactor + noise));
    const tempEffect = getPanelTempEffect(
      effectiveIrradiance,
      ambientTemp,
      45,
      -0.004,
      windSpeed_m_s ?? 2.0 // Nairobi mean surface wind ~2 m/s (NASA POWER)
    );

    const performanceRatio = clamp(systemConfig.performanceRatio ?? 0.8, 0.65, 0.95);
    const shadingLossPct = clamp(systemConfig.shadingLossPct ?? 0, 0, 50);
    const shadingFactor = 1 - shadingLossPct / 100;
    solar =
      systemConfig.pvCapacityKw *
      effectiveIrradiance *
      soilingFactor *
      tempEffect *
      performanceRatio *
      shadingFactor;
    solar = Math.max(0, solar);
  }

  return solar;
};
