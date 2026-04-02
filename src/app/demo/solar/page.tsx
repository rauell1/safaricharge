'use client';

import React, { useMemo } from 'react';
import { EnergyDetailShell } from '@/components/dashboard/EnergyDetailShell';
import { useEnergyNode, useEnergyStats, useMinuteData, useTimeRange } from '@/hooks/useEnergySystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Sun, TrendingUp, Gauge } from 'lucide-react';

const formatTime = (hour: number, minute: number) =>
  `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

export default function SolarDetailPage() {
  const { timeRange } = useTimeRange();
  const solar = useEnergyNode('solar');
  const stats = useEnergyStats(timeRange);
  const minuteData = useMinuteData(timeRange);

  const generationSeries = useMemo(() => minuteData.map((d) => ({
    time: formatTime(d.hour, d.minute),
    solar: d.solarKW,
    export: d.gridExportKW,
    load: d.homeLoadKW + d.ev1LoadKW + d.ev2LoadKW,
  })), [minuteData]);

  const peakProduction = useMemo(() => {
    let peak = 0;
    for (const d of minuteData) {
      if (d.solarKW > peak) peak = d.solarKW;
    }
    return peak;
  }, [minuteData]);

  const hoursCovered = minuteData.length * 0.5 || 1;
  const capacityFactor = ((stats.totalSolarKWh / ((solar.capacityKW ?? 1) * hoursCovered)) * 100);
  const selfConsumption = Math.max(stats.totalSolarKWh - stats.totalGridExportKWh, 0);

  return (
    <EnergyDetailShell
      title="Solar Generation"
      subtitle="Realtime production, peak output, and efficiency trends"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <Sun className="h-5 w-5 text-[var(--solar)]" />
              Total Generation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-[var(--text-primary)]">{stats.totalSolarKWh.toFixed(1)} kWh</div>
            <p className="text-xs text-[var(--text-tertiary)]">Period: {timeRange}</p>
          </CardContent>
        </Card>
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <TrendingUp className="h-5 w-5 text-[var(--battery)]" />
              Peak Production
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-[var(--text-primary)]">{peakProduction.toFixed(1)} kW</div>
            <p className="text-xs text-[var(--text-tertiary)]">Current output: {solar.powerKW.toFixed(1)} kW</p>
          </CardContent>
        </Card>
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <Gauge className="h-5 w-5 text-[var(--grid)]" />
              Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-[var(--text-primary)]">
              {((solar.efficiency ?? 0.92) * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-[var(--text-tertiary)]">Capacity factor: {capacityFactor.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="dashboard-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              Generation Curve
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {generationSeries.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-tertiary)] text-sm">Waiting for solar data...</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={generationSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    <Area type="monotone" dataKey="solar" stroke="var(--solar)" fill="var(--solar)" fillOpacity={0.1} strokeWidth={2} name="Solar kW" />
                    <Area type="monotone" dataKey="export" stroke="var(--grid)" fill="var(--grid)" fillOpacity={0.05} strokeWidth={2} name="Grid Export kW" />
                    <Area type="monotone" dataKey="load" stroke="var(--consumption)" fill="var(--consumption)" fillOpacity={0.06} strokeWidth={1.5} name="Load kW" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Historical Trends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Self-consumed</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{selfConsumption.toFixed(1)} kWh</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Exported</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{stats.totalGridExportKWh.toFixed(1)} kWh</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Grid import</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{stats.totalGridImportKWh.toFixed(1)} kWh</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Peak hour</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {generationSeries.find((d) => d.solar === peakProduction)?.time ?? '--'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </EnergyDetailShell>
  );
}
