'use client';

import React from 'react';
import { Play } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DerivedSystemConfig } from '@/types/simulation-core';

export interface ScenarioConfig {
  label: string;
  config: Partial<DerivedSystemConfig>;
  description?: string;
}

interface ScenarioPanelProps {
  scenarios: ScenarioConfig[];
  onSelectScenario?: (scenario: ScenarioConfig) => void;
  activeScenarioLabel?: string;
}

export function ScenarioPanel({
  scenarios,
  onSelectScenario,
  activeScenarioLabel,
}: ScenarioPanelProps) {
  return (
    <Card className="dashboard-card">
      <CardHeader className="px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          What-If Scenarios
        </h3>
        <p className="text-xs text-[var(--text-tertiary)]">
          Click a scenario to re-run the simulation
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {scenarios.map((s) => {
          const isActive = s.label === activeScenarioLabel;
          return (
            <div
              key={s.label}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 border transition-all ${
                isActive
                  ? 'bg-[var(--battery-soft)] border-[var(--battery)]/40'
                  : 'bg-[var(--bg-card-muted)] border-[var(--border)] hover:border-[var(--battery)]/30'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    isActive ? 'text-[var(--battery)]' : 'text-[var(--text-primary)]'
                  }`}
                >
                  {s.label}
                </p>
                {s.description && (
                  <p className="text-xs text-[var(--text-tertiary)] truncate">
                    {s.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2 shrink-0 ${
                  isActive
                    ? 'text-[var(--battery)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                }`}
                onClick={() => onSelectScenario?.(s)}
                aria-label={`Select scenario: ${s.label}`}
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
