'use client';

import { create } from 'zustand';
import type { SystemConfiguration } from '@/lib/system-config';
import { DEFAULT_SYSTEM_CONFIG } from '@/lib/system-config';
import type { SolarData } from '@/lib/physics-engine';
import { computeEngineeringKpis } from '@/lib/engineeringKpis';
import {
  fetchScenarios,
  upsertScenario,
  deleteScenarioById,
  renameScenario as renameScenarioInDb,
} from '@/lib/supabase-db';
import {
  DEFAULT_BATTERY_DOD_PCT,
  DEFAULT_GENERATOR_THRESHOLD_PCT,
} from '@/lib/system-mode-metrics';
import { AFRICA_CITIES } from '@/lib/africa-locations-data';

export interface LocationOption {
  name: string;
  displayName: string;
  county: string;
  latitude: number;
  longitude: number;
  annualAvgSunHours: number;
  isKosapTarget: boolean;
  electrificationRatePct: number | null;
  countyNote: string;
}

const DEFAULT_LOCATION: LocationOption = {
  name: 'Nairobi',
  displayName: 'Nairobi, Kenya',
  county: 'Kenya',
  latitude: -1.2921,
  longitude: 36.8219,
  annualAvgSunHours: 5.4,
  isKosapTarget: false,
  electrificationRatePct: null,
  countyNote: 'East Africa — elevation 1795 m, avg 22.0°C, annual GHI 1971 kWh/m².',
};

// Static Nairobi solar data used for engineering KPI calculations
const DEMO_SOLAR_DATA: SolarData = {
  latitude: -1.2921,
  longitude: 36.8219,
  annualAvgKwhPerKwp: 5.4,
  monthlyAvgKwhPerKwp: [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3],
  monthlyAvgTemp: [22, 23, 24, 23, 22, 21, 20, 21, 22, 23, 22, 22],
};

// Node types in the energy system
export type NodeType = 'solar' | 'battery' | 'grid' | 'home' | 'ev1' | 'ev2';
export type SystemMode = 'on-grid' | 'off-grid' | 'hybrid';

// Energy flow between two nodes
export interface EnergyFlow {
  from: NodeType;
  to: NodeType;
  powerKW: number;
  active: boolean;
}

// State of an individual energy node
export interface EnergyNode {
  type: NodeType;
  // Real-time power (kW)
  powerKW: number;
  // System capacity (kW or kWh depending on node type)
  capacityKW?: number;
  capacityKWh?: number;
  // Status indicators
  status:
    | 'online'
    | 'offline'
    | 'charging'
    | 'discharging'
    | 'idle'
    | 'exporting'
    | 'importing';
  // Additional node-specific data
  soc?: number; // State of charge for battery/EVs (%)
  efficiency?: number; // Panel efficiency, battery health, etc.
  temperature?: number;
  voltage?: number;
}

// Minute-by-minute simulation data (for reports and analytics)
export interface MinuteDataPoint {
  timestamp: string;
  date: string;
  year: number;
  month: number;
  week: number;
  day: number;
  hour: number;
  minute: number;
  solarKW: number;
  homeLoadKW: number;
  ev1LoadKW: number;
  ev2LoadKW: number;
  batteryPowerKW: number;
  batteryLevelPct: number;
  gridImportKW: number;
  gridExportKW: number;
  ev1SocPct: number;
  ev2SocPct: number;
  tariffRate: number;
  isPeakTime: boolean;
  savingsKES: number;
  solarEnergyKWh: number;
  homeLoadKWh: number;
  ev1LoadKWh: number;
  ev2LoadKWh: number;
  gridImportKWh: number;
  gridExportKWh: number;
  gridFrequencyHz?: number;
  gridLineLossKw?: number;
  cumulativeSavingsKes?: number;
}

// Running totals and accumulators
export interface Accumulators {
  solar: number;
  savings: number;
  gridImport: number;
  carbonOffset: number;
  batDischargeKwh: number;
  feedInEarnings: number;
}

export interface SimulationTickUpdate {
  nodeUpdates: Partial<Record<NodeType, Partial<EnergyNode>>>;
  flows: EnergyFlow[];
  minutePoint: MinuteDataPoint;
  accumulatorDeltas: Partial<Accumulators>;
}

// Time range filter options
export type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all';

// ── Scenario Snapshots ────────────────────────────────────────────────────────

export interface SystemConfigSnapshot {
  solarCapacityKW: number;
  batteryCapacityKWh: number;
  inverterKW: number;
  ev1CapacityKWh: number;
  ev2CapacityKWh: number;
  systemMode: SystemMode;
  batteryDodPct: number;
  generatorThresholdPct: number;
  gridOutageEnabled: boolean;
  gridTariff: { peakRate: number; offPeakRate: number };
}

export interface FinancialSnapshot {
  capexTotal: number;
  npvKes: number;
  irrPct: number;
  lcoeKesPerKwh: number;
  paybackYears: number;
}

export interface PerformanceSnapshot {
  selfSufficiencyPct: number;
  totalGridImportKWh: number;
  totalGridExportKWh: number;
  avgBatterySOC: number;
  totalSolarKWh: number;
  totalSavingsKES: number;
}

export interface LocationCoordinatesSnapshot {
  name: string;
  latitude: number;
  longitude: number;
}

export interface EngineeringSnapshot {
  specificYieldKWhPerKWp: number;
  performanceRatioPct: number;
  capacityFactorPct: number;
  batteryCycles: number;
}

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  /** DB row version for optimistic-locking conflict detection. Undefined on
   *  brand-new (not-yet-persisted) scenarios; populated after the first save. */
  version?: number;
  system: SystemConfigSnapshot;
  finance: FinancialSnapshot;
  performance: PerformanceSnapshot;
  location: LocationCoordinatesSnapshot;
  engineering?: EngineeringSnapshot;
}

// ── Scenario import result ────────────────────────────────────────────────────

export interface ImportScenariosResult {
  /** Number of scenarios successfully imported (not already present) */
  imported: number;
  /** Number of scenarios skipped because the same id already existed */
  skipped: number;
  /** Human-readable error if the JSON was structurally invalid */
  error?: string;
}

// ── Energy System State ───────────────────────────────────────────────────────

// Energy System State
interface EnergySystemState {
  // Core nodes
  nodes: Record<NodeType, EnergyNode>;

  // Active flows
  flows: EnergyFlow[];

  // UI state
  selectedNode: NodeType | null;
  timeRange: TimeRange;

  // Simulation data
  currentDate: Date;
  timeOfDay: number; // 0-24 hours
  isAutoMode: boolean;
  simSpeed: number;

  // Accumulators
  accumulators: Accumulators;

  // Historical data
  minuteData: MinuteDataPoint[];

  // System configuration (UI-level snapshot)
  systemConfig: {
    solarCapacityKW: number;
    batteryCapacityKWh: number;
    inverterKW: number;
    ev1CapacityKWh: number;
    ev2CapacityKWh: number;
    systemMode: SystemMode;
    batteryDodPct: number;
    generatorThresholdPct: number;
    gridOutageEnabled: boolean;
    gridTariff: {
      peakRate: number;
      offPeakRate: number;
    };
  };

  // Full physics-engine configuration (drives the simulation tick loop)
  fullSystemConfig: SystemConfiguration;

  // Static solar site data (used for engineering KPI calculations)
  solarData: SolarData;

  // Actions
  updateNode: (nodeType: NodeType, updates: Partial<EnergyNode>) => void;
  updateFlows: (flows: EnergyFlow[]) => void;
  selectNode: (nodeType: NodeType | null) => void;
  setTimeRange: (range: TimeRange) => void;
  setSystemMode: (mode: SystemMode) => void;
  updateAccumulators: (updates: Partial<Accumulators>) => void;
  addMinuteData: (data: MinuteDataPoint) => void;
  applySimulationTick: (update: SimulationTickUpdate) => void;
  setSimulationState: (updates: {
    currentDate?: Date;
    timeOfDay?: number;
    isAutoMode?: boolean;
    simSpeed?: number;
  }) => void;
  updateSystemConfig: (config: Partial<EnergySystemState['systemConfig']>) => void;
  updateFullSystemConfig: (config: SystemConfiguration) => void;
  resetSystem: () => void;

  // Scenarios
  scenarios: SavedScenario[];
  /** true while any scenario write (save/delete/rename) is in-flight */
  isSyncingScenarios: boolean;
  /** Last sync error message, or null when clean. Clear with clearScenarioSyncError(). */
  scenarioSyncError: string | null;
  clearScenarioSyncError: () => void;
  /** Load scenarios from Supabase and replace local state. No-ops if not logged in. */
  loadScenarios: () => Promise<void>;
  saveScenario: (
    name: string,
    finance: FinancialSnapshot,
    location: LocationCoordinatesSnapshot
  ) => void;
  deleteScenario: (id: string) => void;
  loadScenario: (id: string) => void;
  renameScenario: (id: string, newName: string) => void;
  /**
   * Parse a JSON string (either a single SavedScenario object or an array of
   * them) and merge new scenarios into the store, skipping duplicates by id.
   * Returns an ImportScenariosResult describing what happened.
   */
  importScenarios: (json: string) => ImportScenariosResult;
  
  // Location
  activeLocation: LocationOption;
  setActiveLocation: (location: LocationOption) => void;
}

// Initial state
const initialNodes: Record<NodeType, EnergyNode> = {
  solar: {
    type: 'solar',
    powerKW: 0,
    capacityKW: 10,
    status: 'online',
    efficiency: 1.0,
  },
  battery: {
    type: 'battery',
    powerKW: 0,
    capacityKWh: 50,
    status: 'idle',
    soc: 50,
    efficiency: 1.0,
  },
  grid: {
    type: 'grid',
    powerKW: 0,
    status: 'online',
  },
  home: {
    type: 'home',
    powerKW: 5,
    status: 'online',
  },
  ev1: {
    type: 'ev1',
    powerKW: 0,
    capacityKWh: 80,
    status: 'idle',
    soc: 60,
  },
  ev2: {
    type: 'ev2',
    powerKW: 0,
    capacityKWh: 118,
    status: 'idle',
    soc: 50,
  },
};

const initialAccumulators: Accumulators = {
  solar: 0,
  savings: 0,
  gridImport: 0,
  carbonOffset: 0,
  batDischargeKwh: 0,
  feedInEarnings: 0,
};

const MAX_SCENARIOS = 20;
const MAX_MINUTE_DATA_POINTS = 420 * 30;

// ── Validation helper ─────────────────────────────────────────────────────────

/**
 * Returns true if the value looks enough like a SavedScenario to be imported
 * safely.  We check the required top-level shape without being overly strict
 * about every nested field — downstream rendering is already null-safe.
 */
function isScenarioShape(v: unknown): v is SavedScenario {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    s.id.length > 0 &&
    typeof s.name === 'string' &&
    typeof s.createdAt === 'string' &&
    typeof s.system === 'object' &&
    s.system !== null &&
    typeof s.finance === 'object' &&
    s.finance !== null &&
    typeof s.performance === 'object' &&
    s.performance !== null &&
    typeof s.location === 'object' &&
    s.location !== null
  );
}

// Create the store — scenarios are persisted in Supabase (call loadScenarios on mount)
export const useEnergySystemStore = create<EnergySystemState>()(
  (set, get) => ({
      nodes: initialNodes,
      flows: [],
      selectedNode: null,
      timeRange: 'today',
      currentDate: new Date('2026-01-01T00:00:00'),
      timeOfDay: 0,
      isAutoMode: false,
      simSpeed: 1,
      accumulators: initialAccumulators,
      minuteData: [],
      systemConfig: {
        solarCapacityKW: 10,
        batteryCapacityKWh: 50,
        inverterKW: 10,
        ev1CapacityKWh: 80,
        ev2CapacityKWh: 118,
        systemMode: 'hybrid',
        batteryDodPct: DEFAULT_BATTERY_DOD_PCT,
        generatorThresholdPct: DEFAULT_GENERATOR_THRESHOLD_PCT,
        gridOutageEnabled: false,
        gridTariff: {
          peakRate: 24.31,
          offPeakRate: 14.93,
        },
      },
      fullSystemConfig: DEFAULT_SYSTEM_CONFIG,
      activeLocation: DEFAULT_LOCATION,
      solarData: DEMO_SOLAR_DATA,
      scenarios: [],
      isSyncingScenarios: false,
      scenarioSyncError: null,

      clearScenarioSyncError: () => set({ scenarioSyncError: null }),

      loadScenarios: async () => {
        try {
          const remote = await fetchScenarios();
          set({ scenarios: remote });
        } catch (err) {
          console.error('[energySystemStore] loadScenarios error:', err);
        }
      },

      updateNode: (nodeType, updates) =>
        set((state) => ({
          nodes: {
            ...state.nodes,
            [nodeType]: {
              ...state.nodes[nodeType],
              ...updates,
            },
          },
        })),

      updateFlows: (flows) => set({ flows }),

      selectNode: (nodeType) => set({ selectedNode: nodeType }),

      setTimeRange: (range) => set({ timeRange: range }),

      setSystemMode: (mode) =>
        set((state) => ({
          systemConfig: {
            ...state.systemConfig,
            systemMode: mode,
          },
        })),

      updateAccumulators: (updates) =>
        set((state) => ({
          accumulators: {
            ...state.accumulators,
            ...updates,
          },
        })),

      addMinuteData: (data) =>
        set((state) => {
          if (state.minuteData.length < MAX_MINUTE_DATA_POINTS) {
            return { minuteData: [...state.minuteData, data] };
          }

          // Keep only the most recent N-1 points, then append the newest point.
          // This avoids creating an oversized temporary array on overflow.
          return {
            minuteData: [
              ...state.minuteData.slice(
                state.minuteData.length - (MAX_MINUTE_DATA_POINTS - 1)
              ),
              data,
            ],
          };
        }),

      applySimulationTick: (update) =>
        set((state) => {
          const nextNodes = { ...state.nodes };
          for (const [
            nodeType,
            nodeUpdate,
          ] of Object.entries(update.nodeUpdates) as [
            NodeType,
            Partial<EnergyNode>,
          ][]) {
            if (!nodeUpdate) continue;
            nextNodes[nodeType] = {
              ...nextNodes[nodeType],
              ...nodeUpdate,
            };
          }

          const minuteData =
            state.minuteData.length < MAX_MINUTE_DATA_POINTS
              ? [...state.minuteData, update.minutePoint]
              : [
                  ...state.minuteData.slice(
                    state.minuteData.length -
                      (MAX_MINUTE_DATA_POINTS - 1)
                  ),
                  update.minutePoint,
                ];

          const accumulators: Accumulators = {
            solar:
              state.accumulators.solar +
              (update.accumulatorDeltas.solar ?? 0),
            savings:
              state.accumulators.savings +
              (update.accumulatorDeltas.savings ?? 0),
            gridImport:
              state.accumulators.gridImport +
              (update.accumulatorDeltas.gridImport ?? 0),
            carbonOffset:
              state.accumulators.carbonOffset +
              (update.accumulatorDeltas.carbonOffset ?? 0),
            batDischargeKwh:
              state.accumulators.batDischargeKwh +
              (update.accumulatorDeltas.batDischargeKwh ?? 0),
            feedInEarnings:
              state.accumulators.feedInEarnings +
              (update.accumulatorDeltas.feedInEarnings ?? 0),
          };

          return {
            nodes: nextNodes,
            flows: update.flows,
            minuteData,
            accumulators,
          };
        }),

      setSimulationState: (updates) => set(updates),

      updateSystemConfig: (config) =>
        set((state) => ({
          systemConfig: {
            ...state.systemConfig,
            ...config,
          },
        })),

      updateFullSystemConfig: (config) => set({ fullSystemConfig: config }),

      resetSystem: () =>
        set({
          nodes: initialNodes,
          flows: [],
          selectedNode: null,
          timeRange: 'today',
          currentDate: new Date('2026-01-01T00:00:00'),
          timeOfDay: 0,
          isAutoMode: false,
          simSpeed: 1,
          accumulators: initialAccumulators,
          minuteData: [],
          fullSystemConfig: DEFAULT_SYSTEM_CONFIG,
          activeLocation: DEFAULT_LOCATION,
          solarData: DEMO_SOLAR_DATA,
        }),

      saveScenario: (name, finance, location) => {
        const state = get();
        const data = state.minuteData;

        const totalSolarKWh = data.reduce((s, d) => s + d.solarEnergyKWh, 0);
        const totalGridImportKWh = data.reduce((s, d) => s + d.gridImportKWh, 0);
        const totalGridExportKWh = data.reduce((s, d) => s + d.gridExportKWh, 0);
        const totalConsumptionKWh = data.reduce(
          (s, d) => s + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh,
          0
        );
        const totalSavingsKES = data.reduce((s, d) => s + d.savingsKES, 0);
        const avgBatterySOC =
          data.length > 0
            ? data.reduce((s, d) => s + d.batteryLevelPct, 0) / data.length
            : 0;
        const selfSufficiencyPct =
          totalConsumptionKWh > 0
            ? Math.min(
                100,
                ((totalConsumptionKWh - totalGridImportKWh) / totalConsumptionKWh) * 100
              )
            : 0;

        const durationHours = Math.max(data.length / 60, 1);
        const currentMonth = new Date(state.currentDate).getMonth();
        const irradianceKWhPerM2 =
          state.solarData.monthlyAvgKwhPerKwp[currentMonth] * (durationHours / 24);
        const engResult = computeEngineeringKpis({
          totalSolarKWh,
          dcCapacityKWp: state.systemConfig.solarCapacityKW,
          durationHours,
          totalBatDischargeKWh: state.accumulators.batDischargeKwh,
          batteryCapacityKWh: state.systemConfig.batteryCapacityKWh,
          planeIrradianceKWhPerM2: irradianceKWhPerM2 > 0 ? irradianceKWhPerM2 : undefined,
        });

        const scenario: SavedScenario = {
          id: crypto.randomUUID(),
          name,
          createdAt: new Date().toISOString(),
          system: { ...state.systemConfig },
          finance,
          performance: {
            selfSufficiencyPct,
            totalGridImportKWh,
            totalGridExportKWh,
            avgBatterySOC,
            totalSolarKWh,
            totalSavingsKES,
          },
          location,
          engineering: {
            specificYieldKWhPerKWp: engResult.specificYieldKWhPerKWp,
            performanceRatioPct: engResult.performanceRatioPct,
            capacityFactorPct: engResult.capacityFactorPct,
            batteryCycles: engResult.batteryCycles,
          },
        };

        const updated = [...state.scenarios, scenario];
        const next =
          updated.length > MAX_SCENARIOS
            ? updated.slice(updated.length - MAX_SCENARIOS)
            : updated;

        // Optimistic update — mark as syncing
        set({ scenarios: next, isSyncingScenarios: true, scenarioSyncError: null });

        upsertScenario(scenario)
          .then(({ newVersion }) => {
            // Stamp the DB-assigned version on the local copy
            set((s) => ({
              isSyncingScenarios: false,
              scenarios: s.scenarios.map((x) =>
                x.id === scenario.id ? { ...x, version: newVersion } : x
              ),
            }));
          })
          .catch((err: unknown) => {
            const msg =
              err instanceof Error ? err.message : 'Failed to save scenario.';
            // Rollback: remove the optimistically-added scenario
            set((s) => ({
              isSyncingScenarios: false,
              scenarioSyncError: msg,
              scenarios: s.scenarios.filter((x) => x.id !== scenario.id),
            }));
          });
      },

      deleteScenario: (id) => {
        const scenarioToRestore = get().scenarios.find((s) => s.id === id);

        // Optimistic update
        set((s) => ({
          scenarios: s.scenarios.filter((x) => x.id !== id),
          isSyncingScenarios: true,
          scenarioSyncError: null,
        }));

        deleteScenarioById(id)
          .then(() => set({ isSyncingScenarios: false }))
          .catch((err: unknown) => {
            const msg =
              err instanceof Error ? err.message : 'Failed to delete scenario.';
            // Rollback: restore the deleted scenario in its original position
            set((s) => ({
              isSyncingScenarios: false,
              scenarioSyncError: msg,
              scenarios: scenarioToRestore
                ? [...s.scenarios, scenarioToRestore].sort((a, b) =>
                    a.createdAt.localeCompare(b.createdAt)
                  )
                : s.scenarios,
            }));
          });
      },

      loadScenario: (id) =>
        set((state) => {
          const scenario = state.scenarios.find((s) => s.id === id);
          if (!scenario) return {};

          const city = AFRICA_CITIES.find(
            (c) => c.name.toLowerCase() === scenario.location.name.toLowerCase()
          );

          let activeLocation: LocationOption;
          if (city) {
            activeLocation = {
              name: city.name,
              displayName: `${city.name}, ${city.country}`,
              county: city.country,
              latitude: city.lat,
              longitude: city.lon,
              annualAvgSunHours: city.avgDailyPsh,
              isKosapTarget: false,
              electrificationRatePct: null,
              countyNote: `${city.region} — elevation ${city.elevation} m, avg ${city.avgTempC}°C, annual GHI ${city.annualGHI} kWh/m².`,
            };
          } else {
            activeLocation = {
              name: scenario.location.name,
              displayName: `${scenario.location.name}, Custom`,
              county: 'Custom',
              latitude: scenario.location.latitude,
              longitude: scenario.location.longitude,
              annualAvgSunHours: 5.4,
              isKosapTarget: false,
              electrificationRatePct: null,
              countyNote: 'Custom registered site location.',
            };
          }

          const avgTempC = city ? city.avgTempC : 22.0;
          const scale = activeLocation.annualAvgSunHours / 5.4;
          const monthlyAvgKwhPerKwp = [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3].map(v => v * scale);
          const tempDiff = avgTempC - 22.0;
          const monthlyAvgTemp = [22, 23, 24, 23, 22, 21, 20, 21, 22, 23, 22, 22].map(v => v + tempDiff);

          return {
            systemConfig: { ...scenario.system },
            activeLocation,
            solarData: {
              latitude: activeLocation.latitude,
              longitude: activeLocation.longitude,
              annualAvgKwhPerKwp: activeLocation.annualAvgSunHours,
              monthlyAvgKwhPerKwp,
              monthlyAvgTemp,
            }
          };
        }),

      setActiveLocation: (location) => {
        const matchedCity = AFRICA_CITIES.find(
          (c) => c.name.toLowerCase() === location.name.toLowerCase()
        );
        const avgTempC = matchedCity ? matchedCity.avgTempC : 22.0;

        const scale = location.annualAvgSunHours / 5.4;
        const monthlyAvgKwhPerKwp = [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3].map(v => v * scale);
        const tempDiff = avgTempC - 22.0;
        const monthlyAvgTemp = [22, 23, 24, 23, 22, 21, 20, 21, 22, 23, 22, 22].map(v => v + tempDiff);

        set({
          activeLocation: location,
          solarData: {
            latitude: location.latitude,
            longitude: location.longitude,
            annualAvgKwhPerKwp: location.annualAvgSunHours,
            monthlyAvgKwhPerKwp,
            monthlyAvgTemp,
          }
        });
      },

      renameScenario: (id, newName) => {
        const oldName = get().scenarios.find((s) => s.id === id)?.name ?? newName;

        // Optimistic update
        set((s) => ({
          scenarios: s.scenarios.map((x) => (x.id === id ? { ...x, name: newName } : x)),
          isSyncingScenarios: true,
          scenarioSyncError: null,
        }));

        renameScenarioInDb(id, newName)
          .then(() => set({ isSyncingScenarios: false }))
          .catch((err: unknown) => {
            const msg =
              err instanceof Error ? err.message : 'Failed to rename scenario.';
            // Rollback: revert to old name
            set((s) => ({
              isSyncingScenarios: false,
              scenarioSyncError: msg,
              scenarios: s.scenarios.map((x) =>
                x.id === id ? { ...x, name: oldName } : x
              ),
            }));
          });
      },

      importScenarios: (json: string): ImportScenariosResult => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(json);
        } catch {
          return {
            imported: 0,
            skipped: 0,
            error: 'Invalid JSON — could not parse the pasted text.',
          };
        }

        // Accept both a single scenario object and an array
        const candidates: unknown[] = Array.isArray(parsed)
          ? parsed
          : [parsed];

        const valid = candidates.filter(isScenarioShape);
        if (valid.length === 0) {
          return {
            imported: 0,
            skipped: 0,
            error:
              'No valid scenarios found. Make sure you pasted the full JSON exported from SafariCharge.',
          };
        }

        const existingIds = new Set(get().scenarios.map((s) => s.id));
        const fresh = valid.filter((s) => !existingIds.has(s.id)) as SavedScenario[];
        const skipped = valid.length - fresh.length;

        if (fresh.length > 0) {
          set((state) => {
            const merged: SavedScenario[] = [...state.scenarios, ...fresh];
            return {
              scenarios:
                merged.length > MAX_SCENARIOS
                  ? merged.slice(merged.length - MAX_SCENARIOS)
                  : merged,
            };
          });
        }

        return { imported: fresh.length, skipped };
      },
  })
);
