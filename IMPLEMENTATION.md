# SafariCharge Implementation Reference

This document serves as a reference point for understanding the SafariCharge solar simulation system. It tracks key improvements, calculations, and architectural decisions.

**Last Updated:** 2026-04-10
**Status:** Active Development
**Branch:** `claude/average-energy-production-calculation`

---

## Table of Contents

1. [Overview](#overview)
2. [Solar Panel Calculations](#solar-panel-calculations)
3. [Financial Model](#financial-model)
4. [Location Data & APIs](#location-data--apis)
5. [System Parameters](#system-parameters)
6. [Physics Engine](#physics-engine)
7. [Known Issues & Future Work](#known-issues--future-work)

---

## Overview

SafariCharge is a Next.js 16 + React 19 energy management dashboard that simulates solar power systems for the Kenya market. It provides real-time simulation, financial recommendations, and detailed energy analytics.

### Core Files

- **src/app/page.tsx** (2400+ lines) - Main simulation UI and physics engine
- **src/lib/recommendation-engine.ts** - Hardware sizing and financial calculations
- **src/lib/nasa-power-api.ts** - NASA POWER weather data integration
- **src/lib/config.ts** - System constants and configuration
- **src/components/RecommendationComponents.tsx** - Location selector and recommendation UI

---

## Solar Panel Calculations

### The 9000 Panels Bug - FIXED ✅

**Problem:** Previous formula resulted in unrealistic recommendations (e.g., 9000 panels for normal loads)

**Root Causes:**
- Missing system derating factors
- Using 85% efficiency instead of realistic 75%
- Not accounting for real-world losses properly
- Possible unit conversion issues (W vs kW)

**Corrected Formula:**

```typescript
// System Efficiency Breakdown:
// - Inverter losses: 5%
// - Temperature losses: 10% (Kenya climate)
// - Soiling/dust: 5%
// - Cable losses: 2%
// - Mismatch losses: 2%
// Total System Efficiency: 75%

function calculateSolarCapacity(dailyConsumptionKwh, avgDailySolarKwhM2) {
  const targetGeneration = dailyConsumptionKwh * 1.10; // 10% buffer
  const systemEfficiency = 0.75; // Conservative realistic value
  const peakSunHours = avgDailySolarKwhM2;

  return targetGeneration / (peakSunHours * systemEfficiency);
}
```

**Example Calculation:**

```
Load = 30 kWh/day
Panel = 550W
Peak Sun Hours (Kenya avg) = 5.5
System Efficiency = 0.75

Panel Output per day = 0.55 kW × 5.5 h × 0.75 = 2.27 kWh/day
Required Panels = 30 / 2.27 ≈ 13 panels
```

**Location:** `src/lib/recommendation-engine.ts:272-307`

---

### The Inflated Recommendations Bug - FIXED ✅

**Problem:** System recommendations showing unrealistic values (15 MW systems, 28,000 panels, 85,000 kWh batteries costing billions of KES) when viewing multi-day simulation data.

**Root Cause:** The `createLoadProfileFromSimulation()` function was summing ALL energy across all simulation timesteps and treating it as "daily consumption" instead of calculating the AVERAGE daily consumption.

**Example of the Bug:**
```
Simulation: 730 days (2 years)
Real daily load: 150 kWh/day
Total energy across 730 days: 109,500 kWh

BUG: dailyConsumption = 109,500 kWh (wrong!)
CORRECT: dailyConsumption = 109,500 / 730 = 150 kWh/day

Result of bug:
- System sized for 109,500 kWh "daily" load
- Solar: 109,500 / (5.5 × 0.75) ≈ 26,545 kW (instead of 36 kW)
- Inflated by 730x!
```

**The Fix:**

```typescript
// BEFORE (WRONG):
const totalLoad = simulationData.reduce(
  (sum, d) => sum + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh, 0
);
const dailyConsumption = totalLoad; // ❌ Treats total as daily!

// AFTER (CORRECT):
const totalLoad = simulationData.reduce(
  (sum, d) => sum + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh, 0
);

// Calculate number of days from timesteps (420 timesteps per day)
const TIMESTEPS_PER_DAY = 420;
const numberOfDays = Math.max(1, Math.round(simulationData.length / TIMESTEPS_PER_DAY));
const dailyConsumption = totalLoad / numberOfDays; // ✅ Average per day!
```

**Additional Fixes Applied:**

1. **EV Load Typo Bug** - Fixed night power calculation that was counting `ev2LoadKWh` twice and ignoring `ev1LoadKWh`:
   ```typescript
   // BEFORE:
   nightData.reduce((sum, d) => sum + d.homeLoadKWh + d.ev2LoadKWh + d.ev2LoadKWh, 0)

   // AFTER:
   nightData.reduce((sum, d) => sum + d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh, 0)
   ```

2. **Sanity Checks** - Added validation to warn about unrealistic system sizes:
   - Alert if solar capacity > 1 MW (suggests calculation error)
   - Alert if battery capacity > 5 MWh (suggests calculation error)
   - Alert if total investment > 1 billion KES (suggests data issue)
   - Warnings are logged to console and added to recommendation notes

3. **PDF Report Integration** - Recommendations now included in formal PDF reports as Section 9 with:
   - Hardware specifications (solar, battery, inverter)
   - Financial projections (25-year ROI, payback period, net savings)
   - Performance metrics (daily generation, grid reduction, CO₂ savings)
   - Important notes and warnings

**Impact:** System recommendations are now accurate and investor-grade, showing realistic system sizes regardless of simulation duration.

**Location:** `src/lib/recommendation-engine.ts:476-533`, `src/app/page.tsx:2372-2379`, `src/app/api/formal-report/route.ts:62-102, 1105-1243`

**Commit:** `d7d7b5a` (2026-03-28)

---

### The Battery & Inverter Oversizing Bug - FIXED ✅

**Problem:** Battery and inverter capacity calculations were incorrectly sized based on cumulative multi-day data instead of single-day demand patterns, leading to oversized and unnecessarily expensive systems.

**Root Cause:** The `timeStepHours` calculation in `createLoadProfileFromSimulation()` was using `24 / simulationData.length` instead of `24 / TIMESTEPS_PER_DAY`, causing peak power and average power calculations to be wrong for multi-day simulations.

**Example of the Bug:**
```
Simulation: 730 days (306,600 timesteps)
Real peak power: 40 kW
Real avg night power: 5 kW

BUG: timeStepHours = 24 / 306,600 ≈ 0.000078 hours
     peakPower = energyKWh / 0.000078 ≈ HUGE VALUE (wrong!)
     avgNightPower = totalNightEnergy / nightSteps / 0.000078 ≈ HUGE VALUE (wrong!)

Result of bug:
- Inverter sized for inflated peak: 40,000 kW instead of 40 kW (1000x!)
- Battery sized for inflated night load: 60,000 kWh instead of 60 kWh (1000x!)
```

**The Fix:**

```typescript
// BEFORE (WRONG):
const timeStepHours = 24 / simulationData.length; // ❌ Wrong for multi-day!
const peakPower = Math.max(
  ...simulationData.map(d => (d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh) / timeStepHours)
);

// AFTER (CORRECT):
const TIMESTEPS_PER_DAY = 420;
const timeStepHours = 24 / TIMESTEPS_PER_DAY; // ✅ Consistent ~3.43 minutes per step
const peakPower = Math.max(
  ...simulationData.map(d => (d.homeLoadKWh + d.ev1LoadKWh + d.ev2LoadKWh) / timeStepHours)
);
```

**Impact:**
- **Inverter Sizing:** Now correctly based on single-day peak power demand with 25% safety margin
- **Battery Sizing:** Now correctly based on single-night consumption or autonomy days of average consumption
- **Financial Analysis:** Recommendations now reflect properly-sized systems with accurate ROI and payback calculations

**How Battery Sizing Works (Post-Fix):**
```typescript
// Battery capacity = max(nightConsumption * 1.3, dailyConsumption * autonomyDays)
// Capped at 2x daily consumption for cost-effectiveness

nightConsumption = avgNightPowerKw * 12 hours
minCapacity = nightConsumption * 1.3  // 1 night + 30% margin
targetCapacity = dailyConsumptionKwh * autonomyDays  // Full autonomy
batteryCapacity = min(max(minCapacity, targetCapacity), dailyConsumption * 2)
```

**How Inverter Sizing Works (Post-Fix):**
```typescript
// Inverter capacity = peak power + 25% safety margin
// Rounded to nearest 0.5 kW

inverterKw = ceil(peakPower * 1.25 * 2) / 2
```

**Location:** `src/lib/recommendation-engine.ts:550-567`

**Commit:** Current (2026-03-28)

---

## Financial Model

### Realistic Market Rates (2026 Kenya)

**Updated Pricing:**

```typescript
const PRICING = {
  SOLAR_PER_WATT_KES: 65,           // ↑ from 55 (Tier-1 panels)
  LIFEPO4_PER_KWH_KES: 55000,       // ↑ from 45000 (realistic 2026 prices)
  LEAD_ACID_PER_KWH_KES: 22000,     // ↑ from 18000
  HYBRID_INVERTER_PER_KW_KES: 42000,// ↑ from 35000
  GRID_TIE_INVERTER_PER_KW_KES: 28000, // ↑ from 22000
  INSTALLATION_PCT: 0.20,            // ↑ from 0.15 (includes permits)
  MAINTENANCE_ANNUAL_PCT: 0.02,      // ↑ from 0.015 (2% annually)

  // Battery replacement cycles
  LIFEPO4_REPLACEMENT_YEARS: 10,
  LEAD_ACID_REPLACEMENT_YEARS: 5,

  // Tariff escalation
  TARIFF_ESCALATION_ANNUAL_PCT: 0.06, // 6% annual increase

  // Actual KPLC rates (from real bills)
  KPLC_PEAK_RATE_KES: 24.3,
  KPLC_OFFPEAK_RATE_KES: 14.9,
};
```

### 25-Year ROI Calculation

The financial model now includes:

1. **Battery Replacement Costs** - Automatically adds replacement costs at years 5, 10, 15, 20 (Lead-Acid) or 10, 20 (LiFePO4)
2. **Tariff Escalation** - 6% annual electricity price increase
3. **Maintenance Costs** - 2% of initial investment annually
4. **Realistic System Efficiency** - 75% (down from 85%)

**Formula:**

```typescript
for (let year = 1; year <= 25; year++) {
  currentAnnualSavings *= 1.06; // Tariff escalation
  cumulativeCosts += totalInvestment * 0.02; // Maintenance

  if (year % replacementYears === 0) {
    cumulativeCosts += batteryCost; // Replace batteries
  }

  cumulativeSavings += currentAnnualSavings;
}

netSavings25Years = cumulativeSavings - cumulativeCosts;
roi25Years = (netSavings25Years / totalInvestment) * 100;
```

**Location:** `src/lib/recommendation-engine.ts:76-233`

### Formal Report Alignment ✅

- The PDF report's **Financial Analysis (Section 6)** now pulls CapEx, monthly/annual savings, payback, 25-year ROI, and 25-year net savings directly from the recommendation engine so it mirrors the system recommendation for the current simulation. If no recommendation accompanies the request, it falls back to simulation-derived savings with a conservative default CapEx.
- Payback is labelled **"Not viable"** when the computed period exceeds 40 years or savings are non-positive, preventing misleading 99-year values.

---

## Location Data & APIs

### Multi-API Architecture ✅

SafariCharge now uses a resilient multi-API approach with automatic fallback:

```
NASA POWER API → Open-Meteo API → Fallback Estimates
```

**NASA POWER API** (Primary)
- 30-year climatology data
- Global coverage
- Free, no API key required
- URL: `https://power.larc.nasa.gov/api/temporal/monthly/point`

**Open-Meteo API** (Secondary - Meteonorm Alternative)
- Historical weather archive
- Higher resolution than NASA
- Free, no API key required
- URL: `https://archive-api.open-meteo.com/v1/archive`

**Fallback**
- Latitude-based estimates inside `fetchSolarData` when NASA API is unavailable
- Uses Kenya seasonal patterns and peak sun hour approximations
- Always available without network access

**Implementation:**

```typescript
// Fetch NASA POWER data with built-in fallback if the API fails
const data = await fetchSolarData(lat, lon, name);
```

**UI Indicator:** Source is fixed to NASA POWER in the header and recommendation panels

**Files:**
- `src/lib/nasa-power-api.ts` - NASA integration and fallback logic
- `src/components/RecommendationComponents.tsx` - UI integration

### Dynamic Location in Simulation ✅

**Problem:** Simulation was hardcoded to Nairobi coordinates regardless of dropdown selection

**Solution:**
1. Updated `getSeasonalPeakHour(month, latitude)` to accept latitude parameter
2. Updated `getPanelTempEffect(irradFraction, month, monthlyTemps)` to use dynamic temperature data
3. Modified `PhysicsEngine.generateDayScenario()` to accept and use `solarData` parameter
4. Passed `solarData` to all simulation calls (3 locations in code)

**Verification:**
- Select different cities (Nairobi, Turkana, Mombasa)
- Observe different solar generation patterns
- Check data source indicator updates

**Location:** `src/app/page.tsx:95-108, 184-201, 255, 1650, 1711, 1767`

---

## System Parameters

### Current System Specifications

**From `src/lib/config.ts`:**

```typescript
// Solar System
PV_CAPACITY_KW = 50.0 kW
INVERTER_CAPACITY_KW = 48.0 kW
BATTERY_CAPACITY_KWH = 60.0 kWh
BATTERY_ROUND_TRIP_EFFICIENCY = 0.96

// EV Charging
EV_CHARGER_RATE_KW = 22.0 kW (Level 2)
MAX_BATTERY_CHARGE_RATE_KW = 30.0 kW
MAX_BATTERY_DISCHARGE_RATE_KW = 40.0 kW

// Physics
PANEL_TEMP_COEFFICIENT_PER_DEG_C = -0.005 (-0.5%/°C)
SOILING_LOSS_PER_DAY = 0.005 (0.5% per day)
SOILING_MIN_FACTOR = 0.70 (30% max loss)

// Grid
GRID_EMISSION_FACTOR_KG_CO2_PER_KWH = 0.47
```

### Future: Adjustable Parameters UI 🚧

**Status:** TODO - Not yet implemented

**Planned Features:**
- Adjustable PV capacity (kW)
- Adjustable number of panels
- Adjustable panel wattage (e.g., 400W, 550W, 600W)
- Adjustable inverter size (kW)
- Adjustable battery capacity (kWh)
- Adjustable system voltage (12V, 24V, 48V)
- Adjustable house load (kWh/day)
- Optional diesel generator backup
- Optional EV charging integration

**Implementation Approach:**
1. Create `SystemConfigPanel` component
2. Add state for all adjustable parameters
3. Pass parameters to PhysicsEngine and recommendation engine
4. Update all hardcoded constants to use state values
5. Add parameter validation and reasonable limits

---

## Physics Engine

### 2026-04 update: NASA-driven PV baseline + finance metrics

- Added `buildHourlyIrradianceProfile()` in `src/lib/nasa-power-api.ts` to convert monthly NASA POWER daily climatology (kWh/m²/day) into an hourly irradiance profile whose daily integral is conserved.
- Updated both `src/simulation/solarEngine.ts` and `src/lib/physics-engine.ts` to consume NASA-derived irradiance profiles when available, with weather/cloud modifiers applied multiplicatively.
- Updated panel temperature treatment to a NOCT-style approximation:
  - \(T_{cell} = T_{ambient} + \frac{NOCT - 20}{800} \cdot G\)
  - with \(G\) as irradiance in W/m² and module performance derate via temperature coefficient.
- Added finance metrics in recommendation outputs:
  - NPV (default 12% discount),
  - IRR (iterative solve),
  - LCOE (discounted lifecycle cost / discounted lifecycle energy).
- Externalized tariff profiles into `src/lib/tariff-config.ts` with metadata (`version`, `effectiveFrom`, `sourceUrl`) and refactored `src/lib/tariff.ts` to derive effective rates from profile data.

### Reference model lineage

- pvlib model chain inspiration (equations/methods mirrored in simplified TS form): solar geometry/transposition/temperature and DC→AC loss staging.
- NREL SAM methodology inspiration for financial structure (year-0 CAPEX + annual OPEX/cashflow discounting).

Note: current implementation remains "SAM-lite" and still requires benchmark calibration for investment-grade claims.

### Simulation Architecture

**Time Steps:** 420 steps per day (one step every ~3.4 minutes)

**Core Physics Loop:**

```typescript
PhysicsEngine.calculateInstant(
  timeOfDay,           // 0-24 hours
  prevBatteryKwh,      // Battery state
  prevEv1Soc,          // EV 1 state of charge
  prevEv2Soc,          // EV 2 state of charge
  scenario,            // Day scenario (weather, loads, schedules)
  evSpecs,             // EV specifications
  cloudNoise,          // Brownian motion for realistic clouds
  batteryHealth,       // Degradation factor (0-1)
  timeStep,            // Delta time (hours)
  priorityMode         // 'load', 'battery', 'export', 'auto'
);
```

### Solar Generation Model

```typescript
// Gaussian solar curve with seasonal peak adjustment
if (timeOfDay > 6.2 && timeOfDay < 18.8) {
  const width = 6 + 2 * Math.cos(((month - 7) / 12) * 2 * Math.PI);
  const irradFraction = Math.exp(-Math.pow(t - peakHour, 2) / width);

  // Apply derating factors
  const tempEffect = getPanelTempEffect(irradFraction, month, monthlyTemps);
  const weatherFactor = getSc enarioWeatherFactor(); // 1.0, 0.6, or 0.2
  const soilingFactor = getCurrentSoilingFactor(); // 0.70-1.0

  solar = PV_CAPACITY * irradFraction * weatherFactor * soilingFactor * tempEffect;
}
```

### Energy Management Strategy

**Priority Modes:**
- **load** - Serve house/EV loads first, then charge battery, then export
- **battery** - Charge battery first, then loads, then export
- **export** - Export to grid (maximizes feed-in earnings)
- **auto** - Smart mode: battery priority when SOC < 40%, load priority otherwise

**Power Flow Logic:**

```
Solar Generation
  ↓
1. Serve immediate loads (house + EV charging)
2. Charge battery (up to max charge rate)
3. Export surplus to grid
  ↓
If solar insufficient:
  ↓
1. Discharge battery (respecting reserve)
2. Import from grid if needed
```

**Location:** `src/app/page.tsx:231-450 (calculateInstant function)`

---

## Known Issues & Future Work

### Completed ✅

- [x] Fix panel calculation formula (9000 panels bug)
- [x] Add realistic financial model with battery replacement
- [x] Integrate Open-Meteo API as Meteonorm alternative
- [x] Remove hardcoded Nairobi values from simulation
- [x] Use dynamic location data in physics engine
- [x] Add data source indicator in UI

### In Progress 🚧

- [ ] Make system parameters adjustable in UI
- [ ] Add diesel generator backup support
- [ ] Enhanced EV charging controls (scheduled charging, V2G priority)

### Planned 📋

- [ ] Add system sizing wizard (guided setup)
- [ ] Implement plane-of-array (POA) irradiance conversion (currently uses GHI)
- [ ] Add shading analysis tool
- [ ] Integrate real-time electricity tariff API
- [ ] Add NPV and IRR calculations to financial model
- [ ] Support for multiple load profiles (residential, commercial, industrial)
- [ ] Battery degradation visualization over 25 years
- [ ] Solar panel degradation (0.5-0.7% annually)
- [ ] Roof space calculator

### Technical Debt 💳

- **Code organization:** Main page.tsx is 2400+ lines - consider splitting
- **Type safety:** Some `any` types in physics engine
- **Testing:** No automated tests for calculation accuracy
- **Performance:** Consider Web Workers for long simulations
- **Accessibility:** Improve keyboard navigation and screen reader support

---

## Testing & Validation

### Manual Test Checklist

**Location Switching:**
- [ ] Select Nairobi - verify solar peaks ~12:45 PM
- [ ] Select Turkana - verify higher solar generation (northern Kenya)
- [ ] Select Mombasa - verify coastal weather patterns
- [ ] Select custom coordinates - verify API calls work
- [ ] Check data source indicator updates correctly

**Panel Calculations:**
- [ ] Run simulation with 30 kWh/day load
- [ ] Verify recommendation is ~10-15 panels (not 9000!)
- [ ] Check financial payback period is reasonable (5-10 years)
- [ ] Verify 25-year ROI includes battery replacements

**Simulation Physics:**
- [ ] Sunny day - solar should reach PV capacity
- [ ] Cloudy day - solar should be ~60% of sunny
- [ ] Rainy day - solar should be ~20% of sunny
- [ ] Verify battery charges during day, discharges at night
- [ ] Verify EV charging respects departure/return schedules

---

## Contact & Support

**Repository:** [rauell1/safaricharge](https://github.com/rauell1/safaricharge)

**Key Dependencies:**
- Next.js 16
- React 19
- TypeScript 5.x
- Tailwind CSS
- Lucide Icons

**Build & Run:**

```bash
npm install
npm run dev      # Development server
npm run build    # Production build
npm run lint     # Type checking and linting
```

---

**Note:** This document is a living reference. Update it whenever making significant changes to calculations, formulas, or system architecture. Commit this file alongside code changes.

**Format:** Keep calculations explicit with examples. Future developers should be able to understand any formula by reading this document alone.
