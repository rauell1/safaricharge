export interface FinancialInputs {
  panelCostKesPerWp: number;
  batteryKesPerKwh: number;
  inverterKesPerKw: number;
  installationKes: number;
  bosPercent: number;
  annualOpexKes: number;
  discountRate: number;
  tariffEscalation: number;
  gridTariffKesPerKwh: number;
  annualSolarKwh: number;
  selfConsumptionRatio: number;
  gridExportTariffKes: number;
}

export interface FinancialResult {
  capexKes: number;
  lcoe: number;
  paybackYears: number;
  npv: number;
  irr: number | null;
  roi: number;
  annualSavingsKes: number;
  cashFlows: number[];
  cumulativeCashFlows: number[];
}

const PROJECT_YEARS = 25;
// Jinko Tiger Neo N-type TOPCon: 0.40%/yr (30-year linear warranty) vs old 0.50%/yr generic
const ANNUAL_DEGRADATION = 0.004;
const IRR_TOLERANCE = 1e-6;
const IRR_MAX_ITERATIONS = 50;

const clampRatio = (value: number) => Math.min(1, Math.max(0, value));

const annualEnergyForYear = (year: number, annualSolarKwh: number) => {
  const degradationFactor = Math.pow(1 - ANNUAL_DEGRADATION, year - 1);
  return Math.max(0, annualSolarKwh * degradationFactor);
};

const annualGridTariffForYear = (year: number, baseTariffKesPerKwh: number, escalation: number) => {
  return baseTariffKesPerKwh * Math.pow(1 + escalation, year);
};

const npvFromCashFlows = (cashFlows: number[], discountRate: number, capexKes: number) => {
  let npv = -capexKes;
  for (let year = 1; year <= cashFlows.length; year += 1) {
    npv += cashFlows[year - 1] / Math.pow(1 + discountRate, year);
  }
  return npv;
};

const solveIrr = (cashFlows: number[], capexKes: number): number | null => {
  let irr = 0.1;

  for (let iteration = 0; iteration < IRR_MAX_ITERATIONS; iteration += 1) {
    let npv = -capexKes;
    let derivative = 0;

    for (let year = 1; year <= cashFlows.length; year += 1) {
      const cf = cashFlows[year - 1];
      const discountBase = 1 + irr;
      if (discountBase <= 0) return null;
      npv += cf / Math.pow(discountBase, year);
      derivative += (-year * cf) / Math.pow(discountBase, year + 1);
    }

    if (Math.abs(npv) <= IRR_TOLERANCE) {
      return Number.isFinite(irr) ? irr : null;
    }

    if (Math.abs(derivative) < 1e-12) {
      return null;
    }

    const next = irr - npv / derivative;
    if (!Number.isFinite(next) || next <= -0.999999) {
      return null;
    }

    if (Math.abs(next - irr) <= IRR_TOLERANCE) {
      return Number.isFinite(next) ? next : null;
    }

    irr = next;
  }

  return null;
};

export function calculateFinancials(
  inputs: FinancialInputs,
  pvCapacityKw: number,
  batteryCapacityKwh: number,
): FinancialResult {
  const safePvCapacityKw = Math.max(0, pvCapacityKw);
  const safeBatteryCapacityKwh = Math.max(0, batteryCapacityKwh);
  const safeDiscountRate = Math.max(0, inputs.discountRate);
  const safeTariffEscalation = Math.max(-0.99, inputs.tariffEscalation);
  const selfConsumptionRatio = clampRatio(inputs.selfConsumptionRatio);

  const pvCapacityWp = safePvCapacityKw * 1000;
  const equipmentCostKes =
    Math.max(0, inputs.panelCostKesPerWp) * pvCapacityWp +
    Math.max(0, inputs.batteryKesPerKwh) * safeBatteryCapacityKwh +
    Math.max(0, inputs.inverterKesPerKw) * safePvCapacityKw;

  const capexKes =
    equipmentCostKes +
    Math.max(0, inputs.installationKes) +
    (Math.max(0, inputs.bosPercent) / 100) * equipmentCostKes;

  const annualEnergyYear1 = annualEnergyForYear(1, Math.max(0, inputs.annualSolarKwh));
  const annualSelfConsumedYear1 = annualEnergyYear1 * selfConsumptionRatio;
  const annualExportedYear1 = annualEnergyYear1 * (1 - selfConsumptionRatio);
  const gridTariffYear1 = annualGridTariffForYear(1, Math.max(0, inputs.gridTariffKesPerKwh), safeTariffEscalation);

  const annualSavingsKes =
    annualSelfConsumedYear1 * gridTariffYear1 +
    annualExportedYear1 * Math.max(0, inputs.gridExportTariffKes);

  const paybackYears = annualSavingsKes > 0 ? capexKes / annualSavingsKes : Number.POSITIVE_INFINITY;

  let discountedOpexKes = 0;
  let discountedEnergyKwh = 0;
  const cashFlows: number[] = [];
  const cumulativeCashFlows: number[] = [];
  let cumulativeDiscountedCashFlow = 0;

  for (let year = 1; year <= PROJECT_YEARS; year += 1) {
    const energyKwh = annualEnergyForYear(year, Math.max(0, inputs.annualSolarKwh));
    const gridTariff = annualGridTariffForYear(year, Math.max(0, inputs.gridTariffKesPerKwh), safeTariffEscalation);
    const selfConsumedKwh = energyKwh * selfConsumptionRatio;
    const exportedKwh = energyKwh * (1 - selfConsumptionRatio);
    const annualSavings =
      selfConsumedKwh * gridTariff +
      exportedKwh * Math.max(0, inputs.gridExportTariffKes);

    const opexKes = Math.max(0, inputs.annualOpexKes);
    const cashFlow = annualSavings - opexKes;
    const discountFactor = Math.pow(1 + safeDiscountRate, year);

    discountedOpexKes += opexKes / discountFactor;
    discountedEnergyKwh += energyKwh / discountFactor;

    cashFlows.push(cashFlow);
    cumulativeDiscountedCashFlow += cashFlow / discountFactor;
    cumulativeCashFlows.push(cumulativeDiscountedCashFlow);
  }

  const lcoe = discountedEnergyKwh > 0 ? (capexKes + discountedOpexKes) / discountedEnergyKwh : Number.POSITIVE_INFINITY;
  const npv = npvFromCashFlows(cashFlows, safeDiscountRate, capexKes);
  const irr = solveIrr(cashFlows, capexKes);
  const roi = capexKes > 0 ? (npv / capexKes) * 100 : 0;

  return {
    capexKes,
    lcoe,
    paybackYears,
    npv,
    irr,
    roi,
    annualSavingsKes,
    cashFlows,
    cumulativeCashFlows,
  };
}

export function defaultFinancialInputs(): FinancialInputs {
  return {
    panelCostKesPerWp: 55,
    batteryKesPerKwh: 25000,
    inverterKesPerKw: 18000,
    installationKes: 350000,
    bosPercent: 15,
    annualOpexKes: 50000,
    discountRate: 0.1,
    tariffEscalation: 0.05,
    gridTariffKesPerKwh: 23,
    annualSolarKwh: 18000,
    selfConsumptionRatio: 0.75,
    gridExportTariffKes: 8,
  };
}
