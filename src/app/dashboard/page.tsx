'use client'

import ModularDashboardDemo from '@/app/demo/page'

export default function DashboardPage() {
  // The parent server layout verifies identity. The network proxy refreshes
  // auth cookies and provides an additional request-boundary check.
  return <ModularDashboardDemo />
}
