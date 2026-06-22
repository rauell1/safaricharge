import { Printer, X, Award, Leaf } from 'lucide-react';
import { SimulationResults } from '@/lib/sizing/solarCalculator';
import { KSH_PER_USD } from '@/lib/sizing/mockData';

interface ProposalViewerProps {
  results: SimulationResults;
  projectName: string;
  clientName: string;
  engineerName: string;
  onClose: () => void;
}

export default function ProposalViewer({ results, projectName, clientName, engineerName, onClose }: ProposalViewerProps) {
  const dateStr = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
  const docId = `SC-2026-${Math.floor(100000 + Math.random() * 900000)}`;

  const triggerPrint = () => window.print();

  const sectionGroups = new Map<string, typeof results.bomLineItems>();
  results.bomLineItems.forEach(item => {
    const key = item.section;
    if (!sectionGroups.has(key)) sectionGroups.set(key, []);
    sectionGroups.get(key)!.push(item);
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-8 flex justify-center items-start print:p-0 print:bg-white print:backdrop-blur-none">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:text-slate-950 print:w-full print:rounded-none">

        <div className="bg-[var(--bg-card-muted)] px-6 py-4 border-b border-[var(--border)] flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2">
            <span className="bg-[var(--battery-soft)] text-[var(--battery)] text-xs px-2.5 py-0.5 rounded-full font-mono border border-[var(--battery)]/30">Bankable Proposal Mode</span>
            <span className="text-xs text-[var(--text-tertiary)] font-mono">ID: {docId}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={triggerPrint} className="bg-[var(--battery)] hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95">
              <Printer className="w-3.5 h-3.5" /><span>Print / Save as PDF</span>
            </button>
            <button onClick={onClose} className="bg-[var(--bg-card-muted)] hover:bg-[var(--border)] text-[var(--text-secondary)] border border-[var(--border)] font-semibold text-xs px-3 py-2 rounded-lg flex items-center gap-1 transition">
              <X className="w-3.5 h-3.5" /><span>Close</span>
            </button>
          </div>
        </div>

        <div className="p-8 md:p-12 space-y-8 bg-[var(--bg-card)] print:bg-white print:text-slate-950 print:p-0">
          {/* Cover Header */}
          <div className="border-b-4 border-[var(--battery)] pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--battery)] flex items-center justify-center font-black text-white text-lg">S</div>
                <span className="text-lg font-extrabold text-[var(--text-primary)] font-mono tracking-tight print:text-slate-900">Safari<span className="text-[var(--battery)] print:text-emerald-600">Charge</span> Ltd</span>
              </div>
              <span className="text-[10px] text-[var(--text-tertiary)] font-mono tracking-wider block uppercase print:text-slate-500">Renewable Infrastructure Systems Modeler</span>
            </div>
            <div className="text-right text-xs font-mono text-[var(--text-tertiary)] space-y-0.5 print:text-slate-600">
              <div><strong className="text-[var(--text-primary)] print:text-slate-900">Document:</strong> Feasibility Proposal</div>
              <div><strong className="text-[var(--text-primary)] print:text-slate-900">Reference ID:</strong> {docId}</div>
              <div><strong className="text-[var(--text-primary)] print:text-slate-900">Date Generated:</strong> {dateStr}</div>
              <div><strong className="text-[var(--text-primary)] print:text-slate-900">Expires:</strong> June 30, 2026</div>
            </div>
          </div>

          <div className="text-center py-4">
            <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] tracking-tight uppercase print:text-slate-900">Techno-Economic Feasibility Report</h1>
            <p className="text-xs text-[var(--battery)] font-mono uppercase tracking-widest mt-1 print:text-emerald-600">Commercial Hybrid Solar PV & Battery Storage System</p>
          </div>

          {/* Project Entity Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--bg-card-muted)] border border-[var(--border)] rounded-xl p-6 print:border-slate-300 print:bg-slate-50">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase font-mono tracking-wider block">Client Information</span>
              <div className="text-xs space-y-1">
                <div><span className="text-[var(--text-muted)]">B2B Client:</span> <strong className="text-[var(--text-primary)] print:text-slate-950">{clientName}</strong></div>
                <div><span className="text-[var(--text-muted)]">Project Name:</span> <strong className="text-[var(--text-primary)] print:text-slate-950">{projectName}</strong></div>
                <div><span className="text-[var(--text-muted)]">Site Region:</span> <strong className="text-[var(--text-primary)] print:text-slate-950">{results.inputs.location.name}, {results.inputs.location.country}</strong></div>
                <div><span className="text-[var(--text-muted)]">Grid Tariff Rate:</span> <strong className="text-[var(--text-primary)] print:text-slate-950 font-mono">KSh {results.inputs.location.gridTariffKSh}/kWh (${results.inputs.location.gridTariffUSD}/kWh)</strong></div>
              </div>
            </div>
            <div className="space-y-2 border-t md:border-t-0 md:border-l border-[var(--border)] pt-4 md:pt-0 md:pl-6 print:border-slate-300">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase font-mono tracking-wider block">Engineering Lead</span>
              <div className="text-xs space-y-1">
                <div><span className="text-[var(--text-muted)]">Lead Modeler:</span> <strong className="text-[var(--text-primary)] print:text-slate-950">{engineerName}</strong></div>
                <div><span className="text-[var(--text-muted)]">DC/AC Oversize Ratio:</span> <strong className="text-[var(--text-primary)] print:text-slate-950 font-mono">{results.actualDcAcRatio}</strong></div>
                <div><span className="text-[var(--text-muted)]">Simulation Model:</span> <strong className="text-[var(--text-primary)] print:text-slate-950 font-mono">SafariCharge-Parametric-v2</strong></div>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[var(--battery)] uppercase tracking-widest font-mono border-b border-[var(--border)] pb-1.5 print:text-emerald-600 print:border-slate-300">1. Executive Engineering Summary</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed print:text-slate-800">
              This feasibility study proposes an optimized hybrid system configuration for <strong>{clientName}</strong>.
              We recommend an array of <strong>{results.solarCapacityKWp} kWp</strong> solar PV with <strong>{results.batteryCapacityKWh} kWh</strong> LiFePO4 battery storage,
              controlled by <strong>{results.inverterCapacityKW} kW</strong> hybrid inverter capacity.
              The system achieves a <strong>{results.systemAutonomyPercent}% autonomy rating</strong>, shielding operations from {results.inputs.location.outageHoursPerDay}h daily utility outages.
            </p>
          </div>

          {/* Financial Highlights */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[var(--battery)] uppercase tracking-widest font-mono border-b border-[var(--border)] pb-1.5 print:text-emerald-600 print:border-slate-300">2. Financial Feasibility & ROI Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[var(--bg-card-muted)] border border-[var(--border)] p-4 rounded-xl text-center print:border-slate-300 print:bg-slate-50">
                <span className="block text-[9px] text-[var(--text-muted)] font-mono uppercase">Capital Expense</span>
                <span className="text-lg font-extrabold text-[var(--text-primary)] font-mono block print:text-slate-950">KSh {results.totalCapExKSh.toLocaleString()}</span>
                <span className="text-[9px] text-[var(--text-muted)]">≈ ${results.totalCapExUSD.toLocaleString()}</span>
              </div>
              <div className="bg-[var(--bg-card-muted)] border border-[var(--border)] p-4 rounded-xl text-center print:border-slate-300 print:bg-slate-50">
                <span className="block text-[9px] text-[var(--text-muted)] font-mono uppercase">Simple Payback</span>
                <span className="text-lg font-extrabold text-[var(--battery)] font-mono print:text-emerald-600">{results.simplePaybackYears} Years</span>
              </div>
              <div className="bg-[var(--bg-card-muted)] border border-[var(--border)] p-4 rounded-xl text-center print:border-slate-300 print:bg-slate-50">
                <span className="block text-[9px] text-[var(--text-muted)] font-mono uppercase">Internal Return (IRR)</span>
                <span className="text-lg font-extrabold text-purple-700 font-mono print:text-purple-600">{results.irrPercent}%</span>
              </div>
              <div className="bg-[var(--bg-card-muted)] border border-[var(--border)] p-4 rounded-xl text-center print:border-slate-300 print:bg-slate-50">
                <span className="block text-[9px] text-[var(--text-muted)] font-mono uppercase">LCOE (Levelized)</span>
                <span className="text-lg font-extrabold text-teal-700 font-mono print:text-teal-600">${results.lcoeUSDPerKWh}/kWh</span>
              </div>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed print:text-slate-800">
              With a CapEx of <strong>KSh {results.totalCapExKSh.toLocaleString()}</strong> ({`≈`}${results.totalCapExUSD.toLocaleString()}), the system generates Year 1 savings of <strong>${results.annualSavingsUSD.toLocaleString()}</strong>.
              Over 25 years, NPV = <strong>${results.npvUSD.toLocaleString()}</strong> at {results.inputs.discountRate}% discount rate.
            </p>
          </div>

          {/* 3. Itemized Bill of Materials */}
          <div className="space-y-3 page-break-before">
            <h3 className="text-sm font-bold text-[var(--battery)] uppercase tracking-widest font-mono border-b border-[var(--border)] pb-1.5 print:text-emerald-600 print:border-slate-300">3. Itemized Bill of Materials (BOM)</h3>

            {Array.from(sectionGroups.entries()).map(([sectionName, items]) => {
              const sectionTotalKSh = items.reduce((s,i) => s + i.totalKSh, 0);
              return (
                <div key={sectionName} className="mb-4">
                  <div className="bg-[var(--bg-card-muted)] px-4 py-2 rounded-t-lg border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] uppercase font-mono tracking-wider print:bg-slate-100 print:border-slate-300 print:text-slate-800">
                    {sectionName}
                  </div>
                  <div className="overflow-x-auto border-x border-b border-[var(--border)] rounded-b-lg print:border-slate-300">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-[var(--bg-card-muted)] border-b border-[var(--border)] text-[9px] uppercase font-mono text-[var(--text-tertiary)] print:bg-slate-50 print:text-slate-700 print:border-slate-300">
                          <th className="py-2 px-3">#</th><th className="py-2 px-3">Description</th><th className="py-2 px-3 text-center">Unit</th><th className="py-2 px-3 text-center">Qty</th><th className="py-2 px-3 text-right">Unit (KSh)</th><th className="py-2 px-3 text-right">Total (KSh)</th><th className="py-2 px-3 text-right">Total (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)] print:divide-slate-200 print:text-slate-800">
                        {items.map(item => (
                          <tr key={item.itemNumber} className="hover:bg-[var(--bg-card-muted)]">
                            <td className="py-1.5 px-3 font-mono text-[var(--text-muted)]">{item.itemNumber}</td>
                            <td className="py-1.5 px-3">
                              {item.description}
                              {item.notes && <span className="block text-[8px] text-[var(--text-muted)] italic">{item.notes}</span>}
                            </td>
                            <td className="py-1.5 px-3 text-center font-mono text-[var(--text-tertiary)]">{item.unit}</td>
                            <td className="py-1.5 px-3 text-center font-mono">{item.qty}</td>
                            <td className="py-1.5 px-3 text-right font-mono">{item.unitPriceKSh.toLocaleString()}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-semibold text-[var(--text-primary)] print:text-slate-900">{item.totalKSh.toLocaleString()}</td>
                            <td className="py-1.5 px-3 text-right font-mono text-[var(--text-tertiary)]">${item.totalUSD.toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr className="bg-[var(--bg-card-muted)] font-mono text-[10px] print:bg-slate-100">
                          <td colSpan={5} className="py-2 px-3 text-right font-bold text-[var(--text-tertiary)]">Section Subtotal:</td>
                          <td className="py-2 px-3 text-right font-bold text-[var(--text-primary)] print:text-slate-950">KSh {sectionTotalKSh.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right font-bold text-[var(--text-tertiary)]">${Math.round(sectionTotalKSh/KSH_PER_USD).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Grand Total */}
            <div className="bg-[var(--battery-soft)] border border-[var(--battery)]/20 rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 print:bg-slate-100 print:border-slate-300">
              <div className="text-sm font-black text-[var(--text-primary)] print:text-slate-950">GRAND TOTAL (ex-VAT):</div>
              <div className="text-right">
                <div className="text-2xl font-black text-[var(--battery)] font-mono print:text-emerald-700">KSh {results.totalCapExKSh.toLocaleString()}</div>
                <div className="text-xs text-[var(--text-tertiary)]">{`≈`} ${results.totalCapExUSD.toLocaleString()} USD (at KSh {KSH_PER_USD}/USD)</div>
                <div className="text-[9px] text-[var(--text-muted)] mt-1">Includes: Subtotal KSh {results.subtotalCapExKSh.toLocaleString()} + Contingency KSh {results.contingencyKSh.toLocaleString()} + EPC Margin KSh {results.epcMarginKSh.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Cable Sizing Summary */}
          <div className="space-y-3 page-break-before">
            <h3 className="text-sm font-bold text-[var(--battery)] uppercase tracking-widest font-mono border-b border-[var(--border)] pb-1.5 print:text-emerald-600 print:border-slate-300">4. IEC 60364-5-52 Cable Sizing Summary</h3>
            <div className="overflow-x-auto border border-[var(--border)] rounded-xl print:border-slate-300">
              <table className="w-full text-left border-collapse text-[10px] font-mono">
                <thead>
                  <tr className="bg-[var(--bg-card-muted)] border-b border-[var(--border)] text-[9px] uppercase text-[var(--text-tertiary)] print:bg-slate-100 print:text-slate-800">
                    <th className="py-2 px-3">Circuit</th><th className="py-2 px-3 text-right">Design Current (A)</th><th className="py-2 px-3 text-center">Cable Size (mm²)</th><th className="py-2 px-3 text-center">Parallel Runs</th><th className="py-2 px-3 text-right">Price/m (KSh)</th><th className="py-2 px-3 text-right">Length (m)</th><th className="py-2 px-3 text-right">Total (KSh)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)] text-[var(--text-secondary)] print:divide-slate-200 print:text-slate-800">
                  {results.cableSizingResults.map((c, i) => (
                    <tr key={i} className="hover:bg-[var(--bg-card-muted)]">
                      <td className="py-2 px-3 font-semibold text-[var(--text-primary)] print:text-slate-900">{c.circuit}</td>
                      <td className="py-2 px-3 text-right">{c.designCurrentA}A</td>
                      <td className="py-2 px-3 text-center">{c.recommendedSizeMM2}mm²</td>
                      <td className="py-2 px-3 text-center">{c.parallelRuns}</td>
                      <td className="py-2 px-3 text-right">KSh {c.pricePerM}</td>
                      <td className="py-2 px-3 text-right">{c.totalLengthM}m</td>
                      <td className="py-2 px-3 text-right font-bold text-[var(--text-primary)] print:text-slate-950">KSh {c.totalCostKSh.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Environmental Certificate */}
          <div className="border border-[var(--battery)]/20 bg-[var(--battery-soft)] rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 print:bg-slate-50 print:border-slate-300 page-break-avoid">
            <div className="p-4 bg-white/60 rounded-full border border-[var(--battery)]/20 text-[var(--battery)] shrink-0"><Leaf className="w-8 h-8" /></div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--battery)] uppercase font-mono tracking-wider print:text-emerald-600"><Award className="w-4 h-4" /> ESG Compliance Certificate</div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed print:text-slate-800">
                This installation will avoid <strong>{results.annualCO2SavedTons} metric tons of CO&#8322; emissions annually</strong> - equivalent to <strong>{results.equivalentTreesPlanted} mature trees</strong> planted.
                Qualifies for regional carbon credit applications.
              </p>
            </div>
          </div>

          {/* Sign-off */}
          <div className="space-y-6 pt-6 border-t border-[var(--border)] print:border-slate-300 page-break-avoid">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2 bg-[var(--bg-card-muted)] p-4 rounded-xl border border-[var(--border)] print:bg-slate-100 print:border-slate-300">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase font-mono tracking-wider block">Equipment Warranties</span>
                <div className="text-[10px] space-y-1.5 text-[var(--text-secondary)] print:text-slate-800">
                  <div className="flex justify-between"><span>Solar Panels:</span><strong>25-Year Linear Power Warranty</strong></div>
                  <div className="flex justify-between"><span>LiFePO4 Batteries:</span><strong>10-Year / 6,000 Cycles</strong></div>
                  <div className="flex justify-between"><span>Inverter Units:</span><strong>5-10 Year Comprehensive</strong></div>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase font-mono tracking-wider block">Proposal Acceptance</span>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="border-t border-[var(--border)] pt-4 print:border-slate-300">
                    <div className="h-8 flex items-end justify-center text-xs font-mono text-[var(--text-tertiary)] italic">{engineerName.split(' ')[0]}</div>
                    <span className="block text-[9px] text-[var(--text-muted)] font-mono text-center uppercase border-t border-dashed border-[var(--border)] pt-1">For SafariCharge Ltd</span>
                  </div>
                  <div className="border-t border-[var(--border)] pt-4 print:border-slate-300">
                    <div className="h-8" />
                    <span className="block text-[9px] text-[var(--text-muted)] font-mono text-center uppercase border-t border-dashed border-[var(--border)] pt-1">For B2B Client</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-center text-[9px] text-[var(--text-muted)] font-mono pt-4 border-t border-[var(--border)] print:border-slate-200">
              &copy; 2026 SafariCharge Ltd. All proposals subject to site audits and local grid connection permits. Prices ex-VAT.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
