'use client';

import { create } from 'zustand';
import {
  calculateFinancials,
  defaultFinancialInputs,
  type FinancialInputs,
  type FinancialResult,
} from '@/simulation/financialEngine';
import { getUserPreference, setUserPreference } from '@/lib/supabase-db';

const PREF_KEY = 'financial_inputs';

interface FinancialStore {
  inputs: FinancialInputs;
  result: FinancialResult | null;
  isCalculating: boolean;
  setInputs: (i: Partial<FinancialInputs>) => void;
  calculate: (pvCapacityKw: number, batteryCapacityKwh: number) => void;
  loadFromSupabase: () => Promise<void>;
}

export const useFinancialStore = create<FinancialStore>((set, get) => ({
  inputs: defaultFinancialInputs(),
  result: null,
  isCalculating: false,

  setInputs: (i) =>
    set((state) => {
      const nextInputs = { ...state.inputs, ...i };
      void setUserPreference(PREF_KEY, nextInputs);
      return { inputs: nextInputs };
    }),

  calculate: (pvCapacityKw, batteryCapacityKwh) => {
    set({ isCalculating: true });
    const { inputs } = get();
    const result = calculateFinancials(inputs, pvCapacityKw, batteryCapacityKwh);
    set({ result, isCalculating: false });
  },

  loadFromSupabase: async () => {
    const saved = await getUserPreference<FinancialInputs>(PREF_KEY);
    if (saved) set({ inputs: saved });
  },
}));

export type { FinancialStore };
