import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  buildCorsHeaders,
  enforceBodySize,
  jsonResponse,
} from '@/lib/security';

const FORMAL_REPORT_MAX_BYTES = 8 * 1024 * 1024;

// Input validation schema
const reportRequestSchema = z.object({
  preAggregated: z.boolean(),
  startDate: z.string(),
  reportDate: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
  totalDataPoints: z.number(),
  totalSolar: z.number(),
  totalGridImport: z.number(),
  totalGridExport: z.number(),
  totalSavings: z.number(),
  totalHomeLoad: z.number(),
  totalEV1: z.number(),
  totalEV2: z.number(),
  peakSolar: z.number(),
  peakGridImport: z.number(),
  avgBattery: z.number(),
  peakInstantSolar: z.number(),
  peakEVLoad: z.number(),
  uniqueDays: z.number(),
  dailyAgg: z.array(z.object({
    date: z.string(),
    solar: z.number(),
    gridImport: z.number(),
    gridExport: z.number(),
    savings: z.number(),
    homeLoad: z.number(),
    evLoad: z.number(),
    ev1Load: z.number(),
    ev2Load: z.number(),
    avgBattery: z.number(),
  })),
});

type ReportRequest = z.infer<typeof reportRequestSchema>;

// Safe number formatting
function fmt(value: number, decimals: number = 2): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num.toFixed(decimals);
}

function fmtNum(value: number): string {
  if (!Number.isFinite(value)) return '0';
  try {
    return value.toLocaleString();
  } catch {
    return String(value);
  }
}

// Generate SVG chart for daily solar vs grid import
function generateSolarVsGridChart(dailyData: ReportRequest['dailyAgg']): string {
  const data = dailyData.slice(-30); // Last 30 days
  if (data.length === 0) {
    return '<div style="padding:40px;text-align:center;color:#64748b;">No data available</div>';
  }

  const width = 700;
  const height = 220;
  const padding = { top: 24, right: 24, bottom: 54, left: 54 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(
    ...data.map(d => Math.max(d.solar, d.gridImport)),
    0.1
  );

  const slotWidth = chartWidth / Math.max(data.length, 1);
  const barWidth = Math.max(Math.floor(slotWidth / 2) - 2, 2);

  let bars = '';
  let labels = '';

  data.forEach((day, index) => {
    const x = padding.left + index * slotWidth;
    const solarHeight = (day.solar / maxValue) * chartHeight;
    const gridHeight = (day.gridImport / maxValue) * chartHeight;

    // Solar bar (green)
    bars += `<rect x="${x}" y="${padding.top + chartHeight - solarHeight}" width="${barWidth}" height="${solarHeight}" fill="#22c55e" rx="2"/>`;

    // Grid import bar (orange)
    bars += `<rect x="${x + barWidth + 2}" y="${padding.top + chartHeight - gridHeight}" width="${barWidth}" height="${gridHeight}" fill="#f97316" rx="2" opacity="0.85"/>`;

    // Date labels (show subset to avoid crowding)
    if (data.length <= 14 || index % Math.ceil(data.length / 7) === 0) {
      const dateLabel = day.date.length >= 5 ? day.date.slice(5) : day.date;
      labels += `<text x="${x + barWidth}" y="${padding.top + chartHeight + 18}" text-anchor="middle" font-size="9" fill="#64748b">${dateLabel}</text>`;
    }
  });

  // Y-axis
  let yAxis = '';
  for (let i = 0; i <= 4; i++) {
    const value = (maxValue * i / 4).toFixed(1);
    const y = padding.top + chartHeight - (chartHeight * i / 4);
    yAxis += `<text x="${padding.left - 6}" y="${y + 4}" text-anchor="end" font-size="9" fill="#94a3b8">${value}</text>`;
    yAxis += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
  }

  // Axes
  yAxis += `<line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#cbd5e1" stroke-width="1"/>`;
  yAxis += `<line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}" stroke="#cbd5e1" stroke-width="1"/>`;

  // Legend
  const legend = `
    <rect x="${width - 180}" y="6" width="10" height="10" fill="#22c55e" rx="2"/>
    <text x="${width - 166}" y="15" font-size="9" fill="#334155">Solar Generated</text>
    <rect x="${width - 90}" y="6" width="10" height="10" fill="#f97316" rx="2" opacity="0.85"/>
    <text x="${width - 76}" y="15" font-size="9" fill="#334155">Grid Import</text>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#f8fafc" rx="8"/>
    ${yAxis}${bars}${labels}
    <text x="${padding.left - 4}" y="${padding.top - 8}" font-size="9" fill="#94a3b8">kWh</text>
    ${legend}
  </svg>`;
}

// Generate SVG chart for daily savings trend
function generateSavingsChart(dailyData: ReportRequest['dailyAgg']): string {
  const data = dailyData.slice(-30); // Last 30 days
  if (data.length === 0) {
    return '<div style="padding:40px;text-align:center;color:#64748b;">No data available</div>';
  }

  const width = 700;
  const height = 180;
  const padding = { top: 20, right: 24, bottom: 50, left: 70 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.savings), 0.1);

  // Build path for line chart
  const points = data.map((day, index) => {
    const x = padding.left + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - (day.savings / maxValue) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const pathData = data.length > 1
    ? `M ${points.split(' ').join(' L ')}`
    : `M ${padding.left},${padding.top + chartHeight / 2} L ${padding.left + chartWidth},${padding.top + chartHeight / 2}`;

  // Y-axis labels
  let yAxis = '';
  for (let i = 0; i <= 4; i++) {
    const value = (maxValue * i / 4).toFixed(0);
    const y = padding.top + chartHeight - (chartHeight * i / 4);
    yAxis += `<text x="${padding.left - 6}" y="${y + 4}" text-anchor="end" font-size="9" fill="#94a3b8">${value}</text>`;
    yAxis += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3"/>`;
  }

  // X-axis labels
  let xLabels = '';
  data.forEach((day, index) => {
    if (data.length <= 14 || index % Math.ceil(data.length / 7) === 0) {
      const x = padding.left + (index / Math.max(data.length - 1, 1)) * chartWidth;
      const dateLabel = day.date.length >= 5 ? day.date.slice(5) : day.date;
      xLabels += `<text x="${x}" y="${padding.top + chartHeight + 18}" text-anchor="middle" font-size="9" fill="#64748b">${dateLabel}</text>`;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#f8fafc" rx="8"/>
    ${yAxis}
    <path d="${pathData}" stroke="#10b981" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    ${xLabels}
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#cbd5e1" stroke-width="1"/>
    <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}" stroke="#cbd5e1" stroke-width="1"/>
    <text x="${padding.left - 4}" y="${padding.top - 6}" font-size="9" fill="#94a3b8">KES</text>
  </svg>`;
}

// Generate SVG chart for battery levels
function generateBatteryChart(dailyData: ReportRequest['dailyAgg']): string {
  const data = dailyData.slice(-30); // Last 30 days
  if (data.length === 0) {
    return '<div style="padding:40px;text-align:center;color:#64748b;">No data available</div>';
  }

  const width = 700;
  const height = 180;
  const padding = { top: 20, right: 24, bottom: 50, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Build path for line chart
  const points = data.map((day, index) => {
    const x = padding.left + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - (day.avgBattery / 100) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const pathData = data.length > 1
    ? `M ${points.split(' ').join(' L ')}`
    : `M ${padding.left},${padding.top + chartHeight / 2} L ${padding.left + chartWidth},${padding.top + chartHeight / 2}`;

  // Y-axis (0-100%)
  let yAxis = '';
  for (let i = 0; i <= 4; i++) {
    const value = (25 * i);
    const y = padding.top + chartHeight - (chartHeight * i / 4);
    yAxis += `<text x="${padding.left - 6}" y="${y + 4}" text-anchor="end" font-size="9" fill="#94a3b8">${value}%</text>`;
    yAxis += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartWidth}" y2="${y}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3"/>`;
  }

  // X-axis labels
  let xLabels = '';
  data.forEach((day, index) => {
    if (data.length <= 14 || index % Math.ceil(data.length / 7) === 0) {
      const x = padding.left + (index / Math.max(data.length - 1, 1)) * chartWidth;
      const dateLabel = day.date.length >= 5 ? day.date.slice(5) : day.date;
      xLabels += `<text x="${x}" y="${padding.top + chartHeight + 18}" text-anchor="middle" font-size="9" fill="#64748b">${dateLabel}</text>`;
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#f8fafc" rx="8"/>
    ${yAxis}
    <path d="${pathData}" stroke="#3b82f6" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    ${xLabels}
    <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartHeight}" stroke="#cbd5e1" stroke-width="1"/>
    <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${padding.left + chartWidth}" y2="${padding.top + chartHeight}" stroke="#cbd5e1" stroke-width="1"/>
  </svg>`;
}

// Generate the complete HTML report
function generateReportHTML(data: ReportRequest): string {
  const totalLoad = data.totalHomeLoad + data.totalEV1 + data.totalEV2;
  const selfSufficiency = totalLoad > 0 ? (data.totalSolar / totalLoad * 100) : 0;
  const gridDependency = totalLoad > 0 ? (data.totalGridImport / totalLoad * 100) : 0;
  const solarSelfConsumption = data.totalSolar > 0 ? ((data.totalSolar - data.totalGridExport) / data.totalSolar * 100) : 0;

  const avgDailySavings = data.uniqueDays > 0 ? data.totalSavings / data.uniqueDays : 0;
  const annualSavings = avgDailySavings * 365;

  // Financial calculations (assuming CapEx of 2.5M KES)
  const capex = 2500000;
  const paybackYears = annualSavings > 0 ? capex / annualSavings : 0;
  const roi = capex > 0 ? (annualSavings / capex * 100) : 0;

  // NPV calculation (10 years, 10% discount rate)
  let npv = -capex;
  for (let year = 1; year <= 10; year++) {
    npv += annualSavings / Math.pow(1.1, year);
  }

  // Environmental impact
  const co2Avoided = data.totalSolar * 0.47; // 0.47 kg CO2 per kWh
  const treeEquivalent = co2Avoided / 21.77;
  const kmNotDriven = co2Avoided / 0.21;

  const reportRef = `SC-${Date.now().toString(36).toUpperCase()}`;

  const solarVsGridSVG = generateSolarVsGridChart(data.dailyAgg);
  const savingsSVG = generateSavingsChart(data.dailyAgg);
  const batterySVG = generateBatteryChart(data.dailyAgg);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SafariCharge Energy Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      color: #1e293b;
      line-height: 1.5;
    }

    .report-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    .header {
      text-align: center;
      border-bottom: 3px solid #0ea5e9;
      padding-bottom: 30px;
      margin-bottom: 40px;
    }

    .header h1 {
      font-size: 32px;
      color: #0c4a6e;
      margin-bottom: 10px;
    }

    .header .subtitle {
      font-size: 16px;
      color: #64748b;
      margin-top: 8px;
    }

    .report-info {
      display: flex;
      justify-content: space-between;
      background: #f1f5f9;
      padding: 16px 20px;
      border-radius: 8px;
      margin-bottom: 32px;
      font-size: 13px;
    }

    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 20px;
      color: #0c4a6e;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .section-number {
      background: #0ea5e9;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
    }

    .metric-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #0c4a6e;
    }

    .metric-unit {
      font-size: 14px;
      color: #94a3b8;
      font-weight: normal;
    }

    .chart-container {
      margin: 24px 0;
      text-align: center;
    }

    .chart-title {
      font-size: 14px;
      color: #475569;
      margin-bottom: 16px;
      font-weight: 600;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 12px;
    }

    thead {
      background: #0ea5e9;
      color: white;
    }

    th, td {
      padding: 10px;
      text-align: left;
      border: 1px solid #e2e8f0;
    }

    th {
      font-weight: 600;
    }

    tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    .num {
      text-align: right;
      font-family: 'Courier New', monospace;
    }

    .footer {
      margin-top: 60px;
      padding-top: 24px;
      border-top: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #64748b;
    }

    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #0ea5e9;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
    }

    .print-button:hover {
      background: #0284c7;
    }

    @media print {
      .print-button { display: none; }
      .report-container { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">Print / Save as PDF</button>

  <div class="report-container">
    <!-- Header -->
    <div class="header">
      <h1>SafariCharge Energy Report</h1>
      <div class="subtitle">Solar + Battery + EV Charging System Performance</div>
      <div class="subtitle" style="margin-top:12px;">Period: ${data.dateFrom} to ${data.dateTo}</div>
    </div>

    <!-- Report Metadata -->
    <div class="report-info">
      <div>
        <strong>Report Date:</strong> ${data.reportDate}<br/>
        <strong>Reference:</strong> ${reportRef}
      </div>
      <div style="text-align:right;">
        <strong>System Start:</strong> ${data.startDate}<br/>
        <strong>Days Tracked:</strong> ${data.uniqueDays}
      </div>
    </div>

    <!-- Executive Summary -->
    <div class="section">
      <div class="section-title">
        <span class="section-number">1</span>
        <span>Executive Summary</span>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total Solar Generated</div>
          <div class="metric-value">${fmt(data.totalSolar, 1)} <span class="metric-unit">kWh</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Total Savings</div>
          <div class="metric-value">${fmt(data.totalSavings, 0)} <span class="metric-unit">KES</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Self-Sufficiency</div>
          <div class="metric-value">${fmt(selfSufficiency, 1)} <span class="metric-unit">%</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Grid Import Avoided</div>
          <div class="metric-value">${fmt(data.totalSolar - data.totalGridExport, 1)} <span class="metric-unit">kWh</span></div>
        </div>
      </div>
    </div>

    <!-- Energy Performance -->
    <div class="section">
      <div class="section-title">
        <span class="section-number">2</span>
        <span>Energy Performance</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Metric</th>
            <th class="num">Value</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total Solar Generated</td>
            <td class="num">${fmt(data.totalSolar, 2)}</td>
            <td>kWh</td>
          </tr>
          <tr>
            <td>Total Home Load</td>
            <td class="num">${fmt(data.totalHomeLoad, 2)}</td>
            <td>kWh</td>
          </tr>
          <tr>
            <td>Total EV #1 Load</td>
            <td class="num">${fmt(data.totalEV1, 2)}</td>
            <td>kWh</td>
          </tr>
          <tr>
            <td>Total EV #2 Load</td>
            <td class="num">${fmt(data.totalEV2, 2)}</td>
            <td>kWh</td>
          </tr>
          <tr>
            <td>Total Combined Load</td>
            <td class="num">${fmt(totalLoad, 2)}</td>
            <td>kWh</td>
          </tr>
          <tr>
            <td>Grid Import</td>
            <td class="num">${fmt(data.totalGridImport, 2)}</td>
            <td>kWh</td>
          </tr>
          <tr>
            <td>Grid Export</td>
            <td class="num">${fmt(data.totalGridExport, 2)}</td>
            <td>kWh</td>
          </tr>
          <tr style="background:#e0f2fe;font-weight:600;">
            <td>Self-Sufficiency Rate</td>
            <td class="num">${fmt(selfSufficiency, 2)}</td>
            <td>%</td>
          </tr>
          <tr>
            <td>Grid Dependency</td>
            <td class="num">${fmt(gridDependency, 2)}</td>
            <td>%</td>
          </tr>
          <tr>
            <td>Solar Self-Consumption</td>
            <td class="num">${fmt(solarSelfConsumption, 2)}</td>
            <td>%</td>
          </tr>
          <tr>
            <td>Average Battery SoC</td>
            <td class="num">${fmt(data.avgBattery, 1)}</td>
            <td>%</td>
          </tr>
          <tr>
            <td>Peak Solar Output</td>
            <td class="num">${fmt(data.peakInstantSolar, 2)}</td>
            <td>kW</td>
          </tr>
          <tr>
            <td>Peak Grid Import</td>
            <td class="num">${fmt(data.peakGridImport, 2)}</td>
            <td>kW</td>
          </tr>
          <tr>
            <td>Peak EV Load</td>
            <td class="num">${fmt(data.peakEVLoad, 2)}</td>
            <td>kW</td>
          </tr>
        </tbody>
      </table>

      <div class="chart-container">
        <div class="chart-title">Daily Solar Generation vs Grid Import (Last 30 Days)</div>
        ${solarVsGridSVG}
      </div>
    </div>

    <!-- Financial Analysis -->
    <div class="section">
      <div class="section-title">
        <span class="section-number">3</span>
        <span>Financial Analysis</span>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total Savings</div>
          <div class="metric-value">${fmt(data.totalSavings, 0)} <span class="metric-unit">KES</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Daily Average</div>
          <div class="metric-value">${fmt(avgDailySavings, 0)} <span class="metric-unit">KES/day</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Annual Projection</div>
          <div class="metric-value">${fmt(annualSavings, 0)} <span class="metric-unit">KES/year</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Payback Period</div>
          <div class="metric-value">${fmt(paybackYears, 1)} <span class="metric-unit">years</span></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Financial Metric</th>
            <th class="num">Value</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total KPLC Savings</td>
            <td class="num">${fmt(data.totalSavings, 2)}</td>
            <td>KES</td>
          </tr>
          <tr>
            <td>Average Daily Savings</td>
            <td class="num">${fmt(avgDailySavings, 2)}</td>
            <td>KES/day</td>
          </tr>
          <tr>
            <td>Annualised Savings</td>
            <td class="num">${fmt(annualSavings, 0)}</td>
            <td>KES/year</td>
          </tr>
          <tr>
            <td>System CapEx (Estimate)</td>
            <td class="num">${fmtNum(capex)}</td>
            <td>KES</td>
          </tr>
          <tr style="background:#e0f2fe;font-weight:600;">
            <td>Simple Payback Period</td>
            <td class="num">${fmt(paybackYears, 2)}</td>
            <td>years</td>
          </tr>
          <tr>
            <td>Return on Investment (ROI)</td>
            <td class="num">${fmt(roi, 2)}</td>
            <td>%</td>
          </tr>
          <tr>
            <td>10-Year NPV (10% discount)</td>
            <td class="num">${fmt(npv, 0)}</td>
            <td>KES</td>
          </tr>
        </tbody>
      </table>

      <div class="chart-container">
        <div class="chart-title">Daily Savings Trend (Last 30 Days)</div>
        ${savingsSVG}
      </div>
    </div>

    <!-- Battery Performance -->
    <div class="section">
      <div class="section-title">
        <span class="section-number">4</span>
        <span>Battery Performance</span>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Average SoC</div>
          <div class="metric-value">${fmt(data.avgBattery, 1)} <span class="metric-unit">%</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Days Tracked</div>
          <div class="metric-value">${data.uniqueDays} <span class="metric-unit">days</span></div>
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-title">Daily Average Battery SoC (Last 30 Days)</div>
        ${batterySVG}
      </div>
    </div>

    <!-- Environmental Impact -->
    <div class="section">
      <div class="section-title">
        <span class="section-number">5</span>
        <span>Environmental Impact</span>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">CO₂ Avoided</div>
          <div class="metric-value">${fmt(co2Avoided, 1)} <span class="metric-unit">kg</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Tree Equivalents</div>
          <div class="metric-value">${fmt(treeEquivalent, 1)} <span class="metric-unit">trees/year</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">km Not Driven</div>
          <div class="metric-value">${fmt(kmNotDriven, 0)} <span class="metric-unit">km</span></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Environmental Metric</th>
            <th class="num">Value</th>
            <th>Unit</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>CO₂ Emissions Avoided</td>
            <td class="num">${fmt(co2Avoided, 3)}</td>
            <td>kg</td>
            <td>Based on 0.47 kgCO₂/kWh grid factor</td>
          </tr>
          <tr>
            <td>Tree Equivalents</td>
            <td class="num">${fmt(treeEquivalent, 2)}</td>
            <td>trees/year</td>
            <td>Based on UNFAO 21.77 kg/tree/year</td>
          </tr>
          <tr>
            <td>Equivalent km Not Driven</td>
            <td class="num">${fmt(kmNotDriven, 0)}</td>
            <td>km</td>
            <td>Based on 0.21 kgCO₂/km petrol vehicle</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Daily Summary Table -->
    <div class="section">
      <div class="section-title">
        <span class="section-number">6</span>
        <span>Daily Summary</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th class="num">Solar (kWh)</th>
            <th class="num">Grid Import (kWh)</th>
            <th class="num">Savings (KES)</th>
            <th class="num">Avg Battery (%)</th>
          </tr>
        </thead>
        <tbody>
          ${data.dailyAgg.slice(-30).map(day => `
          <tr>
            <td>${day.date}</td>
            <td class="num">${fmt(day.solar, 2)}</td>
            <td class="num">${fmt(day.gridImport, 2)}</td>
            <td class="num">${fmt(day.savings, 2)}</td>
            <td class="num">${fmt(day.avgBattery, 1)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>
        <strong>SafariCharge Ltd</strong><br/>
        Nairobi, Kenya | www.safaricharge.co.ke | info@safaricharge.co.ke<br/>
        <em>Confidential: For investor and management use only.</em>
      </div>
      <div style="text-align:right;">
        Report Reference: ${reportRef}<br/>
        Generated: ${data.reportDate}<br/>
        SafariCharge Dashboard v2
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  const headers = buildCorsHeaders(req);

  try {
    // Enforce body size limit
    const sizeCheck = await enforceBodySize(req, FORMAL_REPORT_MAX_BYTES);
    if (sizeCheck) return sizeCheck;

    // Parse and validate request body
    const body = await req.json();
    const validated = reportRequestSchema.parse(body);

    // Generate HTML report
    const html = generateReportHTML(validated);

    // Return HTML response
    const responseHeaders = new Headers(headers);
    responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
    responseHeaders.set('Cache-Control', 'no-store');

    return new NextResponse(html, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Formal report generation error:', error);

    if (error instanceof z.ZodError) {
      return jsonResponse(
        { error: 'Invalid request data', details: error.errors.map(e => e.message).join(', ') },
        { status: 400, headers }
      );
    }

    const details = error instanceof Error ? error.message : String(error);
    return jsonResponse(
      { error: 'Failed to generate report', details },
      { status: 500, headers }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  const headers = buildCorsHeaders(req);
  return new NextResponse(null, { status: 204, headers });
}
