'use client';
/**
 * DashboardSidebar
 * Updated to include "Scenarios" nav item.
 */

import React from 'react';

export type DashboardSection =
  | 'dashboard'
  | 'energy'
  | 'battery'
  | 'forecast'
  | 'scenarios'
  | 'reports'
  | 'settings'
  | 'assistant';

const NAV_ITEMS: Array<{ id: DashboardSection; label: string; icon: React.ReactNode }> = [
  {
    id: 'dashboard',
    label: 'Overview',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    id: 'energy',
    label: 'Energy',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    id: 'battery',
    label: 'Battery',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="18" height="11" rx="2"/>
        <path d="M22 11v3"/>
        <line x1="7" y1="12" x2="7" y2="12.5"/>
        <line x1="11" y1="12" x2="11" y2="12.5"/>
      </svg>
    ),
  },
  {
    id: 'forecast',
    label: 'Forecast',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/>
        <path d="M7 16l4-4 4 4 4-4"/>
      </svg>
    ),
  },
  {
    id: 'scenarios',
    label: 'Scenarios',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6"  y1="20" x2="6"  y2="14"/>
      </svg>
    ),
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    id: 'assistant',
    label: 'AI Assistant',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

interface Props {
  active: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
  collapsed?: boolean;
}

export function DashboardSidebar({ active, onNavigate, collapsed = false }: Props) {
  return (
    <nav
      className={`flex flex-col h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] transition-all ${
        collapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Logo / wordmark */}
      <div className={`flex items-center gap-2.5 px-4 h-14 border-b border-[var(--color-border)] flex-shrink-0 ${
        collapsed ? 'justify-center' : ''
      }`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="4" fill="#e8920a"/>
          <line x1="12" y1="4"  x2="12" y2="6"  stroke="#e8920a" strokeWidth="2" strokeLinecap="round"/>
          <line x1="12" y1="18" x2="12" y2="20" stroke="#e8920a" strokeWidth="2" strokeLinecap="round"/>
          <line x1="4"  y1="12" x2="6"  y2="12" stroke="#e8920a" strokeWidth="2" strokeLinecap="round"/>
          <line x1="18" y1="12" x2="20" y2="12" stroke="#e8920a" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        {!collapsed && (
          <span className="text-sm font-bold text-[var(--color-text)] tracking-tight">SafariCharge</span>
        )}
      </div>

      {/* Nav items */}
      <ul role="list" className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {NAV_ITEMS.map(item => {
          const isActive = item.id === active;
          return (
            <li key={item.id}>
              <button
                className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--color-primary-highlight)] text-[var(--color-primary)]'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-dynamic)] hover:text-[var(--color-text)]'
                } ${collapsed ? 'justify-center' : ''}`}
                onClick={() => onNavigate(item.id)}
                title={collapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
