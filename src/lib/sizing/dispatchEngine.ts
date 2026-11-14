/**
 * Conservation-checked 24-hour chronological PV + BESS dispatch engine and
 * 12-calendar-month weighted seasonal aggregator (ported from StimaPulse V2).
 */
import { INCIDENCE_ANGLE_LOSS_FRAC, MONTH_DAYS, MONTH_NAMES } from '@/lib/solar-resource';

export const CONSERVATION_TOLERANCE_FRAC = 0.001;
const SUNRISE = 6;
const SUNSET = 18;
const STC_IRRADIANCE_W_M2 = 1000;
const STC_CELL_TEMP_C = 25;

export interface HourlyDispatchInput {
  pvDcKwp: number;
  inverterAcKw: number;
  inverterEfficiencyFrac: number;
  noctC?: number;
  gammaFracPerC?: number;
  soilingLossFrac?: number;
  otherLossFrac?: number;
  incidenceAngleLossFrac?: number;
  snowLossFrac?: number;
  peakSunHours: number;
  ambientTempC: number;
  loadKwByHour: number[];
  /** Hourly electricity tariff rate in USD/kWh (length 24). */
  tariffUsdByHour: number[];
  batteryUsableKwh: number;
  batteryMaxChargeKw: number;
  batteryMaxDischargeKw: number;
  batteryRoundTripEffFrac: number;
  /** Minimum reserve fraction of usable capacity (0..1). */
  batteryReserveFrac: number;
  initialSocFrac?: number;
  gridAvailable: boolean;
  exportAllowed: boolean;
  exportLimitKw?: number;
  exportTariffUsdPerKwh?: number;
  importLimitKw?: number;
  /** Hours [0..23] with scheduled grid outage. */
  outageHours?: number[];
  /** Essential backed-up load limit during outage (kW). When provided and grid has outage without generator, non-essential load is shed. */
  outageEssentialLoadKw?: number;
  /** Monthly utility demand charge rate in USD per kW of peak import. */
  demandChargeUsdPerKw?: number;
  socMode?: 'periodic' | 'chronological';
}

export interface HourlyDispatchStep {
  hour: number;
  solarAcKw: number;
  clippedKw: number;
  loadKw: number;
  servedKw: number;
  shedKw: number;
  batteryKw: number; // + charge, - discharge
  socFrac: number;
  gridImportKw: number;
  gridExportKw: number;
  curtailedKw: number;
  unservedKw: number;
  tariffUsdPerKwh: number;
}

export interface DayDispatchSummary {
  hours: HourlyDispatchStep[];
  solarKwhDay: number;
  clippedKwhDay: number;
  loadKwhDay: number;
  servedKwhDay: number;
  shedKwhDay: number;
  gridImportKwhDay: number;
  gridExportKwhDay: number;
  curtailedKwhDay: number;
  unservedKwhDay: number;
  batteryThroughputKwhDay: number;
  minSocFrac: number;
  maxSocFrac: number;
  openingSocFrac: number;
  closingSocFrac: number;
  baselinePeakImportKw: number;
  peakImportKw: number;
  demandChargeSavingMonthUsd: number;
  energyBillWithoutSolarUsdDay: number;
  energyBillWithSolarUsdDay: number;
  exportRevenueUsdDay: number;
  conservationResidualKwh: number;
}

export interface MonthDispatchRow {
  monthIndex: number; // 0..11
  monthName: string;
  days: number;
  peakSunHours: number;
  ambientTempC: number;
  solarKwhMonth: number;
  clippedKwhMonth: number;
  curtailedKwhMonth: number;
  gridImportKwhMonth: number;
  gridExportKwhMonth: number;
  loadKwhMonth: number;
  demandChargeSavingUsdMonth: number;
  summary: DayDispatchSummary;
}

export interface AnnualDispatchSummary {
  months: MonthDispatchRow[];
  annualSolarAcKwh: number;
  annualUsefulSolarKwh: number;
  annualClippedKwh: number;
  annualCurtailedKwh: number;
  annualGridImportKwh: number;
  annualGridExportKwh: number;
  annualLoadKwh: number;
  annualUnservedKwh: number;
  annualBillWithoutSolarUsd: number;
  annualBillWithSolarUsd: number;
  annualDemandChargeSavingUsd: number;
  annualExportRevenueUsd: number;
  selfConsumptionFrac: number;
  autonomyFrac: number;
  worstConservationResidualKwh: number;
}

export function irradianceShape24h(): number[] {
  const raw = Array.from({ length: 24 }, (_, h) => {
    if (h < SUNRISE || h >= SUNSET) return 0;
    const t = (h + 0.5 - SUNRISE) / (SUNSET - SUNRISE);
    return Math.sin(Math.PI * t) ** 2;
  });
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / total);
}

export function computeSolarHourProfile(input: {
  pvDcKwp: number;
  inverterAcKw: number;
  inverterEfficiencyFrac: number;
  peakSunHours: number;
  ambientTempC: number;
  noctC?: number;
  gammaFracPerC?: number;
  soilingLossFrac?: number;
  otherLossFrac?: number;
  incidenceAngleLossFrac?: number;
  snowLossFrac?: number;
}): Array<{ irradianceWm2: number; acKw: number; clippedKw: number }> {
  const shape = irradianceShape24h();
  const noct = input.noctC ?? 45;
  const gamma = input.gammaFracPerC ?? -0.0029;
  const soiling = input.soilingLossFrac ?? 0.03;
  const other = input.otherLossFrac ?? 0.04;
  const iam = input.incidenceAngleLossFrac ?? INCIDENCE_ANGLE_LOSS_FRAC;
  const snow = input.snowLossFrac ?? 0;

  return shape.map((frac) => {
    const irradianceWm2 = frac * input.peakSunHours * 1000;
    if (input.pvDcKwp <= 0 || irradianceWm2 <= 0) {
      return { irradianceWm2: 0, acKw: 0, clippedKw: 0 };
    }
    const cellTempC = input.ambientTempC + ((noct - 20) / 800) * irradianceWm2;
    const tempDerate = Math.max(0, 1 + gamma * (cellTempC - STC_CELL_TEMP_C));
    const dcKw =
      input.pvDcKwp *
      (irradianceWm2 / STC_IRRADIANCE_W_M2) *
      tempDerate *
      (1 - soiling) *
      (1 - other) *
      (1 - iam) *
      (1 - snow);
    const acBeforeClip = dcKw * input.inverterEfficiencyFrac;
    const acKw = Math.min(acBeforeClip, Math.max(0.01, input.inverterAcKw));
    return {
      irradianceWm2,
      acKw,
      clippedKw: Math.max(0, acBeforeClip - acKw),
    };
  });
}

/**
 * Finds the opening stored energy (kWh) at which a 24h representative day
 * closes at the exact same stored energy it opened with.
 */
export function solvePeriodicOpeningStoredKwh(
  simulate: (startStoredKwh: number) => { endStoredKwh: number },
  initialStoredKwh: number,
  usableCapacityKwh: number
): number {
  if (usableCapacityKwh <= 0) return 0;
  const tolerance = 1e-9 * Math.max(1, usableCapacityKwh);
  const gap = (start: number) => simulate(start).endStoredKwh - start;
  const g0 = gap(initialStoredKwh);
  if (Math.abs(g0) <= tolerance) return initialStoredKwh;
  let lo = g0 > 0 ? initialStoredKwh : 0;
  let hi = g0 > 0 ? usableCapacityKwh : initialStoredKwh;
  for (let i = 0; i < 80 && hi - lo > tolerance; i++) {
    const mid = (lo + hi) / 2;
    if (gap(mid) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function runChronologicalDayDispatch(input: HourlyDispatchInput): DayDispatchSummary {
  const solar = computeSolarHourProfile(input);
  const outageSet = new Set(input.outageHours ?? []);
  const gridUpAt = (h: number) => input.gridAvailable && !outageSet.has(h);
  const topPrice = Math.max(...input.tariffUsdByHour);
  const etaHalf = Math.sqrt(Math.max(0.5, Math.min(1, input.batteryRoundTripEffFrac)));
  const usableKwh = Math.max(0, input.batteryUsableKwh);
  const reserveKwh = usableKwh * Math.max(0, Math.min(1, input.batteryReserveFrac));

  const servedDemandKw = (h: number) => {
    const demand = Math.max(0, input.loadKwByHour[h] ?? 0);
    if (
      input.gridAvailable &&
      !gridUpAt(h) &&
      input.outageEssentialLoadKw !== undefined
    ) {
      return Math.min(demand, Math.max(0, input.outageEssentialLoadKw));
    }
    return demand;
  };

  const deficitKw = new Float64Array(24);
  for (let h = 0; h < 24; h++) {
    deficitKw[h] = Math.max(0, (input.loadKwByHour[h] ?? 0) - solar[h].acKw);
  }

  function remainingPeakNeedKwh(afterHour: number): number {
    let need = 0;
    for (let h = afterHour + 1; h < 24; h++) {
      if ((input.tariffUsdByHour[h] ?? 0) >= topPrice - 1e-9) {
        need += deficitKw[h] / etaHalf;
      }
    }
    return need;
  }

  const outageNeedAfter = new Float64Array(24);
  if (input.gridAvailable && outageSet.size > 0) {
    for (let h = 0; h < 24; h++) {
      let need = 0;
      let inBlock = false;
      for (let step = 1; step < 24; step++) {
        const j = (h + step) % 24;
        if (outageSet.has(j)) {
          inBlock = true;
          need +=
            Math.min(
              input.batteryMaxDischargeKw,
              Math.max(0, servedDemandKw(j) - solar[j].acKw)
            ) / etaHalf;
        } else if (inBlock) {
          break;
        }
      }
      outageNeedAfter[h] = need;
    }
  }

  function simulateDay(startStoredKwh: number) {
    let storedKwh = Math.max(0, Math.min(usableKwh, startStoredKwh));
    const hours: HourlyDispatchStep[] = [];
    let throughput = 0;
    let residual = 0;
    let clipped = 0;

    for (let h = 0; h < 24; h++) {
      const solarAcKw = solar[h].acKw;
      clipped += solar[h].clippedKw;
      const rawLoadKw = Math.max(0, input.loadKwByHour[h] ?? 0);
      const gridUp = gridUpAt(h);
      const demandKw = servedDemandKw(h);
      const shedKw = Math.max(0, rawLoadKw - demandKw);

      let batteryKw = 0;
      let gridImportKw = 0;
      let gridExportKw = 0;
      let curtailedKw = 0;
      let unservedKw = 0;

      const net = solarAcKw - demandKw;
      if (net >= 0) {
        const headroomKwh = Math.max(0, usableKwh - storedKwh);
        const chargeKw = Math.min(net, input.batteryMaxChargeKw, headroomKwh / etaHalf);
        storedKwh += chargeKw * etaHalf;
        batteryKw = chargeKw;
        let leftover = net - chargeKw;
        if (leftover > 0 && gridUp && input.exportAllowed) {
          gridExportKw = Math.min(leftover, input.exportLimitKw ?? leftover);
          leftover -= gridExportKw;
        }
        curtailedKw = leftover;
        throughput += chargeKw;
      } else {
        let deficit = -net;
        const peakHold = !gridUp || (input.tariffUsdByHour[h] ?? 0) >= topPrice - 1e-9 ? 0 : remainingPeakNeedKwh(h);
        const outageHold = gridUp ? outageNeedAfter[h] : 0;
        const holdKwh = Math.min(peakHold + outageHold, Math.max(0, usableKwh - reserveKwh));
        const availableKwh = Math.max(0, storedKwh - reserveKwh - holdKwh);
        const dischargeKw = Math.min(
          deficit,
          input.batteryMaxDischargeKw,
          availableKwh * etaHalf
        );
        storedKwh = Math.max(0, storedKwh - dischargeKw / etaHalf);
        batteryKw = dischargeKw === 0 ? 0 : -dischargeKw;
        deficit -= dischargeKw;
        throughput += dischargeKw;

        if (deficit > 0 && gridUp) {
          gridImportKw = Math.min(deficit, input.importLimitKw ?? deficit);
          deficit -= gridImportKw;
        }
        unservedKw = Math.max(0, deficit);
      }

      const sources = solarAcKw + gridImportKw + Math.max(0, -batteryKw);
      const sinks =
        (demandKw - unservedKw) + gridExportKw + curtailedKw + Math.max(0, batteryKw);
      residual += sources - sinks;

      hours.push({
        hour: h,
        solarAcKw,
        clippedKw: solar[h].clippedKw,
        loadKw: rawLoadKw,
        servedKw: demandKw - unservedKw,
        shedKw,
        batteryKw,
        socFrac: usableKwh > 0 ? storedKwh / usableKwh : 0,
        gridImportKw,
        gridExportKw,
        curtailedKw,
        unservedKw,
        tariffUsdPerKwh: input.tariffUsdByHour[h] ?? 0,
      });
    }

    return { hours, throughput, residual, clipped, endStoredKwh: storedKwh };
  }

  const initialStoredKwh = usableKwh * Math.max(0, Math.min(1, input.initialSocFrac ?? 0.5));
  const openingStoredKwh =
    (input.socMode ?? 'periodic') === 'periodic' && usableKwh > 0
      ? solvePeriodicOpeningStoredKwh(simulateDay, initialStoredKwh, usableKwh)
      : initialStoredKwh;
  const day = simulateDay(openingStoredKwh);
  const { hours } = day;

  let baselinePeakImportKw = 0;
  let energyBillWithoutSolarUsdDay = 0;
  let energyBillWithSolarUsdDay = 0;
  let exportRevenueUsdDay = 0;

  for (let h = 0; h < 24; h++) {
    const step = hours[h];
    const price = step.tariffUsdPerKwh;
    if (gridUpAt(h)) {
      const baselineImport = Math.min(deficitKw[h], input.importLimitKw ?? deficitKw[h]);
      baselinePeakImportKw = Math.max(baselinePeakImportKw, baselineImport);
      energyBillWithoutSolarUsdDay += step.loadKw * price;
    }
    energyBillWithSolarUsdDay += step.gridImportKw * price;
    exportRevenueUsdDay += step.gridExportKw * (input.exportTariffUsdPerKwh ?? 0);
  }

  const peakImportKw = Math.max(0, ...hours.map((x) => x.gridImportKw));
  const peakShavedKw = Math.max(0, baselinePeakImportKw - peakImportKw);
  const demandChargeSavingMonthUsd = peakShavedKw * (input.demandChargeUsdPerKw ?? 0);

  const sum = (fn: (h: HourlyDispatchStep) => number) => hours.reduce((acc, h) => acc + fn(h), 0);

  return {
    hours,
    solarKwhDay: sum((h) => h.solarAcKw),
    clippedKwhDay: day.clipped,
    loadKwhDay: sum((h) => h.loadKw),
    servedKwhDay: sum((h) => h.servedKw),
    shedKwhDay: sum((h) => h.shedKw),
    gridImportKwhDay: sum((h) => h.gridImportKw),
    gridExportKwhDay: sum((h) => h.gridExportKw),
    curtailedKwhDay: sum((h) => h.curtailedKw),
    unservedKwhDay: sum((h) => h.unservedKw),
    batteryThroughputKwhDay: day.throughput,
    minSocFrac: usableKwh > 0 ? Math.min(...hours.map((h) => h.socFrac)) : 0,
    maxSocFrac: usableKwh > 0 ? Math.max(...hours.map((h) => h.socFrac)) : 0,
    openingSocFrac: usableKwh > 0 ? openingStoredKwh / usableKwh : 0,
    closingSocFrac: usableKwh > 0 ? day.endStoredKwh / usableKwh : 0,
    baselinePeakImportKw,
    peakImportKw,
    demandChargeSavingMonthUsd,
    energyBillWithoutSolarUsdDay,
    energyBillWithSolarUsdDay,
    exportRevenueUsdDay,
    conservationResidualKwh: day.residual,
  };
}

/**
 * Evaluates all 12 calendar months weighted by MONTH_DAYS [31, 28, ... 31] (365 days).
 */
export function runAnnualSeasonalDispatch(
  baseInput: Omit<HourlyDispatchInput, 'peakSunHours' | 'ambientTempC'>,
  monthlyPeakSunHours: number[],
  monthlyAmbientTempC: number[]
): AnnualDispatchSummary {
  const months: MonthDispatchRow[] = MONTH_DAYS.map((days, monthIndex) => {
    const peakSunHours = monthlyPeakSunHours[monthIndex] ?? monthlyPeakSunHours[0] ?? 5.27;
    const ambientTempC = monthlyAmbientTempC[monthIndex] ?? monthlyAmbientTempC[0] ?? 21.5;
    const summary = runChronologicalDayDispatch({
      ...baseInput,
      peakSunHours,
      ambientTempC,
      socMode: baseInput.socMode ?? 'periodic',
    });

    return {
      monthIndex,
      monthName: MONTH_NAMES[monthIndex],
      days,
      peakSunHours,
      ambientTempC,
      solarKwhMonth: summary.solarKwhDay * days,
      clippedKwhMonth: summary.clippedKwhDay * days,
      curtailedKwhMonth: summary.curtailedKwhDay * days,
      gridImportKwhMonth: summary.gridImportKwhDay * days,
      gridExportKwhMonth: summary.gridExportKwhDay * days,
      loadKwhMonth: summary.loadKwhDay * days,
      demandChargeSavingUsdMonth: summary.demandChargeSavingMonthUsd,
      summary,
    };
  });

  const sumM = (fn: (m: MonthDispatchRow) => number) => months.reduce((acc, m) => acc + fn(m), 0);
  const annualSolarAcKwh = sumM((m) => m.solarKwhMonth);
  const annualCurtailedKwh = sumM((m) => m.curtailedKwhMonth);
  const annualGridExportKwh = sumM((m) => m.gridExportKwhMonth);
  const annualGridImportKwh = sumM((m) => m.gridImportKwhMonth);
  const annualLoadKwh = sumM((m) => m.loadKwhMonth);
  const annualClippedKwh = sumM((m) => m.clippedKwhMonth);
  const annualUnservedKwh = sumM((m) => m.summary.unservedKwhDay * m.days);
  const annualExportRevenueUsd = sumM((m) => m.summary.exportRevenueUsdDay * m.days);
  const annualDemandChargeSavingUsd = sumM((m) => m.demandChargeSavingUsdMonth);

  // Useful energy excludes curtailed solar and uncredited exports (if export tariff is 0).
  const creditedExportKwh = (baseInput.exportTariffUsdPerKwh ?? 0) > 0 ? annualGridExportKwh : 0;
  const selfConsumedSolarKwh = Math.max(0, annualSolarAcKwh - annualCurtailedKwh - annualGridExportKwh);
  const annualUsefulSolarKwh = selfConsumedSolarKwh + creditedExportKwh;

  return {
    months,
    annualSolarAcKwh,
    annualUsefulSolarKwh,
    annualClippedKwh,
    annualCurtailedKwh,
    annualGridImportKwh,
    annualGridExportKwh,
    annualLoadKwh,
    annualUnservedKwh,
    annualBillWithoutSolarUsd: sumM((m) => m.summary.energyBillWithoutSolarUsdDay * m.days),
    annualBillWithSolarUsd: sumM((m) => m.summary.energyBillWithSolarUsdDay * m.days),
    annualDemandChargeSavingUsd,
    annualExportRevenueUsd,
    selfConsumptionFrac: annualSolarAcKwh > 0 ? selfConsumedSolarKwh / annualSolarAcKwh : 0,
    autonomyFrac: annualLoadKwh > 0 ? Math.max(0, annualLoadKwh - annualGridImportKwh - annualUnservedKwh) / annualLoadKwh : 0,
    worstConservationResidualKwh: Math.max(...months.map((m) => Math.abs(m.summary.conservationResidualKwh))),
  };
}
