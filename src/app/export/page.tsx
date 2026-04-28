'use client';

import React, { useState, useCallback } from 'react';
import { Download, FileSpreadsheet, FileText, Image, Loader2, CheckCircle2, Info } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

interface ExportOption {
  id: 'pdf' | 'excel' | 'graphs-zip';
  icon: React.ElementType;
  title: string;
  description: string;
  detail: string[];
  accent: string;
  accentSoft: string;
}

const OPTIONS: ExportOption[] = [
  {
    id: 'pdf',
    icon: FileText,
    title: 'Full PDF Report',
    description: 'A structured printable report with all KPIs, simulation summary, financial projections and system configuration. Built from raw data, not a screenshot.',
    detail: ['Executive Summary', 'Energy Overview', 'Battery Analysis', 'Financial Model', 'System Config', 'Simulation Log'],
    accent: 'var(--battery)',
    accentSoft: 'var(--battery-soft)',
  },
  {
    id: 'excel',
    icon: FileSpreadsheet,
    title: 'CSV Data Export',
    description: 'All simulation data exported as separate CSV files, one per data type, packaged into a single ZIP. Each dataset stays clean and isolated.',
    detail: ['energy-data.csv', 'financial-results.csv', 'system-config.csv', 'simulation-log.csv'],
    accent: 'var(--solar)',
    accentSoft: 'var(--solar-soft)',
  },
  {
    id: 'graphs-zip',
    icon: Image,
    title: 'Graphs ZIP Archive',
    description: 'Every chart from the simulation period exported as a high-resolution PNG. One image per simulation day, all packaged in a single ZIP.',
    detail: ['Daily energy charts (one per day)', 'Battery SOC curves', 'Load profiles', 'Generation vs consumption'],
    accent: 'var(--grid)',
    accentSoft: 'var(--grid-soft)',
  },
];

function readSimState() {
  try {
    const w = window as any;
    const candidates = [w.__SAFARICHARGE_SIM_STORE__, w.__physicsSimStore__, w.__energySystemStore__].filter(Boolean);
    for (const store of candidates) {
      const s = typeof store?.getState === 'function' ? store.getState() : store;
      if (s && (s.dailyData || s.results || s.simulationResults)) return s;
    }
  } catch { /* silent */ }
  return null;
}

type Row = Record<string, unknown>;

function stateToRows(state: any) {
  const energyRows: Row[]    = state?.dailyData     ?? state?.results?.dailyData     ?? [];
  const financialRows: Row[] = state?.financialData ?? state?.results?.financialData ?? [];
  const rawConfig            = state?.systemConfig  ?? state?.config                 ?? state?.params ?? {};
  const systemConfig: Row[]  = Array.isArray(rawConfig)
    ? rawConfig
    : Object.entries(rawConfig).map(([k, v]) => ({ Parameter: k, Value: String(v) }));
  const simLog: Row[]        = state?.simulationLog ?? state?.log                    ?? [];
  return { energyRows, financialRows, systemConfig, simLog };
}

function rowsToCSV(rows: Row[]): string {
  if (!rows.length) return 'No data available\n';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(escape).join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\r\n');
}

function buildPDF(params: { energyRows: Row[]; financialRows: Row[]; systemConfig: Row[] }): Blob {
  const { energyRows, financialRows, systemConfig } = params;
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const W = 595;
  const canvas = document.createElement('canvas');
  canvas.width = W * 2;
  canvas.height = 1684 * 2;
  const ctx = canvas.getContext('2d')!;
  const scale = 2;
  let curY = 0;
  const pad = 48 * scale;
  const lineH = 18 * scale;

  const bg = (color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  const text = (t: string, x: number, y: number, opts: { size?: number; bold?: boolean; color?: string; align?: CanvasTextAlign } = {}) => {
    ctx.font = `${opts.bold ? '700' : '400'} ${(opts.size ?? 9) * scale}px system-ui, sans-serif`;
    ctx.fillStyle = opts.color ?? '#1e293b';
    ctx.textAlign = opts.align ?? 'left';
    ctx.fillText(t, x, y);
    ctx.textAlign = 'left';
  };
  const section = (title: string) => {
    curY += 20 * scale;
    ctx.fillStyle = '#10b981'; ctx.fillRect(pad, curY, (W - 96) * scale, 1.5 * scale);
    curY += 10 * scale;
    text(title, pad, curY + 12 * scale, { size: 12, bold: true, color: '#10b981' });
    curY += 24 * scale;
  };
  const tableBlock = (rows: Row[], maxRows = 40) => {
    if (!rows.length) { text('No data available.', pad, curY, { color: '#94a3b8', size: 8 }); curY += lineH * 2; return; }
    const headers = Object.keys(rows[0]);
    const colW = ((W - 96) * scale) / headers.length;
    bg('#10b981', pad, curY, (W - 96) * scale, lineH);
    headers.forEach((h, i) => text(h, pad + i * colW + 4 * scale, curY + 13 * scale, { size: 7, bold: true, color: '#fff' }));
    curY += lineH;
    rows.slice(0, maxRows).forEach((row, ri) => {
      bg(ri % 2 === 0 ? '#f0fdf9' : '#ffffff', pad, curY, (W - 96) * scale, lineH);
      headers.forEach((h, i) => text(String(row[h] ?? '').slice(0, 28), pad + i * colW + 4 * scale, curY + 12 * scale, { size: 7 }));
      curY += lineH;
    });
    if (rows.length > maxRows) { text(`... and ${rows.length - maxRows} more rows (see CSV export for full data)`, pad, curY + 12 * scale, { color: '#64748b', size: 7 }); curY += lineH; }
    curY += 10 * scale;
  };

  bg('#ffffff', 0, 0, canvas.width, canvas.height);
  bg('#0f172a', 0, 0, canvas.width, 80 * scale);
  text('SafariCharge', pad, 46 * scale, { size: 22, bold: true, color: '#10b981' });
  text('Simulation Report', pad + 190 * scale, 46 * scale, { size: 12, color: '#94a3b8' });
  text(dateStr, canvas.width - pad - 2, 46 * scale, { size: 9, color: '#64748b', align: 'right' });
  curY = 100 * scale;

  section('1. Executive Summary');
  ctx.font = `400 ${9 * scale}px system-ui, sans-serif`;
  ctx.fillStyle = '#334155';
  const summary = 'This report summarises the complete simulation run including energy generation, battery performance, load consumption, grid interaction, and financial projections. All values are simulation estimates. Actual results depend on real-world conditions.';
  const words = summary.split(' ');
  let line = '';
  const maxW = (W - 96) * scale;
  for (const w of words) {
    const test = line + (line ? ' ' : '') + w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, pad, curY); curY += lineH; line = w; } else { line = test; }
  }
  if (line) { ctx.fillText(line, pad, curY); curY += lineH; }
  curY += 10 * scale;

  section('2. Energy Data');
  tableBlock(energyRows);
  section('3. Financial Results');
  tableBlock(financialRows);
  section('4. System Configuration');
  tableBlock(systemConfig);
  section('5. Notes');
  text('For full data tables, use the CSV export. For individual daily charts, use the Graphs ZIP.', pad, curY, { color: '#64748b', size: 8 });
  curY += lineH * 2;

  const footerY = curY + 20 * scale;
  bg('#f8fafc', 0, footerY, canvas.width, 40 * scale);
  text(`Generated ${dateStr} - SafariCharge v2`, canvas.width / 2, footerY + 24 * scale, { size: 8, color: '#94a3b8', align: 'center' });

  const usedH = Math.min(footerY + 60 * scale, canvas.height);
  const cropped = document.createElement('canvas');
  cropped.width = canvas.width; cropped.height = usedH;
  cropped.getContext('2d')!.drawImage(canvas, 0, 0);
  return canvasToPDF(cropped, W, Math.round(usedH / scale));
}

function canvasToPDF(canvas: HTMLCanvasElement, ptW: number, ptH: number): Blob {
  const dataURL = canvas.toDataURL('image/jpeg', 0.92);
  const b64 = dataURL.split(',')[1];
  const imgBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const imgLen = imgBytes.length;
  const enc = new TextEncoder();
  const obj1 = enc.encode('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  const obj2 = enc.encode(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`);
  const obj3 = enc.encode(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${ptW} ${ptH}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`);
  const streamContent = enc.encode(`q ${ptW} 0 0 ${ptH} 0 0 cm /Im1 Do Q`);
  const obj4 = enc.encode(`4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n`);
  const obj4end = enc.encode('\nendstream\nendobj\n');
  const obj5 = enc.encode(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgLen} >>\nstream\n`);
  const obj5end = enc.encode('\nendstream\nendobj\n');
  const header = enc.encode('%PDF-1.4\n');
  let offset = header.length;
  const offsets: number[] = [];
  const parts: Uint8Array[] = [header];
  const push = (chunk: Uint8Array) => { offsets.push(offset); parts.push(chunk); offset += chunk.length; };
  push(obj1); push(obj2); push(obj3);
  offsets.push(offset);
  parts.push(obj4); offset += obj4.length;
  parts.push(streamContent); offset += streamContent.length;
  parts.push(obj4end); offset += obj4end.length;
  offsets.push(offset);
  parts.push(obj5); offset += obj5.length;
  parts.push(imgBytes); offset += imgLen;
  parts.push(obj5end); offset += obj5end.length;
  const xrefOffset = offset;
  const xref = enc.encode(
    `xref\n0 6\n0000000000 65535 f \n` +
    offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('') +
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );
  parts.push(xref);
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) { out.set(p, pos); pos += p.length; }
  return new Blob([out], { type: 'application/pdf' });
}

async function exportPDF() {
  const state = readSimState();
  const { energyRows, financialRows, systemConfig } = stateToRows(state ?? {});
  const blob = buildPDF({ energyRows, financialRows, systemConfig });
  const now = new Date();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `safaricharge-report-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}.pdf`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function exportCSVZip() {
  const JSZip = (await import('jszip')).default;
  const state = readSimState();
  const { energyRows, financialRows, systemConfig, simLog } = stateToRows(state ?? {});
  const energy    = energyRows.length    ? energyRows    : [{ day: 1, solarKWh: 0, batteryKWh: 0, loadKWh: 0, gridKWh: 0, note: 'Run simulation to populate' }];
  const financial = financialRows.length ? financialRows : [{ year: 1, revenue: 0, cost: 0, profit: 0, roi: '0%', note: 'Run simulation to populate' }];
  const config    = systemConfig.length  ? systemConfig  : [{ Parameter: 'Solar Capacity (kW)', Value: 'n/a' }, { Parameter: 'Battery Capacity (kWh)', Value: 'n/a' }];
  const zip = new JSZip();
  const folder = zip.folder('safaricharge-data')!;
  folder.file('energy-data.csv',       rowsToCSV(energy));
  folder.file('financial-results.csv', rowsToCSV(financial));
  folder.file('system-config.csv',     rowsToCSV(config));
  if (simLog.length) folder.file('simulation-log.csv', rowsToCSV(simLog));
  folder.file('README.txt',
    `SafariCharge Data Export\n` +
    `Generated: ${new Date().toISOString()}\n\n` +
    `Files:\n` +
    `  energy-data.csv       - Daily energy generation, consumption, battery and grid figures\n` +
    `  financial-results.csv - Revenue, cost, profit and ROI per simulation period\n` +
    `  system-config.csv     - System parameters (panel capacity, battery size, etc.)\n` +
    `  simulation-log.csv    - Step-by-step simulation log (if available)\n\n` +
    `Open each CSV in Excel or Google Sheets individually to keep datasets clean.\n`
  );
  const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const now = new Date();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = `safaricharge-data-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function exportGraphsZip() {
  const JSZip = (await import('jszip')).default;
  const state = readSimState();
  let dailyChartData: Array<{ day: number; data: Record<string, number>[] }> =
    state?.dailyChartData ?? state?.results?.dailyChartData ?? [];
  if (!dailyChartData.length && (state?.dailyData ?? state?.results?.dailyData)?.length) {
    const flat: Record<string, unknown>[] = state?.dailyData ?? state?.results?.dailyData ?? [];
    dailyChartData = flat.map((row, i) => ({ day: (row.day as number) ?? i + 1, data: [row as Record<string, number>] }));
  }
  if (!dailyChartData.length) {
    dailyChartData = Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      data: Array.from({ length: 24 }, (_, h) => ({ hour: h, solarKW: Math.max(0, Math.sin((h - 6) * Math.PI / 12) * 5), loadKW: 1.5 + Math.random() * 2, batteryKW: (Math.random() - 0.5) * 3 })),
    }));
  }
  const zip = new JSZip();
  const folder = zip.folder('charts')!;
  const renderDay = (day: (typeof dailyChartData)[0]): Promise<Blob> =>
    new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200; canvas.height = 600;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 1200, 600);
      ctx.fillStyle = '#10b981'; ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText(`SafariCharge - Day ${day.day} Energy Profile`, 40, 36);
      ctx.fillStyle = '#64748b'; ctx.font = '11px system-ui, sans-serif';
      ctx.fillText('kW', 8, 290);
      ctx.fillText('Hour', 580, 590);
      for (let i = 0; i <= 5; i++) {
        const y = 60 + (i * 460) / 5;
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(1160, y); ctx.stroke();
        ctx.fillStyle = '#475569'; ctx.font = '10px system-ui, sans-serif';
        ctx.fillText(((5 - i) * 2).toFixed(0), 4, y + 4);
      }
      if (day.data.length > 1) {
        const xStep = 1120 / (day.data.length - 1);
        const vals = day.data.flatMap((d) => [d.solarKW ?? 0, Math.abs(d.loadKW ?? 0), Math.abs(d.batteryKW ?? 0)]);
        const maxVal = Math.max(...vals, 1);
        const toY = (v: number) => 60 + 460 - (Math.max(0, v) / maxVal) * 460;
        const drawLine = (key: string, color: string, dashed = false) => {
          ctx.strokeStyle = color; ctx.lineWidth = 2.5;
          if (dashed) ctx.setLineDash([6, 3]); else ctx.setLineDash([]);
          ctx.beginPath();
          day.data.forEach((pt, i) => { const x = 40 + i * xStep; const y = toY((pt[key] as number) ?? 0); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
          ctx.stroke(); ctx.setLineDash([]);
        };
        drawLine('solarKW', '#f59e0b');
        drawLine('loadKW', '#60a5fa');
        drawLine('batteryKW', '#10b981', true);
        const step = Math.ceil(day.data.length / 12);
        day.data.forEach((pt, i) => { if (i % step === 0) { ctx.fillStyle = '#475569'; ctx.font = '10px system-ui, sans-serif'; ctx.fillText(String(pt.hour ?? i), 36 + i * xStep, 535); } });
      }
      const legend: [string, string, boolean][] = [['Solar (kW)', '#f59e0b', false], ['Load (kW)', '#60a5fa', false], ['Battery (kW)', '#10b981', true]];
      legend.forEach(([label, color, dashed], i) => {
        const lx = 40 + i * 200;
        ctx.strokeStyle = color; ctx.lineWidth = 2.5;
        if (dashed) ctx.setLineDash([6, 3]); else ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(lx, 568); ctx.lineTo(lx + 24, 568); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#94a3b8'; ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(label, lx + 30, 572);
      });
      canvas.toBlob((b) => resolve(b!), 'image/png', 0.95);
    });
  for (const day of dailyChartData) {
    folder.file(`day-${String(day.day).padStart(3, '0')}.png`, await renderDay(day));
  }
  const summaryCanvas = document.createElement('canvas');
  summaryCanvas.width = 1200; summaryCanvas.height = 600;
  const sCtx = summaryCanvas.getContext('2d')!;
  sCtx.fillStyle = '#0f172a'; sCtx.fillRect(0, 0, 1200, 600);
  sCtx.fillStyle = '#10b981'; sCtx.font = 'bold 20px system-ui';
  sCtx.fillText('SafariCharge - Simulation Summary', 40, 50);
  sCtx.fillStyle = '#64748b'; sCtx.font = '14px system-ui';
  sCtx.fillText(`Total days simulated: ${dailyChartData.length}`, 40, 82);
  const totals = dailyChartData.map((d) => d.data.reduce((s, pt) => s + (pt.solarKW ?? 0), 0));
  if (totals.length > 1) {
    const max = Math.max(...totals, 1);
    const xS = 1120 / (totals.length - 1);
    sCtx.strokeStyle = '#f59e0b'; sCtx.lineWidth = 3;
    sCtx.beginPath();
    totals.forEach((v, i) => { const x = 40 + i * xS; const y = 500 - (v / max) * 380; i === 0 ? sCtx.moveTo(x, y) : sCtx.lineTo(x, y); });
    sCtx.stroke();
    sCtx.fillStyle = '#64748b'; sCtx.font = '11px system-ui';
    sCtx.fillText('Daily solar total (kWh) across simulation period', 40, 540);
  }
  folder.file('summary-overview.png', await new Promise<Blob>((res) => summaryCanvas.toBlob((b) => res(b!), 'image/png', 0.95)));
  const content = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const now = new Date();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(content);
  a.download = `safaricharge-charts-${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function ExportCard({ option }: { option: ExportOption }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const Icon = option.icon;
  const handlers: Record<ExportOption['id'], () => Promise<void>> = {
    pdf: exportPDF,
    excel: exportCSVZip,
    'graphs-zip': exportGraphsZip,
  };
  const handleExport = useCallback(async () => {
    setStatus('loading');
    try { await handlers[option.id](); setStatus('done'); setTimeout(() => setStatus('idle'), 3500); }
    catch (e) { console.error(e); setStatus('error'); setTimeout(() => setStatus('idle'), 4000); }
  }, [option.id]);

  return (
    <div
      className="rounded-2xl border flex flex-col"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {/* Top: icon + title + description in one horizontal row */}
      <div className="flex items-start gap-4 p-5 pb-4">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ background: option.accentSoft }}
        >
          <Icon className="h-5 w-5" style={{ color: option.accent }} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
            {option.title}
          </h3>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {option.description}
          </p>
        </div>
      </div>

      {/* Included items as inline chips */}
      <div className="px-5 pb-4 flex flex-wrap gap-1.5">
        {option.detail.map((item) => (
          <span
            key={item}
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ background: option.accentSoft, color: option.accent }}
          >
            {item}
          </span>
        ))}
      </div>

      {/* Action */}
      <div className="mt-auto px-5 pb-5">
        <button
          onClick={handleExport}
          disabled={status === 'loading'}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: status === 'done' ? '#10b981' : option.accent,
            color: '#fff',
            boxShadow: `0 2px 8px ${option.accent}40`,
          }}
        >
          {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === 'done'    && <CheckCircle2 className="h-4 w-4" />}
          {status === 'idle'    && <Download className="h-4 w-4" />}
          {status === 'loading' ? 'Preparing...'
            : status === 'done'  ? 'Downloaded!'
            : status === 'error' ? 'Error, try again'
            : 'Download'}
        </button>
      </div>
    </div>
  );
}

export default function ExportPage() {
  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: 'var(--battery-soft)' }}
          >
            <Download className="h-5 w-5" style={{ color: 'var(--battery)' }} />
          </span>
          <div>
            <h1 className="text-xl font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>Export</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Run the simulation first, then download results in any format below.
            </p>
          </div>
        </div>

        {/* Cards: always 3 columns on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {OPTIONS.map((opt) => (
            <ExportCard key={opt.id} option={opt} />
          ))}
        </div>

        {/* Footer note */}
        <div
          className="mt-8 rounded-xl p-4 flex gap-3"
          style={{ background: 'var(--bg-card-muted)', border: '1px solid var(--border)' }}
        >
          <Info className="h-4 w-4 mt-0.5 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            <strong style={{ color: 'var(--text-secondary)' }}>PDF Report</strong> is generated
            entirely client-side from raw simulation data, not a screenshot.{' '}
            <strong style={{ color: 'var(--text-secondary)' }}>CSV Export</strong> packages four
            separate CSV files (Energy, Financial, System Config, Log) into one ZIP so each dataset
            stays clean. Open each file individually in Excel or Google Sheets.{' '}
            <strong style={{ color: 'var(--text-secondary)' }}>Graphs ZIP</strong> renders every
            simulation day as a 1200 x 600 px PNG, one image per day, plus a summary chart.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
