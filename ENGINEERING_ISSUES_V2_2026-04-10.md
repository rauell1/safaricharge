# ENGINEERING ISSUES V2 — 2026-04-10

## A. Bug: Battery SOC stays static in physics-engine path

**Title**  
bug: battery SOC and kWh remain static in physics-engine driven dashboard

**Context**

The new generalized physics engine (`calculateInstantPhysics` in `src/lib/physics-engine.ts`) correctly mutates `state.batteryKwh` and returns both `batteryLevelKwh` and `batteryLevelPct` on each call. However, in the dashboard, the battery SOC appears frozen — it never charges or discharges as time advances.

The legacy SafariCharge engine (`runSolarSimulation` in `src/simulation/runSimulation.ts`) explicitly threads previous `batKwh` through each timestep and returns updated `batKwh`, and that path historically shows a moving battery. This suggests the issue is in how the new engine’s state is wired into the store/timeline, not in the battery math itself.

**Likely root causes (updated from latest debugging)**

- The UI being observed is bound to a different data path than the loop currently being logged (e.g., `energySystemStore` + `calculateInstantPhysics` path vs local `data.batteryLevel` from `runSolarSimulation`).
- `calculateInstantPhysics` runner may still be reinitializing `PhysicsEngineState` each tick or failing to persist the mutated state.
- Store nodes and/or `MinuteDataPoint` may not be updated from physics results, causing a visually flat SOC despite internal state changes elsewhere.

**Fix — required changes**

1. Persist `PhysicsEngineState` across timesteps.
2. After each physics step, wire battery/solar/grid values into `energySystemStore` via `updateNode`.
3. Write `batteryPowerKW`, `batteryLevelPct`, `solarKW`, `homeLoadKW`, `gridImportKW`, `gridExportKW`, and `savingsKES` from `calculateInstantPhysics` results into `addMinuteData`.
4. Verify runtime behavior before changing config assumptions:
   - Log per-step `solar`, `load`, `batPower`, `gridImport`, and `batKwh` to confirm there is actionable surplus/deficit and battery response.
   - Confirm the page/component under observation is reading the same state path being updated in the active simulation loop.
   - Then validate config edge cases (`capacityKwh > 0`, `minReservePct < 100`, positive charge/discharge limits, expected priority mode).

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

Short diagnosis: with `batteryKwh=60`, `maxChargeKw=30`, `maxDischargeKw=40`, and `inverterKw=48`, the legacy `runSolarSimulation` path has sufficient limits to move SOC; if SOC appears flat, treat this first as a runtime wiring/observability issue before blaming battery limits.

Top checks:
1. Log sub-step values (`solar`, `load`, `batPower`, `gridImport`, `batKwh`) to verify battery action is occurring.
2. If `batKwh` changes in logs but UI is flat, verify the displayed component is bound to the same state path (`data.batteryLevel` vs `energySystemStore`/physics-engine path).
3. If `batPower` remains zero, inspect whether the simulated conditions ever produce actionable surplus/deficit in that active loop.

Use these checks to isolate whether the defect is in physics execution, data propagation, or UI binding.
