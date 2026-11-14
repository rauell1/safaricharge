/**
 * Vendor-neutral interval telemetry ingest, data-quality validation, and
 * expected-vs-actual PV/BESS reconciliation engine.
 */
import { z } from 'zod';

export const telemetryPointSchema = z.object({
  timestamp: z.string().min(10),
  solarKw: z.number().min(0).max(50_000),
  loadKw: z.number().min(0).max(50_000),
  gridImportKw: z.number().min(0).max(50_000).default(0),
  gridExportKw: z.number().min(0).max(50_000).default(0),
  batterySocPct: z.number().min(0).max(100).optional(),
  expectedSolarKw: z.number().min(0).max(50_000).optional(),
  expectedLoadKw: z.number().min(0).max(50_000).optional(),
});

export const telemetryIngestPayloadSchema = z.object({
  siteId: z.string().min(1).max(120),
  vendor: z.enum(['deye', 'victron', 'sma', 'huawei', 'solis', 'generic']).default('generic'),
  intervalMinutes: z.number().int().min(1).max(60).default(60),
  points: z.array(telemetryPointSchema).min(1).max(2000),
});

export type TelemetryIngestPayload = z.infer<typeof telemetryIngestPayloadSchema>;

export interface TelemetryReconciliationReport {
  siteId: string;
  vendor: string;
  intervalsReceived: number;
  hoursCovered: number;
  actualSolarKwh: number;
  expectedSolarKwh: number | null;
  solarPerformanceRatioPct: number | null;
  actualLoadKwh: number;
  actualGridImportKwh: number;
  actualGridExportKwh: number;
  dataQualityStatus: 'healthy' | 'warning' | 'degraded';
  anomalies: string[];
  ingestedAt: string;
}

const siteTelemetryStore = new Map<string, TelemetryReconciliationReport[]>();

export function reconcileTelemetryBatch(
  payload: TelemetryIngestPayload
): TelemetryReconciliationReport {
  const intervalHours = payload.intervalMinutes / 60;
  let actualSolarKwh = 0;
  let expectedSolarKwh = 0;
  let hasExpectedSolar = false;
  let actualLoadKwh = 0;
  let actualGridImportKwh = 0;
  let actualGridExportKwh = 0;

  const anomalies: string[] = [];
  for (const pt of payload.points) {
    actualSolarKwh += pt.solarKw * intervalHours;
    actualLoadKwh += pt.loadKw * intervalHours;
    actualGridImportKwh += pt.gridImportKw * intervalHours;
    actualGridExportKwh += pt.gridExportKw * intervalHours;
    if (pt.expectedSolarKw !== undefined) {
      hasExpectedSolar = true;
      expectedSolarKwh += pt.expectedSolarKw * intervalHours;
    }
  }

  const solarPerformanceRatioPct =
    hasExpectedSolar && expectedSolarKwh > 0.1
      ? Math.round((actualSolarKwh / expectedSolarKwh) * 1000) / 10
      : null;

  if (solarPerformanceRatioPct !== null && solarPerformanceRatioPct < 75) {
    anomalies.push(
      `Measured solar yield (${solarPerformanceRatioPct}% PR) is >25% below modelled expectation — inspect shading, soiling, or inverter trip.`
    );
  }
  if (payload.points.length < 24 && payload.intervalMinutes === 60) {
    anomalies.push(`Partial day (${payload.points.length}/24 hourly intervals).`);
  }

  const dataQualityStatus: TelemetryReconciliationReport['dataQualityStatus'] =
    solarPerformanceRatioPct !== null && solarPerformanceRatioPct < 65
      ? 'degraded'
      : anomalies.length > 0
      ? 'warning'
      : 'healthy';

  const report: TelemetryReconciliationReport = {
    siteId: payload.siteId,
    vendor: payload.vendor,
    intervalsReceived: payload.points.length,
    hoursCovered: Math.round(payload.points.length * intervalHours * 10) / 10,
    actualSolarKwh: Math.round(actualSolarKwh * 100) / 100,
    expectedSolarKwh: hasExpectedSolar ? Math.round(expectedSolarKwh * 100) / 100 : null,
    solarPerformanceRatioPct,
    actualLoadKwh: Math.round(actualLoadKwh * 100) / 100,
    actualGridImportKwh: Math.round(actualGridImportKwh * 100) / 100,
    actualGridExportKwh: Math.round(actualGridExportKwh * 100) / 100,
    dataQualityStatus,
    anomalies,
    ingestedAt: new Date().toISOString(),
  };

  const history = siteTelemetryStore.get(payload.siteId) ?? [];
  siteTelemetryStore.set(payload.siteId, [report, ...history].slice(0, 50));
  return report;
}

export function getTelemetryHistory(siteId: string): TelemetryReconciliationReport[] {
  return siteTelemetryStore.get(siteId) ?? [];
}
