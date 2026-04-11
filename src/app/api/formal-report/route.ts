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
  peakBreakdown: z.object({
    records: z.number(),
    solar: z.number(),
    gridImport: z.number(),
    gridExport: z.number(),
    savings: z.number(),
    homeLoad: z.number(),
    evLoad: z.number(),
  }),
  offPeakBreakdown: z.object({
    records: z.number(),
    solar: z.number(),
    gridImport: z.number(),
    gridExport: z.number(),
    savings: z.number(),
    homeLoad: z.number(),
    evLoad: z.number(),
  }),
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
  recommendation: z.object({
    solarPanels: z.object({
      totalCapacityKw: z.number(),
      numberOfPanels: z.number(),
      panelWattage: z.number(),
      estimatedCostKES: z.number(),
      monthlySavingsKES: z.number(),
    }),
    battery: z.object({
      capacityKwh: z.number(),
      typeRecommended: z.string(),
      numberOfBatteries: z.number(),
      batteryCapacityAhPer: z.number(),
      voltageSystem: z.number(),
      estimatedCostKES: z.number(),
    }),
    inverter: z.object({
      ratedCapacityKw: z.number(),
      typeRecommended: z.string(),
      estimatedCostKES: z.number(),
    }),
    financial: z.object({
      totalSystemCostKES: z.number(),
      installationCostKES: z.number(),
      totalInvestmentKES: z.number(),
      monthlyGridSavingsKES: z.number(),
      annualGridSavingsKES: z.number(),
      paybackPeriodYears: z.number(),
      roi25YearsPct: z.number(),
      netSavings25YearsKES: z.number(),
    }),
    performance: z.object({
      dailySolarGenerationKwh: z.number(),
      gridDependencyReductionPct: z.number(),
      annualCO2SavingsKg: z.number(),
      equivalentTreesPlanted: z.number(),
    }),
    summary: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    notes: z.array(z.string()),
  }).optional(),
  financial: z
    .object({
      capexTotal: z.number(),
      npvKes: z.number(),
      irrPct: z.number(),
      lcoeKesPerKwh: z.number(),
      paybackYears: z.number(),
      annualSavingsKes: z.number(),
    })
    .optional(),
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
  const totalEVLoad = data.totalEV1 + data.totalEV2;

  const avgDailySolar = data.uniqueDays > 0 ? data.totalSolar / data.uniqueDays : 0;
  const avgDailyLoad = data.uniqueDays > 0 ? totalLoad / data.uniqueDays : 0;
  const avgDailyGridImport = data.uniqueDays > 0 ? data.totalGridImport / data.uniqueDays : 0;
  const avgDailyGridExport = data.uniqueDays > 0 ? data.totalGridExport / data.uniqueDays : 0;
  const avgDailyEV = data.uniqueDays > 0 ? totalEVLoad / data.uniqueDays : 0;
  const avgDailyEV1 = data.uniqueDays > 0 ? data.totalEV1 / data.uniqueDays : 0;
  const avgDailyEV2 = data.uniqueDays > 0 ? data.totalEV2 / data.uniqueDays : 0;
  const avgDailyHome = data.uniqueDays > 0 ? data.totalHomeLoad / data.uniqueDays : 0;

  const evLoadShare = totalLoad > 0 ? (totalEVLoad / totalLoad * 100) : 0;
  const homeLoadShare = totalLoad > 0 ? (data.totalHomeLoad / totalLoad * 100) : 0;
  const exportRate = data.totalSolar > 0 ? (data.totalGridExport / data.totalSolar * 100) : 0;
  const netEnergyBalance = data.totalSolar - data.totalGridImport + data.totalGridExport;

  const avgRecordsPerDay = data.uniqueDays > 0 ? data.totalDataPoints / data.uniqueDays : 0;
  const chartCoverageBaseline = Math.max(1, Math.min(data.uniqueDays, 30));
  const last30CoveragePct = data.dailyAgg.length > 0 ? (data.dailyAgg.length / chartCoverageBaseline * 100) : 0;

  const avgDailySavings = data.uniqueDays > 0 ? data.totalSavings / data.uniqueDays : 0;
  const simAnnualSavings = avgDailySavings * 365;

  // Financial calculations aligned to the SafariCharge recommendation (Kenya pricing)
  const recommendationFinancial = data.recommendation?.financial;
  const capex = recommendationFinancial?.totalInvestmentKES ?? 2500000;
  const monthlySavings = recommendationFinancial?.monthlyGridSavingsKES ?? (simAnnualSavings / 12);
  const annualSavings = recommendationFinancial?.annualGridSavingsKES ?? simAnnualSavings;
  const paybackYearsRaw = recommendationFinancial?.paybackPeriodYears ?? (annualSavings > 0 ? capex / annualSavings : Number.POSITIVE_INFINITY);
  const paybackYears = Number.isFinite(paybackYearsRaw) ? paybackYearsRaw : 0;
  const isPaybackViable = paybackYears > 0 && paybackYears < 40;
  const roi25Years = recommendationFinancial?.roi25YearsPct ?? (annualSavings > 0 && capex > 0 ? ((annualSavings * 25 - capex) / capex) * 100 : 0);
  const roiLabel = recommendationFinancial ? '25-Year ROI' : 'Return on Investment (ROI)';
  const netSavings25Years = recommendationFinancial?.netSavings25YearsKES ?? (annualSavings * 25 - capex);

  // NPV calculation (10 years, 10% discount rate) with tariff escalation mirroring Kenya assumptions (≈6%)
  let npv = -capex;
  let projectedAnnualSavings = annualSavings;
  for (let year = 1; year <= 10; year++) {
    if (year > 1) {
      projectedAnnualSavings *= 1.06;
    }
    npv += projectedAnnualSavings / Math.pow(1.1, year);
  }
  const dailySavings = recommendationFinancial ? monthlySavings / 30 : avgDailySavings;

  // Environmental impact
  const co2Avoided = data.totalSolar * 0.47; // 0.47 kg CO2 per kWh
  const treeEquivalent = co2Avoided / 21.77;
  const kmNotDriven = co2Avoided / 0.21;

  // Time-of-use breakdown
  const peakImportShare = data.totalGridImport > 0 ? (data.peakBreakdown.gridImport / data.totalGridImport * 100) : 0;
  const peakSolarShare = data.totalSolar > 0 ? (data.peakBreakdown.solar / data.totalSolar * 100) : 0;
  const peakSavingsShare = data.totalSavings > 0 ? (data.peakBreakdown.savings / data.totalSavings * 100) : 0;
  const offPeakImportShare = data.totalGridImport > 0 ? (data.offPeakBreakdown.gridImport / data.totalGridImport * 100) : 0;

  // Operational highlights (last 30 days in payload)
  type NumericDailyKey = 'solar' | 'savings' | 'gridImport' | 'evLoad';
  const pickMaxDay = (key: NumericDailyKey) =>
    data.dailyAgg.length > 0
      ? data.dailyAgg.reduce((best, day) => day[key] > best[key] ? day : best, data.dailyAgg[0])
      : null;
  const topSolarDay = pickMaxDay('solar');
  const topSavingsDay = pickMaxDay('savings');
  const topGridImportDay = pickMaxDay('gridImport');
  const topEvDay = pickMaxDay('evLoad');

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
          <div class="metric-label">Average Daily Load</div>
          <div class="metric-value">${fmt(avgDailyLoad, 1)} <span class="metric-unit">kWh/day</span></div>
        </div>
      </div>
    </div>

    <!-- Data Coverage -->
    <div class="section">
      <div class="section-title">
        <span class="section-number">2</span>
        <span>Data Coverage & Quality</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Coverage Metric</th>
            <th class="num">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Reporting Window</td>
            <td class="num">${data.dateFrom} to ${data.dateTo}</td>
          </tr>
          <tr>
            <td>Days Tracked</td>
            <td class="num">${fmt(data.uniqueDays, 0)} days</td>
          </tr>
          <tr>
            <td>Total Data Points</td>
            <td class="num">${fmtNum(data.totalDataPoints)}</td>
          </tr>
          <tr>
            <td>Average Records per Day</td>
            <td class="num">${fmt(avgRecordsPerDay, 0)}</td>
          </tr>
          <tr>
            <td>Days in Chart Window</td>
            <td class="num">${fmt(data.dailyAgg.length, 0)} of ${fmt(Math.min(data.uniqueDays, 30), 0)} days</td>
          </tr>
          <tr>
            <td>Coverage of Last 30 Days</td>
            <td class="num">${fmt(last30CoveragePct, 1)}%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Energy Performance -->
    <div class="section">
      <div class="section-title">
        <span class="section-number">3</span>
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
            <td>Average Daily Solar</td>
            <td class="num">${fmt(avgDailySolar, 2)}</td>
            <td>kWh/day</td>
          </tr>
          <tr>
            <td>Average Daily Load</td>
            <td class="num">${fmt(avgDailyLoad, 2)}</td>
            <td>kWh/day</td>
          </tr>
          <tr>
            <td>Average Daily Grid Import</td>
            <td class="num">${fmt(avgDailyGridImport, 2)}</td>
            <td>kWh/day</td>
          </tr>
          <tr>
            <td>Average Daily Grid Export</td>
            <td class="num">${fmt(avgDailyGridExport, 2)}</td>
            <td>kWh/day</td>
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
          <tr>
            <td>Net Energy Balance</td>
            <td class="num">${fmt(netEnergyBalance, 2)}</td>
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
            <td>Solar Export Rate</td>
            <td class="num">${fmt(exportRate, 2)}</td>
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

      <table>
        <thead>
          <tr>
            <th>Performance Highlight (Last 30 Days)</th>
            <th>Date</th>
            <th class="num">Value</th>
          </tr>
        </thead>
        <tbody>
          ${topSolarDay ? `
          <tr>
            <td>Highest Solar Day</td>
            <td>${topSolarDay.date}</td>
            <td class="num">${fmt(topSolarDay.solar, 2)} kWh</td>
          </tr>` : ''}
          ${topSavingsDay ? `
          <tr>
            <td>Highest Savings Day</td>
            <td>${topSavingsDay.date}</td>
            <td class="num">${fmt(topSavingsDay.savings, 2)} KES</td>
          </tr>` : ''}
          ${topGridImportDay ? `
          <tr>
            <td>Heaviest Grid Import Day</td>
            <td>${topGridImportDay.date}</td>
            <td class="num">${fmt(topGridImportDay.gridImport, 2)} kWh</td>
          </tr>` : ''}
          ${topEvDay ? `
          <tr>
            <td>Highest EV Load Day</td>
            <td>${topEvDay.date}</td>
            <td class="num">${fmt(topEvDay.evLoad, 2)} kWh</td>
          </tr>` : ''}
          ${(topSolarDay || topSavingsDay || topGridImportDay || topEvDay) ? '' : `
          <tr>
            <td colspan="3" style="text-align:center;color:#64748b;">No daily records available.</td>
          </tr>`}
        </tbody>
      </table>
    </div>

    <!-- Load & Charging Insights -->
    <div class="section">
      <div class="section-title">
        <span class="section-number">4</span>
        <span>Load & Charging Insights</span>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Home Load Share</div>
          <div class="metric-value">${fmt(homeLoadShare, 1)} <span class="metric-unit">%</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">EV Load Share</div>
          <div class="metric-value">${fmt(evLoadShare, 1)} <span class="metric-unit">%</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Avg Daily Home Load</div>
          <div class="metric-value">${fmt(avgDailyHome, 1)} <span class="metric-unit">kWh/day</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Avg Daily EV Load</div>
          <div class="metric-value">${fmt(avgDailyEV, 1)} <span class="metric-unit">kWh/day</span></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Load Segment</th>
            <th class="num">Total</th>
            <th class="num">Share of Load</th>
            <th class="num">Avg Daily</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Home Load</td>
            <td class="num">${fmt(data.totalHomeLoad, 2)} kWh</td>
            <td class="num">${fmt(homeLoadShare, 1)}%</td>
            <td class="num">${fmt(avgDailyHome, 2)} kWh/day</td>
          </tr>
          <tr>
            <td>EV #1 Load</td>
            <td class="num">${fmt(data.totalEV1, 2)} kWh</td>
            <td class="num">${fmt(totalLoad > 0 ? (data.totalEV1 / totalLoad * 100) : 0, 1)}%</td>
            <td class="num">${fmt(avgDailyEV1, 2)} kWh/day</td>
          </tr>
          <tr>
            <td>EV #2 Load</td>
            <td class="num">${fmt(data.totalEV2, 2)} kWh</td>
            <td class="num">${fmt(totalLoad > 0 ? (data.totalEV2 / totalLoad * 100) : 0, 1)}%</td>
            <td class="num">${fmt(avgDailyEV2, 2)} kWh/day</td>
          </tr>
          <tr>
            <td>Combined EV Load</td>
            <td class="num">${fmt(totalEVLoad, 2)} kWh</td>
            <td class="num">${fmt(evLoadShare, 1)}%</td>
            <td class="num">${fmt(avgDailyEV, 2)} kWh/day</td>
          </tr>
          <tr style="background:#e0f2fe;font-weight:600;">
            <td>Total Combined Load</td>
            <td class="num">${fmt(totalLoad, 2)} kWh</td>
            <td class="num">100%</td>
            <td class="num">${fmt(avgDailyLoad, 2)} kWh/day</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Time-of-Use Analysis -->
    <div class="section">
      <div class="section-title">
        <span class="section-number">5</span>
        <span>Time-of-Use Analysis</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Window</th>
            <th class="num">Records</th>
            <th class="num">Solar (kWh)</th>
            <th class="num">Grid Import (kWh)</th>
            <th class="num">Grid Export (kWh)</th>
            <th class="num">Savings (KES)</th>
            <th class="num">Share of Grid Import</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Peak</td>
            <td class="num">${fmt(data.peakBreakdown.records, 0)}</td>
            <td class="num">${fmt(data.peakBreakdown.solar, 2)}</td>
            <td class="num">${fmt(data.peakBreakdown.gridImport, 2)}</td>
            <td class="num">${fmt(data.peakBreakdown.gridExport, 2)}</td>
            <td class="num">${fmt(data.peakBreakdown.savings, 2)}</td>
            <td class="num">${fmt(peakImportShare, 1)}%</td>
          </tr>
          <tr>
            <td>Off-Peak</td>
            <td class="num">${fmt(data.offPeakBreakdown.records, 0)}</td>
            <td class="num">${fmt(data.offPeakBreakdown.solar, 2)}</td>
            <td class="num">${fmt(data.offPeakBreakdown.gridImport, 2)}</td>
            <td class="num">${fmt(data.offPeakBreakdown.gridExport, 2)}</td>
            <td class="num">${fmt(data.offPeakBreakdown.savings, 2)}</td>
            <td class="num">${fmt(offPeakImportShare, 1)}%</td>
          </tr>
        </tbody>
      </table>
      <div style="font-size:12px;color:#64748b;margin-top:8px;">Peak/off-peak windows follow the tariff schedule captured in the simulation; savings align to those time blocks. Peak hours captured ${fmt(peakSolarShare, 1)}% of solar generation and ${fmt(peakSavingsShare, 1)}% of total savings.</div>
    </div>

    <!-- Financial Analysis -->
    <div class="section">
      <div class="section-title">
        <span class="section-number">6</span>
        <span>${data.recommendation ? 'Simulation Savings Summary' : 'Financial Analysis'}</span>
      </div>

      ${data.recommendation ? `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total Observed Savings</div>
          <div class="metric-value">${fmt(data.totalSavings, 0)} <span class="metric-unit">KES</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Daily Average</div>
          <div class="metric-value">${fmt(avgDailySavings, 0)} <span class="metric-unit">KES/day</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Annual Run-Rate</div>
          <div class="metric-value">${fmt(simAnnualSavings, 0)} <span class="metric-unit">KES/year</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Days Tracked</div>
          <div class="metric-value">${data.uniqueDays} <span class="metric-unit">days</span></div>
        </div>
      </div>

      <div class="chart-container">
        <div class="chart-title">Daily Savings Trend (Last 30 Days)</div>
        ${savingsSVG}
      </div>
      <div style="font-size:12px;color:#64748b;margin-top:6px;">These are savings observed during the simulation run. Full investment analysis including CapEx, payback period, IRR, and 25-year projections are presented in the System Recommendation &amp; Financial Analysis section below.</div>
      ` : `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total Savings</div>
          <div class="metric-value">${fmt(data.totalSavings, 0)} <span class="metric-unit">KES</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Daily Average</div>
          <div class="metric-value">${fmt(dailySavings, 0)} <span class="metric-unit">KES/day</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Annual Projection</div>
          <div class="metric-value">${fmt(annualSavings, 0)} <span class="metric-unit">KES/year</span></div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Payback Period</div>
          <div class="metric-value">
            ${isPaybackViable
              ? `${fmt(paybackYears, 1)} <span class="metric-unit">years</span>`
              : `<span class="metric-unit">Not viable</span>`
            }
          </div>
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
            <td class="num">${fmt(dailySavings, 2)}</td>
            <td>KES/day</td>
          </tr>
          <tr>
            <td>Annualised Savings</td>
            <td class="num">${fmt(annualSavings, 0)}</td>
            <td>KES/year</td>
          </tr>
          <tr>
            <td>System CapEx (equipment + install)</td>
            <td class="num">${fmtNum(capex)}</td>
            <td>KES</td>
          </tr>
          <tr style="background:#e0f2fe;font-weight:600;">
            <td>Simple Payback Period</td>
            <td class="num">${isPaybackViable ? fmt(paybackYears, 2) : 'Not viable'}</td>
            <td>${isPaybackViable ? 'years' : ''}</td>
          </tr>
          <tr>
            <td>${roiLabel}</td>
            <td class="num">${fmt(roi25Years, 1)}</td>
            <td>%</td>
          </tr>
          <tr>
            <td>Net Savings (25 Years)</td>
            <td class="num">${fmtNum(netSavings25Years)}</td>
            <td>KES</td>
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
      `}
    </div>

    <!-- Battery Performance -->
    <div class="section">
      <div class="section-title">
        <span class="section-number">7</span>
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
        <span class="section-number">8</span>
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

    ${data.recommendation ? `
    <!-- System Recommendation & Financial Analysis -->
    <div class="section">
      <div class="section-title">
        <span class="section-number">9</span>
        <span>System Recommendation &amp; Financial Analysis</span>
      </div>

      <div style="background: linear-gradient(135deg, #0c4a6e 0%, #075985 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; font-size: 18px;">Investment Summary</h3>
        <p style="margin: 0; font-size: 16px; line-height: 1.6;">${data.recommendation.summary}</p>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
          <span style="font-size: 14px; opacity: 0.9;">Confidence Level: <strong>${data.recommendation.confidence.toUpperCase()}</strong></span>
        </div>
      </div>

      <h4 style="color: #0c4a6e; margin: 25px 0 15px 0; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Solar Panel System</h4>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">System Capacity</div>
          <div class="metric-value">${fmt(data.recommendation.solarPanels.totalCapacityKw, 2)} <span class="metric-unit">kW</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Number of Panels</div>
          <div class="metric-value">${data.recommendation.solarPanels.numberOfPanels} <span class="metric-unit">× ${data.recommendation.solarPanels.panelWattage}W</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Estimated Cost</div>
          <div class="metric-value">KES ${fmtNum(data.recommendation.solarPanels.estimatedCostKES)}</div>
        </div>
      </div>

      <h4 style="color: #0c4a6e; margin: 25px 0 15px 0; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Battery Storage</h4>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Capacity</div>
          <div class="metric-value">${fmt(data.recommendation.battery.capacityKwh, 2)} <span class="metric-unit">kWh</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Configuration</div>
          <div class="metric-value">${data.recommendation.battery.numberOfBatteries} <span class="metric-unit">× ${data.recommendation.battery.batteryCapacityAhPer}Ah @ ${data.recommendation.battery.voltageSystem}V</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Battery Type</div>
          <div class="metric-value" style="font-size: 14px;">${data.recommendation.battery.typeRecommended}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Estimated Cost</div>
          <div class="metric-value">KES ${fmtNum(data.recommendation.battery.estimatedCostKES)}</div>
        </div>
      </div>

      <h4 style="color: #0c4a6e; margin: 25px 0 15px 0; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Inverter</h4>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Rated Capacity</div>
          <div class="metric-value">${fmt(data.recommendation.inverter.ratedCapacityKw, 1)} <span class="metric-unit">kW</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Type</div>
          <div class="metric-value" style="font-size: 14px;">${data.recommendation.inverter.typeRecommended}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Estimated Cost</div>
          <div class="metric-value">KES ${fmtNum(data.recommendation.inverter.estimatedCostKES)}</div>
        </div>
      </div>

      <h4 style="color: #0c4a6e; margin: 25px 0 15px 0; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Financial Projections (25-Year Analysis)</h4>
      <table>
        <thead>
          <tr>
            <th>Financial Metric</th>
            <th class="num">Value</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Total Investment</strong></td>
            <td class="num"><strong>KES ${fmtNum(data.recommendation.financial.totalInvestmentKES)}</strong></td>
            <td>Equipment + Installation (${fmtNum(data.recommendation.financial.installationCostKES)} KES)</td>
          </tr>
          <tr>
            <td>Monthly Grid Savings</td>
            <td class="num">KES ${fmtNum(data.recommendation.financial.monthlyGridSavingsKES)}</td>
            <td>Based on current KPLC tariffs</td>
          </tr>
          <tr>
            <td>Annual Grid Savings (Year 1)</td>
            <td class="num">KES ${fmtNum(data.recommendation.financial.annualGridSavingsKES)}</td>
            <td>Escalates 6% annually</td>
          </tr>
          <tr style="background-color: #f0f9ff;">
            <td><strong>Payback Period</strong></td>
            <td class="num"><strong>${fmt(data.recommendation.financial.paybackPeriodYears, 1)} years</strong></td>
            <td>Including maintenance costs</td>
          </tr>
          <tr style="background-color: #ecfdf5;">
            <td><strong>25-Year ROI</strong></td>
            <td class="num"><strong>${fmt(data.recommendation.financial.roi25YearsPct, 1)}%</strong></td>
            <td>Including battery replacements</td>
          </tr>
          <tr style="background-color: #ecfdf5;">
            <td><strong>Net Savings (25 years)</strong></td>
            <td class="num"><strong>KES ${fmtNum(data.recommendation.financial.netSavings25YearsKES)}</strong></td>
            <td>After all costs</td>
          </tr>
          <tr>
            <td>10-Year NPV (10% discount)</td>
            <td class="num">KES ${fmt(npv, 0)}</td>
            <td>Discounted cash flow</td>
          </tr>
        </tbody>
      </table>

      <div class="chart-container">
        <div class="chart-title">Observed Daily Savings Trend (Last 30 Days)</div>
        ${savingsSVG}
      </div>

      <h4 style="color: #0c4a6e; margin: 25px 0 15px 0; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Performance Metrics</h4>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Daily Solar Generation</div>
          <div class="metric-value">${fmt(data.recommendation.performance.dailySolarGenerationKwh, 1)} <span class="metric-unit">kWh/day</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Grid Reduction</div>
          <div class="metric-value">${fmt(data.recommendation.performance.gridDependencyReductionPct, 1)} <span class="metric-unit">%</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Annual CO₂ Savings</div>
          <div class="metric-value">${fmtNum(data.recommendation.performance.annualCO2SavingsKg)} <span class="metric-unit">kg</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Tree Equivalent</div>
          <div class="metric-value">${data.recommendation.performance.equivalentTreesPlanted} <span class="metric-unit">trees/year</span></div>
        </div>
      </div>

      ${data.recommendation.notes && data.recommendation.notes.length > 0 ? `
      <h4 style="color: #0c4a6e; margin: 25px 0 15px 0; font-size: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Important Notes</h4>
      <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
        ${data.recommendation.notes.map(note => `<li style="margin-bottom: 8px;">${note}</li>`).join('')}
      </ul>
      ` : ''}
    </div>
    ` : ''}

    ${data.financial ? `
    <!-- Financial Snapshot (from Financial Dashboard) -->
    <div class="section">
      <div class="section-title">
        <span class="section-number">${data.recommendation ? '10' : '9'}</span>
        <span>Financial Analysis — CAPEX, NPV, IRR &amp; LCOE</span>
      </div>

      <div style="background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 6px 0; font-size: 18px;">Investment Snapshot</h3>
        <p style="margin: 0; font-size: 13px; opacity: 0.85;">Derived from live simulation data and configured financial inputs</p>
      </div>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Total CAPEX</div>
          <div class="metric-value">KES ${fmtNum(data.financial.capexTotal)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">10-Year NPV</div>
          <div class="metric-value" style="${data.financial.npvKes >= 0 ? 'color:#16a34a;' : 'color:#dc2626;'}">KES ${fmtNum(Math.round(data.financial.npvKes))}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">IRR</div>
          <div class="metric-value">${fmt(data.financial.irrPct, 1)} <span class="metric-unit">%</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Payback Period</div>
          <div class="metric-value">${data.financial.paybackYears > 0 && data.financial.paybackYears < 100 ? `${fmt(data.financial.paybackYears, 1)} <span class="metric-unit">years</span>` : '<span class="metric-unit">N/A</span>'}</div>
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
            <td>Total Capital Expenditure (CAPEX)</td>
            <td class="num">${fmtNum(data.financial.capexTotal)}</td>
            <td>KES</td>
          </tr>
          <tr>
            <td>Annual Savings (Year 1)</td>
            <td class="num">${fmtNum(Math.round(data.financial.annualSavingsKes))}</td>
            <td>KES/year</td>
          </tr>
          <tr style="background:#e0f2fe;font-weight:600;">
            <td>Payback Period</td>
            <td class="num">${data.financial.paybackYears > 0 && data.financial.paybackYears < 100 ? fmt(data.financial.paybackYears, 1) : 'N/A'}</td>
            <td>${data.financial.paybackYears > 0 && data.financial.paybackYears < 100 ? 'years' : ''}</td>
          </tr>
          <tr style="background:#ecfdf5;">
            <td>Net Present Value (10 years)</td>
            <td class="num">${fmtNum(Math.round(data.financial.npvKes))}</td>
            <td>KES</td>
          </tr>
          <tr>
            <td>Internal Rate of Return (IRR)</td>
            <td class="num">${fmt(data.financial.irrPct, 1)}</td>
            <td>%</td>
          </tr>
          <tr>
            <td>LCOE (Levelised Cost of Energy)</td>
            <td class="num">${fmt(data.financial.lcoeKesPerKwh, 2)}</td>
            <td>KES/kWh</td>
          </tr>
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Daily Summary Table -->
    <div class="section">
      <div class="section-title">
        <span class="section-number">${data.recommendation && data.financial ? '11' : data.recommendation || data.financial ? '10' : '9'}</span>
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
  const { preflight, headers } = buildCorsHeaders(req, { methods: ['POST', 'OPTIONS'] });
  if (preflight) return preflight;

  try {
    // Enforce body size limit
    const sizeCheck = enforceBodySize(req, FORMAL_REPORT_MAX_BYTES, headers);
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
        { error: 'Invalid request data', details: error.issues.map(e => e.message).join(', ') },
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
  const { preflight, headers } = buildCorsHeaders(req);
  if (preflight) return preflight;
  return new NextResponse(null, { status: 204, headers });
}
