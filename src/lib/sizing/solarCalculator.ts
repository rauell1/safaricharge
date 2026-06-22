// SafariCharge Ltd — Production Sizing & Quoting Engine
// Translates formulas from "solar_sizing_calculator_Final" Google Sheets (May 2026)
// Sections A–F: System Sizing → BOM → Cable Engineering → Financial Returns

import {
  SolarLocation, LoadProfilePreset,
  INVERTER_CATALOG, PANEL_CATALOG, BATTERY_CATALOG,
  CABLE_REFERENCE, CableSpec, BATTERY_CABINET_SIZES,
  PANEL_ELECTRICAL, KSH_PER_USD
} from './mockData';

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface SimulationInputs {
  location: SolarLocation;
  loadProfile: LoadProfilePreset;
  loadMultiplier: number;
  // Hardware selections
  panelId: string;
  panelQty: number;
  inverterId: string;
  inverterQty: number;
  batteryId: string;
  batteryQty: number;
  mountingType: 'pitched' | 'flat' | 'ground';
  // Sizing parameters (from spreadsheet)
  dcAcOversizeRatio: number;         // Default 1.30
  targetBatteryKWh: number;          // Override for target battery capacity
  dynessProductLine: 'Stack100' | 'Stack280' | 'LV48'; // Battery architecture
  // Simulation features
  gridOutageSimulation: boolean;
  contingencyPercent: number;
  epcMarginPercent: number;
  dieselGenCapacityKW: number;
  dieselFuelPriceUSD: number;
  // Financial parameters
  discountRate: number;
  inflationRate: number;
  projectLifeYears: number;
  // Optional add-ons
  includeGeneratorInterface: boolean;
  includeWeatherproofEnclosure: boolean;
  includeKPLCapplication: boolean;
  includeOandM: boolean;
}

export interface HourlySimulationRow {
  hour: number;
  loadKW: number;
  solarKW: number;
  gridAvailable: boolean;
  batterySoCBefore: number;
  batterySoCAfter: number;
  batteryChargeKW: number;
  batteryDischargeKW: number;
  gridImportKW: number;
  gridExportKW: number;
  dieselGenKW: number;
  unservedLoadKW: number;
}

export interface BOMLineItem {
  section: string;
  itemNumber: string;
  description: string;
  unit: string;
  qty: number;
  unitPriceKSh: number;
  unitPriceUSD: number;
  totalKSh: number;
  totalUSD: number;
  notes: string;
}

export interface CableSizingResult {
  circuit: string;
  designCurrentA: number;
  recommendedSizeMM2: number;
  parallelRuns: number;
  pricePerM: number;
  totalLengthM: number;
  totalCostKSh: number;
}

export interface CapExItem {
  name: string;
  category: string;
  qty: number;
  unitCost: number;
  totalCost: number;
  brand: string;
  model: string;
}

export interface FinancialYearRow {
  year: number;
  cashFlowWithoutSolar: number;
  cashFlowWithSolar: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
}

export interface SimulationResults {
  inputs: SimulationInputs;

  // Technical
  solarCapacityKWp: number;
  batteryCapacityKWh: number;
  inverterCapacityKW: number;
  panelAreaRequiredM2: number;
  actualDcAcRatio: number;

  // Engineering validation warnings (null = OK)
  pvOversizeWarning: string | null;
  batteryVoltageWarning: string | null;

  // Hourly dispatch
  hourlyProfile: HourlySimulationRow[];
  annualLoadKWh: number;
  annualPVGeneratedKWh: number;
  annualGridImportKWh: number;
  annualGridExportKWh: number;
  annualDieselGenKWh: number;
  annualDieselFuelLiters: number;
  annualUnservedLoadKWh: number;
  solarSelfConsumptionPercent: number;
  systemAutonomyPercent: number;

  // BOM (10 sections)
  bomLineItems: BOMLineItem[];
  cableSizingResults: CableSizingResult[];

  // CapEx breakdown
  capexItems: CapExItem[];
  subtotalCapExKSh: number;
  subtotalCapExUSD: number;
  contingencyKSh: number;
  contingencyUSD: number;
  epcMarginKSh: number;
  epcMarginUSD: number;
  totalCapExKSh: number;
  totalCapExUSD: number;

  // OpEx
  annualGridBillWithoutSolarUSD: number;
  annualDieselCostWithoutSolarUSD: number;
  baselineAnnualCostUSD: number;
  annualGridBillWithSolarUSD: number;
  annualDieselCostWithSolarUSD: number;
  annualMaintenanceUSD: number;
  annualInsuranceUSD: number;
  annualBatteryReserveUSD: number;
  totalAnnualOpExUSD: number;

  // Financial
  annualSavingsUSD: number;
  simplePaybackYears: number;
  lcoeUSDPerKWh: number;
  lcoeBaselineUSDPerKWh: number;
  npvUSD: number;
  irrPercent: number;

  // Environmental
  annualCO2SavedTons: number;
  equivalentTreesPlanted: number;

  // Cash flows
  cashFlows: FinancialYearRow[];

  // Legacy compatibility
  subtotalCapExUSD_legacy: number;
  contingencyUSD_legacy: number;
  epcMarginUSD_legacy: number;
  totalCapExUSD_legacy: number;
}

// ─── CABLE SIZING ENGINE (IEC 60364-5-52 Method C) ─────────────────────────

function selectCable(designCurrentA: number, voltageV: number, oneWayLengthM: number,
  maxVoltageDropPercent: number, isAC: boolean): { sizeMM2: number; parallelRuns: number; pricePerM: number } {

  // Per IEC/Excel methodology: parallel runs are ONLY added when design current
  // exceeds the largest single cable's ampacity (530A for 300mm²).
  // Do NOT split into parallel runs to save cost — that diverges from the Excel.
  const largestSpec = CABLE_REFERENCE[CABLE_REFERENCE.length - 1]; // 300mm², 530A
  const runs = Math.max(1, Math.ceil(designCurrentA / largestSpec.ampacityA));
  const currentPerRun = designCurrentA / runs;

  for (const spec of CABLE_REFERENCE) {
    if (spec.ampacityA < currentPerRun) continue;
    const voltageDropV = (spec.mVperAm / 1000) * currentPerRun * oneWayLengthM;
    const voltageDropPercent = (voltageDropV / voltageV) * 100;
    if (voltageDropPercent <= maxVoltageDropPercent) {
      const price = isAC ? spec.acPricePerM : spec.dcPricePerM;
      return { sizeMM2: spec.sizeMM2, parallelRuns: runs, pricePerM: price };
    }
  }

  // Voltage drop can't be met even with largest cable — return largest available
  return {
    sizeMM2: largestSpec.sizeMM2,
    parallelRuns: runs,
    pricePerM: isAC ? largestSpec.acPricePerM : largestSpec.dcPricePerM,
  };
}

// ─── SOLAR IRRADIANCE SHAPE ─────────────────────────────────────────────────

function getHourlySolarRatio(hour: number): number {
  if (hour < 6 || hour > 18) return 0;
  return Math.sin(Math.PI * (hour - 6) / 12);
}

// ─── CORE SIMULATION ────────────────────────────────────────────────────────

export function runSimulation(inputs: SimulationInputs): SimulationResults {
  const {
    location, loadProfile, loadMultiplier,
    panelId, panelQty, inverterId, inverterQty, batteryId, batteryQty,
    dcAcOversizeRatio,
    gridOutageSimulation, contingencyPercent, epcMarginPercent,
    dieselGenCapacityKW, dieselFuelPriceUSD,
    discountRate, inflationRate, projectLifeYears,
    includeGeneratorInterface, includeWeatherproofEnclosure,
    includeKPLCapplication, includeOandM
  } = inputs;

  // Retrieve hardware
  const panel = PANEL_CATALOG.find(c => c.id === panelId) || PANEL_CATALOG[0];
  const inverter = INVERTER_CATALOG.find(c => c.id === inverterId) || INVERTER_CATALOG[0];
  const battery = BATTERY_CATALOG.find(c => c.id === batteryId) || BATTERY_CATALOG[0];
  const panelElec = PANEL_ELECTRICAL[panelId] || PANEL_ELECTRICAL['panel-jinko-620'];

  // ── Section A: System Size ────────────────────────────────────────────
  // Target PV array = inverter AC capacity × oversize ratio
  const totalInverterACkW = (inverterQty * (inverter.ratingWatts || 50000)) / 1000;
  const targetPVkWp = totalInverterACkW * dcAcOversizeRatio;
  const actualPanelQty = panelQty || Math.ceil((targetPVkWp * 1000) / (panel.ratingWatts || 620));
  const solarCapacityKWp = (actualPanelQty * (panel.ratingWatts || 620)) / 1000;
  const actualDcAcRatio = solarCapacityKWp / totalInverterACkW;

  // PV oversize check vs inverter max PV input (Excel Section C warning)
  const maxAllowedPVkWp = (inverter.maxPVInputKWp || 0) * inverterQty;
  const pvOversizeWarning: string | null =
    maxAllowedPVkWp > 0 && solarCapacityKWp > maxAllowedPVkWp
      ? `PV array (${solarCapacityKWp.toFixed(1)} kWp) exceeds inverter max PV input (${maxAllowedPVkWp.toFixed(1)} kWp for ${inverterQty} unit${inverterQty > 1 ? 's' : ''}). Reduce panel count or adjust DC/AC ratio.`
      : null;

  // ── Section D: Battery Sizing ────────────────────────────────────────
  const batteryCapacityKWh = batteryQty * (battery.capacityKWh || 5.12);
  const isHV = inverter.voltageClass?.includes('HV') || false;
  const isLV = inverter.voltageClass?.includes('LV') || false;

  // Stack100/Stack280 tower calculations
  const maxModulesPerTower = 15;
  const modulesRequired = Math.ceil(batteryCapacityKWh / (battery.capacityKWh || 5.12));
  const towersRequired = Math.ceil(modulesRequired / maxModulesPerTower);
  const modulesPerTower = Math.ceil(modulesRequired / towersRequired);
  const actualModules = modulesPerTower * towersRequired;
  const actualBatteryKWh = actualModules * (battery.capacityKWh || 5.12);
  const bduRequired = isHV ? towersRequired : 0;
  const towerVoltage = isHV ? modulesPerTower * 51.2 : 48;

  // Battery voltage window check vs inverter spec (Excel Section D warning)
  let batteryVoltageWarning: string | null = null;
  if (isHV) {
    const voltClass = inverter.voltageClass || '';
    // Deye AM2 = 160-700V, Deye BM3/4 = 160-800V, Solis = 150-850V
    const minV = voltClass.includes('150') ? 150 : 160;
    const maxV = voltClass.includes('800') ? 800 : voltClass.includes('850') ? 850 : 700;
    if (towerVoltage < minV || towerVoltage > maxV) {
      batteryVoltageWarning = `Tower voltage (${towerVoltage.toFixed(0)} V) is outside inverter battery voltage window (${minV}–${maxV} V). Adjust modules per tower.`;
    }
  }

  // ── Panel area ────────────────────────────────────────────────────────
  const panelAreaRequiredM2 = actualPanelQty * 2.3;

  // ── Grid outage schedule ──────────────────────────────────────────────
  const outageHours = new Set<number>();
  if (gridOutageSimulation) {
    const hrs = Math.round(location.outageHoursPerDay);
    if (hrs > 0) {
      if (location.id === 'loc-lagos') [0,1,2,3,4,5,12,13,14,15,16,17].forEach(h => outageHours.add(h));
      else if (location.id === 'loc-johannesburg') [8,9,18,19].forEach(h => outageHours.add(h));
      else if (location.id === 'loc-nairobi') [14,15,19].forEach(h => outageHours.add(h));
      else for (let i = 0; i < hrs; i++) outageHours.add((14 + i) % 24);
    }
  }

  // ── Hourly Dispatch Simulation ────────────────────────────────────────
  const hourlyProfile: HourlySimulationRow[] = [];
  let totalPVGenDaily = 0, totalLoadDaily = 0, totalGridImportDaily = 0;
  let totalGridExportDaily = 0, totalDieselGenDaily = 0, totalUnservedDaily = 0;

  const batEff = battery.efficiency || 0.95;
  const batMaxChargeRate = actualBatteryKWh * 0.5;
  const batMaxDischargeRate = actualBatteryKWh * 0.8;
  const minSoC = 10;
  let soc = 50;

  for (let hour = 0; hour < 24; hour++) {
    const loadKW = loadProfile.baseHourlyLoadKW[hour] * loadMultiplier;
    totalLoadDaily += loadKW;

    const solarRatio = getHourlySolarRatio(hour);
    const solarKW = solarCapacityKWp * (solarRatio * (location.peakSunHours / 7.63)) * 0.82;
    totalPVGenDaily += solarKW;

    const gridAvailable = !outageHours.has(hour);
    const netLoadKW = loadKW - solarKW;

    let batCharge = 0, batDischarge = 0, gridImport = 0, gridExport = 0;
    let dieselGen = 0, unserved = 0;
    const socBefore = soc;

    if (netLoadKW < 0) {
      const surplus = Math.abs(netLoadKW);
      if (soc < 100 && actualBatteryKWh > 0) {
        const maxChargePossible = ((100 - soc) / 100) * actualBatteryKWh / batEff;
        const actualCharge = Math.min(surplus, batMaxChargeRate, maxChargePossible);
        batCharge = actualCharge;
        soc += (actualCharge * batEff / actualBatteryKWh) * 100;
        const remaining = surplus - actualCharge;
        if (remaining > 0 && gridAvailable) gridExport = remaining;
      } else if (gridAvailable) {
        gridExport = surplus;
      }
    } else {
      let deficit = netLoadKW;
      if (soc > minSoC && actualBatteryKWh > 0) {
        const availKWh = ((soc - minSoC) / 100) * actualBatteryKWh;
        const maxDischPossible = availKWh * batEff;
        const actualDisch = Math.min(deficit, batMaxDischargeRate, maxDischPossible);
        batDischarge = actualDisch;
        soc -= (actualDisch / (batEff * actualBatteryKWh)) * 100;
        deficit -= actualDisch;
      }
      if (deficit > 0) {
        if (gridAvailable) { gridImport = deficit; deficit = 0; }
        else {
          if (dieselGenCapacityKW > 0) {
            const genOut = Math.min(deficit, dieselGenCapacityKW);
            dieselGen = genOut;
            deficit -= genOut;
          }
          if (deficit > 0) unserved = deficit;
        }
      }
    }

    totalGridImportDaily += gridImport;
    totalGridExportDaily += gridExport;
    totalDieselGenDaily += dieselGen;
    totalUnservedDaily += unserved;

    hourlyProfile.push({
      hour, loadKW: Math.round(loadKW*100)/100, solarKW: Math.round(solarKW*100)/100,
      gridAvailable,
      batterySoCBefore: Math.round(socBefore*10)/10, batterySoCAfter: Math.round(soc*10)/10,
      batteryChargeKW: Math.round(batCharge*100)/100, batteryDischargeKW: Math.round(batDischarge*100)/100,
      gridImportKW: Math.round(gridImport*100)/100, gridExportKW: Math.round(gridExport*100)/100,
      dieselGenKW: Math.round(dieselGen*100)/100, unservedLoadKW: Math.round(unserved*100)/100
    });
  }

  // Annualize
  const annualLoadKWh = Math.round(totalLoadDaily * 365);
  const annualPVGeneratedKWh = Math.round(totalPVGenDaily * 365);
  const annualGridImportKWh = Math.round(totalGridImportDaily * 365);
  const annualGridExportKWh = Math.round(totalGridExportDaily * 365);
  const annualDieselGenKWh = Math.round(totalDieselGenDaily * 365);
  const annualDieselFuelLiters = Math.round(annualDieselGenKWh * 0.3);
  const annualUnservedLoadKWh = Math.round(totalUnservedDaily * 365);
  const solarSelfConsumptionPercent = totalPVGenDaily > 0 ? Math.round(((totalPVGenDaily - totalGridExportDaily)/totalPVGenDaily)*1000)/10 : 0;
  const localMet = annualLoadKWh - annualGridImportKWh - annualUnservedLoadKWh;
  const systemAutonomyPercent = annualLoadKWh > 0 ? Math.round((localMet/annualLoadKWh)*1000)/10 : 0;

  // ── IEC CABLE SIZING ──────────────────────────────────────────────────
  const stringRunLength = 25; // m, typical panel-to-combiner
  const dcMainRunLength = 8; // m, combiner-to-inverter
  const acRunLength = 20; // m, inverter-to-DB
  const battRunLength = 3; // m, battery-to-inverter

  const stringCurrent = panelElec.isc * 1.25;
  const stringVoltage = panelElec.vmp * 20; // default 20 panels/string
  const pvStringCable = selectCable(stringCurrent, stringVoltage, stringRunLength, 1.0, false);
  const numStrings = Math.ceil(actualPanelQty / 20);

  const dcMainCurrent = (solarCapacityKWp * 1000 / stringVoltage) * 1.25;
  const dcMainCable = selectCable(dcMainCurrent, stringVoltage, dcMainRunLength, 1.0, false);

  const acVoltage = inverter.phase === '3P' ? 400 : 230;
  const acDesignCurrent = (totalInverterACkW * 1000) / (acVoltage * Math.sqrt(inverter.phase==='3P'?3:1) * 0.95);
  const acCable = selectCable(acDesignCurrent, acVoltage, acRunLength, 2.5, true);

  const battDesignCurrent = inverter.maxChargeCurrent || 100;
  const battVoltage = towerVoltage;
  const battCable = selectCable(battDesignCurrent, battVoltage, battRunLength, 1.0, false);

  const cableSizingResults: CableSizingResult[] = [
    { circuit:'PV String (panel to combiner)', designCurrentA:Math.round(stringCurrent*100)/100, recommendedSizeMM2:pvStringCable.sizeMM2, parallelRuns:pvStringCable.parallelRuns, pricePerM:pvStringCable.pricePerM, totalLengthM:numStrings*stringRunLength*2, totalCostKSh:Math.round(numStrings*stringRunLength*2*pvStringCable.pricePerM) },
    { circuit:'DC Main (combiner to inverter)', designCurrentA:Math.round(dcMainCurrent*100)/100, recommendedSizeMM2:dcMainCable.sizeMM2, parallelRuns:dcMainCable.parallelRuns, pricePerM:dcMainCable.pricePerM, totalLengthM:inverterQty*dcMainRunLength*2*dcMainCable.parallelRuns, totalCostKSh:Math.round(inverterQty*dcMainRunLength*2*dcMainCable.parallelRuns*dcMainCable.pricePerM) },
    { circuit:'AC Output (inverter to DB)', designCurrentA:Math.round(acDesignCurrent*100)/100, recommendedSizeMM2:acCable.sizeMM2, parallelRuns:acCable.parallelRuns, pricePerM:acCable.pricePerM, totalLengthM:inverterQty*acRunLength*acCable.parallelRuns, totalCostKSh:Math.round(inverterQty*acRunLength*acCable.parallelRuns*acCable.pricePerM) },
    { circuit:'Battery Interconnect', designCurrentA:battDesignCurrent, recommendedSizeMM2:battCable.sizeMM2, parallelRuns:battCable.parallelRuns, pricePerM:battCable.pricePerM, totalLengthM:towersRequired*battRunLength*2*battCable.parallelRuns, totalCostKSh:Math.round(towersRequired*battRunLength*2*battCable.parallelRuns*battCable.pricePerM) },
  ];

  // ── SECTION-BY-SECTION BOM (Quotation & BOM Sheet) ────────────────────
  const bom: BOMLineItem[] = [];

  // Section 1: Solar PV Modules
  const panelCost = panel.costKSh;
  const panelTotalKSh = actualPanelQty * panelCost;
  bom.push({ section:'1. Solar PV Modules', itemNumber:'1', description:`${panel.brand} ${panel.model}`, unit:'pcs', qty:actualPanelQty, unitPriceKSh:panelCost, unitPriceUSD:Math.round(panelCost/KSH_PER_USD), totalKSh:panelTotalKSh, totalUSD:Math.round(panelTotalKSh/KSH_PER_USD), notes:'Wattage and price auto-selected from Panel Database' });

  // Section 2: Energy Storage
  const batCost = battery.costKSh;
  const batTotalKSh = actualModules * batCost;
  bom.push({ section:'2. Energy Storage', itemNumber:'2', description:`${battery.brand} ${battery.model}`, unit:'pcs', qty:actualModules, unitPriceKSh:batCost, unitPriceUSD:Math.round(batCost/KSH_PER_USD), totalKSh:batTotalKSh, totalUSD:Math.round(batTotalKSh/KSH_PER_USD), notes:isHV ? `HV ${inputs.dynessProductLine}, ${towersRequired} tower(s)` : 'LV48 parallel modules' });

  if (isHV && bduRequired > 0) {
    const bduCost = 95000;
    const bduTotal = bduRequired * bduCost;
    bom.push({ section:'2. Energy Storage', itemNumber:'3', description:'Dyness BDU (Battery Distribution Unit)', unit:'pcs', qty:bduRequired, unitPriceKSh:bduCost, unitPriceUSD:Math.round(bduCost/KSH_PER_USD), totalKSh:bduTotal, totalUSD:Math.round(bduTotal/KSH_PER_USD), notes:'1 per battery tower' });
  }

  // Battery rack/cabinet
  let rackCost = 45000 * towersRequired;
  if (isLV) {
    // Use modulesRequired (calculated from target kWh) not batteryQty (user-input units)
    const cabinet = BATTERY_CABINET_SIZES.filter(c => c.slots >= modulesRequired).sort((a,b) => a.slots - b.slots)[0] || BATTERY_CABINET_SIZES[BATTERY_CABINET_SIZES.length-1];
    rackCost = cabinet.costKSh;
  }
  bom.push({ section:'2. Energy Storage', itemNumber:'4', description:'Battery rack / enclosure / base stand', unit:'set', qty:towersRequired, unitPriceKSh:Math.round(rackCost/towersRequired), unitPriceUSD:Math.round(rackCost/towersRequired/KSH_PER_USD), totalKSh:rackCost, totalUSD:Math.round(rackCost/KSH_PER_USD), notes:isLV ? `Suntree cabinet (${modulesRequired} slots)` : `HV tower stand` });

  // Battery cable
  const battCableCost = towersRequired * battRunLength * 2 * battCable.parallelRuns * battCable.pricePerM;
  bom.push({ section:'2. Energy Storage', itemNumber:'5', description:`Battery interconnect cable, ${battCable.sizeMM2}mm² (engineered IEC 60364-5-52)`, unit:'m', qty:towersRequired*battRunLength*2*battCable.parallelRuns, unitPriceKSh:battCable.pricePerM, unitPriceUSD:Math.round(battCable.pricePerM/KSH_PER_USD), totalKSh:battCableCost, totalUSD:Math.round(battCableCost/KSH_PER_USD), notes:'Cable Sizing sheet Section E' });

  // Battery fuse
  const battFuseCost = 5397;
  bom.push({ section:'2. Energy Storage', itemNumber:'5.5', description:'Battery main fuse (per tower)', unit:'pcs', qty:towersRequired, unitPriceKSh:battFuseCost, unitPriceUSD:Math.round(battFuseCost/KSH_PER_USD), totalKSh:towersRequired*battFuseCost, totalUSD:Math.round(towersRequired*battFuseCost/KSH_PER_USD), notes:'Suntree 250A battery fuse (confirmed)' });

  // Battery connector
  const battConnectorCost = 3480;
  bom.push({ section:'2. Energy Storage', itemNumber:'5.7', description:'Battery connector, per pair', unit:'pair', qty:towersRequired, unitPriceKSh:battConnectorCost, unitPriceUSD:Math.round(battConnectorCost/KSH_PER_USD), totalKSh:towersRequired*battConnectorCost, totalUSD:Math.round(towersRequired*battConnectorCost/KSH_PER_USD), notes:'Suntree confirmed price' });

  // Section 3: Inverter
  const invCost = inverter.costKSh;
  const invTotal = inverterQty * invCost;
  bom.push({ section:'3. Inverter & Monitoring', itemNumber:'6', description:`${inverter.brand} ${inverter.model}`, unit:'pcs', qty:inverterQty, unitPriceKSh:invCost, unitPriceUSD:Math.round(invCost/KSH_PER_USD), totalKSh:invTotal, totalUSD:Math.round(invTotal/KSH_PER_USD), notes:`${inverter.voltageClass}, ${inverter.phase}` });

  const dongleCost = 18000;
  bom.push({ section:'3. Inverter & Monitoring', itemNumber:'7', description:'Wi-Fi/LAN monitoring dongle and cloud configuration', unit:'pcs', qty:inverterQty, unitPriceKSh:dongleCost, unitPriceUSD:Math.round(dongleCost/KSH_PER_USD), totalKSh:inverterQty*dongleCost, totalUSD:Math.round(inverterQty*dongleCost/KSH_PER_USD), notes:'Remote monitoring, firmware updates' });

  // Section 4: Mounting Structure
  const mountingRate = 14000; // KSh/kWp
  const mountingTotal = Math.round(solarCapacityKWp * mountingRate);
  bom.push({ section:'4. Mounting Structure', itemNumber:'8', description:'Aluminium ground/roof-mount racking system', unit:'kWp', qty:Math.round(solarCapacityKWp*10)/10, unitPriceKSh:mountingRate, unitPriceUSD:Math.round(mountingRate/KSH_PER_USD), totalKSh:mountingTotal, totalUSD:Math.round(mountingTotal/KSH_PER_USD), notes:'Rate per kWp DC - see BOS Rates' });

  // Section 5: DC BOS
  const dcStringCableCost = numStrings * stringRunLength * 2 * pvStringCable.pricePerM;
  bom.push({ section:'5. DC Side BOS', itemNumber:'9', description:`Solar DC string cable, ${pvStringCable.sizeMM2}mm² (engineered IEC 60364-5-52)`, unit:'m', qty:numStrings*stringRunLength*2, unitPriceKSh:pvStringCable.pricePerM, unitPriceUSD:Math.round(pvStringCable.pricePerM/KSH_PER_USD), totalKSh:dcStringCableCost, totalUSD:Math.round(dcStringCableCost/KSH_PER_USD), notes:'Cable Sizing sheet Section B' });

  const mc4Total = Math.round(solarCapacityKWp * 250);
  bom.push({ section:'5. DC Side BOS', itemNumber:'10', description:'MC4 connectors, branch/Y-connectors and crimping', unit:'kWp', qty:Math.round(solarCapacityKWp*10)/10, unitPriceKSh:250, unitPriceUSD:Math.round(250/KSH_PER_USD), totalKSh:mc4Total, totalUSD:Math.round(mc4Total/KSH_PER_USD), notes:'Rate per kWp DC' });

  const dcCombinerTotal = inverterQty * 75000;
  bom.push({ section:'5. DC Side BOS', itemNumber:'11', description:'PV DC combiner box with DC MCBs and string fusing', unit:'pcs', qty:inverterQty, unitPriceKSh:75000, unitPriceUSD:Math.round(75000/KSH_PER_USD), totalKSh:dcCombinerTotal, totalUSD:Math.round(dcCombinerTotal/KSH_PER_USD), notes:'1 per inverter unit' });

  const dcSpdTotal = inverterQty * 18000;
  bom.push({ section:'5. DC Side BOS', itemNumber:'12', description:'DC Surge Protection Device (SPD), Type II', unit:'pcs', qty:inverterQty, unitPriceKSh:18000, unitPriceUSD:Math.round(18000/KSH_PER_USD), totalKSh:dcSpdTotal, totalUSD:Math.round(dcSpdTotal/KSH_PER_USD), notes:'1 per inverter unit' });

  const dcMainCableCost = inverterQty * dcMainRunLength * 2 * dcMainCable.parallelRuns * dcMainCable.pricePerM;
  bom.push({ section:'5. DC Side BOS', itemNumber:'13', description:`DC main cable (combiner to inverter), ${dcMainCable.sizeMM2}mm² (engineered IEC 60364-5-52)`, unit:'m', qty:inverterQty*dcMainRunLength*2*dcMainCable.parallelRuns, unitPriceKSh:dcMainCable.pricePerM, unitPriceUSD:Math.round(dcMainCable.pricePerM/KSH_PER_USD), totalKSh:dcMainCableCost, totalUSD:Math.round(dcMainCableCost/KSH_PER_USD), notes:'Cable Sizing sheet Section C' });

  const dcIsolatorTotal = inverterQty * 4080;
  bom.push({ section:'5. DC Side BOS', itemNumber:'13.5', description:'DC Isolator switch (PV array or battery-side disconnect)', unit:'pcs', qty:inverterQty, unitPriceKSh:4080, unitPriceUSD:Math.round(4080/KSH_PER_USD), totalKSh:dcIsolatorTotal, totalUSD:Math.round(dcIsolatorTotal/KSH_PER_USD), notes:'Suntree 4P 32A 1000VDC isolator' });

  // Section 6: AC BOS
  const acCableCost = inverterQty * acRunLength * acCable.parallelRuns * acCable.pricePerM;
  bom.push({ section:'6. AC Side BOS', itemNumber:'14', description:`AC output cable (inverter to DB), ${acCable.sizeMM2}mm² (engineered IEC 60364-5-52)`, unit:'m', qty:inverterQty*acRunLength*acCable.parallelRuns, unitPriceKSh:acCable.pricePerM, unitPriceUSD:Math.round(acCable.pricePerM/KSH_PER_USD), totalKSh:acCableCost, totalUSD:Math.round(acCableCost/KSH_PER_USD), notes:'Cable Sizing sheet Section D' });

  const atsTotal = 145000;
  bom.push({ section:'6. AC Side BOS', itemNumber:'15', description:'Automatic Transfer Switch (ATS) / changeover switch', unit:'lot', qty:1, unitPriceKSh:atsTotal, unitPriceUSD:Math.round(atsTotal/KSH_PER_USD), totalKSh:atsTotal, totalUSD:Math.round(atsTotal/KSH_PER_USD), notes:'1 per system' });

  const mccbTotal = inverterQty * 75000;
  bom.push({ section:'6. AC Side BOS', itemNumber:'16', description:'3-Phase MCCBs (main inverter output, grid-tie, load breakers)', unit:'set', qty:inverterQty, unitPriceKSh:75000, unitPriceUSD:Math.round(75000/KSH_PER_USD), totalKSh:mccbTotal, totalUSD:Math.round(mccbTotal/KSH_PER_USD), notes:'1 set per inverter unit' });

  const acSpdTotal = 22000;
  bom.push({ section:'6. AC Side BOS', itemNumber:'17', description:'AC Surge Protection Device (SPD), Type II, distribution board', unit:'lot', qty:1, unitPriceKSh:acSpdTotal, unitPriceUSD:Math.round(acSpdTotal/KSH_PER_USD), totalKSh:acSpdTotal, totalUSD:Math.round(acSpdTotal/KSH_PER_USD), notes:'1 per system' });

  // Section 7: Earthing & Cable Management
  const earthingTotal = 65000;
  bom.push({ section:'7. Earthing & Cable Mgmt', itemNumber:'18', description:'Earthing system - earth rods, earth bars, copper tape bonding', unit:'lot', qty:1, unitPriceKSh:earthingTotal, unitPriceUSD:Math.round(earthingTotal/KSH_PER_USD), totalKSh:earthingTotal, totalUSD:Math.round(earthingTotal/KSH_PER_USD), notes:'Base lot per Kenyan electrical code' });

  const traysTotal = 60000;
  bom.push({ section:'7. Earthing & Cable Mgmt', itemNumber:'19', description:'Cable trays, trunking, conduits and ducting', unit:'lot', qty:1, unitPriceKSh:traysTotal, unitPriceUSD:Math.round(traysTotal/KSH_PER_USD), totalKSh:traysTotal, totalUSD:Math.round(traysTotal/KSH_PER_USD), notes:'Base lot; scales with site layout' });

  // Section 8: Generator Interface & Enclosures (Optional)
  if (includeGeneratorInterface) {
    bom.push({ section:'8. Generator Interface', itemNumber:'20', description:'Generator AVS/auto-start interface to inverter generator port', unit:'set', qty:1, unitPriceKSh:75000, unitPriceUSD:Math.round(75000/KSH_PER_USD), totalKSh:75000, totalUSD:Math.round(75000/KSH_PER_USD), notes:'Optional - delete if not required' });
    bom.push({ section:'8. Generator Interface', itemNumber:'21', description:'Outdoor weatherproof enclosure (inverter + battery tower), IP55/NEMA 3R', unit:'set', qty:includeWeatherproofEnclosure?1:0, unitPriceKSh:180000, unitPriceUSD:Math.round(180000/KSH_PER_USD), totalKSh:includeWeatherproofEnclosure?180000:0, totalUSD:includeWeatherproofEnclosure?Math.round(180000/KSH_PER_USD):0, notes:'Optional - omit if installed in existing plant room' });
    bom.push({ section:'8. Generator Interface', itemNumber:'22', description:'Fire safety provision (extinguisher, signage)', unit:'set', qty:1, unitPriceKSh:15000, unitPriceUSD:Math.round(15000/KSH_PER_USD), totalKSh:15000, totalUSD:Math.round(15000/KSH_PER_USD), notes:'Supplementary to battery built-in fire suppression' });
  }

  // Section 9: Installation, Logistics & Commissioning
  const transportTotal = 45000;
  bom.push({ section:'9. Installation', itemNumber:'23', description:'Transport and delivery of equipment to site (Nairobi)', unit:'lot', qty:1, unitPriceKSh:transportTotal, unitPriceUSD:Math.round(transportTotal/KSH_PER_USD), totalKSh:transportTotal, totalUSD:Math.round(transportTotal/KSH_PER_USD), notes:'Base lot; larger systems may need multiple trips' });

  // Calculate subtotal for installation %-based labor
  const allBomSubtotal = bom.reduce((sum, item) => sum + item.totalKSh, 0);
  const installLaborRate = solarCapacityKWp > 100 ? 0.08 : (solarCapacityKWp > 15 ? 0.10 : 0.12);
  const installLaborTotal = Math.round(allBomSubtotal * installLaborRate);
  bom.push({ section:'9. Installation', itemNumber:'24', description:'Installation labor, electrical works, system wiring, mechanical assembly & commissioning', unit:'lot', qty:1, unitPriceKSh:installLaborTotal, unitPriceUSD:Math.round(installLaborTotal/KSH_PER_USD), totalKSh:installLaborTotal, totalUSD:Math.round(installLaborTotal/KSH_PER_USD), notes:`Industry-standard rate (${Math.round(installLaborRate*100)}%) for systems of this scale` });

  // Section 10: Grid Interconnection & Aftercare (Optional)
  if (includeKPLCapplication) {
    bom.push({ section:'10. Grid & Aftercare', itemNumber:'25', description:'KPLC net-metering/interconnection application support', unit:'lot', qty:1, unitPriceKSh:50000, unitPriceUSD:Math.round(50000/KSH_PER_USD), totalKSh:50000, totalUSD:Math.round(50000/KSH_PER_USD), notes:'Applicable only if grid export is intended' });
  }
  // EPM Meter for grid-tied
  const isGridTied = inverter.voltageClass === 'Grid-Tied';
  if (isGridTied || includeKPLCapplication) {
    bom.push({ section:'10. Grid & Aftercare', itemNumber:'25.5', description:'EPM Meter (export/import metering, 3-phase with CTs)', unit:'pcs', qty:1, unitPriceKSh:26680, unitPriceUSD:Math.round(26680/KSH_PER_USD), totalKSh:26680, totalUSD:Math.round(26680/KSH_PER_USD), notes:'Acrel 3-phase EPM meter with CTs (Megawatt confirmed)' });
  }
  if (includeOandM) {
    bom.push({ section:'10. Grid & Aftercare', itemNumber:'26', description:'First-year Operations & Maintenance (quarterly visits)', unit:'year', qty:1, unitPriceKSh:120000, unitPriceUSD:Math.round(120000/KSH_PER_USD), totalKSh:120000, totalUSD:Math.round(120000/KSH_PER_USD), notes:'Optional; renewable annually' });
  }

  // ── CAPEX TOTALS ─────────────────────────────────────────────────────
  const subtotalCapExKSh = bom.reduce((s, i) => s + i.totalKSh, 0);
  const subtotalCapExUSD = Math.round(subtotalCapExKSh / KSH_PER_USD);
  const contingencyKSh = Math.round(subtotalCapExKSh * contingencyPercent / 100);
  const contingencyUSD = Math.round(contingencyKSh / KSH_PER_USD);
  const epcMarginKSh = Math.round((subtotalCapExKSh + contingencyKSh) * epcMarginPercent / 100);
  const epcMarginUSD = Math.round(epcMarginKSh / KSH_PER_USD);
  const totalCapExKSh = subtotalCapExKSh + contingencyKSh + epcMarginKSh;
  const totalCapExUSD = Math.round(totalCapExKSh / KSH_PER_USD);

  // Legacy capexItems for backward compatibility
  const capexItems: CapExItem[] = bom.slice(0, 12).map(item => ({
    name: item.description,
    category: item.section,
    qty: item.qty,
    unitCost: item.unitPriceUSD,
    totalCost: item.totalUSD,
    brand: '',
    model: ''
  }));

  // ── OPEX / BASELINE ──────────────────────────────────────────────────
  const outageFraction = outageHours.size / 24;
  const gridOnlineLoad = annualLoadKWh * (1 - outageFraction);
  const gridOutageLoad = annualLoadKWh * outageFraction;

  const annualGridBillWithoutSolarUSD = gridOnlineLoad * location.gridTariffUSD;
  const dieselWithoutSolarLiters = gridOutageLoad * 0.35;
  const annualDieselCostWithoutSolarUSD = dieselWithoutSolarLiters * dieselFuelPriceUSD;
  const baselineAnnualCostUSD = annualGridBillWithoutSolarUSD + annualDieselCostWithoutSolarUSD;

  const annualGridBillWithSolarUSD = (annualGridImportKWh * location.gridTariffUSD) - (annualGridExportKWh * location.gridFeedInTariffUSD);
  const annualDieselCostWithSolarUSD = annualDieselFuelLiters * dieselFuelPriceUSD;
  const annualMaintenanceUSD = (panelTotalKSh / KSH_PER_USD + invTotal / KSH_PER_USD) * 0.012;
  const annualInsuranceUSD = totalCapExUSD * 0.004;
  const annualBatteryReserveUSD = (batTotalKSh / KSH_PER_USD) * 0.025;
  const totalAnnualOpExUSD = Math.max(0, annualGridBillWithSolarUSD + annualDieselCostWithSolarUSD + annualMaintenanceUSD + annualInsuranceUSD + annualBatteryReserveUSD);

  // ── FINANCIAL RETURNS ─────────────────────────────────────────────────
  const annualSavingsUSD = baselineAnnualCostUSD - totalAnnualOpExUSD;
  const simplePaybackYears = annualSavingsUSD > 0 ? totalCapExUSD / annualSavingsUSD : 99;

  const cashFlows: FinancialYearRow[] = [];
  let cumCF = -totalCapExUSD;
  cashFlows.push({ year:0, cashFlowWithoutSolar:0, cashFlowWithSolar:-totalCapExUSD, netCashFlow:-totalCapExUSD, cumulativeCashFlow:cumCF });
  let npvUSD = -totalCapExUSD;

  for (let y = 1; y <= projectLifeYears; y++) {
    const esc = Math.pow(1 + inflationRate/100, y);
    const baselineEsc = baselineAnnualCostUSD * esc;
    const opexEsc = totalAnnualOpExUSD * esc;
    const netCF = baselineEsc - opexEsc;
    cumCF += netCF;
    const df = Math.pow(1 + discountRate/100, y);
    npvUSD += netCF / df;
    cashFlows.push({ year:y, cashFlowWithoutSolar:Math.round(-baselineEsc), cashFlowWithSolar:Math.round(-opexEsc), netCashFlow:Math.round(netCF), cumulativeCashFlow:Math.round(cumCF) });
  }

  // IRR (Secant Method)
  let irr = 0.08;
  try {
    const cfArr = cashFlows.map(c => c.netCashFlow);
    let r1 = 0.05, r2 = 0.25;
    let npv1 = cfArr.reduce((s,c,i)=>s+c/Math.pow(1+r1,i),0);
    for (let iter=0; iter<50; iter++) {
      const npv2 = cfArr.reduce((s,c,i)=>s+c/Math.pow(1+r2,i),0);
      if (Math.abs(npv2)<0.5) { irr=r2; break; }
      const rNew = r2 - npv2*(r2-r1)/(npv2-npv1);
      r1=r2; r2=rNew; npv1=npv2;
    }
  } catch(e) { irr = 0.08; }

  // LCOE
  let discountedOpex = 0, discountedGen = 0;
  for (let y=1; y<=projectLifeYears; y++) {
    const df = Math.pow(1+discountRate/100, y);
    const esc = Math.pow(1+inflationRate/100, y);
    const deg = Math.pow(0.996, y); // 0.40%/yr per Jinko 30-yr linear warranty
    discountedOpex += (totalAnnualOpExUSD*esc)/df;
    discountedGen += (annualPVGeneratedKWh*deg)/df;
  }
  const lcoe = discountedGen>0 ? (totalCapExUSD+discountedOpex)/discountedGen : 0;

  const lcoeBaseline = annualLoadKWh>0 ? baselineAnnualCostUSD/annualLoadKWh : 0;
  const annualCO2SavedTons = (annualPVGeneratedKWh*location.co2Intensity)/1000;
  const equivalentTreesPlanted = Math.round((annualCO2SavedTons*1000)/22);

  return {
    inputs,
    solarCapacityKWp: Math.round(solarCapacityKWp*10)/10,
    batteryCapacityKWh: Math.round(actualBatteryKWh*10)/10,
    inverterCapacityKW: Math.round(totalInverterACkW*10)/10,
    panelAreaRequiredM2: Math.round(panelAreaRequiredM2*10)/10,
    actualDcAcRatio: Math.round(actualDcAcRatio*100)/100,
    pvOversizeWarning,
    batteryVoltageWarning,

    hourlyProfile,
    annualLoadKWh, annualPVGeneratedKWh, annualGridImportKWh, annualGridExportKWh,
    annualDieselGenKWh, annualDieselFuelLiters, annualUnservedLoadKWh,
    solarSelfConsumptionPercent, systemAutonomyPercent,

    bomLineItems: bom,
    cableSizingResults,

    capexItems,
    subtotalCapExKSh, subtotalCapExUSD,
    contingencyKSh, contingencyUSD,
    epcMarginKSh, epcMarginUSD,
    totalCapExKSh, totalCapExUSD,

    annualGridBillWithoutSolarUSD: Math.round(annualGridBillWithoutSolarUSD),
    annualDieselCostWithoutSolarUSD: Math.round(annualDieselCostWithoutSolarUSD),
    baselineAnnualCostUSD: Math.round(baselineAnnualCostUSD),
    annualGridBillWithSolarUSD: Math.round(annualGridBillWithSolarUSD),
    annualDieselCostWithSolarUSD: Math.round(annualDieselCostWithSolarUSD),
    annualMaintenanceUSD: Math.round(annualMaintenanceUSD),
    annualInsuranceUSD: Math.round(annualInsuranceUSD),
    annualBatteryReserveUSD: Math.round(annualBatteryReserveUSD),
    totalAnnualOpExUSD: Math.round(totalAnnualOpExUSD),

    annualSavingsUSD: Math.round(annualSavingsUSD),
    simplePaybackYears: Math.round(simplePaybackYears*10)/10,
    lcoeUSDPerKWh: Math.round(lcoe*1000)/1000,
    lcoeBaselineUSDPerKWh: Math.round(lcoeBaseline*1000)/1000,
    npvUSD: Math.round(npvUSD),
    irrPercent: Math.round(irr*1000)/10,

    annualCO2SavedTons: Math.round(annualCO2SavedTons*10)/10,
    equivalentTreesPlanted,
    cashFlows,

    // Legacy fields
    subtotalCapExUSD_legacy: subtotalCapExUSD,
    contingencyUSD_legacy: contingencyUSD,
    epcMarginUSD_legacy: epcMarginUSD,
    totalCapExUSD_legacy: totalCapExUSD,
  };
}
