// Types for the Supabase-backed sizing catalog (sizing_* tables).
// Source of truth: solar_sizing_calculator_Final.xlsx (June 2026), migrated via
// the sizing_catalog_tables migration.

export type InverterCategory = 'hybrid' | 'grid_tied' | 'off_grid' | 'microinverter';

export interface CatalogInverter {
  id: string;
  category: InverterCategory;
  brand: string;
  model: string;
  ratedAcW: number;
  phase: '1P' | '3P' | null;
  voltageClass: string | null;
  maxPvInputKwp: number | null;
  mpptCount: number | null;
  maxChargeDischargeA: number | null;
  priceKsh: number;
  source: string | null;
  panelsPerUnit: number | null;
  maxUnitsPerBranch: number | null;
}

export interface CatalogPanel {
  id: string;
  wattage: number;
  model: string;
  cellType: string | null;
  priceKsh: number;
  vmp: number | null;
  isc: number | null;
  voc: number | null;
  imp: number | null;
  source: string | null;
}

export type BatteryCategory =
  | 'lv48' | 'hv_stack100' | 'hv_stack280' | 'tower'
  | 'accessory' | 'alt_brand' | 'all_in_one_kit' | 'other';

export interface CatalogBattery {
  id: string;
  productLine: string;
  category: BatteryCategory;
  usableKwh: number | null;
  voltageClass: string | null;
  moduleKwh: number | null;
  modulesRequired: number | null;
  pricePerModuleKsh: number;
  source: string | null;
  isReferenceOnly: boolean;
}

export interface CatalogBosRate {
  id: string;
  item: string;
  basis: string | null;
  rateKsh: number;
  minLotKsh: number | null;
  notes: string | null;
}

export interface CatalogBosComponent {
  id: string;
  category: string;
  item: string;
  unitPriceKsh: number;
  notes: string | null;
}

export interface CatalogBatteryCabinetSize {
  slots: number;
  priceKsh: number;
}

export interface CatalogCableSpec {
  sizeMm2: number;
  ampacityA: number;
  mvPerAm: number;
  dcPricePerM: number;
  acPricePerM: number;
}

export interface SizingCatalog {
  inverters: CatalogInverter[];
  panels: CatalogPanel[];
  batteries: CatalogBattery[];
  bosRates: CatalogBosRate[];
  bosComponents: CatalogBosComponent[];
  cabinetSizes: CatalogBatteryCabinetSize[];
  cableReference: CatalogCableSpec[];
}

// Raw DB row shape (snake_case) -> app shape (camelCase)
export function mapCatalogResponse(raw: {
  inverters: Record<string, unknown>[];
  panels: Record<string, unknown>[];
  batteries: Record<string, unknown>[];
  bosRates: Record<string, unknown>[];
  bosComponents: Record<string, unknown>[];
  cabinetSizes: Record<string, unknown>[];
  cableReference: Record<string, unknown>[];
}): SizingCatalog {
  return {
    inverters: raw.inverters.map((r) => ({
      id: r.id as string,
      category: r.category as InverterCategory,
      brand: r.brand as string,
      model: r.model as string,
      ratedAcW: r.rated_ac_w as number,
      phase: (r.phase as '1P' | '3P') ?? null,
      voltageClass: (r.voltage_class as string) ?? null,
      maxPvInputKwp: (r.max_pv_input_kwp as number) ?? null,
      mpptCount: (r.mppt_count as number) ?? null,
      maxChargeDischargeA: (r.max_charge_discharge_a as number) ?? null,
      priceKsh: r.price_ksh as number,
      source: (r.source as string) ?? null,
      panelsPerUnit: (r.panels_per_unit as number) ?? null,
      maxUnitsPerBranch: (r.max_units_per_branch as number) ?? null,
    })),
    panels: raw.panels.map((r) => ({
      id: r.id as string,
      wattage: r.wattage as number,
      model: r.model as string,
      cellType: (r.cell_type as string) ?? null,
      priceKsh: r.price_ksh as number,
      vmp: (r.vmp as number) ?? null,
      isc: (r.isc as number) ?? null,
      voc: (r.voc as number) ?? null,
      imp: (r.imp as number) ?? null,
      source: (r.source as string) ?? null,
    })),
    batteries: raw.batteries.map((r) => ({
      id: r.id as string,
      productLine: r.product_line as string,
      category: r.category as BatteryCategory,
      usableKwh: (r.usable_kwh as number) ?? null,
      voltageClass: (r.voltage_class as string) ?? null,
      moduleKwh: (r.module_kwh as number) ?? null,
      modulesRequired: (r.modules_required as number) ?? null,
      pricePerModuleKsh: r.price_per_module_ksh as number,
      source: (r.source as string) ?? null,
      isReferenceOnly: Boolean(r.is_reference_only),
    })),
    bosRates: raw.bosRates.map((r) => ({
      id: r.id as string,
      item: r.item as string,
      basis: (r.basis as string) ?? null,
      rateKsh: r.rate_ksh as number,
      minLotKsh: (r.min_lot_ksh as number) ?? null,
      notes: (r.notes as string) ?? null,
    })),
    bosComponents: raw.bosComponents.map((r) => ({
      id: r.id as string,
      category: r.category as string,
      item: r.item as string,
      unitPriceKsh: r.unit_price_ksh as number,
      notes: (r.notes as string) ?? null,
    })),
    cabinetSizes: raw.cabinetSizes.map((r) => ({
      slots: r.slots as number,
      priceKsh: r.price_ksh as number,
    })),
    cableReference: raw.cableReference.map((r) => ({
      sizeMm2: r.size_mm2 as number,
      ampacityA: r.ampacity_a as number,
      mvPerAm: r.mv_per_am as number,
      dcPricePerM: r.dc_price_per_m as number,
      acPricePerM: r.ac_price_per_m as number,
    })),
  };
}
