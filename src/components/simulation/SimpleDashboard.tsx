'use client';

import { useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, ExternalLink, MapPin, Save } from 'lucide-react';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import type { LocationOption } from '@/stores/energySystemStore';
import { AFRICA_CITIES } from '@/lib/africa-locations-data';
import { LoadProfilePicker } from './LoadProfilePicker';
import { cn } from '@/lib/utils';

// ─── Quick-pick cities ───────────────────────────────────────────────────────

const QUICK_CITY_NAMES = ['Nairobi', 'Mombasa', 'Kisumu', 'Lagos', 'Johannesburg', 'Cairo'];
const SPEED_OPTIONS = [1, 5, 10, 30] as const;

// ─── Rolling 60-min area chart ───────────────────────────────────────────────

function RollingChart({
  data,
}: {
  data: Array<{
    solarKW: number;
    homeLoadKW: number;
    gridImportKW: number;
    batteryLevelPct: number;
  }>;
}) {
  if (data.length < 2) {
    return (
      <div className="flex h-[120px] items-center justify-center text-xs text-[var(--text-tertiary)]">
        Simulation data will appear here once running...
      </div>
    );
  }

  const W = 600;
  const H = 120;
  const padL = 8;
  const padR = 8;
  const padT = 6;
  const padB = 18;
  const cW = W - padL - padR;
  const cH = H - padT - padB;
  const n = data.length;

  const maxPow = Math.max(...data.map((d) => Math.max(d.solarKW, d.homeLoadKW, d.gridImportKW)), 1);

  const px = (i: number) => padL + (i / (n - 1)) * cW;
  const py = (v: number, max: number) => padT + cH - (v / max) * cH;
  const socPy = (v: number) => padT + cH - (v / 100) * cH;

  const toPath = (vals: number[], max: number) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v, max).toFixed(1)}`).join(' ');

  const toArea = (vals: number[], max: number) => {
    const base = padT + cH;
    return (
      toPath(vals, max) +
      ` L${px(n - 1).toFixed(1)},${base} L${px(0).toFixed(1)},${base} Z`
    );
  };

  const solar = data.map((d) => d.solarKW);
  const load = data.map((d) => d.homeLoadKW);
  const grid = data.map((d) => Math.max(0, d.gridImportKW));
  const soc = data.map((d) => d.batteryLevelPct);

  const ticksX = [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full min-w-[240px]"
      aria-label="Rolling 60-minute energy chart"
    >
      {/* Horizontal grid */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line
          key={f}
          x1={padL}
          x2={W - padR}
          y1={padT + cH * (1 - f)}
          y2={padT + cH * (1 - f)}
          stroke="var(--border)"
          strokeWidth={0.5}
          strokeDasharray="3 3"
        />
      ))}

      {/* Filled areas */}
      <path d={toArea(grid, maxPow)} fill="rgba(59,130,246,0.10)" />
      <path d={toArea(solar, maxPow)} fill="rgba(251,191,36,0.12)" />

      {/* Lines */}
      <path d={toPath(grid, maxPow)} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
      <path d={toPath(solar, maxPow)} fill="none" stroke="#fbbf24" strokeWidth={2} />
      <path
        d={toPath(load, maxPow)}
        fill="none"
        stroke="#f87171"
        strokeWidth={1.5}
        strokeDasharray="5 3"
      />
      <path
        d={soc.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${socPy(v).toFixed(1)}`).join(' ')}
        fill="none"
        stroke="#34d399"
        strokeWidth={1.5}
        strokeDasharray="2 2"
      />

      {/* X-axis ticks */}
      {ticksX.map((idx) => (
        <text
          key={idx}
          x={px(idx)}
          y={H - 3}
          textAnchor="middle"
          fontSize={8}
          fill="var(--text-tertiary)"
          fontFamily="monospace"
        >
          -{(n - 1 - idx)}m
        </text>
      ))}

      {/* Peak label */}
      <text
        x={W - padR}
        y={padT + 8}
        textAnchor="end"
        fontSize={8}
        fill="var(--text-tertiary)"
        fontFamily="monospace"
      >
        {maxPow.toFixed(1)} kW
      </text>
    </svg>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  unit,
  sub,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        {label}
      </span>
      <span className={`text-2xl font-black tabular-nums leading-none ${color}`}>
        {value}
        {unit && (
          <span className="ml-1 text-sm font-semibold text-[var(--text-tertiary)]">{unit}</span>
        )}
      </span>
      {sub && <span className="text-[11px] text-[var(--text-tertiary)]">{sub}</span>}
    </div>
  );
}

// ─── Battery visual bar ──────────────────────────────────────────────────────

function BatteryBar({ pct }: { pct: number }) {
  const color = pct > 50 ? '#34d399' : pct > 20 ? '#fbbf24' : '#f87171';
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
        Battery
      </span>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-black tabular-nums leading-none" style={{ color }}>
          {pct.toFixed(0)}
          <span className="ml-0.5 text-sm font-semibold text-[var(--text-tertiary)]">%</span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--bg-card-muted)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface SimpleDashboardProps {
  onSaveRun: () => void;
  isSaving: boolean;
}

export function SimpleDashboard({ onSaveRun, isSaving }: SimpleDashboardProps) {
  // Store selectors
  const minuteData = useEnergySystemStore((s) => s.minuteData);
  const systemConfig = useEnergySystemStore((s) => s.systemConfig);
  const activeLocation = useEnergySystemStore((s) => s.activeLocation);
  const isAutoMode = useEnergySystemStore((s) => s.isAutoMode);
  const simSpeed = useEnergySystemStore((s) => s.simSpeed);
  const timeOfDay = useEnergySystemStore((s) => s.timeOfDay);
  const setSimState = useEnergySystemStore((s) => s.setSimulationState);
  const resetSystem = useEnergySystemStore((s) => s.resetSystem);
  const updateSystemConfig = useEnergySystemStore((s) => s.updateSystemConfig);
  const setActiveLocation = useEnergySystemStore((s) => s.setActiveLocation);

  // Last 60 data points for chart
  const recentData = useMemo(() => minuteData.slice(-60), [minuteData]);

  // Today's totals
  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const todayData = minuteData.filter((d) => new Date(d.timestamp).toDateString() === today);
    return {
      solarKWh: todayData.reduce((s, d) => s + (d.solarKW || 0) / 60, 0),
      savingsKes: todayData.reduce((s, d) => s + (d.savingsKES || 0), 0),
    };
  }, [minuteData]);

  // Latest snapshot
  const latest = minuteData[minuteData.length - 1];
  const batterySoC = latest?.batteryLevelPct ?? 0;
  const gridImport = latest?.gridImportKW ?? 0;
  const gridExport = latest?.gridExportKW ?? 0;
  const gridStatus =
    gridImport > 0.1 ? `Importing ${gridImport.toFixed(1)} kW` :
    gridExport > 0.1 ? `Exporting ${gridExport.toFixed(1)} kW` :
    'Idle';
  const gridColor =
    gridImport > 0.1 ? 'text-blue-400' :
    gridExport > 0.1 ? 'text-emerald-400' :
    'text-[var(--text-tertiary)]';

  // Clock
  const hours = Math.floor(timeOfDay);
  const mins = Math.round((timeOfDay % 1) * 60);
  const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  const elapsedDays = minuteData.length > 0 ? (minuteData.length / 1440).toFixed(1) : '0.0';

  // System size slider
  const handleSolarChange = useCallback(
    (kw: number) => {
      const ratioMap: Record<string, number> = {
        residential: 5,
        commercial: 3,
        industrial: 2,
        'fleet-depot': 8,
      };
      const ratio = ratioMap[systemConfig.loadProfile ?? 'residential'] ?? 5;
      updateSystemConfig({
        solarCapacityKW: kw,
        batteryCapacityKWh: Math.round(kw * ratio),
        inverterKW: kw,
      });
    },
    [systemConfig.loadProfile, updateSystemConfig],
  );

  // Location chips
  const handleLocationChip = useCallback(
    (cityName: string) => {
      const city = AFRICA_CITIES.find((c) => c.name === cityName);
      if (!city) return;
      const loc: LocationOption = {
        name: city.name,
        displayName: `${city.name}, ${city.country}`,
        county: city.country,
        latitude: city.lat,
        longitude: city.lon,
        annualAvgSunHours: city.avgDailyPsh,
        isKosapTarget: false,
        electrificationRatePct: null,
        countyNote: '',
      };
      setActiveLocation(loc);
    },
    [setActiveLocation],
  );

  const handleReset = useCallback(() => {
    resetSystem();
    setSimState({ isAutoMode: false });
  }, [resetSystem, setSimState]);

  return (
    <div className="space-y-5">

      {/* ── Control strip ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
        {/* Location + time */}
        <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
          <MapPin className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          <span className="font-medium">{activeLocation.displayName}</span>
          <span className="text-[var(--text-tertiary)]">·</span>
          <span className="font-mono text-[var(--text-tertiary)]">{timeStr}</span>
          <span className="text-[var(--text-tertiary)]">·</span>
          <span className="text-xs text-[var(--text-tertiary)]">{elapsedDays} days</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Play/Pause */}
          <button
            type="button"
            onClick={() => setSimState({ isAutoMode: !isAutoMode })}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all',
              isAutoMode
                ? 'border-amber-400 text-amber-400 hover:bg-amber-400/10'
                : 'border-emerald-500 text-emerald-500 hover:bg-emerald-500/10',
            )}
          >
            {isAutoMode ? (
              <><Pause className="h-3 w-3" /> Pause</>
            ) : (
              <><Play className="h-3 w-3" /> Play</>
            )}
          </button>

          {/* Speed */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[var(--text-tertiary)]">Speed</span>
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSimState({ simSpeed: s })}
                className={cn(
                  'rounded px-2 py-1 text-[11px] font-bold border transition-all',
                  simSpeed === s
                    ? 'bg-[var(--solar)] text-slate-900 border-[var(--solar)]'
                    : 'bg-[var(--bg-card-muted)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--solar)] hover:text-[var(--solar)]',
                )}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* Reset */}
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Solar today"
          value={todayStats.solarKWh.toFixed(1)}
          unit="kWh"
          sub={`${systemConfig.solarCapacityKW.toFixed(0)} kWp installed`}
          color="text-amber-400"
        />
        <KpiCard
          label="Saved today"
          value={todayStats.savingsKes.toFixed(0)}
          unit="KSh"
          sub="vs. full grid"
          color="text-emerald-400"
        />
        <BatteryBar pct={batterySoC} />
        <KpiCard
          label="Grid"
          value={gridStatus.split(' ')[0]}
          sub={gridStatus.includes(' ') ? gridStatus.split(' ').slice(1).join(' ') : ''}
          color={gridColor}
        />
      </div>

      {/* ── Rolling chart ── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
        <div className="mb-2 flex flex-wrap items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
          <span className="font-semibold text-[var(--text-secondary)]">Last 60 minutes</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4 rounded bg-amber-400" /> Solar
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4 rounded border-t border-dashed border-red-400" style={{ background: 'transparent' }} /> Load
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4 rounded bg-blue-400" /> Grid import
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-4 rounded bg-emerald-400" style={{ borderTop: '1px dotted #34d399', background: 'transparent' }} /> Battery %
          </span>
        </div>
        <div className="overflow-x-auto">
          <RollingChart data={recentData} />
        </div>
      </div>

      {/* ── Config + CTA row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">

        {/* Left: controls */}
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          {/* Load profile picker */}
          <LoadProfilePicker />

          {/* System size slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                System size
              </p>
              <span className="text-sm font-black text-[var(--battery)] tabular-nums">
                {systemConfig.solarCapacityKW.toFixed(0)} kW solar
              </span>
            </div>
            <input
              type="range"
              min={2}
              max={100}
              step={1}
              value={systemConfig.solarCapacityKW}
              onChange={(e) => handleSolarChange(Number(e.target.value))}
              className="w-full accent-[var(--battery)]"
            />
            <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
              <span>2 kW</span>
              <span className="rounded bg-[var(--bg-card-muted)] px-2 py-0.5 text-[var(--text-secondary)]">
                Battery auto: {systemConfig.batteryCapacityKWh.toFixed(0)} kWh · Inverter: {systemConfig.inverterKW.toFixed(0)} kW
              </span>
              <span>100 kW</span>
            </div>
          </div>

          {/* Location quick-pick */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              Location
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_CITY_NAMES.map((city) => {
                const active = activeLocation.name === city;
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => handleLocationChip(city)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                      active
                        ? 'border-[var(--battery)] bg-[var(--battery-soft)] text-[var(--battery)]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]',
                    )}
                  >
                    {city}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-row gap-3 lg:flex-col lg:justify-end">
          <button
            type="button"
            onClick={onSaveRun}
            disabled={isSaving || minuteData.length === 0}
            className="flex flex-1 lg:flex-none items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving…' : 'Save Run'}
          </button>
          <Link
            href="/sizing"
            className="flex flex-1 lg:flex-none items-center justify-center gap-2 rounded-xl bg-[var(--battery)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="h-4 w-4" />
            Full Analysis
          </Link>
        </div>
      </div>

    </div>
  );
}
