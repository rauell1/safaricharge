/**
 * usePhysicsSimulation
 *
 * Wires calculateInstantPhysics into the energySystemStore so that
 * battery SOC, solar power, grid flows, and minute data all update
 * correctly each simulation tick.
 *
 * EV CONTROLS (Issue #142):
 * Each tick reads evControls.ev1 from the store imperatively (via getState)
 * to override ev1LoadKW when the user has started charging and selected a
 * charger size. This avoids adding evControls as a reactive dep (which
 * would restart the simulation loop via useCallback recreation).
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

// Charger option kW values — must match CHARGER_OPTIONS order in EVChargingCard
const EV_CHARGER_KW = [3.7, 7.4, 11, 22, 50, 100, 150] as const;

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

  const updateNode = useEnergySystemStore((s) => s.updateNode);
  const updateFlows = useEnergySystemStore((s) => s.updateFlows);
  const addMinuteData = useEnergySystemStore((s) => s.addMinuteData);
  const updateAccumulators = useEnergySystemStore((s) => s.updateAccumulators);

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
          systemConfig.loads.filter((l) => l.type === 'ev').map((l) => [l.id, 50])
        ),
        evIsHome: Object.fromEntries(
          systemConfig.loads.filter((l) => l.type === 'ev').map((l) => [l.id, true])
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
      currentDayScenarioRef.current = generateDayScenario(systemConfig, date, solarData, evSocStates);
      lastDayKeyRef.current = dayKey;
    },
    [systemConfig, solarData]
  );

  const tick = useCallback(
    (timeOfDay: number, currentDate: Date) => {
      const state = getOrInitState();
      refreshDayScenarioIfNeeded(currentDate, state);

      const scenario = currentDayScenarioRef.current;
      if (!scenario) return;

      const hour = timeOfDay;
      const isPeakTime = hour >= peakWindow[0] && hour < peakWindow[1];

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
        offPeakRate
      );

      // -----------------------------------------------------------------------
      // Apply user EV control override — read imperatively to avoid dep churn
      // -----------------------------------------------------------------------
      const { evControls } = useEnergySystemStore.getState();
      const ev1Control = evControls.ev1;
      const ev1OverrideKw = ev1Control.isCharging
        ? (EV_CHARGER_KW[ev1Control.chargerOptionIndex] ?? 7.4)
        : 0;

      // 1. Battery node
      updateNode('battery', {
        powerKW: result.batteryPowerKw,
        soc: result.batteryLevelPct,
        status:
          result.batteryPowerKw > 0.01 ? 'charging' :
          result.batteryPowerKw < -0.01 ? 'discharging' : 'idle',
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
          result.gridImportKw > 0.01 ? 'importing' :
          result.gridExportKw > 0.01 ? 'exporting' : 'idle',
      });

      // 4. Home load node
      updateNode('home', {
        powerKW: result.totalLoadKw,
        status: 'online',
      });

      // 5. EV1 node — honour user override
      const evIds = Object.keys(result.evStates);
      const ev1Id = evIds[0];
      if (ev1Id) {
        const ev1Physics = result.evStates[ev1Id];
        // Update physics SoC using override rate so it rises correctly
        if (ev1Control.isCharging && ev1OverrideKw > 0 && physicsStateRef.current) {
          const timeStep = 24 / 420;
          const ev1Cap = systemConfig.loads.find(l => l.id === ev1Id && l.type === 'ev') as { capacityKwh?: number } | undefined;
          const capKwh = ev1Cap?.capacityKwh ?? 80;
          physicsStateRef.current.evSocs[ev1Id] = Math.min(
            100,
            (physicsStateRef.current.evSocs[ev1Id] ?? 50) + (ev1OverrideKw / capKwh) * timeStep * 100
          );
        }
        updateNode('ev1', {
          soc: physicsStateRef.current?.evSocs[ev1Id] ?? ev1Physics.soc,
          powerKW: ev1OverrideKw,
          status: !ev1Physics.isHome ? 'offline' : ev1Control.isCharging ? 'charging' : 'idle',
        });
      }

      // 6. Energy flows
      const flows: EnergyFlow[] = [
        { from: 'solar', to: 'home',    powerKW: Math.min(result.solarPowerKw, result.totalLoadKw), active: result.solarPowerKw > 0.01 },
        { from: 'solar', to: 'battery', powerKW: Math.max(0, result.batteryPowerKw),                active: result.batteryPowerKw > 0.01 },
        { from: 'solar', to: 'grid',    powerKW: result.gridExportKw,                               active: result.gridExportKw > 0.01 },
        { from: 'battery', to: 'home',  powerKW: Math.max(0, -result.batteryPowerKw),               active: result.batteryPowerKw < -0.01 },
        { from: 'grid', to: 'home',     powerKW: result.gridImportKw,                               active: result.gridImportKw > 0.01 },
      ];
      updateFlows(flows);

      // 7. MinuteDataPoint
      const timeStep = 24 / 420;
      const solarKwh      = result.solarPowerKw  * timeStep;
      const homeLoadKwh   = result.totalLoadKw   * timeStep;
      const gridImportKwh = result.gridImportKw  * timeStep;
      const gridExportKwh = result.gridExportKw  * timeStep;

      // Use override for ev1LoadKW so minuteData reflects user intent
      const ev1LoadKwFinal = ev1OverrideKw;
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
        homeLoadKW: result.totalLoadKw - ev1LoadKwFinal - ev2LoadKw,
        ev1LoadKW: ev1LoadKwFinal,
        ev2LoadKW: ev2LoadKw,
        batteryPowerKW: result.batteryPowerKw,
        batteryLevelPct: result.batteryLevelPct,
        gridImportKW: result.gridImportKw,
        gridExportKW: result.gridExportKw,
        ev1SocPct: physicsStateRef.current?.evSocs[ev1Id ?? ''] ?? (evIds[0] ? result.evStates[evIds[0]]?.soc ?? 0 : 0),
        ev2SocPct: evIds[1] ? (result.evStates[evIds[1]]?.soc ?? 0) : 0,
        tariffRate: rate,
        isPeakTime,
        savingsKES: result.savingsKES,
        solarEnergyKWh: solarKwh,
        homeLoadKWh: homeLoadKwh,
        ev1LoadKWh: ev1LoadKwFinal * timeStep,
        ev2LoadKWh: ev2LoadKw * timeStep,
        gridImportKWh: gridImportKwh,
        gridExportKWh: gridExportKwh,
      };

      addMinuteData(minutePoint);

      // 8. Accumulators (read imperatively — see comment in original file)
      const accumulators = useEnergySystemStore.getState().accumulators;
      updateAccumulators({
        solar:          accumulators.solar          + solarKwh,
        savings:        accumulators.savings        + result.savingsKES,
        gridImport:     accumulators.gridImport     + gridImportKwh,
        carbonOffset:   accumulators.carbonOffset   + solarKwh * 0.233,
        batDischargeKwh: accumulators.batDischargeKwh +
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

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
