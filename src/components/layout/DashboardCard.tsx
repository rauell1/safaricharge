'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  spacing?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'outlined';
}

const spacingMap = {
  sm: 'p-3 md:p-4',
  md: 'p-4 md:p-6',
  lg: 'p-6 md:p-8',
};

/**
 * DashboardCard
 * 
 * Improved card component for dashboard sections with consistent spacing,
 * optional header with title and icon, and action area support.
 */
export function DashboardCard({
  children,
  className,
  title,
  icon,
  headerAction,
  spacing = 'md',
  variant = 'default',
}: DashboardCardProps) {
  const variantClasses = {
    default: 'bg-[var(--bg-card)] border border-[var(--border)]',
    compact: 'bg-[var(--bg-card-muted)] border-0',
    outlined: 'bg-transparent border border-[var(--border)] border-dashed',
  };

  return (
    <Card className={cn(
      'dashboard-card rounded-2xl transition-all duration-150',
      variantClasses[variant],
      className
    )}>
      {(title || icon || headerAction) && (
        <CardHeader className={cn(
          'flex flex-row items-center justify-between gap-3',
          spacing === 'sm' ? 'pb-2' : spacing === 'md' ? 'pb-3' : 'pb-4'
        )}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {icon && (
              <div className="text-[var(--battery)] flex-shrink-0">
                {icon}
              </div>
            )}
            {title && (
              <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {title}
              </h3>
            )}
          </div>
          {headerAction && (
            <div className="flex-shrink-0">
              {headerAction}
            </div>
          )}
        </CardHeader>
      )}
      <CardContent className={spacingMap[spacing]}>
        {children}
      </CardContent>
    </Card>
  );
}

interface DashboardGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const gapMap = {
  sm: 'gap-3 md:gap-4',
  md: 'gap-4 md:gap-6',
  lg: 'gap-6 md:gap-8',
};

const columnMap = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

/**
 * DashboardGrid
 * 
 * Responsive grid layout for dashboard cards with consistent spacing.
 */
export function DashboardGrid({
  children,
  columns = 2,
  gap = 'md',
  className,
}: DashboardGridProps) {
  return (
    <div className={cn(
      'grid',
      columnMap[columns],
      gapMap[gap],
      className
    )}>
      {children}
    </div>
  );
}
