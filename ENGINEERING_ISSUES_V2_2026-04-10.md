# SafariCharge Engineering Issue Pack (v2.0)

Date: 2026-04-10

This document captures issue-ready engineering tickets for the next implementation cycle. The scope aligns with recent changes already merged (NASA profile baseline, NOCT-style thermal treatment, tariff profile externalization, and finance KPIs).

---

## 1) feat: finalize NASA POWER–driven hourly irradiance baseline

### Context
A first version of `buildHourlyIrradianceProfile()` exists in `src/lib/nasa-power-api.ts` and is already used as the preferred PV baseline where NASA data is available. This ticket formalizes unit conventions, fallback behavior, and regression tests.

### Goals
- Convert monthly NASA daily insolation (kWh/m²/day) into a 24-point typical-day profile.
- Ensure profile conservation: sum(profile) ~= monthly daily value.
- Guarantee physically plausible diurnal shape and robust behavior when data is missing.

### Implementation details
- Keep output explicit as **kWh/m² per hour** (equivalent to average kW/m² over each hour).
- Keep normalization hard guarantee:
  - `sum(profile[0..23]) = monthlyAverage[month-1] ± 0.01`
- Support optional static sunrise/sunset overrides for testing and deterministic behavior.
- Fallback path when monthly NASA value is missing/invalid:
  - return conservative default shape or zero profile,
  - emit dev warning,
  - expose mode metadata so callers can distinguish fallback mode.

### Acceptance criteria
- For all 12 months: `profile.length === 24` and integral error < 0.01 kWh/m²/day.
- Night hours near zero (<= 1% of daily total combined in configured night window).
- No runtime exceptions under missing/partial NASA data.
- Jest tests cover normalization + fallback behavior.

---

## 2) refactor: NASA-driven PV generation with shared NOCT-style thermal and soiling model

### Context
Both legacy and generalized simulation paths now consume NASA-derived irradiance in first pass. This ticket enforces a single shared PV model function to eliminate drift and lock unit consistency.

### Goals
- One shared PV compute path used by:
  - `src/simulation/solarEngine.ts`
  - `src/lib/physics-engine.ts`
- Unified chain: hourly irradiance -> thermal derate -> soiling -> power output.
- Explicit fallback mode without mixed hidden logic.

### Implementation details
- Extract shared helper (e.g., `src/lib/pv-model.ts`) with typed context:
  - hourly irradiance array,
  - monthly ambient temperature,
  - module thermal coefficient,
  - NOCT,
  - soiling factor,
  - system efficiency terms.
- Thermal equation (NOCT style):
  - `Tcell = Tambient + ((NOCT - 20) / 800) * Gpoa`
  - where `Gpoa` is derived from hourly irradiance (`kWh/m² per hour * 1000 -> W/m² avg`).
- Soiling must remain stateful across days and support explicit reset action (cleaning event).
- When NASA profile unavailable:
  - switch to legacy curve as explicit `modelMode: 'legacy_fallback'`,
  - include mode in scenario metadata.

### Acceptance criteria
- For same configuration + location + day, both engines produce daily PV totals within a small tolerance when fed identical irradiance/temp/soiling inputs.
- No unit ambiguity in code/docs (°C, per-°C coefficients, irradiance units).
- Docs describe fallback mode and soiling reset semantics.

---

## 3) feat: finalize versioned KPLC tariff profiles and UI selector

### Context
Tariff values were externalized to `src/lib/tariff-config.ts` and consumed by `src/lib/tariff.ts`. Next step is full user-facing profile selection + provenance display.

### Goals
- Keep tariff arithmetic fully data-driven from versioned profiles.
- Allow user selection for Domestic / Small Commercial / EV profiles.
- Display active profile provenance in dashboard, recommendations, and reports.

### Implementation details
- Standardize tariff profile schema to include:
  - id, label, currency,
  - rate bands/time-of-use,
  - `effectiveFrom`, `version`, `sourceUrl`.
- Add selector in UI settings/header.
- Persist selected `tariffProfileId` in Zustand store.
- Route all rate calls through selected profile service.
- Add visible assumptions/provenance chip:
  - active tariff label,
  - version,
  - effective date,
  - source link.

### Acceptance criteria
- No hardcoded tariff rates outside tariff config.
- Changing config values updates simulation + finance outputs with no code changes.
- User can switch profiles and immediately see reflected outputs and displayed provenance.
- Audit/implementation docs list profile source references and dates.

---

## 4) feat: finalize NPV, IRR, and LCOE with degradation-aware lifecycle modeling

### Context
Recommendation engine now outputs NPV/IRR/LCOE. This ticket formalizes lifecycle assumptions, introduces user controls, and adds deterministic tests.

### Goals
- Make finance KPIs reproducible and SAM-like in structure.
- Model PV degradation and battery replacement cadence explicitly.
- Surface key assumptions as user-adjustable inputs.

### Implementation details
- Define `FinanceAssumptions` with:
  - lifetime,
  - discount rate,
  - tariff escalation,
  - O&M rate,
  - PV degradation,
  - battery replacement schedule.
- Build explicit yearly arrays for:
  - energy,
  - savings,
  - opex,
  - net cashflow.
- Compute:
  - `NPV` from discounted net cashflows,
  - `IRR` via numerical solve,
  - `LCOE = discounted total cost / discounted lifecycle energy`.
- Add UI controls (panel or settings dialog) for discount/escalation/lifetime assumptions.
- Add assumptions block near finance KPIs in recommendation UI.

### Acceptance criteria
- Baseline tests (no degradation, no escalation) match closed-form checks.
- IRR aligns with Excel/tooling reference within 1e-3.
- Degradation/replacement scenario shows expected annual energy decline and replacement-year capex spikes.
- UI displays Payback, NPV, IRR, LCOE plus assumptions used.
- Docs explicitly call this SAM-like, not full SAM parity.

---

## Suggested execution order
1. Issue #1 (irradiance baseline hardening + tests)
2. Issue #2 (shared PV model extraction)
3. Issue #3 (tariff selector + provenance)
4. Issue #4 (finance controls + lifecycle rigor)

This order minimizes model drift and ensures economic outputs are layered on a stable physical baseline.
