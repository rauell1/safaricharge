'use client';

import React, { useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from './DashboardSidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <DashboardSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          alertCount={2}
        />
        <SidebarInset className="flex-1 flex flex-col bg-[var(--bg-primary)]">
          <div className="relative min-h-screen w-full bg-[radial-gradient(circle_at_top,_rgba(168,85,247,0.06)_0,_transparent_35%),_linear-gradient(to_bottom,_rgba(12,18,34,0.9),_var(--bg-primary))]">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
