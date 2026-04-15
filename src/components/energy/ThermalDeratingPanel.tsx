'use client';

// Feature flag: ENABLE_THERMAL_DERATING_PANEL
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Thermometer, Zap } from 'lucide-react';

export interface ThermalDeratingPanelProps {
  ambientTemp: number;
  batteryTemp: number;
  inverterTemp: number;
  deratingPct: number;
  historicalData?: { time: string; temp: number; output: number }[];
}

const getDeratingTone = (pct: number) => {
  if (pct > 15) return 'text-red-600 bg-red-50';
  if (pct >= 5) return 'text-yellow-600 bg-yellow-50';
  return 'text-green-600 bg-green-50';
};

export function ThermalDeratingPanel({
  ambientTemp,
  batteryTemp,
  inverterTemp,
  deratingPct,
  historicalData = [],
}: ThermalDeratingPanelProps) {
  // TODO: integrate Safaricom IoT SIM telemetry
  const chartData = useMemo(() => {
    if (historicalData.length > 0) return historicalData;
    return Array.from({ length: 8 }, (_, i) => ({
      time: `${String(i * 3).padStart(2, '0')}:00`,
      temp: Number((ambientTemp + i * 0.9).toFixed(1)),
      output: Number(Math.max(0, 11 - Math.abs(4 - i) * 1.3).toFixed(1)),
    }));
  }, [ambientTemp, historicalData]);

  const safeDerating = Math.max(0, Math.min(100, deratingPct));
  const tone = getDeratingTone(safeDerating);

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)] text-base font-semibold">
          <Thermometer className="h-4 w-4 text-[var(--solar)]" />
          Thermal &amp; Derating Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line yAxisId="left" dataKey="temp" type="monotone" stroke="var(--solar)" strokeWidth={2} dot={false} name="Ambient °C" />
              <Line yAxisId="right" dataKey="output" type="monotone" stroke="var(--battery)" strokeWidth={2} dot={false} name="Output kW" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-4 md:flex-row">
          <div className="flex-1 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="text-sm font-medium text-muted-foreground">Battery temperature</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{batteryTemp.toFixed(1)}°C</div>
          </div>
          <div className="flex-1 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="text-sm font-medium text-muted-foreground">Inverter temperature</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{inverterTemp.toFixed(1)}°C</div>
          </div>
          <div className="flex-1 space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-muted-foreground">Heat derating</div>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>{safeDerating.toFixed(1)}%</span>
            </div>
            <Progress value={safeDerating} className="h-2.5" />
            <div className="flex items-center gap-1 text-base text-[var(--text-secondary)]">
              <Zap className="h-4 w-4" />
              Ambient {ambientTemp.toFixed(1)}°C
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
