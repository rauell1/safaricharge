'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatCards } from '@/components/dashboard/StatCards';
import { PowerFlowVisualization } from '@/components/dashboard/PowerFlowVisualization';
import { PanelStatusTable } from '@/components/dashboard/PanelStatusTable';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { TimeRangeSwitcher } from '@/components/dashboard/TimeRangeSwitcher';
import { WeatherCard } from '@/components/dashboard/WeatherCard';
import { BatteryStatusCard } from '@/components/dashboard/BatteryStatusCard';
import { InsightsBanner } from '@/components/dashboard/InsightsBanner';
import DailyEnergyGraph from '@/components/DailyEnergyGraph';
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
  useEngineeringKPIs,
} from '@/hooks/useEnergySystem';
import { EngineeringKPICard } from '@/components/dashboard/EngineeringKPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, TrendingUp, Leaf, Car, Trees } from 'lucide-react';
import { EnergyReportModal } from '@/components/EnergyReportModal';
import type { SolarIrradianceData } from '@/lib/nasa-power-api';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

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

export default function ModularDashboardDemo() {
  useDemoEnergySystem();
  const { timeRange, setTimeRange } = useTimeRange();
  const { currentDate } = useSimulationState();
  const solarNode = useEnergyNode('solar');
  const batteryNode = useEnergyNode('battery');
  const gridNode = useEnergyNode('grid');
  const homeNode = useEnergyNode('home');
  const flows = useEnergyFlows();
  const stats = useEnergyStats(timeRange);
  const minuteData = useMinuteData(timeRange);
  const accumulators = useAccumulators();
  const engineeringKPIs = useEngineeringKPIs();
  const saveScenario = useEnergySystemStore((s) => s.saveScenario);
  const { toast } = useToast();

  const [isReportOpen, setIsReportOpen] = useState(false);

  const handleSaveScenario = useCallback((name: string) => {
    saveScenario(
      name,
      {
        capexTotal: 0,
        npvKes: 0,
        irrPct: 0,
        lcoeKesPerKwh: 0,
        paybackYears: 0,
      },
      { name: 'Nairobi', latitude: -1.2921, longitude: 36.8219 }
    );
    toast({
      title: 'Scenario saved',
      description: `"${name}" has been saved. View it on the Scenarios page.`,
    });
  }, [saveScenario, toast]);

  const latestPoint = minuteData[minuteData.length - 1];
  const solarPower = latestPoint?.solarKW ?? solarNode.powerKW ?? 0;
  const batteryPower = latestPoint?.batteryPowerKW ?? batteryNode.powerKW ?? 0;
  const gridPower = latestPoint ? latestPoint.gridImportKW - latestPoint.gridExportKW : gridNode.powerKW ?? 0;
  const homePower = latestPoint
    ? latestPoint.homeLoadKW + latestPoint.ev1LoadKW + latestPoint.ev2LoadKW
    : homeNode.powerKW ?? 0;
  const batteryLevel = latestPoint?.batteryLevelPct ?? batteryNode.soc ?? 0;

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
            totalSolarKWh: items.reduce((s, d) => s + (d.solarEnergyKWh || 0), 0),
            totalHomeLoadKWh: items.reduce((s, d) => s + (d.homeLoadKWh ?? (d.homeLoadKW || 0) * (24 / 420)), 0),
            totalEV1LoadKWh: items.reduce((s, d) => s + (d.ev1LoadKWh ?? (d.ev1LoadKW || 0) * (24 / 420)), 0),
            totalEV2LoadKWh: items.reduce((s, d) => s + (d.ev2LoadKWh ?? (d.ev2LoadKW || 0) * (24 / 420)), 0),
            totalGridImportKWh: items.reduce((s, d) => s + (d.gridImportKWh || 0), 0),
            totalGridExportKWh: items.reduce((s, d) => s + (d.gridExportKWh || 0), 0),
            avgBatteryLevelPct: c > 0 ? items.reduce((s, d) => s + (d.batteryLevelPct || 0), 0) / c : 0,
            avgEV1SocPct: c > 0 ? items.reduce((s, d) => s + (d.ev1SocPct || 0), 0) / c : 0,
            avgEV2SocPct: c > 0 ? items.reduce((s, d) => s + (d.ev2SocPct || 0), 0) / c : 0,
            totalSavingsKES: items.reduce((s, d) => s + (d.savingsKES || 0), 0),
            peakHoursCount: items.filter(d => d.isPeakTime).length,
            offPeakHoursCount: items.filter(d => !d.isPeakTime).length,
          };
        }).sort((a, b) => a.period.localeCompare(b.period));
      };

      const hourlyData = aggregate(d => `${d.date} ${String(d.hour).padStart(2, '0')}:00`);
      const dailyData = aggregate(d => d.date);
      const weeklyData = aggregate(d => `${d.year}-W${String(d.week).padStart(2, '00')}`);
      const monthlyData = aggregate(d => `${d.year}-${String(d.month).padStart(2, '0')}`);
      const yearlyData = aggregate(d => String(d.year));

      const totalSolar = minuteData.reduce((s, d) => s + (d.solarEnergyKWh || 0), 0);
      const totalGridImport = minuteData.reduce((s, d) => s + (d.gridImportKWh || 0), 0);
      const totalGridExport = minuteData.reduce((s, d) => s + (d.gridExportKWh || 0), 0);
      const totalSavings = minuteData.reduce((s, d) => s + (d.savingsKES || 0), 0);
      const totalHomeLoad = minuteData.reduce((s, d) => s + (d.homeLoadKWh ?? (d.homeLoadKW || 0) * (24 / 420)), 0);
      const totalEV1Load = minuteData.reduce((s, d) => s + (d.ev1LoadKWh ?? (d.ev1LoadKW || 0) * (24 / 420)), 0);
      const totalEV2Load = minuteData.reduce((s, d) => s + (d.ev2LoadKWh ?? (d.ev2LoadKW || 0) * (24 / 420)), 0);
      const totalLoad = totalHomeLoad + totalEV1Load + totalEV2Load;

      const uniqueDays = new Set(minuteData.map(d => d.date)).size;
      const uniqueWeeks = new Set(minuteData.map(d => `${d.year}-W${d.week}`)).size;
      const uniqueMonths = new Set(minuteData.map(d => `${d.year}-${d.month}`)).size;
      const uniqueYears = new Set(minuteData.map(d => d.year)).size;
      const peakCount = minuteData.filter(d => d.isPeakTime).length;
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
      writeSection('HOURLY SUMMARY', hourlyData, 'Period');
      writeSection('DAILY SUMMARY', dailyData, 'Date');
      writeSection('WEEKLY SUMMARY', weeklyData, 'Week');
      writeSection('MONTHLY SUMMARY', monthlyData, 'Month');
      writeSection('YEARLY SUMMARY', yearlyData, 'Year');

      const csv = parts.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
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

      const totalSolar = minuteData.reduce((s, d) => s + (d.solarEnergyKWh ?? 0), 0);
      const totalGridImport = minuteData.reduce((s, d) => s + (d.gridImportKWh ?? 0), 0);
      const totalGridExport = minuteData.reduce((s, d) => s + (d.gridExportKWh ?? 0), 0);
      const totalSavings = minuteData.reduce((s, d) => s + (d.savingsKES ?? 0), 0);
      const totalHomeLoad = minuteData.reduce((s, d) => s + (d.homeLoadKWh ?? (d.homeLoadKW ?? 0) * (24 / 420)), 0);
      const totalEV1 = minuteData.reduce((s, d) => s + (d.ev1LoadKWh ?? (d.ev1LoadKW ?? 0) * (24 / 420)), 0);
      const totalEV2 = minuteData.reduce((s, d) => s + (d.ev2LoadKWh ?? (d.ev2LoadKW ?? 0) * (24 / 420)), 0);
      let peakGridImport = 0, peakInstantSolar = 0, peakEVLoad = 0;
      let batterySum = 0;
      const peakBreakdown = { records: 0, solar: 0, gridImport: 0, gridExport: 0, savings: 0, homeLoad: 0, evLoad: 0 };
      const offPeakBreakdown = { records: 0, solar: 0, gridImport: 0, gridExport: 0, savings: 0, homeLoad: 0, evLoad: 0 };
      for (const d of minuteData) {
        const isPeak = Boolean(d.isPeakTime);
        const gi = d.gridImportKW ?? 0;
        if (gi > peakGridImport) peakGridImport = gi;
        const sk = d.solarKW ?? 0;
        if (sk > peakInstantSolar) peakInstantSolar = sk;
        const ev = (d.ev1LoadKW ?? 0) + (d.ev2LoadKW ?? 0);
        if (ev > peakEVLoad) peakEVLoad = ev;
        const solarEnergy = d.solarEnergyKWh ?? 0;
        const gridImportEnergy = d.gridImportKWh ?? 0;
        const gridExportEnergy = d.gridExportKWh ?? 0;
        const homeEnergy = d.homeLoadKWh ?? (d.homeLoadKW ?? 0) * (24 / 420);
        const evEnergy = (d.ev1LoadKWh ?? (d.ev1LoadKW ?? 0) * (24 / 420)) + (d.ev2LoadKWh ?? (d.ev2LoadKW ?? 0) * (24 / 420));
        const target = isPeak ? peakBreakdown : offPeakBreakdown;
        target.records += 1;
        target.solar += solarEnergy;
        target.gridImport += gridImportEnergy;
        target.gridExport += gridExportEnergy;
        target.savings += d.savingsKES ?? 0;
        target.homeLoad += homeEnergy;
        target.evLoad += evEnergy;
        batterySum += d.batteryLevelPct ?? 0;
      }
      const avgBattery = minuteData.length > 0 ? batterySum / minuteData.length : 0;
      const peakSolar = peakBreakdown.solar;

      const dailyMap = new Map<string, {date: string; solar: number; gridImport: number; gridExport: number; savings: number; homeLoad: number; evLoad: number; ev1Load: number; ev2Load: number; avgBattery: number; batteryCount: number}>();
      for (const d of minuteData) {
        if (!dailyMap.has(d.date)) {
          dailyMap.set(d.date, { date: d.date, solar: 0, gridImport: 0, gridExport: 0, savings: 0, homeLoad: 0, evLoad: 0, ev1Load: 0, ev2Load: 0, avgBattery: 0, batteryCount: 0 });
        }
        const a = dailyMap.get(d.date)!;
        a.solar += d.solarEnergyKWh ?? 0;
        a.gridImport += d.gridImportKWh ?? 0;
        a.gridExport += d.gridExportKWh ?? 0;
        a.savings += d.savingsKES ?? 0;
        a.homeLoad += d.homeLoadKWh ?? (d.homeLoadKW ?? 0) * (24 / 420);
        a.ev1Load += d.ev1LoadKWh ?? (d.ev1LoadKW ?? 0) * (24 / 420);
        a.ev2Load += d.ev2LoadKWh ?? (d.ev2LoadKW ?? 0) * (24 / 420);
        a.evLoad += (d.ev1LoadKWh ?? (d.ev1LoadKW ?? 0) * (24 / 420)) + (d.ev2LoadKWh ?? (d.ev2LoadKW ?? 0) * (24 / 420));
        a.avgBattery += d.batteryLevelPct ?? 0;
        a.batteryCount += 1;
      }
      const dailyAgg = Array.from(dailyMap.values())
        .map(r => ({ ...r, avgBattery: r.batteryCount > 0 ? r.avgBattery / r.batteryCount : 0 }))
        .sort((a, b) => a.date.localeCompare(b.date));
      const uniqueDays = dailyAgg.length;
      const dailyAggCharts = dailyAgg.slice(-30);

      const { createLoadProfileFromSimulation, generateRecommendation } = await import('@/lib/recommendation-engine');
      const loadProfile = createLoadProfileFromSimulation(minuteData);
      const recommendation = generateRecommendation(loadProfile, NAIROBI_SOLAR_DATA, {
        batteryPreference: 'auto',
        gridBackupRequired: true,
        autonomyDays: 1.5,
      });

      const startDate = minuteData[0]?.date ?? new Date().toISOString().slice(0, 10);
      const response = await fetch('/api/formal-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preAggregated: true,
          startDate,
          reportDate: new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' }),
          dateFrom: minuteData[0]?.date ?? startDate,
          dateTo: minuteData[minuteData.length - 1]?.date ?? startDate,
          totalDataPoints: minuteData.length,
          totalSolar, totalGridImport, totalGridExport, totalSavings,
          totalHomeLoad, totalEV1, totalEV2,
          peakSolar, peakGridImport, avgBattery,
          peakInstantSolar, peakEVLoad,
          peakBreakdown, offPeakBreakdown,
          uniqueDays,
          dailyAgg: dailyAggCharts,
          recommendation,
        }),
      });

      if (!response.ok) {
        const fallback = `HTTP ${response.status}`;
        const rawError = await response.text().catch(() => '');
        let parsedMessage = fallback;
        if (rawError) {
          try {
            const errorData = JSON.parse(rawError) as { error?: string; message?: string; details?: string };
            parsedMessage = errorData.error || errorData.message || fallback;
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

      const html = await response.text();
      const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      reportWindow.location.href = blobUrl;
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } catch (error) {
      if (reportWindow && !reportWindow.closed) {
        reportWindow.close();
      }
      console.error('Formal report error:', error);
      alert(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  }, [minuteData]);

  const flowDirection = useMemo(() => ({
    solarToHome: flows.some((f) => f.from === 'solar' && f.to === 'home' && f.active),
    solarToBattery: flows.some((f) => f.from === 'solar' && f.to === 'battery' && f.active),
    solarToGrid: flows.some((f) => f.from === 'solar' && f.to === 'grid' && f.active),
    batteryToHome: flows.some((f) => f.from === 'battery' && f.to === 'home' && f.active),
    gridToHome: flows.some((f) => f.from === 'grid' && f.to === 'home' && f.active),
  }), [flows]);

  const graphData = useMemo(() => minuteData.map((d) => ({
    timeOfDay: d.hour + d.minute / 60,
    solar: d.solarKW,
    load: d.homeLoadKW + d.ev1LoadKW + d.ev2LoadKW,
    batSoc: d.batteryLevelPct,
    gridImport: d.gridImportKW,
    gridExport: d.gridExportKW,
  })), [minuteData]);

  const energySplit = useMemo(() => {
    const totalEnergy = stats.totalSolarKWh + stats.totalConsumptionKWh + stats.totalGridExportKWh;
    if (!totalEnergy) {
      return { solarPct: 0, consumptionPct: 0, exportPct: 0 };
    }
    return {
      solarPct: stats.totalSolarKWh / totalEnergy,
      consumptionPct: stats.totalConsumptionKWh / totalEnergy,
      exportPct: stats.totalGridExportKWh / totalEnergy,
    };
  }, [stats]);

  const envImpact = useMemo(() => ([
    { icon: Leaf, value: `${(accumulators.carbonOffset / 1000).toFixed(2)} tons`, label: 'CO\u2082 Offset (Year)', color: 'var(--battery)', tint: 'var(--battery-soft)' },
    { icon: Trees, value: Math.round(accumulators.carbonOffset / 14).toString(), label: 'Trees Equivalent', color: 'var(--solar)', tint: 'var(--solar-soft)' },
    { icon: Car, value: `${Math.round(accumulators.carbonOffset * 1.6)} km`, label: 'Car Miles Offset', color: 'var(--consumption)', tint: 'var(--consumption-soft)' },
  ]), [accumulators]);

  const ringSegments = useMemo(() => {
    const circumference = 2 * Math.PI * 48;
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    return {
      circumference,
      solar: clamp(energySplit.solarPct) * circumference,
      consumption: clamp(energySplit.consumptionPct) * circumference,
      export: clamp(energySplit.exportPct) * circumference,
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
        dailyData.cons.push(dayData.reduce((sum, d) => sum + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh, 0));
        dailyData.savings.push(dayData.reduce((sum, d) => sum + d.savingsKES, 0));
        dailyData.power.push(dayData.reduce((sum, d) => sum + d.solarKW, 0) / dayData.length);
      }
    }
    return dailyData;
  }, [minuteData]);

  const trendsData = useMemo(() => {
    const weekData = minuteData.slice(-7 * 420);
    const yesterdayData = minuteData.slice(-2 * 420, -420);

    const weeklyAvgGen = weekData.length > 0
      ? weekData.reduce((sum, d) => sum + d.solarEnergyKWh, 0) / 7
      : 0;
    const weeklyAvgCons = weekData.length > 0
      ? weekData.reduce((sum, d) => sum + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh, 0) / 7
      : 0;
    const yesterdaySavings = yesterdayData.length > 0
      ? yesterdayData.reduce((sum, d) => sum + d.savingsKES, 0)
      : 0;

    const usefulEnergy = Math.min(homePower, solarPower) + (batteryPower > 0 ? Math.min(batteryPower, solarPower - homePower) : 0);
    const systemEfficiency = solarPower > 0 ? (usefulEnergy / solarPower) * 100 : 0;
    const savingsChange = yesterdaySavings > 0
      ? ((stats.totalSavingsKES - yesterdaySavings) / yesterdaySavings) * 100
      : 0;
    const now = new Date();
    const isPeakHour = now.getHours() >= 18 && now.getHours() <= 22;
    const batteryOptimized = isPeakHour ? batteryLevel > 70 : batteryLevel > 50;

    return {
      weeklyAvgGen,
      weeklyAvgCons,
      yesterdaySavings,
      systemEfficiency,
      savingsChange,
      batteryOptimized,
      forecastChange: 10,
    };
  }, [minuteData, stats, solarPower, homePower, batteryPower, batteryLevel]);

  return (
    <DashboardLayout>
      <Toaster />
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
        carbonOffset={accumulators.carbonOffset}
      />
      <DashboardHeader
        currentDate={currentDate}
        onReset={() => console.log('Reset clicked')}
        onLocationClick={() => console.log('Location clicked')}
        onDownload={() => setIsReportOpen(true)}
        onSaveScenario={handleSaveScenario}
        locationName="Nairobi, Kenya"
        notificationCount={3}
      />

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
                        { label: 'Solar Generation', pct: Math.round(energySplit.solarPct * 100), color: 'var(--solar)' },
                        { label: 'Consumption', pct: Math.round(energySplit.consumptionPct * 100), color: 'var(--consumption)' },
                        { label: 'Grid Export', pct: Math.round(energySplit.exportPct * 100), color: 'var(--grid)' },
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
              <WeatherCard locationName="Nairobi, Kenya" />
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
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2 h-44 px-2">
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((month, i) => {
                  const gen = [65, 70, 78, 85, 90, 95, 88, 92, 80, 75, 68, 62][i];
                  const cons = [55, 58, 60, 62, 65, 68, 70, 69, 65, 60, 57, 54][i];
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: '140px' }}>
                        <div className="w-2.5 rounded-t-sm bg-gradient-to-t from-[var(--solar-soft)] to-[var(--solar)] opacity-90 transition-all duration-500 hover:opacity-100" style={{ height: `${(gen / 100) * 140}px` }} />
                        <div className="w-2.5 rounded-t-sm bg-gradient-to-t from-[var(--consumption-soft)] to-[var(--consumption)] opacity-80 transition-all duration-500 hover:opacity-100" style={{ height: `${(cons / 100) * 140}px` }} />
                      </div>
                      <span className="text-[10px] text-[var(--text-tertiary)]">{month}</span>
                    </div>
                  );
                })}
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

          {/* ROW 7 — Engineering KPIs */}
          <EngineeringKPICard
            kpis={engineeringKPIs}
            pvCapacityLabel={`${solarNode.capacityKW?.toFixed(1) ?? '—'} kWp installed`}
          />
        </div>
      </main>
    </DashboardLayout>
  );
}
