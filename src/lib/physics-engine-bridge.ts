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
import type { MinuteDataPoint, EnergyNode, NodeType } from '@/stores/energySystemStore';
import {
  calculateInstantPhysics,
  generateDayScenario,
  type PhysicsEngineState,
  type SolarData,
  type PriorityMode,
} from './physics-engine';
import {
  resolveCatalogPhysicsParams,
  type CatalogPhysicsParams,
} from './catalog-physics-bridge';
import {
  SIM_STEP_DURATION_HOURS,
  FEED_IN_TARIFF_RATE_KES,
  GRID_EMISSION_FACTOR_KG_CO2_PER_KWH,
} from './config';

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
// Catalog params cache — recomputed only when installed IDs change
// ---------------------------------------------------------------------------

let _cachedCatalogParams: CatalogPhysicsParams | null = null;
let _cachedModuleId: string | undefined;
let _cachedInverterId: string | undefined;
let _cachedBatteryId: string | undefined;

/**
 * Resolve CatalogPhysicsParams from the system config's installed component
 * IDs. Results are memoised so the catalog lookup (string scanning) does not
 * run on every 1-second tick.
 */
function getCatalogParams(config: SystemConfiguration): CatalogPhysicsParams {
  if (
    _cachedCatalogParams &&
    _cachedModuleId   === config.installedModuleId &&
    _cachedInverterId === config.installedInverterId &&
    _cachedBatteryId  === config.installedBatteryId
  ) {
    return _cachedCatalogParams;
  }

  _cachedModuleId   = config.installedModuleId;
  _cachedInverterId = config.installedInverterId;
  _cachedBatteryId  = config.installedBatteryId;
  _cachedCatalogParams = resolveCatalogPhysicsParams(
    config.installedModuleId,
    config.installedInverterId,
    config.installedBatteryId,
  );

  return _cachedCatalogParams;
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
 * Physics parameters (temp coefficient, degradation, inverter efficiency, battery
 * RTE, etc.) are resolved from the installed component IDs in systemConfig via the
 * catalog-physics-bridge so every tick uses real datasheet values rather than
 * generic industry defaults.
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

  // 1. Resolve catalog-driven physics params (memoised by installed IDs)
  const catalogParams = getCatalogParams(systemConfig);

  // 2. Generate a day scenario using the current EV SOC states from persistent state
  const scenario = generateDayScenario(
    systemConfig,
    currentDate,
    solarData,
    state.evSocs  // ← use live EV SOCs, not stale initial values
  );

  // 3. Run physics — state.batteryKwh is mutated in place ✅
  //    catalogParams carries datasheet-derived: panelTempCoefficientPerDegC,
  //    panelFirstYearDegradation, panelAnnualDegradationRate, isBifacial,
  //    bifacialGainFactor, inverterMaxEfficiency, mpptEfficiency,
  //    batteryRoundTripEfficiency — all resolved from the component IDs in
  //    systemConfig.installedModuleId / installedInverterId / installedBatteryId.
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
    offPeakRate,
    catalogParams // ← NEW: real-world physics from datasheets
  );

  // 4. Wire results into energySystemStore nodes so live tiles update
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

  // Update EV nodes from physics result evStates.
  // Note: ev1/ev2 are legacy store node names mapping to the first two EV load IDs.
  // A maximum of 2 EVs are reflected in the store; additional EVs are tracked in
  // state.evSocs but not surfaced as separate store nodes until the store supports
  // dynamic EV node registration.
  const evIds = Object.keys(result.evStates);
  if (evIds.length > 2) {
    console.warn(
      `[physics-engine-bridge] ${evIds.length} EVs detected but only ev1/ev2 store nodes exist. ` +
      `EVs beyond the first two will not update the UI.`
    );
  }
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

  // 5. Build and append the full MinuteDataPoint
  const minuteH = Math.floor(hour);
  const minuteM = Math.round((hour - minuteH) * 60);
  const timestampDate = new Date(currentDate);
  timestampDate.setHours(minuteH, minuteM, 0, 0);

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
    batteryLevelPct: result.batteryLevelPct,

    gridImportKW: result.gridImportKw,
    gridExportKW: result.gridExportKw,

    ev1SocPct: firstEvState?.soc ?? 0,
    ev2SocPct: secondEvState?.soc ?? 0,

    tariffRate: isPeakTime ? peakRate : offPeakRate,
    isPeakTime,
    savingsKES: result.savingsKES,

    // Energy totals for this step (power × time)
    solarEnergyKWh: result.solarPowerKw * SIM_STEP_DURATION_HOURS,
    homeLoadKWh: result.totalLoadKw * SIM_STEP_DURATION_HOURS,
    ev1LoadKWh: (result.loadBreakdown[evIds[0]] ?? 0) * SIM_STEP_DURATION_HOURS,
    ev2LoadKWh: (result.loadBreakdown[evIds[1]] ?? 0) * SIM_STEP_DURATION_HOURS,
    gridImportKWh: result.gridImportKw * SIM_STEP_DURATION_HOURS,
    gridExportKWh: result.gridExportKw * SIM_STEP_DURATION_HOURS,
  };

  addMinuteData(dataPoint);

  // 6. Update running accumulators
  updateAccumulators({
    solar: dataPoint.solarEnergyKWh,
    savings: result.savingsKES,
    gridImport: dataPoint.gridImportKWh,
    carbonOffset: dataPoint.solarEnergyKWh * GRID_EMISSION_FACTOR_KG_CO2_PER_KWH,
    batDischargeKwh:
      result.batteryPowerKw < 0
        ? Math.abs(result.batteryPowerKw) * SIM_STEP_DURATION_HOURS
        : 0,
    feedInEarnings: result.gridExportKw * SIM_STEP_DURATION_HOURS * FEED_IN_TARIFF_RATE_KES,
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
