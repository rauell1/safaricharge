'use client';

import React from 'react';
import { Calendar, Bell, Filter, Download, RotateCcw, MapPin } from 'lucide-react';
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
  onDownload?: () => void;
  locationName?: string;
  notificationCount?: number;
}

export function DashboardHeader({
  currentDate,
  onReset,
  onLocationClick,
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
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--bg-secondary)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-secondary)]/80">
      <div className="flex h-auto md:h-20 items-center justify-between px-3 md:px-6 py-3 md:py-0 gap-3 flex-wrap md:flex-nowrap">
        <div className="flex items-center gap-2 md:gap-4">
          <SidebarTrigger className="h-8 w-8 md:h-10 md:w-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-md" />
          <div>
            <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-[var(--text-primary)]">
              <Calendar className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">{formatDate(currentDate)}</span>
              <span className="sm:hidden">{currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5 text-[var(--solar)]" />
              <button
                onClick={onLocationClick}
                className="text-xs md:text-sm text-[var(--solar)] hover:text-[var(--solar)]/80 transition-colors font-medium"
              >
                {locationName}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Filters - Hidden on mobile */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 md:h-10 md:w-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] hidden sm:flex"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-[var(--bg-card)] border-[var(--border)]">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-[var(--text-primary)]">Filters</h4>
                <div className="text-xs text-[var(--text-secondary)]">
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
                className="relative h-8 w-8 md:h-10 md:w-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-[var(--alert)] text-white text-[10px]">
                    {notificationCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-[var(--bg-card)] border-[var(--border)]">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-[var(--text-primary)]">Notifications</h4>
                <div className="text-xs text-[var(--text-secondary)]">
                  {notificationCount === 0 ? 'No new notifications' : `${notificationCount} new notifications`}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Download - Make more prominent */}
          <Button
            onClick={onDownload}
            className="h-8 md:h-10 px-3 md:px-4 bg-[var(--battery)] hover:bg-[var(--battery)]/90 text-white font-medium shadow-glow-energy transition-all text-xs md:text-sm"
          >
            <Download className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden md:inline">Export</span>
          </Button>

          {/* Reset */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            className="h-8 w-8 md:h-10 md:w-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
