import { useMemo } from 'react';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { computeProfessionalEngineeringKpis } from '@/lib/engineeringKpis';

export type BenchmarkTone = 'green' | 'amber' | 'red';

const BENCHMARKS = {
  specificYield: { greenMin: 1400, greenMax: 2000, amberMin: 1000 },
  performanceRatio: { greenMin: 0.75, greenMax: 0.9, amberMin: 0.65 },
  capacityFactor: { greenMin: 0.18, greenMax: 0.22, amberMin: 0.15 },
  selfConsumptionRate: { greenMinExclusive: 0.7, amberMin: 0.5 },
} as const;

export function getBenchmarkTone(
  metric: 'specificYield' | 'performanceRatio' | 'capacityFactor' | 'selfConsumptionRate',
  value: number
): BenchmarkTone {
  if (metric === 'specificYield') {
    if (value >= BENCHMARKS.specificYield.greenMin && value <= BENCHMARKS.specificYield.greenMax) return 'green';
    if (value >= BENCHMARKS.specificYield.amberMin && value < BENCHMARKS.specificYield.greenMin) return 'amber';
    return 'red';
  }
  if (metric === 'performanceRatio') {
    if (value >= BENCHMARKS.performanceRatio.greenMin && value <= BENCHMARKS.performanceRatio.greenMax) return 'green';
    if (value >= BENCHMARKS.performanceRatio.amberMin && value < BENCHMARKS.performanceRatio.greenMin) return 'amber';
    return 'red';
  }
  if (metric === 'capacityFactor') {
    if (value >= BENCHMARKS.capacityFactor.greenMin && value <= BENCHMARKS.capacityFactor.greenMax) return 'green';
    if (value >= BENCHMARKS.capacityFactor.amberMin && value < BENCHMARKS.capacityFactor.greenMin) return 'amber';
    return 'red';
  }
  if (value > BENCHMARKS.selfConsumptionRate.greenMinExclusive) return 'green';
  if (value >= BENCHMARKS.selfConsumptionRate.amberMin) return 'amber';
  return 'red';
}

export function useEngineeringKPIs() {
  const minuteData = useEnergySystemStore((s) => s.minuteData);
  const systemConfig = useEnergySystemStore((s) => s.systemConfig);
  const solarData = useEnergySystemStore((s) => s.solarData);

  return useMemo(() => {
    // `annualAvgKwhPerKwp` is used in this codebase as peak-sun-hours/day (e.g. Nairobi ≈ 5.4).
    const avgDailySunHours = solarData.annualAvgKwhPerKwp || 5;
    const kpis = computeProfessionalEngineeringKpis({
      minuteData,
      systemCapacityKwp: systemConfig.solarCapacityKW,
      avgDailySunHours,
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
