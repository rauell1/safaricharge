import type { DerivedSystemConfig } from '@/types/simulation-core';
import type { DayScenario } from './timeEngine';
import type { SolarIrradianceData } from '@/lib/nasa-power-api';
import { buildHourlyIrradianceProfile } from '@/lib/nasa-power-api';
import {
  PANEL_ANNUAL_DEGRADATION_RATE,
  PANEL_FIRST_YEAR_DEGRADATION,
  SOILING_LOSS_PER_DAY,
  PANEL_NOCT_CELSIUS,
  PANEL_TEMP_COEFFICIENT_PER_DEG_C,
} from '@/lib/config';
import { getCountyPreset } from '@/lib/kenya-irradiance-data';

export interface SolarEngineInputs {
  timeOfDay: number;
  scenario: DayScenario;
  systemConfig: DerivedSystemConfig;
  cloudNoise: number;
  dayOfSimulation?: number;
  systemAgeYears?: number;
  solarData?: SolarIrradianceData;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * NOCT-corrected panel cell temperature.
 */
export const getPanelTempEffect = (
  irradianceKwM2: number,
  ambientTempC: number,
  noctC: number = PANEL_NOCT_CELSIUS,
  tempCoeffPerDegC: number = PANEL_TEMP_COEFFICIENT_PER_DEG_C,
  windSpeed_m_s: number = 1.0
): number => {
  const irradianceWm2 = Math.max(0, irradianceKwM2 * 1000);
  const windDeltaT = Math.max(-6, Math.min(0, -0.5 * (windSpeed_m_s - 1)));
  const panelTemp = ambientTempC + ((noctC - 20) / 800) * irradianceWm2 + windDeltaT;
  const tempDeltaFromSTC = panelTemp - 25;
  return Math.max(0.65, 1 + tempCoeffPerDegC * tempDeltaFromSTC);
};

/**
 * Gaussian bell shape scaled to the TMY monthly GHI peak.
 */
function nairobiTmyFallback(
  timeOfDay: number,
  peakSolarHour: number,
  month: number
): number {
  const nairobiPreset = getCountyPreset('Nairobi');
  const monthlyPsh = nairobiPreset?.monthlyPsh ?? [
    5.6, 5.8, 5.4, 5.1, 5.0, 4.8, 4.9, 5.2, 5.6, 5.7, 5.5, 5.4
  ];
  const monthlyPeak = monthlyPsh[Math.max(0, Math.min(11, month - 1))];
  const raw = Math.exp(-Math.pow(timeOfDay - peakSolarHour, 2) / 8.0);
  return Math.max(0, (raw / 5.01) * monthlyPeak);
}

// Calculate obstacle horizon shading height based on sun azimuth angle
export function getHorizonShadingHeight(azimuthDeg: number): number {
  // Tall Eucalyptus trees to the East (morning shade)
  if (azimuthDeg >= 80 && azimuthDeg <= 110) {
    return 15; // 15 degrees height threshold
  }
  // Commercial building / hills to the West (evening shade)
  if (azimuthDeg >= 250 && azimuthDeg <= 280) {
    return 20; // 20 degrees height threshold
  }
  return 0; // Clear horizon
}

export const simulateSolar = (
  firstArg: number | SolarEngineInputs,
  scenario?: DayScenario,
  systemConfig?: DerivedSystemConfig,
  cloudNoise?: number,
  solarData?: SolarIrradianceData
): number => {
  let timeOfDay: number;
  let sc: DayScenario;
  let sysConfig: DerivedSystemConfig;
  let noiseVal: number;
  let dayOfSim = 0;
  let sysAgeY = 0;
  let sData: SolarIrradianceData | undefined;

  if (typeof firstArg === 'object' && firstArg !== null) {
    timeOfDay = firstArg.timeOfDay;
    sc = firstArg.scenario;
    sysConfig = firstArg.systemConfig;
    noiseVal = firstArg.cloudNoise;
    dayOfSim = firstArg.dayOfSimulation ?? 0;
    sysAgeY = firstArg.systemAgeYears ?? 0;
    sData = firstArg.solarData;
  } else {
    timeOfDay = firstArg;
    sc = scenario!;
    sysConfig = systemConfig!;
    noiseVal = cloudNoise!;
    sData = solarData;
    dayOfSim = 0;
    sysAgeY = 0;
  }

  let solar = 0;
  const {
    month,
    peakSolarHour,
    weatherFactor,
    monthlyTemperature,
    windSpeed_m_s,
  } = sc as DayScenario & { windSpeed_m_s?: number };

  if (timeOfDay > 6.2 && timeOfDay < 18.8) {
    const noise = noiseVal * 0.15;
    const hourIndex = Math.min(23, Math.max(0, Math.floor(timeOfDay)));
    const monthlyIrrad = sData?.monthlyAverage;
    const nProfile = monthlyIrrad
      ? buildHourlyIrradianceProfile(
          monthlyIrrad,
          month,
          sData?.latitude ?? (sc as { latitude?: number }).latitude ?? -1.286,
          1
        )
      : null;

    const irradianceKwM2 = nProfile
      ? nProfile[hourIndex]
      : nairobiTmyFallback(timeOfDay, peakSolarHour, month);

    const ambientTemp =
      sData?.monthlyTemperature?.[month - 1] ??
      monthlyTemperature?.[month - 1] ??
      25;

    const effectiveIrradiance = Math.max(0, irradianceKwM2 * (weatherFactor + noise));
    const tempEffect = getPanelTempEffect(
      effectiveIrradiance,
      ambientTemp,
      PANEL_NOCT_CELSIUS,
      PANEL_TEMP_COEFFICIENT_PER_DEG_C,
      windSpeed_m_s ?? 2.0
    );

    const performanceRatio = clamp(sysConfig.performanceRatio ?? 0.8, 0.65, 0.95);
    
    // ------------------------------------------------------------------
    // Astronomical Celestial Path Sun Angle & Horizon Shading Calculations
    // ------------------------------------------------------------------
    const dYear = 30 * (month - 1) + 15;
    const declination = 23.45 * (Math.PI / 180) * Math.sin((2 * Math.PI * (284 + dYear)) / 365);
    const hourAngle = 15 * (timeOfDay - 12) * (Math.PI / 180);
    const lat = sData?.latitude ?? (sc as { latitude?: number }).latitude ?? -1.286;
    const latRad = lat * (Math.PI / 180);

    const sinEl = Math.sin(latRad) * Math.sin(declination) + Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle);
    const elRad = Math.asin(clamp(sinEl, -1, 1));
    const elDeg = elRad * (180 / Math.PI);

    let azDeg = 180; // default south
    if (elRad > 0.001) {
      const cosAz = (Math.sin(declination) * Math.cos(latRad) - Math.cos(declination) * Math.sin(latRad) * Math.cos(hourAngle)) / Math.cos(elRad);
      const rawAzDeg = Math.acos(clamp(cosAz, -1, 1)) * (180 / Math.PI);
      azDeg = hourAngle > 0 ? 360 - rawAzDeg : rawAzDeg;
    }

    let dynamicShadingFactor = 1.0;
    if (elDeg > 0) {
      const obstacleHeight = getHorizonShadingHeight(azDeg);
      if (elDeg < obstacleHeight) {
        dynamicShadingFactor = 0.10; // Shaded: 90% direct beam irradiance drop
      }
    }

    const shadingLossPct = clamp(sysConfig.shadingLossPct ?? 0, 0, 50);
    const staticShadingFactor = 1 - shadingLossPct / 100;
    const resolvedShadingFactor = staticShadingFactor * dynamicShadingFactor;

    const resolvedSoilingFactor = dayOfSim > 0
      ? Math.max(0.85, 1.0 - SOILING_LOSS_PER_DAY * dayOfSim)
      : (sc.soilingFactor ?? 1.0);

    const degradationFactor = sysAgeY <= 0
      ? 1.0
      : (1 - PANEL_FIRST_YEAR_DEGRADATION) * Math.pow(1 - PANEL_ANNUAL_DEGRADATION_RATE, sysAgeY - 1);

    solar =
      sysConfig.pvCapacityKw *
      effectiveIrradiance *
      resolvedSoilingFactor *
      tempEffect *
      performanceRatio *
      resolvedShadingFactor *
      degradationFactor;
    solar = Math.max(0, solar);
  }

  return solar;
};
