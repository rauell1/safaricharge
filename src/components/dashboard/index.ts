// Re-export layout shell components from their new home (src/components/layout/)
export { DashboardLayout } from '../layout/DashboardLayout';
export { DashboardSidebar } from '../layout/DashboardSidebar';
export { MobileBottomNav } from '../layout/MobileBottomNav';
export type { DashboardSection, SidebarContextMetric } from '../layout/DashboardSidebar';
export { DashboardHeader } from '../layout/DashboardHeader';

// Re-export energy widget components from their new home (src/components/energy/)
export { BatteryStatusCard } from '../energy/BatteryStatusCard';
export { BatteryHealthCard } from '../energy/BatteryHealthCard';
export type { BatteryInsight } from '../energy/BatteryHealthCard';
export { BatteryPredictionCard } from '../energy/BatteryPredictionCard';
export type { BatteryPrediction } from '../energy/BatteryPredictionCard';
export { PanelStatusTable } from '../energy/PanelStatusTable';
export { PowerFlowVisualization } from '../energy/PowerFlowVisualization';
export { SystemVisualization } from '../energy/SystemVisualization';
export { Sparkline } from '../energy/Sparkline';

// Dashboard feature widgets still in dashboard/
export { AlertsList } from './AlertsList';
export { EnergyDetailShell } from './EnergyDetailShell';
export { EngineeringKpisCard } from './EngineeringKpisCard';
export { InsightsBanner } from './InsightsBanner';
export { StatCards } from './StatCards';
export { TimeRangeSwitcher } from './TimeRangeSwitcher';
export { WeatherCard } from './WeatherCard';
