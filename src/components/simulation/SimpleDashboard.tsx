'use client';

import { useMemo, useCallback, useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Play, Pause, RotateCcw, Save, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import type { LocationOption } from '@/stores/energySystemStore';
import { AFRICA_CITIES } from '@/lib/africa-locations-data';
import { INVERTER_CATALOG, BATTERY_CATALOG, PANEL_CATALOG } from '@/lib/sizing/mockData';
import { buildInputs } from '@/components/simulation/SizingDispatchPanel';
import { runSimulation } from '@/lib/sizing/solarCalculator';
import { useSizingCatalog } from '@/hooks/useSizingCatalog';
import { LoadProfilePicker } from './LoadProfilePicker';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const KSH_PER_USD = 127.5;
const SPEED_OPTIONS = [1, 5, 10, 30] as const;

const PANEL_OPTIONS = PANEL_CATALOG.filter(p => p.category === 'panel');
const BATTERY_OPTIONS = BATTERY_CATALOG.filter(b => b.category === 'battery' && b.capacityKWh && b.capacityKWh > 0);

const VOLTAGE_CLASSES = ['LV (48V)', 'HV (160-700V)', 'HV (160-800V)', 'HV (150-850V)'] as const;
type VoltageClass = typeof VOLTAGE_CLASSES[number];

// ─── Project presets ──────────────────────────────────────────────────────────

interface SimPreset {
  label: string; icon: string; kwLabel: string;
  inverterId: string; inverterUnits: number; batteryId: string; batteryModules: number;
  panelWatts: number; dcAcRatio: number; voltageClass: VoltageClass;
}

const PRESETS: SimPreset[] = [
  { label: 'Home', icon: '🏠', kwLabel: '6 kW', inverterId: 'inv-solis-6k-lv', inverterUnits: 1, batteryId: 'bat-dyness-dl2.5', batteryModules: 2, panelWatts: 580, dcAcRatio: 1.3, voltageClass: 'LV (48V)' },
  { label: 'Home+', icon: '🏘️', kwLabel: '12 kW', inverterId: 'inv-deye-12k-lv-1p', inverterUnits: 1, batteryId: 'bat-dyness-dl5.0', batteryModules: 5, panelWatts: 620, dcAcRatio: 1.3, voltageClass: 'LV (48V)' },
  { label: 'Office', icon: '🏢', kwLabel: '30 kW', inverterId: 'inv-deye-30k-hv', inverterUnits: 1, batteryId: 'bat-dyness-stack100-mod', batteryModules: 6, panelWatts: 620, dcAcRatio: 1.3, voltageClass: 'HV (160-800V)' },
  { label: 'Factory', icon: '🏭', kwLabel: '50 kW', inverterId: 'inv-deye-50k-hv', inverterUnits: 1, batteryId: 'bat-dyness-stack100-mod', batteryModules: 10, panelWatts: 620, dcAcRatio: 1.3, voltageClass: 'HV (160-800V)' },
  { label: 'Campus', icon: '⚡', kwLabel: '2x 50 kW', inverterId: 'inv-deye-50k-hv', inverterUnits: 2, batteryId: 'bat-dyness-stack100-mod', batteryModules: 20, panelWatts: 625, dcAcRatio: 1.35, voltageClass: 'HV (160-800V)' },
];

// ─── Rolling chart ────────────────────────────────────────────────────────────

function RollingChart({ data }: { data: Array<{ solarKW: number; homeLoadKW: number; gridImportKW: number; batteryLevelPct: number }> }) {
  if (data.length < 2) {
    return (
      <div className="flex h-[120px] items-center justify-center text-xs text-[var(--text-tertiary)]">
        Simulation data will appear here once running...
      </div>
    );
  }

  const W = 600; const H = 120;
  const padL = 8; const padR = 8; const padT = 6; const padB = 18;
  const cW = W - padL - padR; const cH = H - padT - padB;
  const n = data.length;
  const maxPow = Math.max(...data.map(d => Math.max(d.solarKW, d.homeLoadKW, d.gridImportKW)), 1);
  const px = (i: number) => padL + (i / (n - 1)) * cW;
  const py = (v: number, mx: number) => padT + cH - (v / mx) * cH;

  const solar = data.map(d => d.solarKW);
  const load = data.map(d => d.homeLoadKW);
  const grid = data.map(d => Math.max(0, d.gridImportKW));
  const soc = data.map(d => d.batteryLevelPct);

  const toPath = (vals: number[], mx: number) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v, mx).toFixed(1)}`).join(' ');
  const toArea = (vals: number[], mx: number) => {
    const base = padT + cH;
    return toPath(vals, mx) + ` L${px(n - 1).toFixed(1)},${base} L${px(0).toFixed(1)},${base} Z`;
  };
  const socPath = soc.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${(padT + cH - (v / 100) * cH).toFixed(1)}`).join(' ');
  const ticksX = [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[240px]" aria-label="Rolling 60-minute energy chart">
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={padL} x2={W - padR} y1={padT + cH * (1 - f)} y2={padT + cH * (1 - f)} stroke="var(--border)" strokeWidth={0.5} strokeDasharray="3 3" />
      ))}
      <path d={toArea(solar, maxPow)} fill="var(--solar-soft)" />
      <path d={toPath(solar, maxPow)} fill="none" stroke="var(--solar)" strokeWidth={2} />
      <path d={toPath(load, maxPow)} fill="none" stroke="var(--consumption)" strokeWidth={1.5} strokeDasharray="5 3" />
      <path d={toPath(grid, maxPow)} fill="none" stroke="var(--grid)" strokeWidth={1.5} />
      <path d={socPath} fill="none" stroke="var(--battery)" strokeWidth={1.5} strokeDasharray="2 2" />
      {ticksX.map(idx => (
        <text key={idx} x={px(idx)} y={H - 3} textAnchor="middle" fontSize={8} fill="var(--text-tertiary)" fontFamily="monospace">
          -{(n - 1 - idx)}m
        </text>
      ))}
      <text x={W - padR} y={padT + 8} textAnchor="end" fontSize={8} fill="var(--text-tertiary)" fontFamily="monospace">
        {maxPow.toFixed(1)} kW
      </text>
    </svg>
  );
}

// ─── KPI chip ─────────────────────────────────────────────────────────────────

function KpiChip({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-center">
      <span className={`text-lg font-black tabular-nums leading-none ${color}`}>{value}</span>
      <span className="mt-0.5 text-[9px] text-[var(--text-muted)]">{unit}</span>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SimpleDashboardProps {
  onSaveRun: () => void;
  isSaving: boolean;
}

export function SimpleDashboard({ onSaveRun, isSaving }: SimpleDashboardProps) {
  // Store
  const minuteData = useEnergySystemStore(s => s.minuteData);
  const systemConfig = useEnergySystemStore(s => s.systemConfig);
  const activeLocation = useEnergySystemStore(s => s.activeLocation);
  const isAutoMode = useEnergySystemStore(s => s.isAutoMode);
  const simSpeed = useEnergySystemStore(s => s.simSpeed);
  const timeOfDay = useEnergySystemStore(s => s.timeOfDay);
  const setSimState = useEnergySystemStore(s => s.setSimulationState);
  const resetSystem = useEnergySystemStore(s => s.resetSystem);
  const updateSystemConfig = useEnergySystemStore(s => s.updateSystemConfig);
  const setActiveLocation = useEnergySystemStore(s => s.setActiveLocation);

  // ── Hardware input state ──────────────────────────────────────────────────

  const [voltageClass, setVoltageClass] = useState<VoltageClass>('LV (48V)');
  const [inverterId, setInverterId] = useState('inv-deye-12k-lv-1p');
  const [inverterUnits, setInverterUnits] = useState(1);
  const [batteryId, setBatteryId] = useState('bat-dyness-dl5.0');
  const [batteryModules, setBatteryModules] = useState(5);
  const [panelWatts, setPanelWatts] = useState(620);
  const [dcAcRatio, setDcAcRatio] = useState(1.3);
  const [locationName, setLocationName] = useState(activeLocation.name || 'Nairobi');

  // ── Derived hardware ──────────────────────────────────────────────────────

  const filteredInverters = useMemo(
    () => INVERTER_CATALOG.filter(i => i.voltageClass === voltageClass && i.category === 'inverter'),
    [voltageClass]
  );

  const selectedInverter = useMemo(
    () => INVERTER_CATALOG.find(i => i.id === inverterId) ?? filteredInverters[0],
    [inverterId, filteredInverters]
  );
  const selectedBattery = useMemo(
    () => BATTERY_CATALOG.find(b => b.id === batteryId) ?? BATTERY_OPTIONS[0],
    [batteryId]
  );
  const selectedPanel = useMemo(
    () => PANEL_OPTIONS.find(p => p.ratingWatts === panelWatts) ?? PANEL_OPTIONS[2],
    [panelWatts]
  );

  const inverterUnitKW = (selectedInverter?.ratingWatts ?? 12000) / 1000;
  const inverterKW = inverterUnitKW * inverterUnits;
  const batteryKWh = batteryModules * (selectedBattery?.capacityKWh ?? 5.12);
  const solarKWp = +(inverterKW * dcAcRatio).toFixed(1);
  const panelCount = Math.ceil((solarKWp * 1000) / (selectedPanel?.ratingWatts ?? 620));

  // ── Sync to store (debounced) ─────────────────────────────────────────────

  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncToStore = useCallback(() => {
    updateSystemConfig({ inverterKW, inverterUnits, batteryCapacityKWh: batteryKWh, solarCapacityKW: solarKWp });
  }, [inverterKW, inverterUnits, batteryKWh, solarKWp, updateSystemConfig]);

  useEffect(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(syncToStore, 300);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [syncToStore]);

  // Sync voltage class -> only reset inverter if the current selection no longer belongs to this class
  useEffect(() => {
    const stillValid = INVERTER_CATALOG.some(i => i.id === inverterId && i.voltageClass === voltageClass && i.category === 'inverter');
    if (stillValid) return;
    const match = INVERTER_CATALOG.find(i => i.voltageClass === voltageClass && i.category === 'inverter');
    if (match) setInverterId(match.id);
  }, [voltageClass, inverterId]);

  // Sync location name to store
  useEffect(() => {
    const city = AFRICA_CITIES.find(c => c.name === locationName);
    if (!city) return;
    const loc: LocationOption = {
      name: city.name,
      displayName: `${city.name}, ${city.country}`,
      county: city.country,
      latitude: city.lat,
      longitude: city.lon,
      annualAvgSunHours: city.avgDailyPsh,
      isKosapTarget: false,
      electrificationRatePct: null,
      countyNote: '',
    };
    setActiveLocation(loc);
  }, [locationName, setActiveLocation]);

  // ── Preset handler ────────────────────────────────────────────────────────

  const applyPreset = useCallback((p: SimPreset) => {
    setVoltageClass(p.voltageClass);
    setInverterId(p.inverterId);
    setInverterUnits(p.inverterUnits);
    setBatteryId(p.batteryId);
    setBatteryModules(p.batteryModules);
    setPanelWatts(p.panelWatts);
    setDcAcRatio(p.dcAcRatio);
  }, []);

  // ── Sizing financials ─────────────────────────────────────────────────────

  const { catalog: sizingCatalog } = useSizingCatalog();

  const sizingResults = useMemo(() => {
    if (!sizingCatalog) return null;
    try {
      const inputs = buildInputs(systemConfig, activeLocation.name, sizingCatalog);
      return runSimulation(inputs, sizingCatalog);
    } catch {
      return null;
    }
  }, [systemConfig, activeLocation.name, sizingCatalog]);

  const totalCapExKSh = sizingResults?.totalCapExKSh ?? 0;
  const annualSavingsKSh = Math.round((sizingResults?.annualSavingsUSD ?? 0) * KSH_PER_USD);
  const npvKSh = Math.round((sizingResults?.npvUSD ?? 0) * KSH_PER_USD);

  // ── Live data ─────────────────────────────────────────────────────────────

  const recentData = useMemo(() => minuteData.slice(-60), [minuteData]);
  const latest = minuteData[minuteData.length - 1];

  const todaySavings = useMemo(
    () => minuteData.reduce((s, d) => s + (d.savingsKES ?? 0), 0),
    [minuteData]
  );
  const todaySolar = useMemo(
    () => minuteData.reduce((s, d) => s + (d.solarKW ?? 0) / 60, 0),
    [minuteData]
  );

  const hours = Math.floor(timeOfDay);
  const mins = Math.round((timeOfDay % 1) * 60);
  const timeStr = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

  // ── Input style helper ────────────────────────────────────────────────────

  const inputCls = 'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--battery)] focus:outline-none transition-colors';
  const labelCls = 'block text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1';

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

      {/* ── LEFT: Configure ── */}
      <aside className="w-full shrink-0 space-y-4 lg:w-[300px]">

        {/* Preset cards */}
        <div>
          <p className={labelCls}>Pick a system size</p>
          <div className="grid grid-cols-5 gap-1.5">
            {PRESETS.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className={cn(
                  'flex flex-col items-center rounded-xl border px-1 py-2 text-center transition-all',
                  inverterId === p.inverterId && inverterUnits === p.inverterUnits
                    ? 'border-[var(--battery)] bg-[var(--battery-soft)]'
                    : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--battery)] hover:bg-[var(--battery-soft)]'
                )}
              >
                <span className="text-base">{p.icon}</span>
                <span className="mt-0.5 text-[9px] font-bold text-[var(--text-primary)]">{p.label}</span>
                <span className="text-[9px] text-[var(--text-muted)]">{p.kwLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Hardware config */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-3">
          <p className="text-xs font-bold text-[var(--text-primary)]">System hardware</p>

          {/* Voltage class */}
          <div>
            <label className={labelCls}>Voltage class</label>
            <select value={voltageClass} onChange={(e: ChangeEvent<HTMLSelectElement>) => setVoltageClass(e.target.value as VoltageClass)} className={inputCls}>
              {VOLTAGE_CLASSES.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {/* Inverter */}
          <div>
            <label className={labelCls}>
              Inverter
              <span className="ml-1 font-normal normal-case text-[var(--text-muted)]">
                - {inverterUnits > 1 ? `${inverterUnits}x ${inverterUnitKW.toFixed(1)} kW = ${inverterKW.toFixed(1)} kW` : `${inverterUnitKW.toFixed(1)} kW`}
              </span>
            </label>
            <select value={inverterId} onChange={(e: ChangeEvent<HTMLSelectElement>) => setInverterId(e.target.value)} className={cn(inputCls, 'mb-2')}>
              {filteredInverters.map(i => <option key={i.id} value={i.id}>{i.brand} {i.model}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)]">Units</span>
              <input
                type="number" min={1} max={5} value={inverterUnits}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInverterUnits(Math.max(1, Math.min(5, +e.target.value)))}
                className="w-16 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--battery)] focus:outline-none"
              />
              <span className="text-sm font-bold text-[var(--text-primary)]">= {inverterKW.toFixed(1)} kW total</span>
            </div>
          </div>

          {/* Battery */}
          <div>
            <label className={labelCls}>Battery</label>
            <select value={batteryId} onChange={(e: ChangeEvent<HTMLSelectElement>) => setBatteryId(e.target.value)} className={cn(inputCls, 'mb-2')}>
              {BATTERY_OPTIONS.map(b => <option key={b.id} value={b.id}>{b.brand} {b.model} ({b.capacityKWh} kWh)</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="number" min={1} max={40} value={batteryModules}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setBatteryModules(Math.max(1, Math.min(40, +e.target.value)))}
                className="w-16 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--battery)] focus:outline-none"
              />
              <span className="text-xs text-[var(--text-muted)]">x {selectedBattery?.capacityKWh} kWh =</span>
              <span className="text-sm font-bold text-[var(--battery)]">{batteryKWh.toFixed(1)} kWh</span>
            </div>
          </div>

          {/* Solar PV */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>Panel</label>
              <select value={panelWatts} onChange={(e: ChangeEvent<HTMLSelectElement>) => setPanelWatts(+e.target.value)} className={inputCls}>
                {PANEL_OPTIONS.map(p => <option key={p.id} value={p.ratingWatts}>{p.ratingWatts} W</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>DC/AC ratio</label>
              <input type="number" min={1.0} max={1.6} step={0.05} value={dcAcRatio} onChange={(e: ChangeEvent<HTMLInputElement>) => setDcAcRatio(+e.target.value)} className={inputCls} />
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">{solarKWp} kWp - {panelCount} x {panelWatts}W panels</p>

          {/* Load profile */}
          <div className="pt-1 border-t border-[var(--border)]">
            <LoadProfilePicker />
          </div>

          {/* Location */}
          <div>
            <label className={labelCls}>Location</label>
            <select value={locationName} onChange={(e: ChangeEvent<HTMLSelectElement>) => setLocationName(e.target.value)} className={inputCls}>
              {AFRICA_CITIES
                .filter((c, i, arr) => arr.findIndex(x => x.name === c.name) === i)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(c => <option key={c.name} value={c.name}>{c.name}, {c.country}</option>)}
            </select>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSaveRun}
            disabled={isSaving || minuteData.length === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Run'}
          </button>
          <Link
            href="/sizing"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--battery)] px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            <ExternalLink className="h-4 w-4" />
            Full Analysis
          </Link>
        </div>
      </aside>

      {/* ── RIGHT: Live simulation ── */}
      <div className="flex-1 min-w-0 space-y-4">

        {/* Playback controls */}
        <div className="flex items-center gap-3 flex-wrap rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSimState({ isAutoMode: !isAutoMode })}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                isAutoMode
                  ? 'border-[var(--battery)] bg-[var(--battery)] text-white shadow-md'
                  : 'border-[var(--border-strong)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--battery)]'
              )}
            >
              {isAutoMode ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => { resetSystem(); setSimState({ isAutoMode: false }); }}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {selectedInverter?.brand} {selectedInverter?.model} - {activeLocation.displayName}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              {solarKWp} kWp - {batteryKWh.toFixed(1)} kWh battery - Day sim {timeStr}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {SPEED_OPTIONS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSimState({ simSpeed: s })}
                className={cn(
                  'rounded-md px-2 py-1 text-[10px] font-bold transition-colors',
                  simSpeed === s
                    ? 'bg-[var(--battery)] text-white'
                    : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-[var(--battery)] hover:text-[var(--battery)]'
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* KPI chips */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <KpiChip label="Solar now" value={(latest?.solarKW ?? 0).toFixed(1)} unit="kW" color="text-[var(--solar)]" />
          <KpiChip label="Load now" value={(latest?.homeLoadKW ?? 0).toFixed(1)} unit="kW" color="text-[var(--consumption)]" />
          <KpiChip label="Battery" value={Math.round(latest?.batteryLevelPct ?? 0).toString()} unit="%" color="text-[var(--battery)]" />
          <KpiChip label="Grid import" value={(Math.max(0, latest?.gridImportKW ?? 0)).toFixed(1)} unit="kW" color="text-[var(--grid)]" />
          <KpiChip label="Solar today" value={todaySolar.toFixed(1)} unit="kWh" color="text-[var(--solar)]" />
          <KpiChip label="Saved today" value={Math.round(todaySavings).toLocaleString()} unit="KSh" color="text-[var(--battery)]" />
        </div>

        {/* Rolling chart */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
          <div className="mb-2 flex flex-wrap items-center gap-3 text-[10px] text-[var(--text-tertiary)]">
            <span className="font-semibold text-[var(--text-secondary)]">Last 60 minutes</span>
            {[
              { label: 'Solar', color: 'var(--solar)' },
              { label: 'Load', color: 'var(--consumption)' },
              { label: 'Grid', color: 'var(--grid)' },
              { label: 'Battery %', color: 'var(--battery)' },
            ].map(l => (
              <span key={l.label} className="flex items-center gap-1">
                <span className="h-2 w-3 rounded-sm inline-block" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <RollingChart data={recentData} />
          </div>
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total CapEx', value: totalCapExKSh > 0 ? `KSh ${(totalCapExKSh / 1_000_000).toFixed(2)}M` : 'Calculating...' },
            { label: 'Annual Savings', value: annualSavingsKSh > 0 ? `KSh ${annualSavingsKSh.toLocaleString()}` : '--' },
            { label: '25-yr NPV', value: npvKSh !== 0 ? `KSh ${npvKSh > 0 ? '+' : ''}${(npvKSh / 1_000_000).toFixed(2)}M` : '--' },
          ].map(f => (
            <div key={f.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
              <p className="text-base font-black text-[var(--text-primary)]">{f.value}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
