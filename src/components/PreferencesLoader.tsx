'use client';

import { useEffect } from 'react';
import { useFinancialStore } from '@/stores/financialStore';
import { useEVStore } from '@/stores/evStore';

export function PreferencesLoader() {
  const loadFinancial = useFinancialStore((s) => s.loadFromSupabase);
  const loadEV = useEVStore((s) => s.loadFromSupabase);

  useEffect(() => {
    void loadFinancial();
    void loadEV();
  }, [loadFinancial, loadEV]);

  return null;
}
