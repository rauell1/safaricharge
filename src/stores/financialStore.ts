'use client';

import { create } from 'zustand';
import {
  calculateFinancials,
  defaultFinancialInputs,
  type FinancialInputs,
  type FinancialResult,
} from '@/simulation/financialEngine';

interface FinancialStore {
  inputs: FinancialInputs;
  result: FinancialResult | null;
  isCalculating: boolean;
  setInputs: (i: Partial<FinancialInputs>) => void;
  calculate: (pvCapacityKw: number, batteryCapacityKwh: number) => void;
}

export const useFinancialStore = create<FinancialStore>((set, get) => ({
  inputs: defaultFinancialInputs(),
  result: null,
  isCalculating: false,
  setInputs: (i) => set((state) => ({ inputs: { ...state.inputs, ...i } })),
  calculate: (pvCapacityKw, batteryCapacityKwh) => {
    set({ isCalculating: true });
    const { inputs } = get();
    const result = calculateFinancials(inputs, pvCapacityKw, batteryCapacityKwh);
    set({ result, isCalculating: false });
  },
}));

export type { FinancialStore };
