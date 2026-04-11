'use client';

/**
 * SimulationPage.tsx
 *
 * Live-wired simulation view — replaces the static <SimulationNodes /> stub.
 *
 * Reads ONLY from useEnergySystemStore so every value reflects the running
 * physics engine (wired via usePhysicsSimulation / useDemoEnergySystem).
 *
 * Borrowed from the original page.tsx power-flow diagram:
 *  • SolarPanelProduct, BatteryProduct, GridProduct, EVChargerProduct,
 *    InverterProduct, RigidCable, HorizontalCable  (SimulationNodes.tsx)
 *  • Accumulator totals banner
 *  • Sim-clock / speed badge
 *  • Power-flow connections (solar→home, solar→battery, battery→home, grid↔home)
 */

import React, { useMemo } from 'react';
import {
  SolarPanelProduct,
  BatteryProduct,
  GridProduct,
  EVChargerProduct,
  InverterProduct,
  RigidCable,
  HorizontalCable,
} from './SimulationNodes';
import {
  useEnergySystemStore,
} from '@/stores/energySystemStore';
import {
  useEnergyNode,
  useEnergyFlows,
  useAccumulators,
  useSimulationState,
} from '@/hooks/useEnergySystem';
import { Zap, Sun, Battery, Grid3x3, Clock, Gauge } from 'lucide-react';

// ─── tiny helper ─────────────────────────────────────────────────────────────
function fmt(n: number, dec = 1) {
  return isFinite(n) ? n.toFixed(dec) : '0.0';
}
function fmtKES(n: number) {
  return `KES ${Math.round(n).toLocaleString()}`;
}

// ─── AccumulatorBanner ───────────────────────────────────────────────────────
function AccumulatorBanner() {
  const acc = useAccumulators();

  const items = [
    { label: 'Solar Generated',  value: `${fmt(acc.solar)} kWh`,         color: 'var(--solar)',       Icon: Sun },
    { label: 'Grid Import',      value: `${fmt(acc.gridImport)} kWh`,    color: 'var(--grid)',        Icon: Grid3x3 },
    { label: 'Savings',          value: fmtKES(acc.savings),              color: 'var(--battery)',     Icon: Zap },
    { label: 'Carbon Offset',    value: `${fmt(acc.carbonOffset)} kg`,    color: 'var(--battery)',     Icon: Battery },
    { label: 'Feed-in Earnings', value: fmtKES(acc.feedInEarnings),       color: 'var(--solar)',       Icon: Zap },
    { label: 'Bat. Discharge',   value: `${fmt(acc.batDischargeKwh)} kWh`, color: 'var(--consumption)', Icon: Battery },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map(({ label, value, color, Icon }) => (
        <div
          key={label}
          className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 gap-1 text-center shadow-sm"
        >
          <Icon size={16} style={{ color }} />
          <span className="text-[11px] text-[var(--text-tertiary)] leading-tight">{label}</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── SimClockBadge ────────────────────────────────────────────────────────────
function SimClockBadge() {
  const { currentDate, timeOfDay, simSpeed, isAutoMode } = useSimulationState();

  const timeStr = useMemo(() => {
    const h = Math.floor(timeOfDay ?? 0);
    const m = Math.round(((timeOfDay ?? 0) % 1) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }, [timeOfDay]);

  const dateStr = useMemo(() => {
    if (!currentDate) return '';
    return new Date(currentDate).toLocaleDateString('en-KE', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    });
  }, [currentDate]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5">
        <Clock size={13} className="text-[var(--solar)]" />
        <span className="text-xs font-mono text-[var(--text-primary)]">{timeStr}</span>
        {dateStr && <span className="text-[10px] text-[var(--text-tertiary)]">{dateStr}</span>}
      </div>
      <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-3 py-1.5">
        <Gauge size={13} className="text-[var(--grid)]" />
        <span className="text-xs font-mono text-[var(--text-primary)]">{simSpeed ?? 1}×</span>
        <span className="text-[10px] text-[var(--text-tertiary)]">{isAutoMode ? 'AUTO' : 'MANUAL'}</span>
      </div>
    </div>
  );
}

// ─── PowerFlowDiagram ─────────────────────────────────────────────────────────
// Borrowing layout from the original page.tsx CentralDisplay / power-flow section.
function PowerFlowDiagram() {
  const solar   = useEnergyNode('solar');
  const battery = useEnergyNode('battery');
  const grid    = useEnergyNode('grid');
  const home    = useEnergyNode('home');
  const ev1     = useEnergyNode('ev1');
  const ev2     = useEnergyNode('ev2');
  const flows   = useEnergyFlows();
  const config  = useEnergySystemStore((s) => s.fullSystemConfig);

  // Derive flow states from the live flows array
  const solarToHome    = flows.find(f => f.from === 'solar'   && f.to === 'home');
  const solarToBattery = flows.find(f => f.from === 'solar'   && f.to === 'battery');
  const solarToGrid    = flows.find(f => f.from === 'solar'   && f.to === 'grid');
  const batteryToHome  = flows.find(f => f.from === 'battery' && f.to === 'home');
  const gridToHome     = flows.find(f => f.from === 'grid'    && f.to === 'home');

  const solarCapKw   = config?.solar?.totalCapacityKw    ?? solar.capacityKW  ?? 10;
  const batCapKwh    = config?.battery?.capacityKwh      ?? battery.capacityKWh ?? 50;
  const inverterKw   = config?.inverter?.ratedKw         ?? 10;
  const ev1CapKwh    = 80;
  const ev2CapKwh    = 118;
  const ev1MaxKw     = 11;
  const ev2MaxKw     = 22;

  const isNight = (solar.powerKW ?? 0) < 0.1;
  const weather = isNight ? 'Night' : (solar.powerKW ?? 0) > solarCapKw * 0.6 ? 'Sunny' : 'Cloudy';

  const isImporting = grid.status === 'importing';
  const isExporting = grid.status === 'exporting';

  const cableCapKw = Math.max(solarCapKw, inverterKw, 10);

  return (
    <div className="flex flex-col items-center gap-0 w-full select-none">
      {/* ── Row 1: Solar ────────────────────────────────────────── */}
      <div className="flex justify-center">
        <SolarPanelProduct
          power={solar.powerKW ?? 0}
          capacity={solarCapKw}
          weather={weather}
          isNight={isNight}
        />
      </div>

      {/* Solar → down cable */}
      <RigidCable
        height={40}
        active={(solarToHome?.active || solarToBattery?.active) ?? false}
        color="bg-yellow-400"
        flowDirection="down"
        glowColor="var(--solar)"
        powerKw={solar.powerKW ?? 0}
        capacityKw={cableCapKw}
        speed={2}
      />

      {/* ── Row 2: Grid — Inverter — Battery ──────────────────── */}
      <div className="flex items-center gap-0">
        {/* Grid node */}
        <GridProduct
          power={grid.powerKW ?? 0}
          isImporting={isImporting}
          isExporting={isExporting}
          gridStatus="Online"
        />

        {/* Grid ↔ Inverter cable */}
        <HorizontalCable
          width={60}
          active={gridToHome?.active || solarToGrid?.active}
          color="bg-slate-400"
          powerKw={grid.powerKW ?? 0}
          capacityKw={cableCapKw}
          flowDirection={isImporting ? 'right' : 'left'}
          glowColor={isImporting ? 'var(--grid)' : 'var(--solar)'}
          speed={1.5}
        />

        {/* Inverter */}
        <InverterProduct
          id={1}
          power={(solar.powerKW ?? 0) + Math.max(0, -(battery.powerKW ?? 0))}
          ratedCapacityKw={inverterKw}
        />

        {/* Inverter ↔ Battery cable */}
        <HorizontalCable
          width={60}
          active={solarToBattery?.active || batteryToHome?.active}
          color="bg-green-400"
          powerKw={Math.abs(battery.powerKW ?? 0)}
          capacityKw={cableCapKw}
          flowDirection={(battery.powerKW ?? 0) > 0 ? 'right' : 'left'}
          glowColor="var(--battery)"
          speed={2}
        />

        {/* Battery */}
        <BatteryProduct
          level={battery.soc ?? 0}
          status={
            (battery.powerKW ?? 0) > 0.01
              ? 'Charging'
              : (battery.powerKW ?? 0) < -0.01
              ? 'Discharging'
              : 'Idle'
          }
          power={Math.abs(battery.powerKW ?? 0)}
          capacityKwh={batCapKwh}
        />
      </div>

      {/* Inverter → Home cable */}
      <RigidCable
        height={40}
        active={(solarToHome?.active || batteryToHome?.active || gridToHome?.active) ?? false}
        color="bg-blue-400"
        flowDirection="down"
        glowColor="var(--consumption)"
        powerKw={home.powerKW ?? 0}
        capacityKw={cableCapKw}
        speed={2}
      />

      {/* ── Row 3: Home + EV chargers ─────────────────────────── */}
      <div className="flex items-start gap-6 flex-wrap justify-center">
        {/* Home load */}
        <div className="flex flex-col items-center z-20">
          <div className="w-24 h-32 flex items-center justify-center bg-[var(--bg-card-muted)] rounded-xl border border-[var(--border)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
              fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="text-center mt-2 bg-[var(--bg-card)]/90 px-2 py-1 rounded border border-[var(--border)] backdrop-blur-sm">
            <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase">Home Load</div>
            <div className="text-sm font-black text-[var(--text-primary)]">{fmt(home.powerKW ?? 0)} kW</div>
          </div>
        </div>

        {/* EV1 */}
        <EVChargerProduct
          id={1}
          status={
            ev1.status === 'offline' ? 'Away' :
            ev1.status === 'charging' ? 'Charging' : 'Idle'
          }
          power={ev1.powerKW ?? 0}
          soc={ev1.soc ?? 0}
          carName="EV Commuter"
          capacity={ev1CapKwh}
          maxRate={ev1MaxKw}
          onToggle={() => {}}
        />

        {/* EV2 */}
        <EVChargerProduct
          id={2}
          status={
            ev2.status === 'offline' ? 'Away' :
            ev2.status === 'charging' ? 'Charging' : 'Idle'
          }
          power={ev2.powerKW ?? 0}
          soc={ev2.soc ?? 0}
          carName="EV Fleet"
          capacity={ev2CapKwh}
          maxRate={ev2MaxKw}
          onToggle={() => {}}
        />
      </div>
    </div>
  );
}

// ─── SimulationPage (main export) ─────────────────────────────────────────────
export function SimulationPage() {
  return (
    <div className="space-y-6">
      {/* Clock + speed row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SimClockBadge />
      </div>

      {/* Accumulator totals */}
      <AccumulatorBanner />

      {/* Live power-flow diagram */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 flex flex-col items-center shadow-md">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-6 self-start">
          Live Power Flow
        </h3>
        <PowerFlowDiagram />
      </div>
    </div>
  );
}
