'use client';

import { createLoadProfileFromSimulation, generateRecommendation } from '@/lib/recommendation-engine';
import type { SolarIrradianceData } from '@/lib/nasa-power-api';

type MinuteDatum = {
  date?: string;
  ev1LoadKWh?: number;
  ev2LoadKWh?: number;
  ev1LoadKW?: number;
  ev2LoadKW?: number;
  homeLoadKWh?: number;
  homeLoadKW?: number;
  solarEnergyKWh?: number;
  solarKW?: number;
  gridImportKWh?: number;
  tariffRate?: number;
};

export type FinancialInputs = {
  chargingTariffKes: number;
  discountRatePct: number;
  stationCount: number;
  targetUtilizationPct?: number;
  projectYears?: number;
};

export type FinancialSnapshot = {
  capex: {
    solar: number;
    battery: number;
    inverter: number;
    installation: number;
    total: number;
  };
  opex: {
    maintenance: number;
    insurance: number;
    reserve: number;
    total: number;
  };
  revenueMonthly: number;
  netMonthly: number;
  paybackYears: number;
  paybackProgressPct: number;
  lcoeKesPerKwh: number;
  gridBenchmarkKesPerKwh: number;
  irrPct: number;
  npvKes: number;
  utilizationPct: number;
  revenuePerStationDay: number;
  stations: number;
  baselineTariffKes: number;
  discountRatePct: number;
  projectYears: number;
  energy: {
    trackedDays: number;
    totalSolarKWh: number;
    totalEVKWh: number;
    avgDailySolarKWh: number;
    lifetimeEnergyKWh: number;
  };
};

const DAYS_PER_MONTH = 30;

const sum = (values: number[]) => values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);

const computeNPV = (cashFlows: number[], rate: number) =>
  cashFlows.reduce((acc, cf, idx) => acc + cf / Math.pow(1 + rate, idx), 0);

const computeIRR = (cashFlows: number[]) => {
  if (!cashFlows.length || cashFlows.every(v => v >= 0)) return 0;
  let low = -0.9;
  let high = 1.0;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    const npv = computeNPV(cashFlows, mid);
    if (Math.abs(npv) < 0.001) return Math.round(mid * 1000) / 10;
    if (npv > 0) low = mid; else high = mid;
  }
  return Math.round(((low + high) / 2) * 1000) / 10;
};

const averageTariffFromData = (minuteData: MinuteDatum[]) => {
  const rates = minuteData.map(d => d.tariffRate ?? 0).filter(v => v > 0);
  if (!rates.length) return 18.5;
  return sum(rates) / rates.length;
};

export function buildFinancialSnapshot({
  minuteData,
  solarData,
  inputs,
  evCapacityKw,
}: {
  minuteData: MinuteDatum[];
  solarData: SolarIrradianceData;
  inputs: FinancialInputs;
  evCapacityKw: number;
}): FinancialSnapshot {
  const projectYears = inputs.projectYears ?? 20;
  const trackedDays = new Set(minuteData.map(d => d.date)).size || 0;

  const totalEVKWh = sum(
    minuteData.map(d => {
      const ev1 = d.ev1LoadKWh ?? (d.ev1LoadKW ?? 0) * (24 / 420);
      const ev2 = d.ev2LoadKWh ?? (d.ev2LoadKW ?? 0) * (24 / 420);
      return ev1 + ev2;
    })
  );
  const totalSolarKWh = sum(
    minuteData.map(d => d.solarEnergyKWh ?? (d.solarKW ?? 0) * (24 / 420))
  );

  const avgDailyEvKWh = trackedDays > 0 ? totalEVKWh / trackedDays : 0;
  const avgDailySolarKWh = trackedDays > 0 ? totalSolarKWh / trackedDays : (solarData.annualAverage || 5.4) * 24 * 0.75;
  const monthlyEvKWh = avgDailyEvKWh * DAYS_PER_MONTH;
  const revenueMonthly = monthlyEvKWh * inputs.chargingTariffKes;

  let recommendation: ReturnType<typeof generateRecommendation> | null = null;
  try {
    if (minuteData.length > 0) {
      const loadProfile = createLoadProfileFromSimulation(minuteData as any);
      recommendation = generateRecommendation(loadProfile, solarData, {
        batteryPreference: 'lifepo4',
        gridBackupRequired: true,
      });
    }
  } catch (error) {
    console.warn('Financial snapshot: recommendation generation skipped', error);
  }

  const capexSolar = recommendation?.solarPanels.estimatedCostKES ?? 0;
  const capexBattery = recommendation?.battery.estimatedCostKES ?? 0;
  const capexInverter = recommendation?.inverter.estimatedCostKES ?? 0;
  const capexInstallation = recommendation?.financial.installationCostKES ?? 0;
  const capexTotal =
    recommendation?.financial.totalInvestmentKES ??
    (capexSolar + capexBattery + capexInverter + capexInstallation || 1500000);

  const maintenanceMonthly = capexTotal * 0.02 / 12;
  const insuranceMonthly = capexTotal * 0.005 / 12;
  const batteryReserveMonthly = (capexBattery * Math.floor(projectYears / 10)) / (projectYears * 12 || 1);
  const opexTotal = maintenanceMonthly + insuranceMonthly + batteryReserveMonthly;

  const netMonthly = Math.max(0, revenueMonthly - opexTotal);
  const paybackYears = capexTotal > 0 && netMonthly > 0 ? capexTotal / (netMonthly * 12) : 0;

  const avgTariff = averageTariffFromData(minuteData);
  const lifetimeEnergyKWh = Math.max(1, (recommendation?.performance.dailySolarGenerationKwh ?? avgDailySolarKWh) * 365 * projectYears);
  const lcoe = (capexTotal + opexTotal * 12 * projectYears) / lifetimeEnergyKWh;

  const monthsTracked = trackedDays / DAYS_PER_MONTH;
  const profitToDate = Math.max(0, totalEVKWh * inputs.chargingTariffKes - opexTotal * monthsTracked);
  const paybackProgressPct = capexTotal > 0 ? Math.min(100, Math.max(0, (profitToDate / capexTotal) * 100)) : 0;

  const annualNet = netMonthly * 12;
  const cashFlows = [
    -capexTotal,
    ...Array.from({ length: projectYears }, (_, idx) => {
      const replacement = capexBattery > 0 && (idx + 1) % 10 === 0 ? capexBattery : 0;
      return annualNet - replacement;
    }),
  ];

  const irrPct = computeIRR(cashFlows);
  const npvKes = Math.round(computeNPV(cashFlows, inputs.discountRatePct / 100));

  const utilizationPct = evCapacityKw > 0 ? Math.min(100, (avgDailyEvKWh / (evCapacityKw * 24)) * 100) : 0;
  const revenuePerStationDay = inputs.stationCount > 0 ? (avgDailyEvKWh * inputs.chargingTariffKes) / inputs.stationCount : 0;

  return {
    capex: {
      solar: capexSolar || capexTotal * 0.4,
      battery: capexBattery || capexTotal * 0.25,
      inverter: capexInverter || capexTotal * 0.15,
      installation: capexInstallation || capexTotal * 0.2,
      total: capexTotal,
    },
    opex: {
      maintenance: maintenanceMonthly,
      insurance: insuranceMonthly,
      reserve: batteryReserveMonthly,
      total: opexTotal,
    },
    revenueMonthly,
    netMonthly,
    paybackYears,
    paybackProgressPct,
    lcoeKesPerKwh: lcoe,
    gridBenchmarkKesPerKwh: avgTariff,
    irrPct,
    npvKes,
    utilizationPct,
    revenuePerStationDay,
    stations: inputs.stationCount,
    baselineTariffKes: inputs.chargingTariffKes,
    discountRatePct: inputs.discountRatePct,
    projectYears,
    energy: {
      trackedDays,
      totalSolarKWh: totalSolarKWh,
      totalEVKWh: totalEVKWh,
      avgDailySolarKWh,
      lifetimeEnergyKWh,
    },
  };
}

export function simulateScenario(
  base: FinancialSnapshot,
  params: {
    chargingTariffKes: number;
    utilizationPct: number;
    stationCount: number;
    discountRatePct: number;
  }
) {
  const tariffFactor = base.baselineTariffKes > 0 ? params.chargingTariffKes / base.baselineTariffKes : 1;
  const utilizationFactor = base.utilizationPct > 0 ? params.utilizationPct / base.utilizationPct : params.utilizationPct / 100;
  const stationFactor = base.stations > 0 ? params.stationCount / base.stations : 1;

  const revenueMonthly = base.revenueMonthly * tariffFactor * utilizationFactor * stationFactor;
  const netMonthly = Math.max(0, revenueMonthly - base.opex.total);
  const paybackYears = base.capex.total > 0 && netMonthly > 0 ? base.capex.total / (netMonthly * 12) : 0;

  const annualNet = netMonthly * 12;
  const cashFlows = [
    -base.capex.total,
    ...Array.from({ length: base.projectYears }, () => annualNet),
  ];
  const irrPct = computeIRR(cashFlows);
  const npvKes = Math.round(computeNPV(cashFlows, params.discountRatePct / 100));

  return {
    revenueMonthly,
    netMonthly,
    paybackYears,
    irrPct,
    npvKes,
  };
}
