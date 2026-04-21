'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Bell,
  Filter,
  Download,
  RotateCcw,
  MapPin,
  Target,
  BookmarkPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SubscriptionBadge } from '@/components/SubscriptionBadge';
import { ThemeToggle } from '@/components/theme-toggle';

interface DashboardHeaderProps {
  currentDate: Date;
  onReset?: () => void;
  onLocationClick?: () => void;
  onRecommendationClick?: () => void;
  onDownload?: () => void;
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
  onDownload,
  onSaveScenario,
  locationName = 'Nairobi',
  notificationCount = 0,
  notifications = [],
}: DashboardHeaderProps) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

  const dateLabel = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dateLabelShort = currentDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleSave = () => {
    const name = scenarioName.trim() || `Scenario ${new Date().toLocaleString()}`;
    onSaveScenario?.(name);
    setScenarioName('');
    setSaveOpen(false);
  };

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

  /* ── shared icon-button class ── */
  const iconBtn =
    'relative h-9 w-9 md:h-10 md:w-10 rounded-xl transition-all duration-150 flex items-center justify-center';
  const iconBtnStyle = {
    background: 'var(--bg-card-muted)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
  };

  return (
    <>
      {/* Save dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          <DialogHeader>
            <DialogTitle>Save Scenario</DialogTitle>
            <DialogDescription style={{ color: 'var(--text-secondary)' }}>
              Save the current configuration and KPI snapshot for later comparison.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label
              htmlFor="scenario-name"
              className="block text-sm mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Scenario name
            </Label>
            <Input
              id="scenario-name"
              placeholder="e.g. 10 kW PV + 50 kWh Battery"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              style={{
                background: 'var(--bg-card-muted)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              style={{ background: 'var(--battery)', color: '#fff' }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Header bar ── */}
      <header
        className="sticky top-0 z-40 w-full flex items-center justify-between gap-4 px-4 py-3 md:px-6 md:h-[72px] flex-wrap md:flex-nowrap backdrop-blur-md"
        style={{
          background: 'rgba(8,13,24,0.92)',
          borderBottom: '1px solid var(--border)',
          boxShadow: '0 1px 0 var(--border)',
        }}
      >
        {/* Left: trigger + date + location */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <SidebarTrigger
            className={iconBtn}
            style={iconBtnStyle}
          />
          <div className="space-y-1 min-w-0 flex-1">
            <div
              className="flex items-center gap-2 text-sm font-semibold truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              <Calendar
                className="h-4 w-4 shrink-0"
                style={{ color: 'var(--text-muted)' }}
              />
              <span className="hidden sm:inline">{dateLabel}</span>
              <span className="sm:hidden">{dateLabelShort}</span>
            </div>

            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer transition-all hover:opacity-80"
              style={{
                background: 'var(--solar-soft)',
                border: '1px solid rgba(245,158,11,0.20)',
                color: 'var(--solar)',
              }}
              onClick={onLocationClick}
              role="button"
              aria-label={`Change location: ${locationName}`}
            >
              <MapPin className="h-3 w-3" />
              <span className="truncate">{locationName}</span>
            </span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 md:gap-1 flex-wrap justify-end md:justify-start">
          <SubscriptionBadge />
          <ThemeToggle />

          {/* Get Recommendation */}
          {onRecommendationClick && (
            <button
              onClick={onRecommendationClick}
              className="h-9 md:h-10 px-3 md:px-4 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all"
              style={{
                background: 'var(--battery)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = 'var(--battery-bright)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = 'var(--battery)')
              }
            >
              <Target className="h-4 w-4" />
              <span className="hidden md:inline">Recommend</span>
            </button>
          )}

          <Link href="/sizing">
            <Button variant="outline" className="h-9 md:h-10">
              PV Sizing
            </Button>
          </Link>

          {/* Filters */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(iconBtn, 'hidden sm:flex')}
                style={iconBtnStyle}
                aria-label="Filters"
              >
                <Filter className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64 rounded-xl"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <p className="text-sm font-semibold mb-1">Filters</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Filter options coming soon.
              </p>
            </PopoverContent>
          </Popover>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={iconBtn}
                style={iconBtnStyle}
                aria-label={`Notifications (${effectiveNotificationCount})`}
              >
                <Bell className="h-4 w-4" />
                {effectiveNotificationCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold rounded-full border-2"
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
              className="w-80 rounded-xl"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Notifications</p>
                {unreadNotifications.length > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-[11px] font-medium text-[var(--battery)] hover:opacity-80"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  No notifications yet.
                </p>
              ) : unreadNotifications.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  You are all caught up.
                </p>
              ) : (
                <div className="space-y-2">
                  {unreadNotifications.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2"
                    >
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                        {item.description}
                      </p>
                      {(item.actionLabel || true) && (
                        <div className="mt-2 flex items-center gap-2">
                          {item.actionLabel && item.onAction && (
                            <button
                              type="button"
                              onClick={() => {
                                item.onAction?.();
                                markAsRead(item.id);
                              }}
                              className="text-[11px] font-medium text-[var(--battery)] hover:opacity-80"
                            >
                              {item.actionLabel}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => markAsRead(item.id)}
                            className="text-[11px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Export */}
          <button
            onClick={onDownload}
            className="h-9 md:h-10 px-3 md:px-4 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
            }}
            aria-label="Export data"
          >
            <Download className="h-4 w-4" />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* Save Scenario */}
          {onSaveScenario && (
            <button
              className={iconBtn}
              style={iconBtnStyle}
              onClick={() => setSaveOpen(true)}
              aria-label="Save scenario"
            >
              <BookmarkPlus className="h-4 w-4" />
            </button>
          )}

          {/* Reset */}
          <button
            className={iconBtn}
            style={iconBtnStyle}
            onClick={onReset}
            aria-label="Reset dashboard"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </header>
    </>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
