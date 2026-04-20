'use client';

import React, { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Trash2, Upload, ArrowLeft, BookMarked, TrendingUp, TrendingDown, Minus,
  FileDown, Copy, BarChart2, FileUp, Copy as CopyIcon, X, Radar, Info,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  RadarChart, Radar as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
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
import { useEnergySystemStore, type SavedScenario, type FinancialSnapshot, type LocationCoordinatesSnapshot } from '@/stores/energySystemStore';
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
  onDetailClick: (id: string) => void;
}

function RenameCell({ id, name, isBaseline, onRename, onDetailClick }: RenameCellProps) {
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
    <span className="flex items-center gap-1.5">
      <button
        onClick={() => onDetailClick(id)}
        title="View scenario details"
        className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)] hover:text-[var(--solar)] transition-colors group"
      >
        {name}
        <Info className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
      </button>
      {isBaseline && (
        <Badge className="ml-0.5 text-[10px] px-1.5 py-0 bg-[var(--solar-soft)] text-[var(--solar)] border-[var(--solar)]/20">
          baseline
        </Badge>
      )}
      <button
        onDoubleClick={startEdit}
        onClick={(e) => { if (e.detail === 2) startEdit(); }}
        title="Double-click to rename"
        className="sr-only"
      />
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

// ── Detail Drawer ─────────────────────────────────────────────────────────────

interface DetailDrawerProps {
  scenario: SavedScenario | null;
  baseline: SavedScenario | undefined;
  onClose: () => void;
  onLoad: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

function DetailDrawer({ scenario, baseline, onClose, onLoad, onDuplicate, onDelete }: DetailDrawerProps) {
  if (!scenario) return null;

  const b = baseline && baseline.id !== scenario.id ? baseline : null;

  const kpiRows: Array<{ label: string; value: string; base?: string; current: number; baseNum: number; higherIsBetter?: boolean }> = [
    { label: 'PV Capacity', value: `${fmt(scenario.system.solarCapacityKW)} kW`, current: scenario.system.solarCapacityKW, baseNum: b?.system.solarCapacityKW ?? 0, base: b ? `${fmt(b.system.solarCapacityKW)} kW` : undefined },
    { label: 'Battery', value: `${fmt(scenario.system.batteryCapacityKWh)} kWh`, current: scenario.system.batteryCapacityKWh, baseNum: b?.system.batteryCapacityKWh ?? 0, base: b ? `${fmt(b.system.batteryCapacityKWh)} kWh` : undefined },
    { label: 'Inverter', value: `${fmt(scenario.system.inverterKW)} kW`, current: scenario.system.inverterKW, baseNum: b?.system.inverterKW ?? 0, base: b ? `${fmt(b.system.inverterKW)} kW` : undefined },
    { label: 'Total Solar', value: `${fmt(scenario.performance.totalSolarKWh)} kWh`, current: scenario.performance.totalSolarKWh, baseNum: b?.performance.totalSolarKWh ?? 0, base: b ? `${fmt(b.performance.totalSolarKWh)} kWh` : undefined },
    { label: 'Self-Sufficiency', value: `${fmt(scenario.performance.selfSufficiencyPct)}%`, current: scenario.performance.selfSufficiencyPct, baseNum: b?.performance.selfSufficiencyPct ?? 0, base: b ? `${fmt(b.performance.selfSufficiencyPct)}%` : undefined },
    { label: 'Avg Battery SOC', value: `${fmt(scenario.performance.avgBatterySOC)}%`, current: scenario.performance.avgBatterySOC, baseNum: b?.performance.avgBatterySOC ?? 0, base: b ? `${fmt(b.performance.avgBatterySOC)}%` : undefined },
    { label: 'Total Savings', value: fmtKES(scenario.performance.totalSavingsKES), current: scenario.performance.totalSavingsKES, baseNum: b?.performance.totalSavingsKES ?? 0, base: b ? fmtKES(b.performance.totalSavingsKES) : undefined },
    { label: 'Grid Import', value: `${fmt(scenario.performance.totalGridImportKWh)} kWh`, current: scenario.performance.totalGridImportKWh, baseNum: b?.performance.totalGridImportKWh ?? 0, higherIsBetter: false, base: b ? `${fmt(b.performance.totalGridImportKWh)} kWh` : undefined },
    { label: 'Grid Export', value: `${fmt(scenario.performance.totalGridExportKWh)} kWh`, current: scenario.performance.totalGridExportKWh, baseNum: b?.performance.totalGridExportKWh ?? 0, base: b ? `${fmt(b.performance.totalGridExportKWh)} kWh` : undefined },
    { label: 'NPV', value: fmtKES(scenario.finance.npvKes), current: scenario.finance.npvKes, baseNum: b?.finance.npvKes ?? 0, base: b ? fmtKES(b.finance.npvKes) : undefined },
    { label: 'IRR', value: `${fmt(scenario.finance.irrPct)}%`, current: scenario.finance.irrPct, baseNum: b?.finance.irrPct ?? 0, base: b ? `${fmt(b.finance.irrPct)}%` : undefined },
    { label: 'Payback', value: `${fmt(scenario.finance.paybackYears)} yr`, current: scenario.finance.paybackYears, baseNum: b?.finance.paybackYears ?? 0, higherIsBetter: false, base: b ? `${fmt(b.finance.paybackYears)} yr` : undefined },
    { label: 'LCOE', value: `KES ${fmt(scenario.finance.lcoeKesPerKwh)}/kWh`, current: scenario.finance.lcoeKesPerKwh, baseNum: b?.finance.lcoeKesPerKwh ?? 0, higherIsBetter: false, base: b ? `KES ${fmt(b.finance.lcoeKesPerKwh)}/kWh` : undefined },
    ...(scenario.engineering ? [
      { label: 'Specific Yield', value: `${fmt(scenario.engineering.specificYieldKWhPerKWp)} kWh/kWp`, current: scenario.engineering.specificYieldKWhPerKWp, baseNum: b?.engineering?.specificYieldKWhPerKWp ?? 0, base: b?.engineering ? `${fmt(b.engineering.specificYieldKWhPerKWp)} kWh/kWp` : undefined },
      { label: 'Performance Ratio', value: `${fmt(scenario.engineering.performanceRatioPct)}%`, current: scenario.engineering.performanceRatioPct, baseNum: b?.engineering?.performanceRatioPct ?? 0, base: b?.engineering ? `${fmt(b.engineering.performanceRatioPct)}%` : undefined },
      { label: 'Capacity Factor', value: `${fmt(scenario.engineering.capacityFactorPct)}%`, current: scenario.engineering.capacityFactorPct, baseNum: b?.engineering?.capacityFactorPct ?? 0, base: b?.engineering ? `${fmt(b.engineering.capacityFactorPct)}%` : undefined },
      { label: 'Battery Cycles', value: fmt(scenario.engineering.batteryCycles, 2), current: scenario.engineering.batteryCycles, baseNum: b?.engineering?.batteryCycles ?? 0, base: b?.engineering ? fmt(b.engineering.batteryCycles, 2) : undefined },
    ] : []),
  ];

  return (
    /*
     * Backdrop: covers only the content area (right of the sidebar).
     * The sidebar is at z-40 in DashboardLayout; this overlay is z-50 but
     * scoped so it never sits on top of the nav — sidebar links stay clickable.
     *
     * On mobile the sidebar is off-canvas (width 0), so `left-0` kicks in
     * via the CSS variable fallback and the full screen is covered as expected.
     */
    <div
      className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-width)] z-50 flex items-end md:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BookMarked className="h-5 w-5 text-[var(--solar)]" />
              {scenario.name}
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
              Saved {formatDate(scenario.createdAt)} · {scenario.location.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg p-1.5 hover:bg-[var(--bg-card-muted)] transition-colors"
            aria-label="Close detail panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* KPI grid */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {kpiRows.map((row) => (
              <div key={row.label} className="bg-[var(--bg-card-muted)] rounded-xl px-4 py-3 border border-[var(--border)]">
                <div className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] mb-1">{row.label}</div>
                <div className="font-semibold text-[var(--text-primary)] text-sm">
                  {row.base ? (
                    <DeltaCell
                      value={row.value}
                      current={row.current}
                      baseline={row.baseNum}
                      higherIsBetter={row.higherIsBetter}
                    />
                  ) : (
                    row.value
                  )}
                </div>
                {row.base && (
                  <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">baseline: {row.base}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => { onLoad(scenario.id, scenario.name); onClose(); }}
            className="bg-[var(--battery)] text-white hover:bg-[var(--battery-bright)]"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Load to Dashboard
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDuplicate(scenario.id)}
            className="border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <CopyIcon className="h-3.5 w-3.5 mr-1.5" />
            Duplicate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { onDelete(scenario.id, scenario.name); onClose(); }}
            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 ml-auto"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

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
            Paste the JSON copied from "Copy JSON", or upload a <code className="text-[var(--solar)] text-xs">.json</code> file exported from another SafariCharge session. Duplicate scenarios (same id) will be skipped.
          </DialogDescription>
        </DialogHeader>

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

// ── Radar normalisation ───────────────────────────────────────────────────────

function normaliseRadarData(
  scenarios: SavedScenario[],
  labelMap: Map<string, string>,
): Array<Record<string, string | number>> {
  if (scenarios.length === 0) return [];

  const axes: Array<{ key: string; label: string; get: (s: SavedScenario) => number }> = [
    { key: 'selfSuff',  label: 'Self-Suff %',   get: s => s.performance.selfSufficiencyPct },
    { key: 'savings',   label: 'Savings',        get: s => s.performance.totalSavingsKES },
    { key: 'npv',       label: 'NPV',            get: s => s.finance.npvKes },
    { key: 'irr',       label: 'IRR %',          get: s => s.finance.irrPct },
    { key: 'payback',   label: 'Payback (inv)',  get: s => s.finance.paybackYears ? 1 / s.finance.paybackYears : 0 },
    { key: 'solar',     label: 'Solar kWh',      get: s => s.performance.totalSolarKWh },
    { key: 'avgSOC',    label: 'Avg SOC',        get: s => s.performance.avgBatterySOC },
  ];

  const mins = axes.map(a => Math.min(...scenarios.map(a.get)));
  const maxs = axes.map(a => Math.max(...scenarios.map(a.get)));

  return axes.map((a, i) => {
    const row: Record<string, string | number> = { label: a.label };
    scenarios.forEach(s => {
      const range = maxs[i] - mins[i];
      const raw = a.get(s);
      const norm = range === 0 ? 80 : Math.round(((raw - mins[i]) / range) * 80 + 10);
      row[labelMap.get(s.id) ?? s.name] = norm;
    });
    return row;
  });
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function ScenariosPage() {
  const scenarios = useEnergySystemStore((s) => s.scenarios);
  const deleteScenario = useEnergySystemStore((s) => s.deleteScenario);
  const loadScenario = useEnergySystemStore((s) => s.loadScenario);
  const renameScenario = useEnergySystemStore((s) => s.renameScenario);
  const saveScenario = useEnergySystemStore((s) => s.saveScenario);
  const importScenarios = useEnergySystemStore((s) => s.importScenarios);
  const { toast } = useToast();

  const [baselineId, setBaselineId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [chartTab, setChartTab] = useState<'bar' | 'radar'>('bar');

  const baseline: SavedScenario | undefined = scenarios.find(s => s.id === baselineId);
  const detailScenario: SavedScenario | null = scenarios.find(s => s.id === detailId) ?? null;

  const handleDelete = (id: string, name: string) => {
    deleteScenario(id);
    if (baselineId === id) setBaselineId(null);
    setSelectedIds(prev => prev.filter(x => x !== id));
    toast({ title: 'Scenario deleted', description: `"${name}" was removed.` });
  };

  const handleLoad = (id: string, name: string) => {
    loadScenario(id);
    toast({ title: 'Scenario loaded', description: `"${name}" configuration restored to dashboard.` });
  };

  const handleDuplicate = useCallback((id: string) => {
    const source = scenarios.find(s => s.id === id);
    if (!source) return;
    const newName = `${source.name} (copy)`;
    const finance: FinancialSnapshot = { ...source.finance };
    const location: LocationCoordinatesSnapshot = { ...source.location };
    saveScenario(newName, finance, location);
    toast({ title: 'Scenario duplicated', description: `"${newName}" created.` });
  }, [scenarios, saveScenario, toast]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
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
    const rows = scenarios.map(s => [
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
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
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

  const handleExportPdf = () => {
    const targetScenarios = selectedIds.length >= 2
      ? scenarios.filter(s => selectedIds.includes(s.id))
      : scenarios;

    if (targetScenarios.length === 0) {
      toast({ title: 'Nothing to export', description: 'Save at least one scenario first.' });
      return;
    }

    const now = new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });

    const tableHeaders = ['Metric', ...targetScenarios.map(s => s.name)];
    const tableRows: Array<[string, ...string[]]> = [
      ['PV Capacity (kW)',   ...targetScenarios.map(s => fmt(s.system.solarCapacityKW))],
      ['Battery (kWh)',      ...targetScenarios.map(s => fmt(s.system.batteryCapacityKWh))],
      ['Inverter (kW)',      ...targetScenarios.map(s => fmt(s.system.inverterKW))],
      ['Total Solar (kWh)', ...targetScenarios.map(s => fmt(s.performance.totalSolarKWh))],
      ['Self-Sufficiency',  ...targetScenarios.map(s => `${fmt(s.performance.selfSufficiencyPct)}%`)],
      ['Avg Battery SOC',   ...targetScenarios.map(s => `${fmt(s.performance.avgBatterySOC)}%`)],
      ['Grid Import (kWh)', ...targetScenarios.map(s => fmt(s.performance.totalGridImportKWh))],
      ['Grid Export (kWh)', ...targetScenarios.map(s => fmt(s.performance.totalGridExportKWh))],
      ['Total Savings',     ...targetScenarios.map(s => fmtKES(s.performance.totalSavingsKES))],
      ['NPV',               ...targetScenarios.map(s => fmtKES(s.finance.npvKes))],
      ['IRR',               ...targetScenarios.map(s => `${fmt(s.finance.irrPct)}%`)],
      ['Payback (yr)',      ...targetScenarios.map(s => fmt(s.finance.paybackYears))],
      ['LCOE (KES/kWh)',    ...targetScenarios.map(s => fmt(s.finance.lcoeKesPerKwh))],
      ...(targetScenarios.some(s => s.engineering) ? [
        ['Specific Yield (kWh/kWp)', ...targetScenarios.map(s => s.engineering ? fmt(s.engineering.specificYieldKWhPerKWp) : '—')] as [string, ...string[]],
        ['Performance Ratio',        ...targetScenarios.map(s => s.engineering ? `${fmt(s.engineering.performanceRatioPct)}%` : '—')] as [string, ...string[]],
        ['Capacity Factor',          ...targetScenarios.map(s => s.engineering ? `${fmt(s.engineering.capacityFactorPct)}%` : '—')] as [string, ...string[]],
        ['Battery Cycles',           ...targetScenarios.map(s => s.engineering ? fmt(s.engineering.batteryCycles, 2) : '—')] as [string, ...string[]],
      ] : []),
    ];

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SafariCharge — Scenario Comparison</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 32px; font-size: 12px; }
  h1 { font-size: 20px; font-weight: 700; color: #01696f; margin-bottom: 4px; }
  .subtitle { color: #555; font-size: 11px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #01696f; color: #fff; text-align: left; padding: 8px 12px; font-weight: 600; font-size: 11px; }
  td { padding: 7px 12px; border-bottom: 1px solid #e5e5e5; }
  tr:nth-child(even) td { background: #f7fafa; }
  td:first-child { font-weight: 500; color: #444; }
  .footer { margin-top: 24px; font-size: 10px; color: #999; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
<h1>SafariCharge · Scenario Comparison</h1>
<p class="subtitle">Generated ${now} · ${targetScenarios.length} scenario${targetScenarios.length !== 1 ? 's' : ''}</p>
<table>
<thead><tr>${tableHeaders.map(h => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>
${tableRows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('\n')}
</tbody>
</table>
<p class="footer">SafariCharge Energy Management · safaricharge.co.ke · Nairobi, Kenya</p>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    } else {
      toast({ title: 'Popup blocked', description: 'Please allow popups for this site to export PDF.', variant: 'destructive' });
    }
  };

  // ── Import handler ──────────────────────────────────────────────────

  const handleImport = useCallback((json: string) => {
    const result = importScenarios(json);
    if (result.error) {
      toast({ title: 'Import failed', description: result.error, variant: 'destructive' });
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

  const selectedScenarios = scenarios.filter(s => selectedIds.includes(s.id));

  const labelMap = new Map<string, string>();
  const seenNames = new Map<string, number>();
  for (const s of selectedScenarios) {
    const count = seenNames.get(s.name) ?? 0;
    seenNames.set(s.name, count + 1);
    labelMap.set(s.id, count === 0 ? s.name : `${s.name} (${count + 1})`);
  }

  const barChartData = [
    { kpi: 'Solar (kWh)',   ...Object.fromEntries(selectedScenarios.map(s => [labelMap.get(s.id)!, Number(s.performance.totalSolarKWh.toFixed(1))])) },
    { kpi: 'Self-suff (%)', ...Object.fromEntries(selectedScenarios.map(s => [labelMap.get(s.id)!, Number(s.performance.selfSufficiencyPct.toFixed(1))])) },
    { kpi: 'Savings (KES)', ...Object.fromEntries(selectedScenarios.map(s => [labelMap.get(s.id)!, Number(s.performance.totalSavingsKES.toFixed(0))])) },
    { kpi: 'NPV (KES)',     ...Object.fromEntries(selectedScenarios.map(s => [labelMap.get(s.id)!, Number(s.finance.npvKes.toFixed(0))])) },
    { kpi: 'Payback (yr)', ...Object.fromEntries(selectedScenarios.map(s => [labelMap.get(s.id)!, Number(s.finance.paybackYears.toFixed(2))])) },
  ];

  const radarData = normaliseRadarData(selectedScenarios, labelMap);

  return (
    <DashboardLayout activeSection="scenarios">
      <Toaster />

      {/* Import dialog */}
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />

      {/* Detail drawer — scoped to content area, sidebar stays interactive */}
      {detailId && (
        <DetailDrawer
          scenario={detailScenario}
          baseline={baseline}
          onClose={() => setDetailId(null)}
          onLoad={handleLoad}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />
      )}

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
                    onClick={handleExportPdf}
                    className="border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    title={selectedIds.length >= 2 ? 'Export selected scenarios' : 'Export all scenarios'}
                  >
                    <FileDown className="h-3.5 w-3.5 mr-1.5" />
                    {selectedIds.length >= 2 ? 'Print Selected' : 'Print / PDF'}
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
                  <p className="text-[var(--text-primary)] font-semibold text-lg">No scenarios saved yet</p>
                  <p className="text-[var(--text-secondary)] text-sm mt-1">
                    Use the{' '}
                    <span className="inline-flex items-center gap-1 font-medium text-[var(--solar)]">
                      <BookMarked className="h-3.5 w-3.5" /> Save scenario
                    </span>{' '}
                    button in the dashboard header, or{' '}
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
                {scenarios.map(s => (
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
                      return scenarios.map(s => {
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
                                onDetailClick={setDetailId}
                              />
                            </TableCell>
                            <TableCell className="text-[var(--text-secondary)] text-xs">
                              {formatDate(s.createdAt)}
                            </TableCell>
                            <TableCell>
                              {b ? <DeltaCell value={fmt(s.system.solarCapacityKW)} current={s.system.solarCapacityKW} baseline={b.system.solarCapacityKW} /> : <span className="text-[var(--text-primary)]">{fmt(s.system.solarCapacityKW)}</span>}
                            </TableCell>
                            <TableCell>
                              {b ? <DeltaCell value={fmt(s.system.batteryCapacityKWh)} current={s.system.batteryCapacityKWh} baseline={b.system.batteryCapacityKWh} /> : <span className="text-[var(--text-primary)]">{fmt(s.system.batteryCapacityKWh)}</span>}
                            </TableCell>
                            <TableCell>
                              {b ? <DeltaCell value={fmt(s.performance.totalSolarKWh)} current={s.performance.totalSolarKWh} baseline={b.performance.totalSolarKWh} /> : <span className="text-[var(--text-primary)]">{fmt(s.performance.totalSolarKWh)}</span>}
                            </TableCell>
                            <TableCell>
                              {b ? <DeltaCell value={`${fmt(s.performance.selfSufficiencyPct)}%`} current={s.performance.selfSufficiencyPct} baseline={b.performance.selfSufficiencyPct} /> : <span className="text-[var(--text-primary)]">{fmt(s.performance.selfSufficiencyPct)}%</span>}
                            </TableCell>
                            <TableCell>
                              {b ? <DeltaCell value={`${fmt(s.performance.avgBatterySOC)}%`} current={s.performance.avgBatterySOC} baseline={b.performance.avgBatterySOC} /> : <span className="text-[var(--text-primary)]">{fmt(s.performance.avgBatterySOC)}%</span>}
                            </TableCell>
                            <TableCell>
                              {b ? <DeltaCell value={fmtKES(s.performance.totalSavingsKES)} current={s.performance.totalSavingsKES} baseline={b.performance.totalSavingsKES} /> : <span className="text-[var(--text-primary)]">{fmtKES(s.performance.totalSavingsKES)}</span>}
                            </TableCell>
                            <TableCell>
                              {b ? <DeltaCell value={fmtKES(s.finance.npvKes)} current={s.finance.npvKes} baseline={b.finance.npvKes} /> : <span className="text-[var(--text-primary)]">{fmtKES(s.finance.npvKes)}</span>}
                            </TableCell>
                            <TableCell>
                              {b ? <DeltaCell value={s.finance.irrPct ? `${fmt(s.finance.irrPct)}%` : '—'} current={s.finance.irrPct} baseline={b.finance.irrPct} /> : <span className="text-[var(--text-primary)]">{s.finance.irrPct ? `${fmt(s.finance.irrPct)}%` : '—'}</span>}
                            </TableCell>
                            <TableCell>
                              {b ? <DeltaCell value={s.finance.paybackYears ? `${fmt(s.finance.paybackYears)} yr` : '—'} current={s.finance.paybackYears} baseline={b.finance.paybackYears} higherIsBetter={false} /> : <span className="text-[var(--text-primary)]">{s.finance.paybackYears ? `${fmt(s.finance.paybackYears)} yr` : '—'}</span>}
                            </TableCell>
                            <TableCell>
                              {b ? <DeltaCell value={s.engineering ? `${fmt(s.engineering.specificYieldKWhPerKWp)} kWh/kWp` : '—'} current={s.engineering?.specificYieldKWhPerKWp ?? 0} baseline={b.engineering?.specificYieldKWhPerKWp ?? 0} /> : <span className="text-[var(--text-primary)]">{s.engineering ? `${fmt(s.engineering.specificYieldKWhPerKWp)} kWh/kWp` : '—'}</span>}
                            </TableCell>
                            <TableCell>
                              {b ? <DeltaCell value={s.engineering ? `${fmt(s.engineering.performanceRatioPct)}%` : '—'} current={s.engineering?.performanceRatioPct ?? 0} baseline={b.engineering?.performanceRatioPct ?? 0} /> : <span className="text-[var(--text-primary)]">{s.engineering ? `${fmt(s.engineering.performanceRatioPct)}%` : '—'}</span>}
                            </TableCell>
                            <TableCell>
                              {b ? <DeltaCell value={s.engineering ? `${fmt(s.engineering.capacityFactorPct)}%` : '—'} current={s.engineering?.capacityFactorPct ?? 0} baseline={b.engineering?.capacityFactorPct ?? 0} /> : <span className="text-[var(--text-primary)]">{s.engineering ? `${fmt(s.engineering.capacityFactorPct)}%` : '—'}</span>}
                            </TableCell>
                            <TableCell>
                              {b ? <DeltaCell value={s.engineering ? fmt(s.engineering.batteryCycles, 2) : '—'} current={s.engineering?.batteryCycles ?? 0} baseline={b.engineering?.batteryCycles ?? 0} /> : <span className="text-[var(--text-primary)]">{s.engineering ? fmt(s.engineering.batteryCycles, 2) : '—'}</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDetailId(s.id)}
                                  className="h-8 px-2 text-[var(--text-secondary)] hover:text-[var(--solar)] hover:bg-[var(--solar-soft)]"
                                  title="View details"
                                >
                                  <Info className="h-3.5 w-3.5" />
                                  <span className="sr-only">Details</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDuplicate(s.id)}
                                  className="h-8 px-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)]"
                                  title="Duplicate scenario"
                                >
                                  <CopyIcon className="h-3.5 w-3.5" />
                                  <span className="sr-only">Duplicate</span>
                                </Button>
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

          {/* Chart comparison — bar + radar tabs */}
          {selectedScenarios.length >= 2 && (
            <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-[var(--solar)]" />
                    Compare Charts ({selectedScenarios.length} selected)
                  </CardTitle>
                  <div className="flex items-center gap-1 bg-[var(--bg-card-muted)] rounded-lg p-1 border border-[var(--border)]">
                    <button
                      onClick={() => setChartTab('bar')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        chartTab === 'bar'
                          ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                          : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      <BarChart2 className="h-3 w-3" />
                      Bar
                    </button>
                    <button
                      onClick={() => setChartTab('radar')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        chartTab === 'radar'
                          ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                          : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      <Radar className="h-3 w-3" />
                      Radar
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {chartTab === 'bar' ? (
                  <>
                    <p className="text-xs text-[var(--text-tertiary)] mb-4">
                      Tip: click a scenario name in the table to view full details.
                    </p>
                    <ResponsiveContainer width="100%" height={340}>
                      <BarChart data={barChartData} margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="kpi" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} />
                        <YAxis
                          tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: number) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }}
                          formatter={(value: number, name: string) => {
                            const formatted = typeof value === 'number' && Math.abs(value) >= 100
                              ? `KES ${value.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`
                              : String(value);
                            return [formatted, name];
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                        {selectedScenarios.map((s, i) => (
                          <Bar key={s.id} dataKey={labelMap.get(s.id)!} fill={SCENARIO_COLOURS[i % SCENARIO_COLOURS.length]} radius={[3, 3, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-[var(--text-tertiary)] mb-4">
                      All axes are normalised (10–90) so different units can be shown together. Higher = better on every axis (Payback is inverted).
                    </p>
                    <ResponsiveContainer width="100%" height={360}>
                      <RadarChart data={radarData} margin={{ top: 16, right: 32, left: 32, bottom: 16 }}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} />
                        {selectedScenarios.map((s, i) => {
                          const colour = SCENARIO_COLOURS[i % SCENARIO_COLOURS.length];
                          const label = labelMap.get(s.id)!;
                          return (
                            <RechartsRadar
                              key={s.id}
                              name={label}
                              dataKey={label}
                              stroke={colour}
                              fill={colour}
                              fillOpacity={0.12}
                              dot={{ r: 3, fill: colour }}
                            />
                          );
                        })}
                        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </>
                )}
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
