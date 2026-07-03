import { useState, useEffect, useMemo } from 'react';
import {
  MapPin, RefreshCw, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, ArrowRight,
} from 'lucide-react';
import { SOLAR_LOCATIONS, LOAD_PROFILES, PROJECT_PRESETS, ProjectPreset } from '@/lib/sizing/mockData';
import type { SimulationInputs } from '@/lib/sizing/solarCalculator';
import type { SizingCatalog, CatalogInverter } from '@/lib/sizing/catalogTypes';
import type { KPLCCustomerSegment, TariffStructure } from '@/lib/sizing/financialEngine';
import type { InstallationMethod } from '@/lib/sizing/cableSizing';
import { INSTALL_METHOD_LABELS } from '@/lib/sizing/cableSizing';

interface ParametricInputsProps {
  catalog: SizingCatalog;
  onChange: (inputs: SimulationInputs) => void;
}

type SizingMethod = 'direct' | 'load-based';
type SystemArchitecture = 'central_inverter' | 'microinverter';
type InverterBrand = string;
// Mirrors the Excel Model Lists sheet: one LV list, one HV list and one
// Grid-Tied list per brand. Off-grid (LV 48V bus) models are folded into LV,
// exactly as the workbook does for Solis.
type VoltageClass = 'LV (48V)' | 'HV' | 'Grid-Tied';
type DynessProductLine = 'Stack100' | 'Stack280' | 'LV48';

const fmtKSh = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : String(n);
const nf = (n: number, d = 1) => n.toFixed(d);

const AnimatedValue = ({ value, unit, className }: { value: string; unit?: string; className?: string }) => (
  <span className={`transition-all duration-300 ${className || ''}`}>
    {value}{unit && <span className="text-[0.7em] ml-0.5 opacity-70">{unit}</span>}
  </span>
);

const Section = ({ id, label, color, defaultOpen, children, summary }: {
  id: string; label: string; color: string;
  defaultOpen?: boolean; children: React.ReactNode; summary?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen ?? true);
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden transition-all duration-300 hover:border-[var(--border-hover)]">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[var(--bg-card-muted)] transition-colors">
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${color}`}>{id}</span>
          <div className="text-left min-w-0">
            <span className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">{label}</span>
            {!open && summary && <span className="sm:hidden block text-[10px] text-[var(--text-muted)] font-mono truncate">{summary}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          {!open && summary && <span className="hidden sm:block text-[10px] text-[var(--text-muted)] font-mono truncate max-w-[280px]">{summary}</span>}
          {open ? <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />}
        </div>
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-[var(--border)] pt-4">{children}</div>}
    </div>
  );
};

const Metric = ({ label, value, unit, color = 'slate', size = 'md' }: {
  label: string; value: string; unit?: string; color?: string; size?: string;
}) => {
  const colors: Record<string, string> = {
    emerald: 'text-[var(--battery)] bg-[var(--battery-soft)] border-[var(--battery)]/20',
    amber: 'text-[var(--solar)] bg-[var(--solar-soft)] border-[var(--solar)]/20',
    blue: 'text-[var(--grid)] bg-[var(--grid-soft)] border-[var(--grid)]/20',
    red: 'text-red-600 bg-red-50 border-red-200',
    slate: 'text-[var(--text-secondary)] bg-[var(--bg-card-muted)] border-[var(--border)]',
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 text-center transition-all duration-300 min-w-0 ${colors[color]}`} title={`${label}: ${value}${unit ? ` ${unit}` : ''}`}>
      <div className="text-[9px] text-[var(--text-muted)] uppercase font-medium leading-tight">{label}</div>
      <div className={`font-bold font-mono ${size === 'lg' ? 'text-lg' : 'text-sm'} mt-1 break-words leading-tight`}>
        <AnimatedValue value={value} unit={unit} />
      </div>
    </div>
  );
};

function matchesVoltageClass(inv: CatalogInverter, vclass: VoltageClass): boolean {
  if (inv.category === 'microinverter') return false;
  const vc = inv.voltageClass || '';
  if (vclass === 'Grid-Tied') return inv.category === 'grid_tied';
  if (vclass === 'LV (48V)') return vc.includes('LV'); // includes LV off-grid models, per Excel
  return vc.includes('HV');
}

function inverterVoltageClassOptions(catalog: SizingCatalog, brand: string): { value: VoltageClass; label: string }[] {
  const models = catalog.inverters.filter((i) => i.brand === brand);
  const opts: { value: VoltageClass; label: string }[] = [];
  const count = (vclass: VoltageClass) => models.filter((i) => matchesVoltageClass(i, vclass)).length;
  const lv = count('LV (48V)'), hv = count('HV'), gt = count('Grid-Tied');
  if (lv > 0) opts.push({ value: 'LV (48V)', label: `LV (48V battery) - ${lv} models` });
  if (hv > 0) opts.push({ value: 'HV', label: `HV (high-voltage battery) - ${hv} models` });
  if (gt > 0) opts.push({ value: 'Grid-Tied', label: `Grid-Tied (no battery) - ${gt} models` });
  return opts;
}

const BRAND_ORDER = ['Deye', 'Solis', 'Jinko'];

export default function ParametricInputs({ catalog, onChange }: ParametricInputsProps) {
  const brands = useMemo(() => {
    const found = Array.from(new Set(catalog.inverters.filter((i) => i.category !== 'microinverter').map((i) => i.brand)));
    return found.sort((a, b) => {
      const ia = BRAND_ORDER.indexOf(a), ib = BRAND_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [catalog]);

  // ── Project ──
  const [projectName, setProjectName] = useState('New Sizing Project');
  const [clientName, setClientName] = useState('Enterprise Client');
  const [locationId, setLocationId] = useState(SOLAR_LOCATIONS[0].id);

  // ── Architecture ──
  const [architecture, setArchitecture] = useState<SystemArchitecture>('central_inverter');

  // ── Section A ──
  const [sizingMethod, setSizingMethod] = useState<SizingMethod>('direct');
  const [directTargetKW, setDirectTargetKW] = useState(50);
  const [dailyConsumptionKWh, setDailyConsumptionKWh] = useState(200);
  const [peakLoadKW, setPeakLoadKW] = useState(35);
  const [essentialLoadOverride, setEssentialLoadOverride] = useState<number | null>(null);
  const [backupAutonomyHrs, setBackupAutonomyHrs] = useState(4);

  // ── Section B ──
  const [invBrand, setInvBrand] = useState<InverterBrand>(brands[0] ?? 'Deye');
  const [invVoltageClass, setInvVoltageClass] = useState<VoltageClass>('HV');
  const [selectedInverterId, setSelectedInverterId] = useState('');
  const [invManualOverride, setInvManualOverride] = useState<number | null>(null);

  // Snap the voltage class to a valid option whenever the brand changes, so a
  // brand switch never strands the user on a class with no models (e.g. Jinko
  // has LV models only).
  useEffect(() => {
    const opts = inverterVoltageClassOptions(catalog, invBrand);
    if (opts.length > 0 && !opts.some((o) => o.value === invVoltageClass)) {
      setInvVoltageClass(opts[0].value);
    }
  }, [catalog, invBrand, invVoltageClass]);

  // ── Section C ──
  const [dcAcOversize, setDcAcOversize] = useState(1.30);
  const [panelWattage, setPanelWattage] = useState(620);
  const [panelsPerString, setPanelsPerString] = useState(7);

  // ── Section D ──
  const [dynessLine, setDynessLine] = useState<DynessProductLine>('Stack100');
  const [targetBatteryKWh, setTargetBatteryKWh] = useState(50);

  // ── Section F: Microinverter ──
  const [microTargetKW, setMicroTargetKW] = useState(5);
  const [microPanelWattage, setMicroPanelWattage] = useState(450);
  const [microInverterId, setMicroInverterId] = useState('');

  // ── Section G: Cable engineering ──
  const [installMethod, setInstallMethod] = useState<InstallationMethod>('clipped_direct');
  const [ambientTempC, setAmbientTempC] = useState(30);
  const [minDesignAmbientTempC, setMinDesignAmbientTempC] = useState(10);

  // ── Financial Analysis ──
  const [specificYield, setSpecificYield] = useState(4.3);
  const [selfConsumptionPct, setSelfConsumptionPct] = useState(85);
  const [tariffEscalation, setTariffEscalation] = useState(6);
  const [panelDegradation, setPanelDegradation] = useState(0.5);
  const [omCostPct, setOmCostPct] = useState(1.5);
  const [omEscalation, setOmEscalation] = useState(5);
  const [batteryReplYear, setBatteryReplYear] = useState(11);
  const [batteryReplCostPct, setBatteryReplCostPct] = useState(60);
  const [discountRate, setDiscountRate] = useState(12);
  // Defaults 0 to mirror the Excel Quotation & BOM exactly (its retail prices
  // already embed seller margin; VAT 16% is applied by the engine on top).
  const [contingencyPct, setContingencyPct] = useState(0);
  const [epcMarginPct, setEpcMarginPct] = useState(0);
  const inflationRate = 5.5; // reserved; the engine escalates via tariff/O&M rates

  // ── KPLC Time-of-Use ──
  const [useTOU, setUseTOU] = useState(false);
  const [kplcSegment, setKplcSegment] = useState<KPLCCustomerSegment>('Residential');
  const [tariffStructure, setTariffStructure] = useState<TariffStructure>('Standard');
  const [monthlyConsumptionKWh, setMonthlyConsumptionKWh] = useState(1000);

  // ── Financing ──
  const [debtFractionPct, setDebtFractionPct] = useState(0);
  const [loanRatePct, setLoanRatePct] = useState(15);
  const [loanTermYears, setLoanTermYears] = useState(5);

  // ── Add-ons: defaults mirror the Excel BOM's default configuration
  // (Section 8 priced via one switch, KPLC support and first-year O&M included).
  const [includeGenInterface, setIncludeGenInterface] = useState(true);
  const [includeKPLC, setIncludeKPLC] = useState(true);
  const [includeOandM, setIncludeOandM] = useState(true);

  const location = SOLAR_LOCATIONS.find(l => l.id === locationId) || SOLAR_LOCATIONS[0];
  const loadProfile = LOAD_PROFILES[0];

  // Excel C14: peak load x 1.25 safety margin.
  const suggestedInverterKW = peakLoadKW * 1.25;
  // Excel C15: essential load x backup hours / DoD (Dyness LiFePO4 usable DoD 90%),
  // where essential load defaults to 50% of peak (C11) - sizes the bank so USABLE
  // energy covers the outage.
  const essentialLoadKW = essentialLoadOverride ?? Math.round(peakLoadKW * 0.5 * 100) / 100;
  const suggestedBatteryKWh_raw = (essentialLoadKW * backupAutonomyHrs) / 0.9;
  const effectiveTargetKW = sizingMethod === 'direct' ? directTargetKW : suggestedInverterKW;

  const filteredInverters = useMemo(() =>
    catalog.inverters
      .filter((inv) => inv.brand === invBrand && matchesVoltageClass(inv, invVoltageClass))
      .sort((a, b) => a.ratedAcW - b.ratedAcW),
    [catalog, invBrand, invVoltageClass]);

  useEffect(() => {
    if (filteredInverters.length === 0 || filteredInverters.find(i => i.id === selectedInverterId)) return;
    // Pick the smallest model whose rating covers the target in one unit
    // (falls back to the largest available) so switching brand/class doesn't
    // default to a tiny unit that needs a dozen in parallel.
    const targetW = effectiveTargetKW * 1000;
    const bestFit = filteredInverters.find((i) => i.ratedAcW >= targetW) ?? filteredInverters[filteredInverters.length - 1];
    setSelectedInverterId(bestFit.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredInverters, selectedInverterId]);

  const microInverters = useMemo(() => catalog.inverters.filter((i) => i.category === 'microinverter'), [catalog]);
  useEffect(() => {
    if (microInverters.length > 0 && !microInverters.find((i) => i.id === microInverterId)) {
      setMicroInverterId(microInverters[0].id);
    }
  }, [microInverters, microInverterId]);

  const selectedInv = catalog.inverters.find(i => i.id === selectedInverterId) || filteredInverters[0] || catalog.inverters[0];
  const invUnitACkW = (selectedInv?.ratedAcW ?? 50000) / 1000;
  const invUnitMaxPV = selectedInv?.maxPvInputKwp ?? 75;
  const invUnitPriceKSh = selectedInv?.priceKsh ?? 850000;
  const invArchitecture = selectedInv?.voltageClass || selectedInv?.category || 'HV';
  const isGridTied = selectedInv?.category === 'grid_tied';
  const isHV = invArchitecture.includes('HV');
  const isLV = invArchitecture.includes('LV');

  // Excel C24: MAX(1, CEILING(target x 0.95 / unit kW)) - allows up to 5%
  // inverter undersizing before adding a unit (the 1.25 safety factor already
  // covers this), preventing a tiny overshoot from doubling the inverter count.
  const suggestedInvUnits = Math.max(1, Math.ceil((effectiveTargetKW * 0.95) / invUnitACkW));
  const actualInvUnits = invManualOverride ?? suggestedInvUnits;
  const totalInverterACkW = actualInvUnits * invUnitACkW;

  const targetPVkWp = totalInverterACkW * dcAcOversize;
  const maxAllowablePVkWp = actualInvUnits * invUnitMaxPV;
  // Excel C33: ROUND(target kWp x 1000 / panel W) - nearest panel, not ceiling.
  const panelsRequired = Math.max(1, Math.round((targetPVkWp * 1000) / panelWattage));
  const actualPVkWp = (panelsRequired * panelWattage) / 1000;
  const pvOversizeOK = actualPVkWp <= maxAllowablePVkWp;
  const panelObj = catalog.panels.find(p => p.wattage === panelWattage) || catalog.panels[0];
  const panelTotalPriceKSh = panelsRequired * (panelObj?.priceKsh ?? 11900);
  const stockWarning = panelWattage === 620 ? 'Low stock (~50 units) - consider 625W' : '';

  // Excel Section D: the battery flow follows the inverter architecture. LV
  // inverters always use the LV48 line (DL5.0/DL5.0C parallel modules at the
  // LV48 price); HV inverters use Stack100/Stack280.
  useEffect(() => {
    if (isLV && dynessLine !== 'LV48') setDynessLine('LV48');
    else if (isHV && dynessLine === 'LV48') setDynessLine('Stack100');
  }, [isLV, isHV, dynessLine]);

  const battery = dynessLine === 'Stack280'
    ? catalog.batteries.find((b) => b.category === 'hv_stack280')
    : dynessLine === 'Stack100'
      ? catalog.batteries.find((b) => b.category === 'hv_stack100')
      : catalog.batteries.find((b) => b.category === 'lv48');
  const modKWh = battery?.moduleKwh ?? (dynessLine === 'Stack280' ? 14.3 : 5.12);
  const modCost = battery?.pricePerModuleKsh ?? 132500;
  const batModsReq = Math.max(0, Math.ceil(targetBatteryKWh / modKWh));
  const maxPerTower = 15;
  const batTowers = isHV && !isGridTied ? Math.max(1, Math.ceil(batModsReq / maxPerTower)) : (batModsReq > 0 ? 1 : 0);
  const modsPerTower = batTowers > 0 ? Math.ceil(batModsReq / batTowers) : 0;
  const actualBatMods = modsPerTower * batTowers;
  const actualBatteryKWh = actualBatMods * modKWh;
  const bduCount = isHV && !isGridTied ? batTowers : 0;
  const towerVoltage = isHV ? modsPerTower * 51.2 : 48;

  let vCheckOK = true; let vCheckMsg = 'OK';
  if (isHV && !isGridTied && batModsReq > 0) {
    const vr = invArchitecture;
    if (vr.includes('160-700V')) { vCheckOK = towerVoltage >= 160 && towerVoltage <= 700; vCheckMsg = vCheckOK ? `OK (${towerVoltage}V in 160-700V)` : `WARN: ${towerVoltage}V outside 160-700V`; }
    else if (vr.includes('160-800V')) { vCheckOK = towerVoltage >= 160 && towerVoltage <= 800; vCheckMsg = vCheckOK ? `OK (${towerVoltage}V in 160-800V)` : `WARN: ${towerVoltage}V outside 160-800V`; }
    else if (vr.includes('150-850V')) { vCheckOK = towerVoltage >= 150 && towerVoltage <= 850; vCheckMsg = vCheckOK ? `OK (${towerVoltage}V in 150-850V)` : `WARN: ${towerVoltage}V outside 150-850V`; }
  }

  const roughCapExKSh = panelTotalPriceKSh + (actualInvUnits * invUnitPriceKSh) + (actualBatMods * modCost) + (bduCount * 95000) + (actualPVkWp * 14000);
  const roughCapExUSD = Math.round(roughCapExKSh / 127.5);

  useEffect(() => {
    const panelId = catalog.panels.find(p => p.wattage === panelWattage)?.id ?? catalog.panels[0]?.id ?? '';
    const microPanelId = catalog.panels.find(p => p.wattage === microPanelWattage)?.id ?? catalog.panels[0]?.id ?? '';

    onChange({
      location, loadProfile, loadMultiplier: 1.0,
      systemArchitecture: architecture,
      panelId, panelQty: panelsRequired,
      inverterId: selectedInverterId, inverterQty: actualInvUnits,
      batteryId: battery?.id ?? '', batteryQty: actualBatMods,
      dcAcOversizeRatio: dcAcOversize, targetBatteryKWh, dynessProductLine: dynessLine,
      panelsPerString,
      microPanelId, microInverterId, microTargetSystemKW: microTargetKW,
      installationMethod: installMethod, ambientTempC, minDesignAmbientTempC,
      contingencyPercent: contingencyPct, epcMarginPercent: epcMarginPct,
      specificYieldKWhPerKWpDay: specificYield, selfConsumptionRatioPercent: selfConsumptionPct,
      gridTariffKShPerKWh: location.gridTariffKSh, tariffEscalationPercent: tariffEscalation,
      panelDegradationPercent: panelDegradation, annualOMCostPercent: omCostPct, omEscalationPercent: omEscalation,
      batteryReplacementYear: batteryReplYear, batteryReplacementCostPercent: batteryReplCostPct,
      discountRate, inflationRate, projectLifeYears: 25,
      useTOUTariff: useTOU, kplcCustomerSegment: kplcSegment, tariffStructure, monthlyConsumptionKWh,
      debtFractionPercent: debtFractionPct, loanInterestRatePercent: loanRatePct, loanTermYears,
      includeGeneratorInterface: includeGenInterface, includeWeatherproofEnclosure: includeGenInterface,
      includeKPLCapplication: includeKPLC, includeOandM: includeOandM,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    catalog, architecture, locationId, sizingMethod, directTargetKW, dailyConsumptionKWh, peakLoadKW, backupAutonomyHrs,
    selectedInverterId, actualInvUnits, dcAcOversize, panelWattage, panelsPerString,
    targetBatteryKWh, dynessLine, microTargetKW, microPanelWattage, microInverterId,
    installMethod, ambientTempC, minDesignAmbientTempC,
    specificYield, selfConsumptionPct, tariffEscalation, panelDegradation, omCostPct, omEscalation,
    batteryReplYear, batteryReplCostPct, discountRate, inflationRate,
    useTOU, kplcSegment, tariffStructure, monthlyConsumptionKWh,
    debtFractionPct, loanRatePct, loanTermYears,
    contingencyPct, epcMarginPct, includeGenInterface, includeKPLC, includeOandM,
  ]);

  const loadPreset = (preset: ProjectPreset) => {
    setProjectName(preset.name); setClientName(preset.clientName); setLocationId(preset.locationId);
    setSizingMethod('direct');
    setArchitecture('central_inverter');
    const pPanel = catalog.panels.find(p => p.id === preset.selectedPanelId);
    if (pPanel) setPanelWattage(pPanel.wattage);
    const pInv = catalog.inverters.find(i => i.id === preset.selectedInverterId);
    if (pInv) {
      setInvBrand(pInv.brand);
      const vc = pInv.voltageClass || '';
      setInvVoltageClass(pInv.category === 'grid_tied' ? 'Grid-Tied' : vc.includes('LV') ? 'LV (48V)' : 'HV');
      setSelectedInverterId(pInv.id);
    }
    if (preset.selectedBatteryId.includes('stack280')) setDynessLine('Stack280');
    else if (preset.selectedBatteryId.includes('stack100')) setDynessLine('Stack100');
    else setDynessLine('LV48');
    setContingencyPct(preset.contingencyPercent); setEpcMarginPct(preset.epcMarginPercent);
    if (preset.name.includes('Cold Storage')) { setDirectTargetKW(150); setTargetBatteryKWh(80); }
    else if (preset.name.includes('Medical')) { setDirectTargetKW(45); setTargetBatteryKWh(88); }
    else { setDirectTargetKW(8); setTargetBatteryKWh(20); }
  };

  return (
    <div className="space-y-5">
      {/* PRESETS + PROJECT ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-[var(--battery)] shrink-0" />
            <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider font-mono mr-1">Quick Load:</span>
            {PROJECT_PRESETS.map(p => (
              <button key={p.name} onClick={() => loadPreset(p)}
                className="bg-[var(--bg-card-muted)] hover:bg-[var(--battery-soft)] hover:text-[var(--battery)] text-[var(--text-secondary)] text-[10px] px-3 py-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--battery)]/40 font-medium transition-all duration-200 active:scale-95">
                {p.name.split(' ')[0]} <span className="text-[var(--text-muted)]">({p.name.includes('Lagos') ? 'NG' : p.name.includes('Joburg') ? 'ZA' : 'KE'})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--battery)]/50 placeholder-[var(--text-muted)] font-medium"
            placeholder="Project Name" />
          <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--battery)]/50 placeholder-[var(--text-muted)]"
            placeholder="Client Organization" />
        </div>
      </div>

      {/* LOCATION SELECTOR */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <MapPin className="w-4 h-4 text-[var(--battery)]" />
            <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider font-mono">Location:</span>
          </div>
          <select value={locationId} onChange={e => setLocationId(e.target.value)}
            className="flex-1 min-w-0 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--battery)] cursor-pointer font-medium">
            {SOLAR_LOCATIONS.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}, {loc.country} - {loc.peakSunHours} PSH, KSh {loc.gridTariffKSh}/kWh, Grid {loc.gridReliability}%</option>
            ))}
          </select>
          <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--text-tertiary)] shrink-0">
            <span>&#9728; <strong className="text-[var(--text-primary)]">{location.peakSunHours}</strong> PSH</span>
            <span className="text-[var(--text-muted)]">|</span>
            <span>&#9889; <strong className="text-[var(--text-primary)]">KSh {location.gridTariffKSh}</strong>/kWh</span>
            <span className="text-[var(--text-muted)]">|</span>
            <span className={location.outageHoursPerDay > 4 ? 'text-red-600' : 'text-[var(--text-tertiary)]'}>
              &#128268; <strong>{location.outageHoursPerDay}h</strong> outages
            </span>
          </div>
        </div>
      </div>

      {/* ARCHITECTURE TOGGLE */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-wider font-mono">System Architecture:</span>
          <div className="flex gap-1 bg-[var(--bg-card-muted)] rounded-xl p-1">
            <button onClick={() => setArchitecture('central_inverter')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${architecture === 'central_inverter' ? 'bg-[var(--battery)] text-white shadow-lg shadow-emerald-600/20' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}>
              Hybrid / Grid-Tied / Off-Grid
            </button>
            <button onClick={() => setArchitecture('microinverter')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${architecture === 'microinverter' ? 'bg-[var(--battery)] text-white shadow-lg shadow-emerald-600/20' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}>
              Microinverter (AC-coupled)
            </button>
          </div>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-2">
          Mutually exclusive per the sizing model: a real project uses one architecture or the other, not both.
        </p>
      </div>

      {architecture === 'central_inverter' ? (
        <>
          {/* SECTION A: SYSTEM SIZE */}
          <Section id="A" label="System Size Input" color="bg-[var(--solar-soft)] text-[var(--solar)] border border-[var(--solar)]/20"
            summary={`Target: ${nf(effectiveTargetKW, 1)} kW - Method: ${sizingMethod === 'direct' ? 'Direct' : 'Load-based'}`}>
            <div className="flex gap-1 bg-[var(--bg-card-muted)] rounded-xl p-1 w-fit">
              <button onClick={() => setSizingMethod('direct')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${sizingMethod === 'direct' ? 'bg-[var(--battery)] text-white shadow-lg shadow-emerald-600/20' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}>
                Direct kW Entry
              </button>
              <button onClick={() => setSizingMethod('load-based')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${sizingMethod === 'load-based' ? 'bg-[var(--battery)] text-white shadow-lg shadow-emerald-600/20' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}>
                Load-Based Sizing
              </button>
            </div>

            {sizingMethod === 'direct' ? (
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] text-[var(--text-muted)]">Target system size</span>
                  <span className="text-lg font-black text-[var(--solar)] font-mono">{nf(directTargetKW)} <span className="text-sm font-normal text-[var(--solar)]/70">kW</span></span>
                </div>
                <input type="range" min={1} max={400} step={1} value={directTargetKW}
                  onChange={e => setDirectTargetKW(parseInt(e.target.value) || 1)}
                  className="w-full accent-amber-500 h-2 rounded-lg cursor-pointer" />
                <div className="flex justify-between text-[8px] text-[var(--text-muted)] font-mono"><span>1kW</span><span>100</span><span>200</span><span>300</span><span>400kW</span></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Daily Consumption', value: dailyConsumptionKWh, set: (v: number) => setDailyConsumptionKWh(v), unit: 'kWh/day', min: 1 },
                  { label: 'Peak Load', value: peakLoadKW, set: (v: number) => setPeakLoadKW(v), unit: 'kW', min: 1 },
                  { label: 'Essential Load (outage)', value: essentialLoadKW, set: (v: number) => setEssentialLoadOverride(v), unit: 'kW', min: 0.1, step: 0.1 },
                  { label: 'Backup Autonomy', value: backupAutonomyHrs, set: (v: number) => setBackupAutonomyHrs(v), unit: 'hours', min: 0.5, step: 0.5 },
                ].map(f => (
                  <div key={f.label} className="flex flex-col min-w-0">
                    <span className="text-[10px] text-[var(--text-muted)] mb-1 truncate">{f.label}</span>
                    <div className="relative">
                      <input type="number" min={f.min} step={f.step || 1} value={f.value}
                        onChange={e => f.set(Math.max(f.min, parseFloat(e.target.value) || 0))}
                        className="w-full bg-[var(--solar-soft)] border border-[var(--solar)]/30 rounded-xl pl-3 pr-14 py-2.5 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--solar)] transition" />
                      <span className="absolute right-3 top-2.5 text-[10px] text-[var(--solar)]/70 font-mono pointer-events-none">{f.unit}</span>
                    </div>
                  </div>
                ))}
                <p className="col-span-2 sm:col-span-4 text-[10px] text-[var(--text-muted)]">
                  Essential load defaults to 50% of peak - overwrite with the surveyed backup load. Battery suggestion = essential load x backup hours / 90% usable depth of discharge (Dyness LiFePO4).
                </p>
                <div className="col-span-2 sm:col-span-4 grid grid-cols-2 gap-3">
                  <Metric label="Suggested Inverter Size" value={nf(suggestedInverterKW, 1)} unit="kW" color="amber" />
                  <Metric label="Suggested Battery Capacity" value={nf(suggestedBatteryKWh_raw, 1)} unit="kWh" color="amber" />
                </div>
              </div>
            )}

            <div className="bg-[var(--battery-soft)] border border-[var(--battery)]/20 rounded-xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-[var(--battery)]" />
                <span className="text-xs font-bold text-[var(--battery)] font-mono uppercase tracking-wider">Effective Target</span>
              </div>
              <span className="text-xl font-black text-[var(--battery)] font-mono">{nf(effectiveTargetKW, 1)} <span className="text-sm font-normal text-[var(--battery)]/70">kW</span></span>
            </div>
          </Section>

          {/* SECTION B: INVERTER */}
          <Section id="B" label="Inverter Selection" color="bg-[var(--grid-soft)] text-[var(--grid)] border border-[var(--grid)]/20"
            summary={selectedInv ? `${selectedInv.brand} ${selectedInv.model.split('-').slice(0, 3).join('-')} - ${actualInvUnits}x${nf(invUnitACkW, 1)}kW - KSh ${fmtKSh(invUnitPriceKSh)}` : 'Select inverter'}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--text-muted)] mb-1">Brand</span>
                <select value={invBrand} onChange={e => setInvBrand(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--grid)] cursor-pointer">
                  {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--text-muted)] mb-1">Voltage Class</span>
                <select value={invVoltageClass} onChange={e => setInvVoltageClass(e.target.value as VoltageClass)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--grid)] cursor-pointer">
                  {inverterVoltageClassOptions(catalog, invBrand).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--text-muted)] mb-1">Model ({filteredInverters.length} available)</span>
                <select value={selectedInverterId} onChange={e => setSelectedInverterId(e.target.value)}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--grid)] cursor-pointer">
                  {filteredInverters.length === 0 && <option>No models in database</option>}
                  {filteredInverters.map(inv => (
                    <option key={inv.id} value={inv.id}>{inv.model} - {inv.phase} {(inv.ratedAcW || 0) / 1000}kW</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Metric label="Rated AC Power" value={nf(invUnitACkW, 1)} unit="kW" color="blue" />
              <Metric label="Max PV Input" value={nf(invUnitMaxPV, 1)} unit="kWp" color="blue" />
              <Metric label="Unit Price" value={`KSh ${fmtKSh(invUnitPriceKSh)}`} color="blue" />
              <Metric label="Architecture" value={invArchitecture} color="blue" />
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-[var(--bg-card-muted)] rounded-xl px-4 py-3 border border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)]">Inverter Units:</span>
              <span className="font-mono font-bold text-[var(--grid)]">{actualInvUnits} x {nf(invUnitACkW, 1)}kW</span>
              <span className="text-[9px] text-[var(--text-muted)]">| Auto: {suggestedInvUnits}</span>
              <input type="number" min={1} max={20} value={actualInvUnits}
                onChange={e => setInvManualOverride(parseInt(e.target.value) || null)}
                className="w-16 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-2 py-1 text-center font-mono text-[var(--solar)] text-xs focus:outline-none focus:border-[var(--solar)] ml-auto" />
              <span className="text-[9px] text-[var(--text-muted)]">Manual override</span>
            </div>

            <div className="bg-[var(--grid-soft)] border border-[var(--grid)]/20 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--grid)] font-mono uppercase">Total Inverter AC Capacity</span>
              <span className="text-xl font-black text-[var(--grid)] font-mono">{nf(totalInverterACkW, 1)} kW</span>
            </div>
          </Section>

          {/* SECTION C: PV ARRAY */}
          <Section id="C" label="PV Array Sizing" color="bg-[var(--solar-soft)] text-[var(--solar)] border border-[var(--solar)]/20"
            summary={`${panelsRequired} panels - ${nf(actualPVkWp, 1)} kWp - DC/AC ${dcAcOversize.toFixed(2)}`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1"><span>DC/AC Oversize Ratio</span><span className="font-mono font-bold text-[var(--solar)]">{dcAcOversize.toFixed(2)}</span></div>
                <input type="range" min={1.0} max={1.5} step={0.05} value={dcAcOversize}
                  onChange={e => setDcAcOversize(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-2 rounded-lg cursor-pointer" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--text-muted)] mb-1">Panel Wattage</span>
                <select value={panelWattage} onChange={e => setPanelWattage(parseInt(e.target.value))}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--solar)] cursor-pointer">
                  {catalog.panels.map(p => (
                    <option key={p.id} value={p.wattage}>{p.wattage}W - KSh {p.priceKsh.toLocaleString()} - {p.model}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--text-muted)] mb-1">Panels per String</span>
                <input type="number" min={2} max={30} value={panelsPerString}
                  onChange={e => setPanelsPerString(Math.max(2, parseInt(e.target.value) || 7))}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--solar)]" />
              </div>
            </div>

            {stockWarning && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-[11px] text-red-600 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {stockWarning}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Metric label="Target PV" value={nf(targetPVkWp, 1)} unit="kWp" color="amber" />
              <Metric label="Max Allowed" value={nf(maxAllowablePVkWp, 1)} unit="kWp" color="slate" />
              <Metric label="Panels Required" value={String(panelsRequired)} unit="pcs" color="amber" size="lg" />
              <Metric label="Actual PV Array" value={nf(actualPVkWp, 1)} unit="kWp" color="amber" size="lg" />
            </div>

            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold ${pvOversizeOK ? 'bg-[var(--battery-soft)] border border-[var(--battery)]/20 text-[var(--battery)]' : 'bg-red-50 border border-red-200 text-red-600'}`}>
              {pvOversizeOK ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {pvOversizeOK ? 'PV Oversize Check: OK - within inverter input limits' : `WARNING - ${nf(actualPVkWp, 1)}kWp exceeds ${nf(maxAllowablePVkWp, 1)}kWp inverter max!`}
            </div>
          </Section>

          {/* SECTION D: BATTERY */}
          <Section id="D" label="Battery Storage Sizing (Dyness)" color="bg-[var(--battery-soft)] text-[var(--battery)] border border-[var(--battery)]/20"
            summary={isGridTied ? 'No battery (Grid-Tied)' : `${actualBatMods} modules - ${nf(actualBatteryKWh, 1)} kWh - ${batTowers} tower(s)`}>
            {isGridTied ? (
              <div className="bg-[var(--bg-card-muted)] border border-[var(--border)] rounded-xl p-4 text-center text-[var(--text-muted)] text-sm">
                Grid-Tied inverter selected - no battery storage. Change voltage class in Section B to add batteries.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[var(--text-muted)] mb-1">Product Line</span>
                    <select value={dynessLine} onChange={e => setDynessLine(e.target.value as DynessProductLine)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--battery)] cursor-pointer"
                      disabled={isLV}>
                      {isLV
                        ? <option value="LV48">LV48 (DL5.0/DL5.0C 5.12kWh, parallel)</option>
                        : <><option value="Stack100">Stack100 (5.12kWh/module, 3-15/tower)</option>
                          <option value="Stack280">Stack280 (14.3kWh/module, C&I scale)</option></>}
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[var(--text-muted)] mb-1">Target Capacity (kWh)</span>
                    <div className="relative">
                      <input type="number" min={0} step={5} value={targetBatteryKWh}
                        onChange={e => setTargetBatteryKWh(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-[var(--solar-soft)] border border-[var(--solar)]/30 rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--solar)] transition" />
                      <span className="absolute right-3 top-2.5 text-[10px] text-[var(--solar)]/70 font-mono">kWh</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Metric label="Modules Required" value={String(batModsReq)} unit={`x${modKWh}kWh`} color="emerald" />
                  {isHV ? <>
                    <Metric label="Towers" value={`${batTowers}`} unit={`max ${maxPerTower}/tower`} color="emerald" />
                    <Metric label="Per Tower" value={String(modsPerTower)} unit="modules" color="emerald" />
                    <Metric label="Voltage" value={nf(towerVoltage, 1)} unit="V" color="emerald" />
                  </> : <>
                    <Metric label="Actual kWh" value={nf(actualBatteryKWh, 1)} unit="kWh" color="emerald" />
                    <Metric label="BDUs" value={String(bduCount)} color="slate" />
                    <Metric label="Module Cost" value={`KSh ${fmtKSh(modCost)}`} color="slate" />
                    <div className={`rounded-xl border px-3.5 py-2.5 text-center ${vCheckOK ? 'bg-[var(--battery-soft)] border-[var(--battery)]/20' : 'bg-red-50 border-red-200'}`}>
                      <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">Voltage Check</div>
                      <div className={`font-bold font-mono text-sm ${vCheckOK ? 'text-[var(--battery)]' : 'text-red-600'}`}>{vCheckMsg}</div>
                    </div>
                  </>}
                </div>
              </>
            )}
          </Section>

          {/* SECTION E: LIVE SUMMARY */}
          <div className="bg-[var(--battery-soft)] border border-[var(--battery)]/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-white/60 text-[var(--battery)] flex items-center justify-center text-sm font-black border border-[var(--battery)]/20">E</span>
                <span className="text-sm font-bold text-[var(--battery)] uppercase tracking-wider font-mono">System Configuration Summary</span>
              </div>
              <span className="text-[9px] text-[var(--text-muted)] font-mono animate-pulse">Live</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Metric label="PV Array" value={nf(actualPVkWp, 1)} unit="kWp" color="emerald" size="lg" />
              <Metric label="Panels" value={String(panelsRequired)} unit={`x${panelWattage}W`} color="emerald" />
              <Metric label="Inverter" value={selectedInv?.model.split('-').slice(0, 3).join('-') ?? ''} color="blue" />
              <Metric label="Inv Units" value={String(actualInvUnits)} unit={`x${nf(invUnitACkW, 1)}kW`} color="blue" />
              <Metric label="Battery" value={nf(actualBatteryKWh, 1)} unit="kWh" color="emerald" />
              {isHV ? <Metric label="Towers/BDUs" value={`${batTowers}/${bduCount}`} color="emerald" /> : <Metric label="Modules" value={String(actualBatMods)} unit="parallel" color="emerald" />}
            </div>

            <div className="bg-[var(--bg-card)] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 border border-[var(--border)]">
              <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase font-mono">Estimated Hardware CapEx (ex-VAT):</span>
              <div className="flex items-center gap-3">
                <span className="text-lg font-black text-[var(--battery)] font-mono">KSh {roughCapExKSh.toLocaleString()}</span>
                <span className="text-xs text-[var(--text-muted)] font-mono">≈ ${roughCapExUSD.toLocaleString()} USD</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* SECTION F: MICROINVERTER SYSTEM SIZING */
        <Section id="F" label="Microinverter System Sizing" color="bg-purple-50 text-purple-700 border border-purple-200"
          summary={`Target ${nf(microTargetKW, 1)} kW AC - ${microPanelWattage}W panels`}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--text-muted)] mb-1">Target System Size (kW, AC)</span>
              <input type="number" min={0.5} step={0.5} value={microTargetKW}
                onChange={e => setMicroTargetKW(Math.max(0.5, parseFloat(e.target.value) || 5))}
                className="w-full bg-[var(--solar-soft)] border border-[var(--solar)]/30 rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--solar)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--text-muted)] mb-1">Panel Wattage</span>
              <select value={microPanelWattage} onChange={e => setMicroPanelWattage(parseInt(e.target.value))}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--solar)] cursor-pointer">
                {catalog.panels.map(p => <option key={p.id} value={p.wattage}>{p.wattage}W - {p.model}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--text-muted)] mb-1">Microinverter Model</span>
              <select value={microInverterId} onChange={e => setMicroInverterId(e.target.value)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--solar)] cursor-pointer">
                {microInverters.map(i => <option key={i.id} value={i.id}>{i.model} ({i.ratedAcW}W, {i.panelsPerUnit} panels/unit)</option>)}
              </select>
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">
            AC-coupled, per-panel inverters - no central inverter, no battery. Each unit converts 2 panels directly to grid AC.
          </p>
        </Section>
      )}

      {/* SECTION G: CABLE ENGINEERING */}
      <Section id="G" label="Cable Engineering (Derating & Voltage Window)" color="bg-[var(--grid-soft)] text-[var(--grid)] border border-[var(--grid)]/20"
        defaultOpen={false}
        summary={`${INSTALL_METHOD_LABELS[installMethod]} - ${ambientTempC}°C ambient`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--text-muted)] mb-1">Installation Method</span>
            <select value={installMethod} onChange={e => setInstallMethod(e.target.value as InstallationMethod)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--grid)] cursor-pointer">
              {Object.entries(INSTALL_METHOD_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--text-muted)] mb-1">Ambient Temperature (°C)</span>
            <input type="number" min={0} max={55} value={ambientTempC}
              onChange={e => setAmbientTempC(parseFloat(e.target.value) || 30)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--grid)]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--text-muted)] mb-1">Min Design Ambient (°C, Voc check)</span>
            <input type="number" min={-10} max={30} value={minDesignAmbientTempC}
              onChange={e => setMinDesignAmbientTempC(parseFloat(e.target.value) || 10)}
              className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--grid)]" />
          </div>
        </div>
      </Section>

      {/* SECTION: FINANCIAL ANALYSIS */}
      <Section id="H" label="Financial Analysis Assumptions" color="bg-[var(--battery-soft)] text-[var(--battery)] border border-[var(--battery)]/20"
        defaultOpen={false}
        summary={`Yield ${specificYield} kWh/kWp/day - Self-consume ${selfConsumptionPct}%`}>
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Specific Yield (kWh/kWp/day)', specificYield, setSpecificYield, 2, 7, 0.1],
            ['Self-Consumption Ratio %', selfConsumptionPct, setSelfConsumptionPct, 0, 100, 1],
            ['Tariff Escalation %/yr', tariffEscalation, setTariffEscalation, 0, 15, 0.5],
            ['Panel Degradation %/yr', panelDegradation, setPanelDegradation, 0, 2, 0.1],
            ['Annual O&M % of CapEx', omCostPct, setOmCostPct, 0, 5, 0.1],
            ['O&M Escalation %/yr', omEscalation, setOmEscalation, 0, 15, 0.5],
            ['Battery Replacement Year', batteryReplYear, setBatteryReplYear, 0, 20, 1],
            ['Battery Repl. Cost % of Storage', batteryReplCostPct, setBatteryReplCostPct, 0, 100, 5],
          ].map(([label, val, setFn, min, max, step]) => (
            <div key={label as string}>
              <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1">
                <span>{label as string}</span>
                <span className="font-mono font-bold text-[var(--battery)]">{(val as number).toFixed(2)}</span>
              </div>
              <input type="range" min={min as number} max={max as number} step={step as number} value={val as number}
                onChange={e => (setFn as (v: number) => void)(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 h-1.5 rounded-lg cursor-pointer" />
            </div>
          ))}
        </div>
      </Section>

      {/* SECTION: KPLC TIME-OF-USE TARIFF */}
      <Section id="I" label="KPLC Time-of-Use Tariff Modeling" color="bg-[var(--grid-soft)] text-[var(--grid)] border border-[var(--grid)]/20"
        defaultOpen={false}
        summary={useTOU ? `${kplcSegment} - ${tariffStructure}` : `Flat rate: KSh ${location.gridTariffKSh}/kWh`}>
        <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] cursor-pointer">
          <input type="checkbox" checked={useTOU} onChange={e => setUseTOU(e.target.checked)} className="accent-blue-600 w-3.5 h-3.5 rounded" />
          Use KPLC tariff auto-suggestion instead of flat location tariff
        </label>
        {useTOU && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--text-muted)] mb-1">Customer Segment</span>
              <select value={kplcSegment} onChange={e => setKplcSegment(e.target.value as KPLCCustomerSegment)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--grid)] cursor-pointer">
                <option value="Residential">Residential</option>
                <option value="Small Commercial">Small Commercial</option>
                <option value="Commercial & Industrial">Commercial & Industrial</option>
              </select>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--text-muted)] mb-1">Tariff Structure</span>
              <select value={tariffStructure} onChange={e => setTariffStructure(e.target.value as TariffStructure)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--grid)] cursor-pointer">
                <option value="Standard">Standard</option>
                <option value="Time-of-Use">Time-of-Use</option>
              </select>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--text-muted)] mb-1">Monthly Consumption (kWh)</span>
              <input type="number" min={0} value={monthlyConsumptionKWh}
                onChange={e => setMonthlyConsumptionKWh(parseFloat(e.target.value) || 0)}
                className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--grid)]" />
            </div>
          </div>
        )}
      </Section>

      {/* SECTION: FINANCING */}
      <Section id="J" label="Financing (Optional Solar Loan / Asset Finance)" color="bg-purple-50 text-purple-700 border border-purple-200"
        defaultOpen={false}
        summary={debtFractionPct > 0 ? `${debtFractionPct}% debt @ ${loanRatePct}%` : 'Cash purchase'}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1"><span>Debt Fraction %</span><span className="font-mono font-bold text-purple-700">{debtFractionPct}%</span></div>
            <input type="range" min={0} max={80} step={5} value={debtFractionPct}
              onChange={e => setDebtFractionPct(parseFloat(e.target.value))}
              className="w-full accent-purple-600 h-1.5 rounded-lg cursor-pointer" />
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1"><span>Loan Interest Rate %</span><span className="font-mono font-bold text-purple-700">{loanRatePct}%</span></div>
            <input type="range" min={5} max={30} step={0.5} value={loanRatePct}
              onChange={e => setLoanRatePct(parseFloat(e.target.value))}
              className="w-full accent-purple-600 h-1.5 rounded-lg cursor-pointer" />
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1"><span>Loan Term (years)</span><span className="font-mono font-bold text-purple-700">{loanTermYears}</span></div>
            <input type="range" min={1} max={15} step={1} value={loanTermYears}
              onChange={e => setLoanTermYears(parseFloat(e.target.value))}
              className="w-full accent-purple-600 h-1.5 rounded-lg cursor-pointer" />
          </div>
        </div>
      </Section>

      {/* SECTION: ADD-ONS */}
      <Section id="K" label="Optional Add-Ons & Project Financials" color="bg-purple-50 text-purple-700 border border-purple-200"
        defaultOpen={false}
        summary={`Contingency: ${contingencyPct}% - EPC: ${epcMarginPct}% - Discount: ${discountRate}%`}>
        <div className="flex flex-wrap gap-2">
          {[
            ['Generator Interface & Enclosures (Section 8)', includeGenInterface, setIncludeGenInterface],
            ['KPLC Net-Metering', includeKPLC, setIncludeKPLC],
            ['1st Year O&M Contract', includeOandM, setIncludeOandM],
          ].map(([label, val, setFn]) => (
            <label key={label as string}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                (val as boolean) ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-[var(--bg-card-muted)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)]'
              }`}>
              <input type="checkbox" checked={val as boolean} onChange={e => (setFn as (v: boolean) => void)(e.target.checked)} className="accent-purple-600 w-3.5 h-3.5 rounded" />
              {label as string}
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            ['Contingency %', contingencyPct, setContingencyPct, 0, 15],
            ['EPC Margin %', epcMarginPct, setEpcMarginPct, 0, 35],
            ['Discount Rate %', discountRate, setDiscountRate, 2, 20],
          ].map(([label, val, setFn, min, max]) => (
            <div key={label as string}>
              <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-1">
                <span>{label as string}</span>
                <span className="font-mono font-bold text-purple-700">{(val as number).toFixed(1)}%</span>
              </div>
              <input type="range" min={min as number} max={max as number} step={0.5} value={val as number}
                onChange={e => (setFn as (v: number) => void)(parseFloat(e.target.value))}
                className="w-full accent-purple-600 h-1.5 rounded-lg cursor-pointer" />
            </div>
          ))}
        </div>
      </Section>

      {/* COLOR LEGEND */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[9px] text-[var(--text-muted)] font-mono px-1">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[var(--solar-soft)] border border-[var(--solar)]/30" /> Editable input</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[var(--bg-card-muted)] border border-[var(--border)]" /> Auto-calculated</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[var(--battery-soft)] border border-[var(--battery)]/20" /> System summary</span>
      </div>
    </div>
  );
}
