/**
 * SafariCharge – System Configuration Types & Defaults
 *
 * Defines the complete system configuration structure including dynamic loads,
 * hardware specifications, and validation functions.
 */

import {
  DEFAULT_SOLAR_SITE_CONFIG,
  type SolarSiteConfig,
} from '@/lib/solar-site-config';

// ---------------------------------------------------------------------------
// Load Configuration Types
// ---------------------------------------------------------------------------

/**
 * Base interface for all load types
 */
export interface BaseLoadConfig {
  id: string;
  name: string;
  enabled: boolean;
  type: 'home' | 'ev' | 'commercial' | 'hvac' | 'custom';
}

/**
 * Home/Residential load with 24-hour profile
 */
export interface HomeLoadConfig extends BaseLoadConfig {
  type: 'home';
  /** 24-hour power profile in kW, one value per hour */
  hourlyProfile: number[];
  /** Multiplier for weekends (typically higher) */
  weekendMultiplier: number;
  /** Whether to include weather-dependent HVAC load */
  includeHVAC: boolean;
  /** Base HVAC load in kW (added based on weather) */
  hvacBaseKw: number;
}

/**
 * Electric Vehicle load with charging schedule
 */
export interface EVLoadConfig extends BaseLoadConfig {
  type: 'ev';
  /** Battery capacity in kWh */
  batteryKwh: number;
  /** Onboard charger maximum rate in kW */
  onboardChargerKw: number;
  /** Energy drain rate when driving (kW equivalent) */
  drainRateKw: number;
  /** Hour of day when EV departs (0-24, decimal for minutes) */
  departTime: number;
  /** Random variance in depart time (±minutes) */
  departVariance: number;
  /** Hour of day when EV returns (0-24, decimal for minutes) */
  returnTime: number;
  /** Random variance in return time (±minutes) */
  returnVariance: number;
  /** Optional lunch/midday return start time (0-24) */
  lunchStartTime?: number;
  /** Optional lunch/midday return end time (0-24) */
  lunchEndTime?: number;
  /** Probability of emergency late-night charge (0-1) */
  emergencyChargeProbability: number;
  /** Whether this EV supports V2G (Vehicle-to-Grid) */
  supportsV2G: boolean;
  /** Minimum SOC to maintain for V2G discharge (%) */
  v2gMinSoc: number;
}

/**
 * Commercial/Fixed load with time-based schedule
 */
export interface CommercialLoadConfig extends BaseLoadConfig {
  type: 'commercial';
  /** Constant power draw in kW */
  constantKw: number;
  /** Operating schedule */
  schedule: {
    /** Start hour (0-24) */
    start: number;
    /** End hour (0-24) */
    end: number;
    /** Power during this window (kW) */
    powerKw: number;
  }[];
  /** Whether this load operates on weekends */
  operatesWeekends: boolean;
}

/**
 * HVAC-specific load (separate from home base load)
 */
export interface HVACLoadConfig extends BaseLoadConfig {
  type: 'hvac';
  /** Base cooling/heating capacity in kW */
  capacityKw: number;
  /** Weather sensitivity multiplier */
  weatherMultiplier: {
    sunny: number;
    cloudy: number;
    rainy: number;
  };
  /** Operating hours */
  operatingHours: {
    start: number;
    end: number;
  };
}

/**
 * Custom load with user-defined behavior
 */
export interface CustomLoadConfig extends BaseLoadConfig {
  type: 'custom';
  /** Simple constant power or hourly profile */
  mode: 'constant' | 'profile';
  /** For constant mode */
  constantKw?: number;
  /** For profile mode */
  hourlyProfile?: number[];
}

/**
 * Union type of all load configurations
 */
export type LoadConfig =
  | HomeLoadConfig
  | EVLoadConfig
  | CommercialLoadConfig
  | HVACLoadConfig
  | CustomLoadConfig;

// ---------------------------------------------------------------------------
// Inverter & Battery Configuration
// ---------------------------------------------------------------------------

export type InverterPhase = 'single' | 'three';
export type VoltageType = 'low' | 'high';

export interface InverterConfig {
  /** Rated capacity in kW */
  capacityKw: number;
  /** Phase configuration */
  phase: InverterPhase;
  /** Voltage type */
  voltage: VoltageType;
  /** Datasheet max efficiency (fraction) when known. */
  maxEfficiency?: number;
}

export interface BatteryConfig {
  /** Usable capacity in kWh — always computed from (bankModules × perModuleKwh) when bankModules is set. */
  capacityKwh: number;
  /** Voltage type */
  voltage: VoltageType;
  /** Chemistry type (for degradation modeling) */
  chemistry: 'lifepo4' | 'lead-acid' | 'nmc';
  /** Maximum charge rate in kW — always computed from datasheet when bankModules is set. */
  maxChargeKw: number;
  /** Maximum discharge rate in kW — always computed from datasheet when bankModules is set. */
  maxDischargeKw: number;
  /** Minimum reserve to maintain (% of capacity) */
  minReservePct: number;
  /**
   * Number of battery modules in the bank.
   * When set, capacityKwh / maxChargeKw / maxDischargeKw are derived from
   * (bankModules × BATTERY_MODULE_CATALOG[installedBatteryId]) so there are
   * no manually entered total values that can go out of sync with the module spec.
   */
  bankModules?: number;
}

export interface SolarConfig {
  /** Number of panels in the array */
  panelCount: number;
  /** Wattage per panel (W) */
  panelWattage: number;
  /** Computed total capacity in kW */
  totalCapacityKw: number;
}

// ---------------------------------------------------------------------------
// Complete System Configuration
// ---------------------------------------------------------------------------

export interface SystemConfiguration {
  /** Configuration mode */
  mode: 'auto' | 'advanced';

  /** Solar array configuration */
  solar: SolarConfig;

  /** Inverter configuration */
  inverter: InverterConfig;

  /** Battery storage configuration */
  battery: BatteryConfig;

  /** Dynamic load configurations */
  loads: LoadConfig[];

  /** Real-world PV system performance ratio derate (0.65–0.95). */
  performanceRatio: number;
  /** Additional partial shading loss percentage (0–50). */
  shadingLossPct: number;

  /**
   * Catalog IDs for installed hardware, linked into SOLAR_COMPONENT_CATALOG.
   * These drive both physics (via catalog-physics-bridge) and UI (docs hub).
   *
   * When set, the physics engine resolves datasheet-accurate values for:
   *   - Panel temperature coefficient (panelTempCoefficientPerDegC)
   *   - Panel degradation (yr1 + annual)
   *   - Bifacial gain (if module is bifacial)
   *   - Inverter peak efficiency
   *   - Battery round-trip efficiency
   *
   * The installed component list is built from these IDs via
   * buildInstalledComponentSummaries() so the config panel and docs hub
   * always reflect the same component choice without duplicating state.
   */
  installedModuleId?: string;
  installedInverterId?: string;
  installedBatteryId?: string;

  /** Site-level irradiance assumptions used by the physics engine. */
  solarSite?: SolarSiteConfig;

  /** Legacy scaling factors (for backward compatibility) */
  legacy?: {
    loadScale: number;
    evCommuterScale: number;
    evFleetScale: number;
  };
}

// ---------------------------------------------------------------------------
// Default Configurations
// ---------------------------------------------------------------------------

/**
 * Default home load with realistic residential profile
 */
export const DEFAULT_HOME_LOAD: HomeLoadConfig = {
  id: 'home-1',
  name: 'Residential Base Load',
  enabled: true,
  type: 'home',
  hourlyProfile: [
    2.5,  // 00:00 - Low overnight
    2.0,  // 01:00
    2.0,  // 02:00
    2.0,  // 03:00
    2.5,  // 04:00
    3.0,  // 05:00 - Early morning rise
    5.5,  // 06:00 - Morning peak
    6.5,  // 07:00
    5.0,  // 08:00
    3.5,  // 09:00
    2.5,  // 10:00 - Office hours (low at home)
    2.5,  // 11:00
    3.0,  // 12:00 - Lunch
    2.5,  // 13:00
    2.5,  // 14:00
    2.5,  // 15:00
    3.0,  // 16:00
    4.0,  // 17:00 - Return home
    6.0,  // 18:00 - Evening peak
    7.5,  // 19:00
    8.0,  // 20:00
    6.5,  // 21:00
    4.5,  // 22:00 - Bedtime wind-down
    3.0,  // 23:00
  ],
  weekendMultiplier: 1.2,
  includeHVAC: true,
  hvacBaseKw: 3.5,
};

/**
 * Default EV #1 - Commuter vehicle
 */
export const DEFAULT_EV_COMMUTER: EVLoadConfig = {
  id: 'ev-1',
  name: 'EV Commuter',
  enabled: true,
  type: 'ev',
  batteryKwh: 80,
  onboardChargerKw: 7,
  drainRateKw: 0.5,
  departTime: 7.5, // 7:30 AM
  departVariance: 12, // ±12 minutes
  returnTime: 18.0, // 6:00 PM
  returnVariance: 24, // ±24 minutes
  emergencyChargeProbability: 0.2,
  supportsV2G: true,
  v2gMinSoc: 40,
};

/**
 * Default EV #2 - Fleet/Uber vehicle
 */
export const DEFAULT_EV_FLEET: EVLoadConfig = {
  id: 'ev-2',
  name: 'EV Fleet/Uber',
  enabled: true,
  type: 'ev',
  batteryKwh: 118,
  onboardChargerKw: 22,
  drainRateKw: 0.8,
  departTime: 5.5, // 5:30 AM
  departVariance: 15,
  returnTime: 22.0, // 10:00 PM
  returnVariance: 30,
  lunchStartTime: 12.5, // 12:30 PM
  lunchEndTime: 14.0, // 2:00 PM
  emergencyChargeProbability: 0.15,
  supportsV2G: true,
  v2gMinSoc: 30,
};

/**
 * Default system configuration.
 *
 * Battery: 4 × Pylontech US5000 (4 × 4.8 kWh usable = 19.2 kWh total at
 * 2.4 kW charge/discharge per module = 9.6 kW per direction).
 * The installedBatteryId links this to BATTERY_MODULE_CATALOG['pylontech-us5000']
 * so the physics engine resolves 96 % RTE from the datasheet library.
 *
 * NOTE: The 60 kWh / 30 kW / 40 kW numbers in previous versions reflected the
 * legacy config constants. They are updated here to match the chosen bank spec
 * (Pylontech US5000 × 4). Adjust bankModules and the inverter preset in the UI
 * to change the bank size — all totals will recompute via resolveBatteryBankConfig.
 */
export const DEFAULT_SYSTEM_CONFIG: SystemConfiguration = {
  mode: 'auto',
  solar: {
    panelCount: 120,
    panelWattage: 420,
    totalCapacityKw: 50.4,
  },
  inverter: {
    capacityKw: 48,
    phase: 'three',
    voltage: 'high',
    maxEfficiency: 0.976,
  },
  battery: {
    capacityKwh: 19.2,       // 4 × Pylontech US5000 × 4.8 kWh usable
    voltage: 'low',
    chemistry: 'lifepo4',
    maxChargeKw: 9.6,         // 4 × 2.4 kW
    maxDischargeKw: 9.6,      // 4 × 2.4 kW
    minReservePct: 20,
    bankModules: 4,
  },
  loads: [
    DEFAULT_HOME_LOAD,
    DEFAULT_EV_COMMUTER,
    DEFAULT_EV_FLEET,
  ],
  performanceRatio: 0.8,
  shadingLossPct: 0,
  installedModuleId:   'jinko-tiger-neo-66hl4m-bdv',
  installedInverterId: 'deye-sun-sg04lp1-3-6k',
  installedBatteryId:  'pylontech-us5000',
  solarSite: DEFAULT_SOLAR_SITE_CONFIG,
  legacy: {
    loadScale: 1.0,
    evCommuterScale: 1.0,
    evFleetScale: 1.0,
  },
};

// ---------------------------------------------------------------------------
// Preset Configurations
// ---------------------------------------------------------------------------

export function createPresetConfig(
  base: SystemConfiguration,
  multiplier: number,
  presetName: string
): SystemConfiguration {
  const bm = base.battery.bankModules;
  return {
    ...base,
    mode: 'auto',
    solar: {
      ...base.solar,
      panelCount: Math.round(base.solar.panelCount * multiplier),
      totalCapacityKw: base.solar.totalCapacityKw * multiplier,
    },
    inverter: {
      ...base.inverter,
      capacityKw: base.inverter.capacityKw * multiplier,
    },
    battery: {
      ...base.battery,
      capacityKwh:    Math.round(base.battery.capacityKwh    * multiplier * 10) / 10,
      maxChargeKw:    Math.round(base.battery.maxChargeKw    * multiplier * 10) / 10,
      maxDischargeKw: Math.round(base.battery.maxDischargeKw * multiplier * 10) / 10,
      // bankModules scaled proportionally (rounded to nearest integer)
      bankModules: bm ? Math.max(1, Math.round(bm * multiplier)) : undefined,
    },
    // Loads remain unchanged - scaling is via legacy factors if needed
  };
}

export const PRESET_CONSERVATIVE = createPresetConfig(
  DEFAULT_SYSTEM_CONFIG,
  0.9,
  'Conservative'
);

export const PRESET_EXPECTED = DEFAULT_SYSTEM_CONFIG;

export const PRESET_AGGRESSIVE = createPresetConfig(
  DEFAULT_SYSTEM_CONFIG,
  1.1,
  'Aggressive'
);

// ---------------------------------------------------------------------------
// Validation & Utilities
// ---------------------------------------------------------------------------

/**
 * Validates a system configuration with enhanced intelligence
 *
 * Now includes:
 * - DC:AC ratio analysis
 * - Load capacity validation
 * - Battery C-rate checks
 * - Economic feasibility warnings
 */
export function validateSystemConfig(config: SystemConfiguration): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  dcAcRatio?: number;
  dcAcStatus?: 'optimal' | 'acceptable' | 'too_low' | 'too_high';
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Solar validation
  if (config.solar.panelCount <= 0) {
    errors.push('Panel count must be positive');
  }
  if (config.solar.panelWattage <= 0) {
    errors.push('Panel wattage must be positive');
  }
  if (config.solar.totalCapacityKw > 1000) {
    warnings.push('PV capacity exceeds 1 MW - very large system');
  }
  if (config.performanceRatio < 0.65 || config.performanceRatio > 0.95) {
    errors.push('Performance ratio must be between 0.65 and 0.95');
  }
  if (config.shadingLossPct < 0 || config.shadingLossPct > 50) {
    errors.push('Shading loss must be between 0% and 50%');
  }

  // Inverter validation
  if (config.inverter.capacityKw <= 0) {
    errors.push('Inverter capacity must be positive');
  }

  // ========================================================================
  // DC:AC Ratio Analysis
  // ========================================================================
  const dcAcRatio = config.solar.totalCapacityKw / config.inverter.capacityKw;
  let dcAcStatus: 'optimal' | 'acceptable' | 'too_low' | 'too_high';

  if (dcAcRatio >= 1.20 && dcAcRatio <= 1.30) {
    dcAcStatus = 'optimal';
  } else if (dcAcRatio >= 1.10 && dcAcRatio < 1.20) {
    dcAcStatus = 'acceptable';
    warnings.push(
      `DC:AC ratio (${dcAcRatio.toFixed(2)}:1) is conservative. Consider downsizing inverter to ${(config.solar.totalCapacityKw / 1.25).toFixed(1)} kW for better economics.`
    );
  } else if (dcAcRatio > 1.30 && dcAcRatio <= 1.40) {
    dcAcStatus = 'acceptable';
    warnings.push(
      `DC:AC ratio (${dcAcRatio.toFixed(2)}:1) will experience ~${((dcAcRatio - 1.25) * 100).toFixed(0)}% clipping losses. Consider ${(config.solar.totalCapacityKw / 1.25).toFixed(1)} kW inverter.`
    );
  } else if (dcAcRatio < 1.10) {
    dcAcStatus = 'too_low';
    warnings.push(
      `⚠️ DC:AC ratio (${dcAcRatio.toFixed(2)}:1) is too low. Inverter oversized - wasting ~${((1.25 - dcAcRatio) * 20).toFixed(0)}% energy capture potential.`
    );
  } else {
    dcAcStatus = 'too_high';
    warnings.push(
      `⚠️ DC:AC ratio (${dcAcRatio.toFixed(2)}:1) is too high. Excessive clipping will waste ~${((dcAcRatio - 1.25) * 100).toFixed(0)}% of solar production.`
    );
  }

  // Legacy warning (kept for backward compatibility)
  if (config.inverter.capacityKw < config.solar.totalCapacityKw * 0.7) {
    warnings.push('Inverter severely undersized relative to PV array (< 0.7:1 ratio)');
  }

  // ========================================================================
  // Battery C-Rate Validation
  // ========================================================================
  const chargeRate_C = config.battery.maxChargeKw / config.battery.capacityKwh;
  const dischargeRate_C = config.battery.maxDischargeKw / config.battery.capacityKwh;

  if (chargeRate_C > 1.0) {
    warnings.push(
      `Battery charge rate (${chargeRate_C.toFixed(2)}C) exceeds recommended 1C. May reduce lifespan by 20-30%.`
    );
  }

  if (dischargeRate_C > 2.0) {
    warnings.push(
      `Battery discharge rate (${dischargeRate_C.toFixed(2)}C) exceeds recommended 2C. May reduce lifespan.`
    );
  }

  // Battery validation
  if (config.battery.capacityKwh <= 0) {
    errors.push('Battery capacity must be positive');
  }
  if (config.battery.capacityKwh > 5000) {
    warnings.push('Battery capacity exceeds 5 MWh - very large system');
  }
  if (config.battery.maxChargeKw > config.inverter.capacityKw) {
    warnings.push('Battery charge rate exceeds inverter capacity');
  }
  if (config.battery.minReservePct < 0 || config.battery.minReservePct > 50) {
    warnings.push('Battery reserve should be between 0-50%');
  }

  // Load validation
  if (config.loads.length === 0) {
    warnings.push('No loads configured - system will only export to grid');
  }

  config.loads.forEach((load, idx) => {
    if (!load.id || !load.name) {
      errors.push(`Load ${idx + 1}: Missing ID or name`);
    }

    if (load.type === 'home') {
      if (load.hourlyProfile.length !== 24) {
        errors.push(`${load.name}: Hourly profile must have 24 values`);
      }
      if (load.hourlyProfile.some(v => v < 0)) {
        errors.push(`${load.name}: Hourly profile contains negative values`);
      }
    }

    if (load.type === 'ev') {
      if (load.batteryKwh <= 0) {
        errors.push(`${load.name}: Battery capacity must be positive`);
      }
      if (load.onboardChargerKw <= 0) {
        errors.push(`${load.name}: Charger rate must be positive`);
      }
      if (load.onboardChargerKw > config.inverter.capacityKw) {
        warnings.push(`${load.name}: Charger rate exceeds inverter capacity`);
      }
      if (load.departTime < 0 || load.departTime >= 24) {
        errors.push(`${load.name}: Depart time must be 0-24`);
      }
      if (load.returnTime < 0 || load.returnTime >= 24) {
        errors.push(`${load.name}: Return time must be 0-24`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    dcAcRatio,
    dcAcStatus,
  };
}

/**
 * Updates the solar totalCapacityKw based on panel count and wattage
 */
export function updateSolarCapacity(config: SystemConfiguration): SystemConfiguration {
  return {
    ...config,
    solar: {
      ...config.solar,
      totalCapacityKw: (config.solar.panelCount * config.solar.panelWattage) / 1000,
    },
  };
}

/**
 * Generates a unique ID for a new load
 */
export function generateLoadId(type: string, existingLoads: LoadConfig[]): string {
  const typePrefix = type.toLowerCase();
  const existingIds = existingLoads
    .filter(l => l.type === type)
    .map(l => l.id);

  let counter = 1;
  while (existingIds.includes(`${typePrefix}-${counter}`)) {
    counter++;
  }

  return `${typePrefix}-${counter}`;
}

/**
 * Creates a template for a new load of the specified type
 */
export function createLoadTemplate(type: LoadConfig['type'], existingLoads: LoadConfig[]): LoadConfig {
  const id = generateLoadId(type, existingLoads);

  switch (type) {
    case 'home':
      return {
        ...DEFAULT_HOME_LOAD,
        id,
        name: `Home Load ${existingLoads.filter(l => l.type === 'home').length + 1}`,
      };

    case 'ev':
      return {
        ...DEFAULT_EV_COMMUTER,
        id,
        name: `EV ${existingLoads.filter(l => l.type === 'ev').length + 1}`,
      };

    case 'commercial':
      return {
        id,
        name: `Commercial Load ${existingLoads.filter(l => l.type === 'commercial').length + 1}`,
        enabled: true,
        type: 'commercial',
        constantKw: 5.0,
        schedule: [
          { start: 8, end: 17, powerKw: 10 },
        ],
        operatesWeekends: false,
      };

    case 'hvac':
      return {
        id,
        name: `HVAC System ${existingLoads.filter(l => l.type === 'hvac').length + 1}`,
        enabled: true,
        type: 'hvac',
        capacityKw: 5.0,
        weatherMultiplier: {
          sunny: 1.5,
          cloudy: 1.0,
          rainy: 0.5,
        },
        operatingHours: {
          start: 6,
          end: 22,
        },
      };

    case 'custom':
      return {
        id,
        name: `Custom Load ${existingLoads.filter(l => l.type === 'custom').length + 1}`,
        enabled: true,
        type: 'custom',
        mode: 'constant',
        constantKw: 1.0,
      };
  }
}
