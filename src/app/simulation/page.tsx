import dynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';

const SafariChargeDashboardApp = dynamic(
  () => import('../dashboard-app').then((m) => ({ default: m.SafariChargeDashboardApp })),
  { ssr: false, loading: () => null }
);

export default function SimulationPage() {
  return <SafariChargeDashboardApp initialSection="simulation" />;
}
