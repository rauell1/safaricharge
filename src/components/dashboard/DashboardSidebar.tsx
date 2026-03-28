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
  BarChart3,
  Activity,
} from 'lucide-react';
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
  const mainMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'generation', label: 'Generation', icon: Sun },
    { id: 'consumption', label: 'Consumption', icon: Activity },
    { id: 'panels', label: 'Panels', icon: BarChart3 },
    { id: 'battery', label: 'Battery', icon: Battery },
    { id: 'savings', label: 'Savings', icon: DollarSign },
  ];

  const systemMenuItems = [
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: alertCount },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <Sidebar className="border-r border-dark-border">
      <SidebarHeader className="border-b border-dark-border p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent-solar to-accent-energy shadow-glow-solar">
            <Zap className="h-6 w-6 text-primary-900" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-dark-text-primary">SafariCharge</h1>
            <p className="text-xs text-dark-text-secondary">Energy Management</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-dark-text-tertiary uppercase tracking-wider text-xs mb-2">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeSection === item.id}
                    onClick={() => onSectionChange?.(item.id)}
                    className="group relative"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {activeSection === item.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-energy rounded-r" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="text-dark-text-tertiary uppercase tracking-wider text-xs mb-2">
            System
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemMenuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeSection === item.id}
                    onClick={() => onSectionChange?.(item.id)}
                    className="group relative"
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <SidebarMenuBadge className="bg-accent-alert text-white">
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                    {activeSection === item.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent-energy rounded-r" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-dark-border p-4">
        <div className="text-xs text-dark-text-tertiary">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-accent-energy status-online" />
            <span>System Online</span>
          </div>
          <div className="text-[10px] text-dark-text-tertiary/60">
            SafariCharge © 2026
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
