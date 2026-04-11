'use client';

import { useMemo } from 'react';
import { useEnergySystemStore } from '@/stores/energySystemStore';

export interface LiveAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
}

/**
 * Derives a live alert list from the current energy system store state.
 * No static defaults — every alert reflects real simulation conditions.
 */
export function useLiveAlerts(): LiveAlert[] {
  const nodes        = useEnergySystemStore((s) => s.nodes);
  const accumulators = useEnergySystemStore((s) => s.accumulators);
  const minuteData   = useEnergySystemStore((s) => s.minuteData);
  const systemConfig = useEnergySystemStore((s) => s.systemConfig);

  return useMemo(() => {
    const alerts: LiveAlert[] = [];
    const now = new Date();

    // ── Battery alerts ───────────────────────────────────────────────────────
    const battery = nodes.battery;
    const batSoc  = battery.soc ?? 50;

    if (battery.status === 'offline') {
      alerts.push({
        id:        'bat-offline',
        type:      'error',
        title:     'Battery Offline',
        message:   'Battery system is not responding. Check inverter connection.',
        timestamp: now,
      });
    } else if (batSoc < 10) {
      alerts.push({
        id:        'bat-critical',
        type:      'error',
        title:     'Battery Critical',
        message:   `Battery at ${batSoc.toFixed(0)}% — grid import imminent unless solar recovers.`,
        timestamp: now,
      });
    } else if (batSoc < 20) {
      alerts.push({
        id:        'bat-low',
        type:      'warning',
        title:     'Battery Low',
        message:   `Battery at ${batSoc.toFixed(0)}%. Consider reducing EV charging to conserve reserve.`,
        timestamp: now,
      });
    } else if (batSoc > 95 && battery.status === 'charging') {
      alerts.push({
        id:        'bat-full',
        type:      'success',
        title:     'Battery Full',
        message:   `Battery at ${batSoc.toFixed(0)}%. Excess solar is now being exported to the grid.`,
        timestamp: now,
      });
    }

    // ── Solar alerts ─────────────────────────────────────────────────────────
    const solar         = nodes.solar;
    const solarKW       = solar.powerKW ?? 0;
    const solarCapacity = systemConfig.solarCapacityKW;
    const solarEffPct   = solarCapacity > 0 ? (solarKW / solarCapacity) * 100 : 0;

    if (solar.status === 'offline') {
      alerts.push({
        id:        'solar-offline',
        type:      'error',
        title:     'Solar Array Offline',
        message:   'No solar output detected. Check panel connections and inverter status.',
        timestamp: now,
      });
    } else if (solarKW > 0 && solarEffPct < 40) {
      alerts.push({
        id:        'solar-low-eff',
        type:      'warning',
        title:     'Low Solar Output',
        message:   `Array producing ${solarKW.toFixed(1)} kW (${solarEffPct.toFixed(0)}% of capacity). Cloud cover or soiling detected.`,
        timestamp: now,
      });
    } else if (solarKW >= solarCapacity * 0.9) {
      alerts.push({
        id:        'solar-peak',
        type:      'info',
        title:     'Peak Solar Generation',
        message:   `Array at ${solarKW.toFixed(1)} kW — near full capacity. Optimal generation window active.`,
        timestamp: now,
      });
    }

    // ── Grid alerts ──────────────────────────────────────────────────────────
    const grid        = nodes.grid;
    const latestPoint = minuteData[minuteData.length - 1];
    const gridImportKW  = latestPoint?.gridImportKW  ?? 0;
    const gridExportKW  = latestPoint?.gridExportKW  ?? 0;
    const isPeak        = latestPoint?.isPeakTime    ?? false;

    if (grid.status === 'offline') {
      alerts.push({
        id:        'grid-offline',
        type:      'error',
        title:     'Grid Disconnected',
        message:   'Grid connection lost. System is running on solar + battery only.',
        timestamp: now,
      });
    } else if (isPeak && gridImportKW > 2) {
      alerts.push({
        id:        'grid-peak-import',
        type:      'warning',
        title:     'Peak-Hour Grid Import',
        message:   `Drawing ${gridImportKW.toFixed(1)} kW from grid during peak tariff hours. Costs elevated.`,
        timestamp: now,
      });
    } else if (gridExportKW > 1) {
      alerts.push({
        id:        'grid-export',
        type:      'success',
        title:     'Grid Export Active',
        message:   `Exporting ${gridExportKW.toFixed(1)} kW to grid. Earning feed-in revenue.`,
        timestamp: now,
      });
    }

    // ── EV alerts ────────────────────────────────────────────────────────────
    const ev1Soc = nodes.ev1.soc ?? 60;
    const ev2Soc = nodes.ev2.soc ?? 50;

    if (isPeak && (nodes.ev1.powerKW > 0 || nodes.ev2.powerKW > 0)) {
      const evKW = nodes.ev1.powerKW + nodes.ev2.powerKW;
      alerts.push({
        id:        'ev-peak-charging',
        type:      'warning',
        title:     'EV Charging During Peak Hours',
        message:   `${evKW.toFixed(1)} kW used for EV charging at peak tariff. Consider scheduling for off-peak.`,
        timestamp: now,
      });
    } else if (ev1Soc < 15 || ev2Soc < 15) {
      const which = ev1Soc < 15 && ev2Soc < 15 ? 'EV1 & EV2' : ev1Soc < 15 ? 'EV1' : 'EV2';
      alerts.push({
        id:        'ev-low',
        type:      'warning',
        title:     `${which} Battery Low`,
        message:   `${which} state of charge is critically low. Plug in to avoid range anxiety.`,
        timestamp: now,
      });
    }

    // ── Savings milestone ────────────────────────────────────────────────────
    const totalSavings = accumulators.savings;
    if (totalSavings >= 10000) {
      alerts.push({
        id:        `savings-milestone-${Math.floor(totalSavings / 10000)}`,
        type:      'success',
        title:     'Savings Milestone Reached',
        message:   `Total energy savings have exceeded KES ${(Math.floor(totalSavings / 10000) * 10000).toLocaleString()}. Great performance!`,
        timestamp: now,
      });
    }

    // Sort: errors first, then warnings, then info/success
    const order: Record<LiveAlert['type'], number> = { error: 0, warning: 1, info: 2, success: 3 };
    return alerts.sort((a, b) => order[a.type] - order[b.type]);
  }, [nodes, accumulators, minuteData, systemConfig]);
}
