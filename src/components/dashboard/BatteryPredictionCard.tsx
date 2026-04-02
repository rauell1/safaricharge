'use client';

import React from 'react';
import { BrainCircuit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export type BatteryPrediction = {
  risk: number;
  level: 'low' | 'medium' | 'high';
  trend: number;
  horizon: string;
  drivers: string[];
  recommendation: string;
  expectedOutcome: string;
};

interface BatteryPredictionCardProps {
  prediction?: BatteryPrediction;
}

export function BatteryPredictionCard({ prediction }: BatteryPredictionCardProps) {
  if (!prediction) return null;

  const colorClass =
    prediction.level === 'high'
      ? 'text-[var(--alert)]'
      : prediction.level === 'medium'
        ? 'text-[var(--solar)]'
        : 'text-[var(--battery)]';

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
          <BrainCircuit className="h-5 w-5 text-[var(--consumption)]" />
          Predictive Warning
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className={`text-sm font-semibold ${colorClass}`}>
          {prediction.level.toUpperCase()} risk ({prediction.horizon})
        </div>
        <div className="text-sm text-[var(--text-secondary)]">
          Probability: {(prediction.risk * 100).toFixed(0)}% • Trend: {prediction.trend >= 0 ? '+' : ''}
          {prediction.trend.toFixed(0)} pts (3-day)
        </div>
        {prediction.drivers.length > 0 && (
          <ul className="text-sm text-[var(--text-primary)] list-disc ml-5 space-y-1">
            {prediction.drivers.map((driver) => (
              <li key={driver}>{driver}</li>
            ))}
          </ul>
        )}
        <div className="text-sm text-[var(--text-primary)]">
          <strong>Recommended action:</strong> {prediction.recommendation}
        </div>
        <div className="text-sm text-[var(--battery)]">
          <strong>Expected outcome:</strong> {prediction.expectedOutcome}
        </div>
      </CardContent>
    </Card>
  );
}
