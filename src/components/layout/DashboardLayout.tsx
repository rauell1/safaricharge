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
        ── Standard shadcn sidebar layout ──────────────────────────────────────
        SidebarProvider is a flex row. Its ONLY in-flow flex children should be:
          1. DashboardSidebar  → renders <Sidebar> (sidebar-gap spacer + fixed overlay)
          2. SidebarInset      → flex-1, fills remaining horizontal space

        Previously, SafariChargeAIAssistant and MobileBottomNav were direct
        flex siblings of the layout div, stealing horizontal space and squishing
        the content into a narrow vertical strip.

        Fix: DashboardSidebar and SidebarInset are now the direct children of
        SidebarProvider. The AI assistant and mobile nav live inside SidebarInset
        -  they're fixed/portal-rendered so they don't affect flow layout.
      */}
      <DashboardSidebar
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        contextualMetrics={contextualMetrics}
      />

      <SidebarInset className="flex flex-col min-h-screen min-w-0 bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {/*
          AI panel renders via DialogPortal into #modal-root (fixed, outside
          this subtree) -  zero effect on flow layout.
          MobileBottomNav is position:fixed -  also zero effect on flow.
        */}
        <SafariChargeAIAssistant
          isOpen={aiOpen}
          onClose={closeAI}
          data={aiData as any}
          timeOfDay={latestPoint ? latestPoint.hour + latestPoint.minute / 60 : new Date().getHours() + new Date().getMinutes() / 60}
          weather="clear"
          currentDate={currentDate ?? new Date()}
          isAutoMode={isAutoMode}
          minuteData={minuteData}
          systemConfig={systemConfig as unknown as import('@/types/dashboard').AssistantProps['systemConfig']}
        />
        <MobileBottomNav
          activeSection={activeSection}
          onSectionChange={onSectionChange}
        />

        {/* Content area -  pb-16 reserves space for mobile bottom nav */}
        <div className="flex-1 min-w-0 pb-16 md:pb-0">
          {children}
        </div>
      </SidebarInset>
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
