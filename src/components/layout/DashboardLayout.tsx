'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar, type DashboardSection, type SidebarContextMetric } from './DashboardSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { clearExternalUploadActive, isExternalUploadActive } from '@/lib/external-upload-guard';
import { SIZING_SIMULATOR_STORAGE_KEY } from '@/lib/pv-sizing';
import { SafariChargeAIAssistant } from '@/components/ai/AIAssistant';
import { AIAssistantProvider, useAIAssistant } from '@/contexts/AIAssistantContext';
import { X, Info } from 'lucide-react';
import {
  useEnergyNode,
  useMinuteData,
  useSimulationState,
} from '@/hooks/useEnergySystem';
import { useEnergySystemStore as useStore } from '@/stores/energySystemStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeSection?: DashboardSection;
  onSectionChange?: (section: DashboardSection) => void;
  contextualMetrics?: SidebarContextMetric[];
}

// ── Inner layout (consumes AI context) ───────────────────────────────
function DashboardLayoutInner({
  children,
  activeSection = 'dashboard',
  onSectionChange,
  contextualMetrics = [],
}: DashboardLayoutProps) {
  const router = useRouter();
  const { isOpen: aiOpen, closeAI } = useAIAssistant();

  // Toast shown ONLY when the user is actually leaving the entire site.
  // A ref tracks whether we have already shown it this session so it
  // appears at most once, even if the user triggers beforeunload
  // multiple times (e.g. refresh attempts).
  const toastShownRef = useRef(false);

  const { isAutoMode, currentDate } = useSimulationState();
  const solarNode    = useEnergyNode('solar');
  const batteryNode  = useEnergyNode('battery');
  const gridNode     = useEnergyNode('grid');
  const minuteData   = useMinuteData('today');
  const systemConfig = useStore((s) => s.systemConfig);

  const latestPoint = minuteData[minuteData.length - 1];
  const aiData = {
    solarR:       latestPoint?.solarKW         ?? solarNode.powerKW  ?? 0,
    batteryLevel: latestPoint?.batteryLevelPct ?? batteryNode.soc    ?? 0,
    netGridPower: latestPoint
      ? latestPoint.gridImportKW - latestPoint.gridExportKW
      : gridNode.powerKW ?? 0,
    ev1V2g: false,
    ev2V2g: false,
  };

  // Prefetch all dashboard routes on mount for instant navigation
  useEffect(() => {
    const routes = [
      '/dashboard', '/simulation', '/configuration',
      '/energy-intelligence', '/scenarios', '/recommendation',
      '/ai-assistant', '/live-results', '/financial',
    ];
    routes.forEach((route) => {
      try { router.prefetch(route); } catch { /* ignore */ }
    });
  }, [router]);

  // ── Site-leave guard ─────────────────────────────────────────────
  // beforeunload fires ONLY when the browser is about to leave the
  // current origin entirely (tab close, external link, browser back
  // past the app origin). Internal Next.js client-side navigations
  // do NOT trigger it, so this never fires when switching pages via
  // the sidebar.
  useEffect(() => {
    const resetTransientState = () => {
      useEnergySystemStore.getState().resetSystem();
      try { localStorage.removeItem(SIZING_SIMULATOR_STORAGE_KEY); } catch { /* ignore */ }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isExternalUploadActive()) return;
      // Show the native browser dialog ("Leave site?") which contains
      // the standard browser message. No custom toast needed here —
      // the browser UI is the notification.
      event.preventDefault();
      event.returnValue = '';
    };

    const handlePageHide = () => {
      if (isExternalUploadActive()) { clearExternalUploadActive(); return; }
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
      {/*
        AI panel lives OUTSIDE the page router subtree so it persists
        across all page navigations without remounting.
      */}
      <SafariChargeAIAssistant
        isOpen={aiOpen}
        onClose={closeAI}
        data={aiData as any}
        timeOfDay={latestPoint?.timeOfDay ?? new Date().getHours() + new Date().getMinutes() / 60}
        currentDate={currentDate ?? undefined}
        isAutoMode={isAutoMode}
        minuteData={minuteData}
        systemConfig={systemConfig}
      />

      {/* Mobile bottom nav */}
      <MobileBottomNav
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      <div className="flex min-h-screen w-full overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {/* Sidebar — desktop only */}
        <div className="hidden md:flex">
          <DashboardSidebar
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            contextualMetrics={contextualMetrics}
          />
        </div>

        <SidebarInset className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
          <div className="relative min-h-screen w-full min-w-0 overflow-x-hidden pb-16 md:pb-0">
            <div className="page-shell h-full">
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

export function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <AIAssistantProvider>
      <DashboardLayoutInner {...props} />
    </AIAssistantProvider>
  );
}
