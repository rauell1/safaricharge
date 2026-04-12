'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import {
  LayoutDashboard,
  FlaskConical,
  SlidersHorizontal,
  DollarSign,
  Zap,
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

const toneClasses: Record<SidebarContextMetric['tone'], string> = {
  solar: 'bg-[var(--solar-soft)] text-[var(--solar)] border-[var(--solar-soft)]',
  battery: 'bg-[var(--battery-soft)] text-[var(--battery)] border-[var(--battery-soft)]',
  grid: 'bg-[var(--grid-soft)] text-[var(--grid)] border-[var(--grid-soft)]',
  ev: 'bg-[var(--ev-soft)] text-[var(--ev)] border-[var(--ev-soft)]',
  neutral: 'bg-[var(--bg-card-muted)] text-[var(--text-secondary)] border-[var(--border)]',
};

export function DashboardSidebar({
  activeSection = 'dashboard',
  onSectionChange,
  contextualMetrics = [],
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const resolvedActive: DashboardSection = useMemo(() => {
    if (activeSection && activeSection !== 'dashboard') return activeSection;
    if (!pathname) return 'dashboard';
    if (pathname.startsWith('/scenarios'))                                         return 'scenarios';
    if (pathname.startsWith('/demo/simulation') || pathname.includes('simulation')) return 'simulation';
    if (pathname.includes('configuration'))                                        return 'configuration';
    if (pathname.includes('financial'))                                            return 'financial';
    if (pathname.includes('recommendation'))                                       return 'recommendation';
    if (pathname.includes('ai-assistant'))                                         return 'ai-assistant';
    return activeSection ?? 'dashboard';
  }, [activeSection, pathname]);

  const mainMenuItems: Array<{
    id: DashboardSection;
    label: string;
    icon: React.ElementType;
    href?: string;
  }> = [
    { id: 'dashboard',      label: 'Dashboard',          icon: LayoutDashboard },
    { id: 'simulation',     label: 'Simulation',         icon: FlaskConical },
    { id: 'configuration',  label: 'System Config',      icon: SlidersHorizontal },
    { id: 'financial',      label: 'Financial Analysis', icon: DollarSign },
    { id: 'scenarios',      label: 'Scenarios',          icon: BookMarked, href: '/scenarios' },
    { id: 'recommendation', label: 'Get Recommendation', icon: Lightbulb },
    { id: 'ai-assistant',   label: 'AI Assistant',       icon: Bot },
  ];

  return (
    <Sidebar className="border-r border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-[10px_0_40px_rgba(0,0,0,0.22)]">
      <SidebarHeader className="border-b border-[var(--border)] p-6">
        <div className="flex items-center gap-3">
          {/* SafariCharge logo from /public/logo.svg */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent-solar to-accent-energy shadow-glow-solar overflow-hidden">
            <Image
              src="/logo.svg"
              alt="SafariCharge logo"
              width={32}
              height={32}
              priority
              className="object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">SafariCharge</h1>
            <p className="text-xs text-[var(--text-tertiary)]">Energy Management</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[var(--text-tertiary)] uppercase tracking-wider text-xs mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild={!!item.href}
                    isActive={
                      resolvedActive === item.id ||
                      (!!item.href && !!pathname?.startsWith(item.href))
                    }
                    onClick={() => !item.href && onSectionChange?.(item.id)}
                    className="group relative rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] data-[active=true]:bg-[var(--bg-card)] data-[active=true]:shadow-[0_10px_30px_rgba(0,0,0,0.25)] data-[active=true]:text-[var(--text-primary)]"
                  >
                    {item.href ? (
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span className="font-medium">{item.label}</span>
                        {resolvedActive === item.id && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--solar)] rounded-r" />
                        )}
                      </Link>
                    ) : (
                      <>
                        <item.icon className="h-4 w-4" />
                        <span className="font-medium">{item.label}</span>
                        {resolvedActive === item.id && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--solar)] rounded-r" />
                        )}
                      </>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-[var(--text-tertiary)] uppercase tracking-wider text-xs mb-2">
            Live Context
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2">
              {contextualMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className={cn(
                    'rounded-lg border px-3 py-2',
                    toneClasses[metric.tone]
                  )}
                >
                  <div className="text-[10px] uppercase tracking-wide opacity-80">{metric.label}</div>
                  <div className="text-sm font-semibold mt-0.5">{metric.value}</div>
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[var(--border)] p-4">
        <div className="text-xs text-[var(--text-tertiary)]">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-[var(--battery)] status-online" />
            <span>System Online</span>
          </div>
          <div className="text-[10px] text-[var(--text-tertiary)] opacity-70">
            SafariCharge © 2026
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
