import { NextRequest, NextResponse } from 'next/server';

interface MinuteData {
  date: string;
  year: number;
  month: number;
  week: number;
  hour: number;
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
}

interface DailyAgg {
  date: string;
  solar: number;
  gridImport: number;
  gridExport: number;
  savings: number;
  homeLoad: number;
  evLoad: number;
}

function aggregateDaily(data: MinuteData[]): DailyAgg[] {
  const map = new Map<string, DailyAgg>();
  for (const d of data) {
    if (!map.has(d.date)) {
      map.set(d.date, { date: d.date, solar: 0, gridImport: 0, gridExport: 0, savings: 0, homeLoad: 0, evLoad: 0 });
    }
    const row = map.get(d.date)!;
    row.solar += d.solarEnergyKWh ?? 0;
    row.gridImport += d.gridImportKWh ?? 0;
    row.gridExport += d.gridExportKWh ?? 0;
    row.savings += d.savingsKES ?? 0;
    row.homeLoad += (d.homeLoadKW ?? 0) / 12;   // 5-min intervals → /12 per hour
    row.evLoad += ((d.ev1LoadKW ?? 0) + (d.ev2LoadKW ?? 0)) / 12;
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** Build an inline SVG bar chart of daily solar vs grid-import */
function buildBarChartSVG(days: DailyAgg[], maxDays = 30): string {
  const show = days.slice(-maxDays);
  const W = 700, H = 200;
  const PAD = { top: 20, right: 20, bottom: 50, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...show.map(d => Math.max(d.solar, d.gridImport, 0.1)), 0.1);
  const barW = Math.floor(chartW / show.length / 2) - 2;

  let bars = '';
  let labels = '';
  show.forEach((d, i) => {
    const x = PAD.left + i * (chartW / show.length);
    const solarH = Math.round((d.solar / maxVal) * chartH);
    const importH = Math.round((d.gridImport / maxVal) * chartH);

    bars += `<rect x="${x}" y="${PAD.top + chartH - solarH}" width="${barW}" height="${solarH}" fill="#22c55e" rx="2"/>`;
    bars += `<rect x="${x + barW + 2}" y="${PAD.top + chartH - importH}" width="${barW}" height="${importH}" fill="#f97316" rx="2" opacity="0.85"/>`;

    if (show.length <= 14 || i % Math.ceil(show.length / 7) === 0) {
      const lbl = d.date.slice(5); // MM-DD
      labels += `<text x="${x + barW}" y="${PAD.top + chartH + 18}" text-anchor="middle" font-size="9" fill="#64748b">${lbl}</text>`;
    }
  });

  // Y-axis labels
  let yAxis = '';
  for (let step = 0; step <= 4; step++) {
    const val = (maxVal * step / 4).toFixed(1);
    const y = PAD.top + chartH - (chartH * step / 4);
    yAxis += `<text x="${PAD.left - 6}" y="${y + 4}" text-anchor="end" font-size="9" fill="#94a3b8">${val}</text>`;
    yAxis += `<line x1="${PAD.left}" y1="${y}" x2="${PAD.left + chartW}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#f8fafc" rx="8"/>
  ${yAxis}${bars}${labels}
  <text x="${PAD.left - 4}" y="${PAD.top - 6}" font-size="9" fill="#94a3b8" transform="rotate(-90,${PAD.left - 30},${PAD.top + chartH / 2})">kWh</text>
  <!-- Legend -->
  <rect x="${W - 160}" y="8" width="10" height="10" fill="#22c55e" rx="2"/>
  <text x="${W - 146}" y="17" font-size="9" fill="#334155">Solar Generated</text>
  <rect x="${W - 80}" y="8" width="10" height="10" fill="#f97316" rx="2" opacity="0.85"/>
  <text x="${W - 66}" y="17" font-size="9" fill="#334155">Grid Import</text>
</svg>`;
}

/** Build a simple inline SVG pie-style donut showing self-sufficiency */
function buildDonutSVG(solarKWh: number, gridImportKWh: number): string {
  const total = solarKWh + gridImportKWh;
  if (total === 0) return '<svg width="120" height="120"/>';
  const solarFrac = solarKWh / total;
  const R = 45, cx = 60, cy = 60;
  const tau = 2 * Math.PI;
  const solarAngle = solarFrac * tau;
  const x1 = cx + R * Math.sin(0), y1 = cy - R * Math.cos(0);
  const x2 = cx + R * Math.sin(solarAngle), y2 = cy - R * Math.cos(solarAngle);
  const large = solarAngle > Math.PI ? 1 : 0;
  const arcSolar = `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
  const arcGrid = `M ${cx} ${cy} L ${x2} ${y2} A ${R} ${R} 0 ${1 - large} 1 ${x1} ${y1} Z`;
  const pct = (solarFrac * 100).toFixed(0);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <path d="${arcSolar}" fill="#22c55e"/>
  <path d="${arcGrid}" fill="#f97316" opacity="0.85"/>
  <circle cx="${cx}" cy="${cy}" r="28" fill="white"/>
  <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="14" font-weight="bold" fill="#166534">${pct}%</text>
  <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="8" fill="#64748b">Solar</text>
</svg>`;
}

/** SafariCharge logo path as inline SVG */
const LOGO_SVG = `<svg viewBox="0 0 100 100" width="48" height="48" xmlns="http://www.w3.org/2000/svg" fill="#0ea5e9">
  <path d="M50 0 L90 40 L75 40 L50 15 L25 40 L10 40 Z"/>
  <path d="M10 50 L35 75 L50 90 L65 75 L90 50 L75 50 L50 75 L25 50 Z"/>
</svg>`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { minuteData, startDate, reportDate } = body as {
      minuteData: MinuteData[];
      startDate: string;
      reportDate: string;
    };

    if (!minuteData || minuteData.length === 0) {
      return NextResponse.json({ error: 'No simulation data available.' }, { status: 400 });
    }

    // --- Aggregate ---
    const totalSolar = minuteData.reduce((s, d) => s + (d.solarEnergyKWh ?? 0), 0);
    const totalGridImport = minuteData.reduce((s, d) => s + (d.gridImportKWh ?? 0), 0);
    const totalGridExport = minuteData.reduce((s, d) => s + (d.gridExportKWh ?? 0), 0);
    const totalSavings = minuteData.reduce((s, d) => s + (d.savingsKES ?? 0), 0);
    const totalHomeLoad = minuteData.reduce((s, d) => s + (d.homeLoadKW ?? 0) / 12, 0);
    const totalEV1 = minuteData.reduce((s, d) => s + (d.ev1LoadKW ?? 0) / 12, 0);
    const totalEV2 = minuteData.reduce((s, d) => s + (d.ev2LoadKW ?? 0) / 12, 0);
    const totalLoad = totalHomeLoad + totalEV1 + totalEV2;
    const selfSufficiency = totalLoad > 0 ? (Math.min(totalSolar, totalLoad) / totalLoad) * 100 : 0;
    const co2Avoided = totalSolar * 0.47;
    const uniqueDays = new Set(minuteData.map(d => d.date)).size;
    const avgDailySolar = uniqueDays > 0 ? totalSolar / uniqueDays : 0;
    const avgDailySavings = uniqueDays > 0 ? totalSavings / uniqueDays : 0;
    const peakGridImport = Math.max(...minuteData.map(d => d.gridImportKW ?? 0), 0);
    const avgBattery = minuteData.reduce((s, d) => s + (d.batteryLevelPct ?? 0), 0) / minuteData.length;

    // --- Charts ---
    const dailyAgg = aggregateDaily(minuteData);
    const barChart = buildBarChartSVG(dailyAgg);
    const donut = buildDonutSVG(totalSolar, totalGridImport);

    // --- Date range ---
    const dateFrom = minuteData[0]?.date ?? startDate;
    const dateTo = minuteData[minuteData.length - 1]?.date ?? startDate;
    const now = new Date();
    const reportRefId = `SCL-EPR-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // --- HTML ---
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SafariCharge Ltd — Energy Performance Report</title>
<style>
  @page { size: A4; margin: 2cm 2.5cm; }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1e293b;font-size:11pt;line-height:1.5;background:#fff;}
  /* Letterhead */
  .letterhead{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0ea5e9;padding-bottom:12px;margin-bottom:20px;}
  .brand{display:flex;align-items:center;gap:12px;}
  .brand h1{font-size:22pt;font-weight:900;letter-spacing:0.04em;color:#0ea5e9;line-height:1;}
  .brand h1 span{color:#1e293b;}
  .brand p{font-size:7pt;letter-spacing:0.18em;color:#94a3b8;font-weight:700;text-transform:uppercase;}
  .report-meta{text-align:right;font-size:9pt;color:#475569;}
  .report-meta strong{display:block;font-size:10pt;color:#1e293b;}
  /* Title bar */
  .title-bar{background:linear-gradient(135deg,#0f172a,#1e3a5f);color:white;padding:16px 20px;border-radius:8px;margin-bottom:20px;}
  .title-bar h2{font-size:17pt;font-weight:700;letter-spacing:0.03em;}
  .title-bar p{font-size:9pt;opacity:0.75;margin-top:4px;}
  /* Metric cards */
  .metrics-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px;}
  .metric-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;text-align:center;}
  .metric-card .val{font-size:16pt;font-weight:900;line-height:1.1;}
  .metric-card .lbl{font-size:7.5pt;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-top:3px;}
  .c-green .val{color:#16a34a;}
  .c-blue .val{color:#0284c7;}
  .c-orange .val{color:#ea580c;}
  .c-purple .val{color:#7c3aed;}
  /* Section */
  .section{margin-bottom:20px;}
  .section-title{font-size:12pt;font-weight:800;color:#0f172a;border-bottom:2px solid #e2e8f0;padding-bottom:6px;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
  .section-title .dot{width:12px;height:12px;border-radius:50%;display:inline-block;}
  /* Table */
  table{width:100%;border-collapse:collapse;font-size:9.5pt;}
  th{background:#f1f5f9;color:#475569;font-weight:700;text-transform:uppercase;font-size:8pt;letter-spacing:0.04em;padding:7px 10px;text-align:left;}
  td{padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#334155;}
  tr:last-child td{border-bottom:none;}
  td.num{text-align:right;font-weight:600;font-variant-numeric:tabular-nums;}
  /* Chart wrap */
  .chart-wrap{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:14px;}
  .chart-row{display:flex;align-items:center;gap:20px;}
  .chart-note{font-size:8pt;color:#94a3b8;margin-top:6px;}
  /* Eco row */
  .eco-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
  .eco-card{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;text-align:center;}
  .eco-card .val{font-size:15pt;font-weight:900;color:#15803d;}
  .eco-card .lbl{font-size:7.5pt;color:#166534;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-top:3px;}
  /* Spec table */
  .spec-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:8px;}
  .spec-card h4{font-size:10pt;font-weight:700;color:#0f172a;margin-bottom:8px;}
  .spec-row{display:flex;justify-content:space-between;font-size:9pt;padding:3px 0;border-bottom:1px solid #e2e8f0;}
  .spec-row:last-child{border-bottom:none;}
  .spec-row .k{color:#64748b;}
  .spec-row .v{font-weight:700;color:#1e293b;}
  /* Footer */
  .footer{margin-top:24px;border-top:1px solid #e2e8f0;padding-top:10px;display:flex;justify-content:space-between;font-size:8pt;color:#94a3b8;}
  /* Print tweaks */
  @media print{
    .no-print{display:none;}
    body{font-size:10pt;}
    .letterhead{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .title-bar{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
    .metrics-grid{page-break-inside:avoid;}
    .section{page-break-inside:avoid;}
  }
  /* Print button */
  .print-btn{position:fixed;bottom:20px;right:20px;background:#0ea5e9;color:white;border:none;border-radius:8px;padding:10px 18px;font-size:11pt;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(14,165,233,0.4);z-index:999;}
</style>
</head>
<body>

<button class="print-btn no-print" onclick="window.print()">🖨 Print / Save PDF</button>

<!-- Letterhead -->
<div class="letterhead">
  <div class="brand">
    ${LOGO_SVG}
    <div>
      <h1>SAFARI<span>CHARGE</span></h1>
      <p>Limited · Nairobi, Kenya</p>
    </div>
  </div>
  <div class="report-meta">
    <strong>ENERGY PERFORMANCE REPORT</strong>
    <span>Prepared: ${reportDate}</span><br/>
    <span>Ref: ${reportRefId}</span>
  </div>
</div>

<!-- Title -->
<div class="title-bar">
  <h2>📊 Solar Energy Performance Report</h2>
  <p>Simulation Period: ${dateFrom} — ${dateTo} &nbsp;|&nbsp; ${uniqueDays} day${uniqueDays !== 1 ? 's' : ''} of data &nbsp;|&nbsp; System Start: ${startDate}</p>
</div>

<!-- KPI Cards -->
<div class="metrics-grid">
  <div class="metric-card c-green">
    <div class="val">${totalSolar.toFixed(1)}</div>
    <div class="lbl">kWh Solar Generated</div>
  </div>
  <div class="metric-card c-blue">
    <div class="val">KES ${(totalSavings / 1000).toFixed(1)}k</div>
    <div class="lbl">Total Savings</div>
  </div>
  <div class="metric-card c-orange">
    <div class="val">${selfSufficiency.toFixed(0)}%</div>
    <div class="lbl">Self-Sufficiency</div>
  </div>
  <div class="metric-card c-purple">
    <div class="val">${co2Avoided.toFixed(1)}</div>
    <div class="lbl">kg CO₂ Avoided</div>
  </div>
</div>

<!-- Section 1: Energy Performance -->
<div class="section">
  <div class="section-title"><span class="dot" style="background:#22c55e"></span>1 · Energy Performance Overview</div>
  <div class="chart-wrap">
    <div class="chart-row">
      <div style="flex:1;">${barChart}</div>
      <div style="text-align:center;">${donut}<p style="font-size:8pt;color:#64748b;margin-top:4px;">Solar Share</p></div>
    </div>
    <p class="chart-note">■ Green = Solar Generation (kWh) &nbsp; ■ Orange = Grid Import (kWh) &nbsp; Last ${Math.min(dailyAgg.length, 30)} days shown</p>
  </div>
  <table>
    <thead><tr><th>Metric</th><th class="num">Value</th><th class="num">Unit</th></tr></thead>
    <tbody>
      <tr><td>Total Solar Generation</td><td class="num">${totalSolar.toFixed(2)}</td><td class="num">kWh</td></tr>
      <tr><td>Total Grid Import</td><td class="num">${totalGridImport.toFixed(2)}</td><td class="num">kWh</td></tr>
      <tr><td>Total Grid Export (Feed-in)</td><td class="num">${totalGridExport.toFixed(2)}</td><td class="num">kWh</td></tr>
      <tr><td>Total Load (Home + EV)</td><td class="num">${totalLoad.toFixed(2)}</td><td class="num">kWh</td></tr>
      <tr><td>Average Daily Solar</td><td class="num">${avgDailySolar.toFixed(2)}</td><td class="num">kWh/day</td></tr>
      <tr><td>Peak Grid Import</td><td class="num">${peakGridImport.toFixed(2)}</td><td class="num">kW</td></tr>
      <tr><td>Average Battery Level</td><td class="num">${avgBattery.toFixed(1)}</td><td class="num">%</td></tr>
    </tbody>
  </table>
</div>

<!-- Section 2: Financial Analysis -->
<div class="section">
  <div class="section-title"><span class="dot" style="background:#0ea5e9"></span>2 · Financial Analysis</div>
  <table>
    <thead><tr><th>Financial Metric</th><th class="num">Value</th><th class="num">Unit</th></tr></thead>
    <tbody>
      <tr><td>Total KPLC Bill Savings</td><td class="num">${totalSavings.toFixed(2)}</td><td class="num">KES</td></tr>
      <tr><td>Average Daily Savings</td><td class="num">${avgDailySavings.toFixed(2)}</td><td class="num">KES/day</td></tr>
      <tr><td>Annualised Savings Projection</td><td class="num">${(avgDailySavings * 365).toFixed(0)}</td><td class="num">KES/yr</td></tr>
      <tr><td>Grid Energy Cost Avoided</td><td class="num">${(totalSolar > 0 ? (totalSavings / totalSolar) : 0).toFixed(2)}</td><td class="num">KES/kWh (avg rate)</td></tr>
      <tr><td>KPLC Peak Tariff (incl. VAT)</td><td class="num">24.83</td><td class="num">KES/kWh</td></tr>
      <tr><td>KPLC Off-Peak Tariff (incl. VAT)</td><td class="num">15.09</td><td class="num">KES/kWh</td></tr>
    </tbody>
  </table>
</div>

<!-- Section 3: Environmental Impact -->
<div class="section">
  <div class="section-title"><span class="dot" style="background:#16a34a"></span>3 · Environmental Impact</div>
  <div class="eco-grid">
    <div class="eco-card"><div class="val">${co2Avoided.toFixed(1)}</div><div class="lbl">kg CO₂ Avoided</div></div>
    <div class="eco-card"><div class="val">${(co2Avoided / 21.77).toFixed(1)}</div><div class="lbl">Tree Equivalents</div></div>
    <div class="eco-card"><div class="val">${(co2Avoided / 0.21).toFixed(0)}</div><div class="lbl">km Not Driven</div></div>
  </div>
  <p style="font-size:8pt;color:#64748b;margin-top:10px;">
    Calculated using Kenya national grid emission factor (0.47 kgCO₂/kWh, hydro+thermal mix).
    Tree absorption based on UNFAO estimate of 21.77 kg CO₂/tree/year.
    Vehicle emissions based on average petrol car (0.21 kg CO₂/km).
  </p>
</div>

<!-- Section 4: System Specifications -->
<div class="section">
  <div class="section-title"><span class="dot" style="background:#7c3aed"></span>4 · System Specifications</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
    <div class="spec-card">
      <h4>☀️ PV Array</h4>
      <div class="spec-row"><span class="k">Capacity</span><span class="v">50 kWp</span></div>
      <div class="spec-row"><span class="k">Technology</span><span class="v">Monocrystalline</span></div>
      <div class="spec-row"><span class="k">Inverters</span><span class="v">3 × 16 kW</span></div>
      <div class="spec-row"><span class="k">Location</span><span class="v">Nairobi (1.29°S)</span></div>
    </div>
    <div class="spec-card">
      <h4>🔋 Battery Storage</h4>
      <div class="spec-row"><span class="k">Capacity</span><span class="v">60 kWh</span></div>
      <div class="spec-row"><span class="k">Chemistry</span><span class="v">LiFePO4</span></div>
      <div class="spec-row"><span class="k">Max Charge</span><span class="v">30 kW</span></div>
      <div class="spec-row"><span class="k">Max Discharge</span><span class="v">40 kW</span></div>
    </div>
    <div class="spec-card">
      <h4>🚗 EV Charging</h4>
      <div class="spec-row"><span class="k">EV 1 (Commuter)</span><span class="v">80 kWh · 7 kW</span></div>
      <div class="spec-row"><span class="k">EV 2 (Uber)</span><span class="v">118 kWh · 22 kW</span></div>
      <div class="spec-row"><span class="k">V2G/V2B</span><span class="v">Supported</span></div>
      <div class="spec-row"><span class="k">Standard</span><span class="v">IEC 62196 Type 2</span></div>
    </div>
  </div>
</div>

<!-- Section 5: Simulation Notes -->
<div class="section">
  <div class="section-title"><span class="dot" style="background:#f59e0b"></span>5 · Simulation Methodology</div>
  <p style="font-size:9pt;color:#475569;line-height:1.6;">
    This report is generated from a physics-based energy simulation using Nairobi-specific solar irradiance modelling
    (Gaussian irradiance curve with seasonal peak hour shift, panel temperature coefficient −0.5%/°C above 25°C, 
    soiling/dust accumulation with rain reset), realistic load profiles, KPLC Commercial E-Mobility tariff structure
    (February 2026 rates), and Markov-chain weather transitions.
    Battery degradation is modelled with LiFePO4 lifetime of ~4,000 cycles to 70% health.
    EV charging uses CC/CV taper above 80% SoC. All values are simulated estimates and should be validated with real metering data.
  </p>
</div>

<!-- Footer -->
<div class="footer">
  <div>
    <strong>SafariCharge Ltd</strong> · Nairobi, Kenya &nbsp;|&nbsp; www.safaricharge.co.ke<br/>
    Confidential — Prepared for internal use and presentations
  </div>
  <div style="text-align:right;">
    Report Date: ${reportDate}<br/>
    Generated by SafariCharge Dashboard v2
  </div>
</div>

</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Formal report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
