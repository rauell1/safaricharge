/**
 * Physics Engine Bridge
 *
 * Wires `calculateInstantPhysics` (the new generalized physics engine) into
 * the energySystemStore, replacing the legacy `runSolarSimulation` path for
 * battery SOC, solar, load, and grid data.
 *
 * KEY CONTRACT:
 *   - `createPhysicsState()` must be called ONCE when the simulation starts
 *     (or when systemConfig changes). The returned object is mutated in-place
 *     by every subsequent `tickPhysicsEngine()` call.
 *   - Never recreate PhysicsEngineState inside the tick loop — that resets
 *     batteryKwh to the initial value each step, which is the root cause of
 *     the SOC-flat bug described in ENGINEERING_ISSUES_V2_2026-04-10.md §A.
 */

import type { SystemConfiguration } from './system-config';
import type { MinuteDataPoint, EnergyNode } from '@/stores/energySystemStore';
import type { NodeType } from '@/stores/energySystemStore';
import {
  calculateInstantPhysics,
  generateDayScenario,
  type PhysicsEngineState,
  type SolarData,
  type PriorityMode,
} from './physics-engine';

// ---------------------------------------------------------------------------
// State factory — call once per simulation session
// ---------------------------------------------------------------------------

/**
 * Create a fresh PhysicsEngineState initialised from the current system config.
 * Pass the returned object to every tickPhysicsEngine() call in the loop.
 */
export function createPhysicsState(config: SystemConfiguration): PhysicsEngineState {
  const evSocs: Record<string, number> = {};
  const evIsHome: Record<string, boolean> = {};

  for (const load of config.loads) {
    if (load.type === 'ev') {
      evSocs[load.id] = 50; // start all EVs at 50% SOC
      evIsHome[load.id] = true;
    }
  }

  return {
    batteryKwh: config.battery.capacityKwh * 0.5, // start at 50% SOC
    evSocs,
    evIsHome,
    soilingFactor: 1.0,
  };
}

// ---------------------------------------------------------------------------
// Tick parameters
// ---------------------------------------------------------------------------

export interface TickPhysicsParams {
  /** Persistent state object — mutated in place each tick */
  state: PhysicsEngineState;
  systemConfig: SystemConfiguration;
  currentDate: Date;
  /** Decimal hour 0-24, e.g. 13.5 = 13:30 */
  hour: number;
  solarData: SolarData;
  priorityMode: PriorityMode;
  gridEnabled: boolean;
  isPeakTime: boolean;
  peakRate: number;
  offPeakRate: number;
  /** Zustand store actions */
  updateNode: (nodeType: NodeType, updates: Partial<EnergyNode>) => void;
  addMinuteData: (data: MinuteDataPoint) => void;
  updateAccumulators: (updates: {
    solar?: number;
    savings?: number;
    gridImport?: number;
    carbonOffset?: number;
    batDischargeKwh?: number;
    feedInEarnings?: number;
  }) => void;
}

// ---------------------------------------------------------------------------
// Single tick — call inside your simulation interval/loop
// ---------------------------------------------------------------------------

/**
 * Run one physics step, persist state, update the store, and append minute data.
 *
 * @returns The raw InstantPhysicsResult for any additional processing the
 *          caller needs (e.g. logging, accumulator rollups).
 */
export function tickPhysicsEngine(params: TickPhysicsParams) {
  const {
    state,
    systemConfig,
    currentDate,
    hour,
    solarData,
    priorityMode,
    gridEnabled,
    isPeakTime,
    peakRate,
    offPeakRate,
    updateNode,
    addMinuteData,
    updateAccumulators,
  } = params;

  // 1. Generate a day scenario using the current EV SOC states from persistent state
  const scenario = generateDayScenario(
    systemConfig,
    currentDate,
    solarData,
    state.evSocs  // ← use live EV SOCs, not stale initial values
  );

  // 2. Run physics — state.batteryKwh is mutated in place ✅
  const result = calculateInstantPhysics(
    systemConfig,
    scenario,
    hour,
    solarData,
    state,        // ← same object reference every tick — this is the fix
    priorityMode,
    gridEnabled,
    isPeakTime,
    peakRate,
    offPeakRate
  );

  // 3. Wire results into energySystemStore nodes so live tiles update
  updateNode('battery', {
    soc: result.batteryLevelPct,
    powerKW: result.batteryPowerKw,
    status:
      result.batteryPowerKw > 0.05
        ? 'charging'
        : result.batteryPowerKw < -0.05
        ? 'discharging'
        : 'idle',
  });

  updateNode('solar', {
    powerKW: result.solarPowerKw,
    status: result.solarPowerKw > 0.1 ? 'online' : 'idle',
  });

  updateNode('home', {
    powerKW: result.totalLoadKw,
    status: 'online',
  });

  updateNode('grid', {
    powerKW: result.gridImportKw - result.gridExportKw,
    status:
      result.gridImportKw > 0.05
        ? 'importing'
        : result.gridExportKw > 0.05
        ? 'exporting'
        : 'online',
  });

  // Update EV nodes from physics result evStates
  const evIds = Object.keys(result.evStates);
  // Map first EV id → ev1, second → ev2 (legacy store node names)
  if (evIds[0]) {
    const ev = result.evStates[evIds[0]];
    updateNode('ev1', {
      soc: ev.soc,
      status: ev.isCharging ? 'charging' : ev.isHome ? 'idle' : 'offline',
    });
  }
  if (evIds[1]) {
    const ev = result.evStates[evIds[1]];
    updateNode('ev2', {
      soc: ev.soc,
      status: ev.isCharging ? 'charging' : ev.isHome ? 'idle' : 'offline',
    });
  }

  // 4. Build and append the full MinuteDataPoint
  const minuteH = Math.floor(hour);
  const minuteM = Math.round((hour - minuteH) * 60);
  const timestampDate = new Date(currentDate);
  timestampDate.setHours(minuteH, minuteM, 0, 0);

  const STEP_H = 24 / 420; // each step is 24h / 420 steps ≈ 3.43 min

  const firstEvState = evIds[0] ? result.evStates[evIds[0]] : null;
  const secondEvState = evIds[1] ? result.evStates[evIds[1]] : null;

  const dataPoint: MinuteDataPoint = {
    timestamp: timestampDate.toISOString(),
    date: timestampDate.toISOString().slice(0, 10),
    year: timestampDate.getFullYear(),
    month: timestampDate.getMonth() + 1,
    week: getISOWeek(timestampDate),
    day: timestampDate.getDate(),
    hour: minuteH,
    minute: minuteM,

    solarKW: result.solarPowerKw,
    homeLoadKW: result.totalLoadKw,
    ev1LoadKW: result.loadBreakdown[evIds[0]] ?? 0,
    ev2LoadKW: result.loadBreakdown[evIds[1]] ?? 0,

    batteryPowerKW: result.batteryPowerKw,
    batteryLevelPct: result.batteryLevelPct,  // ← this is what was frozen before

    gridImportKW: result.gridImportKw,
    gridExportKW: result.gridExportKw,

    ev1SocPct: firstEvState?.soc ?? 0,
    ev2SocPct: secondEvState?.soc ?? 0,

    tariffRate: isPeakTime ? peakRate : offPeakRate,
    isPeakTime,
    savingsKES: result.savingsKES,

    // Energy totals for this step (power × time)
    solarEnergyKWh: result.solarPowerKw * STEP_H,
    homeLoadKWh: result.totalLoadKw * STEP_H,
    ev1LoadKWh: (result.loadBreakdown[evIds[0]] ?? 0) * STEP_H,
    ev2LoadKWh: (result.loadBreakdown[evIds[1]] ?? 0) * STEP_H,
    gridImportKWh: result.gridImportKw * STEP_H,
    gridExportKWh: result.gridExportKw * STEP_H,
  };

  addMinuteData(dataPoint);

  // 5. Update running accumulators
  updateAccumulators({
    solar: dataPoint.solarEnergyKWh,
    savings: result.savingsKES,
    gridImport: dataPoint.gridImportKWh,
    carbonOffset: dataPoint.solarEnergyKWh * 0.5, // ~0.5 kg CO₂/kWh Kenya grid average
    batDischargeKwh:
      result.batteryPowerKw < 0
        ? Math.abs(result.batteryPowerKw) * STEP_H
        : 0,
    feedInEarnings: result.gridExportKw * STEP_H * 5.0, // KES 5/kWh feed-in tariff
  });

  return result;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
