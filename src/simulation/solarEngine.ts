import type { DerivedSystemConfig } from '@/types/simulation-core';
import type { DayScenario } from './timeEngine';
import type { SolarIrradianceData } from '@/lib/nasa-power-api';
import { buildHourlyIrradianceProfile } from '@/lib/nasa-power-api';

export const getPanelTempEffect = (
  irradianceKwM2: number,
  ambientTempC: number,
  noctC: number = 45,
  tempCoeffPerDegC: number = -0.004
): number => {
  // NOCT-style approximation:
  // T_cell = T_ambient + ((NOCT - 20) / 800) * G, where G is W/m²
  const irradianceWm2 = Math.max(0, irradianceKwM2 * 1000);
  const panelTemp = ambientTempC + ((noctC - 20) / 800) * irradianceWm2;
  const tempDeltaFromSTC = panelTemp - 25;
  return Math.max(0.65, 1 + tempCoeffPerDegC * tempDeltaFromSTC);
};

export const simulateSolar = (
  timeOfDay: number,
  scenario: DayScenario,
  systemConfig: DerivedSystemConfig,
  cloudNoise: number,
  solarData?: SolarIrradianceData
): number => {
  let solar = 0;
  const { month, peakSolarHour, weatherFactor, monthlyTemperature, soilingFactor } = scenario;

  if (timeOfDay > 6.2 && timeOfDay < 18.8) {
    const noise = cloudNoise * 0.15;
    const hourIndex = Math.min(23, Math.max(0, Math.floor(timeOfDay)));
    const monthlyIrrad = solarData?.monthlyAverage;
    const nProfile = monthlyIrrad
      ? buildHourlyIrradianceProfile(monthlyIrrad, month, solarData?.latitude ?? scenario.latitude, 1)
      : null;

    const irradianceKwM2 = nProfile
      ? nProfile[hourIndex]
      : Math.max(0, Math.exp(-Math.pow(timeOfDay - peakSolarHour, 2) / (6 + 2 * Math.cos(((month - 7) / 12) * 2 * Math.PI))));

    const ambientTemp = (solarData?.monthlyTemperature?.[month - 1] ?? monthlyTemperature?.[month - 1] ?? 25);
    const effectiveIrradiance = Math.max(0, irradianceKwM2 * (weatherFactor + noise));
    const tempEffect = getPanelTempEffect(effectiveIrradiance, ambientTemp);

    // Convert irradiance (kW/m²) to AC-like kW using system kWp baseline at 1 kW/m²
    solar = systemConfig.pvCapacityKw * effectiveIrradiance * soilingFactor * tempEffect;
    solar = Math.max(0, solar);
  }

  return solar;
};
