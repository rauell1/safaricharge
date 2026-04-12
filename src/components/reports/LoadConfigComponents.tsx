/**
 * Load Configuration Components
 * UI for configuring and saving load profiles used in the simulation.
 */
'use client';

import React, { useState } from 'react';
import { Save, Upload, Trash2, Settings, ChevronDown, ChevronUp } from 'lucide-react';

export interface LoadConfig {
  name: string;
  homeLoadKW: number;
  ev1LoadKW: number;
  ev2LoadKW: number;
  description?: string;
  createdAt?: number;
}

const DEFAULT_CONFIGS: LoadConfig[] = [
  { name: 'Light Office', homeLoadKW: 3, ev1LoadKW: 7, ev2LoadKW: 0, description: 'Small office with one EV charger' },
  { name: 'Full Fleet', homeLoadKW: 5, ev1LoadKW: 11, ev2LoadKW: 11, description: 'Two EV chargers at full capacity' },
  { name: 'Night Charging', homeLoadKW: 2, ev1LoadKW: 7, ev2LoadKW: 7, description: 'Off-peak overnight charging' },
];

interface LoadConfigSelectorProps {
  currentConfig: LoadConfig;
  onConfigChange: (config: LoadConfig) => void;
}

export const LoadConfigSelector: React.FC<LoadConfigSelectorProps> = ({ currentConfig, onConfigChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [configs, setConfigs] = useState<LoadConfig[]>(DEFAULT_CONFIGS);
  const [newName, setNewName] = useState('');

  const saveCurrentAsPreset = () => {
    if (!newName.trim()) return;
    const preset: LoadConfig = { ...currentConfig, name: newName.trim(), createdAt: Date.now() };
    setConfigs(prev => [...prev, preset]);
    setNewName('');
  };

  const deleteConfig = (name: string) => {
    setConfigs(prev => prev.filter(c => c.name !== name));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-xs font-medium bg-[var(--bg-card-muted)] border border-[var(--border)] px-3 py-1.5 rounded-lg hover:bg-[var(--bg-card)] transition-colors text-[var(--text-secondary)]"
      >
        <Settings size={13} />
        Load Configs
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-[var(--bg-card)] rounded-xl shadow-2xl border border-[var(--border)] z-50 overflow-hidden">
          <div className="p-3 bg-slate-900 text-white">
            <h3 className="text-sm font-bold flex items-center gap-2"><Settings size={14} />Load Configurations</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Preset load profiles for quick simulation setup</p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {configs.map(config => (
              <div
                key={config.name}
                className={`flex items-center justify-between p-3 border-b border-[var(--border)] hover:bg-[var(--bg-card-muted)] transition-colors ${
                  currentConfig.name === config.name ? 'bg-sky-50 dark:bg-sky-950' : ''
                }`}
              >
                <button onClick={() => { onConfigChange(config); setIsOpen(false); }} className="flex-1 text-left">
                  <div className="text-xs font-bold text-[var(--text-primary)]">{config.name}</div>
                  {config.description && <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{config.description}</div>}
                  <div className="text-[10px] text-[var(--text-secondary)] mt-1">
                    Home: {config.homeLoadKW}kW · EV1: {config.ev1LoadKW}kW · EV2: {config.ev2LoadKW}kW
                  </div>
                </button>
                {config.createdAt && (
                  <button onClick={() => deleteConfig(config.name)} className="ml-2 p-1 text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-card-muted)]">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-2">Save Current as Preset</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Preset name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveCurrentAsPreset()}
                className="flex-1 px-2 py-1 text-xs border border-[var(--border)] rounded bg-[var(--bg-card)] text-[var(--text-primary)] placeholder:text-[var(--text-faint)]"
              />
              <button
                onClick={saveCurrentAsPreset}
                disabled={!newName.trim()}
                className="px-2 py-1 bg-sky-600 text-white text-xs font-bold rounded hover:bg-sky-700 transition-colors disabled:opacity-50"
              >
                <Save size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadConfigSelector;
