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
  /** @deprecated -  Save Scenario has moved to the Scenarios page. This prop is kept for compatibility but is no longer used. */
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

const iconBtnCls =
  'relative flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-md ' +
  'border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-secondary)] ' +
  'transition-all duration-150 hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]';

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

  return (
    <header className="sticky top-0 z-40 flex w-full flex-nowrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--nav-bg)] px-3 py-2.5 backdrop-blur-md sm:gap-4 sm:px-4 sm:py-3 md:h-[68px] md:px-6">
      {/* Left: trigger + date + location */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <SidebarTrigger className={iconBtnCls} />

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-1.5 truncate text-xs font-semibold text-[var(--text-primary)] sm:text-sm">
            <Calendar className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <span className="hidden sm:inline">{dateLabel}</span>
            <span className="sm:hidden">{dateLabelShort}</span>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--battery)]">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--battery)]" />
            Live simulation active
          </span>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex flex-nowrap items-center gap-1.5 sm:gap-2">
        <SubscriptionBadge />

        {/* Get Recommendation */}
        {onRecommendationClick && (
          <button
            onClick={onRecommendationClick}
            className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[var(--battery-bright)] px-2.5 text-xs font-semibold text-white shadow-[0_1px_2px_rgba(4,120,87,0.35),0_0_0_1px_rgba(4,120,87,0.12)] transition-all duration-200 hover:bg-[var(--battery)] hover:shadow-[0_4px_12px_rgba(4,120,87,0.25)] sm:h-10 sm:gap-2 sm:px-4 sm:text-sm"
          >
            <Target className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Recommend</span>
          </button>
        )}

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={iconBtnCls}
              aria-label={`Notifications (${effectiveNotificationCount})`}
            >
              <Bell className="h-4 w-4 shrink-0" />
              {effectiveNotificationCount > 0 && (
                <Badge className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--bg-secondary)] bg-[var(--alert)] p-0 text-[9px] font-bold text-white sm:h-5 sm:w-5 sm:text-[10px]">
                  {effectiveNotificationCount > 9 ? '9+' : effectiveNotificationCount}
                </Badge>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-80 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-[var(--text-primary)] shadow-[var(--card-shadow-hover)]"
          >
            {/* Notification header row */}
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Notifications</p>
              {unreadNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="whitespace-nowrap text-[11px] font-medium text-[var(--battery)] hover:opacity-80"
                >
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-[13px] text-[var(--text-secondary)]">No notifications yet.</p>
            ) : unreadNotifications.length === 0 ? (
              <p className="text-[13px] text-[var(--text-secondary)]">All caught up.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {unreadNotifications.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2.5"
                  >
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-normal text-[var(--text-secondary)]">
                      {item.description}
                    </p>
                    {/* Action row -  always horizontal */}
                    <div className="mt-2 flex items-center gap-2.5">
                      {item.actionLabel && item.onAction && (
                        <button
                          type="button"
                          onClick={() => { item.onAction?.(); markAsRead(item.id); }}
                          className="whitespace-nowrap text-[11px] font-medium text-[var(--battery)] hover:opacity-80"
                        >
                          {item.actionLabel}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => markAsRead(item.id)}
                        className="whitespace-nowrap text-[11px] font-medium text-[var(--text-tertiary)] hover:opacity-80"
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
          className={iconBtnCls}
          onClick={onReset}
          aria-label="Reset dashboard"
        >
          <RotateCcw className="h-4 w-4 shrink-0" />
        </button>
      </div>
    </header>
  );
}
