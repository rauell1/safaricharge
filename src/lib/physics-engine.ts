/**
 * physics-engine.ts
 *
 * Core physics / energy-balance engine for SafariCharge.
 * Implements calculateInstantPhysics and generateDayScenario.
 *
 * Called every simulation tick from usePhysicsSimulation (hook).
 * State is persisted across ticks via PhysicsEngineState (mutated in-place).
 */

import type { SystemConfiguration, LoadConfig } from '@/lib/system-config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PriorityMode =
  | 'auto'        // solar-first; battery buffers surplus/deficit
  | 'battery'     // charge battery first, then exports
  | 'export'      // maximise feed-in to grid
  | 'backup';     // keep battery reserved; draw from grid unless critical

export interface SolarData {
  /** Daily peak irradiance at the site (W/m²). */
  peakIrradiance: number;
  /** Latitude (decimal degrees). Positive = N, Negative = S. */
  latitude: number;
  /** Longitude (decimal degrees). */
  longitude: number;
  /** Panel tilt angle in degrees from horizontal. */
  tiltDeg?: number;
  /** Panel azimuth in degrees (180 = south-facing). */
  azimuthDeg?: number;
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
  /** Current soiling loss factor (0–1, 1 = clean). */
  soilingFactor: number;
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
  /** Per-load breakdown.  Key = load.id */
  loadProfiles: Record<string, HourlyProfile>;
  /** Which EVs are "at home" today (randomly set each day). */
  evIsHome: Record<string, boolean>;
  /** Daily solar-generation multiplier (weather perturbation 0.5–1.05). */
  solarMultiplier: number;
}

/** Result returned by calculateInstantPhysics for each tick. */
export interface PhysicsTickResult {
  /** AC power from solar array after inverter losses (kW). */
  solarPowerKw: number;
  /** Battery power: positive = charging, negative = discharging (kW). */
  batteryPowerKw: number;
  /** Battery SOC (0–100 %). */
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
 * Sunrise ≈ 6 h, sunset ≈ 18 h (equatorial Kenya).
 */
function solarFraction(timeOfDay: number): number {
  return Math.max(0, Math.sin(((timeOfDay - 6) / 12) * Math.PI));
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
  const loadProfiles: Record<string, HourlyProfile> = {};
  const totalLoadHourlyKw = new Array<number>(24).fill(0);
  const evIsHome: Record<string, boolean> = {};

  for (const load of config.loads) {
    const profile = buildLoadProfile(load, date, currentEvSocs);
    loadProfiles[load.id] = profile;

    for (let h = 0; h < 24; h++) {
      totalLoadHourlyKw[h] += profile.hourlyKw[h];
    }

    if (load.type === 'ev') {
      // EVs have a 15% daily chance of being away
      const awayChance = dailyRandom(date, load.id.charCodeAt(0), 0, 1);
      evIsHome[load.id] = awayChance > 0.15;
    }
  }

  // Solar multiplier: clear day (1.0), partial cloud (0.6–0.9), overcast (0.4–0.6)
  const solarMultiplier = dailyRandom(date, 42, 0.55, 1.05);

  return { totalLoadHourlyKw, loadProfiles, evIsHome, solarMultiplier };
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
      // Base residential load: morning and evening peaks
      for (let h = 0; h < 24; h++) {
        const morningPeak = Math.max(0, Math.exp(-((h - 7.5) ** 2) / 4));
        const eveningPeak = Math.max(0, Math.exp(-((h - 19) ** 2) / 3));
        const base = isWeekend ? 0.65 : 0.5;
        hourlyKw[h] = (load.peakKw ?? 5) * (base + 0.5 * morningPeak + 0.8 * eveningPeak);
      }
      break;
    }
    case 'ev': {
      // EV charges in the evening (18-22 h) if SOC < 95%
      const soc = currentEvSocs[load.id] ?? 50;
      const needsCharge = soc < 95;
      const chargeKw = (load as { onboardChargerKw?: number }).onboardChargerKw ?? 7.4;
      for (let h = 18; h <= 22; h++) {
        hourlyKw[h] = needsCharge ? chargeKw : 0;
      }
      // Top-up opportunity 06-07 h
      if (needsCharge && soc < 50) {
        for (let h = 6; h <= 7; h++) {
          hourlyKw[h] = chargeKw * 0.5;
        }
      }
      break;
    }
    case 'ac': {
      // Air conditioning: midday heat (10-16 h)
      for (let h = 10; h <= 16; h++) {
        hourlyKw[h] = load.peakKw ?? 2;
      }
      break;
    }
    case 'pool': {
      // Pool pump: fixed 4-h run in the morning
      for (let h = 8; h <= 11; h++) {
        hourlyKw[h] = load.peakKw ?? 1.5;
      }
      break;
    }
    case 'borehole':
    case 'pump': {
      // Pump: 2 × daily runs
      hourlyKw[7] = load.peakKw ?? 2;
      hourlyKw[15] = load.peakKw ?? 2;
      break;
    }
    default: {
      // Generic flat load
      for (let h = 0; h < 24; h++) {
        hourlyKw[h] = (load.peakKw ?? 1) * 0.6;
      }
    }
  }

  return { hourlyKw };
}

// ---------------------------------------------------------------------------
// calculateInstantPhysics
// ---------------------------------------------------------------------------

/**
 * Core energy-balance function — called every simulation tick.
 *
 * Mutates `state.batteryKwh` and `state.evSocs` in-place so SOC
 * accumulates correctly across ticks (fixes Issue A).
 *
 * @param config      System configuration
 * @param scenario    Today's load scenario (from generateDayScenario)
 * @param timeOfDay   Decimal hour, 0–24 (e.g. 13.5 = 13:30)
 * @param solarData   Site solar parameters
 * @param state       Mutable physics state (persisted between ticks)
 * @param priority    Dispatch priority mode
 * @param gridEnabled Whether grid import/export is allowed
 * @param isPeakTime  True if current time is within peak tariff window
 * @param peakRate    KES/kWh peak tariff
 * @param offPeakRate KES/kWh off-peak tariff
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
  offPeakRate: number
): PhysicsTickResult {
  const TICK_HOURS = 24 / 420; // ~3.43-min intervals → 420 ticks/day
  const hour = Math.floor(timeOfDay);

  // ------------------------------------------------------------------
  // 1. Solar generation
  // ------------------------------------------------------------------
  const irradianceFrac = solarFraction(timeOfDay);
  const rawSolarKw =
    config.solar.totalCapacityKw *
    irradianceFrac *
    scenario.solarMultiplier *
    state.soilingFactor;

  const inverterEff = config.inverter?.efficiency ?? 0.97;
  const panelTemp = 25 + irradianceFrac * 30; // rough NOCT model
  const tempDerate = 1 - 0.004 * Math.max(0, panelTemp - 25); // -0.4%/°C
  const solarPowerKw = rawSolarKw * inverterEff * tempDerate;

  // ------------------------------------------------------------------
  // 2. Load this tick
  // ------------------------------------------------------------------
  const loadBreakdown: Record<string, number> = {};
  let totalLoadKw = 0;

  for (const load of config.loads) {
    const profile = scenario.loadProfiles[load.id];
    let loadKw = profile ? (profile.hourlyKw[hour] ?? 0) : 0;

    // If EV is away → no charge draw
    if (load.type === 'ev' && !state.evIsHome[load.id]) {
      loadKw = 0;
    }

    loadBreakdown[load.id] = loadKw;
    totalLoadKw += loadKw;
  }

  // ------------------------------------------------------------------
  // 3. Net power balance
  // ------------------------------------------------------------------
  const netSurplus = solarPowerKw - totalLoadKw; // positive = surplus

  const bat = config.battery;
  const batMaxKwh = bat.capacityKwh;
  const batMinKwh = batMaxKwh * ((bat.minReservePct ?? 20) / 100);
  const batMaxKw = bat.maxChargePowerKw ?? batMaxKwh * 0.5;
  const batDischargeKw = bat.maxDischargePowerKw ?? batMaxKwh * 0.5;
  const batEff = bat.roundTripEfficiency ?? 0.94;
  const batChargeEff = Math.sqrt(batEff);
  const batDischargeEff = Math.sqrt(batEff);

  let batteryPowerKw = 0; // positive = charging
  let gridImportKw = 0;
  let gridExportKw = 0;

  if (netSurplus >= 0) {
    // --- SURPLUS: solar > load ---
    switch (priority) {
      case 'export': {
        // Export first, charge battery with remainder
        const canExport = gridEnabled ? netSurplus : 0;
        gridExportKw = canExport;
        batteryPowerKw = 0;
        break;
      }
      case 'backup': {
        // Keep battery full; export excess
        const batCapacity = batMaxKwh - state.batteryKwh;
        const chargeKw = clamp(Math.min(netSurplus, batMaxKw), 0, batCapacity / (TICK_HOURS * batChargeEff));
        batteryPowerKw = chargeKw;
        const afterBat = netSurplus - chargeKw;
        gridExportKw = gridEnabled ? afterBat : 0;
        break;
      }
      case 'battery':
      case 'auto':
      default: {
        // Charge battery first; export overflow
        const batCapacity = batMaxKwh - state.batteryKwh;
        const chargeKw = clamp(Math.min(netSurplus, batMaxKw), 0, batCapacity / (TICK_HOURS * batChargeEff));
        batteryPowerKw = chargeKw;
        const afterBat = netSurplus - chargeKw;
        gridExportKw = gridEnabled ? afterBat : 0;
        break;
      }
    }
  } else {
    // --- DEFICIT: load > solar ---
    const deficit = Math.abs(netSurplus);
    const availBat = state.batteryKwh - batMinKwh;
    const maxDischargeThisTick = availBat / TICK_HOURS * batDischargeEff;

    switch (priority) {
      case 'backup': {
        // Backup mode: rely on grid, preserve battery
        gridImportKw = gridEnabled ? deficit : Math.min(deficit, clamp(maxDischargeThisTick, 0, batDischargeKw));
        if (!gridEnabled) {
          batteryPowerKw = -clamp(deficit - gridImportKw, 0, clamp(maxDischargeThisTick, 0, batDischargeKw));
        }
        break;
      }
      case 'battery':
      case 'auto':
      default: {
        // Discharge battery first; import remainder
        const dischargeKw = clamp(Math.min(deficit, batDischargeKw), 0, maxDischargeThisTick);
        batteryPowerKw = -dischargeKw;
        const afterBat = deficit - dischargeKw;
        gridImportKw = gridEnabled ? afterBat : 0;
        break;
      }
    }
  }

  // ------------------------------------------------------------------
  // 4. Persist battery SOC (core fix for Issue A)
  // ------------------------------------------------------------------
  if (batteryPowerKw > 0) {
    // Charging: energy added = power × time × charge-efficiency
    state.batteryKwh += batteryPowerKw * TICK_HOURS * batChargeEff;
  } else if (batteryPowerKw < 0) {
    // Discharging: energy removed = power × time / discharge-efficiency
    state.batteryKwh += batteryPowerKw * TICK_HOURS / batDischargeEff;
  }
  state.batteryKwh = clamp(state.batteryKwh, batMinKwh, batMaxKwh);
  const batteryLevelPct = (state.batteryKwh / batMaxKwh) * 100;

  // ------------------------------------------------------------------
  // 5. Update EV SOCs
  // ------------------------------------------------------------------
  const evStates: Record<string, { soc: number; isHome: boolean; isCharging: boolean }> = {};

  for (const load of config.loads) {
    if (load.type !== 'ev') continue;
    const isHome = state.evIsHome[load.id] ?? true;
    const loadKw = loadBreakdown[load.id] ?? 0;
    const isCharging = loadKw > 0.01 && isHome;
    const capKwh = (load as { capacityKwh?: number }).capacityKwh ?? 60;

    if (isCharging) {
      const added = (loadKw * TICK_HOURS) / capKwh * 100;
      state.evSocs[load.id] = clamp((state.evSocs[load.id] ?? 50) + added, 0, 100);
    }

    evStates[load.id] = {
      soc: state.evSocs[load.id] ?? 50,
      isHome,
      isCharging,
    };
  }

  // ------------------------------------------------------------------
  // 6. Savings calculation
  // ------------------------------------------------------------------
  const rate = isPeakTime ? peakRate : offPeakRate;
  const solarKwh = solarPowerKw * TICK_HOURS;
  const exportKwh = gridExportKw * TICK_HOURS;
  const FEED_IN_RATE = 5.0; // KES/kWh export credit
  const savingsKES = solarKwh * rate + exportKwh * FEED_IN_RATE;

  return {
    solarPowerKw,
    batteryPowerKw,
    batteryLevelPct,
    gridImportKw,
    gridExportKw,
    totalLoadKw,
    loadBreakdown,
    evStates,
    savingsKES,
  };
}
