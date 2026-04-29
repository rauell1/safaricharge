'use client';

import { SafariChargeDashboardApp } from '../dashboard-app';

export const dynamic = 'force-dynamic';

export default function SimulationPage() {
  return <SafariChargeDashboardApp initialSection="simulation" />;
}
