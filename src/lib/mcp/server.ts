/**
 * JSON-RPC 2.0 Model Context Protocol (MCP) server exposing SafariCharge
 * solar sizing, KPLC tariff lookup, catalog search, and borehole water pumping.
 */
import { z } from 'zod';
import { getCachedKplcSnapshot } from '@/lib/kplc-sync';
import { computeAllInRate, TARIFF_PROFILES } from '@/lib/tariff-config';
import {
  SOLAR_LOCATIONS,
  LOAD_PROFILES,
  INVERTER_CATALOG,
  BATTERY_CATALOG,
  HARDWARE_CATALOG,
  CABLE_REFERENCE,
} from '@/lib/sizing/mockData';
import type { SizingCatalog } from '@/lib/sizing/catalogTypes';
import { runSimulation } from '@/lib/sizing/solarCalculator';
import { sizeSolarWaterPumping } from '@/lib/sizing/waterPumpingSizing';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'lookup_kplc_tariffs',
    description: 'Return current KPLC tariff schedules, Oct 2026 pass-through surcharges, and all-in KES/kWh rates.',
    inputSchema: { type: 'object', properties: { classCode: { type: 'string' } } },
  },
  {
    name: 'search_catalog',
    description: 'Search inverters, batteries, and solar panels in the verified hardware catalog.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, kind: { type: 'string', enum: ['inverter', 'battery', 'panel', 'all'] } } },
  },
  {
    name: 'simulate_solar',
    description: 'Run SafariCharge 12-month seasonal PV + BESS dispatch and LCOE simulation for a site configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        locationId: { type: 'string' },
        dailyLoadKwh: { type: 'number' },
        dcAcOversizeRatio: { type: 'number' },
        targetBatteryKWh: { type: 'number' },
        pvSizingGoal: { type: 'string', enum: ['dc_ac_ratio', 'daily_energy', 'least_waste'] },
      },
    },
  },
  {
    name: 'size_water_pumping',
    description: 'Size a borehole / irrigation solar water pumping system with Hazen-Williams head loss and seasonal drawdown.',
    inputSchema: {
      type: 'object',
      required: ['dailyDemandM3', 'staticWaterLevelM'],
      properties: {
        dailyDemandM3: { type: 'number' },
        staticWaterLevelM: { type: 'number' },
        drawdownM: { type: 'number' },
        dischargeElevationM: { type: 'number' },
        seasonalWaterTableDropM: { type: 'number' },
      },
    },
  },
];

export function buildDefaultCatalog(): SizingCatalog {
  return {
    panels: HARDWARE_CATALOG.filter((h) => h.category === 'panel').map((h) => ({
      id: h.id,
      model: h.model,
      wattage: h.ratingWatts ?? 620,
      cellType: 'N-type TOPCon',
      vmp: 45.79,
      isc: 14.2,
      voc: 55.2,
      imp: 13.54,
      priceKsh: h.costKSh,
      source: h.source ?? null,
    })),
    inverters: INVERTER_CATALOG.map((i) => ({
      id: i.id,
      category: 'hybrid',
      brand: i.brand,
      model: i.model,
      ratedAcW: i.ratingWatts ?? 10000,
      phase: i.phase ?? '3P',
      voltageClass: i.voltageClass ?? null,
      maxPvInputKwp: i.maxPVInputKWp ?? null,
      mpptCount: i.mpptCount ?? 2,
      maxChargeDischargeA: i.maxChargeCurrent ?? null,
      priceKsh: i.costKSh,
      source: i.source ?? null,
      panelsPerUnit: null,
      maxUnitsPerBranch: null,
    })),
    batteries: BATTERY_CATALOG.map((b) => {
      const cap = b.capacityKWh ?? 5.12;
      return {
        id: b.id,
        productLine: `${b.brand} ${b.model}`,
        category: b.voltageClass?.includes('HV') ? 'hv_stack100' : 'lv48',
        usableKwh: cap * 0.9,
        voltageClass: b.voltageClass ?? 'LV (48V)',
        moduleKwh: cap,
        modulesRequired: null,
        pricePerModuleKsh: b.costKSh,
        source: b.source ?? null,
        isReferenceOnly: false,
      };
    }),
    bosRates: [],
    bosComponents: [],
    cabinetSizes: [
      { slots: 4, priceKsh: 45000 },
      { slots: 8, priceKsh: 65000 },
      { slots: 16, priceKsh: 95000 },
    ],
    cableReference: CABLE_REFERENCE.map((c) => ({
      sizeMm2: c.sizeMM2,
      ampacityA: c.ampacityA,
      mvPerAm: c.mVperAm,
      dcPricePerM: c.dcPricePerM,
      acPricePerM: c.acPricePerM,
    })),
  };
}

const waterPumpSchema = z.object({
  dailyDemandM3: z.number().positive(),
  staticWaterLevelM: z.number().min(0),
  drawdownM: z.number().min(0).optional(),
  dischargeElevationM: z.number().min(0).optional(),
  seasonalWaterTableDropM: z.number().min(0).optional(),
});

export async function handleMcpJsonRpc(body: unknown): Promise<{
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
}> {
  const req = body as { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
  const id = req?.id ?? null;
  if (!req || req.jsonrpc !== '2.0' || !req.method) {
    return { jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid JSON-RPC 2.0 request' } };
  }

  if (req.method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2025-03-26',
        serverInfo: { name: 'safaricharge-mcp', version: '2.3.0' },
        capabilities: { tools: {} },
      },
    };
  }

  if (req.method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } };
  }

  if (req.method === 'tools/call') {
    const toolName = String(req.params?.name ?? '');
    const args = (req.params?.arguments ?? {}) as Record<string, unknown>;

    if (toolName === 'lookup_kplc_tariffs') {
      const snapshot = getCachedKplcSnapshot();
      const classCode = typeof args.classCode === 'string' ? args.classCode.toUpperCase() : null;
      const rates = classCode ? snapshot.rates.filter((r) => r.code === classCode) : snapshot.rates;
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                surcharges: snapshot.surcharges,
                rates,
                evAllInPeakKes: Math.round(computeAllInRate(TARIFF_PROFILES.ev.energy.highRateBase, TARIFF_PROFILES.ev) * 100) / 100,
                evAllInOffPeakKes: Math.round(computeAllInRate(TARIFF_PROFILES.ev.energy.lowRateBase, TARIFF_PROFILES.ev) * 100) / 100,
              }),
            },
          ],
        },
      };
    }

    if (toolName === 'search_catalog') {
      const q = String(args.query ?? '').toLowerCase();
      const kind = String(args.kind ?? 'all');
      const items = [
        ...(kind === 'all' || kind === 'inverter'
          ? INVERTER_CATALOG.map((i) => ({ kind: 'inverter', id: i.id, name: i.model, acW: i.ratingWatts ?? 0, priceKsh: i.costKSh }))
          : []),
        ...(kind === 'all' || kind === 'battery'
          ? BATTERY_CATALOG.map((b) => ({ kind: 'battery', id: b.id, name: b.model, usableKwh: b.capacityKWh ?? 0, priceKsh: b.costKSh }))
          : []),
        ...(kind === 'all' || kind === 'panel'
          ? HARDWARE_CATALOG.filter((h) => h.category === 'panel').map((p) => ({ kind: 'panel', id: p.id, name: p.model, wattageW: p.ratingWatts ?? 0, priceKsh: p.costKSh }))
          : []),
      ].filter((x) => !q || `${x.id} ${x.name}`.toLowerCase().includes(q));
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(items.slice(0, 25)) }] } };
    }

    if (toolName === 'simulate_solar') {
      const catalog = buildDefaultCatalog();
      const location = SOLAR_LOCATIONS.find((l) => l.id === args.locationId) ?? SOLAR_LOCATIONS[0];
      const loadProfile = LOAD_PROFILES[0];
      const dailyLoadKwh = typeof args.dailyLoadKwh === 'number' && args.dailyLoadKwh > 0 ? args.dailyLoadKwh : loadProfile.totalDailyKWh;
      const loadMultiplier = dailyLoadKwh / Math.max(1, loadProfile.totalDailyKWh);
      const panel = catalog.panels[0];
      const inverter = catalog.inverters[0];
      const battery = catalog.batteries[0];
      const sim = runSimulation(
        {
          location,
          loadProfile,
          loadMultiplier,
          systemArchitecture: 'central_inverter',
          panelId: panel.id,
          panelQty: 0,
          inverterId: inverter.id,
          inverterQty: 1,
          batteryId: battery.id,
          batteryQty: 0,
          dcAcOversizeRatio: typeof args.dcAcOversizeRatio === 'number' ? args.dcAcOversizeRatio : 1.25,
          targetBatteryKWh: typeof args.targetBatteryKWh === 'number' ? args.targetBatteryKWh : 20,
          dynessProductLine: 'Stack100',
          panelsPerString: 7,
          microPanelId: panel.id,
          microInverterId: '',
          microTargetSystemKW: 5,
          installationMethod: 'clipped_direct',
          ambientTempC: 25,
          minDesignAmbientTempC: 10,
          contingencyPercent: 0,
          epcMarginPercent: 0,
          specificYieldKWhPerKWpDay: location.peakSunHours,
          selfConsumptionRatioPercent: 85,
          gridTariffKShPerKWh: location.gridTariffKSh,
          tariffEscalationPercent: 6,
          panelDegradationPercent: 0.5,
          annualOMCostPercent: 1.5,
          omEscalationPercent: 5,
          batteryReplacementYear: 11,
          batteryReplacementCostPercent: 60,
          discountRate: 12,
          inflationRate: 5.5,
          projectLifeYears: 25,
          useTOUTariff: true,
          kplcCustomerSegment: 'Small Commercial',
          tariffStructure: 'Standard',
          monthlyConsumptionKWh: dailyLoadKwh * 30,
          debtFractionPercent: 0,
          loanInterestRatePercent: 15,
          loanTermYears: 5,
          includeGeneratorInterface: false,
          includeWeatherproofEnclosure: false,
          includeKPLCapplication: true,
          includeOandM: false,
          pvSizingGoal: (args.pvSizingGoal as 'dc_ac_ratio' | 'daily_energy' | 'least_waste') ?? 'least_waste',
        },
        catalog
      );
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                solarCapacityKWp: sim.solarCapacityKWp,
                inverterCapacityKW: sim.inverterCapacityKW,
                batteryCapacityKWh: sim.batteryCapacityKWh,
                annualPVGeneratedKWh: sim.annualPVGeneratedKWh,
                annualCurtailedKWh: sim.annualCurtailedKWh,
                totalCapExKSh: sim.totalCapExKSh,
                lcoeUSDPerKWh: sim.lcoeUSDPerKWh,
                simplePaybackYears: sim.simplePaybackYears,
                irrPercent: sim.irrPercent,
              }),
            },
          ],
        },
      };
    }

    if (toolName === 'size_water_pumping') {
      const parsed = waterPumpSchema.safeParse(args);
      if (!parsed.success) {
        return { jsonrpc: '2.0', id, error: { code: -32602, message: 'Invalid water pumping arguments' } };
      }
      return {
        jsonrpc: '2.0',
        id,
        result: { content: [{ type: 'text', text: JSON.stringify(sizeSolarWaterPumping(parsed.data)) }] },
      };
    }

    return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown tool: ${toolName}` } };
  }

  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unsupported method: ${req.method}` } };
}
