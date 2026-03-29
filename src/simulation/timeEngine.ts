import type { DerivedSystemConfig } from '@/types/simulation-core';
import type { SolarIrradianceData } from '@/lib/nasa-power-api';

export interface EVScenario {
  startSoc: number;
  depart: number;
  return: number;
  emergency: { start: number; end: number } | null;
  lunchStart?: number;
  lunchEnd?: number;
  drainRate: number;
  cap: number;
  onboard: number;
}

export interface DayScenario {
  initialBatSoc: number;
  month: number;
  dayOfWeek: number;
  isWeekend: boolean;
  peakSolarHour: number;
  soilingFactor: number;
  latitude: number;
  monthlyTemperature?: number[];
  ev1: EVScenario;
  ev2: EVScenario;
  weatherFactor: number;
  cloudNoiseSeed: number;
  houseLoadProfile: number[];
}

const WEATHER_TRANSITION: Record<string, { Sunny: number; Cloudy: number; Rainy: number }> = {
  Sunny:  { Sunny: 0.70, Cloudy: 0.25, Rainy: 0.05 },
  Cloudy: { Sunny: 0.30, Cloudy: 0.50, Rainy: 0.20 },
  Rainy:  { Sunny: 0.10, Cloudy: 0.30, Rainy: 0.60 },
};

const gaussianRandom = (mean: number, std: number): number => {
  const u1 = Math.max(1e-10, Math.random());
  return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
};

export const getSeasonalPeakHour = (month: number, latitude: number = -1.2921): number => {
  const basePeak = 12.75; // ~12:45 PM local time (solar noon)
  const phaseRad = ((month - 6) / 12) * 2 * Math.PI;
  const seasonalShift = -0.25 * Math.cos(phaseRad) * (Math.abs(latitude) / 2);
  return basePeak + seasonalShift;
};

export const nextWeatherMarkov = (current: string): string => {
  const row = WEATHER_TRANSITION[current] ?? WEATHER_TRANSITION.Sunny;
  const r = Math.random();
  if (r < row.Sunny) return 'Sunny';
  if (r < row.Sunny + row.Cloudy) return 'Cloudy';
  return 'Rainy';
};

export const generateDayScenario = (
  weather: string,
  date: Date = new Date('2026-01-01'),
  soilingFactor: number = 1.0,
  solarData?: SolarIrradianceData,
  systemConfig?: DerivedSystemConfig
): DayScenario => {
  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const latitude = solarData?.latitude ?? -1.2921;
  const peakSolarHour = getSeasonalPeakHour(month, latitude);
  const hvacBase = weather === 'Sunny' ? 3.5 : weather === 'Cloudy' ? 2.0 : 0.5;

  return {
    initialBatSoc: 30.0,
    month,
    dayOfWeek,
    isWeekend,
    peakSolarHour,
    soilingFactor,
    latitude,
    monthlyTemperature: solarData?.monthlyTemperature,
    ev1: {
      startSoc: 40 + Math.random() * 30,
      depart: 7.5 + gaussianRandom(0, 0.2),
      return: 18.0 + gaussianRandom(0, 0.4),
      emergency: Math.random() < 0.2 ? { start: 20.0 + Math.random() * 0.5, end: 21.0 + Math.random() * 0.5 } : null,
      drainRate: 0.5 * (systemConfig?.evCommuterScale ?? 1),
      cap: 80,
      onboard: 7 * (systemConfig?.evCommuterScale ?? 1)
    },
    ev2: {
      startSoc: 15 + Math.random() * 25,
      depart: 5.5 + gaussianRandom(0, 0.2),
      lunchStart: 12.5 + Math.random() * 0.5,
      lunchEnd: 14.0 + Math.random() * 0.5,
      return: 22.0 + gaussianRandom(0, 0.4),
      drainRate: 0.8 * (systemConfig?.evFleetScale ?? 1),
      cap: 118,
      onboard: 22 * (systemConfig?.evFleetScale ?? 1)
    },
    weatherFactor: weather === 'Sunny' ? 1.0 : weather === 'Cloudy' ? 0.6 : 0.2,
    cloudNoiseSeed: Math.random(),
    houseLoadProfile: Array(24).fill(0).map((_, h) => {
      if (isWeekend) {
        if (h >= 8 && h < 11) return 4.0 + Math.random() * 2;
        if (h >= 11 && h < 16) return 3.0 + Math.random() * 1.5 + (weather === 'Sunny' ? hvacBase * Math.random() * 0.6 : 0);
        if (h >= 16 && h < 23) return 6.5 + Math.random() * 2.5;
        return 1.2;
      } else {
        if (h >= 6 && h < 9) return 5.0 + Math.random() * 2;
        if (h >= 9 && h < 18) return 2.0 + Math.random() + (weather === 'Sunny' && h >= 11 && h < 17 ? hvacBase * Math.random() * 0.5 : 0);
        if (h >= 18 && h < 22) return 6.0 + Math.random() * 3;
        return 0.8;
      }
    }).map(v => v * (systemConfig?.loadScale ?? 1))
  };
};
