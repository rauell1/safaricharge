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
  <div className="h-2.5 w-full rounded-full bg-slate-200">
    <div
      className="h-full rounded-full bg-emerald-500 transition-all"
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
    <section className="w-full max-w-7xl">
      <div className="rounded-3xl border border-slate-200 bg-white/90 shadow-2xl backdrop-blur p-4 md:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-slate-900">Investor Dashboard</h2>
            <p className="text-xs md:text-sm text-slate-500">Live financial layer wired to your SafariCharge simulation</p>
          </div>
        </div>

        {!hasSimulationData ? (
          <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
            <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <TrendingUp size={36} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-700">No Simulation Data Available</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                Run the simulation to generate live financial insights — revenue projections, payback period, IRR, NPV, and more.
              </p>
            </div>
            {onRunSimulation && (
              <button
                onClick={onRunSimulation}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition-colors"
              >
                <Play size={18} />
                Run Simulation
              </button>
            )}
          </div>
        ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">Revenue / Month</span>
              <DollarSign className="text-emerald-500" size={18} />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(snapshot.revenueMonthly)}</div>
            <p className="text-xs text-slate-500 mt-1">
              Revenue per station: {formatCurrency(snapshot.revenuePerStationDay * 30)} / mo
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-700">Net Profit / Month</span>
              <TrendingUp className="text-indigo-500" size={18} />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(snapshot.netMonthly)}</div>
            <p className="text-xs text-slate-500 mt-1">Margin {formatNumber(marginPct, 1)}%</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700">Payback Progress</span>
              <Gauge className="text-amber-500" size={18} />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatNumber(snapshot.paybackProgressPct, 1)}%
            </div>
            <ProgressBar value={snapshot.paybackProgressPct} />
            <p className="text-xs text-slate-500 mt-1">Projected payback: {formatNumber(snapshot.paybackYears, 1)} yrs</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-700">LCOE</span>
              <LineChart className="text-sky-500" size={18} />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatCurrency(snapshot.lcoeKesPerKwh, 2)} / kWh
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Grid benchmark {formatCurrency(snapshot.gridBenchmarkKesPerKwh, 2)} / kWh
            </p>
          </div>
        </div>

        {/* Financial analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold">Capex & Opex</p>
                <h3 className="text-base font-bold text-slate-900">Cost structure</h3>
              </div>
              <PieChart className="text-slate-400" size={18} />
            </div>
            <div className="mt-3 space-y-3">
              {[
                { label: 'Solar', value: snapshot.capex.solar, tone: 'bg-emerald-200' },
                { label: 'Battery', value: snapshot.capex.battery, tone: 'bg-amber-200' },
                { label: 'Inverter', value: snapshot.capex.inverter, tone: 'bg-sky-200' },
                { label: 'Installation', value: snapshot.capex.installation, tone: 'bg-slate-200' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full ${item.tone}`} />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>{item.label}</span>
                      <span className="font-semibold text-slate-800">{formatCurrency(item.value)}</span>
                    </div>
                    <ProgressBar value={(item.value / snapshot.capex.total) * 100} />
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Capex</span>
                <span>{formatCurrency(snapshot.capex.total)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] text-slate-500">Opex / Month</p>
                  <div className="text-lg font-semibold text-slate-900">{formatCurrency(snapshot.opex.total)}</div>
                  <p className="text-[11px] text-slate-500">
                    Maint {formatCurrency(snapshot.opex.maintenance, 0)} • Ins {formatCurrency(snapshot.opex.insurance, 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] text-slate-500">Lifetime Energy</p>
                  <div className="text-lg font-semibold text-slate-900">
                    {formatNumber(snapshot.energy.lifetimeEnergyKWh / 1000, 1)} MWh
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Daily solar {formatNumber(snapshot.energy.avgDailySolarKWh, 1)} kWh
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500 font-semibold">Profit engine</p>
                <h3 className="text-base font-bold text-slate-900">Returns & payback</h3>
              </div>
              <TrendingUp className="text-emerald-500" size={18} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] text-slate-500">Net / Month</p>
                <div className="text-lg font-semibold text-slate-900">{formatCurrency(snapshot.netMonthly)}</div>
                <p className="text-[11px] text-slate-500">Margin {formatNumber(marginPct, 1)}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] text-slate-500">Payback</p>
                <div className="text-lg font-semibold text-slate-900">
                  {snapshot.paybackYears > 0 ? `${formatNumber(snapshot.paybackYears, 1)} yrs` : 'N/A'}
                </div>
                <ProgressBar value={snapshot.paybackProgressPct} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] text-slate-500">IRR</p>
                <div className="text-lg font-semibold text-slate-900">{formatNumber(snapshot.irrPct, 1)}%</div>
                <p className="text-[11px] text-slate-500">Discount {formatNumber(snapshot.discountRatePct, 1)}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] text-slate-500">NPV</p>
                <div className="text-lg font-semibold text-slate-900">{formatCurrency(snapshot.npvKes)}</div>
                <p className="text-[11px] text-slate-500">Horizon {snapshot.projectYears} yrs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Scenario & sensitivity */}
        <div className="rounded-2xl border border-slate-200 p-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-300 font-semibold">Scenario & Sensitivity</p>
              <h3 className="text-base font-bold">Live simulation</h3>
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
                className="rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold text-white hover:border-white/40 transition"
              >
                Reset
              </button>
              <Gauge size={18} className="text-emerald-300" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between text-slate-200">
                  <span>Charging tariff (KES/kWh)</span>
                  <span className="font-semibold">{formatNumber(scenario.chargingTariffKes, 0)}</span>
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
                <div className="flex justify-between text-slate-200">
                  <span>Utilization (%)</span>
                  <span className="font-semibold">{formatNumber(scenario.utilizationPct, 0)}%</span>
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

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between text-slate-200">
                    <span>Stations</span>
                    <span className="font-semibold">{scenario.stationCount}</span>
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
                  <div className="flex justify-between text-slate-200">
                    <span>Discount rate (%)</span>
                    <span className="font-semibold">{formatNumber(scenario.discountRatePct, 1)}%</span>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <p className="text-[11px] text-slate-200">Scenario revenue / month</p>
                <div className="text-xl font-semibold text-white">{formatCurrency(scenarioResult.revenueMonthly)}</div>
                <p className="text-[11px] text-emerald-200">Δ vs base {formatCurrency(scenarioResult.revenueMonthly - snapshot.revenueMonthly)}</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <p className="text-[11px] text-slate-200">Scenario net / month</p>
                <div className="text-xl font-semibold text-white">{formatCurrency(scenarioResult.netMonthly)}</div>
                <p className="text-[11px] text-emerald-200">Payback {scenarioResult.paybackYears ? `${formatNumber(scenarioResult.paybackYears, 1)} yrs` : 'N/A'}</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <p className="text-[11px] text-slate-200">Scenario IRR</p>
                <div className="text-xl font-semibold text-white">{formatNumber(scenarioResult.irrPct, 1)}%</div>
                <p className="text-[11px] text-slate-200">Discount {formatNumber(scenario.discountRatePct, 1)}%</p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <p className="text-[11px] text-slate-200">Scenario NPV</p>
                <div className="text-xl font-semibold text-white">{formatCurrency(scenarioResult.npvKes)}</div>
                <p className="text-[11px] text-slate-200">Horizon {snapshot.projectYears} yrs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio view */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">Portfolio</p>
              <h3 className="text-base font-bold text-slate-900">Fleet outlook</h3>
            </div>
            <DollarSign className="text-emerald-500" size={18} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] text-slate-500">Stations</p>
              <div className="text-lg font-semibold text-slate-900">{snapshot.stations}</div>
              <p className="text-[11px] text-slate-500">Utilization {formatNumber(snapshot.utilizationPct, 1)}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] text-slate-500">Portfolio revenue / mo</p>
              <div className="text-lg font-semibold text-slate-900">{formatCurrency(portfolioRevenue)}</div>
              <p className="text-[11px] text-slate-500">Net {formatCurrency(portfolioNet)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] text-slate-500">Portfolio IRR</p>
              <div className="text-lg font-semibold text-slate-900">{formatNumber(snapshot.irrPct, 1)}%</div>
              <p className="text-[11px] text-slate-500">Grid {formatCurrency(snapshot.gridBenchmarkKesPerKwh, 2)}/kWh</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] text-slate-500">Blended LCOE</p>
              <div className="text-lg font-semibold text-slate-900">
                {formatCurrency(snapshot.lcoeKesPerKwh, 2)} / kWh
              </div>
              <p className="text-[11px] text-slate-500">
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
