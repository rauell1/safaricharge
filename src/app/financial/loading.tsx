import { AnimatedLoadingState } from '@/components/layout/AnimatedLoadingState';

export default function FinancialLoading() {
  return (
    <AnimatedLoadingState
      title="Opening Finance Planner..."
      description="Loading financial model inputs and charts."
    />
  );
}
