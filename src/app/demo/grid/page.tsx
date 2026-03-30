'use client';

import React, { useMemo } from 'react';
import { EnergyDetailShell } from '@/components/dashboard/EnergyDetailShell';
import { useEnergyNode, useEnergyStats, useMinuteData, useTimeRange } from '@/hooks/useEnergySystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownCircle, ArrowUpCircle, DollarSign } from 'lucide-react';

const formatTime = (hour: number, minute: number) =>
  `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

export default function GridDetailPage() {
  const { timeRange } = useTimeRange();
  const grid = useEnergyNode('grid');
  const stats = useEnergyStats(timeRange);
  const minuteData = useMinuteData(timeRange);

  const averageTariff = useMemo(() => {
    if (!minuteData.length) return 0;
    return minuteData.reduce((sum, d) => sum + d.tariffRate, 0) / minuteData.length;
  }, [minuteData]);

  const gridCost = stats.totalGridImportKWh * averageTariff;
  const exportCredit = stats.totalGridExportKWh * 12;
  const netCost = gridCost - exportCredit;

  const importExportSeries = useMemo(() => minuteData.map((d) => ({
    time: formatTime(d.hour, d.minute),
    import: d.gridImportKW,
    export: d.gridExportKW,
    tariff: d.tariffRate,
  })), [minuteData]);

  const tariffSim = useMemo(() => ([
    { label: 'Peak +10%', value: (gridCost * 1.1).toFixed(0) },
    { label: 'Off-peak -10%', value: (gridCost * 0.9).toFixed(0) },
    { label: 'Feed-in +20%', value: (exportCredit * 1.2).toFixed(0) },
  ]), [exportCredit, gridCost]);

  return (
    <EnergyDetailShell
      title="Grid & Tariffs"
      subtitle="Import vs export, costs, and tariff simulations"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <ArrowDownCircle className="h-5 w-5 text-[var(--alert)]" />
              Import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-[var(--text-primary)]">{stats.totalGridImportKWh.toFixed(1)} kWh</div>
            <p className="text-xs text-[var(--text-tertiary)]">Current draw: {grid.powerKW.toFixed(2)} kW</p>
          </CardContent>
        </Card>
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <ArrowUpCircle className="h-5 w-5 text-[var(--grid)]" />
              Export
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-[var(--text-primary)]">{stats.totalGridExportKWh.toFixed(1)} kWh</div>
            <p className="text-xs text-[var(--text-tertiary)]">Feed-in credit: KES {exportCredit.toFixed(0)}</p>
          </CardContent>
        </Card>
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <DollarSign className="h-5 w-5 text-[var(--battery)]" />
              Cost
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-[var(--text-primary)]">KES {netCost.toFixed(0)}</div>
            <p className="text-xs text-[var(--text-tertiary)]">Avg tariff: KES {averageTariff.toFixed(2)}/kWh</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="dashboard-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              Import vs Export
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {importExportSeries.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-tertiary)] text-sm">Waiting for grid data...</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={importExportSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    <Area type="monotone" dataKey="import" stroke="var(--alert)" fill="var(--alert)" fillOpacity={0.08} strokeWidth={2} name="Import kW" />
                    <Area type="monotone" dataKey="export" stroke="var(--grid)" fill="var(--grid)" fillOpacity={0.06} strokeWidth={2} name="Export kW" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              Tariff Simulation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tariffSim.map((scenario) => (
              <div key={scenario.label} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2">
                <div className="text-sm text-[var(--text-secondary)]">{scenario.label}</div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">KES {scenario.value}</div>
              </div>
            ))}
            <div className="pt-2 text-xs text-[var(--text-tertiary)]">
              Simulations use live import/export volumes from the energy store to stay in sync with the flow diagram.
            </div>
          </CardContent>
        </Card>
      </div>
    </EnergyDetailShell>
  );
}
