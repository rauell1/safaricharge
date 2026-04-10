import { TARIFF_PROFILES, type TariffProfileType } from './tariff-config';

const activeProfile = TARIFF_PROFILES.ev;

function computeBasePlusLevies(profileType: TariffProfileType, highRate: boolean): number {
  const profile = TARIFF_PROFILES[profileType];
  const energyBase = highRate ? profile.energy.highRateBase : profile.energy.lowRateBase;
  return energyBase + profile.energy.fuelEnergyCost + profile.energy.ferfa + profile.energy.infa + profile.energy.ercLevy + profile.energy.wraLevy;
}

export const KPLC_TARIFF = {
  PROFILE: activeProfile,

  // Backward-compatible fields used in the UI/report modal
  HIGH_RATE_BASE: activeProfile.energy.highRateBase,
  LOW_RATE_BASE: activeProfile.energy.lowRateBase,
  FUEL_ENERGY_COST: activeProfile.energy.fuelEnergyCost,
  FERFA: activeProfile.energy.ferfa,
  INFA: activeProfile.energy.infa,
  ERC_LEVY: activeProfile.energy.ercLevy,
  WRA_LEVY: activeProfile.energy.wraLevy,
  VAT_RATE: activeProfile.energy.vatRate,

  PEAK_MORNING_START: activeProfile.peakHours[0]?.start ?? 6,
  PEAK_MORNING_END: activeProfile.peakHours[0]?.end ?? 10,
  PEAK_EVENING_START: activeProfile.peakHours[1]?.start ?? 18,
  PEAK_EVENING_END: activeProfile.peakHours[1]?.end ?? 22,

  getHighRateWithVAT: function(profileType: TariffProfileType = 'ev') {
    return computeBasePlusLevies(profileType, true) * (1 + TARIFF_PROFILES[profileType].energy.vatRate);
  },

  getLowRateWithVAT: function(profileType: TariffProfileType = 'ev') {
    return computeBasePlusLevies(profileType, false) * (1 + TARIFF_PROFILES[profileType].energy.vatRate);
  },

  isPeakTime: function(hour: number, profileType: TariffProfileType = 'ev'): boolean {
    return TARIFF_PROFILES[profileType].peakHours.some(window => hour >= window.start && hour < window.end);
  },

  getRateForTime: function(hour: number, profileType: TariffProfileType = 'ev'): number {
    return this.isPeakTime(hour, profileType) ? this.getHighRateWithVAT(profileType) : this.getLowRateWithVAT(profileType);
  },

  isWeekend: function(dayOfWeek: number): boolean {
    return dayOfWeek === 0 || dayOfWeek === 6;
  },

  getRateForTimeAndDay: function(hour: number, dayOfWeek: number, profileType: TariffProfileType = 'ev'): number {
    const profile = TARIFF_PROFILES[profileType];
    if (profile.weekendOffPeak && this.isWeekend(dayOfWeek)) return this.getLowRateWithVAT(profileType);
    return this.getRateForTime(hour, profileType);
  }
};

// --- EMISSION & SUSTAINABILITY CONSTANTS ---
export const GRID_EMISSION_FACTOR = 0.47; // kgCO2/kWh
export const TREE_CO2_KG_PER_YEAR = 21.77; // kg CO₂ absorbed per tree per year (UNFAO estimate)
export const AVG_CAR_EMISSION_KG_PER_KM = 0.21; // kg CO₂ per km for average petrol car
