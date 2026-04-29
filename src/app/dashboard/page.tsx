'use client';

import { SafariChargeDashboardApp } from '../dashboard-app';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return <SafariChargeDashboardApp initialSection="dashboard" />;
}
