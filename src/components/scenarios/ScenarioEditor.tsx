'use client';
/**
 * ScenarioEditor
 * ────────────────
 * Full parameter editor for a single scenario.
 * Sections: PV array / Battery / Load & Grid / Financial.
 * Auto-calculates when "Run calculation" is clicked.
 */

import React, { useState } from 'react';
import { useScenarioStore, ScenarioConfig } from '@/store/scenarioStore';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-6">
    <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3 pb-1 border-b border-[var(--color-border)]">{title}</h4>
    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
      {children}
    </div>
  </section>
);

function Field({
  label, value, onChange, min, max, step = 1, unit, helpText, type = 'number',
}: {
  label: string; value: number | string; onChange: (v: string) => void;
  min?: number; max?: number; step?: number; unit?: string; helpText?: string; type?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--color-text-muted)]">
        {label}{unit && <span className="font-normal ml-1 text-[var(--color-text-faint)]">({unit})</span>}
      </span>
      {type === 'select' ? null : (
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => onChange(e.target.value)}
          className="h-8 px-2.5 text-sm rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition"
        />
      )}
      {helpText && <span className="text-[11px] text-[var(--color-text-faint)]">{helpText}</span>}
    </label>
  );
}

function SelectField<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--color-text-muted)]">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="h-8 px-2 text-sm rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

const ResultRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className={`flex justify-between items-baseline py-1.5 border-b border-[var(--color-border)] last:border-0 ${
    highlight ? 'font-semibold' : ''
  }`}>
    <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
    <span className={`text-sm tabular-nums ${highlight ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>{value}</span>
  </div>
);

const fmt = (n: number, dec = 0) => n.toLocaleString('en-KE', { maximumFractionDigits: dec });

export function ScenarioEditor({ scenarioId }: { scenarioId: string }) {
  const { scenarios, updateConfig, runCalculation, renameScenario, cloneScenario } = useScenarioStore();
  const scenario = scenarios.find(s => s.id === scenarioId);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState('');

  if (!scenario) return (
    <div className="flex items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
      Select a scenario to edit
    </div>
  );

  const cfg = scenario.config;
  const set = (patch: Partial<ScenarioConfig>) => updateConfig(scenarioId, patch);
  const n = (v: string) => parseFloat(v) || 0;

  const results = scenario.results;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: form */}
      <div className="flex-1 overflow-y-auto p-5 min-w-0">
        {/* Name row */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: scenario.colour }} />
          {editingName ? (
            <input
              autoFocus
              className="text-base font-semibold bg-transparent border-b border-[var(--color-primary)] outline-none flex-1"
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={() => { renameScenario(scenarioId, nameVal); setEditingName(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { renameScenario(scenarioId, nameVal); setEditingName(false); } }}
            />
          ) : (
            <h3
              className="text-base font-semibold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-primary)] transition-colors"
              title="Click to rename"
              onClick={() => { setEditingName(true); setNameVal(scenario.name); }}
            >
              {scenario.name}
            </h3>
          )}
          <button
            className="ml-auto text-xs border border-[var(--color-border)] px-2.5 py-1 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-dynamic)] transition-colors"
            onClick={() => cloneScenario(scenarioId)}
          >
            Clone
          </button>
          <button
            className="text-xs bg-[var(--color-primary)] text-white px-3 py-1 rounded-md font-medium hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
            disabled={scenario.isCalculating}
            onClick={() => runCalculation(scenarioId)}
          >
            {scenario.isCalculating ? 'Calculating…' : 'Run calculation'}
          </button>
        </div>

        <Section title="PV Array">
          <Field label="Capacity" value={cfg.pvCapacityKwp} unit="kWp" min={0.5} max={500} step={0.5}
            onChange={v => set({ pvCapacityKwp: n(v) })} />
          <Field label="Specific yield" value={cfg.specificYieldKwhPerKwp} unit="kWh/kWp/yr" min={800} max={2000}
            onChange={v => set({ specificYieldKwhPerKwp: n(v) })}
            helpText="Nairobi default: 1400" />
          <Field label="Panel efficiency" value={(cfg.pvPanelEfficiency * 100).toFixed(1)} unit="%" min={10} max={25} step={0.1}
            onChange={v => set({ pvPanelEfficiency: n(v) / 100 })} />
          <Field label="System losses" value={(cfg.pvSystemLosses * 100).toFixed(1)} unit="%" min={5} max={30} step={0.5}
            onChange={v => set({ pvSystemLosses: n(v) / 100 })}
            helpText="Wiring, shading, mismatch" />
          <Field label="Tilt" value={cfg.pvTiltDeg} unit="°" min={0} max={45}
            onChange={v => set({ pvTiltDeg: n(v) })} />
          <Field label="Azimuth" value={cfg.pvAzimuthDeg} unit="°" min={-90} max={90}
            onChange={v => set({ pvAzimuthDeg: n(v) })}
            helpText="0 = N, 90 = E" />
        </Section>

        <Section title="Battery">
          <Field label="Capacity" value={cfg.batteryCapacityKwh} unit="kWh" min={0} max={500} step={1}
            onChange={v => set({ batteryCapacityKwh: n(v) })} />
          <SelectField
            label="Chemistry"
            value={cfg.batteryChemistry}
            options={[
              { value: 'lfp', label: 'LiFePO₄ (LFP)' },
              { value: 'nmc', label: 'NMC' },
              { value: 'lead_acid', label: 'Lead-acid' },
            ]}
            onChange={v => set({ batteryChemistry: v })}
          />
          <Field label="Round-trip efficiency" value={(cfg.batteryRoundTripEfficiency * 100).toFixed(0)} unit="%" min={70} max={99}
            onChange={v => set({ batteryRoundTripEfficiency: n(v) / 100 })} />
          <Field label="Max DoD" value={cfg.batteryMaxDodPct} unit="%" min={20} max={100}
            onChange={v => set({ batteryMaxDodPct: n(v) })} />
          <Field label="Cycle life @ 80% DoD" value={cfg.batteryCycleLifeAt80Dod} unit="cycles" min={500} max={8000} step={100}
            onChange={v => set({ batteryCycleLifeAt80Dod: n(v) })} />
        </Section>

        <Section title="Load & Grid">
          <Field label="Annual load" value={cfg.annualLoadKwh} unit="kWh/yr" min={1000} max={1_000_000} step={500}
            onChange={v => set({ annualLoadKwh: n(v) })} />
          <Field label="Peak load" value={cfg.peakLoadKw} unit="kW" min={0.5} max={500} step={0.5}
            onChange={v => set({ peakLoadKw: n(v) })} />
          <Field label="Load growth" value={cfg.loadGrowthPctPerYear} unit="%/yr" min={0} max={20} step={0.5}
            onChange={v => set({ loadGrowthPctPerYear: n(v) })} />
          <Field label="Import tariff" value={cfg.importTariffKwhRate} unit="KES/kWh" min={1} max={100} step={0.5}
            onChange={v => set({ importTariffKwhRate: n(v) })} />
          <Field label="Feed-in tariff" value={cfg.exportTariffKwhRate} unit="KES/kWh" min={0} max={50} step={0.5}
            onChange={v => set({ exportTariffKwhRate: n(v) })} />
          <Field label="Tariff escalation" value={cfg.annualTariffEscalationPct} unit="%/yr" min={0} max={20} step={0.5}
            onChange={v => set({ annualTariffEscalationPct: n(v) })} />
        </Section>

        <Section title="Financial">
          <Field label="PV CAPEX" value={cfg.pvCapexPerKwp} unit="KES/kWp" min={10000} max={300000} step={1000}
            onChange={v => set({ pvCapexPerKwp: n(v) })} />
          <Field label="Battery CAPEX" value={cfg.batteryCapexPerKwh} unit="KES/kWh" min={5000} max={200000} step={1000}
            onChange={v => set({ batteryCapexPerKwh: n(v) })} />
          <Field label="O&M per year" value={cfg.omCostPerYearKes} unit="KES" min={0} max={500000} step={1000}
            onChange={v => set({ omCostPerYearKes: n(v) })} />
          <Field label="Discount rate" value={cfg.discountRatePct} unit="%" min={1} max={30} step={0.5}
            onChange={v => set({ discountRatePct: n(v) })} />
          <Field label="Project life" value={cfg.projectLifeYears} unit="years" min={5} max={40}
            onChange={v => set({ projectLifeYears: n(v) })} />
          <Field label="VAT" value={cfg.vatPct} unit="%" min={0} max={30}
            onChange={v => set({ vatPct: n(v) })} />
        </Section>
      </div>

      {/* Right: results panel */}
      <aside className="w-64 flex-shrink-0 border-l border-[var(--color-border)] overflow-y-auto p-4 bg-[var(--color-surface-2)]">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Results</h4>

        {!results && !scenario.isCalculating && (
          <p className="text-xs text-[var(--color-text-faint)] text-center py-10">
            Edit parameters, then click<br /><strong>Run calculation</strong>.
          </p>
        )}
        {scenario.isCalculating && (
          <div className="flex flex-col items-center gap-2 py-10">
            <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[var(--color-text-muted)]">Calculating…</p>
          </div>
        )}
        {results && (
          <>
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2 mt-1">Energy</p>
            <ResultRow label="PV yield" value={`${fmt(results.annualPvYieldKwh)} kWh/yr`} />
            <ResultRow label="Self-sufficiency" value={`${results.selfSufficiencyPct}%`} highlight />
            <ResultRow label="Self-consumption" value={`${results.selfConsumptionPct}%`} />
            <ResultRow label="Grid import" value={`${fmt(results.gridImportKwh)} kWh`} />
            <ResultRow label="Grid export" value={`${fmt(results.gridExportKwh)} kWh`} />
            <ResultRow label="Performance ratio" value={`${results.performanceRatioPct}%`} />

            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2 mt-4">Financial</p>
            <ResultRow label="Total CAPEX" value={`KES ${fmt(results.totalCapexKes)}`} />
            <ResultRow label="Yr-1 savings" value={`KES ${fmt(results.annualSavingsKes)}`} />
            <ResultRow label="Simple payback" value={`${results.simplePaybackYears} yr`} />
            <ResultRow label="NPV (25 yr)" value={`KES ${fmt(results.npv25Kes)}`} highlight />
            <ResultRow label="IRR (25 yr)" value={`${results.irr25Pct}%`} />
            <ResultRow label="LCOE" value={`KES ${results.lcoeKesPerKwh}/kWh`} />

            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2 mt-4">Battery & Environment</p>
            <ResultRow label="Battery life" value={`${results.estimatedBatteryLifeYears} yr`} />
            <ResultRow label="CO₂ saved" value={`${fmt(results.co2SavedKgPerYear)} kg/yr`} />
          </>
        )}
      </aside>
    </div>
  );
}
