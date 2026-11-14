/**
 * Paginated multi-page PDF proposal generator built with pdf-lib directly from
 * a saved SimulationResults snapshot (no headless Chrome required).
 */
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import { isOutdatedEngineVersion } from '@/lib/solar-resource';
import { formatKes, formatUsd, type ReportSnapshotPayload } from './report-types';

const PAGE_W = 595.28; // A4 width
const PAGE_H = 841.89; // A4 height
const MARGIN = 44;

function sanitizePdfText(text: string): string {
  // Helvetica (WinAnsi) safely encodes ASCII + basic Latin-1; normalize exotic symbols
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');
}

export async function generatePdfProposalBytes(payload: ReportSnapshotPayload): Promise<Uint8Array> {
  const { results, branding, sections } = payload;
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const teal = rgb(0.059, 0.463, 0.431);
  const slate900 = rgb(0.059, 0.09, 0.165);
  const slate600 = rgb(0.278, 0.333, 0.412);
  const amber700 = rgb(0.706, 0.325, 0.035);
  const lineGray = rgb(0.82, 0.85, 0.9);

  let page: PDFPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN + 24) {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const drawText = (text: string, x: number, curY: number, size: number, font: PDFFont = fontRegular, color = slate900) => {
    page.drawText(sanitizePdfText(text), { x, y: curY, size, font, color });
  };

  const drawHeading = (title: string) => {
    ensureSpace(34);
    y -= 8;
    drawText(title, MARGIN, y, 13, fontBold, teal);
    y -= 6;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: lineGray });
    y -= 14;
  };

  const drawRow = (cols: string[], widths: number[], bold = false) => {
    ensureSpace(16);
    let x = MARGIN;
    cols.forEach((col, i) => {
      const maxChars = Math.max(6, Math.floor(widths[i] / 5.4));
      const clipped = col.length > maxChars ? `${col.slice(0, maxChars - 1)}~` : col;
      drawText(clipped, x, y, 9, bold ? fontBold : fontRegular, bold ? slate900 : slate600);
      x += widths[i];
    });
    y -= 14;
  };

  // Header Banner
  page.drawRectangle({ x: 0, y: PAGE_H - 78, width: PAGE_W, height: 78, color: teal });
  drawText(`${branding.companyName || 'SafariCharge'} — Solar & BESS Engineering Proposal`, MARGIN, PAGE_H - 36, 16, fontBold, rgb(1, 1, 1));
  drawText(
    `${branding.projectTitle || 'Solar + Storage Feasibility Study'} | ${results.inputs.location.name}, ${results.inputs.location.country}`,
    MARGIN,
    PAGE_H - 56,
    10,
    fontRegular,
    rgb(0.9, 0.98, 0.96)
  );
  y = PAGE_H - 98;

  if (isOutdatedEngineVersion(results.engineVersion)) {
    ensureSpace(24);
    drawText(
      'OUTDATED ENGINE NOTICE: Run pre-dates v2.0. Re-run in Studio for updated PVGIS & KPLC tariff accuracy.',
      MARGIN,
      y,
      9,
      fontBold,
      amber700
    );
    y -= 18;
  }

  if (sections.executiveSummary) {
    drawHeading('1. Executive Summary');
    drawRow(['PV Capacity', `${results.solarCapacityKWp} kWp`, 'Turnkey CapEx (KES)', formatKes(results.totalCapExKSh)], [115, 135, 130, 125], false);
    drawRow(['Inverter Rating', `${results.inverterCapacityKW} kW AC`, 'Turnkey CapEx (USD)', formatUsd(results.totalCapExUSD)], [115, 135, 130, 125], false);
    drawRow(['Battery Bank', `${results.batteryCapacityKWh} kWh`, 'Year-1 Net Savings', formatUsd(results.annualSavingsUSD)], [115, 135, 130, 125], false);
    drawRow(['Annual Solar Yield', `${results.annualPVGeneratedKWh.toLocaleString('en-US')} kWh`, 'Payback / IRR / NPV', `${results.simplePaybackYears}y | ${results.irrPercent}% | ${formatUsd(results.npvUSD)}`], [115, 135, 130, 125], false);
    drawRow(['Useful LCOE', `$${results.lcoeUSDPerKWh.toFixed(3)}/kWh`, 'Grid Baseline', `$${results.lcoeBaselineUSDPerKWh.toFixed(3)}/kWh`], [115, 135, 130, 125], false);
  }

  if (sections.systemSpecs) {
    drawHeading('2. System Sizing Basis & Provenance');
    drawRow(['Engine Version', results.engineVersion ?? 'Legacy', 'DC / AC Ratio', `${results.actualDcAcRatio}`], [115, 135, 130, 125], false);
    if (results.solarProvenance) {
      drawRow(['Solar Source', results.solarProvenance.label, 'Autonomy', `${results.systemAutonomyPercent}%`], [115, 135, 130, 125], false);
    }
    if (results.pvEnergyBasis) {
      drawRow(['Sizing Goal', results.pvEnergyBasis.goal, 'Basis', results.pvEnergyBasis.basis.slice(0, 38)], [115, 135, 65, 190], false);
    }
  }

  if (sections.engineeringChecks) {
    drawHeading('3. Engineering & Protection Verification');
    drawRow(['Check', 'Status', 'Detail'], [130, 65, 310], true);
    drawRow(['PV String Window', results.engineeringChecks.pvStringVoltageWindowOk ? 'PASS' : 'CHECK', results.engineeringChecks.pvStringVoltageWindowMessage], [130, 65, 310]);
    if (results.engineeringChecks.inverterBatteryMatch) {
      drawRow(['Battery V Window', results.engineeringChecks.inverterBatteryMatch.ok ? 'PASS' : 'FAIL', results.engineeringChecks.inverterBatteryMatch.message], [130, 65, 310]);
    }
    for (const c of results.cableSizingResults) {
      drawRow([c.circuit, `${c.recommendedSizeMM2}mm2`, `${c.parallelRuns}x | ${c.designCurrentA}A | ${formatKes(c.totalCostKSh)}`], [130, 65, 310]);
    }
  }

  if (sections.bomAndCapex) {
    drawHeading('4. Bill of Materials');
    drawRow(['Item Description', 'Qty', 'Total (KES)', 'Total (USD)'], [255, 65, 100, 85], true);
    for (const item of results.bomLineItems) {
      drawRow([item.description, `${item.qty} ${item.unit}`, formatKes(item.totalKSh), formatUsd(item.totalUSD)], [255, 65, 100, 85]);
    }
  }

  if (sections.financialAnalysis) {
    drawHeading('5. Financial Cash Flow Projection (Years 0-10)');
    drawRow(['Year', 'Yield (kWh)', 'Gross Savings', 'Net Flow', 'Cumulative'], [45, 95, 115, 115, 135], true);
    for (const cf of results.cashFlows.slice(0, 11)) {
      drawRow([String(cf.year), String(cf.energyGeneratedKWh), formatUsd(cf.grossSavingsUSD), formatUsd(cf.netCashFlow), formatUsd(cf.cumulativeCashFlow)], [45, 95, 115, 115, 135]);
    }
  }

  if (sections.seasonalMonthly && results.monthlyDispatchSummary?.length) {
    drawHeading('6. Seasonal 12-Month Summary');
    drawRow(['Month', 'PSH', 'Solar (kWh)', 'Curtailed', 'Grid Import', 'Load (kWh)'], [85, 55, 90, 80, 95, 100], true);
    for (const m of results.monthlyDispatchSummary) {
      drawRow([m.monthName, m.peakSunHours.toFixed(2), String(m.solarKwhMonth), String(m.curtailedKwhMonth), String(m.gridImportKwhMonth), String(m.loadKwhMonth)], [85, 55, 90, 80, 95, 100]);
    }
  }

  return pdfDoc.save();
}
