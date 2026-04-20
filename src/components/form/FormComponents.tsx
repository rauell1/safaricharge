'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface FormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
  unit?: string;
  showLabel?: boolean;
}

/**
 * FormInput
 * 
 * Improved form input with optional label, description, and error display.
 * Provides consistent styling across dashboard forms.
 */
export function FormInput({
  label,
  description,
  error,
  unit,
  showLabel = true,
  className,
  ...props
}: FormInputProps) {
  return (
    <div className="space-y-1.5">
      {showLabel && label && (
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-[var(--text-secondary)]">
            {label}
          </Label>
          {unit && (
            <span className="text-xs text-[var(--text-tertiary)]">
              {unit}
            </span>
          )}
        </div>
      )}
      <Input
        className={cn(
          'rounded-lg bg-[var(--bg-card-muted)] border border-[var(--border)] text-[var(--text-primary)]',
          'transition-colors duration-150',
          'focus:border-[var(--battery)] focus:ring-1 focus:ring-[var(--battery)]/30',
          error && 'border-[var(--alert)] focus:border-[var(--alert)]',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs font-medium text-[var(--alert)]">
          {error}
        </p>
      )}
      {description && !error && (
        <p className="text-xs text-[var(--text-tertiary)]">
          {description}
        </p>
      )}
    </div>
  );
}

interface FormRangeProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  description?: string;
}

/**
 * FormRange
 * 
 * Improved range slider with label, value display, and description.
 */
export function FormRange({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit = '',
  description,
  className,
  ...props
}: FormRangeProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-[var(--text-secondary)]">
          {label}
        </Label>
        <div className="text-xs font-bold tabular-nums text-[var(--text-primary)]">
          {value.toLocaleString()}{unit}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          'w-full h-2 bg-[var(--bg-card-muted)] rounded-full cursor-pointer',
          'accent-[var(--battery)]',
          'hover:accent-[var(--battery-bright)]',
          'transition-colors duration-150',
          className
        )}
        {...props}
      />
      {description && (
        <p className="text-xs text-[var(--text-tertiary)]">
          {description}
        </p>
      )}
    </div>
  );
}

interface FormGroupProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

const gapMap = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
};

const columnMap = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
};

/**
 * FormGroup
 * 
 * Grid wrapper for form inputs with responsive columns.
 */
export function FormGroup({
  children,
  columns = 1,
  gap = 'md',
  className,
}: FormGroupProps) {
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

interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * FormSection
 * 
 * Section wrapper for logically grouped form fields.
 */
export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="pb-3 border-b border-[var(--border)]">
          {title && (
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {title}
            </h4>
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
