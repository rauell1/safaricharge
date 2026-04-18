/**
 * dashboard.ts
 * Shared TypeScript types for the SafariCharge dashboard.
 * Extracted from src/app/page.tsx to keep page.tsx focused on
 * orchestration only.
 */

import type { BatteryPrediction } from '@/components/dashboard/BatteryPredictionCard';
import type { DerivedSystemConfig, SimulationMinuteRecord } from '@/types/simulation-core';

// ---------------------------------------------------------------------------
// Power-flow direction enums
// ---------------------------------------------------------------------------

export type GridDirection = 'import' | 'export' | 'neutral';
export type StorageDirection = 'charge' | 'discharge' | 'idle';

// ---------------------------------------------------------------------------
// Visualization node types (used by buildVisualizationLayout)
// ---------------------------------------------------------------------------

export type GenerationNode = {
  type: 'pv';
  capacityKw: number;
  outputKw: number;
  enabled: boolean;
  maxKw?: number;
};

export type ConversionNode = {
  type: 'inverter';
  id: number;
  ratingKw: number;
  outputKw: number;
  active: boolean;
  maxKw?: number;
};

export type StorageNode = {
  type: 'battery';
  capacityKwh: number;
  powerKw: number;
  status: string;
  levelPct: number;
  health: number;
  cycles: number;
  direction: StorageDirection;
  active: boolean;
  maxChargeKw: number;
  maxDischargeKw: number;
};

export type LoadNode =
  | {
      type: 'grid';
      name: string;
      powerKw: number;
      status: string;
      direction: GridDirection;
      active: boolean;
      maxKw?: number;
    }
  | {
      type: 'home' | 'commercial' | 'industrial' | 'accessory';
      name: string;
      powerKw: number;
      active: boolean;
      maxKw?: number;
    }
  | {
      type: 'ev';
      id: number;
      name: string;
      powerKw: number;
      status: string;
      capacity: number;
      maxRate: number;
      soc: number;
      v2g: boolean;
      active: boolean;
      maxKw?: number;
    };

export type SystemFlow = {
  solarToInverter: number;
  solarToLoad: number;
  solarToBattery: number;
  solarToGrid: number;
  batteryDischarge: number;
  batteryCharge: number;
  batteryToLoad: number;
  batteryToGrid: number;
  inverterToLoad: number;
  inverterToGrid: number;
  gridToLoad: number;
  evDemand: number;
};

export type DerivedVisualizationLayout = {
  generation: GenerationNode[];
  conversion: ConversionNode[];
  storage: StorageNode[];
  distribution: { hasACBus: boolean };
  loads: LoadNode[];
  meta: {
    solarKw: number;
    inverterThroughputKw: number;
    gridImportKw: number;
    gridExportKw: number;
    batteryChargeKw: number;
    batteryDischargeKw: number;
    residentialLoadKw: number;
    commercialLoadKw: number;
    industrialLoadKw: number;
    evLoadKw: number;
    totalLoadKw: number;
  };
};

// ---------------------------------------------------------------------------
// AI Assistant types
// ---------------------------------------------------------------------------

export type AiSystemData = {
  solar: {
    production_kw: number;
    peak_hours: string;
    daily_kwh: number;
  };
  battery: {
    capacity_kwh: number;
    current_charge: number;
    charge_cycles_today: number;
    discharge_pattern: string;
  };
  grid: {
    import_kwh: number;
    export_kwh: number;
  };
  load: {
    consumption_kwh: number;
    peak_usage_hours: string;
  };
  timestamp: string;
  derived?: {
    battery_efficiency?: number;
    previous_battery_efficiency?: number;
    battery_efficiency_drop?: number;
    likely_cause?: string;
    cause_confidence?: number;
    confidence_factors?: string[];
    battery_health_score?: number;
    battery_health_breakdown?: {
      efficiency?: number;
      cycles?: number;
      confidence?: number;
    };
    prediction?: BatteryPrediction;
  };
};

export type AssistantProps = {
  isOpen: boolean;
  onClose: () => void;
  data: AiSystemData;
  timeOfDay: number;
  weather: string;
  currentDate: Date;
  isAutoMode: boolean;
  minuteData: SimulationMinuteRecord[];
  systemConfig: DerivedSystemConfig;
};

export type DashboardAlert = {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
};
