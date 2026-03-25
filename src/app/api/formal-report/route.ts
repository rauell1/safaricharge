import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  buildCorsHeaders,
  enforceBodySize,
  jsonResponse,
} from '@/lib/security';

interface MinuteData {
  date: string;
  year: number;
  month: number;
  week: number;
  hour: number;
  minute?: number;
  solarKW: number;
  homeLoadKW: number;
  ev1LoadKW: number;
  ev2LoadKW: number;
  batteryPowerKW: number;
  batteryLevelPct: number;
  gridImportKW: number;
  gridExportKW: number;
  ev1SocPct: number;
  ev2SocPct: number;
  tariffRate: number;
  isPeakTime: boolean;
  savingsKES: number;
  solarEnergyKWh: number;
  gridImportKWh: number;
  gridExportKWh: number;
  homeLoadKWh?: number;
  ev1LoadKWh?: number;
  ev2LoadKWh?: number;
}

interface DailyAgg {
  date: string;
  solar: number;
  gridImport: number;
  gridExport: number;
  savings: number;
  homeLoad: number;
  evLoad: number;
  ev1Load: number;
  ev2Load: number;
  avgBattery: number;
  batteryCount: number;
}

const FORMAL_REPORT_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Format a number for display inside the generated HTML report.
 *
 * Some Node/Edge runtimes can throw when the requested locale isn't available
 * (e.g. 'en-KE' missing ICU data). We never want report generation to fail
 * due to formatting; fall back to default locale / fixed-point formatting.
 */
function formatKES(value: number, maximumFractionDigits: number): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(num);

  try {
    return num.toLocaleString('en-KE', { maximumFractionDigits });
  } catch {
    try {
      return num.toLocaleString(undefined, { maximumFractionDigits });
    } catch {
      return num.toFixed(maximumFractionDigits);
    }
  }
}

/**
 * Safely coerce incoming values to finite numbers to avoid runtime errors when
 * rendering the report (e.g. calling toFixed on a string or undefined).
 */
function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Safely format a number with locale-specific grouping separators.
 * Falls back to string conversion if locale formatting fails.
 */
function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  try {
    return value.toLocaleString();
  } catch {
    return String(value);
  }
}

const minuteDataSchema = z.object({
  date: z.string(),
  year: z.number(),
  month: z.number(),
  week: z.number(),
  hour: z.number(),
  minute: z.number().optional(),
  solarKW: z.number(),
  homeLoadKW: z.number(),
  ev1LoadKW: z.number(),
  ev2LoadKW: z.number(),
  batteryPowerKW: z.number(),
  batteryLevelPct: z.number(),
  gridImportKW: z.number(),
  gridExportKW: z.number(),
  ev1SocPct: z.number(),
  ev2SocPct: z.number(),
  tariffRate: z.number(),
  isPeakTime: z.boolean(),
  savingsKES: z.number(),
  solarEnergyKWh: z.number(),
  gridImportKWh: z.number(),
  gridExportKWh: z.number(),
  homeLoadKWh: z.number().optional(),
  ev1LoadKWh: z.number().optional(),
  ev2LoadKWh: z.number().optional(),
});

function aggregateDaily(data: MinuteData[]): DailyAgg[] {
  const map = new Map<string, DailyAgg>();
  for (const d of data) {
    if (!map.has(d.date)) {
      map.set(d.date, { date: d.date, solar: 0, gridImport: 0, gridExport: 0, savings: 0, homeLoad: 0, evLoad: 0, ev1Load: 0, ev2Load: 0, avgBattery: 0, batteryCount: 0 });
    }
    const row = map.get(d.date)!;
    row.solar += d.solarEnergyKWh ?? 0;
    row.gridImport += d.gridImportKWh ?? 0;
    row.gridExport += d.gridExportKWh ?? 0;
    row.savings += d.savingsKES ?? 0;
    const ev1Kwh = d.ev1LoadKWh ?? (d.ev1LoadKW ?? 0) * (24 / 420);
    const ev2Kwh = d.ev2LoadKWh ?? (d.ev2LoadKW ?? 0) * (24 / 420);
    row.homeLoad += d.homeLoadKWh ?? (d.homeLoadKW ?? 0) * (24 / 420);
    row.ev1Load += ev1Kwh;
    row.ev2Load += ev2Kwh;
    row.evLoad += ev1Kwh + ev2Kwh;
    row.avgBattery += d.batteryLevelPct ?? 0;
    row.batteryCount += 1;
  }
  return Array.from(map.values())
    .map(r => ({ ...r, avgBattery: r.batteryCount > 0 ? r.avgBattery / r.batteryCount : 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Build an inline SVG bar chart of daily solar vs grid-import */
function buildSolarVsGridSVG(days: DailyAgg[], maxDays = 30): string {
  const show = days.slice(-maxDays);
  const W = 700, H = 220;
  const PAD = { top: 24, right: 24, bottom: 54, left: 54 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...show.map(d => Math.max(d.solar, d.gridImport, 0.1)).filter(v => Number.isFinite(v)), 0.1);
  const slotW = chartW / Math.max(show.length, 1);
  const barW = Math.max(Math.floor(slotW / 2) - 2, 2);

  let bars = '';
  let labels = '';
  show.forEach((d, i) => {
    const x = PAD.left + i * slotW;
    const sH = Math.round((d.solar / maxVal) * chartH);
    const iH = Math.round((d.gridImport / maxVal) * chartH);
    bars += `<rect x="${x}" y="${PAD.top + chartH - sH}" width="${barW}" height="${sH}" fill="#22c55e" rx="2"/>`;
    bars += `<rect x="${x + barW + 2}" y="${PAD.top + chartH - iH}" width="${barW}" height="${iH}" fill="#f97316" rx="2" opacity="0.85"/>`;
    if (show.length <= 14 || i % Math.ceil(show.length / 7) === 0) {
      labels += `<text x="${x + barW}" y="${PAD.top + chartH + 18}" text-anchor="middle" font-size="9" fill="#64748b">${d.date && d.date.length >= 5 ? d.date.slice(5) : d.date}</text>`;
    }
  });

  let yAxis = '';
  for (let step = 0; step <= 4; step++) {
    const val = (maxVal * step / 4).toFixed(1);
    const y = PAD.top + chartH - (chartH * step / 4);
    yAxis += `<text x="${PAD.left - 6}" y="${y + 4}" text-anchor="end" font-size="9" fill="#94a3b8">${val}</text>`;
    yAxis += `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + chartW}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
  }
  yAxis += `<line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>`;
  yAxis += `<line x1="${PAD.left}" y1="${PAD.top + chartH}" x2="${PAD.left + chartW}" y2="${PAD.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#f8fafc" rx="8"/>
  ${yAxis}${bars}${labels}
  <text x="${PAD.left - 4}" y="${PAD.top - 8}" font-size="9" fill="#94a3b8">kWh</text>
  <rect x="${W - 180}" y="6" width="10" height="10" fill="#22c55e" rx="2"/>
  <text x="${W - 166}" y="15" font-size="9" fill="#334155">Solar Generated</text>
  <rect x="${W - 90}" y="6" width="10" height="10" fill="#f97316" rx="2" opacity="0.85"/>
  <text x="${W - 76}" y="15" font-size="9" fill="#334155">Grid Import</text>
</svg>`;
}

/** Daily savings trend line chart */
function buildSavingsTrendSVG(days: DailyAgg[], maxDays = 30): string {
  const show = days.slice(-maxDays);
  const W = 700, H = 180;
  const PAD = { top: 20, right: 24, bottom: 50, left: 70 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxSav = Math.max(...show.map(d => d.savings).filter(v => Number.isFinite(v)), 1);
  const pts = show.map((d, i) => {
    const x = PAD.left + (i / Math.max(show.length - 1, 1)) * chartW;
    const y = PAD.top + chartH - (d.savings / maxSav) * chartH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  let yAxis = '';
  for (let step = 0; step <= 4; step++) {
    const val = Math.round(maxSav * step / 4);
    const y = PAD.top + chartH - (chartH * step / 4);
    yAxis += `<text x="${PAD.left - 6}" y="${y + 4}" text-anchor="end" font-size="9" fill="#94a3b8">${val}</text>`;
    yAxis += `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + chartW}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
  }
  yAxis += `<line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>`;
  yAxis += `<line x1="${PAD.left}" y1="${PAD.top + chartH}" x2="${PAD.left + chartW}" y2="${PAD.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>`;

  let labels = '';
  show.forEach((d, i) => {
    if (show.length <= 14 || i % Math.ceil(show.length / 7) === 0) {
      const x = PAD.left + (i / Math.max(show.length - 1, 1)) * chartW;
      labels += `<text x="${x}" y="${PAD.top + chartH + 16}" text-anchor="middle" font-size="9" fill="#64748b">${d.date && d.date.length >= 5 ? d.date.slice(5) : d.date}</text>`;
    }
  });

  // Area fill
  const areaStart = `${PAD.left},${PAD.top + chartH}`;
  const areaEnd = `${(PAD.left + chartW).toFixed(1)},${PAD.top + chartH}`;
  const areaPath = `M ${areaStart} L ${pts} L ${areaEnd} Z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#f8fafc" rx="8"/>
  ${yAxis}
  <path d="${areaPath}" fill="#0ea5e9" opacity="0.12"/>
  <polyline points="${pts}" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  ${labels}
  <text x="${PAD.left - 4}" y="${PAD.top - 6}" font-size="9" fill="#94a3b8">KES</text>
  <rect x="${W - 120}" y="6" width="10" height="2" fill="#0ea5e9"/>
  <text x="${W - 106}" y="14" font-size="9" fill="#334155">Daily Savings</text>
</svg>`;
}

/** Battery average SoC trend line chart */
function buildBatterySoCTrendSVG(days: DailyAgg[], maxDays = 30): string {
  const show = days.slice(-maxDays);
  const W = 700, H = 180;
  const PAD = { top: 20, right: 24, bottom: 50, left: 54 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const pts = show.map((d, i) => {
    const x = PAD.left + (i / Math.max(show.length - 1, 1)) * chartW;
    const y = PAD.top + chartH - (d.avgBattery / 100) * chartH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  let yAxis = '';
  for (let step = 0; step <= 4; step++) {
    const val = (100 * step / 4).toFixed(0);
    const y = PAD.top + chartH - (chartH * step / 4);
    yAxis += `<text x="${PAD.left - 6}" y="${y + 4}" text-anchor="end" font-size="9" fill="#94a3b8">${val}%</text>`;
    yAxis += `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + chartW}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
  }
  yAxis += `<line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>`;
  yAxis += `<line x1="${PAD.left}" y1="${PAD.top + chartH}" x2="${PAD.left + chartW}" y2="${PAD.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>`;

  let labels = '';
  show.forEach((d, i) => {
    if (show.length <= 14 || i % Math.ceil(show.length / 7) === 0) {
      const x = PAD.left + (i / Math.max(show.length - 1, 1)) * chartW;
      labels += `<text x="${x}" y="${PAD.top + chartH + 16}" text-anchor="middle" font-size="9" fill="#64748b">${d.date && d.date.length >= 5 ? d.date.slice(5) : d.date}</text>`;
    }
  });

  const areaStart = `${PAD.left},${PAD.top + chartH}`;
  const areaEnd = `${(PAD.left + chartW).toFixed(1)},${PAD.top + chartH}`;
  const areaPath = `M ${areaStart} L ${pts} L ${areaEnd} Z`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#f8fafc" rx="8"/>
  ${yAxis}
  <path d="${areaPath}" fill="#8b5cf6" opacity="0.12"/>
  <polyline points="${pts}" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  ${labels}
  <rect x="${W - 130}" y="6" width="10" height="2" fill="#8b5cf6"/>
  <text x="${W - 116}" y="14" font-size="9" fill="#334155">Avg Battery SoC</text>
</svg>`;
}

/** EV1 vs EV2 daily charging stacked bar chart */
function buildEVChargingBarSVG(days: DailyAgg[], maxDays = 30): string {
  const show = days.slice(-maxDays);
  const W = 700, H = 180;
  const PAD = { top: 20, right: 24, bottom: 50, left: 54 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...show.map(d => d.ev1Load + d.ev2Load).filter(v => Number.isFinite(v)), 0.1);
  const slotW = chartW / Math.max(show.length, 1);
  const barW = Math.max(Math.floor(slotW * 0.7), 2);

  let bars = '';
  let labels = '';
  show.forEach((d, i) => {
    const x = PAD.left + i * slotW + (slotW - barW) / 2;
    const ev1H = Math.round((d.ev1Load / maxVal) * chartH);
    const ev2H = Math.round((d.ev2Load / maxVal) * chartH);
    bars += `<rect x="${x}" y="${PAD.top + chartH - ev1H}" width="${barW}" height="${ev1H}" fill="#0ea5e9" rx="2"/>`;
    bars += `<rect x="${x}" y="${PAD.top + chartH - ev1H - ev2H}" width="${barW}" height="${ev2H}" fill="#7c3aed" rx="2" opacity="0.85"/>`;
    if (show.length <= 14 || i % Math.ceil(show.length / 7) === 0) {
      labels += `<text x="${x + barW / 2}" y="${PAD.top + chartH + 16}" text-anchor="middle" font-size="9" fill="#64748b">${d.date && d.date.length >= 5 ? d.date.slice(5) : d.date}</text>`;
    }
  });

  let yAxis = '';
  for (let step = 0; step <= 4; step++) {
    const val = (maxVal * step / 4).toFixed(1);
    const y = PAD.top + chartH - (chartH * step / 4);
    yAxis += `<text x="${PAD.left - 6}" y="${y + 4}" text-anchor="end" font-size="9" fill="#94a3b8">${val}</text>`;
    yAxis += `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + chartW}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
  }
  yAxis += `<line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>`;
  yAxis += `<line x1="${PAD.left}" y1="${PAD.top + chartH}" x2="${PAD.left + chartW}" y2="${PAD.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#f8fafc" rx="8"/>
  ${yAxis}${bars}${labels}
  <text x="${PAD.left - 4}" y="${PAD.top - 6}" font-size="9" fill="#94a3b8">kWh</text>
  <rect x="${W - 180}" y="6" width="10" height="10" fill="#0ea5e9" rx="2"/>
  <text x="${W - 166}" y="15" font-size="9" fill="#334155">EV #1 (Commuter)</text>
  <rect x="${W - 80}" y="6" width="10" height="10" fill="#7c3aed" rx="2" opacity="0.85"/>
  <text x="${W - 66}" y="15" font-size="9" fill="#334155">EV #2 (Uber)</text>
</svg>`;
}

/** Grid import vs export bar chart */
function buildGridInteractionSVG(days: DailyAgg[], maxDays = 30): string {
  const show = days.slice(-maxDays);
  const W = 700, H = 180;
  const PAD = { top: 20, right: 24, bottom: 50, left: 54 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...show.map(d => Math.max(d.gridImport, d.gridExport, 0.1)).filter(v => Number.isFinite(v)), 0.1);
  const slotW = chartW / Math.max(show.length, 1);
  const barW = Math.max(Math.floor(slotW / 2) - 2, 2);

  let bars = '';
  let labels = '';
  show.forEach((d, i) => {
    const x = PAD.left + i * slotW;
    const iH = Math.round((d.gridImport / maxVal) * chartH);
    const eH = Math.round((d.gridExport / maxVal) * chartH);
    bars += `<rect x="${x}" y="${PAD.top + chartH - iH}" width="${barW}" height="${iH}" fill="#ef4444" rx="2" opacity="0.8"/>`;
    bars += `<rect x="${x + barW + 2}" y="${PAD.top + chartH - eH}" width="${barW}" height="${eH}" fill="#10b981" rx="2" opacity="0.8"/>`;
    if (show.length <= 14 || i % Math.ceil(show.length / 7) === 0) {
      labels += `<text x="${x + barW}" y="${PAD.top + chartH + 16}" text-anchor="middle" font-size="9" fill="#64748b">${d.date && d.date.length >= 5 ? d.date.slice(5) : d.date}</text>`;
    }
  });

  let yAxis = '';
  for (let step = 0; step <= 4; step++) {
    const val = (maxVal * step / 4).toFixed(1);
    const y = PAD.top + chartH - (chartH * step / 4);
    yAxis += `<text x="${PAD.left - 6}" y="${y + 4}" text-anchor="end" font-size="9" fill="#94a3b8">${val}</text>`;
    yAxis += `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + chartW}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
  }
  yAxis += `<line x1="${PAD.left}" y1="${PAD.top}" x2="${PAD.left}" y2="${PAD.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>`;
  yAxis += `<line x1="${PAD.left}" y1="${PAD.top + chartH}" x2="${PAD.left + chartW}" y2="${PAD.top + chartH}" stroke="#cbd5e1" stroke-width="1"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#f8fafc" rx="8"/>
  ${yAxis}${bars}${labels}
  <text x="${PAD.left - 4}" y="${PAD.top - 6}" font-size="9" fill="#94a3b8">kWh</text>
  <rect x="${W - 170}" y="6" width="10" height="10" fill="#ef4444" rx="2" opacity="0.8"/>
  <text x="${W - 156}" y="15" font-size="9" fill="#334155">Grid Import</text>
  <rect x="${W - 80}" y="6" width="10" height="10" fill="#10b981" rx="2" opacity="0.8"/>
  <text x="${W - 66}" y="15" font-size="9" fill="#334155">Grid Export</text>
</svg>`;
}

/** Build a self-sufficiency donut chart */
function buildDonutSVG(solarKWh: number, gridImportKWh: number): string {
  const total = solarKWh + gridImportKWh;
  if (total === 0) return '<svg width="140" height="140"/>';
  const solarFrac = solarKWh / total;
  const R = 52, cx = 70, cy = 70;
  const tau = 2 * Math.PI;
  const solarAngle = solarFrac * tau;
  const x1 = cx + R * Math.sin(0), y1 = cy - R * Math.cos(0);
  const x2 = cx + R * Math.sin(solarAngle), y2 = cy - R * Math.cos(solarAngle);
  const large = solarAngle > Math.PI ? 1 : 0;
  const arcSolar = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
  const arcGrid = `M ${cx} ${cy} L ${x2.toFixed(2)} ${y2.toFixed(2)} A ${R} ${R} 0 ${1 - large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
  const pct = (solarFrac * 100).toFixed(0);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140" width="140" height="140">
  <path d="${arcSolar}" fill="#22c55e"/>
  <path d="${arcGrid}" fill="#f97316" opacity="0.85"/>
  <circle cx="${cx}" cy="${cy}" r="34" fill="white"/>
  <text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="16" font-weight="bold" fill="#166534">${pct}%</text>
  <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="9" fill="#64748b">Solar Share</text>
</svg>`;
}

/** SafariCharge logo path as inline SVG */
const LOGO_SVG = `<svg viewBox="0 0 100 100" width="56" height="56" xmlns="http://www.w3.org/2000/svg" fill="#0ea5e9">
  <path d="M50 0 L90 40 L75 40 L50 15 L25 40 L10 40 Z"/>
  <path d="M10 50 L35 75 L50 90 L65 75 L90 50 L75 50 L50 75 L25 50 Z"/>
</svg>`;

export async function POST(request: NextRequest) {
  const { preflight, headers } = buildCorsHeaders(request, { methods: ['POST', 'OPTIONS'] });
  if (preflight) return preflight;

  const sizeError = enforceBodySize(request, FORMAL_REPORT_MAX_BYTES, headers);
  if (sizeError) return sizeError;

  let parsedData: unknown;
  try {
    parsedData = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload.' }, { status: 400, headers });
  }

  const body = parsedData as Record<string, unknown>;

  try {

    // Support pre-aggregated payloads (sent by the client to avoid exceeding
    // Vercel's 4.5 MB body size limit) as well as legacy full minuteData payloads.
    const payload: any = body;
    const preAggregated = payload.preAggregated === true;

    let totalSolar: number, totalGridImport: number, totalGridExport: number, totalSavings: number;
    let totalHomeLoad: number, totalEV1: number, totalEV2: number;
    let peakSolar: number, peakGridImport: number, avgBattery: number;
    let peakInstantSolar: number, peakEVLoad: number;
    let uniqueDays: number, dailyAgg: DailyAgg[];
    let dateFrom: string, dateTo: string;
    let startDate: string, reportDate: string;
    let systemCostKES: number | undefined;
    let totalDataPoints: number;

    if (preAggregated) {
      // Client already aggregated the data; use the compact payload directly.
      totalSolar = toNumber(payload.totalSolar);
      totalGridImport = toNumber(payload.totalGridImport);
      totalGridExport = toNumber(payload.totalGridExport);
      totalSavings = toNumber(payload.totalSavings);
      totalHomeLoad = toNumber(payload.totalHomeLoad);
      totalEV1 = toNumber(payload.totalEV1);
      totalEV2 = toNumber(payload.totalEV2);
      peakSolar = toNumber(payload.peakSolar);
      peakGridImport = toNumber(payload.peakGridImport);
      avgBattery = toNumber(payload.avgBattery);
      peakInstantSolar = toNumber(payload.peakInstantSolar);
      peakEVLoad = toNumber(payload.peakEVLoad);
      dailyAgg = Array.isArray(payload.dailyAgg)
        ? (payload.dailyAgg as DailyAgg[]).map((entry) => ({
            date: typeof entry?.date === 'string' ? entry.date : '',
            solar: toNumber((entry as DailyAgg).solar),
            gridImport: toNumber((entry as DailyAgg).gridImport),
            gridExport: toNumber((entry as DailyAgg).gridExport),
            savings: toNumber((entry as DailyAgg).savings),
            homeLoad: toNumber((entry as DailyAgg).homeLoad),
            evLoad: toNumber((entry as DailyAgg).evLoad),
            ev1Load: toNumber((entry as DailyAgg).ev1Load),
            ev2Load: toNumber((entry as DailyAgg).ev2Load),
            avgBattery: toNumber((entry as DailyAgg).avgBattery),
            batteryCount: toNumber((entry as DailyAgg).batteryCount, 0),
          }))
        : [];
      // Client sends only the last N days for charting; keep full-history
      // metrics using payload.uniqueDays when present.
      uniqueDays = typeof payload.uniqueDays === 'number' ? payload.uniqueDays : dailyAgg.length;
      dateFrom = typeof payload.dateFrom === 'string'
        ? payload.dateFrom
        : (typeof payload.startDate === 'string' ? payload.startDate : '');
      dateTo = typeof payload.dateTo === 'string'
        ? payload.dateTo
        : (typeof payload.startDate === 'string' ? payload.startDate : '');
      startDate = typeof payload.startDate === 'string' ? payload.startDate : '';
      reportDate = typeof payload.reportDate === 'string' ? payload.reportDate : '';
      const parsedCost = toNumber(payload.systemCostKES, NaN);
      systemCostKES = Number.isFinite(parsedCost) ? parsedCost : undefined;
      totalDataPoints = toNumber(payload.totalDataPoints);
    } else {
      // Legacy path: full minuteData array.
      const minuteDataCandidate = (payload as { minuteData?: MinuteData[] }).minuteData;
      startDate = payload.startDate ?? '';
      reportDate = payload.reportDate ?? '';
      systemCostKES = payload.systemCostKES;

      if (!minuteDataCandidate || minuteDataCandidate.length === 0) {
        return jsonResponse({ error: 'No simulation data available.' }, { status: 400, headers });
      }
      const MAX_DATA_POINTS = 420 * 365 * 25;
      const parsedMinuteData = z.array(minuteDataSchema).safeParse(minuteDataCandidate);
      if (!parsedMinuteData.success) {
        return jsonResponse(
          { error: 'Invalid minuteData payload.', details: parsedMinuteData.error.flatten() },
          { status: 400, headers }
        );
      }
      const minuteData = parsedMinuteData.data;

      if (minuteData.length > MAX_DATA_POINTS) {
        return jsonResponse(
          {
            error: `Dataset too large (${minuteData.length.toLocaleString()} records). Maximum is ${MAX_DATA_POINTS.toLocaleString()} records (~25 years).`
          },
          { status: 413, headers }
        );
      }

      totalDataPoints = minuteData.length;
      totalSolar = minuteData.reduce((s, d) => s + (d.solarEnergyKWh ?? 0), 0);
      totalGridImport = minuteData.reduce((s, d) => s + (d.gridImportKWh ?? 0), 0);
      totalGridExport = minuteData.reduce((s, d) => s + (d.gridExportKWh ?? 0), 0);
      totalSavings = minuteData.reduce((s, d) => s + (d.savingsKES ?? 0), 0);
      totalHomeLoad = minuteData.reduce((s, d) => s + (d.homeLoadKWh ?? (d.homeLoadKW ?? 0) * (24 / 420)), 0);
      totalEV1 = minuteData.reduce((s, d) => s + (d.ev1LoadKWh ?? (d.ev1LoadKW ?? 0) * (24 / 420)), 0);
      totalEV2 = minuteData.reduce((s, d) => s + (d.ev2LoadKWh ?? (d.ev2LoadKW ?? 0) * (24 / 420)), 0);
      peakSolar = minuteData.filter(d => d.isPeakTime).reduce((s, d) => s + (d.solarEnergyKWh ?? 0), 0);
      peakGridImport = 0; peakInstantSolar = 0; peakEVLoad = 0;
      for (const d of minuteData) {
        const gi = d.gridImportKW ?? 0; if (gi > peakGridImport) peakGridImport = gi;
        const sk = d.solarKW ?? 0; if (sk > peakInstantSolar) peakInstantSolar = sk;
        const ev = (d.ev1LoadKW ?? 0) + (d.ev2LoadKW ?? 0); if (ev > peakEVLoad) peakEVLoad = ev;
      }
      avgBattery = minuteData.reduce((s, d) => s + (d.batteryLevelPct ?? 0), 0) / minuteData.length;
      dailyAgg = aggregateDaily(minuteData);
      uniqueDays = new Set(minuteData.map(d => d.date)).size;
      dateFrom = minuteData[0]?.date ?? startDate;
      dateTo = minuteData[minuteData.length - 1]?.date ?? startDate;
    }

    // --- Derived metrics (same for both paths) ---
    const totalLoad = totalHomeLoad + totalEV1 + totalEV2;
    const selfSufficiency = totalLoad > 0 ? (Math.min(totalSolar, totalLoad) / totalLoad) * 100 : 0;
    const solarSelfConsumptionRate = totalSolar > 0 ? ((totalSolar - totalGridExport) / totalSolar) * 100 : 0;
    const co2Avoided = totalSolar * 0.47;
    const avgDailySolar = uniqueDays > 0 ? totalSolar / uniqueDays : 0;
    const avgDailySavings = uniqueDays > 0 ? totalSavings / uniqueDays : 0;
    const annualisedSavings = uniqueDays > 0 ? (totalSavings / uniqueDays) * 365 : 0;

    // Financial analysis
    const estimatedSystemCost = systemCostKES ?? 4_800_000;
    const simplePaybackYears = annualisedSavings > 0 ? estimatedSystemCost / annualisedSavings : 0;
    const roiPct = estimatedSystemCost > 0 ? (annualisedSavings / estimatedSystemCost) * 100 : 0;
    const npv10yr = annualisedSavings > 0
      ? Array.from({ length: 10 }, (_, y) => annualisedSavings / Math.pow(1.10, y + 1))
          .reduce((a, b) => a + b, 0) - estimatedSystemCost
      : 0;

    const offPeakSolar = totalSolar - peakSolar;
    const batteryCycles = uniqueDays > 0 ? uniqueDays * 0.85 : 0;
    const batteryHealthPct = Math.max(100 - (batteryCycles / 4000) * 30, 70);
    const solarConsumedKWh = totalSolar - totalGridExport;
    const totalEVLoad = totalEV1 + totalEV2;
    const evSolarShare = totalEVLoad > 0 && totalSolar > 0
      ? Math.min((solarConsumedKWh / (totalEVLoad + totalHomeLoad)) * 100, 100)
      : 0;
    const EV1_CHARGER_KW = 7;
    const EV2_CHARGER_KW = 22;
    const MAX_CHARGER_KWH = (EV1_CHARGER_KW + EV2_CHARGER_KW) * uniqueDays * 24;
    const CHARGER_WINDOW_FACTOR = 3;
    const chargerUtilisationPct = Math.min(
      MAX_CHARGER_KWH > 0 ? ((totalEVLoad / MAX_CHARGER_KWH) * 100 * CHARGER_WINDOW_FACTOR) : 0,
      100
    );

    const solarVsGridChart = buildSolarVsGridSVG(dailyAgg);
    const savingsTrendChart = buildSavingsTrendSVG(dailyAgg);
    const batterySoCChart = buildBatterySoCTrendSVG(dailyAgg);
    const evChargingChart = buildEVChargingBarSVG(dailyAgg);
    const gridInteractionChart = buildGridInteractionSVG(dailyAgg);
    const donut = buildDonutSVG(totalSolar, totalGridImport);

    const now = new Date();
    const reportRefId = `SCL-EPR-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Dynamic recommendations using template literals
    const recommendations: string[] = [];
    if (selfSufficiency < 60) recommendations.push(`Consider expanding battery capacity to increase self-sufficiency beyond 60%. Current rate of ${selfSufficiency.toFixed(0)}% indicates significant grid dependency.`);
    if (solarSelfConsumptionRate < 80) recommendations.push(`Solar self-consumption rate of ${solarSelfConsumptionRate.toFixed(0)}% suggests excess generation. Explore feed-in tariff agreements with KPLC or additional EV charging capacity to utilise surplus.`);
    if (avgBattery < 40) recommendations.push(`Average battery state-of-charge of ${avgBattery.toFixed(0)}% is below optimal. Review charge scheduling to maintain 40-80% SoC range for LiFePO4 longevity.`);
    if (totalSolar > 0 && totalGridImport > totalSolar * 0.3) recommendations.push(`Grid import represents ${((totalGridImport / totalSolar) * 100).toFixed(0)}% of solar generation. Shifting controllable loads to solar-peak hours (10:00-16:00) can reduce grid dependency.`);
    if (totalSolar > 0 && totalEV1 + totalEV2 < totalSolar * 0.2) recommendations.push(`EV charging utilises only ${(((totalEV1 + totalEV2) / totalSolar) * 100).toFixed(0)}% of solar generation. Smart V2G scheduling during peak hours can maximise tariff savings.`);
    if (roiPct > 15) recommendations.push(`Strong ROI of ${roiPct.toFixed(1)}% p.a. validates system economics. Consider phased expansion with an additional 30 kWp array and 40 kWh battery to serve additional fleet vehicles.`);
    if (recommendations.length === 0) recommendations.push('System is performing optimally. Maintain current operational parameters and schedule quarterly maintenance inspections for PV array cleaning and battery health checks.');

    // --- HTML ---
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SafariCharge Ltd - Energy Performance Report</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
<style>
  @page {
    size: A4;
    margin: 1.8cm 2.2cm;
    @bottom-center {
      content: "SafariCharge Ltd · Confidential · Page " counter(page);
      font-size: 7.5pt;
      color: #94a3b8;
      font-family: 'Poppins', sans-serif;
    }
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Poppins','Helvetica Neue',Arial,sans-serif;color:#1e293b;font-size:10pt;line-height:1.55;background:#fff;}

  /* ── Print toolbar (hidden when printing) ── */
  .print-toolbar{position:fixed;top:0;left:0;right:0;z-index:9999;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:10px 20px;gap:12px;box-shadow:0 2px 12px rgba(0,0,0,0.4);font-family:'Poppins',sans-serif;}
  .print-toolbar .title{font-size:12pt;font-weight:700;color:#38bdf8;letter-spacing:0.03em;}
  .print-toolbar .hint{font-size:8.5pt;color:#94a3b8;}
  .print-btn{background:linear-gradient(135deg,#0ea5e9,#0284c7);color:#fff;border:none;border-radius:8px;padding:9px 22px;font-size:10pt;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:8px;transition:transform 0.1s,box-shadow 0.1s;box-shadow:0 2px 8px rgba(14,165,233,0.4);}
  .print-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(14,165,233,0.5);}
  .print-btn:active{transform:translateY(0);}
  @media print{.print-toolbar{display:none!important;}}
  /* Push content below the toolbar when not printing */
  @media screen{body>*:not(.print-toolbar){margin-top:54px;}}
  @media screen{.report-wrap{padding:20px 24px;}}

  /* ── Letterhead ── */
  .letterhead{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0ea5e9;padding-bottom:14px;margin-bottom:22px;}
  .brand{display:flex;align-items:center;gap:14px;}
  .brand h1{font-size:23pt;font-weight:900;letter-spacing:0.05em;color:#0ea5e9;line-height:1;}
  .brand h1 span{color:#0f172a;}
  .brand .sub{font-size:7pt;letter-spacing:0.22em;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-top:2px;}
  .brand .tagline{font-size:7.5pt;color:#64748b;font-weight:400;margin-top:1px;}
  .report-meta{text-align:right;font-size:8.5pt;color:#475569;line-height:1.6;}
  .report-meta strong{display:block;font-size:10pt;font-weight:800;color:#0f172a;letter-spacing:0.02em;}
  .report-meta .ref{font-size:7.5pt;color:#94a3b8;font-weight:500;margin-top:2px;}

  /* ── Title bar ── */
  .title-bar{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0c4a6e 100%);color:white;padding:18px 22px;border-radius:10px;margin-bottom:22px;position:relative;overflow:hidden;}
  .title-bar::before{content:'';position:absolute;top:-30px;right:-30px;width:140px;height:140px;background:rgba(14,165,233,0.15);border-radius:50%;}
  .title-bar h2{font-size:16pt;font-weight:800;letter-spacing:0.03em;position:relative;}
  .title-bar .subtitle{font-size:8.5pt;opacity:0.70;margin-top:5px;position:relative;}
  .title-bar .badges{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;position:relative;}
  .badge{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:20px;padding:3px 10px;font-size:7.5pt;font-weight:600;color:rgba(255,255,255,0.9);}

  /* ── Executive Summary ── */
  .exec-summary{background:#f0f9ff;border:1px solid #bae6fd;border-left:4px solid #0ea5e9;border-radius:8px;padding:14px 18px;margin-bottom:22px;}
  .exec-summary h3{font-size:10pt;font-weight:800;color:#0369a1;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em;}
  .exec-summary p{font-size:9pt;color:#334155;line-height:1.6;text-align:justify;}

  /* ── KPI Cards ── */
  .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:22px;}
  .kpi-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 10px;text-align:center;position:relative;overflow:hidden;}
  .kpi-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--accent,#0ea5e9);}
  .kpi-card .val{font-size:15pt;font-weight:800;line-height:1.1;color:var(--accent,#0ea5e9);}
  .kpi-card .lbl{font-size:7pt;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;margin-top:4px;}
  .kpi-card .sub-val{font-size:8pt;color:#94a3b8;font-weight:400;margin-top:2px;}
  .k-green{--accent:#16a34a;}
  .k-blue{--accent:#0284c7;}
  .k-orange{--accent:#ea580c;}
  .k-purple{--accent:#7c3aed;}
  .k-teal{--accent:#0d9488;}
  .k-rose{--accent:#e11d48;}
  .k-amber{--accent:#d97706;}
  .k-indigo{--accent:#4f46e5;}

  /* ── Section ── */
  .section{margin-bottom:24px;page-break-inside:avoid;}
  .section-hdr{display:flex;align-items:center;gap:8px;border-bottom:2px solid #e2e8f0;padding-bottom:7px;margin-bottom:14px;}
  .section-hdr .num{width:24px;height:24px;border-radius:50%;background:var(--c,#0ea5e9);color:white;font-size:9pt;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .section-hdr h3{font-size:11pt;font-weight:800;color:#0f172a;letter-spacing:0.02em;}

  /* ── Tables ── */
  table{width:100%;border-collapse:collapse;font-size:9pt;}
  thead tr{background:#f1f5f9;}
  th{color:#475569;font-weight:700;text-transform:uppercase;font-size:7.5pt;letter-spacing:0.05em;padding:8px 10px;text-align:left;border-bottom:2px solid #cbd5e1;}
  td{padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#334155;}
  tr:last-child td{border-bottom:none;}
  tr:nth-child(even) td{background:#fafafa;}
  td.num{text-align:right;font-weight:600;font-variant-numeric:tabular-nums;font-family:'Poppins',monospace;}
  td.hi{color:#16a34a;font-weight:700;}
  td.lo{color:#dc2626;font-weight:600;}

  /* ── Chart wrapper ── */
  .chart-wrap{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:14px;}
  .chart-title{font-size:8.5pt;font-weight:700;color:#475569;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;}
  .chart-note{font-size:7.5pt;color:#94a3b8;margin-top:6px;font-style:italic;}
  .chart-row{display:flex;align-items:center;gap:20px;}

  /* ── Eco grid ── */
  .eco-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;}
  .eco-card{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;text-align:center;}
  .eco-card .val{font-size:14pt;font-weight:800;color:#15803d;}
  .eco-card .lbl{font-size:7pt;color:#166534;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-top:4px;}

  /* ── Spec cards ── */
  .spec-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
  .spec-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;}
  .spec-card h4{font-size:9pt;font-weight:700;color:#0f172a;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #e2e8f0;}
  .spec-row{display:flex;justify-content:space-between;font-size:8.5pt;padding:3px 0;border-bottom:1px solid #f1f5f9;}
  .spec-row:last-child{border-bottom:none;}
  .spec-row .k{color:#64748b;font-weight:400;}
  .spec-row .v{font-weight:700;color:#1e293b;}

  /* ── Recommendations ── */
  .rec-list{list-style:none;padding:0;margin:0;}
  .rec-list li{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:9pt;color:#334155;line-height:1.5;text-align:justify;}
  .rec-list li:last-child{border-bottom:none;}
  .rec-icon{width:20px;height:20px;border-radius:50%;background:#0ea5e9;color:white;font-size:8pt;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;}

  /* ── Status badge ── */
  .status-ok{background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;border-radius:4px;padding:1px 8px;font-size:8pt;font-weight:700;}
  .status-warn{background:#fef9c3;color:#854d0e;border:1px solid #fde68a;border-radius:4px;padding:1px 8px;font-size:8pt;font-weight:700;}

  /* ── Health bar ── */
  .health-bar-wrap{background:#e2e8f0;border-radius:4px;height:6px;overflow:hidden;margin-top:3px;}
  .health-bar{height:100%;border-radius:4px;background:linear-gradient(90deg,#16a34a,#22c55e);}

  /* ── Footer ── */
  .report-footer{margin-top:28px;border-top:2px solid #e2e8f0;padding-top:12px;display:flex;justify-content:space-between;align-items:flex-end;font-size:8pt;color:#94a3b8;}
  .report-footer .left strong{color:#334155;font-weight:700;}
  .report-footer .right{text-align:right;}

  /* ── Page break helpers ── */
  .pb-before{page-break-before:always;}

  /* ── Print button ── */
  .no-print{display:none;} /* legacy class; toolbar is hidden via @media print */

  /* ── Print media ── */
  @media print{
    .no-print{display:none !important;}
    body{font-size:9.5pt;}
    .letterhead,.title-bar,.kpi-card{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .section{page-break-inside:avoid;}
    .chart-wrap{page-break-inside:avoid;}
    a{text-decoration:none;color:inherit;}
  }
</style>
</head>
<body>

<!-- ── Print toolbar (hidden when printing via @media print) ── -->
<div class="print-toolbar">
  <span class="title">☀️ SafariCharge — Energy Performance Report</span>
  <span class="hint">Use the button to save as a PDF file → choose "Save as PDF" in the print dialog</span>
  <button class="print-btn" id="printBtn">
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
    🖨️ Print / Download PDF
  </button>
</div>

<div class="report-wrap">

<!-- ════════════ LETTERHEAD ════════════ -->
<div class="letterhead">
  <div class="brand">
    ${LOGO_SVG}
    <div>
      <h1>SAFARI<span>CHARGE</span></h1>
      <div class="sub">Limited · Nairobi, Kenya</div>
      <div class="tagline">Smart Solar · Battery Storage · EV Charging</div>
    </div>
  </div>
  <div class="report-meta">
    <strong>ENERGY PERFORMANCE REPORT</strong>
    <div>Prepared: ${reportDate}</div>
    <div>Period: ${dateFrom} - ${dateTo}</div>
    <div class="ref">Ref: ${reportRefId}</div>
    <div style="margin-top:5px;">
      <span class="status-ok">✓ System Active</span>
    </div>
  </div>
</div>

<!-- ════════════ TITLE BAR ════════════ -->
<div class="title-bar">
  <h2>📊 Solar Energy &amp; EV Charging Performance Report</h2>
  <div class="subtitle">Comprehensive analysis of system performance, financial outcomes, and environmental impact</div>
  <div class="badges">
    <span class="badge">⚡ ${uniqueDays} Days Simulated</span>
    <span class="badge">☀️ ${totalSolar.toFixed(1)} kWh Generated</span>
    <span class="badge">💰 KES ${(totalSavings / 1000).toFixed(1)}k Saved</span>
    <span class="badge">🌿 ${co2Avoided.toFixed(1)} kg CO₂ Avoided</span>
    <span class="badge">🚗 V2G Enabled</span>
  </div>
</div>

<!-- ════════════ EXECUTIVE SUMMARY ════════════ -->
<div class="exec-summary">
  <h3>Executive Summary</h3>
  <p>
    SafariCharge Ltd's integrated solar-storage-EV system has demonstrated strong performance over the ${uniqueDays}-day
    simulation period (${dateFrom} to ${dateTo}). The 50 kWp photovoltaic array generated a total of
    <strong>${totalSolar.toFixed(1)} kWh</strong> of clean energy, achieving a self-sufficiency rate of
    <strong>${selfSufficiency.toFixed(0)}%</strong> and a solar self-consumption rate of
    <strong>${solarSelfConsumptionRate.toFixed(0)}%</strong>. Cumulative KPLC tariff savings reached
    <strong>KES ${formatKES(totalSavings, 0)}</strong>, projecting to an
    annualised saving of <strong>KES ${formatKES(annualisedSavings, 0)}</strong>.
    The 60 kWh LiFePO4 battery maintained an average state-of-charge of <strong>${avgBattery.toFixed(0)}%</strong>,
    supporting both peak shaving and EV overnight charging. Carbon emissions avoided stand at
    <strong>${co2Avoided.toFixed(1)} kg CO₂</strong> (equivalent to planting <strong>${(co2Avoided / 21.77).toFixed(0)} trees</strong>).
    Based on an estimated system cost of <strong>KES ${(estimatedSystemCost / 1_000_000).toFixed(1)}M</strong>, the
    projected simple payback period is <strong>${simplePaybackYears.toFixed(1)} years</strong> with an annualised ROI of
    <strong>${roiPct.toFixed(1)}%</strong>, making this a compelling investment for EV fleet operators and property owners alike.
  </p>
</div>

<!-- ════════════ KPI DASHBOARD ════════════ -->
<div class="kpi-grid">
  <div class="kpi-card k-green">
    <div class="val">${totalSolar.toFixed(1)}</div>
    <div class="lbl">kWh Solar Generated</div>
    <div class="sub-val">↑ ${avgDailySolar.toFixed(1)} kWh/day avg</div>
  </div>
  <div class="kpi-card k-blue">
    <div class="val">KES ${(totalSavings / 1000).toFixed(1)}k</div>
    <div class="lbl">Total Savings</div>
    <div class="sub-val">↑ KES ${avgDailySavings.toFixed(0)}/day avg</div>
  </div>
  <div class="kpi-card k-orange">
    <div class="val">${selfSufficiency.toFixed(0)}%</div>
    <div class="lbl">Self-Sufficiency</div>
    <div class="sub-val">Solar consumption rate</div>
  </div>
  <div class="kpi-card k-teal">
    <div class="val">${co2Avoided.toFixed(1)}</div>
    <div class="lbl">kg CO₂ Avoided</div>
    <div class="sub-val">≈ ${(co2Avoided / 21.77).toFixed(0)} trees planted</div>
  </div>
  <div class="kpi-card k-purple">
    <div class="val">${avgBattery.toFixed(0)}%</div>
    <div class="lbl">Avg Battery SoC</div>
    <div class="sub-val">LiFePO4 · 60 kWh</div>
  </div>
  <div class="kpi-card k-amber">
    <div class="val">${roiPct.toFixed(1)}%</div>
    <div class="lbl">Annualised ROI</div>
    <div class="sub-val">${simplePaybackYears.toFixed(1)} yr payback</div>
  </div>
  <div class="kpi-card k-rose">
    <div class="val">${totalGridImport.toFixed(1)}</div>
    <div class="lbl">kWh Grid Import</div>
    <div class="sub-val">${totalGridExport.toFixed(1)} kWh exported</div>
  </div>
  <div class="kpi-card k-indigo">
    <div class="val">${(totalEV1 + totalEV2).toFixed(1)}</div>
    <div class="lbl">kWh EV Charged</div>
    <div class="sub-val">EV1: ${totalEV1.toFixed(1)} · EV2: ${totalEV2.toFixed(1)}</div>
  </div>
</div>

<!-- ════════════ SECTION 1: SOLAR GENERATION ════════════ -->
<div class="section">
  <div class="section-hdr" style="--c:#22c55e;">
    <div class="num">1</div>
    <h3>Solar Generation Analytics</h3>
  </div>

  <div class="chart-wrap">
    <div class="chart-title">Daily Solar Generation vs Grid Import (Last ${Math.min(uniqueDays, 30)} Days)</div>
    <div class="chart-row">
      <div style="flex:1;">${solarVsGridChart}</div>
      <div style="text-align:center;flex-shrink:0;">${donut}<p style="font-size:8pt;color:#64748b;margin-top:4px;font-weight:600;">Energy Mix</p></div>
    </div>
    <p class="chart-note">■ Green = Solar Generated (kWh) &nbsp;■ Orange = Grid Import (kWh)</p>
  </div>

  <table>
    <thead>
      <tr><th>Metric</th><th class="num">Value</th><th class="num">Unit</th><th>Status</th></tr>
    </thead>
    <tbody>
      <tr><td>Total Solar Generation</td><td class="num hi">${totalSolar.toFixed(2)}</td><td class="num">kWh</td><td><span class="status-ok">Excellent</span></td></tr>
      <tr><td>Average Daily Generation</td><td class="num">${avgDailySolar.toFixed(2)}</td><td class="num">kWh/day</td><td><span class="status-ok">On Target</span></td></tr>
      <tr><td>Peak Instantaneous Output</td><td class="num">${peakInstantSolar.toFixed(2)}</td><td class="num">kW</td><td><span class="status-ok">Normal</span></td></tr>
      <tr><td>Solar During Peak Tariff Hours</td><td class="num hi">${peakSolar.toFixed(2)}</td><td class="num">kWh</td><td><span class="status-ok">Optimal</span></td></tr>
      <tr><td>Solar During Off-Peak Hours</td><td class="num">${offPeakSolar.toFixed(2)}</td><td class="num">kWh</td><td>&ndash;</td></tr>
      <tr><td>Solar Self-Consumption Rate</td><td class="num">${solarSelfConsumptionRate.toFixed(1)}</td><td class="num">%</td><td>${solarSelfConsumptionRate >= 80 ? '<span class="status-ok">Excellent</span>' : '<span class="status-warn">Improve</span>'}</td></tr>
      <tr><td>Self-Sufficiency Rate</td><td class="num">${selfSufficiency.toFixed(1)}</td><td class="num">%</td><td>${selfSufficiency >= 60 ? '<span class="status-ok">Good</span>' : '<span class="status-warn">Review</span>'}</td></tr>
      <tr><td>PV System Capacity</td><td class="num">50.0</td><td class="num">kWp</td><td>&ndash;</td></tr>
      <tr><td>Inverter Capacity</td><td class="num">48.0</td><td class="num">kW</td><td>&ndash;</td></tr>
    </tbody>
  </table>
</div>

<!-- ════════════ SECTION 2: FINANCIAL PERFORMANCE ════════════ -->
<div class="section pb-before">
  <div class="section-hdr" style="--c:#0ea5e9;">
    <div class="num">2</div>
    <h3>Financial Performance &amp; Return on Investment</h3>
  </div>

  <div class="chart-wrap">
    <div class="chart-title">Daily Savings Trend (KES)</div>
    ${savingsTrendChart}
    <p class="chart-note">Savings calculated using KPLC Commercial E-Mobility tariff (Feb 2026 rates): peak KES 24.83/kWh, off-peak KES 15.09/kWh</p>
  </div>

  <table>
    <thead>
      <tr><th>Financial Metric</th><th class="num">Value</th><th class="num">Unit</th></tr>
    </thead>
    <tbody>
      <tr><td><strong>Total KPLC Tariff Savings</strong></td><td class="num hi">${formatKES(totalSavings, 2)}</td><td class="num">KES</td></tr>
      <tr><td>Average Daily Savings</td><td class="num">${avgDailySavings.toFixed(2)}</td><td class="num">KES/day</td></tr>
      <tr><td>Projected Annual Savings</td><td class="num hi">${formatKES(annualisedSavings, 0)}</td><td class="num">KES/year</td></tr>
      <tr><td>Estimated System Cost (CapEx)</td><td class="num">${formatKES(estimatedSystemCost, 0)}</td><td class="num">KES</td></tr>
      <tr><td>Simple Payback Period</td><td class="num">${simplePaybackYears.toFixed(1)}</td><td class="num">years</td></tr>
      <tr><td>Annualised ROI</td><td class="num hi">${roiPct.toFixed(2)}</td><td class="num">%</td></tr>
      <tr><td>10-Year NPV (10% discount rate)</td><td class="num ${npv10yr > 0 ? 'hi' : 'lo'}">${formatKES(npv10yr, 0)}</td><td class="num">KES</td></tr>
      <tr><td>KPLC Peak Tariff (incl. VAT)</td><td class="num">24.83</td><td class="num">KES/kWh</td></tr>
      <tr><td>KPLC Off-Peak Tariff (incl. VAT)</td><td class="num">15.09</td><td class="num">KES/kWh</td></tr>
      <tr><td>Avg Rate Saved per kWh Solar</td><td class="num">${totalSolar > 0 ? (totalSavings / totalSolar).toFixed(2) : '0.00'}</td><td class="num">KES/kWh</td></tr>
    </tbody>
  </table>
</div>

<!-- ════════════ SECTION 3: BATTERY STORAGE ════════════ -->
<div class="section">
  <div class="section-hdr" style="--c:#8b5cf6;">
    <div class="num">3</div>
    <h3>Battery Storage Performance</h3>
  </div>

  <div class="chart-wrap">
    <div class="chart-title">Average Daily Battery State-of-Charge (%)</div>
    ${batterySoCChart}
    <p class="chart-note">LiFePO4 chemistry · 60 kWh capacity · Optimal range: 20-95% SoC for longevity</p>
  </div>

  <table>
    <thead>
      <tr><th>Battery Metric</th><th class="num">Value</th><th class="num">Unit</th><th>Status</th></tr>
    </thead>
    <tbody>
      <tr><td>Battery Capacity</td><td class="num">60.0</td><td class="num">kWh</td><td>&ndash;</td></tr>
      <tr><td>Chemistry</td><td class="num" style="text-align:left;">LiFePO4</td><td class="num">&ndash;</td><td>&ndash;</td></tr>
      <tr><td>Average State-of-Charge</td><td class="num">${avgBattery.toFixed(1)}</td><td class="num">%</td><td>${avgBattery >= 40 && avgBattery <= 80 ? '<span class="status-ok">Optimal</span>' : '<span class="status-warn">Review</span>'}</td></tr>
      <tr><td>Maximum Charge Rate</td><td class="num">30.0</td><td class="num">kW</td><td>&ndash;</td></tr>
      <tr><td>Maximum Discharge Rate</td><td class="num">40.0</td><td class="num">kW</td><td>&ndash;</td></tr>
      <tr><td>Round-trip Efficiency</td><td class="num">96.0</td><td class="num">%</td><td><span class="status-ok">High</span></td></tr>
      <tr><td>Estimated Cycle Count</td><td class="num">${batteryCycles.toFixed(0)}</td><td class="num">cycles</td><td>&ndash;</td></tr>
      <tr><td>Estimated Battery Health</td><td class="num">${batteryHealthPct.toFixed(1)}</td><td class="num">%</td><td><span class="status-ok">Good</span></td></tr>
      <tr><td>Rated Lifetime (to 70% health)</td><td class="num">4,000</td><td class="num">cycles (~11 yr)</td><td>&ndash;</td></tr>
    </tbody>
  </table>
</div>

<!-- ════════════ SECTION 4: EV CHARGING & V2G ════════════ -->
<div class="section pb-before">
  <div class="section-hdr" style="--c:#0ea5e9;">
    <div class="num">4</div>
    <h3>EV Charging Statistics &amp; V2G Data</h3>
  </div>

  <div class="chart-wrap">
    <div class="chart-title">Daily EV Energy Consumed (kWh): EV#1 (Commuter) and EV#2 (Uber Fleet)</div>
    ${evChargingChart}
    <p class="chart-note">■ Blue = EV #1 Commuter (80 kWh) &nbsp;■ Purple = EV #2 Uber (118 kWh)</p>
  </div>

  <table>
    <thead>
      <tr><th>EV Charging Metric</th><th class="num">EV #1 (Commuter)</th><th class="num">EV #2 (Uber)</th><th class="num">Total</th></tr>
    </thead>
    <tbody>
      <tr><td>Battery Capacity</td><td class="num">80 kWh</td><td class="num">118 kWh</td><td class="num">&ndash;</td></tr>
      <tr><td>Charger Rate</td><td class="num">7 kW</td><td class="num">22 kW</td><td class="num">&ndash;</td></tr>
      <tr><td>Total Energy Charged</td><td class="num hi">${totalEV1.toFixed(2)} kWh</td><td class="num hi">${totalEV2.toFixed(2)} kWh</td><td class="num hi">${(totalEV1 + totalEV2).toFixed(2)} kWh</td></tr>
      <tr><td>Avg Daily Charge</td><td class="num">${uniqueDays > 0 ? (totalEV1 / uniqueDays).toFixed(2) : '0.00'} kWh</td><td class="num">${uniqueDays > 0 ? (totalEV2 / uniqueDays).toFixed(2) : '0.00'} kWh</td><td class="num">${uniqueDays > 0 ? ((totalEV1 + totalEV2) / uniqueDays).toFixed(2) : '0.00'} kWh</td></tr>
      <tr><td>Peak EV Load (instantaneous)</td><td class="num" colspan="2">${peakEVLoad.toFixed(2)} kW combined</td><td class="num">&ndash;</td></tr>
      <tr><td>Solar-Powered Charge Share</td><td class="num" colspan="2">${evSolarShare.toFixed(1)}%</td><td class="num">&ndash;</td></tr>
      <tr><td>V2G Standard</td><td class="num" colspan="2">IEC 62196 Type 2 (Bidirectional)</td><td class="num">&ndash;</td></tr>
      <tr><td>V2G / V2B Capability</td><td class="num" colspan="2">✓ Supported (peak shaving & grid services)</td><td class="num">&ndash;</td></tr>
    </tbody>
  </table>
</div>

<!-- ════════════ SECTION 5: GRID INTERACTION ════════════ -->
<div class="section">
  <div class="section-hdr" style="--c:#ef4444;">
    <div class="num">5</div>
    <h3>Grid Interaction Analysis</h3>
  </div>

  <div class="chart-wrap">
    <div class="chart-title">Daily Grid Import vs Export (kWh)</div>
    ${gridInteractionChart}
    <p class="chart-note">■ Red = Grid Import &nbsp;■ Green = Grid Export (feed-in)</p>
  </div>

  <table>
    <thead>
      <tr><th>Grid Metric</th><th class="num">Value</th><th class="num">Unit</th></tr>
    </thead>
    <tbody>
      <tr><td>Total Grid Import</td><td class="num lo">${totalGridImport.toFixed(2)}</td><td class="num">kWh</td></tr>
      <tr><td>Total Grid Export (Feed-in)</td><td class="num hi">${totalGridExport.toFixed(2)}</td><td class="num">kWh</td></tr>
      <tr><td>Net Grid Exchange</td><td class="num ${totalGridExport - totalGridImport >= 0 ? 'hi' : 'lo'}">${(totalGridExport - totalGridImport).toFixed(2)}</td><td class="num">kWh (net)</td></tr>
      <tr><td>Grid Dependency Ratio</td><td class="num">${totalLoad > 0 ? (totalGridImport / totalLoad * 100).toFixed(1) : '0.0'}</td><td class="num">%</td></tr>
      <tr><td>Peak Grid Demand (instantaneous)</td><td class="num">${peakGridImport.toFixed(2)}</td><td class="num">kW</td></tr>
      <tr><td>Peak-Hour Grid Import Avoided</td><td class="num hi">${peakSolar.toFixed(2)}</td><td class="num">kWh</td></tr>
      <tr><td>Grid Standard</td><td class="num" style="text-align:left;">KPLC 415V 3-Phase / 230V 1-Phase</td><td class="num">&ndash;</td></tr>
    </tbody>
  </table>
</div>

<!-- ════════════ SECTION 6: CARBON OFFSET ════════════ -->
<div class="section pb-before">
  <div class="section-hdr" style="--c:#16a34a;">
    <div class="num">6</div>
    <h3>Carbon Offset &amp; Environmental Impact</h3>
  </div>

  <div class="eco-grid">
    <div class="eco-card">
      <div class="val">${co2Avoided.toFixed(1)}</div>
      <div class="lbl">kg CO₂ Avoided</div>
    </div>
    <div class="eco-card">
      <div class="val">${(co2Avoided / 21.77).toFixed(1)}</div>
      <div class="lbl">Tree Equivalents</div>
    </div>
    <div class="eco-card">
      <div class="val">${(co2Avoided / 0.21).toFixed(0)}</div>
      <div class="lbl">km Not Driven</div>
    </div>
    <div class="eco-card">
      <div class="val">${(co2Avoided / 12).toFixed(1)}</div>
      <div class="lbl">kg Coal Offset</div>
    </div>
  </div>

  <p style="font-size:8.5pt;color:#475569;line-height:1.65;text-align:justify;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;">
    Environmental metrics are calculated using the Kenya national grid emission factor of <strong>0.47 kgCO₂/kWh</strong>
    (hydro + thermal mix, EPRA 2024 data). Tree absorption is based on the UNFAO estimate of <strong>21.77 kgCO₂/tree/year</strong>
    for tropical hardwood species. Vehicle emissions are modelled on the average petrol passenger car at <strong>0.21 kgCO₂/km</strong>
    (UNEP 2023). Coal offset uses a conversion factor of <strong>12 kgCO₂/kg coal</strong>.
    Over the simulation period of ${uniqueDays} days, the SafariCharge system has displaced
    <strong>${(co2Avoided / uniqueDays).toFixed(2)} kgCO₂/day</strong> on average (equivalent to an annualised
    avoidance of <strong>${((co2Avoided / uniqueDays) * 365).toFixed(0)} kgCO₂/year</strong>).
  </p>
</div>

<!-- ════════════ SECTION 7: SYSTEM HEALTH & STATUS ════════════ -->
<div class="section">
  <div class="section-hdr" style="--c:#0d9488;">
    <div class="num">7</div>
    <h3>System Health &amp; Status</h3>
  </div>

  <div class="spec-grid">
    <div class="spec-card">
      <h4>☀️ PV Array</h4>
      <div class="spec-row"><span class="k">Capacity</span><span class="v">50 kWp</span></div>
      <div class="spec-row"><span class="k">Technology</span><span class="v">Monocrystalline Si</span></div>
      <div class="spec-row"><span class="k">Inverters</span><span class="v">3 × 16 kW</span></div>
      <div class="spec-row"><span class="k">Location</span><span class="v">Nairobi (1.29°S)</span></div>
      <div class="spec-row"><span class="k">Peak Output</span><span class="v">${peakInstantSolar.toFixed(1)} kW</span></div>
      <div class="spec-row"><span class="k">Status</span><span class="v" style="color:#16a34a;">● Operational</span></div>
      <div style="margin-top:6px;"><span style="font-size:7.5pt;color:#64748b;">System Health</span>
        <div class="health-bar-wrap"><div class="health-bar" style="width:97%;"></div></div>
        <span style="font-size:7.5pt;color:#16a34a;font-weight:700;">97%</span>
      </div>
    </div>
    <div class="spec-card">
      <h4>🔋 Battery Storage</h4>
      <div class="spec-row"><span class="k">Capacity</span><span class="v">60 kWh</span></div>
      <div class="spec-row"><span class="k">Chemistry</span><span class="v">LiFePO4</span></div>
      <div class="spec-row"><span class="k">Max Charge</span><span class="v">30 kW</span></div>
      <div class="spec-row"><span class="k">Max Discharge</span><span class="v">40 kW</span></div>
      <div class="spec-row"><span class="k">Cycles Used</span><span class="v">${batteryCycles.toFixed(0)}</span></div>
      <div class="spec-row"><span class="k">Status</span><span class="v" style="color:#16a34a;">● Healthy</span></div>
      <div style="margin-top:6px;"><span style="font-size:7.5pt;color:#64748b;">Battery Health</span>
        <div class="health-bar-wrap"><div class="health-bar" style="width:${batteryHealthPct.toFixed(0)}%;background:linear-gradient(90deg,${batteryHealthPct > 85 ? '#16a34a,#22c55e' : '#d97706,#fbbf24'});"></div></div>
        <span style="font-size:7.5pt;color:${batteryHealthPct > 85 ? '#16a34a' : '#d97706'};font-weight:700;">${batteryHealthPct.toFixed(1)}%</span>
      </div>
    </div>
    <div class="spec-card">
      <h4>🚗 EV Charging</h4>
      <div class="spec-row"><span class="k">EV 1 (Commuter)</span><span class="v">80 kWh · 7 kW</span></div>
      <div class="spec-row"><span class="k">EV 2 (Uber)</span><span class="v">118 kWh · 22 kW</span></div>
      <div class="spec-row"><span class="k">V2G/V2B</span><span class="v">✓ Supported</span></div>
      <div class="spec-row"><span class="k">Standard</span><span class="v">IEC 62196 Type 2</span></div>
      <div class="spec-row"><span class="k">Total Charged</span><span class="v">${(totalEV1 + totalEV2).toFixed(1)} kWh</span></div>
      <div class="spec-row"><span class="k">Status</span><span class="v" style="color:#16a34a;">● Active</span></div>
      <div style="margin-top:6px;"><span style="font-size:7.5pt;color:#64748b;">Charger Utilisation</span>
        <div class="health-bar-wrap"><div class="health-bar" style="width:${chargerUtilisationPct.toFixed(0)}%;background:linear-gradient(90deg,#0284c7,#0ea5e9);"></div></div>
      </div>
    </div>
  </div>
</div>

<!-- ════════════ SECTION 8: RECOMMENDATIONS ════════════ -->
<div class="section">
  <div class="section-hdr" style="--c:#f59e0b;">
    <div class="num">8</div>
    <h3>Recommendations &amp; Optimisation Opportunities</h3>
  </div>
  <ul class="rec-list">
    ${recommendations.map((r, i) => `
    <li>
      <div class="rec-icon">${i + 1}</div>
      <span>${r}</span>
    </li>`).join('')}
  </ul>
</div>

<!-- ════════════ SECTION 9: SIMULATION METHODOLOGY ════════════ -->
<div class="section">
  <div class="section-hdr" style="--c:#64748b;">
    <div class="num">9</div>
    <h3>Simulation Methodology</h3>
  </div>
  <p style="font-size:9pt;color:#475569;line-height:1.65;text-align:justify;">
    This report is generated from a physics-based energy simulation incorporating Nairobi-specific solar irradiance
    modelling (Gaussian irradiance curve with seasonal peak hour shift, panel temperature coefficient −0.5%/°C above 25°C,
    soiling/dust accumulation with rain reset). Load profiles are modelled using realistic residential and commercial EV
    fleet patterns. KPLC Commercial E-Mobility tariff structure (February 2026 rates, including FERFA, INFA, WRA, ERC
    levies and 16% VAT) is applied. Battery degradation uses the LiFePO4 lifetime model (~4,000 cycles to 70% health,
    cycle depth weighted). EV charging implements a CC/CV taper above 80% SoC. Weather transitions use a Markov-chain
    model based on Nairobi climate data. <strong>All values are simulation estimates and should be validated with real
    smart-metering data before final investment decisions.</strong>
  </p>
</div>

<!-- ════════════ APPENDIX ════════════ -->
<div class="section pb-before">
  <div class="section-hdr" style="--c:#334155;">
    <div class="num">A</div>
    <h3>Appendix: Detailed Metrics Summary</h3>
  </div>

  <table>
    <thead>
      <tr><th colspan="4">Complete System Performance Summary</th></tr>
      <tr><th>Parameter</th><th class="num">Value</th><th class="num">Unit</th><th>Notes</th></tr>
    </thead>
    <tbody>
      <tr><td colspan="4" style="background:#f1f5f9;font-weight:700;font-size:8pt;text-transform:uppercase;letter-spacing:0.05em;color:#475569;padding:6px 10px;">Simulation Period</td></tr>
      <tr><td>System Start Date</td><td class="num">${startDate}</td><td class="num">&ndash;</td><td>Simulation origin</td></tr>
      <tr><td>Report Period Start</td><td class="num">${dateFrom}</td><td class="num">&ndash;</td><td>&ndash;</td></tr>
      <tr><td>Report Period End</td><td class="num">${dateTo}</td><td class="num">&ndash;</td><td>&ndash;</td></tr>
      <tr><td>Total Days Simulated</td><td class="num">${uniqueDays}</td><td class="num">days</td><td>Unique calendar dates</td></tr>
      <tr><td>Total Data Points</td><td class="num">${formatNumber(totalDataPoints)}</td><td class="num">records</td><td>420 samples per day (~3.4 min interval)</td></tr>
      <tr><td colspan="4" style="background:#f1f5f9;font-weight:700;font-size:8pt;text-transform:uppercase;letter-spacing:0.05em;color:#475569;padding:6px 10px;">Energy Flows</td></tr>
      <tr><td>Total Solar Generated</td><td class="num">${totalSolar.toFixed(3)}</td><td class="num">kWh</td><td>AC output post-inverter</td></tr>
      <tr><td>Total Home Load</td><td class="num">${totalHomeLoad.toFixed(3)}</td><td class="num">kWh</td><td>Residential consumption</td></tr>
      <tr><td>Total EV #1 Load</td><td class="num">${totalEV1.toFixed(3)}</td><td class="num">kWh</td><td>Commuter EV charging</td></tr>
      <tr><td>Total EV #2 Load</td><td class="num">${totalEV2.toFixed(3)}</td><td class="num">kWh</td><td>Uber fleet charging</td></tr>
      <tr><td>Total Combined Load</td><td class="num">${totalLoad.toFixed(3)}</td><td class="num">kWh</td><td>Home + EV combined</td></tr>
      <tr><td>Total Grid Import</td><td class="num">${totalGridImport.toFixed(3)}</td><td class="num">kWh</td><td>Purchased from KPLC</td></tr>
      <tr><td>Total Grid Export</td><td class="num">${totalGridExport.toFixed(3)}</td><td class="num">kWh</td><td>Feed-in to grid</td></tr>
      <tr><td colspan="4" style="background:#f1f5f9;font-weight:700;font-size:8pt;text-transform:uppercase;letter-spacing:0.05em;color:#475569;padding:6px 10px;">Performance Ratios</td></tr>
      <tr><td>Self-Sufficiency Rate</td><td class="num">${selfSufficiency.toFixed(2)}</td><td class="num">%</td><td>Solar / Total Load</td></tr>
      <tr><td>Solar Self-Consumption Rate</td><td class="num">${solarSelfConsumptionRate.toFixed(2)}</td><td class="num">%</td><td>Consumed solar / Generated solar</td></tr>
      <tr><td>Grid Dependency</td><td class="num">${totalLoad > 0 ? (totalGridImport / totalLoad * 100).toFixed(2) : '0.00'}</td><td class="num">%</td><td>Grid Import / Total Load</td></tr>
      <tr><td colspan="4" style="background:#f1f5f9;font-weight:700;font-size:8pt;text-transform:uppercase;letter-spacing:0.05em;color:#475569;padding:6px 10px;">Financial</td></tr>
      <tr><td>Total KPLC Savings</td><td class="num">${totalSavings.toFixed(2)}</td><td class="num">KES</td><td>Tariff avoidance</td></tr>
      <tr><td>Average Daily Savings</td><td class="num">${avgDailySavings.toFixed(2)}</td><td class="num">KES/day</td><td>&ndash;</td></tr>
      <tr><td>Annualised Savings</td><td class="num">${annualisedSavings.toFixed(0)}</td><td class="num">KES/year</td><td>Extrapolated from daily avg</td></tr>
      <tr><td>Simple Payback Period</td><td class="num">${simplePaybackYears.toFixed(2)}</td><td class="num">years</td><td>CapEx / Annual savings</td></tr>
      <tr><td>Annualised ROI</td><td class="num">${roiPct.toFixed(2)}</td><td class="num">%</td><td>Annual savings / CapEx</td></tr>
      <tr><td>10-Year NPV (10% discount)</td><td class="num">${npv10yr.toFixed(0)}</td><td class="num">KES</td><td>Discounted cash flows</td></tr>
      <tr><td colspan="4" style="background:#f1f5f9;font-weight:700;font-size:8pt;text-transform:uppercase;letter-spacing:0.05em;color:#475569;padding:6px 10px;">Environmental</td></tr>
      <tr><td>CO₂ Avoided</td><td class="num">${co2Avoided.toFixed(3)}</td><td class="num">kg</td><td>0.47 kgCO₂/kWh factor</td></tr>
      <tr><td>Tree Equivalents</td><td class="num">${(co2Avoided / 21.77).toFixed(2)}</td><td class="num">trees/year</td><td>UNFAO 21.77 kg/tree/yr</td></tr>
      <tr><td>km Not Driven</td><td class="num">${(co2Avoided / 0.21).toFixed(0)}</td><td class="num">km</td><td>0.21 kgCO₂/km petrol car</td></tr>
    </tbody>
  </table>
</div>

<!-- ════════════ FOOTER ════════════ -->
<div class="report-footer">
  <div class="left">
    <strong>SafariCharge Ltd</strong><br/>
    Nairobi, Kenya &nbsp;|&nbsp; www.safaricharge.co.ke &nbsp;|&nbsp; info@safaricharge.co.ke<br/>
    <em style="font-size:7.5pt;">Confidential: Prepared for investor and management use only. Not for public distribution.</em>
  </div>
  <div class="right">
    Report Date: ${reportDate}<br/>
    Ref: ${reportRefId}<br/>
    Generated by SafariCharge Dashboard v2
  </div>
</div>

</div><!-- /.report-wrap -->

<script>
  document.getElementById('printBtn')?.addEventListener('click', function() {
    window.print();
  });
</script>

</body>
</html>`;

    const responseHeaders = new Headers(headers);
    responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
    responseHeaders.set('Cache-Control', 'no-store');

    return new NextResponse(html, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Formal report error:', error);
    const details =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : (() => {
              try {
                return JSON.stringify(error);
              } catch {
                return String(error);
              }
            })();
    return jsonResponse(
      { error: 'Failed to generate report', details },
      { status: 500, headers }
    );
  }
}
