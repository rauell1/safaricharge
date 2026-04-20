'use client';

import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar, type DashboardSection, type SidebarContextMetric } from './DashboardSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { clearExternalUploadActive, isExternalUploadActive } from '@/lib/external-upload-guard';
import { SIZING_SIMULATOR_STORAGE_KEY } from '@/lib/pv-sizing';

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
  const router = useRouter();

  useEffect(() => {
    const routes = [
      '/dashboard',
      '/simulation',
      '/configuration',
      '/energy-intelligence',
      '/scenarios',
      '/recommendation',
      '/ai-assistant',
      '/live-results',
      '/financial',
    ];

    routes.forEach((route) => {
      try {
        router.prefetch(route);
      } catch {
        // Ignore prefetch failures; navigation still works via normal routing.
      }
    });
  }, [router]);

  useEffect(() => {
    const resetTransientState = () => {
      useEnergySystemStore.getState().resetSystem();

      try {
        localStorage.removeItem(SIZING_SIMULATOR_STORAGE_KEY);
      } catch {
        // Ignore storage failures during page teardown.
      }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isExternalUploadActive()) return;

      event.preventDefault();
      event.returnValue = '';
    };

    const handlePageHide = () => {
      if (isExternalUploadActive()) {
        clearExternalUploadActive();
        return;
      }

      resetTransientState();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

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
            <div className="page-shell h-full">
              <div className="mx-auto mb-5 flex w-full max-w-6xl items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-amber-100 shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <p className="text-xs leading-relaxed sm:text-sm">
                  Leaving this site resets your current simulation back to the original state unless you are in the middle of an external file upload. Finish the upload first if you want to keep the imported data.
                </p>
              </div>
              <div className="flex flex-col h-full">
                {children}
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
