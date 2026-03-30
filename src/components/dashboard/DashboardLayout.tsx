'use client';

import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar, type DashboardSection, type SidebarContextMetric } from './DashboardSidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  contextualMetrics?: SidebarContextMetric[];
}

export function DashboardLayout({
  children,
  activeSection,
  onSectionChange,
  contextualMetrics = [],
}: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <DashboardSidebar
          activeSection={activeSection}
          onSectionChange={onSectionChange}
          contextualMetrics={contextualMetrics}
        />
        <SidebarInset className="flex-1 flex flex-col bg-[var(--bg-primary)]">
          <div className="relative min-h-screen w-full bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.08)_0,_transparent_32%),_radial-gradient(circle_at_80%_18%,_rgba(16,185,129,0.07)_0,_transparent_28%),_linear-gradient(to_bottom,_rgba(12,18,34,0.9),_var(--bg-primary))]">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
