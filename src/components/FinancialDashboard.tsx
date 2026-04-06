'use client';

import React, { useMemo, useState } from 'react';
import { DollarSign, Gauge, LineChart, PieChart, Play, Sparkles, TrendingUp } from 'lucide-react';
import type { FinancialInputs, FinancialSnapshot } from '@/lib/financial-dashboard';
import { simulateScenario } from '@/lib/financial-dashboard';

type Props = {
  snapshot: FinancialSnapshot;
  inputs: FinancialInputs;
  onInputsChange: (next: FinancialInputs) => void;
  hasSimulationData?: boolean;
  onRunSimulation?: () => void;
};

const formatCurrency = (value: number, digits = 0) =>
  `KES ${Number.isFinite(value) ? value.toLocaleString('en-KE', { maximumFractionDigits: digits }) : '0'}`;

const formatNumber = (value: number, digits = 1) =>
  Number.isFinite(value) ? value.toLocaleString('en-KE', { maximumFractionDigits: digits }) : '0';

const ProgressBar = ({ value }: { value: number }) => (
  <div className="h-2.5 w-full rounded-full bg-[var(--bg-card-muted)]">
    <div
      className="h-full rounded-full bg-[var(--battery)] transition-all"
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);

export default function FinancialDashboard({ snapshot, inputs, onInputsChange, hasSimulationData = true, onRunSimulation }: Props) {
  const [scenario, setScenario] = useState({
    chargingTariffKes: inputs.chargingTariffKes,
    utilizationPct: snapshot.utilizationPct || inputs.targetUtilizationPct || 45,
    stationCount: inputs.stationCount,
    discountRatePct: inputs.discountRatePct,
  });

  const scenarioResult = useMemo(
    () =>
      simulateScenario(snapshot, {
        chargingTariffKes: scenario.chargingTariffKes,
        utilizationPct: scenario.utilizationPct,
        stationCount: scenario.stationCount,
        discountRatePct: scenario.discountRatePct,
      }),
    [scenario, snapshot]
  );

  const marginPct = snapshot.revenueMonthly > 0 ? (snapshot.netMonthly / snapshot.revenueMonthly) * 100 : 0;
  const portfolioRevenue = snapshot.revenueMonthly * snapshot.stations;
  const portfolioNet = snapshot.netMonthly * snapshot.stations;

  return (
    <section className="w-full">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-[var(--battery-soft)] border border-[var(--battery)]/30 flex items-center justify-center text-[var(--battery)]">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-[var(--text-primary)]">Investor Dashboard</h2>
            <p className="text-xs md:text-sm text-[var(--text-secondary)]">Live financial layer wired to your SafariCharge simulation</p>
          </div>
        </div>

        {!hasSimulationData ? (
          <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
            <div className="h-20 w-20 rounded-full bg-[var(--battery-soft)] border border-[var(--battery)]/20 flex items-center justify-center text-[var(--battery)]">
              <TrendingUp size={36} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-[var(--text-primary)]">No Simulation Data Available</h3>
              <p className="text-sm text-[var(--text-secondary)] max-w-sm">
                Run the simulation to generate live financial insights — revenue projections, payback period, IRR, NPV, and more.
              </p>
            </div>
            {onRunSimulation && (
              <button
                onClick={onRunSimulation}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--battery)] hover:opacity-90 text-white font-semibold rounded-xl transition-colors"
              >
                <Play size={18} />
                Run Simulation
              </button>
            )}
          </div>
        ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-hover)] p-4 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-[var(--battery)]" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--battery)]">Revenue / Month</span>
              <DollarSign className="text-[var(--battery)]" size={18} />
            </div>
            <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(snapshot.revenueMonthly)}</div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Revenue per station: {formatCurrency(snapshot.revenuePerStationDay * 30)} / mo
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-hover)] p-4 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-[var(--grid)]" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--grid)]">Net Profit / Month</span>
              <TrendingUp className="text-[var(--grid)]" size={18} />
            </div>
            <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(snapshot.netMonthly)}</div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">Margin {formatNumber(marginPct, 1)}%</p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-hover)] p-4 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-[var(--solar)]" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--solar)]">Payback Progress</span>
              <Gauge className="text-[var(--solar)]" size={18} />
            </div>
            <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
              {formatNumber(snapshot.paybackProgressPct, 1)}%
            </div>
            <ProgressBar value={snapshot.paybackProgressPct} />
            <p className="text-xs text-[var(--text-secondary)] mt-1">Projected payback: {formatNumber(snapshot.paybackYears, 1)} yrs</p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-hover)] p-4 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-[var(--consumption)]" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--consumption)]">LCOE</span>
              <LineChart className="text-[var(--consumption)]" size={18} />
            </div>
            <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
              {formatCurrency(snapshot.lcoeKesPerKwh, 2)} / kWh
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Grid benchmark {formatCurrency(snapshot.gridBenchmarkKesPerKwh, 2)} / kWh
            </p>
          </div>
        </div>

        {/* Financial analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--bg-card-hover)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-[var(--text-tertiary)] font-semibold">Capex & Opex</p>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Cost structure</h3>
              </div>
              <PieChart className="text-[var(--text-tertiary)]" size={18} />
            </div>
            <div className="mt-3 space-y-3">
              {[
                { label: 'Solar', value: snapshot.capex.solar, tone: 'bg-[var(--battery)]' },
                { label: 'Battery', value: snapshot.capex.battery, tone: 'bg-[var(--solar)]' },
                { label: 'Inverter', value: snapshot.capex.inverter, tone: 'bg-[var(--consumption)]' },
                { label: 'Installation', value: snapshot.capex.installation, tone: 'bg-[var(--border)]' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${item.tone}`} />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                      <span>{item.label}</span>
                      <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(item.value)}</span>
                    </div>
                    <ProgressBar value={(item.value / snapshot.capex.total) * 100} />
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold text-[var(--text-primary)] pt-1 border-t border-[var(--border)]">
                <span>Total Capex</span>
                <span>{formatCurrency(snapshot.capex.total)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                  <p className="text-[11px] text-[var(--text-tertiary)]">Opex / Month</p>
                  <div className="text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(snapshot.opex.total)}</div>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    Maint {formatCurrency(snapshot.opex.maintenance, 0)} • Ins {formatCurrency(snapshot.opex.insurance, 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                  <p className="text-[11px] text-[var(--text-tertiary)]">Lifetime Energy</p>
                  <div className="text-lg font-semibold text-[var(--text-primary)]">
                    {formatNumber(snapshot.energy.lifetimeEnergyKWh / 1000, 1)} MWh
                  </div>
                  <p className="text-[11px] text-[var(--text-tertiary)]">
                    Daily solar {formatNumber(snapshot.energy.avgDailySolarKWh, 1)} kWh
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] p-4 bg-[var(--bg-card-hover)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-[var(--text-tertiary)] font-semibold">Profit engine</p>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Returns & payback</h3>
              </div>
              <TrendingUp className="text-[var(--battery)]" size={18} />
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                <p className="text-[11px] text-[var(--text-tertiary)]">Net / Month</p>
                <div className="text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(snapshot.netMonthly)}</div>
                <p className="text-[11px] text-[var(--text-tertiary)]">Margin {formatNumber(marginPct, 1)}%</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                <p className="text-[11px] text-[var(--text-tertiary)]">Payback</p>
                <div className="text-lg font-semibold text-[var(--text-primary)]">
                  {snapshot.paybackYears > 0 ? `${formatNumber(snapshot.paybackYears, 1)} yrs` : 'N/A'}
                </div>
                <ProgressBar value={snapshot.paybackProgressPct} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                <p className="text-[11px] text-[var(--text-tertiary)]">IRR</p>
                <div className="text-lg font-semibold text-[var(--text-primary)]">{formatNumber(snapshot.irrPct, 1)}%</div>
                <p className="text-[11px] text-[var(--text-tertiary)]">Discount {formatNumber(snapshot.discountRatePct, 1)}%</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
                <p className="text-[11px] text-[var(--text-tertiary)]">NPV</p>
                <div className="text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(snapshot.npvKes)}</div>
                <p className="text-[11px] text-[var(--text-tertiary)]">Horizon {snapshot.projectYears} yrs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scenario & sensitivity */}
        <div className="rounded-2xl border border-[var(--border-strong)] p-4 bg-[var(--bg-secondary)] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-[var(--text-tertiary)] font-semibold tracking-wider">Scenario & Sensitivity</p>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Live simulation</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setScenario({
                    chargingTariffKes: inputs.chargingTariffKes,
                    utilizationPct: snapshot.utilizationPct || inputs.targetUtilizationPct || 45,
                    stationCount: inputs.stationCount,
                    discountRatePct: inputs.discountRatePct,
                  })
                }
                className="rounded-full border border-[var(--border-strong)] px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--battery)] hover:text-[var(--battery)] transition"
              >
                Reset
              </button>
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
                <input
                  type="range"
                  min={15}
                  max={80}
                  step={1}
                  value={scenario.chargingTariffKes}
                  onChange={e => {
                    const chargingTariffKes = Number(e.target.value);
                    setScenario(prev => ({ ...prev, chargingTariffKes }));
                    onInputsChange({ ...inputs, chargingTariffKes });
                  }}
                  className="w-full accent-emerald-400"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Utilization (%)</span>
                  <span className="font-semibold text-[var(--text-primary)]">{formatNumber(scenario.utilizationPct, 0)}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={1}
                  value={scenario.utilizationPct}
                  onChange={e => {
                    const utilizationPct = Number(e.target.value);
                    setScenario(prev => ({ ...prev, utilizationPct }));
                    onInputsChange({ ...inputs, targetUtilizationPct: utilizationPct });
                  }}
                  className="w-full accent-emerald-400"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Stations</span>
                    <span className="font-semibold text-[var(--text-primary)]">{scenario.stationCount}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={scenario.stationCount}
                    onChange={e => {
                      const stationCount = Number(e.target.value);
                      setScenario(prev => ({ ...prev, stationCount }));
                      onInputsChange({ ...inputs, stationCount });
                    }}
                    className="w-full accent-emerald-400"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Discount rate (%)</span>
                    <span className="font-semibold text-[var(--text-primary)]">{formatNumber(scenario.discountRatePct, 1)}%</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    step={0.5}
                    value={scenario.discountRatePct}
                    onChange={e => {
                      const discountRatePct = Number(e.target.value);
                      setScenario(prev => ({ ...prev, discountRatePct }));
                      onInputsChange({ ...inputs, discountRatePct });
                    }}
                    className="w-full accent-emerald-400"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border)] p-3">
                <p className="text-[11px] text-[var(--text-tertiary)]">Scenario revenue / month</p>
                <div className="text-xl font-semibold text-[var(--text-primary)]">{formatCurrency(scenarioResult.revenueMonthly)}</div>
                <p className="text-[11px] text-[var(--battery)]">Δ vs base {formatCurrency(scenarioResult.revenueMonthly - snapshot.revenueMonthly)}</p>
              </div>
              <div className="rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border)] p-3">
                <p className="text-[11px] text-[var(--text-tertiary)]">Scenario net / month</p>
                <div className="text-xl font-semibold text-[var(--text-primary)]">{formatCurrency(scenarioResult.netMonthly)}</div>
                <p className="text-[11px] text-[var(--battery)]">Payback {scenarioResult.paybackYears ? `${formatNumber(scenarioResult.paybackYears, 1)} yrs` : 'N/A'}</p>
              </div>
              <div className="rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border)] p-3">
                <p className="text-[11px] text-[var(--text-tertiary)]">Scenario IRR</p>
                <div className="text-xl font-semibold text-[var(--text-primary)]">{formatNumber(scenarioResult.irrPct, 1)}%</div>
                <p className="text-[11px] text-[var(--text-tertiary)]">Discount {formatNumber(scenario.discountRatePct, 1)}%</p>
              </div>
              <div className="rounded-xl bg-[var(--bg-card-hover)] border border-[var(--border)] p-3">
                <p className="text-[11px] text-[var(--text-tertiary)]">Scenario NPV</p>
                <div className="text-xl font-semibold text-[var(--text-primary)]">{formatCurrency(scenarioResult.npvKes)}</div>
                <p className="text-[11px] text-[var(--text-tertiary)]">Horizon {snapshot.projectYears} yrs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio view */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-hover)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-[var(--text-tertiary)] font-semibold">Portfolio</p>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Fleet outlook</h3>
            </div>
            <DollarSign className="text-[var(--battery)]" size={18} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
              <p className="text-[11px] text-[var(--text-tertiary)]">Stations</p>
              <div className="text-lg font-semibold text-[var(--text-primary)]">{snapshot.stations}</div>
              <p className="text-[11px] text-[var(--text-tertiary)]">Utilization {formatNumber(snapshot.utilizationPct, 1)}%</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
              <p className="text-[11px] text-[var(--text-tertiary)]">Portfolio revenue / mo</p>
              <div className="text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(portfolioRevenue)}</div>
              <p className="text-[11px] text-[var(--text-tertiary)]">Net {formatCurrency(portfolioNet)}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
              <p className="text-[11px] text-[var(--text-tertiary)]">Portfolio IRR</p>
              <div className="text-lg font-semibold text-[var(--text-primary)]">{formatNumber(snapshot.irrPct, 1)}%</div>
              <p className="text-[11px] text-[var(--text-tertiary)]">Grid {formatCurrency(snapshot.gridBenchmarkKesPerKwh, 2)}/kWh</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3">
              <p className="text-[11px] text-[var(--text-tertiary)]">Blended LCOE</p>
              <div className="text-lg font-semibold text-[var(--text-primary)]">
                {formatCurrency(snapshot.lcoeKesPerKwh, 2)} / kWh
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Lifetime {formatNumber(snapshot.energy.lifetimeEnergyKWh / 1000, 1)} MWh
              </p>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </section>
  );
}
