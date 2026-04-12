'use client';

import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar, type DashboardSection, type SidebarContextMetric } from './DashboardSidebar';
import { MobileBottomNav } from './MobileBottomNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeSection?: DashboardSection;
  onSectionChange?: (section: DashboardSection) => void;
  contextualMetrics?: SidebarContextMetric[];
}

export function DashboardLayout({
  children,
  activeSection = 'dashboard',
  onSectionChange,
  contextualMetrics = [],
}: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      {/* Bottom tab bar — mobile only, rendered outside the flex row so it
          sits fixed at the bottom on top of all content */}
      <MobileBottomNav
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      <div className="flex min-h-screen w-full overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {/* Sidebar — hidden on mobile, full sidebar on md+ */}
        <div className="hidden md:flex">
          <DashboardSidebar
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            contextualMetrics={contextualMetrics}
          />
        </div>

        <SidebarInset className="flex-1 min-w-0 overflow-x-hidden flex flex-col bg-[var(--bg-primary)]">
          {/* pb-16 on mobile so content is never hidden behind the tab bar */}
          <div className="relative min-h-screen w-full min-w-0 overflow-x-hidden pb-16 md:pb-0 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.08)_0,_transparent_32%),_radial-gradient(circle_at_80%_18%,_rgba(16,185,129,0.07)_0,_transparent_28%),_linear-gradient(to_bottom,_rgba(12,18,34,0.9),_var(--bg-primary))]">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
