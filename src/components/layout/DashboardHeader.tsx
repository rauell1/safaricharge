'use client';

import React, { useState } from 'react';
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

interface DashboardHeaderProps {
  currentDate: Date;
  onReset?: () => void;
  onLocationClick?: () => void;
  onRecommendationClick?: () => void;
  onDownload?: () => void;
  onSaveScenario?: (name: string) => void;
  locationName?: string;
  notificationCount?: number;
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
}: DashboardHeaderProps) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState('');

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
        <div className="flex items-center gap-3 min-w-0">
          <SidebarTrigger
            className={iconBtn}
            style={iconBtnStyle}
          />
          <div className="space-y-1 min-w-0">
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
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold cursor-pointer"
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
              {locationName}
            </span>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
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
                aria-label={`Notifications (${notificationCount})`}
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold rounded-full border-2"
                    style={{
                      background: 'var(--alert)',
                      color: '#fff',
                      borderColor: 'var(--bg-secondary)',
                    }}
                  >
                    {notificationCount > 9 ? '9+' : notificationCount}
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
              <p className="text-sm font-semibold mb-1">Notifications</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {notificationCount === 0
                  ? 'No new notifications'
                  : `${notificationCount} new notification${notificationCount > 1 ? 's' : ''}`}
              </p>
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
