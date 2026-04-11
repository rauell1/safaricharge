'use client';

import React, { useMemo } from 'react';
import {
  Zap,
  BarChart2,
  Activity,
  BatteryCharging,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { computeEngineeringKpis } from '@/lib/engineeringKpis';

// ── Small KPI tile ─────────────────────────────────────────────────────────────

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  tooltip: string;
  accent?: string; // tailwind text colour class
  dim?: boolean;
}

function KpiTile({ icon, label, value, unit, tooltip, accent = 'text-[var(--solar)]', dim }: KpiTileProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex flex-col gap-2 rounded-xl p-4 bg-[var(--bg-card-muted)] border border-[var(--border)] cursor-default select-none ${
              dim ? 'opacity-60' : ''
            }`}
          >
            <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]`}>
              <span className={accent}>{icon}</span>
              {label}
              <Info className="h-3 w-3 ml-auto text-[var(--text-tertiary)] opacity-50" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</span>
              <span className="text-xs text-[var(--text-tertiary)]">{unit}</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px] text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function EngineeringKpisCard() {
  const minuteData = useEnergySystemStore((s) => s.minuteData);
  const systemConfig = useEnergySystemStore((s) => s.systemConfig);
  const accumulators = useEnergySystemStore((s) => s.accumulators);
  const solarData = useEnergySystemStore((s) => s.solarData);
  const currentDate = useEnergySystemStore((s) => s.currentDate);

  const kpis = useMemo(() => {
    const durationHours = minuteData.length / 60; // each record = 1 minute
    const effectiveDuration = Math.max(durationHours, 1);

    // Derive irradiance from monthly PSH for the current month
    const currentMonth = new Date(currentDate).getMonth(); // 0-indexed
    const monthlyPSH = solarData.monthlyAvgKwhPerKwp[currentMonth]; // kWh/kWp ≈ PSH
    const irradianceKWhPerM2 = monthlyPSH * (effectiveDuration / 24); // scale to elapsed period

    return computeEngineeringKpis({
      totalSolarKWh: accumulators.solar,
      dcCapacityKWp: systemConfig.solarCapacityKW,
      durationHours: effectiveDuration,
      totalBatDischargeKWh: accumulators.batDischargeKwh,
      batteryCapacityKWh: systemConfig.batteryCapacityKWh,
      planeIrradianceKWhPerM2: irradianceKWhPerM2 > 0 ? irradianceKWhPerM2 : undefined,
    });
  }, [minuteData.length, accumulators, systemConfig, solarData, currentDate]);

  // Battery cycles sparkline — sample every 60 points (≈ 1 simulated hour)
  const sparkData = useMemo(() => {
    const batteryCapacityKWh = systemConfig.batteryCapacityKWh;
    return minuteData
      .filter((_, i) => i % 60 === 0)
      .map((_, i, arr) => {
        const dischargeKwh = arr
          .slice(0, i + 1)
          .reduce((sum, p) => sum + Math.max(0, -p.batteryPowerKW) * (24 / 420), 0);
        return { t: i, cycles: batteryCapacityKWh > 0 ? dischargeKwh / batteryCapacityKWh : 0 };
      });
  }, [minuteData, systemConfig.batteryCapacityKWh]);

  const noData = minuteData.length === 0;

  return (
    <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide flex items-center gap-2">
          <Activity className="h-4 w-4 text-[var(--solar)]" />
          Engineering KPIs
          {kpis.prIsEstimated && (
            <span className="ml-auto text-[10px] font-normal normal-case tracking-normal text-[var(--text-tertiary)] bg-[var(--bg-card-muted)] border border-[var(--border)] rounded px-2 py-0.5">
              PR estimated (no irradiance)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile
            icon={<Zap className="h-3.5 w-3.5" />}
            label="Specific Yield"
            value={noData ? '—' : kpis.specificYieldKWhPerKWp.toFixed(1)}
            unit="kWh/kWp"
            accent="text-[var(--solar)]"
            dim={noData}
            tooltip="Total PV energy generated divided by installed DC capacity. Typical Nairobi rooftop: 1 400–1 600 kWh/kWp/year."
          />
          <KpiTile
            icon={<BarChart2 className="h-3.5 w-3.5" />}
            label="Perf. Ratio"
            value={noData ? '—' : `${kpis.performanceRatioPct.toFixed(1)}`}
            unit="%"
            accent="text-[var(--battery)]"
            dim={noData}
            tooltip={`Ratio of actual yield to theoretical yield given irradiance. Values 70–85 % are typical for a well-maintained system.${kpis.prIsEstimated ? ' (Estimated from 5.5 h/day peak-sun-hours — link irradiance data for accuracy.)' : ''}`}
          />
          <KpiTile
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Capacity Factor"
            value={noData ? '—' : `${kpis.capacityFactorPct.toFixed(1)}`}
            unit="%"
            accent="text-[var(--grid)]"
            dim={noData}
            tooltip="PV generation as a fraction of what would be produced running at full rated power 24/7. Typical sub-Saharan rooftop PV: 15–22 %."
          />
          <KpiTile
            icon={<BatteryCharging className="h-3.5 w-3.5" />}
            label="Battery Cycles"
            value={noData ? '—' : kpis.batteryCycles.toFixed(2)}
            unit="cycles"
            accent="text-emerald-400"
            dim={noData}
            tooltip="Equivalent full cycles = cumulative discharge ÷ nominal capacity. Lithium-ion typically rated for 3 000–6 000 cycles (80 % DoD)."
          />
        </div>
        {sparkData.length >= 2 && (
          <div className="mt-4">
            <p className="text-xs text-[var(--text-tertiary)] mb-1">Cycle history</p>
            <ResponsiveContainer width="100%" height={48}>
              <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Area
                  type="monotone"
                  dataKey="cycles"
                  stroke="var(--battery)"
                  fill="var(--battery-soft)"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
