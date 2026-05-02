'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar, type DashboardSection, type SidebarContextMetric } from './DashboardSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { clearExternalUploadActive, isExternalUploadActive } from '@/lib/external-upload-guard';
import { SIZING_SIMULATOR_STORAGE_KEY } from '@/lib/pv-sizing';
import { SafariChargeAIAssistant } from '@/components/ai/AIAssistant';
import { AIAssistantProvider, useAIAssistant } from '@/contexts/AIAssistantContext';
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

// ── Inner layout (consumes AI context) ──────────────────────────────────────
function DashboardLayoutInner({
  children,
  activeSection = 'dashboard',
  onSectionChange,
  contextualMetrics = [],
}: DashboardLayoutProps) {
  const router = useRouter();
  const { isOpen: aiOpen, closeAI } = useAIAssistant();

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

  // ── Site-leave guard ──────────────────────────────────────────────────────
  useEffect(() => {
    const resetTransientState = () => {
      useEnergySystemStore.getState().resetSystem();
      try { localStorage.removeItem(SIZING_SIMULATOR_STORAGE_KEY); } catch { /* ignore */ }
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isExternalUploadActive()) return;
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
        AI panel lives OUTSIDE the page router subtree so it
        persist across all page navigations without remounting.

        NOTE: Do NOT wrap in any element with transform / overflow:hidden /
        will-change / filter — those create a CSS containing block and
        break fixed-position portals. The AI panel itself renders into
        #modal-root via its own DialogPortal so it is already safe.
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
      <MobileBottomNav
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      {/*
        Layout shell — flex row, full viewport.

        RULES:
        ✅  min-w-0 to prevent flex children from overflowing
        ✅  .page-shell (globals.css) is the only overflow-x guard, applied
            to the content area — NOT to layout wrappers
        ❌  NO overflow-x:hidden here
        ❌  NO transform-based animations on SidebarInset
        ❌  NO isolation:isolate (removed — unnecessary stacking context)
      */}
      <div className="flex min-h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {/* Sidebar — desktop only */}
        <div className="hidden md:flex">
          <DashboardSidebar
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            contextualMetrics={contextualMetrics}
          />
        </div>

        {/* Main content column */}
        <SidebarInset className="flex-1 min-w-0 flex flex-col">
          <div className="relative min-h-screen w-full min-w-0 pb-16 md:pb-0">
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
