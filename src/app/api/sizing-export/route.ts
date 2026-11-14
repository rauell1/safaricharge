import { NextRequest, NextResponse } from 'next/server';
import {
  DEFAULT_REPORT_SECTIONS,
  type OrgReportBranding,
  type ReportSectionToggles,
} from '@/lib/reports/report-types';
import { generateWordProposalBuffer } from '@/lib/reports/word-document';
import { generatePdfProposalBytes } from '@/lib/reports/pdf-document';
import {
  generateSanitizedCsvZipBuffer,
  generateWorkbookXlsxBuffer,
} from '@/lib/reports/spreadsheet-export';
import type { SimulationResults } from '@/lib/sizing/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      format?: 'docx' | 'pdf' | 'xlsx' | 'csv';
      results?: SimulationResults;
      branding?: Partial<OrgReportBranding>;
      sections?: Partial<ReportSectionToggles>;
    };

    if (!body.results) {
      return NextResponse.json({ error: 'Missing simulation results snapshot' }, { status: 400 });
    }

    const format = body.format ?? 'pdf';
    const branding: OrgReportBranding = {
      companyName: body.branding?.companyName?.trim() || 'SafariCharge Ltd',
      contactEmail: body.branding?.contactEmail?.trim(),
      contactPhone: body.branding?.contactPhone?.trim(),
      website: body.branding?.website?.trim(),
      accentHex: body.branding?.accentHex?.trim() || '0F766E',
      clientName: body.branding?.clientName?.trim() || 'Valued Client',
      projectTitle:
        body.branding?.projectTitle?.trim() ||
        `${body.results.inputs.location.name} Solar + BESS Proposal`,
    };
    const sections: ReportSectionToggles = {
      ...DEFAULT_REPORT_SECTIONS,
      ...(body.sections ?? {}),
    };

    const dateStamp = new Date().toISOString().slice(0, 10);
    const payload = { results: body.results, branding, sections, generatedAt: dateStamp };

    if (format === 'docx') {
      const buf = await generateWordProposalBuffer(payload);
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="SafariCharge_Proposal_${dateStamp}.docx"`,
        },
      });
    }

    if (format === 'xlsx') {
      const buf = await generateWorkbookXlsxBuffer(payload);
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="SafariCharge_Workbook_${dateStamp}.xlsx"`,
        },
      });
    }

    if (format === 'csv') {
      const buf = await generateSanitizedCsvZipBuffer(payload);
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="SafariCharge_Data_CSV_${dateStamp}.zip"`,
        },
      });
    }

    const pdfBytes = await generatePdfProposalBytes(payload);
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="SafariCharge_Proposal_${dateStamp}.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to export report', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
