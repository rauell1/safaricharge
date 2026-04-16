'use client';

/**
 * SimulationNodes.tsx
 *
 * Redesigned as a proper electrical single-line diagram (SLD):
 *
 *   ┌────────────────── DC Bus ──────────────────┐
 *   │                                            │
 * [Solar PV]                               [Battery]
 *   │ DC cable (yellow)                          │ (charge ↓ / discharge ↑)
 *   └──────────────── [Inverter] ────────────────┘
 *                          │
 *               ─── AC Bus (orange) ───
 *              │           │           │
 *           [Grid]      [Home]    [EV1] [EV2]
 *
 * Simulation controls (Play/Pause, speed chips, Reset) sit in a sticky
 * card at the top. The SLD diagram is below. Session totals are at the
 * bottom.
 */

import React, { useCallback } from 'react';
import {
  ChevronDown,
  UtilityPole,
  ArrowDown,
  ArrowUp,
  Home,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Car,
  BatteryCharging,
} from 'lucide-react';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  computeDaysOfAutonomy,
  computeNetMeteringCreditKesPerMonth,
  DEFAULT_BATTERY_DOD_PCT,
  DEFAULT_GENERATOR_THRESHOLD_PCT,
  SYSTEM_MODE_LABELS,
} from '@/lib/system-mode-metrics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type GridDirection   = 'import' | 'export' | 'neutral';
export type StorageDirection = 'charge' | 'discharge' | 'idle';

// ---------------------------------------------------------------------------
// RigidCable — vertical animated power cable
// ---------------------------------------------------------------------------
export const RigidCable = React.memo(
  ({
    height = 40,
    width = 2,
    active = false,
    color = 'bg-slate-300',
    flowDirection = 'down',
    speed = 1,
    arrowColor = 'text-white',
    powerKw = 0,
    capacityKw = 0,
    glowColor = 'var(--solar)',
    showLabel = false,
  }: {
    height?: number;
    width?: number;
    active?: boolean;
    color?: string;
    flowDirection?: string;
    speed?: number;
    arrowColor?: string;
    powerKw?: number;
    capacityKw?: number;
    glowColor?: string;
    showLabel?: boolean;
  }) => {
    const intensity  = Math.min(1, Math.max(0, capacityKw > 0 ? Math.abs(powerKw) / capacityKw : active ? 0.5 : 0));
    const thickness  = Math.max(width, 2 + intensity * 6);
    const duration   = `${Math.max(0.1, 0.8 / Math.max(0.2, Math.min(speed, 10)))}s`;
    const gradientAngle = flowDirection === 'down' ? '180deg' : '0deg';

    return (
      <div
        className="relative flex items-center justify-center transition-all duration-500"
        style={{ width: thickness, height }}
      >
        <div className={`absolute inset-0 rounded-full ${color}`} style={{ opacity: 0.35 + intensity * 0.4 }} />
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: active ? `linear-gradient(${gradientAngle}, transparent, ${glowColor})` : undefined,
            opacity: active ? 0.6 + intensity * 0.4 : 0.25,
            boxShadow: active ? `0 0 ${10 + intensity * 14}px ${glowColor}` : undefined,
          }}
        />
        {active && (
          <div
            className={`absolute left-1/2 -translate-x-1/2 z-10 ${
              flowDirection === 'down' ? 'animate-flow-down' : 'animate-flow-up'
            }`}
            style={{ animationDuration: duration }}
          >
            <div className={`bg-[var(--bg-card-muted)] rounded-full p-0.5 shadow-sm ${flowDirection === 'down' ? '' : 'rotate-180'}`}>
              <ChevronDown size={8 + intensity * 4} className={arrowColor} strokeWidth={4} />
            </div>
          </div>
        )}
        {showLabel && active && (
          <div className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[9px] font-bold text-[var(--text-primary)] shadow-sm whitespace-nowrap z-20">
            {Math.abs(powerKw).toFixed(1)} kW
          </div>
        )}
      </div>
    );
  }
);
RigidCable.displayName = 'RigidCable';

// ---------------------------------------------------------------------------
// HorizontalCable
// ---------------------------------------------------------------------------
export const HorizontalCable = React.memo(
  ({
    width = '100%',
    height = 2,
    color = 'bg-slate-300',
    active = false,
    powerKw = 0,
    capacityKw = 0,
    flowDirection = 'right',
    glowColor = 'var(--solar)',
    speed = 1,
    showLabel = false,
  }: {
    width?: string | number;
    height?: number;
    color?: string;
    active?: boolean;
    powerKw?: number;
    capacityKw?: number;
    flowDirection?: 'left' | 'right';
    glowColor?: string;
    speed?: number;
    showLabel?: boolean;
  }) => {
    const intensity         = Math.min(1, Math.max(0, capacityKw > 0 ? Math.abs(powerKw) / capacityKw : active ? 0.5 : 0));
    const thickness         = Math.max(height, 2 + intensity * 6);
    const particleAlign     = flowDirection === 'right' ? 'left-0' : 'right-0';
    const gradientDirection = flowDirection === 'right' ? '90deg' : '270deg';
    const duration          = `${Math.max(0.3, 2 / Math.max(0.2, Math.min(speed, 10)))}s`;

    return (
      <div
        className="relative transition-all duration-500 overflow-hidden rounded-full"
        style={{ width, height: thickness }}
      >
        <div className={`absolute inset-0 ${color} rounded-full`} style={{ opacity: 0.35 + intensity * 0.4 }} />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: active ? `linear-gradient(${gradientDirection}, transparent, ${glowColor})` : undefined,
            opacity: active ? 0.6 + intensity * 0.4 : 0.25,
            boxShadow: active ? `0 0 ${10 + intensity * 14}px ${glowColor}` : undefined,
          }}
        />
        {active && (
          <div
            className={`absolute ${particleAlign} top-1/2 -translate-y-1/2`}
            style={{
              width: '24%',
              height: '60%',
              background: `linear-gradient(${gradientDirection}, transparent, rgba(255,255,255,0.65))`,
              animation: `${flowDirection === 'right' ? 'flow-left-to-right' : 'flow-right-to-left'} ${duration} linear infinite`,
            }}
          />
        )}
        {showLabel && active && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-5 px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[9px] font-bold text-[var(--text-primary)] shadow-sm whitespace-nowrap z-20">
            {Math.abs(powerKw).toFixed(1)} kW
          </div>
        )}
      </div>
    );
  }
);
HorizontalCable.displayName = 'HorizontalCable';

// ---------------------------------------------------------------------------
// SolarPanelProduct
// ---------------------------------------------------------------------------
export const SolarPanelProduct = React.memo(
  ({ power, capacity, weather, isNight }: { power: number; capacity: number; weather: string; isNight: boolean }) => {
    const safeCapacity  = Math.max(0, capacity);
    const utilization   = safeCapacity > 0 ? Math.min(1, power / safeCapacity) : 0;
    const isActive      = power > 0.1 && !isNight;

    return (
      <div className="flex flex-col items-center gap-2">
        {/* Panel face */}
        <div
          className={`w-44 h-28 rounded-xl border-2 shadow-xl relative overflow-hidden transition-all duration-500 hover:scale-[1.03] active:scale-95 ${
            isNight
              ? 'bg-slate-900 border-slate-700 opacity-60'
              : 'bg-gradient-to-br from-sky-900 to-slate-900 border-slate-300'
          } ${isActive ? 'shadow-[0_0_20px_var(--solar)]' : ''}`}
        >
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-2 gap-0.5 opacity-30 pointer-events-none">
            {[...Array(12)].map((_, i) => <div key={i} className="bg-slate-300" />)}
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
          {!isNight && (
            <div
              className={`absolute top-0 rounded-full w-24 h-24 transition-all duration-1000 blur-xl ${
                weather === 'Sunny' ? 'bg-white/30 opacity-70' : weather === 'Rainy' ? 'bg-slate-400/20 opacity-20' : 'bg-white/10 opacity-40'
              }`}
              style={{ left: `${utilization * 80}%` }}
            />
          )}
          {isNight && <div className="absolute top-2 right-4 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_white] animate-pulse" />}
          {/* Utilisation bar overlay */}
          <div className="absolute bottom-0 left-0 h-1 bg-[var(--solar)] transition-all duration-500" style={{ width: `${utilization * 100}%`, opacity: 0.8 }} />
        </div>
        {/* Label */}
        <div className="text-center bg-[var(--bg-card)]/90 px-3 py-1.5 rounded-lg border border-[var(--border)] backdrop-blur-sm w-full">
          <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">PV Array · {safeCapacity.toFixed(1)} kWp</div>
          <div className="text-lg font-black text-[var(--solar)] leading-none mt-0.5">
            {power.toFixed(2)} <span className="text-xs font-normal text-[var(--text-secondary)]">kW</span>
          </div>
          <div className="text-[9px] text-[var(--text-tertiary)] mt-0.5">
            {isNight ? '🌙 Night — no generation' : `${(utilization * 100).toFixed(0)}% utilisation`}
          </div>
        </div>
      </div>
    );
  }
);
SolarPanelProduct.displayName = 'SolarPanelProduct';

// ---------------------------------------------------------------------------
// InverterProduct
// ---------------------------------------------------------------------------
export const InverterProduct = React.memo(
  ({ power, ratedCapacityKw }: { id?: number | string; power: number; ratedCapacityKw: number }) => {
    const loadPct = ratedCapacityKw > 0 ? Math.min(100, (Math.abs(power) / ratedCapacityKw) * 100) : 0;
    const isActive = Math.abs(power) > 0.1;
    return (
      <div className={`flex flex-col items-center bg-[var(--bg-card)] rounded-xl border ${
        isActive ? 'border-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.3)]' : 'border-[var(--border)]'
      } w-36 p-3 gap-1.5 transition-all duration-500`}>
        <div className="w-full flex justify-between items-center">
          <span className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">Inverter · {ratedCapacityKw.toFixed(0)} kW</span>
          <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-orange-400 animate-pulse' : 'bg-[var(--border)]'}`} />
        </div>
        <div className="bg-slate-800 rounded w-full h-9 flex items-center justify-center font-mono text-orange-400 text-sm shadow-inner">
          {power.toFixed(2)} kW
        </div>
        <div className="w-full bg-[var(--bg-card-muted)] rounded-full h-1.5 overflow-hidden">
          <div className="h-full rounded-full bg-orange-400 transition-all duration-500" style={{ width: `${loadPct}%` }} />
        </div>
        <div className="text-[9px] text-[var(--text-tertiary)]">{loadPct.toFixed(0)}% load</div>
      </div>
    );
  }
);
InverterProduct.displayName = 'InverterProduct';

// ---------------------------------------------------------------------------
// BatteryProduct
// ---------------------------------------------------------------------------
export const BatteryProduct = React.memo(
  ({ level, status, power, health = 1.0, cycles = 0, capacityKwh = 60 }: {
    level: number; status: string; power: number; health?: number; cycles?: number; capacityKwh?: number;
  }) => (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-36 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-lg flex flex-col items-center justify-center overflow-hidden transition-all duration-500 hover:-translate-y-1">
        <div className="absolute top-2 text-[7px] font-black text-[var(--border)] tracking-widest">SAFARICHARGE</div>
        {/* Battery body */}
        <div className="w-3 h-20 bg-[var(--bg-card-muted)] rounded-full overflow-hidden relative border border-[var(--border)] shadow-inner">
          <div
            className={`absolute bottom-0 left-0 w-full transition-all duration-700 ${
              status === 'Charging' ? 'animate-pulse' : ''
            }`}
            style={{
              height: `${Math.max(0, Math.min(100, level))}%`,
              backgroundColor: level < 20 ? '#ef4444' : level < 40 ? '#f59e0b' : 'var(--battery)',
            }}
          />
          <div className="absolute bottom-[20%] w-full h-0.5 bg-red-400/60 z-10" />
        </div>
        {/* Status icon */}
        <div className="absolute top-2 right-2">
          <BatteryCharging size={12} className={status === 'Charging' ? 'text-green-400 animate-pulse' : status === 'Discharging' ? 'text-amber-400' : 'text-[var(--border)]'} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
      </div>
      <div className="text-center bg-[var(--bg-card)]/90 px-2 py-1.5 rounded-lg border border-[var(--border)] w-full backdrop-blur-sm">
        <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Battery · {(capacityKwh * health).toFixed(0)} kWh</div>
        <div className="text-lg font-black text-[var(--battery)] leading-none mt-0.5">{level.toFixed(1)}%</div>
        <div className="text-[10px] font-semibold text-[var(--text-secondary)]">
          {power >= 0 ? '+' : ''}{power.toFixed(1)} kW · {status}
        </div>
        <div className={`text-[9px] ${health < 0.85 ? 'text-orange-500' : 'text-[var(--text-tertiary)]'}`}>
          Health {(health * 100).toFixed(0)}% · {cycles.toFixed(1)} cyc
        </div>
      </div>
    </div>
  )
);
BatteryProduct.displayName = 'BatteryProduct';

// ---------------------------------------------------------------------------
// EVChargerProduct
// ---------------------------------------------------------------------------
export const EVChargerProduct = React.memo(
  ({ id, status, power, soc, carName, capacity, maxRate, onToggle, v2g = false }: {
    id: number; status: string; power: number; soc: number; carName: string;
    capacity: number; maxRate: number; onToggle: () => void; v2g?: boolean;
  }) => (
    <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={onToggle}>
      <div className={`relative w-20 h-28 bg-slate-800 rounded-xl shadow-lg border-l-4 border-slate-600 flex flex-col items-center pt-3 transition-all duration-500 hover:-translate-y-1 ring-2 ${
        status === 'Charging' ? 'ring-sky-300 shadow-[0_0_12px_#7dd3fc]' : 'ring-transparent'
      }`}>
        {/* Screen */}
        <div className="w-12 h-6 bg-black rounded border border-slate-600 flex items-center justify-center mb-2 overflow-hidden relative">
          {v2g ? (
            <span className="text-purple-400 text-[8px] font-mono animate-pulse z-20">V2G↑</span>
          ) : status === 'Charging' ? (
            <span className="text-sky-100 text-[9px] font-semibold animate-pulse z-20">{power.toFixed(1)} kW</span>
          ) : status === 'Away' ? (
            <span className="text-red-400 text-[8px] z-20">AWAY</span>
          ) : (
            <span className="text-slate-500 text-[8px] z-20">IDLE</span>
          )}
        </div>
        {/* Plug icon */}
        <Car size={18} className="text-slate-400" />
        <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${
          status === 'Charging' ? 'bg-sky-300 shadow-[0_0_8px_#7dd3fc]' : status === 'Away' ? 'bg-red-500' : 'bg-slate-600'
        }`} />
      </div>
      <div className="text-center bg-[var(--bg-card)]/90 px-2 py-1.5 rounded-lg border border-[var(--border)] backdrop-blur-sm w-full">
        <div className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase">{carName}</div>
        <div className="text-[9px] text-[var(--text-secondary)]">{capacity} kWh · {maxRate} kW max</div>
        <div className="flex justify-between items-end px-1 mt-1 border-t border-[var(--border)] pt-0.5">
          <span className="text-[8px] text-[var(--text-tertiary)]">SoC</span>
          <span className={`text-[10px] font-bold ${soc < 20 ? 'text-[var(--alert)]' : 'text-sky-400'}`}>
            {(soc || 0).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  )
);
EVChargerProduct.displayName = 'EVChargerProduct';

// ---------------------------------------------------------------------------
// GridProduct
// ---------------------------------------------------------------------------
export const GridProduct = React.memo(
  ({ power, isImporting, isExporting, gridStatus }: {
    power: number; isImporting: boolean; isExporting: boolean; gridStatus: string;
  }) => (
    <div className="flex flex-col items-center gap-2">
      <div className="w-20 h-28 flex items-center justify-center relative transition-transform duration-300 hover:scale-[1.03]">
        <UtilityPole size={56} className={gridStatus === 'Online' ? 'text-[var(--text-secondary)]' : 'text-red-400'} strokeWidth={1} />
        {gridStatus === 'Offline' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-red-500 text-white text-[9px] font-bold px-2 py-1 rounded animate-pulse">GRID DOWN</div>
          </div>
        )}
        {gridStatus === 'Online' && (isImporting || isExporting) && (
          <div className={`absolute top-0 right-0 p-1 rounded bg-[var(--bg-card)] border border-[var(--border)] flex items-center gap-1 ${isImporting ? 'text-slate-400' : 'text-amber-400'}`}>
            {isImporting ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
            <span className="text-[9px] font-bold">{Math.abs(power).toFixed(2)} kW</span>
          </div>
        )}
      </div>
      <div className="text-center bg-[var(--bg-card)]/90 px-2 py-1.5 rounded-lg border border-[var(--border)] backdrop-blur-sm w-full">
        <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Utility Grid</div>
        <div className="text-[9px] font-bold text-[var(--text-primary)]">
          {gridStatus === 'Offline' ? 'OFFLINE'
            : isImporting ? `↑ ${Math.abs(power).toFixed(2)} kW import`
            : isExporting ? `↓ ${Math.abs(power).toFixed(2)} kW export`
            : 'Idle'}
        </div>
      </div>
    </div>
  )
);
GridProduct.displayName = 'GridProduct';

// ---------------------------------------------------------------------------
// HomeProduct
// ---------------------------------------------------------------------------
export const HomeProduct = React.memo(
  ({ power, label = 'Home Load', icon: Icon = Home }: { power: number; label?: string; icon?: React.ElementType }) => (
    <div className="flex flex-col items-center gap-2">
      <div className="w-20 h-28 flex items-center justify-center bg-[var(--bg-card-muted)] rounded-xl border border-[var(--border)] transition-transform duration-300 hover:scale-[1.02]">
        <Icon size={36} className="text-[var(--text-secondary)]" strokeWidth={1.5} />
      </div>
      <div className="text-center bg-[var(--bg-card)]/90 px-2 py-1.5 rounded-lg border border-[var(--border)] backdrop-blur-sm w-full">
        <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">{label}</div>
        <div className="text-sm font-black text-[var(--text-primary)]">{power.toFixed(2)} kW</div>
      </div>
    </div>
  )
);
HomeProduct.displayName = 'HomeProduct';

function SocTimelineChart({ points }: { points: number[] }) {
  const width = 480;
  const height = 110;
  const safePoints = points.length > 1 ? points : [50, 50];
  const maxIndex = Math.max(1, safePoints.length - 1);
  const path = safePoints
    .map((value, index) => {
      const x = (index / maxIndex) * (width - 8) + 4;
      const y = (1 - Math.max(0, Math.min(100, value)) / 100) * (height - 8) + 4;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <div className="rounded border border-[var(--border)] bg-[var(--bg-card-muted)] p-2">
      <div className="mb-1 text-[10px] font-semibold uppercase text-[var(--text-tertiary)]">Battery SOC timeline (24h)</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full">
        <rect x="0" y="0" width={width} height={height} fill="transparent" />
        <line x1="0" y1={height - 4} x2={width} y2={height - 4} stroke="var(--border)" strokeWidth="1" />
        <line x1="0" y1="4" x2={width} y2="4" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
        <path d={path} fill="none" stroke="var(--battery)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SimulationControls — sticky top bar
// ---------------------------------------------------------------------------
const SPEED_PRESETS = [0.25, 0.5, 1, 2, 5, 10, 30] as const;

function SimulationControls() {
  const simSpeed    = useEnergySystemStore((s) => s.simSpeed);
  const isAutoMode  = useEnergySystemStore((s) => s.isAutoMode);
  const setSimState = useEnergySystemStore((s) => s.setSimulationState);
  const resetSystem = useEnergySystemStore((s) => s.resetSystem);
  const { toast }   = useToast();
  const minuteData  = useEnergySystemStore((s) => s.minuteData);
  const timeOfDay   = useEnergySystemStore((s) => s.timeOfDay);

  // Simulated clock display
  const hours   = Math.floor(timeOfDay);
  const minutes = Math.round((timeOfDay % 1) * 60);
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  const handleReset = useCallback(() => {
    const ok = window.confirm(
      'Reset the simulation?\n\nThis clears all accumulated energy data and restarts from the initial state.'
    );
    if (!ok) return;
    resetSystem();
    setSimState({ isAutoMode: false });
    toast({ title: 'Simulation reset', description: 'All data cleared. Press Play to restart.' });
  }, [resetSystem, setSimState, toast]);

  const elapsedDays = minuteData.length > 0 ? (minuteData.length / 1440).toFixed(1) : '0.0';

  return (
    <Card className="dashboard-card">
      <CardContent className="py-3 px-4">
        <div className="flex flex-wrap items-center gap-3">

          {/* ── Simulated clock ── */}
          <div className="flex items-center gap-1.5 bg-[var(--bg-card-muted)] rounded-lg px-3 py-1.5 border border-[var(--border)] min-w-[90px]">
            <Gauge className="h-3.5 w-3.5 text-[var(--solar)] shrink-0" />
            <div>
              <div className="text-[9px] text-[var(--text-tertiary)] leading-none">Sim time</div>
              <div className="text-sm font-black text-[var(--text-primary)] leading-none font-mono">{timeStr}</div>
            </div>
          </div>

          {/* ── Elapsed days ── */}
          <div className="text-[10px] text-[var(--text-tertiary)] leading-tight">
            <span className="font-bold text-[var(--text-secondary)]">{elapsedDays}</span> sim-days elapsed
          </div>

          {/* ── Divider ── */}
          <div className="h-6 w-px bg-[var(--border)] mx-1 hidden sm:block" />

          {/* ── Play / Pause ── */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSimState({ isAutoMode: !isAutoMode })}
            className={`flex items-center gap-1.5 min-w-[96px] font-semibold transition-all duration-200 ${
              isAutoMode
                ? 'border-amber-400 text-amber-400 hover:bg-amber-400/10'
                : 'border-green-500 text-green-500 hover:bg-green-500/10'
            }`}
          >
            {isAutoMode
              ? <><Pause className="h-3.5 w-3.5" />Pause</>
              : <><Play  className="h-3.5 w-3.5" />Play</>}
          </Button>

          {/* ── Status badge ── */}
          <Badge
            variant="outline"
            className={isAutoMode
              ? 'border-green-500 text-green-500 bg-green-500/10 text-[10px]'
              : 'border-[var(--border)] text-[var(--text-tertiary)] text-[10px]'
            }
          >
            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${isAutoMode ? 'bg-green-500 animate-pulse' : 'bg-[var(--border)]'}`} />
            {isAutoMode ? 'Running' : 'Paused'}
          </Badge>

          {/* ── Divider ── */}
          <div className="h-6 w-px bg-[var(--border)] mx-1 hidden sm:block" />

          {/* ── Speed chips ── */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] text-[var(--text-secondary)] mr-1 font-semibold">Speed</span>
            {SPEED_PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => setSimState({ simSpeed: s })}
                className={[
                  'px-2 py-1 rounded text-[11px] font-bold border transition-all duration-150',
                  simSpeed === s
                    ? 'bg-[var(--solar)] text-slate-900 border-[var(--solar)] shadow-sm'
                    : 'bg-[var(--bg-card-muted)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--solar)] hover:text-[var(--solar)]',
                ].join(' ')}
                title={s < 1 ? 'Slower than real-time' : s === 1 ? 'Real-time' : `${s}× faster than real-time`}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* ── Reset ── */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="ml-auto text-[var(--text-tertiary)] hover:text-red-400 flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SimulationNodes — SLD layout
// ---------------------------------------------------------------------------
export function SimulationNodes() {
  const nodes        = useEnergySystemStore((s) => s.nodes);
  const systemConfig = useEnergySystemStore((s) => s.systemConfig);
  const timeOfDay    = useEnergySystemStore((s) => s.timeOfDay);
  const simSpeed     = useEnergySystemStore((s) => s.simSpeed);
  const minuteData   = useEnergySystemStore((s) => s.minuteData);

  const solarNode   = nodes.solar;
  const batteryNode = nodes.battery;
  const gridNode    = nodes.grid;
  const ev1Node     = nodes.ev1;
  const ev2Node     = nodes.ev2;

  const latest = minuteData[minuteData.length - 1];

  const solarPower   = latest?.solarKW           ?? solarNode.powerKW   ?? 0;
  const batteryLevel = latest?.batteryLevelPct   ?? batteryNode.soc     ?? 0;
  const batteryPower = latest?.batteryPowerKW    ?? batteryNode.powerKW ?? 0;
  const gridImportKw = latest?.gridImportKW      ?? (gridNode.status === 'importing' ? Math.abs(gridNode.powerKW ?? 0) : 0);
  const gridExportKw = latest?.gridExportKW      ?? (gridNode.status === 'exporting' ? Math.abs(gridNode.powerKW ?? 0) : 0);
  const homeLoadKw   = latest ? latest.homeLoadKW : (nodes.home.powerKW ?? 0);
  const ev1Power     = latest?.ev1LoadKW         ?? ev1Node.powerKW     ?? 0;
  const ev2Power     = latest?.ev2LoadKW         ?? ev2Node.powerKW     ?? 0;
  const ev1Soc       = latest?.ev1SocPct         ?? ev1Node.soc         ?? 0;
  const ev2Soc       = latest?.ev2SocPct         ?? ev2Node.soc         ?? 0;

  const isNight      = timeOfDay < 6 || timeOfDay > 19;
  const isImporting  = gridImportKw > 0.05;
  const isExporting  = gridExportKw > 0.05;
  const gridPower    = isImporting ? gridImportKw : isExporting ? gridExportKw : 0;
  const gridStatus   = systemConfig.gridOutageEnabled ? 'Offline' : gridNode.status === 'offline' ? 'Offline' : 'Online';
  const batteryStatus = batteryPower > 0.1 ? 'Charging' : batteryPower < -0.1 ? 'Discharging' : 'Idle';
  const ev1Status    = ev1Power > 0.1 ? 'Charging' : (ev1Node.status === 'offline' ? 'Away' : 'Idle');
  const ev2Status    = ev2Power > 0.1 ? 'Charging' : (ev2Node.status === 'offline' ? 'Away' : 'Idle');

  const inverterPower = homeLoadKw + ev1Power + ev2Power;
  const inverterCapKw = systemConfig.inverterKW ?? 10;

  const weather = isNight ? 'Night' : solarPower > (systemConfig.solarCapacityKW ?? 10) * 0.7 ? 'Sunny' : 'Cloudy';

  // Session totals
  const totalSolarKWh   = minuteData.reduce((s, d) => s + d.solarEnergyKWh, 0);
  const totalSavingsKES = minuteData.reduce((s, d) => s + d.savingsKES, 0);
  const dayPoints = minuteData.slice(-420);
  const dayLoadKwh = dayPoints.reduce((s, d) => s + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh, 0);
  const dayExportKwh = dayPoints.reduce((s, d) => s + d.gridExportKWh, 0);
  const reservePct = Math.max(0, 100 - (systemConfig.batteryDodPct ?? DEFAULT_BATTERY_DOD_PCT));
  const isGeneratorOn =
    systemConfig.systemMode === 'off-grid' &&
    batteryLevel < (systemConfig.generatorThresholdPct ?? DEFAULT_GENERATOR_THRESHOLD_PCT);
  const autonomyDays = computeDaysOfAutonomy(systemConfig.batteryCapacityKWh, systemConfig.batteryDodPct, dayLoadKwh);
  const netMeteringCreditKes = computeNetMeteringCreditKesPerMonth(dayExportKwh);

  // Cable capacity references
  const dcCap = systemConfig.solarCapacityKW ?? 10;
  const acCap = inverterCapKw;

  return (
    <div className="space-y-4">

      {/* ══════════════════════════════════════════
           SIMULATION CONTROLS
         ══════════════════════════════════════════ */}
      <SimulationControls />

      {/* ══════════════════════════════════════════
           LIVE SUMMARY STRIP
         ══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Solar',    value: `${solarPower.toFixed(2)} kW`,                                                             color: 'text-[var(--solar)]' },
          { label: 'Battery',  value: `${batteryLevel.toFixed(1)}%`,                                                             color: 'text-[var(--battery)]' },
          { label: 'Grid',     value: isImporting ? `↑ ${gridImportKw.toFixed(2)} kW` : isExporting ? `↓ ${gridExportKw.toFixed(2)} kW` : 'Idle', color: 'text-[var(--text-primary)]' },
          { label: 'Savings',  value: `KES ${Math.round(totalSavingsKES).toLocaleString()}`,                                     color: 'text-green-500' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="dashboard-card">
            <CardContent className="pt-3 pb-3">
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold mb-0.5">{label}</div>
              <div className={`text-xl font-black ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="dashboard-card">
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="text-xs font-semibold uppercase text-[var(--text-tertiary)]">Mode: {SYSTEM_MODE_LABELS[systemConfig.systemMode]}</div>

          {systemConfig.systemMode === 'off-grid' && (
            <div className="space-y-3">
              <SocTimelineChart points={dayPoints.map((d) => d.batteryLevelPct)} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="rounded border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2">
                  Autonomy: <strong>{autonomyDays.toFixed(2)} days</strong>
                </div>
                <div className="rounded border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2">
                  Reserve threshold: <strong>{reservePct.toFixed(0)}% SOC</strong>
                </div>
                <div className="rounded border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2">
                  Generator: <strong>{isGeneratorOn ? 'ON' : 'Standby'}</strong>
                </div>
              </div>
              {batteryLevel <= reservePct && (
                <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
                  Battery SOC is at reserve threshold.
                </div>
              )}
            </div>
          )}

          {systemConfig.systemMode === 'on-grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="rounded border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2">
                Grid export: <strong>{dayExportKwh.toFixed(2)} kWh/day</strong>
              </div>
              <div className="rounded border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2">
                Net-metering credit: <strong>KES {Math.round(netMeteringCreditKes).toLocaleString()}/month</strong>
              </div>
              <div className="rounded border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2">
                Anti-islanding: <strong>{systemConfig.gridOutageEnabled ? 'Grid outage active' : 'Normal grid operation'}</strong>
              </div>
            </div>
          )}

          {systemConfig.systemMode === 'hybrid' && (
            <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Hybrid mode keeps both battery and grid pathways active.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════
           SINGLE-LINE DIAGRAM (SLD)

           Layout (desktop):

           [Solar PV]          [Battery]
               │ DC               │ DC
               └────[Inverter]────┘
                         │
               ══════ AC Bus ══════════
               │          │    │     │
            [Grid]     [Home] [EV1] [EV2]

         ══════════════════════════════════════════ */}
      <Card className="dashboard-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[var(--text-primary)] text-base">
            <Zap className="h-4 w-4 text-[var(--solar)]" />
            Live System Nodes
            <Badge variant="outline" className="ml-2 text-[10px] border-[var(--solar)] text-[var(--solar)]">
              {simSpeed}× speed
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>

          {/* ── Row 1: DC sources (Solar left, Battery right) ── */}
          <div className="flex justify-around items-end px-4 md:px-12 gap-4 mb-0">
            {/* Solar + DC drop cable */}
            <div className="flex flex-col items-center gap-0">
              <SolarPanelProduct
                power={solarPower}
                capacity={systemConfig.solarCapacityKW ?? 10}
                weather={weather}
                isNight={isNight}
              />
              <RigidCable
                height={40}
                active={solarPower > 0.1}
                color="bg-yellow-400"
                glowColor="var(--solar)"
                powerKw={solarPower}
                capacityKw={dcCap}
                flowDirection="down"
                speed={simSpeed}
                showLabel
              />
            </div>

            {/* Battery + bidirectional DC cable */}
            <div className="flex flex-col items-center gap-0">
              <BatteryProduct
                level={batteryLevel}
                status={batteryStatus}
                power={batteryPower}
                capacityKwh={systemConfig.batteryCapacityKWh ?? 50}
              />
              <RigidCable
                height={40}
                active={Math.abs(batteryPower) > 0.05}
                color="bg-green-400"
                glowColor="var(--battery)"
                powerKw={Math.abs(batteryPower)}
                capacityKw={systemConfig.batteryCapacityKWh ?? 50}
                flowDirection={batteryPower >= 0 ? 'down' : 'up'}
                speed={simSpeed}
                showLabel
              />
            </div>
          </div>

          {/* ── Row 2: DC Bus bar (connects solar + battery → inverter) ── */}
          <div className="relative flex items-center justify-center">
            <HorizontalCable
              width="60%"
              height={4}
              active={solarPower > 0.1 || Math.abs(batteryPower) > 0.05}
              color="bg-yellow-400"
              glowColor="var(--solar)"
              powerKw={solarPower + Math.abs(batteryPower)}
              capacityKw={dcCap * 2}
              flowDirection="right"
              speed={simSpeed}
            />
            <div className="absolute left-1/2 -translate-x-1/2 bg-[var(--bg-card)] border border-[var(--border)] px-2 py-0.5 rounded text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide -top-3 shadow-sm">
              DC Bus
            </div>
          </div>

          {/* ── Row 3: Inverter ── */}
          <div className="flex justify-center py-2">
            <InverterProduct
              id={1}
              power={inverterPower}
              ratedCapacityKw={inverterCapKw}
            />
          </div>

          {/* ── AC Bus bar label ── */}
          <div className="relative flex items-center justify-center mb-1">
            <HorizontalCable
              width="80%"
              height={4}
              active={inverterPower > 0.1 || isImporting}
              color="bg-orange-400"
              glowColor="#f97316"
              powerKw={inverterPower}
              capacityKw={acCap}
              flowDirection="right"
              speed={simSpeed}
              showLabel
            />
            <div className="absolute left-1/2 -translate-x-1/2 bg-[var(--bg-card)] border border-[var(--border)] px-2 py-0.5 rounded text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide -top-3 shadow-sm">
              AC Bus
            </div>
          </div>

          {/* ── Row 4: AC loads (Grid · Home · EV1 · EV2) ── */}
          <div className="flex flex-wrap justify-around items-start gap-x-4 gap-y-6 px-2 pt-4">

            {/* Grid */}
            <div className="flex flex-col items-center gap-0">
              <RigidCable
                height={36}
                active={gridPower > 0.05}
                color={isImporting ? 'bg-slate-400' : 'bg-amber-400'}
                glowColor={isImporting ? '#94a3b8' : '#f59e0b'}
                powerKw={gridPower}
                capacityKw={acCap}
                flowDirection={isImporting ? 'down' : 'up'}
                speed={simSpeed}
                showLabel
              />
              <GridProduct
                power={gridPower}
                isImporting={isImporting}
                isExporting={isExporting}
                gridStatus={gridStatus}
              />
            </div>

            {/* Home */}
            <div className="flex flex-col items-center gap-0">
              <RigidCable
                height={36}
                active={homeLoadKw > 0.1}
                color="bg-blue-300"
                glowColor="#93c5fd"
                powerKw={homeLoadKw}
                capacityKw={acCap}
                flowDirection="down"
                speed={simSpeed}
                showLabel
              />
              <HomeProduct power={homeLoadKw} label="Home Load" />
            </div>

            {/* EV 1 */}
            <div className="flex flex-col items-center gap-0">
              <RigidCable
                height={36}
                active={ev1Power > 0.1}
                color="bg-sky-400"
                glowColor="#38bdf8"
                powerKw={ev1Power}
                capacityKw={acCap}
                flowDirection="down"
                speed={simSpeed}
                showLabel
              />
              <EVChargerProduct
                id={1}
                status={ev1Status}
                power={ev1Power}
                soc={ev1Soc}
                carName="EV Commuter"
                capacity={systemConfig.ev1CapacityKWh ?? 80}
                maxRate={22}
                onToggle={() => {}}
              />
            </div>

            {/* EV 2 */}
            <div className="flex flex-col items-center gap-0">
              <RigidCable
                height={36}
                active={ev2Power > 0.1}
                color="bg-violet-400"
                glowColor="#a78bfa"
                powerKw={ev2Power}
                capacityKw={acCap}
                flowDirection="down"
                speed={simSpeed}
                showLabel
              />
              <EVChargerProduct
                id={2}
                status={ev2Status}
                power={ev2Power}
                soc={ev2Soc}
                carName="EV Fleet"
                capacity={systemConfig.ev2CapacityKWh ?? 118}
                maxRate={50}
                onToggle={() => {}}
              />
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════
           SESSION TOTALS
         ══════════════════════════════════════════ */}
      <Card className="dashboard-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[var(--text-primary)]">Session Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
            {[
              { label: 'Solar Gen',   value: `${totalSolarKWh.toFixed(2)} kWh`,                                                               color: 'var(--solar)' },
              { label: 'Grid Import', value: `${minuteData.reduce((s, d) => s + d.gridImportKWh, 0).toFixed(2)} kWh`,                         color: 'var(--text-primary)' },
              { label: 'Grid Export', value: `${minuteData.reduce((s, d) => s + d.gridExportKWh, 0).toFixed(2)} kWh`,                         color: '#f59e0b' },
              { label: 'Home Load',   value: `${minuteData.reduce((s, d) => s + d.homeLoadKWh, 0).toFixed(2)} kWh`,                           color: '#93c5fd' },
              { label: 'EV Load',     value: `${minuteData.reduce((s, d) => s + d.ev1LoadKWh + d.ev2LoadKWh, 0).toFixed(2)} kWh`,             color: '#38bdf8' },
              { label: 'Savings',     value: `KES ${Math.round(totalSavingsKES).toLocaleString()}`,                                           color: '#4ade80' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[var(--bg-card-muted)] rounded-lg p-3 border border-[var(--border)]">
                <div className="text-[9px] text-[var(--text-tertiary)] uppercase font-semibold mb-1">{label}</div>
                <div className="text-sm font-black" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
