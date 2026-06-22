/**
 * physics-engine.ts
 *
 * Core physics / energy-balance engine for SafariCharge.
 * Implements calculateInstantPhysics and generateDayScenario.
 *
 * Called every simulation tick from usePhysicsSimulation (hook).
 * State is persisted across ticks via PhysicsEngineState (mutated in-place).
 *
 * All physical constants are imported from config.ts (single source of truth).
 * Component-specific overrides (temp coefficient, inverter efficiency, etc.)
 * are accepted via the optional CatalogPhysicsParams argument -  resolved by
 * catalog-physics-bridge.ts from the SOLAR_COMPONENT_CATALOG datasheet specs.
 */

import type {
  SystemConfiguration,
  LoadConfig,
  HomeLoadConfig,
  EVLoadConfig,
  CommercialLoadConfig,
  HVACLoadConfig,
  CustomLoadConfig,
} from '@/lib/system-config';
import {
  BATTERY_ROUND_TRIP_EFFICIENCY,
  FEED_IN_TARIFF_RATE_KES,
  INVERTER_MAX_EFFICIENCY,
  MPPT_EFFICIENCY,
  PANEL_TEMP_COEFFICIENT_PER_DEG_C,
  BIFACIAL_GAIN_FACTOR,
  SOILING_LOSS_PER_DAY,
  SOILING_MIN_FACTOR,
  SIM_STEPS_PER_DAY,
  SIM_STEP_DURATION_HOURS,
  PANEL_ANNUAL_DEGRADATION_RATE,
  PANEL_FIRST_YEAR_DEGRADATION,
} from '@/lib/config';
import type { CatalogPhysicsParams } from '@/lib/catalog-physics-bridge';
import {
  DEFAULT_SOLAR_SITE_CONFIG,
  type SolarSiteConfig,
} from '@/lib/solar-site-config';

// Import specialized engines
import { simulateSolar } from '@/simulation/solarEngine';
import { stepBattery } from '@/simulation/batteryEngine';
import type { BatteryState, BatteryStrategy } from '@/simulation/batteryEngine';
import { simulateEVFleet } from '@/simulation/evMobilityEngine';
import { simulatePowerFlow } from '@/simulation/gridEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PriorityMode =
  | 'auto'      // solar-first; battery buffers surplus/deficit
  | 'battery'   // charge battery first, then exports
  | 'export'    // maximise feed-in to grid
  | 'backup';   // keep battery reserved; draw from grid unless critical

/**
 * Solar site data -  matches the shape used in useDemoEnergySystem.ts
 * and NAIROBI_SOLAR_DATA in page.tsx.
 */
export interface SolarData {
  /** Latitude (decimal degrees). Positive = N, Negative = S. */
  latitude: number;
  /** Longitude (decimal degrees). */
  longitude: number;
  /** Annual average daily yield (kWh/kWp). */
  annualAvgKwhPerKwp: number;
  /** Monthly average daily yield (kWh/kWp), 12-element array. */
  monthlyAvgKwhPerKwp: number[];
  /** Monthly average temperature (°C), 12-element array. */
  monthlyAvgTemp: number[];
  /** Panel tilt angle in degrees from horizontal (optional). */
  tiltDeg?: number;
  /** Panel azimuth in degrees, 180 = south-facing (optional). */
  azimuthDeg?: number;
  /** Daily peak irradiance at the site (W/m²) -  optional legacy field. */
  peakIrradiance?: number;
}

/**
 * Mutable engine state persisted across ticks.
 * usePhysicsSimulation stores this in a useRef.
 */
export interface PhysicsEngineState {
  /** Current battery energy content in kWh. */
  batteryKwh: number;
  /** EV state-of-charge map: evId → SOC % (0-100). */
  evSocs: Record<string, number>;
  /** Whether each EV is currently at home (plugged in). */
  evIsHome: Record<string, boolean>;
  /** Current soiling loss factor (0-1, 1 = clean). */
  soilingFactor: number;
  /**
   * Accumulated age in fractional years -  used to apply annual panel
   * degradation across long-run simulations.
   */
  panelAgeYears?: number;
  // Added fields for engine tracking
  batteryCycles?: number;
  batteryHealthPct?: number;
  batteryTempC?: number;
  chargeAcceptancePct?: number;
  gridFrequencyHz?: number;
}

/** Hourly load profile for a single load over one day. */
export interface HourlyProfile {
  /** 24-element array of power in kW (one value per hour). */
  hourlyKw: number[];
}

/** Per-day scenario built once at midnight and reused for 24 h. */
export interface DayScenario {
  /** Total load profile (all loads combined), per hour. */
  totalLoadHourlyKw: number[];
  /**
   * Per-load breakdown. Key = load.id.
   * Partial because a load may be disabled and have no entry.
   */
  loadProfiles: Partial<Record<string, HourlyProfile>>;
  /** Which EVs are "at home" today (randomly set each day). */
  evIsHome: Record<string, boolean>;
  /** Daily solar-generation multiplier (weather perturbation 0.5-1.05). */
  solarMultiplier: number;
  /** Simulated calendar month (0-based, JS Date-compatible). */
  monthIndex: number;
}

/** Result returned by calculateInstantPhysics for each tick. */
export interface PhysicsTickResult {
  /** AC power from solar array after inverter losses (kW). */
  solarPowerKw: number;
  /** Battery power: positive = charging, negative = discharging (kW). */
  batteryPowerKw: number;
  /** Battery SOC (0-100 %). */
  batteryLevelPct: number;
  /** Grid power imported this tick (kW). */
  gridImportKw: number;
  /** Grid power exported this tick (kW). */
  gridExportKw: number;
  /** Total load served this tick (kW). */
  totalLoadKw: number;
  /** Per-load power breakdown. Key = load.id */
  loadBreakdown: Record<string, number>;
  /** Per-EV state after this tick. */
  evStates: Record<string, { soc: number; isHome: boolean; isCharging: boolean }>;
  /** Savings this tick in KES. */
  savingsKES: number;
  /** Debug: which catalog-physics params were active. */
  catalogSources?: CatalogPhysicsParams['sources'];
  // Added fields
  chargeAcceptancePct?: number;
  frequencyHz?: number;
  soilingFactor?: number;
  systemAgeYears?: number;
  marginalLcos?: number;
  evQueueLength?: number;
  evBalkedSessions?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Simple sinusoidal solar irradiance model.
 * Returns irradiance fraction 0-1 for a given hour of day.
 * Sunrise/sunset are provided via SolarSiteConfig.
 */
function solarFraction(timeOfDay: number, site: SolarSiteConfig): number {
  const sunrise = site.sunriseHour;
  const sunset = site.sunsetHour;
  const daylightHours = Math.max(0.5, sunset - sunrise);
  return Math.max(0, Math.sin(((timeOfDay - sunrise) / daylightHours) * Math.PI));
}

/**
 * Pseudo-random daily perturbation so every day isn't identical.
 * Returns a deterministic float in [min, max] seeded by the date.
 */
function dailyRandom(date: Date, seed: number, min: number, max: number): number {
  const s = (date.getFullYear() * 366 + date.getMonth() * 31 + date.getDate() + seed) % 997;
  const t = (Math.sin(s) * 43758.5453) % 1;
  return min + Math.abs(t) * (max - min);
}

// ---------------------------------------------------------------------------
// generateDayScenario
// ---------------------------------------------------------------------------

/**
 * Builds a fresh DayScenario for the given calendar date.
 * Call this once at day-boundary; reuse for all ticks in the same day.
 */
export function generateDayScenario(
  config: SystemConfiguration,
  date: Date,
  _solarData: SolarData,
  currentEvSocs: Record<string, number>
): DayScenario {
  const loadProfiles: Partial<Record<string, HourlyProfile>> = {};
  const totalLoadHourlyKw = new Array<number>(24).fill(0);
  const evIsHome: Record<string, boolean> = {};

  for (const load of config.loads) {
    if (!load.enabled) continue;
    const profile = buildLoadProfile(load, date, currentEvSocs);
    loadProfiles[load.id] = profile;

    for (let h = 0; h < 24; h++) {
      totalLoadHourlyKw[h] += profile.hourlyKw[h];
    }

    if (load.type === 'ev') {
      // EVs have a 15% daily chance of being away (skip Sundays)
      const awayChance = dailyRandom(date, load.id.charCodeAt(0), 0, 1);
      evIsHome[load.id] = date.getDay() === 0 ? true : awayChance > 0.15;
    }
  }

  // Solar multiplier: clear (1.0), partial cloud (0.65-0.9), overcast (0.4-0.65)
  const solarMultiplier = dailyRandom(date, 42, 0.55, 1.05);

  return {
    totalLoadHourlyKw,
    loadProfiles,
    evIsHome,
    solarMultiplier,
    monthIndex: date.getMonth(),
  };
}

function buildLoadProfile(
  load: LoadConfig,
  date: Date,
  currentEvSocs: Record<string, number>
): HourlyProfile {
  const hourlyKw = new Array<number>(24).fill(0);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  switch (load.type) {
    case 'home': {
      const home = load as HomeLoadConfig;
      const multiplier = isWeekend ? (home.weekendMultiplier ?? 1.2) : 1.0;
      for (let h = 0; h < 24; h++) {
        hourlyKw[h] = (home.hourlyProfile[h] ?? 0) * multiplier;
      }
      break;
    }

    case 'ev': {
      const ev = load as EVLoadConfig;
      const soc = currentEvSocs[ev.id] ?? 50;
      const needsCharge = soc < 95;
      const chargeKw = ev.onboardChargerKw ?? 7.4;
      const returnHour = Math.floor(ev.returnTime ?? 18);
      // Charge window: return time until 23:00
      for (let h = returnHour; h <= 23; h++) {
        hourlyKw[h] = needsCharge ? chargeKw : 0;
      }
      // Early morning top-up if SOC very low
      if (needsCharge && soc < 50) {
        hourlyKw[6] = chargeKw * 0.5;
      }
      break;
    }

    case 'commercial': {
      const comm = load as CommercialLoadConfig;
      const operatesNow = isWeekend ? comm.operatesWeekends : true;
      if (operatesNow) {
        for (const slot of comm.schedule) {
          for (let h = slot.start; h < Math.min(slot.end, 24); h++) {
            hourlyKw[h] = slot.powerKw;
          }
        }
      }
      break;
    }

    case 'hvac': {
      const hvac = load as HVACLoadConfig;
      const start = hvac.operatingHours?.start ?? 6;
      const end = hvac.operatingHours?.end ?? 22;
      const cap = hvac.capacityKw ?? 5;
      // Peak cooling midday
      for (let h = start; h < end; h++) {
        const heatFrac = Math.max(0, Math.sin(((h - 9) / 12) * Math.PI));
        hourlyKw[h] = cap * (0.5 + 0.5 * heatFrac);
      }
      break;
    }

    case 'custom':
    default: {
      const custom = load as CustomLoadConfig;
      if (custom.mode === 'profile' && custom.hourlyProfile) {
        for (let h = 0; h < 24; h++) {
          hourlyKw[h] = custom.hourlyProfile[h] ?? 0;
        }
      } else {
        const kw = custom.constantKw ?? 1;
        for (let h = 0; h < 24; h++) {
          hourlyKw[h] = kw * 0.6;
        }
      }
    }
  }

  return { hourlyKw };
}

// ---------------------------------------------------------------------------
// calculateInstantPhysics
// ---------------------------------------------------------------------------

/**
 * Core energy-balance function -  called every simulation tick.
 *
 * Mutates `state.batteryKwh` and `state.evSocs` in-place so SOC
 * accumulates correctly across ticks.
 *
 * @param catalogParams - Optional component-specific physics overrides
 *   resolved from SOLAR_COMPONENT_CATALOG datasheet specs via
 *   catalog-physics-bridge.ts. Falls back to config.ts constants when omitted.
 */
export function calculateInstantPhysics(
  config: SystemConfiguration,
  scenario: DayScenario,
  timeOfDay: number,
  solarData: SolarData,
  state: PhysicsEngineState,
  priority: PriorityMode,
  gridEnabled: boolean,
  isPeakTime: boolean,
  peakRate: number,
  offPeakRate: number,
  catalogParams?: CatalogPhysicsParams
): PhysicsTickResult {
  const TICK_HOURS = SIM_STEP_DURATION_HOURS;
  const hour = Math.floor(timeOfDay);
  const month = scenario.monthIndex;
  const ambientTemp = solarData.monthlyAvgTemp?.[month] ?? 25;

  // Resolve age and degradation parameters
  const panelAgeYears = state.panelAgeYears ?? 0;
  const dayOfSimulation = Math.floor(panelAgeYears * 365);

  // ------------------------------------------------------------------
  // 1. Solar Generation using simulateSolar
  // ------------------------------------------------------------------
  const solarDayScenario = {
    month: month + 1, // 1-indexed for solarEngine
    peakSolarHour: config.solarSite?.sunriseHour ? (config.solarSite.sunriseHour + config.solarSite.sunsetHour) / 2 : 12.75,
    weatherFactor: scenario.solarMultiplier,
    monthlyTemperature: solarData.monthlyAvgTemp ?? new Array(12).fill(25),
    soilingFactor: state.soilingFactor,
    windSpeed_m_s: 2.0,
  } as any;

  const solarDerivedConfig = {
    pvCapacityKw: config.solar.totalCapacityKw,
    performanceRatio: config.performanceRatio,
    shadingLossPct: config.shadingLossPct,
  } as any;

  const solarDataPayload = {
    monthlyAverage: solarData.monthlyAvgKwhPerKwp,
    monthlyTemperature: solarData.monthlyAvgTemp,
    latitude: solarData.latitude,
    longitude: solarData.longitude,
  } as any;

  const solarPowerKw = simulateSolar({
    timeOfDay,
    scenario: solarDayScenario,
    systemConfig: solarDerivedConfig,
    cloudNoise: 0,
    dayOfSimulation,
    systemAgeYears: panelAgeYears,
    solarData: solarDataPayload,
  });

  // ------------------------------------------------------------------
  // 2. Load Calculation with Demand-Response Load Shedding
  // ------------------------------------------------------------------
  // Shed load check: if grid frequency is < 49.5 Hz, activate demand response
  const isLoadSheddingActive = (state.gridFrequencyHz ?? 50.0) < 49.5;

  const loadBreakdown: Record<string, number> = {};
  let totalLoadKw = 0;

  for (const load of config.loads) {
    if (!load.enabled) {
      loadBreakdown[load.id] = 0;
      continue;
    }
    const profile = scenario.loadProfiles[load.id];
    let loadKw = profile ? (profile.hourlyKw[hour] ?? 0) : 0;

    // Apply demand response (30% reduction in HVAC/commercial profiles) if grid frequency < 49.5 Hz
    if (isLoadSheddingActive) {
      if (load.type === 'hvac' || load.type === 'commercial') {
        loadKw *= 0.7; // shed 30%
      }
    }

    if (load.type === 'ev') {
      loadBreakdown[load.id] = 0; // Will be calculated in step 3
      continue;
    }

    loadBreakdown[load.id] = loadKw;
    totalLoadKw += loadKw;
  }

  // ------------------------------------------------------------------
  // 3. EV Fleet Simulation (coupled with battery reserve and grid frequency)
  // ------------------------------------------------------------------
  const currentBatterySoc = config.battery.capacityKwh > 0 ? (state.batteryKwh / config.battery.capacityKwh) * 100 : 100;
  const batMinReservePct = config.battery.minReservePct ?? 20;

  let totalEvLoadKw = 0;
  let totalV2gExportKw = 0;
  let evQueueLength = 0;
  let evBalkedSessions = 0;
  const evStates: Record<string, { soc: number; isHome: boolean; isCharging: boolean }> = {};

  for (const load of config.loads) {
    if (load.type !== 'ev') continue;
    const ev = load as EVLoadConfig;
    const isHome = state.evIsHome[ev.id] ?? true;

    if (!isHome) {
      evStates[ev.id] = {
        soc: state.evSocs[ev.id] ?? 50,
        isHome: false,
        isCharging: false,
      };
      loadBreakdown[ev.id] = 0;
      continue;
    }

    const prevSocFraction = (state.evSocs[ev.id] ?? 50) / 100;
    const evFleetConf = {
      useCase: 'residential' as const,
      vehicleCount: 1,
      batteryKwh: ev.batteryKwh ?? 60,
      chargerKw: ev.onboardChargerKw ?? 7.4,
      onboardInverterKw: (ev as any).v2gCapacityKw ?? ev.onboardChargerKw ?? 7.4,
      v2gEnabled: (ev as any).v2gEnabled ?? ev.supportsV2G ?? false,
      minSocForV2g: ((ev as any).v2gMinSocPct ?? ev.v2gMinSoc ?? 30) / 100,
      smartChargingEnabled: (ev as any).smartChargingEnabled ?? false,
      depotReturnHour: ev.returnTime ?? 18,
    };

    const solarSurplusForEv = Math.max(0, solarPowerKw - totalLoadKw);

    const evResult = simulateEVFleet(
      timeOfDay,
      [prevSocFraction],
      evFleetConf,
      solarSurplusForEv,
      isPeakTime ? peakRate : offPeakRate,
      isPeakTime,
      state.gridFrequencyHz ?? 50.0,
      TICK_HOURS,
      currentBatterySoc,
      batMinReservePct
    );

    const newSocPct = (evResult.vehicleSocs[0] ?? prevSocFraction) * 100;
    state.evSocs[ev.id] = clamp(newSocPct, 0, 100);

    const evLoadKw = evResult.totalLoadKw;
    const v2gKw = evResult.v2gExportKw;
    evQueueLength = evResult.queueLength;
    evBalkedSessions = evResult.balkedSessions;

    loadBreakdown[ev.id] = evLoadKw;
    totalEvLoadKw += evLoadKw;
    totalV2gExportKw += v2gKw;

    evStates[ev.id] = {
      soc: state.evSocs[ev.id],
      isHome: true,
      isCharging: evLoadKw > 0.01,
    };
  }

  totalLoadKw += totalEvLoadKw;

  // ------------------------------------------------------------------
  // 4. Battery Engine Simulation (stepBattery)
  // ------------------------------------------------------------------
  const solarSurplusForBattery = Math.max(0, solarPowerKw - totalLoadKw);
  const batteryDeficit = Math.max(0, totalLoadKw - totalV2gExportKw - solarPowerKw);

  const strategyMap: Record<PriorityMode, BatteryStrategy> = {
    'auto': 'self-consumption',
    'battery': 'self-consumption',
    'export': 'self-consumption',
    'backup': 'backup-resilience',
  };
  const batteryStrategy = strategyMap[priority] || 'self-consumption';

  const derivedBatteryConfig = {
    batteryKwh: config.battery.capacityKwh,
    maxChargeKw: config.battery.maxChargeKw,
    maxDischargeKw: config.battery.maxDischargeKw,
    minReservePct: config.battery.minReservePct ?? 20,
  } as any;

  const prevBatteryState = {
    socPct: currentBatterySoc,
    capacityKwh: config.battery.capacityKwh * ((state.batteryHealthPct ?? 100) / 100),
    cycleCount: state.batteryCycles ?? 0,
    healthPct: state.batteryHealthPct ?? 100,
    temperatureC: state.batteryTempC ?? 25,
    chargePowerKw: 0,
    dischargePowerKw: 0,
    thermalDeratingFactor: 1.0,
    chargeAcceptancePct: state.chargeAcceptancePct ?? 100,
    turningPoints: (state as any).batteryTurningPoints,
    marginalLcos: (state as any).batteryMarginalLcos ?? 9.2,
  };

  const nextBatteryState = stepBattery(
    prevBatteryState,
    solarSurplusForBattery,
    batteryDeficit,
    batteryStrategy,
    derivedBatteryConfig,
    ambientTemp,
    isPeakTime,
    TICK_HOURS
  );

  state.batteryKwh = config.battery.capacityKwh * (nextBatteryState.socPct / 100);
  state.batteryCycles = nextBatteryState.cycleCount;
  state.batteryHealthPct = nextBatteryState.healthPct;
  state.batteryTempC = nextBatteryState.temperatureC;
  state.chargeAcceptancePct = nextBatteryState.chargeAcceptancePct;
  (state as any).batteryTurningPoints = nextBatteryState.turningPoints;
  (state as any).batteryMarginalLcos = nextBatteryState.marginalLcos;

  const batteryPowerKw = nextBatteryState.chargePowerKw > 0
    ? nextBatteryState.chargePowerKw
    : -nextBatteryState.dischargePowerKw;

  // ------------------------------------------------------------------
  // 5. Grid Power Flow & Frequency Simulation
  // ------------------------------------------------------------------
  const gridNode = {
    id: 'house_microgrid',
    loadKw: totalLoadKw,
    generationKw: solarPowerKw + totalV2gExportKw,
    voltageKv: 0.4,
    cableLengthM: 10,
    cableMm2: 16,
  };

  const gridConfig = {
    nominalVoltageKv: 0.4,
    powerFactor: 0.95,
    inertiaConstantS: 5.0,
    prevFrequencyHz: state.gridFrequencyHz ?? 50.0,
    dtSeconds: TICK_HOURS * 3600,
    batteryCapacityKwh: config.battery.capacityKwh,
    initialBatteryKwh: state.batteryKwh,
    maxBatteryChargeKw: config.battery.maxChargeKw,
    maxBatteryDischargeKw: config.battery.maxDischargeKw,
  };

  const gridResult = simulatePowerFlow([gridNode], gridConfig);
  state.gridFrequencyHz = gridResult.frequencyHz;

  // Deduce grid flows:
  // solarGen + batteryDischarge + v2gExport + gridImport = load + batteryCharge + gridExport
  const netPower = solarPowerKw + totalV2gExportKw + (batteryPowerKw < 0 ? Math.abs(batteryPowerKw) : 0) - totalLoadKw - (batteryPowerKw > 0 ? batteryPowerKw : 0);
  
  let gridImportKw = 0;
  let gridExportKw = 0;
  
  if (gridEnabled) {
    if (netPower < 0) {
      gridImportKw = Math.abs(netPower);
    } else {
      gridExportKw = netPower;
    }
  }

  // ------------------------------------------------------------------
  // 6. Savings Calculation
  // ------------------------------------------------------------------
  const currentRate = isPeakTime ? peakRate : offPeakRate;
  const solarKwh = solarPowerKw * TICK_HOURS;
  const exportKwh = gridExportKw * TICK_HOURS;
  const savingsKES = solarKwh * currentRate + exportKwh * FEED_IN_TARIFF_RATE_KES;

  // Advance panel age
  if (state.panelAgeYears !== undefined) {
    state.panelAgeYears += TICK_HOURS / 8760;
  }

  return {
    solarPowerKw,
    batteryPowerKw,
    batteryLevelPct: nextBatteryState.socPct,
    gridImportKw,
    gridExportKw,
    totalLoadKw,
    loadBreakdown,
    evStates,
    savingsKES,
    catalogSources: catalogParams?.sources,
    chargeAcceptancePct: nextBatteryState.chargeAcceptancePct,
    frequencyHz: gridResult.frequencyHz,
    soilingFactor: state.soilingFactor,
    systemAgeYears: panelAgeYears,
    marginalLcos: nextBatteryState.marginalLcos,
    evQueueLength,
    evBalkedSessions,
  };
}

// ---------------------------------------------------------------------------
// Soiling model (exported for use by usePhysicsSimulation)
// ---------------------------------------------------------------------------

/**
 * Update the soiling factor in engine state.
 * Called by usePhysicsSimulation at day boundaries.
 *
 * Uses SOILING_LOSS_PER_DAY and SOILING_MIN_FACTOR from config.ts.
 * Rain resets factor to 1.0 (10% daily rain probability).
 */
export function updateSoilingFactor(state: PhysicsEngineState, date: Date): void {
  const rainChance = dailyRandom(date, 99, 0, 1);
  if (rainChance < 0.10) {
    state.soilingFactor = 1.0; // rain cleans panels
  } else {
    state.soilingFactor = clamp(
      state.soilingFactor - SOILING_LOSS_PER_DAY,
      SOILING_MIN_FACTOR,
      1.0
    );
  }
}
