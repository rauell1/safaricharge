/**
 * Report Service
 *
 * Centralizes data access for report generation.
 * This fixes the broken report button by providing a consistent
 * interface to get report data from the energy system store.
 */

import { useEnergySystemStore } from '@/stores/energySystemStore';
import type {
  MinuteDataPoint,
  EnergyNode,
  EnergyFlow,
  Accumulators,
  NodeType,
} from '@/stores/energySystemStore';

export interface ReportData {
  // Node states
  nodes: Record<NodeType, EnergyNode>;

  // Energy flows
  flows: EnergyFlow[];

  // Time range
  timeRange: string;
  currentDate: Date;

  // Accumulators (totals)
  accumulators: Accumulators;

  // Historical data
  minuteData: MinuteDataPoint[];

  // System configuration
  systemConfig: {
    solarCapacityKW: number;
    batteryCapacityKWh: number;
    inverterKW: number;
    ev1CapacityKWh: number;
    ev2CapacityKWh: number;
    gridTariff: { peakRate: number; offPeakRate: number };
  };

  // Statistics
  statistics: {
    totalSolarKWh: number;
    totalConsumptionKWh: number;
    totalGridImportKWh: number;
    totalGridExportKWh: number;
    totalSavingsKES: number;
    avgBatterySOC: number;
    peakPowerKW: number;
    dataPoints: number;
    daysCovered: number;
  };
}

/**
 * Get all data needed for report generation
 */
export function getReportData(): ReportData {
  const state = useEnergySystemStore.getState();

  // Calculate statistics
  const minuteData = state.minuteData;
  const totalSolarKWh = minuteData.reduce((sum, d) => sum + d.solarEnergyKWh, 0);
  const totalConsumptionKWh = minuteData.reduce(
    (sum, d) => sum + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh,
    0
  );
  const totalGridImportKWh = minuteData.reduce((sum, d) => sum + d.gridImportKWh, 0);
  const totalGridExportKWh = minuteData.reduce((sum, d) => sum + d.gridExportKWh, 0);
  const totalSavingsKES = minuteData.reduce((sum, d) => sum + d.savingsKES, 0);
  const avgBatterySOC = minuteData.length > 0
    ? minuteData.reduce((sum, d) => sum + d.batteryLevelPct, 0) / minuteData.length
    : 0;
  let peakPowerKW = 0;
  for (const d of minuteData) {
    if (d.solarKW > peakPowerKW) peakPowerKW = d.solarKW;
  }

  // Calculate days covered
  const uniqueDates = new Set(minuteData.map((d) => d.date));
  const daysCovered = uniqueDates.size;

  return {
    nodes: state.nodes,
    flows: state.flows,
    timeRange: state.timeRange,
    currentDate: state.currentDate,
    accumulators: state.accumulators,
    minuteData: state.minuteData,
    systemConfig: state.systemConfig,
    statistics: {
      totalSolarKWh,
      totalConsumptionKWh,
      totalGridImportKWh,
      totalGridExportKWh,
      totalSavingsKES,
      avgBatterySOC,
      peakPowerKW,
      dataPoints: minuteData.length,
      daysCovered,
    },
  };
}

/**
 * Generate PDF report
 */
export async function generatePDFReport(): Promise<void> {
  const data = getReportData();

  try {
    const response = await fetch('/api/formal-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        minuteData: data.minuteData,
        accumulators: data.accumulators,
        systemConfig: data.systemConfig,
        currentDate: data.currentDate,
        statistics: data.statistics,
      }),
    });

    if (!response.ok) {
      throw new Error(`Report generation failed: ${response.statusText}`);
    }

    // Open report in new tab
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw error;
  }
}

/**
 * Generate Excel export
 */
export async function generateExcelReport(): Promise<void> {
  const data = getReportData();

  try {
    const response = await fetch('/api/export-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        minuteData: data.minuteData,
        statistics: data.statistics,
      }),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    // Download Excel file
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SafariCharge_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating Excel report:', error);
    throw error;
  }
}

/**
 * Generate CSV export
 */
export function generateCSVExport(): void {
  const data = getReportData();

  // Create CSV content
  const headers = [
    'Timestamp',
    'Date',
    'Hour',
    'Solar (kW)',
    'Home Load (kW)',
    'EV1 Load (kW)',
    'EV2 Load (kW)',
    'Battery Power (kW)',
    'Battery SOC (%)',
    'Grid Import (kW)',
    'Grid Export (kW)',
    'Tariff Rate (KES/kWh)',
    'Is Peak Time',
    'Savings (KES)',
  ];

  const rows = data.minuteData.map((d) => [
    d.timestamp,
    d.date,
    d.hour,
    d.solarKW.toFixed(3),
    d.homeLoadKW.toFixed(3),
    d.ev1LoadKW.toFixed(3),
    d.ev2LoadKW.toFixed(3),
    d.batteryPowerKW.toFixed(3),
    d.batteryLevelPct.toFixed(2),
    d.gridImportKW.toFixed(3),
    d.gridExportKW.toFixed(3),
    d.tariffRate.toFixed(2),
    d.isPeakTime ? 'Yes' : 'No',
    d.savingsKES.toFixed(2),
  ]);

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

  // Download CSV
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SafariCharge_Data_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get report summary (for UI display)
 */
export function getReportSummary() {
  const data = getReportData();

  return {
    dataPoints: data.statistics.dataPoints,
    daysCovered: data.statistics.daysCovered,
    totalSolarKWh: data.statistics.totalSolarKWh,
    totalSavingsKES: data.statistics.totalSavingsKES,
    estimatedFileSize: Math.round(data.statistics.dataPoints * 0.5 / 1024), // KB
  };
}
