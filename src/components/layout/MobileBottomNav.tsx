'use client';
/* eslint-disable */

import React, { useEffect, useState } from 'react';
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

type MobileNavItemId = DashboardSection | 'finance-parent';

const NAV_ITEMS: Array<{
  id: MobileNavItemId;
  label: string;
  icon: React.ElementType;
  href?: string;
}> = [
  { id: 'dashboard',           label: 'Home',      icon: LayoutDashboard, href: '/dashboard' },
  { id: 'simulation',          label: 'Simulate',  icon: FlaskConical,    href: '/simulation' },
  { id: 'energy-intelligence', label: 'Energy',    icon: Zap,             href: '/energy-intelligence' },
  { id: 'finance-parent',      label: 'Finance',   icon: TrendingUp },
  { id: 'scenarios',           label: 'Scenarios', icon: BookMarked,      href: '/scenarios' },
  { id: 'recommendation',      label: 'Recs',      icon: Lightbulb,       href: '/recommendation' },
  { id: 'ai-assistant',        label: 'AI',        icon: Bot,             href: '/ai-assistant' },
];

const FINANCE_CHILD_ITEMS: Array<{
  id: DashboardSection;
  label: string;
  href?: string;
}> = [
  { id: 'financial', label: 'Live Results', href: '/live-results' },
  { id: 'financial-model', label: 'Planner', href: '/financial' },
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
  const [isFinanceMenuOpen, setIsFinanceMenuOpen] = useState(false);

  useEffect(() => {
    setIsFinanceMenuOpen(false);
  }, [pathname, activeSection]);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--bg-secondary)]/95 backdrop-blur-md border-t border-[var(--border)] flex items-stretch pb-[env(safe-area-inset-bottom)]"
      aria-label="Mobile navigation"
    >
      {NAV_ITEMS.map((item) => {
        const isFinanceParent = item.id === 'finance-parent';
        const isFinanceActive =
          activeSection === 'financial' ||
          activeSection === 'financial-model' ||
          !!pathname?.startsWith('/financial') ||
          !!pathname?.startsWith('/live-results');
        const isActive = isFinanceParent
          ? isFinanceActive || isFinanceMenuOpen
          : activeSection === item.id ||
            (item.href && item.href !== '/demo' && !!pathname?.startsWith(item.href));

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
            {isFinanceParent ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsFinanceMenuOpen((prev) => !prev)}
                  className="flex-1 flex items-stretch focus:outline-none active:bg-[var(--bg-card-muted)]/40 transition-colors"
                  aria-label="Finance"
                  aria-current={isActive ? 'page' : undefined}
                >
                  {inner}
                </button>

                {isFinanceMenuOpen && (
                  <div className="absolute bottom-full left-1/2 mb-2 w-44 -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-1 shadow-xl">
                    {FINANCE_CHILD_ITEMS.map((child) => {
                      const isChildActive =
                        activeSection === child.id ||
                        (!!child.href && !!pathname?.startsWith(child.href));

                      return (
                        <Link
                          key={child.id}
                          href={child.href ?? '/financial'}
                          className={cn(
                            'block w-full rounded-lg px-3 py-2 text-left text-xs transition-colors',
                            isChildActive
                              ? 'bg-[var(--bg-card)] text-[var(--battery)]'
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-muted)]'
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
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
