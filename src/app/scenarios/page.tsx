'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Trash2, Upload, ArrowLeft, BookMarked, TrendingUp, TrendingDown, Minus,
  FileDown, Copy, BarChart2, FileUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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

function formatDateFilename(d: Date) {
  return d.toISOString().slice(0, 10);
}

// ── Delta indicator ──────────────────────────────────────────────────────────

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

// ── Inline rename cell ────────────────────────────────────────────────────────

interface RenameCellProps {
  id: string;
  name: string;
  isBaseline: boolean;
  onRename: (id: string, newName: string) => void;
}

function RenameCell({ id, name, isBaseline, onRename }: RenameCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setDraft(name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename(id, trimmed);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  if (editing) {
    return (
      <span className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          onBlur={commit}
          autoFocus
          className="bg-[var(--bg-card-muted)] border border-[var(--border)] text-[var(--text-primary)] text-sm rounded px-2 py-0.5 w-40 focus:outline-none focus:ring-1 focus:ring-[var(--solar)]"
        />
      </span>
    );
  }

  return (
    <span
      onDoubleClick={startEdit}
      title="Double-click to rename"
      className="cursor-text select-none flex items-center gap-1.5 font-semibold text-[var(--text-primary)]"
    >
      {name}
      {isBaseline && (
        <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-[var(--solar-soft)] text-[var(--solar)] border-[var(--solar)]/20">
          baseline
        </Badge>
      )}
    </span>
  );
}

// ── Scenario colours ──────────────────────────────────────────────────────────

const MAX_CHART_SCENARIOS = 4;

const SCENARIO_COLOURS = [
  'var(--solar)',
  'var(--battery)',
  'var(--grid)',
  '#a78bfa',
];

// ── Import dialog ────────────────────────────────────────────────────────────

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (json: string) => void;
}

function ImportDialog({ open, onOpenChange, onImport }: ImportDialogProps) {
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') setText(result);
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleSubmit = () => {
    onImport(text.trim());
    setText('');
  };

  const handleClose = () => {
    setText('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-4 w-4 text-[var(--solar)]" />
            Import Scenarios
          </DialogTitle>
          <DialogDescription className="text-[var(--text-secondary)]">
            Paste the JSON copied from “Copy JSON”, or upload a <code className="text-[var(--solar)] text-xs">.json</code> file exported from another SafariCharge session. Duplicate scenarios (same id) will be skipped.
          </DialogDescription>
        </DialogHeader>

        {/* File picker */}
        <div className="mt-1">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] w-full"
          >
            <FileUp className="h-3.5 w-3.5 mr-1.5" />
            Upload .json file
          </Button>
        </div>

        {/* Paste area */}
        <div className="relative">
          <div className="absolute inset-x-0 -top-px flex items-center">
            <div className="flex-1 border-t border-[var(--border)]" />
            <span className="px-2 text-xs text-[var(--text-tertiary)] bg-[var(--bg-card)]">or paste JSON</span>
            <div className="flex-1 border-t border-[var(--border)]" />
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'[\n  { "id": "...", "name": "10kW Scenario", ... }\n]'}
            rows={7}
            className="mt-5 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2 font-mono text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--solar)] resize-y"
            spellCheck={false}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={text.trim().length === 0}
            className="bg-[var(--battery)] text-white hover:bg-[var(--battery-bright)] disabled:opacity-50"
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function ScenariosPage() {
  const scenarios = useEnergySystemStore((s) => s.scenarios);
  const deleteScenario = useEnergySystemStore((s) => s.deleteScenario);
  const loadScenario = useEnergySystemStore((s) => s.loadScenario);
  const renameScenario = useEnergySystemStore((s) => s.renameScenario);
  const importScenarios = useEnergySystemStore((s) => s.importScenarios);
  const { toast } = useToast();

  const [baselineId, setBaselineId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);

  const baseline: SavedScenario | undefined = scenarios.find(
    (s) => s.id === baselineId
  );

  const handleDelete = (id: string, name: string) => {
    deleteScenario(id);
    if (baselineId === id) setBaselineId(null);
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    toast({ title: 'Scenario deleted', description: `"${name}" was removed.` });
  };

  const handleLoad = (id: string, name: string) => {
    loadScenario(id);
    toast({
      title: 'Scenario loaded',
      description: `"${name}" configuration restored to dashboard.`,
    });
  };

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_CHART_SCENARIOS) return prev;
      return [...prev, id];
    });
  }, []);

  // ── Export helpers ──────────────────────────────────────────────────

  const handleExportCsv = () => {
    const headers = [
      'Name', 'Saved', 'PV kW', 'Battery kWh', 'Solar kWh',
      'Self-suff %', 'Avg SOC %', 'Savings KES', 'NPV KES', 'IRR %', 'Payback yr',
    ];
    const rows = scenarios.map((s) => [
      s.name,
      new Date(s.createdAt).toISOString(),
      s.system.solarCapacityKW,
      s.system.batteryCapacityKWh,
      s.performance.totalSolarKWh.toFixed(2),
      s.performance.selfSufficiencyPct.toFixed(2),
      s.performance.avgBatterySOC.toFixed(2),
      s.performance.totalSavingsKES.toFixed(0),
      s.finance.npvKes.toFixed(0),
      s.finance.irrPct.toFixed(2),
      s.finance.paybackYears.toFixed(2),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safaricharge-scenarios-${formatDateFilename(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV exported', description: `${scenarios.length} scenarios downloaded.` });
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(scenarios, null, 2));
      toast({ title: 'Copied to clipboard', description: 'Scenarios JSON copied.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Could not access clipboard.', variant: 'destructive' });
    }
  };

  // ── Import handler ──────────────────────────────────────────────────

  const handleImport = useCallback((json: string) => {
    const result = importScenarios(json);
    if (result.error) {
      toast({
        title: 'Import failed',
        description: result.error,
        variant: 'destructive',
      });
      return;
    }
    setImportOpen(false);
    const parts: string[] = [];
    if (result.imported > 0) parts.push(`${result.imported} scenario${result.imported !== 1 ? 's' : ''} imported.`);
    if (result.skipped  > 0) parts.push(`${result.skipped} duplicate${result.skipped !== 1 ? 's' : ''} skipped.`);
    toast({
      title: result.imported > 0 ? 'Import successful' : 'Nothing new to import',
      description: parts.join(' ') || 'All scenarios were already present.',
    });
  }, [importScenarios, toast]);

  // ── Chart data ──────────────────────────────────────────────────

  const selectedScenarios = scenarios.filter((s) => selectedIds.includes(s.id));

  const labelMap = new Map<string, string>();
  const seenNames = new Map<string, number>();
  for (const s of selectedScenarios) {
    const count = seenNames.get(s.name) ?? 0;
    seenNames.set(s.name, count + 1);
    labelMap.set(s.id, count === 0 ? s.name : `${s.name} (${count + 1})`);
  }

  const chartData = [
    {
      kpi: 'Solar (kWh)',
      ...Object.fromEntries(selectedScenarios.map((s) => [labelMap.get(s.id)!, Number(s.performance.totalSolarKWh.toFixed(1))])),
    },
    {
      kpi: 'Self-suff (%)',
      ...Object.fromEntries(selectedScenarios.map((s) => [labelMap.get(s.id)!, Number(s.performance.selfSufficiencyPct.toFixed(1))])),
    },
    {
      kpi: 'Savings (KES)',
      ...Object.fromEntries(selectedScenarios.map((s) => [labelMap.get(s.id)!, Number(s.performance.totalSavingsKES.toFixed(0))])),
    },
    {
      kpi: 'NPV (KES)',
      ...Object.fromEntries(selectedScenarios.map((s) => [labelMap.get(s.id)!, Number(s.finance.npvKes.toFixed(0))])),
    },
    {
      kpi: 'Payback (yr)',
      ...Object.fromEntries(selectedScenarios.map((s) => [labelMap.get(s.id)!, Number(s.finance.paybackYears.toFixed(2))])),
    },
  ];

  return (
    <DashboardLayout activeSection="scenarios">
      <Toaster />

      {/* Import dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImport}
      />

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
            <div className="flex items-center gap-2 flex-wrap">
              {scenarios.length > 0 && (
                <Badge className="bg-[var(--solar-soft)] text-[var(--solar)] border-[var(--solar)]/20 px-3 py-1">
                  {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''} saved
                </Badge>
              )}

              {/* Import JSON — always visible so users can restore on a fresh session */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setImportOpen(true)}
                className="border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <FileUp className="h-3.5 w-3.5 mr-1.5" />
                Import JSON
              </Button>

              {scenarios.length > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportCsv}
                    className="border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <FileDown className="h-3.5 w-3.5 mr-1.5" />
                    Export CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyJson}
                    className="border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy JSON
                  </Button>
                </>
              )}
            </div>
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
                    button in the dashboard header to capture a snapshot, or{' '}
                    <button
                      onClick={() => setImportOpen(true)}
                      className="font-medium text-[var(--battery)] underline underline-offset-2 hover:opacity-80 transition-opacity"
                    >
                      import a JSON file
                    </button>{' '}
                    from a previous session.
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
                      <TableHead className="w-10 text-[var(--text-tertiary)] font-semibold">
                        <span className="sr-only">Select for chart</span>
                      </TableHead>
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
                      <TableHead className="text-[var(--text-tertiary)] font-semibold">Spec. Yield</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-semibold">Perf. Ratio</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-semibold">Cap. Factor</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-semibold">Bat. Cycles</TableHead>
                      <TableHead className="text-[var(--text-tertiary)] font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const selectedIndexMap = new Map(selectedIds.map((id, idx) => [id, idx]));
                      return scenarios.map((s) => {
                        const isBaseline = s.id === baselineId;
                        const b = baseline && !isBaseline ? baseline : null;
                        const isChecked = selectedIds.includes(s.id);
                        const selectedIndex = selectedIndexMap.get(s.id) ?? 0;
                        const colour = SCENARIO_COLOURS[selectedIndex % SCENARIO_COLOURS.length];
                        return (
                          <TableRow
                            key={s.id}
                            className={`border-[var(--border)] ${
                              isBaseline
                                ? 'bg-[var(--solar-soft)]/30'
                                : 'hover:bg-[var(--bg-card-muted)]/50'
                            }`}
                          >
                            <TableCell className="pr-0">
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleSelect(s.id)}
                                disabled={!isChecked && selectedIds.length >= MAX_CHART_SCENARIOS}
                                aria-label={`Select ${s.name} for chart comparison`}
                                style={isChecked ? { accentColor: colour } : undefined}
                              />
                            </TableCell>
                            <TableCell>
                              <RenameCell
                                id={s.id}
                                name={s.name}
                                isBaseline={isBaseline}
                                onRename={renameScenario}
                              />
                            </TableCell>
                            <TableCell className="text-[var(--text-secondary)] text-xs">
                              {formatDate(s.createdAt)}
                            </TableCell>
                          <TableCell>
                            {b ? (
                              <DeltaCell value={fmt(s.system.solarCapacityKW)} current={s.system.solarCapacityKW} baseline={b.system.solarCapacityKW} />
                            ) : (
                              <span className="text-[var(--text-primary)]">{fmt(s.system.solarCapacityKW)}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {b ? (
                              <DeltaCell value={fmt(s.system.batteryCapacityKWh)} current={s.system.batteryCapacityKWh} baseline={b.system.batteryCapacityKWh} />
                            ) : (
                              <span className="text-[var(--text-primary)]">{fmt(s.system.batteryCapacityKWh)}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {b ? (
                              <DeltaCell value={fmt(s.performance.totalSolarKWh)} current={s.performance.totalSolarKWh} baseline={b.performance.totalSolarKWh} />
                            ) : (
                              <span className="text-[var(--text-primary)]">{fmt(s.performance.totalSolarKWh)}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {b ? (
                              <DeltaCell value={`${fmt(s.performance.selfSufficiencyPct)}%`} current={s.performance.selfSufficiencyPct} baseline={b.performance.selfSufficiencyPct} />
                            ) : (
                              <span className="text-[var(--text-primary)]">{fmt(s.performance.selfSufficiencyPct)}%</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {b ? (
                              <DeltaCell value={`${fmt(s.performance.avgBatterySOC)}%`} current={s.performance.avgBatterySOC} baseline={b.performance.avgBatterySOC} />
                            ) : (
                              <span className="text-[var(--text-primary)]">{fmt(s.performance.avgBatterySOC)}%</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {b ? (
                              <DeltaCell value={fmtKES(s.performance.totalSavingsKES)} current={s.performance.totalSavingsKES} baseline={b.performance.totalSavingsKES} />
                            ) : (
                              <span className="text-[var(--text-primary)]">{fmtKES(s.performance.totalSavingsKES)}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {b ? (
                              <DeltaCell value={fmtKES(s.finance.npvKes)} current={s.finance.npvKes} baseline={b.finance.npvKes} />
                            ) : (
                              <span className="text-[var(--text-primary)]">{fmtKES(s.finance.npvKes)}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {b ? (
                              <DeltaCell value={s.finance.irrPct ? `${fmt(s.finance.irrPct)}%` : '—'} current={s.finance.irrPct} baseline={b.finance.irrPct} />
                            ) : (
                              <span className="text-[var(--text-primary)]">{s.finance.irrPct ? `${fmt(s.finance.irrPct)}%` : '—'}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {b ? (
                              <DeltaCell value={s.finance.paybackYears ? `${fmt(s.finance.paybackYears)} yr` : '—'} current={s.finance.paybackYears} baseline={b.finance.paybackYears} higherIsBetter={false} />
                            ) : (
                              <span className="text-[var(--text-primary)]">{s.finance.paybackYears ? `${fmt(s.finance.paybackYears)} yr` : '—'}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {b ? (
                              <DeltaCell value={s.engineering ? `${fmt(s.engineering.specificYieldKWhPerKWp)} kWh/kWp` : '—'} current={s.engineering?.specificYieldKWhPerKWp ?? 0} baseline={b.engineering?.specificYieldKWhPerKWp ?? 0} />
                            ) : (
                              <span className="text-[var(--text-primary)]">{s.engineering ? `${fmt(s.engineering.specificYieldKWhPerKWp)} kWh/kWp` : '—'}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {b ? (
                              <DeltaCell value={s.engineering ? `${fmt(s.engineering.performanceRatioPct)}%` : '—'} current={s.engineering?.performanceRatioPct ?? 0} baseline={b.engineering?.performanceRatioPct ?? 0} />
                            ) : (
                              <span className="text-[var(--text-primary)]">{s.engineering ? `${fmt(s.engineering.performanceRatioPct)}%` : '—'}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {b ? (
                              <DeltaCell value={s.engineering ? `${fmt(s.engineering.capacityFactorPct)}%` : '—'} current={s.engineering?.capacityFactorPct ?? 0} baseline={b.engineering?.capacityFactorPct ?? 0} />
                            ) : (
                              <span className="text-[var(--text-primary)]">{s.engineering ? `${fmt(s.engineering.capacityFactorPct)}%` : '—'}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {b ? (
                              <DeltaCell value={s.engineering ? fmt(s.engineering.batteryCycles, 2) : '—'} current={s.engineering?.batteryCycles ?? 0} baseline={b.engineering?.batteryCycles ?? 0} />
                            ) : (
                              <span className="text-[var(--text-primary)]">{s.engineering ? fmt(s.engineering.batteryCycles, 2) : '—'}</span>
                            )}
                          </TableCell>
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
                      });
                    })()}
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

          {/* Chart comparison */}
          {selectedScenarios.length >= 2 && (
            <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-[var(--solar)]" />
                  Compare Charts ({selectedScenarios.length} selected)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-[var(--text-tertiary)] mb-4">
                  Tip: double-click a scenario name in the table to rename it.
                </p>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="kpi"
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) =>
                        Math.abs(v) >= 1000
                          ? `${(v / 1000).toFixed(0)}k`
                          : String(v)
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        color: 'var(--text-primary)',
                        fontSize: 12,
                      }}
                      formatter={(value: number, name: string) => {
                        const formatted =
                          typeof value === 'number' && Math.abs(value) >= 100
                            ? `KES ${value.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
                            : String(value);
                        return [formatted, name];
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
                    />
                    {selectedScenarios.map((s, i) => (
                      <Bar
                        key={s.id}
                        dataKey={labelMap.get(s.id)!}
                        fill={SCENARIO_COLOURS[i % SCENARIO_COLOURS.length]}
                        radius={[3, 3, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {scenarios.length >= 2 && selectedScenarios.length < 2 && (
            <p className="text-xs text-[var(--text-tertiary)] text-center py-2">
              Select 2–4 scenarios using the checkboxes to compare them in a chart.
            </p>
          )}

        </div>
      </main>
    </DashboardLayout>
  );
}
