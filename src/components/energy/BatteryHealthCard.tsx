'use client';

import React from 'react';
import { Battery, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkline } from './Sparkline';

export type BatteryInsight = {
  score: number;
  drop: number;
  scoreDelta: number;
  severity: 'normal' | 'warning' | 'critical';
  cause?: string;
  confidence?: number;
  recommendation?: string;
  impact?: string;
  trendData?: number[];
};

interface BatteryHealthCardProps {
  insight: BatteryInsight;
  showSoCBands?: boolean;
  currentSoc?: number;
  minSoCBand?: number;
  maxSoCBand?: number;
}

const severityStyle: Record<BatteryInsight['severity'], string> = {
  normal: 'text-[var(--battery)]',
  warning: 'text-[var(--solar)]',
  critical: 'text-[var(--alert)]',
};

const severityLabel: Record<BatteryInsight['severity'], string> = {
  normal: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
};

export function BatteryHealthCard({
  insight,
  showSoCBands = false,
  currentSoc = 50,
  minSoCBand = 20,
  maxSoCBand = 90,
}: BatteryHealthCardProps) {
  const confidenceLabel =
    insight.confidence === undefined
      ? 'Unknown'
      : insight.confidence > 0.7
        ? 'High'
        : insight.confidence > 0.5
          ? 'Medium'
          : 'Low';

  const dots = insight.confidence === undefined ? 0 : Math.max(1, Math.round(insight.confidence * 5));
  const scoreColor = insight.score >= 80 ? 'var(--battery)' : insight.score >= 60 ? 'var(--solar)' : 'var(--alert)';
  const hasTrend = Boolean(insight.trendData && insight.trendData.length >= 2);

  return (
    <Card className="dashboard-card rounded-[24px]">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
          <Battery className="h-5 w-5 text-[var(--battery)]" />
          Battery Health
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold" style={{ color: scoreColor }}>
              {insight.score}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">/ 100</span>
          </div>
          <div
            className={`flex items-center gap-1 text-xs font-semibold ${
              insight.scoreDelta < 0
                ? 'text-[var(--alert)]'
                : insight.scoreDelta > 0
                  ? 'text-[var(--battery)]'
                  : 'text-[var(--text-secondary)]'
            }`}
          >
            {insight.scoreDelta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {insight.scoreDelta === 0 ? '0 today' : `${insight.scoreDelta > 0 ? '+' : ''}${insight.scoreDelta.toFixed(0)} today`}
          </div>
        </div>
        {insight.drop > 0 && <div className="text-sm text-[var(--text-secondary)] leading-relaxed">↓ {(insight.drop * 100).toFixed(0)}% efficiency drop today</div>}
        <div className={`font-semibold text-sm ${severityStyle[insight.severity]}`}>
          {severityLabel[insight.severity]}
        </div>
        {insight.cause && (
          <div className="text-sm text-[var(--text-primary)] leading-relaxed">
            <strong>Cause:</strong> {insight.cause}
          </div>
        )}
        <div className="text-sm flex flex-wrap items-center gap-2 text-[var(--text-primary)]">
          <strong>Confidence:</strong>
          <span>
            {'●'.repeat(dots)}
            {'○'.repeat(5 - dots)}
          </span>
          <span className="text-[var(--text-secondary)]">({confidenceLabel})</span>
        </div>
        {insight.recommendation && (
          <div className="text-sm text-[var(--text-primary)] leading-relaxed">
            <strong>Action:</strong> {insight.recommendation}
          </div>
        )}
        {insight.impact && (
          <div className="text-sm text-[var(--battery)] leading-relaxed">
            <strong>Impact:</strong> {insight.impact}
          </div>
        )}
        {hasTrend && (
          <div className="rounded-md border border-[var(--border)] p-2 bg-[var(--bg-secondary)]">
            <div className="text-[11px] mb-1 text-[var(--text-secondary)]">7-day Battery Health trend</div>
            <Sparkline data={insight.trendData ?? []} color="var(--battery)" width={180} height={38} />
          </div>
        )}
        {showSoCBands && (
          <div className="rounded-md border border-[var(--border)] p-3 bg-[var(--bg-secondary)] space-y-2">
            <div className="flex items-center justify-between text-sm font-medium text-muted-foreground">
              <span>SoC operational band</span>
              <span>{currentSoc.toFixed(0)}%</span>
            </div>
            <div className="relative h-2 rounded-full bg-[var(--bg-card-muted)]">
              <div
                className="absolute top-0 h-2 rounded-full bg-[var(--battery)]/30"
                style={{ left: `${minSoCBand}%`, width: `${Math.max(0, maxSoCBand - minSoCBand)}%` }}
              />
              <div
                className="absolute top-[-3px] h-3 w-1.5 rounded bg-[var(--battery)]"
                style={{ left: `calc(${Math.max(0, Math.min(100, currentSoc))}% - 3px)` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
              <span>{minSoCBand}% min</span>
              <span>{maxSoCBand}% max</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
