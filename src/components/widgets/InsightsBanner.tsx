'use client';

import React, { useMemo } from 'react';
import { TrendingUp, DollarSign, Sun, Battery, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface InsightsBannerProps {
  systemEfficiency: number;
  todaySavings: number;
  savingsChange: number;
  forecastChange: number;
  batteryOptimized: boolean;
  alertCount?: number;
}

interface InsightCardProps {
  icon: React.ReactNode;
  text: string;
  tone: 'positive' | 'neutral' | 'warning' | 'info';
}

function InsightCard({ icon, text, tone }: InsightCardProps) {
  const toneStyles = {
    positive: 'bg-[var(--battery-soft)] border-[var(--battery)]',
    neutral: 'bg-[var(--bg-card-muted)] border-[var(--border)]',
    warning: 'bg-[var(--alert-soft)] border-[var(--alert)]',
    info: 'bg-[var(--solar-soft)] border-[var(--solar)]',
  };

  const iconStyles = {
    positive: 'text-[var(--battery)]',
    neutral: 'text-[var(--text-secondary)]',
    warning: 'text-[var(--alert)]',
    info: 'text-[var(--solar)]',
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-200 hover:scale-[1.02] ${toneStyles[tone]}`}
    >
      <div className={`flex-shrink-0 ${iconStyles[tone]}`}>{icon}</div>
      <p className="text-sm font-medium text-[var(--text-primary)]">{text}</p>
    </div>
  );
}

export function InsightsBanner({
  systemEfficiency,
  todaySavings,
  savingsChange,
  forecastChange,
  batteryOptimized,
  alertCount = 0,
}: InsightsBannerProps) {
  const insights = useMemo(() => {
    const items: Array<{ icon: React.ReactNode; text: string; tone: 'positive' | 'neutral' | 'warning' | 'info' }> = [];

    if (systemEfficiency >= 85) {
      items.push({ icon: <TrendingUp className="h-5 w-5" />, text: `System operating at ${systemEfficiency.toFixed(0)}% efficiency today`, tone: 'positive' });
    } else if (systemEfficiency >= 70) {
      items.push({ icon: <TrendingUp className="h-5 w-5" />, text: `System efficiency at ${systemEfficiency.toFixed(0)}% - room for optimization`, tone: 'neutral' });
    } else {
      items.push({ icon: <AlertCircle className="h-5 w-5" />, text: `System efficiency at ${systemEfficiency.toFixed(0)}% - needs attention`, tone: 'warning' });
    }

    const savingsChangeText = savingsChange >= 0 ? `↑ ${savingsChange.toFixed(0)}% vs yesterday` : `↓ ${Math.abs(savingsChange).toFixed(0)}% vs yesterday`;
    items.push({ icon: <DollarSign className="h-5 w-5" />, text: `Estimated savings: KES ${todaySavings.toFixed(0)} ${savingsChangeText}`, tone: savingsChange >= 0 ? 'positive' : 'neutral' });

    if (Math.abs(forecastChange) >= 5) {
      const changeText = forecastChange > 0 ? `+${forecastChange.toFixed(0)}%` : `${forecastChange.toFixed(0)}%`;
      items.push({ icon: <Sun className="h-5 w-5" />, text: `Tomorrow forecast: ${changeText} solar generation expected`, tone: forecastChange > 0 ? 'info' : 'neutral' });
    }

    if (batteryOptimized) {
      items.push({ icon: <Battery className="h-5 w-5" />, text: 'Battery optimized for evening peak usage', tone: 'positive' });
    }

    if (alertCount > 0) {
      items.push({ icon: <AlertCircle className="h-5 w-5" />, text: `${alertCount} system alert${alertCount > 1 ? 's' : ''} require${alertCount === 1 ? 's' : ''} attention`, tone: 'warning' });
    }

    return items;
  }, [systemEfficiency, todaySavings, savingsChange, forecastChange, batteryOptimized, alertCount]);

  return (
    <Card className="dashboard-card border-l-4 border-l-[var(--battery)]">
      <CardContent className="py-4 px-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-5 w-5 text-[var(--battery)]" />
          <h3 className="text-base font-bold text-[var(--text-primary)]">System Insights</h3>
          <span className="text-xs text-[var(--text-tertiary)] ml-2">Real-time analysis and recommendations</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {insights.map((insight, index) => (
            <InsightCard key={index} {...insight} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
