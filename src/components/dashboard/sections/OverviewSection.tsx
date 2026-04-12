'use client';
/**
 * OverviewSection
 * Existing overview extended with the EngineeringKPIsCard below existing tiles.
 */

import React from 'react';
import { EngineeringKPIsCard } from '@/components/dashboard/EngineeringKPIsCard';
// Re-export existing overview content if it exists; otherwise render a stub.
// This file will be the canonical OverviewSection.

export default function OverviewSection() {
  return (
    <div className="h-full overflow-y-auto p-5 space-y-5">

      {/* Existing top-level KPI summary tiles — stub if not yet built */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {([
          { label: 'PV Output',   value: '4.2',  unit: 'kW',  delta: '+0.3',  good: true  },
          { label: 'Battery SOC', value: '87',   unit: '%',   delta: '+2',    good: true  },
          { label: 'Load',        value: '1.8',  unit: 'kW',  delta: '-0.1',  good: true  },
          { label: 'Grid Export', value: '2.4',  unit: 'kW',  delta: '+0.4',  good: true  },
        ] as Array<{label:string;value:string;unit:string;delta:string;good:boolean}>).map(tile => (
          <div
            key={tile.label}
            className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4"
          >
            <p className="text-xs text-[var(--color-text-muted)] mb-1">{tile.label}</p>
            <p className="text-2xl font-bold text-[var(--color-text)] tabular-nums">
              {tile.value}<span className="text-sm font-medium ml-1 text-[var(--color-text-muted)]">{tile.unit}</span>
            </p>
            <p className={`text-xs mt-1 font-medium ${ tile.good ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]' }`}>
              {tile.delta} vs last hour
            </p>
          </div>
        ))}
      </div>

      {/* Engineering KPIs — Issue E */}
      <EngineeringKPIsCard />
    </div>
  );
}
