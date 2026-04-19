'use client';

import { useEffect, useRef, useCallback } from 'react';
import { buildDemoEnergyState } from '@/lib/demoEnergyState';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { usePhysicsSimulation } from '@/hooks/usePhysicsSimulation';
import type { SolarData } from '@/lib/physics-engine';

// ---------------------------------------------------------------------------
// Module-level constants — stable references, no re-render churn
// ---------------------------------------------------------------------------

/** Peak-tariff window: 17:00–21:00 Kenya KPLC evening peak. */
const DEMO_PEAK_WINDOW: [number, number] = [17, 21];

const DEMO_SOLAR_DATA: SolarData = {
  latitude: -1.2921,
  longitude: 36.8219,
  annualAvgKwhPerKwp: 5.4,
  monthlyAvgKwhPerKwp: [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3],
  monthlyAvgTemp: [22, 23, 24, 23, 22, 21, 20, 21, 22, 23, 22, 22],
};

// ---------------------------------------------------------------------------
// Base timing — speed multiplier is applied dynamically in the effect
// 420 ticks/day × BASE_INTERVAL_MS = one simulated day in ~42 s at 1×
// ---------------------------------------------------------------------------
const BASE_INTERVAL_MS = 100;
const TICKS_PER_DAY    = 420;
const HOURS_PER_TICK   = 24 / TICKS_PER_DAY; // ~3.43 simulated minutes/tick

/**
 * useDemoEnergySystem
 *
 * Drives the live simulation tick loop.
 *
 * FIX (this PR):
 *   - isAutoMode  → tick only fires when isAutoMode === true (Play/Pause works)
 *   - simSpeed    → interval = BASE_INTERVAL_MS / simSpeed, so 10× runs 10×
 *                   faster wall-clock; cable animation speed is a separate
 *                   cosmetic concern handled in SimulationNodes.
 */
export function useDemoEnergySystem(enabled = true) {
  const fullSystemConfig = useEnergySystemStore((s) => s.fullSystemConfig);
  const systemMode = useEnergySystemStore((s) => s.systemConfig.systemMode);
  const gridOutageEnabled = useEnergySystemStore((s) => s.systemConfig.gridOutageEnabled);
  const generatorThresholdPct = useEnergySystemStore((s) => s.systemConfig.generatorThresholdPct);
  const gridEnabled =
    systemMode === 'off-grid' ? false : systemMode === 'on-grid' ? !gridOutageEnabled : true;

  const { tick } = usePhysicsSimulation({
    systemConfig: fullSystemConfig,
    solarData: DEMO_SOLAR_DATA,
    priorityMode: 'auto',
    systemMode,
    generatorThresholdPct,
    gridEnabled,
    peakRate: 24.31,
    offPeakRate: 14.93,
    peakWindow: DEMO_PEAK_WINDOW,
  });

  // Simulated clock — live in refs so interval closure is stable
  const timeOfDayRef   = useRef<number>(0);
  const currentDateRef = useRef<Date>(new Date());
  const tickCountRef   = useRef<number>(0);
  const seededRef      = useRef<boolean>(false);

  // ── One-time static seed ──────────────────────────────────────────────────
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    const state = useEnergySystemStore.getState();
    if (state.minuteData.length > 0) return; // hot-reload guard
    const demo = buildDemoEnergyState();
    useEnergySystemStore.setState({ ...state, ...demo, timeRange: 'today' });
  }, []);

  // ── Stable tick callback ──────────────────────────────────────────────────
  const runTick = useCallback(() => {
    const timeOfDay   = timeOfDayRef.current;
    const currentDate = currentDateRef.current;

    tick(timeOfDay, currentDate);

    const nextTimeOfDay = (timeOfDay + HOURS_PER_TICK) % 24;
    timeOfDayRef.current = nextTimeOfDay;
    tickCountRef.current += 1;

    if (tickCountRef.current % TICKS_PER_DAY === 0) {
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      currentDateRef.current = nextDay;
      useEnergySystemStore.setState({ currentDate: nextDay });
    } else {
      const h = Math.floor(nextTimeOfDay);
      const m = Math.round((nextTimeOfDay % 1) * 60);
      const syncedDate = new Date(currentDate);
      syncedDate.setHours(h, m, 0, 0);
      currentDateRef.current = syncedDate;
      useEnergySystemStore.setState({ currentDate: syncedDate });
    }
  }, [tick]);

  // ── Live interval — respects isAutoMode and simSpeed ─────────────────────
  //
  // We subscribe to both values from the store *outside* the effect so that
  // when either changes, the effect re-runs, tearning down the old interval
  // and starting a fresh one at the correct speed.
  //
  const isAutoMode = useEnergySystemStore((s) => s.isAutoMode);
  const simSpeed   = useEnergySystemStore((s) => s.simSpeed);

  useEffect(() => {
    // Initialise simulated clock to current wall-clock time on first mount
    const now = new Date();
    if (tickCountRef.current === 0) {
      timeOfDayRef.current   = now.getHours() + now.getMinutes() / 60;
      currentDateRef.current = new Date(
        now.getFullYear(), now.getMonth(), now.getDate(),
        now.getHours(), now.getMinutes(), 0, 0
      );
    }

    // Paused or disabled — do not start an interval.
    if (!enabled || !isAutoMode) return;

    // Speed-scaled interval: 1× = 100 ms, 10× = 10 ms, 0.25× = 400 ms
    const intervalMs = Math.max(16, BASE_INTERVAL_MS / simSpeed);
    const id = setInterval(runTick, intervalMs);
    return () => clearInterval(id);
  }, [enabled, isAutoMode, simSpeed, runTick]);
}
