/**
 * Multi-sheet OOXML (.xlsx) workbook and sanitized CSV ZIP export rendered directly
 * from a saved SimulationResults snapshot using JSZip (no simulation re-run).
 */
import JSZip from 'jszip';
import { KSH_PER_USD } from '@/lib/sizing/mockData';
import { isOutdatedEngineVersion } from '@/lib/solar-resource';
import { csvCell, xmlEscape, type ReportSnapshotPayload } from './report-types';

type CellVal = string | number | null | undefined;

interface SheetSpec {
  name: string;
  rows: CellVal[][];
}

function colRef(colIndexZeroBased: number): string {
  let n = colIndexZeroBased + 1;
  let ref = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    ref = String.fromCharCode(65 + rem) + ref;
    n = Math.floor((n - 1) / 26);
  }
  return ref;
}

function buildSheetXml(rows: CellVal[][]): string {
  const rowXml = rows
    .map((row, rIdx) => {
      const cellsXml = row
        .map((val, cIdx) => {
          if (val === null || val === undefined || val === '') return '';
          const ref = `${colRef(cIdx)}${rIdx + 1}`;
          if (typeof val === 'number' && Number.isFinite(val)) {
            const style = rIdx === 0 ? ' s="1"' : '';
            return `<c r="${ref}"${style}><v>${val}</v></c>`;
          }
          const style = rIdx === 0 ? ' s="1"' : '';
          return `<c r="${ref}" t="inlineStr"${style}><is><t>${xmlEscape(String(val))}</t></is></c>`;
        })
        .filter(Boolean)
        .join('');
      return `<row r="${rIdx + 1}">${cellsXml}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
}

export function buildSpreadsheetSheets(payload: ReportSnapshotPayload): SheetSpec[] {
  const { results, branding, sections } = payload;
  const sheets: SheetSpec[] = [];
  const outdated = isOutdatedEngineVersion(results.engineVersion);

  const summaryRows: CellVal[][] = [
    ['SafariCharge Solar + BESS Proposal Snapshot', branding.companyName || 'SafariCharge'],
    ['Project / Client', branding.projectTitle || branding.clientName || 'Commercial Solar Study'],
    ['Location', `${results.inputs.location.name}, ${results.inputs.location.country}`],
    ['Engine Version', results.engineVersion ?? 'Legacy (< 2.0.0)'],
    ...(outdated
      ? [['NOTICE', 'Outdated calculation run — re-run in Studio for v2.3.0 physics & tariffs.']]
      : []),
    ['Solar Capacity (kWp)', results.solarCapacityKWp],
    ['Inverter Capacity (kW)', results.inverterCapacityKW],
    ['Battery Storage (kWh)', results.batteryCapacityKWh],
    ['DC/AC Ratio', results.actualDcAcRatio],
    ['Annual PV Yield (kWh)', results.annualPVGeneratedKWh],
    ['Annual Useful Solar (kWh)', results.annualUsefulSolarKWh ?? results.selfConsumedKWh],
    ['Annual Curtailed Solar (kWh)', results.annualCurtailedKWh ?? 0],
    ['Annual Clipped Solar (kWh)', results.annualClippedKWh ?? 0],
    ['System Autonomy (%)', results.systemAutonomyPercent],
    ['Total CapEx (KES)', results.totalCapExKSh],
    ['Total CapEx (USD)', results.totalCapExUSD],
    ['Annual Net Savings (USD)', results.annualSavingsUSD],
    ['NPV (USD)', results.npvUSD],
    ['IRR (%)', results.irrPercent],
    ['Simple Payback (yrs)', results.simplePaybackYears],
    ['LCOE (USD/kWh)', results.lcoeUSDPerKWh],
    ['Annual CO2 Avoided (tons)', results.annualCO2SavedTons],
  ];
  sheets.push({ name: 'Overview', rows: summaryRows });

  if (sections.bomAndCapex) {
    const bomRows: CellVal[][] = [
      ['Section', 'Item #', 'Description', 'Unit', 'Qty', 'Unit Price (KES)', 'Total (KES)', 'Total (USD)', 'Notes'],
      ...results.bomLineItems.map((b) => [
        b.section,
        b.itemNumber,
        b.description,
        b.unit,
        b.qty,
        b.unitPriceKSh,
        b.totalKSh,
        b.totalUSD,
        b.notes,
      ]),
    ];
    sheets.push({ name: 'BOM & CapEx', rows: bomRows });
  }

  if (sections.financialAnalysis) {
    const cashRows: CellVal[][] = [
      ['Year', 'Generated (kWh)', 'Tariff (KES/kWh)', 'Gross Savings (USD)', 'O&M (USD)', 'Battery Repl (USD)', 'Net Cash Flow (USD)', 'Cumulative CF (USD)'],
      ...results.cashFlows.map((c) => [
        c.year,
        c.energyGeneratedKWh,
        c.effectiveTariffKShPerKWh,
        c.grossSavingsUSD,
        c.omUSD,
        c.batteryReplacementUSD,
        c.netCashFlow,
        c.cumulativeCashFlow,
      ]),
    ];
    sheets.push({ name: 'Cash Flows', rows: cashRows });
  }

  if (sections.seasonalMonthly && results.monthlyDispatchSummary?.length) {
    const mRows: CellVal[][] = [
      ['Month', 'Days', 'PSH (kWh/m2/day)', 'Ambient Temp (C)', 'Solar (kWh)', 'Curtailed (kWh)', 'Clipped (kWh)', 'Grid Import (kWh)', 'Grid Export (kWh)', 'Load (kWh)'],
      ...results.monthlyDispatchSummary.map((m) => [
        m.monthName,
        m.days,
        m.peakSunHours,
        m.ambientTempC,
        m.solarKwhMonth,
        m.curtailedKwhMonth,
        m.clippedKwhMonth,
        m.gridImportKwhMonth,
        m.gridExportKwhMonth,
        m.loadKwhMonth,
      ]),
    ];
    sheets.push({ name: 'Monthly Seasonal', rows: mRows });
  }

  if (sections.hourlyDispatch) {
    const hRows: CellVal[][] = [
      ['Hour', 'Load (kW)', 'Solar (kW)', 'Bat Charge (kW)', 'Bat Discharge (kW)', 'Grid Import (kW)', 'Grid Export (kW)', 'SoC After (%)'],
      ...results.hourlyProfile.map((h) => [
        `${String(h.hour).padStart(2, '0')}:00`,
        h.loadKW,
        h.solarKW,
        h.batteryChargeKW,
        h.batteryDischargeKW,
        h.gridImportKW,
        h.gridExportKW,
        h.batterySoCAfter,
      ]),
    ];
    sheets.push({ name: 'Hourly Dispatch', rows: hRows });
  }

  if (sections.engineeringChecks) {
    const eRows: CellVal[][] = [
      ['Circuit / Check', 'Result / Size', 'Detail'],
      ['PV String Window', results.engineeringChecks.pvStringVoltageWindowOk ? 'PASS' : 'FAIL', results.engineeringChecks.pvStringVoltageWindowMessage],
      ...(results.engineeringChecks.inverterBatteryMatch
        ? [['Battery Voltage Match', results.engineeringChecks.inverterBatteryMatch.ok ? 'PASS' : 'FAIL', results.engineeringChecks.inverterBatteryMatch.message]]
        : []),
      ...results.cableSizingResults.map((c) => [
        c.circuit,
        `${c.recommendedSizeMM2} mm2 (${c.parallelRuns}x run)`,
        `Design ${c.designCurrentA} A | ${c.totalLengthM} m | KES ${Math.round(c.totalCostKSh)} (~$${Math.round(c.totalCostKSh / KSH_PER_USD)})`,
      ]),
    ];
    sheets.push({ name: 'Engineering Checks', rows: eRows });
  }

  return sheets;
}

export async function generateWorkbookXlsxBuffer(payload: ReportSnapshotPayload): Promise<Buffer> {
  const sheets = buildSpreadsheetSheets(payload);
  const zip = new JSZip();

  const contentTypesSheets = sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join('\n  ');

  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${contentTypesSheets}
</Types>`
  );

  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  );

  zip.file(
    'xl/_rels/workbook.xml.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  ${sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
    )
    .join('\n  ')}
</Relationships>`
  );

  zip.file(
    'xl/styles.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F766E"/></patternFill></fill>
  </fills>
  <borders count="1"><border/></borders>
  <cellStyleXfs count="1"><xf/></cellStyleXfs>
  <cellXfs count="2">
    <xf xfId="0"/>
    <xf xfId="0" fontId="1" fillId="2" applyFont="1" applyFill="1"/>
  </cellXfs>
</styleSheet>`
  );

  zip.file(
    'xl/workbook.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets
      .map(
        (s, i) =>
          `<sheet name="${xmlEscape(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
      )
      .join('\n    ')}
  </sheets>
</workbook>`
  );

  sheets.forEach((s, i) => {
    zip.file(`xl/worksheets/sheet${i + 1}.xml`, buildSheetXml(s.rows));
  });

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

export async function generateSanitizedCsvZipBuffer(payload: ReportSnapshotPayload): Promise<Buffer> {
  const sheets = buildSpreadsheetSheets(payload);
  const zip = new JSZip();
  for (const sheet of sheets) {
    const csv = sheet.rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
    const slug = sheet.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    zip.file(`${slug}.csv`, csv);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
