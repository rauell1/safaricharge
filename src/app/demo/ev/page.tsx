'use client';

import React, { useMemo } from 'react';
import { EnergyDetailShell } from '@/components/dashboard/EnergyDetailShell';
import { useEnergyNode, useMinuteData, useTimeRange } from '@/hooks/useEnergySystem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Car, Clock, Zap } from 'lucide-react';

const formatTime = (hour: number, minute: number) =>
  `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

interface ChargingSession {
  start: string;
  energy: number;
  duration: number;
}

export default function EVDetailPage() {
  const { timeRange } = useTimeRange();
  const ev1 = useEnergyNode('ev1');
  const ev2 = useEnergyNode('ev2');
  const minuteData = useMinuteData(timeRange);

  const evSeries = useMemo(() => minuteData.map((d) => ({
    time: formatTime(d.hour, d.minute),
    load: d.ev1LoadKW + d.ev2LoadKW,
    ev1Soc: d.ev1SocPct,
    ev2Soc: d.ev2SocPct,
  })), [minuteData]);

  const sessions = useMemo<ChargingSession[]>(() => {
    const results: ChargingSession[] = [];
    let current: ChargingSession | null = null;

    minuteData.forEach((d, idx) => {
      const load = d.ev1LoadKW + d.ev2LoadKW;
      if (load > 0.05) {
        if (!current) {
          current = { start: d.timestamp, energy: 0, duration: 0 };
        }
        current.energy += load * 0.5;
        current.duration += 0.5;
      } else if (current) {
        results.push(current);
        current = null;
      }
      if (idx === minuteData.length - 1 && current) {
        results.push(current);
      }
    });
    return results;
  }, [minuteData]);

  const longestSession = useMemo(
    () => sessions.reduce((max, session) => Math.max(max, session.duration), 0),
    [sessions]
  );

  const totalConsumption = minuteData.reduce((sum, d) => sum + d.ev1LoadKWh + d.ev2LoadKWh, 0);
  const avgSoc = minuteData.length
    ? (minuteData.reduce((sum, d) => sum + d.ev1SocPct + d.ev2SocPct, 0) / (minuteData.length * 2))
    : 0;
  const currentPower = (ev1.powerKW ?? 0) + (ev2.powerKW ?? 0);

  const upcomingSchedule = [
    { label: 'Tonight', detail: '10:00 PM · 7 kW · EV1' },
    { label: 'Tomorrow', detail: '06:30 AM · 5 kW · EV2' },
    { label: 'Weekend', detail: '12:00 PM · Solar-only top-up' },
  ];

  return (
    <EnergyDetailShell
      title="EV Charging"
      subtitle="Sessions, schedules, and live consumption"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <Car className="h-5 w-5 text-[var(--consumption)]" />
              Consumption
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-[var(--text-primary)]">{totalConsumption.toFixed(1)} kWh</div>
            <p className="text-xs text-[var(--text-tertiary)]">Current draw: {currentPower.toFixed(1)} kW</p>
          </CardContent>
        </Card>
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <Clock className="h-5 w-5 text-[var(--battery)]" />
              Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-[var(--text-primary)]">{sessions.length}</div>
            <p className="text-xs text-[var(--text-tertiary)]">Longest: {longestSession.toFixed(1)} hrs</p>
          </CardContent>
        </Card>
        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              <Zap className="h-5 w-5 text-[var(--solar)]" />
              SOC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold text-[var(--text-primary)]">{avgSoc.toFixed(0)}%</div>
            <p className="text-xs text-[var(--text-tertiary)]">EV1 {ev1.soc?.toFixed(0)}% · EV2 {ev2.soc?.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="dashboard-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
              Charging Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {evSeries.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-tertiary)] text-sm">Waiting for EV data...</div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" />
                    <XAxis dataKey="time" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} domain={[30, 100]} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
                    <Area yAxisId="left" type="monotone" dataKey="load" stroke="var(--consumption)" fill="var(--consumption)" fillOpacity={0.08} strokeWidth={2} name="Load kW" />
                    <Line yAxisId="right" type="monotone" dataKey="ev1Soc" stroke="var(--grid)" strokeWidth={2} dot={false} name="EV1 SOC" />
                    <Line yAxisId="right" type="monotone" dataKey="ev2Soc" stroke="var(--battery)" strokeWidth={2} dot={false} name="EV2 SOC" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader>
            <CardTitle className="text-[var(--text-primary)]">Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingSchedule.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</div>
                  <div className="text-xs text-[var(--text-secondary)]">{item.detail}</div>
                </div>
                <div className="h-2 w-2 rounded-full bg-[var(--battery)] status-online" />
              </div>
            ))}
            <div className="pt-2 text-xs text-[var(--text-tertiary)]">
              Charging sessions stay synced with the live flow diagram via the shared energy store.
            </div>
          </CardContent>
        </Card>
      </div>
    </EnergyDetailShell>
  );
}
