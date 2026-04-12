// Re-export layout shell components from their new home
// (moved to src/components/layout/ — these re-exports keep all
// existing import paths working without any consumer changes)
export { DashboardLayout } from '../layout/DashboardLayout';
export { DashboardSidebar } from '../layout/DashboardSidebar';
export { MobileBottomNav } from '../layout/MobileBottomNav';
export type { DashboardSection, SidebarContextMetric } from '../layout/DashboardSidebar';
export { DashboardHeader } from '../layout/DashboardHeader';

// Dashboard feature widgets (still live here)
export { AlertsList } from './AlertsList';
export { BatteryHealthCard } from './BatteryHealthCard';
export { BatteryPredictionCard } from './BatteryPredictionCard';
export { BatteryStatusCard } from './BatteryStatusCard';
export { EnergyDetailShell } from './EnergyDetailShell';
export { EngineeringKpisCard } from './EngineeringKpisCard';
export { InsightsBanner } from './InsightsBanner';
export { PanelStatusTable } from './PanelStatusTable';
export { PowerFlowVisualization } from './PowerFlowVisualization';
export { Sparkline } from './Sparkline';
export { StatCards } from './StatCards';
export { SystemVisualization } from './SystemVisualization';
export { TimeRangeSwitcher } from './TimeRangeSwitcher';
export { WeatherCard } from './WeatherCard';
