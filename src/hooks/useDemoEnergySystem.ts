'use client';

import { useEffect } from 'react';
import { buildDemoEnergyState } from '@/lib/demoEnergyState';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { computeEngineeringKPIs } from '@/lib/engineering-kpis';

/**
 * Seeds the energy system store with demo data once.
 * Ensures all dashboard/detail pages read from the same source of truth.
 */
export function useDemoEnergySystem() {
  useEffect(() => {
    const state = useEnergySystemStore.getState();
    if (state.minuteData.length > 0) return;

    const demo = buildDemoEnergyState();

    // Use the demo node's declared capacity as pvCapacityKwp.
    // The demo solar node reports capacityKW = 12.5 kWp; fall back to
    // the store's systemConfig if the node value is unavailable.
    const pvCapacityKwp =
      demo.nodes.solar.capacityKW ?? state.systemConfig.solarCapacityKW;

    // Infer battery capacity from the demo battery node.
    const batteryCapacityKwh =
      demo.nodes.battery.capacityKWh ?? state.systemConfig.batteryCapacityKWh;

    // Compute engineering KPIs from demo simulation data
    const kpis = computeEngineeringKPIs(demo.minuteData, {
      pvCapacityKwp,
      batteryCapacityKwh,
      minReservePct: 20, // standard reserve
      peakSunHoursPerDay: 5.4, // Nairobi annual average (NASA POWER)
    });

    useEnergySystemStore.setState({
      ...state,
      ...demo,
      timeRange: 'today',
      engineeringKPIs: kpis,
    });
  }, []);
}
