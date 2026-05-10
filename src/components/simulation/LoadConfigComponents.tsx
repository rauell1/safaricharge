/**
 * SafariCharge – Load Configuration UI Components
 *
 * React components for managing dynamic load configurations including
 * adding, editing, and removing loads from the system.
 */

'use client';

import React, { useState } from 'react';
import { useEnergySystemStore } from '@/stores/energySystemStore';
import {
  Plus, Trash2, Edit, Save, Home, Car, Building2, Wind, Zap, ChevronDown, ChevronUp, AlertTriangle, Info, Settings2,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type {
  SystemConfiguration,
  LoadConfig,
  EVLoadConfig,
  HomeLoadConfig,
  CommercialLoadConfig,
  HVACLoadConfig,
  CustomLoadConfig,
} from '@/lib/system-config';
import { createLoadTemplate, validateSystemConfig } from '@/lib/system-config';
import {
  BATTERY_MODULE_CATALOG,
  resolveBatteryBankConfig,
} from '@/lib/catalog-physics-bridge';
import { buildInstalledComponentSummaries } from '@/lib/installed-components';
import {
  computeDaysOfAutonomy,
  computeNetMeteringCreditKesPerMonth,
  computeOffGridPvRecommendation,
  DEFAULT_BATTERY_DOD_PCT,
  DEFAULT_GENERATOR_THRESHOLD_PCT,
  SYSTEM_MODE_LABELS,
} from '@/lib/system-mode-metrics';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const EV_CHARGER_PRESETS = [
  { id: 'ac7',   label: '7.4 kW AC — Level 2 Home',       maxKw: 7.4,  connectionType: 'AC' as const },
  { id: 'ac22',  label: '22 kW AC — Three-Phase Type 2',   maxKw: 22,   connectionType: 'AC' as const },
  { id: 'dc50',  label: '50 kW DC — Fast Charge CCS2',     maxKw: 50,   connectionType: 'DC' as const },
  { id: 'dc120', label: '120 kW DC — Ultra-Fast CCS2',     maxKw: 120,  connectionType: 'DC' as const },
  { id: 'dc150', label: '150 kW DC — HPC (High Power)',    maxKw: 150,  connectionType: 'DC' as const },
  { id: 'dc350', label: '350 kW DC — Hypercharger',        maxKw: 350,  connectionType: 'DC' as const },
];

const INVERTER_PRESETS_CONFIG = [
  { id: 'deye-sun-sg04lp1-3-6k', label: 'Deye SUN SG04LP1 (single phase)', kw: 6, phase: 'single' as const, voltage: 'low' as const, maxEfficiency: 0.976 },
  { id: 'deye-sun-sg05lp3-3-12k', label: 'Deye SUN SG05LP3 (three phase)', kw: 12, phase: 'three' as const, voltage: 'high' as const, maxEfficiency: 0.976 },
  { id: 'sungrow-sh5rs', label: 'Sungrow SH5.0RS', kw: 5, phase: 'single' as const, voltage: 'low' as const, maxEfficiency: 0.977 },
  { id: 'sungrow-sh8rs', label: 'Sungrow SH8.0RS', kw: 8, phase: 'single' as const, voltage: 'low' as const, maxEfficiency: 0.977 },
  { id: 'sungrow-sh10rt', label: 'Sungrow SH10RT', kw: 10, phase: 'three' as const, voltage: 'high' as const, maxEfficiency: 0.984 },
  { id: 'sma-sunny-boy-storage', label: 'SMA Sunny Boy Storage', kw: 6, phase: 'single' as const, voltage: 'high' as const, maxEfficiency: 0.975 },
  { id: 'fronius-symo-gen24', label: 'Fronius Symo GEN24 Plus', kw: 10, phase: 'three' as const, voltage: 'high' as const, maxEfficiency: 0.982 },
];

function InverterConfigSection({
  config,
  onConfigChange,
}: {
  config: SystemConfiguration;
  onConfigChange: (next: SystemConfiguration) => void;
}) {
  const presetId = config.installedInverterId ?? INVERTER_PRESETS_CONFIG[0].id;
  const selected = INVERTER_PRESETS_CONFIG.find((p) => p.id === presetId) ?? INVERTER_PRESETS_CONFIG[0];

  const handlePresetChange = (id: string) => {
    const preset = INVERTER_PRESETS_CONFIG.find((p) => p.id === id);
    if (!preset) return;
    onConfigChange({
      ...config,
      installedInverterId: preset.id,
      inverter: {
        ...config.inverter,
        capacityKw: preset.kw,
        phase: preset.phase,
        voltage: preset.voltage,
        maxEfficiency: preset.maxEfficiency,
      },
    });
  };

  const handleKwChange = (kw: number) => {
    onConfigChange({
      ...config,
      inverter: {
        ...config.inverter,
        capacityKw: Math.max(1, kw),
      },
    });
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-hover)] p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-[var(--solar-soft)] border border-[var(--solar)]/20 flex items-center justify-center shrink-0">
          <Settings2 size={18} className="text-[var(--solar)]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Inverter Configuration</h3>
          <p className="text-xs text-[var(--text-tertiary)]">Select make/model, capacity per unit, and units in parallel</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[var(--text-secondary)]">Make / Model</Label>
          <Select value={selected.id} onValueChange={handlePresetChange}>
            <SelectTrigger style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {INVERTER_PRESETS_CONFIG.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[var(--text-secondary)]">Rated kW</Label>
          <Input
            type="number" min={1} max={200} step={0.5} value={config.inverter.capacityKw}
            onChange={e => handleKwChange(Number(e.target.value || 1))}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[var(--text-secondary)]">Phase</Label>
          <div className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 flex items-center text-sm text-[var(--text-primary)]">
            {config.inverter.phase === 'three' ? 'Three-phase' : 'Single-phase'}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-[var(--border)]">
        <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
          <Zap size={12} className="text-[var(--solar)]" />
          Inverter capacity:
          <strong className="text-[var(--text-primary)] ml-1">{config.inverter.capacityKw.toFixed(1)} kW</strong>
        </span>
        <span className="text-xs text-[var(--text-tertiary)]">{config.inverter.voltage === 'high' ? 'High voltage' : 'Low voltage'}</span>
        <Badge variant="outline" className="ml-auto text-[10px] border-[var(--solar)] text-[var(--solar)]">
          ηmax {(config.inverter.maxEfficiency ?? selected.maxEfficiency ?? 0.97).toFixed(3)}
        </Badge>
      </div>
    </div>
  );
}

function BatteryBankConfigSection({
  config,
  onConfigChange,
}: {
  config: SystemConfiguration;
  onConfigChange: (next: SystemConfiguration) => void;
}) {
  const [sizeMode, setSizeMode] = useState<'modules' | 'kwh'>('modules');
  const selectedSpec =
    BATTERY_MODULE_CATALOG.find((s) => s.catalogId === config.installedBatteryId || s.id === config.installedBatteryId)
    ?? BATTERY_MODULE_CATALOG[0];
  const currentModules = config.battery.bankModules ?? selectedSpec.minModules;
  const validation = validateSystemConfig(config);
  const cRateWarnings = validation.warnings.filter((w) => /Battery charge rate|Battery discharge rate/.test(w));

  const applySpec = (specId: string) => {
    const spec = BATTERY_MODULE_CATALOG.find((s) => s.id === specId);
    if (!spec) return;
    const resolved = resolveBatteryBankConfig(spec, Math.max(spec.minModules, config.battery.bankModules ?? spec.minModules));
    onConfigChange({
      ...config,
      installedBatteryId: spec.catalogId,
      battery: { ...config.battery, ...resolved },
    });
  };

  const handleModulesChange = (modules: number) => {
    const resolved = resolveBatteryBankConfig(selectedSpec, modules);
    onConfigChange({
      ...config,
      installedBatteryId: selectedSpec.catalogId,
      battery: { ...config.battery, ...resolved },
    });
  };

  const handleKwhChange = (kwh: number) => {
    const modules = Math.round(Math.max(0.1, kwh) / selectedSpec.usableKwh);
    handleModulesChange(modules);
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-hover)] p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Battery Bank Configuration</h3>
          <p className="text-xs text-[var(--text-tertiary)]">Catalog model + modules/kWh sizing (single source of truth)</p>
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => setSizeMode('modules')} className={`px-2 py-1 rounded text-xs border ${sizeMode === 'modules' ? 'bg-[var(--battery)] text-white border-[var(--battery)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>Modules</button>
          <button type="button" onClick={() => setSizeMode('kwh')} className={`px-2 py-1 rounded text-xs border ${sizeMode === 'kwh' ? 'bg-[var(--battery)] text-white border-[var(--battery)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>kWh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[var(--text-secondary)]">Brand / Model</Label>
          <Select value={selectedSpec.id} onValueChange={applySpec}>
            <SelectTrigger style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {BATTERY_MODULE_CATALOG.map((spec) => (
                <SelectItem key={spec.id} value={spec.id}>{spec.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[var(--text-secondary)]">{sizeMode === 'modules' ? 'Modules' : 'Total kWh'}</Label>
          <Input
            type="number"
            min={sizeMode === 'modules' ? selectedSpec.minModules : 0.1}
            max={sizeMode === 'modules' ? selectedSpec.maxModules : 1000}
            step={sizeMode === 'modules' ? 1 : 0.1}
            value={sizeMode === 'modules' ? currentModules : config.battery.capacityKwh}
            onChange={(e) => sizeMode === 'modules'
              ? handleModulesChange(Number(e.target.value || selectedSpec.minModules))
              : handleKwhChange(Number(e.target.value || config.battery.capacityKwh))}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[var(--text-secondary)]">Chemistry</Label>
          <div className="h-9 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 flex items-center text-sm text-[var(--text-primary)] uppercase">
            {config.battery.chemistry}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2">Capacity: <strong>{config.battery.capacityKwh.toFixed(1)} kWh</strong></div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2">Max charge: <strong>{config.battery.maxChargeKw.toFixed(1)} kW</strong></div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2">Max discharge: <strong>{config.battery.maxDischargeKw.toFixed(1)} kW</strong></div>
      </div>

      {cRateWarnings.length > 0 && (
        <div className="space-y-1">
          {cRateWarnings.map((warning) => (
            <div key={warning} className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">{warning}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function EVChargerConfigSection() {
  const saveToStorage = (presetId: string, count: number) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sc_ev_charger_config', JSON.stringify({ presetId, count }));
  };
  const loadFromStorage = () => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('sc_ev_charger_config') : null;
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const saved = loadFromStorage();
  const [presetId, setPresetId] = useState<string>(saved?.presetId ?? 'ac22');
  const [count, setCount] = useState<number>(saved?.count ?? 2);
  const selectedPreset = EV_CHARGER_PRESETS.find(p => p.id === presetId) ?? EV_CHARGER_PRESETS[1];

  const handlePresetChange = (v: string) => { setPresetId(v); saveToStorage(v, count); };
  const handleCountChange = (n: number) => { setCount(n); saveToStorage(presetId, n); };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-hover)] p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-[var(--ev-soft)] border border-[var(--ev)]/20 flex items-center justify-center shrink-0">
          <Car size={18} className="text-[var(--ev)]" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">EV Charger Configuration</h3>
          <p className="text-xs text-[var(--text-tertiary)]">Choose charger type and number of charging points</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[var(--text-secondary)]">Charger Type</Label>
          <Select value={presetId} onValueChange={handlePresetChange}>
            <SelectTrigger style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EV_CHARGER_PRESETS.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-[var(--text-secondary)]">Number of chargers (1–5)</Label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => handleCountChange(n)}
                className={[
                  'h-9 flex-1 rounded-lg text-sm font-bold border transition-all',
                  count === n
                    ? 'bg-[var(--ev)] border-[var(--ev)] text-white shadow-sm'
                    : 'bg-[var(--bg-card-muted)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--ev)] hover:text-[var(--ev)]',
                ].join(' ')}
              >{n}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[var(--border)]">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          Connection: <strong className="text-[var(--text-primary)]">{selectedPreset.connectionType}</strong>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          Per charger: <strong className="text-[var(--text-primary)]">{selectedPreset.maxKw} kW</strong>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          Total: <strong className="text-[var(--text-primary)]">{selectedPreset.maxKw * count} kW</strong>
        </div>
      </div>
    </div>
  );
}

interface LoadListProps {
  config: SystemConfiguration;
  onConfigChange: (config: SystemConfiguration) => void;
}

function clampPercentage(value: string, defaultValue: number): number {
  return Math.max(1, Math.min(100, Number(value) || defaultValue));
}
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export function LoadList({ config, onConfigChange }: LoadListProps) {
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);
  const [isAddingLoad, setIsAddingLoad] = useState(false);
  const performanceRatio = clamp(config.performanceRatio ?? 0.8, 0.65, 0.95);
  const shadingLossPct = clamp(config.shadingLossPct ?? 0, 0, 50);

  const handlePerformanceRatioChange = (value: number) => {
    onConfigChange({
      ...config,
      performanceRatio: clamp(value, 0.65, 0.95),
      shadingLossPct,
    });
  };

  const handleShadingLossChange = (value: number) => {
    onConfigChange({
      ...config,
      performanceRatio,
      shadingLossPct: clamp(value, 0, 50),
    });
  };

  const handleAddLoad = (type: LoadConfig['type']) => {
    const newLoad = createLoadTemplate(type, config.loads);
    onConfigChange({ ...config, loads: [...config.loads, newLoad] });
    setIsAddingLoad(false);
    setEditingLoadId(newLoad.id);
  };

  const handleRemoveLoad = (id: string) => {
    onConfigChange({ ...config, loads: config.loads.filter(l => l.id !== id) });
  };

  const handleToggleEnabled = (id: string) => {
    onConfigChange({ ...config, loads: config.loads.map(l => l.id === id ? { ...l, enabled: !l.enabled } : l) });
  };

  const handleUpdateLoad = (updatedLoad: LoadConfig) => {
    onConfigChange({ ...config, loads: config.loads.map(l => l.id === updatedLoad.id ? updatedLoad : l) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-[var(--battery-soft)] border border-[var(--battery)]/20 flex items-center justify-center shrink-0">
          <Zap size={16} className="text-[var(--battery)]" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">System Loads</h3>
          <p className="text-xs text-[var(--text-tertiary)]">Configure connected loads and consumption profiles</p>
        </div>
        <button
          onClick={() => setIsAddingLoad(!isAddingLoad)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rounded-full transition-all hover:opacity-90"
          style={{ background: 'var(--battery)' }}
        >
          <Plus className="w-3 h-3" />Add Load
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-hover)] p-4 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">PV Performance Derates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]">
              Performance Ratio
              <Info
                className="w-3.5 h-3.5 text-[var(--text-tertiary)]"
                title="Real-world PV derate for inverter, wiring, mismatch and temperature losses. Typical Kenya rooftop systems run around 75–90%."
              />
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0.65}
                max={0.95}
                step={0.01}
                value={performanceRatio}
                onChange={(e) => handlePerformanceRatioChange(parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min={0.65}
                max={0.95}
                step={0.01}
                value={performanceRatio}
                onChange={(e) => handlePerformanceRatioChange(parseFloat(e.target.value) || 0.8)}
                className="w-20 px-2 py-1 text-sm rounded"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)]">
              Shading Loss (%)
              <Info
                className="w-3.5 h-3.5 text-[var(--text-tertiary)]"
                title="Extra partial-shading loss. In Kenya urban rooftops, antennae, trees or nearby buildings can shade small panel areas and sharply reduce output (sometimes >80% on affected modules)."
              />
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={shadingLossPct}
                onChange={(e) => handleShadingLossChange(parseFloat(e.target.value))}
                className="flex-1"
              />
              <input
                type="number"
                min={0}
                max={50}
                step={1}
                value={shadingLossPct}
                onChange={(e) => handleShadingLossChange(parseFloat(e.target.value) || 0)}
                className="w-20 px-2 py-1 text-sm rounded"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
        </div>
      </div>

      {isAddingLoad && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-tertiary)]">Select Load Type:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(['home', 'ev', 'commercial', 'hvac', 'custom'] as const).map(type => (
              <button key={type} onClick={() => handleAddLoad(type)} className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border)] rounded-xl transition-colors">
                {getLoadIcon(type)}{getLoadTypeName(type)}
              </button>
            ))}
          </div>
          <button onClick={() => setIsAddingLoad(false)} className="w-full px-3 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
        </div>
      )}

      <div className="space-y-2">
        {config.loads.map(load => (
          <LoadCard key={load.id} load={load} isEditing={editingLoadId === load.id}
            onEdit={() => setEditingLoadId(load.id)} onSave={() => setEditingLoadId(null)}
            onRemove={() => handleRemoveLoad(load.id)} onToggleEnabled={() => handleToggleEnabled(load.id)}
            onUpdate={handleUpdateLoad} />
        ))}
      </div>

      {config.loads.length === 0 && (
        <div className="p-6 text-center text-sm text-[var(--text-tertiary)] border border-dashed border-[var(--border)] rounded-xl">No loads configured. Add a load to begin.</div>
      )}
    </div>
  );
}

interface LoadCardProps {
  load: LoadConfig;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onRemove: () => void;
  onToggleEnabled: () => void;
  onUpdate: (load: LoadConfig) => void;
}

function LoadCard({ load, isEditing, onEdit, onSave, onRemove, onToggleEnabled, onUpdate }: LoadCardProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`p-3 border rounded-xl transition-all ${load.enabled ? 'bg-[var(--bg-card)] border-[var(--border)]' : 'bg-[var(--bg-card-muted)] border-[var(--border)] opacity-60'}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1">
          {getLoadIcon(load.type)}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <input type="text" value={load.name} onChange={e => onUpdate({ ...load, name: e.target.value })} className="w-full sm:w-auto px-2 py-1 text-sm font-medium rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              ) : (
                <h4 className="text-sm font-medium text-[var(--text-primary)]">{load.name}</h4>
              )}
              <span className="text-xs px-2 py-0.5 bg-[var(--grid-soft)] text-[var(--grid)] rounded-full font-semibold">{getLoadTypeName(load.type)}</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{getLoadSummary(load)}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-1 flex-wrap">
          <button onClick={onToggleEnabled} className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${load.enabled ? 'text-[var(--battery)] bg-[var(--battery-soft)]' : 'text-[var(--text-tertiary)] bg-[var(--bg-card-muted)]'}`}>
            {load.enabled ? 'ON' : 'OFF'}
          </button>
          {isEditing ? (
            <button onClick={onSave} className="p-1 text-[var(--battery)] hover:bg-[var(--battery-soft)] rounded transition-colors" title="Save"><Save className="w-4 h-4" /></button>
          ) : (
            <button onClick={onEdit} className="p-1 text-[var(--grid)] hover:bg-[var(--grid-soft)] rounded transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
          )}
          <button onClick={() => setExpanded(!expanded)} className="p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] rounded transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onRemove} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors" title="Remove"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      {expanded && isEditing && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]"><LoadEditor load={load} onUpdate={onUpdate} /></div>
      )}
    </div>
  );
}

function LoadEditor({ load, onUpdate }: { load: LoadConfig; onUpdate: (load: LoadConfig) => void }) {
  if (load.type === 'ev') return <EVLoadEditor load={load} onUpdate={onUpdate} />;
  if (load.type === 'home') return <HomeLoadEditor load={load} onUpdate={onUpdate} />;
  if (load.type === 'commercial') return <CommercialLoadEditor load={load} onUpdate={onUpdate} />;
  if (load.type === 'hvac') return <HVACLoadEditor load={load} onUpdate={onUpdate} />;
  return <CustomLoadEditor load={load} onUpdate={onUpdate} />;
}

function EVLoadEditor({ load, onUpdate }: { load: EVLoadConfig; onUpdate: (load: LoadConfig) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Battery Capacity (kWh)</label>
          <input type="number" value={load.batteryKwh} onChange={e => onUpdate({ ...load, batteryKwh: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} min="0" step="1" /></div>
        <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Onboard Charger (kW)</label>
          <input type="number" value={load.onboardChargerKw} onChange={e => onUpdate({ ...load, onboardChargerKw: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} min="0" step="0.1" /></div>
        <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Depart Time (hour)</label>
          <input type="number" value={load.departTime} onChange={e => onUpdate({ ...load, departTime: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} min="0" max="24" step="0.5" /></div>
        <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Return Time (hour)</label>
          <input type="number" value={load.returnTime} onChange={e => onUpdate({ ...load, returnTime: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} min="0" max="24" step="0.5" /></div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id={`v2g-${load.id}`} checked={load.supportsV2G} onChange={e => onUpdate({ ...load, supportsV2G: e.target.checked })} className="w-4 h-4" />
        <label htmlFor={`v2g-${load.id}`} className="text-xs font-medium text-[var(--text-secondary)]">Supports V2G (Vehicle-to-Grid)</label>
      </div>
    </div>
  );
}

function HomeLoadEditor({ load, onUpdate }: { load: HomeLoadConfig; onUpdate: (load: LoadConfig) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Weekend Multiplier</label>
          <input type="number" value={load.weekendMultiplier} onChange={e => onUpdate({ ...load, weekendMultiplier: parseFloat(e.target.value) || 1 })} className="w-full px-2 py-1 text-sm rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} min="0" max="2" step="0.1" /></div>
        <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">HVAC Base (kW)</label>
          <input type="number" value={load.hvacBaseKw} onChange={e => onUpdate({ ...load, hvacBaseKw: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} min="0" step="0.5" disabled={!load.includeHVAC} /></div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id={`hvac-${load.id}`} checked={load.includeHVAC} onChange={e => onUpdate({ ...load, includeHVAC: e.target.checked })} className="w-4 h-4" />
        <label htmlFor={`hvac-${load.id}`} className="text-xs font-medium text-[var(--text-secondary)]">Include Weather-Dependent HVAC</label>
      </div>
    </div>
  );
}

function CommercialLoadEditor({ load, onUpdate }: { load: CommercialLoadConfig; onUpdate: (load: LoadConfig) => void }) {
  return (
    <div className="space-y-3">
      <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Constant Load (kW)</label>
        <input type="number" value={load.constantKw} onChange={e => onUpdate({ ...load, constantKw: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} min="0" step="0.5" /></div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id={`weekends-${load.id}`} checked={load.operatesWeekends} onChange={e => onUpdate({ ...load, operatesWeekends: e.target.checked })} className="w-4 h-4" />
        <label htmlFor={`weekends-${load.id}`} className="text-xs font-medium text-[var(--text-secondary)]">Operates on Weekends</label>
      </div>
    </div>
  );
}

function HVACLoadEditor({ load, onUpdate }: { load: HVACLoadConfig; onUpdate: (load: LoadConfig) => void }) {
  return (
    <div className="space-y-3">
      <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Capacity (kW)</label>
        <input type="number" value={load.capacityKw} onChange={e => onUpdate({ ...load, capacityKw: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} min="0" step="0.5" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Operating Start (hour)</label>
          <input type="number" value={load.operatingHours.start} onChange={e => onUpdate({ ...load, operatingHours: { ...load.operatingHours, start: parseFloat(e.target.value) || 0 } })} className="w-full px-2 py-1 text-sm rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} min="0" max="24" /></div>
        <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Operating End (hour)</label>
          <input type="number" value={load.operatingHours.end} onChange={e => onUpdate({ ...load, operatingHours: { ...load.operatingHours, end: parseFloat(e.target.value) || 0 } })} className="w-full px-2 py-1 text-sm rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} min="0" max="24" /></div>
      </div>
    </div>
  );
}

function CustomLoadEditor({ load, onUpdate }: { load: CustomLoadConfig; onUpdate: (load: LoadConfig) => void }) {
  return (
    <div className="space-y-3">
      <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Mode</label>
        <select value={load.mode} onChange={e => onUpdate({ ...load, mode: e.target.value as 'constant' | 'profile' })} className="w-full px-2 py-1 text-sm rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          <option value="constant">Constant</option>
          <option value="profile">Hourly Profile</option>
        </select>
      </div>
      {load.mode === 'constant' && (
        <div><label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Constant Load (kW)</label>
          <input type="number" value={load.constantKw || 0} onChange={e => onUpdate({ ...load, constantKw: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm rounded" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} min="0" step="0.5" /></div>
      )}
    </div>
  );
}

function getLoadIcon(type: LoadConfig['type']) {
  const iconClass = 'w-4 h-4';
  switch (type) {
    case 'home': return <Home className={iconClass} />;
    case 'ev': return <Car className={iconClass} />;
    case 'commercial': return <Building2 className={iconClass} />;
    case 'hvac': return <Wind className={iconClass} />;
    case 'custom': return <Zap className={iconClass} />;
  }
}

function getLoadTypeName(type: LoadConfig['type']): string {
  switch (type) {
    case 'home': return 'Home';
    case 'ev': return 'EV';
    case 'commercial': return 'Commercial';
    case 'hvac': return 'HVAC';
    case 'custom': return 'Custom';
  }
}

function getLoadSummary(load: LoadConfig): string {
  if (load.type === 'ev') return `${load.batteryKwh} kWh battery, ${load.onboardChargerKw} kW charger`;
  if (load.type === 'home') { const avg = load.hourlyProfile.reduce((a, b) => a + b, 0) / 24; return `Avg ${avg.toFixed(1)} kW, HVAC ${load.includeHVAC ? 'ON' : 'OFF'}`; }
  if (load.type === 'commercial') return `${load.constantKw} kW, ${load.schedule.length} schedule(s)`;
  if (load.type === 'hvac') return `${load.capacityKw} kW capacity`;
  return load.mode === 'constant' ? `${load.constantKw || 0} kW constant` : 'Hourly profile';
}

export function LoadConfigComponents() {
  const fullSystemConfig = useEnergySystemStore((s) => s.fullSystemConfig);
  const updateFullSystemConfig = useEnergySystemStore((s) => s.updateFullSystemConfig);
  const updateNode = useEnergySystemStore((s) => s.updateNode);
  const minuteData = useEnergySystemStore((s) => s.minuteData);
  const modeConfig = useEnergySystemStore((s) => s.systemConfig);
  const updateSystemConfig = useEnergySystemStore((s) => s.updateSystemConfig);

  const dayPoints = minuteData.slice(-420);
  const dailyLoadKwh = dayPoints.reduce((sum, d) => sum + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh, 0);
  const dailyExportKwh = dayPoints.reduce((sum, d) => sum + d.gridExportKWh, 0);
  const autonomyDays = computeDaysOfAutonomy(
    modeConfig.batteryCapacityKWh,
    modeConfig.batteryDodPct,
    dailyLoadKwh
  );
  const netMeteringCreditKes = computeNetMeteringCreditKesPerMonth(dailyExportKwh);
  const offGridPvKw = computeOffGridPvRecommendation(modeConfig.solarCapacityKW);
  const installedComponents = buildInstalledComponentSummaries(fullSystemConfig);

  const applyFullConfig = (next: SystemConfiguration) => {
    updateFullSystemConfig(next);
    updateSystemConfig({
      solarCapacityKW: next.solar.totalCapacityKw,
      inverterKW: next.inverter.capacityKw,
      batteryCapacityKWh: next.battery.capacityKwh,
    });
    updateNode('solar', { capacityKW: next.solar.totalCapacityKw });
    updateNode('battery', { capacityKWh: next.battery.capacityKwh });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-hover)] p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-[var(--text-primary)]">System Mode</span>
          {(['on-grid', 'off-grid', 'hybrid'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => updateSystemConfig({ systemMode: mode })}
              className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                modeConfig.systemMode === mode
                  ? 'bg-[var(--battery)] text-white border-[var(--battery)] shadow-sm'
                  : 'bg-[var(--bg-card-muted)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--battery)] hover:text-[var(--battery)]'
              }`}
            >
              {SYSTEM_MODE_LABELS[mode]}
            </button>
          ))}
        </div>

        {modeConfig.systemMode === 'off-grid' && (
          <div className="space-y-3">
            {modeConfig.batteryCapacityKWh <= 0 && (
              <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <span>Battery bank is mandatory in Off-Grid mode. Set battery capacity above 0 kWh.</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Battery DoD (%)
                <Input
                  type="number"
                  className="mt-1 w-full"
                  min="1"
                  max="100"
                  value={modeConfig.batteryDodPct}
                  onChange={(e) => updateSystemConfig({ batteryDodPct: clampPercentage(e.target.value, DEFAULT_BATTERY_DOD_PCT) })}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </label>
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Generator threshold (% SOC)
                <Input
                  type="number"
                  className="mt-1 w-full"
                  min="1"
                  max="100"
                  value={modeConfig.generatorThresholdPct}
                  onChange={(e) => updateSystemConfig({ generatorThresholdPct: clampPercentage(e.target.value, DEFAULT_GENERATOR_THRESHOLD_PCT) })}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </label>
            </div>
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Recommended off-grid PV size: <strong>{offGridPvKw.toFixed(1)} kW</strong> (25% above on-grid equivalent).
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              Days of autonomy: <strong>{autonomyDays.toFixed(2)} days</strong>
            </div>
          </div>
        )}

        {modeConfig.systemMode === 'on-grid' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2">
                Grid export: <strong>{dailyExportKwh.toFixed(2)} kWh/day</strong>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2">
                Net-metering credit: <strong>KES {Math.round(netMeteringCreditKes).toLocaleString()}/month</strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="grid-outage-toggle"
                type="checkbox"
                checked={modeConfig.gridOutageEnabled}
                onChange={(e) => updateSystemConfig({ gridOutageEnabled: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="grid-outage-toggle" className="text-xs font-medium text-[var(--text-secondary)]">
                Simulate grid outage (anti-islanding)
              </label>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[260px] text-xs">
                    Kenya 2024 Net-Metering Regulations (EPRA): anti-islanding requires grid-tied systems to stop export during outages.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )}

        {modeConfig.systemMode === 'hybrid' && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-3 py-2 text-xs text-[var(--text-secondary)]">
            Hybrid mode active: battery storage and grid import/export are both enabled.
          </div>
        )}
      </div>

      <InverterConfigSection config={fullSystemConfig} onConfigChange={applyFullConfig} />
      <BatteryBankConfigSection config={fullSystemConfig} onConfigChange={applyFullConfig} />
      <EVChargerConfigSection />
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-hover)] p-4 space-y-3">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Installed Components</h3>
        <div className="space-y-2">
          {installedComponents.map((component) => (
            <div key={component.role} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[var(--text-primary)]">{component.brand} {component.model}</span>
                <span className="text-[var(--text-tertiary)] uppercase">{component.role}</span>
              </div>
              <div className="mt-1 text-[var(--text-secondary)]">
                {component.role === 'module' && `${component.sizing.capacityKw?.toFixed(1)} kWp (${component.sizing.panelCount} × ${component.sizing.panelWattage} W)`}
                {component.role === 'inverter' && `${component.sizing.capacityKw?.toFixed(1)} kW AC`}
                {component.role === 'battery' && `${component.sizing.capacityKwh?.toFixed(1)} kWh • ${component.sizing.maxChargeKw?.toFixed(1)} / ${component.sizing.maxDischargeKw?.toFixed(1)} kW`}
              </div>
              <div className="mt-1 flex gap-3">
                {component.datasheetUrl && <a href={component.datasheetUrl} target="_blank" rel="noreferrer" className="text-[var(--battery)] hover:underline">Datasheet</a>}
                {component.manualUrl && <a href={component.manualUrl} target="_blank" rel="noreferrer" className="text-[var(--grid)] hover:underline">Manual</a>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <LoadList config={fullSystemConfig} onConfigChange={updateFullSystemConfig} />
    </div>
  );
}
