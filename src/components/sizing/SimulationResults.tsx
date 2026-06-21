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
  CheckCircle2
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
    cashFlows
  } = results;

  // Render SVG Chart for 24-Hour Power Flow
  const chartHeight = 200;
  const chartWidth = 720;
  const paddingLeft = 40;
  const paddingRight = 40;
  const paddingTop = 20;
  const paddingBottom = 20;

  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  // Find max value in hourly load or solar for Y scaling
  const maxPowerVal = Math.max(
    ...hourlyProfile.map(r => Math.max(r.loadKW, r.solarKW, r.gridImportKW, r.dieselGenKW, 5))
  );

  // SVG coordinate helpers
  const getX = (hour: number) => paddingLeft + (hour / 23) * graphWidth;
  const getY = (value: number) => chartHeight - paddingBottom - (value / maxPowerVal) * graphHeight;
  const getSoCY = (socVal: number) => chartHeight - paddingBottom - (socVal / 100) * graphHeight;

  // Generate PV Area path
  let pvPath = `M ${getX(0)} ${getY(0)}`;
  for (let h = 1; h < 24; h++) {
    pvPath += ` L ${getX(h)} ${getY(hourlyProfile[h].solarKW)}`;
  }
  pvPath += ` L ${getX(23)} ${getY(0)} Z`;

  // Generate Load Line path
  let loadPath = `M ${getX(0)} ${getY(hourlyProfile[0].loadKW)}`;
  for (let h = 1; h < 24; h++) {
    loadPath += ` L ${getX(h)} ${getY(hourlyProfile[h].loadKW)}`;
  }

  // Generate Battery SoC Line path
  let socPath = `M ${getX(0)} ${getSoCY(hourlyProfile[0].batterySoCAfter)}`;
  for (let h = 1; h < 24; h++) {
    socPath += ` L ${getX(h)} ${getSoCY(hourlyProfile[h].batterySoCAfter)}`;
  }

  // Handle Mouse Hover on Chart
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - svgRect.left;

    // Map clientX to hour (0 - 23)
    const relativeX = clientX - paddingLeft;
    if (relativeX >= 0 && relativeX <= graphWidth) {
      const hour = Math.round((relativeX / graphWidth) * 23);
      if (hour >= 0 && hour <= 23) {
        setHoveredHour(hour);
      }
    } else {
      setHoveredHour(null);
    }
  };

  // Cash Flow Chart SVG Helpers
  const cfChartWidth = 720;
  const cfChartHeight = 180;
  const maxCFVal = Math.max(...cashFlows.map(cf => Math.abs(cf.cumulativeCashFlow)), totalCapExUSD);

  const getCFX = (year: number) => paddingLeft + (year / 25) * (cfChartWidth - paddingLeft - paddingRight);
  const getCFY = (cfVal: number) => {
    // Center is zero, positive values go up, negative values go down
    const zeroY = cfChartHeight / 2 + 10;
    const scale = (cfChartHeight - 40) / (2 * maxCFVal);
    return zeroY - cfVal * scale;
  };

  // Generate Cumulative Cash Flow Line
  let cfLinePath = `M ${getCFX(0)} ${getCFY(cashFlows[0].cumulativeCashFlow)}`;
  for (let y = 1; y <= 25; y++) {
    cfLinePath += ` L ${getCFX(y)} ${getCFY(cashFlows[y].cumulativeCashFlow)}`;
  }

  return (
    <div className="space-y-8">
      {/* 1. Main Bankability Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full -mr-4 -mt-4" />
          <span className="text-xs font-semibold text-slate-400">Simple Payback</span>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono">{simplePaybackYears}</span>
            <span className="text-xs text-slate-400 font-semibold">Years</span>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3 text-emerald-400" /> Payback vs 25y system lifespan
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-full -mr-4 -mt-4" />
          <span className="text-xs font-semibold text-slate-400">Net Present Value (NPV)</span>
          <div className="my-2 flex items-baseline gap-0.5">
            <span className="text-2xl font-extrabold text-blue-400 font-mono">
              ${npvUSD.toLocaleString()}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-blue-400" /> @ {results.inputs.discountRate}% discount rate
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full -mr-4 -mt-4" />
          <span className="text-xs font-semibold text-slate-400">Internal Rate of Return</span>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-purple-400 font-mono">{irrPercent}%</span>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <Award className="w-3 h-3 text-purple-400" /> Highly bankable yield profile
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/5 rounded-full -mr-4 -mt-4" />
          <span className="text-xs font-semibold text-slate-400">Levelized Cost (LCOE)</span>
          <div className="my-2 flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-teal-400 font-mono">${lcoeUSDPerKWh}</span>
              <span className="text-[10px] text-slate-400">/ kWh</span>
            </div>
            <span className="text-[9px] text-slate-400 line-through">Grid Baseline: ${lcoeBaselineUSDPerKWh}/kWh</span>
          </div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1">
            <Zap className="w-3 h-3 text-teal-400" /> Saves {(((lcoeBaselineUSDPerKWh - lcoeUSDPerKWh) / lcoeBaselineUSDPerKWh) * 100).toFixed(0)}% per unit energy
          </div>
        </div>
      </div>

      {/* 2. Technical System Specifications Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-3">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
            Optimized System Configuration Summary
          </h4>
          <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded font-mono">
            Active Tenant: {activeOrgName}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 text-center">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="block text-[10px] text-slate-500 uppercase font-mono">PV Array Size</span>
            <span className="text-base font-extrabold text-slate-200 font-mono">{solarCapacityKWp} kWp</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="block text-[10px] text-slate-500 uppercase font-mono">Battery Storage</span>
            <span className="text-base font-extrabold text-slate-200 font-mono">{batteryCapacityKWh} kWh</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="block text-[10px] text-slate-500 uppercase font-mono">Inverter Rating</span>
            <span className="text-base font-extrabold text-slate-200 font-mono">{inverterCapacityKW} kW</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="block text-[10px] text-slate-500 uppercase font-mono">Roof Space Area</span>
            <span className="text-base font-extrabold text-slate-200 font-mono">{panelAreaRequiredM2} m²</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="block text-[10px] text-slate-500 uppercase font-mono">PV Self-Consume</span>
            <span className="text-base font-extrabold text-slate-200 font-mono">{solarSelfConsumptionPercent}%</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="block text-[10px] text-slate-500 uppercase font-mono">System Autonomy</span>
            <span className="text-base font-extrabold text-slate-200 font-mono">{systemAutonomyPercent}%</span>
          </div>
        </div>

        {/* Detailed Annual Energy Yield Balance sheet */}
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono text-slate-400">
          <div>
            <span className="text-slate-500 text-[9px] block">ANNUAL ENERGY DEMAND:</span>
            <span className="text-slate-200 font-bold">{annualLoadKWh.toLocaleString()} kWh</span>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] block">ANNUAL SOLAR GENERATION:</span>
            <span className="text-slate-200 font-bold text-amber-400">{annualPVGeneratedKWh.toLocaleString()} kWh</span>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] block">ANNUAL UTILITY IMPORT:</span>
            <span className="text-slate-200 font-bold text-red-400">{annualGridImportKWh.toLocaleString()} kWh</span>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] block">ANNUAL NET SOLAR EXPORT:</span>
            <span className="text-slate-200 font-bold text-blue-400">{annualGridExportKWh.toLocaleString()} kWh</span>
          </div>
          <div className="col-span-2 md:col-span-1">
            <span className="text-slate-500 text-[9px] block">DIESEL GEN RUN / UNMET:</span>
            <span className="text-slate-200 font-bold">
              {annualDieselGenKWh > 0 ? `${annualDieselGenKWh.toLocaleString()} kWh (${annualDieselFuelLiters}L)` : '0 kWh / '}{annualUnservedLoadKWh > 0 ? ` ${annualUnservedLoadKWh.toLocaleString()} kWh blacked` : '0 blackout'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-800 flex gap-4">
        <button
          onClick={() => setActiveTab('charts')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'charts'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          📈 Performance & Cash Flow Charts
        </button>
        <button
          onClick={() => setActiveTab('capex')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'capex'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          💵 CapEx & OpEx Ledger
        </button>
        <button
          onClick={() => setActiveTab('cashflow')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'cashflow'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          📊 25-Year Lifecycle Cash Flow
        </button>
      </div>

      {/* Tab 1: Interactive Performance Charts */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          {/* 24h Dispatch Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-200">24-Hour Hybrid Energy Balance & Dispatch Simulation</h3>
                <p className="text-xs text-slate-400">
                  Interactive profile mapping power flow. Hover to view detailed hourly metrics.
                </p>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-1.5 bg-amber-400 rounded-sm opacity-50" /> Solar PV Gen (kW)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-blue-500" /> Load Demand (kW)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-emerald-400" /> Battery SoC (%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-1.5 bg-red-600 rounded-sm" /> Grid Import (kW)
                </span>
                {results.inputs.dieselGenCapacityKW > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-1.5 bg-slate-500 rounded-sm" /> Diesel Gen (kW)
                  </span>
                )}
              </div>
            </div>

            {/* SVG Interactive Power Balance Chart */}
            <div className="bg-slate-950 rounded-xl p-2 border border-slate-850 relative overflow-hidden">
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
                    className="stroke-slate-900/60"
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
                      className="stroke-slate-900/60"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Left Y Axis Labels (Power kW) */}
                <text x={paddingLeft - 8} y={paddingTop + 4} className="fill-slate-500 text-[9px] text-right font-mono" textAnchor="end">
                  {maxPowerVal.toFixed(0)}kW
                </text>
                <text x={paddingLeft - 8} y={chartHeight - paddingBottom + 4} className="fill-slate-500 text-[9px] text-right font-mono" textAnchor="end">
                  0kW
                </text>

                {/* Right Y Axis Labels (Battery SoC %) */}
                <text x={chartWidth - paddingRight + 8} y={paddingTop + 4} className="fill-emerald-500 text-[9px] text-left font-mono" textAnchor="start">
                  100%
                </text>
                <text x={chartWidth - paddingRight + 8} y={chartHeight - paddingBottom + 4} className="fill-emerald-500 text-[9px] text-left font-mono" textAnchor="start">
                  0%
                </text>

                {/* PV Shaded Area */}
                <path d={pvPath} fill="url(#pvGlow)" className="stroke-amber-500/40" strokeWidth="1.5" />

                {/* Grid Import / Diesel Gen Bars */}
                {hourlyProfile.map((row, h) => {
                  const barX = getX(h) - 3;
                  // Grid Import Bar
                  const gridHeight = (row.gridImportKW / maxPowerVal) * graphHeight;
                  const gridY = chartHeight - paddingBottom - gridHeight;

                  // Diesel Gen Bar (stacked if needed, or overlayed)
                  const dieselHeight = (row.dieselGenKW / maxPowerVal) * graphHeight;
                  const dieselY = gridY - dieselHeight;

                  return (
                    <g key={h}>
                      {row.gridImportKW > 0 && (
                        <rect
                          x={barX}
                          y={gridY}
                          width="6"
                          height={gridHeight}
                          className="fill-red-600/80"
                        />
                      )}
                      {row.dieselGenKW > 0 && (
                        <rect
                          x={barX}
                          y={dieselY}
                          width="6"
                          height={dieselHeight}
                          className="fill-slate-500/90"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Load Curve Line */}
                <path d={loadPath} className="stroke-blue-500 fill-none" strokeWidth="2" strokeLinecap="round" />

                {/* Battery SoC Curve Line (Dashed Green) */}
                <path
                  d={socPath}
                  className="stroke-emerald-400 fill-none"
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
                      className="stroke-slate-400"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                    <circle cx={getX(hoveredHour)} cy={getY(hourlyProfile[hoveredHour].loadKW)} r="4" className="fill-blue-500 stroke-slate-950" strokeWidth="1.5" />
                    <circle cx={getX(hoveredHour)} cy={getY(hourlyProfile[hoveredHour].solarKW)} r="4" className="fill-amber-500 stroke-slate-950" strokeWidth="1.5" />
                    <circle cx={getX(hoveredHour)} cy={getSoCY(hourlyProfile[hoveredHour].batterySoCAfter)} r="4" className="fill-emerald-400 stroke-slate-950" strokeWidth="1.5" />
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
                      className="fill-slate-500 text-[8px] font-mono text-center"
                      textAnchor="middle"
                    >
                      {labelHour}:00
                    </text>
                  );
                })}
              </svg>

              {/* Hover tooltip card overlay */}
              {hoveredHour !== null && (
                <div className="absolute top-3 left-3 bg-slate-900/95 border border-slate-800 rounded-lg p-3 text-[10px] font-mono text-slate-300 shadow-xl space-y-1 z-30">
                  <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 mb-1">
                    Hour {hoveredHour}:00 Energy Balance
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-blue-400">Load demand:</span>
                    <span className="font-bold text-slate-100">{hourlyProfile[hoveredHour].loadKW} kW</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-amber-400">Solar PV gen:</span>
                    <span className="font-bold text-slate-100">{hourlyProfile[hoveredHour].solarKW} kW</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-emerald-400">Battery SoC:</span>
                    <span className="font-bold text-slate-100">{hourlyProfile[hoveredHour].batterySoCAfter}%</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-red-400 font-semibold">Grid Import:</span>
                    <span className="font-bold text-slate-100">{hourlyProfile[hoveredHour].gridImportKW} kW</span>
                  </div>
                  {hourlyProfile[hoveredHour].dieselGenKW > 0 && (
                    <div className="flex justify-between gap-6">
                      <span className="text-slate-400 font-semibold">Diesel Gen:</span>
                      <span className="font-bold text-slate-100">{hourlyProfile[hoveredHour].dieselGenKW} kW</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-6 text-[9px] border-t border-slate-850 pt-1 text-slate-500">
                    <span>Grid Status:</span>
                    <span className={hourlyProfile[hoveredHour].gridAvailable ? 'text-emerald-500' : 'text-red-400'}>
                      {hourlyProfile[hoveredHour].gridAvailable ? 'Online' : 'OUTAGE (Blackout)'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center italic">
              * The simulation maps solar irradiation and battery limits against load demand. Batteries charge during solar peaks and discharge during deficits. Grid imports occur if battery is depleted and grid is online.
            </p>
          </div>

          {/* Environmental Savings Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-200 mb-1">Decarbonization & Environmental Compliance</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Avoided carbon emissions qualifies this project for regional corporate sustainability credits. Green electricity reduces dirty grid dependencies.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-mono uppercase block">Annual CO₂ Saved</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono">{annualCO2SavedTons} tons/year</span>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-mono uppercase block">Equivalent Trees Planted</span>
                  <span className="text-xl font-bold text-emerald-400 font-mono">{equivalentTreesPlanted} trees</span>
                </div>
              </div>
            </div>
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 flex flex-col justify-between items-center text-center">
              <Globe className="w-10 h-10 text-emerald-400 animate-pulse" />
              <div>
                <span className="text-xs font-semibold text-slate-300 block">Carbon Credit Eligible</span>
                <p className="text-[10px] text-slate-500 mt-1">Estimated annual value of offset: <strong>${(annualCO2SavedTons * 18.5).toFixed(2)} USD</strong> @ $18.50/ton carbon index.</p>
              </div>
              <span className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-[9px] font-bold px-3 py-1 rounded-full uppercase">
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200">Capital Expenditure (CapEx) Breakdown</h3>
              <span className="text-xs font-semibold text-slate-400">KSh {results.totalCapExKSh?.toLocaleString() || (totalCapExUSD*127.5).toLocaleString()}</span>
            </div>
            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {results.bomLineItems?.slice(0, 16).map((item, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-850 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-slate-200 block truncate max-w-[220px]">{item.description}</span>
                    <span className="text-[10px] text-slate-500 font-mono uppercase">{item.section} | Qty: {item.qty}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-slate-200">KSh {item.totalKSh.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-500 block">≈ ${item.totalUSD.toLocaleString()}</span>
                  </div>
                </div>
              )) || capexItems.map((item, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-850 rounded-lg p-3 flex justify-between items-center">
                  <div><span className="text-xs font-bold text-slate-200 block truncate max-w-[220px]">{item.name}</span></div>
                  <div className="text-right"><span className="text-xs font-bold font-mono text-slate-200">${item.totalCost.toLocaleString()}</span></div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-2 text-xs font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal Hardware & Labor:</span>
                <span className="text-slate-200 font-semibold">KSh {results.subtotalCapExKSh?.toLocaleString() || subtotalCapExUSD.toLocaleString()} | ${(results.subtotalCapExUSD || subtotalCapExUSD).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Project Contingency ({results.inputs.contingencyPercent}%):</span>
                <span className="text-slate-200 font-semibold">${(results.contingencyUSD || contingencyUSD).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>EPC Contractor Margin ({results.inputs.epcMarginPercent}%):</span>
                <span className="text-slate-200 font-semibold">${(results.epcMarginUSD || epcMarginUSD).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-emerald-400 font-bold border-t border-dashed border-slate-800 pt-2">
                <span>TOTAL INSTALLED CAPEX:</span>
                <span>KSh {results.totalCapExKSh?.toLocaleString() || totalCapExUSD.toLocaleString()} | ${(results.totalCapExUSD || totalCapExUSD).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* OpEx Ledger & Annual Operating Savings */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-sm font-bold text-slate-200">Annual Operational Expenditure (OpEx)</h3>
                <span className="text-xs font-semibold text-slate-400">Year 1 Comparative Ledger</span>
              </div>

              {/* Comparative baseline vs solar */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-mono uppercase block">Grid Baseline (No Solar)</span>
                  <span className="text-base font-extrabold text-red-400 font-mono">${baselineAnnualCostUSD.toLocaleString()}</span>
                  <span className="text-[9px] text-slate-500 block mt-1">
                    Grid: ${annualGridBillWithoutSolarUSD.toLocaleString()} | Fuel: ${annualDieselCostWithoutSolarUSD.toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                  <span className="text-[10px] text-slate-500 font-mono uppercase block">Proposed System OpEx</span>
                  <span className="text-base font-extrabold text-emerald-400 font-mono">${totalAnnualOpExUSD.toLocaleString()}</span>
                  <span className="text-[9px] text-slate-500 block mt-1">
                    Grid: ${annualGridBillWithSolarUSD.toLocaleString()} | Fuel: ${annualDieselCostWithSolarUSD.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* OpEx Breakdown */}
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-2">
                Itemized Operating Costs:
              </span>
              <div className="space-y-2.5 text-xs text-slate-300 font-mono">
                <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                  <span className="text-slate-400">Net Utility Grid Electricity Bill:</span>
                  <span className="text-slate-200">${annualGridBillWithSolarUSD.toLocaleString()}</span>
                </div>
                {annualDieselCostWithSolarUSD > 0 && (
                  <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                    <span className="text-slate-400">Backup Diesel Generator Fuel ({annualDieselFuelLiters} L):</span>
                    <span className="text-slate-200">${annualDieselCostWithSolarUSD.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                  <span className="text-slate-400">System O&M (Cleaning & Inverter Sinking):</span>
                  <span className="text-slate-200">${annualMaintenanceUSD.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                  <span className="text-slate-400">Equipment Comprehensive Insurance:</span>
                  <span className="text-slate-200">${annualInsuranceUSD.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800/40">
                  <span className="text-slate-400">Battery Replacement Sinking Fund (Year 10-12):</span>
                  <span className="text-slate-200">${annualBatteryReserveUSD.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4 flex justify-between items-center mt-4">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block font-mono">Net Year 1 Operating Cash Savings:</span>
                <span className="text-xs text-slate-400">Proposed CapEx returns these cash gains annually.</span>
              </div>
              <span className="text-xl font-black text-emerald-400 font-mono">${annualSavingsUSD.toLocaleString()} / yr</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: 25-Year Cash Flow Projection */}
      {activeTab === 'cashflow' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-200">25-Year Cumulative Cash Flow Curve & Breakeven</h3>
            <p className="text-xs text-slate-400">
              Visualizes the initial capital investment outlay (negative) recouping via annual operating savings. Crossover at Year {simplePaybackYears}.
            </p>
          </div>

          {/* SVG Cash Flow Curve */}
          <div className="bg-slate-950 rounded-xl p-2 border border-slate-850">
            <svg viewBox={`0 0 ${cfChartWidth} ${cfChartHeight}`} className="w-full h-auto select-none">
              {/* Zero Reference Line */}
              <line
                x1={paddingLeft}
                y1={getCFY(0)}
                x2={cfChartWidth - paddingRight}
                y2={getCFY(0)}
                className="stroke-slate-700"
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
                  className="stroke-slate-900"
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
                    className="stroke-emerald-500/30"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={getCFX(Math.floor(simplePaybackYears))}
                    cy={getCFY(0)}
                    r="6"
                    className="fill-emerald-400 stroke-slate-950 shadow-lg"
                    strokeWidth="2.5"
                  />
                </g>
              )}

              {/* Cumulative Line Path */}
              <path
                d={cfLinePath}
                className="stroke-emerald-400 fill-none"
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
                    className="fill-slate-950 stroke-emerald-500"
                    strokeWidth="1.5"
                  />
                  <text
                    x={getCFX(y)}
                    y={getCFY(cashFlows[y].cumulativeCashFlow) - 8}
                    className="fill-slate-400 text-[8px] font-mono"
                    textAnchor="middle"
                  >
                    ${Math.round(cashFlows[y].cumulativeCashFlow / 1000)}k
                  </text>
                  <text
                    x={getCFX(y)}
                    y={cfChartHeight - 8}
                    className="fill-slate-500 text-[8px] font-mono"
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
                className="fill-emerald-400 text-[9px] font-bold font-mono"
                textAnchor="start"
              >
                Breakeven: {simplePaybackYears} years
              </text>
            </svg>
          </div>

          {/* Cash Flow Spreadsheet Table */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Project Lifecycle Economic Cash Flow Ledger:
              </span>
              <button
                onClick={() => setShowFullTable(!showFullTable)}
                className="text-xs text-emerald-400 font-semibold flex items-center gap-1 hover:text-emerald-300"
              >
                {showFullTable ? (
                  <>
                    Show Fewer Years <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Show All 25 Years <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="py-2.5 px-4 text-center">Year</th>
                    <th className="py-2.5 px-4 text-right">Cost Without Solar</th>
                    <th className="py-2.5 px-4 text-right">Cost With Solar</th>
                    <th className="py-2.5 px-4 text-right text-emerald-400">Annual Savings</th>
                    <th className="py-2.5 px-4 text-right">Cumulative Cash Flow</th>
                    <th className="py-2.5 px-4 text-center">ROI Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                  {cashFlows
                    .filter((_, idx) => showFullTable || idx <= 8 || idx === 15 || idx === 25)
                    .map((cf) => (
                      <tr key={cf.year} className="hover:bg-slate-950/40 transition">
                        <td className="py-2 px-4 text-center font-bold text-slate-400">
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
                        <td className="py-2 px-4 text-right font-bold text-emerald-400">
                          {cf.year === 0 ? '-' : `+$${cf.netCashFlow.toLocaleString()}`}
                        </td>
                        <td
                          className={`py-2 px-4 text-right font-bold ${
                            cf.cumulativeCashFlow < 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}
                        >
                          {cf.cumulativeCashFlow < 0 ? '-' : ''}${Math.abs(cf.cumulativeCashFlow).toLocaleString()}
                        </td>
                        <td className="py-2 px-4 text-center">
                          {cf.year === 0 ? (
                            <span className="text-red-400 text-[10px]">Capital Outlay</span>
                          ) : cf.cumulativeCashFlow < 0 ? (
                            <span className="text-slate-500 text-[10px]">Amortizing</span>
                          ) : (
                            <span className="bg-emerald-950 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-bold border border-emerald-900 uppercase">
                              Net Profit
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  {!showFullTable && (
                    <tr>
                      <td colSpan={6} className="py-2.5 px-4 text-center text-[10px] text-slate-500 bg-slate-950/20 italic">
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
      <div className="bg-gradient-to-r from-blue-950 to-slate-900 border border-blue-800/40 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-lg shadow-blue-950/20">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-900/50 text-emerald-400 rounded-xl border border-blue-700/60 mt-1">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
              Techno-Economic Sizing Complete
            </h3>
            <p className="text-xs text-slate-400 max-w-lg leading-relaxed mt-1">
              Your parametric modeling calculations have successfully converged. A bankable, investment-grade feasibility proposal is ready for client review.
            </p>
          </div>
        </div>

        <button
          onClick={onViewProposal}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95 whitespace-nowrap"
        >
          <FileText className="w-4 h-4" /> Generate Bankable PDF Proposal
        </button>
      </div>
    </div>
  );
}
