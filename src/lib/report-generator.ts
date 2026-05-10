'use client';

export interface ReportSystemConfig {
  solarCapacityKW: number;
  batteryCapacityKWh: number;
  inverterKW: number;
  systemMode: string;
  gridOutageEnabled: boolean;
  inverterModel?: string;
  inverterUnits?: number;
  inverterKwPerUnit?: number;
  evChargerType?: string;
  evChargerCount?: number;
  evChargerMaxKw?: number;
}

export interface ReportFinancialData {
  revenueMonthly: number;
  netMonthly: number;
  paybackYears: number;
  irrPct: number;
  npvKes: number;
  lcoeKesPerKwh: number;
  capexKes: number;
  chargingTariffKes: number;
}

export interface ReportSimulationPoint {
  solarKW: number;
  batteryLevelPct: number;
  homeLoadKW: number;
  gridImportKW: number;
  gridExportKW: number;
  ev1LoadKW: number;
  ev2LoadKW: number;
  savingsKES: number;
  solarEnergyKWh: number;
  timeOfDay?: number;
}

export interface ReportData {
  generatedAt: string;
  locationName: string;
  locationCountry: string;
  locationLat: number;
  locationLon: number;
  avgDailySunHours: number;
  systemConfig: ReportSystemConfig;
  financialData: ReportFinancialData;
  simulationPoints: ReportSimulationPoint[];
  totalSolarKWh: number;
  totalSavingsKES: number;
  totalGridImportKWh: number;
  totalGridExportKWh: number;
  totalEvKWh: number;
  systemMode: string;
}

// ── SVG Chart generators ────────────────────────────────────────────────────

function buildLineChartSVG(
  points: number[],
  width: number,
  height: number,
  color: string,
  fillColor: string,
  label: string,
  unit: string
): string {
  if (points.length < 2) return `<svg width="${width}" height="${height}"><text x="${width/2}" y="${height/2}" text-anchor="middle" fill="#888" font-size="12">No data</text></svg>`;
  const max = Math.max(...points, 0.01);
  const min = 0;
  const pad = { top: 24, right: 16, bottom: 32, left: 48 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const xs = points.map((_, i) => pad.left + (i / (points.length - 1)) * w);
  const ys = points.map(v => pad.top + h - ((v - min) / (max - min)) * h);
  const pathD = points.map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i].toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${xs[xs.length-1].toFixed(1)} ${(pad.top + h).toFixed(1)} L ${pad.left} ${(pad.top + h).toFixed(1)} Z`;
  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ v: min + t * (max - min), y: pad.top + h - t * h }));
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    i: Math.round(t * (points.length - 1)),
    x: pad.left + t * w,
  }));
  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="${width/2}" y="14" text-anchor="middle" font-size="11" fill="#555" font-family="sans-serif">${label}</text>
  <!-- grid lines -->
  ${yTicks.map(t => `<line x1="${pad.left}" y1="${t.y.toFixed(1)}" x2="${pad.left+w}" y2="${t.y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>`).join('')}
  <!-- area fill -->
  <path d="${areaD}" fill="${fillColor}" opacity="0.35"/>
  <!-- line -->
  <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>
  <!-- Y axis labels -->
  ${yTicks.map(t => `<text x="${pad.left-6}" y="${(t.y+4).toFixed(1)}" text-anchor="end" font-size="9" fill="#888" font-family="sans-serif">${t.v.toFixed(1)}</text>`).join('')}
  <!-- X axis labels -->
  ${xTicks.map(t => `<text x="${t.x.toFixed(1)}" y="${(pad.top+h+14).toFixed(1)}" text-anchor="middle" font-size="9" fill="#888" font-family="sans-serif">${unit === 'h' ? t.i + 'h' : t.i}</text>`).join('')}
  <!-- axes -->
  <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top+h}" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="${pad.left}" y1="${pad.top+h}" x2="${pad.left+w}" y2="${pad.top+h}" stroke="#cbd5e1" stroke-width="1"/>
</svg>`.trim();
}

function buildBarChartSVG(
  labels: string[],
  values: number[],
  colors: string[],
  width: number,
  height: number,
  title: string
): string {
  const max = Math.max(...values, 0.01);
  const pad = { top: 28, right: 16, bottom: 40, left: 56 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const barW = Math.floor(w / labels.length * 0.6);
  const gap = Math.floor(w / labels.length);
  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="${width/2}" y="18" text-anchor="middle" font-size="11" fill="#555" font-family="sans-serif">${title}</text>
  <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top+h}" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="${pad.left}" y1="${pad.top+h}" x2="${pad.left+w}" y2="${pad.top+h}" stroke="#cbd5e1" stroke-width="1"/>
  ${values.map((v, i) => {
    const barH = (v / max) * h;
    const x = pad.left + i * gap + (gap - barW) / 2;
    const y = pad.top + h - barH;
    return `
  <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${barH.toFixed(1)}" fill="${colors[i % colors.length]}" rx="3"/>
  <text x="${(x + barW/2).toFixed(1)}" y="${(y-4).toFixed(1)}" text-anchor="middle" font-size="9" fill="#555" font-family="sans-serif">${v.toFixed(0)}</text>
  <text x="${(x + barW/2).toFixed(1)}" y="${(pad.top+h+14).toFixed(1)}" text-anchor="middle" font-size="8" fill="#888" font-family="sans-serif">${labels[i]}</text>`;
  }).join('')}
</svg>`.trim();
}

function buildDonutSVG(segments: { label: string; value: number; color: string }[], cx: number, cy: number, r: number, title: string): string {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let cumAngle = -90;
  const paths: string[] = [];
  segments.forEach(seg => {
    const frac = seg.value / total;
    const sweep = frac * 360;
    const startRad = (cumAngle * Math.PI) / 180;
    const endRad = ((cumAngle + sweep) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const large = sweep > 180 ? 1 : 0;
    paths.push(`<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${seg.color}" opacity="0.85"/>`);
    cumAngle += sweep;
  });
  // inner circle (donut hole)
  const innerR = r * 0.55;
  return `
<svg width="${cx*2}" height="${cy*2+24}" xmlns="http://www.w3.org/2000/svg">
  <text x="${cx}" y="14" text-anchor="middle" font-size="11" fill="#555" font-family="sans-serif">${title}</text>
  <g transform="translate(0,14)">
    ${paths.join('')}
    <circle cx="${cx}" cy="${cy}" r="${innerR}" fill="white"/>
    <text x="${cx}" y="${(cy+4).toFixed(1)}" text-anchor="middle" font-size="10" fill="#555" font-family="sans-serif">Mix</text>
  </g>
  <g transform="translate(0,${cy*2+18})">
    ${segments.map((s, i) => `<rect x="${i*80+4}" y="-10" width="10" height="10" fill="${s.color}" rx="2"/><text x="${i*80+18}" y="-1" font-size="9" fill="#555" font-family="sans-serif">${s.label} ${(s.value/total*100).toFixed(0)}%</text>`).join('')}
  </g>
</svg>`.trim();
}

// ── Financial projection bar chart (20 years) ───────────────────────────────
function buildFinancialProjectionSVG(revenueMonthly: number, netMonthly: number, capexKes: number, width: number, height: number): string {
  const years = Array.from({ length: 20 }, (_, i) => i + 1);
  const revenueValues = years.map(y => revenueMonthly * 12 * y / 1000000);
  const netValues     = years.map(y => netMonthly * 12 * y / 1000000);
  const capexLine     = capexKes / 1000000;
  const max = Math.max(...revenueValues, capexLine + 0.5, 0.01);
  const pad = { top: 28, right: 16, bottom: 40, left: 56 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const revPath = years.map((_, i) => {
    const x = pad.left + (i / (years.length - 1)) * w;
    const y = pad.top + h - (revenueValues[i] / max) * h;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const netPath = years.map((_, i) => {
    const x = pad.left + (i / (years.length - 1)) * w;
    const y = pad.top + h - (netValues[i] / max) * h;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const capexY = pad.top + h - (capexLine / max) * h;
  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="${width/2}" y="18" text-anchor="middle" font-size="11" fill="#555" font-family="sans-serif">Cumulative Revenue &amp; Net Profit (KES millions, 20 years)</text>
  <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top+h}" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="${pad.left}" y1="${pad.top+h}" x2="${pad.left+w}" y2="${pad.top+h}" stroke="#cbd5e1" stroke-width="1"/>
  <!-- CAPEX line -->
  <line x1="${pad.left}" y1="${capexY.toFixed(1)}" x2="${pad.left+w}" y2="${capexY.toFixed(1)}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="6 3"/>
  <text x="${pad.left+w-2}" y="${(capexY-4).toFixed(1)}" text-anchor="end" font-size="9" fill="#ef4444" font-family="sans-serif">CAPEX</text>
  <!-- Revenue -->
  <path d="${revPath}" fill="none" stroke="#047857" stroke-width="2" stroke-linejoin="round"/>
  <!-- Net Profit -->
  <path d="${netPath}" fill="none" stroke="#0e7490" stroke-width="2" stroke-linejoin="round" stroke-dasharray="4 2"/>
  <!-- Year labels -->
  ${[1,5,10,15,20].map(y => {
    const x = pad.left + ((y-1) / (years.length - 1)) * w;
    return `<text x="${x.toFixed(1)}" y="${(pad.top+h+14).toFixed(1)}" text-anchor="middle" font-size="9" fill="#888" font-family="sans-serif">Yr${y}</text>`;
  }).join('')}
  <!-- Y axis labels -->
  ${[0,0.25,0.5,0.75,1].map(t => {
    const v = t * max;
    const y = pad.top + h - t * h;
    return `<text x="${pad.left-6}" y="${(y+4).toFixed(1)}" text-anchor="end" font-size="9" fill="#888" font-family="sans-serif">${v.toFixed(1)}M</text>`;
  }).join('')}
  <!-- Legend -->
  <rect x="${pad.left}" y="${pad.top+h+24}" width="10" height="6" fill="#047857" rx="1"/>
  <text x="${pad.left+14}" y="${pad.top+h+31}" font-size="9" fill="#555" font-family="sans-serif">Revenue</text>
  <rect x="${pad.left+80}" y="${pad.top+h+24}" width="10" height="6" fill="#0e7490" rx="1"/>
  <text x="${pad.left+94}" y="${pad.top+h+31}" font-size="9" fill="#555" font-family="sans-serif">Net Profit</text>
  <line x1="${pad.left+160}" y1="${pad.top+h+27}" x2="${pad.left+172}" y2="${pad.top+h+27}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 2"/>
  <text x="${pad.left+175}" y="${pad.top+h+31}" font-size="9" fill="#555" font-family="sans-serif">CAPEX</text>
</svg>`.trim();
}

// ── Main HTML generator ─────────────────────────────────────────────────────

export function generateReportHTML(data: ReportData): string {
  const {
    generatedAt, locationName, locationCountry, avgDailySunHours,
    systemConfig, financialData, simulationPoints,
    totalSolarKWh, totalSavingsKES, totalGridImportKWh, totalGridExportKWh, totalEvKWh,
  } = data;

  const fmt = (n: number, d = 0) => Number.isFinite(n) ? n.toLocaleString('en-KE', { maximumFractionDigits: d }) : '—';
  const fmtKes = (n: number) => `KES ${fmt(n)}`;

  // Downsample simulation points for charts (max 200 points)
  const ds = (arr: number[], max = 200) => {
    if (arr.length <= max) return arr;
    const step = Math.ceil(arr.length / max);
    return arr.filter((_, i) => i % step === 0);
  };

  const solarPoints   = ds(simulationPoints.map(p => p.solarKW));
  const socPoints     = ds(simulationPoints.map(p => p.batteryLevelPct));
  const loadPoints    = ds(simulationPoints.map(p => p.homeLoadKW));
  const gridPoints    = ds(simulationPoints.map(p => p.gridImportKW - p.gridExportKW));

  const solarChartSVG   = buildLineChartSVG(solarPoints, 480, 160, '#d97706', '#fef3c7', 'Solar Generation (kW)', 'h');
  const socChartSVG     = buildLineChartSVG(socPoints, 480, 160, '#047857', '#d1fae5', 'Battery State of Charge (%)', 'h');
  const loadChartSVG    = buildLineChartSVG(loadPoints, 480, 160, '#0e7490', '#cffafe', 'Home Load (kW)', 'h');
  const gridChartSVG    = buildLineChartSVG(gridPoints, 480, 160, '#6d28d9', '#ede9fe', 'Net Grid Power (kW)', 'h');

  const energyDonut = buildDonutSVG([
    { label: 'Solar', value: totalSolarKWh, color: '#d97706' },
    { label: 'Grid In', value: totalGridImportKWh, color: '#6d28d9' },
    { label: 'Grid Out', value: totalGridExportKWh, color: '#047857' },
    { label: 'EV', value: totalEvKWh, color: '#0e7490' },
  ], 110, 100, 80, 'Energy Mix');

  const financialSVG = buildFinancialProjectionSVG(
    financialData.revenueMonthly,
    financialData.netMonthly,
    financialData.capexKes,
    560, 220
  );

  const monthlyRevBars = buildBarChartSVG(
    ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    Array.from({ length: 12 }, (_, i) => {
      const seasonalFactor = 0.85 + 0.3 * Math.sin((i - 2) * Math.PI / 6);
      return Math.round(financialData.revenueMonthly * seasonalFactor);
    }),
    ['#047857','#059669','#10b981','#34d399','#6ee7b7','#a7f3d0','#047857','#059669','#10b981','#34d399','#6ee7b7','#a7f3d0'],
    560, 180,
    'Estimated Monthly Revenue (KES)'
  );

  const capexItems = [
    { label: 'Solar PV', value: systemConfig.solarCapacityKW * 85000 },
    { label: 'Battery', value: systemConfig.batteryCapacityKWh * 35000 },
    { label: 'Inverter', value: systemConfig.inverterKW * 12000 },
    { label: 'EV Chargers', value: (systemConfig.evChargerCount ?? 2) * (systemConfig.evChargerMaxKw ?? 22) * 2500 },
    { label: 'Installation', value: financialData.capexKes * 0.12 },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SafariCharge System Report — ${locationName}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1a2e1e; background: #f5f7f4; }
  @page { size: A4; margin: 20mm 16mm; }
  @media print {
    body { background: white; }
    .page-break { page-break-before: always; }
    .no-print { display: none !important; }
    section { break-inside: avoid; }
  }
  .page { background: white; max-width: 794px; margin: 0 auto 24px; padding: 40px 44px; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  /* Cover */
  .cover { min-height: 500px; display: flex; flex-direction: column; justify-content: center; position: relative; overflow: hidden; }
  .cover-accent { position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #047857, #059669, #10b981); }
  .cover-logo { font-size: 22px; font-weight: 900; color: #047857; letter-spacing: -0.5px; margin-bottom: 32px; }
  .cover-logo span { color: #d97706; }
  .cover h1 { font-size: 28px; font-weight: 800; color: #0d1f17; line-height: 1.25; margin-bottom: 12px; }
  .cover .subtitle { font-size: 15px; color: #4a6658; margin-bottom: 32px; line-height: 1.6; }
  .cover-meta { display: flex; flex-wrap: wrap; gap: 12px; }
  .meta-chip { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 999px; padding: 6px 16px; font-size: 12px; color: #166534; font-weight: 600; }
  .cover-footer { margin-top: auto; padding-top: 32px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; display: flex; justify-content: space-between; }
  /* Sections */
  h2.section-title { font-size: 17px; font-weight: 800; color: #0d1f17; margin-bottom: 4px; padding-bottom: 10px; border-bottom: 2px solid #047857; display: flex; align-items: center; gap: 8px; }
  h2.section-title::before { content: ''; display: inline-block; width: 4px; height: 20px; background: #047857; border-radius: 2px; }
  h3.sub-title { font-size: 13px; font-weight: 700; color: #2e4a3c; margin: 20px 0 10px; }
  /* KPI grid */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
  .kpi { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px; text-align: center; }
  .kpi-value { font-size: 18px; font-weight: 900; color: #047857; line-height: 1.2; }
  .kpi-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; font-weight: 600; }
  /* Spec table */
  table.spec-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
  table.spec-table th { background: #f0fdf4; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #374151; border-bottom: 2px solid #bbf7d0; }
  table.spec-table td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
  table.spec-table tr:nth-child(even) td { background: #f9fafb; }
  table.spec-table td:last-child { font-weight: 700; color: #0d1f17; text-align: right; }
  /* Chart containers */
  .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
  .chart-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fafafa; overflow: hidden; }
  .chart-full { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #fafafa; margin: 12px 0; overflow: hidden; }
  /* Financial */
  .fin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
  .fin-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; }
  .fin-card-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; margin-bottom: 4px; }
  .fin-card-value { font-size: 16px; font-weight: 800; color: #047857; }
  .fin-card-sub { font-size: 10px; color: #9ca3af; margin-top: 2px; }
  /* Alert / info boxes */
  .info-box { border-radius: 8px; padding: 12px 16px; font-size: 12px; line-height: 1.6; margin: 12px 0; }
  .info-box.green { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
  .info-box.amber { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
  .info-box.blue  { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
  /* Two-col layout */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; margin: 16px 0; }
  /* Print button */
  .print-btn { position: fixed; top: 20px; right: 20px; background: #047857; color: white; border: none; border-radius: 999px; padding: 10px 20px; font-size: 13px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(4,120,87,0.35); z-index: 100; }
  .print-btn:hover { background: #059669; }
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">&#x2B07; Save as PDF</button>

<!-- ═══════════════════════════════════════════════════════════
     PAGE 1 — COVER
     ═══════════════════════════════════════════════════════════ -->
<div class="page cover">
  <div class="cover-accent"></div>
  <div class="cover-logo">Safari<span>Charge</span></div>
  <h1>Energy System<br/>Performance Report</h1>
  <p class="subtitle">
    Comprehensive analysis of solar energy generation, battery storage performance,<br/>
    EV charging operations, and financial projections for your SafariCharge installation.
  </p>
  <div class="cover-meta">
    <span class="meta-chip">&#x1F4CD; ${locationName}, ${locationCountry}</span>
    <span class="meta-chip">&#x2600;&#xFE0F; ${avgDailySunHours.toFixed(1)} PSH/day</span>
    <span class="meta-chip">&#x26A1; ${systemConfig.solarCapacityKW} kWp Solar</span>
    <span class="meta-chip">&#x1F50B; ${systemConfig.batteryCapacityKWh} kWh Battery</span>
    <span class="meta-chip">&#x1F697; ${systemConfig.evChargerCount ?? 2} EV Chargers</span>
  </div>
  <div class="cover-footer">
    <span>Generated: ${generatedAt}</span>
    <span>SafariCharge &middot; Energy Intelligence Platform</span>
    <span>CONFIDENTIAL</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     PAGE 2 — EXECUTIVE SUMMARY
     ═══════════════════════════════════════════════════════════ -->
<div class="page page-break">
  <h2 class="section-title">Executive Summary</h2>
  <p style="color:#4a6658;line-height:1.7;margin:12px 0;">
    This report presents the simulation results and financial projections for a ${systemConfig.solarCapacityKW} kWp solar energy system
    with ${systemConfig.batteryCapacityKWh} kWh battery storage and ${systemConfig.evChargerCount ?? 2} EV charging station${(systemConfig.evChargerCount ?? 2) > 1 ? 's' : ''} located in
    ${locationName}, ${locationCountry}. The system operates in <strong>${data.systemMode}</strong> mode and is projected to deliver
    strong returns based on current energy tariffs and simulation performance data.
  </p>

  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-value">${fmtKes(financialData.revenueMonthly)}</div>
      <div class="kpi-label">Revenue / Month</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">${financialData.paybackYears.toFixed(1)} yrs</div>
      <div class="kpi-label">Payback Period</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">${financialData.irrPct.toFixed(1)}%</div>
      <div class="kpi-label">IRR</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">${fmtKes(financialData.npvKes)}</div>
      <div class="kpi-label">20-Year NPV</div>
    </div>
  </div>

  <div class="kpi-grid" style="margin-top:0;">
    <div class="kpi">
      <div class="kpi-value">${fmt(totalSolarKWh, 1)} kWh</div>
      <div class="kpi-label">Solar Generated</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">${fmtKes(totalSavingsKES)}</div>
      <div class="kpi-label">Sim Savings</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">${fmt(totalGridExportKWh, 1)} kWh</div>
      <div class="kpi-label">Grid Export</div>
    </div>
    <div class="kpi">
      <div class="kpi-value">${fmtKes(financialData.lcoeKesPerKwh)}/kWh</div>
      <div class="kpi-label">LCOE</div>
    </div>
  </div>

  <div class="info-box green">
    <strong>Investment Outlook:</strong> Based on simulation data, this system is projected to achieve full capital recovery in
    <strong>${financialData.paybackYears.toFixed(1)} years</strong> with a 20-year NPV of <strong>${fmtKes(financialData.npvKes)}</strong>
    and an IRR of <strong>${financialData.irrPct.toFixed(1)}%</strong> &mdash; significantly above the Kenya risk-free rate benchmark of ~12%.
    ${financialData.irrPct > 20 ? 'The IRR indicates an excellent risk-adjusted return for this energy infrastructure investment.' : ''}
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     PAGE 3 — SYSTEM CONFIGURATION
     ═══════════════════════════════════════════════════════════ -->
<div class="page page-break">
  <h2 class="section-title">System Configuration</h2>

  <div class="two-col">
    <div>
      <h3 class="sub-title">Solar Array</h3>
      <table class="spec-table">
        <tr><td>Installed Capacity</td><td>${systemConfig.solarCapacityKW.toFixed(1)} kWp</td></tr>
        <tr><td>Location</td><td>${locationName}</td></tr>
        <tr><td>Avg. Peak Sun Hours</td><td>${avgDailySunHours.toFixed(2)} PSH/day</td></tr>
        <tr><td>Est. Annual Yield</td><td>${fmt(systemConfig.solarCapacityKW * avgDailySunHours * 365 * 0.8)} kWh/yr</td></tr>
        <tr><td>Performance Ratio</td><td>80%</td></tr>
      </table>

      <h3 class="sub-title">Battery Storage</h3>
      <table class="spec-table">
        <tr><td>Usable Capacity</td><td>${systemConfig.batteryCapacityKWh.toFixed(0)} kWh</td></tr>
        <tr><td>Chemistry</td><td>LiFePO&#x2084;</td></tr>
        <tr><td>Depth of Discharge</td><td>80%</td></tr>
        <tr><td>Round-Trip Efficiency</td><td>~95%</td></tr>
        <tr><td>Design Life</td><td>6,000+ cycles</td></tr>
      </table>
    </div>

    <div>
      <h3 class="sub-title">Inverter / Conversion</h3>
      <table class="spec-table">
        <tr><td>Model</td><td>${systemConfig.inverterModel ?? 'Hybrid Inverter'}</td></tr>
        <tr><td>Total AC Capacity</td><td>${systemConfig.inverterKW.toFixed(1)} kW</td></tr>
        <tr><td>Units in Parallel</td><td>${systemConfig.inverterUnits ?? 1}</td></tr>
        <tr><td>Per Unit Rating</td><td>${(systemConfig.inverterKwPerUnit ?? systemConfig.inverterKW).toFixed(1)} kW</td></tr>
        <tr><td>System Mode</td><td style="text-transform:capitalize">${data.systemMode}</td></tr>
      </table>

      <h3 class="sub-title">EV Charging Infrastructure</h3>
      <table class="spec-table">
        <tr><td>Charger Type</td><td>${systemConfig.evChargerType ?? 'AC Type 2'}</td></tr>
        <tr><td>Max Power / Charger</td><td>${systemConfig.evChargerMaxKw ?? 22} kW</td></tr>
        <tr><td>Number of Points</td><td>${systemConfig.evChargerCount ?? 2}</td></tr>
        <tr><td>Total Charging Capacity</td><td>${((systemConfig.evChargerMaxKw ?? 22) * (systemConfig.evChargerCount ?? 2)).toFixed(0)} kW</td></tr>
        <tr><td>V2G Capable</td><td>Optional</td></tr>
      </table>
    </div>
  </div>

  <h3 class="sub-title">Capital Expenditure Breakdown</h3>
  <table class="spec-table">
    <thead><tr><th>Component</th><th>Estimated Cost (KES)</th></tr></thead>
    <tbody>
      ${capexItems.map(item => `<tr><td>${item.label}</td><td>${fmtKes(Math.round(item.value))}</td></tr>`).join('')}
      <tr style="background:#f0fdf4;"><td><strong>Total CAPEX</strong></td><td><strong>${fmtKes(Math.round(financialData.capexKes))}</strong></td></tr>
    </tbody>
  </table>
</div>

<!-- ═══════════════════════════════════════════════════════════
     PAGE 4 — ENERGY SIMULATION RESULTS
     ═══════════════════════════════════════════════════════════ -->
<div class="page page-break">
  <h2 class="section-title">Energy Simulation Results</h2>
  <p style="color:#4a6658;line-height:1.7;margin-bottom:16px;">
    The following charts show real-time simulation data captured during the session.
    ${simulationPoints.length < 60
      ? 'Note: limited simulation data &mdash; run the simulation longer for more detailed charts.'
      : `Data covers ${(simulationPoints.length / 60).toFixed(1)} simulated hours.`}
  </p>

  <div class="two-col">
    <div class="chart-box">${solarChartSVG}</div>
    <div class="chart-box">${socChartSVG}</div>
  </div>
  <div class="two-col">
    <div class="chart-box">${loadChartSVG}</div>
    <div class="chart-box">${gridChartSVG}</div>
  </div>

  <h3 class="sub-title">Energy Mix Distribution</h3>
  <div class="two-col" style="align-items:center;">
    <div class="chart-box" style="text-align:center;">${energyDonut}</div>
    <table class="spec-table">
      <thead><tr><th>Energy Flow</th><th>kWh (session)</th></tr></thead>
      <tbody>
        <tr><td>&#x2600;&#xFE0F; Solar Generated</td><td>${fmt(totalSolarKWh, 2)} kWh</td></tr>
        <tr><td>&#x2B06;&#xFE0F; Grid Import</td><td>${fmt(totalGridImportKWh, 2)} kWh</td></tr>
        <tr><td>&#x2B07;&#xFE0F; Grid Export</td><td>${fmt(totalGridExportKWh, 2)} kWh</td></tr>
        <tr><td>&#x1F697; EV Charging</td><td>${fmt(totalEvKWh, 2)} kWh</td></tr>
        <tr><td>&#x1F4B0; Savings</td><td>${fmtKes(Math.round(totalSavingsKES))}</td></tr>
      </tbody>
    </table>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     PAGE 5 — FINANCIAL ANALYSIS
     ═══════════════════════════════════════════════════════════ -->
<div class="page page-break">
  <h2 class="section-title">Financial Analysis</h2>

  <div class="fin-grid">
    <div class="fin-card">
      <div class="fin-card-label">Monthly Revenue</div>
      <div class="fin-card-value">${fmtKes(Math.round(financialData.revenueMonthly))}</div>
      <div class="fin-card-sub">From EV charging @ KES ${financialData.chargingTariffKes}/kWh</div>
    </div>
    <div class="fin-card">
      <div class="fin-card-label">Monthly Net Profit</div>
      <div class="fin-card-value">${fmtKes(Math.round(financialData.netMonthly))}</div>
      <div class="fin-card-sub">After OPEX and debt service</div>
    </div>
    <div class="fin-card">
      <div class="fin-card-label">Payback Period</div>
      <div class="fin-card-value">${financialData.paybackYears.toFixed(1)} years</div>
      <div class="fin-card-sub">Simple payback on total CAPEX</div>
    </div>
    <div class="fin-card">
      <div class="fin-card-label">IRR (20yr)</div>
      <div class="fin-card-value">${financialData.irrPct.toFixed(1)}%</div>
      <div class="fin-card-sub">Internal rate of return</div>
    </div>
    <div class="fin-card">
      <div class="fin-card-label">NPV (20yr)</div>
      <div class="fin-card-value">${fmtKes(Math.round(financialData.npvKes))}</div>
      <div class="fin-card-sub">At 10% discount rate</div>
    </div>
    <div class="fin-card">
      <div class="fin-card-label">LCOE</div>
      <div class="fin-card-value">${fmtKes(financialData.lcoeKesPerKwh)}/kWh</div>
      <div class="fin-card-sub">Levelised cost of energy</div>
    </div>
  </div>

  <div class="chart-full">${financialSVG}</div>
  <div class="chart-full">${monthlyRevBars}</div>

  <div class="info-box ${financialData.irrPct > 15 ? 'green' : financialData.irrPct > 8 ? 'amber' : 'blue'}">
    <strong>Financial Assessment:</strong>
    ${financialData.irrPct > 20
      ? `Excellent investment. The ${financialData.irrPct.toFixed(1)}% IRR significantly exceeds the cost of capital and risk-free benchmarks for East Africa. The project is strongly viable and suitable for debt financing.`
      : financialData.irrPct > 12
      ? `Good investment. The ${financialData.irrPct.toFixed(1)}% IRR is above typical equity return hurdles for renewable energy in Kenya. Consider optimising tariff rates or utilisation to further improve returns.`
      : `Moderate returns. Review tariff strategy, station utilisation, and financing structure to improve IRR above the 15% threshold recommended for infrastructure projects in Kenya.`}
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════
     PAGE 6 — RECOMMENDATIONS & CONCLUSION
     ═══════════════════════════════════════════════════════════ -->
<div class="page page-break">
  <h2 class="section-title">Recommendations &amp; Conclusion</h2>

  <h3 class="sub-title">System Optimisation Recommendations</h3>
  <table class="spec-table">
    <thead><tr><th>Area</th><th>Recommendation</th><th>Expected Impact</th></tr></thead>
    <tbody>
      <tr><td>Tariff Strategy</td><td>Dynamic peak/off-peak pricing; target KES ${Math.round(financialData.chargingTariffKes * 1.1)}/kWh peak</td><td>+8&ndash;12% revenue</td></tr>
      <tr><td>Utilisation</td><td>Target 70%+ station utilisation via fleet/ride-hailing partnerships</td><td>+15&ndash;25% revenue</td></tr>
      <tr><td>Battery Management</td><td>Charge batteries 22:00&ndash;06:00 on off-peak KPLC tariff; discharge during peak solar</td><td>&ndash;20% grid cost</td></tr>
      <tr><td>V2G Integration</td><td>Enable V2G for fleet vehicles parked overnight to earn grid ancillary revenue</td><td>+KES 5,000&ndash;15,000/mo</td></tr>
      <tr><td>Solar Expansion</td><td>Add ${(systemConfig.solarCapacityKW * 0.5).toFixed(0)} kWp additional panels when station hits 80% utilisation</td><td>+30% generation</td></tr>
      <tr><td>Monitoring</td><td>Deploy real-time SOC alerts and predictive maintenance via SafariCharge AI</td><td>&ndash;15% downtime</td></tr>
    </tbody>
  </table>

  <h3 class="sub-title">Regulatory Notes (Kenya)</h3>
  <div class="info-box blue">
    <strong>EPRA / ERC Compliance:</strong> EV charging stations in Kenya require an Energy Service Provider licence from ERC.
    Net-metering under KPLC's 2024 regulations allows export at avoided-cost tariff (currently ~KES 8/kWh).
    NEMA environmental impact assessment required for installations above 20 kWp.
    Kenya Finance Act 2023 provides 0% import duty on solar panels and batteries &mdash; confirm current status with KRA.
  </div>

  <h3 class="sub-title">Conclusion</h3>
  <p style="color:#374151;line-height:1.8;margin-top:8px;">
    The SafariCharge ${systemConfig.solarCapacityKW} kWp solar + ${systemConfig.batteryCapacityKWh} kWh battery + ${systemConfig.evChargerCount ?? 2}-point EV charging system
    in ${locationName} demonstrates <strong>strong technical and financial viability</strong>. With a projected payback of
    ${financialData.paybackYears.toFixed(1)} years and IRR of ${financialData.irrPct.toFixed(1)}%, this installation represents a compelling
    clean-energy business case for the East African market. Continued monitoring via the SafariCharge platform will
    enable real-time performance optimisation and early fault detection.
  </p>

  <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:11px;color:#9ca3af;">
    <span>SafariCharge Energy Intelligence Platform</span>
    <span>Report generated: ${generatedAt}</span>
    <span>&copy; 2026 SafariCharge</span>
  </div>
</div>

</body>
</html>`;
}

export function openReportWindow(html: string): void {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Please allow pop-ups to view the report.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 800);
}
