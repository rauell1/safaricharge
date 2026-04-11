'use client';

import { useEffect, useRef, useCallback } from 'react';
import { buildDemoEnergyState } from '@/lib/demoEnergyState';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { usePhysicsSimulation } from '@/hooks/usePhysicsSimulation';
import { DEFAULT_SYSTEM_CONFIG } from '@/lib/system-config';
import type { SolarData } from '@/lib/physics-engine';

// ---------------------------------------------------------------------------
// Nairobi solar data (matches NAIROBI_SOLAR_DATA in page.tsx)
// ---------------------------------------------------------------------------
const DEMO_SOLAR_DATA: SolarData = {
  latitude: -1.2921,
  longitude: 36.8219,
  annualAvgKwhPerKwp: 5.4,
  monthlyAvgKwhPerKwp: [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3],
  monthlyAvgTemp: [22, 23, 24, 23, 22, 21, 20, 21, 22, 23, 22, 22],
};

// ---------------------------------------------------------------------------
// Simulation timing
// 420 ticks/day × 100 ms = one simulated day in ~42 seconds wall-clock
// ---------------------------------------------------------------------------
const TICK_INTERVAL_MS = 100;
const TICKS_PER_DAY = 420;
const HOURS_PER_TICK = 24 / TICKS_PER_DAY; // ~3.43 simulated minutes per tick

/**
 * useDemoEnergySystem
 *
 * FIX for Issue A — Battery SOC frozen in dashboard
 * (ENGINEERING_ISSUES_V2_2026-04-10.md §A)
 *
 * ROOT CAUSE: The previous implementation called buildDemoEnergyState() once
 * on mount and then stopped. The store was permanently frozen on that initial
 * snapshot, so battery SOC, solar power, and grid flows never changed.
 *
 * FIX:
 *   1. Seeds the store with static demo data on first mount so the dashboard
 *      is not blank while the simulation warms up (behaviour preserved).
 *   2. Starts a live tick loop via usePhysicsSimulation so that battery SOC,
 *      solar power, grid flows, and minute history all evolve over time.
 */
export function useDemoEnergySystem() {
  // -------------------------------------------------------------------------
  // Live physics tick (the missing piece)
  // -------------------------------------------------------------------------
  const { tick } = usePhysicsSimulation({
    systemConfig: DEFAULT_SYSTEM_CONFIG,
    solarData: DEMO_SOLAR_DATA,
    priorityMode: 'auto',
    gridEnabled: true,
    peakRate: 24.31,
    offPeakRate: 14.93,
    peakWindow: [17, 21],
  });

  // Simulated clock state — persisted in refs so setInterval closure stays stable
  const timeOfDayRef = useRef<number>(0);
  const currentDateRef = useRef<Date>(new Date());
  const tickCountRef = useRef<number>(0);
  const seededRef = useRef<boolean>(false);

  // -------------------------------------------------------------------------
  // One-time static seed (preserved from original implementation)
  // Gives the UI something to render before the first physics tick fires
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;

    const state = useEnergySystemStore.getState();
    if (state.minuteData.length > 0) return; // already seeded (hot reload guard)

    const demo = buildDemoEnergyState();
    useEnergySystemStore.setState({
      ...state,
      ...demo,
      timeRange: 'today',
    });
  }, []);

  // -------------------------------------------------------------------------
  // Stable tick callback — advances simulated time and calls physics engine
  // -------------------------------------------------------------------------
  const runTick = useCallback(() => {
    const timeOfDay = timeOfDayRef.current;
    const currentDate = currentDateRef.current;

    // Run physics: mutates PhysicsEngineState in-place (via useRef inside
    // usePhysicsSimulation) and writes results into energySystemStore via
    // updateNode, updateFlows, addMinuteData, and updateAccumulators.
    tick(timeOfDay, currentDate);

    // Advance simulated time-of-day
    const nextTimeOfDay = (timeOfDay + HOURS_PER_TICK) % 24;
    timeOfDayRef.current = nextTimeOfDay;
    tickCountRef.current += 1;

    // Day boundary: roll over to next simulated calendar day
    if (tickCountRef.current % TICKS_PER_DAY === 0) {
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(0, 0, 0, 0);
      currentDateRef.current = nextDay;
      useEnergySystemStore.setState({ currentDate: nextDay });
    } else {
      // Keep store currentDate in sync with simulated hour/minute
      const h = Math.floor(nextTimeOfDay);
      const m = Math.round((nextTimeOfDay % 1) * 60);
      const syncedDate = new Date(currentDate);
      syncedDate.setHours(h, m, 0, 0);
      currentDateRef.current = syncedDate;
      useEnergySystemStore.setState({ currentDate: syncedDate });
    }
  }, [tick]);

  // -------------------------------------------------------------------------
  // Live simulation interval
  // Starts from current wall-clock time so the simulation feels live
  // -------------------------------------------------------------------------
  useEffect(() => {
    const now = new Date();
    timeOfDayRef.current = now.getHours() + now.getMinutes() / 60;
    currentDateRef.current = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      0,
      0
    );

    const intervalId = setInterval(runTick, TICK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [runTick]);
}
