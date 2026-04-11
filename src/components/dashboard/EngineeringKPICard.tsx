'use client';

import React from 'react';
import { Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type EngineeringKPIs,
  KENYA_KPI_RANGES,
  getKPIStatus,
  type KPIStatus,
} from '@/lib/engineering-kpis';

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<KPIStatus, { bg: string; text: string; dot: string }> = {
  good:    { bg: 'rgba(34,197,94,0.12)',  text: '#16a34a', dot: '#22c55e' },
  warning: { bg: 'rgba(234,179,8,0.12)',  text: '#ca8a04', dot: '#eab308' },
  poor:    { bg: 'rgba(239,68,68,0.12)',  text: '#dc2626', dot: '#ef4444' },
  unknown: { bg: 'rgba(148,163,184,0.10)', text: 'var(--text-tertiary)', dot: 'var(--text-tertiary)' },
};

const STATUS_LABELS: Record<KPIStatus, string> = {
  good:    'Good',
  warning: 'Review',
  poor:    'Poor',
  unknown: 'N/A',
};

function StatusBadge({ status }: { status: KPIStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: c.dot }}
        aria-hidden="true"
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Row for a single KPI
// ---------------------------------------------------------------------------

interface KPIRowProps {
  label: string;
  value: string;
  range: string;
  status: KPIStatus;
  description: string;
}

function KPIRow({ label, value, range, status, description }: KPIRowProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-4 py-3 transition-colors hover:bg-[var(--bg-card-hover)]"
      title={description}
      role="row"
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-[var(--text-secondary)] truncate">{label}</p>
        <p className="text-xs text-[var(--text-tertiary)] truncate">{range}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <span className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
          {value}
        </span>
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loading state
// ---------------------------------------------------------------------------

function KPISkeleton() {
  return (
    <div className="space-y-2 animate-pulse" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3">
          <div className="space-y-1.5">
            <div className="h-3 w-28 rounded bg-[var(--bg-card-muted)]" />
            <div className="h-2.5 w-36 rounded bg-[var(--bg-card-muted)]" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-12 rounded bg-[var(--bg-card-muted)]" />
            <div className="h-5 w-14 rounded-full bg-[var(--bg-card-muted)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main card component
// ---------------------------------------------------------------------------

export interface EngineeringKPICardProps {
  kpis: EngineeringKPIs | null;
  /** Optional: override displayed solar capacity label (e.g. "50.4 kWp") */
  pvCapacityLabel?: string;
}

/**
 * Engineering KPIs card — displays Specific Yield, Performance Ratio,
 * Capacity Factor, Battery Cycles/Year, and Max DoD with Kenya-specific
 * green/amber/red status indicators.
 */
export function EngineeringKPICard({ kpis, pvCapacityLabel }: EngineeringKPICardProps) {
  const hasData = kpis !== null && kpis.annualEnergyKwh > 0;

  const rows: (KPIRowProps & { key: string })[] = hasData && kpis
    ? [
        {
          key: 'specificYield',
          label: KENYA_KPI_RANGES.specificYield.label,
          value: `${kpis.specificYield.toLocaleString()} kWh/kWp`,
          range: `Ref: ${KENYA_KPI_RANGES.specificYield.low.toLocaleString()}–${KENYA_KPI_RANGES.specificYield.high.toLocaleString()} kWh/kWp/yr`,
          status: getKPIStatus(kpis.specificYield, KENYA_KPI_RANGES.specificYield),
          description: KENYA_KPI_RANGES.specificYield.description,
        },
        {
          key: 'performanceRatio',
          label: KENYA_KPI_RANGES.performanceRatio.label,
          value: `${kpis.performanceRatio.toFixed(1)} %`,
          range: `Ref: ${KENYA_KPI_RANGES.performanceRatio.low}–${KENYA_KPI_RANGES.performanceRatio.high} %`,
          status: getKPIStatus(kpis.performanceRatio, KENYA_KPI_RANGES.performanceRatio),
          description: KENYA_KPI_RANGES.performanceRatio.description,
        },
        {
          key: 'capacityFactor',
          label: KENYA_KPI_RANGES.capacityFactor.label,
          value: `${kpis.capacityFactor.toFixed(1)} %`,
          range: `Ref: ${KENYA_KPI_RANGES.capacityFactor.low}–${KENYA_KPI_RANGES.capacityFactor.high} %`,
          status: getKPIStatus(kpis.capacityFactor, KENYA_KPI_RANGES.capacityFactor),
          description: KENYA_KPI_RANGES.capacityFactor.description,
        },
        {
          key: 'batteryCycles',
          label: KENYA_KPI_RANGES.batteryCyclesPerYear.label,
          value: `${Math.round(kpis.batteryCyclesPerYear)} cycles`,
          range: `Ref: ${KENYA_KPI_RANGES.batteryCyclesPerYear.low}–${KENYA_KPI_RANGES.batteryCyclesPerYear.high} cycles/yr`,
          status: getKPIStatus(kpis.batteryCyclesPerYear, KENYA_KPI_RANGES.batteryCyclesPerYear),
          description: KENYA_KPI_RANGES.batteryCyclesPerYear.description,
        },
        {
          key: 'maxDod',
          label: KENYA_KPI_RANGES.maxDod.label,
          value: `${kpis.maxDod.toFixed(1)} %`,
          range: `Ref: ${KENYA_KPI_RANGES.maxDod.low}–${KENYA_KPI_RANGES.maxDod.high} %`,
          status: getKPIStatus(kpis.maxDod, KENYA_KPI_RANGES.maxDod),
          description: KENYA_KPI_RANGES.maxDod.description,
        },
      ]
    : [];

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2.5 text-[var(--text-primary)] text-base font-semibold">
          <Gauge className="h-4.5 w-4.5 text-[var(--solar)]" aria-hidden="true" />
          Engineering KPIs
          {pvCapacityLabel && (
            <span className="ml-auto text-xs font-normal text-[var(--text-tertiary)]">
              {pvCapacityLabel}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {!hasData ? (
          <KPISkeleton />
        ) : (
          <>
            {rows.map(({ key, ...row }) => (
              <KPIRow key={key} {...row} />
            ))}
            <p className="pt-1 text-[10px] text-[var(--text-tertiary)]">
              Annualised from simulation data · Kenya reference ranges · Hover rows for details
              {/* TODO(Issue D): Persist EngineeringKPIs in SavedScenario and add KPI columns to /scenarios comparison table */}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
