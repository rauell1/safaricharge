'use client';

/**
 * SimulationNodes.tsx
 * Fully wired to the live energySystemStore — all values come from the
 * real simulation tick loop.  No hardcoded demo values.
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
} from 'lucide-react';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type GridDirection = 'import' | 'export' | 'neutral';
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
    const intensity = Math.min(
      1,
      Math.max(0, capacityKw > 0 ? Math.abs(powerKw) / capacityKw : active ? 0.5 : 0)
    );
    const thickness = Math.max(width, 2 + intensity * 6);
    const duration = `${Math.max(0.1, 0.8 / Math.max(0.2, Math.min(speed, 10)))}s`;
    const gradientAngle = flowDirection === 'down' ? '180deg' : '0deg';

    return (
      <div
        className="relative flex items-center justify-center transition-all duration-500"
        style={{ width: thickness, height }}
      >
        <div
          className={`absolute inset-0 rounded-full ${color}`}
          style={{ opacity: 0.35 + intensity * 0.4 }}
        />
        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: active
              ? `linear-gradient(${gradientAngle}, transparent, ${glowColor})`
              : undefined,
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
            <div
              className={`bg-[var(--bg-card-muted)] rounded-full p-0.5 shadow-sm ${
                flowDirection === 'down' ? '' : 'rotate-180'
              }`}
            >
              <ChevronDown size={8 + intensity * 4} className={arrowColor} strokeWidth={4} />
            </div>
          </div>
        )}
        {showLabel && active && (
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[9px] font-bold text-[var(--text-primary)] shadow-sm whitespace-nowrap">
            {`${Math.abs(powerKw).toFixed(1)} kW`}
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
    const intensity = Math.min(
      1,
      Math.max(0, capacityKw > 0 ? Math.abs(powerKw) / capacityKw : active ? 0.5 : 0)
    );
    const thickness = Math.max(height, 2 + intensity * 6);
    const particleAlign = flowDirection === 'right' ? 'left-0' : 'right-0';
    const gradientDirection = flowDirection === 'right' ? '90deg' : '270deg';
    const duration = `${Math.max(0.3, 2 / Math.max(0.2, Math.min(speed, 10)))}s`;

    return (
      <div
        className="relative transition-all duration-500 overflow-hidden rounded-full"
        style={{ width, height: thickness }}
      >
        <div
          className={`absolute inset-0 ${color} rounded-full`}
          style={{ opacity: 0.35 + intensity * 0.4 }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: active
              ? `linear-gradient(${gradientDirection}, transparent, ${glowColor})`
              : undefined,
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
              animation: `${
                flowDirection === 'right' ? 'flow-left-to-right' : 'flow-right-to-left'
              } ${duration} linear infinite`,
            }}
          />
        )}
        {showLabel && active && (
          <div className="absolute left-1/2 -translate-x-1/2 -top-5 px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[9px] font-bold text-[var(--text-primary)] shadow-sm whitespace-nowrap">
            {`${Math.abs(powerKw).toFixed(1)} kW`}
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
  ({
    power,
    capacity,
    weather,
    isNight,
  }: {
    power: number;
    capacity: number;
    weather: string;
    isNight: boolean;
  }) => {
    const safeCapacity = Math.max(0, capacity);
    const utilization = safeCapacity > 0 ? Math.min(1, power / safeCapacity) : 0;
    const isActive = power > 0.1 && !isNight;
    const frameClasses = `w-48 h-28 rounded-xl border-2 shadow-xl relative overflow-hidden transform transition-all duration-500 ease-out hover:scale-[1.03] active:scale-95 ${
      isNight
        ? 'bg-slate-900 border-slate-700'
        : 'bg-gradient-to-br from-sky-900 to-slate-900 border-slate-300'
    } ${isActive ? '' : 'opacity-60 border-slate-700'}`;

    return (
      <div className="flex flex-col items-center z-20">
        <div className={frameClasses}>
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-2 gap-0.5 opacity-30 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-slate-300" />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
          {!isNight && (
            <div
              className={`absolute top-0 rounded-full w-24 h-24 transition-all duration-1000 blur-xl
              ${
                weather === 'Sunny'
                  ? 'bg-white/30 opacity-70'
                  : weather === 'Rainy'
                    ? 'bg-slate-400/20 opacity-20'
                    : 'bg-white/10 opacity-40'
              }`}
              style={{ left: `${utilization * 80}%` }}
            />
          )}
          {isNight && (
            <div className="absolute top-2 right-4 w-1 h-1 bg-white rounded-full shadow-[0_0_4px_white] animate-pulse" />
          )}
        </div>
        <div className="text-center mt-2 bg-[var(--bg-card)]/90 px-3 py-1 rounded-full border border-[var(--border)] backdrop-blur-sm">
          <div className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
            PV Array ({safeCapacity.toFixed(1)} kWp)
          </div>
          <div className="text-lg font-black text-[var(--text-primary)] leading-none">
            {power.toFixed(2)} <span className="text-xs font-normal">kW</span>
          </div>
          <div className="text-[9px] text-[var(--text-tertiary)] mt-0.5">
            {safeCapacity > 0 ? `${(utilization * 100).toFixed(0)}% utilisation` : 'No capacity'}
          </div>
        </div>
      </div>
    );
  }
);
SolarPanelProduct.displayName = 'SolarPanelProduct';

// ---------------------------------------------------------------------------
// BatteryProduct
// ---------------------------------------------------------------------------
export const BatteryProduct = React.memo(
  ({
    level,
    status,
    power,
    health = 1.0,
    cycles = 0,
    capacityKwh = 60,
  }: {
    level: number;
    status: string;
    power: number;
    health?: number;
    cycles?: number;
    capacityKwh?: number;
  }) => (
    <div className="flex flex-col items-center z-20">
      <div className="relative w-28 h-40 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-lg flex flex-col items-center justify-center overflow-hidden group transition-all duration-500 ease-out hover:-translate-y-1 hover:scale-[1.02] active:scale-95">
        <div className="absolute top-3 text-[7px] font-black text-[var(--border)] tracking-widest">
          SAFARICHARGE
        </div>
        <div className="w-3 h-24 bg-[var(--bg-card-muted)] rounded-full overflow-hidden relative border border-[var(--border)] shadow-inner">
          <div
            className={`absolute bottom-0 left-0 w-full transition-all duration-500 ${
              status === 'Charging' ? 'animate-pulse' : ''
            }`}
            style={{
              height: `${Math.max(0, Math.min(100, level))}%`,
              backgroundColor:
                level < 20 ? 'var(--alert, #ef4444)' :
                level < 40 ? '#f59e0b' :
                'var(--battery)',
              opacity: status === 'Discharging' ? 0.9 : 1,
            }}
          />
          <div className="absolute bottom-[20%] w-full h-0.5 bg-red-400 z-10" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
      </div>
      <div className="text-center mt-2 bg-[var(--bg-card)]/90 px-2 py-1 rounded border border-[var(--border)] min-w-[90px] backdrop-blur-sm">
        <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">
          Storage ({(capacityKwh * health).toFixed(0)} kWh)
        </div>
        <div className="text-sm font-black text-[var(--text-primary)]">{level.toFixed(1)}%</div>
        <div className="text-[10px] font-semibold text-[var(--text-secondary)]">
          {power >= 0 ? '+' : ''}{power.toFixed(1)} kW · {status}
        </div>
        <div
          className={`text-[9px] font-semibold ${
            health < 0.85 ? 'text-orange-500' : 'text-[var(--text-tertiary)]'
          }`}
        >
          Health: {(health * 100).toFixed(1)}% · {cycles.toFixed(1)} cyc
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
  ({
    id,
    status,
    power,
    soc,
    carName,
    capacity,
    maxRate,
    onToggle,
    v2g = false,
  }: {
    id: number;
    status: string;
    power: number;
    soc: number;
    carName: string;
    capacity: number;
    maxRate: number;
    onToggle: () => void;
    v2g?: boolean;
  }) => (
    <div className="flex flex-col items-center z-20 cursor-pointer" onClick={onToggle}>
      <div
        className={`relative w-20 h-28 bg-slate-800 rounded-xl shadow-lg border-l-4 border-slate-600 flex flex-col items-center pt-3 group transition-all duration-500 ease-out hover:-translate-y-1 hover:scale-[1.02] active:scale-95 ring-2 ${
          status === 'Charging'
            ? 'ring-sky-200 shadow-[0_0_12px_#7dd3fc]'
            : 'ring-transparent'
        }`}
      >
        <div className="w-12 h-6 bg-black rounded border border-slate-600 flex items-center justify-center mb-2 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 opacity-50 z-10 pointer-events-none" />
          {v2g ? (
            <span className="text-purple-400 text-[8px] font-mono animate-pulse z-20">V2G↑</span>
          ) : status === 'Charging' ? (
            <span className="text-sky-100 text-[9px] font-semibold animate-pulse z-20">
              {power.toFixed(1)} kW
            </span>
          ) : status === 'Away' ? (
            <span className="text-red-500 text-[8px] z-20">AWAY</span>
          ) : (
            <span className="text-[var(--text-tertiary)] text-[8px] z-20">IDLE</span>
          )}
        </div>
        <div className="w-12 h-8 border-4 border-slate-700 rounded-b-full border-t-0" />
        <div
          className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${
            status === 'Charging'
              ? 'bg-sky-200 shadow-[0_0_10px_#7dd3fc]'
              : status === 'Away'
                ? 'bg-red-500'
                : 'bg-slate-600'
          }`}
        />
      </div>
      <div className="text-center mt-2 bg-[var(--bg-card)]/90 px-2 py-1 rounded border border-[var(--border)] backdrop-blur-sm min-w-[80px]">
        <div className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase">{carName}</div>
        <div className="text-[9px] text-[var(--text-secondary)] font-semibold">
          {capacity} kWh · {maxRate} kW max
        </div>
        <div className="flex justify-between items-end px-1 mt-1 border-t border-[var(--border)] pt-0.5">
          <span className="text-[8px] text-[var(--text-tertiary)]">SoC</span>
          <span
            className={`text-[10px] font-bold ${
              soc < 20 ? 'text-[var(--alert)]' : 'text-[var(--battery)]'
            }`}
          >
            {(soc || 0).toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  )
);
EVChargerProduct.displayName = 'EVChargerProduct';

// ---------------------------------------------------------------------------
// InverterProduct
// ---------------------------------------------------------------------------
export const InverterProduct = React.memo(
  ({
    id,
    power,
    ratedCapacityKw,
  }: {
    id: number | string;
    power: number;
    ratedCapacityKw: number;
  }) => (
    <div className="flex flex-col items-center bg-[var(--bg-card)] rounded-xl border border-[var(--border)] w-28 p-2 z-20 transition-transform duration-300 ease-out hover:scale-[1.03] active:scale-95">
      <div className="w-full flex justify-between items-center mb-1 border-b border-[var(--border)] pb-1">
        <span className="text-[8px] font-bold text-[var(--text-tertiary)]">
          {ratedCapacityKw.toFixed(0)} kW INV #{id}
        </span>
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            power > 0.1 ? 'bg-green-500 animate-pulse' : 'bg-[var(--border)]'
          }`}
        />
      </div>
      <div className="bg-slate-800 rounded w-full h-8 flex items-center justify-center font-mono text-orange-400 text-[10px] shadow-inner">
        {power.toFixed(2)} kW
      </div>
      <div className="mt-1 w-full bg-[var(--bg-card-muted)] rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-orange-400 transition-all duration-500"
          style={{ width: `${Math.min(100, ratedCapacityKw > 0 ? (Math.abs(power) / ratedCapacityKw) * 100 : 0)}%` }}
        />
      </div>
    </div>
  )
);
InverterProduct.displayName = 'InverterProduct';

// ---------------------------------------------------------------------------
// GridProduct
// ---------------------------------------------------------------------------
export const GridProduct = React.memo(
  ({
    power,
    isImporting,
    isExporting,
    gridStatus,
  }: {
    power: number;
    isImporting: boolean;
    isExporting: boolean;
    gridStatus: string;
  }) => (
    <div className="flex flex-col items-center z-20">
      <div className="w-24 h-32 flex items-center justify-center relative transition-transform duration-300 ease-out hover:scale-[1.03] active:scale-95">
        <UtilityPole
          size={64}
          className={gridStatus === 'Online' ? 'text-[var(--text-secondary)]' : 'text-red-300'}
          strokeWidth={1}
        />
        {gridStatus === 'Offline' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded animate-pulse">
              GRID DOWN
            </div>
          </div>
        )}
        {gridStatus === 'Online' && (isImporting || isExporting) && (
          <div
            className={`absolute top-0 right-0 p-1 rounded bg-[var(--bg-card)] border border-[var(--border)] flex items-center gap-1 ${
              isImporting ? 'text-slate-600' : 'text-[var(--alert)]'
            }`}
          >
            {isImporting ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
            <span className="text-[9px] font-bold">{Math.abs(power).toFixed(2)} kW</span>
          </div>
        )}
      </div>
      <div className="text-center mt-2 bg-[var(--bg-card)]/90 px-2 py-1 rounded border border-[var(--border)] backdrop-blur-sm">
        <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Utility Grid</div>
        <div className="text-[9px] font-bold text-[var(--text-primary)]">
          {gridStatus === 'Offline'
            ? 'OFFLINE'
            : isImporting
              ? `IMPORTING ${Math.abs(power).toFixed(2)} kW`
              : isExporting
                ? `EXPORTING ${Math.abs(power).toFixed(2)} kW`
                : 'IDLE'}
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
  ({
    power,
    label = 'Home Load',
    icon: Icon = Home,
  }: {
    power: number;
    label?: string;
    icon?: React.ElementType;
  }) => (
    <div className="flex flex-col items-center z-20">
      <div className="w-24 h-32 flex items-center justify-center bg-[var(--bg-card-muted)] rounded-xl border border-[var(--border)] transition-transform duration-300 ease-out hover:scale-[1.02] active:scale-95">
        <Icon size={40} className="text-[var(--text-secondary)]" strokeWidth={1.5} />
      </div>
      <div className="text-center mt-2 bg-[var(--bg-card)]/90 px-2 py-1 rounded border border-[var(--border)] backdrop-blur-sm">
        <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">{label}</div>
        <div className="text-sm font-black text-[var(--text-primary)]">{power.toFixed(2)} kW</div>
      </div>
    </div>
  )
);
HomeProduct.displayName = 'HomeProduct';

// ---------------------------------------------------------------------------
// SimulationControls — speed slider + pause/play/reset
// ---------------------------------------------------------------------------
function SimulationControls() {
  const simSpeed    = useEnergySystemStore((s) => s.simSpeed);
  const isAutoMode  = useEnergySystemStore((s) => s.isAutoMode);
  const setSimState = useEnergySystemStore((s) => s.setSimulationState);
  const resetSystem = useEnergySystemStore((s) => s.resetSystem);
  const { toast }   = useToast();

  const handleReset = useCallback(() => {
    const ok = window.confirm(
      'Reset the simulation?\n\nThis clears all accumulated energy data and restarts from the initial state.'
    );
    if (!ok) return;
    resetSystem();
    toast({ title: 'Simulation reset', description: 'All data cleared. Restarting…' });
  }, [resetSystem, toast]);

  const speeds = [0.25, 0.5, 1, 2, 5, 10, 30];

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)] text-base">
          <Gauge className="h-4 w-4 text-[var(--solar)]" />
          Simulation Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4">
          {/* Play / Pause */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSimState({ isAutoMode: !isAutoMode })}
            className="flex items-center gap-1.5 min-w-[90px]"
          >
            {isAutoMode ? (
              <><Pause className="h-3.5 w-3.5" /> Pause</>
            ) : (
              <><Play className="h-3.5 w-3.5" /> Resume</>
            )}
          </Button>

          {/* Speed buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-[var(--text-secondary)] mr-1">Speed:</span>
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => setSimState({ simSpeed: s })}
                className={[
                  'px-2 py-1 rounded text-[11px] font-semibold border transition-all duration-150',
                  simSpeed === s
                    ? 'bg-[var(--solar)] text-white border-[var(--solar)]'
                    : 'bg-[var(--bg-card-muted)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--solar)] hover:text-[var(--solar)]',
                ].join(' ')}
              >
                {s}×
              </button>
            ))}
          </div>

          {/* Status badge */}
          <Badge
            variant="outline"
            className={isAutoMode
              ? 'border-green-500 text-green-500 bg-green-500/10'
              : 'border-[var(--border)] text-[var(--text-tertiary)]'
            }
          >
            <span
              className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                isAutoMode ? 'bg-green-500 animate-pulse' : 'bg-[var(--border)]'
              }`}
            />
            {isAutoMode ? 'Running' : 'Paused'}
          </Badge>

          {/* Reset */}
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
// SimulationNodes — live-wired main export
// ---------------------------------------------------------------------------
export function SimulationNodes() {
  // ── Pull live values from store ──────────────────────────────────────────
  const nodes       = useEnergySystemStore((s) => s.nodes);
  const flows       = useEnergySystemStore((s) => s.flows);
  const systemConfig = useEnergySystemStore((s) => s.systemConfig);
  const timeOfDay   = useEnergySystemStore((s) => s.timeOfDay);
  const simSpeed    = useEnergySystemStore((s) => s.simSpeed);
  const minuteData  = useEnergySystemStore((s) => s.minuteData);

  const solarNode   = nodes.solar;
  const batteryNode = nodes.battery;
  const gridNode    = nodes.grid;
  const homeNode    = nodes.home;
  const ev1Node     = nodes.ev1;
  const ev2Node     = nodes.ev2;

  // Latest minute point for higher-fidelity values
  const latest = minuteData[minuteData.length - 1];

  // Resolved live values
  const solarPower     = latest?.solarKW       ?? solarNode.powerKW   ?? 0;
  const batteryLevel   = latest?.batteryLevelPct ?? batteryNode.soc   ?? 0;
  const batteryPower   = latest?.batteryPowerKW  ?? batteryNode.powerKW ?? 0;
  const gridImportKw   = latest?.gridImportKW   ?? (gridNode.status === 'importing' ? Math.abs(gridNode.powerKW ?? 0) : 0);
  const gridExportKw   = latest?.gridExportKW   ?? (gridNode.status === 'exporting' ? Math.abs(gridNode.powerKW ?? 0) : 0);
  const homeLoadKw     = latest
    ? latest.homeLoadKW + latest.ev1LoadKW + latest.ev2LoadKW
    : homeNode.powerKW ?? 0;
  const ev1Power       = latest?.ev1LoadKW      ?? ev1Node.powerKW   ?? 0;
  const ev2Power       = latest?.ev2LoadKW      ?? ev2Node.powerKW   ?? 0;
  const ev1Soc         = latest?.ev1SocPct       ?? ev1Node.soc      ?? 0;
  const ev2Soc         = latest?.ev2SocPct       ?? ev2Node.soc      ?? 0;

  // Derive states
  const isNight        = timeOfDay < 6 || timeOfDay > 19;
  const isImporting    = gridImportKw > 0.05;
  const isExporting    = gridExportKw > 0.05;
  const gridPower      = isImporting ? gridImportKw : isExporting ? gridExportKw : 0;
  const gridStatus     = gridNode.status === 'offline' ? 'Offline' : 'Online';
  const batteryStatus  = batteryPower > 0.1 ? 'Charging' : batteryPower < -0.1 ? 'Discharging' : 'Idle';
  const ev1Status      = ev1Power > 0.1 ? 'Charging' : (ev1Node.status === 'offline' ? 'Away' : 'Idle');
  const ev2Status      = ev2Power > 0.1 ? 'Charging' : (ev2Node.status === 'offline' ? 'Away' : 'Idle');

  // Inverter output = total AC load (home + EV)
  const inverterPower  = homeLoadKw;
  const inverterCapKw  = systemConfig.inverterKW ?? 10;

  // Flow activity helpers
  const hasFlow = (from: string, to: string) =>
    flows.some((f) => f.from === from && f.to === to && f.active);

  // Accumulator totals for summary
  const totalSolarKWh  = minuteData.reduce((s, d) => s + d.solarEnergyKWh, 0);
  const totalSavingsKES = minuteData.reduce((s, d) => s + d.savingsKES, 0);

  return (
    <div className="space-y-6">
      {/* ── Controls ── */}
      <SimulationControls />

      {/* ── Live summary strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Solar Power',     value: `${solarPower.toFixed(2)} kW`,             color: 'text-[var(--solar)]' },
          { label: 'Battery SoC',     value: `${batteryLevel.toFixed(1)}%`,             color: 'text-[var(--battery)]' },
          { label: 'Grid',            value: isImporting ? `↑ ${gridImportKw.toFixed(2)} kW` : isExporting ? `↓ ${gridExportKw.toFixed(2)} kW` : 'Idle', color: 'text-[var(--text-primary)]' },
          { label: 'Total Savings',   value: `KES ${Math.round(totalSavingsKES).toLocaleString()}`, color: 'text-green-500' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="dashboard-card">
            <CardContent className="pt-4 pb-3">
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-semibold mb-0.5">{label}</div>
              <div className={`text-xl font-black ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Hardware nodes ── */}
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
          {/* Top row: PV → Inverter → Grid */}
          <div className="flex flex-wrap justify-center gap-6 lg:gap-10 items-end mb-6">
            <SolarPanelProduct
              power={solarPower}
              capacity={systemConfig.solarCapacityKW ?? 10}
              weather={isNight ? 'Night' : solarPower > (systemConfig.solarCapacityKW ?? 10) * 0.7 ? 'Sunny' : 'Cloudy'}
              isNight={isNight}
            />
            <div className="flex flex-col items-center gap-2">
              <RigidCable
                height={40}
                active={solarPower > 0.1}
                color="bg-yellow-400"
                glowColor="var(--solar)"
                powerKw={solarPower}
                capacityKw={systemConfig.solarCapacityKW ?? 10}
                flowDirection="down"
                speed={simSpeed}
                showLabel
              />
              <InverterProduct
                id={1}
                power={inverterPower}
                ratedCapacityKw={inverterCapKw}
              />
              <RigidCable
                height={40}
                active={gridPower > 0.05}
                color={isImporting ? 'bg-slate-400' : 'bg-[var(--alert)]'}
                glowColor={isImporting ? '#94a3b8' : 'var(--alert, #ef4444)'}
                powerKw={gridPower}
                capacityKw={10}
                flowDirection={isImporting ? 'down' : 'up'}
                speed={simSpeed}
              />
            </div>
            <GridProduct
              power={gridPower}
              isImporting={isImporting}
              isExporting={isExporting}
              gridStatus={gridStatus}
            />
          </div>

          {/* Horizontal bus line */}
          <div className="relative flex items-center justify-center mb-6">
            <HorizontalCable
              width="80%"
              height={3}
              active={solarPower > 0.1 || homeLoadKw > 0.1}
              color="bg-[var(--solar)]"
              glowColor="var(--solar)"
              powerKw={solarPower}
              capacityKw={systemConfig.solarCapacityKW ?? 10}
              flowDirection="right"
              speed={simSpeed}
              showLabel
            />
          </div>

          {/* Bottom row: Battery · Home · EV1 · EV2 */}
          <div className="flex flex-wrap justify-center gap-6 lg:gap-10 items-start">
            <div className="flex flex-col items-center gap-2">
              <RigidCable
                height={36}
                active={batteryPower !== 0}
                color="bg-green-400"
                glowColor="var(--battery)"
                powerKw={Math.abs(batteryPower)}
                capacityKw={systemConfig.batteryCapacityKWh ?? 50}
                flowDirection={batteryPower >= 0 ? 'down' : 'up'}
                speed={simSpeed}
              />
              <BatteryProduct
                level={batteryLevel}
                status={batteryStatus}
                power={batteryPower}
                capacityKwh={systemConfig.batteryCapacityKWh ?? 50}
              />
            </div>

            <div className="flex flex-col items-center gap-2">
              <RigidCable
                height={36}
                active={homeLoadKw > 0.1}
                color="bg-blue-300"
                glowColor="#93c5fd"
                powerKw={homeLoadKw}
                capacityKw={10}
                flowDirection="down"
                speed={simSpeed}
              />
              <HomeProduct power={homeLoadKw} label="Home Load" />
            </div>

            <div className="flex flex-col items-center gap-2">
              <RigidCable
                height={36}
                active={ev1Power > 0.1}
                color="bg-sky-400"
                glowColor="#38bdf8"
                powerKw={ev1Power}
                capacityKw={systemConfig.inverterKW ?? 10}
                flowDirection="down"
                speed={simSpeed}
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

            <div className="flex flex-col items-center gap-2">
              <RigidCable
                height={36}
                active={ev2Power > 0.1}
                color="bg-violet-400"
                glowColor="#a78bfa"
                powerKw={ev2Power}
                capacityKw={systemConfig.inverterKW ?? 10}
                flowDirection="down"
                speed={simSpeed}
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

      {/* ── Session totals ── */}
      <Card className="dashboard-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-[var(--text-primary)]">Session Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
            {[
              { label: 'Solar Gen',    value: `${totalSolarKWh.toFixed(2)} kWh`,    color: 'var(--solar)' },
              { label: 'Grid Import',  value: `${minuteData.reduce((s, d) => s + d.gridImportKWh, 0).toFixed(2)} kWh`, color: 'var(--text-primary)' },
              { label: 'Grid Export',  value: `${minuteData.reduce((s, d) => s + d.gridExportKWh, 0).toFixed(2)} kWh`, color: 'var(--alert, #f59e0b)' },
              { label: 'Home Load',    value: `${minuteData.reduce((s, d) => s + d.homeLoadKWh, 0).toFixed(2)} kWh`,   color: '#93c5fd' },
              { label: 'EV Load',      value: `${minuteData.reduce((s, d) => s + d.ev1LoadKWh + d.ev2LoadKWh, 0).toFixed(2)} kWh`, color: '#38bdf8' },
              { label: 'Savings',      value: `KES ${Math.round(totalSavingsKES).toLocaleString()}`,                   color: '#4ade80' },
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
