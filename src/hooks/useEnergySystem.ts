/**
 * Custom hooks for accessing energy system state
 *
 * These hooks provide convenient access to the energy system store
 * and handle common patterns like node selection and data filtering.
 */

import { useEnergySystemStore, type NodeType, type EnergyNode } from '@/stores/energySystemStore';
import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';

/**
 * Get all energy system data
 */
export function useEnergyData() {
  return useEnergySystemStore();
}

/**
 * Get a specific energy node
 */
export function useEnergyNode(nodeType: NodeType): EnergyNode {
  return useEnergySystemStore((state) => state.nodes[nodeType]);
}

/**
 * Get multiple nodes at once
 */
export function useEnergyNodes(nodeTypes: NodeType[]): Record<NodeType, EnergyNode> {
  return useEnergySystemStore(
    useShallow((state) => {
      const nodes: Record<string, EnergyNode> = {};
      nodeTypes.forEach((type) => {
        nodes[type] = state.nodes[type];
      });
      return nodes as Record<NodeType, EnergyNode>;
    })
  );
}

/**
 * Get currently selected node
 */
export function useSelectedNode() {
  const selectedNode = useEnergySystemStore((state) => state.selectedNode);
  const nodes = useEnergySystemStore((state) => state.nodes);

  return useMemo(() => {
    if (!selectedNode) return null;
    return {
      type: selectedNode,
      data: nodes[selectedNode],
    };
  }, [selectedNode, nodes]);
}

/**
 * Get node selection actions
 */
export function useNodeSelection() {
  const { selectedNode, selectNode } = useEnergySystemStore(
    useShallow((state) => ({
      selectedNode: state.selectedNode,
      selectNode: state.selectNode,
    }))
  );

  return {
    selectedNode,
    selectNode,
    clearSelection: () => selectNode(null),
    isSelected: (nodeType: NodeType) => selectedNode === nodeType,
  };
}

/**
 * Get energy flows
 */
export function useEnergyFlows() {
  return useEnergySystemStore((state) => state.flows);
}

/**
 * Get active flows for a specific node
 */
export function useNodeFlows(nodeType: NodeType) {
  const flows = useEnergySystemStore((state) => state.flows);

  return useMemo(() => ({
    inbound: flows.filter((f) => f.to === nodeType && f.active),
    outbound: flows.filter((f) => f.from === nodeType && f.active),
  }), [flows, nodeType]);
}

/**
 * Get system accumulators (totals)
 */
export function useAccumulators() {
  return useEnergySystemStore((state) => state.accumulators);
}

/**
 * Get simulation state
 */
export function useSimulationState() {
  return useEnergySystemStore(
    useShallow((state) => ({
      currentDate: state.currentDate,
      timeOfDay: state.timeOfDay,
      isAutoMode: state.isAutoMode,
      simSpeed: state.simSpeed,
      setSimulationState: state.setSimulationState,
    }))
  );
}

/**
 * Get time range filter
 */
export function useTimeRange() {
  return useEnergySystemStore(
    useShallow((state) => ({
      timeRange: state.timeRange,
      setTimeRange: state.setTimeRange,
    }))
  );
}

/**
 * Get system configuration
 */
export function useSystemConfig() {
  return useEnergySystemStore(
    useShallow((state) => ({
      config: state.systemConfig,
      updateConfig: state.updateSystemConfig,
    }))
  );
}

/**
 * Get minute data filtered by time range
 */
export function useMinuteData(timeRange?: 'today' | 'week' | 'month' | 'year' | 'all') {
  const minuteData = useEnergySystemStore((state) => state.minuteData);
  const storeTimeRange = useEnergySystemStore((state) => state.timeRange);
  const currentDate = useEnergySystemStore((state) => state.currentDate);

  const range = timeRange || storeTimeRange;

  return useMemo(() => {
    if (range === 'all') return minuteData;

    const now = currentDate;
    const cutoffDate = new Date(now);

    switch (range) {
      case 'today':
        cutoffDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        break;
      case 'year':
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
        break;
    }

    return minuteData.filter((d) => new Date(d.timestamp) >= cutoffDate);
  }, [minuteData, range, currentDate]);
}

/**
 * Get aggregated statistics for a time range
 */
export function useEnergyStats(timeRange?: 'today' | 'week' | 'month' | 'year' | 'all') {
  const data = useMinuteData(timeRange);

  return useMemo(() => {
    if (data.length === 0) {
      return {
        totalSolarKWh: 0,
        totalConsumptionKWh: 0,
        totalGridImportKWh: 0,
        totalGridExportKWh: 0,
        totalSavingsKES: 0,
        avgBatterySOC: 0,
        peakPowerKW: 0,
      };
    }

    const totalSolarKWh = data.reduce((sum, d) => sum + d.solarEnergyKWh, 0);
    const totalConsumptionKWh = data.reduce((sum, d) => sum + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh, 0);
    const totalGridImportKWh = data.reduce((sum, d) => sum + d.gridImportKWh, 0);
    const totalGridExportKWh = data.reduce((sum, d) => sum + d.gridExportKWh, 0);
    const totalSavingsKES = data.reduce((sum, d) => sum + d.savingsKES, 0);
    const avgBatterySOC = data.reduce((sum, d) => sum + d.batteryLevelPct, 0) / data.length;

    let peakPowerKW = 0;
    for (const d of data) {
      if (d.solarKW > peakPowerKW) peakPowerKW = d.solarKW;
    }

    return {
      totalSolarKWh,
      totalConsumptionKWh,
      totalGridImportKWh,
      totalGridExportKWh,
      totalSavingsKES,
      avgBatterySOC,
      peakPowerKW,
    };
  }, [data]);
}
