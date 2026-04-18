export type SystemConfig = {
  mode: 'auto' | 'advanced';
  panelCount: number;
  panelWatt: number;
  inverterKw: number;
  inverterUnits: number;
  batteryKwh: number;
  maxChargeKw: number;
  maxDischargeKw: number;
  evChargerKw: number;
  loadScale: number;
  loadProfile: 'residential' | 'commercial' | 'industrial';
  evCommuterScale: number;
  evFleetScale: number;
  homeLoadEnabled: boolean;
  homeLoadKw: number;
  commercialLoadEnabled: boolean;
  commercialLoadKw: number;
  industrialLoadEnabled: boolean;
  industrialLoadKw: number;
  accessoryLoadKw: number;
  accessoryScale: number;
  performanceRatio: number;
  shadingLossPct: number;
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
  gridFrequencyHz?: number;
  gridLineLossKw?: number;
  cumulativeSavingsKes?: number;
  // Battery engine outputs
  batteryHealthPct?: number;
  batteryCycles?: number;
  batteryTempC?: number;
  batteryStrategy?: string;
  // Inverter outputs
  inverterEfficiency?: number;
  inverterClippingKw?: number;
  acCableLossKw?: number;
  // EV fleet outputs
  evFleetLoadKw?: number;
  evV2gKw?: number;
  evSmartDeferralKw?: number;
  // Grid outputs
  gridFrequencyHz?: number;
  gridLineLossKw?: number;
  // Financial (rolling)
  cumulativeSavingsKes?: number;
  lcoeRolling?: number;
};
