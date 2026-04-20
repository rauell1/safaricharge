'use client';

import React, { useState, useCallback } from 'react';
import {
  TrendingUp,
  Calculator,
  DollarSign,
  BarChart2,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KpiCard } from '@/components/charts/KpiCard';
import { PageContainer, SectionHeader, ContentGrid, FormSection } from '@/components/layout/PageContainer';
import type { FinancialSnapshot } from '@/lib/financial-dashboard';

/** Years between battery replacements (LFP/NMC typical cycle life at ~80% DoD) */
const BATTERY_REPLACEMENT_YEARS = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinancialFormValues {
  solarCapacityKw: number;
  batteryKwh: number;
  inverterKw: number;
  installationCostKes: number;
  chargingTariffKes: number;
  gridTariffKes: number;
  discountRatePct: number;
  projectYears: number;
  stationCount: number;
  targetUtilizationPct: number;
  maintenancePct: number;
  insurancePct: number;
}

const DEFAULT_FORM: FinancialFormValues = {
  solarCapacityKw: 15,
  batteryKwh: 20,
  inverterKw: 10,
  installationCostKes: 150000,
  chargingTariffKes: 25,
  gridTariffKes: 18.5,
  discountRatePct: 12,
  projectYears: 20,
  stationCount: 1,
  targetUtilizationPct: 50,
  maintenancePct: 2,
  insurancePct: 0.5,
};

// ─── Components ───────────────────────────────────────────────────────────────

function SliderRow({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
  unit,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="text-xs text-[var(--text-secondary)] font-medium">
          {label}
        </label>
        <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums">
          {value.toLocaleString()}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-[var(--battery)] cursor-pointer"
      />
    </div>
  );
}

function NumberInput({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
  unit,
}: {
  id: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs text-[var(--text-secondary)] font-medium">
        {label} {unit && <span className="text-[var(--text-tertiary)]">({unit})</span>}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-card-muted)] text-[var(--text-primary)] px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--battery)]"
      />
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] pt-3 pb-1 border-t border-[var(--border)] first:border-t-0 first:pt-0">
      {children}
    </h3>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FinancialPage() {
  const [form, setForm] = useState<FinancialFormValues>(DEFAULT_FORM);
  const [snapshot, setSnapshot] = useState<FinancialSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(
    <K extends keyof FinancialFormValues>(key: K, value: FinancialFormValues[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleCalculate = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const body = {
        inputs: {
          chargingTariffKes: form.chargingTariffKes,
          discountRatePct: form.discountRatePct,
          stationCount: form.stationCount,
          targetUtilizationPct: form.targetUtilizationPct,
          projectYears: form.projectYears,
        },
        solarCapacityKw: form.solarCapacityKw,
        evCapacityKw: form.stationCount * 7.4,
        dailySolarKwh: form.solarCapacityKw * 0.18 * 24,
        dailyEvKwh: form.stationCount * 20,
      };

      const res = await fetch('/api/simulation/financial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { snapshot: FinancialSnapshot };
      setSnapshot(data.snapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [form]);

  // ── Cash-flow chart data ─────────────────────────────────────────────────

  const cashFlowData = React.useMemo(() => {
    if (!snapshot) return [];
    const annualNet = snapshot.netMonthly * 12;
    let cumulative = -snapshot.capex.total;
    const years: { year: string; annual: number; cumulative: number }[] = [
      { year: 'Y0', annual: -snapshot.capex.total, cumulative },
    ];
    for (let y = 1; y <= snapshot.projectYears; y++) {
      const replacement = snapshot.capex.battery > 0 && y % BATTERY_REPLACEMENT_YEARS === 0 ? snapshot.capex.battery : 0;
      const cf = annualNet - replacement;
      cumulative += cf;
      years.push({ year: `Y${y}`, annual: cf, cumulative });
    }
    return years;
  }, [snapshot]);

  const annualSavingsData = React.useMemo(() => {
    if (!snapshot) return [];
    return Array.from({ length: Math.min(25, snapshot.projectYears) }, (_, i) => ({
      year: `Y${i + 1}`,
      savings: snapshot.revenueMonthly * 12,
      opex: snapshot.opex.total * 12,
    }));
  }, [snapshot]);

  // ── Scenario comparison ─────────────────────────────────────────────────

  const scenarioRows = React.useMemo(() => {
    if (!snapshot) return [];
    const annualNet = snapshot.netMonthly * 12;
    const noBattery = {
      label: 'No Battery',
      lcoe: snapshot.lcoeKesPerKwh * 1.15,
      payback: snapshot.paybackYears * 1.4,
      npv: Math.round(snapshot.npvKes * 0.7),
      irr: snapshot.irrPct * 0.65,
    };
    const optimised = {
      label: 'Optimised (85%)',
      lcoe: snapshot.lcoeKesPerKwh * 0.88,
      payback: snapshot.paybackYears * 0.82,
      npv: Math.round(snapshot.npvKes * 1.3),
      irr: snapshot.irrPct * 1.25,
    };
    return [
      {
        label: 'Current',
        lcoe: snapshot.lcoeKesPerKwh,
        payback: snapshot.paybackYears,
        npv: snapshot.npvKes,
        irr: snapshot.irrPct,
        annualNet,
      },
      { ...noBattery, annualNet: annualNet * 0.65 },
      { ...optimised, annualNet: annualNet * 1.22 },
    ];
  }, [snapshot]);

  return (
    <DashboardLayout activeSection="financial-model">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-6 pb-2 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[var(--battery-soft)] border border-[var(--battery)]/30 flex items-center justify-center text-[var(--battery)]">
          <TrendingUp size={18} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Finance Planner (Standalone)</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Independent what-if model: LCOE · Payback · NPV · IRR — {form.projectYears}-year projection
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-10 mt-4">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(24rem,1fr)]">
          {/* ═══ Left: Inputs ════════════════════════════════════════ */}
          <div className="w-full min-w-0 space-y-4">
            <Card className="dashboard-card">
              <CardHeader className="px-4 sm:px-6 pt-4 pb-2 flex flex-row items-center gap-2">
                <Calculator className="h-4 w-4 text-[var(--battery)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  System &amp; Financial Inputs
                </h2>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 space-y-3">
                {/* Equipment Costs */}
                <SectionHeading>Equipment Costs</SectionHeading>
                <SliderRow
                  id="solar-cap"
                  label="Solar Capacity"
                  min={1}
                  max={100}
                  step={1}
                  value={form.solarCapacityKw}
                  onChange={(v) => set('solarCapacityKw', v)}
                  unit=" kW"
                />
                <SliderRow
                  id="battery-kwh"
                  label="Battery Capacity"
                  min={5}
                  max={200}
                  step={5}
                  value={form.batteryKwh}
                  onChange={(v) => set('batteryKwh', v)}
                  unit=" kWh"
                />
                <SliderRow
                  id="inverter-kw"
                  label="Inverter Rating"
                  min={1}
                  max={50}
                  step={1}
                  value={form.inverterKw}
                  onChange={(v) => set('inverterKw', v)}
                  unit=" kW"
                />
                <NumberInput
                  id="install-cost"
                  label="Installation Cost"
                  min={0}
                  step={10000}
                  value={form.installationCostKes}
                  onChange={(v) => set('installationCostKes', v)}
                  unit="KES"
                />

                {/* O&M */}
                <SectionHeading>O&amp;M</SectionHeading>
                <SliderRow
                  id="maint-pct"
                  label="Maintenance (% of CapEx/yr)"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={form.maintenancePct}
                  onChange={(v) => set('maintenancePct', v)}
                  unit="%"
                />
                <SliderRow
                  id="insurance-pct"
                  label="Insurance (% of CapEx/yr)"
                  min={0.1}
                  max={2}
                  step={0.1}
                  value={form.insurancePct}
                  onChange={(v) => set('insurancePct', v)}
                  unit="%"
                />

                {/* Financial Parameters */}
                <SectionHeading>Financial Parameters</SectionHeading>
                <SliderRow
                  id="discount-rate"
                  label="Discount Rate"
                  min={5}
                  max={30}
                  step={1}
                  value={form.discountRatePct}
                  onChange={(v) => set('discountRatePct', v)}
                  unit="%"
                />
                <SliderRow
                  id="project-years"
                  label="Project Lifetime"
                  min={5}
                  max={30}
                  step={1}
                  value={form.projectYears}
                  onChange={(v) => set('projectYears', v)}
                  unit=" yrs"
                />

                {/* Tariffs */}
                <SectionHeading>Tariffs</SectionHeading>
                <SliderRow
                  id="charging-tariff"
                  label="Charging Tariff"
                  min={10}
                  max={60}
                  step={1}
                  value={form.chargingTariffKes}
                  onChange={(v) => set('chargingTariffKes', v)}
                  unit=" KES/kWh"
                />
                <SliderRow
                  id="grid-tariff"
                  label="Grid Tariff (benchmark)"
                  min={5}
                  max={40}
                  step={0.5}
                  value={form.gridTariffKes}
                  onChange={(v) => set('gridTariffKes', v)}
                  unit=" KES/kWh"
                />
                <SliderRow
                  id="station-count"
                  label="EV Stations"
                  min={1}
                  max={20}
                  step={1}
                  value={form.stationCount}
                  onChange={(v) => set('stationCount', v)}
                />
                <SliderRow
                  id="utilization-pct"
                  label="Target Utilisation"
                  min={10}
                  max={100}
                  step={5}
                  value={form.targetUtilizationPct}
                  onChange={(v) => set('targetUtilizationPct', v)}
                  unit="%"
                />

                <div className="pt-2">
                  <Button
                    onClick={handleCalculate}
                    disabled={loading}
                    className="w-full gap-2 bg-[var(--battery)] hover:bg-[var(--battery)]/90 text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Calculating…
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4" />
                        Calculate
                      </>
                    )}
                  </Button>
                  {error && (
                    <p className="text-xs text-[var(--alert)] mt-2 text-center">{error}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ═══ Right: Results ══════════════════════════════════════ */}
          <div className="space-y-4">
            {/* KPI cards */}
            {snapshot ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <KpiCard
                    label="LCOE"
                    value={snapshot.lcoeKesPerKwh.toFixed(1)}
                    unit="KES/kWh"
                    color="var(--solar)"
                  />
                  <KpiCard
                    label="Payback"
                    value={snapshot.paybackYears.toFixed(1)}
                    unit="years"
                    color="var(--battery)"
                  />
                  <KpiCard
                    label="NPV"
                    value={`KES ${(snapshot.npvKes / 1000).toFixed(0)}k`}
                    color="var(--grid)"
                  />
                  <KpiCard
                    label="IRR"
                    value={`${snapshot.irrPct.toFixed(1)}`}
                    unit="%"
                    color="var(--ev)"
                  />
                  <KpiCard
                    label="Monthly Revenue"
                    value={`KES ${(snapshot.revenueMonthly / 1000).toFixed(1)}k`}
                    color="var(--solar)"
                  />
                  <KpiCard
                    label="Utilisation"
                    value={`${snapshot.utilizationPct.toFixed(0)}`}
                    unit="%"
                    color="var(--battery)"
                  />
                </div>

                {/* Cumulative cash flow */}
                <Card className="dashboard-card">
                  <CardHeader className="px-4 sm:px-6 pt-4 pb-2 flex flex-row items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-[var(--battery)]" />
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Cumulative Cash Flow
                    </h3>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={cashFlowData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                        <defs>
                          <linearGradient id="cfGradPos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--battery)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--battery)" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="cfGradNeg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--alert)" stopOpacity={0.0} />
                            <stop offset="95%" stopColor="var(--alert)" stopOpacity={0.3} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false}
                          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
                          formatter={(v: number) => [`KES ${v.toLocaleString()}`, 'Cumulative']}
                        />
                        <ReferenceLine y={0} stroke="var(--text-tertiary)" strokeDasharray="4 4" />
                        <Area type="monotone" dataKey="cumulative" stroke="var(--battery)" strokeWidth={2}
                          fill="url(#cfGradPos)" dot={false} name="Cumulative CF" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Annual savings bar chart */}
                <Card className="dashboard-card">
                  <CardHeader className="px-4 sm:px-6 pt-4 pb-2 flex flex-row items-center gap-2">
                    <DollarSign className="h-4 w-4 text-[var(--solar)]" />
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Annual Savings vs. OpEx
                    </h3>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={annualSavingsData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                        <XAxis dataKey="year" tick={{ fontSize: 9, fill: 'var(--text-tertiary)' }} tickLine={false}
                          interval={Math.floor(form.projectYears / 5)} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false}
                          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
                          formatter={(v: number) => [`KES ${v.toLocaleString()}`]}
                        />
                        <Bar dataKey="savings" fill="var(--battery)" fillOpacity={0.85} name="Revenue" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="opex" fill="var(--alert)" fillOpacity={0.7} name="OpEx" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Scenario comparison */}
                <Card className="dashboard-card">
                  <CardHeader className="px-4 sm:px-6 pt-4 pb-2">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      Scenario Comparison
                    </h3>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--border)]">
                          {['Scenario', 'LCOE', 'Payback', 'NPV', 'IRR'].map((h) => (
                            <th key={h} className="py-2 pr-3 text-left font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {scenarioRows.map((row, i) => (
                          <tr key={row.label} className={`border-b border-[var(--border)] ${i === 0 ? 'font-semibold' : ''}`}>
                            <td className={`py-2 pr-3 ${i === 0 ? 'text-[var(--battery)]' : 'text-[var(--text-primary)]'}`}>
                              {row.label}
                            </td>
                            <td className="py-2 pr-3 text-[var(--text-primary)] tabular-nums">
                              {row.lcoe.toFixed(1)} KES/kWh
                            </td>
                            <td className="py-2 pr-3 text-[var(--text-primary)] tabular-nums">
                              {row.payback.toFixed(1)} yr
                            </td>
                            <td className="py-2 pr-3 text-[var(--text-primary)] tabular-nums">
                              KES {(row.npv / 1000).toFixed(0)}k
                            </td>
                            <td className="py-2 pr-3 text-[var(--text-primary)] tabular-nums">
                              {row.irr.toFixed(1)} %
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex w-full flex-col items-center justify-center gap-4 py-24 text-center">
                <div className="h-16 w-16 rounded-full bg-[var(--battery-soft)] flex items-center justify-center">
                  <Calculator className="h-7 w-7 text-[var(--battery)]" />
                </div>
                <div className="sc-readable-panel">
                  <p className="text-base font-semibold text-[var(--text-primary)]">
                    Ready to run the model
                  </p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Update the inputs on the left, then click <strong>Calculate</strong> to generate
                    projected cash flow, NPV, and payback metrics.
                  </p>
                </div>
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Computing…
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
