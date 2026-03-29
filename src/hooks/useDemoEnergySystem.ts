'use client';

import { useEffect } from 'react';
import { buildDemoEnergyState } from '@/lib/demoEnergyState';
import { useEnergySystemStore } from '@/stores/energySystemStore';

/**
 * Seeds the energy system store with demo data once.
 * Ensures all dashboard/detail pages read from the same source of truth.
 */
export function useDemoEnergySystem() {
  useEffect(() => {
    const state = useEnergySystemStore.getState();
    if (state.minuteData.length > 0) return;

    const demo = buildDemoEnergyState();
    useEnergySystemStore.setState({
      ...state,
      ...demo,
      timeRange: 'today',
    });
  }, []);
}
