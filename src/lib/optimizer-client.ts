/**
 * SafariCharge – Optimizer Service Client
 *
 * Thin TypeScript wrapper around the Python Pyomo optimizer service.
 * Converts the TariffProfile from tariff-config.ts into per-step price
 * vectors, then POSTs to the optimizer microservice and returns the
 * typed response.
 */
import type { TariffProfile } from './tariff-config';

const OPTIMIZER_URL =
  process.env.OPTIMIZER_SERVICE_URL ?? 'http://localhost:8001';

// ---------------------------------------------------------------------------
// Request / response types (mirrors python/optimizer_service/models.py)
// ---------------------------------------------------------------------------

export interface PVBlock {
  dc_capacity_kwp: number;
  inverter_capacity_kw: number;
  pv_forecast_kw: number[];
}

export interface LoadBlock {
  load_forecast_kw: number[];
}

export interface BESSBlock {
  capacity_kwh: number;
  max_charge_kw: number;
  max_discharge_kw: number;
  roundtrip_efficiency?: number; // default 0.92
  soc_min_pct?: number;          // default 0.10
  soc_max_pct?: number;          // default 0.95
  soc_initial_pct?: number;      // default 0.50
}

export interface GridBlock {
  max_import_kw: number;
  import_price_kes_kwh: number[];
  export_price_kes_kwh: number[];
  allow_export?: boolean;
}

export interface OptimizeRequest {
  horizon_steps: number;
  step_hours: number;
  pv: PVBlock;
  load: LoadBlock;
  bess: BESSBlock;
  grid: GridBlock;
  solver?: 'cbc' | 'glpk';
}

export interface BESSDispatchResult {
  charge_kw: number[];
  discharge_kw: number[];
  soc_kwh: number[];
  soc_pct: number[];
}

export interface GridDispatchResult {
  import_kw: number[];
  export_kw: number[];
  import_cost_kes: number[];
  export_revenue_kes: number[];
}

export interface EnergyBalanceResult {
  pv_used_kw: number[];
  pv_to_bess_kw: number[];
  pv_to_grid_kw: number[];
  grid_to_load_kw: number[];
  bess_to_load_kw: number[];
  balance_error_kw: number[];
}

export interface OptimizeSummary {
  total_import_cost_kes: number;
  total_export_revenue_kes: number;
  net_energy_cost_kes: number;
  self_sufficiency_pct: number;
  self_consumption_pct: number;
  peak_import_kw: number;
  solver_status: string;
  solver_termination: string;
  solve_time_s: number | null;
}

export interface OptimizeResponse {
  horizon_steps: number;
  step_hours: number;
  bess: BESSDispatchResult;
  grid: GridDispatchResult;
  energy_balance: EnergyBalanceResult;
  summary: OptimizeSummary;
  backend_version: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Tariff helpers
// ---------------------------------------------------------------------------

/**
 * Build per-step import price vectors from a TariffProfile.
 *
 * @param profile   KPLC tariff profile from tariff-config.ts
 * @param horizonH  Number of hours in the optimisation horizon (e.g. 24)
 * @param stepHours Resolution per step (e.g. 1.0 for hourly, 0.25 for 15-min)
 * @param date      Reference date to determine weekday/weekend
 */
export function buildPriceVector(
  profile: TariffProfile,
  horizonH: number,
  stepHours: number,
  date: Date = new Date()
): { importPrices: number[]; exportPrices: number[] } {
  const steps = Math.round(horizonH / stepHours);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  const importPrices: number[] = [];
  const exportPrices: number[] = [];

  const {
    highRateBase,
    lowRateBase,
    fuelEnergyCost,
    ferfa,
    infa,
    ercLevy,
    wraLevy,
    vatRate,
  } = profile.energy;

  const surcharge = fuelEnergyCost + ferfa + infa + ercLevy + wraLevy;

  for (let i = 0; i < steps; i++) {
    const hourOfDay = (i * stepHours) % 24;

    const offPeakDueToWeekend = profile.weekendOffPeak && isWeekend;
    const isPeak =
      !offPeakDueToWeekend &&
      profile.peakHours.some(
        ({ start, end }) => hourOfDay >= start && hourOfDay < end
      );

    const baseRate = isPeak ? highRateBase : lowRateBase;
    const preVat = baseRate + surcharge;
    const allIn = preVat * (1 + vatRate);

    importPrices.push(parseFloat(allIn.toFixed(4)));
    // Export: simple net-metering at off-peak rate (KPLC practice)
    exportPrices.push(parseFloat((lowRateBase * (1 + vatRate)).toFixed(4)));
  }

  return { importPrices, exportPrices };
}

// ---------------------------------------------------------------------------
// HTTP client
// ---------------------------------------------------------------------------

export async function callOptimizer(
  req: OptimizeRequest
): Promise<OptimizeResponse> {
  const res = await fetch(`${OPTIMIZER_URL}/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `Optimizer service error ${res.status}: ${detail}`
    );
  }

  return res.json() as Promise<OptimizeResponse>;
}

export async function checkOptimizerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${OPTIMIZER_URL}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
