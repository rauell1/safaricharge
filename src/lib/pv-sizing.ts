export type SystemType = 'on-grid' | 'off-grid' | 'hybrid';
export type BatteryChemistry = 'lead-acid' | 'lifepo4' | 'agm';

export interface KenyaIrradiancePreset {
  county: string;
  lat: number;
  lon: number;
  avgDailySunHours: number;
  annualYieldKwhPerKwp: number;
  peakMonth: string;
  lowMonth: string;
}

export interface SizingResult {
  requiredPvCapacityKw: number;
  suggestedPanelCount: number;
  requiredBatteryCapacityKwh: number | null;
  estimatedMonthlyGenerationKwh: number;
  simplePaybackYears: number;
}

export interface SimulatorSizingPayload {
  county: string;
  systemType: SystemType;
  panelWattage: number;
  requiredPvCapacityKw: number;
  panelCount: number;
  batteryCapacityKwh: number | null;
  performanceRatio: number;
  dailyLoadKwh: number;
}

export const BATTERY_DOD: Record<BatteryChemistry, number> = {
  'lead-acid': 0.5,
  lifepo4: 0.8,
  agm: 0.6,
};

export const SIZING_SIMULATOR_STORAGE_KEY = 'safaricharge-sizing-to-simulator';

const INSTALLATION_FACTOR = 1.2;
const SOLAR_COST_PER_W_KES = 27;
const BATTERY_COST_PER_KWH_KES = 25000;
const KPLC_AVG_RATE_KES_PER_KWH = 18.5;

export function computeSizingResult({
  dailyLoadKwh,
  avgDailySunHours,
  performanceRatio,
  systemType,
  batteryChemistry,
  autonomyDays,
  panelWattage,
}: {
  dailyLoadKwh: number;
  avgDailySunHours: number;
  performanceRatio: number;
  systemType: SystemType;
  batteryChemistry: BatteryChemistry;
  autonomyDays: number;
  panelWattage: number;
}): SizingResult {
  const safeSunHours = Math.max(0.1, avgDailySunHours);
  const safePr = Math.max(0.1, performanceRatio);
  const safeLoad = Math.max(0, dailyLoadKwh);

  const requiredPvCapacityKw = safeLoad / (safeSunHours * safePr);
  const suggestedPanelCount = Math.max(1, Math.ceil((requiredPvCapacityKw * 1000) / panelWattage));

  const requiredBatteryCapacityKwh =
    systemType === 'off-grid'
      ? (safeLoad * autonomyDays) / BATTERY_DOD[batteryChemistry]
      : null;

  const estimatedMonthlyGenerationKwh = requiredPvCapacityKw * safeSunHours * safePr * 30;

  const solarCost = requiredPvCapacityKw * 1000 * SOLAR_COST_PER_W_KES;
  const batteryCost = (requiredBatteryCapacityKwh ?? 0) * BATTERY_COST_PER_KWH_KES;
  const estimatedCapex = (solarCost + batteryCost) * INSTALLATION_FACTOR;
  const annualSavings = estimatedMonthlyGenerationKwh * KPLC_AVG_RATE_KES_PER_KWH * 12;
  const simplePaybackYears = annualSavings > 0 ? estimatedCapex / annualSavings : Number.POSITIVE_INFINITY;

  return {
    requiredPvCapacityKw,
    suggestedPanelCount,
    requiredBatteryCapacityKwh,
    estimatedMonthlyGenerationKwh,
    simplePaybackYears,
  };
}

export function parseSimulatorSizingPayload(raw: string | null): SimulatorSizingPayload | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SimulatorSizingPayload>;
    if (
      typeof parsed.county !== 'string' ||
      typeof parsed.panelWattage !== 'number' ||
      typeof parsed.requiredPvCapacityKw !== 'number' ||
      typeof parsed.panelCount !== 'number' ||
      typeof parsed.performanceRatio !== 'number' ||
      typeof parsed.dailyLoadKwh !== 'number' ||
      (parsed.systemType !== 'on-grid' && parsed.systemType !== 'off-grid' && parsed.systemType !== 'hybrid')
    ) {
      return null;
    }

    const batteryCapacityKwh =
      typeof parsed.batteryCapacityKwh === 'number' ? parsed.batteryCapacityKwh : null;

    return {
      county: parsed.county,
      systemType: parsed.systemType,
      panelWattage: parsed.panelWattage,
      requiredPvCapacityKw: parsed.requiredPvCapacityKw,
      panelCount: parsed.panelCount,
      batteryCapacityKwh,
      performanceRatio: parsed.performanceRatio,
      dailyLoadKwh: parsed.dailyLoadKwh,
    };
  } catch {
    return null;
  }
}
