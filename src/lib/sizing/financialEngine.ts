// Financial Analysis sheet: KPLC Time-of-Use tariff modeling (Section B2),
// financing/debt block (Section B), and extra investment metrics (Section C)
// beyond the base NPV/IRR/LCOE already computed in solarCalculator.ts.

export type KPLCCustomerSegment = 'Residential' | 'Small Commercial' | 'Commercial & Industrial';
export type TariffStructure = 'Standard' | 'Time-of-Use';

export interface KPLCTariffCategory {
  code: string;
  label: string;
  segment: KPLCCustomerSegment;
  supportsTOU: boolean;
  peakRateKSh: number;
  offPeakRateKSh: number | null;
}

// Approximate KPLC/EPRA tariff schedule (effective July 2025 basis, per the source
// workbook). Kept as clearly-labeled approximations - confirm against the live
// EPRA/KPLC schedule before using in a bankable proposal.
export const KPLC_TARIFF_CATEGORIES: KPLCTariffCategory[] = [
  { code: 'DC', label: 'Domestic (DC)', segment: 'Residential', supportsTOU: false, peakRateKSh: 21.5, offPeakRateKSh: null },
  { code: 'SC1', label: 'Small Commercial 1 (SC1)', segment: 'Small Commercial', supportsTOU: false, peakRateKSh: 19.8, offPeakRateKSh: null },
  { code: 'SC2', label: 'Small Commercial 2 (SC2)', segment: 'Small Commercial', supportsTOU: false, peakRateKSh: 18.6, offPeakRateKSh: null },
  { code: 'CI1', label: 'Commercial & Industrial 1 (CI1)', segment: 'Commercial & Industrial', supportsTOU: true, peakRateKSh: 16.2, offPeakRateKSh: 9.8 },
  { code: 'CI2', label: 'Commercial & Industrial 2 (CI2)', segment: 'Commercial & Industrial', supportsTOU: true, peakRateKSh: 14.5, offPeakRateKSh: 8.4 },
];

export function suggestTariffCategory(segment: KPLCCustomerSegment, monthlyConsumptionKWh: number): KPLCTariffCategory {
  if (segment === 'Residential') return KPLC_TARIFF_CATEGORIES[0];
  if (segment === 'Small Commercial') {
    return monthlyConsumptionKWh > 15000 ? KPLC_TARIFF_CATEGORIES[2] : KPLC_TARIFF_CATEGORIES[1];
  }
  return monthlyConsumptionKWh > 100000 ? KPLC_TARIFF_CATEGORIES[4] : KPLC_TARIFF_CATEGORIES[3];
}

export interface TOUTariffInputs {
  category: KPLCTariffCategory;
  tariffStructure: TariffStructure;
  variableSurchargeAdderKSh: number; // FCC+FERFA+IA+WARMA, default 4.41
  ercLevyKSh: number;                // default 0.08
  repLevyPercent: number;            // default 5%
  vatPercent: number;                // default 16%
  peakHoursFraction: number;         // default 0.8
}

export interface TOUTariffResult {
  effectivePeakTariffKShPerKWh: number;
  effectiveOffPeakTariffKShPerKWh: number | null;
  blendedTariffKShPerKWh: number;
}

function allInTariff(baseRate: number, i: TOUTariffInputs): number {
  const withSurcharges = baseRate + i.variableSurchargeAdderKSh + i.ercLevyKSh;
  const withRep = withSurcharges * (1 + i.repLevyPercent / 100);
  return withRep * (1 + i.vatPercent / 100);
}

export function computeTOUTariff(i: TOUTariffInputs): TOUTariffResult {
  const effectivePeakTariffKShPerKWh = Math.round(allInTariff(i.category.peakRateKSh, i) * 100) / 100;
  const effectiveOffPeakTariffKShPerKWh =
    i.tariffStructure === 'Time-of-Use' && i.category.offPeakRateKSh != null
      ? Math.round(allInTariff(i.category.offPeakRateKSh, i) * 100) / 100
      : null;

  const blendedTariffKShPerKWh = effectiveOffPeakTariffKShPerKWh != null
    ? Math.round((i.peakHoursFraction * effectivePeakTariffKShPerKWh + (1 - i.peakHoursFraction) * effectiveOffPeakTariffKShPerKWh) * 100) / 100
    : effectivePeakTariffKShPerKWh;

  return { effectivePeakTariffKShPerKWh, effectiveOffPeakTariffKShPerKWh, blendedTariffKShPerKWh };
}

// ─── FINANCING / DEBT BLOCK ─────────────────────────────────────────────────

export interface FinancingInputs {
  debtFractionPercent: number;   // 0 = cash purchase
  loanInterestRatePercent: number;
  loanTermYears: number;
}

export interface FinancingResult {
  loanAmountUSD: number;
  equityUSD: number;
  annualDebtServiceUSD: number;
}

export function computeFinancing(totalCapExUSD: number, f: FinancingInputs): FinancingResult {
  const loanAmountUSD = Math.round(totalCapExUSD * f.debtFractionPercent / 100);
  const equityUSD = totalCapExUSD - loanAmountUSD;
  if (loanAmountUSD <= 0 || f.loanTermYears <= 0) {
    return { loanAmountUSD, equityUSD, annualDebtServiceUSD: 0 };
  }
  const r = f.loanInterestRatePercent / 100;
  const n = f.loanTermYears;
  const annualDebtServiceUSD = r === 0
    ? Math.round(loanAmountUSD / n)
    : Math.round((loanAmountUSD * r) / (1 - Math.pow(1 + r, -n)));
  return { loanAmountUSD, equityUSD, annualDebtServiceUSD };
}

// ─── SECTION D: 25-YEAR CASH FLOW MODEL ────────────────────────────────────
// Excel model: Year0 = -capex. Years 1-N: gross savings (degraded generation x
// self-consumption ratio x escalating blended tariff), minus O&M, minus battery
// replacement in the chosen year. No hourly load model and no export revenue -
// only self-consumption is valued, matching the workbook's stated assumption.

export interface CashFlowYear {
  year: number;
  energyGeneratedKWh: number;
  effectiveTariffKShPerKWh: number;
  grossSavingsUSD: number;
  omUSD: number;
  batteryReplacementUSD: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
  debtServiceUSD: number;
  leveredNetCashFlow: number;
  cumulativeLeveredCashFlow: number;
}

export interface CashFlowBuildParams {
  totalCapExUSD: number;
  equityUSD: number;
  annualPVGeneratedKWhYear1: number;
  selfConsumptionRatioPercent: number;
  blendedTariffKShPerKWh: number;
  kshPerUsd: number;
  tariffEscalationPercent: number;
  panelDegradationPercent: number;
  annualOMCostUSDYear1: number;
  omEscalationPercent: number;
  batteryReplacementYear: number;
  batteryReplacementCostUSD: number;
  projectLifeYears: number;
  annualDebtServiceUSD: number;
  loanTermYears: number;
}

export function buildCashFlows(p: CashFlowBuildParams): CashFlowYear[] {
  const rows: CashFlowYear[] = [];
  let cum = -p.totalCapExUSD;
  // Year 0: unlevered CF is the full capex outlay; levered CF is only the
  // borrower's equity contribution (the debt-financed portion isn't a t=0 outflow).
  let cumLevered = -p.equityUSD;
  rows.push({
    year: 0, energyGeneratedKWh: 0, effectiveTariffKShPerKWh: 0, grossSavingsUSD: 0,
    omUSD: 0, batteryReplacementUSD: 0, netCashFlow: -p.totalCapExUSD, cumulativeCashFlow: cum,
    debtServiceUSD: 0, leveredNetCashFlow: cumLevered, cumulativeLeveredCashFlow: cumLevered,
  });

  for (let y = 1; y <= p.projectLifeYears; y++) {
    const degradation = Math.pow(1 - p.panelDegradationPercent / 100, y - 1);
    const energyGeneratedKWh = Math.round(p.annualPVGeneratedKWhYear1 * degradation);
    const selfConsumedKWh = energyGeneratedKWh * (p.selfConsumptionRatioPercent / 100);
    const tariffEsc = Math.pow(1 + p.tariffEscalationPercent / 100, y - 1);
    const effectiveTariffKShPerKWh = Math.round(p.blendedTariffKShPerKWh * tariffEsc * 100) / 100;
    const grossSavingsUSD = (selfConsumedKWh * effectiveTariffKShPerKWh) / p.kshPerUsd;

    const omEsc = Math.pow(1 + p.omEscalationPercent / 100, y - 1);
    const omUSD = p.annualOMCostUSDYear1 * omEsc;
    const batteryReplacementUSD = y === p.batteryReplacementYear ? p.batteryReplacementCostUSD : 0;

    const netCashFlow = Math.round(grossSavingsUSD - omUSD - batteryReplacementUSD);
    cum += netCashFlow;

    const debtServiceUSD = y <= p.loanTermYears ? p.annualDebtServiceUSD : 0;
    const leveredNetCashFlow = Math.round(netCashFlow - debtServiceUSD);
    cumLevered += leveredNetCashFlow;

    rows.push({
      year: y, energyGeneratedKWh, effectiveTariffKShPerKWh, grossSavingsUSD: Math.round(grossSavingsUSD),
      omUSD: Math.round(omUSD), batteryReplacementUSD: Math.round(batteryReplacementUSD),
      netCashFlow, cumulativeCashFlow: Math.round(cum),
      debtServiceUSD: Math.round(debtServiceUSD), leveredNetCashFlow, cumulativeLeveredCashFlow: Math.round(cumLevered),
    });
  }
  return rows;
}

export function computeNPV(cashFlows: CashFlowYear[], discountRatePercent: number): number {
  let npv = 0;
  for (const cf of cashFlows) {
    npv += cf.netCashFlow / Math.pow(1 + discountRatePercent / 100, cf.year);
  }
  return Math.round(npv);
}

export function computeIRR(cashFlows: CashFlowYear[]): number {
  const cfArr = cashFlows.map((c) => c.netCashFlow);
  let irr = 0.08;
  try {
    let r1 = 0.05, r2 = 0.25;
    let npv1 = cfArr.reduce((s, c, i) => s + c / Math.pow(1 + r1, i), 0);
    for (let iter = 0; iter < 50; iter++) {
      const npv2 = cfArr.reduce((s, c, i) => s + c / Math.pow(1 + r2, i), 0);
      if (Math.abs(npv2) < 0.5) { irr = r2; break; }
      const rNew = r2 - (npv2 * (r2 - r1)) / (npv2 - npv1);
      r1 = r2; r2 = rNew; npv1 = npv2;
    }
  } catch { irr = 0.08; }
  return Math.round(irr * 1000) / 10;
}

// Excel-style payback: find the cumulative cash-flow crossover year and
// interpolate the fraction within it (e.g. 4.07 years, not "year 5").
export function computeSimplePayback(cashFlows: CashFlowYear[]): number {
  let cum = 0;
  for (const cf of cashFlows) {
    const prev = cum;
    cum += cf.netCashFlow;
    if (cum >= 0 && cf.year > 0) {
      const frac = cf.netCashFlow > 0 ? -prev / cf.netCashFlow : 0;
      return Math.round(((cf.year - 1) + frac) * 100) / 100;
    }
  }
  return 99;
}

export function computeDiscountedPayback(cashFlows: CashFlowYear[], discountRatePercent: number): number {
  let cumDisc = 0;
  for (const cf of cashFlows) {
    const prev = cumDisc;
    const disc = cf.netCashFlow / Math.pow(1 + discountRatePercent / 100, cf.year);
    cumDisc += disc;
    if (cumDisc >= 0 && cf.year > 0) {
      const frac = disc > 0 ? -prev / disc : 0;
      return Math.round(((cf.year - 1) + frac) * 100) / 100;
    }
  }
  return 99;
}

// Modified IRR: reinvest positive flows at the discount rate, finance negative
// flows at the loan rate (falls back to discount rate for an all-cash purchase).
export function computeMIRR(netCashFlows: number[], reinvestRatePercent: number, financeRatePercent: number): number {
  const n = netCashFlows.length - 1;
  if (n <= 0) return 0;
  const reinvest = reinvestRatePercent / 100;
  const finance = financeRatePercent / 100;

  let fvPositives = 0;
  let pvNegatives = 0;
  netCashFlows.forEach((cf, t) => {
    if (cf >= 0) fvPositives += cf * Math.pow(1 + reinvest, n - t);
    else pvNegatives += cf / Math.pow(1 + finance, t);
  });
  if (pvNegatives === 0) return 0;
  return Math.round((Math.pow(fvPositives / -pvNegatives, 1 / n) - 1) * 1000) / 10;
}

export function computeROI(cashFlows: CashFlowYear[], totalCapExUSD: number): number {
  if (totalCapExUSD <= 0) return 0;
  const lifetimeNetSavings = cashFlows.reduce((s, cf) => s + (cf.year > 0 ? cf.netCashFlow : 0), 0);
  return Math.round((lifetimeNetSavings / totalCapExUSD) * 1000) / 10;
}

export function computeProfitabilityIndex(npvUSD: number, totalCapExUSD: number): number {
  if (totalCapExUSD <= 0) return 0;
  return Math.round(((npvUSD + totalCapExUSD) / totalCapExUSD) * 100) / 100;
}

export function computeSIR(grossSavingsUSDByYear: number[], costsUSDByYear: number[], discountRatePercent: number): number {
  let pvSavings = 0, pvCosts = 0;
  grossSavingsUSDByYear.forEach((s, y) => { pvSavings += s / Math.pow(1 + discountRatePercent / 100, y); });
  costsUSDByYear.forEach((c, y) => { pvCosts += c / Math.pow(1 + discountRatePercent / 100, y); });
  if (pvCosts === 0) return 0;
  return Math.round((pvSavings / pvCosts) * 100) / 100;
}

export function computeLifetimeNetSavings(cashFlows: CashFlowYear[]): number {
  return cashFlows.reduce((s, cf) => s + (cf.year > 0 ? cf.netCashFlow : 0), 0);
}

// ─── FINANCED-PROJECT METRICS (only meaningful if debt fraction > 0) ───────

export function computeDSCR(annualSavingsUSD: number, annualDebtServiceUSD: number, loanTermYears: number): number {
  if (annualDebtServiceUSD <= 0 || loanTermYears <= 0) return 0;
  return Math.round((annualSavingsUSD / annualDebtServiceUSD) * 100) / 100;
}

export function computeROE(annualSavingsUSD: number, annualDebtServiceUSD: number, equityUSD: number): number {
  if (equityUSD <= 0) return 0;
  const leveredYear1CF = annualSavingsUSD - annualDebtServiceUSD;
  return Math.round((leveredYear1CF / equityUSD) * 1000) / 10;
}

export function computeEquityPaybackYears(
  annualSavingsUSD: number,
  annualDebtServiceUSD: number,
  equityUSD: number,
  projectLifeYears: number,
): number {
  if (equityUSD <= 0) return 0;
  const leveredAnnualCF = annualSavingsUSD - annualDebtServiceUSD;
  if (leveredAnnualCF <= 0) return 99;
  let cum = -equityUSD;
  for (let y = 1; y <= projectLifeYears; y++) {
    cum += leveredAnnualCF;
    if (cum >= 0) return y;
  }
  return 99;
}
