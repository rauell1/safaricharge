'use client';

import { useState, useEffect, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import Link from 'next/link';
import { Play, Pause, RotateCcw, ChevronRight } from 'lucide-react';
import { useEnergySystemStore, type LocationOption } from '@/stores/energySystemStore';
import { useDemoEnergySystem } from '@/hooks/useDemoEnergySystem';
import { useMinuteData, useAccumulators, useSimulationState } from '@/hooks/useEnergySystem';
import { INVERTER_CATALOG, BATTERY_CATALOG, PANEL_CATALOG } from '@/lib/sizing/mockData';
import { AFRICA_CITIES } from '@/lib/africa-locations-data';
import { buildInputs } from '@/components/simulation/SizingDispatchPanel';
import { runSimulation } from '@/lib/sizing/solarCalculator';
import { BrandLogo } from '@/components/brand-logo';
import { cn } from '@/lib/utils';

// ── Constants ──────────────────────────────────────────────────────────────────

const KSH_PER_USD = 127.5;

const SPEED_OPTIONS = [1, 5, 10, 30] as const;

const PANEL_OPTIONS = PANEL_CATALOG.filter(p => p.category === 'panel');

const BATTERY_OPTIONS = BATTERY_CATALOG.filter(
  b => b.category === 'battery' && b.capacityKWh && b.capacityKWh > 0
);

const VOLTAGE_CLASSES = ['LV (48V)', 'HV (160-700V)', 'HV (160-800V)', 'HV (150-850V)'] as const;
type VoltageClass = typeof VOLTAGE_CLASSES[number];

// ── Project presets ─────────────────────────────────────────────────────────────

interface SimPreset {
  label: string;
  icon: string;
  kwLabel: string;
  inverterId: string;
  batteryId: string;
  batteryModules: number;
  panelWatts: number;
  dcAcRatio: number;
  voltageClass: VoltageClass;
}

const PRESETS: SimPreset[] = [
  {
    label: 'Home Basic',
    icon: '🏠',
    kwLabel: '6 kW',
    inverterId: 'inv-solis-6k-lv',
    batteryId: 'bat-dyness-dl2.5',
    batteryModules: 2,
    panelWatts: 580,
    dcAcRatio: 1.3,
    voltageClass: 'LV (48V)',
  },
  {
    label: 'Home Plus',
    icon: '🏘️',
    kwLabel: '12 kW',
    inverterId: 'inv-deye-12k-lv-1p',
    batteryId: 'bat-dyness-dl5.0',
    batteryModules: 5,
    panelWatts: 620,
    dcAcRatio: 1.3,
    voltageClass: 'LV (48V)',
  },
  {
    label: 'SME Office',
    icon: '🏢',
    kwLabel: '30 kW',
    inverterId: 'inv-deye-30k-hv',
    batteryId: 'bat-dyness-stack100-mod',
    batteryModules: 6,
    panelWatts: 620,
    dcAcRatio: 1.3,
    voltageClass: 'HV (160-800V)',
  },
  {
    label: 'Factory',
    icon: '🏭',
    kwLabel: '50 kW',
    inverterId: 'inv-deye-50k-hv',
    batteryId: 'bat-dyness-stack100-mod',
    batteryModules: 10,
    panelWatts: 620,
    dcAcRatio: 1.3,
    voltageClass: 'HV (160-800V)',
  },
  {
    label: 'Campus',
    icon: '⚡',
    kwLabel: '100 kW',
    inverterId: 'inv-solis-50k-hv-3p',
    batteryId: 'bat-dyness-stack100-mod',
    batteryModules: 20,
    panelWatts: 625,
    dcAcRatio: 1.35,
    voltageClass: 'HV (150-850V)',
  },
];

// ── Rolling chart ──────────────────────────────────────────────────────────────

function RollingChart({ data }: {
  data: Array<{ solarKW: number; homeLoadKW: number; gridImportKW: number; batteryLevelPct: number }>;
}) {
  if (data.length < 2) {
    return (
      <div className="flex h-[120px] items-center justify-center text-xs text-[var(--text-muted)]">
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

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Rolling 60-minute energy chart">
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={padL} x2={W - padR}
          y1={padT + cH * (1 - f)} y2={padT + cH * (1 - f)}
          stroke="var(--border)" strokeWidth={0.5} />
      ))}
      <path d={toArea(solar, maxPow)} fill="var(--solar-soft)" />
      <path d={toPath(solar, maxPow)} fill="none" stroke="var(--solar)" strokeWidth={1.5} />
      <path d={toPath(load, maxPow)} fill="none" stroke="var(--consumption)" strokeWidth={1.5} strokeDasharray="4 2" />
      <path d={toPath(grid, maxPow)} fill="none" stroke="var(--grid)" strokeWidth={1} opacity={0.7} />
      <path d={socPath} fill="none" stroke="var(--battery)" strokeWidth={1} opacity={0.5} />
    </svg>
  );
}

// ── KPI chip ───────────────────────────────────────────────────────────────────

function KpiChip({ label, value, unit, color }: {
  label: string; value: string; unit: string; color: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-3 text-center">
      <span className={`text-xl font-black tabular-nums leading-none ${color}`}>{value}</span>
      <span className="mt-0.5 text-[10px] text-[var(--text-muted)]">{unit}</span>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</span>
    </div>
  );
}

// ── Hardware card ──────────────────────────────────────────────────────────────

function HwCard({ type, model, detail, priceKSh }: {
  type: string; model: string; detail: string; priceKSh: number;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-3">
      <div className="mb-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{type}</div>
      <div className="text-xs font-bold text-[var(--text-primary)]">{model}</div>
      <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{detail}</div>
      <div className="mt-2 text-xs font-bold text-[var(--battery)]">
        KSh {priceKSh.toLocaleString()}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SimulationPage() {
  // Simulation engine
  useDemoEnergySystem();

  // Simulation state via hook
  const { isAutoMode, simSpeed, setSimulationState, currentDate } = useSimulationState();

  // Store actions and config
  const updateSystemConfig = useEnergySystemStore(s => s.updateSystemConfig);
  const setActiveLocation = useEnergySystemStore(s => s.setActiveLocation);
  const activeLocation = useEnergySystemStore(s => s.activeLocation);
  const systemConfig = useEnergySystemStore(s => s.systemConfig);
  const resetSystem = useEnergySystemStore(s => s.resetSystem);

  // Live data
  const minuteData = useMinuteData('today');
  const accumulators = useAccumulators();
  const recentData = useMemo(() => minuteData.slice(-60), [minuteData]);
  const latestPoint = recentData[recentData.length - 1];

  // ── Input state ──────────────────────────────────────────────────────────────

  const [voltageClass, setVoltageClass] = useState<VoltageClass>('LV (48V)');
  const [inverterId, setInverterId] = useState('inv-deye-12k-lv-1p');
  const [batteryId, setBatteryId] = useState('bat-dyness-dl5.0');
  const [batteryModules, setBatteryModules] = useState(5);
  const [panelWatts, setPanelWatts] = useState(620);
  const [dcAcRatio, setDcAcRatio] = useState(1.3);
  const [locationName, setLocationName] = useState('Nairobi');
  const [sizingMode, setSizingMode] = useState<'direct' | 'load'>('direct');
  const [dailyKWh, setDailyKWh] = useState(80);
  const [peakKW, setPeakKW] = useState(12);
  const [backupHours, setBackupHours] = useState(4);

  // ── Derived hardware ─────────────────────────────────────────────────────────

  const filteredInverters = useMemo(
    () => INVERTER_CATALOG.filter(
      inv => inv.voltageClass === voltageClass && inv.category === 'inverter'
    ),
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

  const inverterKW = (selectedInverter?.ratingWatts ?? 12000) / 1000;
  const batteryKWh = batteryModules * (selectedBattery?.capacityKWh ?? 5.12);
  const solarKWp = +(inverterKW * dcAcRatio).toFixed(1);
  const panelCount = Math.ceil((solarKWp * 1000) / (selectedPanel?.ratingWatts ?? 620));

  // Load-based suggestion
  const suggestedInverterKW = sizingMode === 'load' ? +(peakKW * 1.25).toFixed(1) : inverterKW;
  const suggestedBatteryKWh = sizingMode === 'load' ? +(peakKW * backupHours).toFixed(1) : batteryKWh;

  // ── Sync to Zustand store ────────────────────────────────────────────────────

  // Debounce timer ref
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncToStore = useCallback(() => {
    const effInvKW = sizingMode === 'load' ? suggestedInverterKW : inverterKW;
    const effBatKWh = sizingMode === 'load' ? suggestedBatteryKWh : batteryKWh;
    const effSolarKW = +(effInvKW * dcAcRatio).toFixed(1);
    updateSystemConfig({
      inverterKW: effInvKW,
      batteryCapacityKWh: effBatKWh,
      solarCapacityKW: effSolarKW,
    });
  }, [inverterKW, batteryKWh, solarKWp, dcAcRatio, sizingMode,
      suggestedInverterKW, suggestedBatteryKWh, updateSystemConfig]);

  useEffect(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(syncToStore, 300);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [syncToStore]);

  // Location sync
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
      countyNote: `${city.region} - avg ${city.avgTempC}C, annual GHI ${city.annualGHI} kWh/m2.`,
    };
    setActiveLocation(loc);
  }, [locationName, setActiveLocation]);

  // ── Preset handler ───────────────────────────────────────────────────────────

  const applyPreset = useCallback((preset: SimPreset) => {
    setVoltageClass(preset.voltageClass);
    setInverterId(preset.inverterId);
    setBatteryId(preset.batteryId);
    setBatteryModules(preset.batteryModules);
    setPanelWatts(preset.panelWatts);
    setDcAcRatio(preset.dcAcRatio);
  }, []);

  // When voltage class changes, reset inverter to first matching
  useEffect(() => {
    const match = INVERTER_CATALOG.find(
      i => i.voltageClass === voltageClass && i.category === 'inverter'
    );
    if (match && match.id !== inverterId) setInverterId(match.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voltageClass]);

  // ── Sizing engine (financials) ───────────────────────────────────────────────

  const sizingResults = useMemo(() => {
    try {
      const inputs = buildInputs(systemConfig, activeLocation.name);
      return runSimulation(inputs);
    } catch {
      return null;
    }
  }, [systemConfig, activeLocation.name]);

  // ── Simulation controls ──────────────────────────────────────────────────────

  const handlePlay = () => setSimulationState({ isAutoMode: true });
  const handlePause = () => setSimulationState({ isAutoMode: false });
  const handleReset = () => { resetSystem(); };
  const handleSpeed = (s: number) => setSimulationState({ simSpeed: s });

  // ── Time display ─────────────────────────────────────────────────────────────

  const timeLabel = useMemo(() => {
    const d = currentDate instanceof Date ? currentDate : new Date(currentDate);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false });
  }, [currentDate]);

  // ── Financial display ────────────────────────────────────────────────────────

  const totalCapExKSh = sizingResults?.totalCapExKSh ?? 0;
  const annualSavingsKSh = Math.round((sizingResults?.annualSavingsUSD ?? 0) * KSH_PER_USD);
  const npvKSh = Math.round((sizingResults?.npvUSD ?? 0) * KSH_PER_USD);

  // BOM hardware for display
  const bomItems = sizingResults?.bomLineItems ?? [];
  const pvBom = bomItems.find(b => b.section === '1. Solar PV Modules');
  const batBom = bomItems.find(b => b.section === '2. Energy Storage' && b.itemNumber === '2');
  const invBom = bomItems.find(b => b.section === '3. Inverter & Monitoring' && b.itemNumber === '6');

  // ── Render ───────────────────────────────────────────────────────────────────

  const inputCls = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--battery)] focus:outline-none transition-colors";
  const labelCls = "block text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1";

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-card)] px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo size="sm" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">System Simulator</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/sizing"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--battery)] transition-colors"
          >
            Full Sizing Engine
          </Link>
          <ChevronRight className="h-3 w-3 text-[var(--border-strong)]" />
          <Link
            href="/demo"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--battery)] transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start">

        {/* ── LEFT: Inputs ── */}
        <aside className="w-full shrink-0 space-y-4 lg:w-[340px]">

          {/* Preset cards */}
          <div>
            <p className={labelCls}>Quick start - pick a template</p>
            <div className="grid grid-cols-5 gap-1.5">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={cn(
                    'flex flex-col items-center rounded-lg border px-1 py-2 text-center transition-all',
                    inverterId === p.inverterId
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

          {/* Configuration card */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 space-y-4">
            <p className="text-xs font-bold text-[var(--text-primary)]">System Configuration</p>

            {/* Sizing mode toggle */}
            <div>
              <p className={labelCls}>Sizing method</p>
              <div className="flex overflow-hidden rounded-lg border border-[var(--border)]">
                {(['direct', 'load'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSizingMode(m)}
                    className={cn(
                      'flex-1 py-2 text-xs font-semibold transition-colors',
                      sizingMode === m
                        ? 'bg-[var(--battery)] text-white'
                        : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    {m === 'direct' ? 'Direct kW' : 'Load-based'}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct kW inputs */}
            {sizingMode === 'direct' && (
              <div className="space-y-3">
                {/* Voltage class */}
                <div>
                  <label className={labelCls}>Voltage class</label>
                  <select
                    value={voltageClass}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setVoltageClass(e.target.value as VoltageClass)}
                    className={inputCls}
                  >
                    {VOLTAGE_CLASSES.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Inverter model */}
                <div>
                  <label className={labelCls}>
                    Inverter model
                    {selectedInverter && (
                      <span className="ml-1 font-normal normal-case text-[var(--text-muted)]">
                        - {(selectedInverter.ratingWatts! / 1000).toFixed(1)} kW AC
                      </span>
                    )}
                  </label>
                  <select
                    value={inverterId}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setInverterId(e.target.value)}
                    className={inputCls}
                  >
                    {filteredInverters.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.brand} {inv.model}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Load-based inputs */}
            {sizingMode === 'load' && (
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Daily energy use (kWh/day)</label>
                  <input
                    type="number"
                    min={5}
                    max={2000}
                    value={dailyKWh}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDailyKWh(+e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>Peak load (kW)</label>
                    <input
                      type="number"
                      min={1}
                      max={400}
                      value={peakKW}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setPeakKW(+e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Backup hours</label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={backupHours}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setBackupHours(+e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <div className="rounded-lg bg-[var(--battery-soft)] border border-[var(--battery)]/20 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-tertiary)]">Suggested inverter</span>
                    <span className="font-bold text-[var(--battery)]">{suggestedInverterKW} kW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-tertiary)]">Suggested battery</span>
                    <span className="font-bold text-[var(--battery)]">{suggestedBatteryKWh} kWh</span>
                  </div>
                </div>
              </div>
            )}

            {/* Battery */}
            <div>
              <label className={labelCls}>Battery</label>
              <select
                value={batteryId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setBatteryId(e.target.value)}
                className={cn(inputCls, 'mb-2')}
              >
                {BATTERY_OPTIONS.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.brand} {b.model} ({b.capacityKWh} kWh each)
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={batteryModules}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setBatteryModules(Math.max(1, Math.min(40, +e.target.value)))}
                  className="w-20 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--battery)] focus:outline-none"
                />
                <span className="text-xs text-[var(--text-muted)]">
                  x {selectedBattery?.capacityKWh ?? 5.12} kWh
                </span>
                <span className="text-xs text-[var(--text-muted)]">=</span>
                <span className="text-sm font-bold text-[var(--battery)]">
                  {batteryKWh.toFixed(2)} kWh
                </span>
              </div>
            </div>

            {/* Solar PV */}
            <div>
              <label className={labelCls}>Solar PV</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={cn(labelCls, 'mb-1')}>Panel wattage</label>
                  <select
                    value={panelWatts}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setPanelWatts(+e.target.value)}
                    className={inputCls}
                  >
                    {PANEL_OPTIONS.map(p => (
                      <option key={p.id} value={p.ratingWatts}>{p.ratingWatts} W</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={cn(labelCls, 'mb-1')}>DC/AC ratio</label>
                  <input
                    type="number"
                    min={1.0}
                    max={1.6}
                    step={0.05}
                    value={dcAcRatio}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDcAcRatio(+e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <p className="mt-1.5 text-[10px] text-[var(--text-muted)]">
                {solarKWp} kWp array - {panelCount} panels auto-calculated
              </p>
            </div>

            {/* Location */}
            <div>
              <label className={labelCls}>Location</label>
              <select
                value={locationName}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setLocationName(e.target.value)}
                className={inputCls}
              >
                {AFRICA_CITIES
                  .filter((c, idx, arr) => arr.findIndex(x => x.name === c.name) === idx)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(c => (
                    <option key={c.name} value={c.name}>{c.name}, {c.country}</option>
                  ))}
              </select>
            </div>
          </div>
        </aside>

        {/* ── RIGHT: Live simulation ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Play controls */}
          <div className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={isAutoMode ? handlePause : handlePlay}
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-lg transition-all',
                  isAutoMode
                    ? 'border-[var(--battery)] bg-[var(--battery)] text-white shadow-lg'
                    : 'border-[var(--border-strong)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[var(--battery)]'
                )}
                aria-label={isAutoMode ? 'Pause simulation' : 'Play simulation'}
              >
                {isAutoMode ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Reset simulation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {selectedInverter?.brand} {selectedInverter?.model} - {activeLocation.displayName} - {timeLabel}
              </p>
              <p className="mt-0.5 text-[10px] text-[var(--text-muted)] truncate">
                {solarKWp} kWp ({panelCount} x {panelWatts}W) - {batteryKWh.toFixed(1)} kWh battery - {inverterKW} kW inverter
              </p>
            </div>

            <div className="shrink-0">
              <p className={cn(labelCls, 'mb-1')}>Speed</p>
              <div className="flex gap-1">
                {SPEED_OPTIONS.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSpeed(s)}
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
          </div>

          {/* KPI chips */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            <KpiChip
              label="Solar"
              value={(latestPoint?.solarKW ?? 0).toFixed(1)}
              unit="kW"
              color="text-[var(--solar)]"
            />
            <KpiChip
              label="Load"
              value={(latestPoint?.homeLoadKW ?? 0).toFixed(1)}
              unit="kW"
              color="text-[var(--consumption)]"
            />
            <KpiChip
              label="Battery"
              value={Math.round(latestPoint?.batteryLevelPct ?? 0).toString()}
              unit="%"
              color="text-[var(--battery)]"
            />
            <KpiChip
              label="Grid Import"
              value={(Math.max(0, latestPoint?.gridImportKW ?? 0)).toFixed(1)}
              unit="kW"
              color="text-[var(--grid)]"
            />
            <KpiChip
              label="Saved Today"
              value={Math.round(accumulators.savings).toLocaleString()}
              unit="KSh"
              color="text-[var(--battery)]"
            />
            <KpiChip
              label="Solar Today"
              value={accumulators.solar.toFixed(1)}
              unit="kWh"
              color="text-[var(--solar)]"
            />
          </div>

          {/* Rolling chart */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--text-primary)]">Live energy flow - last 60 minutes</p>
              <div className="flex items-center gap-4">
                {[
                  { label: 'Solar', color: 'var(--solar)' },
                  { label: 'Load', color: 'var(--consumption)' },
                  { label: 'Grid', color: 'var(--grid)' },
                  { label: 'Battery %', color: 'var(--battery)' },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                    <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
            <RollingChart data={recentData.map(d => ({
              solarKW: d.solarKW,
              homeLoadKW: d.homeLoadKW,
              gridImportKW: d.gridImportKW,
              batteryLevelPct: d.batteryLevelPct,
            }))} />
          </div>

          {/* Hardware summary */}
          <div>
            <p className={cn(labelCls, 'mb-2')}>Your system hardware</p>
            <div className="grid grid-cols-3 gap-3">
              <HwCard
                type="Solar PV"
                model={pvBom?.description ?? `Jinko ${panelWatts}W TopCon`}
                detail={`${panelCount} panels - ${solarKWp} kWp`}
                priceKSh={pvBom ? Math.round(pvBom.totalKSh) : Math.round(panelCount * (selectedPanel?.costKSh ?? 11900))}
              />
              <HwCard
                type="Battery"
                model={batBom?.description ?? `${selectedBattery?.brand} ${selectedBattery?.model}`}
                detail={`${batteryModules} modules - ${batteryKWh.toFixed(1)} kWh`}
                priceKSh={batBom ? Math.round(batBom.totalKSh) : Math.round(batteryModules * (selectedBattery?.costKSh ?? 115264))}
              />
              <HwCard
                type="Inverter"
                model={invBom?.description ?? `${selectedInverter?.brand} ${selectedInverter?.model}`}
                detail={`${inverterKW} kW AC - ${voltageClass}`}
                priceKSh={invBom ? Math.round(invBom.totalKSh) : Math.round(selectedInverter?.costKSh ?? 235000)}
              />
            </div>
          </div>

          {/* Financial summary */}
          <div>
            <p className={cn(labelCls, 'mb-2')}>Project economics</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Total CapEx',
                  value: totalCapExKSh > 0
                    ? `KSh ${(totalCapExKSh / 1_000_000).toFixed(2)}M`
                    : 'Calculating...',
                },
                {
                  label: 'Annual Savings',
                  value: annualSavingsKSh > 0
                    ? `KSh ${annualSavingsKSh.toLocaleString()}`
                    : '--',
                },
                {
                  label: '25-yr NPV',
                  value: npvKSh !== 0
                    ? `KSh ${npvKSh > 0 ? '+' : ''}${(npvKSh / 1_000_000).toFixed(2)}M`
                    : '--',
                },
              ].map(f => (
                <div
                  key={f.label}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4"
                >
                  <p className="text-base font-black text-[var(--text-primary)]">{f.value}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                    {f.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
