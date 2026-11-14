/**
 * Editable OOXML (.docx) Word proposal generator built cleanly via JSZip
 * from a saved SimulationResults snapshot (no simulation re-run).
 */
import JSZip from 'jszip';
import { isOutdatedEngineVersion } from '@/lib/solar-resource';
import { formatKes, formatUsd, xmlEscape, type ReportSnapshotPayload } from './report-types';

function paragraphXml(text: string, opts?: { heading?: boolean; bold?: boolean; colorHex?: string; sizeHalfPt?: number }): string {
  const color = opts?.colorHex ? `<w:color w:val="${opts.colorHex}"/>` : '';
  const bold = opts?.bold || opts?.heading ? '<w:b/>' : '';
  const sz = opts?.sizeHalfPt ?? (opts?.heading ? 28 : 21);
  const spacing = opts?.heading ? '<w:spacing w:before="220" w:after="100"/>' : '<w:spacing w:before="40" w:after="60"/>';
  return `<w:p>
    <w:pPr>${spacing}</w:pPr>
    <w:r>
      <w:rPr>${bold}${color}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>
      <w:t xml:space="preserve">${xmlEscape(text)}</w:t>
    </w:r>
  </w:p>`;
}

function tableXml(headers: string[], rows: string[][]): string {
  const makeCell = (text: string, isHeader = false) => `<w:tc>
    <w:tcPr>${isHeader ? '<w:shd w:val="clear" w:color="auto" w:fill="0F766E"/>' : ''}<w:tcMar><w:top w:w="70" w:type="dxa"/><w:bottom w:w="70" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar></w:tcPr>
    <w:p><w:r><w:rPr>${isHeader ? '<w:b/><w:color w:val="FFFFFF"/>' : ''}<w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${xmlEscape(text)}</w:t></w:r></w:p>
  </w:tc>`;

  const hdr = `<w:tr>${headers.map((h) => makeCell(h, true)).join('')}</w:tr>`;
  const body = rows.map((row) => `<w:tr>${row.map((c) => makeCell(c, false)).join('')}</w:tr>`).join('');
  return `<w:tbl>
    <w:tblPr><w:tblBorders>
      <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
    </w:tblBorders></w:tblPr>
    ${hdr}${body}
  </w:tbl>`;
}

export async function generateWordProposalBuffer(payload: ReportSnapshotPayload): Promise<Buffer> {
  const { results, branding, sections } = payload;
  const accent = (branding.accentHex ?? '0F766E').replace('#', '');
  const outdated = isOutdatedEngineVersion(results.engineVersion);

  const blocks: string[] = [];
  blocks.push(
    paragraphXml(`${branding.companyName || 'SafariCharge'} — Solar & Storage Engineering Proposal`, {
      heading: true,
      colorHex: accent,
      sizeHalfPt: 34,
    })
  );
  blocks.push(
    paragraphXml(
      `Project: ${branding.projectTitle || 'Commercial Solar + BESS Feasibility'} | Client: ${branding.clientName || 'Valued Client'} | Location: ${results.inputs.location.name}, ${results.inputs.location.country}`,
      { bold: true, sizeHalfPt: 20 }
    )
  );
  if (branding.contactEmail || branding.contactPhone) {
    blocks.push(paragraphXml(`Prepared by: ${[branding.contactEmail, branding.contactPhone].filter(Boolean).join(' • ')}`, { sizeHalfPt: 18 }));
  }
  if (outdated) {
    blocks.push(
      paragraphXml(
        'NOTICE: This snapshot was generated with a legacy calculation engine version (< 2.0.0). Re-run in Studio to update tariffs and seasonal dispatch.',
        { bold: true, colorHex: 'B45309' }
      )
    );
  }

  if (sections.executiveSummary) {
    blocks.push(paragraphXml('1. Executive Summary', { heading: true, colorHex: accent }));
    blocks.push(
      tableXml(
        ['Key Metric', 'Value', 'Key Financial Metric', 'Value'],
        [
          ['PV Array Capacity', `${results.solarCapacityKWp} kWp`, 'Total Turnkey CapEx', `${formatKes(results.totalCapExKSh)} (${formatUsd(results.totalCapExUSD)})`],
          ['Inverter AC Rating', `${results.inverterCapacityKW} kW`, 'Year-1 Net Savings', formatUsd(results.annualSavingsUSD)],
          ['Battery Storage', `${results.batteryCapacityKWh} kWh`, 'Simple Payback', `${results.simplePaybackYears} years`],
          ['Annual Solar Output', `${Math.round(results.annualPVGeneratedKWh).toLocaleString('en-US')} kWh`, 'NPV / IRR', `${formatUsd(results.npvUSD)} / ${results.irrPercent}%`],
          ['System Autonomy', `${results.systemAutonomyPercent}%`, 'Useful LCOE', `$${results.lcoeUSDPerKWh.toFixed(3)}/kWh`],
        ]
      )
    );
  }

  if (sections.systemSpecs) {
    blocks.push(paragraphXml('2. System Specifications & Solar Resource Provenance', { heading: true, colorHex: accent }));
    if (results.solarProvenance) {
      blocks.push(paragraphXml(`Solar Resource: ${results.solarProvenance.label} — ${results.solarProvenance.detail}`));
    }
    if (results.pvEnergyBasis) {
      blocks.push(paragraphXml(`PV Sizing Basis (${results.pvEnergyBasis.goal}): ${results.pvEnergyBasis.basis}`));
    }
    if (results.engineeringChecks.stringLayoutSummary) {
      blocks.push(paragraphXml(`MPPT String Layout: ${results.engineeringChecks.stringLayoutSummary.message}`));
    }
  }

  if (sections.engineeringChecks) {
    blocks.push(paragraphXml('3. Electrical Engineering & Protection Checks', { heading: true, colorHex: accent }));
    blocks.push(
      tableXml(
        ['Check / Circuit', 'Status / Spec', 'Details'],
        [
          ['PV String Voltage Window', results.engineeringChecks.pvStringVoltageWindowOk ? 'PASS' : 'CHECK', results.engineeringChecks.pvStringVoltageWindowMessage],
          ...(results.engineeringChecks.inverterBatteryMatch
            ? [['Inverter-Battery Voltage Match', results.engineeringChecks.inverterBatteryMatch.ok ? 'PASS' : 'FAIL', results.engineeringChecks.inverterBatteryMatch.message]]
            : []),
          ...results.cableSizingResults.map((c) => [
            c.circuit,
            `${c.recommendedSizeMM2} mm2 x ${c.parallelRuns}`,
            `${c.designCurrentA} A | ${c.totalLengthM} m | ${formatKes(c.totalCostKSh)}`,
          ]),
        ]
      )
    );
  }

  if (sections.financialAnalysis) {
    blocks.push(paragraphXml('4. 25-Year Financial Cash Flows (Years 0–10 Excerpt)', { heading: true, colorHex: accent }));
    blocks.push(
      tableXml(
        ['Year', 'PV Yield (kWh)', 'Gross Savings', 'O&M', 'Net Cash Flow', 'Cumulative'],
        results.cashFlows.slice(0, 11).map((c) => [
          String(c.year),
          c.energyGeneratedKWh.toLocaleString('en-US'),
          formatUsd(c.grossSavingsUSD),
          formatUsd(c.omUSD),
          formatUsd(c.netCashFlow),
          formatUsd(c.cumulativeCashFlow),
        ])
      )
    );
  }

  if (sections.bomAndCapex) {
    blocks.push(paragraphXml('5. Bill of Materials & Turnkey CapEx', { heading: true, colorHex: accent }));
    blocks.push(
      tableXml(
        ['Section', 'Description', 'Qty', 'Total (KES)', 'Total (USD)'],
        results.bomLineItems.map((b) => [
          b.section,
          b.description,
          `${b.qty} ${b.unit}`,
          formatKes(b.totalKSh),
          formatUsd(b.totalUSD),
        ])
      )
    );
  }

  if (sections.seasonalMonthly && results.monthlyDispatchSummary?.length) {
    blocks.push(paragraphXml('6. 12-Month Seasonal Solar & Dispatch Performance', { heading: true, colorHex: accent }));
    blocks.push(
      tableXml(
        ['Month', 'PSH', 'Solar (kWh)', 'Curtailed (kWh)', 'Grid Import (kWh)', 'Load (kWh)'],
        results.monthlyDispatchSummary.map((m) => [
          m.monthName,
          m.peakSunHours.toFixed(2),
          m.solarKwhMonth.toLocaleString('en-US'),
          m.curtailedKwhMonth.toLocaleString('en-US'),
          m.gridImportKwhMonth.toLocaleString('en-US'),
          m.loadKwhMonth.toLocaleString('en-US'),
        ])
      )
    );
  }

  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );
  zip.file(
    '_rels/.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${blocks.join('\n    ')}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1000" w:right="1000" w:bottom="1000" w:left="1000"/></w:sectPr>
  </w:body>
</w:document>`
  );

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
