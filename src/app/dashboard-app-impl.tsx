'use client';

// Turbopack cannot resolve `export { default }` barrel re-exports of
// 'use client' page components. Import explicitly and re-export as a
// named wrapper so the module graph remains resolvable.
import ModularDashboardDemo from './demo/page';
import type { ComponentProps } from 'react';

export default function SafariChargeDashboardAppImpl(
  props: ComponentProps<typeof ModularDashboardDemo>
) {
  return <ModularDashboardDemo {...props} />;
}
