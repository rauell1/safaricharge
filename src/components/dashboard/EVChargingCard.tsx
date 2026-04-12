'use client';

import React from 'react';
import { Car, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { useShallow } from 'zustand/shallow';

// ---------------------------------------------------------------------------
// Circular SoC ring
// ---------------------------------------------------------------------------

interface SocRingProps {
  soc: number; // 0–100
  color: string; // CSS colour string
  size?: number; // px
}

function SocRing({ soc, color, size = 64 }: SocRingProps) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.min(100, Math.max(0, soc));
  const dashOffset = circumference * (1 - filled / 100);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={6}
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.7s ease-in-out' }}
        />
      </svg>
      {/* Centre label */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}
      >
        <span>{Math.round(soc)}</span>
        <span style={{ fontSize: 9, color: 'var(--text-tertiary)', fontWeight: 400 }}>%</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

type EVStatus = 'Charging' | 'Idle' | 'Full';

function statusColor(status: EVStatus): { bg: string; text: string } {
  switch (status) {
    case 'Charging':
      return { bg: 'var(--battery-soft)', text: 'var(--battery)' };
    case 'Full':
      return { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' };
    default:
      return { bg: 'var(--bg-secondary)', text: 'var(--text-tertiary)' };
  }
}

function StatusBadge({ status }: { status: EVStatus }) {
  const { bg, text } = statusColor(status);
  return (
    <span
      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: bg, color: text }}
    >
      <Zap className="h-2.5 w-2.5" />
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Format hours as h:mm
// ---------------------------------------------------------------------------

function formatHours(h: number): string {
  if (!Number.isFinite(h) || h <= 0) return '—';
  const totalMins = Math.round(h * 60);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${hrs}:${String(mins).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Single EV row
// ---------------------------------------------------------------------------

interface EVRowProps {
  label: string;
  soc: number;
  powerKW: number;
  capacityKWh: number;
  isCharging: boolean;
  chargeRateKW: number;
  maxRateKW: number;
  tariffRate: number;
  onToggle: (v: boolean) => void;
  onRateChange: (v: number) => void;
}

function EVRow({
  label,
  soc,
  powerKW,
  capacityKWh,
  isCharging,
  chargeRateKW,
  maxRateKW,
  tariffRate,
  onToggle,
  onRateChange,
}: EVRowProps) {
  const evStatus: EVStatus = soc >= 98 ? 'Full' : isCharging ? 'Charging' : 'Idle';
  const ringColor =
    evStatus === 'Full' ? '#3b82f6' : evStatus === 'Charging' ? 'var(--battery)' : 'var(--text-tertiary)';

  // Time to full: ((100 - soc) * capacityKWh) / chargeRateKW hours
  const timeToFull = chargeRateKW > 0 ? ((100 - soc) * capacityKWh) / 100 / chargeRateKW : Infinity;

  // Charging cost KES/hr
  const costPerHr = chargeRateKW * tariffRate;

  return (
    <div className="space-y-3">
      {/* Header row: icon + name + SoC ring + badge */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="flex items-center justify-center rounded-lg p-1.5"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
          >
            <Car className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{label}</p>
            <StatusBadge status={evStatus} />
          </div>
        </div>
        <SocRing soc={soc} color={ringColor} size={60} />
      </div>

      {/* Toggle + Slider row */}
      <div className="flex items-center gap-3">
        <Switch
          checked={isCharging}
          onCheckedChange={onToggle}
          aria-label={`Toggle ${label} charging`}
        />
        <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
          {isCharging ? 'Charging' : 'Stopped'}
        </span>
        <div className="flex-1">
          <Slider
            value={[chargeRateKW]}
            min={1}
            max={maxRateKW}
            step={0.5}
            disabled={!isCharging}
            onValueChange={([v]) => onRateChange(v)}
            aria-label={`${label} charge rate`}
          />
        </div>
        <span
          className="text-xs font-semibold whitespace-nowrap"
          style={{ color: isCharging ? 'var(--battery)' : 'var(--text-tertiary)', minWidth: 36 }}
        >
          {chargeRateKW.toFixed(1)} kW
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div
          className="rounded-lg p-2 text-center border"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <div className="text-xs font-semibold text-[var(--text-primary)]">
            {powerKW.toFixed(1)} kW
          </div>
          <div className="text-[9px] text-[var(--text-tertiary)] mt-0.5">Power</div>
        </div>
        <div
          className="rounded-lg p-2 text-center border"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <div className="text-xs font-semibold text-[var(--text-primary)]">
            {formatHours(timeToFull)}
          </div>
          <div className="text-[9px] text-[var(--text-tertiary)] mt-0.5">To Full</div>
        </div>
        <div
          className="rounded-lg p-2 text-center border"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
        >
          <div className="text-xs font-semibold text-[var(--text-primary)]">
            {Math.round(costPerHr)} KES/hr
          </div>
          <div className="text-[9px] text-[var(--text-tertiary)] mt-0.5">Cost</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EVChargingCard
// ---------------------------------------------------------------------------

export function EVChargingCard() {
  const { ev1Node, ev2Node, evControls, systemConfig, setEVCharging, setEVChargeRate } =
    useEnergySystemStore(
      useShallow((s) => ({
        ev1Node: s.nodes.ev1,
        ev2Node: s.nodes.ev2,
        evControls: s.evControls,
        systemConfig: s.systemConfig,
        setEVCharging: s.setEVCharging,
        setEVChargeRate: s.setEVChargeRate,
      }))
    );

  // Current tariff — use peak/off-peak based on time of day from the store
  const timeOfDay = useEnergySystemStore((s) => s.timeOfDay);
  const isPeak = timeOfDay >= 17 && timeOfDay < 21;
  const tariffRate = isPeak
    ? systemConfig.gridTariff.peakRate
    : systemConfig.gridTariff.offPeakRate;

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)] text-sm">
          <Zap className="h-4 w-4" style={{ color: 'var(--battery)' }} />
          EV Charging
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-5">
        <EVRow
          label="EV 1"
          soc={ev1Node.soc ?? 0}
          powerKW={ev1Node.powerKW}
          capacityKWh={systemConfig.ev1CapacityKWh}
          isCharging={evControls.ev1.isCharging}
          chargeRateKW={evControls.ev1.chargeRateKW}
          maxRateKW={evControls.ev1.maxRateKW}
          tariffRate={tariffRate}
          onToggle={(v) => setEVCharging('ev1', v)}
          onRateChange={(v) => setEVChargeRate('ev1', v)}
        />

        {/* Divider */}
        <div className="border-t" style={{ borderColor: 'var(--border)' }} />

        <EVRow
          label="EV 2"
          soc={ev2Node.soc ?? 0}
          powerKW={ev2Node.powerKW}
          capacityKWh={systemConfig.ev2CapacityKWh}
          isCharging={evControls.ev2.isCharging}
          chargeRateKW={evControls.ev2.chargeRateKW}
          maxRateKW={evControls.ev2.maxRateKW}
          tariffRate={tariffRate}
          onToggle={(v) => setEVCharging('ev2', v)}
          onRateChange={(v) => setEVChargeRate('ev2', v)}
        />
      </CardContent>
    </Card>
  );
}
