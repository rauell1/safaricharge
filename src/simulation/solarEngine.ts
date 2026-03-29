import type { DerivedSystemConfig } from '@/types/simulation-core';
import type { DayScenario } from './timeEngine';

export const getPanelTempEffect = (
  irradFraction: number,
  month: number,
  monthlyTemps?: number[]
): number => {
  const ambientTemp = monthlyTemps && monthlyTemps[month - 1]
    ? monthlyTemps[month - 1]
    : 22 + 8 * Math.sin(((month - 3) / 12) * 2 * Math.PI);

  const panelTemp = ambientTemp + irradFraction * 28;
  const excess = Math.max(0, panelTemp - 25);
  return Math.max(0.70, 1.0 + excess * -0.005);
};

export const simulateSolar = (
  timeOfDay: number,
  scenario: DayScenario,
  systemConfig: DerivedSystemConfig,
  cloudNoise: number
): number => {
  let solar = 0;
  const { month, peakSolarHour, weatherFactor, monthlyTemperature, soilingFactor } = scenario;

  if (timeOfDay > 6.2 && timeOfDay < 18.8) {
    const width = 6 + 2 * Math.cos(((month - 7) / 12) * 2 * Math.PI);
    const noise = cloudNoise * 0.15;
    const irradFraction = Math.max(0, Math.exp(-Math.pow(timeOfDay - peakSolarHour, 2) / width));
    const tempEffect = getPanelTempEffect(irradFraction * weatherFactor, month, monthlyTemperature);
    solar = systemConfig.pvCapacityKw * irradFraction * (weatherFactor + noise) * soilingFactor * tempEffect;
    solar = Math.max(0, solar);
  }

  return solar;
};
