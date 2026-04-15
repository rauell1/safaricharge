'use client';

// Feature flag: ENABLE_GRID_STABILITY_WIDGET
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RadioTower } from 'lucide-react';

export interface GridStabilityWidgetProps {
  frequencyHz?: number;
  stabilityRisk?: 'low' | 'medium' | 'high';
  gridMode?: 'forming' | 'following';
  isLive?: boolean;
}

const riskClass: Record<NonNullable<GridStabilityWidgetProps['stabilityRisk']>, string> = {
  low: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  high: 'text-red-600 bg-red-50',
};

const riskLabel: Record<NonNullable<GridStabilityWidgetProps['stabilityRisk']>, string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
};

export function GridStabilityWidget({
  frequencyHz,
  stabilityRisk,
  gridMode,
  isLive = false,
}: GridStabilityWidgetProps) {
  // TODO: integrate Kenya Power grid feed
  const chartData = useMemo(() => {
    const base = frequencyHz ?? 50;
    return Array.from({ length: 10 }, (_, i) => ({
      t: `${i}`,
      hz: Number((base + Math.sin(i / 2) * 0.09).toFixed(3)),
    }));
  }, [frequencyHz]);

  if (!isLive || frequencyHz === undefined || !stabilityRisk || !gridMode) {
    return (
      <Card className="dashboard-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
            <RadioTower className="h-4 w-4 text-[var(--grid)]" />
            Grid Stability
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-base text-[var(--text-secondary)]">
            Grid data integration pending — Awaiting Kenya Power API
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
          <RadioTower className="h-4 w-4 text-[var(--grid)]" />
          Grid Stability
          <Badge className={`ml-auto border-0 ${riskClass[stabilityRisk]}`}>{riskLabel[stabilityRisk]}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="text-sm font-medium text-muted-foreground">Grid mode</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {gridMode === 'forming' ? 'Grid-forming' : 'Grid-following'}
            </div>
          </div>
          <div className="space-y-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="text-sm font-medium text-muted-foreground">Frequency</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{frequencyHz.toFixed(2)} Hz</div>
          </div>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="t" hide />
              <YAxis domain={[49.5, 50.5]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <ReferenceLine y={50} stroke="var(--text-secondary)" strokeDasharray="5 5" />
              <ReferenceLine y={49.8} stroke="var(--border)" strokeDasharray="3 4" />
              <ReferenceLine y={50.2} stroke="var(--border)" strokeDasharray="3 4" />
              <Line dataKey="hz" stroke="var(--grid)" strokeWidth={2} dot={false} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
