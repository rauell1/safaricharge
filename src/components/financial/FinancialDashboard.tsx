'use client';

import React, { useMemo, useState } from 'react';
import { DollarSign, Gauge, LineChart, PieChart, Play, Sparkles, TrendingUp } from 'lucide-react';
import type { FinancialInputs, FinancialSnapshot } from '@/lib/financial-dashboard';
import { simulateScenario } from '@/lib/financial-dashboard';

// ✅ Exported publicly so barrel shims and consumers can import this type directly
export type FinancialDashboardProps = {
  snapshot: FinancialSnapshot;
  inputs: FinancialInputs;
  onInputsChange: (next: FinancialInputs) => void;
  hasSimulationData?: boolean;
  onRunSimulation?: () => void;
  expectedYieldKwh?: number;
  actualYieldKwh?: number;
  tariffRate?: number;
};

const formatCurrency = (value: number, digits = 0) =>
  `KES ${Number.isFinite(value) ? value.toLocaleString('en-KE', { maximumFractionDigits: digits }) : '0'}`;

const formatNumber = (value: number, digits = 1) =>
  Number.isFinite(value) ? value.toLocaleString('en-KE', { maximumFractionDigits: digits }) : '0';

const DEFAULT_EXPECTED_YIELD_MULTIPLIER = 1.05;

const ProgressBar = ({ value }: { value: number }) => (
  <div className="h-2.5 w-full rounded-full bg-[var(--bg-card-muted)]">
    <div className="h-full rounded-full bg-[var(--battery)] transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);

export default function FinancialDashboard({
  snapshot,
  inputs,
  onInputsChange,
  hasSimulationData = true,
  onRunSimulation,
  expectedYieldKwh,
  actualYieldKwh,
  tariffRate = 23,
}: FinancialDashboardProps) {
  const [scenario, setScenario] = useState({
    chargingTariffKes: inputs.chargingTariffKes,
    utilizationPct: snapshot.utilizationPct || inputs.targetUtilizationPct || 45,
    stationCount: inputs.stationCount,
    discountRatePct: inputs.discountRatePct,
  });

  const scenarioResult = useMemo(
    () => simulateScenario(snapshot, { chargingTariffKes: scenario.chargingTariffKes, utilizationPct: scenario.utilizationPct, stationCount: scenario.stationCount, discountRatePct: scenario.discountRatePct }),
    [scenario, snapshot]
  );

  const marginPct = snapshot.revenueMonthly > 0 ? (snapshot.netMonthly / snapshot.revenueMonthly) * 100 : 0;
  const actualYield = actualYieldKwh ?? snapshot.energy.avgDailySolarKWh;
  const expectedYield = expectedYieldKwh ?? snapshot.energy.avgDailySolarKWh * DEFAULT_EXPECTED_YIELD_MULTIPLIER;
  const yieldDelta = actualYield - expectedYield;
  const deviationPct = expectedYield === 0 ? 0 : (yieldDelta / expectedYield) * 100;
  const deviationClass = Math.abs(deviationPct) <= 5 ? 'text-green-500 bg-green-500/10' : Math.abs(deviationPct) <= 15 ? 'text-yellow-500 bg-yellow-500/10' : 'text-red-500 bg-red-500/10';
  const revenueImpact = yieldDelta * tariffRate;

  return (
    <section className="w-full">
      <div className="space-y-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-10 w-10 rounded-full bg-[var(--battery-soft)] border border-[var(--battery)]/30 flex items-center justify-center text-[var(--battery)]">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-[var(--text-primary)]">Investor Dashboard</h2>
            <p className="text-sm md:text-base text-justify text-[var(--text-secondary)] [text-align-last:left] prose-comfortable">Live financial layer wired to your SafariCharge simulation</p>
          </div>
        </div>

        {!hasSimulationData ? (
          <div className="grid min-h-[380px] gap-6 rounded-[32px] border border-dashed border-[var(--border)] bg-[var(--bg-card-muted)] p-6 items-stretch xl:grid-cols-[minmax(420px,1.25fr)_minmax(320px,0.75fr)] lg:p-8" style={{ background: 'linear-gradient(135deg, var(--bg-card-muted) 0%, var(--bg-secondary) 100%)' }}>
            <div className="flex w-full min-w-0 flex-col justify-between gap-6 text-left">
              <div className="space-y-4 w-full min-w-0">
                <div className="h-16 w-16 rounded-2xl border border-[var(--battery)]/20 bg-[var(--battery-soft)] flex items-center justify-center text-[var(--battery)] shadow-[0_0_0_8px_rgba(16,185,129,0.08)]">
                  <TrendingUp size={30} />
                </div>
                <div className="space-y-2 w-full max-w-none">
                  <h3 className="max-w-xl text-2xl font-bold leading-tight text-[var(--text-primary)] sm:text-[2rem]">No Simulation Data Available</h3>
                  <p className="max-w-xl text-base leading-relaxed text-justify text-[var(--text-secondary)] [text-align-last:left] prose-comfortable">Run the simulation to generate live financial insights, including revenue projections, payback period, IRR, NPV, and sensitivity scenarios.</p>
                </div>
                {onRunSimulation && (
                  <button onClick={onRunSimulation} className="inline-flex items-center gap-2 rounded-full bg-[var(--battery)] px-6 py-3 font-semibold text-white shadow-lg shadow-[rgba(16,185,129,0.18)] transition-colors hover:opacity-90">
                    <Play size={18} />
                    Run Simulation
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-hover)] p-4 relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-[var(--battery)]" />
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--battery)]">Revenue / Month</span>
                  <DollarSign className="text-[var(--battery)]" size={18} />
                </div>
                <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(snapshot.revenueMonthly)}</div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Revenue per station: {formatCurrency(snapshot.revenuePerStationDay * 30)} / mo</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-hover)] p-4 relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-[var(--grid)]" />
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--grid)]">Net Profit / Month</span>
                  <TrendingUp className="text-[var(--grid)]" size={18} />
                </div>
                <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(snapshot.netMonthly)}</div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Margin {formatNumber(marginPct, 1)}%</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-hover)] p-4 relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-[var(--solar)]" />
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--solar)]">Payback Progress</span>
                  <Gauge className="text-[var(--solar)]" size={18} />
                </div>
                <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{formatNumber(snapshot.paybackProgressPct, 1)}%</div>
                <ProgressBar value={snapshot.paybackProgressPct} />
                <p className="text-xs text-[var(--text-secondary)] mt-1">Projected payback: {formatNumber(snapshot.paybackYears, 1)} yrs</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-hover)] p-4 relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-[var(--consumption)]" />
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--consumption)]">LCOE</span>
                  <LineChart className="text-[var(--consumption)]" size={18} />
                </div>
                <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(snapshot.lcoeKesPerKwh, 2)} / kWh</div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">Grid benchmark {formatCurrency(snapshot.gridBenchmarkKesPerKwh, 2)} / kWh</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-strong)] p-4 bg-[var(--bg-secondary)] space-y-4">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-hover)] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--text-secondary)]">Expected yield vs actual yield</p>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${deviationClass}`}>
                    {deviationPct >= 0 ? '+' : ''}{deviationPct.toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                    <p className="text-sm font-medium text-[var(--text-secondary)]">Expected yield</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{formatNumber(expectedYield, 2)} kWh</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                    <p className="text-sm font-medium text-[var(--text-secondary)]">Actual yield</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{formatNumber(actualYield, 2)} kWh</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
                    <p className="text-sm font-medium text-[var(--text-secondary)]">Estimated revenue impact</p>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {formatCurrency(revenueImpact, 2)}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">Tariff rate: KES {formatNumber(tariffRate, 2)}/kWh</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase text-[var(--text-tertiary)] font-semibold tracking-wider">Scenario & Sensitivity</p>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Live simulation</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setScenario({ chargingTariffKes: inputs.chargingTariffKes, utilizationPct: snapshot.utilizationPct || inputs.targetUtilizationPct || 45, stationCount: inputs.stationCount, discountRatePct: inputs.discountRatePct })} className="rounded-full border border-[var(--border-strong)] px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--battery)] hover:text-[var(--battery)] transition">Reset</button>
                  <Gauge size={18} className="text-[var(--battery)]" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-3">
                  <label className="flex flex-col gap-1 text-sm">
                    <div className="flex justify-between text-[var(--text-secondary)]">
                      <span>Charging tariff (KES/kWh)</span>
                      <span className="font-semibold text-[var(--text-primary)]">{formatNumber(scenario.chargingTariffKes, 0)}</span>
                    </div>
                    <input type="range" min={15} max={80} step={1} value={scenario.chargingTariffKes} onChange={e => { const chargingTariffKes = Number(e.target.value); setScenario(prev => ({ ...prev, chargingTariffKes })); onInputsChange({ ...inputs, chargingTariffKes }); }} className="w-full accent-emerald-400" />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <div className="flex justify-between text-[var(--text-secondary)]">
                      <span>Utilization (%)</span>
                      <span className="font-semibold text-[var(--text-primary)]">{formatNumber(scenario.utilizationPct, 0)}%</span>
                    </div>
                    <input type="range" min={10} max={90} step={1} value={scenario.utilizationPct} onChange={e => { const utilizationPct = Number(e.target.value); setScenario(prev => ({ ...prev, utilizationPct })); onInputsChange({ ...inputs, targetUtilizationPct: utilizationPct }); }} className="w-full accent-emerald-400" />
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border)] p-3">
                    <p className="text-[11px] text-[var(--text-tertiary)]">Scenario revenue / month</p>
                    <div className="text-2xl font-semibold text-[var(--text-primary)]">{formatCurrency(scenarioResult.revenueMonthly)}</div>
                    <p className="text-[11px] text-[var(--battery)]">Δ vs base {formatCurrency(scenarioResult.revenueMonthly - snapshot.revenueMonthly)}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border)] p-3">
                    <p className="text-[11px] text-[var(--text-tertiary)]">Scenario net / month</p>
                    <div className="text-2xl font-semibold text-[var(--text-primary)]">{formatCurrency(scenarioResult.netMonthly)}</div>
                    <p className="text-[11px] text-[var(--battery)]">Payback {scenarioResult.paybackYears ? `${formatNumber(scenarioResult.paybackYears, 1)} yrs` : 'N/A'}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border)] p-3">
                    <p className="text-[11px] text-[var(--text-tertiary)]">Scenario IRR</p>
                    <div className="text-2xl font-semibold text-[var(--text-primary)]">{formatNumber(scenarioResult.irrPct, 1)}%</div>
                  </div>
                  <div className="rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border)] p-3">
                    <p className="text-[11px] text-[var(--text-tertiary)]">Scenario NPV</p>
                    <div className="text-2xl font-semibold text-[var(--text-primary)]">{formatCurrency(scenarioResult.npvKes)}</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
