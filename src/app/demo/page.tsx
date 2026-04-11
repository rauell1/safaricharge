'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import type { DashboardSection } from '@/components/dashboard/DashboardSidebar';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatCards } from '@/components/dashboard/StatCards';
import { PowerFlowVisualization } from '@/components/dashboard/PowerFlowVisualization';
import { PanelStatusTable } from '@/components/dashboard/PanelStatusTable';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { TimeRangeSwitcher } from '@/components/dashboard/TimeRangeSwitcher';
import { WeatherCard } from '@/components/dashboard/WeatherCard';
import { BatteryStatusCard } from '@/components/dashboard/BatteryStatusCard';
import { InsightsBanner } from '@/components/dashboard/InsightsBanner';
import { EngineeringKpisCard } from '@/components/dashboard/EngineeringKpisCard';
import DailyEnergyGraph, { buildGraphSVG, buildJPGBlob } from '@/components/DailyEnergyGraph';
import { SystemVisualization } from '@/components/dashboard/SystemVisualization';
import { useDemoEnergySystem } from '@/hooks/useDemoEnergySystem';
import {
  useAccumulators,
  useEnergyFlows,
  useEnergyNode,
  useEnergyStats,
  useMinuteData,
  useSimulationState,
  useTimeRange,
} from '@/hooks/useEnergySystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, TrendingUp, Leaf, Car, Trees } from 'lucide-react';
import { EnergyReportModal } from '@/components/EnergyReportModal';
import type { SolarIrradianceData } from '@/lib/nasa-power-api';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { resampleTo5MinBucketsProgressive, resampleTo5MinBuckets } from '@/lib/graphSampler';
import type { SimulationMinuteRecord } from '@/types/simulation-core';

// ── Restored page components ─────────────────────────────────────────────────────────────
import FinancialDashboard from '@/components/FinancialDashboard';
import { buildFinancialSnapshot, type FinancialInputs } from '@/lib/financial-dashboard';
import { LoadConfigComponents } from '@/components/LoadConfigComponents';
import { RecommendationComponents } from '@/components/RecommendationComponents';
import { SimulationNodes } from '@/components/simulation/SimulationNodes';
import { SafariChargeAIAssistant } from '@/components/dashboard/AIAssistant';
// ─────────────────────────────────────────────────────────────────────────────

// Force dynamic rendering - no static generation
export const dynamic = 'force-dynamic';

// Default Nairobi solar data for report generation
const NAIROBI_SOLAR_DATA: SolarIrradianceData = {
  latitude: -1.2921,
  longitude: 36.8219,
  location: 'Nairobi',
  monthlyAverage: [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3],
  annualAverage: 5.4,
  monthlyTemperature: [22, 23, 24, 23, 22, 21, 20, 21, 22, 23, 22, 22],
  peakSunHours: [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3],
};

// Month labels used across the Monthly Overview chart
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

// Static fallback displayed while the simulation is still warming up (no minuteData yet).
const FALLBACK_GEN  = [65, 70, 78, 85, 90, 95, 88, 92, 80, 75, 68, 62] as const;
const FALLBACK_CONS = [55, 58, 60, 62, 65, 68, 70, 69, 65, 60, 57, 54] as const;

// ─── Location picker data ─────────────────────────────────────────────────────────────────────
interface LocationOption {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  annualAvgSunHours: number;
}

const KENYA_LOCATIONS: LocationOption[] = [
  { name: 'Nairobi',  displayName: 'Nairobi, Kenya',  latitude: -1.2921, longitude:  36.8219, annualAvgSunHours: 5.4 },
  { name: 'Mombasa',  displayName: 'Mombasa, Kenya',  latitude: -4.0435, longitude:  39.6682, annualAvgSunHours: 5.8 },
  { name: 'Kisumu',   displayName: 'Kisumu, Kenya',   latitude: -0.1022, longitude:  34.7617, annualAvgSunHours: 5.2 },
  { name: 'Nakuru',   displayName: 'Nakuru, Kenya',   latitude: -0.3031, longitude:  36.0800, annualAvgSunHours: 5.6 },
  { name: 'Eldoret',  displayName: 'Eldoret, Kenya',  latitude:  0.5143, longitude:  35.2698, annualAvgSunHours: 5.3 },
  { name: 'Thika',    displayName: 'Thika, Kenya',    latitude: -1.0332, longitude:  37.0693, annualAvgSunHours: 5.5 },
  { name: 'Malindi',  displayName: 'Malindi, Kenya',  latitude: -3.2175, longitude:  40.1169, annualAvgSunHours: 6.0 },
  { name: 'Garissa',  displayName: 'Garissa, Kenya',  latitude: -0.4532, longitude:  39.6461, annualAvgSunHours: 6.4 },
];
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Advance a YYYY-MM-DD date string by one calendar day.
 */
function addOneDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Return every YYYY-MM-DD string from startDate to endDate inclusive.
 */
function buildDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let cursor = startDate;
  // Guard: if dates are malformed or end < start, return just the start
  let safety = 0;
  while (cursor <= endDate && safety < 3660) {
    dates.push(cursor);
    cursor = addOneDay(cursor);
    safety++;
  }
  return dates;
}

export default function ModularDashboardDemo({
  initialSection = 'dashboard',
}: { initialSection?: DashboardSection } = {}) {
  useDemoEnergySystem();
  const router = useRouter();
  const { timeRange, setTimeRange } = useTimeRange();
  const { currentDate } = useSimulationState();
  const solarNode    = useEnergyNode('solar');
  const batteryNode  = useEnergyNode('battery');
  const gridNode     = useEnergyNode('grid');
  const homeNode     = useEnergyNode('home');
  const flows        = useEnergyFlows();
  const stats        = useEnergyStats(timeRange);
  const minuteData   = useMinuteData(timeRange);
  const accumulators = useAccumulators();
  const saveScenario = useEnergySystemStore((s) => s.saveScenario);
  const resetSystem  = useEnergySystemStore((s) => s.resetSystem);
  const { toast }    = useToast();

  const [activeSection, setActiveSection] = useState<DashboardSection>(initialSection);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // ─── Financial state ─────────────────────────────────────────────────────────────────────
  const [financialInputs, setFinancialInputs] = useState<FinancialInputs>({
    chargingTariffKes: 25,
    discountRatePct: 10,
    stationCount: 3,
    targetUtilizationPct: 45,
    projectYears: 20,
  });
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Location state ────────────────────────────────────────────────────────────────────────
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [activeLocation, setActiveLocation]         = useState<LocationOption>(KENYA_LOCATIONS[0]);
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Reset handler ───────────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    const confirmed = window.confirm(
      'Reset the simulation?\n\nThis will clear all accumulated energy data and restart the system from its initial state.'
    );
    if (!confirmed) return;
    resetSystem();
    toast({
      title: 'Simulation reset',
      description: 'All energy data has been cleared. The simulation is restarting.',
    });
  }, [resetSystem, toast]);
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Location picker handler ──────────────────────────────────────────────────────────────
  const handleSelectLocation = useCallback((loc: LocationOption) => {
    setActiveLocation(loc);
    setLocationPickerOpen(false);
    toast({
      title: 'Location updated',
      description: `Solar data will now reflect conditions in ${loc.displayName} (avg ${loc.annualAvgSunHours} sun-hours/day).`,
    });
  }, [toast]);
  // ─────────────────────────────────────────────────────────────────────────────

  const handleSaveScenario = useCallback((name: string) => {
    const snap = buildFinancialSnapshot({
      minuteData: minuteData as Parameters<typeof buildFinancialSnapshot>[0]['minuteData'],
      solarData: NAIROBI_SOLAR_DATA,
      inputs: financialInputs,
      evCapacityKw: 22,
    });
    saveScenario(
      name,
      {
        capexTotal:    snap.capex.total,
        npvKes:        snap.npvKes,
        irrPct:        snap.irrPct,
        lcoeKesPerKwh: snap.lcoeKesPerKwh,
        paybackYears:  snap.paybackYears,
      },
      { name: activeLocation.name, latitude: activeLocation.latitude, longitude: activeLocation.longitude }
    );
    toast({
      title: 'Scenario saved',
      description: `"${name}" has been saved. View it on the Scenarios page.`,
    });
  }, [saveScenario, toast, activeLocation, minuteData, financialInputs]);

  const latestPoint  = minuteData[minuteData.length - 1];
  const solarPower   = latestPoint?.solarKW          ?? solarNode.powerKW   ?? 0;
  const batteryPower = latestPoint?.batteryPowerKW   ?? batteryNode.powerKW ?? 0;
  const gridPower    = latestPoint
    ? latestPoint.gridImportKW - latestPoint.gridExportKW
    : gridNode.powerKW ?? 0;
  const homePower    = latestPoint
    ? latestPoint.homeLoadKW + latestPoint.ev1LoadKW + latestPoint.ev2LoadKW
    : homeNode.powerKW ?? 0;
  const batteryLevel = latestPoint?.batteryLevelPct ?? batteryNode.soc ?? 0;

  // ── Financial snapshot — computed from live minuteData ────────────────────────────────────
  const financialSnapshot = useMemo(() =>
    buildFinancialSnapshot({
      minuteData: minuteData as Parameters<typeof buildFinancialSnapshot>[0]['minuteData'],
      solarData: NAIROBI_SOLAR_DATA,
      inputs: financialInputs,
      evCapacityKw: 22,
    }),
    [minuteData, financialInputs]
  );
  // ─────────────────────────────────────────────────────────────────────────────

  // Export report as CSV
  const handleExportReport = useCallback(async () => {
    try {
      if (!minuteData || minuteData.length === 0) {
        alert('No data to export. Please wait for the simulation to generate data.');
        return;
      }

      type AggRow = {
        period: string; totalSolarKWh: number; totalHomeLoadKWh: number;
        totalEV1LoadKWh: number; totalEV2LoadKWh: number; totalGridImportKWh: number;
        totalGridExportKWh: number; avgBatteryLevelPct: number; avgEV1SocPct: number;
        avgEV2SocPct: number; totalSavingsKES: number; peakHoursCount: number;
        offPeakHoursCount: number;
      };
      const aggregate = (keyFn: (d: typeof minuteData[0]) => string): AggRow[] => {
        const groups = new Map<string, typeof minuteData>();
        for (const d of minuteData) {
          const k = keyFn(d);
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k)!.push(d);
        }
        return Array.from(groups.entries()).map(([period, items]) => {
          const c = items.length;
          return {
            period,
            totalSolarKWh:      items.reduce((s, d) => s + (d.solarEnergyKWh || 0), 0),
            totalHomeLoadKWh:   items.reduce((s, d) => s + (d.homeLoadKWh ?? (d.homeLoadKW || 0) * (24 / 420)), 0),
            totalEV1LoadKWh:    items.reduce((s, d) => s + (d.ev1LoadKWh  ?? (d.ev1LoadKW  || 0) * (24 / 420)), 0),
            totalEV2LoadKWh:    items.reduce((s, d) => s + (d.ev2LoadKWh  ?? (d.ev2LoadKW  || 0) * (24 / 420)), 0),
            totalGridImportKWh: items.reduce((s, d) => s + (d.gridImportKWh || 0), 0),
            totalGridExportKWh: items.reduce((s, d) => s + (d.gridExportKWh || 0), 0),
            avgBatteryLevelPct: c > 0 ? items.reduce((s, d) => s + (d.batteryLevelPct || 0), 0) / c : 0,
            avgEV1SocPct:       c > 0 ? items.reduce((s, d) => s + (d.ev1SocPct || 0), 0) / c : 0,
            avgEV2SocPct:       c > 0 ? items.reduce((s, d) => s + (d.ev2SocPct || 0), 0) / c : 0,
            totalSavingsKES:    items.reduce((s, d) => s + (d.savingsKES || 0), 0),
            peakHoursCount:     items.filter(d => d.isPeakTime).length,
            offPeakHoursCount:  items.filter(d => !d.isPeakTime).length,
          };
        }).sort((a, b) => a.period.localeCompare(b.period));
      };

      const hourlyData  = aggregate(d => `${d.date} ${String(d.hour).padStart(2, '0')}:00`);
      const dailyData   = aggregate(d => d.date);
      const weeklyData  = aggregate(d => `${d.year}-W${String(d.week).padStart(2, '0')}`);
      const monthlyData = aggregate(d => `${d.year}-${String(d.month).padStart(2, '0')}`);
      const yearlyData  = aggregate(d => String(d.year));

      const totalSolar      = minuteData.reduce((s, d) => s + (d.solarEnergyKWh || 0), 0);
      const totalGridImport = minuteData.reduce((s, d) => s + (d.gridImportKWh || 0), 0);
      const totalGridExport = minuteData.reduce((s, d) => s + (d.gridExportKWh || 0), 0);
      const totalSavings    = minuteData.reduce((s, d) => s + (d.savingsKES || 0), 0);
      const totalHomeLoad   = minuteData.reduce((s, d) => s + (d.homeLoadKWh ?? (d.homeLoadKW || 0) * (24 / 420)), 0);
      const totalEV1Load    = minuteData.reduce((s, d) => s + (d.ev1LoadKWh  ?? (d.ev1LoadKW  || 0) * (24 / 420)), 0);
      const totalEV2Load    = minuteData.reduce((s, d) => s + (d.ev2LoadKWh  ?? (d.ev2LoadKW  || 0) * (24 / 420)), 0);
      const totalLoad       = totalHomeLoad + totalEV1Load + totalEV2Load;

      const uniqueDays   = new Set(minuteData.map(d => d.date)).size;
      const uniqueWeeks  = new Set(minuteData.map(d => `${d.year}-W${d.week}`)).size;
      const uniqueMonths = new Set(minuteData.map(d => `${d.year}-${d.month}`)).size;
      const uniqueYears  = new Set(minuteData.map(d => d.year)).size;
      const peakCount    = minuteData.filter(d => d.isPeakTime).length;
      const offPeakCount = minuteData.filter(d => !d.isPeakTime).length;

      const parts: string[] = [];
      parts.push('SAFARICHARGE ENERGY REPORT');
      parts.push(`Generated,${new Date().toISOString()}`);
      parts.push(`Total Data Points,${minuteData.length}`);
      parts.push(`Date Range,${minuteData[0]?.date || 'N/A'},to,${minuteData[minuteData.length - 1]?.date || 'N/A'}`);
      parts.push('');
      parts.push('OVERALL SUMMARY');
      parts.push('Metric,Value,Unit');
      parts.push(`Total Solar Generated,${totalSolar.toFixed(2)},kWh`);
      parts.push(`Total Home Load,${totalHomeLoad.toFixed(2)},kWh`);
      parts.push(`Total EV1 Load,${totalEV1Load.toFixed(2)},kWh`);
      parts.push(`Total EV2 Load,${totalEV2Load.toFixed(2)},kWh`);
      parts.push(`Total Grid Import,${totalGridImport.toFixed(2)},kWh`);
      parts.push(`Total Grid Export,${totalGridExport.toFixed(2)},kWh`);
      parts.push(`Total Savings,${totalSavings.toFixed(2)},KES`);
      parts.push(`Net Energy,${(totalSolar - totalGridImport + totalGridExport).toFixed(2)},kWh`);
      parts.push(`Self-Sufficiency Rate,${totalLoad > 0 ? ((totalSolar / totalLoad) * 100).toFixed(1) : 0},%`);
      parts.push(`Unique Days Tracked,${uniqueDays},days`);
      parts.push(`Unique Weeks Tracked,${uniqueWeeks},weeks`);
      parts.push(`Unique Months Tracked,${uniqueMonths},months`);
      parts.push(`Unique Years Tracked,${uniqueYears},years`);
      parts.push(`Peak Time Records,${peakCount},records`);
      parts.push(`Off-Peak Time Records,${offPeakCount},records`);
      parts.push('');

      parts.push('MINUTE-BY-MINUTE DATA');
      parts.push('Timestamp,Date,Year,Month,Week,Day,Hour,Minute,Solar (kW),Home Load (kW),EV1 Load (kW),EV2 Load (kW),Battery Power (kW),Battery Level (%),Grid Import (kW),Grid Export (kW),EV1 SoC (%),EV2 SoC (%),Tariff Rate (KES/kWh),Peak Time,Savings (KES),Solar Energy (kWh),Grid Import (kWh),Grid Export (kWh)');
      for (const d of minuteData) {
        parts.push(`${d.timestamp},${d.date},${d.year},${d.month},${d.week},${d.day},${d.hour},${d.minute},${(d.solarKW || 0).toFixed(2)},${(d.homeLoadKW || 0).toFixed(2)},${(d.ev1LoadKW || 0).toFixed(2)},${(d.ev2LoadKW || 0).toFixed(2)},${(d.batteryPowerKW || 0).toFixed(2)},${(d.batteryLevelPct || 0).toFixed(1)},${(d.gridImportKW || 0).toFixed(2)},${(d.gridExportKW || 0).toFixed(2)},${(d.ev1SocPct || 0).toFixed(1)},${(d.ev2SocPct || 0).toFixed(1)},${(d.tariffRate || 0).toFixed(2)},${d.isPeakTime ? 'Yes' : 'No'},${(d.savingsKES || 0).toFixed(2)},${(d.solarEnergyKWh || 0).toFixed(4)},${(d.gridImportKWh || 0).toFixed(4)},${(d.gridExportKWh || 0).toFixed(4)}`);
      }
      parts.push('');

      const writeSection = (title: string, data: AggRow[], periodLabel: string) => {
        parts.push(title);
        parts.push(`${periodLabel},Total Solar (kWh),Total Home Load (kWh),Total EV1 Load (kWh),Total EV2 Load (kWh),Grid Import (kWh),Grid Export (kWh),Avg Battery (%),Avg EV1 SoC (%),Avg EV2 SoC (%),Savings (KES),Peak Count,Off-Peak Count`);
        for (const d of data) {
          parts.push(`${d.period},${d.totalSolarKWh.toFixed(2)},${d.totalHomeLoadKWh.toFixed(2)},${d.totalEV1LoadKWh.toFixed(2)},${d.totalEV2LoadKWh.toFixed(2)},${d.totalGridImportKWh.toFixed(2)},${d.totalGridExportKWh.toFixed(2)},${d.avgBatteryLevelPct.toFixed(1)},${d.avgEV1SocPct.toFixed(1)},${d.avgEV2SocPct.toFixed(1)},${d.totalSavingsKES.toFixed(2)},${d.peakHoursCount},${d.offPeakHoursCount}`);
        }
        parts.push('');
      };
      writeSection('HOURLY SUMMARY',  hourlyData,  'Period');
      writeSection('DAILY SUMMARY',   dailyData,   'Date');
      writeSection('WEEKLY SUMMARY',  weeklyData,  'Week');
      writeSection('MONTHLY SUMMARY', monthlyData, 'Month');
      writeSection('YEARLY SUMMARY',  yearlyData,  'Year');

      const csv  = parts.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `SafariCharge_Report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      const BLOB_REVOKE_DELAY_MS = 300;
      setTimeout(() => URL.revokeObjectURL(url), BLOB_REVOKE_DELAY_MS);
    } catch (error) {
      console.error('Export error:', error);
      alert(`Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  }, [minuteData]);

  // Generate formal PDF report
  const handleFormalReport = useCallback(async () => {
    let reportWindow: Window | null = null;
    try {
      if (!minuteData || minuteData.length === 0) {
        alert('No data available. Please wait for the simulation to generate data.');
        return;
      }

      reportWindow = window.open('', '_blank');
      if (!reportWindow) {
        alert('Unable to open the report. Please allow pop-ups for this site and try again.');
        return;
      }
      reportWindow.document.write('<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:#94a3b8;"><p>Generating report\u2026</p></body></html>');
      reportWindow.document.close();

      const totalSolar      = minuteData.reduce((s, d) => s + (d.solarEnergyKWh ?? 0), 0);
      const totalGridImport = minuteData.reduce((s, d) => s + (d.gridImportKWh ?? 0), 0);
      const totalGridExport = minuteData.reduce((s, d) => s + (d.gridExportKWh ?? 0), 0);
      const totalSavings    = minuteData.reduce((s, d) => s + (d.savingsKES ?? 0), 0);
      const totalHomeLoad   = minuteData.reduce((s, d) => s + (d.homeLoadKWh ?? (d.homeLoadKW ?? 0) * (24 / 420)), 0);
      const totalEV1        = minuteData.reduce((s, d) => s + (d.ev1LoadKWh ?? (d.ev1LoadKW ?? 0) * (24 / 420)), 0);
      const totalEV2        = minuteData.reduce((s, d) => s + (d.ev2LoadKWh ?? (d.ev2LoadKW ?? 0) * (24 / 420)), 0);
      let peakGridImport = 0, peakInstantSolar = 0, peakEVLoad = 0;
      let batterySum = 0;
      const peakBreakdown    = { records: 0, solar: 0, gridImport: 0, gridExport: 0, savings: 0, homeLoad: 0, evLoad: 0 };
      const offPeakBreakdown = { records: 0, solar: 0, gridImport: 0, gridExport: 0, savings: 0, homeLoad: 0, evLoad: 0 };
      for (const d of minuteData) {
        const isPeak        = Boolean(d.isPeakTime);
        const gi            = d.gridImportKW ?? 0;
        if (gi > peakGridImport)     peakGridImport    = gi;
        const sk            = d.solarKW ?? 0;
        if (sk > peakInstantSolar)   peakInstantSolar  = sk;
        const ev            = (d.ev1LoadKW ?? 0) + (d.ev2LoadKW ?? 0);
        if (ev > peakEVLoad)         peakEVLoad        = ev;
        const solarEnergy       = d.solarEnergyKWh ?? 0;
        const gridImportEnergy  = d.gridImportKWh  ?? 0;
        const gridExportEnergy  = d.gridExportKWh  ?? 0;
        const homeEnergy        = d.homeLoadKWh ?? (d.homeLoadKW ?? 0) * (24 / 420);
        const evEnergy          = (d.ev1LoadKWh ?? (d.ev1LoadKW ?? 0) * (24 / 420)) + (d.ev2LoadKWh ?? (d.ev2LoadKW ?? 0) * (24 / 420));
        const target = isPeak ? peakBreakdown : offPeakBreakdown;
        target.records    += 1;
        target.solar      += solarEnergy;
        target.gridImport += gridImportEnergy;
        target.gridExport += gridExportEnergy;
        target.savings    += d.savingsKES ?? 0;
        target.homeLoad   += homeEnergy;
        target.evLoad     += evEnergy;
        batterySum += d.batteryLevelPct ?? 0;
      }
      const avgBattery = minuteData.length > 0 ? batterySum / minuteData.length : 0;
      const peakSolar  = peakBreakdown.solar;

      const dailyMap = new Map<string, {date: string; solar: number; gridImport: number; gridExport: number; savings: number; homeLoad: number; evLoad: number; ev1Load: number; ev2Load: number; avgBattery: number; batteryCount: number}>();
      for (const d of minuteData) {
        if (!dailyMap.has(d.date)) {
          dailyMap.set(d.date, { date: d.date, solar: 0, gridImport: 0, gridExport: 0, savings: 0, homeLoad: 0, evLoad: 0, ev1Load: 0, ev2Load: 0, avgBattery: 0, batteryCount: 0 });
        }
        const a = dailyMap.get(d.date)!;
        a.solar      += d.solarEnergyKWh ?? 0;
        a.gridImport += d.gridImportKWh  ?? 0;
        a.gridExport += d.gridExportKWh  ?? 0;
        a.savings    += d.savingsKES     ?? 0;
        a.homeLoad   += d.homeLoadKWh ?? (d.homeLoadKW ?? 0) * (24 / 420);
        a.ev1Load    += d.ev1LoadKWh  ?? (d.ev1LoadKW  ?? 0) * (24 / 420);
        a.ev2Load    += d.ev2LoadKWh  ?? (d.ev2LoadKW  ?? 0) * (24 / 420);
        a.evLoad     += (d.ev1LoadKWh ?? (d.ev1LoadKW ?? 0) * (24 / 420)) + (d.ev2LoadKWh ?? (d.ev2LoadKW ?? 0) * (24 / 420));
        a.avgBattery   += d.batteryLevelPct ?? 0;
        a.batteryCount += 1;
      }
      const dailyAgg = Array.from(dailyMap.values())
        .map(r => ({ ...r, avgBattery: r.batteryCount > 0 ? r.avgBattery / r.batteryCount : 0 }))
        .sort((a, b) => a.date.localeCompare(b.date));
      const uniqueDays    = dailyAgg.length;
      const dailyAggCharts = dailyAgg.slice(-30);

      const { createLoadProfileFromSimulation, generateRecommendation } = await import('@/lib/recommendation-engine');
      const loadProfile   = createLoadProfileFromSimulation(minuteData);
      const recommendation = generateRecommendation(loadProfile, NAIROBI_SOLAR_DATA, {
        batteryPreference: 'auto',
        gridBackupRequired: true,
        autonomyDays: 1.5,
      });

      const startDate = minuteData[0]?.date ?? new Date().toISOString().slice(0, 10);
      const response  = await fetch('/api/formal-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preAggregated: true,
          startDate,
          reportDate: new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }),
          dateFrom: minuteData[0]?.date ?? startDate,
          dateTo:   minuteData[minuteData.length - 1]?.date ?? startDate,
          totalDataPoints: minuteData.length,
          totalSolar, totalGridImport, totalGridExport, totalSavings,
          totalHomeLoad, totalEV1, totalEV2,
          peakSolar, peakGridImport, avgBattery,
          peakInstantSolar, peakEVLoad,
          peakBreakdown, offPeakBreakdown,
          uniqueDays,
          dailyAgg: dailyAggCharts,
          recommendation,
          financial: {
            capexTotal:       financialSnapshot.capex.total,
            npvKes:           financialSnapshot.npvKes,
            irrPct:           financialSnapshot.irrPct,
            lcoeKesPerKwh:    financialSnapshot.lcoeKesPerKwh,
            paybackYears:     financialSnapshot.paybackYears,
            annualSavingsKes: financialSnapshot.revenueMonthly * 12,
          },
        }),
      });

      if (!response.ok) {
        const fallback  = `HTTP ${response.status}`;
        const rawError  = await response.text().catch(() => '');
        let parsedMessage = fallback;
        if (rawError) {
          try {
            const errorData = JSON.parse(rawError) as { error?: string; message?: string; details?: string };
            parsedMessage   = errorData.error || errorData.message || fallback;
            if (errorData.details && errorData.details !== parsedMessage) {
              parsedMessage = `${parsedMessage}: ${errorData.details}`;
            }
          } catch {
            const textOnly = rawError.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            if (textOnly) parsedMessage = textOnly.slice(0, 180);
          }
        }
        reportWindow.close();
        throw new Error(parsedMessage);
      }

      const html    = await response.text();
      const blob    = new Blob([html], { type: 'text/html; charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      reportWindow.location.href = blobUrl;
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } catch (error) {
      if (reportWindow && !reportWindow.closed) reportWindow.close();
      console.error('Formal report error:', error);
      alert(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  }, [minuteData, financialSnapshot]);

  // ── Download charts ZIP ─────────────────────────────────────────────────────────────────────────────
  //
  // Generates one chart image per calendar day starting from the very first
  // day recorded in minuteData through the last, regardless of the current
  // time-range filter or how far the simulation has progressed.
  //
  // Days that have no minuteData entries still receive a chart image (the
  // graph will render with all-zero values so the file is present).
  //
  const handleDownloadCharts = useCallback(async () => {
    if (!minuteData || minuteData.length === 0) {
      alert('No data to chart. Please wait for the simulation to generate data.');
      return;
    }

    try {
      // 1. Index all minuteData by date
      const byDate = new Map<string, typeof minuteData>();
      for (const d of minuteData) {
        if (!byDate.has(d.date)) byDate.set(d.date, []);
        byDate.get(d.date)!.push(d);
      }

      // 2. Build the full calendar range: first day → last day (inclusive)
      const allDates = Array.from(byDate.keys()).sort();
      const firstDate = allDates[0];
      const lastDate  = allDates[allDates.length - 1];
      const dateRange = buildDateRange(firstDate, lastDate);

      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const chartsFolder = zip.folder('SafariCharge_Charts')!;

      // 3. Render a chart for every date in the range, even missing ones
      for (const date of dateRange) {
        const dayData    = byDate.get(date) ?? [];   // [] for missing days
        const graphPoints = resampleTo5MinBuckets(dayData);
        // graphPoints is always 288 entries (all-zero when dayData is empty)
        const svgStr  = buildGraphSVG(graphPoints, date);
        const jpgBlob = await buildJPGBlob(svgStr, 820, 340);
        chartsFolder.file(`SafariCharge_${date}.jpg`, jpgBlob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SafariCharge_Charts_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch (err) {
      console.error('Charts ZIP error:', err);
      alert(`Failed to build charts ZIP: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [minuteData]);
  // ─────────────────────────────────────────────────────────────────────────────

  const flowDirection = useMemo(() => ({
    solarToHome:    flows.some((f) => f.from === 'solar'   && f.to === 'home'    && f.active),
    solarToBattery: flows.some((f) => f.from === 'solar'   && f.to === 'battery' && f.active),
    solarToGrid:    flows.some((f) => f.from === 'solar'   && f.to === 'grid'    && f.active),
    batteryToHome:  flows.some((f) => f.from === 'battery' && f.to === 'home'    && f.active),
    gridToHome:     flows.some((f) => f.from === 'grid'    && f.to === 'home'    && f.active),
  }), [flows]);

  const graphData = useMemo(
    () => resampleTo5MinBucketsProgressive(minuteData),
    [minuteData]
  );

  const energySplit = useMemo(() => {
    const totalEnergy = stats.totalSolarKWh + stats.totalConsumptionKWh + stats.totalGridExportKWh;
    if (!totalEnergy) return { solarPct: 0, consumptionPct: 0, exportPct: 0 };
    return {
      solarPct:       stats.totalSolarKWh         / totalEnergy,
      consumptionPct: stats.totalConsumptionKWh   / totalEnergy,
      exportPct:      stats.totalGridExportKWh    / totalEnergy,
    };
  }, [stats]);

  const envImpact = useMemo(() => ([
    { icon: Leaf,  value: `${(accumulators.carbonOffset / 1000).toFixed(2)} tons`, label: 'CO\u2082 Offset (Year)',  color: 'var(--battery)',     tint: 'var(--battery-soft)'     },
    { icon: Trees, value: Math.round(accumulators.carbonOffset / 14).toString(),   label: 'Trees Equivalent',      color: 'var(--solar)',        tint: 'var(--solar-soft)'        },
    { icon: Car,   value: `${Math.round(accumulators.carbonOffset * 1.6)} km`,     label: 'Car Miles Offset',      color: 'var(--consumption)', tint: 'var(--consumption-soft)' },
  ]), [accumulators]);

  const ringSegments = useMemo(() => {
    const circumference = 2 * Math.PI * 48;
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    return {
      circumference,
      solar:       clamp(energySplit.solarPct)       * circumference,
      consumption: clamp(energySplit.consumptionPct) * circumference,
      export:      clamp(energySplit.exportPct)      * circumference,
    };
  }, [energySplit]);

  const sparklineData = useMemo(() => {
    const last7Days = minuteData.slice(-7 * 420);
    const dailyData: { gen: number[]; power: number[]; cons: number[]; savings: number[] } = {
      gen: [], power: [], cons: [], savings: []
    };
    for (let i = 0; i < 7; i++) {
      const dayData = last7Days.slice(i * 420, (i + 1) * 420);
      if (dayData.length > 0) {
        dailyData.gen.push(dayData.reduce((sum, d) => sum + d.solarEnergyKWh, 0));
        dailyData.cons.push(dayData.reduce((sum, d) => sum + (d.homeLoadKWh ?? 0) + (d.ev1LoadKWh ?? 0) + (d.ev2LoadKWh ?? 0), 0));
        dailyData.savings.push(dayData.reduce((sum, d) => sum + d.savingsKES, 0));
        dailyData.power.push(dayData.reduce((sum, d) => sum + d.solarKW, 0) / dayData.length);
      }
    }
    return dailyData;
  }, [minuteData]);

  const sidebarMetrics = useMemo(() => [
    {
      label: 'Solar Power',
      value: `${solarPower.toFixed(1)} kW`,
      tone: 'solar' as const,
    },
    {
      label: 'Battery',
      value: `${batteryLevel.toFixed(0)}%`,
      tone: 'battery' as const,
    },
    {
      label: 'Grid',
      value: gridPower > 0 ? `+${gridPower.toFixed(1)} kW` : `${gridPower.toFixed(1)} kW`,
      tone: 'grid' as const,
    },
    {
      label: 'Savings',
      value: `KES ${Math.round(stats.totalSavingsKES).toLocaleString()}`,
      tone: 'neutral' as const,
    },
  ], [solarPower, batteryLevel, gridPower, stats.totalSavingsKES]);

  const trendsData = useMemo(() => {
    const weekData      = minuteData.slice(-7 * 420);
    const yesterdayData = minuteData.slice(-2 * 420, -420);
    const weeklyAvgGen  = weekData.length > 0
      ? weekData.reduce((sum, d) => sum + d.solarEnergyKWh, 0) / 7 : 0;
    const weeklyAvgCons = weekData.length > 0
      ? weekData.reduce((sum, d) => sum + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh, 0) / 7 : 0;
    const yesterdaySavings = yesterdayData.length > 0
      ? yesterdayData.reduce((sum, d) => sum + d.savingsKES, 0) : 0;
    const usefulEnergy     = Math.min(homePower, solarPower) + (batteryPower > 0 ? Math.min(batteryPower, solarPower - homePower) : 0);
    const systemEfficiency = solarPower > 0 ? (usefulEnergy / solarPower) * 100 : 0;
    const savingsChange    = yesterdaySavings > 0
      ? ((stats.totalSavingsKES - yesterdaySavings) / yesterdaySavings) * 100 : 0;
    const now          = new Date();
    const isPeakHour   = now.getHours() >= 18 && now.getHours() <= 22;
    const batteryOptimized = isPeakHour ? batteryLevel > 70 : batteryLevel > 50;
    return {
      weeklyAvgGen, weeklyAvgCons, yesterdaySavings,
      systemEfficiency, savingsChange, batteryOptimized,
      forecastChange: 10,
    };
  }, [minuteData, stats, solarPower, homePower, batteryPower, batteryLevel]);

  const monthlyOverviewData = useMemo(() => {
    if (minuteData.length === 0) {
      return MONTH_LABELS.map((label, i) => ({
        label, gen: FALLBACK_GEN[i], cons: FALLBACK_CONS[i], isFallback: true,
      }));
    }
    const genByMonth  = new Array(12).fill(0) as number[];
    const consByMonth = new Array(12).fill(0) as number[];
    for (const d of minuteData) {
      const idx = (d.month - 1 + 12) % 12;
      genByMonth[idx]  += d.solarEnergyKWh ?? 0;
      consByMonth[idx] +=
        (d.homeLoadKWh ?? (d.homeLoadKW ?? 0) * (1 / 60)) +
        (d.ev1LoadKWh  ?? (d.ev1LoadKW  ?? 0) * (1 / 60)) +
        (d.ev2LoadKWh  ?? (d.ev2LoadKW  ?? 0) * (1 / 60));
    }
    const maxVal = Math.max(...genByMonth, ...consByMonth, 1);
    return MONTH_LABELS.map((label, i) => ({
      label,
      gen:      (genByMonth[i]  / maxVal) * 100,
      cons:     (consByMonth[i] / maxVal) * 100,
      genKWh:   genByMonth[i],
      consKWh:  consByMonth[i],
      isFallback: false,
    }));
  }, [minuteData]);

  const isMonthlyFallback = monthlyOverviewData[0]?.isFallback ?? true;

  // ─────────────────────────────────────────────────────────────────────────────

  // ── Section renderer ────────────────────────────────────────────────────────────────────────
  const renderSection = () => {
    switch (activeSection) {
      case 'simulation':
        return (
          <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Simulation</h2>
                <p className="text-sm text-[var(--text-tertiary)]">Core physics engine, scenario controls and system visualisation</p>
              </div>
              <SimulationNodes />
            </div>
          </main>
        );

      case 'configuration':
        return (
          <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">System Configuration</h2>
                <p className="text-sm text-[var(--text-tertiary)]">Configure solar panels, battery, EV chargers and load profiles</p>
              </div>
              <LoadConfigComponents />
            </div>
          </main>
        );

      case 'financial':
        return (
          <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Financial Analysis</h2>
                <p className="text-sm text-[var(--text-tertiary)]">CAPEX, LCOE, NPV, IRR and payback period analysis</p>
              </div>
              <FinancialDashboard
                snapshot={financialSnapshot}
                inputs={financialInputs}
                onInputsChange={setFinancialInputs}
                hasSimulationData={minuteData.length > 0}
              />
            </div>
          </main>
        );

      case 'ai-assistant':
        return (
          <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">AI Assistant</h2>
                <p className="text-sm text-[var(--text-tertiary)]">Ask questions about your live energy system</p>
              </div>
              <SafariChargeAIAssistant
                isOpen={true}
                onClose={() => setActiveSection('dashboard')}
                data={null}
                timeOfDay={currentDate ? currentDate.getHours() + currentDate.getMinutes() / 60 : 12}
                weather="clear"
                currentDate={currentDate ?? new Date()}
                isAutoMode={true}
                minuteData={minuteData as SimulationMinuteRecord[]}
                systemConfig={{
                  mode: 'auto',
                  panelCount: 20,
                  panelWatt: 500,
                  inverterKw: 10,
                  inverterUnits: 1,
                  batteryKwh: 50,
                  maxChargeKw: 5,
                  maxDischargeKw: 5,
                  evChargerKw: 7.4,
                  loadScale: 1,
                  loadProfile: 'residential',
                  evCommuterScale: 1,
                  evFleetScale: 1,
                  homeLoadEnabled: true,
                  homeLoadKw: 3,
                  commercialLoadEnabled: false,
                  commercialLoadKw: 0,
                  industrialLoadEnabled: false,
                  industrialLoadKw: 0,
                  accessoryLoadKw: 0,
                  accessoryScale: 1,
                  pvCapacityKw: 10,
                }}
              />
            </div>
          </main>
        );

      case 'recommendation':
        return (
          <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Get Recommendation</h2>
                <p className="text-sm text-[var(--text-tertiary)]">AI-powered system sizing and configuration recommendations</p>
              </div>
              <RecommendationComponents solarData={NAIROBI_SOLAR_DATA} minuteData={minuteData as SimulationMinuteRecord[]} />
            </div>
          </main>
        );

      // 'dashboard' and 'scenarios' fall through to the default dashboard view
      case 'scenarios':
        router.push('/scenarios');
        return null;

      default:
        return (
          <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)]">Energy Dashboard</h2>
                  <p className="text-sm text-[var(--text-tertiary)]">Monitor your solar energy system performance</p>
                </div>
                <TimeRangeSwitcher selectedRange={timeRange} onRangeChange={setTimeRange} />
              </div>

              <InsightsBanner
                systemEfficiency={trendsData.systemEfficiency}
                todaySavings={stats.totalSavingsKES}
                savingsChange={trendsData.savingsChange}
                forecastChange={trendsData.forecastChange}
                batteryOptimized={trendsData.batteryOptimized}
                alertCount={3}
              />

              <StatCards
                totalGeneration={Number(stats.totalSolarKWh.toFixed(1))}
                currentPower={Number(solarPower.toFixed(1))}
                consumption={Number(stats.totalConsumptionKWh.toFixed(1))}
                savings={Math.round(stats.totalSavingsKES)}
                generationHistory={sparklineData.gen}
                powerHistory={sparklineData.power}
                consumptionHistory={sparklineData.cons}
                savingsHistory={sparklineData.savings}
                weeklyAvgGeneration={trendsData.weeklyAvgGen}
                weeklyAvgConsumption={trendsData.weeklyAvgCons}
                yesterdaySavings={trendsData.yesterdaySavings}
              />

              <Card className="dashboard-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                    <Leaf className="h-5 w-5 text-[var(--battery)]" />
                    Environmental Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {envImpact.map(({ icon: Icon, value, label, color, tint }) => (
                      <div
                        key={label}
                        className="flex items-center gap-4 rounded-xl border p-4 transition-all duration-200 hover:-translate-y-0.5"
                        style={{ backgroundColor: tint, borderColor: 'var(--border)' }}
                      >
                        <div
                          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border"
                          style={{ backgroundColor: tint, borderColor: 'var(--border-strong)' }}
                        >
                          <Icon className="h-5 w-5" style={{ color }} />
                        </div>
                        <div>
                          <div className="text-xl font-bold" style={{ color }}>{value}</div>
                          <div className="text-xs text-[var(--text-secondary)]">{label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <PowerFlowVisualization
                solarPower={solarPower}
                batteryPower={batteryPower}
                gridPower={gridPower}
                homePower={homePower}
                batteryLevel={batteryLevel}
                flowDirection={flowDirection}
                detailBasePath="/demo"
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="dashboard-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                        <TrendingUp className="h-5 w-5 text-[var(--battery)]" />
                        Generation vs Consumption
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <DailyEnergyGraph data={graphData} dateLabel={currentDate?.toISOString().slice(0, 10)} />
                    </CardContent>
                  </Card>
                </div>
                <div>
                  <Card className="dashboard-card h-full">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                        <PieChart className="h-5 w-5 text-[var(--grid)]" />
                        Energy Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-col items-center justify-center py-6 gap-5">
                        <div className="relative flex h-40 w-40 items-center justify-center">
                          <div className="absolute inset-0 rounded-full bg-[var(--bg-card-muted)]" />
                          <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full -rotate-90">
                            <circle cx="60" cy="60" r="48" fill="none" stroke="var(--solar)" strokeWidth="14"
                              strokeDasharray={`${ringSegments.solar} ${ringSegments.circumference}`} strokeLinecap="round" opacity="0.9" />
                            <circle cx="60" cy="60" r="48" fill="none" stroke="var(--consumption)" strokeWidth="14"
                              strokeDasharray={`${ringSegments.consumption} ${ringSegments.circumference}`}
                              strokeDashoffset={`${-ringSegments.solar}`} strokeLinecap="round" opacity="0.9" />
                            <circle cx="60" cy="60" r="48" fill="none" stroke="var(--grid)" strokeWidth="14"
                              strokeDasharray={`${ringSegments.export} ${ringSegments.circumference}`}
                              strokeDashoffset={`${-(ringSegments.solar + ringSegments.consumption)}`} strokeLinecap="round" opacity="0.9" />
                          </svg>
                          <div className="text-center z-10">
                            <div className="text-xl font-bold text-[var(--text-primary)]">
                              {Math.round(energySplit.solarPct * 100)}%
                            </div>
                            <div className="text-[10px] text-[var(--text-tertiary)]">Solar</div>
                          </div>
                        </div>
                        <div className="w-full space-y-2">
                          {[
                            { label: 'Solar Generation', pct: Math.round(energySplit.solarPct * 100),       color: 'var(--solar)' },
                            { label: 'Consumption',       pct: Math.round(energySplit.consumptionPct * 100), color: 'var(--consumption)' },
                            { label: 'Grid Export',        pct: Math.round(energySplit.exportPct * 100),      color: 'var(--grid)' },
                          ].map(item => (
                            <div key={item.label} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-xs text-[var(--text-secondary)]">{item.label}</span>
                              </div>
                              <span className="text-xs font-semibold text-[var(--text-primary)]">{item.pct}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <PanelStatusTable />
                </div>
                <div className="flex flex-col gap-6">
                  <WeatherCard locationName={activeLocation.displayName} />
                  <BatteryStatusCard
                    batteryLevel={batteryLevel}
                    batteryPower={batteryPower}
                    isCharging={batteryPower >= 0}
                  />
                </div>
              </div>

              <SystemVisualization />

              <Card className="dashboard-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                    <BarChart3 className="h-5 w-5 text-[var(--consumption)]" />
                    Monthly Overview
                    {isMonthlyFallback && (
                      <span className="ml-2 text-xs font-normal text-[var(--text-tertiary)] italic">
                        (warming up…)
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between gap-2 h-44 px-2">
                    {monthlyOverviewData.map(({ label, gen, cons, isFallback }) => (
                      <div key={label} className="flex-1 flex flex-col items-center gap-1">
                        <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: '140px' }}>
                          <div
                            className="w-2.5 rounded-t-sm bg-gradient-to-t from-[var(--solar-soft)] to-[var(--solar)] transition-all duration-500 hover:opacity-100"
                            style={{ height: `${(gen / 100) * 140}px`, opacity: isFallback ? 0.35 : 0.9 }}
                            title={`Generation: ${gen.toFixed(1)} ${isFallback ? '(placeholder)' : 'kWh'}`}
                          />
                          <div
                            className="w-2.5 rounded-t-sm bg-gradient-to-t from-[var(--consumption-soft)] to-[var(--consumption)] transition-all duration-500 hover:opacity-100"
                            style={{ height: `${(cons / 100) * 140}px`, opacity: isFallback ? 0.3 : 0.8 }}
                            title={`Consumption: ${cons.toFixed(1)} ${isFallback ? '(placeholder)' : 'kWh'}`}
                          />
                        </div>
                        <span className="text-[10px] text-[var(--text-tertiary)]">{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-6">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--solar)' }} />
                      <span className="text-xs text-[var(--text-secondary)]">Generation (kWh)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'var(--consumption)' }} />
                      <span className="text-xs text-[var(--text-secondary)]">Consumption (kWh)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Engineering KPIs */}
              <EngineeringKpisCard />

              {/* Alerts — live from store */}
              <AlertsList />
            </div>
          </main>
        );
    }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout activeSection={activeSection} onSectionChange={setActiveSection} contextualMetrics={sidebarMetrics}>
      <Toaster />

      {/* ── Location Picker Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={locationPickerOpen} onOpenChange={setLocationPickerOpen}>
        <DialogContent className="bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-primary)] max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[var(--solar)]" />
              Select Location
            </DialogTitle>
            <DialogDescription className="text-[var(--text-secondary)]">
              Choose a Kenyan city to calibrate solar irradiance data for the simulation.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex flex-col gap-1.5">
            {KENYA_LOCATIONS.map((loc) => (
              <Button
                key={loc.name}
                variant="ghost"
                onClick={() => handleSelectLocation(loc)}
                className={[
                  'justify-between rounded-lg px-3 py-2 text-sm transition-all duration-150',
                  activeLocation.name === loc.name
                    ? 'bg-[var(--solar-soft)] text-[var(--solar)] font-semibold'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)]',
                ].join(' ')}
              >
                <span>{loc.displayName}</span>
                <span className="text-xs text-[var(--text-tertiary)]">{loc.annualAvgSunHours} sun-hrs/day</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      {/* ───────────────────────────────────────────────────────────────────────────── */}

      <EnergyReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        savings={stats.totalSavingsKES}
        solarConsumed={stats.totalSolarKWh}
        gridImport={stats.totalGridImportKWh ?? 0}
        minuteData={minuteData}
        systemStartDate={minuteData[0]?.date ?? new Date().toISOString().slice(0, 10)}
        onExport={handleExportReport}
        onFormalReport={handleFormalReport}
        onDownloadCharts={handleDownloadCharts}
        carbonOffset={accumulators.carbonOffset}
      />
      <DashboardHeader
        currentDate={currentDate}
        onReset={handleReset}
        onLocationClick={() => setLocationPickerOpen(true)}
        onDownload={() => setIsReportOpen(true)}
        onSaveScenario={handleSaveScenario}
        locationName={activeLocation.displayName}
        notificationCount={3}
      />

      {renderSection()}
    </DashboardLayout>
  );
}
