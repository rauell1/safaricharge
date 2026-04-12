// ⚠️  COMPATIBILITY SHIM
// Consumers import DailyEnergyGraph and GraphDataPoint from '@/components/DailyEnergyGraph'.
// The canonical file lives at src/components/energy/DailyEnergyGraph.
// Source has `export default DailyEnergyGraph` but no separate named export for the component.
import DailyEnergyGraph from '@/components/energy/DailyEnergyGraph';
export default DailyEnergyGraph;
export { DailyEnergyGraph };
export type { GraphDataPoint } from '@/components/energy/DailyEnergyGraph';
export * from '@/components/energy/DailyEnergyGraph';
