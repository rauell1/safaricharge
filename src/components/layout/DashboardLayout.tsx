'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar, type DashboardSection, type SidebarContextMetric } from './DashboardSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { clearExternalUploadActive, isExternalUploadActive } from '@/lib/external-upload-guard';
import { SIZING_SIMULATOR_STORAGE_KEY } from '@/lib/pv-sizing';
import { SafariChargeAIAssistant } from '@/components/ai/AIAssistant';
import { AIAssistantProvider, useAIAssistant } from '@/contexts/AIAssistantContext';
import { AlertTriangle, X, Info } from 'lucide-react';
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

// ── Simulation-reset toast ──────────────────────────────────────
function SimResetToast() {
  const [visible, setVisible] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  const dismiss = useCallback(() => {
    setDismissing(true);
    setTimeout(() => setVisible(false), 230);
  }, []);

  // Auto-dismiss after 12 s
  useEffect(() => {
    const t = setTimeout(dismiss, 12000);
    return () => clearTimeout(t);
  }, [dismiss]);

  if (!visible) return null;

  return (
    <div
      className={`sim-reset-toast${dismissing ? ' dismissing' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div
        className="flex items-start gap-3 rounded-2xl px-4 py-3 shadow-xl"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(245,158,11,0.30)',
          color: 'var(--text-primary)',
          maxWidth: '100%',
        }}
      >
        <Info
          className="mt-0.5 shrink-0"
          style={{ color: 'var(--warning)', width: 'var(--icon-sm)', height: 'var(--icon-sm)' }}
        />
        <p className="flex-1 text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
          Leaving this site resets your simulation to the original state — unless you're uploading a file.
          Finish the upload first to keep imported data.
        </p>
        <button
          onClick={dismiss}
          aria-label="Dismiss notification"
          className="shrink-0 rounded-lg p-1 transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <X style={{ width: 'var(--icon-xs)', height: 'var(--icon-xs)' }} />
        </button>
      </div>
    </div>
  );
}

// ── Inner layout (consumes AI context) ─────────────────────────
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

  // Prefetch all dashboard routes
  useEffect(() => {
    const routes = [
      '/dashboard', '/simulation', '/configuration',
      '/energy-intelligence', '/scenarios', '/recommendation',
      '/ai-assistant', '/live-results', '/financial',
    ];
    routes.forEach((route) => { try { router.prefetch(route); } catch { /* ignore */ } });
  }, [router]);

  // Simulation-reset on page leave
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
      {/* Persistent AI panel */}
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

      {/* Simulation-reset toast — shown once on mount, auto-dismisses */}
      <SimResetToast />

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
