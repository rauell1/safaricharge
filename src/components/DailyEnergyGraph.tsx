// ⚠️  COMPATIBILITY SHIM
// Consumers import DailyEnergyGraph and GraphDataPoint from '@/components/DailyEnergyGraph'.
// The canonical file lives at src/components/energy/DailyEnergyGraph.
export { default, DailyEnergyGraph } from '@/components/energy/DailyEnergyGraph';
export type { GraphDataPoint } from '@/components/energy/DailyEnergyGraph';
export * from '@/components/energy/DailyEnergyGraph';
