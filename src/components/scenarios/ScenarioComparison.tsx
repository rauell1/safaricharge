'use client';
/**
 * ScenarioComparison
 * ────────────────────
 * Side-by-side bar chart + table comparing up to 4 scenarios.
 * Uses Recharts (already in the dependency tree).
 */

import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, LabelList,
} from 'recharts';
import { useScenarioStore, ScenarioResults } from '@/store/scenarioStore';

type MetricDef = { key: keyof ScenarioResults; label: string; unit: string; format: (v: number) => string; higherIsBetter: boolean };

const METRICS: MetricDef[] = [
  { key: 'npv25Kes',             label: 'NPV (25 yr)',         unit: 'M KES',    format: v => (v/1e6).toFixed(2),   higherIsBetter: true },
  { key: 'irr25Pct',             label: 'IRR (25 yr)',         unit: '%',         format: v => v.toFixed(1),          higherIsBetter: true },
  { key: 'selfSufficiencyPct',   label: 'Self-sufficiency',   unit: '%',         format: v => v.toFixed(1),          higherIsBetter: true },
  { key: 'selfConsumptionPct',   label: 'Self-consumption',   unit: '%',         format: v => v.toFixed(1),          higherIsBetter: true },
  { key: 'simplePaybackYears',   label: 'Simple payback',     unit: 'yr',        format: v => v.toFixed(1),          higherIsBetter: false },
  { key: 'lcoeKesPerKwh',        label: 'LCOE',                unit: 'KES/kWh',  format: v => v.toFixed(1),          higherIsBetter: false },
  { key: 'totalCapexKes',        label: 'Total CAPEX',         unit: 'M KES',    format: v => (v/1e6).toFixed(2),   higherIsBetter: false },
  { key: 'annualSavingsKes',     label: 'Yr-1 savings',        unit: 'K KES',    format: v => (v/1e3).toFixed(0),   higherIsBetter: true },
  { key: 'annualPvYieldKwh',     label: 'PV yield',            unit: 'MWh/yr',   format: v => (v/1e3).toFixed(1),   higherIsBetter: true },
  { key: 'co2SavedKgPerYear',    label: 'CO₂ saved',           unit: 't/yr',     format: v => (v/1e3).toFixed(1),   higherIsBetter: true },
  { key: 'estimatedBatteryLifeYears', label: 'Battery life', unit: 'yr',        format: v => v.toFixed(1),          higherIsBetter: true },
  { key: 'performanceRatioPct',  label: 'Performance ratio',  unit: '%',         format: v => v.toFixed(1),          higherIsBetter: true },
];

const BEST_COLOUR  = '#0a4a3a';
const WORST_COLOUR = '#c44b2b';

function BestBadge({ best }: { best: boolean }) {
  if (!best) return null;
  return (
    <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-[var(--color-primary-highlight)] text-[var(--color-primary)]">
      Best
    </span>
  );
}

export function ScenarioComparison() {
  const {
    scenarios,
    comparisonIds,
    comparisonMetric,
    setComparisonMetric,
    clearComparison,
    toggleComparison,
  } = useScenarioStore();

  const compared = useMemo(
    () => scenarios.filter(s => comparisonIds.includes(s.id) && s.results),
    [scenarios, comparisonIds],
  );

  const metricDef = METRICS.find(m => m.key === comparisonMetric) ?? METRICS[0];

  const chartData = useMemo(() =>
    compared.map(s => ({
      name: s.name.length > 20 ? s.name.slice(0, 18) + '…' : s.name,
      value: s.results![comparisonMetric] as number,
      colour: s.colour,
    })),
    [compared, comparisonMetric],
  );

  const best = useMemo(() => {
    if (!chartData.length) return null;
    return metricDef.higherIsBetter
      ? chartData.reduce((a, b) => b.value > a.value ? b : a).name
      : chartData.reduce((a, b) => b.value < a.value ? b : a).name;
  }, [chartData, metricDef]);

  if (comparisonIds.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="1.5">
          <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
        </svg>
        <p className="text-sm text-[var(--color-text-muted)] max-w-xs">
          Select <strong>2–4 scenarios</strong> from the sidebar using the <code className="text-xs bg-[var(--color-surface-dynamic)] px-1 py-0.5 rounded">+</code> button, then come back here to compare.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--color-border)] flex-wrap">
        <span className="text-sm font-medium text-[var(--color-text)]">Compare metric:</span>
        <select
          value={comparisonMetric as string}
          onChange={e => setComparisonMetric(e.target.value as keyof ScenarioResults)}
          className="text-sm h-8 px-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
        >
          {METRICS.map(m => <option key={m.key as string} value={m.key as string}>{m.label}</option>)}
        </select>
        <div className="flex gap-2 ml-auto">
          {compared.map(s => (
            <span
              key={s.id}
              className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border border-[var(--color-border)]"
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.colour }} />
              {s.name.length > 16 ? s.name.slice(0, 14) + '…' : s.name}
              <button
                className="text-[var(--color-text-faint)] hover:text-[var(--color-error)] ml-0.5"
                onClick={() => toggleComparison(s.id)}
              >×</button>
            </span>
          ))}
          <button
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error)] px-2"
            onClick={clearComparison}
          >
            Clear all
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Bar chart */}
        <div className="mb-8">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-4">
            {metricDef.label} ({metricDef.unit})
          </h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={8} margin={{ top: 24, right: 20, bottom: 8, left: 10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: number) => [`${metricDef.format(v)} ${metricDef.unit}`, metricDef.label]}
                contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '13px' }}
              />
              <ReferenceLine y={0} stroke="var(--color-border)" />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={72}>
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(v: number) => metricDef.format(v)}
                  style={{ fontSize: '11px', fill: 'var(--color-text-muted)' }}
                />
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.name === best
                      ? BEST_COLOUR
                      : entry.colour}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Full metrics table */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Full comparison</h4>
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--color-text-muted)] w-44">Metric</th>
                  {compared.map(s => (
                    <th key={s.id} className="px-4 py-2.5 text-xs font-semibold">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.colour }} />
                        <span className="text-[var(--color-text)] truncate max-w-[120px]">{s.name}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m, ri) => {
                  const vals = compared.map(s => (s.results![m.key] as number));
                  const bestVal = m.higherIsBetter ? Math.max(...vals) : Math.min(...vals);
                  return (
                    <tr key={m.key as string} className={`border-b border-[var(--color-border)] ${ri % 2 === 0 ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface-2)]'}`}>
                      <td className="px-4 py-2 text-[var(--color-text-muted)] text-xs font-medium">
                        {m.label}
                        <span className="ml-1 text-[var(--color-text-faint)]">({m.unit})</span>
                      </td>
                      {compared.map(s => {
                        const v = s.results![m.key] as number;
                        const isBest = v === bestVal;
                        return (
                          <td key={s.id} className={`px-4 py-2 text-right tabular-nums ${isBest ? 'font-semibold text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>
                            {m.format(v)}
                            <BestBadge best={isBest && compared.length > 1} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
