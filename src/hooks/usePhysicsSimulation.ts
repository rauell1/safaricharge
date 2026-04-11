/**
 * usePhysicsSimulation
 *
 * Wires calculateInstantPhysics into the energySystemStore so that
 * battery SOC, solar power, grid flows, and minute data all update
 * correctly each simulation tick.
 *
 * ROOT CAUSE FIX (Issue A — ENGINEERING_ISSUES_V2_2026-04-10.md):
 *   calculateInstantPhysics was implemented but never called from the
 *   running app. This hook is the missing caller. It:
 *     1. Persists PhysicsEngineState across ticks via useRef
 *     2. Calls calculateInstantPhysics each tick
 *     3. Writes battery/solar/grid results into energySystemStore
 *        via updateNode and addMinuteData
 *
 * Issue #142 — EV Charging Controls:
 *   tick() now accepts an optional `evOverrides` argument:
 *     { ev1ChargeRateKW?: number; ev2ChargeRateKW?: number }
 *   When provided, these override the scenario's EV charge rate so
 *   user-controlled charge rates and start/stop toggles are reflected
 *   in minuteData immediately on the next tick.
 */

'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import type { MinuteDataPoint, EnergyFlow } from '@/stores/energySystemStore';
import {
  calculateInstantPhysics,
  generateDayScenario,
  type PhysicsEngineState,
  type DayScenario,
  type SolarData,
  type PriorityMode,
} from '@/lib/physics-engine';
import type { SystemConfiguration } from '@/lib/system-config';
import { SOILING_LOSS_PER_DAY, SOILING_MIN_FACTOR } from '@/lib/config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PhysicsSimulationOptions {
  /** Full system configuration (panels, battery, inverter, loads). */
  systemConfig: SystemConfiguration;
  /** Solar irradiance / location data. */
  solarData: SolarData;
  /** Battery/grid dispatch priority. Default: 'auto' */
  priorityMode?: PriorityMode;
  /** Whether the grid connection is active. Default: true */
  gridEnabled?: boolean;
  /** KES/kWh tariff during peak hours. Default: 24.31 */
  peakRate?: number;
  /** KES/kWh tariff off-peak. Default: 14.93 */
  offPeakRate?: number;
  /**
   * Peak-time window [startHour, endHour] in 0-24 decimal.
   * Default: [17, 21] (Kenya KPLC evening peak).
   */
  peakWindow?: [number, number];
}

/** Optional per-tick EV charge rate overrides (Issue #142). */
export interface EVTickOverrides {
  /** Set to 0 when EV1 charging is toggled off. */
  ev1ChargeRateKW?: number;
  /** Set to 0 when EV2 charging is toggled off. */
  ev2ChargeRateKW?: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePhysicsSimulation(options: PhysicsSimulationOptions) {
  const {
    systemConfig,
    solarData,
    priorityMode = 'auto',
    gridEnabled = true,
    peakRate = 24.31,
    offPeakRate = 14.93,
    peakWindow = [17, 21],
  } = options;

  // -------------------------------------------------------------------------
  // Store write actions
  // -------------------------------------------------------------------------
  const updateNode = useEnergySystemStore((s) => s.updateNode);
  const updateFlows = useEnergySystemStore((s) => s.updateFlows);
  const addMinuteData = useEnergySystemStore((s) => s.addMinuteData);
  const updateAccumulators = useEnergySystemStore((s) => s.updateAccumulators);

  // -------------------------------------------------------------------------
  // Persistent physics state
  // -------------------------------------------------------------------------
  const physicsStateRef = useRef<PhysicsEngineState | null>(null);
  const currentDayScenarioRef = useRef<DayScenario | null>(null);
  const lastDayKeyRef = useRef<string>('');
  const soilingDaysRef = useRef<number>(0);

  const getOrInitState = useCallback((): PhysicsEngineState => {
    if (!physicsStateRef.current) {
      const initialSoc = systemConfig.battery.minReservePct + 20;
      physicsStateRef.current = {
        batteryKwh: systemConfig.battery.capacityKwh * (initialSoc / 100),
        evSocs: Object.fromEntries(
          systemConfig.loads
            .filter((l) => l.type === 'ev')
            .map((l) => [l.id, 50])
        ),
        evIsHome: Object.fromEntries(
          systemConfig.loads
            .filter((l) => l.type === 'ev')
            .map((l) => [l.id, true])
        ),
        soilingFactor: 1.0,
      };
    }
    return physicsStateRef.current;
  }, [systemConfig]);

  const refreshDayScenarioIfNeeded = useCallback(
    (date: Date, state: PhysicsEngineState) => {
      const dayKey = date.toISOString().slice(0, 10);
      if (dayKey === lastDayKeyRef.current) return;

      soilingDaysRef.current += 1;
      const newSoiling = Math.max(
        SOILING_MIN_FACTOR,
        1.0 - SOILING_LOSS_PER_DAY * soilingDaysRef.current
      );
      state.soilingFactor = newSoiling;

      const evSocStates = { ...state.evSocs };
      currentDayScenarioRef.current = generateDayScenario(
        systemConfig,
        date,
        solarData,
        evSocStates
      );
      lastDayKeyRef.current = dayKey;
    },
    [systemConfig, solarData]
  );

  // -------------------------------------------------------------------------
  // Core tick — accepts optional EV overrides (Issue #142)
  // -------------------------------------------------------------------------
  const tick = useCallback(
    (timeOfDay: number, currentDate: Date, evOverrides: EVTickOverrides = {}) => {
      const state = getOrInitState();
      refreshDayScenarioIfNeeded(currentDate, state);

      const scenario = currentDayScenarioRef.current;
      if (!scenario) return;

      const hour = timeOfDay;
      const isPeakTime = hour >= peakWindow[0] && hour < peakWindow[1];

      // Apply EV charge rate overrides onto a shallow-cloned scenario
      // so the original scenario is not mutated between ticks.
      const evIds = Object.keys(state.evSocs);
      let effectiveScenario = scenario;
      if (evIds.length > 0 && (evOverrides.ev1ChargeRateKW !== undefined || evOverrides.ev2ChargeRateKW !== undefined)) {
        const overrideMap: Record<string, number> = {};
        if (evIds[0] !== undefined && evOverrides.ev1ChargeRateKW !== undefined) {
          overrideMap[evIds[0]] = evOverrides.ev1ChargeRateKW;
        }
        if (evIds[1] !== undefined && evOverrides.ev2ChargeRateKW !== undefined) {
          overrideMap[evIds[1]] = evOverrides.ev2ChargeRateKW;
        }
        // Clone only if we have overrides to apply
        if (Object.keys(overrideMap).length > 0) {
          effectiveScenario = {
            ...scenario,
            evSchedules: Object.fromEntries(
              Object.entries(scenario.evSchedules ?? {}).map(([id, sched]) => [
                id,
                overrideMap[id] !== undefined
                  ? { ...sched, chargeRateKW: overrideMap[id] }
                  : sched,
              ])
            ),
          };
        }
      }

      const result = calculateInstantPhysics(
        systemConfig,
        effectiveScenario,
        hour,
        solarData,
        state,
        priorityMode,
        gridEnabled,
        isPeakTime,
        peakRate,
        offPeakRate
      );

      // 1. Battery node
      updateNode('battery', {
        powerKW: result.batteryPowerKw,
        soc: result.batteryLevelPct,
        status:
          result.batteryPowerKw > 0.01
            ? 'charging'
            : result.batteryPowerKw < -0.01
            ? 'discharging'
            : 'idle',
      });

      // 2. Solar node
      updateNode('solar', {
        powerKW: result.solarPowerKw,
        status: result.solarPowerKw > 0.1 ? 'online' : 'idle',
      });

      // 3. Grid node
      const netGridKw = result.gridImportKw - result.gridExportKw;
      updateNode('grid', {
        powerKW: Math.abs(netGridKw),
        status:
          result.gridImportKw > 0.01
            ? 'importing'
            : result.gridExportKw > 0.01
            ? 'exporting'
            : 'idle',
      });

      // 4. Home load node
      updateNode('home', {
        powerKW: result.totalLoadKw,
        status: 'online',
      });

      // 5. EV nodes
      const evIdList = Object.keys(result.evStates);
      if (evIdList[0]) {
        const ev1 = result.evStates[evIdList[0]];
        updateNode('ev1', {
          soc: ev1.soc,
          powerKW: ev1.isCharging
            ? (evOverrides.ev1ChargeRateKW ?? (systemConfig.loads.find(l => l.id === evIdList[0]) as { onboardChargerKw?: number })?.onboardChargerKw ?? 0)
            : 0,
          status: !ev1.isHome ? 'offline' : ev1.isCharging ? 'charging' : 'idle',
        });
      }
      if (evIdList[1]) {
        const ev2 = result.evStates[evIdList[1]];
        updateNode('ev2', {
          soc: ev2.soc,
          powerKW: ev2.isCharging
            ? (evOverrides.ev2ChargeRateKW ?? (systemConfig.loads.find(l => l.id === evIdList[1]) as { onboardChargerKw?: number })?.onboardChargerKw ?? 0)
            : 0,
          status: !ev2.isHome ? 'offline' : ev2.isCharging ? 'charging' : 'idle',
        });
      }

      // 6. Flows
      const flows: EnergyFlow[] = [
        {
          from: 'solar', to: 'home',
          powerKW: Math.min(result.solarPowerKw, result.totalLoadKw),
          active: result.solarPowerKw > 0.01,
        },
        {
          from: 'solar', to: 'battery',
          powerKW: Math.max(0, result.batteryPowerKw),
          active: result.batteryPowerKw > 0.01,
        },
        {
          from: 'solar', to: 'grid',
          powerKW: result.gridExportKw,
          active: result.gridExportKw > 0.01,
        },
        {
          from: 'battery', to: 'home',
          powerKW: Math.max(0, -result.batteryPowerKw),
          active: result.batteryPowerKw < -0.01,
        },
        {
          from: 'grid', to: 'home',
          powerKW: result.gridImportKw,
          active: result.gridImportKw > 0.01,
        },
      ];
      updateFlows(flows);

      // 7. Minute data
      const timeStep = 24 / 420;
      const solarKwh = result.solarPowerKw * timeStep;
      const homeLoadKwh = result.totalLoadKw * timeStep;
      const gridImportKwh = result.gridImportKw * timeStep;
      const gridExportKwh = result.gridExportKw * timeStep;

      const ev1LoadKw = evIdList[0] ? (result.loadBreakdown[evIdList[0]] ?? 0) : 0;
      const ev2LoadKw = evIdList[1] ? (result.loadBreakdown[evIdList[1]] ?? 0) : 0;

      const rate = isPeakTime ? peakRate : offPeakRate;

      const minutePoint: MinuteDataPoint = {
        timestamp: currentDate.toISOString(),
        date: currentDate.toISOString().slice(0, 10),
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        week: getISOWeek(currentDate),
        day: currentDate.getDate(),
        hour: Math.floor(hour),
        minute: Math.round((hour % 1) * 60),
        solarKW: result.solarPowerKw,
        homeLoadKW: result.totalLoadKw - ev1LoadKw - ev2LoadKw,
        ev1LoadKW: ev1LoadKw,
        ev2LoadKW: ev2LoadKw,
        batteryPowerKW: result.batteryPowerKw,
        batteryLevelPct: result.batteryLevelPct,
        gridImportKW: result.gridImportKw,
        gridExportKW: result.gridExportKw,
        ev1SocPct: evIdList[0] ? (result.evStates[evIdList[0]]?.soc ?? 0) : 0,
        ev2SocPct: evIdList[1] ? (result.evStates[evIdList[1]]?.soc ?? 0) : 0,
        tariffRate: rate,
        isPeakTime,
        savingsKES: result.savingsKES,
        solarEnergyKWh: solarKwh,
        homeLoadKWh: homeLoadKwh,
        ev1LoadKWh: ev1LoadKw * timeStep,
        ev2LoadKWh: ev2LoadKw * timeStep,
        gridImportKWh: gridImportKwh,
        gridExportKWh: gridExportKwh,
      };

      addMinuteData(minutePoint);

      // 8. Accumulators (read imperatively — see comment in original)
      const accumulators = useEnergySystemStore.getState().accumulators;
      updateAccumulators({
        solar: accumulators.solar + solarKwh,
        savings: accumulators.savings + result.savingsKES,
        gridImport: accumulators.gridImport + gridImportKwh,
        carbonOffset: accumulators.carbonOffset + solarKwh * 0.233,
        batDischargeKwh:
          accumulators.batDischargeKwh +
          (result.batteryPowerKw < 0 ? Math.abs(result.batteryPowerKw) * timeStep : 0),
        feedInEarnings: accumulators.feedInEarnings + gridExportKwh * 5.0,
      });
    },
    [
      systemConfig, solarData, priorityMode, gridEnabled,
      peakRate, offPeakRate, peakWindow,
      getOrInitState, refreshDayScenarioIfNeeded,
      updateNode, updateFlows, addMinuteData, updateAccumulators,
    ]
  );

  // Reset physics state when system config changes fundamentally
  useEffect(() => {
    physicsStateRef.current = null;
    currentDayScenarioRef.current = null;
    lastDayKeyRef.current = '';
    soilingDaysRef.current = 0;
  }, [
    systemConfig.battery.capacityKwh,
    systemConfig.solar.totalCapacityKw,
  ]);

  return { tick };
}

// ---------------------------------------------------------------------------
// Utility: ISO week number
// ---------------------------------------------------------------------------
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
