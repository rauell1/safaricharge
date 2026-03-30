// --- CONFIGURATION - Kenya Power Commercial Tariff (E-Mobility) ---
// Based on actual KPLC bill for ROAM ELECTRIC LIMITED - February 2026
// Peak Hours: 6:00-10:00 (morning) and 18:00-22:00 (evening)
// Off-Peak Hours: All other times including weekends

export const KPLC_TARIFF = {
  // Base energy rates (KES/kWh)
  HIGH_RATE_BASE: 16.00,      // Peak consumption rate
  LOW_RATE_BASE: 8.00,        // Off-peak consumption rate

  // Additional charges per kWh (from KPLC bill)
  FUEL_ENERGY_COST: 3.10,     // Fuel cost adjustment
  FERFA: 1.2061,              // Forex Exchange Adjustment
  INFA: 0.46,                 // Inflation Adjustment
  ERC_LEVY: 0.08,             // Energy Regulatory Commission Levy
  WRA_LEVY: 0.0121,           // Water Resources Authority Levy
  VAT_RATE: 0.16,             // Value Added Tax (16%)

  // Peak hours definition (24-hour format)
  PEAK_MORNING_START: 6,
  PEAK_MORNING_END: 10,
  PEAK_EVENING_START: 18,
  PEAK_EVENING_END: 22,

  // Calculate total rate including all charges
  getHighRateWithVAT: function() {
    const base = this.HIGH_RATE_BASE + this.FUEL_ENERGY_COST + this.FERFA +
                 this.INFA + this.ERC_LEVY + this.WRA_LEVY;
    return base * (1 + this.VAT_RATE);
  },

  getLowRateWithVAT: function() {
    const base = this.LOW_RATE_BASE + this.FUEL_ENERGY_COST + this.FERFA +
                 this.INFA + this.ERC_LEVY + this.WRA_LEVY;
    return base * (1 + this.VAT_RATE);
  },

  // Check if current time is peak hours
  isPeakTime: function(hour: number): boolean {
    return (hour >= this.PEAK_MORNING_START && hour < this.PEAK_MORNING_END) ||
           (hour >= this.PEAK_EVENING_START && hour < this.PEAK_EVENING_END);
  },

  // Get applicable rate based on time
  getRateForTime: function(hour: number): number {
    return this.isPeakTime(hour) ? this.getHighRateWithVAT() : this.getLowRateWithVAT();
  },

  // Weekends are entirely off-peak per KPLC commercial E-Mobility tariff
  isWeekend: function(dayOfWeek: number): boolean {
    return dayOfWeek === 0 || dayOfWeek === 6;
  },

  // Get applicable rate accounting for both time-of-use and day-of-week
  getRateForTimeAndDay: function(hour: number, dayOfWeek: number): number {
    if (this.isWeekend(dayOfWeek)) return this.getLowRateWithVAT();
    return this.getRateForTime(hour);
  }
};

// --- EMISSION & SUSTAINABILITY CONSTANTS ---
// Average Kenya grid emission factor (mix of hydro + thermal generation)
export const GRID_EMISSION_FACTOR = 0.47; // kgCO2/kWh
export const TREE_CO2_KG_PER_YEAR = 21.77; // kg CO₂ absorbed per tree per year (UNFAO estimate)
export const AVG_CAR_EMISSION_KG_PER_KM = 0.21; // kg CO₂ per km for average petrol car
