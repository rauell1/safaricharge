'use client';

import type { DashboardSection } from '@/components/dashboard/DashboardSidebar';
import ModularDashboardDemo from './demo/page';

export const dynamic = 'force-dynamic';

type SafariChargeDashboardAppProps = {
  initialSection?: DashboardSection;
};

export function SafariChargeDashboardApp({
  initialSection = 'dashboard',
}: SafariChargeDashboardAppProps) {
  return <ModularDashboardDemo initialSection={initialSection} />;
}

export default function HomePage() {
  return <SafariChargeDashboardApp />;
}
