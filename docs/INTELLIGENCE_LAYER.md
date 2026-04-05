# SafariCharge Intelligence Layer

## Overview

The Intelligence Layer transforms SafariCharge from a **simulation tool** into a **decision engine**. Instead of users manually configuring components, the system now intelligently recommends optimal configurations based on user needs.

## Core Shift

### Before (Simulation Mode)
```
User: "I want 50 kW solar, 48 kW inverter, 60 kWh battery"
System: "Here's what will happen..."
```

### After (Decision Engine Mode)
```
User: "I use 150 kWh/day and want energy independence"
System: "Install 75 kW solar, 60 kW inverter, 225 kWh battery. Here's why..."
```

## Architecture

The intelligence layer consists of 4 core modules:

```
┌─────────────────────────────────────────────────────────┐
│                  USER REQUIREMENTS                       │
│  (Daily consumption, Goal, Budget, Location)             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              INTELLIGENCE LAYER                          │
│                                                          │
│  ┌─────────────────┐  ┌──────────────────┐             │
│  │  Auto-Sizing    │  │  DC:AC Optimizer │             │
│  │     Wizard      │  │                  │             │
│  └────────┬────────┘  └────────┬─────────┘             │
│           │                     │                        │
│  ┌────────▼────────┐  ┌────────▼─────────┐             │
│  │  Load           │  │  Battery         │             │
│  │  Validator      │  │  Economics       │             │
│  └─────────────────┘  └──────────────────┘             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│             OPTIMIZED SYSTEM CONFIG                      │
│  (Solar, Inverter, Battery + Economic Analysis)          │
└─────────────────────────────────────────────────────────┘
```

## Modules

### 1. Auto-Sizing Wizard (`auto-sizing-wizard.ts`)

**Purpose:** Convert user requirements into optimized hardware configuration.

**Input:**
```typescript
{
  dailyConsumption_kWh: 150,      // Daily energy use
  offsetTarget: 1.0,               // 100% solar offset
  goal: 'energy-independence',     // Or: save-money, backup-power, off-grid
  budgetConstraint: 5000000,       // Optional: KES budget limit
  location: {
    latitude: -1.286389,
    longitude: 36.817223,
    peakSunHours: 5.8
  },
  constraints: {                    // Optional physical limits
    roofArea_sqm: 200,
    maxInverterKw: 100,
    criticalLoads_kW: 15
  }
}
```

**Output:**
```typescript
{
  config: SystemConfiguration,    // Ready-to-use system config
  dcAcRatio: {
    ratio: 1.25,
    status: 'optimal',
    message: "DC:AC ratio of 1.25:1 is optimal..."
  },
  validation: {
    canHandlePeakLoad: true,
    inverterHeadroom_pct: 23.5,
    batteryAutonomy_hours: 36,
    warnings: []
  },
  economics: {
    estimatedCost_KES: 4850000,
    monthlyGridSavings_KES: 85000,
    paybackPeriod_years: 6.2,
    roi25Years_pct: 285
  },
  summary: "Recommended 75 kW solar system...",
  reasoning: [
    "Target: 100% solar offset for 150 kWh/day",
    "Peak sun hours: 5.8 hr/day",
    "Required solar capacity: 75 kW..."
  ]
}
```

**Key Features:**
- Optimizes DC:AC ratio to 1.25:1 (industry best practice)
- Sizes battery based on goal (0.5-3 days autonomy)
- Optimizes battery C-rates (0.5C charge, 1.0C discharge) for longevity
- Validates against physical constraints (roof area, electrical limits)
- Provides economic analysis (cost, payback, ROI)

### 2. DC:AC Ratio Optimizer (`dc-ac-optimizer.ts`)

**Purpose:** Analyze and optimize the solar-to-inverter ratio for maximum energy capture.

**Why it matters:**
- **Too low** (<1.10): Inverter oversized, wasting 10-15% energy capture potential
- **Optimal** (1.20-1.30): Maximum energy with minimal clipping (~2-5% annually)
- **Too high** (>1.40): Excessive clipping wastes solar production

**Usage:**
```typescript
import { analyzeDCACRatio } from '@/lib/intelligence';

const analysis = analyzeDCACRatio(
  50.4,  // Solar capacity (kW)
  48.0,  // Inverter capacity (kW)
  150000 // Optional: annual solar production (kWh)
);

console.log(analysis);
// {
//   ratio: 1.05,
//   status: 'too_low',
//   colorCode: 'red',
//   message: "DC:AC ratio of 1.05:1 is too low...",
//   recommendations: [
//     "Downsize inverter to 40 kW",
//     "Or add 12 more panels (6.6 kW)"
//   ],
//   annualClippingLoss_kWh: 0,
//   optimalInverter_kW: 40,
//   optimalSolar_kW: 60
// }
```

**Quick helpers:**
```typescript
// Get status badge for UI
const badge = getDCACBadge(1.25);
// { text: 'Optimal', color: 'green', emoji: '✓' }

// Calculate optimal inverter for current solar
const inverter = calculateOptimalInverter(50.4);
// 40 kW

// Calculate optimal solar for current inverter
const solar = calculateOptimalSolar(48);
// 60 kW
```

### 3. Load Validator (`load-validator.ts`)

**Purpose:** Validate that the system can actually handle configured loads.

**Critical checks:**
1. Can inverter supply peak simultaneous load? (with 25% surge margin)
2. Can battery cover nighttime consumption?
3. Are battery C-rates safe?
4. Can EV chargers operate without exceeding limits?
5. Will HVAC units start successfully?

**Usage:**
```typescript
import { validateSystemForLoads } from '@/lib/intelligence';

const validation = validateSystemForLoads(systemConfig);

console.log(validation);
// {
//   status: 'adequate',              // or: marginal, insufficient
//   canHandlePeakLoad: true,
//   peakSimultaneousLoad_kW: 42.5,
//   peakWithSurge_kW: 53.1,         // +25% surge
//   inverterHeadroom_pct: 18.2,     // 18% headroom
//   nightEnergyDemand_kWh: 48.5,
//   usableBatteryCapacity_kWh: 48,
//   batteryCoversNight: false,
//   batteryAutonomy_hours: 11.8,
//   criticalWarnings: [],
//   warnings: [
//     "Battery provides only 11.8 hours autonomy..."
//   ],
//   recommendations: [
//     "Increase battery to 70 kWh for full night autonomy"
//   ],
//   hourlyLoadBreakdown: [...]      // 24-hour profile
// }
```

**Validation logic:**
- **Adequate:** >10% inverter headroom, no critical issues
- **Marginal:** <10% headroom or multiple warnings
- **Insufficient:** Cannot handle peak load or critical failures

### 4. Battery Economics Optimizer (`battery-economics.ts`)

**Purpose:** Find the battery size that makes the most economic sense.

**Key insight:** Bigger battery ≠ better ROI. There's a sweet spot.

**Usage:**
```typescript
import { optimizeBatterySize } from '@/lib/intelligence';

const optimization = optimizeBatterySize({
  dailyConsumption_kWh: 150,
  avgNightPower_kW: 8,
  peakSunHours: 5.8,
  solarCapacity_kW: 75,
  gridPrice_per_kWh: 18.5,
  batteryCost_per_kWh: 25000,    // KES/kWh for LiFePO4
  discountRate: 0.05,             // 5% NPV discount
  chemistry: 'lifepo4'
});

console.log(optimization);
// {
//   analyses: [
//     { capacity_kWh: 0, npv25Years_KES: 0, ... },
//     { capacity_kWh: 40, npv25Years_KES: 8500000, ... },
//     { capacity_kWh: 60, npv25Years_KES: 12300000, ... }, ← Best NPV
//     { capacity_kWh: 80, npv25Years_KES: 11800000, ... },
//     ...
//   ],
//   bestForROI: { capacity_kWh: 40, roi25Years_pct: 320, ... },
//   bestForCost: { capacity_kWh: 60, costPerKwh_KES: 14.2, ... },
//   bestForIndependence: { capacity_kWh: 200, ... },
//   recommendation: { capacity_kWh: 60, isRecommended: true, ... },
//   summary: "Recommended 60 kWh battery provides best economic value..."
// }
```

**Each analysis includes:**
- Upfront cost
- Expected lifetime (based on cycle life curves)
- Levelized cost per kWh
- Annual grid savings
- Payback period
- 25-year NPV and ROI
- Reasoning (why this size is/isn't optimal)

**Cycle life modeling:**
- LiFePO4: 10,000 cycles @ 20% DoD → 2,000 cycles @ 80% DoD
- Lead-Acid: 3,000 cycles @ 20% DoD → 300 cycles @ 80% DoD
- Accounts for calendar aging limits

## Integration Examples

### Example 1: Wizard-Driven System Design

```typescript
import { autoSizeSystem } from '@/lib/intelligence';

// User fills out simple wizard form
const userInput = {
  dailyConsumption_kWh: getUserDailyUsage(), // From wizard
  offsetTarget: getDesiredOffset(),           // From wizard
  goal: getSelectedGoal(),                    // From wizard
  location: {
    ...getUserLocation(),                     // From map/geocoder
    peakSunHours: await fetchSolarData()      // From NASA POWER
  }
};

// Get intelligent recommendation
const recommendation = autoSizeSystem(userInput);

// Use recommended config directly
setSystemConfig(recommendation.config);

// Show user the analysis
displaySummary(recommendation.summary);
displayRecommendations(recommendation.reasoning);
displayEconomics(recommendation.economics);
```

### Example 2: Real-Time Validation

```typescript
import { analyzeDCACRatio, validateSystemForLoads } from '@/lib/intelligence';

// When user changes system config
function onSystemConfigChange(config: SystemConfiguration) {
  // Check DC:AC ratio
  const dcacAnalysis = analyzeDCACRatio(
    config.solar.totalCapacityKw,
    config.inverter.capacityKw
  );

  // Show badge
  showDCACBadge(dcacAnalysis.colorCode, dcacAnalysis.status);

  // Validate loads
  const loadValidation = validateSystemForLoads(config);

  // Show warnings
  if (loadValidation.criticalWarnings.length > 0) {
    showErrors(loadValidation.criticalWarnings);
  }

  if (loadValidation.warnings.length > 0) {
    showWarnings(loadValidation.warnings);
  }

  // Show recommendations
  if (loadValidation.recommendations.length > 0) {
    showRecommendations(loadValidation.recommendations);
  }
}
```

### Example 3: Battery Size Comparison View

```typescript
import { optimizeBatterySize } from '@/lib/intelligence';

// Run optimization
const optimization = optimizeBatterySize({
  dailyConsumption_kWh: currentLoad,
  avgNightPower_kW: estimatedNightPower,
  peakSunHours: locationData.peakSunHours,
  solarCapacity_kW: currentConfig.solar.totalCapacityKw,
  gridPrice_per_kWh: 18.5
});

// Display comparison table
const rows = optimization.analyses.map(analysis => ({
  size: `${analysis.capacity_kWh} kWh`,
  cost: formatKES(analysis.upfrontCost_KES),
  payback: `${analysis.paybackPeriod_years.toFixed(1)} years`,
  roi: `${analysis.roi25Years_pct.toFixed(0)}%`,
  npv: formatKES(analysis.npv25Years_KES),
  recommended: analysis.isRecommended,
  reasoning: analysis.reasoning
}));

// Highlight best option
const recommended = optimization.recommendation;
showRecommendation(`${recommended.capacity_kWh} kWh battery is optimal`);
```

## Best Practices

### 1. Use Auto-Sizing as Default Entry Point

Don't ask users to configure components manually. Start with the wizard:

```typescript
// ✅ Good: Wizard first
<AutoSizingWizard onComplete={(config) => setSystemConfig(config)} />

// ❌ Bad: Manual config first
<ManualConfigPanel config={config} onChange={setConfig} />
```

### 2. Always Validate After Changes

```typescript
// ✅ Good: Real-time validation
useEffect(() => {
  const validation = validateSystemForLoads(config);
  setValidationResult(validation);
}, [config]);

// ❌ Bad: No validation until simulation
runSimulation(config); // May fail silently
```

### 3. Show DC:AC Ratio Prominently

```typescript
// ✅ Good: Visible ratio indicator
<DCACRatioBadge ratio={dcAcRatio} status={dcAcStatus} />

// ❌ Bad: Hidden in advanced settings
<AdvancedSettings>
  <span>DC/AC: {dcAcRatio}</span>
</AdvancedSettings>
```

### 4. Explain Economic Trade-offs

```typescript
// ✅ Good: Show multiple options with economics
<BatteryComparison analyses={optimization.analyses} />

// ❌ Bad: Single recommendation without context
<div>Recommended: 60 kWh</div>
```

## Technical Details

### DC:AC Ratio Calculation

```
DC:AC Ratio = Solar_Capacity_kW / Inverter_Capacity_kW

Industry optimal: 1.20 - 1.30

Example:
- 50 kW solar / 40 kW inverter = 1.25:1 ✓ Optimal
- 50 kW solar / 48 kW inverter = 1.04:1 ✗ Too low (inverter oversized)
- 50 kW solar / 35 kW inverter = 1.43:1 ✗ Too high (excessive clipping)
```

### Clipping Loss Estimation

```
Peak production hours: ~5 hours/day @ rated capacity
Clipping occurs when: Solar_Power > Inverter_Capacity

Annual clipping (simplified):
= (Solar_kW - Inverter_kW) × 5 hrs/day × 365 days × Clipping_Factor

Clipping_Factor increases with ratio:
- 1.20:1 → ~2% clipping
- 1.25:1 → ~4% clipping
- 1.30:1 → ~6% clipping
- 1.40:1 → ~10% clipping
```

### Battery Cycle Life Curves

```
LiFePO4 (Dyness, CATL, BYD datasheets):
  20% DoD → 10,000 cycles (27 years @ 1 cycle/day)
  50% DoD →  6,000 cycles (16 years)
  80% DoD →  3,000 cycles (8 years)

Lead-Acid (Trojan, Crown datasheets):
  20% DoD → 3,000 cycles (8 years)
  50% DoD → 1,200 cycles (3 years)
  80% DoD → 500 cycles (1.4 years)

Actual lifetime = min(Cycle_Life, Calendar_Life)
  LiFePO4 calendar life: 15 years
  Lead-Acid calendar life: 7 years
```

### NPV Calculation

```
NPV = -Upfront_Cost + Σ(Annual_Savings / (1 + r)^t) - Σ(Costs / (1 + r)^t)

Where:
- r = discount rate (default 5%)
- t = year (1 to 25)
- Annual_Savings = Energy_from_Battery × Grid_Price
- Costs = Maintenance (2%/year) + Replacements

Battery replacements occur at:
- LiFePO4: Year 10 (if cycles allow)
- Lead-Acid: Years 5, 10, 15, 20
```

## Future Enhancements

1. **String Design Calculator**
   - Calculate panels per string based on Voc, Vmp
   - Validate against MPPT voltage windows
   - Temperature derating

2. **Tilt/Azimuth Optimizer**
   - Optimize panel orientation for location
   - Account for shading losses
   - Seasonal production curves

3. **Degradation Modeling**
   - Panel degradation (0.5%/year)
   - Battery capacity fade over time
   - Multi-year performance projections

4. **Smart Battery Dispatch**
   - Time-of-use optimization
   - Peak shaving algorithms
   - Arbitrage strategies

## See Also

- `/src/lib/recommendation-engine.ts` - Original recommendation logic
- `/src/lib/system-config.ts` - System configuration types
- `/src/simulation/runSimulation.ts` - Simulation engine
