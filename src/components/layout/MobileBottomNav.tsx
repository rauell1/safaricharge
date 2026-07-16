'use client';

import React from 'react';
import {
  LayoutDashboard,
  FlaskConical,
  SlidersHorizontal,
  BookMarked,
  Zap,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardSection } from './DashboardSidebar';

// Labels and icons mirror DashboardSidebar's primary nav so the two surfaces
// never drift apart.
const NAV_ITEMS: Array<{
  id: DashboardSection;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'dashboard',           label: 'Operations',  icon: LayoutDashboard },
  { id: 'simulation',          label: 'Simulate',    icon: FlaskConical },
  { id: 'configuration',       label: 'Design',      icon: SlidersHorizontal },
  { id: 'scenarios',           label: 'History',     icon: BookMarked },
  { id: 'financial',           label: 'Financials',  icon: DollarSign },
  { id: 'energy-intelligence', label: 'AI Insights', icon: Zap },
];

interface MobileBottomNavProps {
  activeSection?: DashboardSection;
  onSectionChange?: (section: DashboardSection) => void;
}

export function MobileBottomNav({
  activeSection = 'dashboard',
  onSectionChange,
}: MobileBottomNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--bg-secondary)]/95 backdrop-blur-md border-t border-[var(--border)] flex items-stretch pb-[env(safe-area-inset-bottom)]"
      aria-label="Mobile navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = activeSection === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSectionChange?.(item.id)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 focus:outline-none active:bg-[var(--bg-card-muted)]/40 transition-colors relative"
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              className={cn(
                'h-5 w-5 transition-colors',
                isActive ? 'text-[var(--battery)]' : 'text-[var(--text-tertiary)]'
              )}
            />
            <span
              className={cn(
                'text-[10px] leading-none transition-colors font-medium',
                isActive ? 'text-[var(--battery)]' : 'text-[var(--text-tertiary)]'
              )}
            >
              {item.label}
            </span>
            {isActive && (
              <span className="absolute top-0 inset-x-2 h-0.5 rounded-full bg-[var(--battery)]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
