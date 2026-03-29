'use client';

import {
  type Accumulators,
  type EnergyFlow,
  type EnergyNode,
  type MinuteDataPoint,
  type NodeType,
} from '@/stores/energySystemStore';

interface DemoEnergyState {
  nodes: Record<NodeType, EnergyNode>;
  flows: EnergyFlow[];
  accumulators: Accumulators;
  minuteData: MinuteDataPoint[];
  currentDate: Date;
}

const DEMO_BATTERY_CAPACITY_KWH = 50;
const DEMO_EV1_CAPACITY_KWH = 80;
const DEMO_EV2_CAPACITY_KWH = 118;
const HALF_HOUR_HOURS = 0.5;
const FEED_IN_RATE = 12; // KES/kWh export credit for demo purposes

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function generateMinuteData(baseDate = new Date('2026-01-02T00:00:00')): MinuteDataPoint[] {
  const points: MinuteDataPoint[] = [];
  let batteryLevel = 68;
  let ev1Soc = 42;
  let ev2Soc = 56;

  for (let i = 0; i < 48; i++) {
    const minutes = i * 30;
    const ts = new Date(baseDate.getTime() + minutes * 60 * 1000);
    const hour = ts.getHours();
    const minute = ts.getMinutes();
    const timeOfDay = hour + minute / 60;

    const solarWave = Math.max(0, Math.sin(((timeOfDay - 6) / 12) * Math.PI));
    const solarKW = Number(((solarWave * 42) + (solarWave > 0 ? 3 : 0)).toFixed(2));

    const homeLoadKW = Number((10 + 3 * Math.sin(((timeOfDay - 7) / 12) * Math.PI) ** 2 + (timeOfDay >= 19 ? 4 : 0)).toFixed(2));
    const ev1LoadKW = timeOfDay >= 18 && timeOfDay <= 21 ? 5 : timeOfDay >= 6 && timeOfDay <= 7 ? 2 : 0;
    const ev2LoadKW = timeOfDay >= 19 && timeOfDay <= 23 ? 3 : 0;

    const totalLoadKW = homeLoadKW + ev1LoadKW + ev2LoadKW;
    let batteryPowerKW = 0;

    if (solarKW > totalLoadKW) {
      const surplus = solarKW - totalLoadKW;
      batteryPowerKW = Math.min(5, surplus * 0.85);
    } else {
      const deficit = totalLoadKW - solarKW;
      batteryPowerKW = -Math.min(4.5, deficit * 0.65);
    }

    const netGridKW = totalLoadKW - solarKW - batteryPowerKW;
    const gridImportKW = netGridKW > 0 ? Number(netGridKW.toFixed(2)) : 0;
    const gridExportKW = netGridKW < 0 ? Number(Math.abs(netGridKW).toFixed(2)) : 0;

    const batteryEnergyKWh = batteryPowerKW * HALF_HOUR_HOURS;
    batteryLevel = clamp(batteryLevel + (batteryEnergyKWh / DEMO_BATTERY_CAPACITY_KWH) * 100, 18, 96);

    const ev1EnergyKWh = ev1LoadKW * HALF_HOUR_HOURS;
    const ev2EnergyKWh = ev2LoadKW * HALF_HOUR_HOURS;
    ev1Soc = clamp(ev1Soc + (ev1EnergyKWh / DEMO_EV1_CAPACITY_KWH) * 100 - 0.04, 35, 100);
    ev2Soc = clamp(ev2Soc + (ev2EnergyKWh / DEMO_EV2_CAPACITY_KWH) * 100 - 0.04, 45, 100);

    const isPeakTime = hour >= 18 || hour < 7;
    const tariffRate = isPeakTime ? 24.31 : 14.93;
    const solarEnergyKWh = solarKW * HALF_HOUR_HOURS;
    const homeLoadKWh = homeLoadKW * HALF_HOUR_HOURS;
    const ev1LoadKWh = ev1EnergyKWh;
    const ev2LoadKWh = ev2EnergyKWh;
    const gridImportKWh = gridImportKW * HALF_HOUR_HOURS;
    const gridExportKWh = gridExportKW * HALF_HOUR_HOURS;
    const savingsKES = solarEnergyKWh * tariffRate + gridExportKWh * FEED_IN_RATE;

    points.push({
      timestamp: ts.toISOString(),
      date: ts.toISOString().slice(0, 10),
      year: ts.getFullYear(),
      month: ts.getMonth() + 1,
      week: Math.ceil(ts.getDate() / 7),
      day: ts.getDate(),
      hour,
      minute,
      solarKW,
      homeLoadKW,
      ev1LoadKW,
      ev2LoadKW,
      batteryPowerKW: Number(batteryPowerKW.toFixed(2)),
      batteryLevelPct: Number(batteryLevel.toFixed(1)),
      gridImportKW,
      gridExportKW,
      ev1SocPct: Number(ev1Soc.toFixed(1)),
      ev2SocPct: Number(ev2Soc.toFixed(1)),
      tariffRate,
      isPeakTime,
      savingsKES: Number(savingsKES.toFixed(2)),
      solarEnergyKWh,
      homeLoadKWh,
      ev1LoadKWh,
      ev2LoadKWh,
      gridImportKWh,
      gridExportKWh,
    });
  }

  return points;
}

function buildAccumulators(minuteData: MinuteDataPoint[]): Accumulators {
  const solar = minuteData.reduce((sum, d) => sum + d.solarEnergyKWh, 0);
  const savings = minuteData.reduce((sum, d) => sum + d.savingsKES, 0);
  const gridImport = minuteData.reduce((sum, d) => sum + d.gridImportKWh, 0);
  const batDischargeKwh = minuteData.reduce(
    (sum, d) => (d.batteryPowerKW < 0 ? sum + Math.abs(d.batteryPowerKW * HALF_HOUR_HOURS) : sum),
    0
  );
  const feedInEarnings = minuteData.reduce((sum, d) => sum + d.gridExportKWh * FEED_IN_RATE, 0);
  const carbonOffset = solar * 0.62; // kg CO2 avoided per kWh

  return {
    solar: Number(solar.toFixed(2)),
    savings: Number((savings + feedInEarnings).toFixed(2)),
    gridImport: Number(gridImport.toFixed(2)),
    carbonOffset: Number(carbonOffset.toFixed(2)),
    batDischargeKwh: Number(batDischargeKwh.toFixed(2)),
    feedInEarnings: Number(feedInEarnings.toFixed(2)),
  };
}

function buildNodes(minuteData: MinuteDataPoint[]): Record<NodeType, EnergyNode> {
  const latest = minuteData[minuteData.length - 1];

  return {
    solar: {
      type: 'solar',
      powerKW: latest.solarKW,
      capacityKW: 12.5,
      status: latest.solarKW > 0 ? 'online' : 'offline',
      efficiency: 0.92,
      temperature: 41,
    },
    battery: {
      type: 'battery',
      powerKW: latest.batteryPowerKW,
      capacityKWh: DEMO_BATTERY_CAPACITY_KWH,
      status: latest.batteryPowerKW >= 0 ? 'charging' : 'discharging',
      soc: latest.batteryLevelPct,
      efficiency: 0.94,
      temperature: 28,
      voltage: 410,
    },
    grid: {
      type: 'grid',
      powerKW: Number((latest.gridImportKW - latest.gridExportKW).toFixed(2)),
      status: 'online',
      voltage: 230,
    },
    home: {
      type: 'home',
      powerKW: Number((latest.homeLoadKW + latest.ev1LoadKW + latest.ev2LoadKW).toFixed(2)),
      status: 'online',
    },
    ev1: {
      type: 'ev1',
      powerKW: latest.ev1LoadKW,
      capacityKWh: DEMO_EV1_CAPACITY_KWH,
      status: latest.ev1LoadKW > 0 ? 'charging' : 'idle',
      soc: latest.ev1SocPct,
    },
    ev2: {
      type: 'ev2',
      powerKW: latest.ev2LoadKW,
      capacityKWh: DEMO_EV2_CAPACITY_KWH,
      status: latest.ev2LoadKW > 0 ? 'charging' : 'idle',
      soc: latest.ev2SocPct,
    },
  };
}

function buildFlows(minuteData: MinuteDataPoint[]): EnergyFlow[] {
  const latest = minuteData[minuteData.length - 1];
  const flows: EnergyFlow[] = [
    {
      from: 'solar',
      to: 'home',
      powerKW: Number(Math.max(0, latest.solarKW - Math.max(latest.gridExportKW, 0) - Math.max(latest.batteryPowerKW, 0)).toFixed(2)),
      active: latest.solarKW > 0,
    },
    {
      from: 'solar',
      to: 'battery',
      powerKW: latest.batteryPowerKW > 0 ? Number(latest.batteryPowerKW.toFixed(2)) : 0,
      active: latest.batteryPowerKW > 0,
    },
    {
      from: 'battery',
      to: 'home',
      powerKW: latest.batteryPowerKW < 0 ? Number(Math.abs(latest.batteryPowerKW).toFixed(2)) : 0,
      active: latest.batteryPowerKW < 0,
    },
    {
      from: 'solar',
      to: 'grid',
      powerKW: latest.gridExportKW,
      active: latest.gridExportKW > 0,
    },
    {
      from: 'grid',
      to: 'home',
      powerKW: latest.gridImportKW,
      active: latest.gridImportKW > 0,
    },
    {
      from: 'grid',
      to: 'battery',
      powerKW: 0,
      active: false,
    },
    {
      from: 'grid',
      to: 'ev1',
      powerKW: latest.ev1LoadKW,
      active: latest.ev1LoadKW > 0,
    },
    {
      from: 'grid',
      to: 'ev2',
      powerKW: latest.ev2LoadKW,
      active: latest.ev2LoadKW > 0,
    },
  ];

  return flows;
}

export function buildDemoEnergyState(): DemoEnergyState {
  const minuteData = generateMinuteData();
  const accumulators = buildAccumulators(minuteData);
  const nodes = buildNodes(minuteData);
  const flows = buildFlows(minuteData);
  const currentDate = new Date(minuteData[minuteData.length - 1].timestamp);

  return {
    nodes,
    flows,
    accumulators,
    minuteData,
    currentDate,
  };
}
