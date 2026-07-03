// SafariCharge Ltd - Production Sizing & Quoting Engine
// Translates formulas from "solar_sizing_calculator_Final.xlsx" (June 2026):
//   Sizing Calculator (A-F) -> Quotation & BOM -> Cable Sizing -> Financial Analysis
// Catalog/pricing data is Supabase-backed (sizing_* tables) - see catalogTypes.ts
// and useSizingCatalog.ts. This module is pure: it accepts the catalog as a
// parameter rather than importing hardware data directly.

import { KSH_PER_USD } from './mockData';
import type { SizingCatalog } from './catalogTypes';
import type {
  SimulationInputs, SimulationResults, BOMLineItem, CableSizingResult, CapExItem,
  FinancialYearRow, HourlyIllustrativeRow,
} from './types';
import {
  selectCable, selectBatteryCable, computeDerating, checkDeratedAmpacity,
  checkPvStringVoltageWindow,
} from './cableSizing';
import {
  suggestTariffCategory, computeTOUTariff, computeFinancing, buildCashFlows,
  computeNPV, computeIRR, computeSimplePayback, computeDiscountedPayback,
  computeMIRR, computeROI, computeProfitabilityIndex, computeSIR,
  computeLifetimeNetSavings, computeDSCR, computeROE, computeEquityPaybackYears,
} from './financialEngine';
import { runMicroinverterSizing } from './microinverterCalculator';

export type { SimulationInputs, SimulationResults, BOMLineItem, CableSizingResult, CapExItem, FinancialYearRow };

function getHourlySolarRatio(hour: number): number {
  if (hour < 6 || hour > 18) return 0;
  return Math.sin((Math.PI * (hour - 6)) / 12);
}

// Illustrative-only hourly shape for the SimulationResults chart. Scaled so its
// daily sum matches the Excel-derived annual PV/load figures; it is NOT a
// source of the financial numbers (the workbook has no hourly dispatch model).
function buildIllustrativeHourlyProfile(
  solarCapacityKWp: number, annualPVGeneratedKWh: number,
  loadProfile: SimulationInputs['loadProfile'], loadMultiplier: number,
  batteryCapacityKWh: number,
): HourlyIllustrativeRow[] {
  const dailyPVTarget = annualPVGeneratedKWh / 365;
  const rawShape = Array.from({ length: 24 }, (_, h) => getHourlySolarRatio(h) * solarCapacityKWp);
  const rawDailySum = rawShape.reduce((s, v) => s + v, 0);
  const scale = rawDailySum > 0 ? dailyPVTarget / rawDailySum : 0;

  let soc = 50;
  const batMaxChargeRate = batteryCapacityKWh * 0.5;
  const batMaxDischargeRate = batteryCapacityKWh * 0.8;
  const minSoC = 10;

  return Array.from({ length: 24 }, (_, hour) => {
    const loadKW = loadProfile.baseHourlyLoadKW[hour] * loadMultiplier;
    const solarKW = rawShape[hour] * scale;
    const netLoadKW = loadKW - solarKW;
    const socBefore = soc;
    let batCharge = 0, batDischarge = 0, gridImport = 0, gridExport = 0;

    if (netLoadKW < 0) {
      const surplus = Math.abs(netLoadKW);
      if (soc < 100 && batteryCapacityKWh > 0) {
        const maxChargePossible = ((100 - soc) / 100) * batteryCapacityKWh;
        batCharge = Math.min(surplus, batMaxChargeRate, maxChargePossible);
        soc += (batCharge / batteryCapacityKWh) * 100;
        gridExport = surplus - batCharge;
      } else {
        gridExport = surplus;
      }
    } else {
      let deficit = netLoadKW;
      if (soc > minSoC && batteryCapacityKWh > 0) {
        const availKWh = ((soc - minSoC) / 100) * batteryCapacityKWh;
        batDischarge = Math.min(deficit, batMaxDischargeRate, availKWh);
        soc -= (batDischarge / batteryCapacityKWh) * 100;
        deficit -= batDischarge;
      }
      if (deficit > 0) gridImport = deficit;
    }

    return {
      hour, loadKW: Math.round(loadKW * 100) / 100, solarKW: Math.round(solarKW * 100) / 100,
      gridAvailable: true,
      batterySoCBefore: Math.round(socBefore * 10) / 10, batterySoCAfter: Math.round(soc * 10) / 10,
      batteryChargeKW: Math.round(batCharge * 100) / 100, batteryDischargeKW: Math.round(batDischarge * 100) / 100,
      gridImportKW: Math.round(gridImport * 100) / 100, gridExportKW: Math.round(gridExport * 100) / 100,
      dieselGenKW: 0, unservedLoadKW: 0,
    };
  });
}

export function runSimulation(inputs: SimulationInputs, catalog: SizingCatalog): SimulationResults {
  if (inputs.systemArchitecture === 'microinverter') {
    return runMicroinverterPath(inputs, catalog);
  }
  return runCentralInverterPath(inputs, catalog);
}

// ─── CENTRAL INVERTER PATH (Sizing Calculator Sections A-E) ────────────────

function runCentralInverterPath(inputs: SimulationInputs, catalog: SizingCatalog): SimulationResults {
  const {
    location, loadProfile, loadMultiplier,
    panelId, panelQty, inverterId, inverterQty, batteryId,
    dcAcOversizeRatio, panelsPerString,
    contingencyPercent, epcMarginPercent,
    installationMethod, ambientTempC, minDesignAmbientTempC,
    includeGeneratorInterface, includeWeatherproofEnclosure,
    includeKPLCapplication, includeOandM,
  } = inputs;

  const panel = catalog.panels.find((p) => p.id === panelId) || catalog.panels[0];
  const inverter = catalog.inverters.find((i) => i.id === inverterId && i.category !== 'microinverter')
    || catalog.inverters.find((i) => i.category === 'hybrid')!;
  const battery = catalog.batteries.find((b) => b.id === batteryId) || catalog.batteries[0];

  // ── Section A/B: Inverter + PV Array Sizing ───────────────────────────
  const totalInverterACkW = (inverterQty * inverter.ratedAcW) / 1000;
  const targetPVkWp = totalInverterACkW * dcAcOversizeRatio;
  // Excel C33 uses ROUND (nearest panel), not CEILING.
  const actualPanelQty = panelQty || Math.max(1, Math.round((targetPVkWp * 1000) / panel.wattage));
  const solarCapacityKWp = (actualPanelQty * panel.wattage) / 1000;
  const actualDcAcRatio = totalInverterACkW > 0 ? solarCapacityKWp / totalInverterACkW : 0;

  const maxAllowedPVkWp = (inverter.maxPvInputKwp || 0) * inverterQty;
  const pvOversizeWarning: string | null =
    maxAllowedPVkWp > 0 && solarCapacityKWp > maxAllowedPVkWp
      ? `PV array (${solarCapacityKWp.toFixed(1)} kWp) exceeds inverter max PV input (${maxAllowedPVkWp.toFixed(1)} kWp for ${inverterQty} unit${inverterQty > 1 ? 's' : ''}). Reduce panel count or adjust DC/AC ratio.`
      : null;

  // ── Section D: Battery Sizing ──────────────────────────────────────────
  const isGridTied = inverter.category === 'grid_tied';
  const isHV = (inverter.voltageClass || '').includes('HV');
  const isLV = (inverter.voltageClass || '').includes('LV');

  const targetBatteryKWh = inputs.targetBatteryKWh || totalInverterACkW;
  let actualBatteryKWh = 0, towersRequired = 0, modulesPerTower = 0, bduRequired = 0, towerVoltage = 0;
  let lv48ModulesRequired = 0, actualModules = 0;
  let batteryVoltageWarning: string | null = null;
  let lv48ParallelCheck: string | null = null;

  const moduleKwh = battery.moduleKwh || battery.usableKwh || 5.12;

  if (!isGridTied) {
    if (isHV) {
      const modulesRequired = Math.ceil(targetBatteryKWh / moduleKwh);
      towersRequired = modulesRequired === 0 ? 1 : Math.ceil(modulesRequired / 15);
      modulesPerTower = Math.ceil(modulesRequired / towersRequired);
      actualModules = modulesPerTower * towersRequired;
      actualBatteryKWh = actualModules * moduleKwh;
      bduRequired = towersRequired;
      towerVoltage = modulesPerTower * 51.2;

      const vc = inverter.voltageClass || '';
      const minV = vc.includes('150') ? 150 : 160;
      const maxV = vc.includes('800') ? 800 : vc.includes('850') ? 850 : 700;
      if (towerVoltage < minV || towerVoltage > maxV) {
        batteryVoltageWarning = `Tower voltage (${towerVoltage.toFixed(0)} V) is outside inverter battery voltage window (${minV}-${maxV} V). Adjust modules per tower.`;
      }
    } else if (isLV) {
      lv48ModulesRequired = Math.ceil(targetBatteryKWh / 5.12);
      actualModules = lv48ModulesRequired;
      actualBatteryKWh = lv48ModulesRequired * 5.12;
      if (lv48ModulesRequired > 40) {
        lv48ParallelCheck = `OVER LIMIT (${lv48ModulesRequired} modules) - split across multiple inverter/battery banks (max 40 parallel)`;
      }
    }
  }

  const panelAreaRequiredM2 = Math.round(actualPanelQty * 2.3 * 10) / 10;

  // ── Section H: PV String Voltage Window Check ─────────────────────────
  const voltageWindowCheck = checkPvStringVoltageWindow(
    panel.vmp || 45.79, panelsPerString, minDesignAmbientTempC, inverter.voltageClass,
  );

  // ── Cable Sizing Sections B-E ──────────────────────────────────────────
  const stringRunLength = 25, dcMainRunLength = 8, acRunLength = 20, battRunLength = 3;
  const stringCurrent = (panel.isc || 14) * 1.25;
  const stringVoltage = (panel.vmp || 45.79) * panelsPerString;
  const pvStringCable = selectCable(catalog.cableReference, stringCurrent, stringVoltage, stringRunLength, 1.0, false);
  const numStrings = Math.max(1, Math.ceil(actualPanelQty / panelsPerString));

  const dcMainCurrent = solarCapacityKWp > 0 ? ((solarCapacityKWp * 1000) / stringVoltage) * 1.25 : 0;
  const dcMainCable = selectCable(catalog.cableReference, dcMainCurrent, stringVoltage, dcMainRunLength, 1.0, false);

  const acVoltage = inverter.phase === '3P' ? 400 : 230;
  const acDesignCurrent = totalInverterACkW > 0
    ? (totalInverterACkW * 1000) / (acVoltage * (inverter.phase === '3P' ? Math.sqrt(3) : 1) * 0.95)
    : 0;
  const acCable = selectCable(catalog.cableReference, acDesignCurrent, acVoltage, acRunLength, 2.5, true);

  const battDesignCurrent = inverter.maxChargeDischargeA || 100;
  const battVoltage = isHV ? towerVoltage : 48;
  const battCable = battVoltage > 0
    ? selectBatteryCable(catalog.cableReference, battDesignCurrent, battVoltage, battRunLength, 1.0)
    : { sizeMM2: 0, parallelRuns: 1, pricePerM: 0 };

  const cableSizingResults: CableSizingResult[] = [
    { circuit: 'PV String (panel to combiner)', designCurrentA: Math.round(stringCurrent * 100) / 100, recommendedSizeMM2: pvStringCable.sizeMM2, parallelRuns: pvStringCable.parallelRuns, pricePerM: pvStringCable.pricePerM, totalLengthM: numStrings * stringRunLength * 2, totalCostKSh: Math.round(numStrings * stringRunLength * 2 * pvStringCable.pricePerM) },
    { circuit: 'DC Main (combiner to inverter)', designCurrentA: Math.round(dcMainCurrent * 100) / 100, recommendedSizeMM2: dcMainCable.sizeMM2, parallelRuns: dcMainCable.parallelRuns, pricePerM: dcMainCable.pricePerM, totalLengthM: inverterQty * dcMainRunLength * 2 * dcMainCable.parallelRuns, totalCostKSh: Math.round(inverterQty * dcMainRunLength * 2 * dcMainCable.parallelRuns * dcMainCable.pricePerM) },
    { circuit: 'AC Output (inverter to DB)', designCurrentA: Math.round(acDesignCurrent * 100) / 100, recommendedSizeMM2: acCable.sizeMM2, parallelRuns: acCable.parallelRuns, pricePerM: acCable.pricePerM, totalLengthM: inverterQty * acRunLength * acCable.parallelRuns, totalCostKSh: Math.round(inverterQty * acRunLength * acCable.parallelRuns * acCable.pricePerM) },
    { circuit: 'Battery Interconnect', designCurrentA: battDesignCurrent, recommendedSizeMM2: battCable.sizeMM2, parallelRuns: battCable.parallelRuns, pricePerM: battCable.pricePerM, totalLengthM: towersRequired * battRunLength * 2 * battCable.parallelRuns, totalCostKSh: Math.round(towersRequired * battRunLength * 2 * battCable.parallelRuns * battCable.pricePerM) },
  ];

  // ── Section G: Derating Checks ─────────────────────────────────────────
  const derating = computeDerating(installationMethod, ambientTempC);
  const deratingChecks = [
    checkDeratedAmpacity(catalog.cableReference, 'PV String', pvStringCable.sizeMM2, stringCurrent, derating),
    checkDeratedAmpacity(catalog.cableReference, 'DC Main', dcMainCable.sizeMM2, dcMainCurrent, derating),
    checkDeratedAmpacity(catalog.cableReference, 'AC Output', acCable.sizeMM2, acDesignCurrent, derating),
    checkDeratedAmpacity(catalog.cableReference, 'Battery Interconnect', battCable.sizeMM2, battDesignCurrent, derating),
  ];

  // ── SECTION-BY-SECTION BOM (Quotation & BOM Sections 1-10) ────────────
  const bom: BOMLineItem[] = [];
  const push = (section: string, itemNumber: string, description: string, unit: string, qty: number, unitPriceKSh: number, notes: string) => {
    const totalKSh = Math.round(qty * unitPriceKSh);
    bom.push({ section, itemNumber, description, unit, qty, unitPriceKSh, unitPriceUSD: Math.round(unitPriceKSh / KSH_PER_USD), totalKSh, totalUSD: Math.round(totalKSh / KSH_PER_USD), notes });
  };

  push('1. Solar PV Modules', '1', `${panel.model}`, 'pcs', actualPanelQty, panel.priceKsh, 'Wattage and price auto-selected from Panel Database');

  if (!isGridTied) {
    push('2. Energy Storage', '2', `${battery.productLine}`, 'pcs', actualModules, battery.pricePerModuleKsh, isHV ? `HV, ${towersRequired} tower(s)` : 'LV48 parallel modules');
    if (isHV && bduRequired > 0) {
      push('2. Energy Storage', '3', 'Dyness BDU (Battery Distribution Unit)', 'pcs', bduRequired, 95000, '1 per battery tower');
    }
    const cabinet = catalog.cabinetSizes.filter((c) => c.slots >= (isLV ? lv48ModulesRequired : actualModules)).sort((a, b) => a.slots - b.slots)[0]
      ?? catalog.cabinetSizes[catalog.cabinetSizes.length - 1];
    const rackQty = isHV ? towersRequired : 1;
    const rackUnitPrice = isLV ? (cabinet?.priceKsh ?? 45000) : 45000;
    push('2. Energy Storage', '4', 'Battery rack / enclosure / base stand', 'set', rackQty, rackUnitPrice, isLV ? `Suntree cabinet (${lv48ModulesRequired} slots)` : 'HV tower stand');
    push('2. Energy Storage', '5', `Battery interconnect cable, ${battCable.sizeMM2}mm² (engineered IEC 60364-5-52)`, 'm', towersRequired * battRunLength * 2 * battCable.parallelRuns, battCable.pricePerM, 'Cable Sizing sheet Section E');
    push('2. Energy Storage', '5.5', 'Battery main fuse (per tower)', 'pcs', Math.max(towersRequired, 1), 5397, 'Suntree 250A battery fuse (confirmed)');
    push('2. Energy Storage', '5.7', 'Battery connector, per pair', 'pair', Math.max(towersRequired, 1), 3480, 'Suntree confirmed price');
  }

  push('3. Inverter & Monitoring', '6', `${inverter.brand} ${inverter.model}`, 'pcs', inverterQty, inverter.priceKsh, `${inverter.voltageClass ?? inverter.category}, ${inverter.phase ?? ''}`);
  push('3. Inverter & Monitoring', '7', 'Wi-Fi/LAN monitoring dongle and cloud configuration', 'pcs', inverterQty, 18000, 'Remote monitoring, firmware updates');

  push('4. Mounting Structure', '8', 'Aluminium ground/roof-mount racking system', 'kWp', Math.round(solarCapacityKWp * 10) / 10, 14000, 'Rate per kWp DC - see BOS Rates');

  push('5. DC Side BOS', '9', `Solar DC string cable, ${pvStringCable.sizeMM2}mm² (engineered IEC 60364-5-52)`, 'm', numStrings * stringRunLength * 2, pvStringCable.pricePerM, 'Cable Sizing sheet Section B');
  push('5. DC Side BOS', '10', 'MC4 connectors, branch/Y-connectors and crimping', 'kWp', Math.round(solarCapacityKWp * 10) / 10, 250, 'Rate per kWp DC');
  push('5. DC Side BOS', '11', 'PV DC combiner box with DC MCBs and string fusing', 'pcs', inverterQty, 75000, '1 per inverter unit');
  push('5. DC Side BOS', '12', 'DC Surge Protection Device (SPD), Type II', 'pcs', inverterQty, 18000, '1 per inverter unit');
  push('5. DC Side BOS', '13', `DC main cable (combiner to inverter), ${dcMainCable.sizeMM2}mm² (engineered IEC 60364-5-52)`, 'm', inverterQty * dcMainRunLength * 2 * dcMainCable.parallelRuns, dcMainCable.pricePerM, 'Cable Sizing sheet Section C');
  push('5. DC Side BOS', '13.5', 'DC Isolator switch (PV array or battery-side disconnect)', 'pcs', inverterQty, 4080, 'Suntree 4P 32A 1000VDC isolator');

  push('6. AC Side BOS', '14', `AC output cable (inverter to DB), ${acCable.sizeMM2}mm² (engineered IEC 60364-5-52)`, 'm', inverterQty * acRunLength * acCable.parallelRuns, acCable.pricePerM, 'Cable Sizing sheet Section D');
  push('6. AC Side BOS', '15', 'Automatic Transfer Switch (ATS) / changeover switch', 'lot', 1, 145000, '1 per system');
  push('6. AC Side BOS', '16', '3-Phase MCCBs (main inverter output, grid-tie, load breakers)', 'set', inverterQty, 75000, '1 set per inverter unit');
  push('6. AC Side BOS', '17', 'AC Surge Protection Device (SPD), Type II, distribution board', 'lot', 1, 22000, '1 per system');

  push('7. Earthing & Cable Mgmt', '18', 'Earthing system - earth rods, earth bars, copper tape bonding', 'lot', 1, 65000, 'Base lot per Kenyan electrical code');
  push('7. Earthing & Cable Mgmt', '19', 'Cable trays, trunking, conduits and ducting', 'lot', 1, 60000, 'Base lot; scales with site layout');

  // Excel Section G (C90): ONE Yes/No switch prices or zeroes the whole of
  // BOM Section 8 (gen interface + weatherproof enclosure + fire safety).
  if (includeGeneratorInterface) {
    push('8. Generator Interface', '20', 'Generator AVS/auto-start interface to inverter generator port', 'set', 1, 75000, 'Optional - delete if not required');
    push('8. Generator Interface', '21', 'Outdoor weatherproof enclosure (inverter + battery tower), IP55/NEMA 3R', 'set', 1, 180000, 'Optional - omit if installed in existing plant room');
    push('8. Generator Interface', '22', 'Fire safety provision (extinguisher, signage)', 'set', 1, 15000, 'Supplementary to battery built-in fire suppression');
  }

  // Install labor per Excel BOM item 27: flat 10% of the Sections 1-8 equipment
  // + BOS subtotal (excludes transport and Section 10 aftercare items).
  const equipmentSubtotalKSh = bom.reduce((s, i) => s + i.totalKSh, 0);
  push('9. Installation', '23', 'Transport and delivery of equipment to site (Nairobi)', 'lot', 1, 45000, 'Base lot; larger systems may need multiple trips');
  push('9. Installation', '24', 'Installation labor, electrical works, system wiring, mechanical assembly & commissioning', 'lot', 1, Math.round(equipmentSubtotalKSh * 0.10), 'Industry-standard commercial installation rate (10% of equipment + BOS subtotal)');

  if (includeKPLCapplication) {
    push('10. Grid & Aftercare', '25', 'KPLC net-metering/interconnection application support', 'lot', 1, 50000, 'Applicable only if grid export is intended');
  }
  // Excel BOM item 29: EPM meter auto-defaults to 1 unit ONLY when a Grid-Tied
  // inverter is selected (qty 0 for hybrid systems even with KPLC support).
  if (isGridTied) {
    push('10. Grid & Aftercare', '25.5', 'EPM Meter (export/import metering, 3-phase with CTs)', 'pcs', 1, 26680, 'Acrel 3-phase EPM meter with CTs (Megawatt confirmed)');
  }
  if (includeOandM) {
    push('10. Grid & Aftercare', '26', 'First-year Operations & Maintenance (quarterly visits)', 'year', 1, 120000, 'Optional; renewable annually');
  }

  return finalizeResults(inputs, catalog, {
    systemArchitecture: 'central_inverter',
    solarCapacityKWp, batteryCapacityKWh: actualBatteryKWh, inverterCapacityKW: totalInverterACkW,
    panelAreaRequiredM2, actualDcAcRatio,
    pvOversizeWarning, batteryVoltageWarning: batteryVoltageWarning ?? lv48ParallelCheck,
    voltageWindowCheck, deratingChecks,
    bom, cableSizingResults,
    loadProfile, loadMultiplier, location,
  });
}

// ─── MICROINVERTER PATH (Sizing Calculator Section F) ──────────────────────

function runMicroinverterPath(inputs: SimulationInputs, catalog: SizingCatalog): SimulationResults {
  const micro = runMicroinverterSizing(inputs, catalog);
  const voltageWindowCheck = { ok: true, message: 'N/A - microinverter systems have no DC string voltage window', vocTempCorrectionFactor: 1, coldestCaseStringVocV: 0, mpptMaxVoltageV: 0 };

  return finalizeResults(inputs, catalog, {
    systemArchitecture: 'microinverter',
    solarCapacityKWp: micro.totalPVArrayKWp, batteryCapacityKWh: 0, inverterCapacityKW: micro.actualACOutputKW,
    panelAreaRequiredM2: Math.round(micro.panelsRequired * 2.3 * 10) / 10, actualDcAcRatio: 1,
    pvOversizeWarning: micro.compatibilityCheck.ok ? null : micro.compatibilityCheck.message,
    batteryVoltageWarning: null,
    voltageWindowCheck, deratingChecks: [],
    bom: micro.bomLineItems, cableSizingResults: micro.cableSizingResults,
    loadProfile: inputs.loadProfile, loadMultiplier: inputs.loadMultiplier, location: inputs.location,
  });
}

// ─── SHARED FINALIZATION: CapEx totals, financial engine, results shape ────

interface FinalizeParams {
  systemArchitecture: 'central_inverter' | 'microinverter';
  solarCapacityKWp: number;
  batteryCapacityKWh: number;
  inverterCapacityKW: number;
  panelAreaRequiredM2: number;
  actualDcAcRatio: number;
  pvOversizeWarning: string | null;
  batteryVoltageWarning: string | null;
  voltageWindowCheck: { ok: boolean; message: string };
  deratingChecks: Array<{ circuit: string; baseAmpacityA: number; deratedAmpacityA: number; designCurrentA: number; ok: boolean }>;
  bom: BOMLineItem[];
  cableSizingResults: CableSizingResult[];
  loadProfile: SimulationInputs['loadProfile'];
  loadMultiplier: number;
  location: SimulationInputs['location'];
}

function finalizeResults(inputs: SimulationInputs, catalog: SizingCatalog, p: FinalizeParams): SimulationResults {
  const { contingencyPercent, epcMarginPercent } = inputs;

  // Per Excel Quotation & BOM: SUBTOTAL -> VAT @ 16% -> GRAND TOTAL (incl. VAT).
  // Contingency and EPC margin are app-side optional adders (default 0 to match
  // the Excel, whose retail prices already embed seller margin); VAT applies on
  // top of everything, mirroring the Excel's F68 = 16% x F67 line.
  const subtotalCapExKSh = p.bom.reduce((s, i) => s + i.totalKSh, 0);
  const subtotalCapExUSD = Math.round(subtotalCapExKSh / KSH_PER_USD);
  const contingencyKSh = Math.round(subtotalCapExKSh * contingencyPercent / 100);
  const contingencyUSD = Math.round(contingencyKSh / KSH_PER_USD);
  const epcMarginKSh = Math.round((subtotalCapExKSh + contingencyKSh) * epcMarginPercent / 100);
  const epcMarginUSD = Math.round(epcMarginKSh / KSH_PER_USD);
  const vatKSh = Math.round((subtotalCapExKSh + contingencyKSh + epcMarginKSh) * 0.16);
  const vatUSD = Math.round(vatKSh / KSH_PER_USD);
  const totalCapExKSh = subtotalCapExKSh + contingencyKSh + epcMarginKSh + vatKSh;
  const totalCapExUSD = Math.round(totalCapExKSh / KSH_PER_USD);

  const capexItems: CapExItem[] = p.bom.slice(0, 12).map((item) => ({
    name: item.description, category: item.section, qty: item.qty,
    unitCost: item.unitPriceUSD, totalCost: item.totalUSD, brand: '', model: '',
  }));

  // ── Financial Analysis Section A: annualized generation model ─────────
  const annualPVGeneratedKWh = Math.round(p.solarCapacityKWp * inputs.specificYieldKWhPerKWpDay * 365);
  const selfConsumedKWh = Math.round(annualPVGeneratedKWh * (inputs.selfConsumptionRatioPercent / 100));
  const exportedOrCurtailedKWh = annualPVGeneratedKWh - selfConsumedKWh;

  // ── KPLC Time-of-Use tariff (Section B2) ───────────────────────────────
  let blendedTariffKShPerKWh = inputs.gridTariffKShPerKWh;
  let touTariff: SimulationResults['touTariff'] = null;
  if (inputs.useTOUTariff) {
    const category = suggestTariffCategory(inputs.kplcCustomerSegment, inputs.monthlyConsumptionKWh);
    const tou = computeTOUTariff({
      category, tariffStructure: category.supportsTOU ? inputs.tariffStructure : 'Standard',
      variableSurchargeAdderKSh: 4.41, ercLevyKSh: 0.08, repLevyPercent: 5, vatPercent: 16, peakHoursFraction: 0.8,
    });
    blendedTariffKShPerKWh = tou.blendedTariffKShPerKWh;
    touTariff = { category: category.label, ...tou };
  }

  // ── Financing (Section B) ──────────────────────────────────────────────
  const financingCalc = computeFinancing(totalCapExUSD, {
    debtFractionPercent: inputs.debtFractionPercent,
    loanInterestRatePercent: inputs.loanInterestRatePercent,
    loanTermYears: inputs.loanTermYears,
  });

  const annualOMCostUSDYear1 = (totalCapExUSD * inputs.annualOMCostPercent) / 100;
  // Excel Financial C17: replacement default = 60% of the full Energy Storage
  // section subtotal (modules + BDU + rack + cable + fuse + connector).
  const storageSectionKSh = p.bom
    .filter((i) => i.section === '2. Energy Storage')
    .reduce((s, i) => s + i.totalKSh, 0);
  const batteryReplacementCostUSD = (storageSectionKSh / KSH_PER_USD) * (inputs.batteryReplacementCostPercent / 100);

  const cashFlowRows = buildCashFlows({
    totalCapExUSD, equityUSD: financingCalc.equityUSD,
    annualPVGeneratedKWhYear1: annualPVGeneratedKWh, selfConsumptionRatioPercent: inputs.selfConsumptionRatioPercent,
    blendedTariffKShPerKWh, kshPerUsd: KSH_PER_USD,
    tariffEscalationPercent: inputs.tariffEscalationPercent, panelDegradationPercent: inputs.panelDegradationPercent,
    annualOMCostUSDYear1, omEscalationPercent: inputs.omEscalationPercent,
    batteryReplacementYear: inputs.batteryReplacementYear, batteryReplacementCostUSD,
    projectLifeYears: inputs.projectLifeYears,
    annualDebtServiceUSD: financingCalc.annualDebtServiceUSD, loanTermYears: inputs.loanTermYears,
  });

  const npvUSD = computeNPV(cashFlowRows, inputs.discountRate);
  const irrPercent = computeIRR(cashFlowRows);
  const year1 = cashFlowRows.find((c) => c.year === 1);
  const annualSavingsUSD = year1 ? year1.netCashFlow : 0;
  const simplePaybackYears = computeSimplePayback(cashFlowRows);
  const discountedPaybackYears = computeDiscountedPayback(cashFlowRows, inputs.discountRate);
  const mirrPercent = computeMIRR(cashFlowRows.map((c) => c.netCashFlow), inputs.discountRate, inputs.loanInterestRatePercent || inputs.discountRate);
  const roiPercent = computeROI(cashFlowRows, totalCapExUSD);
  const profitabilityIndex = computeProfitabilityIndex(npvUSD, totalCapExUSD);
  const sir = computeSIR(cashFlowRows.map((c) => c.grossSavingsUSD), cashFlowRows.map((c) => (c.year === 0 ? totalCapExUSD : c.omUSD + c.batteryReplacementUSD)), inputs.discountRate);
  const lifetimeNetSavingsUSD = computeLifetimeNetSavings(cashFlowRows);

  const dscr = computeDSCR(annualSavingsUSD, financingCalc.annualDebtServiceUSD, inputs.loanTermYears);
  const roePercent = computeROE(annualSavingsUSD, financingCalc.annualDebtServiceUSD, financingCalc.equityUSD);
  const equityPaybackYears = computeEquityPaybackYears(annualSavingsUSD, financingCalc.annualDebtServiceUSD, financingCalc.equityUSD, inputs.projectLifeYears);

  // LCOE: total lifecycle cost / total discounted energy produced (not just self-consumed)
  let discountedOpex = 0, discountedGen = 0;
  for (let y = 1; y <= inputs.projectLifeYears; y++) {
    const df = Math.pow(1 + inputs.discountRate / 100, y);
    const cf = cashFlowRows.find((c) => c.year === y);
    if (!cf) continue;
    discountedOpex += (cf.omUSD + cf.batteryReplacementUSD) / df;
    discountedGen += cf.energyGeneratedKWh / df;
  }
  const lcoeUSDPerKWh = discountedGen > 0 ? Math.round(((totalCapExUSD + discountedOpex) / discountedGen) * 1000) / 1000 : 0;
  const lcoeBaselineUSDPerKWh = Math.round((blendedTariffKShPerKWh / KSH_PER_USD) * 1000) / 1000;

  const annualCO2SavedTons = Math.round(((annualPVGeneratedKWh * p.location.co2Intensity) / 1000) * 10) / 10;
  const equivalentTreesPlanted = Math.round((annualCO2SavedTons * 1000) / 22);

  const hourlyProfile = buildIllustrativeHourlyProfile(p.solarCapacityKWp, annualPVGeneratedKWh, p.loadProfile, p.loadMultiplier, p.batteryCapacityKWh);
  const dailyLoadKWh = p.loadProfile.totalDailyKWh * p.loadMultiplier;
  const annualLoadKWh = Math.round(dailyLoadKWh * 365);
  const annualGridImportKWh = Math.max(0, annualLoadKWh - selfConsumedKWh);
  const annualGridExportKWh = exportedOrCurtailedKWh;
  const systemAutonomyPercent = annualLoadKWh > 0 ? Math.round((selfConsumedKWh / annualLoadKWh) * 1000) / 10 : 0;

  const cashFlows: FinancialYearRow[] = cashFlowRows.map((cf) => ({
    year: cf.year, energyGeneratedKWh: cf.energyGeneratedKWh, effectiveTariffKShPerKWh: cf.effectiveTariffKShPerKWh,
    grossSavingsUSD: cf.grossSavingsUSD, omUSD: cf.omUSD, batteryReplacementUSD: cf.batteryReplacementUSD,
    netCashFlow: cf.netCashFlow, cumulativeCashFlow: cf.cumulativeCashFlow,
    debtServiceUSD: cf.debtServiceUSD, leveredNetCashFlow: cf.leveredNetCashFlow, cumulativeLeveredCashFlow: cf.cumulativeLeveredCashFlow,
    cashFlowWithoutSolar: cf.year === 0 ? 0 : -Math.round(cf.grossSavingsUSD),
    cashFlowWithSolar: cf.year === 0 ? -totalCapExUSD : -(cf.omUSD + cf.batteryReplacementUSD),
  }));

  return {
    inputs, systemArchitecture: p.systemArchitecture,
    solarCapacityKWp: Math.round(p.solarCapacityKWp * 10) / 10,
    batteryCapacityKWh: Math.round(p.batteryCapacityKWh * 10) / 10,
    inverterCapacityKW: Math.round(p.inverterCapacityKW * 10) / 10,
    panelAreaRequiredM2: p.panelAreaRequiredM2,
    actualDcAcRatio: Math.round(p.actualDcAcRatio * 100) / 100,

    engineeringChecks: {
      pvOversizeWarning: p.pvOversizeWarning, batteryVoltageWarning: p.batteryVoltageWarning,
      pvStringVoltageWindowMessage: p.voltageWindowCheck.message, pvStringVoltageWindowOk: p.voltageWindowCheck.ok,
      deratingChecks: p.deratingChecks,
    },
    pvOversizeWarning: p.pvOversizeWarning, batteryVoltageWarning: p.batteryVoltageWarning,

    hourlyProfile,
    annualPVGeneratedKWh, selfConsumedKWh, exportedOrCurtailedKWh,
    annualLoadKWh, annualGridImportKWh, annualGridExportKWh,
    annualDieselGenKWh: 0, annualDieselFuelLiters: 0, annualUnservedLoadKWh: 0,
    solarSelfConsumptionPercent: inputs.selfConsumptionRatioPercent,
    systemAutonomyPercent,

    bomLineItems: p.bom, cableSizingResults: p.cableSizingResults,

    capexItems, subtotalCapExKSh, subtotalCapExUSD, contingencyKSh, contingencyUSD,
    epcMarginKSh, epcMarginUSD, vatKSh, vatUSD, totalCapExKSh, totalCapExUSD,

    annualGridBillWithoutSolarUSD: Math.round((annualLoadKWh * blendedTariffKShPerKWh) / KSH_PER_USD),
    annualDieselCostWithoutSolarUSD: 0,
    baselineAnnualCostUSD: Math.round((annualLoadKWh * blendedTariffKShPerKWh) / KSH_PER_USD),
    annualGridBillWithSolarUSD: Math.round((annualGridImportKWh * blendedTariffKShPerKWh) / KSH_PER_USD),
    annualDieselCostWithSolarUSD: 0,
    annualMaintenanceUSD: Math.round(annualOMCostUSDYear1),
    annualInsuranceUSD: Math.round(totalCapExUSD * 0.004),
    annualBatteryReserveUSD: Math.round(batteryReplacementCostUSD / Math.max(1, inputs.batteryReplacementYear)),
    totalAnnualOpExUSD: Math.round(annualOMCostUSDYear1 + totalCapExUSD * 0.004),

    touTariff,
    financing: {
      loanAmountUSD: financingCalc.loanAmountUSD, equityUSD: financingCalc.equityUSD,
      annualDebtServiceUSD: financingCalc.annualDebtServiceUSD, dscr, roePercent, equityPaybackYears,
    },
    extraMetrics: { discountedPaybackYears, mirrPercent, roiPercent, profitabilityIndex, savingsToInvestmentRatio: sir, lifetimeNetSavingsUSD },

    annualSavingsUSD: Math.round(annualSavingsUSD),
    simplePaybackYears, lcoeUSDPerKWh, lcoeBaselineUSDPerKWh, npvUSD, irrPercent,

    annualCO2SavedTons, equivalentTreesPlanted,
    cashFlows,

    subtotalCapExUSD_legacy: subtotalCapExUSD, contingencyUSD_legacy: contingencyUSD,
    epcMarginUSD_legacy: epcMarginUSD, totalCapExUSD_legacy: totalCapExUSD,
  };
}

