'use client'

// Use dynamic import to avoid Turbopack barrel re-export issues.
// The demo shell is a heavy client-only component; lazy-loading it
// also improves initial bundle size for the /dashboard route.
import dynamic from 'next/dynamic';

const ModularDashboardDemo = dynamic(
  () => import('@/app/demo/page'),
  { ssr: false }
);

export default function DashboardPage() {
  // Route protection is handled by middleware. Avoid duplicate getUser() on the
  // client so post-login navigation does not wait on an extra auth round-trip.
  return <ModularDashboardDemo />;
}
