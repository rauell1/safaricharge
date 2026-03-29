'use client';

import React from 'react';
import {
  Home,
  Sun,
  Zap,
  Battery,
  DollarSign,
  AlertTriangle,
  Settings,
  Car,
  UtilityPole,
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
  SidebarMenuBadge,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar';

interface DashboardSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  alertCount?: number;
}

export function DashboardSidebar({
  activeSection = 'dashboard',
  onSectionChange,
  alertCount = 0
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const resolvedActive = React.useMemo(() => {
    if (pathname?.startsWith('/demo/solar')) return 'solar';
    if (pathname?.startsWith('/demo/battery')) return 'battery';
    if (pathname?.startsWith('/demo/grid')) return 'grid';
    if (pathname?.startsWith('/demo/ev')) return 'ev';
    if (pathname?.startsWith('/demo')) return 'dashboard';
    return activeSection;
  }, [activeSection, pathname]);

  const mainMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/demo' },
    { id: 'solar', label: 'Solar', icon: Sun, href: '/demo/solar' },
    { id: 'battery', label: 'Battery', icon: Battery, href: '/demo/battery' },
    { id: 'grid', label: 'Grid', icon: UtilityPole, href: '/demo/grid' },
    { id: 'ev', label: 'EV Charging', icon: Car, href: '/demo/ev' },
    { id: 'savings', label: 'Savings', icon: DollarSign, href: '/demo' },
  ];

  const systemMenuItems = [
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: alertCount },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <Sidebar className="border-r border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-[10px_0_40px_rgba(0,0,0,0.22)]">
      <SidebarHeader className="border-b border-[var(--border)] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent-solar to-accent-energy shadow-glow-solar">
            <Zap className="h-6 w-6 text-primary" />
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
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={resolvedActive === item.id || (!!item.href && pathname?.startsWith(item.href))}
                    onClick={() => onSectionChange?.(item.id)}
                    className="group relative rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] data-[active=true]:bg-[var(--bg-card)] data-[active=true]:shadow-[0_10px_30px_rgba(0,0,0,0.25)] data-[active=true]:text-[var(--text-primary)]"
                  >
                    <Link href={item.href ?? '#'} className="flex w-full items-center gap-2 relative">
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.label}</span>
                      {resolvedActive === item.id && (
                        <div className="absolute -left-3 top-0 bottom-0 w-1 bg-[var(--battery)] rounded-r" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-[var(--text-tertiary)] uppercase tracking-wider text-xs mb-2">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemMenuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={resolvedActive === item.id}
                    onClick={() => onSectionChange?.(item.id)}
                    className="group relative rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] data-[active=true]:bg-[var(--bg-card)] data-[active=true]:shadow-[0_10px_30px_rgba(0,0,0,0.25)] data-[active=true]:text-[var(--text-primary)]"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <SidebarMenuBadge className="bg-[var(--alert)] text-white">
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                    {activeSection === item.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--battery)] rounded-r" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
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
