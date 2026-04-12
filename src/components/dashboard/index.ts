// ⚠️ DEPRECATED IMPORT PATH
// This barrel re-export layer exists for backward compatibility only.
// New code must import directly from the canonical domain path.
//
// Canonical paths:
//   layout/     → @/components/layout/
//   energy/     → @/components/energy/
//   widgets/    → @/components/widgets/
//   financial/  → @/components/financial/
//
// To migrate all usages at once, run:
//   node scripts/codemod-dashboard-imports.mjs
//   node scripts/codemod-dashboard-imports.mjs --write
//
// Avoid: import * as Dashboard from '@/components/dashboard'
//   Namespace imports defeat tree-shaking and pull in all domains.

// Layout
export { DashboardLayout } from '@/components/layout/DashboardLayout';
export { DashboardHeader } from '@/components/layout/DashboardHeader';
export { DashboardSidebar } from '@/components/layout/DashboardSidebar';
export { MobileBottomNav } from '@/components/layout/MobileBottomNav';
export type { DashboardSection, SidebarContextMetric } from '@/components/layout/DashboardSidebar';

// Energy
export { BatteryHealthCard } from '@/components/energy/BatteryHealthCard';
export { BatteryStatusCard } from '@/components/energy/BatteryStatusCard';
export { BatteryPredictionCard } from '@/components/energy/BatteryPredictionCard';
export { PanelStatusTable } from '@/components/energy/PanelStatusTable';
export { PowerFlowVisualization } from '@/components/energy/PowerFlowVisualization';
export { SystemVisualization } from '@/components/energy/SystemVisualization';
export { Sparkline } from '@/components/energy/Sparkline';
export { EnergyDetailShell } from '@/components/widgets/EnergyDetailShell';

// Widgets
export { AlertsList } from '@/components/widgets/AlertsList';
export { StatCards } from '@/components/widgets/StatCards';
export { InsightsBanner } from '@/components/widgets/InsightsBanner';
export { WeatherCard } from '@/components/widgets/WeatherCard';
export { EngineeringKpisCard } from '@/components/widgets/EngineeringKpisCard';
export { TimeRangeSwitcher } from '@/components/widgets/TimeRangeSwitcher';

// Financial
export { default as FinancialDashboard } from '@/components/financial/FinancialDashboard';
export type { FinancialDashboardProps } from '@/components/financial/FinancialDashboard';
