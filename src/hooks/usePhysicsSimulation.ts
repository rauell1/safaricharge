/**
 * usePhysicsSimulation
 *
 * Wires calculateInstantPhysics into the energySystemStore so that
 * battery SOC, solar power, grid flows, and minute data all update
 * correctly each simulation tick.
 *
 * ROOT CAUSE FIX (Issue A — battery SOC frozen):
 *   1. PhysicsEngineState is persisted in a useRef — never recreated per tick.
 *   2. calculateInstantPhysics is called with the SIMULATED currentDate so
 *      monthly solar derating tracks simulated time, not wall-clock time.
 *   3. state.evIsHome is refreshed from scenario.evIsHome at each day
 *      boundary so EV away-from-home logic applies correctly.
 *   4. accumulators are read imperatively via getState() to avoid reactive
 *      re-subscription that would restart the setInterval in useDemoEnergySystem.
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
  systemConfig: SystemConfiguration;
  solarData: SolarData;
  priorityMode?: PriorityMode;
  gridEnabled?: boolean;
  peakRate?: number;
  offPeakRate?: number;
  peakWindow?: [number, number];
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

  // Store write actions — stable Zustand references, safe as useCallback deps
  const updateNode = useEnergySystemStore((s) => s.updateNode);
  const updateFlows = useEnergySystemStore((s) => s.updateFlows);
  const addMinuteData = useEnergySystemStore((s) => s.addMinuteData);
  const updateAccumulators = useEnergySystemStore((s) => s.updateAccumulators);

  // Persistent physics state — survives re-renders, reset only on unmount
  const physicsStateRef = useRef<PhysicsEngineState | null>(null);
  const currentDayScenarioRef = useRef<DayScenario | null>(null);
  const lastDayKeyRef = useRef<string>('');
  const soilingDaysRef = useRef<number>(0);

  // Lazy-initialise physics state once per mount
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

  // Day-boundary: regenerate scenario, advance soiling, sync evIsHome
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

      const scenario = generateDayScenario(
        systemConfig,
        date,
        solarData,
        evSocStates
      );
      currentDayScenarioRef.current = scenario;
      lastDayKeyRef.current = dayKey;

      // FIX: sync state.evIsHome from the newly generated scenario so
      // EV away-from-home randomisation actually takes effect each day.
      // Without this, evIsHome stays as its initial value (all true) forever.
      Object.assign(state.evIsHome, scenario.evIsHome);
    },
    [systemConfig, solarData]
  );

  // Core tick function — call every simulation timestep
  const tick = useCallback(
    (timeOfDay: number, currentDate: Date) => {
      const state = getOrInitState();
      refreshDayScenarioIfNeeded(currentDate, state);

      const scenario = currentDayScenarioRef.current;
      if (!scenario) return;

      const hour = timeOfDay;
      const isPeakTime = hour >= peakWindow[0] && hour < peakWindow[1];

      // FIX: pass currentDate (simulated) into calculateInstantPhysics.
      // The engine uses it for monthly solar derating — if we omit it the
      // engine would fall back to new Date() (wall-clock) and the solar
      // output would be stuck at April values regardless of simulated month.
      const result = calculateInstantPhysics(
        systemConfig,
        scenario,
        hour,
        solarData,
        state,
        priorityMode,
        gridEnabled,
        isPeakTime,
        peakRate,
        offPeakRate,
        currentDate    // ← simulated date passed through
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
      const evIds = Object.keys(result.evStates);
      if (evIds[0]) {
        const ev1 = result.evStates[evIds[0]];
        updateNode('ev1', {
          soc: ev1.soc,
          powerKW: ev1.isCharging
            ? (systemConfig.loads.find(l => l.id === evIds[0]) as { onboardChargerKw?: number })?.onboardChargerKw ?? 0
            : 0,
          status: !ev1.isHome ? 'offline' : ev1.isCharging ? 'charging' : 'idle',
        });
      }
      if (evIds[1]) {
        const ev2 = result.evStates[evIds[1]];
        updateNode('ev2', {
          soc: ev2.soc,
          powerKW: ev2.isCharging
            ? (systemConfig.loads.find(l => l.id === evIds[1]) as { onboardChargerKw?: number })?.onboardChargerKw ?? 0
            : 0,
          status: !ev2.isHome ? 'offline' : ev2.isCharging ? 'charging' : 'idle',
        });
      }

      // 6. Energy flows
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
          powerKW: Math.max(0, result.batteryPowerKw),
          active: result.batteryPowerKw > 0.01,
        },
        {
          from: 'solar',
          to: 'grid',
          powerKW: result.gridExportKw,
          active: result.gridExportKw > 0.01,
        },
        {
          from: 'battery',
          to: 'home',
          powerKW: Math.max(0, -result.batteryPowerKw),
          active: result.batteryPowerKw < -0.01,
        },
        {
          from: 'grid',
          to: 'home',
          powerKW: result.gridImportKw,
          active: result.gridImportKw > 0.01,
        },
      ];
      updateFlows(flows);

      // 7. Minute history
      const timeStep = 24 / 420;
      const solarKwh = result.solarPowerKw * timeStep;
      const homeLoadKwh = result.totalLoadKw * timeStep;
      const gridImportKwh = result.gridImportKw * timeStep;
      const gridExportKwh = result.gridExportKw * timeStep;

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
        batteryPowerKW: result.batteryPowerKw,
        batteryLevelPct: result.batteryLevelPct,
        gridImportKW: result.gridImportKw,
        gridExportKW: result.gridExportKw,
        ev1SocPct: evIds[0] ? (result.evStates[evIds[0]]?.soc ?? 0) : 0,
        ev2SocPct: evIds[1] ? (result.evStates[evIds[1]]?.soc ?? 0) : 0,
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

      // 8. Accumulators — read imperatively to avoid reactive re-subscription
      //    (which would restart the setInterval in useDemoEnergySystem).
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
      systemConfig,
      solarData,
      priorityMode,
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

// ISO week number utility
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
