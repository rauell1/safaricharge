'use client';

import React, { useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatCards } from '@/components/dashboard/StatCards';
import { PowerFlowVisualization } from '@/components/dashboard/PowerFlowVisualization';
import { PanelStatusTable } from '@/components/dashboard/PanelStatusTable';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { TimeRangeSwitcher } from '@/components/dashboard/TimeRangeSwitcher';
import { WeatherCard } from '@/components/dashboard/WeatherCard';
import { BatteryStatusCard } from '@/components/dashboard/BatteryStatusCard';
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
} from '@/hooks/useEnergySystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, TrendingUp, Leaf, Car, Trees } from 'lucide-react';

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

  const latestPoint = minuteData[minuteData.length - 1];
  const solarPower = latestPoint?.solarKW ?? solarNode.powerKW ?? 0;
  const batteryPower = latestPoint?.batteryPowerKW ?? batteryNode.powerKW ?? 0;
  const gridPower = latestPoint ? latestPoint.gridImportKW - latestPoint.gridExportKW : gridNode.powerKW ?? 0;
  const homePower = latestPoint
    ? latestPoint.homeLoadKW + latestPoint.ev1LoadKW + latestPoint.ev2LoadKW
    : homeNode.powerKW ?? 0;
  const batteryLevel = latestPoint?.batteryLevelPct ?? batteryNode.soc ?? 0;

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
    { icon: Leaf, value: `${(accumulators.carbonOffset / 1000).toFixed(2)} tons`, label: 'CO₂ Offset (Year)', color: 'var(--battery)', tint: 'var(--battery-soft)' },
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

  return (
    <DashboardLayout>
      <DashboardHeader
        currentDate={currentDate}
        onReset={() => console.log('Reset clicked')}
        onLocationClick={() => console.log('Location clicked')}
        onDownload={() => console.log('Download clicked')}
        locationName="Nairobi, Kenya"
        notificationCount={3}
      />

    <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        {/* Page title + time range */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Energy Dashboard</h2>
            <p className="text-sm text-[var(--text-tertiary)]">Monitor your solar energy system performance</p>
          </div>
          <TimeRangeSwitcher selectedRange={timeRange} onRangeChange={setTimeRange} />
        </div>

        {/* ROW 1 — 4 Stat Cards */}
        <StatCards
          totalGeneration={Number(stats.totalSolarKWh.toFixed(1))}
          currentPower={Number(solarPower.toFixed(1))}
          consumption={Number(stats.totalConsumptionKWh.toFixed(1))}
          savings={Math.round(stats.totalSavingsKES)}
        />

        {/* ROW 2 — Energy Flow (2/3) + Weather & Battery (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PowerFlowVisualization
              solarPower={solarPower}
              batteryPower={batteryPower}
              gridPower={gridPower}
              homePower={homePower}
              batteryLevel={batteryLevel}
              flowDirection={flowDirection}
              detailBasePath="/demo"
            />
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

        {/* ROW 3 — Generation vs Consumption (2/3) + Energy Distribution (1/3) */}
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
                {/* Doughnut-style visual using stacked rings */}
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

        {/* ROW 4 — Panel Status (2/3) + Alerts (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PanelStatusTable />
          </div>
          <div>
            <AlertsList />
          </div>
        </div>

        {/* ROW 5 — Monthly Overview (2/3) + Environmental Impact (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
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
                          <div
                            className="w-2.5 rounded-t-sm bg-gradient-to-t from-[var(--solar-soft)] to-[var(--solar)] opacity-90 transition-all duration-500 hover:opacity-100"
                            style={{ height: `${(gen / 100) * 140}px` }}
                          />
                          <div
                            className="w-2.5 rounded-t-sm bg-gradient-to-t from-[var(--consumption-soft)] to-[var(--consumption)] opacity-80 transition-all duration-500 hover:opacity-100"
                            style={{ height: `${(cons / 100) * 140}px` }}
                          />
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
          </div>
          <div>
            <Card className="dashboard-card h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
                  <Leaf className="h-5 w-5 text-[var(--battery)]" />
                  Environmental Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
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
          </div>
        </div>
      </div>
    </main>
  </DashboardLayout>
  );
}
