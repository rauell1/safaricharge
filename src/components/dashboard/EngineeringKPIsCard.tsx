'use client';
/**
 * EngineeringKPIsCard
 * ───────────────────────
 * Renders the six IEC 61724 engineering KPIs as a responsive grid of tiles:
 *   Performance Ratio | Specific Yield | Capacity Factor
 *   Self-Sufficiency  | Self-Consumption | CO₂ Avoided
 *
 * Each tile shows:
 *   • Current value + unit
 *   • Trend badge (vs previous period, coloured by direction + semantic)
 *   • Mini 8-point sparkline (Recharts)
 *   • Target gauge (thin progress arc below value)
 *   • IEC clause reference
 *
 * Clicking any tile opens a drill-down modal with description + full
 * sparkline history chart.
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line, Tooltip as RTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { computeKpis, demoKpiInputs, KpiValue, KpiInputs } from '@/lib/kpis';

// ─── Trend badge ───────────────────────────────────────────────────────────
function TrendBadge({ trend, isGood }: { trend: number; isGood: boolean }) {
  if (Math.abs(trend) < 0.1) return <span className="text-[11px] text-[var(--color-text-faint)]">&#8212;</span>;
  const positive = trend > 0;
  const good = isGood ? positive : !positive;
  const colour = good ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]';
  const arrow  = positive ? '↑' : '↓';
  return (
    <span className={`text-[11px] font-semibold ${colour}`}>
      {arrow} {Math.abs(trend).toFixed(1)}%
    </span>
  );
}

// ─── Target gauge (thin progress bar) ─────────────────────────────────────────
function TargetGauge({ value, target }: { value: number; target: number }) {
  const pct = Math.min(100, (value / target) * 100);
  const colour = pct >= 95 ? 'var(--color-success)' : pct >= 75 ? 'var(--color-primary)' : 'var(--color-warning)';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-[var(--color-text-faint)] mb-0.5">
        <span>vs target</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1 rounded-full bg-[var(--color-surface-dynamic)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: colour }}
        />
      </div>
    </div>
  );
}

// ─── Mini sparkline ───────────────────────────────────────────────────────────
function Sparkline({ data, colour = 'var(--color-primary)' }: { data: number[]; colour?: string }) {
  const pts = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={32}>
      <LineChart data={pts} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <Line
          type="monotone"
          dataKey="v"
          dot={false}
          strokeWidth={1.5}
          stroke={colour}
          isAnimationActive={false}
        />
        <RTooltip
          contentStyle={{ display: 'none' }}
          cursor={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── KPI tile ────────────────────────────────────────────────────────────────────
function KpiTile({ kpi, onClick }: { kpi: KpiValue; onClick: () => void }) {
  return (
    <button
      className="group flex flex-col gap-1 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-md transition-all text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
      onClick={onClick}
      title={`${kpi.label} — click for details`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-[var(--color-text-muted)] leading-tight">{kpi.label}</span>
        <TrendBadge trend={kpi.trend} isGood={kpi.trendIsGood} />
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1 mt-0.5">
        <span className="text-2xl font-bold text-[var(--color-text)] tabular-nums leading-none">
          {kpi.value.toLocaleString()}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">{kpi.unit}</span>
      </div>

      {/* IEC ref */}
      <span className="text-[10px] text-[var(--color-text-faint)] font-mono">{kpi.iecRef}</span>

      {/* Sparkline */}
      <div className="mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
        <Sparkline data={kpi.sparkline} />
      </div>

      {/* Target gauge */}
      {kpi.target !== undefined && (
        <TargetGauge value={kpi.value} target={kpi.target} />
      )}
    </button>
  );
}

// ─── Drill-down modal ──────────────────────────────────────────────────────────
function KpiModal({ kpi, onClose }: { kpi: KpiValue; onClose: () => void }) {
  const chartData = kpi.sparkline.map((v, i) => ({ period: `P${i + 1}`, value: v }));
  const last = chartData[chartData.length - 1];
  const colour = 'var(--color-primary)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={kpi.label}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10">
        {/* Close */}
        <button
          className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        {/* Title */}
        <h3 className="text-base font-semibold text-[var(--color-text)] mb-1">{kpi.label}</h3>
        <p className="text-xs font-mono text-[var(--color-text-faint)] mb-3">{kpi.iecRef}</p>

        {/* Hero value */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-bold text-[var(--color-primary)] tabular-nums">{kpi.value.toLocaleString()}</span>
          <span className="text-sm text-[var(--color-text-muted)]">{kpi.unit}</span>
          <TrendBadge trend={kpi.trend} isGood={kpi.trendIsGood} />
        </div>

        {/* Target gauge full-width */}
        {kpi.target !== undefined && (
          <TargetGauge value={kpi.value} target={kpi.target} />
        )}

        {/* Description */}
        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed mt-4 mb-5">{kpi.description}</p>

        {/* Full history chart */}
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Historical trend</h4>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="kpiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={colour} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={colour} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
            <RTooltip
              formatter={(v: number) => [`${v.toLocaleString()} ${kpi.unit}`, kpi.label]}
              contentStyle={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={colour}
              strokeWidth={2}
              fill="url(#kpiGrad)"
              dot={{ r: 3, fill: colour, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Latest snapshot */}
        <div className="mt-4 flex justify-between text-sm">
          <span className="text-[var(--color-text-muted)]">Current period</span>
          <span className="font-semibold text-[var(--color-text)] tabular-nums">
            {last?.value.toLocaleString()} {kpi.unit}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────────

interface Props {
  inputs?: KpiInputs;
  periodLabel?: string;
}

export function EngineeringKPIsCard({ inputs, periodLabel = 'Annual' }: Props) {
  const effectiveInputs = inputs ?? demoKpiInputs();
  const kpis = useMemo(() => computeKpis(effectiveInputs), [effectiveInputs]);
  const [modal, setModal] = useState<KpiValue | null>(null);

  return (
    <section
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
      aria-label="Engineering KPIs"
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-border)]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Engineering KPIs</h3>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{periodLabel} · IEC 61724 · Click any metric for details</p>
        </div>
        <span className="text-[10px] font-mono text-[var(--color-text-faint)] bg-[var(--color-surface-offset)] px-2 py-1 rounded-md">
          IEC 61724-1:2021
        </span>
      </div>

      {/* 3-col grid (2-col on mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
        {kpis.map(kpi => (
          <KpiTile key={kpi.label} kpi={kpi} onClick={() => setModal(kpi)} />
        ))}
      </div>

      {/* Drill-down modal */}
      {modal && <KpiModal kpi={modal} onClose={() => setModal(null)} />}
    </section>
  );
}
