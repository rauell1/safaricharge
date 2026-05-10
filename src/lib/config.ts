/**
 * SafariCharge – Central configuration file
 *
 * All system-level constants and physical coefficients are defined here.
 * KPLC tariff numbers are the single source of truth in tariff-config.ts —
 * import from there instead of duplicating values here.
 */

// ---------------------------------------------------------------------------
// Solar / Inverter / Battery System Specifications
// ---------------------------------------------------------------------------

/** Rated PV array output (kW) */
export const PV_CAPACITY_KW = 50.0;

/** Rated inverter output capacity (kW) */
export const INVERTER_CAPACITY_KW = 48.0;

/** Usable battery bank capacity (kWh) – LiFePO₄ */
export const BATTERY_CAPACITY_KWH = 60.0;

/**
 * Battery round-trip efficiency.
 * Accounts for charge + discharge losses in the LiFePO₄ cells (~96%).
 */
export const BATTERY_ROUND_TRIP_EFFICIENCY = 0.96;

/** Maximum AC EV charger output (kW) – Level 2 22 kW unit */
export const EV_CHARGER_RATE_KW = 22.0;

/** Maximum battery charge rate from solar / grid (kW) */
export const MAX_BATTERY_CHARGE_RATE_KW = 30.0;

/** Maximum battery discharge rate to loads / grid (kW) */
export const MAX_BATTERY_DISCHARGE_RATE_KW = 40.0;

/**
 * Minimum battery reserve (kWh) kept to extend cycle life.
 * Corresponds to ~20 % SoC on the 60 kWh bank.
 */
export const BATTERY_MIN_RESERVE_KWH = 12.0;

// ---------------------------------------------------------------------------
// Environmental / Physics Coefficients
// ---------------------------------------------------------------------------

/**
 * Kenya grid emission intensity (kgCO₂/kWh).
 * Based on the national generation mix (hydro-dominant with thermal backup).
 */
export const GRID_EMISSION_FACTOR_KG_CO2_PER_KWH = 0.47;

/**
 * PV panel temperature derating coefficient (%/°C above 25 °C STC).
 * Jinko Tiger Neo N-type TOPCon (66HL4M-BDV / 72HL4-BDV): −0.29 %/°C → −0.0029 as a fraction.
 * Significantly better than older mono-Si (−0.40 %/°C) and poly-Si (−0.45 %/°C).
 */
export const PANEL_TEMP_COEFFICIENT_PER_DEG_C = -0.0029;

/**
 * Annual PV panel output degradation rate (fraction/year), applied after year 1.
 * Jinko Tiger Neo linear warranty guarantees ≤ 0.40 %/yr over 30 years.
 */
export const PANEL_ANNUAL_DEGRADATION_RATE = 0.004;

/**
 * First-year PV panel degradation (fraction).
 * Jinko Tiger Neo: 1% first-year degradation (LID/LeTID minimised by N-type TOPCon).
 */
export const PANEL_FIRST_YEAR_DEGRADATION = 0.01;

/**
 * Bifacial energy gain factor for bifacial dual-glass modules (e.g. Jinko Tiger Neo BDV).
 * At rear irradiance of 135 W/m² (per Jinko BNPI test), bifacial gain ≈ 10 %.
 * Applied when bifacial mode is enabled in simulation config.
 */
export const BIFACIAL_GAIN_FACTOR = 0.10;

/**
 * Deye hybrid inverter maximum efficiency (all SG05LP3 / SG04LP1 series).
 * Datasheet value: 97.6 %. Used in physics engine solar-to-AC conversion.
 */
export const INVERTER_MAX_EFFICIENCY = 0.976;

/**
 * Deye hybrid inverter Euro weighted efficiency.
 * Datasheet value: 97.0 % (three-phase), 96.5 % (single-phase SG04LP1).
 */
export const INVERTER_EURO_EFFICIENCY = 0.970;

/**
 * MPPT tracker efficiency (Deye all series: >99 %).
 * Applied to DC power before the inverter AC conversion stage.
 */
export const MPPT_EFFICIENCY = 0.99;

/**
 * Average annual CO₂ absorption per mature tree (kg/year).
 * Source: UN Food and Agriculture Organisation (UNFAO) estimate.
 */
export const TREE_CO2_ABSORPTION_KG_PER_YEAR = 21.77;

/**
 * Average fossil-fuel car tailpipe emission (kgCO₂/km).
 * Used to convert carbon offset into an equivalent vehicle-km metric.
 */
export const AVG_FOSSIL_CAR_EMISSION_KG_CO2_PER_KM = 0.21;

/** Daily soiling / dust accumulation loss on panel surfaces (fraction/day) */
export const SOILING_LOSS_PER_DAY = 0.005; // 0.5 % per day

/**
 * Maximum soiling derating factor (worst-case dusty season).
 * Panels will not derate below 70 % of rated output before rain cleans them.
 */
export const SOILING_MIN_FACTOR = 0.70;

// ---------------------------------------------------------------------------
// Feed-in Tariff
// ---------------------------------------------------------------------------

/** Rate paid for solar energy exported to the grid (KES/kWh) */
export const FEED_IN_TARIFF_RATE_KES = 5.0;

// ---------------------------------------------------------------------------
// API / Payload Guards
// ---------------------------------------------------------------------------

/** Maximum allowed request body size for the AI endpoint (bytes) */
export const AI_MAX_BODY_BYTES = 32 * 1024; // 32 KB

/** Maximum characters accepted in a single user prompt to the AI */
export const AI_MAX_PROMPT_CHARS = 2_000;

/** Maximum conversation history turns forwarded to the LLM */
export const AI_MAX_HISTORY_TURNS = 12;

/** Timeout for each Gemini API call (milliseconds) */
export const GEMINI_TIMEOUT_MS = 10_000;

/** Timeout for each Z.AI API call (milliseconds) */
export const ZAI_TIMEOUT_MS = 8_000;

/** Number of retries for transient AI provider failures */
export const AI_MAX_RETRIES = 1;

/** AI response cache TTL in milliseconds (5 minutes) */
export const AI_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Absolute upper bound on simulation data points accepted by report/export
 * endpoints. 420 points/day × 365 days × 25 years ≈ 3.83 M records.
 */
export const MAX_EXPORT_DATA_POINTS = 420 * 365 * 25;

// ---------------------------------------------------------------------------
// Simulation Timing
// ---------------------------------------------------------------------------

/** Number of simulation steps per simulated day (every ~3.4 minutes) */
export const SIM_STEPS_PER_DAY = 420;

/** Duration of one simulation step in hours */
export const SIM_STEP_DURATION_HOURS = 24 / SIM_STEPS_PER_DAY;
