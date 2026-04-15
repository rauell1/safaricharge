'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import {
  LayoutDashboard,
  FlaskConical,
  SlidersHorizontal,
  DollarSign,
  BookMarked,
  Lightbulb,
  Bot,
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

export type DashboardSection =
  | 'dashboard'
  | 'simulation'
  | 'configuration'
  | 'financial'
  | 'scenarios'
  | 'recommendation'
  | 'ai-assistant';

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

export function DashboardSidebar({
  activeSection = 'dashboard',
  onSectionChange,
  contextualMetrics = [],
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const resolvedActive: DashboardSection = useMemo(() => {
    if (activeSection && activeSection !== 'dashboard') return activeSection;
    if (!pathname) return 'dashboard';
    if (pathname.startsWith('/scenarios'))                                          return 'scenarios';
    if (pathname.startsWith('/demo/simulation') || pathname.includes('simulation')) return 'simulation';
    if (pathname.includes('configuration'))                                         return 'configuration';
    if (pathname.includes('financial'))                                             return 'financial';
    if (pathname.includes('recommendation'))                                        return 'recommendation';
    if (pathname.includes('ai-assistant'))                                          return 'ai-assistant';
    return activeSection ?? 'dashboard';
  }, [activeSection, pathname]);

  const navItems: Array<{
    id: DashboardSection;
    label: string;
    icon: React.ElementType;
    href?: string;
  }> = [
    { id: 'dashboard',      label: 'Dashboard',          icon: LayoutDashboard },
    { id: 'simulation',     label: 'Simulation',         icon: FlaskConical },
    { id: 'configuration',  label: 'System Config',      icon: SlidersHorizontal },
    { id: 'financial',      label: 'Financial',          icon: DollarSign },
    { id: 'scenarios',      label: 'Scenarios',          icon: BookMarked, href: '/scenarios' },
    { id: 'recommendation', label: 'Recommendations',    icon: Lightbulb },
    { id: 'ai-assistant',   label: 'AI Assistant',       icon: Bot },
  ];

  return (
    <Sidebar
      className="border-r text-[var(--text-primary)]"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
        boxShadow: '8px 0 32px rgba(0,0,0,0.28)',
      }}
    >
      {/* Logo */}
      <SidebarHeader
        className="px-4 py-5"
        style={{ borderBottom: '1px solid var(--border)' }}
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
            className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navItems.map((item) => {
                const isActive =
                  resolvedActive === item.id ||
                  (!!item.href && !!pathname?.startsWith(item.href));

                const inner = (
                  <span className="flex items-center gap-3 w-full">
                    <item.icon
                      className="h-4 w-4 shrink-0"
                      style={{ color: isActive ? 'var(--battery)' : 'var(--text-tertiary)' }}
                    />
                    <span
                      className={cn('text-sm truncate', isActive ? 'font-medium' : 'font-normal')}
                      style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                    >
                      {item.label}
                    </span>
                    {isActive && (
                      <span
                        className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: 'var(--battery)' }}
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Live context metrics */}
        {contextualMetrics.length > 0 && (
          <SidebarGroup className="mt-5">
            <SidebarGroupLabel
              className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-tertiary)' }}
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
                      TONE[m.tone].bg
                    )}
                    style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <span
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-tertiary)' }}
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
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter
        className="px-4 py-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="h-2 w-2 rounded-full shrink-0 status-online"
            style={{ background: 'var(--battery)' }}
          />
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            System Online
          </span>
          <span
            className="ml-auto text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            &copy; 2026
          </span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
