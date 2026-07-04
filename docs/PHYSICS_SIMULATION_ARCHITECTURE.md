# SafariCharge Physics Simulation Dashboard - Architecture

Detailed breakdown of the core engine, the timing loop, the state management layer, and integration with other system components for the real-time simulation dashboard (`/demo`).

## 1. The Core Physics Simulation Engine

The mathematical and physical modeling of SafariCharge is powered by `physics-engine.ts`. It executes a step-by-step energy balance equation at each simulation tick through the `calculateInstantPhysics` function:

```
Generation (Solar + V2G) + Battery Discharge + Grid Import = Loads (Demand) + Battery Charge + Grid Export
```

The engine models five primary sub-systems:

- **Solar Irradiation & Thermal Derating** (`solarEngine.ts`): solar generation is simulated using a sinusoidal clear-sky model combined with random daily weather perturbations. Generation is modified by:
  - Thermal degradation: PV panel efficiency drops as the cell temperature exceeds STC (25degC).
  - Age degradation: applied annually based on system age (years).
  - Soiling factor: a dynamic soiling loss accumulates daily but resets to 1.0 (clean) with a 10% daily probability of rain.
- **Multi-Type Load Profiling**: demands are generated from active loads (residential load curves, commercial scheduled intervals, HVAC cooling loads driven by diurnal temperature swings, and EV charger demands).
- **EV Fleet & V2G (Vehicle-to-Grid)** (`evMobilityEngine.ts`): when plugged in at home, the fleet charges using smart-charging logic or exports energy back to the microgrid/battery during peak tariff windows (V2G) if the vehicle's SoC is above a configured minimum threshold.
- **Battery Storage & BMS** (`batteryEngine.ts`, `stepBattery`): tracks battery capacity, charging efficiency, charge acceptance limits, cycle counts, and battery health degradation. Also calculates a dynamic Levelized Cost of Storage (LCOS) to decide when discharging the battery is more economical than importing grid electricity.
- **Microgrid Power Flow & Frequency** (`gridEngine.ts`): simulates frequency deviation (Hz) from nominal (50.0Hz) using microgrid load step changes and a configured inertia constant. If frequency drops below 49.5Hz, the engine automatically triggers Demand-Response Load Shedding, shedding 30% of HVAC and commercial load to restore system balance.

## 2. The Tick Loop & Virtual Clock

To run this engine continuously in the browser, SafariCharge separates execution cadence from UI rendering:

- **Continuous Tick Driver** (`useDemoEnergySystem.ts`): runs a continuous timer. At a baseline of 100ms, it advances the clock by one tick.
  - Time scaling: one day is split into 420 virtual ticks. Each tick represents approximately 3.43 simulated minutes (24 hours / 420 ticks). A full day completes in 42 seconds at 1x speed. Changing the speed multiplier adjusts the interval timer down (e.g. 10ms at 10x).
- **Ref-Based State Persistence** (`usePhysicsSimulation.ts`): wraps the engine and preserves running physical values (battery kWh, EV SoCs, accumulated panel age, soiling factors) inside React `useRef` hooks, so simulation state survives React re-renders without reset.
- **Performance Batching**: to prevent UI redraw lag in the hot loop, tick results are consolidated into a single atomic write action (`applySimulationTick`) on the global store, eliminating multiple sub-state updates per tick.

## 3. State Management (Zustand)

The single source of truth for the active simulation is `energySystemStore.ts`.

- `systemConfig`: captures user UI choices (active location, solar capacity, battery size, grid outage state, priority mode).
- `fullSystemConfig`: auto-calculated configuration fed directly into the physics engine.
- `minuteData`: a rolling queue (max 420 data points) storing the metrics of every tick. Graphs like `TimeSeriesChart.tsx` subscribe directly to this array to draw real-time SVGs of solar power, load, battery level, and grid flows.
- `accumulators`: running totals of cumulative solar generation, carbon offset, grid import, battery discharge cycles, and KPLC tariff savings.

## 4. Integration with Other System Components

- **Parametric Sizing Engine** (`solarCalculator.ts`): used for offline planning. Runs an hourly/annualized simulation to calculate cable sizing (IEC 60364-5-52 method), NPV, LCOE, and IRR. Through `SizingDispatchPanel.tsx`, specific PV panels, inverters, and battery modules from the catalog sync back to the active simulation configuration.
- **Supabase Database**: stores persistent user configurations (`user_preferences` table) and scenario benchmarks (`saved_scenarios` table). When a user saves a scenario, it updates the database via optimistic state transitions.
- **AI Insight Assistant**: real-time metrics accumulated in the store are formatted and sent to the generative AI route handler (`/api/safaricharge-ai`), letting the AI assistant analyze current system state, spot efficiency issues, and suggest microgrid optimizations.

```
Sizing Engine / solarCalculator
        |
        | Synchronizes Component Specs
        v
   Zustand Store
    /          \
   v            v
useDemoEnergySystem   Supabase DB: Scenarios & Preferences
   |                        ^
   v                        | Supplies Real-time Context
usePhysicsSimulation        |
   |                        v
   v                  AI Assistant / API
physics-engine.ts
```
