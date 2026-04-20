'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'sm' | 'md' | 'lg';
}

const maxWidthMap = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-5xl',
  xl: 'max-w-6xl',
  '2xl': 'max-w-7xl',
  'full': 'max-w-full',
};

const paddingMap = {
  sm: 'px-4 py-4 md:px-6 md:py-6',
  md: 'px-4 py-6 md:px-8 md:py-8',
  lg: 'px-6 py-8 md:px-12 md:py-12',
};

/**
 * PageContainer
 * 
 * Provides consistent page layout with proper spacing, max-width constraints,
 * and responsive padding. Used across all dashboard pages for visual consistency.
 */
export function PageContainer({
  children,
  className,
  maxWidth = 'lg',
  padding = 'md',
}: PageContainerProps) {
  return (
    <main className={cn(
      'flex-1 overflow-y-auto w-full',
      paddingMap[padding],
      'mx-auto',
      maxWidthMap[maxWidth],
      className
    )}>
      {children}
    </main>
  );
}

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * SectionHeader
 * 
 * Provides consistent header styling for page sections with title, optional
 * description, and actions area. Improves visual hierarchy across all pages.
 */
export function SectionHeader({
  title,
  description,
  actions,
  icon,
}: SectionHeaderProps) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 mb-2">
          {icon && (
            <div className="text-[var(--battery)]">
              {icon}
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
            {title}
          </h1>
        </div>
        {description && (
          <p className="text-base text-[var(--text-secondary)] mt-2">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap justify-end md:justify-start">
          {actions}
        </div>
      )}
    </div>
  );
}

interface ContentGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const gapMap = {
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
};

const columnMap = {
  1: 'grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-2 lg:grid-cols-3',
  4: 'md:grid-cols-2 lg:grid-cols-4',
};

/**
 * ContentGrid
 * 
 * Responsive grid layout for dashboard content with consistent spacing.
 * Automatically handles responsive column layout.
 */
export function ContentGrid({
  children,
  columns = 3,
  gap = 'md',
  className,
}: ContentGridProps) {
  return (
    <div className={cn(
      'grid grid-cols-1',
      columnMap[columns],
      gapMap[gap],
      className
    )}>
      {children}
    </div>
  );
}

interface FormSectionProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

/**
 * FormSection
 * 
 * Organizes form inputs into logical sections with optional title and description.
 * Improves form visual hierarchy and readability.
 */
export function FormSection({
  children,
  title,
  description,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="pb-3 border-b border-[var(--border)]">
          {title && (
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}
