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
  Plus, Trash2, Edit, Save, Home, Car, Building2, Wind, Zap, ChevronDown, ChevronUp, AlertTriangle, Info
} from 'lucide-react';
import type {
  SystemConfiguration,
  LoadConfig,
  EVLoadConfig,
  HomeLoadConfig,
  CommercialLoadConfig,
  HVACLoadConfig,
  CustomLoadConfig,
} from '@/lib/system-config';
import { createLoadTemplate } from '@/lib/system-config';
import {
  computeDaysOfAutonomy,
  computeNetMeteringCreditKesPerMonth,
  computeOffGridPvRecommendation,
  DEFAULT_BATTERY_DOD_PCT,
  DEFAULT_GENERATOR_THRESHOLD_PCT,
  SYSTEM_MODE_LABELS,
} from '@/lib/system-mode-metrics';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">System Loads</h3>
        <button onClick={() => setIsAddingLoad(!isAddingLoad)} className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors">
          <Plus className="w-3 h-3" />Add Load
        </button>
      </div>

      <div className="p-3 bg-gray-50 border border-gray-200 rounded space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">PV Performance Derates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-700">
              Performance Ratio
              <Info
                className="w-3.5 h-3.5 text-gray-500"
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
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-1 text-xs font-medium text-gray-700">
              Shading Loss (%)
              <Info
                className="w-3.5 h-3.5 text-gray-500"
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
                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded"
              />
            </div>
          </div>
        </div>
      </div>

      {isAddingLoad && (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded space-y-2">
          <p className="text-xs font-medium text-gray-700">Select Load Type:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(['home', 'ev', 'commercial', 'hvac', 'custom'] as const).map(type => (
              <button key={type} onClick={() => handleAddLoad(type)} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded transition-colors">
                {getLoadIcon(type)}{getLoadTypeName(type)}
              </button>
            ))}
          </div>
          <button onClick={() => setIsAddingLoad(false)} className="w-full px-3 py-1 text-xs text-gray-600 hover:text-gray-800">Cancel</button>
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
        <div className="p-6 text-center text-sm text-gray-500 border border-dashed border-gray-300 rounded">No loads configured. Add a load to begin.</div>
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
    <div className={`p-3 border rounded transition-all ${load.enabled ? 'bg-white border-gray-300' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1">
          {getLoadIcon(load.type)}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <input type="text" value={load.name} onChange={e => onUpdate({ ...load, name: e.target.value })} className="w-full sm:w-auto px-2 py-1 text-sm font-medium border border-gray-300 rounded" />
              ) : (
                <h4 className="text-sm font-medium text-gray-800">{load.name}</h4>
              )}
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{getLoadTypeName(load.type)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{getLoadSummary(load)}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-1 flex-wrap">
          <button onClick={onToggleEnabled} className={`px-2 py-1 text-xs font-medium rounded transition-colors ${load.enabled ? 'text-green-700 bg-green-100 hover:bg-green-200' : 'text-gray-600 bg-gray-200 hover:bg-gray-300'}`}>
            {load.enabled ? 'ON' : 'OFF'}
          </button>
          {isEditing ? (
            <button onClick={onSave} className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors" title="Save"><Save className="w-4 h-4" /></button>
          ) : (
            <button onClick={onEdit} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
          )}
          <button onClick={() => setExpanded(!expanded)} className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onRemove} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors" title="Remove"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      {expanded && isEditing && (
        <div className="mt-3 pt-3 border-t border-gray-200"><LoadEditor load={load} onUpdate={onUpdate} /></div>
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
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Battery Capacity (kWh)</label>
          <input type="number" value={load.batteryKwh} onChange={e => onUpdate({ ...load, batteryKwh: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" min="0" step="1" /></div>
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Onboard Charger (kW)</label>
          <input type="number" value={load.onboardChargerKw} onChange={e => onUpdate({ ...load, onboardChargerKw: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" min="0" step="0.1" /></div>
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Depart Time (hour)</label>
          <input type="number" value={load.departTime} onChange={e => onUpdate({ ...load, departTime: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" min="0" max="24" step="0.5" /></div>
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Return Time (hour)</label>
          <input type="number" value={load.returnTime} onChange={e => onUpdate({ ...load, returnTime: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" min="0" max="24" step="0.5" /></div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id={`v2g-${load.id}`} checked={load.supportsV2G} onChange={e => onUpdate({ ...load, supportsV2G: e.target.checked })} className="w-4 h-4" />
        <label htmlFor={`v2g-${load.id}`} className="text-xs font-medium text-gray-700">Supports V2G (Vehicle-to-Grid)</label>
      </div>
    </div>
  );
}

function HomeLoadEditor({ load, onUpdate }: { load: HomeLoadConfig; onUpdate: (load: LoadConfig) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Weekend Multiplier</label>
          <input type="number" value={load.weekendMultiplier} onChange={e => onUpdate({ ...load, weekendMultiplier: parseFloat(e.target.value) || 1 })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" min="0" max="2" step="0.1" /></div>
        <div><label className="block text-xs font-medium text-gray-700 mb-1">HVAC Base (kW)</label>
          <input type="number" value={load.hvacBaseKw} onChange={e => onUpdate({ ...load, hvacBaseKw: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" min="0" step="0.5" disabled={!load.includeHVAC} /></div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id={`hvac-${load.id}`} checked={load.includeHVAC} onChange={e => onUpdate({ ...load, includeHVAC: e.target.checked })} className="w-4 h-4" />
        <label htmlFor={`hvac-${load.id}`} className="text-xs font-medium text-gray-700">Include Weather-Dependent HVAC</label>
      </div>
    </div>
  );
}

function CommercialLoadEditor({ load, onUpdate }: { load: CommercialLoadConfig; onUpdate: (load: LoadConfig) => void }) {
  return (
    <div className="space-y-3">
      <div><label className="block text-xs font-medium text-gray-700 mb-1">Constant Load (kW)</label>
        <input type="number" value={load.constantKw} onChange={e => onUpdate({ ...load, constantKw: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" min="0" step="0.5" /></div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id={`weekends-${load.id}`} checked={load.operatesWeekends} onChange={e => onUpdate({ ...load, operatesWeekends: e.target.checked })} className="w-4 h-4" />
        <label htmlFor={`weekends-${load.id}`} className="text-xs font-medium text-gray-700">Operates on Weekends</label>
      </div>
    </div>
  );
}

function HVACLoadEditor({ load, onUpdate }: { load: HVACLoadConfig; onUpdate: (load: LoadConfig) => void }) {
  return (
    <div className="space-y-3">
      <div><label className="block text-xs font-medium text-gray-700 mb-1">Capacity (kW)</label>
        <input type="number" value={load.capacityKw} onChange={e => onUpdate({ ...load, capacityKw: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" min="0" step="0.5" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Operating Start (hour)</label>
          <input type="number" value={load.operatingHours.start} onChange={e => onUpdate({ ...load, operatingHours: { ...load.operatingHours, start: parseFloat(e.target.value) || 0 } })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" min="0" max="24" /></div>
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Operating End (hour)</label>
          <input type="number" value={load.operatingHours.end} onChange={e => onUpdate({ ...load, operatingHours: { ...load.operatingHours, end: parseFloat(e.target.value) || 0 } })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" min="0" max="24" /></div>
      </div>
    </div>
  );
}

function CustomLoadEditor({ load, onUpdate }: { load: CustomLoadConfig; onUpdate: (load: LoadConfig) => void }) {
  return (
    <div className="space-y-3">
      <div><label className="block text-xs font-medium text-gray-700 mb-1">Mode</label>
        <select value={load.mode} onChange={e => onUpdate({ ...load, mode: e.target.value as 'constant' | 'profile' })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded">
          <option value="constant">Constant</option>
          <option value="profile">Hourly Profile</option>
        </select>
      </div>
      {load.mode === 'constant' && (
        <div><label className="block text-xs font-medium text-gray-700 mb-1">Constant Load (kW)</label>
          <input type="number" value={load.constantKw || 0} onChange={e => onUpdate({ ...load, constantKw: parseFloat(e.target.value) || 0 })} className="w-full px-2 py-1 text-sm border border-gray-300 rounded" min="0" step="0.5" /></div>
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

  return (
    <div className="space-y-4">
      <div className="p-4 border border-gray-200 rounded-lg bg-white space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">System mode</span>
          {(['on-grid', 'off-grid', 'hybrid'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => updateSystemConfig({ systemMode: mode })}
              className={`px-3 py-1 text-xs font-semibold rounded border transition-colors ${
                modeConfig.systemMode === mode
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
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
              <label className="text-xs font-medium text-gray-700">
                Battery DoD (%)
                <input
                  type="number"
                  className="mt-1 w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  min="1"
                  max="100"
                  value={modeConfig.batteryDodPct}
                  onChange={(e) => updateSystemConfig({ batteryDodPct: clampPercentage(e.target.value, DEFAULT_BATTERY_DOD_PCT) })}
                />
              </label>
              <label className="text-xs font-medium text-gray-700">
                Generator threshold (% SOC)
                <input
                  type="number"
                  className="mt-1 w-full px-2 py-1 text-sm border border-gray-300 rounded"
                  min="1"
                  max="100"
                  value={modeConfig.generatorThresholdPct}
                  onChange={(e) => updateSystemConfig({ generatorThresholdPct: clampPercentage(e.target.value, DEFAULT_GENERATOR_THRESHOLD_PCT) })}
                />
              </label>
            </div>
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Recommended off-grid PV size: <strong>{offGridPvKw.toFixed(1)} kW</strong> (25% above on-grid equivalent).
            </div>
            <div className="text-xs text-gray-700">
              Days of autonomy: <strong>{autonomyDays.toFixed(2)} days</strong>
            </div>
          </div>
        )}

        {modeConfig.systemMode === 'on-grid' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
                Grid export: <strong>{dailyExportKwh.toFixed(2)} kWh/day</strong>
              </div>
              <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
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
              <label htmlFor="grid-outage-toggle" className="text-xs font-medium text-gray-700">
                Simulate grid outage (anti-islanding)
              </label>
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-gray-500 hover:text-gray-700">
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
          <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Hybrid mode active: battery storage and grid import/export are both enabled.
          </div>
        )}
      </div>

      <LoadList config={fullSystemConfig} onConfigChange={updateFullSystemConfig} />
    </div>
  );
}
