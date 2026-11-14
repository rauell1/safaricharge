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
  FinancialYearRow, HourlyIllustrativeRow, EngineeringChecks,
} from './types';
import {
  selectCable, selectBatteryCable, computeDerating, checkDeratedAmpacity,
  checkPvStringVoltageWindow, checkInverterBatteryMatch, buildEqualStringLayout,
  genericMpptMaxVoltage,
} from './cableSizing';
import {
  suggestTariffCategory, computeTOUTariff, computeFinancing, buildCashFlows,
  computeNPV, computeIRR, computeSimplePayback, computeDiscountedPayback,
  computeMIRR, computeROI, computeProfitabilityIndex, computeSIR,
  computeLifetimeNetSavings, computeDSCR, computeROE, computeEquityPaybackYears,
} from './financialEngine';
import { runMicroinverterSizing } from './microinverterCalculator';
import {
  computeSolarHourProfile,
  runAnnualSeasonalDispatch,
} from './dispatchEngine';
import {
  ENGINE_VERSION,
  INCIDENCE_ANGLE_LOSS_FRAC,
  LOCATION_SOLAR_OVERRIDES,
  MARKET_SOLAR_RESOURCE,
  solarProvenance,
  solarResourceForCountry,
} from '@/lib/solar-resource';
import { BATTERY_ROUND_TRIP_EFFICIENCY, INVERTER_MAX_EFFICIENCY } from '@/lib/config';

export type { SimulationInputs, SimulationResults, BOMLineItem, CableSizingResult, CapExItem, FinancialYearRow };

function expectedWastedFrac(
  kwp: number,
  hourlyPerKwpByMonth: number[][],
  loadKwByHour: number[],
  batteryUsableKwh: number,
  batteryChargeKw: number,
  rte: number
): number {
  let generated = 0;
  let wasted = 0;
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const nightKwh = loadKwByHour.reduce((sum, v, h) => (h < 6 || h >= 18 ? sum + v : sum), 0);
  hourlyPerKwpByMonth.forEach((profile, m) => {
    let surplus = 0;
    let chargeable = 0;
    let dayGen = 0;
    for (let h = 0; h < 24; h++) {
      const solar = kwp * (profile[h] ?? 0);
      dayGen += solar;
      const hourSurplus = Math.max(0, solar - (loadKwByHour[h] ?? 0));
      surplus += hourSurplus;
      chargeable += Math.min(hourSurplus, batteryChargeKw);
    }
    const absorbs = Math.min(
      Math.min(chargeable, surplus),
      batteryUsableKwh / Math.sqrt(Math.max(0.5, rte)),
      nightKwh / Math.max(0.5, rte)
    );
    generated += days[m] * dayGen;
    wasted += days[m] * Math.max(0, surplus - absorbs);
  });
  return generated > 0 ? wasted / generated : 0;
}

function buildPvEnergyBasis(
  inputs: SimulationInputs,
  loadKwByHour: number[],
  batteryUsableKwh: number,
  batteryChargeKw: number,
  monthlyPeakSunHours: number[],
  monthlyAmbientTempC: number[]
): NonNullable<SimulationResults['pvEnergyBasis']> {
  const goal = inputs.pvSizingGoal ?? 'dc_ac_ratio';
  const rte = BATTERY_ROUND_TRIP_EFFICIENCY;
  const totalDayLoad = loadKwByHour.reduce((s, v) => s + v, 0);
  const daytimeLoad = loadKwByHour.reduce((s, v, h) => (h >= 6 && h < 18 ? s + v : s), 0);
  const nightLoad = Math.max(0, totalDayLoad - daytimeLoad);
  const annualYield = Math.max(
    1,
    inputs.specificYieldKWhPerKWpDay ||
      monthlyPeakSunHours.reduce((a, b) => a + b, 0) / Math.max(1, monthlyPeakSunHours.length)
  );
  // Real PV yield per kWp averages ~80% of PSH after temp/soiling/IAM/inverter losses
  const effectiveAcYieldPerKwp = annualYield * 0.82;

  if (goal === 'dc_ac_ratio') {
    const ratioTarget = Math.max(0.5, inputs.dcAcOversizeRatio || 1.2) * (inputs.inverterQty || 1) * 5;
    return {
      goal,
      targetKwp: Math.round(ratioTarget * 10) / 10,
      dailyKwhToSupply: Math.round(totalDayLoad * 10) / 10,
      wastedFrac: 0,
      basis: 'Sized from inverter AC rating multiplied by target DC/AC oversize ratio.',
    };
  }

  const shifted = inputs.exportAllowed ? nightLoad : Math.min(nightLoad, batteryUsableKwh);
  const dailyNeed = daytimeLoad + shifted / rte;
  let targetKwp = dailyNeed / effectiveAcYieldPerKwp;

  if (goal === 'least_waste' && !inputs.exportAllowed) {
    const limit = inputs.maxWastedFrac ?? 0.1;
    const perKwpByMonth = monthlyPeakSunHours.map((psh, m) =>
      computeSolarHourProfile({
        pvDcKwp: 1,
        inverterAcKw: 1_000,
        inverterEfficiencyFrac: INVERTER_MAX_EFFICIENCY,
        peakSunHours: psh,
        ambientTempC: monthlyAmbientTempC[m] ?? 21.5,
        incidenceAngleLossFrac: INCIDENCE_ANGLE_LOSS_FRAC,
      }).map((x) => x.acKw)
    );
    const wasteAt = (kwp: number) =>
      expectedWastedFrac(kwp, perKwpByMonth, loadKwByHour, batteryUsableKwh, batteryChargeKw, rte);
    if (wasteAt(targetKwp) > limit) {
      let lo = 0;
      let hi = targetKwp;
      for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2;
        if (wasteAt(mid) > limit) hi = mid;
        else lo = mid;
      }
      targetKwp = lo;
    }
    const finalWaste = wasteAt(targetKwp);
    return {
      goal,
      targetKwp: Math.round(targetKwp * 100) / 100,
      dailyKwhToSupply: Math.round(targetKwp * effectiveAcYieldPerKwp * (1 - finalWaste) * 10) / 10,
      wastedFrac: Math.round(finalWaste * 1000) / 1000,
      basis: `Least-waste array keeps expected curtailed solar ≤ ${Math.round(limit * 100)}% (${Math.round(finalWaste * 100)}% projected).`,
    };
  }

  return {
    goal,
    targetKwp: Math.round(targetKwp * 100) / 100,
    dailyKwhToSupply: Math.round(dailyNeed * 10) / 10,
    wastedFrac: 0,
    basis: inputs.exportAllowed
      ? 'Daily-energy sizing covering full daytime and evening demand with export enabled.'
      : 'Daily-energy sizing covering daytime load plus usable battery shift capacity.',
  };
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

  const panel = catalog.panels.find((p) => p.id === panelId) ?? catalog.panels[0];
  const inverter = catalog.inverters.find((i) => i.id === inverterId) ?? catalog.inverters[0];
  const battery = catalog.batteries.find((b) => b.id === batteryId) ?? catalog.batteries[0];

  // ── Section A/B/D: Monthly Solar Resource & Battery Sizing First (used by daily-energy/least-waste PV) ──
  const locOverride = LOCATION_SOLAR_OVERRIDES[location.id];
  const countrySolar = solarResourceForCountry(location.country || 'Kenya');
  const monthlyIrradiance =
    location.monthlyIrradiance?.length === 12
      ? location.monthlyIrradiance
      : (locOverride?.monthlyIrradiance ?? countrySolar.monthlyPeakSunHours);
  const monthlyTemps =
    locOverride?.monthlyAmbientTempC ?? countrySolar.monthlyAmbientTempC;

  const totalInverterACkW = (inverterQty * inverter.ratedAcW) / 1000;
  const isGridTied = inverter.category === 'grid_tied';
  const isHV = (inverter.voltageClass || '').includes('HV');
  const isLV = (inverter.voltageClass || '').includes('LV');

  const targetBatteryKWh = inputs.targetBatteryKWh || totalInverterACkW;
  let actualBatteryKWh = 0, towersRequired = 0, modulesPerTower = 0, bduRequired = 0, towerVoltage = 0;
  let lv48ModulesRequired = 0, actualModules = 0;
  let batteryVoltageWarning: string | null = null;
  let lv48ParallelCheck: string | null = null;

  const moduleKwh = battery.moduleKwh || battery.usableKwh || 5.12;
  const vc = inverter.voltageClass || '';
  const minV = isHV ? (vc.includes('150') ? 150 : 160) : 40;
  const maxV = isHV ? (vc.includes('800') ? 800 : vc.includes('850') ? 850 : 700) : 60;

  if (!isGridTied) {
    if (isHV) {
      const modulesRequired = Math.ceil(targetBatteryKWh / moduleKwh);
      towersRequired = modulesRequired === 0 ? 1 : Math.ceil(modulesRequired / 15);
      modulesPerTower = Math.ceil(modulesRequired / towersRequired);
      actualModules = modulesPerTower * towersRequired;
      actualBatteryKWh = actualModules * moduleKwh;
      bduRequired = towersRequired;
      towerVoltage = modulesPerTower * 51.2;
    } else if (isLV) {
      lv48ModulesRequired = Math.ceil(targetBatteryKWh / 5.12);
      actualModules = lv48ModulesRequired;
      actualBatteryKWh = lv48ModulesRequired * 5.12;
      modulesPerTower = lv48ModulesRequired;
      if (lv48ModulesRequired > 40) {
        lv48ParallelCheck = `OVER LIMIT (${lv48ModulesRequired} modules) - split across multiple inverter/battery banks (max 40 parallel)`;
      }
    }
  }

  const inverterBatteryMatch = isGridTied
    ? {
        ok: true,
        status: 'unassessed' as const,
        nominalV: 0,
        emptyV: 0,
        fullV: 0,
        inverterMinV: null,
        inverterMaxV: null,
        message: 'Grid-tied inverter without battery storage.',
      }
    : checkInverterBatteryMatch({
        isHv: isHV,
        modulesPerBank: Math.max(1, modulesPerTower),
        moduleVoltageV: isHV ? 51.2 : 48,
        inverterMinV: minV,
        inverterMaxV: maxV,
      });

  if (!inverterBatteryMatch.ok && !isGridTied) {
    batteryVoltageWarning = inverterBatteryMatch.message;
  }

  // Cost-ranked battery comparison across compatible catalog batteries
  const essentialLoadKw = inputs.essentialLoadKw ?? 0;
  const loadKwByHour = loadProfile.baseHourlyLoadKW.map((v) => v * loadMultiplier);
  const batteryComparison = isGridTied
    ? []
    : catalog.batteries
        .filter((cand) =>
          isHV ? cand.voltageClass?.includes('HV') : !cand.voltageClass?.includes('HV')
        )
        .map((cand) => {
          const candModKwh = cand.moduleKwh || cand.usableKwh || 5.12;
          const modsNeeded = Math.max(1, Math.ceil(targetBatteryKWh / candModKwh));
          const banks = isHV ? Math.ceil(modsNeeded / 15) : 1;
          const perBank = Math.ceil(modsNeeded / banks);
          const totalMods = banks * perBank;
          const match = checkInverterBatteryMatch({
            isHv: isHV,
            modulesPerBank: perBank,
            moduleVoltageV: isHV ? 51.2 : 48,
            inverterMinV: minV,
            inverterMaxV: maxV,
          });
          const maxDischargeKw = Math.min(totalInverterACkW, totalMods * candModKwh * 0.5);
          const powerSufficient = essentialLoadKw <= 0 || maxDischargeKw + 0.01 >= essentialLoadKw;
          const estimatedCapexKSh = Math.round(totalMods * (cand.pricePerModuleKsh || 0));
          const isPlaceholder = /placeholder|indicative|tbd/i.test(cand.productLine || cand.id);
          return {
            id: cand.id,
            name: cand.productLine,
            brand: cand.id.split('-')[0]?.toUpperCase() ?? 'BESS',
            architecture: (isHV ? 'HV' : 'LV') as 'HV' | 'LV',
            modules: totalMods,
            banks,
            nameplateKwh: Math.round(totalMods * candModKwh * 10) / 10,
            usableKwh: Math.round(totalMods * candModKwh * 0.9 * 10) / 10,
            estimatedCapexKSh,
            powerSufficient,
            voltageCompatible: match.ok,
            isPlaceholder,
            selected: cand.id === battery.id,
          };
        })
        .sort((a, b) => {
          if (a.voltageCompatible !== b.voltageCompatible) return a.voltageCompatible ? -1 : 1;
          if (a.isPlaceholder !== b.isPlaceholder) return a.isPlaceholder ? 1 : -1;
          if (a.powerSufficient !== b.powerSufficient) return a.powerSufficient ? -1 : 1;
          return a.estimatedCapexKSh - b.estimatedCapexKSh;
        });

  // ── PV Array Sizing (Daily Energy / Least Waste / Legacy DC/AC Ratio) ──
  const usableBatForPv = Math.max(0, actualBatteryKWh * 0.9);
  const pvEnergyBasis = buildPvEnergyBasis(
    inputs,
    loadKwByHour,
    usableBatForPv,
    Math.min(totalInverterACkW, actualBatteryKWh * 0.5),
    monthlyIrradiance,
    monthlyTemps
  );
  const goalTargetKwp =
    inputs.pvSizingGoal && inputs.pvSizingGoal !== 'dc_ac_ratio'
      ? pvEnergyBasis.targetKwp
      : totalInverterACkW * dcAcOversizeRatio;

  const mpptChannels = Math.max(1, (inverter.mpptCount ?? 2) * inverterQty);
  const maxMpptV = genericMpptMaxVoltage(inverter.voltageClass);
  const vocCold = (panel.vmp || 45.79) / 0.85 * (1 + 0.0029 * (25 - minDesignAmbientTempC));
  const maxPanelsPerStringByVoc = Math.max(1, Math.floor(maxMpptV / vocCold));
  const rawPanelCount = panelQty || Math.max(1, Math.round((goalTargetKwp * 1000) / panel.wattage));
  const stringLayoutSummary = buildEqualStringLayout({
    targetPanelCount: rawPanelCount,
    preferredPanelsPerString: Math.min(panelsPerString, maxPanelsPerStringByVoc),
    mpptChannels,
    maxStringsPerMppt: 2,
    minPanelsPerString: 1,
    maxPanelsPerString: maxPanelsPerStringByVoc,
  });

  const actualPanelQty = panelQty || stringLayoutSummary.usedPanelCount;
  const effectivePanelsPerString = panelQty ? panelsPerString : stringLayoutSummary.panelsPerString;
  const solarCapacityKWp = (actualPanelQty * panel.wattage) / 1000;
  const actualDcAcRatio = totalInverterACkW > 0 ? solarCapacityKWp / totalInverterACkW : 0;

  const maxAllowedPVkWp = (inverter.maxPvInputKwp || 0) * inverterQty;
  const pvOversizeWarning: string | null =
    maxAllowedPVkWp > 0 && solarCapacityKWp > maxAllowedPVkWp
      ? `PV array (${solarCapacityKWp.toFixed(1)} kWp) exceeds inverter max PV input (${maxAllowedPVkWp.toFixed(1)} kWp for ${inverterQty} unit${inverterQty > 1 ? 's' : ''}). Reduce panel count or adjust DC/AC ratio.`
      : null;

  const panelAreaRequiredM2 = Math.round(actualPanelQty * 2.3 * 10) / 10;

  // ── Section H: PV String Voltage Window Check ─────────────────────────
  const voltageWindowCheck = checkPvStringVoltageWindow(
    panel.vmp || 45.79, effectivePanelsPerString, minDesignAmbientTempC, inverter.voltageClass,
  );

  // ── Cable Sizing Sections B-E ──────────────────────────────────────────
  const stringRunLength = 25, dcMainRunLength = 8, acRunLength = 20, battRunLength = 3;
  const stringCurrent = (panel.isc || 14) * 1.25;
  const stringVoltage = (panel.vmp || 45.79) * effectivePanelsPerString;
  const pvStringCable = selectCable(catalog.cableReference, stringCurrent, stringVoltage, stringRunLength, 1.0, false);
  const numStrings = panelQty ? Math.max(1, Math.ceil(actualPanelQty / effectivePanelsPerString)) : stringLayoutSummary.stringCount;

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
    inverterBatteryMatch,
    stringLayoutSummary: panelQty ? undefined : stringLayoutSummary,
    pvEnergyBasis,
    batteryComparison,
    monthlyIrradiance,
    monthlyAmbientTempC: monthlyTemps,
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
  inverterBatteryMatch?: EngineeringChecks['inverterBatteryMatch'];
  stringLayoutSummary?: EngineeringChecks['stringLayoutSummary'];
  pvEnergyBasis?: SimulationResults['pvEnergyBasis'];
  batteryComparison?: SimulationResults['batteryComparison'];
  monthlyIrradiance?: number[];
  monthlyAmbientTempC?: number[];
}

function finalizeResults(inputs: SimulationInputs, _catalog: SizingCatalog, p: FinalizeParams): SimulationResults {
  const { contingencyPercent, epcMarginPercent } = inputs;

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

  // ── KPLC Time-of-Use tariff (Oct 2026 defaults + proper VAT base) ──────
  let blendedTariffKShPerKWh = inputs.gridTariffKShPerKWh;
  let peakTariffKSh = inputs.gridTariffKShPerKWh;
  let offPeakTariffKSh = inputs.gridTariffKShPerKWh;
  let touTariff: SimulationResults['touTariff'] = null;
  if (inputs.useTOUTariff) {
    const category = suggestTariffCategory(inputs.kplcCustomerSegment, inputs.monthlyConsumptionKWh);
    const tou = computeTOUTariff({
      category, tariffStructure: category.supportsTOU ? inputs.tariffStructure : 'Standard',
      variableSurchargeAdderKSh: 4.58, ercLevyKSh: 0.08, repLevyPercent: 5, vatPercent: 16, peakHoursFraction: 0.8,
    });
    blendedTariffKShPerKWh = tou.blendedTariffKShPerKWh;
    peakTariffKSh = tou.effectivePeakTariffKShPerKWh;
    offPeakTariffKSh = tou.effectiveOffPeakTariffKShPerKWh ?? tou.effectivePeakTariffKShPerKWh;
    touTariff = { category: category.label, ...tou };
  }

  // ── Seasonal 12-Month Conservation-Checked Dispatch Engine ─────────────
  const locOverride = LOCATION_SOLAR_OVERRIDES[p.location.id];
  const countrySolar = solarResourceForCountry(p.location.country || 'Kenya');
  const monthlyIrr =
    p.monthlyIrradiance ??
    (p.location.monthlyIrradiance?.length === 12
      ? p.location.monthlyIrradiance
      : (locOverride?.monthlyIrradiance ?? countrySolar.monthlyPeakSunHours));
  const monthlyTemp =
    p.monthlyAmbientTempC ??
    locOverride?.monthlyAmbientTempC ??
    MARKET_SOLAR_RESOURCE.KE.monthlyAmbientTempC;

  const loadKwByHour = p.loadProfile.baseHourlyLoadKW.map((v) => v * p.loadMultiplier);
  const tariffUsdByHour = Array.from({ length: 24 }, (_, h) => {
    const isPeak = (h >= 6 && h < 10) || (h >= 18 && h < 22);
    const rateKSh = inputs.useTOUTariff ? (isPeak ? peakTariffKSh : offPeakTariffKSh) : blendedTariffKShPerKWh;
    return rateKSh / KSH_PER_USD;
  });

  const powerFactor = Math.max(0.5, Math.min(1, inputs.powerFactor ?? 0.9));
  const demandChargeUsdPerKw =
    ((inputs.demandChargeKShPerKVA ?? 0) / powerFactor) / KSH_PER_USD;
  const exportAllowed = inputs.exportAllowed ?? true;
  const exportTariffUsdPerKwh = (inputs.exportTariffKShPerKWh ?? 0) / KSH_PER_USD;
  const batteryUsableKwh = Math.max(0, p.batteryCapacityKWh * 0.9);
  const annualDispatch = runAnnualSeasonalDispatch(
    {
      pvDcKwp: p.solarCapacityKWp,
      inverterAcKw: Math.max(0.1, p.inverterCapacityKW),
      inverterEfficiencyFrac: INVERTER_MAX_EFFICIENCY,
      incidenceAngleLossFrac: INCIDENCE_ANGLE_LOSS_FRAC,
      loadKwByHour,
      tariffUsdByHour,
      batteryUsableKwh,
      batteryMaxChargeKw: batteryUsableKwh * 0.5,
      batteryMaxDischargeKw: Math.min(p.inverterCapacityKW, batteryUsableKwh * 0.8),
      batteryRoundTripEffFrac: BATTERY_ROUND_TRIP_EFFICIENCY,
      batteryReserveFrac: 0.1,
      gridAvailable: true,
      exportAllowed,
      exportLimitKw: inputs.exportLimitKw,
      exportTariffUsdPerKwh,
      outageHours: inputs.outageHours,
      outageEssentialLoadKw: inputs.essentialLoadKw,
      demandChargeUsdPerKw,
      socMode: 'periodic',
    },
    monthlyIrr,
    monthlyTemp
  );

  const annualPVGeneratedKWh = Math.round(annualDispatch.annualSolarAcKwh);
  const selfConsumedKWh = Math.round(annualDispatch.annualSolarAcKwh * annualDispatch.selfConsumptionFrac);
  const exportedOrCurtailedKWh = Math.max(0, annualPVGeneratedKWh - selfConsumedKWh);
  const annualUsefulSolarKWh = Math.round(annualDispatch.annualUsefulSolarKwh);
  const effectiveSelfConsumptionPct =
    annualPVGeneratedKWh > 0
      ? Math.round((selfConsumedKWh / annualPVGeneratedKWh) * 1000) / 10
      : inputs.selfConsumptionRatioPercent;

  // ── Financing (Section B) ──────────────────────────────────────────────
  const financingCalc = computeFinancing(totalCapExUSD, {
    debtFractionPercent: inputs.debtFractionPercent,
    loanInterestRatePercent: inputs.loanInterestRatePercent,
    loanTermYears: inputs.loanTermYears,
  });

  const annualOMCostUSDYear1 = (totalCapExUSD * inputs.annualOMCostPercent) / 100;
  const storageSectionKSh = p.bom
    .filter((i) => i.section === '2. Energy Storage')
    .reduce((s, i) => s + i.totalKSh, 0);
  const batteryReplacementCostUSD = (storageSectionKSh / KSH_PER_USD) * (inputs.batteryReplacementCostPercent / 100);

  const cashFlowRows = buildCashFlows({
    totalCapExUSD, equityUSD: financingCalc.equityUSD,
    annualPVGeneratedKWhYear1: annualPVGeneratedKWh, selfConsumptionRatioPercent: effectiveSelfConsumptionPct,
    blendedTariffKShPerKWh, kshPerUsd: KSH_PER_USD,
    tariffEscalationPercent: inputs.tariffEscalationPercent, panelDegradationPercent: inputs.panelDegradationPercent,
    annualOMCostUSDYear1, omEscalationPercent: inputs.omEscalationPercent,
    batteryReplacementYear: inputs.batteryReplacementYear, batteryReplacementCostUSD,
    projectLifeYears: inputs.projectLifeYears,
    annualDebtServiceUSD: financingCalc.annualDebtServiceUSD, loanTermYears: inputs.loanTermYears,
    taxShieldEnabled: inputs.taxShieldEnabled,
    corporateTaxRatePercent: inputs.corporateTaxRatePercent,
    investmentDeductionPercent: inputs.investmentDeductionPercent,
  });

  // Add demand-charge savings + export revenue to Year 1..N cash flows
  const extraAnnualRevenueUsd =
    annualDispatch.annualDemandChargeSavingUsd + annualDispatch.annualExportRevenueUsd;
  if (extraAnnualRevenueUsd > 0) {
    let cum = -totalCapExUSD;
    let cumLev = -financingCalc.equityUSD;
    for (const row of cashFlowRows) {
      if (row.year === 0) continue;
      row.grossSavingsUSD = Math.round(row.grossSavingsUSD + extraAnnualRevenueUsd);
      row.netCashFlow = Math.round(row.grossSavingsUSD - row.omUSD - row.batteryReplacementUSD);
      cum += row.netCashFlow;
      row.cumulativeCashFlow = Math.round(cum);
      row.leveredNetCashFlow = Math.round(row.netCashFlow - row.debtServiceUSD);
      cumLev += row.leveredNetCashFlow;
      row.cumulativeLeveredCashFlow = Math.round(cumLev);
    }
  }

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

  // Useful-energy LCOE (excludes curtailed & uncredited exports per StimaPulse V2 audit)
  const usefulFraction = annualPVGeneratedKWh > 0 ? annualUsefulSolarKWh / annualPVGeneratedKWh : 1;
  let discountedOpex = 0, discountedUsefulGen = 0;
  for (let y = 1; y <= inputs.projectLifeYears; y++) {
    const df = Math.pow(1 + inputs.discountRate / 100, y);
    const cf = cashFlowRows.find((c) => c.year === y);
    if (!cf) continue;
    discountedOpex += (cf.omUSD + cf.batteryReplacementUSD) / df;
    discountedUsefulGen += (cf.energyGeneratedKWh * usefulFraction) / df;
  }
  const lcoeUSDPerKWh = discountedUsefulGen > 0 ? Math.round(((totalCapExUSD + discountedOpex) / discountedUsefulGen) * 1000) / 1000 : 0;
  const lcoeBaselineUSDPerKWh = Math.round((blendedTariffKShPerKWh / KSH_PER_USD) * 1000) / 1000;

  const annualCO2SavedTons = Math.round(((annualUsefulSolarKWh * p.location.co2Intensity) / 1000) * 10) / 10;
  const equivalentTreesPlanted = Math.round((annualCO2SavedTons * 1000) / 22);

  // Representative average-year hourly profile (from June / middle month periodic dispatch)
  const repMonth = annualDispatch.months[5] ?? annualDispatch.months[0];
  const hourlyProfile: HourlyIllustrativeRow[] = repMonth.summary.hours.map((step, idx, arr) => {
    const prevSoc = idx === 0 ? repMonth.summary.openingSocFrac * 100 : arr[idx - 1].socFrac * 100;
    return {
      hour: step.hour,
      loadKW: Math.round(step.loadKw * 100) / 100,
      solarKW: Math.round(step.solarAcKw * 100) / 100,
      gridAvailable: !(inputs.outageHours ?? []).includes(step.hour),
      batterySoCBefore: Math.round(prevSoc * 10) / 10,
      batterySoCAfter: Math.round(step.socFrac * 1000) / 10,
      batteryChargeKW: step.batteryKw > 0 ? Math.round(step.batteryKw * 100) / 100 : 0,
      batteryDischargeKW: step.batteryKw < 0 ? Math.round(-step.batteryKw * 100) / 100 : 0,
      gridImportKW: Math.round(step.gridImportKw * 100) / 100,
      gridExportKW: Math.round(step.gridExportKw * 100) / 100,
      dieselGenKW: 0,
      unservedLoadKW: Math.round(step.unservedKw * 100) / 100,
    };
  });

  const annualLoadKWh = Math.round(annualDispatch.annualLoadKwh);
  const annualGridImportKWh = Math.round(annualDispatch.annualGridImportKwh);
  const annualGridExportKWh = Math.round(annualDispatch.annualGridExportKwh);
  const systemAutonomyPercent = Math.round(annualDispatch.autonomyFrac * 1000) / 10;

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
      inverterBatteryMatch: p.inverterBatteryMatch,
      stringLayoutSummary: p.stringLayoutSummary,
    },
    pvOversizeWarning: p.pvOversizeWarning, batteryVoltageWarning: p.batteryVoltageWarning,

    hourlyProfile,
    annualPVGeneratedKWh, selfConsumedKWh, exportedOrCurtailedKWh,
    annualLoadKWh, annualGridImportKWh, annualGridExportKWh,
    annualDieselGenKWh: 0, annualDieselFuelLiters: 0, annualUnservedLoadKWh: Math.round(annualDispatch.annualUnservedKwh),
    solarSelfConsumptionPercent: effectiveSelfConsumptionPct,
    systemAutonomyPercent,

    bomLineItems: p.bom, cableSizingResults: p.cableSizingResults,

    capexItems, subtotalCapExKSh, subtotalCapExUSD, contingencyKSh, contingencyUSD,
    epcMarginKSh, epcMarginUSD, vatKSh, vatUSD, totalCapExKSh, totalCapExUSD,

    annualGridBillWithoutSolarUSD: Math.round(annualDispatch.annualBillWithoutSolarUsd),
    annualDieselCostWithoutSolarUSD: 0,
    baselineAnnualCostUSD: Math.round(annualDispatch.annualBillWithoutSolarUsd),
    annualGridBillWithSolarUSD: Math.round(annualDispatch.annualBillWithSolarUsd),
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

    engineVersion: ENGINE_VERSION,
    solarProvenance: solarProvenance(inputs.solarSource ?? 'SafariCharge-solar-v2 (PVGIS 5.3)'),
    pvEnergyBasis: p.pvEnergyBasis,
    annualClippedKWh: Math.round(annualDispatch.annualClippedKwh),
    annualCurtailedKWh: Math.round(annualDispatch.annualCurtailedKwh),
    annualUsefulSolarKWh,
    demandChargeSavingsUSD: Math.round(annualDispatch.annualDemandChargeSavingUsd),
    exportRevenueUSD: Math.round(annualDispatch.annualExportRevenueUsd),
    worstConservationResidualKWh: annualDispatch.worstConservationResidualKwh,
    monthlyDispatchSummary: annualDispatch.months.map((m) => ({
      monthIndex: m.monthIndex,
      monthName: m.monthName,
      days: m.days,
      peakSunHours: m.peakSunHours,
      ambientTempC: m.ambientTempC,
      solarKwhMonth: Math.round(m.solarKwhMonth),
      curtailedKwhMonth: Math.round(m.curtailedKwhMonth),
      clippedKwhMonth: Math.round(m.clippedKwhMonth),
      gridImportKwhMonth: Math.round(m.gridImportKwhMonth),
      gridExportKwhMonth: Math.round(m.gridExportKwhMonth),
      loadKwhMonth: Math.round(m.loadKwhMonth),
      hourly: m.summary.hours.map((h) => ({
        hour: h.hour,
        solarAcKw: Math.round(h.solarAcKw * 100) / 100,
        loadKw: Math.round(h.loadKw * 100) / 100,
        gridImportKw: Math.round(h.gridImportKw * 100) / 100,
        gridExportKw: Math.round(h.gridExportKw * 100) / 100,
        curtailedKw: Math.round(h.curtailedKw * 100) / 100,
        socFrac: Math.round(h.socFrac * 1000) / 1000,
      })),
    })),
    batteryComparison: p.batteryComparison,
  };
}

