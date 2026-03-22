import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MAX_EXPORT_DATA_POINTS } from '@/lib/config';
import {
  buildCorsHeaders,
  enforceBodySize,
  enforceRbac,
  enforceServiceAuth,
  jsonResponse,
  readJsonWithRaw,
  verifyRequestSignature,
} from '@/lib/security';

/**
 * Sanitise a value before writing it into a CSV cell.
 *
 * Spreadsheet applications (Excel, LibreOffice Calc, Google Sheets) will
 * execute a cell as a formula when its content starts with =, +, -, @, TAB,
 * or CARRIAGE RETURN.  An attacker who can influence the simulation data could
 * craft values that trigger remote-code execution inside the analyst's
 * spreadsheet (CSV injection / formula injection).
 *
 * This function:
 *   1. Converts the value to a string.
 *   2. Strips CRLF/LF/TAB characters that would break CSV row boundaries.
 *   3. Prefixes dangerous leading characters with a single quote so the
 *      spreadsheet treats the cell as plain text.
 */
function sanitiseCsvCell(value: string | number | boolean): string {
  const str = String(value);
  // Remove control characters that could break CSV structure.
  const cleaned = str.replace(/[\r\n\t]/g, ' ');
  // Neutralise formula-injection prefixes.
  if (/^[=+\-@|%]/.test(cleaned)) {
    return `'${cleaned}`;
  }
  return cleaned;
}

// Flexible interface that matches client data
interface MinuteData {
  timestamp: string;
  date: string;
  year: number;
  month: number;
  week: number;
  day: number;
  hour: number;
  minute: number;
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
  homeLoadKWh?: number;
  ev1LoadKWh?: number;
  ev2LoadKWh?: number;
  gridImportKWh: number;
  gridExportKWh: number;
}

interface GraphDataPoint {
  timeOfDay: number;
  solar: number;
  load: number;
  batSoc: number;
}

interface AggregatedData {
  period: string;
  totalSolarKWh: number;
  totalHomeLoadKWh: number;
  totalEV1LoadKWh: number;
  totalEV2LoadKWh: number;
  totalGridImportKWh: number;
  totalGridExportKWh: number;
  avgBatteryLevelPct: number;
  avgEV1SocPct: number;
  avgEV2SocPct: number;
  totalSavingsKES: number;
  peakHoursCount: number;
  offPeakHoursCount: number;
}

function aggregateData(
  minuteData: MinuteData[],
  periodKey: (d: MinuteData) => string
): AggregatedData[] {
  const groups = new Map<string, MinuteData[]>();
  
  minuteData.forEach(d => {
    const key = periodKey(d);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  });

  return Array.from(groups.entries()).map(([period, items]) => {
    const count = items.length;
    return {
      period,
      totalSolarKWh: items.reduce((sum, d) => sum + (d.solarEnergyKWh || 0), 0),
      totalHomeLoadKWh: items.reduce((sum, d) => sum + (d.homeLoadKWh ?? (d.homeLoadKW || 0) * (24 / 420)), 0),
      totalEV1LoadKWh: items.reduce((sum, d) => sum + (d.ev1LoadKWh ?? (d.ev1LoadKW || 0) * (24 / 420)), 0),
      totalEV2LoadKWh: items.reduce((sum, d) => sum + (d.ev2LoadKWh ?? (d.ev2LoadKW || 0) * (24 / 420)), 0),
      totalGridImportKWh: items.reduce((sum, d) => sum + (d.gridImportKWh || 0), 0),
      totalGridExportKWh: items.reduce((sum, d) => sum + (d.gridExportKWh || 0), 0),
      avgBatteryLevelPct: count > 0 ? items.reduce((sum, d) => sum + (d.batteryLevelPct || 0), 0) / count : 0,
      avgEV1SocPct: count > 0 ? items.reduce((sum, d) => sum + (d.ev1SocPct || 0), 0) / count : 0,
      avgEV2SocPct: count > 0 ? items.reduce((sum, d) => sum + (d.ev2SocPct || 0), 0) / count : 0,
      totalSavingsKES: items.reduce((sum, d) => sum + (d.savingsKES || 0), 0),
      peakHoursCount: items.filter(d => d.isPeakTime).length,
      offPeakHoursCount: items.filter(d => !d.isPeakTime).length,
    };
  }).sort((a, b) => a.period.localeCompare(b.period));
}

const EXPORT_MAX_BODY_BYTES = 8 * 1024 * 1024; // 8 MB hard cap to protect memory under load

const minuteDataSchema = z.object({
  timestamp: z.string(),
  date: z.string(),
  year: z.number(),
  month: z.number(),
  week: z.number(),
  day: z.number(),
  hour: z.number(),
  minute: z.number(),
  solarKW: z.number(),
  homeLoadKW: z.number(),
  ev1LoadKW: z.number(),
  ev2LoadKW: z.number(),
  batteryPowerKW: z.number(),
  batteryLevelPct: z.number(),
  gridImportKW: z.number(),
  gridExportKW: z.number(),
  ev1SocPct: z.number(),
  ev2SocPct: z.number(),
  tariffRate: z.number(),
  isPeakTime: z.boolean(),
  savingsKES: z.number(),
  solarEnergyKWh: z.number(),
  homeLoadKWh: z.number().optional(),
  ev1LoadKWh: z.number().optional(),
  ev2LoadKWh: z.number().optional(),
  gridImportKWh: z.number(),
  gridExportKWh: z.number(),
});

const graphDataPointSchema = z.object({
  timeOfDay: z.number(),
  solar: z.number(),
  load: z.number(),
  batSoc: z.number(),
});

const exportRequestSchema = z.object({
  minuteData: z.array(minuteDataSchema).min(1),
  startDate: z.string(),
  graphData: z.array(graphDataPointSchema).optional(),
});

export async function POST(request: NextRequest) {
  const { preflight, headers } = buildCorsHeaders(request, { methods: ['POST', 'OPTIONS'] });
  if (preflight) return preflight;

  const sizeError = enforceBodySize(request, EXPORT_MAX_BODY_BYTES, headers);
  if (sizeError) return sizeError;

  const authError = enforceServiceAuth(request, headers);
  if (authError) return authError;

  const rbacError = enforceRbac(request, headers, ['analyst', 'admin']);
  if (rbacError) return rbacError;

  let parsed: { raw: Buffer; data: unknown };
  try {
    parsed = await readJsonWithRaw<unknown>(request);
  } catch {
    return jsonResponse({ error: 'Invalid JSON payload.' }, { status: 400, headers });
  }

  const signatureError = verifyRequestSignature(request, parsed.raw, headers);
  if (signatureError) return signatureError;

  const validation = exportRequestSchema.safeParse(parsed.data);
  if (!validation.success) {
    return jsonResponse(
      { error: 'Invalid payload.', details: validation.error.flatten() },
      { status: 400, headers }
    );
  }

  const { minuteData, startDate, graphData } = validation.data;

  // Guard against excessively large payloads that could exhaust server memory
  // when multiple users export simultaneously.
  // 420 points/day × 365 days × 25 years ≈ 3.8 M records is the practical max.
  if (minuteData.length > MAX_EXPORT_DATA_POINTS) {
    return jsonResponse(
      {
        error: `Dataset too large (${minuteData.length.toLocaleString()} records). Maximum is ${MAX_EXPORT_DATA_POINTS.toLocaleString()} records (~25 years).`
      },
      { status: 413, headers }
    );
  }

  try {

    // Aggregate data by different time periods
    const hourlyData = aggregateData(minuteData, d => `${d.date} ${String(d.hour).padStart(2, '0')}:00`);
    const dailyData = aggregateData(minuteData, d => d.date);
    const weeklyData = aggregateData(minuteData, d => `${d.year}-W${String(d.week).padStart(2, '0')}`);
    const monthlyData = aggregateData(minuteData, d => `${d.year}-${String(d.month).padStart(2, '0')}`);
    const yearlyData = aggregateData(minuteData, d => String(d.year));

    // Calculate totals
    const totalSolar = minuteData.reduce((sum, d) => sum + (d.solarEnergyKWh || 0), 0);
    const totalGridImport = minuteData.reduce((sum, d) => sum + (d.gridImportKWh || 0), 0);
    const totalGridExport = minuteData.reduce((sum, d) => sum + (d.gridExportKWh || 0), 0);
    const totalSavings = minuteData.reduce((sum, d) => sum + (d.savingsKES || 0), 0);
    const totalHomeLoad = minuteData.reduce((sum, d) => sum + (d.homeLoadKWh ?? (d.homeLoadKW || 0) * (24 / 420)), 0);
    const totalEV1Load = minuteData.reduce((sum, d) => sum + (d.ev1LoadKWh ?? (d.ev1LoadKW || 0) * (24 / 420)), 0);
    const totalEV2Load = minuteData.reduce((sum, d) => sum + (d.ev2LoadKWh ?? (d.ev2LoadKW || 0) * (24 / 420)), 0);
    const totalLoad = totalHomeLoad + totalEV1Load + totalEV2Load;
    
    // Get unique counts
    const uniqueDays = new Set(minuteData.map(d => d.date)).size;
    const uniqueWeeks = new Set(minuteData.map(d => `${d.year}-W${d.week}`)).size;
    const uniqueMonths = new Set(minuteData.map(d => `${d.year}-${d.month}`)).size;
    const uniqueYears = new Set(minuteData.map(d => d.year)).size;
    const peakCount = minuteData.filter(d => d.isPeakTime).length;
    const offPeakCount = minuteData.filter(d => !d.isPeakTime).length;

    // Create CSV content (Excel-compatible)
    let csv = '';

    // Header
    csv += 'SAFARICHARGE ENERGY REPORT\n';
    csv += `Generated,${new Date().toISOString()}\n`;
    csv += `System Start Date,${sanitiseCsvCell(startDate || 'Unknown')}\n`;
    csv += `Total Data Points,${minuteData.length}\n`;
    csv += `Date Range,${sanitiseCsvCell(minuteData[0]?.date || 'N/A')},to,${sanitiseCsvCell(minuteData[minuteData.length - 1]?.date || 'N/A')}\n\n`;

    // Overall Summary
    csv += 'OVERALL SUMMARY\n';
    csv += 'Metric,Value,Unit\n';
    csv += `Total Solar Generated,${totalSolar.toFixed(2)},kWh\n`;
    csv += `Total Home Load,${totalHomeLoad.toFixed(2)},kWh\n`;
    csv += `Total EV1 Load,${totalEV1Load.toFixed(2)},kWh\n`;
    csv += `Total EV2 Load,${totalEV2Load.toFixed(2)},kWh\n`;
    csv += `Total Grid Import,${totalGridImport.toFixed(2)},kWh\n`;
    csv += `Total Grid Export,${totalGridExport.toFixed(2)},kWh\n`;
    csv += `Total Savings,${totalSavings.toFixed(2)},KES\n`;
    csv += `Net Energy,${(totalSolar - totalGridImport + totalGridExport).toFixed(2)},kWh\n`;
    csv += `Self-Sufficiency Rate,${totalLoad > 0 ? ((totalSolar / totalLoad) * 100).toFixed(1) : 0},%\n`;
    csv += `Unique Days Tracked,${uniqueDays},days\n`;
    csv += `Unique Weeks Tracked,${uniqueWeeks},weeks\n`;
    csv += `Unique Months Tracked,${uniqueMonths},months\n`;
    csv += `Unique Years Tracked,${uniqueYears},years\n`;
    csv += `Peak Time Records,${peakCount},records\n`;
    csv += `Off-Peak Time Records,${offPeakCount},records\n\n`;

    // Minute-by-Minute Data
    csv += 'MINUTE-BY-MINUTE DATA\n';
    csv += 'Timestamp,Date,Year,Month,Week,Day,Hour,Minute,Solar (kW),Home Load (kW),EV1 Load (kW),EV2 Load (kW),Battery Power (kW),Battery Level (%),Grid Import (kW),Grid Export (kW),EV1 SoC (%),EV2 SoC (%),Tariff Rate (KES/kWh),Peak Time,Savings (KES),Solar Energy (kWh),Grid Import (kWh),Grid Export (kWh)\n';
    
    minuteData.forEach(d => {
      csv += [
        sanitiseCsvCell(d.timestamp),
        sanitiseCsvCell(d.date),
        sanitiseCsvCell(d.year),
        sanitiseCsvCell(d.month),
        sanitiseCsvCell(d.week),
        sanitiseCsvCell(d.day),
        sanitiseCsvCell(d.hour),
        sanitiseCsvCell(d.minute),
        (d.solarKW || 0).toFixed(2),
        (d.homeLoadKW || 0).toFixed(2),
        (d.ev1LoadKW || 0).toFixed(2),
        (d.ev2LoadKW || 0).toFixed(2),
        (d.batteryPowerKW || 0).toFixed(2),
        (d.batteryLevelPct || 0).toFixed(1),
        (d.gridImportKW || 0).toFixed(2),
        (d.gridExportKW || 0).toFixed(2),
        (d.ev1SocPct || 0).toFixed(1),
        (d.ev2SocPct || 0).toFixed(1),
        (d.tariffRate || 0).toFixed(2),
        d.isPeakTime ? 'Yes' : 'No',
        (d.savingsKES || 0).toFixed(2),
        (d.solarEnergyKWh || 0).toFixed(4),
        (d.gridImportKWh || 0).toFixed(4),
        (d.gridExportKWh || 0).toFixed(4),
      ].join(',') + '\n';
    });
    csv += '\n';

    // Aggregated sections helper
    const writeSection = (title: string, data: AggregatedData[], periodLabel: string) => {
      csv += `${title}\n`;
      csv += `${periodLabel},Total Solar (kWh),Total Home Load (kWh),Total EV1 Load (kWh),Total EV2 Load (kWh),Grid Import (kWh),Grid Export (kWh),Avg Battery (%),Avg EV1 SoC (%),Avg EV2 SoC (%),Savings (KES),Peak Count,Off-Peak Count\n`;
      data.forEach(d => {
        csv += [
          sanitiseCsvCell(d.period),
          d.totalSolarKWh.toFixed(2),
          d.totalHomeLoadKWh.toFixed(2),
          d.totalEV1LoadKWh.toFixed(2),
          d.totalEV2LoadKWh.toFixed(2),
          d.totalGridImportKWh.toFixed(2),
          d.totalGridExportKWh.toFixed(2),
          d.avgBatteryLevelPct.toFixed(1),
          d.avgEV1SocPct.toFixed(1),
          d.avgEV2SocPct.toFixed(1),
          d.totalSavingsKES.toFixed(2),
          d.peakHoursCount,
          d.offPeakHoursCount,
        ].join(',') + '\n';
      });
      csv += '\n';
    };

    writeSection('HOURLY SUMMARY', hourlyData, 'Period');
    writeSection('DAILY SUMMARY', dailyData, 'Date');
    writeSection('WEEKLY SUMMARY', weeklyData, 'Week');
    writeSection('MONTHLY SUMMARY', monthlyData, 'Month');
    writeSection('YEARLY SUMMARY', yearlyData, 'Year');

    // Daily Energy Profile Snapshot (from live graph data)
    if (graphData && graphData.length > 0) {
      const hhmm = (t: number) => {
        const h = Math.floor(t);
        const m = Math.round((t - h) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };
      csv += 'DAILY ENERGY PROFILE SNAPSHOT\n';
      csv += 'Time,Solar Gen (kW),Total Load (kW),Battery SOC (%)\n';
      graphData.forEach(p => {
        csv += `${hhmm(p.timeOfDay)},${p.solar.toFixed(2)},${p.load.toFixed(2)},${p.batSoc.toFixed(1)}\n`;
      });
      csv += '\n';
    }

    // Return CSV
    const responseHeaders = new Headers(headers);
    responseHeaders.set('Content-Type', 'text/csv; charset=utf-8');
    responseHeaders.set(
      'Content-Disposition',
      `attachment; filename="SafariCharge_Report_${new Date().toISOString().split('T')[0]}.csv"`
    );

    return new NextResponse(csv, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Export error:', error);
    return jsonResponse(
      { 
        error: 'Failed to generate report', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers }
    );
  }
}
