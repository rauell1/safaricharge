'use client';

import React, { useState } from 'react';
import { Calendar, Bell, Filter, Download, RotateCcw, MapPin, Target, BookmarkPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  notificationCount = 0
}: DashboardHeaderProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState('');

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSave = () => {
    const name = scenarioName.trim() || `Scenario ${new Date().toLocaleString()}`;
    onSaveScenario?.(name);
    setScenarioName('');
    setSaveDialogOpen(false);
  };

  return (
    <>
      {/* Save Scenario Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)]">
          <DialogHeader>
            <DialogTitle>Save Scenario</DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              Save the current system configuration and KPI snapshot for comparison later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="scenario-name" className="text-[var(--text-secondary)] text-sm mb-1 block">
              Scenario name
            </Label>
            <Input
              id="scenario-name"
              placeholder="e.g. 10 kW PV + 50 kWh Battery"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="bg-[var(--bg-card-muted)] border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[var(--battery)] text-white hover:bg-[var(--battery-bright)]"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(15,23,42,0.88))] backdrop-blur-lg supports-[backdrop-filter]:bg-[rgba(15,23,42,0.9)] shadow-sm">
      <div className="flex h-auto items-start justify-between gap-4 px-4 py-3 md:h-[84px] md:px-6 md:py-0 flex-wrap md:flex-nowrap">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <SidebarTrigger className="h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-xl border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]" />
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 text-sm md:text-base font-semibold text-[var(--text-primary)]">
              <Calendar className="h-4 w-4 md:h-4.5 md:w-4.5 text-[var(--text-tertiary)]" />
              <span className="hidden sm:inline">{formatDate(currentDate)}</span>
              <span className="sm:hidden">{currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--solar)]/20 bg-[var(--solar-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--solar)]">
                <MapPin className="h-3.5 w-3.5" />
                <button
                  onClick={onLocationClick}
                  className="hover:text-[var(--solar-bright)] transition-colors duration-200 hover:underline underline-offset-2"
                  aria-label={`Change location from ${locationName}`}
                >
                  {locationName}
                </button>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Get Recommendations Button */}
          {onRecommendationClick && (
            <Button
              onClick={onRecommendationClick}
              className="h-9 md:h-10 px-3 md:px-5 rounded-full bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold shadow-lg transition-all duration-200 hover:from-emerald-700 hover:to-green-700 hover:shadow-glow-energy"
              aria-label="Get system recommendations"
            >
              <Target className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Get Recommendation</span>
              <span className="md:hidden">Recommend</span>
            </Button>
          )}

          {/* Filters - Hidden on mobile */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative hidden h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] sm:flex md:h-10 md:w-10"
                aria-label="Open filters"
              >
                <Filter className="h-4.5 w-4.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-[var(--bg-card)] border-[var(--border)] rounded-xl shadow-card animate-scale-in">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-[var(--text-primary)]">Filters</h4>
                <div className="text-sm text-[var(--text-secondary)]">
                  Filter options coming soon...
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] md:h-10 md:w-10"
                aria-label={`Notifications (${notificationCount} unread)`}
              >
                <Bell className="h-4.5 w-4.5" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-[var(--alert)] text-white text-[10px] font-bold rounded-full border-2 border-[var(--bg-secondary)] animate-scale-in">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-[var(--bg-card)] border-[var(--border)] rounded-xl shadow-card animate-scale-in">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-[var(--text-primary)]">Notifications</h4>
                <div className="text-sm text-[var(--text-secondary)]">
                  {notificationCount === 0 ? 'No new notifications' : `${notificationCount} new notification${notificationCount > 1 ? 's' : ''}`}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Download - Make more prominent */}
          <Button
            onClick={onDownload}
            className="h-9 md:h-10 px-3 md:px-5 rounded-full bg-[var(--battery)] text-white font-semibold shadow-md transition-all duration-200 hover:bg-[var(--battery-bright)] hover:shadow-glow-energy"
            aria-label="Export data"
          >
            <Download className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Export</span>
          </Button>

          {/* Save Scenario */}
          {onSaveScenario && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSaveDialogOpen(true)}
              className="h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--bg-card)] hover:text-[var(--solar)] md:h-10 md:w-10"
              aria-label="Save scenario"
              title="Save scenario"
            >
              <BookmarkPlus className="h-4.5 w-4.5" />
            </Button>
          )}

          {/* Reset */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            className="h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-secondary)] transition-all duration-200 hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] md:h-10 md:w-10"
            aria-label="Reset dashboard"
          >
            <RotateCcw className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>
    </header>
    </>
  );
}
