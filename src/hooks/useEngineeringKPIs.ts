import { useMemo } from 'react';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { computeProfessionalEngineeringKpis } from '@/lib/engineeringKpis';

export type BenchmarkTone = 'green' | 'amber' | 'red';

export function getBenchmarkTone(
  metric: 'specificYield' | 'performanceRatio' | 'capacityFactor' | 'selfConsumptionRate',
  value: number
): BenchmarkTone {
  if (metric === 'specificYield') {
    if (value >= 1400 && value <= 2000) return 'green';
    if (value >= 1000 && value < 1400) return 'amber';
    return 'red';
  }
  if (metric === 'performanceRatio') {
    if (value >= 0.75 && value <= 0.9) return 'green';
    if (value >= 0.65 && value < 0.75) return 'amber';
    return 'red';
  }
  if (metric === 'capacityFactor') {
    if (value >= 0.18 && value <= 0.22) return 'green';
    if (value >= 0.15 && value < 0.18) return 'amber';
    return 'red';
  }
  if (value > 0.7) return 'green';
  if (value >= 0.5) return 'amber';
  return 'red';
}

export function useEngineeringKPIs() {
  const minuteData = useEnergySystemStore((s) => s.minuteData);
  const systemConfig = useEnergySystemStore((s) => s.systemConfig);
  const solarData = useEnergySystemStore((s) => s.solarData);

  return useMemo(() => {
    const kpis = computeProfessionalEngineeringKpis({
      minuteData,
      systemCapacityKwp: systemConfig.solarCapacityKW,
      avgDailySunHours: solarData.annualAvgKwhPerKwp || 5,
    });

    return {
      ...kpis,
      benchmarks: {
        specificYield: getBenchmarkTone('specificYield', kpis.specificYield),
        performanceRatio: getBenchmarkTone('performanceRatio', kpis.performanceRatio),
        capacityFactor: getBenchmarkTone('capacityFactor', kpis.capacityFactor),
        selfConsumptionRate: getBenchmarkTone('selfConsumptionRate', kpis.selfConsumptionRate),
      },
    };
  }, [minuteData, solarData.annualAvgKwhPerKwp, systemConfig.solarCapacityKW]);
}
