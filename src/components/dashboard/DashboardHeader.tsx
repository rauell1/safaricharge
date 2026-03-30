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
      <div className="flex h-20 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="h-10 w-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-md" />
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(currentDate)}</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <MapPin className="h-3.5 w-3.5 text-[var(--solar)]" />
              <button
                onClick={onLocationClick}
                className="text-sm text-[var(--solar)] hover:text-[var(--solar)]/80 transition-colors font-medium"
              >
                {locationName}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
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
                className="relative h-10 w-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
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
            className="h-10 px-4 bg-[var(--battery)] hover:bg-[var(--battery)]/90 text-white font-medium shadow-glow-energy transition-all"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>

          {/* Reset */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            className="h-10 w-10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
