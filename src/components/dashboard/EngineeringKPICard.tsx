'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEngineeringKPIs } from '@/hooks/useEnergySystem';
import { KENYA_KPI_RANGES, getKPIStatus, type KPIStatus } from '@/lib/engineering-kpis';
import { Activity } from 'lucide-react';

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<KPIStatus, { bg: string; text: string; label: string }> = {
  good:    { bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-400',  label: 'Good' },
  warning: { bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-700 dark:text-amber-400',  label: 'Fair' },
  poor:    { bg: 'bg-red-100   dark:bg-red-900/30',    text: 'text-red-700   dark:text-red-400',    label: 'Poor' },
};

function StatusBadge({ status }: { status: KPIStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ── Single KPI row ────────────────────────────────────────────────────────────

interface KPIRowProps {
  label: string;
  value: number;
  unit: string;
  rangeLabel: string;
  status: KPIStatus;
  description: string;
}

function KPIRow({ label, value, unit, rangeLabel, status, description }: KPIRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-[var(--border)] last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)] truncate">{label}</span>
          <StatusBadge status={status} />
        </div>
        <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">{description}</p>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Kenya norm: {rangeLabel}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <span className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
          {value.toLocaleString()}
        </span>
        <span className="text-xs text-[var(--text-secondary)] ml-1">{unit}</span>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function KPISkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
          <div className="space-y-1.5">
            <div className="h-4 w-32 rounded bg-[var(--bg-card-muted)]" />
            <div className="h-3 w-48 rounded bg-[var(--bg-card-muted)]" />
            <div className="h-3 w-24 rounded bg-[var(--bg-card-muted)]" />
          </div>
          <div className="h-6 w-20 rounded bg-[var(--bg-card-muted)]" />
        </div>
      ))}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function EngineeringKPICard() {
  const kpis = useEngineeringKPIs();

  const rows: KPIRowProps[] = kpis
    ? [
        {
          label: KENYA_KPI_RANGES.specificYieldKwhPerKwp.label,
          value: kpis.specificYieldKwhPerKwp,
          unit: KENYA_KPI_RANGES.specificYieldKwhPerKwp.unit,
          rangeLabel: `${KENYA_KPI_RANGES.specificYieldKwhPerKwp.low}–${KENYA_KPI_RANGES.specificYieldKwhPerKwp.high} ${KENYA_KPI_RANGES.specificYieldKwhPerKwp.unit}`,
          status: getKPIStatus('specificYieldKwhPerKwp', kpis.specificYieldKwhPerKwp),
          description: KENYA_KPI_RANGES.specificYieldKwhPerKwp.description,
        },
        {
          label: KENYA_KPI_RANGES.performanceRatioPct.label,
          value: kpis.performanceRatioPct,
          unit: KENYA_KPI_RANGES.performanceRatioPct.unit,
          rangeLabel: `${KENYA_KPI_RANGES.performanceRatioPct.low}–${KENYA_KPI_RANGES.performanceRatioPct.high}%`,
          status: getKPIStatus('performanceRatioPct', kpis.performanceRatioPct),
          description: KENYA_KPI_RANGES.performanceRatioPct.description,
        },
        {
          label: KENYA_KPI_RANGES.capacityFactorPct.label,
          value: kpis.capacityFactorPct,
          unit: KENYA_KPI_RANGES.capacityFactorPct.unit,
          rangeLabel: `${KENYA_KPI_RANGES.capacityFactorPct.low}–${KENYA_KPI_RANGES.capacityFactorPct.high}%`,
          status: getKPIStatus('capacityFactorPct', kpis.capacityFactorPct),
          description: KENYA_KPI_RANGES.capacityFactorPct.description,
        },
        {
          label: KENYA_KPI_RANGES.batteryCyclesPerYear.label,
          value: kpis.batteryCyclesPerYear,
          unit: KENYA_KPI_RANGES.batteryCyclesPerYear.unit,
          rangeLabel: `${KENYA_KPI_RANGES.batteryCyclesPerYear.low}–${KENYA_KPI_RANGES.batteryCyclesPerYear.high} cycles`,
          status: getKPIStatus('batteryCyclesPerYear', kpis.batteryCyclesPerYear),
          description: KENYA_KPI_RANGES.batteryCyclesPerYear.description,
        },
        {
          label: KENYA_KPI_RANGES.maxDodPct.label,
          value: kpis.maxDodPct,
          unit: KENYA_KPI_RANGES.maxDodPct.unit,
          rangeLabel: `${KENYA_KPI_RANGES.maxDodPct.low}–${KENYA_KPI_RANGES.maxDodPct.high}%`,
          status: getKPIStatus('maxDodPct', kpis.maxDodPct),
          description: KENYA_KPI_RANGES.maxDodPct.description,
        },
      ]
    : [];

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
          <Activity className="h-5 w-5 text-[var(--solar)]" />
          Engineering KPIs
        </CardTitle>
        {kpis && (
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Based on {kpis.uniqueDaysCount} simulated day{kpis.uniqueDaysCount !== 1 ? 's' : ''},{' '}
            annualised · Kenya benchmark ranges shown
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {kpis === null ? (
          <KPISkeleton />
        ) : (
          <div>
            {rows.map((row) => (
              <KPIRow key={row.label} {...row} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
