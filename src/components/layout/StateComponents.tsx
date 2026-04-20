'use client';

import React from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

/**
 * EmptyState
 * 
 * Consistent empty state display across dashboard pages when no data is available.
 */
export function EmptyState({
  title,
  description,
  icon = <Inbox className="h-12 w-12 text-[var(--text-tertiary)]" />,
  action,
}: EmptyStateProps) {
  return (
    <Card className="dashboard-card border border-dashed border-[var(--border)]">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="mb-4">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm">
            {description}
          </p>
        )}
        {action && (
          <div className="mt-4">
            {action}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  action?: React.ReactNode;
}

/**
 * ErrorState
 * 
 * Consistent error display for failed operations or data loading errors.
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
}: ErrorStateProps) {
  return (
    <Card className="dashboard-card border border-[var(--alert)] bg-[var(--alert-soft)]">
      <CardContent className="flex gap-4 py-4 px-6">
        <div className="flex-shrink-0">
          <AlertCircle className="h-6 w-6 text-[var(--alert)]" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-[var(--text-primary)] mb-1">
            {title}
          </h4>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            {message}
          </p>
          {action && (
            <div className="mt-3">
              {action}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface LoadingStateProps {
  title?: string;
  description?: string;
}

/**
 * LoadingState
 * 
 * Consistent loading indicator for asynchronous operations.
 */
export function LoadingState({
  title = 'Loading',
  description,
}: LoadingStateProps) {
  return (
    <Card className="dashboard-card">
      <CardContent className="flex flex-col items-center justify-center py-12 px-6">
        <div className="mb-4 animate-spin">
          <Loader2 className="h-8 w-8 text-[var(--battery)]" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface SkeletonProps {
  count?: number;
  className?: string;
}

/**
 * SkeletonLoader
 * 
 * Placeholder loading animation for cards and content.
 */
export function SkeletonLoader({ count = 3, className = '' }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className={`dashboard-card ${className}`}>
          <CardContent className="py-4 px-6">
            <div className="space-y-3">
              <div className="h-4 w-3/4 rounded bg-[var(--bg-card-muted)] animate-pulse" />
              <div className="h-8 w-full rounded bg-[var(--bg-card-muted)] animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-[var(--bg-card-muted)] animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'solar' | 'battery' | 'grid' | 'consumption';
}

/**
 * ProgressBar
 * 
 * Visual progress indicator with optional label and percentage.
 * Note: Dynamic width styling uses inline styles which are necessary for progress bars.
 */
export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  color = 'battery',
}: ProgressBarProps) {
  const percentage = Math.round((value / max) * 100);
  const colorMap = {
    solar: 'bg-[var(--solar)]',
    battery: 'bg-[var(--battery)]',
    grid: 'bg-[var(--grid)]',
    consumption: 'bg-[var(--consumption)]',
  };

  return (
    <div className="space-y-2">
      {(label || showPercentage) && (
        <div className="flex justify-between items-center">
          {label && (
            <span className="text-sm font-semibold text-[var(--text-secondary)]">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm font-bold text-[var(--text-primary)]">
              {percentage}%
            </span>
          )}
        </div>
      )}
      <div className="h-2 bg-[var(--bg-card-muted)] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${colorMap[color]}`}
          style={{ width: `${percentage}%` } as React.CSSProperties}
        />
      </div>
    </div>
  );
}
