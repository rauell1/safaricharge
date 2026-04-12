// ⚠️ This file is a re-export layer. Do not implement components here.
// All canonical implementations live in their respective domain folders:
//   layout/     — DashboardLayout, DashboardHeader, DashboardSidebar, MobileBottomNav
//   energy/     — Battery*, PanelStatusTable, PowerFlowVisualization, SystemVisualization, Sparkline, EnergyDetailShell
//   widgets/    — AlertsList, StatCards, InsightsBanner, WeatherCard, EngineeringKpisCard, TimeRangeSwitcher
//   financial/  — FinancialDashboard

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
export { EnergyDetailShell } from '@/components/energy/EnergyDetailShell';

// Widgets
export { AlertsList } from '@/components/widgets/AlertsList';
export { StatCards } from '@/components/widgets/StatCards';
export { InsightsBanner } from '@/components/widgets/InsightsBanner';
export { WeatherCard } from '@/components/widgets/WeatherCard';
export { EngineeringKpisCard } from '@/components/widgets/EngineeringKpisCard';
export { TimeRangeSwitcher } from '@/components/widgets/TimeRangeSwitcher';

// Financial
export { default as FinancialDashboard } from '@/components/financial/FinancialDashboard';
