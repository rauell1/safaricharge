'use client';

import React, { useMemo, useState } from 'react';
import { buildDispatchHeatmap, type DispatchHeatmapMetric } from '@/lib/sizing/dispatchHeatmap';
import type { SimulationResults } from '@/lib/sizing/types';

const METRICS: Array<{ id: DispatchHeatmapMetric; label: string; colorRGB: string }> = [
  { id: 'solarAcKw', label: 'Solar AC (kW)', colorRGB: '16, 185, 129' },
  { id: 'gridImportKw', label: 'Grid Import (kW)', colorRGB: '245, 158, 11' },
  { id: 'socPct', label: 'Battery SOC (%)', colorRGB: '14, 165, 233' },
  { id: 'curtailedKw', label: 'Curtailed Solar (kW)', colorRGB: '239, 68, 68' },
];

export default function DispatchHeatmap({ results }: { results: SimulationResults }) {
  const [metric, setMetric] = useState<DispatchHeatmapMetric>('solarAcKw');
  const grid = useMemo(() => buildDispatchHeatmap(results, metric), [results, metric]);
  const colorRGB = METRICS.find((m) => m.id === metric)?.colorRGB ?? '16, 185, 129';
  const span = Math.max(grid.max - (metric === 'socPct' ? 0 : grid.min), 0.01);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-[var(--text-primary)]">
            12×24 Seasonal Dispatch Heatmap
          </h4>
          <p className="text-[11px] text-[var(--text-tertiary)]">
            {grid.label} across Jan–Dec representative days ({grid.unit}) — Peak {grid.max} {grid.unit}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetric(m.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                metric === m.id
                  ? 'bg-[var(--battery-soft)] text-[var(--battery)] border-[var(--battery)]/40'
                  : 'bg-[var(--bg-card-muted)] text-[var(--text-secondary)] border-[var(--border)] hover:opacity-80'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[660px] space-y-1">
          <div className="grid grid-cols-[44px_repeat(24,minmax(0,1fr))] gap-0.5 text-[9px] font-mono text-[var(--text-tertiary)]">
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="text-center">
                {h % 3 === 0 ? `${String(h).padStart(2, '0')}` : ''}
              </div>
            ))}
          </div>
          {grid.rows.map((row) => (
            <div
              key={row.monthIndex}
              className="grid grid-cols-[44px_repeat(24,minmax(0,1fr))] gap-0.5 items-center"
            >
              <span className="text-[10px] font-mono font-semibold text-[var(--text-secondary)]">
                {row.monthName}
              </span>
              {row.cells.map((cell) => {
                const intensity = Math.max(0, Math.min(1, cell.value / span));
                const bg =
                  intensity === 0
                    ? 'var(--bg-card-muted)'
                    : `rgba(${colorRGB}, ${(0.15 + intensity * 0.85).toFixed(2)})`;
                return (
                  <div
                    key={cell.hour}
                    title={`${row.monthName} ${String(cell.hour).padStart(2, '0')}:00 — ${cell.value} ${grid.unit}`}
                    className="h-5 rounded-[3px] border border-black/5 flex items-center justify-center text-[8px] font-mono"
                    style={{
                      backgroundColor: bg,
                      color: intensity > 0.65 ? '#ffffff' : 'var(--text-secondary)',
                    }}
                  >
                    {grid.max > 0 && intensity >= 0.4 ? Math.round(cell.value) : ''}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
