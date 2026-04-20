'use client';
/* eslint-disable */

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  LayoutDashboard,
  FlaskConical,
  SlidersHorizontal,
  DollarSign,
  BookMarked,
  Lightbulb,
  Bot,
  ShieldCheck,
  Zap,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { GovernanceWidget } from '@/components/widgets/GovernanceWidget';
import { useEnergyNode, useMinuteData } from '@/hooks/useEnergySystem';

export type DashboardSection =
  | 'dashboard'
  | 'simulation'
  | 'configuration'
  | 'financial'
  | 'scenarios'
  | 'recommendation'
  | 'ai-assistant'
  | 'energy-intelligence'
  | 'financial-model';

export interface SidebarContextMetric {
  label: string;
  value: string;
  tone: 'solar' | 'battery' | 'grid' | 'ev' | 'neutral';
}

interface DashboardSidebarProps {
  activeSection?: DashboardSection;
  onSectionChange?: (section: DashboardSection) => void;
  contextualMetrics?: SidebarContextMetric[];
}

const TONE: Record<SidebarContextMetric['tone'], { dot: string; bg: string; text: string }> = {
  solar:   { dot: 'bg-[var(--solar)]',    bg: 'bg-[var(--solar-soft)]',       text: 'text-[var(--solar)]' },
  battery: { dot: 'bg-[var(--battery)]',  bg: 'bg-[var(--battery-soft)]',     text: 'text-[var(--battery)]' },
  grid:    { dot: 'bg-[var(--grid)]',     bg: 'bg-[var(--grid-soft)]',        text: 'text-[var(--grid)]' },
  ev:      { dot: 'bg-[var(--ev)]',       bg: 'bg-[var(--ev-soft)]',          text: 'text-[var(--ev)]' },
  neutral: { dot: 'bg-[var(--text-muted)]', bg: 'bg-[var(--bg-card-muted)]', text: 'text-[var(--text-secondary)]' },
};

const LOGO_URL =
  'https://drive.google.com/uc?export=view&id=17VYQ0H4enZMSZGs9SeH5xTPaOsnQjdrM';

// ── Governance section — lazy: hooks only mount when panel is open ─────────────
// Keeps useEnergyNode / useMinuteData out of the top-level sidebar render
// so they don't run (and trigger re-renders) on every non-dashboard route.

function GovernanceSection() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
      >
        <ShieldCheck className="h-4 w-4 text-[var(--battery)]" />
        Governance
      </button>
      {open && <GovernancePanelContent />}
    </>
  );
}

// Only mounts (and therefore only calls hooks) when the panel is open.
function GovernancePanelContent() {
  const battery = useEnergyNode('battery');
  const solar = useEnergyNode('solar');

  // Stable selector: only re-compute when the last minute-data point changes.
  // Avoids iterating the full array on every simulation tick.
  const minuteData = useMinuteData('today');
  const latestPoint = useMemo(
    () => minuteData[minuteData.length - 1],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [minuteData.length],
  );

  const expectedOutputBaseline = (solar.capacityKW ?? 10) * 0.7;

  return (
    <div className="mt-2">
      <GovernanceWidget
        currentSoc={battery.soc ?? latestPoint?.batteryLevelPct ?? 50}
        minSoc={20}
        maxSoc={90}
        actualOutput={latestPoint?.solarKW ?? 0}
        expectedOutput={expectedOutputBaseline}
      />
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export function DashboardSidebar({
  activeSection = 'dashboard',
  onSectionChange,
  contextualMetrics = [],
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const resolvedActive: DashboardSection = useMemo(() => {
    if (activeSection && activeSection !== 'dashboard') return activeSection;
    if (!pathname) return 'dashboard';
    if (pathname.startsWith('/energy-intelligence'))                               return 'energy-intelligence';
    if (pathname.startsWith('/financial'))                                         return 'financial-model';
    if (pathname.startsWith('/scenarios'))                                         return 'scenarios';
    if (pathname.startsWith('/demo/simulation') || pathname.includes('simulation')) return 'simulation';
    if (pathname.includes('configuration'))                                        return 'configuration';
    if (pathname.includes('financial'))                                            return 'financial';
    if (pathname.includes('recommendation'))                                       return 'recommendation';
    if (pathname.includes('ai-assistant'))                                         return 'ai-assistant';
    return activeSection ?? 'dashboard';
  }, [activeSection, pathname]);

  // ── Nav items ────────────────────────────────────────────────────────────
  const primaryNavItems: Array<{
    id: DashboardSection;
    label: string;
    icon: React.ElementType;
    href?: string;
    description?: string;
  }> = [
    { id: 'dashboard',           label: 'Dashboard',              icon: LayoutDashboard,  href: '/dashboard', description: 'Live operations overview' },
    { id: 'simulation',          label: 'Simulation',             icon: FlaskConical,     href: '/simulation', description: 'Run and inspect system behavior' },
    { id: 'configuration',       label: 'System Config',          icon: SlidersHorizontal, description: 'Tune solar, battery and EV settings' },
    { id: 'energy-intelligence', label: 'Energy Intelligence',    icon: Zap,              href: '/energy-intelligence', description: 'AI analysis of energy performance' },
    { id: 'scenarios',           label: 'Scenarios',              icon: BookMarked,       href: '/scenarios', description: 'Saved cases and comparisons' },
    { id: 'recommendation',      label: 'Recommendations',        icon: Lightbulb,        description: 'Sizing and optimization guidance' },
    { id: 'ai-assistant',        label: 'AI Assistant',           icon: Bot,              description: 'Ask questions about system data' },
  ];

  const financeNavItems: Array<{
    id: DashboardSection;
    label: string;
    icon: React.ElementType;
    href?: string;
    description?: string;
  }> = [
    { id: 'financial',       label: 'Live Results', icon: DollarSign, description: 'Uses your running simulation data' },
    { id: 'financial-model', label: 'Planner',      icon: TrendingUp, href: '/financial', description: 'Standalone what-if model' },
  ];

  return (
    <Sidebar
      className="border-r text-[var(--text-primary)]"
      style={{}}
    >
      {/* Logo */}
      <SidebarHeader
        className="px-4 py-5 border-b border-[var(--border)]"
      >
        <div className="flex items-center justify-center">
          <Image
            src={LOGO_URL}
            alt="SafariCharge"
            width={176}
            height={68}
            priority
            unoptimized
            className="object-contain w-full max-w-[176px] h-auto"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {/* Nav */}
        <SidebarGroup>
          <SidebarGroupLabel
            className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]"
          >
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {primaryNavItems.map((item) => {
                const isActive =
                  resolvedActive === item.id ||
                  (!!item.href && !!pathname?.startsWith(item.href));

                const inner = (
                  <span className="flex items-center gap-3 w-full">
                    <item.icon
                      className={cn('h-4 w-4 shrink-0', isActive ? 'text-[var(--battery)]' : 'text-[var(--text-tertiary)]')}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn('block text-sm truncate', isActive ? 'font-medium text-[var(--text-primary)]' : 'font-normal text-[var(--text-secondary)]')}
                      >
                        {item.label}
                      </span>
                      {item.description && (
                        <span
                          className="block truncate text-[11px] leading-tight text-[var(--text-tertiary)]"
                        >
                          {item.description}
                        </span>
                      )}
                    </span>
                    {isActive && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--battery)]"
                      />
                    )}
                  </span>
                );

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild={!!item.href}
                      isActive={isActive}
                      onClick={() => !item.href && onSectionChange?.(item.id)}
                      className={cn(
                        'group relative rounded-lg px-3 py-2.5 transition-all duration-150',
                        isActive
                          ? 'bg-[var(--bg-card)] shadow-sm'
                          : 'hover:bg-[var(--bg-card-muted)]'
                      )}
                    >
                      {item.href ? (
                        <Link href={item.href} className="w-full">
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem className="mt-2">
                <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                  Finance
                </div>
              </SidebarMenuItem>

              {financeNavItems.map((item) => {
                const isActive =
                  resolvedActive === item.id ||
                  (!!item.href && !!pathname?.startsWith(item.href));

                const inner = (
                  <span className="flex items-center gap-3 w-full">
                    <item.icon
                      className="h-4 w-4 shrink-0"
                      className={cn('h-4 w-4 shrink-0', isActive ? 'text-[var(--battery)]' : 'text-[var(--text-tertiary)]')}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn('block text-sm truncate', isActive ? 'font-medium' : 'font-normal')}
                        className={cn('block text-sm truncate', isActive ? 'font-medium text-[var(--text-primary)]' : 'font-normal text-[var(--text-secondary)]')}
                      >
                        {item.label}
                      </span>
                      {item.description && (
                        <span
                          className="block truncate text-[11px] leading-tight text-[var(--text-tertiary)]"
                        >
                          {item.description}
                        </span>
                      )}
                    </span>
                    {isActive && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--battery)]"
                      />
                    )}
                  </span>
                );

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild={!!item.href}
                      isActive={isActive}
                      onClick={() => !item.href && onSectionChange?.(item.id)}
                      className={cn(
                        'group relative rounded-lg px-3 py-2.5 pl-6 transition-all duration-150',
                        isActive
                          ? 'bg-[var(--bg-card)] shadow-sm'
                          : 'hover:bg-[var(--bg-card-muted)]'
                      )}
                    >
                      {item.href ? (
                        <Link href={item.href} className="w-full">
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Live context metrics */}
        {contextualMetrics.length > 0 && (
          <SidebarGroup className="mt-5">
            <SidebarGroupLabel
                className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]"
            >
              Live Context
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-1.5 px-1">
                {contextualMetrics.map((m) => (
                  <div
                    key={m.label}
                    className={cn(
                      'rounded-lg px-3 py-2.5 flex items-center justify-between',
                      TONE[m.tone].bg,
                      'border border-[rgba(255,255,255,0.06)]'
                    )}
                  >
                    <span
                      className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]"
                    >
                      {m.label}
                    </span>
                    <span
                      className={cn('text-sm font-bold tabular-nums', TONE[m.tone].text)}
                    >
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Governance — lazy: hooks only mount when panel is open */}
        <SidebarGroup className="mt-5">
          <SidebarGroupLabel
            className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]"
          >
            Governance
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <GovernanceSection />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter
        className="px-4 py-4 border-t border-[var(--border)]"
      >
        <div className="flex items-center gap-2.5">
          <span
            className="h-2 w-2 rounded-full shrink-0 status-online bg-[var(--battery)]"
          />
          <span className="text-xs text-[var(--text-tertiary)]">
            System Online
          </span>
          <span
            className="ml-auto text-xs text-[var(--text-tertiary)]"
          >
            &copy; 2026
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
