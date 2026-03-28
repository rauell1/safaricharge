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
      <div className="flex min-h-screen w-full bg-primary-900">
        <DashboardSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          alertCount={2}
        />
        <SidebarInset className="flex-1 flex flex-col">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
