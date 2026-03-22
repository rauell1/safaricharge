/**
 * SafariCharge – Central configuration file
 *
 * All system-level constants, tariff parameters, and physical coefficients
 * are defined here so they can be updated in one place without hunting
 * through individual source files.
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
 * Typical monocrystalline silicon value: −0.5 %/°C → −0.005 as a fraction.
 */
export const PANEL_TEMP_COEFFICIENT_PER_DEG_C = -0.005;

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
// Kenya Power & Lighting Company (KPLC) – Commercial E-Mobility Tariff
// Based on actual KPLC invoice for ROAM ELECTRIC LIMITED, February 2026.
// ---------------------------------------------------------------------------

/** Peak energy consumption rate before levies and VAT (KES/kWh) */
export const KPLC_HIGH_RATE_BASE_KES = 16.00;

/** Off-peak energy consumption rate before levies and VAT (KES/kWh) */
export const KPLC_LOW_RATE_BASE_KES = 8.00;

/** Fuel cost adjustment levy (KES/kWh) */
export const KPLC_FUEL_ENERGY_COST_KES = 3.10;

/** Foreign-exchange rate fluctuation adjustment (KES/kWh) */
export const KPLC_FERFA_KES = 1.2061;

/** Inflation adjustment levy (KES/kWh) */
export const KPLC_INFA_KES = 0.46;

/** Energy Regulatory Commission levy (KES/kWh) */
export const KPLC_ERC_LEVY_KES = 0.08;

/** Water Resources Authority levy (KES/kWh) */
export const KPLC_WRA_LEVY_KES = 0.0121;

/** Value Added Tax rate (decimal fraction) */
export const KPLC_VAT_RATE = 0.16;

/** Monthly peak-demand charge (KES per kW of recorded peak demand) */
export const KPLC_DEMAND_CHARGE_KES_PER_KW = 750.0;

// Peak hours (24-hour clock, inclusive start, exclusive end)
export const KPLC_PEAK_MORNING_START_H = 6;
export const KPLC_PEAK_MORNING_END_H = 10;
export const KPLC_PEAK_EVENING_START_H = 18;
export const KPLC_PEAK_EVENING_END_H = 22;

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
