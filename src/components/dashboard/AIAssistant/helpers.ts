/**
 * helpers.ts
 * Pure computation helpers for the SafariCharge AI assistant.
 * Extracted from src/app/page.tsx — no React dependencies.
 */

import type { BatteryPrediction } from '@/components/dashboard/BatteryPredictionCard';
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
    const endLabel = `${end.toString().padStart(2, '0')}:00`;
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
    (data.homeLoad ?? 0) + (data.ev1Load ?? 0) + (data.ev2Load ?? 0)
  );
  const gridImport = totalGridImportKwh || data.totalGridImport || 0;
  const gridExport =
    totalGridExportKwh ||
    (typeof data.feedInEarnings === 'number' ? data.feedInEarnings / FEED_IN_TARIFF_RATE : 0);
  const consumptionKwh =
    totalConsumptionKwh ||
    Math.max(0, (data.totalSolar ?? 0) + gridImport - gridExport) ||
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
      production_kw: Math.max(0, data.solarR ?? 0),
      peak_hours: peakSolarWindow,
      daily_kwh: totalSolarKwh || data.totalSolar || 0,
    },
    battery: {
      capacity_kwh: systemConfig?.batteryKwh ?? 0,
      current_charge: Math.max(0, Math.min(1, (data.batteryLevel ?? 0) / 100)),
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
