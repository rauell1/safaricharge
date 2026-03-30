export type SystemConfig = {
  mode: 'auto' | 'advanced';
  panelCount: number;
  panelWatt: number;
  inverterKw: number;
  batteryKwh: number;
  maxChargeKw: number;
  maxDischargeKw: number;
  evChargerKw: number;
  loadScale: number;
  evCommuterScale: number;
  evFleetScale: number;
};

export type DerivedSystemConfig = SystemConfig & { pvCapacityKw: number };

export type SimulationMinuteRecord = {
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
};
