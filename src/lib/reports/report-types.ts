/**
 * Shared types and XML/CSV escaping helpers for deterministic snapshot exports.
 */
import type { SimulationResults } from '@/lib/sizing/types';

export interface OrgReportBranding {
  companyName: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  accentHex?: string;
  clientName?: string;
  projectTitle?: string;
}

export interface ReportSectionToggles {
  executiveSummary: boolean;
  systemSpecs: boolean;
  engineeringChecks: boolean;
  financialAnalysis: boolean;
  bomAndCapex: boolean;
  seasonalMonthly: boolean;
  hourlyDispatch: boolean;
}

export const DEFAULT_REPORT_SECTIONS: ReportSectionToggles = {
  executiveSummary: true,
  systemSpecs: true,
  engineeringChecks: true,
  financialAnalysis: true,
  bomAndCapex: true,
  seasonalMonthly: true,
  hourlyDispatch: true,
};

export interface ReportSnapshotPayload {
  results: SimulationResults;
  branding: OrgReportBranding;
  sections: ReportSectionToggles;
  generatedAt?: string;
}

export function xmlEscape(text: unknown): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Formula-injection safe CSV cell formatter (prefixes leading =,+,-,@,\t,\r). */
export function csvCell(value: unknown): string {
  const raw = String(value ?? '');
  const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

export function formatKes(value: number): string {
  return `KES ${Math.round(value).toLocaleString('en-US')}`;
}

export function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}
