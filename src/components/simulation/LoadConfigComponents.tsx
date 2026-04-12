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
  Plus, Trash2, Edit, Save, X, Home, Car, Building2, Wind, Zap, ChevronDown, ChevronUp
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
import { createLoadTemplate, generateLoadId, DEFAULT_SYSTEM_CONFIG } from '@/lib/system-config';

interface LoadListProps {
  config: SystemConfiguration;
  onConfigChange: (config: SystemConfiguration) => void;
}

export function LoadList({ config, onConfigChange }: LoadListProps) {
  const [editingLoadId, setEditingLoadId] = useState<string | null>(null);
  const [isAddingLoad, setIsAddingLoad] = useState(false);

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
  return <LoadList config={fullSystemConfig} onConfigChange={updateFullSystemConfig} />;
}
