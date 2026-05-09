'use client';

import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Bell,
  RotateCcw,
  Target,
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { SubscriptionBadge } from '@/components/SubscriptionBadge';

interface DashboardHeaderProps {
  currentDate: Date;
  onReset?: () => void;
  onLocationClick?: () => void;
  onRecommendationClick?: () => void;
  onDownload?: () => void;
  /** @deprecated — Save Scenario has moved to the Scenarios page. This prop is kept for compatibility but is no longer used. */
  onSaveScenario?: (name: string) => void;
  locationName?: string;
  notificationCount?: number;
  notifications?: HeaderNotification[];
}

export interface HeaderNotification {
  id: string;
  title: string;
  description: string;
  level?: 'info' | 'warning' | 'critical';
  actionLabel?: string;
  onAction?: () => void;
}

export function DashboardHeader({
  currentDate,
  onReset,
  onLocationClick,
  onRecommendationClick,
  locationName = 'Nairobi',
  notificationCount = 0,
  notifications = [],
}: DashboardHeaderProps) {
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

  const dateLabel = currentDate.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const dateLabelShort = currentDate.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !readNotificationIds.has(n.id)),
    [notifications, readNotificationIds]
  );

  const effectiveNotificationCount = notifications.length > 0
    ? unreadNotifications.length
    : notificationCount;

  const markAllAsRead = () => {
    if (notifications.length === 0) return;
    setReadNotificationIds(new Set(notifications.map((n) => n.id)));
  };

  const markAsRead = (id: string) => {
    setReadNotificationIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const iconBtn =
    'relative rounded-xl transition-all duration-150 flex items-center justify-center'
    + ' h-9 w-9 sm:h-10 sm:w-10';
  const iconBtnStyle = {
    background: 'var(--bg-card-muted)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
  };
  const iconSize = { width: 'var(--icon-sm)', height: 'var(--icon-sm)', flexShrink: 0 };

  return (
    <header
      className="sticky top-0 z-40 w-full flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-2.5 sm:py-3 md:px-6 md:h-[68px] flex-nowrap backdrop-blur-md"
      style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 1px 0 var(--border)',
      }}
    >
      {/* Left: trigger + date + location */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <SidebarTrigger className={iconBtn} style={iconBtnStyle} />

        <div className="space-y-0.5 min-w-0 flex-1">
          <div
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            <Calendar style={{ ...iconSize, color: 'var(--text-muted)' }} />
            <span className="hidden sm:inline">{dateLabel}</span>
            <span className="sm:hidden">{dateLabelShort}</span>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--battery)' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--battery)] animate-pulse shrink-0" />
            Live simulation active
          </span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
        <SubscriptionBadge />

        {/* Get Recommendation */}
        {onRecommendationClick && (
          <button
            onClick={onRecommendationClick}
            className="h-9 sm:h-10 px-2.5 sm:px-4 rounded-xl flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap"
            style={{
              background: 'var(--battery)',
              color: '#fff',
              boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--battery-bright)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--battery)')}
          >
            <Target style={iconSize} />
            <span className="hidden md:inline">Recommend</span>
          </button>
        )}

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={iconBtn}
              style={iconBtnStyle}
              aria-label={`Notifications (${effectiveNotificationCount})`}
            >
              <Bell style={iconSize} />
              {effectiveNotificationCount > 0 && (
                <Badge
                  className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[9px] sm:text-[10px] font-bold rounded-full border-2"
                  style={{
                    background: 'var(--alert)',
                    color: '#fff',
                    borderColor: 'var(--bg-secondary)',
                  }}
                >
                  {effectiveNotificationCount > 9 ? '9+' : effectiveNotificationCount}
                </Badge>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-80 rounded-xl"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              padding: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}
          >
            {/* Notification header row */}
            <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</p>
              {unreadNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--battery)' }}
                  className="hover:opacity-80 whitespace-nowrap"
                >
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>No notifications yet.</p>
            ) : unreadNotifications.length === 0 ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>All caught up.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {unreadNotifications.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    style={{
                      background: 'var(--bg-card-muted)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                    }}
                  >
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {item.title}
                    </p>
                    <p style={{ marginTop: '3px', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {item.description}
                    </p>
                    {/* Action row — always horizontal */}
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {item.actionLabel && item.onAction && (
                        <button
                          type="button"
                          onClick={() => { item.onAction?.(); markAsRead(item.id); }}
                          style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--battery)', whiteSpace: 'nowrap' }}
                          className="hover:opacity-80"
                        >
                          {item.actionLabel}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => markAsRead(item.id)}
                        style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}
                        className="hover:opacity-80"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Reset */}
        <button
          className={iconBtn}
          style={iconBtnStyle}
          onClick={onReset}
          aria-label="Reset dashboard"
        >
          <RotateCcw style={iconSize} />
        </button>
      </div>
    </header>
  );
}
