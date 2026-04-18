'use client'

import ModularDashboardDemo from '@/app/demo/page'

export default function DashboardPage() {
  // Route protection is handled by middleware. Avoid duplicate getUser() on the
  // client so post-login navigation does not wait on an extra auth round-trip.
  return <ModularDashboardDemo />
}
