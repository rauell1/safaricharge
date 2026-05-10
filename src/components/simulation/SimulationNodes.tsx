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
  Building2,
  Wind,
  Settings2,
} from 'lucide-react';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  computeDaysOfAutonomy,
  computeNetMeteringCreditKesPerMonth,
  DEFAULT_BATTERY_DOD_PCT,
  DEFAULT_GENERATOR_THRESHOLD_PCT,
  SYSTEM_MODE_LABELS,
} from '@/lib/system-mode-metrics';
import { GenerateReportButton } from '@/components/reports/GenerateReportButton';

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
  ({ id, power, ratedCapacityKw }: { id?: number | string; power: number; ratedCapacityKw: number }) => {
    const loadPct = ratedCapacityKw > 0 ? Math.min(100, (Math.abs(power) / ratedCapacityKw) * 100) : 0;
    const isActive = Math.abs(power) > 0.1;
    return (
      <div className={`flex flex-col items-center bg-[var(--bg-card)] rounded-xl border ${
        isActive ? 'border-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.3)]' : 'border-[var(--border)]'
      } w-36 p-3 gap-1.5 transition-all duration-500`}>
        <div className="w-full flex justify-between items-center">
          <span className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wide">
            {id != null ? `INV ${id}` : 'Inverter'} · {ratedCapacityKw.toFixed(0)} kW
          </span>
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
// EV Charger & Inverter configuration presets
// ---------------------------------------------------------------------------
const EV_CHARGER_PRESETS = [
  { id: 'ac7',   label: '7.4 kW AC — Level 2 Home',       maxKw: 7.4,  connectionType: 'AC' as const },
  { id: 'ac22',  label: '22 kW AC — Three-Phase Type 2',   maxKw: 22,   connectionType: 'AC' as const },
  { id: 'dc50',  label: '50 kW DC — Fast Charge CCS2',     maxKw: 50,   connectionType: 'DC' as const },
  { id: 'dc120', label: '120 kW DC — Ultra-Fast CCS2',     maxKw: 120,  connectionType: 'DC' as const },
  { id: 'dc150', label: '150 kW DC — HPC (High Power)',    maxKw: 150,  connectionType: 'DC' as const },
  { id: 'dc350', label: '350 kW DC — Hypercharger',        maxKw: 350,  connectionType: 'DC' as const },
];

const INVERTER_PRESETS = [
  // ── Deye — single-phase SG04LP1 series (3–6 kW, 97.6% eff, 16-unit parallel) ────────
  { id: 'deye-3.6',  label: 'Deye SUN-3.6K-SG04LP1-EU-SM2 (3.6 kW, 1Ø)',  kw: 3.6  },
  { id: 'deye-5sp',  label: 'Deye SUN-5K-SG04LP1-EU-SM2 (5 kW, 1Ø)',       kw: 5    },
  { id: 'deye-6sp',  label: 'Deye SUN-6K-SG04LP1-EU-SM2 (6 kW, 1Ø)',       kw: 6    },
  // ── Deye — three-phase SG05LP3 series (3–12 kW, 97.6% eff, 10-unit parallel) ─────────
  { id: 'deye-3',    label: 'Deye SUN-3K-SG05LP3-EU-SM2 (3 kW, 3Ø)',       kw: 3    },
  { id: 'deye-5',    label: 'Deye SUN-5K-SG05LP3-EU-SM2 (5 kW, 3Ø)',       kw: 5    },
  { id: 'deye-8',    label: 'Deye SUN-8K-SG05LP3-EU-SM2 (8 kW, 3Ø)',       kw: 8    },
  { id: 'deye-12',   label: 'Deye SUN-12K-SG05LP3-EU-SM2 (12 kW, 3Ø)',     kw: 12   },
  // ── Deye — three-phase SG05LP3 large series (14–20 kW, 97.6% eff, 350 A batt) ────────
  { id: 'deye-14',   label: 'Deye SUN-14K-SG05LP3-EU-SM2 (14 kW, 3Ø)',     kw: 14   },
  { id: 'deye-16',   label: 'Deye SUN-16K-SG05LP3-EU-SM2 (16 kW, 3Ø)',     kw: 16   },
  { id: 'deye-18',   label: 'Deye SUN-18K-SG05LP3-EU-SM2 (18 kW, 3Ø)',     kw: 18   },
  { id: 'deye-20',   label: 'Deye SUN-20K-SG05LP3-EU-SM2 (20 kW, 3Ø)',     kw: 20   },
  // ── Growatt (popular budget option across Africa) ───────────────────────
  { id: 'growatt-3',   label: 'Growatt SPF 3000TL LVM (3 kW)',   kw: 3    },
  { id: 'growatt-5',   label: 'Growatt SPF 5000TL LVM (5 kW)',   kw: 5    },
  { id: 'growatt-10',  label: 'Growatt SPF 10000TL LVM (10 kW)', kw: 10   },
  { id: 'growatt-15',  label: 'Growatt MID 15KTL3-X (15 kW)',    kw: 15   },
  { id: 'growatt-20',  label: 'Growatt MID 20KTL3-X (20 kW)',    kw: 20   },
  // ── Solis / Ginlong (growing East Africa market share) ─────────────────
  { id: 'solis-5',    label: 'Solis S5-EH1P5K (5 kW)',           kw: 5    },
  { id: 'solis-6',    label: 'Solis S6-EH1P6K (6 kW)',           kw: 6    },
  { id: 'solis-10',   label: 'Solis S6-EH1P10K (10 kW)',         kw: 10   },
  { id: 'solis-15',   label: 'Solis S5-EH3P15K (15 kW)',         kw: 15   },
  { id: 'solis-25',   label: 'Solis S5-EH3P25K (25 kW)',         kw: 25   },
  // ── Sunsynk (very popular sub-Saharan Africa) ───────────────────────────
  { id: 'sunsynk-3.6', label: 'Sunsynk 3.6kW Hybrid',           kw: 3.6  },
  { id: 'sunsynk-5',   label: 'Sunsynk 5kW Hybrid',             kw: 5    },
  { id: 'sunsynk-8',   label: 'Sunsynk 8kW Hybrid',             kw: 8    },
  { id: 'sunsynk-10',  label: 'Sunsynk 10kW Hybrid',            kw: 10   },
  { id: 'sunsynk-12',  label: 'Sunsynk 12kW Hybrid',            kw: 12   },
  // ── Victron (premium off-grid / marine) ────────────────────────────────
  { id: 'victron-3',   label: 'Victron MultiPlus-II 3kVA',      kw: 3    },
  { id: 'victron-5',   label: 'Victron MultiPlus-II 5kVA',      kw: 5    },
  { id: 'victron-8',   label: 'Victron Quattro 8kVA',           kw: 8    },
  { id: 'victron-15',  label: 'Victron Quattro 15kVA',          kw: 15   },
  { id: 'victron-30',  label: 'Victron Quattro 30kVA',          kw: 30   },
  // ── Jinko Solar JKS Hybrid series ──────────────────────────────────────
  { id: 'jinko-5',    label: 'Jinko JKS-H 5K-LL1 (5 kW)',       kw: 5    },
  { id: 'jinko-8',    label: 'Jinko JKS-H 8K-LL3 (8 kW)',       kw: 8    },
  { id: 'jinko-10',   label: 'Jinko JKS-H 10K-LL3 (10 kW)',     kw: 10   },
  // ── INVT (growing presence in East Africa) ──────────────────────────────
  { id: 'invt-3',    label: 'INVT Solar MG 3K LV (3 kW)',        kw: 3    },
  { id: 'invt-6',    label: 'INVT Solar MG 6K LV (6 kW)',        kw: 6    },
  { id: 'invt-10',   label: 'INVT Solar MG 10K LV (10 kW)',      kw: 10   },
  // ── Goodwe ─────────────────────────────────────────────────────────────
  { id: 'goodwe-5',  label: 'Goodwe GW5000-ET (5 kW)',           kw: 5    },
  { id: 'goodwe-10', label: 'Goodwe GW10K-ET (10 kW)',           kw: 10   },
  // ── SMA ────────────────────────────────────────────────────────────────
  { id: 'sma-5',     label: 'SMA Sunny Island 4.4M (5 kW)',      kw: 5    },
  { id: 'sma-15',    label: 'SMA Sunny Island 15kW',             kw: 15   },
  // ── Budget / Custom ─────────────────────────────────────────────────────
  { id: 'must-5',    label: 'Must Solar PH18-5048 (5 kW)',        kw: 5    },
  { id: 'custom',    label: 'Custom / Other',                     kw: 10   },
];

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

          {/* ── Report ── */}
          <GenerateReportButton className="hidden sm:flex" />

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
  const nodes            = useEnergySystemStore((s) => s.nodes);
  const systemConfig     = useEnergySystemStore((s) => s.systemConfig);
  const fullSystemConfig = useEnergySystemStore((s) => s.fullSystemConfig);
  const timeOfDay        = useEnergySystemStore((s) => s.timeOfDay);
  const simSpeed         = useEnergySystemStore((s) => s.simSpeed);
  const minuteData       = useEnergySystemStore((s) => s.minuteData);

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

  const weather = isNight ? 'Night' : solarPower > (systemConfig.solarCapacityKW ?? 10) * 0.7 ? 'Sunny' : 'Cloudy';

  // Read shared config from localStorage (written by System Configuration page)
  const getSharedConfig = () => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('sc_inverter_config') : null;
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const getSharedEvConfig = () => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('sc_ev_charger_config') : null;
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const sharedInv = getSharedConfig();
  const sharedEv  = getSharedEvConfig();

  const [invPresetId]    = React.useState<string>(sharedInv?.presetId    ?? 'deye-12');
  const [invKwPerUnit]   = React.useState<number>(sharedInv?.kwPerUnit   ?? 12);
  const [invUnits]       = React.useState<number>(sharedInv?.units       ?? 1);
  const [evPresetId]     = React.useState<string>(sharedEv?.presetId     ?? 'ac22');
  const [evChargerCount] = React.useState<number>(sharedEv?.count        ?? 2);
  const selectedEvPreset = EV_CHARGER_PRESETS.find(p => p.id === evPresetId) ?? EV_CHARGER_PRESETS[1];

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

  // ── Dynamic loads from fullSystemConfig ────────────────────────────────────
  const evLoads    = (fullSystemConfig?.loads ?? []).filter((l: any) => l.enabled && l.type === 'ev');
  const nonEvLoads = (fullSystemConfig?.loads ?? []).filter((l: any) => l.enabled && l.type !== 'ev');

  // EV power: first 2 tracked in simulation data; additional EVs show 0
  const getEvPower = (idx: number) => idx === 0 ? ev1Power : idx === 1 ? ev2Power : 0;
  const getEvSoc   = (idx: number) => idx === 0 ? ev1Soc  : idx === 1 ? ev2Soc  : 66;

  // Distribute homeLoadKw proportionally among non-EV loads by configured capacity
  const timeSlot = Math.min(23, Math.floor(timeOfDay));
  const totalNonEvConfigKw = nonEvLoads.reduce((sum: number, load: any) => {
    if (load.type === 'home')       return sum + (load.hourlyProfile?.[timeSlot] ?? 3);
    if (load.type === 'commercial') return sum + (load.constantKw ?? 5);
    if (load.type === 'hvac')       return sum + (load.capacityKw ?? 2);
    return sum + (load.constantKw ?? 1);
  }, 0);

  const getNonEvLoadPower = (load: any) => {
    if (totalNonEvConfigKw <= 0 || homeLoadKw <= 0) return 0;
    let ck = 0;
    if (load.type === 'home')       ck = load.hourlyProfile?.[timeSlot] ?? 3;
    else if (load.type === 'commercial') ck = load.constantKw ?? 5;
    else if (load.type === 'hvac')       ck = load.capacityKw ?? 2;
    else                                 ck = load.constantKw ?? 1;
    return homeLoadKw * (ck / totalNonEvConfigKw);
  };

  const getLoadIcon = (type: string): React.ElementType => {
    if (type === 'commercial') return Building2;
    if (type === 'hvac')       return Wind;
    if (type === 'custom')     return Settings2;
    return Home;
  };

  // Inverter bank: derive unit count and capacity from local config state
  const inverterCount      = Math.min(5, Math.max(1, invUnits));
  const perInverterCapKw   = invKwPerUnit;
  const perInverterPowerKw = inverterPower / Math.max(1, inverterCount);
  const inverterCapKw      = invKwPerUnit * invUnits;
  const acCap              = inverterCapKw;

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
          <div className="overflow-x-auto -mx-2 px-2">
          <div className="min-w-[560px]">

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

          {/* ── Row 3: Inverter bank (1–5 units based on capacity ÷ 10 kW) ── */}
          <div className="flex justify-center gap-3 py-2 flex-wrap">
            {Array.from({ length: inverterCount }, (_, i) => (
              <div key={i} className="flex flex-col items-center gap-0">
                <InverterProduct
                  id={inverterCount > 1 ? i + 1 : undefined}
                  power={perInverterPowerKw}
                  ratedCapacityKw={perInverterCapKw}
                />
              </div>
            ))}
          </div>

          {/* ── AC Bus bar ── */}
          <div className="relative w-full mt-1 mb-2">
            <HorizontalCable
              width="100%"
              height={5}
              active={inverterPower > 0.1 || isImporting}
              color="bg-orange-400"
              glowColor="#f97316"
              powerKw={inverterPower}
              capacityKw={acCap}
              flowDirection="right"
              speed={simSpeed}
            />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-md whitespace-nowrap z-10 pointer-events-none">
              AC Bus
            </span>
          </div>

          {/* ── Row 4: AC loads — dynamic from fullSystemConfig.loads ── */}
          <div className="flex flex-nowrap justify-start sm:justify-around items-start gap-x-4 gap-y-6 px-2 pt-4 pb-3">

            {/* Grid — always first */}
            <div className="flex flex-col items-center gap-0 flex-shrink-0">
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

            {/* Non-EV loads: home, commercial/field, HVAC, custom */}
            {nonEvLoads.length === 0 ? (
              /* Fallback: show a generic Home Load if no loads configured */
              <div className="flex flex-col items-center gap-0 flex-shrink-0">
                <RigidCable height={36} active={homeLoadKw > 0.1} color="bg-blue-300" glowColor="#93c5fd" powerKw={homeLoadKw} capacityKw={acCap} flowDirection="down" speed={simSpeed} showLabel />
                <HomeProduct power={homeLoadKw} label="Home Load" />
              </div>
            ) : nonEvLoads.map((load: any, i: number) => {
              const loadPower = getNonEvLoadPower(load);
              const LoadIcon  = getLoadIcon(load.type);
              const cableColors = ['bg-blue-300', 'bg-emerald-300', 'bg-cyan-300', 'bg-purple-300', 'bg-rose-300'];
              const glowColors  = ['#93c5fd', '#6ee7b7', '#67e8f9', '#c4b5fd', '#fda4af'];
              return (
                <div key={load.id ?? i} className="flex flex-col items-center gap-0 flex-shrink-0">
                  <RigidCable
                    height={36}
                    active={loadPower > 0.05}
                    color={cableColors[i % cableColors.length]}
                    glowColor={glowColors[i % glowColors.length]}
                    powerKw={loadPower}
                    capacityKw={acCap}
                    flowDirection="down"
                    speed={simSpeed}
                    showLabel
                  />
                  <HomeProduct power={loadPower} label={load.name} icon={LoadIcon} />
                </div>
              );
            })}

            {/* EV chargers — from local config */}
            {Array.from({ length: evChargerCount }, (_, idx) => {
              const evPow  = getEvPower(idx);
              const evSocV = getEvSoc(idx);
              const evStat = evPow > 0.1 ? 'Charging' : 'Idle';
              const evPalette = [
                { cable: 'bg-sky-400',    glow: '#38bdf8' },
                { cable: 'bg-violet-400', glow: '#a78bfa' },
                { cable: 'bg-pink-400',   glow: '#f472b6' },
                { cable: 'bg-teal-400',   glow: '#2dd4bf' },
                { cable: 'bg-orange-400', glow: '#fb923c' },
              ];
              const col = evPalette[idx % evPalette.length];
              return (
                <div key={idx} className="flex flex-col items-center gap-0 flex-shrink-0">
                  <RigidCable
                    height={36}
                    active={evPow > 0.1}
                    color={col.cable}
                    glowColor={col.glow}
                    powerKw={evPow}
                    capacityKw={selectedEvPreset.maxKw}
                    flowDirection="down"
                    speed={simSpeed}
                    showLabel
                  />
                  <EVChargerProduct
                    id={idx + 1}
                    status={evStat}
                    power={evPow}
                    soc={evSocV}
                    carName={`EV ${idx + 1}`}
                    capacity={80}
                    maxRate={selectedEvPreset.maxKw}
                    onToggle={() => {}}
                    v2g={false}
                  />
                </div>
              );
            })}

          </div>
          </div>{/* min-w wrapper */}
          </div>{/* overflow-x-auto wrapper */}
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
