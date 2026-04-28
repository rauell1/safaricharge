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
import { SafariChargeAIAssistant } from '@/components/ai/AIAssistant';
import { AIAssistantProvider, useAIAssistant } from '@/contexts/AIAssistantContext';
import {
  useEnergyFlows,
  useEnergyNode,
  useMinuteData,
  useSimulationState,
  useEnergyStats,
} from '@/hooks/useEnergySystem';
import { useEnergySystemStore as useStore } from '@/stores/energySystemStore';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeSection?: DashboardSection;
  onSectionChange?: (section: DashboardSection) => void;
  contextualMetrics?: SidebarContextMetric[];
}

// Inner layout that consumes the AI context (must be inside AIAssistantProvider)
function DashboardLayoutInner({
  children,
  activeSection = 'dashboard',
  onSectionChange,
  contextualMetrics = [],
}: DashboardLayoutProps) {
  const router = useRouter();
  const { isOpen: aiOpen, closeAI } = useAIAssistant();

  // Live data for persistent AI panel
  const { isAutoMode, currentDate } = useSimulationState();
  const solarNode = useEnergyNode('solar');
  const batteryNode = useEnergyNode('battery');
  const gridNode = useEnergyNode('grid');
  const homeNode = useEnergyNode('home');
  const minuteData = useMinuteData('today');
  const systemConfig = useStore((s) => s.systemConfig);

  const latestPoint = minuteData[minuteData.length - 1];
  const aiData = {
    solarR:      latestPoint?.solarKW        ?? solarNode.powerKW   ?? 0,
    batteryLevel: latestPoint?.batteryLevelPct ?? batteryNode.soc    ?? 0,
    netGridPower: latestPoint
      ? latestPoint.gridImportKW - latestPoint.gridExportKW
      : gridNode.powerKW ?? 0,
    ev1V2g: false,
    ev2V2g: false,
  };

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
      try { router.prefetch(route); } catch { /* ignore */ }
    });
  }, [router]);

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
      {/* Persistent AI panel — lives outside the page router so it never
          unmounts when the user navigates between sections. Slide transition
          controlled by isOpen state from AIAssistantContext. */}
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

      {/* Bottom tab bar — mobile only */}
      <MobileBottomNav
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      <div className="flex min-h-screen w-full overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {/* Sidebar — hidden on mobile */}
        <div className="hidden md:flex">
          <DashboardSidebar
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            contextualMetrics={contextualMetrics}
          />
        </div>

        <SidebarInset className="flex-1 min-w-0 overflow-x-hidden flex flex-col bg-[var(--bg-primary)]">
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

export function DashboardLayout(props: DashboardLayoutProps) {
  return (
    <AIAssistantProvider>
      <DashboardLayoutInner {...props} />
    </AIAssistantProvider>
  );
}
