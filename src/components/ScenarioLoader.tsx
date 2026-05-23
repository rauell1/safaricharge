'use client';

import { useEffect } from 'react';
import { useEnergySystemStore } from '@/stores/energySystemStore';

export function ScenarioLoader() {
  const loadScenarios = useEnergySystemStore((s) => s.loadScenarios);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  return null;
}
