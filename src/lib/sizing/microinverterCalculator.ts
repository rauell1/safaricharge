// Sizing Calculator Section F + Quotation & BOM Section 11 + Cable Sizing Section I.
// Fully separate, self-contained sizing path for Deye SUN-M60/80/100G4-EU-Q0
// AC-coupled microinverter systems (2 panels/unit, no central inverter, no battery).
// Mutually exclusive with the central-inverter (hybrid/grid-tied/off-grid) path.

import type { SizingCatalog } from './catalogTypes';
import type { SimulationInputs, BOMLineItem, CableSizingResult } from './types';
import { KSH_PER_USD } from './mockData';

export interface MicroinverterSizingResult {
  microinverterModel: string;
  panelModel: string;
  panelWattage: number;
  acOutputPerUnitW: number;
  panelsPerUnit: number;
  maxUnitsPerBranch: number;
  unitPriceKSh: number;
  unitsRequired: number;
  panelsRequired: number;
  totalPVArrayKWp: number;
  actualACOutputKW: number;
  branchCircuitsRequired: number;
  compatibilityCheck: { ok: boolean; message: string };

  bomLineItems: BOMLineItem[];
  cableSizingResults: CableSizingResult[];

  subtotalCapExKSh: number;
  totalMicroinverterCostKSh: number;
  totalPanelCostKSh: number;
}

function panelWattageCompatibility(panelWattage: number, model: string): { ok: boolean; message: string } {
  const limits: Record<string, number> = {
    'SUN-M60G4-EU-Q0': 420,
    'SUN-M80G4-EU-Q0': 560,
    'SUN-M100G4-EU-Q0': 700,
  };
  const limit = limits[model];
  if (!limit) return { ok: false, message: 'Unrecognized microinverter model' };
  return panelWattage <= limit
    ? { ok: true, message: 'OK' }
    : { ok: false, message: `OVER WATTAGE LIMIT for ${model} (max ${limit}W/panel)` };
}

// Cable Sizing Section I: AC branch wiring, per Deye SUN-M60/80/100G4-EU-Q0
// installation manual (12AWG / 2.5mm2 TC-ER cable, fixed spec).
const MICRO_BRANCH_CABLE_SIZE_MM2 = 2.5;
const MICRO_BRANCH_MAX_RUN_LENGTH_M = 45;

export function runMicroinverterSizing(inputs: SimulationInputs, catalog: SizingCatalog): MicroinverterSizingResult {
  const panel = catalog.panels.find((p) => p.id === inputs.microPanelId) || catalog.panels[0];
  const inverter = catalog.inverters.find((i) => i.id === inputs.microInverterId && i.category === 'microinverter')
    || catalog.inverters.find((i) => i.category === 'microinverter')!;

  const acOutputPerUnitW = inverter.ratedAcW;
  const panelsPerUnit = inverter.panelsPerUnit ?? 2;
  const maxUnitsPerBranch = inverter.maxUnitsPerBranch ?? 6;
  const unitPriceKSh = inverter.priceKsh;

  const compatibilityCheck = panelWattageCompatibility(panel.wattage, inverter.model);

  const unitsRequired = Math.ceil((inputs.microTargetSystemKW * 1000) / acOutputPerUnitW);
  const panelsRequired = unitsRequired * panelsPerUnit;
  const totalPVArrayKWp = Math.round(((panelsRequired * panel.wattage) / 1000) * 100) / 100;
  const actualACOutputKW = Math.round(((unitsRequired * acOutputPerUnitW) / 1000) * 100) / 100;
  const branchCircuitsRequired = Math.ceil(unitsRequired / maxUnitsPerBranch);

  // ── Cable Sizing Section I ──────────────────────────────────────────────
  const branchCableSpec = catalog.cableReference.find((c) => c.sizeMm2 === MICRO_BRANCH_CABLE_SIZE_MM2);
  const branchCablePricePerM = branchCableSpec?.acPricePerM ?? 150;
  const totalBranchCableLengthM = branchCircuitsRequired * MICRO_BRANCH_MAX_RUN_LENGTH_M;
  const totalBranchCableCostKSh = Math.round(totalBranchCableLengthM * branchCablePricePerM);

  const cableSizingResults: CableSizingResult[] = [{
    circuit: 'Microinverter AC Branch (manufacturer fixed spec)',
    designCurrentA: Math.round((acOutputPerUnitW * maxUnitsPerBranch / 230) * 100) / 100,
    recommendedSizeMM2: MICRO_BRANCH_CABLE_SIZE_MM2,
    parallelRuns: 1,
    pricePerM: branchCablePricePerM,
    totalLengthM: totalBranchCableLengthM,
    totalCostKSh: totalBranchCableCostKSh,
  }];

  // ── BOM Section 11 ──────────────────────────────────────────────────────
  const bom: BOMLineItem[] = [];
  const push = (itemNumber: string, description: string, unit: string, qty: number, unitPriceKSh: number, notes: string) => {
    const totalKSh = Math.round(qty * unitPriceKSh);
    bom.push({
      section: '11. Microinverter System', itemNumber, description, unit, qty,
      unitPriceKSh, unitPriceUSD: Math.round(unitPriceKSh / KSH_PER_USD),
      totalKSh, totalUSD: Math.round(totalKSh / KSH_PER_USD), notes,
    });
  };

  push('31', `${panel.model}`, 'pcs', panelsRequired, panel.priceKsh, 'Wattage and price auto-selected from Panel Database based on Section F input');
  push('32', `${inverter.brand} ${inverter.model}`, 'pcs', unitsRequired, unitPriceKSh, '2 panels per unit - see Inverter Database, Deye Microinverters table');
  push('33', 'Mounting brackets / rails for microinverter (per unit)', 'pcs', unitsRequired, 6500, 'Roof-mount bracket kit per microinverter unit - regional benchmark, unconfirmed for Kenya');

  const mountingRate = 14000;
  push('34', 'Aluminium ground/roof-mount racking system', 'kWp', Math.round(totalPVArrayKWp * 10) / 10, mountingRate, 'Rate per kWp DC - same as Section 4');
  push('35', 'Microinverter AC branch cable (2.5mm² TC-ER, manufacturer fixed spec)', 'm', totalBranchCableLengthM, branchCablePricePerM, 'Cable Sizing sheet Section I');
  push('36', 'AC trunk cable (branch combiner to distribution board)', 'lot', 1, 35000, 'Base lot; scales with number of branch circuits - regional benchmark');
  push('37', 'Junction/combiner boxes for AC branch circuits', 'pcs', branchCircuitsRequired, 8500, '1 per branch circuit - regional benchmark, unconfirmed for Kenya');
  push('38', 'AC distribution board / changeover switch (ATS)', 'lot', 1, 145000, '1 per system - same rate as Section 6');
  push('39', 'AC Surge Protection Device (SPD), Type II, distribution board', 'lot', 1, 22000, '1 per system - same rate as Section 6');
  push('40', 'Earthing system - earth rods, earth bars, copper tape bonding', 'lot', 1, 65000, '1 per system - same rate as Section 7');
  push('41', 'Transport and delivery of equipment to site (Nairobi)', 'lot', 1, 45000, 'Base lot - same rate as Section 9');

  const equipmentSubtotalKSh = bom.reduce((s, i) => s + i.totalKSh, 0);
  const installLaborKSh = Math.round(equipmentSubtotalKSh * 0.10);
  push('42', 'Installation labor, electrical works, system wiring, mechanical assembly & commissioning', 'lot', 1, installLaborKSh, 'Industry-standard commercial rate (8-12%) - same basis as Section 9');

  const subtotalCapExKSh = bom.reduce((s, i) => s + i.totalKSh, 0);

  return {
    microinverterModel: inverter.model,
    panelModel: panel.model,
    panelWattage: panel.wattage,
    acOutputPerUnitW,
    panelsPerUnit,
    maxUnitsPerBranch,
    unitPriceKSh,
    unitsRequired,
    panelsRequired,
    totalPVArrayKWp,
    actualACOutputKW,
    branchCircuitsRequired,
    compatibilityCheck,
    bomLineItems: bom,
    cableSizingResults,
    subtotalCapExKSh,
    totalMicroinverterCostKSh: unitsRequired * unitPriceKSh,
    totalPanelCostKSh: panelsRequired * panel.priceKsh,
  };
}

