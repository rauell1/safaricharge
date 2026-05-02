'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Zap, Battery, Car, Activity, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TimeSeriesChart } from '@/components/charts/TimeSeriesChart';
import { KpiCard } from '@/components/charts/KpiCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InverterParams {
  ratedKw: number;
  cableLengthM: number;
  cableMm2: number;
  gridConnected: boolean;
}

interface BatteryParams {
  strategy: 'self-consumption' | 'peak-shaving' | 'backup-resilience';
  capacityKwh: number;
  maxChargeKw: number;
  maxDischargeKw: number;
}

interface EVFleetParams {
  useCase: 'Residential' | 'Fleet Depot' | 'Public Station';
  vehicleCount: number;
  chargerKw: number;
  batteryKwh: number;
  smartCharging: boolean;
  v2gEnabled: boolean;
}

interface MinutePoint {
  time: string;
  dcOutputKw: number;
  acOutputKw: number;
  inverterEfficiency: number;
  socPct: number;
  chargePowerKw: number;
  dischargePowerKw: number;
  fleetLoadKw: number;
  v2gExportKw: number;
  smartDeferralKw: number;
  demandResponseShedKw: number;
  gridImportKw: number;
  gridExportKw: number;
  frequencyHz: number;
}

// ─── Solar profile generator (no simulation import) ──────────────────────────

function gaussianSolar(t: number, peakH: number, pvKw: number, weatherF: number): number {
  if (t < 6.2 || t > 18.8) return 0;
  const raw = Math.exp(-Math.pow(t - peakH, 2) / 8.0);
  return Math.max(0, pvKw * (raw / 1.0) * weatherF * 0.85);
}

function inverterEfficiency(loadFrac: number): number {
  if (loadFrac <= 0.05) return 0.82;
  if (loadFrac <= 0.3) return 0.93 + (loadFrac - 0.05) / 0.25 * 0.03;
  if (loadFrac <= 0.75) return 0.96 + (loadFrac - 0.3) / 0.45 * 0.01;
  if (loadFrac <= 1.0) return 0.97 - (loadFrac - 0.75) / 0.25 * 0.03;
  return 0.94;
}

function cableLossKw(acKw: number, lengthM: number, mm2: number): number {
  const conductivity = 56;
  const voltage = 230;
  return (acKw * acKw * lengthM) / (conductivity * mm2 * voltage * voltage);
}

function busFrequency(gen: number, load: number, gridConnected: boolean): number {
  if (gridConnected) return 50.0;
  const imbalance = load > 0 ? (gen - load) / load : 0;
  return Math.max(45, Math.min(55, 50 + 0.02 * imbalance * 100));
}

// ─── Main simulation function ─────────────────────────────────────────────────

function runDaySimulation(
  pvKw: number,
  inverter: InverterParams,
  battery: BatteryParams,
  ev: EVFleetParams,
  weatherFactor: number
): MinutePoint[] {
  const STEPS = 96; // 15-min intervals
  const DT_H = 0.25;
  const points: MinutePoint[] = [];

  let batKwh = battery.capacityKwh * 0.30;
  const reserveKwh = battery.strategy === 'backup-resilience' ? battery.capacityKwh * 0.30 : 0;

  for (let i = 0; i < STEPS; i++) {
    const t = (i / STEPS) * 24;
    const hh = Math.floor(t).toString().padStart(2, '0');
    const mm = Math.floor((t % 1) * 60).toString().padStart(2, '0');
    const time = `${hh}:${mm}`;

    // --- Solar / Inverter ---
    const dcKw = gaussianSolar(t, 12.75, pvKw, weatherFactor);
    const clipped = Math.min(dcKw, inverter.ratedKw);
    const loadFrac = inverter.ratedKw > 0 ? clipped / inverter.ratedKw : 0;
    const eff = inverterEfficiency(loadFrac);
    const acBeforeCable = clipped * eff;
    const cableLoss = cableLossKw(acBeforeCable, inverter.cableLengthM, inverter.cableMm2);
    const acKw = Math.max(0, acBeforeCable - cableLoss);

    // --- House load (simple profile) ---
    const houseProfileIndex = Math.floor(t) % 24;
    const houseProfile = [0.5, 0.4, 0.35, 0.3, 0.3, 0.4, 0.8, 1.2, 1.3, 1.1, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.1, 1.3, 1.5, 1.8, 2.0, 1.8, 1.5, 1.0, 0.7];
    const houseLoad = houseProfile[houseProfileIndex] * 1.2;

    // --- EV Fleet load ---
    let fleetKw = 0;
    let v2gKw = 0;
    let deferralKw = 0;
    let drShedKw = 0;
    const baseFleet = ev.vehicleCount * ev.chargerKw * 0.25;
    // Demand response: shed up to 50% of fleet load during peak if grid is tight
    const DR_PEAK_THRESHOLD_KW = inverter.ratedKw * 0.9;

    if (ev.useCase === 'Residential') {
      // Charge overnight + evening
      const isChargeWindow = (t >= 18 && t <= 23) || (t >= 0 && t <= 7);
      fleetKw = isChargeWindow ? baseFleet * 0.8 : baseFleet * 0.1;
      if (ev.smartCharging && t >= 10 && t <= 15 && acKw > houseLoad + 1) {
        fleetKw += baseFleet * 0.3;
        deferralKw = baseFleet * 0.3;
      }
      if (ev.v2gEnabled && t >= 17 && t <= 20) {
        v2gKw = Math.min(ev.vehicleCount * 3.0, baseFleet * 0.4);
      }
    } else if (ev.useCase === 'Fleet Depot') {
      fleetKw = t >= 22 || t <= 6 ? baseFleet * 1.2 : baseFleet * 0.2;
      if (ev.smartCharging && t >= 10 && t <= 14) deferralKw = baseFleet * 0.5;
    } else {
      fleetKw = t >= 8 && t <= 20 ? baseFleet * 0.9 : baseFleet * 0.15;
      if (ev.v2gEnabled && t >= 17 && t <= 19) v2gKw = baseFleet * 0.3;
    }

    const isPeak = t >= 17 && t <= 21;

    // Demand response shed: curtail fleet charging if total load exceeds DR threshold
    const totalLoadBeforeDR = houseLoad + fleetKw;
    if (isPeak && totalLoadBeforeDR > DR_PEAK_THRESHOLD_KW) {
      drShedKw = Math.min(fleetKw * 0.5, totalLoadBeforeDR - DR_PEAK_THRESHOLD_KW);
      fleetKw = Math.max(0, fleetKw - drShedKw);
    }

    const totalLoad = houseLoad + fleetKw;

    // --- Battery dispatch ---
    let surplus = Math.max(0, acKw + v2gKw - totalLoad);
    let deficit = Math.max(0, totalLoad - acKw - v2gKw);
    let chargeKw = 0;
    let dischargeKw = 0;
    const shouldDischarge =
      battery.strategy === 'self-consumption' ||
      battery.strategy === 'backup-resilience' ||
      (battery.strategy === 'peak-shaving' && isPeak);

    if (surplus > 0) {
      chargeKw = Math.min(surplus, battery.maxChargeKw);
      const headroom = battery.capacityKwh - batKwh;
      chargeKw = Math.min(chargeKw, headroom / DT_H);
      chargeKw = Math.max(0, chargeKw);
      batKwh = Math.min(battery.capacityKwh, batKwh + chargeKw * DT_H * 0.95);
    }

    if (deficit > 0 && shouldDischarge) {
      dischargeKw = Math.min(deficit, battery.maxDischargeKw);
      const available = Math.max(0, batKwh - reserveKwh);
      dischargeKw = Math.min(dischargeKw, available / DT_H);
      dischargeKw = Math.max(0, dischargeKw);
      batKwh = Math.max(reserveKwh, batKwh - dischargeKw * DT_H);
      deficit -= dischargeKw;
      surplus = 0;
    }

    const gridImport = Math.max(0, deficit);
    const gridExport = Math.max(0, surplus - chargeKw);
    const socPct = battery.capacityKwh > 0 ? (batKwh / battery.capacityKwh) * 100 : 0;
    const frequency = busFrequency(acKw + v2gKw + dischargeKw, totalLoad, inverter.gridConnected);

    points.push({
      time,
      dcOutputKw: parseFloat(dcKw.toFixed(2)),
      acOutputKw: parseFloat(acKw.toFixed(2)),
      inverterEfficiency: parseFloat((eff * 100).toFixed(1)),
      socPct: parseFloat(socPct.toFixed(1)),
      chargePowerKw: parseFloat(chargeKw.toFixed(2)),
      dischargePowerKw: parseFloat(dischargeKw.toFixed(2)),
      fleetLoadKw: parseFloat(fleetKw.toFixed(2)),
      v2gExportKw: parseFloat(v2gKw.toFixed(2)),
      smartDeferralKw: parseFloat(deferralKw.toFixed(2)),
      demandResponseShedKw: parseFloat(drShedKw.toFixed(2)),
      gridImportKw: parseFloat(gridImport.toFixed(2)),
      gridExportKw: parseFloat(gridExport.toFixed(2)),
      frequencyHz: parseFloat(frequency.toFixed(3)),
    });
  }

  return points;
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--bg-card-muted)] border border-[var(--border)] px-3 py-2 text-center">
      <div className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-wider mb-0.5">
        {label}
      </div>
      <div className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{value}</div>
    </div>
  );
}

// ─── Pill selector ────────────────────────────────────────────────────────────

function PillSelector<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
            value === o
              ? 'bg-[var(--battery)] text-white border-[var(--battery)]'
              : 'bg-[var(--bg-card-muted)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--battery)]/50'
          }`}
          aria-pressed={value === o}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// ─── Slider row ───────────────────────────────────────────────────────────────

function SliderRow({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
  unit,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="text-xs text-[var(--text-secondary)] font-medium">
          {label}
        </label>
        <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-[var(--battery)] cursor-pointer"
      />
    </div>
  );
}

// ─── Gauge (frequency) ────────────────────────────────────────────────────────

function FrequencyGauge({ hz }: { hz: number }) {
  const pct = ((hz - 45) / 10) * 100;
  const color =
    hz >= 49.5 && hz <= 50.5
      ? 'var(--battery)'
      : hz >= 48 && hz <= 51.5
        ? '#f59e0b'
        : 'var(--alert)';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
        <span>45 Hz</span>
        <span className="font-bold" style={{ color }}>
          {hz.toFixed(3)} Hz
        </span>
        <span>55 Hz</span>
      </div>
      <div className="h-3 rounded-full bg-[var(--bg-card-muted)] border border-[var(--border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }}
        />
      </div>
      <div className="relative h-2">
        <div
          className="absolute top-0 h-2 w-0.5 rounded"
          style={{ left: '45%', background: 'var(--battery)', opacity: 0.5 }}
        />
        <div
          className="absolute top-0 h-2 w-0.5 rounded"
          style={{ left: '55%', background: 'var(--battery)', opacity: 0.5 }}
        />
      </div>
      <div className="flex justify-center gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[var(--battery)] inline-block" />
          Normal (49.5–50.5)
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
          Warning
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-[var(--alert)] inline-block" />
          Alert
        </span>
      </div>
    </div>
  );
}

// ─── Node Graph (Power Flow) ──────────────────────────────────────────────────

function PowerFlowGraph({
  data,
}: {
  data: { gen: number; load: number; gridConnected: boolean };
}) {
  const lineLoss1 = Math.max(0, ((data.gen * 0.8) ** 2 * 0.05) / (0.4 * 0.4 * 1000));
  const lineLoss2 = Math.max(0, (((data.gen * 0.8 - data.load * 0.15) + data.gen * 0.2) ** 2 * 0.05) / (0.4 * 0.4 * 1000));
  const nodeColor = (g: number, l: number) => {
    const diff = g - l;
    if (diff > 0.5) return 'var(--battery)';
    if (diff < -0.5) return 'var(--alert)';
    return '#f59e0b';
  };

  const buses = [
    { id: 'Source', gen: data.gen * 0.8, load: data.load * 0.15 },
    { id: 'Feeder', gen: data.gen * 0.2, load: data.load * 0.35 },
    { id: 'Load', gen: 0, load: data.load * 0.5 },
  ];

  return (
    <svg viewBox="0 0 360 140" className="w-full overflow-visible" role="img" aria-label="Power flow diagram" preserveAspectRatio="xMidYMid meet">
      {/* Lines */}
      <line x1="96" y1="70" x2="148" y2="70" stroke="var(--border)" strokeWidth="2" />
      <line x1="212" y1="70" x2="264" y2="70" stroke="var(--border)" strokeWidth="2" />
      {/* Line loss labels */}
      <text x="122" y="58" fontSize="10" fill="var(--text-secondary)" textAnchor="middle">
        {lineLoss1.toFixed(2)} kW
      </text>
      <text x="238" y="58" fontSize="10" fill="var(--text-secondary)" textAnchor="middle">
        {lineLoss2.toFixed(2)} kW
      </text>
      {/* Nodes */}
      {buses.map((b, i) => {
        const cx = i === 0 ? 64 : i === 1 ? 180 : 296;
        const cy = 70;
        const loadRatio = (b.gen + b.load) > 0 ? b.load / (b.gen + b.load + 0.001) : 0.5;
        const r = 30;
        const color = nodeColor(b.gen, b.load);
        return (
          <g key={b.id}>
            <circle cx={cx} cy={cy} r={r} fill={color} fillOpacity={0.16} stroke={color} strokeWidth="1.8" />
            <text x={cx} y={cy - 4} fontSize="10" fill="var(--text-primary)" textAnchor="middle" fontWeight="700">
              {b.id}
            </text>
            <text x={cx} y={cy + 11} fontSize="9" fill="var(--text-secondary)" textAnchor="middle">
              {(b.gen - b.load).toFixed(1)} kW
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Default params ───────────────────────────────────────────────────────────

const DEFAULT_INVERTER: InverterParams = {
  ratedKw: 10,
  cableLengthM: 20,
  cableMm2: 6,
  gridConnected: true,
};

const DEFAULT_BATTERY: BatteryParams = {
  strategy: 'self-consumption',
  capacityKwh: 20,
  maxChargeKw: 5,
  maxDischargeKw: 5,
};

const DEFAULT_EV: EVFleetParams = {
  useCase: 'Residential',
  vehicleCount: 5,
  chargerKw: 7.4,
  batteryKwh: 60,
  smartCharging: true,
  v2gEnabled: false,
};

const DEFAULT_PV_KW = 15;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EnergyIntelligencePage() {
  const [pvKw, setPvKw] = useState(DEFAULT_PV_KW);
  const [inverter, setInverter] = useState<InverterParams>(DEFAULT_INVERTER);
  const [battery, setBattery] = useState<BatteryParams>(DEFAULT_BATTERY);
  const [ev, setEv] = useState<EVFleetParams>(DEFAULT_EV);
  const [weatherFactor, setWeatherFactor] = useState(0.85);

  const data = useMemo(
    () => runDaySimulation(pvKw, inverter, battery, ev, weatherFactor),
    [pvKw, inverter, battery, ev, weatherFactor]
  );

  const reset = useCallback(() => {
    setPvKw(DEFAULT_PV_KW);
    setInverter(DEFAULT_INVERTER);
    setBattery(DEFAULT_BATTERY);
    setEv(DEFAULT_EV);
    setWeatherFactor(0.85);
  }, []);

  // KPIs
  const dcPeak = useMemo(() => {
    let max = 0;
    for (const d of data) if (d.dcOutputKw > max) max = d.dcOutputKw;
    return max;
  }, [data]);

  const acPeak = useMemo(() => {
    let max = 0;
    for (const d of data) if (d.acOutputKw > max) max = d.acOutputKw;
    return max;
  }, [data]);

  const totalAcKwh = useMemo(
    () => data.reduce((s, d) => s + d.acOutputKw * 0.25, 0),
    [data]
  );

  const totalDcKwh = useMemo(
    () => data.reduce((s, d) => s + d.dcOutputKw * 0.25, 0),
    [data]
  );

  const clippingLoss = useMemo(
    () => Math.max(0, totalDcKwh - totalAcKwh),
    [totalDcKwh, totalAcKwh]
  );

  const acCableLoss = useMemo(
    () =>
      data.reduce((s, d) => {
        const loss = cableLossKw(d.acOutputKw, inverter.cableLengthM, inverter.cableMm2);
        return s + loss * 0.25;
      }, 0),
    [data, inverter.cableLengthM, inverter.cableMm2]
  );

  const gridExportKwh = useMemo(
    () => data.reduce((s, d) => s + d.gridExportKw * 0.25, 0),
    [data]
  );

  const batCycles = useMemo(() => {
    const throughput = data.reduce((s, d) => s + (d.chargePowerKw + d.dischargePowerKw) * 0.25, 0);
    return battery.capacityKwh > 0 ? throughput / (2 * battery.capacityKwh) : 0;
  }, [data, battery.capacityKwh]);

  /**
   * Simplified health model: ~0.03% degradation per full equivalent cycle
   * (LFP: ~3000+ cycles to 80% — 0.007%/cycle; NMC: ~500–2000 cycles).
   * We apply 0.03%/cycle as a conservative average.
   */
  const batHealthPct = useMemo(
    () => Math.max(70, 100 - batCycles * 365 * 0.03),
    [batCycles]
  );

  const throughputKwh = useMemo(
    () => data.reduce((s, d) => s + (d.chargePowerKw + d.dischargePowerKw) * 0.25, 0),
    [data]
  );

  const peakFleetDemand = useMemo(() => {
    let max = 0;
    for (const d of data) if (d.fleetLoadKw > max) max = d.fleetLoadKw;
    return max;
  }, [data]);

  const totalV2g = useMemo(
    () => data.reduce((s, d) => s + d.v2gExportKw * 0.25, 0),
    [data]
  );

  const totalDrShedKwh = useMemo(
    () => data.reduce((s, d) => s + d.demandResponseShedKw * 0.25, 0),
    [data]
  );

  const evSessions = ev.vehicleCount * (ev.useCase === 'Fleet Depot' ? 1 : 2);

  const lastPoint = data[data.length - 1] ?? { frequencyHz: 50, gridImportKw: 0, gridExportKw: 0 };
  const avgFreq = useMemo(
    () => data.reduce((s, d) => s + d.frequencyHz, 0) / Math.max(1, data.length),
    [data]
  );

  const totalLossKwh = useMemo(
    () =>
      data.reduce((s, d) => {
        const l1 = Math.max(0, ((d.acOutputKw * 0.8) ** 2 * 0.05) / (0.4 * 0.4 * 1000));
        const l2 = Math.max(0, ((d.acOutputKw * 0.2) ** 2 * 0.05) / (0.4 * 0.4 * 1000));
        return s + (l1 + l2) * 0.25;
      }, 0),
    [data]
  );

  const netImportExportKwh = useMemo(
    () => data.reduce((s, d) => s + (d.gridExportKw - d.gridImportKw) * 0.25, 0),
    [data]
  );

  const heroCards = useMemo(
    () => [
      {
        title: 'Solar generation',
        value: `${totalAcKwh.toFixed(1)} kWh`,
        hint: `DC peak ${dcPeak.toFixed(1)} kW`,
      },
      {
        title: 'Battery capacity',
        value: `${battery.capacityKwh} kWh`,
        hint: `${(data[data.length - 1]?.socPct ?? 0).toFixed(0)}% SoC now`,
      },
      {
        title: 'Grid reliability',
        value: `${avgFreq.toFixed(3)} Hz`,
        hint: inverter.gridConnected ? 'Grid-tied · stable' : 'Islanded · microgrid',
      },
      {
        title: 'EV readiness',
        value: `${ev.vehicleCount} vehicles`,
        hint: `${ev.useCase} · ${ev.smartCharging ? 'Smart charging' : 'Manual'}`,
      },
    ],
    [avgFreq, battery.capacityKwh, data, dcPeak, ev.smartCharging, ev.useCase, ev.vehicleCount, inverter.gridConnected, totalAcKwh]
  );

  const CABLE_MM2_OPTIONS = [4, 6, 10, 16, 25, 35];

  return (
    <DashboardLayout activeSection="energy-intelligence">
      {/* ─── Hero ────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-6">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-card">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-100"
            style={{
              background:
                'linear-gradient(135deg, var(--battery-soft), transparent 46%), linear-gradient(225deg, var(--grid-soft), transparent 48%), linear-gradient(0deg, var(--warning-soft), transparent 70%)',
            }}
          />
          <div className="relative px-5 sm:px-8 py-7 sm:py-8">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(32rem,1fr)_minmax(22rem,26rem)] lg:items-center">
              <div className="w-full min-w-0 max-w-none space-y-4 lg:min-w-[32rem] lg:max-w-2xl">
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-1 text-[var(--text-primary)]">
                    <Zap className="h-3.5 w-3.5 text-[var(--solar)]" />
                    Energy storage
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-1">
                    Battery &amp; grid stability
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-1">
                    EV fleet charging
                  </span>
                </div>
                <div className="sc-readable-copy space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                    Energy Storage Insights
                  </h1>
                  <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed break-normal whitespace-normal">
                    Grid performance, storage operations, and EV charging stitched together at 15-minute resolution.
                    Tune the scenario, watch the chart respond, and keep resilience in view.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                  {['Live telemetry', '15-min resolution', 'Kenya grid + EV ready'].map((tag) => (
                    <span
                      key={tag}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-1"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--battery)] animate-pulse-glow" />
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                    <span className="h-2 w-2 rounded-full bg-[var(--battery)] animate-pulse-glow" />
                    Simulation updates instantly with every control change.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={reset}
                    className="gap-1.5 border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reset scenario
                  </Button>
                </div>
              </div>

              <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 lg:w-[26rem] lg:min-w-[22rem]">
                {heroCards.map((card) => (
                  <div
                    key={card.title}
                    className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--bg-card-muted)] backdrop-blur-sm p-4 shadow-sm"
                  >
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] break-normal whitespace-normal">
                      {card.title}
                    </p>
                    <p className="text-lg font-bold text-[var(--text-primary)] tabular-nums break-normal whitespace-normal">{card.value}</p>
                    <p className="mt-1.5 text-xs text-[var(--text-secondary)] break-normal whitespace-normal">{card.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-10 space-y-6 mt-6">
        {/* ─── Grid ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          {/* ═══ Panel A: Solar + Inverter ═══════════════════════════ */}
          <Card className="dashboard-card">
            <CardHeader className="px-4 sm:px-6 pt-4 pb-2 flex flex-row items-center gap-2">
              <Zap className="h-4 w-4 text-[var(--solar)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Solar Generation &amp; Inverter
              </h2>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 space-y-4">
              <TimeSeriesChart
                series={[
                  { key: 'dcOutputKw', label: 'DC Output (kW)', color: 'var(--solar)', type: 'area' },
                  { key: 'acOutputKw', label: 'AC Output (kW)', color: 'var(--battery)', type: 'line' },
                  {
                    key: 'inverterEfficiency',
                    label: 'Efficiency (%)',
                    color: 'var(--grid)',
                    type: 'line',
                    yAxisId: 'right',
                    dashed: true,
                  },
                ]}
                data={data}
                xKey="time"
                leftAxisLabel="kW"
                rightAxisLabel="%"
                height={240}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                <StatChip label="DC Peak" value={`${dcPeak.toFixed(2)} kW`} />
                <StatChip label="AC Peak" value={`${acPeak.toFixed(2)} kW`} />
                <StatChip label="Clipping" value={`${clippingLoss.toFixed(2)} kWh`} />
                <StatChip label="Cable Loss" value={`${acCableLoss.toFixed(2)} kWh`} />
                <StatChip label="Grid Export" value={`${gridExportKwh.toFixed(1)} kWh`} />
              </div>
              {/* Controls */}
              <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                <SliderRow id="pv-kw" label="PV Capacity (kW)" min={1} max={50} step={1} value={pvKw} onChange={setPvKw} unit=" kW" />
                <SliderRow id="inv-kw" label="Inverter Rated kW" min={1} max={50} step={1} value={inverter.ratedKw}
                  onChange={(v) => setInverter((p) => ({ ...p, ratedKw: v }))} unit=" kW" />
                <SliderRow id="cable-len" label="Cable Length (m)" min={5} max={200} step={5} value={inverter.cableLengthM}
                  onChange={(v) => setInverter((p) => ({ ...p, cableLengthM: v }))} unit=" m" />
                <div className="flex items-center gap-3">
                  <label className="text-xs text-[var(--text-secondary)] font-medium" htmlFor="cable-mm2">
                    Cable Cross-section
                  </label>
                  <select
                    id="cable-mm2"
                    value={inverter.cableMm2}
                    onChange={(e) => setInverter((p) => ({ ...p, cableMm2: Number(e.target.value) }))}
                    className="ml-auto text-xs rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-primary)] px-2 py-1"
                    aria-label="Cable cross-section in mm²"
                  >
                    {CABLE_MM2_OPTIONS.map((v) => (
                      <option key={v} value={v}>{v} mm²</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inverter.gridConnected}
                    onChange={(e) => setInverter((p) => ({ ...p, gridConnected: e.target.checked }))}
                    className="accent-[var(--battery)]"
                  />
                  Grid Connected
                </label>
                <SliderRow id="weather" label="Weather Factor" min={0.3} max={1.0} step={0.05} value={weatherFactor} onChange={setWeatherFactor} />
              </div>
            </CardContent>
          </Card>

          {/* ═══ Panel B: Battery SoC ═══════════════════════════════ */}
          <Card className="dashboard-card">
            <CardHeader className="px-4 sm:px-6 pt-4 pb-2 flex flex-row items-center gap-2">
              <Battery className="h-4 w-4 text-[var(--battery)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Battery SoC &amp; Dispatch
              </h2>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 space-y-4">
              <TimeSeriesChart
                series={[
                  { key: 'socPct', label: 'SoC (%)', color: 'var(--battery)', type: 'area' },
                  { key: 'chargePowerKw', label: 'Charge (kW)', color: 'var(--solar)', type: 'line' },
                  { key: 'dischargePowerKw', label: 'Discharge (kW)', color: 'var(--alert)', type: 'line' },
                ]}
                data={data}
                xKey="time"
                leftAxisLabel="%/kW"
                height={240}
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatChip label="Cycles" value={batCycles.toFixed(2)} />
                <StatChip label="Health %" value={`${batHealthPct.toFixed(1)} %`} />
                <StatChip label="Throughput" value={`${throughputKwh.toFixed(1)} kWh`} />
                <StatChip label="Reserve Floor" value={battery.strategy === 'backup-resilience' ? '30 %' : '0 %'} />
              </div>
              <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-wider mb-1.5">
                    Strategy
                  </p>
                  <PillSelector
                    label="Battery strategy"
                    options={['self-consumption', 'peak-shaving', 'backup-resilience'] as const}
                    value={battery.strategy}
                    onChange={(s) => setBattery((p) => ({ ...p, strategy: s }))}
                  />
                </div>
                <SliderRow id="bat-kwh" label="Capacity (kWh)" min={5} max={100} step={5} value={battery.capacityKwh}
                  onChange={(v) => setBattery((p) => ({ ...p, capacityKwh: v }))} unit=" kWh" />
                <SliderRow id="bat-charge" label="Max Charge (kW)" min={1} max={25} step={1} value={battery.maxChargeKw}
                  onChange={(v) => setBattery((p) => ({ ...p, maxChargeKw: v }))} unit=" kW" />
                <SliderRow id="bat-discharge" label="Max Discharge (kW)" min={1} max={25} step={1} value={battery.maxDischargeKw}
                  onChange={(v) => setBattery((p) => ({ ...p, maxDischargeKw: v }))} unit=" kW" />
              </div>
            </CardContent>
          </Card>

          {/* ═══ Panel C: EV Fleet ══════════════════════════════════ */}
          <Card className="dashboard-card">
            <CardHeader className="px-4 sm:px-6 pt-4 pb-2 flex flex-row items-center gap-2">
              <Car className="h-4 w-4 text-[var(--ev)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                EV Fleet Charging
              </h2>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 space-y-4">
              <TimeSeriesChart
                series={[
                  { key: 'fleetLoadKw', label: 'Fleet Load (kW)', color: 'var(--ev)', type: 'area' },
                  { key: 'v2gExportKw', label: 'V2G Export (kW)', color: 'var(--solar)', type: 'area', fillOpacity: 0.3 },
                  { key: 'smartDeferralKw', label: 'Smart Deferral (kW)', color: 'var(--grid)', type: 'line', dashed: true },
                ]}
                data={data}
                xKey="time"
                leftAxisLabel="kW"
                height={240}
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatChip label="Peak Demand" value={`${peakFleetDemand.toFixed(2)} kW`} />
                <StatChip label="V2G Exported" value={`${totalV2g.toFixed(1)} kWh`} />
                <StatChip label="Sessions" value={`${evSessions}`} />
                <StatChip label="DR Shed" value={`${totalDrShedKwh.toFixed(1)} kWh`} />
              </div>
              <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                <div>
                  <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-wider mb-1.5">
                    Use Case
                  </p>
                  <PillSelector
                    label="EV use case"
                    options={['Residential', 'Fleet Depot', 'Public Station'] as const}
                    value={ev.useCase}
                    onChange={(v) => setEv((p) => ({ ...p, useCase: v }))}
                  />
                </div>
                <SliderRow id="ev-count" label="Vehicle Count" min={1} max={50} step={1} value={ev.vehicleCount}
                  onChange={(v) => setEv((p) => ({ ...p, vehicleCount: v }))} />
                <SliderRow id="ev-charger-kw" label="Charger kW" min={3.7} max={22} step={3.7} value={ev.chargerKw}
                  onChange={(v) => setEv((p) => ({ ...p, chargerKw: v }))} unit=" kW" />
                <SliderRow id="ev-bat-kwh" label="Battery kWh / Vehicle" min={40} max={120} step={10} value={ev.batteryKwh}
                  onChange={(v) => setEv((p) => ({ ...p, batteryKwh: v }))} unit=" kWh" />
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                    <input type="checkbox" checked={ev.smartCharging}
                      onChange={(e) => setEv((p) => ({ ...p, smartCharging: e.target.checked }))}
                      className="accent-[var(--battery)]" />
                    Smart Charging
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                    <input type="checkbox" checked={ev.v2gEnabled}
                      onChange={(e) => setEv((p) => ({ ...p, v2gEnabled: e.target.checked }))}
                      className="accent-[var(--battery)]" />
                    V2G
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ═══ Panel D: Grid Power Flow ════════════════════════════ */}
          <Card className="dashboard-card">
            <CardHeader className="px-4 sm:px-6 pt-4 pb-2 flex flex-row items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--grid)]" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Grid Power Flow
              </h2>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 space-y-4">
              {/* Node graph */}
              <PowerFlowGraph
                data={{
                  gen: lastPoint.acOutputKw,
                  load: lastPoint.gridImportKw + lastPoint.gridExportKw + 2,
                  gridConnected: inverter.gridConnected,
                }}
              />
              {/* Frequency gauge */}
              <div className="pt-2">
                <p className="text-xs text-[var(--text-tertiary)] font-semibold uppercase tracking-wider mb-2">
                  Grid Frequency
                </p>
                <FrequencyGauge hz={avgFreq} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatChip label="Avg Frequency" value={`${avgFreq.toFixed(3)} Hz`} />
                <StatChip label="Total Losses" value={`${totalLossKwh.toFixed(2)} kWh`} />
                <StatChip
                  label="Net Import/Export"
                  value={`${netImportExportKwh >= 0 ? '+' : ''}${netImportExportKwh.toFixed(1)} kWh`}
                />
                <StatChip label="Voltage Dev." value={`~${(lastPoint.gridImportKw * 0.1).toFixed(1)} %`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Summary KPI row ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Today's Solar" value={totalAcKwh.toFixed(1)} unit="kWh" color="var(--solar)" />
          <KpiCard label="Battery SoC" value={`${(data[data.length - 1]?.socPct ?? 0).toFixed(0)}`} unit="%" color="var(--battery)" />
          <KpiCard label="EV Fleet Load" value={peakFleetDemand.toFixed(1)} unit="kW" color="var(--ev)" />
          <KpiCard label="Grid Frequency" value={avgFreq.toFixed(3)} unit="Hz" color="var(--grid)" />
          <KpiCard label="Total Loss" value={totalLossKwh.toFixed(2)} unit="kWh" color="var(--alert)" />
          <KpiCard label="Grid Export" value={gridExportKwh.toFixed(1)} unit="kWh" color="var(--solar)" />
        </div>
      </div>
    </DashboardLayout>
  );
}
