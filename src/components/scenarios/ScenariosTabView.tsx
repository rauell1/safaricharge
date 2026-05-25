'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Trash2, Upload, ArrowLeft, BookMarked, TrendingUp, TrendingDown,
  FileDown, Copy, BarChart2, FileUp, Copy as CopyIcon, X, Info,
  BookmarkPlus, Check, MapPin, History, Calendar, RotateCcw, Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchSimulationRuns, fetchSimulationDataPoints, deleteSimulationRun, type SimulationRun } from '@/lib/supabase-db';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  RadarChart, Radar as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { buildFinancialSnapshot } from '@/lib/financial-dashboard';
import { clearExternalUploadActive, markExternalUploadActive } from '@/lib/external-upload-guard';

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
          title="Rename scenario"
          placeholder="Rename scenario"
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
            onClick={() => { onLoad(scenario.id, scenario.name); onClose(); }}
            className="bg-[var(--battery)] text-white hover:bg-[var(--battery-bright)] rounded-xl"
          >
            <Upload className="h-4 w-4 mr-1.5" />Load to Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => onDuplicate(scenario.id)}
            className="border-[var(--border)] text-[var(--text-secondary)] rounded-xl"
          >
            <Copy className="h-4 w-4 mr-1.5" />Duplicate
          </Button>
          <Button
            variant="ghost"
            onClick={() => { onDelete(scenario.id, scenario.name); onClose(); }}
            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Import Dialog ────────────────────────────────────────────────────────────

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (json: string) => void;
}

function ImportDialog({ open, onOpenChange, onImport }: ImportDialogProps) {
  const [text, setText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const res = evt.target?.result;
      if (typeof res === 'string') {
        setText(res);
      }
    };
    reader.readAsText(file);
  };

  const handleUploadClick = () => {
    markExternalUploadActive(true);
    fileRef.current?.click();
  };

  useEffect(() => {
    if (!open) {
      setText('');
      clearExternalUploadActive();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[var(--bg-card)] border-[var(--border)] max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)] flex items-center gap-2">
            <FileUp className="h-5 w-5 text-[var(--battery)]" />
            Import Scenarios
          </DialogTitle>
          <DialogDescription className="text-[var(--text-tertiary)]">
            Paste a scenario JSON or upload a saved `.json` file from a previous session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='Paste your JSON content here (e.g. {"id": "...", "name": "..."})'
            className="w-full h-40 bg-[var(--bg-card-muted)] border border-[var(--border)] text-[var(--text-primary)] text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-[var(--solar)] font-mono resize-none"
          />

          <div className="flex items-center justify-between gap-4">
            <input
              type="file"
              ref={fileRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleUploadClick}
              className="border-[var(--border)] text-[var(--text-secondary)] rounded-xl"
            >
              <Upload className="h-4 w-4 mr-1.5" />
              Upload .json File
            </Button>
            <span className="text-[10px] text-[var(--text-tertiary)] max-w-[200px] truncate">
              {fileRef.current?.files?.[0]?.name || ''}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-[var(--text-secondary)] rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onImport(text)}
            disabled={!text.trim()}
            className="bg-[var(--battery)] text-white hover:bg-[var(--battery-bright)] rounded-xl"
          >
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Normalized radar data helper ──────────────────────────────────────────────

function normaliseRadarData(scenarios: SavedScenario[], labelMap: Map<string, string>) {
  if (scenarios.length === 0) return [];
  const axes = [
    { key: 'pv', label: 'PV (kW)', get: (s: SavedScenario) => s.system.solarCapacityKW },
    { key: 'battery', label: 'Battery (kWh)', get: (s: SavedScenario) => s.system.batteryCapacityKWh },
    { key: 'savings', label: 'Savings', get: (s: SavedScenario) => s.performance.totalSavingsKES },
    { key: 'npv', label: 'NPV', get: (s: SavedScenario) => s.finance.npvKes },
    { key: 'payback', label: 'Payback (yr)', get: (s: SavedScenario) => s.finance.paybackYears },
  ];
  const mins = axes.map(a => Math.min(...scenarios.map(a.get)));
  const maxs = axes.map(a => Math.max(...scenarios.map(a.get)));
  return axes.map((a, idx) => {
    const row: Record<string, string | number> = { label: a.label };
    const min = mins[idx] ?? 0;
    const max = maxs[idx] ?? 1;
    const range = max - min || 1;
    scenarios.forEach(s => {
      const label = labelMap.get(s.id)!;
      const raw = a.get(s);
      const scaled = a.key === 'payback' ? (max - raw) / range : (raw - min) / range;
      row[label] = Number((scaled * 100).toFixed(1));
    });
    return row;
  });
}

// ── Main nested view component ───────────────────────────────────────────────

interface ScenariosTabViewProps {
  onNavigateSection?: (section: any) => void;
}

export function ScenariosTabView({ onNavigateSection }: ScenariosTabViewProps) {
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

  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingRunId, setLoadingRunId] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const fetchedRuns = await fetchSimulationRuns();
      setRuns(fetchedRuns);
    } catch (err) {
      console.error('Failed to load past simulation runs:', err);
    } finally {
      setLoadingRuns(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const loadSimulationRunStore = useEnergySystemStore((s) => s.loadSimulationRun);

  const handleLoadRun = async (run: SimulationRun) => {
    setLoadingRunId(run.id);
    try {
      const dataPoints = await fetchSimulationDataPoints(run.id);
      loadSimulationRunStore(run, dataPoints);
      toast({
        title: 'Simulation run loaded',
        description: `"${run.name}" simulation state and time-series data restored.`,
      });
      onNavigateSection?.('dashboard');
    } catch (err: any) {
      toast({
        title: 'Failed to load run',
        description: err.message || 'Error occurred while loading simulation run data points.',
        variant: 'destructive',
      });
    } finally {
      setLoadingRunId(null);
    }
  };

  const handleDeleteRun = async (id: string, name: string) => {
    try {
      await deleteSimulationRun(id);
      setRuns(prev => prev.filter(r => r.id !== id));
      toast({
        title: 'Simulation run deleted',
        description: `"${name}" was successfully deleted.`,
      });
    } catch (err: any) {
      toast({
        title: 'Failed to delete run',
        description: err.message || 'Error occurred while deleting simulation run.',
        variant: 'destructive',
      });
    }
  };

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
    onNavigateSection?.('dashboard');
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

  const handleExportCsv = () => {
    const headers = [
      'Name', 'Saved', 'PV kW', 'Battery kWh', 'Solar kWh',
      'Self-suff', 'SOC', 'Savings', 'NPV', 'IRR', 'Payback'
    ];
    const rows = scenarios.map(s => [
      s.name, s.createdAt, s.system.solarCapacityKW, s.system.batteryCapacityKWh,
      s.performance.totalSolarKWh, s.performance.selfSufficiencyPct, s.performance.avgBatterySOC,
      s.performance.totalSavingsKES, s.finance.npvKes, s.finance.irrPct, s.finance.paybackYears
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,'
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `scenarios_${formatDateFilename(new Date())}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'CSV exported', description: `${scenarios.length} scenarios downloaded.` });
  };

  const handleExportPdf = () => {
    const targetScenarios = selectedIds.length >= 1
      ? scenarios.filter(s => selectedIds.includes(s.id))
      : scenarios;
    if (targetScenarios.length === 0) {
      toast({ title: 'Export failed', description: 'No scenarios available to export.', variant: 'destructive' });
      return;
    }
    const win = window.open('', '_blank');
    if (win) {
      const now = formatDate(new Date().toISOString());
      const tableHeaders = ['Metric', ...targetScenarios.map(s => s.name)];
      const matrix = [
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
          ['Specific Yield (kWh/kWp)', ...targetScenarios.map(s => s.engineering ? fmt(s.engineering.specificYieldKWhPerKWp) : '-')] as [string, ...string[]],
          ['Performance Ratio',        ...targetScenarios.map(s => s.engineering ? `${fmt(s.engineering.performanceRatioPct)}%` : '-')] as [string, ...string[]],
          ['Capacity Factor',          ...targetScenarios.map(s => s.engineering ? `${fmt(s.engineering.capacityFactorPct)}%` : '-')] as [string, ...string[]],
          ['Battery Cycles',           ...targetScenarios.map(s => s.engineering ? fmt(s.engineering.batteryCycles, 2) : '-')] as [string, ...string[]],
        ] : []),
      ];
      const tableRows = matrix.map(r => `<tr>${r.map((c, i) => i === 0 ? `<td style="font-weight:600;background:#fafafa">${c}</td>` : `<td>${c}</td>`).join('')}</tr>`).join('');
      win.document.write(`
        <html>
          <head>
            <title>SafariCharge - Scenario Matrix</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #333; padding: 40px; }
              h1 { font-size: 24px; margin-bottom: 5px; color: #10b981; }
              p.subtitle { font-size: 13px; color: #666; margin-top: 0; margin-bottom: 30px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
              th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; }
              th { background: #f3f4f6; font-weight: 600; }
              tr:hover { background: #f9fafb; }
            </style>
          </head>
          <body>
            <h1>SafariCharge Scenario Matrix</h1>
            <p class="subtitle">Generated ${now} · ${targetScenarios.length} scenario${targetScenarios.length !== 1 ? 's' : ''}</p>
            <table>
              <thead>
                <tr>${tableHeaders.map(h => `<th>${h}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </body>
        </html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 400);
    } else {
      toast({ title: 'Popup blocked', description: 'Please allow popups for this site to export PDF.', variant: 'destructive' });
    }
  };

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
    { kpi: 'Payback (yr)',  ...Object.fromEntries(selectedScenarios.map(s => [labelMap.get(s.id)!, Number(s.finance.paybackYears.toFixed(2))])) },
  ];

  const radarData = normaliseRadarData(selectedScenarios, labelMap);

  return (
    <div className="flex-1 min-w-0">
      {/* Import dialog */}
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onImport={handleImport} />

      {/* Detail drawer */}
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onNavigateSection?.('dashboard')}
                className="h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <BookMarked className="h-6 w-6 text-[var(--solar)]" />
                  Saved Scenarios &amp; Run History
                </h1>
                <p className="text-sm text-[var(--text-tertiary)]">
                  Compare named system configurations and reload historical simulation data points.
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
                <FileUp className="h-4 w-4 mr-1.5" />
                Import Scenarios
              </Button>

              {scenarios.length > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportCsv}
                    className="border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <FileDown className="h-4 w-4 mr-1.5" />
                    Export CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportPdf}
                    className="border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <Copy className="h-4 w-4 mr-1.5" />
                    Print Matrix
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
                    Run the simulation and click <span className="font-medium text-[var(--solar)]">Save Scenario</span> on the main dashboard, or{' '}
                    <button
                      onClick={() => setImportOpen(true)}
                      className="font-medium text-[var(--battery)] underline underline-offset-2 hover:opacity-80 transition-opacity"
                    >
                      import a JSON file
                    </button>{' '}
                    from a previous session.
                  </p>
                </div>
                <Button onClick={() => onNavigateSection?.('dashboard')} className="mt-2 bg-[var(--battery)] text-white hover:bg-[var(--battery-bright)]">
                  Go to Dashboard
                </Button>
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
                      <TableHead className="text-[var(--text-tertiary)] font-semibold">Location</TableHead>
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
                            <TableCell className="text-[var(--text-secondary)] font-medium text-xs">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                {s.location?.name || 'Nairobi'}
                              </div>
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
                              {b ? <DeltaCell value={`${fmt(s.finance.irrPct)}%`} current={s.finance.irrPct} baseline={b.finance.irrPct} /> : <span className="text-[var(--text-primary)]">{fmt(s.finance.irrPct)}%</span>}
                            </TableCell>
                            <TableCell>
                              {b ? <DeltaCell value={`${fmt(s.finance.paybackYears)} yr`} current={s.finance.paybackYears} baseline={b.finance.paybackYears} higherIsBetter={false} /> : <span className="text-[var(--text-primary)]">{fmt(s.finance.paybackYears)} yr</span>}
                            </TableCell>
                            <TableCell className="text-[var(--text-primary)]">{s.engineering ? fmt(s.engineering.specificYieldKWhPerKWp) : '—'}</TableCell>
                            <TableCell className="text-[var(--text-primary)]">{s.engineering ? `${fmt(s.engineering.performanceRatioPct)}%` : '—'}</TableCell>
                            <TableCell className="text-[var(--text-primary)]">{s.engineering ? `${fmt(s.engineering.capacityFactorPct)}%` : '—'}</TableCell>
                            <TableCell className="text-[var(--text-primary)]">{s.engineering ? fmt(s.engineering.batteryCycles, 2) : '—'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleLoad(s.id, s.name)}
                                  className="h-7 px-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                >
                                  <Upload className="h-3 w-3 mr-1" />Load
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDuplicate(s.id)}
                                  className="h-7 px-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                >
                                  <CopyIcon className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(s.id, s.name)}
                                  className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                >
                                  <Trash2 className="h-3 w-3" />
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

          {/* Chart comparison */}
          {selectedScenarios.length >= 2 && (
            <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" />
                    Comparison Chart
                    <Badge className="bg-[var(--solar-soft)] text-[var(--solar)] border-[var(--solar)]/20 text-[10px] px-1.5 py-0">
                      {selectedScenarios.length} selected
                    </Badge>
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={chartTab === 'bar' ? 'default' : 'outline'}
                      onClick={() => setChartTab('bar')}
                      className={chartTab === 'bar' ? 'bg-[var(--solar)] text-[var(--bg-primary)] h-7 px-3 text-xs' : 'border-[var(--border)] h-7 px-3 text-xs text-[var(--text-secondary)]'}
                    >
                      Bar
                    </Button>
                    <Button
                      size="sm"
                      variant={chartTab === 'radar' ? 'default' : 'outline'}
                      onClick={() => setChartTab('radar')}
                      className={chartTab === 'radar' ? 'bg-[var(--solar)] text-[var(--bg-primary)] h-7 px-3 text-xs' : 'border-[var(--border)] h-7 px-3 text-xs text-[var(--text-secondary)]'}
                    >
                      Radar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {chartTab === 'bar' ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={barChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="kpi" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                      {selectedScenarios.map((s, i) => (
                        <Bar key={s.id} dataKey={labelMap.get(s.id)!} fill={SCENARIO_COLOURS[i % SCENARIO_COLOURS.length]} radius={[4, 4, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis dataKey="label" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
                      <PolarRadiusAxis tick={{ fill: 'var(--text-faint)', fontSize: 9 }} />
                      {selectedScenarios.map((s, i) => (
                        <RechartsRadar
                          key={s.id}
                          name={labelMap.get(s.id)!}
                          dataKey={labelMap.get(s.id)!}
                          stroke={SCENARIO_COLOURS[i % SCENARIO_COLOURS.length]}
                          fill={SCENARIO_COLOURS[i % SCENARIO_COLOURS.length]}
                          fillOpacity={0.18}
                        />
                      ))}
                      <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Past Simulation Runs & Geographical History ── */}
          <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-card mt-6">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-2">
                <History className="h-4 w-4 text-[var(--battery)]" />
                Geographical Simulation Run History (PVsyst)
              </CardTitle>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Browse and reload your past simulation runs by location. Load exact historical minute-level time-series data and design parameters back into your active dashboard.
              </p>
            </CardHeader>
            <CardContent>
              {loadingRuns ? (
                <div className="flex items-center justify-center py-12 gap-2 text-[var(--text-secondary)] text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--battery)]" />
                  Loading historical simulation runs from Supabase...
                </div>
              ) : runs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                  <History className="h-8 w-8 text-[var(--text-tertiary)] opacity-30" />
                  <div>
                    <p className="text-[var(--text-primary)] font-medium text-sm">No historical simulation runs found</p>
                    <p className="text-[var(--text-tertiary)] text-xs mt-0.5">Runs you execute and save on the Simulation page will appear here.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Grouped by Location name */}
                  {(() => {
                    const runsByLocation: Record<string, SimulationRun[]> = {};
                    runs.forEach(r => {
                      const loc = r.location_name || 'Nairobi';
                      if (!runsByLocation[loc]) runsByLocation[loc] = [];
                      runsByLocation[loc].push(r);
                    });

                    return Object.entries(runsByLocation).map(([locName, locRuns]) => {
                      const firstRun = locRuns[0];
                      const lat = firstRun.latitude ? Number(firstRun.latitude).toFixed(4) : null;
                      const lon = firstRun.longitude ? Number(firstRun.longitude).toFixed(4) : null;

                      return (
                        <div key={locName} className="border border-[var(--border)]/40 rounded-xl overflow-hidden bg-[var(--bg-primary)]/20">
                          <div className="bg-[var(--bg-card-muted)]/40 px-4 py-3 border-b border-[var(--border)]/40 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-[var(--solar-soft)] flex items-center justify-center">
                                <MapPin className="h-4 w-4 text-[var(--solar)]" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-[var(--text-primary)]">{locName}</h4>
                                {lat && lon && (
                                  <p className="text-[10px] text-[var(--text-tertiary)]">
                                    Coordinates: {lat}°N, {lon}°E
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className="bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] font-mono text-[10px]">
                              {locRuns.length} Run{locRuns.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <div className="divide-y divide-[var(--border)]/30">
                            {locRuns.map(run => {
                              const sum = run.summary_json || {};
                              const isCurrentlyLoading = loadingRunId === run.id;
                              
                              return (
                                <div key={run.id} className="p-4 flex items-center justify-between gap-4 flex-wrap hover:bg-[var(--bg-card-muted)]/20 transition-all">
                                  <div className="space-y-1.5 min-w-[200px]">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-[var(--text-primary)]">{run.name}</span>
                                      <Badge className="bg-[var(--battery-soft)] text-[var(--battery)] border-[var(--battery)]/10 text-[9px] px-1.5 py-0.2">
                                        {run.system_mode || 'hybrid'}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {new Date(run.created_at).toLocaleString()}
                                      </div>
                                      <div>
                                        Solar: <span className="font-semibold text-[var(--text-secondary)]">{run.solar_capacity_kw ?? 0} kW</span>
                                      </div>
                                      <div>
                                        Battery: <span className="font-semibold text-[var(--text-secondary)]">{run.battery_capacity_kwh ?? 0} kWh</span>
                                      </div>
                                      <div>
                                        Inverter: <span className="font-semibold text-[var(--text-secondary)]">{run.inverter_kw ?? 0} kW</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* KPIs preview */}
                                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--text-secondary)]">
                                    {sum.totalSavingsKes !== undefined && (
                                      <div className="flex flex-col">
                                        <span className="text-[10px] text-[var(--text-tertiary)]">Savings</span>
                                        <span className="font-semibold text-emerald-400">KES {Math.round(Number(sum.totalSavingsKes)).toLocaleString()}</span>
                                      </div>
                                    )}
                                    {sum.lcoeKesPerKwh !== undefined && (
                                      <div className="flex flex-col">
                                        <span className="text-[10px] text-[var(--text-tertiary)]">LCOE</span>
                                        <span className="font-semibold text-[var(--solar)]">{Number(sum.lcoeKesPerKwh).toFixed(2)} KES/kWh</span>
                                      </div>
                                    )}
                                    {sum.paybackYears !== undefined && (
                                      <div className="flex flex-col">
                                        <span className="text-[10px] text-[var(--text-tertiary)]">Payback</span>
                                        <span className="font-semibold">{Number(sum.paybackYears).toFixed(2)} yrs</span>
                                      </div>
                                    )}
                                    {sum.selfSufficiencyPct !== undefined && (
                                      <div className="flex flex-col">
                                        <span className="text-[10px] text-[var(--text-tertiary)]">Self-Suff.</span>
                                        <span className="font-semibold text-sky-400">{Number(sum.selfSufficiencyPct).toFixed(1)}%</span>
                                      </div>
                                    )}
                                    {sum.batteryCycles !== undefined && (
                                      <div className="flex flex-col">
                                        <span className="text-[10px] text-[var(--text-tertiary)]">Bat. Cycles</span>
                                        <span className="font-semibold">{Number(sum.batteryCycles).toFixed(2)}/yr</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={loadingRunId !== null}
                                      onClick={() => handleLoadRun(run)}
                                      className="border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--battery)] hover:text-white"
                                    >
                                      {isCurrentlyLoading ? (
                                        <>
                                          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                          Loading...
                                        </>
                                      ) : (
                                        <>
                                          <RotateCcw className="h-3 w-3 mr-1.5" />
                                          Load Run
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      disabled={loadingRunId !== null}
                                      onClick={() => handleDeleteRun(run.id, run.name)}
                                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
