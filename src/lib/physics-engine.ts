/**
 * SafariCharge – Physics Engine for Dynamic Load Simulation
 *
 * Generalized physics engine that supports arbitrary load configurations
 * including EVs, home loads, commercial loads, and HVAC systems.
 */

import type {
  LoadConfig,
  EVLoadConfig,
  HomeLoadConfig,
  CommercialLoadConfig,
  HVACLoadConfig,
  CustomLoadConfig,
  SystemConfiguration,
} from './system-config';

import {
  BATTERY_ROUND_TRIP_EFFICIENCY,
  PANEL_TEMP_COEFFICIENT_PER_DEG_C,
  SOILING_LOSS_PER_DAY,
  SOILING_MIN_FACTOR,
} from './config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WeatherCondition = 'Sunny' | 'Cloudy' | 'Rainy';

export interface EVScenario {
  id: string;
  initialSoc: number; // %
  isDeparted: boolean;
  departTime: number; // actual depart hour
  returnTime: number; // actual return hour
  lunchStart?: number;
  lunchEnd?: number;
  emergencyChargeTime?: number;
  config: EVLoadConfig;
}

export interface HomeScenario {
  id: string;
  profile: number[]; // 24-hour kW profile
  config: HomeLoadConfig;
}

export interface CommercialScenario {
  id: string;
  config: CommercialLoadConfig;
}

export interface HVACScenario {
  id: string;
  config: HVACLoadConfig;
}

export interface CustomScenario {
  id: string;
  profile: number[]; // 24-hour kW profile for profile mode
  config: CustomLoadConfig;
}

export type LoadScenario =
  | { type: 'ev'; data: EVScenario }
  | { type: 'home'; data: HomeScenario }
  | { type: 'commercial'; data: CommercialScenario }
  | { type: 'hvac'; data: HVACScenario }
  | { type: 'custom'; data: CustomScenario };

export interface DayScenario {
  weather: WeatherCondition;
  weatherFactor: number; // solar generation multiplier
  loads: LoadScenario[];
  month: number;
  isWeekend: boolean;
}

export interface SolarData {
  latitude: number;
  monthlyTemperatures: number[]; // 12 monthly average temps in °C
}

export interface InstantPhysicsResult {
  solarPowerKw: number;
  totalLoadKw: number;
  batteryPowerKw: number; // positive = charging, negative = discharging
  gridImportKw: number;
  gridExportKw: number;
  batteryLevelKwh: number;
  batteryLevelPct: number;
  savingsKES: number;
  loadBreakdown: Record<string, number>; // loadId -> kW
  evStates: Record<string, { soc: number; isHome: boolean; isCharging: boolean }>; // evId -> state
}

export type PriorityMode = 'load' | 'battery' | 'auto';

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

function getSeasonalPeakHour(month: number, latitude: number): number {
  const latAbs = Math.abs(latitude);
  if (latAbs < 10) return 12.5; // Equatorial: peak at ~12:30 PM

  const northernWinter = month >= 10 || month <= 2;
  const isWinterHemisphere = latitude > 0 ? northernWinter : !northernWinter;

  return isWinterHemisphere ? 12.0 : 13.0;
}

function getPanelTempEffect(
  irradianceFraction: number,
  month: number,
  monthlyTemps: number[]
): number {
  const ambientTemp = monthlyTemps[month - 1] || 25;
  const panelTemp = ambientTemp + irradianceFraction * 25; // up to +25°C above ambient
  const tempDelta = panelTemp - 25; // STC is 25°C
  return 1 + PANEL_TEMP_COEFFICIENT_PER_DEG_C * tempDelta; // typically 0.94-1.0
}

function getInverterEfficiency(loadFraction: number): number {
  if (loadFraction <= 0.05) return 0.80;
  if (loadFraction >= 0.90) return 0.96;
  return 0.80 + (loadFraction - 0.05) * (0.96 - 0.80) / 0.85;
}

function getBatteryEfficiency(chargeFraction: number): number {
  const eff = BATTERY_ROUND_TRIP_EFFICIENCY;
  if (chargeFraction < 0.1) return eff * 0.92;
  if (chargeFraction > 0.9) return eff * 0.94;
  return eff;
}

function getEVChargeRate(soc: number, maxRate: number): number {
  if (soc < 80) return maxRate;
  if (soc >= 95) return maxRate * 0.1;
  return maxRate * (1 - (soc - 80) / 15 * 0.9); // linear taper 80-95%
}

function randomVariance(base: number, varianceMinutes: number): number {
  const varianceHours = varianceMinutes / 60;
  return base + (Math.random() * 2 - 1) * varianceHours;
}

// ---------------------------------------------------------------------------
// Day Scenario Generation
// ---------------------------------------------------------------------------

export function generateDayScenario(
  config: SystemConfiguration,
  currentDate: Date,
  solarData: SolarData,
  evSocStates: Record<string, number> // current SOC for each EV
): DayScenario {
  const month = currentDate.getMonth() + 1;
  const dayOfWeek = currentDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Weather generation (simple Markov model - can be enhanced)
  const rand = Math.random();
  let weather: WeatherCondition;
  let weatherFactor: number;

  if (rand < 0.70) {
    weather = 'Sunny';
    weatherFactor = 1.0;
  } else if (rand < 0.90) {
    weather = 'Cloudy';
    weatherFactor = 0.6;
  } else {
    weather = 'Rainy';
    weatherFactor = 0.2;
  }

  // Generate scenarios for each enabled load
  const loadScenarios: LoadScenario[] = config.loads
    .filter(load => load.enabled)
    .map(load => {
      if (load.type === 'ev') {
        return generateEVScenario(load, evSocStates[load.id] || 50);
      } else if (load.type === 'home') {
        return generateHomeScenario(load, isWeekend, weather);
      } else if (load.type === 'commercial') {
        return generateCommercialScenario(load);
      } else if (load.type === 'hvac') {
        return generateHVACScenario(load);
      } else {
        return generateCustomScenario(load);
      }
    });

  return {
    weather,
    weatherFactor,
    loads: loadScenarios,
    month,
    isWeekend,
  };
}

function generateEVScenario(config: EVLoadConfig, currentSoc: number): LoadScenario {
  const departTime = randomVariance(config.departTime, config.departVariance);
  const returnTime = randomVariance(config.returnTime, config.returnVariance);

  let lunchStart: number | undefined;
  let lunchEnd: number | undefined;
  if (config.lunchStartTime !== undefined && config.lunchEndTime !== undefined) {
    lunchStart = randomVariance(config.lunchStartTime, 15);
    lunchEnd = randomVariance(config.lunchEndTime, 15);
  }

  let emergencyChargeTime: number | undefined;
  if (Math.random() < config.emergencyChargeProbability) {
    emergencyChargeTime = 20 + Math.random() * 2; // 8-10 PM
  }

  return {
    type: 'ev',
    data: {
      id: config.id,
      initialSoc: currentSoc,
      isDeparted: false,
      departTime,
      returnTime,
      lunchStart,
      lunchEnd,
      emergencyChargeTime,
      config,
    },
  };
}

function generateHomeScenario(
  config: HomeLoadConfig,
  isWeekend: boolean,
  weather: WeatherCondition
): LoadScenario {
  // Apply weekend multiplier
  let profile = config.hourlyProfile.map(v =>
    v * (isWeekend ? config.weekendMultiplier : 1.0)
  );

  // Add weather-dependent HVAC if enabled
  if (config.includeHVAC) {
    const hvacLoad = weather === 'Sunny' ? config.hvacBaseKw * 1.0 :
                     weather === 'Cloudy' ? config.hvacBaseKw * 0.6 :
                     config.hvacBaseKw * 0.15;

    profile = profile.map(v => v + hvacLoad);
  }

  return {
    type: 'home',
    data: {
      id: config.id,
      profile,
      config,
    },
  };
}

function generateCommercialScenario(config: CommercialLoadConfig): LoadScenario {
  return {
    type: 'commercial',
    data: {
      id: config.id,
      config,
    },
  };
}

function generateHVACScenario(config: HVACLoadConfig): LoadScenario {
  return {
    type: 'hvac',
    data: {
      id: config.id,
      config,
    },
  };
}

function generateCustomScenario(config: CustomLoadConfig): LoadScenario {
  const profile = config.mode === 'profile' && config.hourlyProfile
    ? config.hourlyProfile
    : Array(24).fill(config.constantKw || 0);

  return {
    type: 'custom',
    data: {
      id: config.id,
      profile,
      config,
    },
  };
}

// ---------------------------------------------------------------------------
// Instantaneous Physics Calculation
// ---------------------------------------------------------------------------

export interface PhysicsEngineState {
  batteryKwh: number;
  evSocs: Record<string, number>; // EV id -> SOC %
  evIsHome: Record<string, boolean>; // EV id -> is at home
  soilingFactor: number;
}

export function calculateInstantPhysics(
  config: SystemConfiguration,
  scenario: DayScenario,
  hour: number, // 0-24 decimal
  solarData: SolarData,
  state: PhysicsEngineState,
  priorityMode: PriorityMode,
  gridEnabled: boolean,
  isPeakTime: boolean,
  peakRate: number,
  offPeakRate: number
): InstantPhysicsResult {
  // -------------------------------------------------------------------------
  // 1. Calculate Solar Generation
  // -------------------------------------------------------------------------
  const peakHour = getSeasonalPeakHour(scenario.month, solarData.latitude);
  const hourOfDay = hour % 24;
  const distFromPeak = Math.abs(hourOfDay - peakHour);
  const sunAngleFactor = Math.max(0, Math.cos((distFromPeak / 6) * Math.PI / 2));

  const baseIrradiance = sunAngleFactor * scenario.weatherFactor;
  const cloudNoise = 1 + (Math.random() * 2 - 1) * 0.05; // ±5% Brownian variation
  const irradianceFraction = Math.max(0, Math.min(1, baseIrradiance * cloudNoise));

  const tempFactor = getPanelTempEffect(
    irradianceFraction,
    scenario.month,
    solarData.monthlyTemperatures
  );

  const solarPowerKw =
    config.solar.totalCapacityKw *
    irradianceFraction *
    state.soilingFactor *
    tempFactor;

  // -------------------------------------------------------------------------
  // 2. Calculate Total Load from All Sources
  // -------------------------------------------------------------------------
  const loadBreakdown: Record<string, number> = {};
  let totalLoadKw = 0;

  for (const loadScenario of scenario.loads) {
    const loadKw = calculateLoadPower(loadScenario, hourOfDay, scenario.weather, scenario.isWeekend);
    loadBreakdown[getLoadId(loadScenario)] = loadKw;
    totalLoadKw += loadKw;
  }

  // Add stochastic noise to total load (±8%)
  totalLoadKw *= 1 + (Math.random() * 2 - 1) * 0.08;
  totalLoadKw = Math.max(0, totalLoadKw);

  // -------------------------------------------------------------------------
  // 3. EV Charging & V2G Logic
  // -------------------------------------------------------------------------
  const evStates: Record<string, { soc: number; isHome: boolean; isCharging: boolean }> = {};
  let totalEVChargeDemand = 0;
  let totalV2GAvailable = 0;

  for (const loadScenario of scenario.loads) {
    if (loadScenario.type === 'ev') {
      const evData = loadScenario.data;
      const evConfig = evData.config;
      const evId = evData.id;

      // Determine if EV is home
      let isHome = !evData.isDeparted;

      // Check depart/return logic
      if (hourOfDay >= evData.departTime && hourOfDay < evData.returnTime) {
        // Check for lunch break
        if (evData.lunchStart !== undefined && evData.lunchEnd !== undefined) {
          if (hourOfDay >= evData.lunchStart && hourOfDay < evData.lunchEnd) {
            isHome = true;
          } else {
            isHome = false;
          }
        } else {
          isHome = false;
        }
      } else {
        isHome = true;
      }

      // Emergency charge check
      if (evData.emergencyChargeTime !== undefined &&
          hourOfDay >= evData.emergencyChargeTime &&
          hourOfDay < evData.emergencyChargeTime + 2) {
        isHome = true;
      }

      state.evIsHome[evId] = isHome;

      // If not home, apply drain
      if (!isHome) {
        const drainPerStep = evConfig.drainRateKw * (24 / 420); // energy per timestep
        const socDrain = (drainPerStep / evConfig.batteryKwh) * 100;
        state.evSocs[evId] = Math.max(0, state.evSocs[evId] - socDrain);
      }

      // If home and SOC < 95%, add to charge demand
      let isCharging = false;
      if (isHome && state.evSocs[evId] < 95) {
        const chargeRate = getEVChargeRate(state.evSocs[evId], evConfig.onboardChargerKw);
        totalEVChargeDemand += chargeRate;
        isCharging = true;
      }

      // V2G availability during peak hours
      if (isHome &&
          evConfig.supportsV2G &&
          isPeakTime &&
          state.evSocs[evId] > evConfig.v2gMinSoc) {
        const availableEnergy = (state.evSocs[evId] - evConfig.v2gMinSoc) / 100 * evConfig.batteryKwh;
        const maxV2GPower = Math.min(evConfig.onboardChargerKw, availableEnergy / (24 / 420));
        totalV2GAvailable += maxV2GPower;
      }

      evStates[evId] = {
        soc: state.evSocs[evId],
        isHome,
        isCharging,
      };
    }
  }

  totalLoadKw += totalEVChargeDemand;

  // -------------------------------------------------------------------------
  // 4. Battery & Grid Management
  // -------------------------------------------------------------------------
  const netLoadKw = totalLoadKw - solarPowerKw;
  const maxBatteryCharge = config.battery.maxChargeKw;
  const maxBatteryDischarge = config.battery.maxDischargeKw;
  const minBatteryKwh = config.battery.capacityKwh * config.battery.minReservePct / 100;

  let batteryPowerKw = 0; // positive = charging, negative = discharging
  let gridImportKw = 0;
  let gridExportKw = 0;

  if (netLoadKw > 0) {
    // Load exceeds solar
    const shortage = netLoadKw;

    // Try to discharge battery
    const availableBattery = state.batteryKwh - minBatteryKwh;
    const maxDischarge = Math.min(maxBatteryDischarge, availableBattery / (24 / 420));
    const batteryContribution = Math.min(shortage, maxDischarge);

    batteryPowerKw = -batteryContribution;
    state.batteryKwh -= batteryContribution * (24 / 420);

    // Remaining shortage from grid
    const remaining = shortage - batteryContribution;
    if (remaining > 0 && gridEnabled) {
      gridImportKw = remaining;
    }

    // V2G can also help during peak
    if (isPeakTime && totalV2GAvailable > 0 && remaining > 0) {
      const v2gContribution = Math.min(remaining, totalV2GAvailable);
      gridImportKw = Math.max(0, remaining - v2gContribution);

      // Discharge EVs proportionally
      for (const loadScenario of scenario.loads) {
        if (loadScenario.type === 'ev') {
          const evData = loadScenario.data;
          const evConfig = evData.config;
          const evId = evData.id;

          if (state.evIsHome[evId] &&
              evConfig.supportsV2G &&
              state.evSocs[evId] > evConfig.v2gMinSoc) {
            const evContribution = v2gContribution * (evConfig.onboardChargerKw / totalV2GAvailable);
            const socDrain = (evContribution * (24 / 420) / evConfig.batteryKwh) * 100;
            state.evSocs[evId] = Math.max(evConfig.v2gMinSoc, state.evSocs[evId] - socDrain);
          }
        }
      }
    }
  } else {
    // Solar exceeds load
    const surplus = -netLoadKw;

    // Priority modes
    if (priorityMode === 'battery' || priorityMode === 'auto') {
      // Charge battery first
      const roomInBattery = config.battery.capacityKwh - state.batteryKwh;
      const maxCharge = Math.min(maxBatteryCharge, roomInBattery / (24 / 420));
      const batteryCharge = Math.min(surplus, maxCharge);

      batteryPowerKw = batteryCharge;
      state.batteryKwh += batteryCharge * (24 / 420) * getBatteryEfficiency(batteryCharge / maxBatteryCharge);

      // Export remaining
      const remaining = surplus - batteryCharge;
      if (remaining > 0 && gridEnabled) {
        const inverterLimit = config.inverter.capacityKw;
        gridExportKw = Math.min(remaining, inverterLimit);
      }
    } else {
      // Export to grid first (priority mode = 'load')
      if (gridEnabled) {
        const inverterLimit = config.inverter.capacityKw;
        gridExportKw = Math.min(surplus, inverterLimit);
      }
    }
  }

  // Apply EV charging
  for (const loadScenario of scenario.loads) {
    if (loadScenario.type === 'ev' && evStates[loadScenario.data.id]?.isCharging) {
      const evData = loadScenario.data;
      const evConfig = evData.config;
      const evId = evData.id;
      const chargeRate = getEVChargeRate(state.evSocs[evId], evConfig.onboardChargerKw);
      const energyAdded = chargeRate * (24 / 420) * 0.92; // 92% charging efficiency
      const socGain = (energyAdded / evConfig.batteryKwh) * 100;
      state.evSocs[evId] = Math.min(100, state.evSocs[evId] + socGain);
    }
  }

  // -------------------------------------------------------------------------
  // 5. Calculate Savings
  // -------------------------------------------------------------------------
  const rate = isPeakTime ? peakRate : offPeakRate;
  const gridCostKES = gridImportKw * (24 / 420) * rate;
  const gridRevenueKES = gridExportKw * (24 / 420) * 5.0; // Feed-in tariff
  const solarSavingsKES = (solarPowerKw - gridExportKw) * (24 / 420) * rate;
  const savingsKES = solarSavingsKES + gridRevenueKES - gridCostKES;

  // -------------------------------------------------------------------------
  // 6. Return Results
  // -------------------------------------------------------------------------
  return {
    solarPowerKw,
    totalLoadKw,
    batteryPowerKw,
    gridImportKw,
    gridExportKw,
    batteryLevelKwh: state.batteryKwh,
    batteryLevelPct: (state.batteryKwh / config.battery.capacityKwh) * 100,
    savingsKES,
    loadBreakdown,
    evStates,
  };
}

// ---------------------------------------------------------------------------
// Helper: Calculate Load Power for a Given Scenario
// ---------------------------------------------------------------------------

function calculateLoadPower(
  scenario: LoadScenario,
  hour: number,
  weather: WeatherCondition,
  isWeekend: boolean
): number {
  if (scenario.type === 'home') {
    const hourIndex = Math.floor(hour) % 24;
    return scenario.data.profile[hourIndex] || 0;
  }

  if (scenario.type === 'commercial') {
    if (isWeekend && !scenario.data.config.operatesWeekends) {
      return 0;
    }

    let totalPower = scenario.data.config.constantKw;
    for (const sched of scenario.data.config.schedule) {
      if (hour >= sched.start && hour < sched.end) {
        totalPower = sched.powerKw;
        break;
      }
    }
    return totalPower;
  }

  if (scenario.type === 'hvac') {
    const { start, end } = scenario.data.config.operatingHours;
    if (hour < start || hour >= end) {
      return 0;
    }

    const weatherMult = scenario.data.config.weatherMultiplier[weather.toLowerCase() as keyof typeof scenario.data.config.weatherMultiplier];
    return scenario.data.config.capacityKw * weatherMult;
  }

  if (scenario.type === 'custom') {
    if (scenario.data.config.mode === 'constant') {
      return scenario.data.config.constantKw || 0;
    } else {
      const hourIndex = Math.floor(hour) % 24;
      return scenario.data.profile[hourIndex] || 0;
    }
  }

  // EV loads are handled separately in the main calculation
  return 0;
}

function getLoadId(scenario: LoadScenario): string {
  return scenario.data.id;
}
