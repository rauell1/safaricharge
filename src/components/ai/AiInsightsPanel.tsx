'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AiInsightsPanelProps {
  insights?: string[];
  isLoading?: boolean;
}

export function AiInsightsPanel({ insights = [], isLoading }: AiInsightsPanelProps) {
  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)] text-base">
          <Sparkles className="h-5 w-5 text-[var(--battery)]" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-[var(--text-secondary)]">Analysing system data…</p>
        ) : insights.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No AI insights available yet. Run the simulation to generate recommendations.</p>
        ) : (
          <ul className="space-y-2">
            {insights.map((insight, i) => (
              <li key={i} className="text-sm text-[var(--text-primary)] flex items-start gap-2">
                <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-[var(--battery)]" />
                {insight}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
