'use client';


import React, { useMemo } from 'react';
import {
  Zap,
  BarChart2,
  Activity,
  BatteryCharging,
  Sun,
  Plug,
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
  /** Optional 0-100 progress bar beneath the value */
  progress?: number;
  progressColor?: string; // CSS custom-property string e.g. 'var(--battery)'
}


function KpiTile({
  icon,
  label,
  value,
  unit,
  tooltip,
  accent = 'text-[var(--solar)]',
  dim,
  progress,
  progressColor = 'var(--battery)',
}: KpiTileProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex flex-col gap-2 rounded-xl p-4 bg-[var(--bg-card-muted)] border border-[var(--border)] cursor-default select-none ${
              dim ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              <span className={accent}>{icon}</span>
              {label}
              <Info className="h-3 w-3 ml-auto text-[var(--text-tertiary)] opacity-50" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</span>
              <span className="text-xs text-[var(--text-tertiary)]">{unit}</span>
            </div>
            {progress !== undefined && (
              <div className="h-1.5 w-full rounded-full bg-[var(--bg-card)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(Math.max(progress, 0), 100)}%`,
                    backgroundColor: progressColor,
                  }}
                />
              </div>
            )}
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
    const durationHours = minuteData.length / 60;
    const effectiveDuration = Math.max(durationHours, 1);


    // Irradiance from monthly PSH for current month
    const currentMonth = new Date(currentDate).getMonth();
    const monthlyPSH = solarData.monthlyAvgKwhPerKwp[currentMonth];
    const irradianceKWhPerM2 = monthlyPSH * (effectiveDuration / 24);


    // Total load from minuteData (home + EV1 + EV2)
    const totalLoadKWh = minuteData.reduce(
      (sum, d) =>
        sum +
        (d.homeLoadKWh ?? (d.homeLoadKW ?? 0) * (1 / 60)) +
        (d.ev1LoadKWh  ?? (d.ev1LoadKW  ?? 0) * (1 / 60)) +
        (d.ev2LoadKWh  ?? (d.ev2LoadKW  ?? 0) * (1 / 60)),
      0,
    );


    // Grid import from accumulators if available, else sum minuteData
    const accRec = accumulators as unknown as Record<string, number>;
    const gridImportKWh =
      accRec.gridImportKwh != null
        ? accRec.gridImportKwh
        : minuteData.reduce((sum, d) => sum + (d.gridImportKWh ?? 0), 0);


    return computeEngineeringKpis({
      totalSolarKWh:        accumulators.solar,
      dcCapacityKWp:        systemConfig.solarCapacityKW,
      durationHours:        effectiveDuration,
      totalBatDischargeKWh: accumulators.batDischargeKwh,
      batteryCapacityKWh:   systemConfig.batteryCapacityKWh,
      totalLoadKWh,
      gridImportKWh,
      planeIrradianceKWhPerM2: irradianceKWhPerM2 > 0 ? irradianceKWhPerM2 : undefined,
    });
  }, [minuteData, accumulators, systemConfig, solarData, currentDate]);


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
      <CardContent className="space-y-4">
        {/* ── 6-tile grid: 2 cols on mobile, 3 on sm+ ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
            tooltip={`Ratio of actual yield to theoretical maximum given available irradiance. Good systems: 75–85 %. ${kpis.prIsEstimated ? 'Estimated from local peak-sun-hours.' : 'Computed from plane-of-array irradiance.'}`}
            progress={kpis.performanceRatioPct}
            progressColor="var(--battery)"
          />
          <KpiTile
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Capacity Factor"
            value={noData ? '—' : `${kpis.capacityFactorPct.toFixed(1)}`}
            unit="%"
            accent="text-[var(--consumption)]"
            dim={noData}
            tooltip="Actual energy output as a fraction of maximum possible output over the same period (P_dc × hours). Kenyan rooftop PV typically 15–22 %."
            progress={kpis.capacityFactorPct}
            progressColor="var(--consumption)"
          />
          <KpiTile
            icon={<BatteryCharging className="h-3.5 w-3.5" />}
            label="Battery Cycles"
            value={noData ? '—' : kpis.batteryCycles.toFixed(2)}
            unit="cycles"
            accent="text-[var(--grid)]"
            dim={noData}
            tooltip="Equivalent full discharge cycles accumulated. Li-ion BESS typically rated 3 000–6 000 cycles at 80 % DoD. Lower is better for longevity."
          />
          <KpiTile
            icon={<Sun className="h-3.5 w-3.5" />}
            label="Self-Sufficiency"
            value={noData ? '—' : `${kpis.selfSufficiencyPct.toFixed(1)}`}
            unit="%"
            accent="text-[var(--solar)]"
            dim={noData}
            tooltip="Percentage of total electrical load (home + EVs) met by solar and battery without drawing from the grid. Target ≥ 70 % for a well-sized off-peak system."
            progress={kpis.selfSufficiencyPct}
            progressColor="var(--solar)"
          />
          <KpiTile
            icon={<Plug className="h-3.5 w-3.5" />}
            label="Grid Dependency"
            value={noData ? '—' : `${kpis.gridDependencyPct.toFixed(1)}`}
            unit="%"
            accent="text-[var(--grid)]"
            dim={noData}
            tooltip="Fraction of total load supplied by the grid. The complement of Self-Sufficiency. Lower values indicate a more energy-independent system."
            progress={kpis.gridDependencyPct}
            progressColor="var(--grid)"
          />
        </div>


        {/* ── Battery cycles sparkline ── */}
        {sparkData.length > 1 && (
          <div className="rounded-xl bg-[var(--bg-card-muted)] border border-[var(--border)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Battery Cycle Accumulation
              </span>
              <span className="text-xs tabular-nums text-[var(--grid)]">
                {kpis.batteryCycles.toFixed(2)} cycles total
              </span>
            </div>
            <ResponsiveContainer width="100%" height={56}>
              <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cycleGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--grid)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--grid)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="cycles"
                  stroke="var(--grid)"
                  strokeWidth={1.5}
                  fill="url(#cycleGrad)"
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
