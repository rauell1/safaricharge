/**
 * Energy System State Store
 *
 * This is the SINGLE SOURCE OF TRUTH for all energy system data.
 * All components (Energy Flow Diagram, System Visualization, Sidebar, Reports)
 * read from and update this shared state.
 *
 * Architecture:
 * - nodes: Current state of each energy component (power, capacity, status)
 * - flows: Active energy flows between nodes
 * - selectedNode: Currently selected node for detail views
 * - timeRange: Time filter for data views
 * - accumulators: Running totals (energy, savings, carbon offset)
 * - minuteData: Complete simulation history for reports
 */

import { create } from 'zustand';

// Node types in the energy system
export type NodeType = 'solar' | 'battery' | 'grid' | 'home' | 'ev1' | 'ev2';

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
  status: 'online' | 'offline' | 'charging' | 'discharging' | 'idle' | 'exporting' | 'importing';
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

// Time range filter options
export type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all';

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

  // System configuration
  systemConfig: {
    solarCapacityKW: number;
    batteryCapacityKWh: number;
    inverterKW: number;
    ev1CapacityKWh: number;
    ev2CapacityKWh: number;
    gridTariff: {
      peakRate: number;
      offPeakRate: number;
    };
  };

  // Actions
  updateNode: (nodeType: NodeType, updates: Partial<EnergyNode>) => void;
  updateFlows: (flows: EnergyFlow[]) => void;
  selectNode: (nodeType: NodeType | null) => void;
  setTimeRange: (range: TimeRange) => void;
  updateAccumulators: (updates: Partial<Accumulators>) => void;
  addMinuteData: (data: MinuteDataPoint) => void;
  setSimulationState: (updates: {
    currentDate?: Date;
    timeOfDay?: number;
    isAutoMode?: boolean;
    simSpeed?: number;
  }) => void;
  updateSystemConfig: (config: Partial<EnergySystemState['systemConfig']>) => void;
  resetSystem: () => void;
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

// Create the store
export const useEnergySystemStore = create<EnergySystemState>((set) => ({
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
    gridTariff: {
      peakRate: 24.31,
      offPeakRate: 14.93,
    },
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

  updateAccumulators: (updates) =>
    set((state) => ({
      accumulators: {
        ...state.accumulators,
        ...updates,
      },
    })),

  addMinuteData: (data) =>
    set((state) => ({
      minuteData: [...state.minuteData, data],
    })),

  setSimulationState: (updates) => set(updates),

  updateSystemConfig: (config) =>
    set((state) => ({
      systemConfig: {
        ...state.systemConfig,
        ...config,
      },
    })),

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
    }),
}));
