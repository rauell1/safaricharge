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
    <header className="sticky top-0 z-40 w-full border-b border-dark-border bg-secondary-900/95 backdrop-blur supports-[backdrop-filter]:bg-secondary-900/80">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="h-9 w-9 text-dark-text-secondary hover:text-dark-text-primary hover:bg-secondary-800 rounded-md" />
          <div>
            <div className="flex items-center gap-2 text-sm text-dark-text-secondary">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(currentDate)}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="h-3 w-3 text-accent-info" />
              <button
                onClick={onLocationClick}
                className="text-xs text-accent-info hover:text-accent-info/80 transition-colors"
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
                className="relative h-9 w-9 text-dark-text-secondary hover:text-dark-text-primary hover:bg-secondary-800"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-secondary-900 border-dark-border">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-dark-text-primary">Filters</h4>
                <div className="text-xs text-dark-text-secondary">
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
                className="relative h-9 w-9 text-dark-text-secondary hover:text-dark-text-primary hover:bg-secondary-800"
              >
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-accent-alert text-white text-[10px]">
                    {notificationCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-secondary-900 border-dark-border">
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-dark-text-primary">Notifications</h4>
                <div className="text-xs text-dark-text-secondary">
                  {notificationCount === 0 ? 'No new notifications' : `${notificationCount} new notifications`}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Download */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onDownload}
            className="h-9 w-9 text-dark-text-secondary hover:text-dark-text-primary hover:bg-secondary-800"
          >
            <Download className="h-4 w-4" />
          </Button>

          {/* Reset */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            className="h-9 w-9 text-dark-text-secondary hover:text-dark-text-primary hover:bg-secondary-800"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
