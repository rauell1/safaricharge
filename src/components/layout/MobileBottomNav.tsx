'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FlaskConical,
  BookMarked,
  Lightbulb,
  Bot,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardSection } from './DashboardSidebar';

const NAV_ITEMS: Array<{
  id: DashboardSection;
  label: string;
  icon: React.ElementType;
  href: string;
}> = [
  { id: 'dashboard',           label: 'Home',      icon: LayoutDashboard, href: '/demo' },
  { id: 'simulation',          label: 'Simulate',  icon: FlaskConical,    href: '/demo' },
  { id: 'energy-intelligence', label: 'Energy',    icon: Zap,             href: '/energy-intelligence' },
  // Mobile shows the Financial Planner (standalone calc) as the primary finance entry.
  // Live Financials is accessible via the Simulation tab on desktop.
  { id: 'financial-model',     label: 'Planner',   icon: TrendingUp,      href: '/financial' },
  { id: 'scenarios',           label: 'Scenarios', icon: BookMarked,      href: '/scenarios' },
  { id: 'recommendation',      label: 'Recs',      icon: Lightbulb,       href: '/demo' },
  { id: 'ai-assistant',        label: 'AI',        icon: Bot,             href: '/demo' },
];

interface MobileBottomNavProps {
  activeSection?: DashboardSection;
  onSectionChange?: (section: DashboardSection) => void;
}

export function MobileBottomNav({
  activeSection = 'dashboard',
  onSectionChange,
}: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--bg-secondary)]/95 backdrop-blur-md border-t border-[var(--border)] flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Mobile navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          activeSection === item.id ||
          (item.href !== '/demo' && !!pathname?.startsWith(item.href));

        const Icon = item.icon;

        const inner = (
          <span className="flex flex-col items-center justify-center gap-0.5 w-full py-2 px-1">
            <Icon
              className={cn(
                'h-5 w-5 transition-colors',
                isActive ? 'text-[var(--solar)]' : 'text-[var(--text-tertiary)]'
              )}
            />
            <span
              className={cn(
                'text-[10px] leading-none transition-colors',
                isActive ? 'text-[var(--solar)]' : 'text-[var(--text-tertiary)]'
              )}
            >
              {item.label}
            </span>
            {isActive && (
              <span className="absolute top-0 inset-x-2 h-0.5 rounded-full bg-[var(--solar)]" />
            )}
          </span>
        );

        return (
          <div key={item.id} className="relative flex-1 flex items-stretch">
            {item.href === '/demo' ? (
              <button
                type="button"
                onClick={() => onSectionChange?.(item.id)}
                className="flex-1 flex items-stretch focus:outline-none active:bg-[var(--bg-card-muted)]/40 transition-colors"
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {inner}
              </button>
            ) : (
              <Link
                href={item.href}
                className="flex-1 flex items-stretch focus:outline-none active:bg-[var(--bg-card-muted)]/40 transition-colors"
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {inner}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
