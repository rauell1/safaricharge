'use client';

import React, { useMemo, useState } from 'react';
import { GitCompare, Trash2, AlertTriangle, Download } from 'lucide-react';
import type { SimulationResults } from '@/lib/sizing/types';
import { isOutdatedEngineVersion } from '@/lib/solar-resource';

export interface SavedDesignOption {
  id: string;
  label: string;
  savedAt: string;
  results: SimulationResults;
}

export const SAVED_DESIGNS_STORAGE_KEY = 'safaricharge_saved_designs_v1';

export function loadSavedDesignOptions(): SavedDesignOption[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SAVED_DESIGNS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDesignOptionToStorage(option: SavedDesignOption): SavedDesignOption[] {
  const existing = loadSavedDesignOptions().filter((item) => item.id !== option.id);
  const next = [option, ...existing].slice(0, 12);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SAVED_DESIGNS_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export default function ScenarioCompare({
  initialOptions,
  onSelectForExport,
}: {
  initialOptions?: SavedDesignOption[];
  onSelectForExport?: (opt: SavedDesignOption) => void;
}) {
  const [options, setOptions] = useState<SavedDesignOption[]>(() =>
    initialOptions ?? loadSavedDesignOptions()
  );
  const [slotIds, setSlotIds] = useState<[string, string, string]>(() => [
    (initialOptions ?? loadSavedDesignOptions())[0]?.id ?? '',
    (initialOptions ?? loadSavedDesignOptions())[1]?.id ?? '',
    (initialOptions ?? loadSavedDesignOptions())[2]?.id ?? '',
  ]);

  const selected = useMemo(
    () => slotIds.map((id) => options.find((o) => o.id === id) ?? null),
    [options, slotIds]
  );

  const handleDelete = (id: string) => {
    const next = options.filter((o) => o.id !== id);
    setOptions(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SAVED_DESIGNS_STORAGE_KEY, JSON.stringify(next));
    }
  };

  if (options.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-card)] p-8 text-center space-y-2">
        <GitCompare className="w-8 h-8 mx-auto text-[var(--text-tertiary)]" />
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          No Saved Design Options Yet
        </h3>
        <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
          Open <strong>Solar & BESS Studio (/sizing)</strong> and click <strong>Save Option for Comparison</strong> to pin up to 3 system designs side by side.
        </p>
      </div>
    );
  }

  const rows: Array<{ label: string; format: (r: SimulationResults) => string }> = [
    { label: 'Location', format: (r) => `${r.inputs.location.name}, ${r.inputs.location.country}` },
    { label: 'PV Array (kWp)', format: (r) => `${r.solarCapacityKWp} kWp` },
    { label: 'Inverter AC (kW)', format: (r) => `${r.inverterCapacityKW} kW` },
    { label: 'Battery Bank (kWh)', format: (r) => `${r.batteryCapacityKWh} kWh` },
    { label: 'DC / AC Ratio', format: (r) => `${r.actualDcAcRatio}` },
    { label: 'Annual PV Yield', format: (r) => `${r.annualPVGeneratedKWh.toLocaleString()} kWh` },
    { label: 'Curtailed Solar', format: (r) => `${(r.annualCurtailedKWh ?? 0).toLocaleString()} kWh` },
    { label: 'Clipped Solar', format: (r) => `${(r.annualClippedKWh ?? 0).toLocaleString()} kWh` },
    { label: 'Autonomy', format: (r) => `${r.systemAutonomyPercent}%` },
    { label: 'Turnkey CapEx (KES)', format: (r) => `KES ${r.totalCapExKSh.toLocaleString()}` },
    { label: 'Turnkey CapEx (USD)', format: (r) => `$${r.totalCapExUSD.toLocaleString()}` },
    { label: 'Year-1 Savings (USD)', format: (r) => `$${r.annualSavingsUSD.toLocaleString()}` },
    { label: 'Simple Payback', format: (r) => `${r.simplePaybackYears} yrs` },
    { label: 'NPV (25y, USD)', format: (r) => `$${r.npvUSD.toLocaleString()}` },
    { label: 'IRR (%)', format: (r) => `${r.irrPercent}%` },
    { label: 'Useful LCOE ($/kWh)', format: (r) => `$${r.lcoeUSDPerKWh.toFixed(3)}` },
    { label: 'CO2 Avoided / yr', format: (r) => `${r.annualCO2SavedTons} t` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[0, 1, 2].map((slotIdx) => {
          const picked = selected[slotIdx];
          return (
            <div
              key={slotIdx}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono uppercase font-bold text-[var(--text-tertiary)]">
                  Option {slotIdx + 1}
                </span>
                {picked && (
                  <button
                    type="button"
                    onClick={() => handleDelete(picked.id)}
                    className="text-[var(--text-tertiary)] hover:text-rose-500 p-1 rounded"
                    title="Delete saved option"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <select
                value={slotIds[slotIdx]}
                onChange={(e) => {
                  const next: [string, string, string] = [...slotIds] as [string, string, string];
                  next[slotIdx] = e.target.value;
                  setSlotIds(next);
                }}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)]"
              >
                <option value="">-- Select saved design --</option>
                {options.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label} ({opt.results.solarCapacityKWp} kWp)
                  </option>
                ))}
              </select>
              {picked && isOutdatedEngineVersion(picked.results.engineVersion) && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-600 bg-amber-500/10 rounded-lg px-2 py-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Legacy engine run (&lt; v2.0). Re-run in Studio.</span>
                </div>
              )}
              {picked && onSelectForExport && (
                <button
                  type="button"
                  onClick={() => onSelectForExport(picked)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-[var(--battery-soft)] text-[var(--battery)] py-1.5 text-[11px] font-semibold hover:opacity-85"
                >
                  <Download className="w-3.5 h-3.5" />
                  Open Proposal / Export
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-card-muted)] font-mono text-[10px] uppercase text-[var(--text-tertiary)]">
              <th className="py-2.5 px-3">Metric</th>
              {selected.map((opt, idx) => (
                <th key={idx} className="py-2.5 px-3 text-right">
                  {opt ? opt.label : `Option ${idx + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <tr key={row.label} className="hover:bg-[var(--bg-card-muted)]/60">
                <td className="py-2 px-3 font-medium text-[var(--text-secondary)]">
                  {row.label}
                </td>
                {selected.map((opt, idx) => (
                  <td
                    key={idx}
                    className="py-2 px-3 text-right font-mono font-semibold text-[var(--text-primary)]"
                  >
                    {opt ? row.format(opt.results) : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
