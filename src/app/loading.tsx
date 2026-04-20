import { AnimatedLoadingState } from '@/components/layout/AnimatedLoadingState';

export default function RootLoading() {
  return (
    <AnimatedLoadingState
      title="Opening page..."
      description="Loading dashboard modules and data. This should only take a moment."
    />
  );
}
