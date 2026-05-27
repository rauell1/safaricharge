'use client';

import React, { useMemo, useState } from 'react';
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
  Sun,
  Moon,
  Download,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase';
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
import { useAIAssistant } from '@/contexts/AIAssistantContext';

export type DashboardSection =
  | 'dashboard'
  | 'simulation'
  | 'configuration'
  | 'financial'
  | 'scenarios'
  | 'recommendation'
  | 'ai-assistant'
  | 'energy-intelligence'
  | 'financial-model'
  | 'export'
  | 'admin';

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
  solar:   { dot: 'bg-[var(--solar)]',      bg: 'bg-[var(--solar-soft)]',     text: 'text-[var(--solar)]' },
  battery: { dot: 'bg-[var(--battery)]',    bg: 'bg-[var(--battery-soft)]',   text: 'text-[var(--battery)]' },
  grid:    { dot: 'bg-[var(--grid)]',       bg: 'bg-[var(--grid-soft)]',      text: 'text-[var(--grid)]' },
  ev:      { dot: 'bg-[var(--ev)]',         bg: 'bg-[var(--ev-soft)]',        text: 'text-[var(--ev)]' },
  neutral: { dot: 'bg-[var(--text-muted)]', bg: 'bg-[var(--bg-card-muted)]', text: 'text-[var(--text-secondary)]' },
};

// ── Governance section ──────────────────────────────────────────────────────
function GovernanceSection() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors"
      >
        <ShieldCheck className="h-4 w-4 text-[var(--battery)]" />
        Governance
      </button>
      {open && <GovernancePanelContent />}
    </>
  );
}

function GovernancePanelContent() {
  const battery = useEnergyNode('battery');
  const solar = useEnergyNode('solar');
  const minuteData = useMinuteData('today');
  const latestPoint = useMemo(
    () => minuteData[minuteData.length - 1],
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

// ── Theme toggle ─────────────────────────────────────────────────────────
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-card)] hover:border-[var(--border-hover)] transition-all duration-150"
    >
      <span className="flex items-center gap-2.5">
        {isDark ? (
          <Sun className="h-4 w-4 text-[var(--solar)]" />
        ) : (
          <Moon className="h-4 w-4 text-[var(--battery)]" />
        )}
        <span className="text-[var(--text-secondary)]">
          {isDark ? 'Light mode' : 'Dark mode'}
        </span>
      </span>
      <span
        className="relative inline-flex h-5 w-9 shrink-0 rounded-full border border-[var(--border-strong)] transition-colors duration-200"
        style={{ background: isDark ? 'var(--battery-soft)' : 'var(--bg-card-muted)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full shadow-sm transition-transform duration-200"
          style={{
            background: isDark ? 'var(--battery)' : 'var(--text-tertiary)',
            transform: isDark ? 'translateX(16px)' : 'translateX(0)',
          }}
        />
      </span>
    </button>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────
export function DashboardSidebar({
  activeSection = 'dashboard',
  onSectionChange,
  contextualMetrics = [],
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { isOpen: aiPanelOpen, toggleAI } = useAIAssistant();
  const [isAdminUser, setIsAdminUser] = useState(false);

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.isAdmin === 'boolean') {
            setIsAdminUser(data.isAdmin);
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile in sidebar:', err);
      }
    };
    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      
      // Force clear all authentication and session tracking cookies
      document.cookie = 'sc_last_seen=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'sc_auth_checked_at=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'sc_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      // Perform full page redirection back to landing page
      window.location.assign('/landing');
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
  };

  const resolvedActive = activeSection;

  const primaryNavItems: Array<{
    id: DashboardSection;
    label: string;
    icon: React.ElementType;
  }> = [
    { id: 'dashboard',           label: 'Operations',           icon: LayoutDashboard },
    { id: 'simulation',          label: 'Physical Simulation',  icon: FlaskConical },
    { id: 'configuration',       label: 'System Sizing & Design', icon: SlidersHorizontal },
    { id: 'scenarios',           label: 'Scenarios & History',  icon: BookMarked },
    { id: 'financial',           label: 'Financial Modeling',   icon: DollarSign },
    { id: 'energy-intelligence', label: 'Intelligence & AI',    icon: Zap },
  ];

  const toolsNavItems = useMemo(() => {
    const items: Array<{
      id: DashboardSection;
      label: string;
      icon: React.ElementType;
    }> = [
      { id: 'export', label: 'Export', icon: Download },
    ];
    if (isAdminUser) {
      items.push({ id: 'admin', label: 'Admin Console', icon: ShieldCheck });
    }
    return items;
  }, [isAdminUser]);

  const renderNavItem = (
    item: { id: DashboardSection; label: string; icon: React.ElementType },
    extraClass = ''
  ) => {
    const isActive = resolvedActive === item.id;

    const inner = (
      <span className="flex items-center gap-3 w-full">
        <item.icon
          className={cn(
            'h-4 w-4 shrink-0',
            isActive ? 'text-[var(--battery)]' : 'text-[var(--text-tertiary)]'
          )}
        />
        <span
          className={cn(
            'flex-1 text-sm truncate',
            isActive
              ? 'font-medium text-[var(--text-primary)]'
              : 'font-normal text-[var(--text-secondary)]'
          )}
        >
          {item.label}
        </span>
        {isActive && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--battery)]" />
        )}
      </span>
    );

    return (
      <SidebarMenuItem key={item.id}>
        <SidebarMenuButton
          isActive={isActive}
          onClick={() => {
            if (item.id === 'admin') {
              window.location.assign('/admin');
            } else if (item.id === 'export') {
              window.location.assign('/export');
            } else if (onSectionChange) {
              onSectionChange(item.id);
            } else {
              // We are on a separate static page (like /export) and click a stateful dashboard item
              // Redirect back to the stateful dashboard!
              window.location.assign('/demo');
            }
          }}
          className={cn(
            'group relative rounded-lg px-3 py-2 transition-all duration-150 w-full',
            isActive ? 'bg-[var(--bg-card)] shadow-sm' : 'hover:bg-[var(--bg-card-muted)]',
            extraClass
          )}
        >
          {inner}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar className="border-r border-[var(--border)] text-[var(--text-primary)]">
      {/* Logo */}
      <SidebarHeader className="px-4 py-5 border-b border-[var(--border)] bg-[var(--bg-card)]">
        <div className="flex items-center justify-center">
          <BrandLogo showLabel={true} href="/landing" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 bg-[var(--bg-secondary)]">
        {/* Primary Nav */}
        <SidebarGroup>
          <SidebarGroupLabel className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {primaryNavItems.map((item) => renderNavItem(item))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools group — Export + Admin live here */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {toolsNavItems.map((item) => renderNavItem(item))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Live context metrics */}
        {contextualMetrics.length > 0 && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Live Context
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="space-y-1.5 px-1">
                {contextualMetrics.map((m) => (
                  <div
                    key={m.label}
                    className={cn(
                      'rounded-lg px-3 py-2 flex items-center justify-between border border-[var(--border)]',
                      TONE[m.tone].bg
                    )}
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                      {m.label}
                    </span>
                    <span className={cn('text-sm font-bold tabular-nums', TONE[m.tone].text)}>
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Governance */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Governance
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <GovernanceSection />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: theme toggle + status + sign out */}
      <SidebarFooter className="px-4 py-4 border-t border-[var(--border)] bg-[var(--bg-card)] space-y-3">
        <ThemeToggle />
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all duration-150 cursor-pointer"
        >
          <LogOut className="h-4 w-4 text-[var(--text-tertiary)]" />
          Sign Out
        </button>
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full shrink-0 status-online bg-[var(--battery)]" />
          <span className="text-xs text-[var(--text-tertiary)]">System Online</span>
          <span className="ml-auto text-xs text-[var(--text-tertiary)]">&copy; 2026</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
