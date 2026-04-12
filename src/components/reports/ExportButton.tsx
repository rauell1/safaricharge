'use client';

import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEnergySystemStore, type MinuteDataPoint } from '@/stores/energySystemStore';

// ── CSV helpers ───────────────────────────────────────────────────────────────

function escapeCsv(value: string | number | boolean): string {
  const s = String(value);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function toCsvRow(row: (string | number | boolean)[]): string {
  return row.map(escapeCsv).join(',');
}

const MINUTE_DATA_HEADERS = [
  'Timestamp', 'Date', 'Hour', 'Minute',
  'Solar kW', 'Home Load kW', 'EV1 Load kW', 'EV2 Load kW',
  'Battery kW', 'Battery SOC %', 'Grid Import kW', 'Grid Export kW',
  'EV1 SOC %', 'EV2 SOC %', 'Tariff Rate', 'Peak?',
  'Savings KES', 'Solar kWh', 'Home kWh', 'EV1 kWh', 'EV2 kWh',
  'Grid Import kWh', 'Grid Export kWh',
];

function minuteDataToRows(data: MinuteDataPoint[]): (string | number | boolean)[][] {
  return data.map((d) => [
    d.timestamp, d.date, d.hour, d.minute,
    d.solarKW, d.homeLoadKW, d.ev1LoadKW, d.ev2LoadKW,
    d.batteryPowerKW, d.batteryLevelPct, d.gridImportKW, d.gridExportKW,
    d.ev1SocPct, d.ev2SocPct, d.tariffRate, d.isPeakTime,
    d.savingsKES, d.solarEnergyKWh, d.homeLoadKWh, d.ev1LoadKWh, d.ev2LoadKWh,
    d.gridImportKWh, d.gridExportKWh,
  ]);
}

function buildCsv(headers: string[], rows: (string | number | boolean)[][]): string {
  return [toCsvRow(headers), ...rows.map(toCsvRow)].join('\n');
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDateSlug(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ── Summary CSV ───────────────────────────────────────────────────────────────

function buildSummaryCsv(
  accumulators: ReturnType<typeof useEnergySystemStore.getState>['accumulators'],
  systemConfig: ReturnType<typeof useEnergySystemStore.getState>['systemConfig'],
  minuteData: MinuteDataPoint[]
): string {
  const totalLoad = minuteData.reduce(
    (s, d) => s + (d.homeLoadKWh ?? 0) + (d.ev1LoadKWh ?? 0) + (d.ev2LoadKWh ?? 0), 0
  );
  const gridImport = minuteData.reduce((s, d) => s + (d.gridImportKWh ?? 0), 0);
  const selfSufficiency = totalLoad > 0
    ? Math.min(100, ((totalLoad - gridImport) / totalLoad) * 100)
    : 0;

  const headers = ['Metric', 'Value', 'Unit'];
  const rows: [string, string, string][] = [
    ['Solar Capacity', String(systemConfig.solarCapacityKW), 'kWp'],
    ['Battery Capacity', String(systemConfig.batteryCapacityKWh), 'kWh'],
    ['Total Solar Generated', accumulators.solar.toFixed(2), 'kWh'],
    ['Total Savings', accumulators.savings.toFixed(2), 'KES'],
    ['Grid Import', accumulators.gridImport.toFixed(2), 'kWh'],
    ['Carbon Offset', accumulators.carbonOffset.toFixed(2), 'kg CO₂'],
    ['Battery Discharge', accumulators.batDischargeKwh.toFixed(2), 'kWh'],
    ['Feed-in Earnings', accumulators.feedInEarnings.toFixed(2), 'KES'],
    ['Self-Sufficiency', selfSufficiency.toFixed(1), '%'],
    ['Data Points', String(minuteData.length), 'minutes'],
    ['Peak Tariff', String(systemConfig.gridTariff.peakRate), 'KES/kWh'],
    ['Off-Peak Tariff', String(systemConfig.gridTariff.offPeakRate), 'KES/kWh'],
  ];
  return buildCsv(headers, rows);
}

// ── JSON export ───────────────────────────────────────────────────────────────

function buildJsonExport(
  minuteData: MinuteDataPoint[],
  accumulators: ReturnType<typeof useEnergySystemStore.getState>['accumulators'],
  systemConfig: ReturnType<typeof useEnergySystemStore.getState>['systemConfig']
): string {
  return JSON.stringify(
    { exportedAt: new Date().toISOString(), systemConfig, accumulators, minuteData },
    null,
    2
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ExportButtonProps {
  /** Optional extra label prefix (e.g. "Simulation") */
  label?: string;
  /** Disable the button (e.g. while simulation is running) */
  disabled?: boolean;
  /** Extra CSS classes */
  className?: string;
}

export function ExportButton({ label = 'Export', disabled, className }: ExportButtonProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const minuteData   = useEnergySystemStore((s) => s.minuteData);
  const accumulators = useEnergySystemStore((s) => s.accumulators);
  const systemConfig = useEnergySystemStore((s) => s.systemConfig);
  const currentDate  = useEnergySystemStore((s) => s.currentDate);

  const hasData = minuteData.length > 0;
  const slug    = formatDateSlug(new Date(currentDate));

  async function run(key: string, fn: () => void) {
    setLoading(key);
    // Yield to React so the spinner renders before the (sync) export work
    await new Promise((r) => setTimeout(r, 50));
    try { fn(); } finally { setLoading(null); }
  }

  const handleRawCsv = () =>
    run('csv-raw', () => downloadFile(
      buildCsv(MINUTE_DATA_HEADERS, minuteDataToRows(minuteData)),
      `safaricharge-minutedata-${slug}.csv`,
      'text/csv'
    ));

  const handleSummaryCsv = () =>
    run('csv-summary', () => downloadFile(
      buildSummaryCsv(accumulators, systemConfig, minuteData),
      `safaricharge-summary-${slug}.csv`,
      'text/csv'
    ));

  const handleJson = () =>
    run('json', () => downloadFile(
      buildJsonExport(minuteData, accumulators, systemConfig),
      `safaricharge-export-${slug}.json`,
      'application/json'
    ));

  const isLoading = loading !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !hasData || isLoading}
          className={`flex items-center gap-2 text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--battery)] transition-colors ${className ?? ''}`}
        >
          {isLoading
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Download className="h-4 w-4" />}
          {label}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-[var(--bg-card)] border-[var(--border)]">
        <DropdownMenuItem
          onClick={handleRawCsv}
          disabled={loading === 'csv-raw'}
          className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-[var(--battery)]" />
          Raw minute data (CSV)
          <span className="ml-auto text-[10px] text-[var(--text-tertiary)]">{minuteData.length} rows</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleSummaryCsv}
          disabled={loading === 'csv-summary'}
          className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer"
        >
          <FileText className="h-4 w-4 text-[var(--solar)]" />
          Summary report (CSV)
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[var(--border)]" />
        <DropdownMenuItem
          onClick={handleJson}
          disabled={loading === 'json'}
          className="flex items-center gap-2 text-sm text-[var(--text-primary)] cursor-pointer"
        >
          <Download className="h-4 w-4 text-[var(--consumption)]" />
          Full data (JSON)
        </DropdownMenuItem>
        {!hasData && (
          <>
            <DropdownMenuSeparator className="bg-[var(--border)]" />
            <div className="px-3 py-2 text-[10px] text-[var(--text-tertiary)]">
              Run the simulation to enable exports.
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
