// Shared types for the sizing engine (solarCalculator.ts, microinverterCalculator.ts).
// Split out of solarCalculator.ts so both calculation paths can share one contract.

import type { SolarLocation, LoadProfilePreset } from './mockData';
import type { KPLCCustomerSegment, TariffStructure } from './financialEngine';

export type SystemArchitecture = 'central_inverter' | 'microinverter';

export interface SimulationInputs {
  location: SolarLocation;
  loadProfile: LoadProfilePreset;
  loadMultiplier: number;

  systemArchitecture: SystemArchitecture;

  // Central inverter path (hybrid/grid-tied/off-grid, from sizing_inverters catalog)
  panelId: string;
  panelQty: number;
  inverterId: string;
  inverterQty: number;
  batteryId: string;
  batteryQty: number;
  dcAcOversizeRatio: number;
  targetBatteryKWh: number;
  dynessProductLine: 'Stack100' | 'Stack280' | 'LV48';
  panelsPerString: number;

  // Microinverter path (Section F)
  microPanelId: string;
  microInverterId: string;
  microTargetSystemKW: number;

  // Cable engineering (Section G/H)
  installationMethod: 'clipped_direct' | 'conduit_trunking' | 'buried' | 'bundled';
  ambientTempC: number;
  minDesignAmbientTempC: number;

  contingencyPercent: number;
  epcMarginPercent: number;

  // Financial Analysis (Section A)
  specificYieldKWhPerKWpDay: number;
  selfConsumptionRatioPercent: number;
  gridTariffKShPerKWh: number;
  tariffEscalationPercent: number;
  panelDegradationPercent: number;
  annualOMCostPercent: number;
  omEscalationPercent: number;
  batteryReplacementYear: number;
  batteryReplacementCostPercent: number;
  discountRate: number;
  inflationRate: number;
  projectLifeYears: number;

  // KPLC Time-of-Use tariff module (Section B2)
  useTOUTariff: boolean;
  kplcCustomerSegment: KPLCCustomerSegment;
  tariffStructure: TariffStructure;
  monthlyConsumptionKWh: number;

  // Financing (Section B)
  debtFractionPercent: number;
  loanInterestRatePercent: number;
  loanTermYears: number;

  // Optional add-ons (BOM Sections 8/10)
  includeGeneratorInterface: boolean;
  includeWeatherproofEnclosure: boolean;
  includeKPLCapplication: boolean;
  includeOandM: boolean;

  // V2 scientific & sizing enhancements (all optional for full backwards compatibility)
  pvSizingGoal?: 'dc_ac_ratio' | 'daily_energy' | 'least_waste';
  maxWastedFrac?: number;
  exportAllowed?: boolean;
  exportLimitKw?: number;
  exportTariffKShPerKWh?: number;
  demandChargeKShPerKVA?: number;
  powerFactor?: number;
  essentialLoadKw?: number;
  outageHours?: number[];
  solarSource?: string;
  taxShieldEnabled?: boolean;
  corporateTaxRatePercent?: number;
  investmentDeductionPercent?: number;
}

export interface BOMLineItem {
  section: string;
  itemNumber: string;
  description: string;
  unit: string;
  qty: number;
  unitPriceKSh: number;
  unitPriceUSD: number;
  totalKSh: number;
  totalUSD: number;
  notes: string;
}

export interface CableSizingResult {
  circuit: string;
  designCurrentA: number;
  recommendedSizeMM2: number;
  parallelRuns: number;
  pricePerM: number;
  totalLengthM: number;
  totalCostKSh: number;
}

export interface CapExItem {
  name: string;
  category: string;
  qty: number;
  unitCost: number;
  totalCost: number;
  brand: string;
  model: string;
}

export interface FinancialYearRow {
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
  // Legacy fields kept for the existing SimulationResults cash-flow table.
  cashFlowWithoutSolar: number;
  cashFlowWithSolar: number;
}

export interface HourlyIllustrativeRow {
  hour: number;
  loadKW: number;
  solarKW: number;
  gridAvailable: boolean;
  batterySoCBefore: number;
  batterySoCAfter: number;
  batteryChargeKW: number;
  batteryDischargeKW: number;
  gridImportKW: number;
  gridExportKW: number;
  dieselGenKW: number;
  unservedLoadKW: number;
}

export interface EngineeringChecks {
  pvOversizeWarning: string | null;
  batteryVoltageWarning: string | null;
  pvStringVoltageWindowMessage: string;
  pvStringVoltageWindowOk: boolean;
  deratingChecks: Array<{ circuit: string; baseAmpacityA: number; deratedAmpacityA: number; designCurrentA: number; ok: boolean }>;
  inverterBatteryMatch?: {
    ok: boolean;
    status: 'compatible' | 'empty-undervoltage' | 'full-overvoltage' | 'unassessed';
    nominalV: number;
    emptyV: number;
    fullV: number;
    inverterMinV: number | null;
    inverterMaxV: number | null;
    message: string;
  };
  stringLayoutSummary?: {
    stringCount: number;
    panelsPerString: number;
    usedPanelCount: number;
    mpptsUsed: number;
    message: string;
  };
}

export interface FinancingMetrics {
  loanAmountUSD: number;
  equityUSD: number;
  annualDebtServiceUSD: number;
  dscr: number;
  roePercent: number;
  equityPaybackYears: number;
}

export interface ExtraMetrics {
  discountedPaybackYears: number;
  mirrPercent: number;
  roiPercent: number;
  profitabilityIndex: number;
  savingsToInvestmentRatio: number;
  lifetimeNetSavingsUSD: number;
}

export interface TOUTariffSummary {
  category: string;
  effectivePeakTariffKShPerKWh: number;
  effectiveOffPeakTariffKShPerKWh: number | null;
  blendedTariffKShPerKWh: number;
}

export interface SimulationResults {
  inputs: SimulationInputs;
  systemArchitecture: SystemArchitecture;

  solarCapacityKWp: number;
  batteryCapacityKWh: number;
  inverterCapacityKW: number;
  panelAreaRequiredM2: number;
  actualDcAcRatio: number;

  engineeringChecks: EngineeringChecks;
  // Back-compat top-level accessors (mirror engineeringChecks fields).
  pvOversizeWarning: string | null;
  batteryVoltageWarning: string | null;

  hourlyProfile: HourlyIllustrativeRow[];
  annualPVGeneratedKWh: number;
  selfConsumedKWh: number;
  exportedOrCurtailedKWh: number;
  annualLoadKWh: number;
  annualGridImportKWh: number;
  annualGridExportKWh: number;
  annualDieselGenKWh: number;
  annualDieselFuelLiters: number;
  annualUnservedLoadKWh: number;
  solarSelfConsumptionPercent: number;
  systemAutonomyPercent: number;

  bomLineItems: BOMLineItem[];
  cableSizingResults: CableSizingResult[];

  capexItems: CapExItem[];
  subtotalCapExKSh: number;
  subtotalCapExUSD: number;
  contingencyKSh: number;
  contingencyUSD: number;
  epcMarginKSh: number;
  epcMarginUSD: number;
  vatKSh: number;
  vatUSD: number;
  totalCapExKSh: number;
  totalCapExUSD: number;

  annualGridBillWithoutSolarUSD: number;
  annualDieselCostWithoutSolarUSD: number;
  baselineAnnualCostUSD: number;
  annualGridBillWithSolarUSD: number;
  annualDieselCostWithSolarUSD: number;
  annualMaintenanceUSD: number;
  annualInsuranceUSD: number;
  annualBatteryReserveUSD: number;
  totalAnnualOpExUSD: number;

  touTariff: TOUTariffSummary | null;
  financing: FinancingMetrics;
  extraMetrics: ExtraMetrics;

  annualSavingsUSD: number;
  simplePaybackYears: number;
  lcoeUSDPerKWh: number;
  lcoeBaselineUSDPerKWh: number;
  npvUSD: number;
  irrPercent: number;

  annualCO2SavedTons: number;
  equivalentTreesPlanted: number;

  cashFlows: FinancialYearRow[];

  subtotalCapExUSD_legacy: number;
  contingencyUSD_legacy: number;
  epcMarginUSD_legacy: number;
  totalCapExUSD_legacy: number;

  // V2 calculation engine & seasonal metadata
  engineVersion?: string;
  solarProvenance?: {
    kind: 'measured' | 'modelled' | 'market-default' | 'user-input' | 'legacy';
    label: string;
    detail: string;
  };
  pvEnergyBasis?: {
    goal: 'dc_ac_ratio' | 'daily_energy' | 'least_waste';
    targetKwp: number;
    dailyKwhToSupply: number;
    wastedFrac: number;
    basis: string;
  };
  annualClippedKWh?: number;
  annualCurtailedKWh?: number;
  annualUsefulSolarKWh?: number;
  demandChargeSavingsUSD?: number;
  exportRevenueUSD?: number;
  worstConservationResidualKWh?: number;
  monthlyDispatchSummary?: Array<{
    monthIndex: number;
    monthName: string;
    days: number;
    peakSunHours: number;
    ambientTempC: number;
    solarKwhMonth: number;
    curtailedKwhMonth: number;
    clippedKwhMonth: number;
    gridImportKwhMonth: number;
    gridExportKwhMonth: number;
    loadKwhMonth: number;
    hourly: Array<{
      hour: number;
      solarAcKw: number;
      loadKw: number;
      gridImportKw: number;
      gridExportKw: number;
      curtailedKw: number;
      socFrac: number;
    }>;
  }>;
  batteryComparison?: Array<{
    id: string;
    name: string;
    brand: string;
    architecture: 'HV' | 'LV';
    modules: number;
    banks: number;
    nameplateKwh: number;
    usableKwh: number;
    estimatedCapexKSh: number;
    powerSufficient: boolean;
    voltageCompatible: boolean;
    isPlaceholder: boolean;
    selected: boolean;
  }>;
}
