// ⚠️  COMPATIBILITY SHIM
// demo/page.tsx imports DailyEnergyGraph from '@/components/DailyEnergyGraph'.
// The canonical file lives at src/components/energy/DailyEnergyGraph.tsx.
// This shim keeps that import working without touching the consumer.
export { default, buildGraphSVG, buildJPGBlob } from '@/components/energy/DailyEnergyGraph';
