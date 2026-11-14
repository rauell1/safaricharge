import { createHash } from 'node:crypto';
import { KPLC_OCT_2026_SURCHARGES } from './tariff-config';

export const STIMATRACKER_URL = 'https://www.stimatracker.com/';
export const STIMATRACKER_HISTORIC_URL = 'https://www.stimatracker.com/historic';
const MAX_BYTES = 1_000_000;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface KplcScheduleRate {
  code: 'DC' | 'DC1' | 'DC2' | 'SC1' | 'SC2' | 'SC3' | 'CI1' | 'CI2' | 'CI3';
  regularBaseKes: number;
  offPeakBaseKes: number;
  demandChargeKesPerKva: number;
  tou: boolean;
}

export interface KplcMonthlySurcharges {
  period: string;
  fccPerKwhKes: number;
  ferfaPerKwhKes: number;
  infaPerKwhKes: number;
  ercPerKwhKes: number;
  warmaPerKwhKes: number;
  repPercent: number;
  vatPercent: number;
}

export interface KplcSyncSnapshot {
  schemaVersion: 1;
  capturedAt: string;
  baseEffectiveFrom: string;
  surchargesEffectiveFrom: string;
  monthlyUpdated: boolean;
  sourceUrl: string;
  ratesHash: string;
  surcharges: KplcMonthlySurcharges;
  rates: KplcScheduleRate[];
}

export class TariffSourceError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'TariffSourceError';
  }
}

export function htmlText(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, value: string) => {
      const code = value[0].toLowerCase() === 'x' ? Number.parseInt(value.slice(1), 16) : Number(value);
      return code <= 0x10ffff ? String.fromCodePoint(code) : ' ';
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&ndash;|&mdash;/gi, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function monthDate(month: string, year: string, now: Date): string {
  const index = MONTHS.findIndex((name) => name.toLowerCase() === month.toLowerCase());
  if (index < 0 || Number(year) < 2020) throw new TariffSourceError('source_date_invalid');
  const date = `${year}-${String(index + 1).padStart(2, '0')}-01`;
  if (date > now.toISOString().slice(0, 10)) throw new TariffSourceError('source_date_in_future');
  return date;
}

function amountKes(text: string): number {
  const plain = text.trim().replace(/^(?:KES|KSh)\s*/i, '').replace(/\s*(?:KES|KSh)\s*$/i, '');
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,4})?$/.test(plain)) {
    throw new TariffSourceError('source_amount_invalid');
  }
  const value = Number(plain.replaceAll(',', ''));
  if (!Number.isFinite(value) || value > 100_000) throw new TariffSourceError('source_amount_invalid');
  return value;
}

function tableRows(table: string): string[][] {
  return Array.from(table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi), (row) =>
    Array.from(row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]\s*>/gi), (cell) => htmlText(cell[1]))
  );
}

/**
 * Parses StimaTracker `/historic` table for monthly FCC, FERFA, INFA, and WARMA charges.
 */
export function parseStimaTrackerMonthly(html: string, now = new Date()): KplcMonthlySurcharges {
  const clean = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
  const tables = Array.from(clean.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table\s*>/gi), (m) => m[0]).filter((table) => {
    const headings = Array.from(
      table.matchAll(/<th\b[^>]*>([\s\S]*?)(?=<th\b|<\/th\s*>|<\/tr\s*>)/gi),
      (m) => htmlText(m[1])
    ).join(' | ');
    return /Fuel Cost Charge/i.test(headings) && /Foreign Exchange/i.test(headings) && /Inflation/i.test(headings) && /WARMA/i.test(headings);
  });
  if (tables.length !== 1) throw new TariffSourceError('monthly_table_missing_or_ambiguous');
  const body = tables[0].replace(/<thead\b[\s\S]*?<\/thead\s*>/i, '');
  const rows = Array.from(body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi), (row) =>
    row[1].split(/<td\b[^>]*>/i).slice(1).map((cell) => htmlText(cell))
  );
  const dated = rows.filter((row) => /^20\d{2}-(0[1-9]|1[0-2])$/.test(row[0] ?? ''));
  if (dated.length === 0) throw new TariffSourceError('monthly_date_missing');
  const newest = dated.reduce((a, b) => (b[0] > a[0] ? b : a));
  if (newest.length !== 5) throw new TariffSourceError('monthly_charge_missing_or_invalid');
  const period = `${newest[0]}-01`;
  if (period > now.toISOString().slice(0, 10)) throw new TariffSourceError('source_date_in_future');
  const [fcc, ferfa, infa, warma] = newest.slice(1).map((cell) => amountKes(cell));
  if (fcc <= 0 || fcc > 20 || ferfa < 0 || ferfa > 10 || infa < 0 || infa > 5 || warma < 0 || warma > 1) {
    throw new TariffSourceError('monthly_charge_missing_or_invalid');
  }
  return {
    period,
    fccPerKwhKes: fcc,
    ferfaPerKwhKes: ferfa,
    infaPerKwhKes: infa,
    ercPerKwhKes: KPLC_OCT_2026_SURCHARGES.ercLevy,
    warmaPerKwhKes: warma,
    repPercent: KPLC_OCT_2026_SURCHARGES.repRate * 100,
    vatPercent: KPLC_OCT_2026_SURCHARGES.vatRate * 100,
  };
}

const CODES = ['DC', 'DC1', 'DC2', 'SC1', 'SC2', 'SC3', 'CI1', 'CI2', 'CI3'] as const;

export function parseStimaTracker(
  html: string,
  now = new Date(),
  previous?: KplcSyncSnapshot,
  monthly?: KplcMonthlySurcharges | null
): KplcSyncSnapshot {
  const clean = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');
  const text = htmlText(clean);
  if (!/Kenya|KPLC/i.test(text)) throw new TariffSourceError('source_identity_missing');
  const effectiveMatches = Array.from(
    text.matchAll(/current schedule of tariffs is effective from\s+([A-Za-z]+)\s+(20\d{2})/gi)
  );
  if (effectiveMatches.length !== 1) throw new TariffSourceError('base_effective_date_missing');
  const baseEffectiveFrom = monthDate(effectiveMatches[0][1], effectiveMatches[0][2], now);
  if (previous && baseEffectiveFrom < previous.baseEffectiveFrom) {
    throw new TariffSourceError('source_date_regression');
  }

  const tables = Array.from(clean.matchAll(/<table\b[^>]*>[\s\S]*?<\/table\s*>/gi), (m) => m[0]);
  const candidates = tables.filter((table) => {
    const headings = Array.from(table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th\s*>/gi), (m) => htmlText(m[1])).join(' ');
    return /(?:class|tariff)/i.test(headings) && /energy.*kwh/i.test(headings) && /demand.*kva/i.test(headings);
  });
  if (candidates.length !== 1) throw new TariffSourceError('tariff_table_missing_or_ambiguous');
  const rows = tableRows(candidates[0]);
  const rates: KplcScheduleRate[] = CODES.map((code) => {
    const matches = rows.filter((row) => new RegExp(`^${code}\\b`, 'i').test(row[0] ?? ''));
    if (matches.length !== 1 || matches[0].length !== 3) {
      throw new TariffSourceError('customer_class_missing_or_ambiguous');
    }
    const [, energy, demand] = matches[0];
    const tou = /^(?:Regular|Day)\s*:\s*([\d.,]+)\s+(?:TOU|Off[- ]Peak)\s*:\s*([\d.,]+)$/i.exec(energy);
    const regular = tou ? amountKes(tou[1]) : amountKes(energy);
    const offPeak = tou ? amountKes(tou[2]) : regular;
    if (regular <= 0 || offPeak <= 0 || offPeak > regular || regular > 1_000) {
      throw new TariffSourceError('energy_rate_invalid');
    }
    const demandKes = /^(?:n\/a|none|-)$/i.test(demand) ? 0 : amountKes(demand);
    return {
      code,
      regularBaseKes: regular,
      offPeakBaseKes: offPeak,
      demandChargeKesPerKva: demandKes,
      tou: Boolean(tou),
    };
  });

  const surcharges: KplcMonthlySurcharges = monthly ?? previous?.surcharges ?? {
    period: KPLC_OCT_2026_SURCHARGES.effectiveFrom,
    fccPerKwhKes: KPLC_OCT_2026_SURCHARGES.fuelEnergyCost,
    ferfaPerKwhKes: KPLC_OCT_2026_SURCHARGES.ferfa,
    infaPerKwhKes: KPLC_OCT_2026_SURCHARGES.infa,
    ercPerKwhKes: KPLC_OCT_2026_SURCHARGES.ercLevy,
    warmaPerKwhKes: KPLC_OCT_2026_SURCHARGES.wraLevy,
    repPercent: KPLC_OCT_2026_SURCHARGES.repRate * 100,
    vatPercent: KPLC_OCT_2026_SURCHARGES.vatRate * 100,
  };

  const ratesHash = createHash('sha256')
    .update(JSON.stringify({ baseEffectiveFrom, surcharges, rates }))
    .digest('hex');

  return {
    schemaVersion: 1,
    capturedAt: now.toISOString(),
    baseEffectiveFrom,
    surchargesEffectiveFrom: surcharges.period,
    monthlyUpdated: Boolean(monthly),
    sourceUrl: STIMATRACKER_URL,
    ratesHash,
    surcharges,
    rates,
  };
}

export async function fetchStimaTrackerHtml(
  url = STIMATRACKER_URL,
  fetcher: typeof fetch = fetch
): Promise<string> {
  const response = await fetcher(url, {
    redirect: 'error',
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: 'text/html', 'User-Agent': 'SafariCharge-TariffMonitor/2.0' },
  });
  if (!response.ok) throw new TariffSourceError('source_unavailable');
  if (!response.headers.get('content-type')?.includes('text/html')) {
    throw new TariffSourceError('source_format_invalid');
  }
  if (!response.body) throw new TariffSourceError('empty_source');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw new TariffSourceError('source_too_large');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function getFallbackKplcSnapshot(now = new Date()): KplcSyncSnapshot {
  const surcharges: KplcMonthlySurcharges = {
    period: KPLC_OCT_2026_SURCHARGES.effectiveFrom,
    fccPerKwhKes: KPLC_OCT_2026_SURCHARGES.fuelEnergyCost,
    ferfaPerKwhKes: KPLC_OCT_2026_SURCHARGES.ferfa,
    infaPerKwhKes: KPLC_OCT_2026_SURCHARGES.infa,
    ercPerKwhKes: KPLC_OCT_2026_SURCHARGES.ercLevy,
    warmaPerKwhKes: KPLC_OCT_2026_SURCHARGES.wraLevy,
    repPercent: KPLC_OCT_2026_SURCHARGES.repRate * 100,
    vatPercent: KPLC_OCT_2026_SURCHARGES.vatRate * 100,
  };
  const rates: KplcScheduleRate[] = [
    { code: 'DC', regularBaseKes: 20.97, offPeakBaseKes: 20.97, demandChargeKesPerKva: 0, tou: false },
    { code: 'DC1', regularBaseKes: 12.23, offPeakBaseKes: 12.23, demandChargeKesPerKva: 0, tou: false },
    { code: 'DC2', regularBaseKes: 16.30, offPeakBaseKes: 16.30, demandChargeKesPerKva: 0, tou: false },
    { code: 'SC1', regularBaseKes: 19.80, offPeakBaseKes: 19.80, demandChargeKesPerKva: 0, tou: false },
    { code: 'SC2', regularBaseKes: 18.60, offPeakBaseKes: 18.60, demandChargeKesPerKva: 0, tou: false },
    { code: 'SC3', regularBaseKes: 18.20, offPeakBaseKes: 9.10, demandChargeKesPerKva: 900, tou: true },
    { code: 'CI1', regularBaseKes: 16.20, offPeakBaseKes: 8.10, demandChargeKesPerKva: 800, tou: true },
    { code: 'CI2', regularBaseKes: 14.50, offPeakBaseKes: 7.25, demandChargeKesPerKva: 520, tou: true },
    { code: 'CI3', regularBaseKes: 13.90, offPeakBaseKes: 6.95, demandChargeKesPerKva: 320, tou: true },
  ];
  const ratesHash = createHash('sha256')
    .update(JSON.stringify({ baseEffectiveFrom: '2026-04-01', surcharges, rates }))
    .digest('hex');
  return {
    schemaVersion: 1,
    capturedAt: now.toISOString(),
    baseEffectiveFrom: '2026-04-01',
    surchargesEffectiveFrom: KPLC_OCT_2026_SURCHARGES.effectiveFrom,
    monthlyUpdated: false,
    sourceUrl: STIMATRACKER_URL,
    ratesHash,
    surcharges,
    rates,
  };
}

let cachedSnapshot: KplcSyncSnapshot | null = null;

export function getCachedKplcSnapshot(): KplcSyncSnapshot {
  return cachedSnapshot ?? getFallbackKplcSnapshot();
}

export async function syncLiveKplcTariffs(
  homeFetcher: () => Promise<string> = () => fetchStimaTrackerHtml(STIMATRACKER_URL),
  historicFetcher: () => Promise<string> = () => fetchStimaTrackerHtml(STIMATRACKER_HISTORIC_URL),
  now = new Date()
): Promise<{ snapshot: KplcSyncSnapshot; source: 'live' | 'fallback'; errorCode?: string }> {
  try {
    const html = await homeFetcher();
    let monthly: KplcMonthlySurcharges | null = null;
    try {
      monthly = parseStimaTrackerMonthly(await historicFetcher(), now);
    } catch {
      monthly = null;
    }
    const snapshot = parseStimaTracker(html, now, cachedSnapshot ?? undefined, monthly);
    cachedSnapshot = snapshot;
    return { snapshot, source: 'live' };
  } catch (err) {
    const errorCode = err instanceof TariffSourceError ? err.code : 'sync_failed';
    return {
      snapshot: cachedSnapshot ?? getFallbackKplcSnapshot(now),
      source: 'fallback',
      errorCode,
    };
  }
}
