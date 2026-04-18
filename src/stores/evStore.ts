'use client';

import { create } from 'zustand';
import {
  defaultEVFleetConfig,
  initEVFleetSocs,
  type EVFleetConfig,
  type EVFleetResult,
} from '@/simulation/evMobilityEngine';

interface EVStore {
  config: EVFleetConfig;
  vehicleSocs: number[];
  lastResult: EVFleetResult | null;
  setConfig: (c: Partial<EVFleetConfig>) => void;
  setResult: (r: EVFleetResult) => void;
}

const initialConfig = defaultEVFleetConfig();

export const useEVStore = create<EVStore>((set) => ({
  config: initialConfig,
  vehicleSocs: initEVFleetSocs(initialConfig),
  lastResult: null,

  setConfig: (c) =>
    set((state) => {
      const nextConfig: EVFleetConfig = { ...state.config, ...c };
      const countChanged = nextConfig.vehicleCount !== state.config.vehicleCount;
      return {
        config: nextConfig,
        vehicleSocs: countChanged
          ? initEVFleetSocs(nextConfig)
          : state.vehicleSocs,
      };
    }),

  setResult: (r) =>
    set({
      lastResult: r,
      vehicleSocs: r.vehicleSocs,
    }),
}));

export type { EVStore };
