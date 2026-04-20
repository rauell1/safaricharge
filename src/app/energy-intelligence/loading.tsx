import { AnimatedLoadingState } from '@/components/layout/AnimatedLoadingState';

export default function EnergyIntelligenceLoading() {
  return (
    <AnimatedLoadingState
      title="Opening Energy Intelligence..."
      description="Preparing simulation charts and analytics."
      accentClassName="border-t-[var(--solar)]"
    />
  );
}
