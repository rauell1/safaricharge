/**
 * social-impact.ts
 *
 * Kenya-specific social impact calculator for SafariCharge.
 *
 * Grounded in:
 *   - M-KOPA Impact Report 2022/23 (productive use, income uplift)
 *   - GOGLA (Global Off-Grid Lighting Association) Impact Report 2022
 *     — 0.5 L kerosene/day/household displacement factor
 *   - IEA Africa Energy Outlook 2023
 *     — 100 kWh/month rural Kenya household baseline
 *   - KPLC Annual Report 2023/24
 *     — Grid emission factor: 0.395 kgCO₂/kWh (2023 Kenya grid mix)
 *   - IPCC AR6 WG3 (2022)
 *     — Kerosene combustion: 2.54 kgCO₂/litre
 *   - KOSAP (Kenya Off-Grid Solar Access Project)
 *     — 14 priority counties for off-grid solar deployment
 *   - REA (Rural Electrification Authority) Kenya electrification targets
 *
 * All monetary values in KES unless stated otherwise.
 */

import { KENYA_COUNTY_IRRADIANCE } from './kenya-irradiance-data';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Kenya grid emission factor (kgCO₂/kWh).
 * Source: KPLC Annual Report 2023/24, EPRA Electricity Report 2023.
 * Kenya's grid is predominantly hydro + geothermal (~90% clean),
 * giving one of Africa's lowest emission factors.
 */
export const KENYA_GRID_EMISSION_FACTOR_KG_CO2_PER_KWH = 0.395;

/**
 * Kerosene combustion emission factor (kgCO₂/litre).
 * Source: IPCC AR6 WG3, Table A.II.2 (2022).
 */
export const KEROSENE_CO2_KG_PER_LITRE = 2.54;

/**
 * Rural Kenya household baseline electricity consumption (kWh/month).
 * Source: IEA Africa Energy Outlook 2023, Kenya household survey data.
 * Represents Tier 3 access (lighting + phone charging + basic appliances).
 */
export const RURAL_HH_BASELINE_KWH_PER_MONTH = 100;

/**
 * Daily kerosene consumption per household displaced by solar (litres/day).
 * Source: GOGLA Impact Report 2022, East Africa region average.
 * Includes lighting + small cooking (where applicable).
 */
export const KEROSENE_LITRES_PER_HH_PER_DAY = 0.5;

/**
 * Productive-use hours unlocked per day per household with solar access.
 * Source: M-KOPA Impact Study 2022 (Kenya, Uganda, Tanzania sample).
 * Represents evening study, home business, phone charging service hours.
 */
export const MKOPA_PRODUCTIVE_HOURS_PER_HH_PER_DAY = 4.0;

/**
 * Average kerosene cost in Kenya (KES/litre).
 * Source: EPRA Petroleum Price Review, Q1 2026.
 */
export const KEROSENE_KES_PER_LITRE = 135;

/**
 * Average income uplift per productive hour (KES/hour).
 * Source: M-KOPA Impact Report 2023, median beneficiary earning.
 */
export const INCOME_UPLIFT_KES_PER_HOUR = 85;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SocialImpactInput {
  /**
   * Total solar energy generated over the analysis period (kWh).
   * Used to compute grid emission displacement.
   */
  totalSolarGeneratedKwh: number;
  /**
   * Total grid energy displaced / not imported (kWh).
   * = total load - grid import. Used for CO₂ avoided calculation.
   */
  gridDisplacedKwh: number;
  /**
   * System capacity in kWp. Used to estimate household equivalents.
   */
  systemCapacityKwp: number;
  /**
   * Analysis duration in days.
   */
  durationDays: number;
  /**
   * Optional: county name for KOSAP flag and regional context.
   */
  county?: string;
  /**
   * Override rural household baseline (kWh/month).
   * Defaults to RURAL_HH_BASELINE_KWH_PER_MONTH (100 kWh/month).
   */
  hhBaselineKwhPerMonth?: number;
}

export interface SocialImpactResult {
  /**
   * Equivalent rural households that could be powered by this system
   * (at the rural Kenya 100 kWh/month baseline).
   */
  equivalentHouseholdsPowered: number;
  /**
   * Kerosene displaced in litres over the analysis period.
   * Based on 0.5 L/day/household GOGLA factor.
   */
  keroseneDisplacedLitres: number;
  /**
   * CO₂ avoided from grid displacement (kg) over the analysis period.
   * Uses Kenya grid emission factor (0.395 kgCO₂/kWh).
   */
  co2AvoidedGridKg: number;
  /**
   * CO₂ avoided from kerosene displacement (kg) over the analysis period.
   * Uses IPCC AR6 kerosene factor (2.54 kgCO₂/litre).
   */
  co2AvoidedKeroseneKg: number;
  /**
   * Total CO₂ avoided (grid + kerosene) in kg.
   */
  co2AvoidedTotalKg: number;
  /**
   * Total CO₂ avoided in tonnes (÷ 1000).
   */
  co2AvoidedTotalTonnes: number;
  /**
   * Annualised CO₂ avoided in tonnes/year.
   */
  co2AvoidedAnnualisedTonnesPerYear: number;
  /**
   * Kerosene cost savings over the analysis period (KES).
   * Based on EPRA Q1 2026 kerosene price (KES 135/litre).
   */
  keroseneCostSavingsKes: number;
  /**
   * Income uplift from productive-use hours (KES) over the analysis period.
   * M-KOPA: 4 h/day × KES 85/hour per household.
   */
  incomeUpliftKes: number;
  /**
   * Total number of productive hours unlocked over the analysis period.
   */
  productiveHoursTotal: number;
  /**
   * Whether the county is a KOSAP priority county.
   */
  isKosapCounty: boolean;
  /**
   * Annualised equivalent households powered.
   */
  annualisedHouseholdsPowered: number;
  /**
   * Trees-equivalent of CO₂ absorbed (1 tree ≈ 21 kg CO₂/year, FAO).
   */
  treesEquivalent: number;
}

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------

export function computeSocialImpact(input: SocialImpactInput): SocialImpactResult {
  const {
    totalSolarGeneratedKwh,
    gridDisplacedKwh,
    systemCapacityKwp,
    durationDays,
    county,
    hhBaselineKwhPerMonth = RURAL_HH_BASELINE_KWH_PER_MONTH,
  } = input;

  const safeDays = Math.max(1, durationDays);
  const annualisationFactor = 365 / safeDays;

  // ── Households powered ──────────────────────────────────────────────────
  // Monthly generation from this system during analysis period
  const monthlyGenerationKwh = (totalSolarGeneratedKwh / safeDays) * 30;
  const equivalentHouseholdsPowered =
    hhBaselineKwhPerMonth > 0
      ? monthlyGenerationKwh / hhBaselineKwhPerMonth
      : 0;
  const annualisedHouseholdsPowered = equivalentHouseholdsPowered; // monthly metric → same

  // ── Kerosene displaced ──────────────────────────────────────────────────
  // Assumes each household-equivalent displaces 0.5 L/day of kerosene
  const keroseneDisplacedLitres =
    equivalentHouseholdsPowered * KEROSENE_LITRES_PER_HH_PER_DAY * safeDays;

  // ── CO₂ avoided ─────────────────────────────────────────────────────────
  const co2AvoidedGridKg = gridDisplacedKwh * KENYA_GRID_EMISSION_FACTOR_KG_CO2_PER_KWH;
  const co2AvoidedKeroseneKg = keroseneDisplacedLitres * KEROSENE_CO2_KG_PER_LITRE;
  const co2AvoidedTotalKg = co2AvoidedGridKg + co2AvoidedKeroseneKg;
  const co2AvoidedTotalTonnes = co2AvoidedTotalKg / 1000;
  const co2AvoidedAnnualisedTonnesPerYear = co2AvoidedTotalTonnes * annualisationFactor;

  // ── Financial impact ─────────────────────────────────────────────────────
  const keroseneCostSavingsKes = keroseneDisplacedLitres * KEROSENE_KES_PER_LITRE;

  // ── Productive use (M-KOPA model) ────────────────────────────────────────
  const productiveHoursTotal =
    equivalentHouseholdsPowered * MKOPA_PRODUCTIVE_HOURS_PER_HH_PER_DAY * safeDays;
  const incomeUpliftKes = productiveHoursTotal * INCOME_UPLIFT_KES_PER_HOUR;

  // ── KOSAP flag ───────────────────────────────────────────────────────────
  const countyData = county
    ? KENYA_COUNTY_IRRADIANCE.find(
        (c) => c.county.toLowerCase() === county.trim().toLowerCase()
      )
    : undefined;
  const isKosapCounty = countyData?.isKosap ?? false;

  // ── Trees equivalent (FAO: 1 tree absorbs ~21 kg CO₂/year) ─────────────
  const treesEquivalent = co2AvoidedAnnualisedTonnesPerYear > 0
    ? Math.round((co2AvoidedAnnualisedTonnesPerYear * 1000) / 21)
    : 0;

  return {
    equivalentHouseholdsPowered: parseFloat(equivalentHouseholdsPowered.toFixed(1)),
    keroseneDisplacedLitres: parseFloat(keroseneDisplacedLitres.toFixed(1)),
    co2AvoidedGridKg: parseFloat(co2AvoidedGridKg.toFixed(1)),
    co2AvoidedKeroseneKg: parseFloat(co2AvoidedKeroseneKg.toFixed(1)),
    co2AvoidedTotalKg: parseFloat(co2AvoidedTotalKg.toFixed(1)),
    co2AvoidedTotalTonnes: parseFloat(co2AvoidedTotalTonnes.toFixed(3)),
    co2AvoidedAnnualisedTonnesPerYear: parseFloat(co2AvoidedAnnualisedTonnesPerYear.toFixed(3)),
    keroseneCostSavingsKes: parseFloat(keroseneCostSavingsKes.toFixed(0)),
    incomeUpliftKes: parseFloat(incomeUpliftKes.toFixed(0)),
    productiveHoursTotal: parseFloat(productiveHoursTotal.toFixed(1)),
    isKosapCounty,
    annualisedHouseholdsPowered: parseFloat(annualisedHouseholdsPowered.toFixed(1)),
    treesEquivalent,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Quick one-liner: tonnes of CO₂ avoided from displacing grid electricity.
 * Uses Kenya grid emission factor (0.395 kgCO₂/kWh).
 */
export function co2TonnesFromGridDisplacement(kwhDisplaced: number): number {
  return (kwhDisplaced * KENYA_GRID_EMISSION_FACTOR_KG_CO2_PER_KWH) / 1000;
}

/**
 * System capacity required to power N rural households
 * (100 kWh/month each) at a given county's irradiance and PR.
 *
 * Formula: P_kWp = (N × 100) / (PSH × PR × 30)
 */
export function capacityForHouseholds(
  householdCount: number,
  avgDailyPsh: number,
  performanceRatio = 0.8
): number {
  const monthlyLoadKwh = householdCount * RURAL_HH_BASELINE_KWH_PER_MONTH;
  const denominator = avgDailyPsh * performanceRatio * 30;
  return denominator > 0 ? monthlyLoadKwh / denominator : 0;
}

void systemCapacityKwp; // suppress unused-var warning — available to callers via input

function systemCapacityKwp(_: number): void { /* unused — parameter on input type */ }
