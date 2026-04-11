'use client';

import { useEffect, useRef } from 'react';
import { buildDemoEnergyState } from '@/lib/demoEnergyState';
import { useEnergySystemStore } from '@/stores/energySystemStore';

// Tick interval in ms — update EV node state every 2 seconds
const TICK_INTERVAL_MS = 2000;

/**
 * Seeds the energy system store with demo data once, then starts a
 * lightweight tick loop that applies the user's EV charging controls
 * (isCharging, chargeRateKW) to the live ev1/ev2 nodes every 2 seconds.
 */
export function useDemoEnergySystem() {
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // ── 1. Seed initial demo data (once) ────────────────────────────
    const state = useEnergySystemStore.getState();
    if (state.minuteData.length === 0) {
      const demo = buildDemoEnergyState();
      useEnergySystemStore.setState({
        ...state,
        ...demo,
        timeRange: 'today',
      });
    }

    // ── 2. Live tick: apply evControls to node state ──────────────────
    tickRef.current = setInterval(() => {
      const { evControls, nodes, systemConfig, updateNode } =
        useEnergySystemStore.getState();

      (['ev1', 'ev2'] as const).forEach((evKey) => {
        const ctrl    = evControls[evKey];
        const node    = nodes[evKey];
        const capKWh  = evKey === 'ev1'
          ? systemConfig.ev1CapacityKWh
          : systemConfig.ev2CapacityKWh;

        const currentSoc = node.soc ?? 0;
        const isFull     = currentSoc >= 98;

        if (!ctrl.isCharging || isFull) {
          // User stopped charging or battery is full
          if (node.powerKW !== 0 || node.status !== 'idle') {
            updateNode(evKey, { powerKW: 0, status: 'idle' });
          }
          return;
        }

        // Apply charge rate and advance SoC
        // TICK_INTERVAL_MS / 3600000 converts ms to hours
        const deltaHours = TICK_INTERVAL_MS / 3_600_000;
        const energyKWh  = ctrl.chargeRateKW * deltaHours;
        const newSoc     = Math.min(100, currentSoc + (energyKWh / capKWh) * 100);

        updateNode(evKey, {
          powerKW: ctrl.chargeRateKW,
          status:  newSoc >= 98 ? 'idle' : 'charging',
          soc:     Number(newSoc.toFixed(2)),
        });
      });
    }, TICK_INTERVAL_MS);

    return () => {
      if (tickRef.current !== null) clearInterval(tickRef.current);
    };
  }, []);
}
