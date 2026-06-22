import { useState, useEffect, useMemo } from 'react';
import {
  MapPin, RefreshCw, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, ArrowRight,
} from 'lucide-react';
import {
  SOLAR_LOCATIONS, LOAD_PROFILES, PROJECT_PRESETS, ProjectPreset,
  INVERTER_CATALOG, PANEL_CATALOG, BATTERY_CATALOG
} from '@/lib/sizing/mockData';
import { SimulationInputs } from '@/lib/sizing/solarCalculator';

interface ParametricInputsProps { onChange: (inputs: SimulationInputs) => void; }

type SizingMethod = 'direct' | 'load-based';
type InverterBrand = 'Deye' | 'Solis' | 'Jinko';
type VoltageClass = 'LV (48V)' | 'HV (150-850V)' | 'HV (160-700V)' | 'HV (160-800V)' | 'Grid-Tied';
type DynessProductLine = 'Stack100' | 'Stack280' | 'LV48';

const fmtKSh = (n: number) => n >= 1e6 ? `${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `${(n/1e3).toFixed(0)}K` : String(n);
const nf = (n: number, d=1) => n.toFixed(d);

// ── Animated Number ─────────────────────────────────────────────────────────
const AnimatedValue = ({ value, unit, className }: { value: string; unit?: string; className?: string }) => (
  <span className={`transition-all duration-300 ${className || ''}`}>
    {value}{unit && <span className="text-[0.7em] ml-0.5 opacity-70">{unit}</span>}
  </span>
);

// ── Collapsible Section Wrapper ─────────────────────────────────────────────
const Section = ({ id, label, color, defaultOpen, children, summary }: {
  id: string; label: string; color: string;
  defaultOpen?: boolean; children: React.ReactNode; summary?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen ?? true);
  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden transition-all duration-300 hover:border-slate-700/80">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${color}`}>{id}</span>
          <div className="text-left">
            <span className="text-sm font-bold text-slate-200 flex items-center gap-2">{label}</span>
            {!open && summary && <span className="text-[10px] text-slate-500 font-mono">{summary}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!open && summary && <span className="hidden sm:block text-[10px] text-slate-500 font-mono">{summary}</span>}
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {open && <div className="px-5 pb-5 space-y-4 border-t border-slate-800/50 pt-4">{children}</div>}
    </div>
  );
};

// ── Metric Badge ────────────────────────────────────────────────────────────
const Metric = ({ label, value, unit, color = 'slate', size = 'md' }: {
  label: string; value: string; unit?: string; color?: string; size?: string;
}) => {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-950/30 border-emerald-800/40',
    amber: 'text-amber-400 bg-amber-950/30 border-amber-800/40',
    blue: 'text-blue-400 bg-blue-950/30 border-blue-800/40',
    red: 'text-red-400 bg-red-950/30 border-red-800/40',
    slate: 'text-slate-300 bg-slate-950/80 border-slate-800/60',
  };
  return (
    <div className={`rounded-xl border px-3.5 py-2.5 text-center transition-all duration-300 ${colors[color]}`}>
      <div className="text-[9px] text-slate-500 uppercase tracking-wider font-medium">{label}</div>
      <div className={`font-bold font-mono ${size === 'lg' ? 'text-lg' : 'text-sm'} mt-0.5`}>
        <AnimatedValue value={value} unit={unit} />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
export default function ParametricInputs({ onChange }: ParametricInputsProps) {
  // ── Project ──
  const [projectName, setProjectName] = useState('New Sizing Project');
  const [clientName, setClientName] = useState('Enterprise Client');
  const [locationId, setLocationId] = useState(SOLAR_LOCATIONS[0].id);

  // ── Section A ──
  const [sizingMethod, setSizingMethod] = useState<SizingMethod>('direct');
  const [directTargetKW, setDirectTargetKW] = useState(50);
  const [dailyConsumptionKWh, setDailyConsumptionKWh] = useState(200);
  const [peakLoadKW, setPeakLoadKW] = useState(35);
  const [backupAutonomyHrs, setBackupAutonomyHrs] = useState(4);

  // ── Section B ──
  const [invBrand, setInvBrand] = useState<InverterBrand>('Deye');
  const [invVoltageClass, setInvVoltageClass] = useState<VoltageClass>('HV (160-800V)');
  const [selectedInverterId, setSelectedInverterId] = useState('inv-deye-50k-hv');
  const [invManualOverride, setInvManualOverride] = useState<number | null>(null);

  // ── Section C ──
  const [dcAcOversize, setDcAcOversize] = useState(1.30);
  const [panelWattage, setPanelWattage] = useState(620);

  // ── Section D ──
  const [dynessLine, setDynessLine] = useState<DynessProductLine>('Stack100');
  const [targetBatteryKWh, setTargetBatteryKWh] = useState(50);

  // ── Section G ──
  const [includeGenInterface, setIncludeGenInterface] = useState(true);
  const [includeEnclosure, setIncludeEnclosure] = useState(false);
  const [includeKPLC, setIncludeKPLC] = useState(false);
  const [includeOandM, setIncludeOandM] = useState(false);
  const [dieselGenKW] = useState(0);
  const [dieselFuelPrice] = useState(1.30);
  const [discountRate, setDiscountRate] = useState(8.0);
  const [inflationRate, setInflationRate] = useState(4.5);
  const [contingencyPct, setContingencyPct] = useState(5.0);
  const [epcMarginPct, setEpcMarginPct] = useState(15.0);

  const location = SOLAR_LOCATIONS.find(l => l.id === locationId) || SOLAR_LOCATIONS[0];
  const loadProfile = LOAD_PROFILES[0];

  // ── DERIVED CALCULATIONS ──────────────────────────────────────────────────
  const suggestedInverterKW = peakLoadKW * 1.25;
  const suggestedBatteryKWh_raw = peakLoadKW * backupAutonomyHrs;
  const effectiveTargetKW = sizingMethod === 'direct' ? directTargetKW : suggestedInverterKW;

  const filteredInverters = useMemo(() =>
    INVERTER_CATALOG.filter(inv => {
      if (inv.brand !== invBrand) return false;
      const vc = inv.voltageClass || '';
      if (invVoltageClass === 'Grid-Tied') return vc === 'Grid-Tied';
      if (invVoltageClass === 'LV (48V)') return vc.includes('LV');
      if (invVoltageClass.includes('HV')) return vc.includes('HV');
      return vc === invVoltageClass;
    }), [invBrand, invVoltageClass]);

  useEffect(() => {
    if (filteredInverters.length > 0 && !filteredInverters.find(i => i.id === selectedInverterId))
      setSelectedInverterId(filteredInverters[0].id);
  }, [filteredInverters, selectedInverterId]);

  const selectedInv = INVERTER_CATALOG.find(i => i.id === selectedInverterId) || filteredInverters[0] || INVERTER_CATALOG[0];
  const invUnitACkW = (selectedInv.ratingWatts || 50000) / 1000;
  const invUnitMaxPV = selectedInv.maxPVInputKWp || 75;
  const invUnitPriceKSh = selectedInv.costKSh || 850000;
  const invArchitecture = selectedInv.voltageClass || 'HV';
  const isGridTied = invArchitecture === 'Grid-Tied';
  const isHV = invArchitecture.includes('HV');
  const isLV = invArchitecture.includes('LV');

  const suggestedInvUnits = Math.max(1, Math.ceil(effectiveTargetKW / invUnitACkW));
  const actualInvUnits = invManualOverride ?? suggestedInvUnits;
  const totalInverterACkW = actualInvUnits * invUnitACkW;

  // PV
  const targetPVkWp = totalInverterACkW * dcAcOversize;
  const maxAllowablePVkWp = actualInvUnits * invUnitMaxPV;
  const panelsRequired = Math.ceil((targetPVkWp * 1000) / panelWattage);
  const actualPVkWp = (panelsRequired * panelWattage) / 1000;
  const pvOversizeOK = actualPVkWp <= maxAllowablePVkWp;
  const panelObj = PANEL_CATALOG.find(p => p.ratingWatts === panelWattage) || PANEL_CATALOG[0];
  const panelTotalPriceKSh = panelsRequired * panelObj.costKSh;
  const stockWarning = panelWattage === 620 ? '⚠ Low stock (~50 units) -  consider 625W' : '';

  // Battery
  const modKWh = dynessLine === 'Stack280' ? 14.3 : 5.12;
  const modCost = dynessLine === 'Stack280'
    ? (BATTERY_CATALOG.find(b => b.id === 'bat-dyness-stack280-0.7c')?.costKSh || 288877)
    : dynessLine === 'Stack100'
      ? (BATTERY_CATALOG.find(b => b.id === 'bat-dyness-stack100-mod')?.costKSh || 132500)
      : (BATTERY_CATALOG.find(b => b.id === 'bat-dyness-dl5.0')?.costKSh || 115264);
  const bduCost = 95000;
  const batModsReq = Math.max(0, Math.ceil(targetBatteryKWh / modKWh));
  const maxPerTower = 15;
  const batTowers = isHV && !isGridTied ? Math.max(1, Math.ceil(batModsReq / maxPerTower)) : (batModsReq > 0 ? 1 : 0);
  const modsPerTower = batTowers > 0 ? Math.ceil(batModsReq / batTowers) : 0;
  const actualBatMods = modsPerTower * batTowers;
  const actualBatteryKWh = actualBatMods * modKWh;
  const bduCount = isHV && !isGridTied ? batTowers : 0;
  const towerVoltage = isHV ? modsPerTower * 51.2 : 48;

  // Voltage check
  let vCheckOK = true; let vCheckMsg = 'OK';
  if (isHV && !isGridTied && batModsReq > 0) {
    const vr = invArchitecture;
    if (vr.includes('160-700V')) { vCheckOK = towerVoltage >= 160 && towerVoltage <= 700; vCheckMsg = vCheckOK ? `OK (${towerVoltage}V ∈ 160-700V)` : `WARN: ${towerVoltage}V outside 160-700V`; }
    else if (vr.includes('160-800V')) { vCheckOK = towerVoltage >= 160 && towerVoltage <= 800; vCheckMsg = vCheckOK ? `OK (${towerVoltage}V ∈ 160-800V)` : `WARN: ${towerVoltage}V outside 160-800V`; }
    else if (vr.includes('150-850V')) { vCheckOK = towerVoltage >= 150 && towerVoltage <= 850; vCheckMsg = vCheckOK ? `OK (${towerVoltage}V ∈ 150-850V)` : `WARN: ${towerVoltage}V outside 150-850V`; }
  }

  const roughCapExKSh = panelTotalPriceKSh + (actualInvUnits * invUnitPriceKSh) + (actualBatMods * modCost) + (bduCount * bduCost) + (actualPVkWp * 14000);
  const roughCapExUSD = Math.round(roughCapExKSh / 127.5);

  // ── Sync to parent ────────────────────────────────────────────────────────
  useEffect(() => {
    const panelId = PANEL_CATALOG.find(p => p.ratingWatts === panelWattage)?.id || 'panel-jinko-620';
    const batteryId = dynessLine === 'Stack280' ? 'bat-dyness-stack280-0.7c' : dynessLine === 'Stack100' ? 'bat-dyness-stack100-mod' : 'bat-dyness-dl5.0';
    onChange({
      location, loadProfile, loadMultiplier: 1.0,
      panelId, panelQty: panelsRequired,
      inverterId: selectedInverterId, inverterQty: actualInvUnits,
      batteryId, batteryQty: actualBatMods,
      mountingType: 'pitched',
      dcAcOversizeRatio: dcAcOversize, targetBatteryKWh, dynessProductLine: dynessLine,
      gridOutageSimulation: true,
      contingencyPercent: contingencyPct, epcMarginPercent: epcMarginPct,
      dieselGenCapacityKW: dieselGenKW, dieselFuelPriceUSD: dieselFuelPrice,
      discountRate, inflationRate, projectLifeYears: 25,
      includeGeneratorInterface: includeGenInterface, includeWeatherproofEnclosure: includeEnclosure,
      includeKPLCapplication: includeKPLC, includeOandM: includeOandM
    });
  }, [locationId, sizingMethod, directTargetKW, dailyConsumptionKWh, peakLoadKW, backupAutonomyHrs,
      selectedInverterId, actualInvUnits, dcAcOversize, panelWattage,
      targetBatteryKWh, dynessLine, dieselGenKW, dieselFuelPrice, discountRate, inflationRate,
      contingencyPct, epcMarginPct, includeGenInterface, includeEnclosure, includeKPLC, includeOandM]);

  // ── Preset loader ─────────────────────────────────────────────────────────
  const loadPreset = (preset: ProjectPreset) => {
    setProjectName(preset.name); setClientName(preset.clientName); setLocationId(preset.locationId);
    setSizingMethod('direct');
    const pPanel = PANEL_CATALOG.find(p => p.id === preset.selectedPanelId);
    if (pPanel) setPanelWattage(pPanel.ratingWatts || 620);
    const pInv = INVERTER_CATALOG.find(i => i.id === preset.selectedInverterId);
    if (pInv) { setInvBrand(pInv.brand as InverterBrand); setInvVoltageClass((pInv.voltageClass || 'HV (160-800V)') as VoltageClass); setSelectedInverterId(pInv.id); }
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
      {/* ═══ PRESETS + PROJECT ROW ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Presets */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mr-1">Quick Load:</span>
            {PROJECT_PRESETS.map(p => (
              <button key={p.name} onClick={() => loadPreset(p)}
                className="bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-300 text-[10px] px-3 py-1.5 rounded-lg border border-slate-700/50 hover:border-emerald-500/40 font-medium transition-all duration-200 active:scale-95">
                {p.name.split(' ')[0]} <span className="text-slate-500">({p.name.includes('Lagos')?'NG':p.name.includes('Joburg')?'ZA':'KE'})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Project Name + Client */}
        <div className="space-y-2">
          <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600 font-medium"
            placeholder="Project Name" />
          <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600"
            placeholder="Client Organization" />
        </div>
      </div>

      {/* ═══ LOCATION SELECTOR ═══ */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Location:</span>
          </div>
          <select value={locationId} onChange={e => setLocationId(e.target.value)}
            className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium">
            {SOLAR_LOCATIONS.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}, {loc.country} -  {loc.peakSunHours} PSH, KSh {loc.gridTariffKSh}/kWh, Grid {loc.gridReliability}%</option>
            ))}
          </select>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 shrink-0">
            <span>☀ <strong className="text-slate-200">{location.peakSunHours}</strong> PSH</span>
            <span className="text-slate-700">|</span>
            <span>⚡ <strong className="text-slate-200">KSh {location.gridTariffKSh}</strong>/kWh</span>
            <span className="text-slate-700">|</span>
            <span className={location.outageHoursPerDay > 4 ? 'text-red-400' : 'text-slate-400'}>
              🔌 <strong>{location.outageHoursPerDay}h</strong> outages
            </span>
          </div>
        </div>
      </div>

      {/* ═══ SECTION A: SYSTEM SIZE ═══ */}
      <Section id="A" label="System Size Input" color="bg-amber-500/10 text-amber-400 border border-amber-500/20"
        summary={`Target: ${nf(effectiveTargetKW, 1)} kW · Method: ${sizingMethod === 'direct' ? 'Direct' : 'Load-based'}`}>
        <div className="flex gap-1 bg-slate-950 rounded-xl p-1 w-fit">
          <button onClick={() => setSizingMethod('direct')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${sizingMethod === 'direct' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400 hover:text-slate-200'}`}>
            📏 Direct kW Entry
          </button>
          <button onClick={() => setSizingMethod('load-based')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${sizingMethod === 'load-based' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-400 hover:text-slate-200'}`}>
            ⚡ Load-Based Sizing
          </button>
        </div>

        {sizingMethod === 'direct' ? (
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-slate-500">Target system size</span>
              <span className="text-lg font-black text-amber-400 font-mono">{nf(directTargetKW)} <span className="text-sm font-normal text-amber-500/70">kW</span></span>
            </div>
            <input type="range" min={1} max={400} step={1} value={directTargetKW}
              onChange={e => setDirectTargetKW(parseInt(e.target.value)||1)}
              className="w-full accent-amber-500 h-2 rounded-lg cursor-pointer" />
            <div className="flex justify-between text-[8px] text-slate-600 font-mono"><span>1kW</span><span>100</span><span>200</span><span>300</span><span>400kW</span></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Daily Consumption', value: dailyConsumptionKWh, set: setDailyConsumptionKWh, unit: 'kWh/day', min: 1 },
              { label: 'Peak Load', value: peakLoadKW, set: setPeakLoadKW, unit: 'kW', min: 1 },
              { label: 'Backup Autonomy', value: backupAutonomyHrs, set: setBackupAutonomyHrs, unit: 'hours', min: 0.5, step: 0.5 },
            ].map(f => (
              <div key={f.label} className="flex flex-col">
                <span className="text-[10px] text-slate-500 mb-1">{f.label}</span>
                <div className="relative">
                  <input type="number" min={f.min} step={f.step || 1} value={f.value}
                    onChange={e => f.set(Math.max(f.min, parseFloat(e.target.value) || 0))}
                    className="w-full bg-amber-950/20 border border-amber-700/30 rounded-xl px-3 py-2.5 text-sm text-amber-100 font-mono focus:outline-none focus:border-amber-500 focus:bg-amber-950/30 transition" />
                  <span className="absolute right-3 top-2.5 text-[10px] text-amber-500/60 font-mono">{f.unit}</span>
                </div>
              </div>
            ))}
            <div className="col-span-3 grid grid-cols-2 gap-3 mt-2">
              <Metric label="→ Suggested Inverter Size" value={nf(suggestedInverterKW, 1)} unit="kW" color="amber" />
              <Metric label="→ Suggested Battery Capacity" value={nf(suggestedBatteryKWh_raw, 1)} unit="kWh" color="amber" />
            </div>
          </div>
        )}

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">Effective Target</span>
          </div>
          <span className="text-xl font-black text-emerald-400 font-mono">{nf(effectiveTargetKW, 1)} <span className="text-sm font-normal text-emerald-500/70">kW</span></span>
        </div>
      </Section>

      {/* ═══ SECTION B: INVERTER ═══ */}
      <Section id="B" label="Inverter Selection" color="bg-blue-500/10 text-blue-400 border border-blue-500/20"
        summary={selectedInv ? `${selectedInv.brand} ${selectedInv.model.split('-').slice(0,3).join('-')} · ${actualInvUnits}×${nf(invUnitACkW,1)}kW · KSh ${fmtKSh(invUnitPriceKSh)}` : 'Select inverter'}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 mb-1">Brand</span>
            <select value={invBrand} onChange={e => setInvBrand(e.target.value as InverterBrand)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer">
              <option value="Deye">Deye</option><option value="Solis">Solis</option><option value="Jinko">Jinko</option>
            </select>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 mb-1">Voltage Class</span>
            <select value={invVoltageClass} onChange={e => setInvVoltageClass(e.target.value as VoltageClass)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer">
              <option value="LV (48V)">LV (48V battery)</option>
              {invBrand !== 'Jinko' && <option value="HV (160-700V)">HV (160-700V) -  AM2</option>}
              {invBrand === 'Deye' && <option value="HV (160-800V)">HV (160-800V) -  BM3/BM4</option>}
              {invBrand === 'Solis' && <option value="HV (150-850V)">HV (150-850V) -  S6</option>}
              <option value="Grid-Tied">Grid-Tied (no battery)</option>
            </select>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 mb-1">Model ({filteredInverters.length} available)</span>
            <select value={selectedInverterId} onChange={e => setSelectedInverterId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer">
              {filteredInverters.length === 0 && <option>No models in database</option>}
              {filteredInverters.map(inv => (
                <option key={inv.id} value={inv.id}>{inv.model} -  {inv.phase} {(inv.ratingWatts||0)/1000}kW</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Metric label="Rated AC Power" value={nf(invUnitACkW, 1)} unit="kW" color="blue" />
          <Metric label="Max PV Input" value={nf(invUnitMaxPV, 1)} unit="kWp" color="blue" />
          <Metric label="Unit Price" value={`KSh ${fmtKSh(invUnitPriceKSh)}`} color="blue" />
          <Metric label="Architecture" value={invArchitecture} color="blue" />
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-slate-950 rounded-xl px-4 py-3 border border-slate-800">
          <span className="text-[10px] text-slate-500">Inverter Units:</span>
          <span className="font-mono font-bold text-blue-400">{actualInvUnits} × {nf(invUnitACkW, 1)}kW</span>
          <span className="text-[9px] text-slate-600">| Auto: {suggestedInvUnits}</span>
          <input type="number" min={1} max={20} value={actualInvUnits}
            onChange={e => setInvManualOverride(parseInt(e.target.value) || null)}
            className="w-16 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-center font-mono text-amber-400 text-xs focus:outline-none focus:border-amber-500 ml-auto" />
          <span className="text-[9px] text-slate-600">Manual override</span>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-bold text-blue-400 font-mono uppercase">Total Inverter AC Capacity</span>
          <span className="text-xl font-black text-blue-400 font-mono">{nf(totalInverterACkW, 1)} kW</span>
        </div>
      </Section>

      {/* ═══ SECTION C: PV ARRAY ═══ */}
      <Section id="C" label="PV Array Sizing" color="bg-amber-500/10 text-amber-400 border border-amber-500/20"
        summary={`${panelsRequired} panels · ${nf(actualPVkWp,1)} kWp · DC/AC ${dcAcOversize.toFixed(2)}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-[10px] text-slate-500 mb-1"><span>DC/AC Oversize Ratio</span><span className="font-mono font-bold text-amber-400">{dcAcOversize.toFixed(2)}</span></div>
            <input type="range" min={1.0} max={1.5} step={0.05} value={dcAcOversize}
              onChange={e => setDcAcOversize(parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-2 rounded-lg cursor-pointer" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 mb-1">Panel Wattage</span>
            <select value={panelWattage} onChange={e => setPanelWattage(parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer">
              {PANEL_CATALOG.map(p => (
                <option key={p.id} value={p.ratingWatts}>{p.ratingWatts}W -  KSh {p.costKSh.toLocaleString()} -  {p.model}</option>
              ))}
            </select>
          </div>
        </div>

        {stockWarning && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-[11px] text-red-400 font-medium">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {stockWarning}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Metric label="Target PV" value={nf(targetPVkWp, 1)} unit="kWp" color="amber" />
          <Metric label="Max Allowed" value={nf(maxAllowablePVkWp, 1)} unit="kWp" color="slate" />
          <Metric label="Panels Required" value={String(panelsRequired)} unit="pcs" color="amber" size="lg" />
          <Metric label="Actual PV Array" value={nf(actualPVkWp, 1)} unit="kWp" color="amber" size="lg" />
        </div>

        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold ${pvOversizeOK ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {pvOversizeOK ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {pvOversizeOK ? 'PV Oversize Check: OK -  within inverter input limits' : `WARNING -  ${nf(actualPVkWp,1)}kWp exceeds ${nf(maxAllowablePVkWp,1)}kWp inverter max!`}
        </div>
      </Section>

      {/* ═══ SECTION D: BATTERY ═══ */}
      <Section id="D" label="Battery Storage Sizing (Dyness)" color="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        summary={isGridTied ? 'No battery (Grid-Tied)' : `${actualBatMods} modules · ${nf(actualBatteryKWh,1)} kWh · ${batTowers} tower(s)`}>
        {isGridTied ? (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center text-slate-500 text-sm">
            ⚠ Grid-Tied inverter selected -  no battery storage. Change voltage class in Section B to add batteries.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 mb-1">Product Line</span>
                <select value={dynessLine} onChange={e => setDynessLine(e.target.value as DynessProductLine)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  disabled={isLV}>
                  {isLV
                    ? <option value="LV48">LV48 (DL5.0/DL5.0C 5.12kWh, parallel)</option>
                    : <><option value="Stack100">Stack100 (5.12kWh/module, 3-15/tower)</option>
                       <option value="Stack280">Stack280 (14.3kWh/module, C&I scale)</option></>}
                </select>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 mb-1">Target Capacity (kWh)</span>
                <div className="relative">
                  <input type="number" min={0} step={5} value={targetBatteryKWh}
                    onChange={e => setTargetBatteryKWh(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-amber-950/20 border border-amber-700/30 rounded-xl px-3 py-2.5 text-sm text-amber-100 font-mono focus:outline-none focus:border-amber-500 transition" />
                  <span className="absolute right-3 top-2.5 text-[10px] text-amber-500/60 font-mono">kWh</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Metric label="Modules Required" value={String(batModsReq)} unit={`×${modKWh}kWh`} color="emerald" />
              {isHV ? <>
                <Metric label="Towers" value={`${batTowers}`} unit={`max ${maxPerTower}/tower`} color="emerald" />
                <Metric label="Per Tower" value={String(modsPerTower)} unit="modules" color="emerald" />
                <Metric label="Voltage" value={nf(towerVoltage, 1)} unit="V" color="emerald" />
              </> : <>
                <Metric label="Actual kWh" value={nf(actualBatteryKWh, 1)} unit="kWh" color="emerald" />
                <Metric label="BDUs" value={String(bduCount)} color="slate" />
                <Metric label="Module Cost" value={`KSh ${fmtKSh(modCost)}`} color="slate" />
                <div className={`rounded-xl border px-3.5 py-2.5 text-center ${vCheckOK ? 'bg-emerald-950/30 border-emerald-800/40' : 'bg-red-950/30 border-red-800/40'}`}>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider">Voltage Check</div>
                  <div className={`font-bold font-mono text-sm ${vCheckOK ? 'text-emerald-400' : 'text-red-400'}`}>{vCheckMsg}</div>
                </div>
              </>}
            </div>

            {isHV && (
              <div className="grid grid-cols-4 gap-2">
                <Metric label="Actual Capacity" value={nf(actualBatteryKWh, 1)} unit="kWh" color="emerald" size="lg" />
                <Metric label="BDUs Required" value={String(bduCount)} unit="1 per tower" color="emerald" />
                <Metric label="Module Cost" value={`KSh ${fmtKSh(modCost)}`} color="slate" />
                <div className={`rounded-xl border px-3.5 py-2.5 text-center ${vCheckOK ? 'bg-emerald-950/30 border-emerald-800/40' : 'bg-red-950/30 border-red-800/40'}`}>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider">Voltage Check</div>
                  <div className={`font-bold font-mono text-sm ${vCheckOK ? 'text-emerald-400' : 'text-red-400'}`}>{vCheckMsg}</div>
                </div>
              </div>
            )}
          </>
        )}
      </Section>

      {/* ═══ SECTION E: LIVE SUMMARY ═══ */}
      <div className="bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-950 border border-emerald-800/30 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/20">E</span>
            <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider font-mono">System Configuration Summary</span>
          </div>
          <span className="text-[9px] text-slate-500 font-mono animate-pulse">● Live</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Metric label="PV Array" value={nf(actualPVkWp, 1)} unit="kWp" color="emerald" size="lg" />
          <Metric label="Panels" value={String(panelsRequired)} unit={`×${panelWattage}W`} color="emerald" />
          <Metric label="Inverter" value={selectedInv.model.split('-').slice(0,3).join('-')} color="blue" />
          <Metric label="Inv Units" value={String(actualInvUnits)} unit={`×${nf(invUnitACkW,1)}kW`} color="blue" />
          <Metric label="Battery" value={nf(actualBatteryKWh, 1)} unit="kWh" color="emerald" />
          {isHV ? <Metric label="Towers/BDUs" value={`${batTowers}/${bduCount}`} color="emerald" /> : <Metric label="Modules" value={String(actualBatMods)} unit="parallel" color="emerald" />}
        </div>

        <div className="bg-slate-950/80 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 border border-slate-800/60">
          <span className="text-xs font-bold text-slate-400 uppercase font-mono">Estimated Hardware CapEx (ex-VAT):</span>
          <div className="flex items-center gap-3">
            <span className="text-lg font-black text-emerald-400 font-mono">KSh {roughCapExKSh.toLocaleString()}</span>
            <span className="text-xs text-slate-500 font-mono">≈ ${roughCapExUSD.toLocaleString()} USD</span>
          </div>
        </div>
      </div>

      {/* ═══ SECTION G: ADD-ONS & FINANCIAL ═══ */}
      <Section id="G" label="Optional Add-Ons & Financial Parameters" color="bg-purple-500/10 text-purple-400 border border-purple-500/20"
        defaultOpen={false}
        summary={`Contingency: ${contingencyPct}% · EPC: ${epcMarginPct}% · Discount: ${discountRate}%`}>
        <div className="flex flex-wrap gap-2">
          {[
            ['Generator Interface', includeGenInterface, setIncludeGenInterface],
            ['Weatherproof Enclosure', includeEnclosure, setIncludeEnclosure],
            ['KPLC Net-Metering', includeKPLC, setIncludeKPLC],
            ['1st Year O&M Contract', includeOandM, setIncludeOandM],
          ].map(([label, val, setFn]) => (
            <label key={label as string}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[11px] font-medium cursor-pointer transition-all duration-200 ${
                (val as boolean) ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
              }`}>
              <input type="checkbox" checked={val as boolean} onChange={e => (setFn as (v: boolean) => void)(e.target.checked)} className="accent-purple-500 w-3.5 h-3.5 rounded" />
              {label as string}
            </label>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            ['Contingency %', contingencyPct, setContingencyPct, 0, 15],
            ['EPC Margin %', epcMarginPct, setEpcMarginPct, 5, 35],
            ['Discount Rate %', discountRate, setDiscountRate, 2, 20],
            ['Inflation Rate %', inflationRate, setInflationRate, 0, 15],
          ].map(([label, val, setFn, min, max]) => (
            <div key={label as string}>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>{label as string}</span>
                <span className="font-mono font-bold text-purple-400">{(val as number).toFixed(1)}%</span>
              </div>
              <input type="range" min={min as number} max={max as number} step={0.5} value={val as number}
                onChange={e => (setFn as (v: number) => void)(parseFloat(e.target.value))}
                className="w-full accent-purple-500 h-1.5 rounded-lg cursor-pointer" />
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ COLOR LEGEND ═══ */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[9px] text-slate-600 font-mono px-1">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-950/30 border border-amber-700/30" /> Editable input</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-950 border border-slate-800" /> Auto-calculated</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-950/20 border border-emerald-800/40" /> System summary</span>
      </div>
    </div>
  );
}
