'use client';

import React from 'react';
import { Calendar, Bell, Filter, Download, RotateCcw, MapPin, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface DashboardHeaderProps {
  currentDate: Date;
  onReset?: () => void;
  onLocationClick?: () => void;
  onRecommendationClick?: () => void;
  onDownload?: () => void;
  locationName?: string;
  notificationCount?: number;
}

export function DashboardHeader({
  currentDate,
  onReset,
  onLocationClick,
  onRecommendationClick,
  onDownload,
  locationName = 'Nairobi',
  notificationCount = 0
}: DashboardHeaderProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--bg-secondary)]/95 backdrop-blur-lg supports-[backdrop-filter]:bg-[var(--bg-secondary)]/85 shadow-sm">
      <div className="flex h-auto md:h-20 items-center justify-between px-4 md:px-6 py-3 md:py-0 gap-3 flex-wrap md:flex-nowrap">
        <div className="flex items-center gap-3 md:gap-4">
          <SidebarTrigger className="h-9 w-9 md:h-10 md:w-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-all duration-200" />
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm md:text-base font-semibold text-[var(--text-primary)]">
              <Calendar className="h-4 w-4 md:h-4.5 md:w-4.5 text-[var(--text-secondary)]" />
              <span className="hidden sm:inline">{formatDate(currentDate)}</span>
              <span className="sm:hidden">{currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[var(--solar)]" />
              <button
                onClick={onLocationClick}
                className="text-sm font-medium text-[var(--solar)] hover:text-[var(--solar-bright)] transition-colors duration-200 hover:underline underline-offset-2"
                aria-label={`Change location from ${locationName}`}
              >
                {locationName}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Get Recommendations Button */}
          {onRecommendationClick && (
            <Button
              onClick={onRecommendationClick}
              className="h-9 md:h-10 px-3 md:px-5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-glow-energy transition-all duration-200 text-sm rounded-lg"
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
                className="relative h-9 w-9 md:h-10 md:w-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] hidden sm:flex rounded-lg transition-all duration-200"
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
                className="relative h-9 w-9 md:h-10 md:w-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-all duration-200"
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
            className="h-9 md:h-10 px-3 md:px-5 bg-[var(--battery)] hover:bg-[var(--battery-bright)] text-white font-semibold shadow-md hover:shadow-glow-energy transition-all duration-200 text-sm rounded-lg"
            aria-label="Export data"
          >
            <Download className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Export</span>
          </Button>

          {/* Reset */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            className="h-9 w-9 md:h-10 md:w-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-all duration-200"
            aria-label="Reset dashboard"
          >
            <RotateCcw className="h-4.5 w-4.5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
