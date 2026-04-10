# ENGINEERING ISSUES V2 — 2026-04-10

## A. Bug: Battery SOC stays static in physics-engine path

**Title**  
bug: battery SOC and kWh remain static in physics-engine driven dashboard

**Context**

The new generalized physics engine (`calculateInstantPhysics` in `src/lib/physics-engine.ts`) correctly mutates `state.batteryKwh` and returns both `batteryLevelKwh` and `batteryLevelPct` on each call. However, in the dashboard, the battery SOC appears frozen — it never charges or discharges as time advances.

The legacy SafariCharge engine (`runSolarSimulation` in `src/simulation/runSimulation.ts`) explicitly threads previous `batKwh` through each timestep and returns updated `batKwh`, and that path historically shows a moving battery. This suggests the issue is in how the new engine’s state is wired into the store/timeline, not in the battery math itself.

**Likely root causes (inference)**

- `PhysicsEngineState` is reinitialized every timestep.
- Store nodes are not updated from physics results.
- `MinuteDataPoint` is not written with battery values from physics output.

**Fix — required changes**

1. Persist `PhysicsEngineState` across timesteps.
2. After each physics step, wire battery/solar/grid values into `energySystemStore` via `updateNode`.
3. Write `batteryPowerKW`, `batteryLevelPct`, `solarKW`, `homeLoadKW`, `gridImportKW`, `gridExportKW`, and `savingsKES` from `calculateInstantPhysics` results into `addMinuteData`.
4. Validate edge-case config values:
   - `config.battery.capacityKwh > 0`
   - `minReservePct < 100`
   - `maxChargeKw > 0`
   - `maxDischargeKw > 0`
   - `priorityMode` is `'battery'` or `'auto'` when expecting charging behavior.

**Acceptance criteria**

- Starting near 50% SOC with PV available, SOC rises during surplus and falls during deficits (subject to reserve).
- `battery.soc` node and `batteryLevelPct` in minute data vary over simulated days.
- `avgBatterySOC` in `useEnergyStats` changes over different time ranges (no longer pinned to initial SOC).

---

## B. Medium-term: pvlib/SAM comparison harness

**Title**  
feat: pvlib/SAM validation harness for SafariCharge physics engine

**Context**

PV/battery models are substantially improved (NASA hourly baseline, NOCT, soiling), but still need benchmarking against established tools (pvlib/SAM).

**Goal**

Run the same configuration and weather through:
- SafariCharge physics engine, and
- a reference model (pvlib or SAM in Python)

Then compute bias/RMSE for annual and monthly energy, peak power, and key KPIs.

**Implementation outline**

- Define `ValidationJobConfig` schema (location, system, year).
- Build a Python FastAPI validation service (`/validate/pv`) using pvlib/SAM.
- Implement SafariCharge batch runner (same weather/input assumptions).
- Compute hourly/monthly/yearly comparison metrics (bias, RMSE, peak difference, PR delta).
- Persist outputs to JSON and summarize in docs/dev validation UI.

**Acceptance criteria**

- At least one benchmark system (e.g., Nairobi rooftop PV) has annual yield within ±5–10% of pvlib/SAM under current simplifications.
- Validation assumptions/results documented in `SCIENTIFIC_TECHNICAL_AUDIT_2026-04-10.md`.
- Harness is rerunnable for regression checks after physics updates.

---

## C. Medium-term: Forecasting backend + forecast overlays

**Title**  
feat: add PV and load forecasting backend and dashboard overlays

**Context**

Current AI endpoint is advisory, not truly predictive. Scenarios rely on climatology and heuristics, not explicit forecasts.

**Goal**

Provide short-term/day-ahead forecasts for PV and load, surface them as separate chart traces, and feed them into AI recommendations.

**Implementation outline**

- Python FastAPI forecasting service:
  - `POST /forecast/pv`
  - `POST /forecast/load`
- Start with Random Forest / XGBoost, later optional LSTM/CNN-LSTM.
- Add TS client functions in `src/lib/services/forecastService.ts`.
- Store integration for `pvForecast` and `loadForecast` arrays.
- Dashboard overlay lines (dashed) + legend (“Forecast vs Simulated”).
- Extend `/api/safaricharge-ai` payload to include forecast arrays.

**Acceptance criteria**

- Forecast traces are visible and update with scenario/location changes.
- AI can answer at least one forecast-driven what-if using real forecast values.
- Forecast service can be disabled in dev with graceful fallback to climatology.

---

## D. Medium-term: Scenario management and comparison UI

**Title**  
feat: scenario management and comparison view for SafariCharge

**Context**

Users currently tune one configuration at a time. Industry tools emphasize side-by-side scenario comparisons.

**Goal**

Let users save named scenarios with config + KPI snapshots and compare them in a dedicated `/scenarios` view.

**Implementation outline**

- Define `SavedScenario` model with:
  - identity metadata
  - system snapshot
  - finance snapshot
  - performance snapshot
  - timestamp
- Add `scenarios`, `saveScenario`, `deleteScenario` in store.
- Add “Save scenario” action in dashboard header.
- Create `/scenarios` table view with key technical/financial columns and difference highlighting.

**Acceptance criteria**

- Users can save at least 3 scenarios and compare stable snapshot metrics.
- Comparison page loads from snapshots without re-simulating on load.
- Documentation explains scenario workflow and value.

---

## E. Medium-term: Engineering KPIs and decision-support metrics

**Title**  
feat: engineering KPI card and decision metrics for each scenario

**Context**

Dashboard currently emphasizes power flow and finance, but engineering users also need standard PV KPIs for benchmarking.

**Goal**

Compute and display engineering KPIs per scenario and integrate them into recommendations + scenario comparison.

**Implementation outline**

- Compute:
  - Specific yield (`kWh/kWp/year`)
  - Performance ratio (PR)
  - Capacity factor (`annualEnergy / (capacity * 8760)`)
  - Optional battery cycling stats (cycles/year, max DoD)
- Use `MinuteDataPoint` aggregates and/or annual engine runs.
- Persist KPI snapshots with scenario snapshots.
- Add an “Engineering KPIs” card on dashboard and KPI columns in scenario table.

**Acceptance criteria**

- KPIs visible for active config and scenario comparisons.
- KPI values stable across runs.
- KPI ranges reasonably align with pvlib/SAM outputs used in validation harness.

---

## Immediate debugging note for the SOC-flat symptom

Short diagnosis: if the simulation loop is already threading `batKwh` state each step, flat SOC is most likely caused by battery config constraints rather than the loop itself.

Top checks:
1. `maxChargeKw` / `maxDischargeKw` are not zero.
2. Reserve is not effectively equal to full capacity.
3. Initial battery energy is not pinned at a non-actionable boundary.

This should be verified with per-step logs of battery power, SOC, solar, load, and battery constraints.
