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
 *        (prevents re-initialisation-per-tick)
 *     2. Calls calculateInstantPhysics each tick
 *     3. Writes battery/solar/grid results into energySystemStore
 *        via updateNode and addMinuteData
 *
 * STALE-ACCUMULATOR FIX (this commit):
 *   `accumulators` must NOT be subscribed as a reactive Zustand selector
 *   inside usePhysicsSimulation. Subscribing to it causes the `tick`
 *   useCallback to be recreated on every tick (accumulators is a dep),
 *   which makes useDemoEnergySystem's setInterval restart on every render,
 *   resetting the simulated clock and battery SOC each cycle.
 *
 *   Solution: read accumulators imperatively via
 *   `useEnergySystemStore.getState().accumulators` inside the tick body.
 *   This is the Zustand-idiomatic pattern for reading state inside
 *   callbacks without creating reactive subscriptions.
 */

'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import type { MinuteDataPoint, EnergyFlow } from '@/stores/energySystemStore';
import type { SystemMode } from '@/stores/energySystemStore';
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
  /** System mode used for mode-specific dispatch behavior */
  systemMode?: SystemMode;
  /** Off-grid generator auto-start threshold (%) */
  generatorThresholdPct?: number;
}

// Keep simulation cadence aligned with the demo tick loop (420 steps/day ≈ 3.43 min/step).
const TICKS_PER_DAY = 420;
const TICK_HOURS = 24 / TICKS_PER_DAY;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Call this hook once inside the component (or parent component) that
 * drives the simulation tick loop.  Pass the same `timeOfDay` and
 * `currentDate` values you already advance in your tick loop.
 *
 * @example
 * const { tick } = usePhysicsSimulation({ systemConfig, solarData });
 *
 * // Inside your setInterval / requestAnimationFrame tick:
 * tick(timeOfDay, currentDate);
 */
export function usePhysicsSimulation(options: PhysicsSimulationOptions) {
  const {
    systemConfig,
    solarData,
    priorityMode = 'auto',
    gridEnabled = true,
    peakRate = 24.31,
    offPeakRate = 14.93,
    peakWindow = [17, 21],
    systemMode = 'hybrid',
    generatorThresholdPct = 20,
  } = options;

  // -------------------------------------------------------------------------
  // Store write actions — these are stable references (Zustand guarantees
  // action identity across renders), so they are safe deps for useCallback.
  // -------------------------------------------------------------------------
  const updateNode = useEnergySystemStore((s) => s.updateNode);
  const updateFlows = useEnergySystemStore((s) => s.updateFlows);
  const addMinuteData = useEnergySystemStore((s) => s.addMinuteData);
  const updateAccumulators = useEnergySystemStore((s) => s.updateAccumulators);

  const shouldTriggerGenerator = useCallback(
    (batteryLevelPct: number) =>
      systemMode === 'off-grid' &&
      systemConfig.battery.capacityKwh > 0 &&
      batteryLevelPct < generatorThresholdPct,
    [systemMode, systemConfig.battery.capacityKwh, generatorThresholdPct]
  );

  // NOTE: `accumulators` (the data) is intentionally NOT subscribed here.
  // Reading it reactively would make this hook re-render on every tick,
  // recreating `tick` and restarting the setInterval in useDemoEnergySystem.
  // Instead, we call useEnergySystemStore.getState().accumulators imperatively
  // inside the tick body — see step 8 below.

  // -------------------------------------------------------------------------
  // Persistent physics state (survives re-renders, resets only on unmount)
  // -------------------------------------------------------------------------
  const physicsStateRef = useRef<PhysicsEngineState | null>(null);
  /** Day scenario regenerated once per simulated calendar day. */
  const currentDayScenarioRef = useRef<DayScenario | null>(null);
  /** Last simulated date string (YYYY-MM-DD) for day-boundary detection. */
  const lastDayKeyRef = useRef<string>('');
  /** Cumulative soiling days counter. */
  const soilingDaysRef = useRef<number>(0);

  // -------------------------------------------------------------------------
  // Initialise physics state lazily (only once per mount)
  // -------------------------------------------------------------------------
  const getOrInitState = useCallback((): PhysicsEngineState => {
    if (!physicsStateRef.current) {
      const initialSoc = systemConfig.battery.minReservePct + 20; // start 20% above reserve
      physicsStateRef.current = {
        batteryKwh:
          systemConfig.battery.capacityKwh * (initialSoc / 100),
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

  // -------------------------------------------------------------------------
  // Day-boundary: regenerate scenario and advance soiling
  // -------------------------------------------------------------------------
  const refreshDayScenarioIfNeeded = useCallback(
    (date: Date, state: PhysicsEngineState) => {
      const dayKey = date.toISOString().slice(0, 10);
      if (dayKey === lastDayKeyRef.current) return;

      // Advance soiling
      soilingDaysRef.current += 1;
      const newSoiling = Math.max(
        SOILING_MIN_FACTOR,
        1.0 - SOILING_LOSS_PER_DAY * soilingDaysRef.current
      );
      state.soilingFactor = newSoiling;

      // Build EV SOC map from current state
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
  // Core tick function — call this every simulation timestep
  // -------------------------------------------------------------------------
  const tick = useCallback(
    (timeOfDay: number, currentDate: Date) => {
      const state = getOrInitState();
      refreshDayScenarioIfNeeded(currentDate, state);

      const scenario = currentDayScenarioRef.current;
      if (!scenario) return;

      const hour = timeOfDay;
      const isPeakTime = hour >= peakWindow[0] && hour < peakWindow[1];

      // Run physics
      const result = calculateInstantPhysics(
        systemConfig,
        scenario,
        hour,
        solarData,
        state,        // state is mutated in-place by calculateInstantPhysics
        priorityMode,
        gridEnabled,
        isPeakTime,
        peakRate,
        offPeakRate
      );

      let adjustedBatteryPowerKw = result.batteryPowerKw;
      let adjustedBatteryLevelPct = result.batteryLevelPct;
      let adjustedGridImportKw = result.gridImportKw;
      let adjustedGridExportKw = result.gridExportKw;

      if (systemMode === 'off-grid') {
        adjustedGridImportKw = 0;
        adjustedGridExportKw = 0;

        if (shouldTriggerGenerator(adjustedBatteryLevelPct)) {
          const batteryMaxKwh = systemConfig.battery.capacityKwh;
          const headroomKwh = Math.max(0, batteryMaxKwh - state.batteryKwh);
          // Generator dispatch model:
          // - generator output is capped by battery max charge rate and inverter capacity
          // - actual charging is further capped by available battery headroom this tick
          const generatorChargeKw = Math.min(
            systemConfig.battery.maxChargeKw,
            systemConfig.inverter.capacityKw
          );
          const chargeKw = Math.min(generatorChargeKw, headroomKwh / TICK_HOURS);
          if (chargeKw > 0) {
            state.batteryKwh += chargeKw * TICK_HOURS;
            adjustedBatteryPowerKw += chargeKw;
            adjustedBatteryLevelPct = (state.batteryKwh / batteryMaxKwh) * 100;
          }
        }
      }

      // NOTE: calculateInstantPhysics mutates state.batteryKwh in-place,
      // so physicsStateRef.current is already updated after the call above.

      // -----------------------------------------------------------------------
      // 1. Update battery node
      // -----------------------------------------------------------------------
      updateNode('battery', {
        powerKW: adjustedBatteryPowerKw,
        soc: adjustedBatteryLevelPct,
        status:
          adjustedBatteryPowerKw > 0.01
            ? 'charging'
            : adjustedBatteryPowerKw < -0.01
            ? 'discharging'
            : 'idle',
      });

      // -----------------------------------------------------------------------
      // 2. Update solar node
      // -----------------------------------------------------------------------
      updateNode('solar', {
        powerKW: result.solarPowerKw,
        status: result.solarPowerKw > 0.1 ? 'online' : 'idle',
      });

      // -----------------------------------------------------------------------
      // 3. Update grid node
      // -----------------------------------------------------------------------
      updateNode('grid', {
        powerKW: Math.abs(adjustedGridImportKw - adjustedGridExportKw),
        status:
          adjustedGridImportKw > 0.01
            ? 'importing'
            : adjustedGridExportKw > 0.01
            ? 'exporting'
            : 'idle',
      });

      // -----------------------------------------------------------------------
      // 4. Update home load node
      // -----------------------------------------------------------------------
      updateNode('home', {
        powerKW: result.totalLoadKw,
        status: 'online',
      });

      // -----------------------------------------------------------------------
      // 5. Update EV nodes from evStates
      // -----------------------------------------------------------------------
      const evIds = Object.keys(result.evStates);
      if (evIds[0]) {
        const ev1 = result.evStates[evIds[0]];
        updateNode('ev1', {
          soc: ev1.soc,
          powerKW: ev1.isCharging ? (systemConfig.loads.find(l => l.id === evIds[0]) as { onboardChargerKw?: number })?.onboardChargerKw ?? 0 : 0,
          status: !ev1.isHome ? 'offline' : ev1.isCharging ? 'charging' : 'idle',
        });
      }
      if (evIds[1]) {
        const ev2 = result.evStates[evIds[1]];
        updateNode('ev2', {
          soc: ev2.soc,
          powerKW: ev2.isCharging ? (systemConfig.loads.find(l => l.id === evIds[1]) as { onboardChargerKw?: number })?.onboardChargerKw ?? 0 : 0,
          status: !ev2.isHome ? 'offline' : ev2.isCharging ? 'charging' : 'idle',
        });
      }

      // -----------------------------------------------------------------------
      // 6. Update energy flows
      // -----------------------------------------------------------------------
      const flows: EnergyFlow[] = [
        {
          from: 'solar',
          to: 'home',
            powerKW: Math.min(result.solarPowerKw, result.totalLoadKw),
            active: result.solarPowerKw > 0.01,
          },
        {
          from: 'solar',
          to: 'battery',
            powerKW: Math.max(0, adjustedBatteryPowerKw),
            active: adjustedBatteryPowerKw > 0.01,
          },
          {
            from: 'solar',
            to: 'grid',
            powerKW: adjustedGridExportKw,
            active: adjustedGridExportKw > 0.01,
          },
          {
            from: 'battery',
            to: 'home',
            powerKW: Math.max(0, -adjustedBatteryPowerKw),
            active: adjustedBatteryPowerKw < -0.01,
          },
          {
            from: 'grid',
            to: 'home',
            powerKW: adjustedGridImportKw,
            active: adjustedGridImportKw > 0.01,
          },
      ];
      updateFlows(flows);

      // -----------------------------------------------------------------------
      // 7. Append MinuteDataPoint to history
      // -----------------------------------------------------------------------
      const timeStep = TICK_HOURS; // ~3.43-minute intervals (420 ticks/day)
      const solarKwh = result.solarPowerKw * timeStep;
      const homeLoadKwh = result.totalLoadKw * timeStep;
      const gridImportKwh = adjustedGridImportKw * timeStep;
      const gridExportKwh = adjustedGridExportKw * timeStep;

      const ev1LoadKw = evIds[0] ? (result.loadBreakdown[evIds[0]] ?? 0) : 0;
      const ev2LoadKw = evIds[1] ? (result.loadBreakdown[evIds[1]] ?? 0) : 0;

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
        batteryPowerKW: adjustedBatteryPowerKw,
        batteryLevelPct: adjustedBatteryLevelPct,
        gridImportKW: adjustedGridImportKw,
        gridExportKW: adjustedGridExportKw,
        ev1SocPct: evIds[0] ? (result.evStates[evIds[0]]?.soc ?? 0) : 0,
        ev2SocPct: evIds[1] ? (result.evStates[evIds[1]]?.soc ?? 0) : 0,
        tariffRate: rate,
        isPeakTime,
        savingsKES: result.savingsKES,
        solarEnergyKWh: solarKwh,
        homeLoadKWh: homeLoadKwh,
        ev1LoadKWh: ev1LoadKw * timeStep,
        ev2LoadKWh: ev2LoadKw * timeStep,
        gridImportKWh: adjustedGridImportKw * timeStep,
        gridExportKWh: adjustedGridExportKw * timeStep,
      };

      addMinuteData(minutePoint);

      // -----------------------------------------------------------------------
      // 8. Update accumulators
      //
      // IMPORTANT: Read the current accumulator values imperatively via
      // getState() rather than from a reactive selector. Using a reactive
      // selector would make `tick` a dep of itself through useCallback,
      // causing the setInterval in useDemoEnergySystem to restart on every
      // tick and resetting the simulation clock / battery SOC.
      // -----------------------------------------------------------------------
      const accumulators = useEnergySystemStore.getState().accumulators;
      updateAccumulators({
        solar: accumulators.solar + solarKwh,
        savings: accumulators.savings + result.savingsKES,
        gridImport: accumulators.gridImport + gridImportKwh,
        carbonOffset: accumulators.carbonOffset + solarKwh * 0.233, // kg CO₂ per kWh (Kenya grid factor)
        batDischargeKwh:
          accumulators.batDischargeKwh +
          (adjustedBatteryPowerKw < 0 ? Math.abs(adjustedBatteryPowerKw) * timeStep : 0),
        feedInEarnings: accumulators.feedInEarnings + adjustedGridExportKw * timeStep * 5.0, // KES feed-in tariff
      });
    },
    [
      systemConfig,
      solarData,
      priorityMode,
      systemMode,
      generatorThresholdPct,
      TICK_HOURS,
      shouldTriggerGenerator,
      gridEnabled,
      peakRate,
      offPeakRate,
      peakWindow,
      getOrInitState,
      refreshDayScenarioIfNeeded,
      updateNode,
      updateFlows,
      addMinuteData,
      updateAccumulators,
      // `accumulators` (the data) is intentionally ABSENT from deps.
      // It is read inside the tick body via getState() to avoid
      // reactive re-subscription that would restart the simulation loop.
    ]
  );

  // -------------------------------------------------------------------------
  // Reset physics state when system config changes fundamentally
  // (e.g. battery capacity swapped out)
  // -------------------------------------------------------------------------
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
