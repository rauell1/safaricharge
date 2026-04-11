'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Trash2, Upload, ArrowLeft, BookMarked, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEnergySystemStore, type SavedScenario } from '@/stores/energySystemStore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

export const dynamic = 'force-dynamic';

// ── Helper formatters ──────────────────────────────────────────────────────────

const fmt = (v: number, dec = 1) =>
  Number.isFinite(v) ? v.toFixed(dec) : '—';

const fmtKES = (v: number) =>
  Number.isFinite(v) && v !== 0
    ? `KES ${v.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
    : '—';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Delta indicator ────────────────────────────────────────────────────────────

type DeltaDir = 'up' | 'down' | 'same';

function delta(current: number, baseline: number): { pct: number; dir: DeltaDir } {
  if (!Number.isFinite(baseline) || baseline === 0)
    return { pct: 0, dir: 'same' };
  const pct = ((current - baseline) / Math.abs(baseline)) * 100;
  return { pct, dir: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'same' };
}

interface DeltaCellProps {
  value: string;
  current: number;
  baseline: number;
  higherIsBetter?: boolean;
}

function DeltaCell({ value, current, baseline, higherIsBetter = true }: DeltaCellProps) {
  const { pct, dir } = delta(current, baseline);

  if (dir === 'same') {
    return (
      <span className="flex items-center gap-1 text-[var(--text-primary)]">
        {value}
      </span>
    );
  }

  const isGood = higherIsBetter ? dir === 'up' : dir === 'down';
  const colour = isGood ? 'text-emerald-400' : 'text-red-400';
  const Icon = dir === 'up' ? TrendingUp : TrendingDown;

  return (
    <span className={`flex items-center gap-1 font-semibold ${colour}`}>
      {value}
      <span className="flex items-center text-xs">
        <Icon className="h-3 w-3" />
        {Math.abs(pct).toFixed(1)}%
      </span>
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ScenariosPage() {
  const scenarios = useEnergySystemStore((s) => s.scenarios);
  const deleteScenario = useEnergySystemStore((s) => s.deleteScenario);
  const loadScenario = useEnergySystemStore((s) => s.loadScenario);
  const { toast } = useToast();

  const [baselineId, setBaselineId] = useState<string | null>(null);

  const baseline: SavedScenario | undefined = scenarios.find(
    (s) => s.id === baselineId
  );

  const handleDelete = (id: string, name: string) => {
    deleteScenario(id);
    if (baselineId === id) setBaselineId(null);
    toast({ title: 'Scenario deleted', description: `"${name}" was removed.` });
  };

  const handleLoad = (id: string, name: string) => {
    loadScenario(id);
    toast({
      title: 'Scenario loaded',
      description: `"${name}" configuration restored to dashboard.`,
    });
  };

  return (
    <DashboardLayout activeSection="scenarios">
      <Toaster />
      <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/demo">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  aria-label="Back to dashboard"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <BookMarked className="h-6 w-6 text-[var(--solar)]" />
                  Saved Scenarios
                </h1>
                <p className="text-sm text-[var(--text-tertiary)]">
                  Compare named system configurations and KPI snapshots side-by-side.
                </p>
              </div>
            </div>
            {scenarios.length > 0 && (
              <Badge className="bg-[var(--solar-soft)] text-[var(--solar)] border-[var(--solar)]/20 px-3 py-1">
                {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''} saved
              </Badge>
            )}
          </div>

          {/* Empty state */}
          {scenarios.length === 0 && (
            <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-card">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                <BookMarked className="h-12 w-12 text-[var(--text-tertiary)] opacity-40" />
                <div>
                  <p className="text-[var(--text-primary)] font-semibold text-lg">
                    No scenarios saved yet
                  </p>
                  <p className="text-[var(--text-secondary)] text-sm mt-1">
                    Use the{' '}
                    <span className="inline-flex items-center gap-1 font-medium text-[var(--solar)]">
                      <BookMarked className="h-3.5 w-3.5" /> Save scenario
                    </span>{' '}
                    button in the dashboard header to capture a snapshot.
                  </p>
                </div>
                <Link href="/demo">
                  <Button className="mt-2 bg-[var(--battery)] text-white hover:bg-[var(--battery-bright)]">
                    Go to Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Baseline selector */}
          {scenarios.length >= 2 && (
            <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
                  Comparison baseline
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={baselineId === null ? 'default' : 'outline'}
                  onClick={() => setBaselineId(null)}
                  className={
                    baselineId === null
                      ? 'bg-[var(--solar)] text-[var(--bg-primary)] hover:bg-[var(--solar-bright)]'
                      : 'border-[var(--border)] text-[var(--text-secondary)]'
                  }
                >
                  None
                </Button>
                {scenarios.map((s) => (
                  <Button
                    key={s.id}
                    size="sm"
                    variant={baselineId === s.id ? 'default' : 'outline'}
                    onClick={() => setBaselineId(s.id === baselineId ? null : s.id)}
                    className={
                      baselineId === s.id
                        ? 'bg-[var(--solar)] text-[var(--bg-primary)] hover:bg-[var(--solar-bright)]'
                        : 'border-[var(--border)] text-[var(--text-secondary)]'
                    }
                  >
                    {s.name}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Scenarios table */}
          {scenarios.length > 0 && (
            <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-card">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[var(--border)] hover:bg-transparent">
                      <TableHead className="text-[var(--text-tertiary)] font-semibold">Name</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-semibold">Saved</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-semibold">PV (kW)</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-semibold">Battery (kWh)</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-semibold">Solar (kWh)</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-semibold">Self-suff.</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-semibold">Avg SOC</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-semibold">Savings</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-semibold">NPV</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-semibold">IRR</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-semibold">Payback</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scenarios.map((s) => {
                      const isBaseline = s.id === baselineId;
                      const b = baseline && !isBaseline ? baseline : null;
                      return (
                        <TableRow
                          key={s.id}
                          className={`border-[var(--border)] ${
                            isBaseline
                              ? 'bg-[var(--solar-soft)]/30'
                              : 'hover:bg-[var(--bg-card-muted)]/50'
                          }`}
                        >
                          <TableCell className="font-semibold text-[var(--text-primary)]">
                            {s.name}
                            {isBaseline && (
                              <Badge className="ml-2 text-[10px] px-1.5 py-0 bg-[var(--solar-soft)] text-[var(--solar)] border-[var(--solar)]/20">
                                baseline
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-[var(--text-secondary)] text-xs">
                            {formatDate(s.createdAt)}
                          </TableCell>
                          {/* PV capacity */}
                          <TableCell>
                            {b ? (
                              <DeltaCell
                                value={fmt(s.system.solarCapacityKW)}
                                current={s.system.solarCapacityKW}
                                baseline={b.system.solarCapacityKW}
                              />
                            ) : (
                              <span className="text-[var(--text-primary)]">{fmt(s.system.solarCapacityKW)}</span>
                            )}
                          </TableCell>
                          {/* Battery */}
                          <TableCell>
                            {b ? (
                              <DeltaCell
                                value={fmt(s.system.batteryCapacityKWh)}
                                current={s.system.batteryCapacityKWh}
                                baseline={b.system.batteryCapacityKWh}
                              />
                            ) : (
                              <span className="text-[var(--text-primary)]">{fmt(s.system.batteryCapacityKWh)}</span>
                            )}
                          </TableCell>
                          {/* Solar kWh */}
                          <TableCell>
                            {b ? (
                              <DeltaCell
                                value={fmt(s.performance.totalSolarKWh)}
                                current={s.performance.totalSolarKWh}
                                baseline={b.performance.totalSolarKWh}
                              />
                            ) : (
                              <span className="text-[var(--text-primary)]">{fmt(s.performance.totalSolarKWh)}</span>
                            )}
                          </TableCell>
                          {/* Self-sufficiency */}
                          <TableCell>
                            {b ? (
                              <DeltaCell
                                value={`${fmt(s.performance.selfSufficiencyPct)}%`}
                                current={s.performance.selfSufficiencyPct}
                                baseline={b.performance.selfSufficiencyPct}
                              />
                            ) : (
                              <span className="text-[var(--text-primary)]">{fmt(s.performance.selfSufficiencyPct)}%</span>
                            )}
                          </TableCell>
                          {/* Avg SOC */}
                          <TableCell>
                            {b ? (
                              <DeltaCell
                                value={`${fmt(s.performance.avgBatterySOC)}%`}
                                current={s.performance.avgBatterySOC}
                                baseline={b.performance.avgBatterySOC}
                              />
                            ) : (
                              <span className="text-[var(--text-primary)]">{fmt(s.performance.avgBatterySOC)}%</span>
                            )}
                          </TableCell>
                          {/* Savings */}
                          <TableCell>
                            {b ? (
                              <DeltaCell
                                value={fmtKES(s.performance.totalSavingsKES)}
                                current={s.performance.totalSavingsKES}
                                baseline={b.performance.totalSavingsKES}
                              />
                            ) : (
                              <span className="text-[var(--text-primary)]">{fmtKES(s.performance.totalSavingsKES)}</span>
                            )}
                          </TableCell>
                          {/* NPV */}
                          <TableCell>
                            {b ? (
                              <DeltaCell
                                value={fmtKES(s.finance.npvKes)}
                                current={s.finance.npvKes}
                                baseline={b.finance.npvKes}
                              />
                            ) : (
                              <span className="text-[var(--text-primary)]">{fmtKES(s.finance.npvKes)}</span>
                            )}
                          </TableCell>
                          {/* IRR */}
                          <TableCell>
                            {b ? (
                              <DeltaCell
                                value={s.finance.irrPct ? `${fmt(s.finance.irrPct)}%` : '—'}
                                current={s.finance.irrPct}
                                baseline={b.finance.irrPct}
                              />
                            ) : (
                              <span className="text-[var(--text-primary)]">
                                {s.finance.irrPct ? `${fmt(s.finance.irrPct)}%` : '—'}
                              </span>
                            )}
                          </TableCell>
                          {/* Payback */}
                          <TableCell>
                            {b ? (
                              <DeltaCell
                                value={s.finance.paybackYears ? `${fmt(s.finance.paybackYears)} yr` : '—'}
                                current={s.finance.paybackYears}
                                baseline={b.finance.paybackYears}
                                higherIsBetter={false}
                              />
                            ) : (
                              <span className="text-[var(--text-primary)]">
                                {s.finance.paybackYears ? `${fmt(s.finance.paybackYears)} yr` : '—'}
                              </span>
                            )}
                          </TableCell>
                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleLoad(s.id, s.name)}
                                className="h-8 px-2 text-[var(--text-secondary)] hover:text-[var(--battery)] hover:bg-[var(--battery-soft)]"
                                title="Load scenario config to dashboard"
                              >
                                <Upload className="h-3.5 w-3.5" />
                                <span className="sr-only">Load</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(s.id, s.name)}
                                className="h-8 px-2 text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-400/10"
                                title="Delete scenario"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          {baseline && (
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                Better than baseline
              </span>
              <span className="flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                Worse than baseline
              </span>
              <span className="flex items-center gap-1">
                <Minus className="h-3.5 w-3.5" />
                Within ±0.5% of baseline
              </span>
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
