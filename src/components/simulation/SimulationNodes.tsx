'use client';

/**
 * SimulationNodes.tsx
 * Extracted from page.tsx — visual node components used in the power-flow diagram.
 * Fixes #3: separates pure-UI hardware nodes from the main dashboard God Component.
 */

import React from 'react';
import { ChevronDown, UtilityPole, ArrowDown, ArrowUp, Home, Battery } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types (duplicated from page.tsx to keep this file self-contained)
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
// HorizontalCable — horizontal animated power cable
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
            PV Array ({safeCapacity.toFixed(1)}kW)
          </div>
          <div className="text-lg font-black text-[var(--text-primary)] leading-none">
            {power.toFixed(1)} <span className="text-xs font-normal">kW</span>
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
              height: `${level}%`,
              backgroundColor: 'var(--battery)',
              opacity: status === 'Discharging' ? 0.9 : 1,
            }}
          />
          <div className="absolute bottom-[20%] w-full h-0.5 bg-red-400 z-10" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
      </div>
      <div className="text-center mt-2 bg-[var(--bg-card)]/90 px-2 py-1 rounded border border-[var(--border)] min-w-[72px] sm:min-w-[90px] backdrop-blur-sm">
        <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">
          Storage ({(capacityKwh * health).toFixed(0)}kWh)
        </div>
        <div className="text-sm font-black text-[var(--text-primary)]">{level.toFixed(1)}%</div>
        <div
          className={`text-[10px] font-semibold ${
            health < 0.85 ? 'text-orange-500' : 'text-[var(--text-primary)]'
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
    <div className="flex flex-col items-center z-20" onClick={onToggle}>
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
              {power.toFixed(1)}kW
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
      <div className="text-center mt-2 bg-[var(--bg-card)]/90 px-2 py-1 rounded border border-[var(--border)] backdrop-blur-sm min-w-[72px] sm:min-w-[90px]">
        <div className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase">{carName}</div>
        <div className="text-[9px] sm:text-[10px] text-[var(--text-secondary)] font-semibold">
          {capacity}kWh • {maxRate}kW
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
    <div className="flex flex-col items-center bg-[var(--bg-card)] rounded-xl border border-[var(--border)] w-24 p-2 z-20 transition-transform duration-300 ease-out hover:scale-[1.03] active:scale-95">
      <div className="w-full flex justify-between items-center mb-1 border-b border-[var(--border)] pb-1">
        <span className="text-[8px] font-bold text-[var(--text-tertiary)]">
          {ratedCapacityKw.toFixed(0)}kW Inverter #{id}
        </span>
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            power > 0 ? 'bg-green-500 animate-pulse' : 'bg-[var(--border)]'
          }`}
        />
      </div>
      <div className="bg-slate-800 rounded w-full h-8 flex items-center justify-center font-mono text-orange-400 text-[10px] shadow-inner">
        {power.toFixed(1)} kW
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
            <span className="text-[9px] font-bold">{Math.abs(power).toFixed(1)} kW</span>
          </div>
        )}
      </div>
      <div className="text-center mt-2 bg-[var(--bg-card)]/90 px-2 py-1 rounded border border-[var(--border)] backdrop-blur-sm">
        <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Utility Grid</div>
        <div className="text-[9px] font-bold text-[var(--text-primary)]">
          {gridStatus === 'Offline'
            ? 'OFFLINE'
            : isImporting
              ? 'IMPORTING'
              : isExporting
                ? 'EXPORTING'
                : 'IDLE'}
        </div>
      </div>
    </div>
  )
);
GridProduct.displayName = 'GridProduct';

// ---------------------------------------------------------------------------
// HomeProduct — generic load node (home, commercial, industrial, accessory)
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
        <div className="text-sm font-black text-[var(--text-primary)]">{power.toFixed(1)} kW</div>
      </div>
    </div>
  )
);
HomeProduct.displayName = 'HomeProduct';
