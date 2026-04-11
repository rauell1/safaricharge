/**
 * Zustand store for PV & Load forecast overlay data.
 *
 * Usage
 * -----
 *   const { fetchForecast, showOverlay, toggleOverlay } = useForecastStore();
 */

import { create } from 'zustand';
import type { MinuteDataPoint } from './energySystemStore';

export interface ForecastPoint {
  timestamp: string;
  solar_kw: number;
  load_kw: number;
  solar_confidence_low: number;
  solar_confidence_high: number;
  load_confidence_low: number;
  load_confidence_high: number;
}

interface ForecastStore {
  forecastData: ForecastPoint[] | null;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: string | null;
  showOverlay: boolean;

  setForecastData: (data: ForecastPoint[]) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  toggleOverlay: () => void;
  fetchForecast: (minuteData: MinuteDataPoint[], solarCapacityKw: number) => Promise<void>;
}

export const useForecastStore = create<ForecastStore>((set, get) => ({
  forecastData: null,
  isLoading: false,
  error: null,
  lastFetchedAt: null,
  showOverlay: false,

  setForecastData: (data) =>
    set({ forecastData: data, lastFetchedAt: new Date().toISOString() }),

  setLoading: (v) => set({ isLoading: v }),

  setError: (e) => set({ error: e }),

  toggleOverlay: () => set((state) => ({ showOverlay: !state.showOverlay })),

  fetchForecast: async (minuteData, solarCapacityKw) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minuteData, solarCapacityKw }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          (json as { error?: string }).error ?? `Forecast API returned ${res.status}`,
        );
      }

      const json = await res.json();
      const points: ForecastPoint[] = (json as { forecast: ForecastPoint[] }).forecast;
      set({
        forecastData: points,
        lastFetchedAt: new Date().toISOString(),
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch forecast',
      });
    }
  },
}));
