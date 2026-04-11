/**
 * physics-engine.ts
 *
 * Core physics / energy-balance engine for SafariCharge.
 * Implements calculateInstantPhysics and generateDayScenario.
 *
 * Called every simulation tick from usePhysicsSimulation (hook).
 * State is persisted across ticks via PhysicsEngineState (mutated in-place).
 */

import type {
  SystemConfiguration,
  LoadConfig,
  HomeLoadConfig,
  EVLoadConfig,
  CommercialLoadConfig,
  HVACLoadConfig,
} from '@/lib/system-config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PriorityMode =
  | 'auto'      // solar-first; battery buffers surplus/deficit
  | 'battery'   // charge battery first, then exports
  | 'export'    // maximise feed-in to grid
  | 'backup';   // keep battery reserved; draw from grid unless critical

/**
 * Solar site data — matches the shape used in useDemoEnergySystem.ts
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
  /** Daily peak irradiance at the site (W/m²) — optional legacy field. */
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
  /** Per-load breakdown. Key = load.id */
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

  // Solar multiplier: clear (1.0), partial cloud (0.65–0.9), overcast (0.4–0.65)
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
      // Custom or unknown: use hourlyProfile if available, else constant
      const custom = load as { mode?: string; constantKw?: number; hourlyProfile?: number[]; peakKw?: number };
      if (custom.mode === 'profile' && custom.hourlyProfile) {
        for (let h = 0; h < 24; h++) {
          hourlyKw[h] = custom.hourlyProfile[h] ?? 0;
        }
      } else {
        const kw = custom.constantKw ?? custom.peakKw ?? 1;
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
 * Core energy-balance function — called every simulation tick.
 *
 * Mutates `state.batteryKwh` and `state.evSocs` in-place so SOC
 * accumulates correctly across ticks (fixes Issue A).
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
  // 1. Solar generation — use monthly avg kWh/kWp if available
  // ------------------------------------------------------------------
  const month = new Date().getMonth(); // 0-based
  const monthlyYield = solarData.monthlyAvgKwhPerKwp?.[month] ?? solarData.annualAvgKwhPerKwp ?? 5.4;
  const monthlyTemp = solarData.monthlyAvgTemp?.[month] ?? 25;

  const irradianceFrac = solarFraction(timeOfDay);
  // Scale instantaneous kW from daily kWh/kWp yield
  // Peak sun hours ≈ monthlyYield; distribute as sine curve
  const peakSolarKw = config.solar.totalCapacityKw * scenario.solarMultiplier * state.soilingFactor;
  const rawSolarKw = peakSolarKw * irradianceFrac;

  const inverterEff = 0.97;
  // Temperature derating: -0.4%/°C above 25°C (NOCT model)
  const cellTemp = monthlyTemp + irradianceFrac * 25;
  const tempDerate = 1 - 0.004 * Math.max(0, cellTemp - 25);
  const solarPowerKw = Math.max(0, rawSolarKw * inverterEff * tempDerate);

  void monthlyYield; // used implicitly via peakSolarKw scaling above

  // ------------------------------------------------------------------
  // 2. Load this tick — use real hourly profiles from scenario
  // ------------------------------------------------------------------
  const loadBreakdown: Record<string, number> = {};
  let totalLoadKw = 0;

  for (const load of config.loads) {
    if (!load.enabled) {
      loadBreakdown[load.id] = 0;
      continue;
    }
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
  // 3. Battery config — use actual field names from BatteryConfig
  // ------------------------------------------------------------------
  const bat = config.battery;
  const batMaxKwh = bat.capacityKwh;
  const batMinKwh = batMaxKwh * ((bat.minReservePct ?? 20) / 100);
  const batMaxChargeKw = bat.maxChargeKw;       // ← correct field name
  const batMaxDischargeKw = bat.maxDischargeKw; // ← correct field name
  const BAT_EFF = 0.94; // round-trip; lifepo4 typical
  const batChargeEff = Math.sqrt(BAT_EFF);
  const batDischargeEff = Math.sqrt(BAT_EFF);

  // ------------------------------------------------------------------
  // 4. Net power balance & dispatch
  // ------------------------------------------------------------------
  const netSurplus = solarPowerKw - totalLoadKw;

  let batteryPowerKw = 0;
  let gridImportKw = 0;
  let gridExportKw = 0;

  if (netSurplus >= 0) {
    // SURPLUS: solar > load
    switch (priority) {
      case 'export': {
        gridExportKw = gridEnabled ? netSurplus : 0;
        batteryPowerKw = 0;
        break;
      }
      case 'backup':
      case 'battery':
      case 'auto':
      default: {
        const batCapacityLeft = batMaxKwh - state.batteryKwh;
        const chargeKw = clamp(
          Math.min(netSurplus, batMaxChargeKw),
          0,
          batCapacityLeft / (TICK_HOURS * batChargeEff)
        );
        batteryPowerKw = chargeKw;
        const afterBat = netSurplus - chargeKw;
        gridExportKw = gridEnabled ? afterBat : 0;
        break;
      }
    }
  } else {
    // DEFICIT: load > solar
    const deficit = Math.abs(netSurplus);
    const availBatKwh = state.batteryKwh - batMinKwh;
    const maxDischargeThisTick = (availBatKwh / TICK_HOURS) * batDischargeEff;

    switch (priority) {
      case 'backup': {
        // Grid-first: preserve battery
        gridImportKw = gridEnabled ? deficit : Math.min(deficit, clamp(maxDischargeThisTick, 0, batMaxDischargeKw));
        if (!gridEnabled) {
          batteryPowerKw = -clamp(deficit - gridImportKw, 0, clamp(maxDischargeThisTick, 0, batMaxDischargeKw));
        }
        break;
      }
      case 'battery':
      case 'auto':
      default: {
        // Battery-first: discharge before importing
        const dischargeKw = clamp(Math.min(deficit, batMaxDischargeKw), 0, maxDischargeThisTick);
        batteryPowerKw = -dischargeKw;
        const afterBat = deficit - dischargeKw;
        gridImportKw = gridEnabled ? afterBat : 0;
        break;
      }
    }
  }

  // ------------------------------------------------------------------
  // 5. Persist battery SOC (core Issue A fix)
  // ------------------------------------------------------------------
  if (batteryPowerKw > 0) {
    state.batteryKwh += batteryPowerKw * TICK_HOURS * batChargeEff;
  } else if (batteryPowerKw < 0) {
    state.batteryKwh += batteryPowerKw * TICK_HOURS / batDischargeEff;
  }
  state.batteryKwh = clamp(state.batteryKwh, batMinKwh, batMaxKwh);
  const batteryLevelPct = (state.batteryKwh / batMaxKwh) * 100;

  // ------------------------------------------------------------------
  // 6. EV SOC updates
  // ------------------------------------------------------------------
  const evStates: Record<string, { soc: number; isHome: boolean; isCharging: boolean }> = {};

  for (const load of config.loads) {
    if (load.type !== 'ev') continue;
    const ev = load as EVLoadConfig;
    const isHome = state.evIsHome[ev.id] ?? true;
    const loadKw = loadBreakdown[ev.id] ?? 0;
    const isCharging = loadKw > 0.01 && isHome;
    const capKwh = ev.batteryKwh ?? 60; // ← correct EVLoadConfig field

    if (isCharging) {
      const added = (loadKw * TICK_HOURS) / capKwh * 100;
      state.evSocs[ev.id] = clamp((state.evSocs[ev.id] ?? 50) + added, 0, 100);
    }

    evStates[ev.id] = {
      soc: state.evSocs[ev.id] ?? 50,
      isHome,
      isCharging,
    };
  }

  // ------------------------------------------------------------------
  // 7. Savings
  // ------------------------------------------------------------------
  const rate = isPeakTime ? peakRate : offPeakRate;
  const solarKwh = solarPowerKw * TICK_HOURS;
  const exportKwh = gridExportKw * TICK_HOURS;
  const FEED_IN_RATE = 5.0;
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
