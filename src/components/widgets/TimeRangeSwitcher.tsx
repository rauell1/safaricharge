'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimeRangeSwitcherProps {
  selectedRange: 'today' | 'week' | 'month' | 'year' | 'all';
  onRangeChange: (range: 'today' | 'week' | 'month' | 'year' | 'all') => void;
}

export function TimeRangeSwitcher({ selectedRange, onRangeChange }: TimeRangeSwitcherProps) {
  const ranges = [
    { id: 'today' as const, label: 'Today' },
    { id: 'week' as const, label: 'Week' },
    { id: 'month' as const, label: 'Month' },
    { id: 'year' as const, label: 'Year' },
  ];

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-1">
      <div className="flex items-center gap-2 px-2">
        <Calendar className="h-4 w-4 text-[var(--text-tertiary)]" />
        <span className="text-sm font-medium text-[var(--text-secondary)]">Time Range:</span>
      </div>
      <div className="flex gap-1">
        {ranges.map((range) => (
          <Button
            key={range.id}
            variant={selectedRange === range.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onRangeChange(range.id)}
            className={`text-xs transition-all duration-200 ${
              selectedRange === range.id
                ? 'bg-[var(--battery)] hover:bg-[var(--battery-bright)] text-white'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)]'
            }`}
          >
            {range.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
