'use client';

import React, { useMemo } from 'react';
import { Car, Zap, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import {
  useEnergyNode,
  useSimulationState,
} from '@/hooks/useEnergySystem';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EVSectionProps {
  evKey: 'ev1' | 'ev2';
  label: string;
  capacityKWh: number;
  tariffRate: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format decimal hours as h:mm */
function formatTimeToFull(hours: number): string {
  if (!isFinite(hours) || hours <= 0) return 'Full';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

// ---------------------------------------------------------------------------
// Single EV section
// ---------------------------------------------------------------------------

function EVSection({ evKey, label, capacityKWh, tariffRate }: EVSectionProps) {
  const node = useEnergyNode(evKey);
  const controls = useEnergySystemStore((s) => s.evControls[evKey]);
  const setEVCharging = useEnergySystemStore((s) => s.setEVCharging);
  const setEVChargeRate = useEnergySystemStore((s) => s.setEVChargeRate);

  const soc = node.soc ?? 0;
  const { isCharging, chargeRateKW, maxRateKW } = controls;

  // Derived stats
  const timeToFullHrs = useMemo(() => {
    if (soc >= 98) return 0;
    return ((100 - soc) / 100) * capacityKWh / chargeRateKW;
  }, [soc, capacityKWh, chargeRateKW]);

  const costPerHour = useMemo(() => (chargeRateKW * tariffRate).toFixed(2), [chargeRateKW, tariffRate]);

  // Status badge
  const statusBadge = useMemo(() => {
    if (soc >= 98) return { label: 'Full', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    if (isCharging) return { label: 'Charging', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
    return { label: 'Idle', color: 'bg-[var(--bg-card-muted)] text-[var(--text-tertiary)] border-[var(--border)]' };
  }, [soc, isCharging]);

  // SOC ring
  const RADIUS = 36;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDash = (soc / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card-muted)] p-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-[var(--text-secondary)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
        </div>
        <Badge className={`text-xs border ${statusBadge.color}`}>{statusBadge.label}</Badge>
      </div>

      {/* SOC ring + stats */}
      <div className="flex items-center gap-5">
        {/* Ring */}
        <div className="relative flex-shrink-0">
          <svg width="88" height="88" viewBox="0 0 88 88">
            {/* Track */}
            <circle
              cx="44" cy="44" r={RADIUS}
              fill="none"
              stroke="var(--border)"
              strokeWidth="8"
            />
            {/* Progress */}
            <circle
              cx="44" cy="44" r={RADIUS}
              fill="none"
              stroke={soc >= 98 ? 'var(--color-blue, #3b82f6)' : isCharging ? 'var(--battery, #22c55e)' : 'var(--text-tertiary)'}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${CIRCUMFERENCE}`}
              transform="rotate(-90 44 44)"
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-[var(--text-primary)] leading-tight">{Math.round(soc)}%</span>
            <span className="text-[10px] text-[var(--text-tertiary)]">SOC</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Zap className="h-3 w-3 flex-shrink-0" />
            <span>{isCharging ? `${chargeRateKW.toFixed(1)} kW` : '0.0 kW'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>{isCharging && soc < 98 ? formatTimeToFull(timeToFullHrs) : '—'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <DollarSign className="h-3 w-3 flex-shrink-0" />
            <span>{isCharging ? `KES ${costPerHour}/hr` : '—'}</span>
          </div>
        </div>
      </div>

      {/* Toggle row */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--text-secondary)]">Charging</span>
        <Switch
          checked={isCharging}
          onCheckedChange={(checked) => setEVCharging(evKey, checked)}
          aria-label={`Toggle ${label} charging`}
        />
      </div>

      {/* Charge rate slider */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-secondary)]">Charge rate</span>
          <span className="text-xs font-semibold text-[var(--text-primary)]">
            {chargeRateKW.toFixed(1)} kW
          </span>
        </div>
        <Slider
          min={1}
          max={maxRateKW}
          step={0.5}
          value={[chargeRateKW]}
          onValueChange={([val]) => setEVChargeRate(evKey, val)}
          disabled={!isCharging || soc >= 98}
          aria-label={`${label} charge rate`}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-[var(--text-faint)]">
          <span>1 kW</span>
          <span>{maxRateKW} kW</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

export interface EVChargingCardProps {
  /** Current tariff rate (KES/kWh) — pass from the simulation tick */
  tariffRate?: number;
}

export function EVChargingCard({ tariffRate = 14.93 }: EVChargingCardProps) {
  // Read EV capacities from the system config store
  const systemConfig = useEnergySystemStore((s) => s.systemConfig);
  const { isAutoMode } = useSimulationState();

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
          <Zap className="h-5 w-5 text-[var(--solar)]" />
          EV Charging
          {isAutoMode && (
            <span className="ml-auto text-xs font-normal text-[var(--text-tertiary)] italic">Auto mode</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <EVSection
          evKey="ev1"
          label="EV 1"
          capacityKWh={systemConfig.ev1CapacityKWh}
          tariffRate={tariffRate}
        />
        <EVSection
          evKey="ev2"
          label="EV 2"
          capacityKWh={systemConfig.ev2CapacityKWh}
          tariffRate={tariffRate}
        />
      </CardContent>
    </Card>
  );
}

export default EVChargingCard;
