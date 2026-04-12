/**
 * helpers.ts
 * Pure computation helpers for the SafariCharge AI assistant.
 * Extracted from src/app/page.tsx — no React dependencies.
 */

import type { BatteryPrediction } from '@/components/energy/BatteryPredictionCard';
import type { DerivedSystemConfig, SimulationMinuteRecord } from '@/types/simulation-core';
import type { AiSystemData } from '@/types/dashboard';

// Feed-in tariff rate — kept here so helpers are self-contained.
const FEED_IN_TARIFF_RATE = 5.0;

// ---------------------------------------------------------------------------
// Step-duration estimator
// ---------------------------------------------------------------------------

/**
 * Estimate the duration (in hours) represented by a single simulation record
 * by back-calculating from power and energy fields.
 */
export const estimateStepHours = (record: SimulationMinuteRecord): number => {
  const candidates: number[] = [];
  if (record.solarKW > 0) {
    candidates.push((record.solarEnergyKWh ?? 0) / Math.max(record.solarKW, 0.0001));
  }
  if (record.gridImportKW > 0) {
    candidates.push((record.gridImportKWh ?? 0) / Math.max(record.gridImportKW, 0.0001));
  }
  if (record.gridExportKW > 0) {
    candidates.push((record.gridExportKWh ?? 0) / Math.max(record.gridExportKW, 0.0001));
  }
  const positive = candidates.filter((v) => v > 0);
  return positive[0] ?? 0.05;
};

// ---------------------------------------------------------------------------
// Discharge pattern classifier
// ---------------------------------------------------------------------------

export type DischargePattern = 'minimal' | 'evening-heavy' | 'daytime-heavy' | 'overnight-heavy';

export const classifyDischargePattern = (
  hourlyDischarge: Record<number, number>
): DischargePattern => {
  const sumHours = (hours: number[]) =>
    hours.reduce((sum, hr) => sum + (hourlyDischarge[hr] ?? 0), 0);
  const evening = sumHours([17, 18, 19, 20, 21, 22]);
  const daytime = sumHours([9, 10, 11, 12, 13, 14, 15, 16]);
  const overnight = sumHours([23, 0, 1, 2, 3, 4, 5, 6]);
  const maxBand = Math.max(evening, daytime, overnight);
  if (maxBand < 0.05) return 'minimal';
  if (maxBand === evening) return 'evening-heavy';
  if (maxBand === daytime) return 'daytime-heavy';
  return 'overnight-heavy';
};

// ---------------------------------------------------------------------------
// Battery efficiency metrics
// ---------------------------------------------------------------------------

export type BatteryEfficiencyMetrics = {
  chargeKwh: number;
  dischargeKwh: number;
  efficiency: number;
  previousEfficiency: number;
  drop: number;
  dischargePattern: DischargePattern;
  cycleEstimate: number;
};

export const computeBatteryEfficiencyMetrics = (
  records: SimulationMinuteRecord[],
  date: Date,
  batteryCapacityKwh: number
): BatteryEfficiencyMetrics => {
  const dayKey = date.toISOString().split('T')[0];
  const prevKey = new Date(date.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const aggregateForDay = (key: string) => {
    let charge = 0;
    let discharge = 0;
    records
      .filter((record) => record.date === key)
      .forEach((record) => {
        const step = estimateStepHours(record);
        if (step <= 0 || !Number.isFinite(step)) return;
        const energy = (record.batteryPowerKW ?? 0) * step;
        if (energy > 0) charge += energy;
        if (energy < 0) discharge += Math.abs(energy);
      });
    const efficiency = charge > 0 ? discharge / charge : 0;
    return { charge, discharge, efficiency };
  };

  const current = aggregateForDay(dayKey);
  const previous = aggregateForDay(prevKey);
  const drop = previous.efficiency > 0 ? previous.efficiency - current.efficiency : 0;
  const cycleEstimate =
    current.charge > 0 && batteryCapacityKwh
      ? current.discharge / Math.max(batteryCapacityKwh, 1)
      : 0;

  return {
    chargeKwh: current.charge,
    dischargeKwh: current.discharge,
    efficiency: current.efficiency,
    previousEfficiency: previous.efficiency,
    drop,
    dischargePattern: classifyDischargePattern(
      records
        .filter((record) => record.date === dayKey)
        .reduce<Record<number, number>>((acc, record) => {
          const step = estimateStepHours(record);
          if (step > 0 && typeof record.batteryPowerKW === 'number') {
            const energy = record.batteryPowerKW * step;
            if (energy < 0) {
              acc[record.hour] = (acc[record.hour] ?? 0) + Math.abs(energy);
            }
          }
          return acc;
        }, {})
    ),
    cycleEstimate,
  };
};

// ---------------------------------------------------------------------------
// Battery health score
// ---------------------------------------------------------------------------

export const computeBatteryHealthScore = ({
  efficiencyDrop,
  cycles,
  confidence,
}: {
  efficiencyDrop: number;
  cycles: number;
  confidence: number;
}): number => {
  let score = 100;
  score -= efficiencyDrop * 50;
  score -= cycles * 2;
  score += confidence * 10;
  return Math.max(0, Math.min(100, Math.round(score)));
};

// ---------------------------------------------------------------------------
// Trend & risk helpers (used by BatteryPredictionCard / AI)
// ---------------------------------------------------------------------------

export const computeTrend = (scores: number[]): number => {
  if (scores.length < 2) return 0;
  const recent = scores.slice(-3);
  return recent[recent.length - 1] - recent[0];
};

export const computeRisk = ({
  trend,
  drop,
  cycles,
  pattern,
}: {
  trend: number;
  drop: number;
  cycles: number;
  pattern?: string;
}): number => {
  let risk = 0;
  if (trend < -5) risk += 0.4;
  if (drop > 0.1) risk += 0.3;
  if (cycles > 1) risk += 0.2;
  if (pattern === 'evening-heavy') risk += 0.2;
  return Math.min(risk, 1);
};

export const classifyRisk = (risk: number): BatteryPrediction['level'] => {
  if (risk > 0.7) return 'high';
  if (risk > 0.4) return 'medium';
  return 'low';
};

// ---------------------------------------------------------------------------
// Full AI system data snapshot builder
// ---------------------------------------------------------------------------

export const buildAiSystemData = ({
  data,
  minuteData,
  timeOfDay,
  currentDate,
  systemConfig,
}: {
  data: any;
  minuteData: SimulationMinuteRecord[];
  timeOfDay: number;
  currentDate: Date;
  systemConfig: DerivedSystemConfig;
}): AiSystemData => {
  const safeMinuteData = minuteData ?? [];
  const batteryMetrics = computeBatteryEfficiencyMetrics(
    safeMinuteData,
    currentDate,
    systemConfig?.batteryKwh ?? 0
  );

  const dayKey = currentDate.toISOString().split('T')[0];
  const todayRecords = safeMinuteData.filter((record) => record.date === dayKey);

  const findPeakHour = (totals: Record<number, number>): number | null => {
    const entries = Object.entries(totals);
    if (!entries.length) return null;
    const [hour] = entries.reduce<[string, number]>(
      (max, entry) => (entry[1] > max[1] ? entry : max),
      entries[0]
    );
    return Number(hour);
  };

  const formatWindow = (hour: number | null, fallback: string) => {
    if (hour === null || Number.isNaN(hour)) return fallback;
    const start = Math.max(0, hour - 1);
    const end = Math.min(23, hour + 2);
    const startLabel = `${start.toString().padStart(2, '0')}:00`;
    const endLabel = `${end.toString().padStart(2, '00')}:00`;
    return `${startLabel}-${endLabel}`;
  };

  let totalConsumptionKwh = 0;
  let totalGridImportKwh = 0;
  let totalGridExportKwh = 0;
  let totalSolarKwh = 0;
  const hourlyLoad: Record<number, number> = {};
  const hourlySolar: Record<number, number> = {};
  const hourlyDischarge: Record<number, number> = {};

  todayRecords.forEach((record) => {
    const stepHours = estimateStepHours(record);
    const loadKwh = (record.homeLoadKWh ?? 0) + (record.ev1LoadKWh ?? 0) + (record.ev2LoadKWh ?? 0);
    totalConsumptionKwh += loadKwh;
    hourlyLoad[record.hour] = (hourlyLoad[record.hour] ?? 0) + loadKwh;

    const solarKwh = record.solarEnergyKWh ?? 0;
    totalSolarKwh += solarKwh;
    hourlySolar[record.hour] = (hourlySolar[record.hour] ?? 0) + solarKwh;

    totalGridImportKwh += record.gridImportKWh ?? 0;
    totalGridExportKwh += record.gridExportKWh ?? 0;

    if (stepHours > 0 && typeof record.batteryPowerKW === 'number') {
      const energy = record.batteryPowerKW * stepHours;
      if (energy < 0) {
        const discharged = Math.abs(energy);
        hourlyDischarge[record.hour] = (hourlyDischarge[record.hour] ?? 0) + discharged;
      }
    }
  });

  const liveLoadKw = Math.max(
    0,
    (data?.homeLoad ?? 0) + (data?.ev1Load ?? 0) + (data?.ev2Load ?? 0)
  );
  const gridImport = totalGridImportKwh || data?.totalGridImport || 0;
  const gridExport =
    totalGridExportKwh ||
    (typeof data?.feedInEarnings === 'number' ? data.feedInEarnings / FEED_IN_TARIFF_RATE : 0);
  const consumptionKwh =
    totalConsumptionKwh ||
    Math.max(0, (data?.totalSolar ?? 0) + gridImport - gridExport) ||
    liveLoadKw * 0.25;

  const peakSolarWindow = formatWindow(findPeakHour(hourlySolar), '12:00-15:00');
  const peakLoadWindow = formatWindow(findPeakHour(hourlyLoad), '18:00-21:00');
  const dischargePattern = batteryMetrics.dischargePattern;

  const likelyCause =
    batteryMetrics.drop > 0.1 && dischargePattern === 'evening-heavy'
      ? 'evening-heavy discharge'
      : batteryMetrics.drop > 0.1
        ? dischargePattern
        : undefined;

  let causeConfidence = batteryMetrics.drop > 0.1 ? 0.5 : undefined;
  const confidenceFactors: string[] = [];
  if (causeConfidence !== undefined) {
    if (batteryMetrics.drop > 0.15) {
      causeConfidence += 0.2;
      confidenceFactors.push('high efficiency drop');
    }
    if (dischargePattern === 'evening-heavy') {
      causeConfidence += 0.2;
      confidenceFactors.push('evening-heavy discharge');
    }
    if (
      batteryMetrics.chargeKwh > 0 &&
      batteryMetrics.dischargeKwh / batteryMetrics.chargeKwh > 1.0
    ) {
      causeConfidence += 0.1;
      confidenceFactors.push('high discharge ratio');
    }
    causeConfidence = Math.min(causeConfidence, 0.95);
  }

  const batteryCyclesToday =
    batteryMetrics.dischargeKwh > 0 && systemConfig?.batteryKwh
      ? Number((batteryMetrics.dischargeKwh / Math.max(systemConfig.batteryKwh, 1)).toFixed(2))
      : 0;

  const efficiencyImpact = -(batteryMetrics.drop * 50);
  const cycleImpact = -(batteryCyclesToday * 2);
  const confidenceImpact = (causeConfidence ?? 0) * 10;

  const batteryHealthScore = computeBatteryHealthScore({
    efficiencyDrop: batteryMetrics.drop,
    cycles: batteryCyclesToday,
    confidence: causeConfidence ?? 0,
  });

  const simulatedTimestamp = new Date(
    currentDate.getTime() + timeOfDay * 60 * 60 * 1000
  ).toISOString();

  return {
    solar: {
      production_kw: Math.max(0, data?.solarR ?? 0),
      peak_hours: peakSolarWindow,
      daily_kwh: totalSolarKwh || data?.totalSolar || 0,
    },
    battery: {
      capacity_kwh: systemConfig?.batteryKwh ?? 0,
      current_charge: Math.max(0, Math.min(1, (data?.batteryLevel ?? 0) / 100)),
      charge_cycles_today: batteryCyclesToday,
      discharge_pattern: dischargePattern,
    },
    grid: {
      import_kwh: gridImport,
      export_kwh: gridExport,
    },
    load: {
      consumption_kwh: consumptionKwh,
      peak_usage_hours: peakLoadWindow,
    },
    timestamp: simulatedTimestamp,
    derived: {
      battery_efficiency: Number(batteryMetrics.efficiency.toFixed(2)),
      previous_battery_efficiency: Number(batteryMetrics.previousEfficiency.toFixed(2)),
      battery_efficiency_drop: Number(batteryMetrics.drop.toFixed(2)),
      likely_cause: likelyCause,
      cause_confidence: causeConfidence,
      confidence_factors: confidenceFactors,
      battery_health_score: Number(batteryHealthScore.toFixed(0)),
      battery_health_breakdown: {
        efficiency: Number(efficiencyImpact.toFixed(1)),
        cycles: Number(cycleImpact.toFixed(1)),
        confidence: Number(confidenceImpact.toFixed(1)),
      },
    },
  };
};

// ---------------------------------------------------------------------------
// Learning context builder — derives behavioural patterns from full minuteData
// ---------------------------------------------------------------------------

export type LearningContext = {
  peakLoadHour: number;
  peakSolarHour: number;
  avgDailySolarKwh: number;
  avgDailyLoadKwh: number;
  avgDailySavingsKes: number;
  selfSufficiencyPct: number;
  gridDependencyPct: number;
  avgBatterySocAtMidnight: number;
  avgBatterySocAtNoon: number;
  batteryUsagePattern: 'peak-shaving' | 'overnight-backup' | 'balanced';
  ev1AvgChargingHour: number;
  ev2AvgChargingHour: number;
  evTotalDailyKwh: number;
  peakTimeGridImportPct: number;
  offPeakSolarExportPct: number;
  totalSimDays: number;
  dataConfidence: 'low' | 'medium' | 'high';
};

export const buildLearningContext = (minuteData: SimulationMinuteRecord[]): LearningContext => {
  if (!minuteData || minuteData.length === 0) {
    return {
      peakLoadHour: 19,
      peakSolarHour: 12,
      avgDailySolarKwh: 0,
      avgDailyLoadKwh: 0,
      avgDailySavingsKes: 0,
      selfSufficiencyPct: 0,
      gridDependencyPct: 100,
      avgBatterySocAtMidnight: 0,
      avgBatterySocAtNoon: 50,
      batteryUsagePattern: 'balanced',
      ev1AvgChargingHour: 8,
      ev2AvgChargingHour: 8,
      evTotalDailyKwh: 0,
      peakTimeGridImportPct: 0,
      offPeakSolarExportPct: 0,
      totalSimDays: 0,
      dataConfidence: 'low',
    };
  }

  const uniqueDates = [...new Set(minuteData.map((d) => d.date))];
  const totalSimDays = uniqueDates.length;
  const dataConfidence: LearningContext['dataConfidence'] =
    totalSimDays >= 14 ? 'high' : totalSimDays >= 3 ? 'medium' : 'low';

  const hourlyLoadSum: Record<number, number> = {};
  const hourlyLoadCount: Record<number, number> = {};
  const hourlySolarSum: Record<number, number> = {};
  const hourlySolarCount: Record<number, number> = {};
  const hourlyDischargeSum: Record<number, number> = {};

  const dailySolar: Record<string, number> = {};
  const dailyLoad: Record<string, number> = {};
  const dailySavings: Record<string, number> = {};
  const dailyGridImport: Record<string, number> = {};

  const midnightSoc: number[] = [];
  const noonSoc: number[] = [];

  let ev1WeightedHourSum = 0;
  let ev1TotalLoad = 0;
  let ev2WeightedHourSum = 0;
  let ev2TotalLoad = 0;
  let evTotalKwh = 0;

  let peakGridImport = 0;
  let totalGridImport = 0;
  let offPeakSolarExport = 0;
  let totalSolarExport = 0;

  for (const d of minuteData) {
    const stepHours = estimateStepHours(d);
    const loadKwh = (d.homeLoadKWh ?? 0) + (d.ev1LoadKWh ?? 0) + (d.ev2LoadKWh ?? 0);
    const solarKwh = d.solarEnergyKWh ?? 0;

    hourlyLoadSum[d.hour] = (hourlyLoadSum[d.hour] ?? 0) + loadKwh;
    hourlyLoadCount[d.hour] = (hourlyLoadCount[d.hour] ?? 0) + 1;
    hourlySolarSum[d.hour] = (hourlySolarSum[d.hour] ?? 0) + solarKwh;
    hourlySolarCount[d.hour] = (hourlySolarCount[d.hour] ?? 0) + 1;

    if (stepHours > 0 && typeof d.batteryPowerKW === 'number') {
      const energy = d.batteryPowerKW * stepHours;
      if (energy < 0) {
        hourlyDischargeSum[d.hour] = (hourlyDischargeSum[d.hour] ?? 0) + Math.abs(energy);
      }
    }

    dailySolar[d.date] = (dailySolar[d.date] ?? 0) + solarKwh;
    dailyLoad[d.date] = (dailyLoad[d.date] ?? 0) + loadKwh;
    dailySavings[d.date] = (dailySavings[d.date] ?? 0) + (d.savingsKES ?? 0);
    dailyGridImport[d.date] = (dailyGridImport[d.date] ?? 0) + (d.gridImportKWh ?? 0);

    if (d.batteryLevelPct !== undefined) {
      if (d.hour === 0) midnightSoc.push(d.batteryLevelPct);
      if (d.hour === 12) noonSoc.push(d.batteryLevelPct);
    }

    const ev1Kwh = d.ev1LoadKWh ?? 0;
    if (ev1Kwh > 0) { ev1WeightedHourSum += ev1Kwh * d.hour; ev1TotalLoad += ev1Kwh; }
    const ev2Kwh = d.ev2LoadKWh ?? 0;
    if (ev2Kwh > 0) { ev2WeightedHourSum += ev2Kwh * d.hour; ev2TotalLoad += ev2Kwh; }
    evTotalKwh += ev1Kwh + ev2Kwh;

    const gi = d.gridImportKWh ?? 0;
    totalGridImport += gi;
    if (d.isPeakTime) peakGridImport += gi;

    const ge = d.gridExportKWh ?? 0;
    totalSolarExport += ge;
    if (!d.isPeakTime) offPeakSolarExport += ge;
  }

  let peakLoadHour = 19;
  let maxLoadAvg = -Infinity;
  for (let h = 0; h < 24; h++) {
    const avg = hourlyLoadCount[h] ? (hourlyLoadSum[h] ?? 0) / hourlyLoadCount[h] : 0;
    if (avg > maxLoadAvg) { maxLoadAvg = avg; peakLoadHour = h; }
  }

  let peakSolarHour = 12;
  let maxSolarAvg = -Infinity;
  for (let h = 0; h < 24; h++) {
    const avg = hourlySolarCount[h] ? (hourlySolarSum[h] ?? 0) / hourlySolarCount[h] : 0;
    if (avg > maxSolarAvg) { maxSolarAvg = avg; peakSolarHour = h; }
  }

  const daysArr = Object.values(dailySolar);
  const avgDailySolarKwh = daysArr.length > 0 ? daysArr.reduce((s, v) => s + v, 0) / daysArr.length : 0;
  const loadArr = Object.values(dailyLoad);
  const avgDailyLoadKwh = loadArr.length > 0 ? loadArr.reduce((s, v) => s + v, 0) / loadArr.length : 0;
  const savingsArr = Object.values(dailySavings);
  const avgDailySavingsKes = savingsArr.length > 0 ? savingsArr.reduce((s, v) => s + v, 0) / savingsArr.length : 0;

  const totalSolar = daysArr.reduce((s, v) => s + v, 0);
  const totalLoad = loadArr.reduce((s, v) => s + v, 0);
  const selfSufficiencyPct = totalLoad > 0 ? Math.min(100, (totalSolar / totalLoad) * 100) : 0;
  const gridDependencyPct = totalLoad > 0 ? Math.min(100, (totalGridImport / totalLoad) * 100) : 0;

  const avgBatterySocAtMidnight = midnightSoc.length > 0 ? midnightSoc.reduce((s, v) => s + v, 0) / midnightSoc.length : 0;
  const avgBatterySocAtNoon = noonSoc.length > 0 ? noonSoc.reduce((s, v) => s + v, 0) / noonSoc.length : 50;

  const peakHoursDischarge = [18, 19, 20, 21, 22].reduce((s, h) => s + (hourlyDischargeSum[h] ?? 0), 0);
  const overnightDischarge = [22, 23, 0, 1, 2, 3, 4, 5, 6].reduce((s, h) => s + (hourlyDischargeSum[h] ?? 0), 0);
  const totalDischarge = Object.values(hourlyDischargeSum).reduce((s, v) => s + v, 0);
  let batteryUsagePattern: LearningContext['batteryUsagePattern'] = 'balanced';
  if (totalDischarge > 0) {
    if (peakHoursDischarge / totalDischarge > 0.5) batteryUsagePattern = 'peak-shaving';
    else if (overnightDischarge / totalDischarge > 0.5) batteryUsagePattern = 'overnight-backup';
  }

  const ev1AvgChargingHour = ev1TotalLoad > 0 ? ev1WeightedHourSum / ev1TotalLoad : 8;
  const ev2AvgChargingHour = ev2TotalLoad > 0 ? ev2WeightedHourSum / ev2TotalLoad : 8;
  const evTotalDailyKwh = totalSimDays > 0 ? evTotalKwh / totalSimDays : 0;

  const peakTimeGridImportPct = totalGridImport > 0 ? (peakGridImport / totalGridImport) * 100 : 0;
  const offPeakSolarExportPct = totalSolarExport > 0 ? (offPeakSolarExport / totalSolarExport) * 100 : 0;

  return {
    peakLoadHour,
    peakSolarHour,
    avgDailySolarKwh: Number(avgDailySolarKwh.toFixed(2)),
    avgDailyLoadKwh: Number(avgDailyLoadKwh.toFixed(2)),
    avgDailySavingsKes: Number(avgDailySavingsKes.toFixed(2)),
    selfSufficiencyPct: Number(selfSufficiencyPct.toFixed(1)),
    gridDependencyPct: Number(gridDependencyPct.toFixed(1)),
    avgBatterySocAtMidnight: Number(avgBatterySocAtMidnight.toFixed(1)),
    avgBatterySocAtNoon: Number(avgBatterySocAtNoon.toFixed(1)),
    batteryUsagePattern,
    ev1AvgChargingHour: Number(ev1AvgChargingHour.toFixed(1)),
    ev2AvgChargingHour: Number(ev2AvgChargingHour.toFixed(1)),
    evTotalDailyKwh: Number(evTotalDailyKwh.toFixed(2)),
    peakTimeGridImportPct: Number(peakTimeGridImportPct.toFixed(1)),
    offPeakSolarExportPct: Number(offPeakSolarExportPct.toFixed(1)),
    totalSimDays,
    dataConfidence,
  };
};
