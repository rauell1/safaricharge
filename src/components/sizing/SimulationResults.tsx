'use client';

import { useState } from 'react';
import {
  TrendingUp,
  Zap,
  Globe,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp,
  Award,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { SimulationResults as SimResultsType } from '@/lib/sizing/solarCalculator';

interface SimulationResultsProps {
  results: SimResultsType;
  activeOrgName: string;
  onViewProposal: () => void;
}

export default function SimulationResults({ results, activeOrgName, onViewProposal }: SimulationResultsProps) {
  const [activeTab, setActiveTab] = useState<'charts' | 'capex' | 'cashflow'>('charts');
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [showFullTable, setShowFullTable] = useState(false);

  const {
    solarCapacityKWp,
    batteryCapacityKWh,
    inverterCapacityKW,
    panelAreaRequiredM2,
    hourlyProfile,
    annualLoadKWh,
    annualPVGeneratedKWh,
    annualGridImportKWh,
    annualGridExportKWh,
    annualDieselGenKWh,
    annualDieselFuelLiters,
    annualUnservedLoadKWh,
    solarSelfConsumptionPercent,
    systemAutonomyPercent,
    capexItems,
    subtotalCapExUSD,
    contingencyUSD,
    epcMarginUSD,
    totalCapExUSD,
    baselineAnnualCostUSD,
    annualGridBillWithoutSolarUSD,
    annualDieselCostWithoutSolarUSD,
    annualGridBillWithSolarUSD,
    annualDieselCostWithSolarUSD,
    annualMaintenanceUSD,
    annualInsuranceUSD,
    annualBatteryReserveUSD,
    totalAnnualOpExUSD,
    annualSavingsUSD,
    simplePaybackYears,
    lcoeUSDPerKWh,
    lcoeBaselineUSDPerKWh,
    npvUSD,
    irrPercent,
    annualCO2SavedTons,
    equivalentTreesPlanted,
    cashFlows,
    pvOversizeWarning,
    batteryVoltageWarning,
    systemArchitecture,
    touTariff,
    financing,
    extraMetrics
  } = results;

  const chartHeight = 200;
  const chartWidth = 720;
  const paddingLeft = 40;
  const paddingRight = 40;
  const paddingTop = 20;
  const paddingBottom = 20;

  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  const maxPowerVal = Math.max(
    ...hourlyProfile.map(r => Math.max(r.loadKW, r.solarKW, r.gridImportKW, r.dieselGenKW, 5))
  );

  const getX = (hour: number) => paddingLeft + (hour / 23) * graphWidth;
  const getY = (value: number) => chartHeight - paddingBottom - (value / maxPowerVal) * graphHeight;
  const getSoCY = (socVal: number) => chartHeight - paddingBottom - (socVal / 100) * graphHeight;

  let pvPath = `M ${getX(0)} ${getY(0)}`;
  for (let h = 1; h < 24; h++) {
    pvPath += ` L ${getX(h)} ${getY(hourlyProfile[h].solarKW)}`;
  }
  pvPath += ` L ${getX(23)} ${getY(0)} Z`;

  let loadPath = `M ${getX(0)} ${getY(hourlyProfile[0].loadKW)}`;
  for (let h = 1; h < 24; h++) {
    loadPath += ` L ${getX(h)} ${getY(hourlyProfile[h].loadKW)}`;
  }

  let socPath = `M ${getX(0)} ${getSoCY(hourlyProfile[0].batterySoCAfter)}`;
  for (let h = 1; h < 24; h++) {
    socPath += ` L ${getX(h)} ${getSoCY(hourlyProfile[h].batterySoCAfter)}`;
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - svgRect.left;
    const relativeX = clientX - paddingLeft;
    if (relativeX >= 0 && relativeX <= graphWidth) {
      const hour = Math.round((relativeX / graphWidth) * 23);
      if (hour >= 0 && hour <= 23) setHoveredHour(hour);
    } else {
      setHoveredHour(null);
    }
  };

  const cfChartWidth = 720;
  const cfChartHeight = 180;
  const maxCFVal = Math.max(...cashFlows.map(cf => Math.abs(cf.cumulativeCashFlow)), totalCapExUSD);

  const getCFX = (year: number) => paddingLeft + (year / 25) * (cfChartWidth - paddingLeft - paddingRight);
  const getCFY = (cfVal: number) => {
    const zeroY = cfChartHeight / 2 + 10;
    const scale = (cfChartHeight - 40) / (2 * maxCFVal);
    return zeroY - cfVal * scale;
  };

  let cfLinePath = `M ${getCFX(0)} ${getCFY(cashFlows[0].cumulativeCashFlow)}`;
  for (let y = 1; y <= 25; y++) {
    cfLinePath += ` L ${getCFX(y)} ${getCFY(cashFlows[y].cumulativeCashFlow)}`;
  }

  return (
    <div className="space-y-8">
      {/* Engineering validation warnings */}
      {(pvOversizeWarning || batteryVoltageWarning) && (
        <div className="space-y-2">
          {pvOversizeWarning && (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--alert)]/20 bg-[var(--alert-soft)] p-3 text-sm text-[var(--alert)]">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{pvOversizeWarning}</span>
            </div>
          )}
          {batteryVoltageWarning && (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--solar)]/30 bg-[var(--solar-soft)] p-3 text-sm text-[var(--solar)]">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{batteryVoltageWarning}</span>
            </div>
          )}
        </div>
      )}

      {/* 1. Main Bankability Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--battery-soft)] rounded-full -mr-4 -mt-4" />
          <span className="text-xs font-semibold text-[var(--text-tertiary)]">Simple Payback</span>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-[var(--battery)] font-mono">{simplePaybackYears}</span>
            <span className="text-xs text-[var(--text-tertiary)] font-semibold">Years</span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
            <Clock className="w-3 h-3 text-[var(--battery)]" /> Payback vs 25y system lifespan
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--grid-soft)] rounded-full -mr-4 -mt-4" />
          <span className="text-xs font-semibold text-[var(--text-tertiary)]">Net Present Value (NPV)</span>
          <div className="my-2 flex items-baseline gap-0.5">
            <span className="text-2xl font-extrabold text-[var(--grid)] font-mono">
              ${npvUSD.toLocaleString()}
            </span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-[var(--grid)]" /> @ {results.inputs.discountRate}% discount rate
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-full -mr-4 -mt-4" />
          <span className="text-xs font-semibold text-[var(--text-tertiary)]">Internal Rate of Return</span>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-purple-700 font-mono">{irrPercent}%</span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
            <Award className="w-3 h-3 text-purple-700" /> Highly bankable yield profile
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-teal-50 rounded-full -mr-4 -mt-4" />
          <span className="text-xs font-semibold text-[var(--text-tertiary)]">Levelized Cost (LCOE)</span>
          <div className="my-2 flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-teal-700 font-mono">${lcoeUSDPerKWh}</span>
              <span className="text-[10px] text-[var(--text-tertiary)]">/ kWh</span>
            </div>
            <span className="text-[9px] text-[var(--text-tertiary)] line-through">Grid Baseline: ${lcoeBaselineUSDPerKWh}/kWh</span>
          </div>
          <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
            <Zap className="w-3 h-3 text-teal-700" /> {lcoeBaselineUSDPerKWh > 0 && lcoeUSDPerKWh < lcoeBaselineUSDPerKWh
              ? `Saves ${(((lcoeBaselineUSDPerKWh - lcoeUSDPerKWh) / lcoeBaselineUSDPerKWh) * 100).toFixed(0)}% per unit of energy vs grid`
              : 'Compare against the grid tariff baseline'}
          </div>
        </div>
      </div>

      {/* 1.5 Extended Financial Metrics */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h4 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
            Extended Investment Metrics
          </h4>
          {systemArchitecture === 'microinverter' && (
            <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-mono border border-purple-200">
              Microinverter System (AC-coupled)
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center">
          <div className="bg-[var(--bg-card-muted)] p-3 rounded-lg border border-[var(--border)]">
            <span className="block text-[9px] text-[var(--text-muted)] uppercase font-mono">Discounted Payback</span>
            <span className="text-sm font-extrabold text-[var(--text-primary)] font-mono">{extraMetrics.discountedPaybackYears} yrs</span>
          </div>
          <div className="bg-[var(--bg-card-muted)] p-3 rounded-lg border border-[var(--border)]">
            <span className="block text-[9px] text-[var(--text-muted)] uppercase font-mono">Modified IRR (MIRR)</span>
            <span className="text-sm font-extrabold text-[var(--text-primary)] font-mono">{extraMetrics.mirrPercent}%</span>
          </div>
          <div className="bg-[var(--bg-card-muted)] p-3 rounded-lg border border-[var(--border)]">
            <span className="block text-[9px] text-[var(--text-muted)] uppercase font-mono">Lifetime ROI</span>
            <span className="text-sm font-extrabold text-[var(--text-primary)] font-mono">{extraMetrics.roiPercent}%</span>
          </div>
          <div className="bg-[var(--bg-card-muted)] p-3 rounded-lg border border-[var(--border)]">
            <span className="block text-[9px] text-[var(--text-muted)] uppercase font-mono">Profitability Index</span>
            <span className="text-sm font-extrabold text-[var(--text-primary)] font-mono">{extraMetrics.profitabilityIndex}x</span>
          </div>
          <div className="bg-[var(--bg-card-muted)] p-3 rounded-lg border border-[var(--border)]">
            <span className="block text-[9px] text-[var(--text-muted)] uppercase font-mono">Savings-to-Invest Ratio</span>
            <span className="text-sm font-extrabold text-[var(--text-primary)] font-mono">{extraMetrics.savingsToInvestmentRatio}x</span>
          </div>
        </div>

        {touTariff && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-wrap gap-4 text-xs font-mono text-[var(--text-tertiary)]">
            <span>KPLC Category: <strong className="text-[var(--text-primary)]">{touTariff.category}</strong></span>
            <span>Peak Tariff: <strong className="text-[var(--text-primary)]">KSh {touTariff.effectivePeakTariffKShPerKWh}/kWh</strong></span>
            {touTariff.effectiveOffPeakTariffKShPerKWh != null && (
              <span>Off-Peak Tariff: <strong className="text-[var(--text-primary)]">KSh {touTariff.effectiveOffPeakTariffKShPerKWh}/kWh</strong></span>
            )}
            <span>Blended Tariff: <strong className="text-[var(--battery)]">KSh {touTariff.blendedTariffKShPerKWh}/kWh</strong></span>
          </div>
        )}

        {financing.loanAmountUSD > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <span className="block text-[9px] text-purple-700 uppercase font-mono">Loan Amount</span>
              <span className="text-sm font-extrabold text-purple-700 font-mono">${financing.loanAmountUSD.toLocaleString()}</span>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <span className="block text-[9px] text-purple-700 uppercase font-mono">Equity</span>
              <span className="text-sm font-extrabold text-purple-700 font-mono">${financing.equityUSD.toLocaleString()}</span>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <span className="block text-[9px] text-purple-700 uppercase font-mono">DSCR</span>
              <span className="text-sm font-extrabold text-purple-700 font-mono">{financing.dscr}x</span>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <span className="block text-[9px] text-purple-700 uppercase font-mono">Year-1 ROE</span>
              <span className="text-sm font-extrabold text-purple-700 font-mono">{financing.roePercent}%</span>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <span className="block text-[9px] text-purple-700 uppercase font-mono">Equity Payback</span>
              <span className="text-sm font-extrabold text-purple-700 font-mono">{financing.equityPaybackYears} yrs</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Technical System Specifications Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-[var(--border)] pb-3">
          <h4 className="text-xs font-bold text-[var(--battery)] uppercase tracking-wider">
            Optimized System Configuration Summary
          </h4>
          <span className="text-[10px] bg-[var(--bg-card-muted)] text-[var(--text-tertiary)] px-2 py-0.5 rounded font-mono">
            Active Tenant: {activeOrgName}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 text-center">
          <div className="bg-[var(--bg-card-muted)] p-3 rounded-lg border border-[var(--border)]">
            <span className="block text-[10px] text-[var(--text-muted)] uppercase font-mono">PV Array Size</span>
            <span className="text-base font-extrabold text-[var(--text-primary)] font-mono">{solarCapacityKWp} kWp</span>
          </div>
          <div className="bg-[var(--bg-card-muted)] p-3 rounded-lg border border-[var(--border)]">
            <span className="block text-[10px] text-[var(--text-muted)] uppercase font-mono">Battery Storage</span>
            <span className="text-base font-extrabold text-[var(--text-primary)] font-mono">{batteryCapacityKWh} kWh</span>
          </div>
          <div className="bg-[var(--bg-card-muted)] p-3 rounded-lg border border-[var(--border)]">
            <span className="block text-[10px] text-[var(--text-muted)] uppercase font-mono">Inverter Rating</span>
            <span className="text-base font-extrabold text-[var(--text-primary)] font-mono">{inverterCapacityKW} kW</span>
          </div>
          <div className="bg-[var(--bg-card-muted)] p-3 rounded-lg border border-[var(--border)]">
            <span className="block text-[10px] text-[var(--text-muted)] uppercase font-mono">Roof Space Area</span>
            <span className="text-base font-extrabold text-[var(--text-primary)] font-mono">{panelAreaRequiredM2} m²</span>
          </div>
          <div className="bg-[var(--bg-card-muted)] p-3 rounded-lg border border-[var(--border)]">
            <span className="block text-[10px] text-[var(--text-muted)] uppercase font-mono">PV Self-Consume</span>
            <span className="text-base font-extrabold text-[var(--text-primary)] font-mono">{solarSelfConsumptionPercent}%</span>
          </div>
          <div className="bg-[var(--bg-card-muted)] p-3 rounded-lg border border-[var(--border)]">
            <span className="block text-[10px] text-[var(--text-muted)] uppercase font-mono">System Autonomy</span>
            <span className="text-base font-extrabold text-[var(--text-primary)] font-mono">{systemAutonomyPercent}%</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono text-[var(--text-tertiary)]">
          <div>
            <span className="text-[var(--text-muted)] text-[9px] block">ANNUAL ENERGY DEMAND:</span>
            <span className="text-[var(--text-primary)] font-bold">{annualLoadKWh.toLocaleString()} kWh</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)] text-[9px] block">ANNUAL SOLAR GENERATION:</span>
            <span className="text-[var(--text-primary)] font-bold text-[var(--solar)]">{annualPVGeneratedKWh.toLocaleString()} kWh</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)] text-[9px] block">ANNUAL UTILITY IMPORT:</span>
            <span className="text-[var(--text-primary)] font-bold text-[var(--alert)]">{annualGridImportKWh.toLocaleString()} kWh</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)] text-[9px] block">ANNUAL NET SOLAR EXPORT:</span>
            <span className="text-[var(--text-primary)] font-bold text-[var(--grid)]">{annualGridExportKWh.toLocaleString()} kWh</span>
          </div>
          <div className="col-span-2 md:col-span-1">
            <span className="text-[var(--text-muted)] text-[9px] block">SELF-CONSUMED ON-SITE:</span>
            <span className="font-bold text-[var(--battery)]">{results.selfConsumedKWh.toLocaleString()} kWh</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-[var(--border)] flex gap-4">
        <button
          onClick={() => setActiveTab('charts')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'charts'
              ? 'border-[var(--battery)] text-[var(--battery)]'
              : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
          }`}
        >
          📈 Performance & Cash Flow Charts
        </button>
        <button
          onClick={() => setActiveTab('capex')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'capex'
              ? 'border-[var(--battery)] text-[var(--battery)]'
              : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
          }`}
        >
          💵 CapEx & OpEx Ledger
        </button>
        <button
          onClick={() => setActiveTab('cashflow')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'cashflow'
              ? 'border-[var(--battery)] text-[var(--battery)]'
              : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
          }`}
        >
          📊 25-Year Lifecycle Cash Flow
        </button>
      </div>

      {/* Tab 1: Interactive Performance Charts */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          {/* 24h Dispatch Chart */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Illustrative 24-Hour Energy Balance</h3>
                <p className="text-xs text-[var(--text-tertiary)]">
                  Typical-day power flow scaled to the annual generation model. Hover to view hourly detail.
                </p>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 text-[10px] font-mono text-[var(--text-tertiary)]">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-1.5 bg-amber-400 rounded-sm opacity-50" /> Solar PV Gen (kW)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-blue-500" /> Load Demand (kW)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-emerald-500" /> Battery SoC (%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-1.5 bg-[var(--alert)] rounded-sm" /> Grid Import (kW)
                </span>
                {annualDieselGenKWh > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-1.5 bg-gray-400 rounded-sm" /> Diesel Gen (kW)
                  </span>
                )}
              </div>
            </div>

            {/* SVG Interactive Power Balance Chart */}
            <div className="bg-[var(--bg-secondary)] rounded-xl p-2 border border-[var(--border)] relative overflow-hidden">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto select-none"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredHour(null)}
              >
                <defs>
                  <linearGradient id="pvGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>

                {/* Horizontal grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((r, i) => (
                  <line
                    key={i}
                    x1={paddingLeft}
                    y1={paddingTop + r * graphHeight}
                    x2={chartWidth - paddingRight}
                    y2={paddingTop + r * graphHeight}
                    className="stroke-[var(--border)]"
                    strokeWidth="1"
                  />
                ))}

                {/* Vertical grid lines every 4 hours */}
                {Array.from({ length: 7 }).map((_, i) => {
                  const h = i * 4;
                  return (
                    <line
                      key={i}
                      x1={getX(h > 23 ? 23 : h)}
                      y1={paddingTop}
                      x2={getX(h > 23 ? 23 : h)}
                      y2={chartHeight - paddingBottom}
                      className="stroke-[var(--border)]"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Left Y Axis Labels (Power kW) */}
                <text x={paddingLeft - 8} y={paddingTop + 4} className="fill-[var(--text-muted)] text-[9px] text-right font-mono" textAnchor="end">
                  {maxPowerVal.toFixed(0)}kW
                </text>
                <text x={paddingLeft - 8} y={chartHeight - paddingBottom + 4} className="fill-[var(--text-muted)] text-[9px] text-right font-mono" textAnchor="end">
                  0kW
                </text>

                {/* Right Y Axis Labels (Battery SoC %) */}
                <text x={chartWidth - paddingRight + 8} y={paddingTop + 4} className="fill-emerald-600 text-[9px] text-left font-mono" textAnchor="start">
                  100%
                </text>
                <text x={chartWidth - paddingRight + 8} y={chartHeight - paddingBottom + 4} className="fill-emerald-600 text-[9px] text-left font-mono" textAnchor="start">
                  0%
                </text>

                {/* PV Shaded Area */}
                <path d={pvPath} fill="url(#pvGlow)" className="stroke-amber-500/40" strokeWidth="1.5" />

                {/* Grid Import / Diesel Gen Bars */}
                {hourlyProfile.map((row, h) => {
                  const barX = getX(h) - 3;
                  const gridHeight = (row.gridImportKW / maxPowerVal) * graphHeight;
                  const gridY = chartHeight - paddingBottom - gridHeight;
                  const dieselHeight = (row.dieselGenKW / maxPowerVal) * graphHeight;
                  const dieselY = gridY - dieselHeight;

                  return (
                    <g key={h}>
                      {row.gridImportKW > 0 && (
                        <rect x={barX} y={gridY} width="6" height={gridHeight} className="fill-red-600/80" />
                      )}
                      {row.dieselGenKW > 0 && (
                        <rect x={barX} y={dieselY} width="6" height={dieselHeight} className="fill-gray-400/90" />
                      )}
                    </g>
                  );
                })}

                {/* Load Curve Line */}
                <path d={loadPath} className="stroke-blue-500 fill-none" strokeWidth="2" strokeLinecap="round" />

                {/* Battery SoC Curve Line (Dashed Green) */}
                <path
                  d={socPath}
                  className="stroke-emerald-600 fill-none"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />

                {/* Interactive hover line */}
                {hoveredHour !== null && (
                  <g>
                    <line
                      x1={getX(hoveredHour)}
                      y1={paddingTop}
                      x2={getX(hoveredHour)}
                      y2={chartHeight - paddingBottom}
                      className="stroke-[var(--text-tertiary)]"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <circle cx={getX(hoveredHour)} cy={getY(hourlyProfile[hoveredHour].loadKW)} r="4" className="fill-blue-500 stroke-white" strokeWidth="1.5" />
                    <circle cx={getX(hoveredHour)} cy={getY(hourlyProfile[hoveredHour].solarKW)} r="4" className="fill-amber-500 stroke-white" strokeWidth="1.5" />
                    <circle cx={getX(hoveredHour)} cy={getSoCY(hourlyProfile[hoveredHour].batterySoCAfter)} r="4" className="fill-emerald-600 stroke-white" strokeWidth="1.5" />
                  </g>
                )}

                {/* X Axis Time Labels */}
                {Array.from({ length: 7 }).map((_, i) => {
                  const h = i * 4;
                  const labelHour = h > 23 ? 23 : h;
                  return (
                    <text
                      key={i}
                      x={getX(labelHour)}
                      y={chartHeight - paddingBottom + 14}
                      className="fill-[var(--text-muted)] text-[8px] font-mono text-center"
                      textAnchor="middle"
                    >
                      {labelHour}:00
                    </text>
                  );
                })}
              </svg>

              {/* Hover tooltip card overlay */}
              {hoveredHour !== null && (
                <div className="absolute top-3 left-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 text-[10px] font-mono text-[var(--text-secondary)] shadow-xl space-y-1 z-30">
                  <div className="font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-1 mb-1">
                    Hour {hoveredHour}:00 Energy Balance
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-[var(--grid)]">Load demand:</span>
                    <span className="font-bold text-[var(--text-primary)]">{hourlyProfile[hoveredHour].loadKW} kW</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-[var(--solar)]">Solar PV gen:</span>
                    <span className="font-bold text-[var(--text-primary)]">{hourlyProfile[hoveredHour].solarKW} kW</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-[var(--battery)]">Battery SoC:</span>
                    <span className="font-bold text-[var(--text-primary)]">{hourlyProfile[hoveredHour].batterySoCAfter}%</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-[var(--alert)] font-semibold">Grid Import:</span>
                    <span className="font-bold text-[var(--text-primary)]">{hourlyProfile[hoveredHour].gridImportKW} kW</span>
                  </div>
                  {hourlyProfile[hoveredHour].dieselGenKW > 0 && (
                    <div className="flex justify-between gap-6">
                      <span className="text-[var(--text-tertiary)] font-semibold">Diesel Gen:</span>
                      <span className="font-bold text-[var(--text-primary)]">{hourlyProfile[hoveredHour].dieselGenKW} kW</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-6 text-[9px] border-t border-[var(--border)] pt-1 text-[var(--text-muted)]">
                    <span>Grid Status:</span>
                    <span className={hourlyProfile[hoveredHour].gridAvailable ? 'text-[var(--battery)]' : 'text-[var(--alert)]'}>
                      {hourlyProfile[hoveredHour].gridAvailable ? 'Online' : 'OUTAGE (Blackout)'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center italic">
              * Illustration only. The financial model follows the workbook methodology: annual generation = PV kWp x specific yield x 365, with the self-consumption ratio splitting on-site use from export. Batteries charge during solar peaks and discharge during deficits.
            </p>
          </div>

          {/* Environmental Savings Info */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Decarbonization & Environmental Compliance</h3>
                <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                  Avoided carbon emissions qualifies this project for regional corporate sustainability credits. Green electricity reduces dirty grid dependencies.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-[var(--bg-card-muted)] p-4 rounded-lg border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block">Annual CO₂ Saved</span>
                  <span className="text-xl font-bold text-[var(--battery)] font-mono">{annualCO2SavedTons} tons/year</span>
                </div>
                <div className="bg-[var(--bg-card-muted)] p-4 rounded-lg border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block">Equivalent Trees Planted</span>
                  <span className="text-xl font-bold text-[var(--battery)] font-mono">{equivalentTreesPlanted} trees</span>
                </div>
              </div>
            </div>
            <div className="bg-[var(--bg-card-muted)] border border-[var(--border)] rounded-xl p-5 flex flex-col justify-between items-center text-center">
              <Globe className="w-10 h-10 text-[var(--battery)] animate-pulse" />
              <div>
                <span className="text-xs font-semibold text-[var(--text-secondary)] block">Carbon Credit Eligible</span>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Estimated annual value of offset: <strong>${(annualCO2SavedTons * 18.5).toFixed(2)} USD</strong> @ $18.50/ton carbon index.</p>
              </div>
              <span className="bg-[var(--battery-soft)] border border-[var(--battery)]/30 text-[var(--battery)] text-[9px] font-bold px-3 py-1 rounded-full uppercase">
                A-Grade ESG Verified
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Detailed Itemized CapEx & OpEx Ledger */}
      {activeTab === 'capex' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* CapEx Ledger */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-[var(--border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Capital Expenditure (CapEx) Breakdown</h3>
              <span className="text-xs font-semibold text-[var(--text-tertiary)]">KSh {results.totalCapExKSh?.toLocaleString() || (totalCapExUSD*127.5).toLocaleString()}</span>
            </div>
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {results.bomLineItems?.slice(0, 16).map((item, idx) => (
                <div key={idx} className="bg-[var(--bg-card-muted)] border border-[var(--border)] rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)] block truncate max-w-[220px]">{item.description}</span>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase">{item.section} | Qty: {item.qty}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-[var(--text-primary)]">KSh {item.totalKSh.toLocaleString()}</span>
                    <span className="text-[9px] text-[var(--text-muted)] block">≈ ${item.totalUSD.toLocaleString()}</span>
                  </div>
                </div>
              )) || capexItems.map((item, idx) => (
                <div key={idx} className="bg-[var(--bg-card-muted)] border border-[var(--border)] rounded-lg p-3 flex justify-between items-center">
                  <div><span className="text-xs font-bold text-[var(--text-primary)] block truncate max-w-[220px]">{item.name}</span></div>
                  <div className="text-right"><span className="text-xs font-bold font-mono text-[var(--text-primary)]">${item.totalCost.toLocaleString()}</span></div>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--border)] pt-4 space-y-2 text-xs font-mono text-[var(--text-tertiary)]">
              <div className="flex justify-between">
                <span>Subtotal Hardware & Labor:</span>
                <span className="text-[var(--text-primary)] font-semibold">KSh {results.subtotalCapExKSh?.toLocaleString() || subtotalCapExUSD.toLocaleString()} | ${(results.subtotalCapExUSD || subtotalCapExUSD).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Project Contingency ({results.inputs.contingencyPercent}%):</span>
                <span className="text-[var(--text-primary)] font-semibold">${(results.contingencyUSD || contingencyUSD).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>EPC Contractor Margin ({results.inputs.epcMarginPercent}%):</span>
                <span className="text-[var(--text-primary)] font-semibold">${(results.epcMarginUSD || epcMarginUSD).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT @ 16% (Kenyan tax law):</span>
                <span className="text-[var(--text-primary)] font-semibold">KSh {results.vatKSh.toLocaleString()} | ${results.vatUSD.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-[var(--battery)] font-bold border-t border-dashed border-[var(--border)] pt-2">
                <span>GRAND TOTAL (Incl. VAT):</span>
                <span>KSh {results.totalCapExKSh?.toLocaleString() || totalCapExUSD.toLocaleString()} | ${(results.totalCapExUSD || totalCapExUSD).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* OpEx Ledger & Annual Operating Savings */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-3 mb-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Annual Operational Expenditure (OpEx)</h3>
                <span className="text-xs font-semibold text-[var(--text-tertiary)]">Year 1 Comparative Ledger</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                <div className="bg-[var(--bg-card-muted)] p-3 rounded-lg border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block">Grid Baseline (No Solar)</span>
                  <span className="text-base font-extrabold text-[var(--alert)] font-mono">${baselineAnnualCostUSD.toLocaleString()}</span>
                  <span className="text-[9px] text-[var(--text-muted)] block mt-1">
                    Grid: ${annualGridBillWithoutSolarUSD.toLocaleString()} | Fuel: ${annualDieselCostWithoutSolarUSD.toLocaleString()}
                  </span>
                </div>
                <div className="bg-[var(--bg-card-muted)] p-3 rounded-lg border border-[var(--border)]">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase block">Proposed System OpEx</span>
                  <span className="text-base font-extrabold text-[var(--battery)] font-mono">${totalAnnualOpExUSD.toLocaleString()}</span>
                  <span className="text-[9px] text-[var(--text-muted)] block mt-1">
                    Grid: ${annualGridBillWithSolarUSD.toLocaleString()} | Fuel: ${annualDieselCostWithSolarUSD.toLocaleString()}
                  </span>
                </div>
              </div>

              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block mb-2">
                Itemized Operating Costs:
              </span>
              <div className="space-y-2.5 text-xs text-[var(--text-secondary)] font-mono">
                <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                  <span className="text-[var(--text-tertiary)]">Net Utility Grid Electricity Bill:</span>
                  <span className="text-[var(--text-primary)]">${annualGridBillWithSolarUSD.toLocaleString()}</span>
                </div>
                {annualDieselCostWithSolarUSD > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                    <span className="text-[var(--text-tertiary)]">Backup Diesel Generator Fuel ({annualDieselFuelLiters} L):</span>
                    <span className="text-[var(--text-primary)]">${annualDieselCostWithSolarUSD.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                  <span className="text-[var(--text-tertiary)]">System O&M (Cleaning & Inverter Sinking):</span>
                  <span className="text-[var(--text-primary)]">${annualMaintenanceUSD.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                  <span className="text-[var(--text-tertiary)]">Equipment Comprehensive Insurance:</span>
                  <span className="text-[var(--text-primary)]">${annualInsuranceUSD.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                  <span className="text-[var(--text-tertiary)]">Battery Replacement Sinking Fund (Year 10-12):</span>
                  <span className="text-[var(--text-primary)]">${annualBatteryReserveUSD.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--border)] pt-4 bg-[var(--battery-soft)] border border-[var(--battery)]/20 rounded-xl p-4 flex justify-between items-center mt-4">
              <div>
                <span className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase block font-mono">Net Year 1 Operating Cash Savings:</span>
                <span className="text-xs text-[var(--text-tertiary)]">Proposed CapEx returns these cash gains annually.</span>
              </div>
              <span className="text-xl font-black text-[var(--battery)] font-mono">${annualSavingsUSD.toLocaleString()} / yr</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: 25-Year Cash Flow Projection */}
      {activeTab === 'cashflow' && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">25-Year Cumulative Cash Flow Curve & Breakeven</h3>
            <p className="text-xs text-[var(--text-tertiary)]">
              Visualizes the initial capital investment outlay (negative) recouping via annual operating savings. Crossover at Year {simplePaybackYears}.
            </p>
          </div>

          {/* SVG Cash Flow Curve */}
          <div className="bg-[var(--bg-secondary)] rounded-xl p-2 border border-[var(--border)]">
            <svg viewBox={`0 0 ${cfChartWidth} ${cfChartHeight}`} className="w-full h-auto select-none">
              {/* Zero Reference Line */}
              <line
                x1={paddingLeft}
                y1={getCFY(0)}
                x2={cfChartWidth - paddingRight}
                y2={getCFY(0)}
                className="stroke-[var(--border)]"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />

              {/* Grid Lines */}
              {[0.25, 0.5, 0.75].map((r, i) => (
                <line
                  key={i}
                  x1={paddingLeft}
                  y1={r * cfChartHeight}
                  x2={cfChartWidth - paddingRight}
                  y2={r * cfChartHeight}
                  className="stroke-[var(--border)]"
                  strokeWidth="1"
                />
              ))}

              <defs>
                <linearGradient id="cfGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.15"/>
                  <stop offset="50%" stopColor="#10b981" stopOpacity="0.0"/>
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.15"/>
                </linearGradient>
              </defs>

              {/* Breakeven Payback Point vertical line */}
              {cashFlows.length > 0 && (
                <g>
                  <line
                    x1={getCFX(Math.floor(simplePaybackYears))}
                    y1={10}
                    x2={getCFX(Math.floor(simplePaybackYears))}
                    y2={cfChartHeight - 20}
                    className="stroke-[var(--battery)]/40"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={getCFX(Math.floor(simplePaybackYears))}
                    cy={getCFY(0)}
                    r="6"
                    className="fill-[var(--battery)] stroke-white shadow-lg"
                    strokeWidth="2.5"
                  />
                </g>
              )}

              {/* Cumulative Line Path */}
              <path
                d={cfLinePath}
                className="stroke-[var(--battery)] fill-none"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Dots at key milestones (Year 0, Year 5, Year 10, Year 15, Year 20, Year 25) */}
              {[0, 5, 10, 15, 20, 25].map((y) => (
                <g key={y}>
                  <circle
                    cx={getCFX(y)}
                    cy={getCFY(cashFlows[y].cumulativeCashFlow)}
                    r="4"
                    className="fill-white stroke-[var(--battery)]"
                    strokeWidth="1.5"
                  />
                  <text
                    x={getCFX(y)}
                    y={getCFY(cashFlows[y].cumulativeCashFlow) - 8}
                    className="fill-[var(--text-tertiary)] text-[8px] font-mono"
                    textAnchor="middle"
                  >
                    ${Math.round(cashFlows[y].cumulativeCashFlow / 1000)}k
                  </text>
                  <text
                    x={getCFX(y)}
                    y={cfChartHeight - 8}
                    className="fill-[var(--text-muted)] text-[8px] font-mono"
                    textAnchor="middle"
                  >
                    Y{y}
                  </text>
                </g>
              ))}

              {/* Breakeven Marker Text */}
              <text
                x={getCFX(Math.floor(simplePaybackYears)) + 10}
                y={getCFY(0) - 8}
                className="fill-[var(--battery)] text-[9px] font-bold font-mono"
                textAnchor="start"
              >
                Breakeven: {simplePaybackYears} years
              </text>
            </svg>
          </div>

          {/* Cash Flow Spreadsheet Table */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Project Lifecycle Economic Cash Flow Ledger:
              </span>
              <button
                onClick={() => setShowFullTable(!showFullTable)}
                className="text-xs text-[var(--battery)] font-semibold flex items-center gap-1 hover:text-[var(--battery)]"
              >
                {showFullTable ? (
                  <>Show Fewer Years <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>Show All 25 Years <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>

            <div className="overflow-x-auto border border-[var(--border)] rounded-lg">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-[var(--bg-card-muted)] border-b border-[var(--border)] text-[var(--text-tertiary)] text-[10px] uppercase">
                    <th className="py-2.5 px-4 text-center">Year</th>
                    <th className="py-2.5 px-4 text-right">Cost Without Solar</th>
                    <th className="py-2.5 px-4 text-right">Cost With Solar</th>
                    <th className="py-2.5 px-4 text-right text-[var(--battery)]">Annual Savings</th>
                    <th className="py-2.5 px-4 text-right">Cumulative Cash Flow</th>
                    <th className="py-2.5 px-4 text-center">ROI Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)]">
                  {cashFlows
                    .filter((_, idx) => showFullTable || idx <= 8 || idx === 15 || idx === 25)
                    .map((cf) => (
                      <tr key={cf.year} className="hover:bg-[var(--bg-card-muted)] transition">
                        <td className="py-2 px-4 text-center font-bold text-[var(--text-tertiary)]">
                          {cf.year === 0 ? 'Year 0' : `Year ${cf.year}`}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {cf.year === 0 ? '-' : `$${Math.abs(cf.cashFlowWithoutSolar).toLocaleString()}`}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {cf.year === 0
                            ? `-$${totalCapExUSD.toLocaleString()}`
                            : `-$${Math.abs(cf.cashFlowWithSolar).toLocaleString()}`}
                        </td>
                        <td className="py-2 px-4 text-right font-bold text-[var(--battery)]">
                          {cf.year === 0 ? '-' : `+$${cf.netCashFlow.toLocaleString()}`}
                        </td>
                        <td
                          className={`py-2 px-4 text-right font-bold ${
                            cf.cumulativeCashFlow < 0 ? 'text-[var(--alert)]' : 'text-[var(--battery)]'
                          }`}
                        >
                          {cf.cumulativeCashFlow < 0 ? '-' : ''}${Math.abs(cf.cumulativeCashFlow).toLocaleString()}
                        </td>
                        <td className="py-2 px-4 text-center">
                          {cf.year === 0 ? (
                            <span className="text-[var(--alert)] text-[10px]">Capital Outlay</span>
                          ) : cf.cumulativeCashFlow < 0 ? (
                            <span className="text-[var(--text-muted)] text-[10px]">Amortizing</span>
                          ) : (
                            <span className="bg-[var(--battery-soft)] text-[var(--battery)] text-[9px] px-1.5 py-0.5 rounded font-bold border border-[var(--battery)]/30 uppercase">
                              Net Profit
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  {!showFullTable && (
                    <tr>
                      <td colSpan={6} className="py-2.5 px-4 text-center text-[10px] text-[var(--text-muted)] bg-[var(--bg-card-muted)] italic">
                        * Mid-years truncated for readability. Click &quot;Show All 25 Years&quot; to expand complete projection spreadsheet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. Action Bar for Bankable Proposal */}
      <div className="bg-[var(--grid-soft)] border border-[var(--grid)]/20 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/60 text-[var(--battery)] rounded-xl border border-[var(--border)] mt-1">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--text-primary)] text-base flex items-center gap-2">
              Techno-Economic Sizing Complete
            </h3>
            <p className="text-xs text-[var(--text-tertiary)] max-w-lg leading-relaxed mt-1">
              Your parametric modeling calculations have successfully converged. A bankable, investment-grade feasibility proposal is ready for client review.
            </p>
          </div>
        </div>

        <button
          onClick={onViewProposal}
          className="bg-[var(--battery)] hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95 whitespace-nowrap"
        >
          <FileText className="w-4 h-4" /> Generate Bankable PDF Proposal
        </button>
      </div>
    </div>
  );
}
