'use client';

import React, { useMemo } from 'react';
import { Car, Zap, Clock, BanknoteIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { useEnergyNode } from '@/hooks/useEnergySystem';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Format decimal hours as "Xh Ym" (e.g. 1.5 → "1h 30m") */
function formatTimeToFull(hours: number): string {
  if (!isFinite(hours) || hours <= 0) return '—';
  if (hours > 99) return '>99h';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── sub-component for a single EV ───────────────────────────────────────────

interface EVRowProps {
  evKey: 'ev1' | 'ev2';
  label: string;
  capacityKWh: number;
  tariffRate: number;
}

function EVRow({ evKey, label, capacityKWh, tariffRate }: EVRowProps) {
  const evNode        = useEnergyNode(evKey);
  const evControls    = useEnergySystemStore((s) => s.evControls[evKey]);
  const setEVCharging = useEnergySystemStore((s) => s.setEVCharging);
  const setEVChargeRate = useEnergySystemStore((s) => s.setEVChargeRate);

  const soc          = evNode.soc ?? 0;
  const isFull       = soc >= 98;
  const { isCharging, chargeRateKW, maxRateKW } = evControls;

  // Time to full: ((100 - soc) / 100 * capacityKWh) / chargeRateKW
  const timeToFull = useMemo(() => {
    if (!isCharging || isFull || chargeRateKW <= 0) return null;
    return ((100 - soc) / 100 * capacityKWh) / chargeRateKW;
  }, [isCharging, isFull, soc, capacityKWh, chargeRateKW]);

  // Cost per hour at current tariff
  const costPerHour = isCharging ? chargeRateKW * tariffRate : 0;

  // Status badge
  const statusLabel = isFull ? 'Full' : isCharging ? 'Charging' : 'Idle';
  const statusColor = isFull
    ? 'var(--color-blue, #006494)'
    : isCharging
    ? 'var(--battery, #22c55e)'
    : 'var(--text-secondary, #7a7974)';

  // SVG ring dimensions
  const R   = 28;
  const C   = 2 * Math.PI * R;
  const arc = (soc / 100) * C;

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card-muted,var(--color-surface))]">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-[var(--text-secondary)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-0"
            style={{ color: statusColor, backgroundColor: `${statusColor}18` }}
          >
            {statusLabel}
          </Badge>
        </div>
        <Switch
          checked={isCharging}
          onCheckedChange={(val) => setEVCharging(evKey, val)}
          disabled={isFull}
          aria-label={`Toggle ${label} charging`}
        />
      </div>

      {/* SoC ring + stats */}
      <div className="flex items-center gap-4">
        {/* Ring */}
        <div className="relative flex-shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
            {/* Track */}
            <circle
              cx="36" cy="36" r={R}
              fill="none"
              stroke="var(--border)"
              strokeWidth="6"
            />
            {/* Progress */}
            <circle
              cx="36" cy="36" r={R}
              fill="none"
              stroke={isCharging && !isFull ? 'var(--battery, #22c55e)' : isFull ? 'var(--color-blue, #006494)' : 'var(--text-secondary)'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${arc} ${C}`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-bold text-[var(--text-primary)] leading-none">{Math.round(soc)}%</span>
            <span className="text-[10px] text-[var(--text-secondary)] leading-none mt-0.5">SoC</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 grid grid-cols-1 gap-1.5">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Zap className="h-3 w-3 flex-shrink-0" />
            <span>{isCharging ? `${chargeRateKW.toFixed(1)} kW` : '—'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>{timeToFull != null ? formatTimeToFull(timeToFull) : '—'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <BanknoteIcon className="h-3 w-3 flex-shrink-0" />
            <span>{isCharging ? `KES ${costPerHour.toFixed(0)}/hr` : '—'}</span>
          </div>
        </div>
      </div>

      {/* Charge rate slider */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-secondary)]">Charge rate</span>
          <span className="text-xs font-medium text-[var(--text-primary)]">{chargeRateKW.toFixed(1)} / {maxRateKW} kW</span>
        </div>
        <Slider
          min={1}
          max={maxRateKW}
          step={0.5}
          value={[chargeRateKW]}
          onValueChange={([val]) => setEVChargeRate(evKey, val)}
          disabled={!isCharging || isFull}
          aria-label={`${label} charge rate`}
          className="w-full"
        />
      </div>
    </div>
  );
}

// ─── main card ────────────────────────────────────────────────────────────────

export function EVChargingCard() {
  // Read current tariff from the latest minuteData point (falls back to off-peak rate)
  const minuteData   = useEnergySystemStore((s) => s.minuteData);
  const systemConfig = useEnergySystemStore((s) => s.systemConfig);
  const latestPoint  = minuteData[minuteData.length - 1];
  const tariffRate   = latestPoint?.tariffRate ?? systemConfig.gridTariff.offPeakRate;

  const ev1CapacityKWh = systemConfig.ev1CapacityKWh;
  const ev2CapacityKWh = systemConfig.ev2CapacityKWh;

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
          <Zap className="h-5 w-5 text-[var(--battery,#22c55e)]" />
          EV Charging
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col gap-3">
        <EVRow
          evKey="ev1"
          label="EV 1"
          capacityKWh={ev1CapacityKWh}
          tariffRate={tariffRate}
        />
        <EVRow
          evKey="ev2"
          label="EV 2"
          capacityKWh={ev2CapacityKWh}
          tariffRate={tariffRate}
        />
      </CardContent>
    </Card>
  );
}
