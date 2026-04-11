'use client';

import React, { useMemo } from 'react';
import { Car, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import {
  useEnergyNode,
  useMinuteData,
  useSimulationState,
} from '@/hooks/useEnergySystem';

// ---------------------------------------------------------------------------
// EV charger option catalogue
// ---------------------------------------------------------------------------

export type PowerDelivery = 'AC' | 'DC';

interface ChargerOption {
  label: string;
  rateKW: number;
  delivery: PowerDelivery;
}

const CHARGER_OPTIONS: ChargerOption[] = [
  { label: 'AC 3.7 kW  (Level 1)', rateKW: 3.7,  delivery: 'AC' },
  { label: 'AC 7.4 kW  (Level 2)', rateKW: 7.4,  delivery: 'AC' },
  { label: 'AC 11 kW   (Level 2)', rateKW: 11,   delivery: 'AC' },
  { label: 'AC 22 kW   (Level 2)', rateKW: 22,   delivery: 'AC' },
  { label: 'DC 50 kW   (Fast)',    rateKW: 50,   delivery: 'DC' },
  { label: 'DC 100 kW  (Rapid)',   rateKW: 100,  delivery: 'DC' },
  { label: 'DC 150 kW  (Ultra)',   rateKW: 150,  delivery: 'DC' },
];

// Battery capacity assumed for the demo EV (matches store initialNodes.ev1.capacityKWh)
const EV_CAPACITY_KWH = 80;

// ---------------------------------------------------------------------------
// SoC ring
// ---------------------------------------------------------------------------

function SoCRing({ soc, isCharging }: { soc: number; isCharging: boolean }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, soc)) / 100) * circ;

  const ringColor = isCharging
    ? 'var(--battery)'
    : soc >= 80
    ? 'var(--battery)'
    : soc >= 30
    ? 'var(--solar)'
    : 'var(--consumption)';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
      <svg viewBox="0 0 100 100" width="110" height="110" className="-rotate-90">
        {/* track */}
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="8"
        />
        {/* fill */}
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color: ringColor }}>
          {Math.round(soc)}%
        </span>
        <span className="text-[10px] text-[var(--text-tertiary)]">
          {isCharging ? 'Charging' : 'Idle'}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// EVChargingCard
// ---------------------------------------------------------------------------

export function EVChargingCard() {
  // ── store reads ────────────────────────────────────────────────────────────
  const evControls   = useEnergySystemStore((s) => s.evControls);
  const setEVCharging    = useEnergySystemStore((s) => s.setEVCharging);
  const setEVChargeOption = useEnergySystemStore((s) => s.setEVChargeOption);
  const evNode       = useEnergyNode('ev1');
  const minuteData   = useMinuteData('today');
  const { currentDate } = useSimulationState();

  const { isCharging, chargerOptionIndex } = evControls.ev1;
  const selectedOption = CHARGER_OPTIONS[chargerOptionIndex] ?? CHARGER_OPTIONS[1];

  // current SoC from live simulation node (falls back to minuteData latest)
  const latestSoC = useMemo(() => {
    const fromNode = evNode.soc ?? null;
    if (fromNode !== null) return fromNode;
    const last = minuteData[minuteData.length - 1];
    return last?.ev1SocPct ?? 0;
  }, [evNode.soc, minuteData]);

  // ── derived stats ──────────────────────────────────────────────────────────
  const kw = isCharging ? selectedOption.rateKW : 0;

  // Read live tariff rate from last minuteData point
  const tariffRate = useMemo(() => {
    const last = minuteData[minuteData.length - 1];
    return last?.tariffRate ?? 14.93;
  }, [minuteData]);

  const costPerHour = kw * tariffRate; // KES/hr

  const timeToFull = useMemo(() => {
    if (!isCharging || selectedOption.rateKW === 0) return null;
    const remaining = ((100 - latestSoC) / 100) * EV_CAPACITY_KWH;
    const hours = remaining / selectedOption.rateKW;
    if (hours <= 0) return 'Full';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  }, [isCharging, selectedOption.rateKW, latestSoC]);

  // status badge
  const badgeLabel = latestSoC >= 98 ? 'Full' : isCharging ? 'Charging' : 'Idle';
  const badgeColor =
    latestSoC >= 98
      ? 'var(--blue, #3b82f6)'
      : isCharging
      ? 'var(--battery)'
      : 'var(--text-tertiary)';

  const isPeakNow = useMemo(() => {
    const h = currentDate?.getHours() ?? new Date().getHours();
    return h >= 17 && h < 21;
  }, [currentDate]);

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
          <Car className="h-5 w-5" style={{ color: 'var(--battery)' }} />
          EV Charging
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* ── SoC ring + badge ───────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-2">
          <SoCRing soc={latestSoC} isCharging={isCharging} />
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
            style={{ color: badgeColor, borderColor: badgeColor }}
          >
            {badgeLabel}
          </span>
        </div>

        {/* ── Start / Stop toggle ────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3">
          <Label htmlFor="ev-toggle" className="text-sm font-medium text-[var(--text-primary)] cursor-pointer">
            Start charging
          </Label>
          <Switch
            id="ev-toggle"
            checked={isCharging}
            onCheckedChange={(v) => setEVCharging('ev1', v)}
            disabled={latestSoC >= 98}
          />
        </div>

        {/* ── Charger selector ───────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <Label className="text-xs text-[var(--text-secondary)]">Charger type &amp; size</Label>
          <Select
            value={String(chargerOptionIndex)}
            onValueChange={(v) => setEVChargeOption('ev1', Number(v))}
          >
            <SelectTrigger className="w-full bg-[var(--bg-card-muted)] border-[var(--border)] text-[var(--text-primary)]">
              <SelectValue placeholder="Select charger" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--bg-card)] border-[var(--border)]">
              {CHARGER_OPTIONS.map((opt, idx) => (
                <SelectItem
                  key={idx}
                  value={String(idx)}
                  className="text-[var(--text-primary)] focus:bg-[var(--bg-card-muted)]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                      style={{
                        backgroundColor: opt.delivery === 'DC' ? 'var(--solar-soft)' : 'var(--battery-soft)',
                        color: opt.delivery === 'DC' ? 'var(--solar)' : 'var(--battery)',
                      }}
                    >
                      {opt.delivery}
                    </span>
                    {opt.label.replace(/^(AC|DC)\s*/, '')}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ── Live stats row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Power', value: isCharging ? `${selectedOption.rateKW} kW` : '—' },
            { label: 'To full', value: timeToFull ?? '—' },
            { label: 'Cost/hr', value: isCharging ? `${Math.round(costPerHour)} KES` : '—' },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col items-center rounded-lg border border-[var(--border)] py-2 px-1"
              style={{ backgroundColor: 'var(--bg-card-muted)' }}
            >
              <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
              <span className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{value}</span>
            </div>
          ))}
        </div>

        {/* ── Peak warning ───────────────────────────────────────────────── */}
        {isPeakNow && isCharging && (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
            style={{ backgroundColor: 'var(--consumption-soft)', color: 'var(--consumption)' }}
          >
            <Zap className="h-3.5 w-3.5 flex-shrink-0" />
            Peak tariff active — charging costs {Math.round(costPerHour)} KES/hr
          </div>
        )}
      </CardContent>
    </Card>
  );
}
