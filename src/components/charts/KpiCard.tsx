'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkline } from '@/components/widgets/Sparkline';

export interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  sparklineData?: number[];
  color?: string;
}

export function KpiCard({
  label,
  value,
  unit,
  trend,
  sparklineData,
  color = 'var(--battery)',
}: KpiCardProps) {
  const hasTrend = trend !== undefined && trend !== null;
  const isUp = (trend ?? 0) >= 0;

  return (
    <Card className="dashboard-card overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-1.5 truncate">
              {label}
            </p>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">
                {typeof value === 'number' ? value.toLocaleString() : value}
              </span>
              {unit && (
                <span className="text-xs text-[var(--text-tertiary)]">{unit}</span>
              )}
            </div>
            {hasTrend && (
              <div
                className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${
                  isUp ? 'text-[var(--battery)]' : 'text-[var(--alert)]'
                }`}
              >
                {isUp ? (
                  <TrendingUp className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-3 w-3" aria-hidden="true" />
                )}
                <span>
                  {isUp ? '+' : ''}
                  {(trend ?? 0).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          {sparklineData && sparklineData.length >= 2 && (
            <Sparkline data={sparklineData} color={color} height={28} width={56} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
