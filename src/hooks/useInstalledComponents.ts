import { useMemo } from 'react';
import type { SystemConfiguration } from '@/lib/system-config';
import {
  buildInstalledComponentSummaries,
  type InstalledComponentSummary,
} from '@/lib/installed-components';

/**
 * React hook wrapper around buildInstalledComponentSummaries.
 *
 * Usage:
 *   const components = useInstalledComponents(systemConfig);
 *
 * This provides a stable, memoised array of InstalledComponentSummary
 * objects that can be consumed by the System Config panel, Docs Hub, and
 * any “Installed hardware” cards or tooltips.
 */
export function useInstalledComponents(
  config: SystemConfiguration
): InstalledComponentSummary[] {
  return useMemo(
    () => buildInstalledComponentSummaries(config),
    [config]
  );
}
