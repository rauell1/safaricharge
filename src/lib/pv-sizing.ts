export type SystemType = 'on-grid' | 'off-grid' | 'hybrid';
export type BatteryChemistry = 'lead-acid' | 'lifepo4' | 'agm';
export type LoadProfileType = 'residential' | 'commercial' | 'industrial' | 'fleet-depot';

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
  coincidenceFactor: number; // Fraction of load covered directly by solar
  directUseKwh: number;       // Daily kWh used directly from PV
  gridImportKwh: number;      // Daily kWh imported from grid (or deficit)
  gridExportKwh: number;      // Daily kWh exported/wasted solar
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
  loadProfile?: LoadProfileType;
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

// Normalized 24-hour profiles (relative hourly weights)
export const RAW_LOAD_PROFILES: Record<LoadProfileType, number[]> = {
  residential: [
    0.02, 0.015, 0.01, 0.01, 0.015, 0.03, // 00:00 - 05:00
    0.06, 0.08, 0.07, 0.04, 0.03, 0.03,   // 06:00 - 11:00 (Morning peak)
    0.025, 0.025, 0.03, 0.03, 0.04, 0.05, // 12:00 - 17:00
    0.08, 0.10, 0.09, 0.07, 0.04, 0.03    // 18:00 - 23:00 (Evening peak)
  ],
  commercial: [
    0.01, 0.01, 0.01, 0.01, 0.01, 0.02,   // Night-time standby
    0.04, 0.07, 0.09, 0.10, 0.10, 0.09,   // Office warm-up and midday peak
    0.09, 0.09, 0.08, 0.07, 0.05, 0.03,   // Afternoon and wind-down
    0.02, 0.01, 0.01, 0.01, 0.01, 0.01    // Closed
  ],
  industrial: [
    0.042, 0.042, 0.042, 0.042, 0.042, 0.042, // Continuous flat 24/7 load
    0.042, 0.042, 0.042, 0.042, 0.042, 0.042,
    0.042, 0.042, 0.042, 0.042, 0.042, 0.042,
    0.042, 0.042, 0.042, 0.042, 0.042, 0.042
  ],
  'fleet-depot': [
    0.07, 0.07, 0.06, 0.05, 0.04, 0.02,   // Late night charging
    0.01, 0.01, 0.01, 0.015, 0.015, 0.01, // Empty depot (vehicles out)
    0.01, 0.01, 0.015, 0.015, 0.02, 0.03, // Return prep
    0.06, 0.08, 0.09, 0.09, 0.08, 0.08    // Evening charging peak
  ]
};

// Returns a normalized Gaussian solar profile (sums to 1.0)
export function getGaussianSolarProfile(peakHour: number = 12, stdDev: number = 2.8): number[] {
  const profile = new Array(24).fill(0);
  let sum = 0;
  for (let h = 0; h < 24; h++) {
    if (h >= 6 && h <= 18) { // Sun only shines between 6 AM and 6 PM
      const val = Math.exp(-Math.pow(h - peakHour, 2) / (2 * Math.pow(stdDev, 2)));
      profile[h] = val;
      sum += val;
    }
  }
  return profile.map(v => (sum > 0 ? v / sum : 0));
}

export function computeSizingResult({
  dailyLoadKwh,
  avgDailySunHours,
  performanceRatio,
  systemType,
  batteryChemistry,
  autonomyDays,
  panelWattage,
  loadProfile = 'residential',
}: {
  dailyLoadKwh: number;
  avgDailySunHours: number;
  performanceRatio: number;
  systemType: SystemType;
  batteryChemistry: BatteryChemistry;
  autonomyDays: number;
  panelWattage: number;
  loadProfile?: LoadProfileType;
}): SizingResult {
  const safeSunHours = Math.max(0.1, avgDailySunHours);
  const safePr = Math.max(0.1, performanceRatio);
  const safeLoad = Math.max(0, dailyLoadKwh);

  // 1. Get profiles
  const rawLoad = RAW_LOAD_PROFILES[loadProfile];
  const loadSum = rawLoad.reduce((a, b) => a + b, 0);
  const normalizedLoad = rawLoad.map(v => (loadSum > 0 ? v / loadSum : 0));

  const normalizedSolar = getGaussianSolarProfile(12, 2.8);

  // 2. Sizing calculation
  // Solve for required PV capacity (initial heuristic: total generation matches total load)
  let requiredPvCapacityKw = safeLoad / (safeSunHours * safePr);

  // If off-grid, we must size solar higher to account for battery roundtrip losses (say 85% efficiency)
  // and load coincidence discrepancies
  if (systemType === 'off-grid') {
    const batteryEff = 0.85;
    // We adjust solar to cover night load / charging losses
    let directSolarUseSum = 0;
    let storedSolarUseSum = 0;

    for (let h = 0; h < 24; h++) {
      const solarH = requiredPvCapacityKw * normalizedSolar[h] * safeSunHours * safePr;
      const loadH = safeLoad * normalizedLoad[h];
      directSolarUseSum += Math.min(solarH, loadH);
      storedSolarUseSum += Math.max(0, solarH - loadH);
    }

    // Compensate for battery round-trip losses on the stored fraction
    const rawDeficit = safeLoad - directSolarUseSum;
    const requiredGeneration = directSolarUseSum + rawDeficit / batteryEff;
    requiredPvCapacityKw = requiredGeneration / (safeSunHours * safePr);
  }

  // Ensure minimum PV capacity to avoid degenerate cases
  requiredPvCapacityKw = Math.max(0.1, requiredPvCapacityKw);
  const suggestedPanelCount = Math.max(1, Math.ceil((requiredPvCapacityKw * 1000) / panelWattage));

  // 3. Hourly load-solar intersection simulation
  let directUseKwh = 0;
  let surplusSolarKwh = 0;
  let deficitKwh = 0;

  for (let h = 0; h < 24; h++) {
    const solarH = requiredPvCapacityKw * normalizedSolar[h] * safeSunHours * safePr;
    const loadH = safeLoad * normalizedLoad[h];

    directUseKwh += Math.min(solarH, loadH);
    if (solarH > loadH) {
      surplusSolarKwh += solarH - loadH;
    } else {
      deficitKwh += loadH - solarH;
    }
  }

  const coincidenceFactor = safeLoad > 0 ? directUseKwh / safeLoad : 1.0;

  // 4. Battery storage sizing
  // For off-grid, size to cover the deficit over autonomy days, adjusted for DoD and efficiency
  // For hybrid, we size a standard backup battery (covers 60% of daily night deficit for 1 day)
  const requiredBatteryCapacityKwh =
    systemType === 'off-grid'
      ? (deficitKwh * autonomyDays) / (BATTERY_DOD[batteryChemistry] * 0.85)
      : systemType === 'hybrid'
      ? (deficitKwh * 1.0) / (BATTERY_DOD[batteryChemistry] * 0.85)
      : null;

  // 5. Monthly energy & financials
  const estimatedMonthlyGenerationKwh = requiredPvCapacityKw * safeSunHours * safePr * 30;

  const solarCost = requiredPvCapacityKw * 1000 * SOLAR_COST_PER_W_KES;
  const batteryCost = (requiredBatteryCapacityKwh ?? 0) * BATTERY_COST_PER_KWH_KES;
  const estimatedCapex = (solarCost + batteryCost) * INSTALLATION_FACTOR;

  // Payback estimation based on grid displacement
  const dailyDisplacedGridKwh = directUseKwh + (requiredBatteryCapacityKwh ? deficitKwh * 0.85 : 0);
  const annualSavings = Math.min(safeLoad, dailyDisplacedGridKwh) * KPLC_AVG_RATE_KES_PER_KWH * 365;
  const simplePaybackYears = annualSavings > 0 ? estimatedCapex / annualSavings : Number.POSITIVE_INFINITY;

  return {
    requiredPvCapacityKw,
    suggestedPanelCount,
    requiredBatteryCapacityKwh,
    estimatedMonthlyGenerationKwh,
    simplePaybackYears,
    coincidenceFactor,
    directUseKwh,
    gridImportKwh: deficitKwh,
    gridExportKwh: surplusSolarKwh,
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

    const loadProfile =
      parsed.loadProfile === 'residential' ||
      parsed.loadProfile === 'commercial' ||
      parsed.loadProfile === 'industrial' ||
      parsed.loadProfile === 'fleet-depot'
        ? parsed.loadProfile
        : undefined;

    return {
      county: parsed.county,
      systemType: parsed.systemType,
      panelWattage: parsed.panelWattage,
      requiredPvCapacityKw: parsed.requiredPvCapacityKw,
      panelCount: parsed.panelCount,
      batteryCapacityKwh,
      performanceRatio: parsed.performanceRatio,
      dailyLoadKwh: parsed.dailyLoadKwh,
      loadProfile,
    };
  } catch {
    return null;
  }
}
