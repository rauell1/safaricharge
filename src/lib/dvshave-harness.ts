export type DvShaveState =
  | 'NORMAL'
  | 'PEAK_SHAVING'
  | 'DISTURBANCE_RIDE_THROUGH'
  | 'RECOVERY'
  | 'DEGRADED_SAFE';

export type DisturbanceType = 'none' | 'sag' | 'swell' | 'unbalance' | 'harmonic';
export type TariffWindow = 'off_peak' | 'shoulder' | 'on_peak';

export interface HarnessScenario {
  id: string;
  disturbanceType: DisturbanceType;
  severityPct: number;
  socInitPct: number;
  loadPct: number;
  tariffWindow: TariffWindow;
  occupancyPct: number;
  sitePowerKw: number;
  thresholdKw: number;
  essPowerKw: number;
  chargerCount: number;
}

export interface ScenarioResult {
  id: string;
  expectedPrimaryState: DvShaveState;
  expectedSecondaryState: DvShaveState;
  pass: boolean;
  checks: {
    continuityPass: boolean;
    dcLinkPass: boolean;
    recoveryPass: boolean;
    essLimitPass: boolean;
  };
  metrics: {
    estimatedPeakReductionKw: number;
    estimatedParBefore: number;
    estimatedParAfter: number;
    rideThroughSuccessProbability: number;
    estimatedCurtailedSessionsPct: number;
  };
  notes: string[];
}

export interface HarnessReport {
  generatedAt: string;
  totalScenarios: number;
  passed: number;
  failed: number;
  passRatePct: number;
  kpis: {
    avgParReductionPct: number;
    avgPeakReductionKw: number;
    avgRideThroughSuccessPct: number;
    avgCurtailedSessionsPct: number;
  };
  results: ScenarioResult[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function determineStates(s: HarnessScenario): {
  primary: DvShaveState;
  secondary: DvShaveState;
} {
  if (s.disturbanceType !== 'none') {
    return {
      primary: 'DISTURBANCE_RIDE_THROUGH',
      secondary: 'RECOVERY',
    };
  }

  if (s.loadPct > 100 || s.sitePowerKw > s.thresholdKw) {
    return {
      primary: 'PEAK_SHAVING',
      secondary: 'NORMAL',
    };
  }

  return {
    primary: 'NORMAL',
    secondary: 'NORMAL',
  };
}

function evaluateScenario(s: HarnessScenario): ScenarioResult {
  const states = determineStates(s);

  const highSeverity = s.severityPct >= 60;
  const lowSoc = s.socInitPct < 30;
  const highOccupancy = s.occupancyPct >= 85;

  const baseRideThrough =
    s.disturbanceType === 'none' ? 1 : 0.985 - (highSeverity ? 0.06 : 0.015) - (lowSoc ? 0.04 : 0);
  const rideThroughSuccessProbability = clamp(baseRideThrough, 0.7, 1);

  const peakOverThresholdKw = Math.max(0, s.sitePowerKw - s.thresholdKw);
  const essAvailableKw = Math.min(s.essPowerKw, s.sitePowerKw);
  const estimatedPeakReductionKw =
    s.disturbanceType === 'none' ? Math.min(peakOverThresholdKw, essAvailableKw) : 0;

  const estimatedParBefore = 1 + s.loadPct / 100;
  const estimatedParAfter = clamp(
    estimatedParBefore - estimatedPeakReductionKw / Math.max(1, s.sitePowerKw),
    1,
    estimatedParBefore
  );

  const estimatedCurtailedSessionsPct = clamp(
    (s.disturbanceType !== 'none' ? (highSeverity ? 6 : 2.5) : 0) +
      (highOccupancy ? 1.5 : 0) +
      (lowSoc ? 1 : 0),
    0,
    15
  );

  const continuityPass = rideThroughSuccessProbability >= 0.95;
  const dcLinkPass = s.disturbanceType === 'none' ? true : s.severityPct <= 80;
  const recoveryPass = estimatedCurtailedSessionsPct <= 8;
  const essLimitPass = s.essPowerKw > 0 && s.socInitPct >= 15;

  const pass = continuityPass && dcLinkPass && recoveryPass && essLimitPass;

  const notes: string[] = [];
  if (!continuityPass) notes.push('Ride-through probability below target (95%).');
  if (!essLimitPass) notes.push('ESS reserve or available power is below safe floor.');
  if (s.tariffWindow === 'on_peak' && estimatedPeakReductionKw <= 0) {
    notes.push('No peak shaving benefit detected in on-peak window.');
  }

  return {
    id: s.id,
    expectedPrimaryState: states.primary,
    expectedSecondaryState: states.secondary,
    pass,
    checks: {
      continuityPass,
      dcLinkPass,
      recoveryPass,
      essLimitPass,
    },
    metrics: {
      estimatedPeakReductionKw: Number(estimatedPeakReductionKw.toFixed(2)),
      estimatedParBefore: Number(estimatedParBefore.toFixed(3)),
      estimatedParAfter: Number(estimatedParAfter.toFixed(3)),
      rideThroughSuccessProbability: Number(rideThroughSuccessProbability.toFixed(3)),
      estimatedCurtailedSessionsPct: Number(estimatedCurtailedSessionsPct.toFixed(2)),
    },
    notes,
  };
}

function mean(values: number[]): number {
  return values.length ? values.reduce((acc, current) => acc + current, 0) / values.length : 0;
}

export function runDvShaveHarness(scenarios: HarnessScenario[]): HarnessReport {
  const results = scenarios.map(evaluateScenario);
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;

  const parReductions = results.map(
    (r) =>
      ((r.metrics.estimatedParBefore - r.metrics.estimatedParAfter) /
        Math.max(0.001, r.metrics.estimatedParBefore)) *
      100
  );

  return {
    generatedAt: new Date().toISOString(),
    totalScenarios: results.length,
    passed,
    failed,
    passRatePct: Number(((passed / Math.max(1, results.length)) * 100).toFixed(2)),
    kpis: {
      avgParReductionPct: Number(mean(parReductions).toFixed(2)),
      avgPeakReductionKw: Number(mean(results.map((r) => r.metrics.estimatedPeakReductionKw)).toFixed(2)),
      avgRideThroughSuccessPct: Number(
        (mean(results.map((r) => r.metrics.rideThroughSuccessProbability)) * 100).toFixed(2)
      ),
      avgCurtailedSessionsPct: Number(
        mean(results.map((r) => r.metrics.estimatedCurtailedSessionsPct)).toFixed(2)
      ),
    },
    results,
  };
}

export function buildDefaultDvShaveMatrix(): HarnessScenario[] {
  const disturbances: DisturbanceType[] = ['none', 'sag', 'unbalance', 'harmonic'];
  const severities = [10, 30, 60];
  const socLevels = [30, 50, 80];
  const loadLevels = [50, 75, 95];
  const windows: TariffWindow[] = ['off_peak', 'shoulder', 'on_peak'];

  const scenarios: HarnessScenario[] = [];
  let idx = 1;

  for (const disturbanceType of disturbances) {
    for (const severityPct of severities) {
      for (const socInitPct of socLevels) {
        for (const loadPct of loadLevels) {
          for (const tariffWindow of windows) {
            const sitePowerKw = Number((240 * (loadPct / 100)).toFixed(2));
            scenarios.push({
              id: `TC-${String(idx).padStart(4, '0')}`,
              disturbanceType,
              severityPct: disturbanceType === 'none' ? 0 : severityPct,
              socInitPct,
              loadPct,
              tariffWindow,
              occupancyPct: loadPct >= 90 ? 90 : 60,
              sitePowerKw,
              thresholdKw: 180,
              essPowerKw: 67.5,
              chargerCount: 50,
            });
            idx += 1;
          }
        }
      }
    }
  }

  return scenarios;
}
