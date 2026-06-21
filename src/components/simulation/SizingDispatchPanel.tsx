'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ExternalLink, Zap, TrendingUp, Sun, Cable } from 'lucide-react';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { runSimulation } from '@/lib/sizing/solarCalculator';
import type { SimulationInputs } from '@/lib/sizing/solarCalculator';
import {
  SOLAR_LOCATIONS,
  LOAD_PROFILES,
  INVERTER_CATALOG,
  PANEL_CATALOG,
  BATTERY_CATALOG,
  PROJECT_PRESETS,
  KSH_PER_USD,
} from '@/lib/sizing/mockData';

// ─── Bridge: store config → SimulationInputs ────────────────────────────────

function buildInputs(
  systemConfig: {
    solarCapacityKW: number;
    batteryCapacityKWh: number;
    inverterKW: number;
    gridOutageEnabled: boolean;
    loadProfile?: 'residential' | 'commercial' | 'industrial' | 'fleet-depot';
  },
  locationName: string,
): SimulationInputs {
  const location =
    SOLAR_LOCATIONS.find(
      (l) => l.name.toLowerCase() === locationName.toLowerCase(),
    ) ?? SOLAR_LOCATIONS[0];

  const profileMap: Record<string, string> = {
    residential: 'profile-residential-med',
    commercial: 'profile-commercial-clinic',
    industrial: 'profile-industrial-light',
    'fleet-depot': 'profile-eco-lodge',
  };
  const loadProfile =
    LOAD_PROFILES.find(
      (l) => l.id === (profileMap[systemConfig.loadProfile ?? 'residential'] ?? 'profile-residential-med'),
    ) ?? LOAD_PROFILES[0];

  const panel = PANEL_CATALOG.find((p) => p.id === 'panel-jinko-580') ?? PANEL_CATALOG[0];
  const panelQty = Math.max(1, Math.round((systemConfig.solarCapacityKW * 1000) / (panel.ratingWatts ?? 580)));

  const hybridInverters = INVERTER_CATALOG.filter((i) => i.category === 'inverter');
  const inverter = hybridInverters.reduce((best, i) => {
    const di = Math.abs((i.ratingWatts ?? 0) / 1000 - systemConfig.inverterKW);
    const db = Math.abs((best.ratingWatts ?? 0) / 1000 - systemConfig.inverterKW);
    return di < db ? i : best;
  }, hybridInverters[0]);

  const battKWh = systemConfig.batteryCapacityKWh;
  const dynessProductLine: 'Stack100' | 'Stack280' | 'LV48' =
    battKWh <= 51.2 ? 'LV48' : battKWh <= 200 ? 'Stack100' : 'Stack280';
  const battery =
    dynessProductLine === 'LV48'
      ? (BATTERY_CATALOG.find((b) => b.id === 'bat-dyness-dl5.0') ?? BATTERY_CATALOG[0])
      : dynessProductLine === 'Stack100'
      ? (BATTERY_CATALOG.find((b) => b.id === 'bat-dyness-stack100-mod') ?? BATTERY_CATALOG[2])
      : (BATTERY_CATALOG.find((b) => b.id === 'bat-dyness-stack280-0.7c') ?? BATTERY_CATALOG[4]);
  const batteryQty = Math.max(1, Math.round(battKWh / (battery.capacityKWh ?? 5.12)));

  return {
    location,
    loadProfile,
    loadMultiplier: 1.0,
    panelId: panel.id,
    panelQty,
    inverterId: inverter.id,
    inverterQty: 1,
    batteryId: battery.id,
    batteryQty,
    mountingType: 'pitched',
    dcAcOversizeRatio: 1.3,
    targetBatteryKWh: battKWh,
    dynessProductLine,
    gridOutageSimulation: systemConfig.gridOutageEnabled,
    contingencyPercent: 5,
    epcMarginPercent: 18,
    dieselGenCapacityKW: 0,
    dieselFuelPriceUSD: 1.2,
    discountRate: 0.12,
    inflationRate: 0.055,
    projectLifeYears: 25,
    includeGeneratorInterface: false,
    includeWeatherproofEnclosure: true,
    includeKPLCapplication: false,
    includeOandM: true,
  };
}

// ─── Compact 24-hour dispatch SVG ────────────────────────────────────────────

function DispatchChart({
  rows,
}: {
  rows: import('@/lib/sizing/solarCalculator').HourlySimulationRow[];
}) {
  const W = 560;
  const H = 140;
  const padL = 30;
  const padR = 8;
  const padT = 8;
  const padB = 22;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const solar = rows.map((r) => r.solarKW);
  const load = rows.map((r) => r.loadKW);
  const gridImp = rows.map((r) => Math.max(0, r.gridImportKW));
  const soc = rows.map((r) => r.batterySoCAfter);

  const maxPow = Math.max(...solar, ...load, 1);

  const px = (i: number) => padL + (i / 23) * cW;
  const py = (v: number, max: number) => padT + cH - (v / max) * cH;
  const socPy = (v: number) => padT + cH - (v / 100) * cH;

  const toLine = (vals: number[], max: number) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v, max).toFixed(1)}`).join(' ');

  const toArea = (vals: number[], max: number) => {
    const top = toLine(vals, max);
    return `${top} L${px(23).toFixed(1)},${(padT + cH).toFixed(1)} L${px(0).toFixed(1)},${(padT + cH).toFixed(1)} Z`;
  };

  const hourLabels = [0, 6, 12, 18, 23];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[280px]" aria-label="24-hour dispatch chart">
      {/* Grid lines */}
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

      {/* Grid import area */}
      <path d={toArea(gridImp, maxPow)} fill="rgba(59,130,246,0.12)" />

      {/* Solar area */}
      <path d={toArea(solar, maxPow)} fill="rgba(251,191,36,0.12)" />

      {/* Lines */}
      <path d={toLine(gridImp, maxPow)} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
      <path d={toLine(solar, maxPow)} fill="none" stroke="#fbbf24" strokeWidth={2} />
      <path d={toLine(load, maxPow)} fill="none" stroke="#f87171" strokeWidth={1.5} strokeDasharray="5 3" />
      <path d={soc.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${socPy(v).toFixed(1)}`).join(' ')} fill="none" stroke="#34d399" strokeWidth={1.5} strokeDasharray="2 2" />

      {/* X-axis labels */}
      {hourLabels.map((h) => (
        <text
          key={h}
          x={px(h)}
          y={H - 4}
          textAnchor="middle"
          fontSize={9}
          fill="var(--text-tertiary)"
          fontFamily="monospace"
        >
          {String(h).padStart(2, '0')}h
        </text>
      ))}

      {/* Y-axis label */}
      <text x={padL - 4} y={padT + cH / 2} textAnchor="end" fontSize={9} fill="var(--text-tertiary)" fontFamily="monospace">
        {maxPow.toFixed(0)}kW
      </text>
    </svg>
  );
}

// ─── KPI chip ────────────────────────────────────────────────────────────────

function KpiChip({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{label}</span>
      </div>
      <div className={`text-base font-black tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

export function SizingDispatchPanel() {
  const systemConfig = useEnergySystemStore((s) => s.systemConfig);
  const activeLocation = useEnergySystemStore((s) => s.activeLocation);

  const inputs = useMemo(
    () => buildInputs(systemConfig, activeLocation.name),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      systemConfig.solarCapacityKW,
      systemConfig.batteryCapacityKWh,
      systemConfig.inverterKW,
      systemConfig.gridOutageEnabled,
      systemConfig.loadProfile,
      activeLocation.name,
    ],
  );

  const results = useMemo(() => {
    try {
      return runSimulation(inputs);
    } catch {
      return null;
    }
  }, [inputs]);

  if (!results) {
    return (
      <div className="py-6 text-center text-sm text-[var(--text-tertiary)]">
        Parametric analysis unavailable for current config.
      </div>
    );
  }

  const {
    hourlyProfile,
    solarCapacityKWp,
    batteryCapacityKWh: battKWh,
    annualPVGeneratedKWh,
    systemAutonomyPercent,
    simplePaybackYears,
    lcoeUSDPerKWh,
    cableSizingResults,
    totalCapExKSh,
    npvUSD,
  } = results;

  const lcoeKSh = (lcoeUSDPerKWh * KSH_PER_USD).toFixed(1);
  const selfSuff = systemAutonomyPercent.toFixed(0);
  const payback = simplePaybackYears > 0 ? `${simplePaybackYears.toFixed(1)} yr` : '—';

  return (
    <div className="space-y-4 py-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Parametric Dispatch Analysis
          </h3>
          <p className="text-xs text-[var(--text-tertiary)]">
            {solarCapacityKWp.toFixed(1)} kWp · {battKWh.toFixed(1)} kWh · {activeLocation.displayName} ·
            24-hour theoretical dispatch
          </p>
        </div>
        <Link
          href="/sizing"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--battery)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Full Analysis
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* KPI chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <KpiChip
          icon={Sun}
          label="Solar Gen / yr"
          value={`${(annualPVGeneratedKWh / 1000).toFixed(1)} MWh`}
          color="text-amber-400"
        />
        <KpiChip
          icon={Zap}
          label="Self-Sufficiency"
          value={`${selfSuff}%`}
          color="text-emerald-400"
        />
        <KpiChip
          icon={TrendingUp}
          label="Simple Payback"
          value={payback}
          color="text-sky-400"
        />
        <KpiChip
          icon={TrendingUp}
          label="LCOE"
          value={`${lcoeKSh} KSh/kWh`}
          color="text-violet-400"
        />
      </div>

      {/* 24h dispatch chart */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 overflow-x-auto">
        <div className="flex flex-wrap items-center gap-3 mb-2 text-[10px] text-[var(--text-tertiary)]">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-0.5 rounded bg-amber-400" /> Solar
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-0.5 rounded bg-red-400" style={{ borderTop: '1px dashed #f87171', background: 'transparent' }} /> Load
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-0.5 rounded bg-blue-400" /> Grid import
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-0.5 rounded bg-emerald-400" style={{ borderTop: '1px dotted #34d399', background: 'transparent' }} /> Batt SoC %
          </span>
        </div>
        <DispatchChart rows={hourlyProfile} />
      </div>

      {/* Cable sizing */}
      {cableSizingResults.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Cable className="h-3.5 w-3.5 text-[var(--grid)]" />
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              IEC 60364-5-52 Cable Sizing
            </span>
          </div>
          <div className="space-y-1">
            {cableSizingResults.slice(0, 3).map((c) => (
              <div
                key={c.circuit}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[11px] rounded-lg bg-[var(--bg-card-muted)] px-3 py-1.5 items-center"
              >
                <span className="text-[var(--text-secondary)] truncate">{c.circuit}</span>
                <span className="font-bold text-[var(--text-primary)] tabular-nums">
                  {c.recommendedSizeMM2} mm²
                </span>
                {c.parallelRuns > 1 && (
                  <span className="text-[var(--text-tertiary)]">×{c.parallelRuns}</span>
                )}
                <span className="text-[var(--text-tertiary)] tabular-nums">
                  {c.designCurrentA.toFixed(0)} A
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial summary strip */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 flex items-center justify-between">
          <span className="text-[var(--text-tertiary)]">Total CapEx</span>
          <span className="font-bold text-[var(--text-primary)]">
            KSh {(totalCapExKSh / 1_000_000).toFixed(2)} M
          </span>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 flex items-center justify-between">
          <span className="text-[var(--text-tertiary)]">25-yr NPV</span>
          <span className={`font-bold ${npvUSD >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            ${npvUSD >= 0 ? '+' : ''}{(npvUSD / 1000).toFixed(1)}K
          </span>
        </div>
      </div>

      {/* Project presets */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-2">
          Open a sample project in the Sizing Engine
        </p>
        <div className="flex flex-wrap gap-2">
          {PROJECT_PRESETS.map((p) => (
            <Link
              key={p.name}
              href="/sizing"
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:border-[var(--battery)] hover:text-[var(--battery)] transition-colors"
            >
              {p.name.split(' ').slice(0, 3).join(' ')} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
