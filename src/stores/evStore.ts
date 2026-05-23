'use client';

import { create } from 'zustand';
import {
  defaultEVFleetConfig,
  initEVFleetSocs,
  type EVFleetConfig,
  type EVFleetResult,
} from '@/simulation/evMobilityEngine';
import { getUserPreference, setUserPreference } from '@/lib/supabase-db';

const PREF_KEY = 'ev_config';

interface EVStore {
  config: EVFleetConfig;
  vehicleSocs: number[];
  lastResult: EVFleetResult | null;
  setConfig: (c: Partial<EVFleetConfig>) => void;
  setResult: (r: EVFleetResult) => void;
  loadFromSupabase: () => Promise<void>;
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
      void setUserPreference(PREF_KEY, nextConfig);
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

  loadFromSupabase: async () => {
    const saved = await getUserPreference<EVFleetConfig>(PREF_KEY);
    if (saved) {
      set((state) => ({
        config: saved,
        vehicleSocs:
          saved.vehicleCount !== state.config.vehicleCount
            ? initEVFleetSocs(saved)
            : state.vehicleSocs,
      }));
    }
  },
}));

export type { EVStore };
