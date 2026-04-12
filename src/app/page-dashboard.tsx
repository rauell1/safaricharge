// Extracted dashboard entry point (used by both / and /dashboard)
'use client';
import type { DashboardSection } from '@/components/dashboard/DashboardSidebar';
import ModularDashboardDemo from './demo/page';

export const dynamic = 'force-dynamic';

type Props = { initialSection?: DashboardSection };
export function SafariChargeDashboardApp({ initialSection = 'dashboard' }: Props) {
  return <ModularDashboardDemo initialSection={initialSection} />;
}
