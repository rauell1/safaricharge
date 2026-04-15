'use client';

import React, { useMemo } from 'react';
import { EnergyDetailShell } from '@/components/dashboard/EnergyDetailShell';
import { useEnergyNode, useEnergyStats, useMinuteData, useTimeRange } from '@/hooks/useEnergySystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, CartesianGrid, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Battery, Activity, Zap } from 'lucide-react';

const formatTime = (hour: number, minute: number) =>
  `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

export default function BatteryDetailPage() {
  const { timeRange } = useTimeRange();
  const battery = useEnergyNode('battery');
  const stats = useEnergyStats(timeRange);
  const minuteData = useMinuteData(timeRange);

  const socStats = useMemo(() => {
    if (!minuteData.length) return { avg: 0, min: 0, max: 0 };
    const socs = minuteData.map((d) => d.batteryLevelPct);
    const avg = socs.reduce((sum, v) => sum + v, 0) / socs.length;
    return { avg, min: Math.min(...socs), max: Math.max(...socs) };
  }, [minuteData]);

  const chargeSeries = useMemo(() => minuteData.map((d) => ({
    time: formatTime(d.hour, d.minute),
    soc: d.batteryLevelPct,
    power: d.batteryPowerKW,
    import: d.gridImportKW,
    export: d.gridExportKW,
  })), [minuteData]);

  const energyTotals = useMemo(() => {
    const charged = minuteData.reduce((sum, d) => sum + (d.batteryPowerKW > 0 ? d.batteryPowerKW * 0.5 : 0), 0);
    const discharged = minuteData.reduce((sum, d) => sum + (d.batteryPowerKW < 0 ? Math.abs(d.batteryPowerKW * 0.5) : 0), 0);
    return { charged, discharged };
  }, [minuteData]);

  return (
    <EnergyDetailShell
      title="Battery Detail"
      subtitle="State of charge, charge/discharge behavior, and efficiency insights"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <Battery className="h-5 w-5 text-[var(--battery)]" />
              SOC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-[var(--text-primary)]">{battery.soc?.toFixed(0)}%</div>
            <p className="text-xs text-[var(--text-tertiary)]">Min {socStats.min.toFixed(0)}% · Max {socStats.max.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <Zap className="h-5 w-5 text-[var(--solar)]" />
              Power
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-[var(--text-primary)]">{battery.powerKW.toFixed(1)} kW</div>
            <p className="text-xs text-[var(--text-tertiary)]">Net flow (positive = charging)</p>
          </CardContent>
        </Card>
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <Activity className="h-5 w-5 text-[var(--consumption)]" />
              Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-[var(--text-primary)]">{((battery.efficiency ?? 0.94) * 100).toFixed(0)}%</div>
            <p className="text-xs text-[var(--text-tertiary)]">Cycles captured this range: {(energyTotals.charged / (battery.capacityKWh ?? 50)).toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="dashboard-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              Charge / Discharge Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {chargeSeries.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-tertiary)] text-sm">Waiting for battery data...</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chargeSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} domain={[-6, 6]} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} domain={[20, 100]} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    <ReferenceLine yAxisId="right" y={20} stroke="var(--grid)" strokeDasharray="4 4" />
                    <ReferenceLine yAxisId="right" y={90} stroke="var(--grid)" strokeDasharray="4 4" />
                    <Area yAxisId="right" type="monotone" dataKey="soc" stroke="var(--grid)" fill="var(--grid)" fillOpacity={0.08} strokeWidth={2} name="SOC (%)" />
                    <Line yAxisId="left" type="monotone" dataKey="power" stroke="var(--battery)" strokeWidth={2.5} dot={false} name="Battery kW" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Session Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Energy charged</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{energyTotals.charged.toFixed(1)} kWh</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Energy discharged</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{energyTotals.discharged.toFixed(1)} kWh</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Average SOC</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{socStats.avg.toFixed(0)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Grid support</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">{stats.totalGridImportKWh.toFixed(1)} kWh</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </EnergyDetailShell>
  );
}
