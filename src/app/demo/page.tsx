'use client';
/**
 * Modular Dashboard App shell
 * Renders the active section based on sidebar navigation.
 * Issue D: added Scenarios section.
 */

import React, { useState } from 'react';
import { DashboardSidebar, DashboardSection } from '@/components/dashboard/DashboardSidebar';
import { ScenarioPage } from '@/components/scenarios/ScenarioPage';

// Lazy-imported existing sections
import dynamic from 'next/dynamic';
const OverviewSection  = dynamic(() => import('@/components/dashboard/sections/OverviewSection'),  { ssr: false });
const EnergySection    = dynamic(() => import('@/components/dashboard/sections/EnergySection'),    { ssr: false });
const BatterySection   = dynamic(() => import('@/components/dashboard/sections/BatterySection'),   { ssr: false });
const ForecastSection  = dynamic(() => import('@/components/dashboard/sections/ForecastSection'),  { ssr: false });
const ReportsSection   = dynamic(() => import('@/components/dashboard/sections/ReportsSection'),   { ssr: false });
const SettingsSection  = dynamic(() => import('@/components/dashboard/sections/SettingsSection'),  { ssr: false });
const AssistantSection = dynamic(() => import('@/components/dashboard/sections/AssistantSection'), { ssr: false });

const SECTION_MAP: Record<DashboardSection, React.ReactNode> = {
  dashboard: <OverviewSection />,
  energy:    <EnergySection />,
  battery:   <BatterySection />,
  forecast:  <ForecastSection />,
  scenarios: <ScenarioPage />,
  reports:   <ReportsSection />,
  settings:  <SettingsSection />,
  assistant: <AssistantSection />,
};

export default function ModularDashboardDemo({ initialSection = 'dashboard' }: { initialSection?: DashboardSection }) {
  const [section, setSection] = useState<DashboardSection>(initialSection);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      {/* Sidebar */}
      <DashboardSidebar
        active={section}
        onNavigate={setSection}
        collapsed={sidebarCollapsed}
      />

      {/* Collapse toggle */}
      <button
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-5 h-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-r-md flex items-center justify-center text-[var(--color-text-faint)] hover:text-[var(--color-text)] transition-all"
        style={{ left: sidebarCollapsed ? '3.5rem' : '14rem', transition: 'left 200ms' }}
        onClick={() => setSidebarCollapsed(v => !v)}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          {sidebarCollapsed
            ? <polyline points="9 18 15 12 9 6"/>
            : <polyline points="15 18 9 12 15 6"/>}
        </svg>
      </button>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Section header */}
        <header className="h-14 flex items-center px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0">
          <h1 className="text-base font-semibold text-[var(--color-text)] capitalize">
            {section === 'dashboard' ? 'Overview' : section.charAt(0).toUpperCase() + section.slice(1)}
          </h1>
        </header>
        <div className="flex-1 overflow-hidden">
          {SECTION_MAP[section]}
        </div>
      </main>
    </div>
  );
}
