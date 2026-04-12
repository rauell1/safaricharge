// ⚠️ DEPRECATED IMPORT PATH
// Use: '@/components/energy/PanelStatusTable'
// This file exists for backward compatibility only.
// Run: node scripts/codemod-dashboard-imports.mjs --write
//
// Note: canonical uses named export only. Both import styles work through this shim:
//   import { PanelStatusTable } from '@/components/dashboard/PanelStatusTable'  ✅
//   import PanelStatusTable from '@/components/dashboard/PanelStatusTable'      ✅
export { PanelStatusTable } from '@/components/energy/PanelStatusTable';
export type * from '@/components/energy/PanelStatusTable';
// Default export alias for mixed-style compatibility
import { PanelStatusTable } from '@/components/energy/PanelStatusTable';
export default PanelStatusTable;
