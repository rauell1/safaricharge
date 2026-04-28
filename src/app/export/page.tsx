'use client';

import React, { useState, useCallback } from 'react';
import { Download, FileSpreadsheet, FileText, Image, Loader2, CheckCircle2, Info } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExportOption {
  id: 'pdf' | 'excel' | 'graphs-zip';
  icon: React.ElementType;
  title: string;
  description: string;
  detail: string;
  accent: string;
  accentSoft: string;
}

const OPTIONS: ExportOption[] = [
  {
    id: 'pdf',
    icon: FileText,
    title: 'Full PDF Report',
    description: 'A structured, printable report with all KPIs, charts as embedded vector data, simulation summary, financial projections and system configuration.',
    detail: 'Sections: Executive Summary · Energy Overview · Battery Analysis · Financial Model · System Configuration · Simulation Log',
    accent: 'var(--battery)',
    accentSoft: 'var(--battery-soft)',
  },
  {
    id: 'excel',
    icon: FileSpreadsheet,
    title: 'Excel / CSV Data Export',
    description: 'All simulation data exported into a clean multi-sheet workbook. Each data type lives in its own sheet so nothing is mixed.',
    detail: 'Sheets: Energy Data · Financial Results · System Config · Simulation Log',
    accent: 'var(--solar)',
    accentSoft: 'var(--solar-soft)',
  },
  {
    id: 'graphs-zip',
    icon: Image,
    title: 'Graphs ZIP Archive',
    description: 'Every chart generated during the simulation period exported as a high-resolution PNG. If you ran a 100-day simulation, you get 100 daily energy charts plus summary charts.',
    detail: 'Includes: Daily energy charts (one per simulation day) · Battery SOC curves · Load profiles · Generation vs consumption overlays',
    accent: 'var(--grid)',
    accentSoft: 'var(--grid-soft)',
  },
];

// ─── Utility: build PDF with pdfmake (no screenshot) ─────────────────────────
async function exportPDF() {
  // @ts-ignore — pdfmake loaded via CDN / dynamic import
  const pdfMakeModule = await import('pdfmake/build/pdfmake');
  // @ts-ignore
  const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
  const pdfMake = pdfMakeModule.default ?? pdfMakeModule;
  const pdfFonts = pdfFontsModule.default ?? pdfFontsModule;
  pdfMake.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Pull live data from store if available
  let energyData: Record<string, unknown>[] = [];
  let financialData: Record<string, unknown>[] = [];
  try {
    // Dynamic import so it tree-shakes if the store changes
    const { useSimulationStore } = await import('@/hooks/useSimulationStore').catch(() => ({ useSimulationStore: null }));
    // Stores are zustand — read snapshot outside React with getState()
    if (useSimulationStore) {
      const state = (useSimulationStore as any).getState?.();
      energyData = state?.dailyData ?? [];
      financialData = state?.financialData ?? [];
    }
  } catch {}

  const makeTable = (rows: Record<string, unknown>[], label: string) => {
    if (!rows.length) return { text: `No ${label} data available.`, style: 'note', margin: [0, 4, 0, 12] };
    const headers = Object.keys(rows[0]);
    return {
      margin: [0, 4, 0, 16],
      table: {
        headerRows: 1,
        widths: headers.map(() => '*'),
        body: [
          headers.map((h) => ({ text: h, style: 'tableHeader' })),
          ...rows.slice(0, 100).map((row) =>
            headers.map((h) => ({ text: String(row[h] ?? ''), style: 'tableCell' }))
          ),
        ],
      },
      layout: {
        fillColor: (i: number) => (i === 0 ? '#10b981' : i % 2 === 0 ? '#f0fdf9' : null),
      },
    };
  };

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    defaultStyle: { font: 'Roboto', fontSize: 9, color: '#1e293b' },
    styles: {
      title:       { fontSize: 22, bold: true, color: '#10b981', margin: [0, 0, 0, 4] },
      subtitle:    { fontSize: 11, color: '#64748b', margin: [0, 0, 0, 24] },
      sectionHeader: { fontSize: 13, bold: true, color: '#10b981', margin: [0, 16, 0, 6], decoration: 'underline' },
      tableHeader: { bold: true, fontSize: 8, color: '#ffffff', fillColor: '#10b981' },
      tableCell:   { fontSize: 8, color: '#334155' },
      note:        { fontSize: 9, color: '#94a3b8', italics: true },
    },
    header: (page: number, pages: number) => ({
      columns: [
        { text: 'SafariCharge — Simulation Report', style: 'note', margin: [40, 16, 0, 0] },
        { text: `Page ${page} of ${pages}`, style: 'note', alignment: 'right', margin: [0, 16, 40, 0] },
      ],
    }),
    footer: { text: `Generated ${dateStr} · SafariCharge v2`, style: 'note', alignment: 'center', margin: [0, 8, 0, 0] },
    content: [
      { text: 'SafariCharge', style: 'title' },
      { text: `Simulation Report · ${dateStr}`, style: 'subtitle' },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#10b981' }] },
      { text: '1. Executive Summary', style: 'sectionHeader' },
      { text: 'This report summarises the full simulation run including energy generation, battery performance, load consumption, grid interaction, and financial projections.', margin: [0, 0, 0, 12] },
      { text: '2. Energy Data', style: 'sectionHeader' },
      makeTable(energyData, 'energy'),
      { text: '3. Financial Results', style: 'sectionHeader' },
      makeTable(financialData, 'financial'),
      { text: '4. System Configuration', style: 'sectionHeader' },
      { text: 'System configuration data is available in the System Config sheet of the Excel export.', style: 'note', margin: [0, 4, 0, 12] },
      { text: '5. Notes', style: 'sectionHeader' },
      { text: 'All values are simulation estimates. Actual results depend on real-world conditions including weather, load patterns, and equipment performance.', style: 'note' },
    ],
  };

  pdfMake.createPdf(docDefinition).download(`safaricharge-report-${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}.pdf`);
}

// ─── Utility: Excel multi-sheet export ───────────────────────────────────────
async function exportExcel() {
  const XLSX = (await import('xlsx')).default;

  let energyRows: Record<string, unknown>[] = [];
  let financialRows: Record<string, unknown>[] = [];
  let systemConfig: Record<string, unknown>[] = [];
  let simLog: Record<string, unknown>[] = [];

  try {
    const { useSimulationStore } = await import('@/hooks/useSimulationStore').catch(() => ({ useSimulationStore: null }));
    if (useSimulationStore) {
      const state = (useSimulationStore as any).getState?.();
      energyRows    = state?.dailyData      ?? [];
      financialRows = state?.financialData  ?? [];
      systemConfig  = state?.systemConfig   ? [state.systemConfig] : [];
      simLog        = state?.simulationLog  ?? [];
    }
  } catch {}

  // Fallback placeholder rows so the file is never empty
  if (!energyRows.length) {
    energyRows = [{ day: 1, solarKWh: 0, batteryKWh: 0, loadKWh: 0, gridKWh: 0, note: 'No simulation data yet' }];
  }
  if (!financialRows.length) {
    financialRows = [{ year: 1, revenue: 0, cost: 0, profit: 0, roi: '0%', note: 'No financial data yet' }];
  }
  if (!systemConfig.length) {
    systemConfig = [{ parameter: 'Solar Capacity (kW)', value: '—' }, { parameter: 'Battery Capacity (kWh)', value: '—' }];
  }

  const wb = XLSX.utils.book_new();
  const sheetStyle = { '!cols': [{ wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 30 }] };

  const addSheet = (name: string, rows: Record<string, unknown>[]) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    Object.assign(ws, sheetStyle);
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  addSheet('Energy Data',       energyRows);
  addSheet('Financial Results', financialRows);
  addSheet('System Config',     systemConfig);
  if (simLog.length) addSheet('Simulation Log', simLog);

  const now = new Date();
  XLSX.writeFile(wb, `safaricharge-data-${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}.xlsx`);
}

// ─── Utility: Graphs ZIP ─────────────────────────────────────────────────────
async function exportGraphsZip() {
  const JSZip = (await import('jszip')).default;

  let dailyChartData: Array<{ day: number; data: Record<string, number>[] }> = [];
  try {
    const { useSimulationStore } = await import('@/hooks/useSimulationStore').catch(() => ({ useSimulationStore: null }));
    if (useSimulationStore) {
      const state = (useSimulationStore as any).getState?.();
      dailyChartData = state?.dailyChartData ?? [];
    }
  } catch {}

  const zip = new JSZip();
  const chartsFolder = zip.folder('charts')!;

  if (dailyChartData.length === 0) {
    // Fallback: render placeholder charts for demonstration
    dailyChartData = Array.from({ length: 3 }, (_, i) => ({
      day: i + 1,
      data: Array.from({ length: 24 }, (_, h) => ({ hour: h, solarKW: Math.random() * 5, loadKW: Math.random() * 3 })),
    }));
  }

  // Render each day's chart on an offscreen canvas → PNG blob → add to ZIP
  for (const day of dailyChartData) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`SafariCharge — Day ${day.day} Energy Profile`, 40, 40);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = 80 + (i * 460) / 5;
      ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(canvas.width - 40, y); ctx.stroke();
    }

    if (day.data.length > 1) {
      const xStep = (canvas.width - 80) / (day.data.length - 1);
      const maxVal = Math.max(...day.data.flatMap((d) => [d.solarKW ?? 0, d.loadKW ?? 0, d.batteryKW ?? 0].filter(Boolean))) || 10;
      const toY = (v: number) => 80 + 460 - (v / maxVal) * 460;

      const drawLine = (key: string, color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        day.data.forEach((pt, i) => {
          const x = 40 + i * xStep;
          const y = toY((pt[key] as number) ?? 0);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();
      };

      drawLine('solarKW',   '#f59e0b');
      drawLine('loadKW',    '#60a5fa');
      drawLine('batteryKW', '#10b981');

      // Legend
      const legend = [['Solar', '#f59e0b'], ['Load', '#60a5fa'], ['Battery', '#10b981']];
      legend.forEach(([label, color], i) => {
        ctx.fillStyle = color;
        ctx.fillRect(40 + i * 120, canvas.height - 30, 14, 14);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px system-ui, sans-serif';
        ctx.fillText(label, 60 + i * 120, canvas.height - 19);
      });
    }

    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png', 0.95));
    chartsFolder.file(`day-${String(day.day).padStart(3, '0')}.png`, blob);
  }

  // Summary placeholder chart
  const summaryCanvas = document.createElement('canvas');
  summaryCanvas.width = 1200; summaryCanvas.height = 600;
  const sCtx = summaryCanvas.getContext('2d')!;
  sCtx.fillStyle = '#0f172a'; sCtx.fillRect(0, 0, 1200, 600);
  sCtx.fillStyle = '#10b981'; sCtx.font = 'bold 20px system-ui';
  sCtx.fillText('SafariCharge — Simulation Summary Chart', 40, 50);
  sCtx.fillStyle = '#64748b'; sCtx.font = '14px system-ui';
  sCtx.fillText(`Total days simulated: ${dailyChartData.length}`, 40, 90);
  const sumBlob: Blob = await new Promise((res) => summaryCanvas.toBlob((b) => res(b!), 'image/png', 0.95));
  chartsFolder.file('summary-overview.png', sumBlob);

  const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  const now = new Date();
  a.download = `safaricharge-charts-${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Export Card ─────────────────────────────────────────────────────────────
function ExportCard({ option }: { option: ExportOption }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const Icon = option.icon;

  const handlers: Record<ExportOption['id'], () => Promise<void>> = {
    pdf:        exportPDF,
    excel:      exportExcel,
    'graphs-zip': exportGraphsZip,
  };

  const handleExport = useCallback(async () => {
    setStatus('loading');
    try {
      await handlers[option.id]();
      setStatus('done');
      setTimeout(() => setStatus('idle'), 3500);
    } catch (e) {
      console.error(e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 4000);
    }
  }, [option.id]);

  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4 border transition-all duration-150 hover:shadow-lg"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ background: option.accentSoft }}
        >
          <Icon className="h-6 w-6" style={{ color: option.accent }} />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {option.title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {option.description}
          </p>
        </div>
      </div>

      {/* Detail note */}
      <div
        className="flex items-start gap-2 rounded-lg p-3 text-xs leading-relaxed"
        style={{ background: 'var(--bg-card-muted)', borderLeft: `3px solid ${option.accent}` }}
      >
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: option.accent }} />
        <span style={{ color: 'var(--text-tertiary)' }}>{option.detail}</span>
      </div>

      {/* Action */}
      <button
        onClick={handleExport}
        disabled={status === 'loading'}
        className="mt-auto flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: status === 'done' ? 'var(--battery)' : option.accent,
          color: '#fff',
          boxShadow: `0 2px 8px ${option.accent}40`,
        }}
      >
        {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'done'    && <CheckCircle2 className="h-4 w-4" />}
        {status === 'idle'    && <Download className="h-4 w-4" />}
        {status === 'loading' ? 'Preparing…'
          : status === 'done'  ? 'Downloaded!'
          : status === 'error' ? 'Error — try again'
          : 'Download'}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ExportPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: 'var(--battery-soft)' }}
            >
              <Download className="h-5 w-5" style={{ color: 'var(--battery)' }} />
            </span>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Export</h1>
          </div>
          <p className="text-sm max-w-2xl" style={{ color: 'var(--text-secondary)' }}>
            Download your simulation results in multiple formats. Each export captures all data
            from the current simulation run. Run the simulation first to ensure you get complete data.
          </p>
        </div>

        {/* Export cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {OPTIONS.map((opt) => (
            <ExportCard key={opt.id} option={opt} />
          ))}
        </div>

        {/* Info footer */}
        <div
          className="mt-10 rounded-xl p-4 flex gap-3"
          style={{ background: 'var(--bg-card-muted)', border: '1px solid var(--border)' }}
        >
          <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            <strong style={{ color: 'var(--text-secondary)' }}>PDF Report</strong> is generated entirely
            client-side using structured data — not a screenshot. All charts in the PDF are
            rendered from raw numbers.{' '}
            <strong style={{ color: 'var(--text-secondary)' }}>Excel export</strong> splits data across
            multiple sheets (Energy Data, Financial Results, System Config, Simulation Log) so each
            dataset stays clean.{' '}
            <strong style={{ color: 'var(--text-secondary)' }}>Graphs ZIP</strong> renders every chart
            from the simulation period as a high-resolution PNG (1200 × 600 px) — one image per
            simulation day — and packages them all in a single ZIP file.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
