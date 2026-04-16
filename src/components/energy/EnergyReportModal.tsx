'use client';


import React, { useState, useMemo } from 'react';
import { FileSpreadsheet, X, DollarSign, Download, FileText, Loader2, Image as ImageIcon } from 'lucide-react';
import { KPLC_TARIFF, GRID_EMISSION_FACTOR, TREE_CO2_KG_PER_YEAR, AVG_CAR_EMISSION_KG_PER_KM } from '@/lib/tariff';


export type ReportMinuteRecord = {
  timestamp: string;
  date: string;
  year: number;
  month: number;
  week: number;
  day: number;
  hour: number;
  minute: number;
  solarKW: number;
  homeLoadKW: number;
  ev1LoadKW: number;
  ev2LoadKW: number;
  batteryPowerKW: number;
  batteryLevelPct: number;
  gridImportKW: number;
  gridExportKW: number;
  ev1SocPct: number;
  ev2SocPct: number;
  tariffRate: number;
  isPeakTime: boolean;
  savingsKES: number;
  solarEnergyKWh: number;
  gridImportKWh: number;
  gridExportKWh: number;
};


interface EnergyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  savings: number;
  solarConsumed: number;
  gridImport: number;
  carbonOffset: number;
  minuteData: ReportMinuteRecord[];
  systemStartDate: string;
  onExportCsv: () => Promise<void>;
  onExportExcel: () => Promise<void>;
  onFormalReport: () => Promise<void>;
  onDownloadCharts?: () => Promise<void>;
}


export const EnergyReportModal = ({
  isOpen,
  onClose,
  savings,
  solarConsumed,
  gridImport,
  minuteData,
  systemStartDate,
  onExportCsv,
  onExportExcel,
  onFormalReport,
  onDownloadCharts,
  carbonOffset,
}: EnergyReportModalProps) => {
  const [activeTab, setActiveTab] = useState('daily');
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDownloadingCharts, setIsDownloadingCharts] = useState(false);


  const reportStats = useMemo(() => {
    let solar = 0, gridImportTotal = 0, gridExport = 0, savingsTotal = 0;
    const days = new Set<string>();
    const weeks = new Set<string>();
    const months = new Set<string>();
    const years = new Set<number>();
    for (const d of minuteData) {
      solar += d.solarEnergyKWh;
      gridImportTotal += d.gridImportKWh;
      gridExport += d.gridExportKWh;
      savingsTotal += d.savingsKES;
      days.add(d.date);
      weeks.add(`${d.year}-W${d.week}`);
      months.add(`${d.year}-${d.month}`);
      years.add(d.year);
    }
    return {
      totalSolarGenerated: solar,
      totalGridImportKWh: gridImportTotal,
      totalGridExportKWh: gridExport,
      totalSavings: savingsTotal,
      uniqueDays: days.size,
      uniqueWeeks: weeks.size,
      uniqueMonths: months.size,
      uniqueYears: years.size,
    };
  }, [minuteData, minuteData.length]);


  if (!isOpen) return null;


  const highRateTotal = KPLC_TARIFF.getHighRateWithVAT();
  const lowRateTotal = KPLC_TARIFF.getLowRateWithVAT();


  const totalDataPoints = minuteData.length;
  const { totalSolarGenerated, totalGridImportKWh, totalGridExportKWh, totalSavings,
          uniqueDays, uniqueWeeks, uniqueMonths, uniqueYears } = reportStats;


  const dateRange = totalDataPoints > 0
    ? `${minuteData[0]?.date || 'N/A'} to ${minuteData[totalDataPoints - 1]?.date || 'N/A'}`
    : 'No data yet';


  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-in-right border border-[var(--border)]">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-sky-400" />
            <h2 className="font-bold text-lg">Energy Report &amp; Export</h2>
          </div>
          <button onClick={onClose} className="text-white hover:text-slate-300"><X size={20}/></button>
        </div>


        <div className="grid grid-cols-2 sm:grid-cols-4 bg-[var(--bg-card-muted)] p-1 border-b border-[var(--border)] gap-1">
          <button onClick={() => setActiveTab('daily')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === 'daily' ? 'bg-[var(--bg-card)] text-[var(--battery)] shadow' : 'text-[var(--text-tertiary)]'}`}>Summary</button>
          <button onClick={() => setActiveTab('tariff')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === 'tariff' ? 'bg-[var(--bg-card)] text-[var(--battery)] shadow' : 'text-[var(--text-tertiary)]'}`}>Tariff Rates</button>
          <button onClick={() => setActiveTab('sustainability')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === 'sustainability' ? 'bg-[var(--bg-card)] text-[var(--battery)] shadow' : 'text-[var(--text-tertiary)]'}`}>Sustainability</button>
          <button onClick={() => setActiveTab('export')} className={`flex-1 py-2 text-xs font-bold uppercase ${activeTab === 'export' ? 'bg-[var(--bg-card)] text-[var(--battery)] shadow' : 'text-[var(--text-tertiary)]'}`}>Export Data</button>
        </div>


        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {activeTab === 'daily' && (
          <div className="space-y-4">
            <div className="bg-[var(--bg-card-muted)] p-3 rounded-lg border border-[var(--border)] flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-[var(--text-secondary)]">
                <span className="font-bold">System Start:</span> {systemStartDate} |
                <span className="font-bold ml-2">Date Range:</span> {dateRange}
              </div>
              <div className="text-xs bg-[var(--consumption-soft,rgba(16,185,129,0.15))] text-[var(--consumption)] px-2 py-1 rounded font-bold">
                {totalDataPoints.toLocaleString()} data points
              </div>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="bg-[var(--bg-card-muted)] p-4 rounded-xl border border-[var(--border)] flex flex-col items-center">
                  <span className="text-xs font-bold text-[var(--battery)] uppercase">Total Savings</span>
                  <span className="text-2xl font-black text-[var(--battery)]">KES {totalSavings.toFixed(0)}</span>
              </div>
              <div className="bg-[var(--bg-card-muted)] p-4 rounded-xl border border-[var(--border)] flex flex-col items-center">
                  <span className="text-xs font-bold text-[var(--consumption)] uppercase">Solar Generated</span>
                  <span className="text-2xl font-black text-[var(--consumption)]">{totalSolarGenerated.toFixed(1)} kWh</span>
              </div>
              <div className="bg-[var(--bg-card-muted)] p-4 rounded-xl border border-[var(--border)] flex flex-col items-center">
                  <span className="text-xs font-bold text-[var(--alert)] uppercase">Grid Import</span>
                  <span className="text-2xl font-black text-[var(--alert)]">{totalGridImportKWh.toFixed(1)} kWh</span>
              </div>
              <div className="bg-[var(--bg-card-muted)] p-4 rounded-xl border border-[var(--border)] flex flex-col items-center">
                  <span className="text-xs font-bold text-[var(--grid)] uppercase">Grid Export</span>
                  <span className="text-2xl font-black text-[var(--grid)]">{totalGridExportKWh.toFixed(1)} kWh</span>
              </div>
            </div>


            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border)] text-center">
                <div className="text-2xl font-black text-[var(--text-primary)]">{uniqueYears}</div>
                <div className="text-xs text-[var(--text-secondary)] font-bold uppercase">Years</div>
              </div>
              <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border)] text-center">
                <div className="text-2xl font-black text-[var(--text-primary)]">{uniqueMonths}</div>
                <div className="text-xs text-[var(--text-secondary)] font-bold uppercase">Months</div>
              </div>
              <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border)] text-center">
                <div className="text-2xl font-black text-[var(--text-primary)]">{uniqueWeeks}</div>
                <div className="text-xs text-[var(--text-secondary)] font-bold uppercase">Weeks</div>
              </div>
              <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border)] text-center">
                <div className="text-2xl font-black text-[var(--text-primary)]">{uniqueDays}</div>
                <div className="text-xs text-[var(--text-secondary)] font-bold uppercase">Days</div>
              </div>
            </div>
          </div>
          )}


          {activeTab === 'tariff' && (
          <div className="space-y-4">
            <div className="bg-[var(--bg-card-muted)] p-4 rounded-xl border border-[var(--border)]">
              <h3 className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <DollarSign size={16} className="text-green-600" />
                Kenya Power Commercial Tariff (E-Mobility)
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4">Based on KPLC bill - February 2026 for ROAM ELECTRIC LIMITED</p>


              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-orange-600">PEAK HOURS</span>
                    <span className="text-[10px] bg-orange-200 text-orange-800 px-2 py-0.5 rounded">06:00-10:00 &amp; 18:00-22:00</span>
                  </div>
                  <div className="text-2xl font-black text-orange-900">KES {highRateTotal.toFixed(2)}/kWh</div>
                  <div className="text-[10px] text-orange-600 mt-1">Base: KES {KPLC_TARIFF.HIGH_RATE_BASE.toFixed(2)} + charges</div>
                </div>


                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-green-600">OFF-PEAK HOURS</span>
                    <span className="text-[10px] bg-green-200 text-green-800 px-2 py-0.5 rounded">All other times</span>
                  </div>
                  <div className="text-2xl font-black text-[var(--battery)]">KES {lowRateTotal.toFixed(2)}/kWh</div>
                  <div className="text-[10px] text-green-600 mt-1">Base: KES {KPLC_TARIFF.LOW_RATE_BASE.toFixed(2)} + charges</div>
                </div>
              </div>


              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <h4 className="text-xs font-bold text-[var(--text-secondary)] mb-2">Additional Charges (per kWh)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                  <div className="flex justify-between bg-[var(--bg-card)] px-2 py-1 rounded">
                    <span className="text-[var(--text-tertiary)]">Fuel Cost</span>
                    <span className="font-bold text-[var(--text-primary)]">KES {KPLC_TARIFF.FUEL_ENERGY_COST.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between bg-[var(--bg-card)] px-2 py-1 rounded">
                    <span className="text-[var(--text-tertiary)]">FERFA</span>
                    <span className="font-bold text-[var(--text-primary)]">KES {KPLC_TARIFF.FERFA.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between bg-[var(--bg-card)] px-2 py-1 rounded">
                    <span className="text-[var(--text-tertiary)]">INFA</span>
                    <span className="font-bold text-[var(--text-primary)]">KES {KPLC_TARIFF.INFA.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between bg-[var(--bg-card)] px-2 py-1 rounded">
                    <span className="text-[var(--text-tertiary)]">ERC Levy</span>
                    <span className="font-bold text-[var(--text-primary)]">KES {KPLC_TARIFF.ERC_LEVY.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between bg-[var(--bg-card)] px-2 py-1 rounded">
                    <span className="text-[var(--text-tertiary)]">WRA Levy</span>
                    <span className="font-bold text-[var(--text-primary)]">KES {KPLC_TARIFF.WRA_LEVY.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between bg-[var(--bg-card)] px-2 py-1 rounded">
                    <span className="text-[var(--text-tertiary)]">VAT</span>
                    <span className="font-bold text-[var(--text-primary)]">{(KPLC_TARIFF.VAT_RATE * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}


          {activeTab === 'sustainability' && (
          <div className="space-y-4">
            <div className="bg-[var(--bg-card-muted)] p-4 rounded-xl border border-[var(--border)]">
              <h3 className="font-bold text-[var(--battery)] mb-1 flex items-center gap-2">
                🌿 Carbon Impact
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-4 text-justify [text-align-last:left]">
                Estimated CO₂ avoided by using solar instead of the Kenya national grid
                (avg. emission factor: {GRID_EMISSION_FACTOR} kgCO₂/kWh, hydro+thermal mix).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)] flex flex-col items-center">
                  <span className="text-2xl font-black text-[var(--battery)]">{carbonOffset.toFixed(1)}</span>
                  <span className="text-xs font-bold text-[var(--battery)] uppercase mt-1">kg CO₂ Avoided</span>
                </div>
                <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)] flex flex-col items-center">
                  <span className="text-2xl font-black text-[var(--battery)]">{(carbonOffset / TREE_CO2_KG_PER_YEAR).toFixed(2)}</span>
                  <span className="text-xs font-bold text-[var(--battery)] uppercase mt-1">Trees Equivalent</span>
                  <span className="text-[9px] text-[var(--text-tertiary)] mt-0.5">({TREE_CO2_KG_PER_YEAR} kg CO₂/tree/yr)</span>
                </div>
                <div className="bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border)] flex flex-col items-center">
                  <span className="text-2xl font-black text-[var(--battery)]">{(carbonOffset / AVG_CAR_EMISSION_KG_PER_KM).toFixed(0)}</span>
                  <span className="text-xs font-bold text-[var(--battery)] uppercase mt-1">km Not Driven</span>
                  <span className="text-[9px] text-[var(--text-tertiary)] mt-0.5">(avg {AVG_CAR_EMISSION_KG_PER_KM} kgCO₂/km)</span>
                </div>
              </div>
            </div>


            <div className="bg-[var(--bg-card-muted)] p-4 rounded-xl border border-[var(--border)]">
              <h3 className="font-bold text-[var(--text-primary)] mb-3">Self-Sufficiency Breakdown</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border)]">
                  <div className="text-[var(--text-tertiary)] mb-1">Total Solar Generated</div>
                  <div className="text-2xl font-black text-[var(--consumption)]">{totalSolarGenerated.toFixed(1)} kWh</div>
                </div>
                <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border)]">
                  <div className="text-[var(--text-tertiary)] mb-1">Grid Import</div>
                  <div className="text-2xl font-black text-[var(--alert)]">{totalGridImportKWh.toFixed(1)} kWh</div>
                </div>
                <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border)]">
                  <div className="text-[var(--text-tertiary)] mb-1">Grid Export (Surplus)</div>
                  <div className="text-2xl font-black text-[var(--battery)]">{totalGridExportKWh.toFixed(1)} kWh</div>
                </div>
                <div className="bg-[var(--bg-card)] p-3 rounded-lg border border-[var(--border)]">
                  <div className="text-[var(--text-tertiary)] mb-1">Solar Self-Consumption</div>
                  <div className="text-2xl font-black text-[var(--consumption)]">
                    {totalSolarGenerated > 0 ? (((totalSolarGenerated - totalGridExportKWh) / totalSolarGenerated) * 100).toFixed(1) : '0.0'}%
                  </div>
                </div>
              </div>
            </div>


            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-[var(--text-secondary)]">
              <strong>Simulation Physics:</strong> Solar model uses Nairobi latitude (1.29°S) seasonal peak hour,
              panel temperature coefficient (−0.5%/°C above 25°C), soiling/dust accumulation (reset by rain),
              inverter efficiency curve (82-97%), and variable battery round-trip efficiency (85-95%).
            </div>
          </div>
          )}


          {activeTab === 'export' && (
          <div className="space-y-6">
            <div className="bg-[var(--bg-card-muted)] p-6 rounded-xl border border-[var(--border)]">
              <div className="flex items-center gap-3 mb-4">
                <Download size={24} className="text-sky-600" />
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] text-lg">Export Full Report</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Download comprehensive energy data in Excel-compatible CSV format</p>
                </div>
              </div>


              <div className="bg-[var(--bg-card)] p-4 rounded-lg border border-[var(--border)] mb-4">
                <h4 className="text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase">Report Contents</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Minute-by-minute data ({totalDataPoints.toLocaleString()} records)
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <span className="w-2 h-2 bg-sky-500 rounded-full"></span>
                    Hourly summaries ({uniqueDays * 24}+ hours)
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    Daily summaries ({uniqueDays} days)
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    Weekly summaries ({uniqueWeeks} weeks)
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Monthly summaries ({uniqueMonths} months)
                  </div>
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Yearly summaries ({uniqueYears} years)
                  </div>
                </div>
              </div>


              <button
                onClick={async () => {
                  setIsExporting(true);
                  try { await onExportCsv(); } finally { setIsExporting(false); }
                }}
                disabled={isExporting || totalDataPoints === 0}
                className="w-full py-3 bg-[var(--consumption)] text-white font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <><Loader2 size={18} className="animate-spin" />Generating CSV...</>
                ) : (
                  <><Download size={18} />Download Structured CSV</>
                )}
              </button>
              <button
                onClick={async () => {
                  setIsExportingExcel(true);
                  try { await onExportExcel(); } finally { setIsExportingExcel(false); }
                }}
                disabled={isExportingExcel || totalDataPoints === 0}
                className="mt-3 w-full py-3 bg-[var(--battery)] text-white font-bold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isExportingExcel ? (
                  <><Loader2 size={18} className="animate-spin" />Generating Excel...</>
                ) : (
                  <><FileSpreadsheet size={18} />Download Excel (4 sheets)</>
                )}
              </button>


              {totalDataPoints === 0 && (
                <p className="text-xs text-amber-600 mt-2 text-center">Start the simulation to collect data for export</p>
              )}
            </div>


            {onDownloadCharts && (
              <div className="bg-[var(--bg-card-muted)] p-6 rounded-xl border border-[var(--border)]">
                <div className="flex items-center gap-3 mb-4">
                  <ImageIcon size={24} className="text-[var(--solar)]" />
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] text-lg">Download Daily Charts</h3>
                    <p className="text-xs text-[var(--text-secondary)]">ZIP archive containing one JPG energy chart per simulated day</p>
                  </div>
                </div>


                <button
                  onClick={async () => {
                    setIsDownloadingCharts(true);
                    try { await onDownloadCharts(); } finally { setIsDownloadingCharts(false); }
                  }}
                  disabled={isDownloadingCharts || totalDataPoints === 0}
                  className="w-full py-3 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--solar)', color: '#000' }}
                >
                  {isDownloadingCharts ? (
                    <><Loader2 size={18} className="animate-spin" />Building charts...</>
                  ) : (
                    <><ImageIcon size={18} />Download Charts ZIP ({uniqueDays} day{uniqueDays !== 1 ? 's' : ''})</>
                  )}
                </button>


                {totalDataPoints === 0 && (
                  <p className="text-xs text-amber-600 mt-2 text-center">Start the simulation to generate charts</p>
                )}
              </div>
            )}


            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <FileText size={24} className="text-sky-400" />
                <div>
                  <h3 className="font-bold text-white text-lg">Export PDF Summary</h3>
                  <p className="text-xs text-slate-400">Print-ready one-page SafariCharge summary for KPLC net-metering applications</p>
                </div>
              </div>


              <button
                onClick={async () => {
                  setIsGeneratingPDF(true);
                  try { await onFormalReport(); } finally { setIsGeneratingPDF(false); }
                }}
                disabled={isGeneratingPDF || totalDataPoints === 0}
                className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold rounded-lg hover:from-sky-600 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25"
              >
                {isGeneratingPDF ? (
                  <><Loader2 size={18} className="animate-spin" />Preparing print layout...</>
                ) : (
                  <><FileText size={18} />Export PDF (Print)</>
                )}
              </button>
              {totalDataPoints === 0 ? (
                <p className="text-xs text-amber-400 mt-2 text-center">Start the simulation to generate a report</p>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] mt-2 text-center">Uses browser print view with a hidden print-only summary layout</p>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default EnergyReportModal;
