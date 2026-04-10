# SafariCharge Solar/Energy Dashboard – Scientific and Technical Audit

Date: 2026-04-10

## Scope and project understanding

SafariCharge is a Next.js 16 + TypeScript dashboard for simulation and analysis of rooftop PV, battery storage, grid import/export, household/commercial demand, and EV charging in a Kenya-focused context. The current implementation combines:

- A real-time power-flow visualization and interactive scenario controls.
- A legacy simulation layer under `src/simulation`.
- A generalized multi-load physics model in `src/lib/physics-engine.ts`.
- NASA POWER integration (`src/lib/nasa-power-api.ts`) for climatological irradiance and temperature.
- A recommendation engine for system sizing, savings, and ROI estimates.

The platform is best described today as a decision-support and exploration tool. It is useful for fast scenario comparison and educational workflows, but it is not yet validated as an investment-grade engineering model.

## Key scientific and technical findings

### 1) Solar resource integration is partially complete

The NASA POWER integration provides monthly climatological irradiance and temperature inputs and derives peak-sun-hour style summaries. This is a strong baseline for planning-mode simulations.

However, core PV production in simulation paths still depends largely on parameterized time-of-day curves rather than explicit POA irradiance modeling (tilt/azimuth/transposition chain). As a result, fidelity remains limited for detailed design choices such as orientation optimization, clipping behavior assessment, or shading sensitivity.

### 2) PV, inverter, and battery models are reasonable but simplified

Strengths:

- Inverter limits and partial-load efficiency effects are represented.
- Power-flow logic respects AC bottlenecks and grid interactions.
- Battery behavior includes reserve constraints and non-linear efficiency effects at higher power levels.

Gaps:

- No explicit irradiance decomposition/transposition model pipeline.
- Temperature modeling uses a coarse linear approximation and fixed coefficients.
- Battery chemistry differences (e.g., LiFePO4 vs lead-acid) are not fully modeled in electrochemical performance/aging terms.
- Degradation and availability effects remain mostly scalar assumptions.

### 3) EV and load modeling captures behavior patterns, but calibration is limited

The EV and load models include realistic stochastic elements (departure/return windows, peak windows, and V2G-style logic). This is suitable for interactive what-if analysis.

Remaining limitations include lack of validated Kenyan measured load datasets in the loop and limited transparency/parameterization for certain EV energy-per-distance assumptions.

### 4) Tariff and finance workflows are directionally useful, not yet finance-grade

The codebase supports Kenya-focused tariff logic and cash-flow style payback calculations, which is valuable for early-stage feasibility work.

However, current analysis is simplified relative to full project-finance modeling:

- Missing full NPV/IRR/LCOE pipeline with discounting and escalation sensitivity.
- Simplified treatment of tariff components and potential surcharge/tax details.
- Limited uncertainty propagation across long-term cash-flow assumptions.

## Validation statement

At this stage, there is insufficient documented external validation against field datasets or benchmark engines (for example pvlib/SAM-equivalent outputs under matched weather and system assumptions).

Accordingly:

- The simulator should be treated as **prototype decision support**.
- Absolute accuracy claims should be marked **Insufficient evidence** until benchmarked and calibrated.

## Prioritized technical roadmap

### Priority 0: Establish validation harness

1. Build reproducible comparison scenarios between SafariCharge and a benchmark chain (e.g., pvlib/SAM-equivalent reference outputs).
2. Track error metrics (NMBE, nRMSE, MAE) for energy and power profiles.
3. Define acceptance thresholds for simulation modes (exploration vs design-grade).

### Priority 1: Close NASA POWER-to-PV production gap

1. Feed NASA POWER climatology into an hourly/sub-hourly irradiance synthesis pipeline.
2. Replace purely bell-curve PV shape assumptions with physically grounded diurnal profiles.
3. Add configurable array geometry inputs (tilt, azimuth).

### Priority 2: Improve PV physics fidelity

1. Implement POA transposition pipeline (GHI-based methods with configurable assumptions).
2. Upgrade cell temperature modeling to parameterized module/mounting behavior.
3. Introduce explicit clipping/DC-AC ratio behavior and non-ideal derates.

### Priority 3: Upgrade storage and finance realism

1. Add chemistry-aware battery performance and aging assumptions.
2. Extend economics to NPV/IRR/LCOE with scenario and sensitivity controls.
3. Add tariff-versioning support to keep regulatory assumptions auditable over time.

### Priority 4: Forecasting and operations layer

1. Add operational-mode forecasting service for short-horizon PV/load prediction.
2. Integrate forecast uncertainty bands into dispatch and recommendation views.
3. Support measured-data ingestion and simulation-vs-observation calibration loops.

## Recommended implementation approach

- Keep the existing TypeScript simulation path for fast interactivity.
- Add a higher-fidelity "design mode" pathway for benchmark-aligned runs.
- Preserve current UX strength (Kenya-specific workflows, approachable visualization).
- Emphasize model transparency: publish assumptions, versioned coefficients, and validation metrics.

## Implementation issue pack

A v2.0 issue-ready backlog has been added in `ENGINEERING_ISSUES_V2_2026-04-10.md` with finalized tickets for irradiance baseline hardening, shared PV modeling, tariff profile UX/provenance, and lifecycle finance rigor.

## Conclusion

SafariCharge already delivers strong product value as an interactive, Kenya-aware energy intelligence dashboard. The main opportunity is not UI breadth but scientific hardening: tighter weather-to-PV physics integration, explicit validation against benchmark tools, and finance-model depth.

With these upgrades, SafariCharge can credibly position itself as a local-market-focused engineering decision platform rather than a standalone heuristic simulator.

## Phase 1 – Implemented Changes and Remaining Gaps (as of 2026-04-10)

The following sub-sections summarize the status of Phase 1 roadmap items (NASA irradiance, PV physics, tariffs, and lifecycle finance) and distinguish implemented behavior from remaining gaps.

### 1) NASA POWER hourly irradiance baseline (implemented, v1.0)

**What changed**
- `buildHourlyIrradianceProfile` in `src/lib/nasa-power-api.ts` is now the canonical conversion from monthly NASA ALLSKY irradiance (kWh/m²/day) to a 24-hour typical-day profile.
- The helper constructs a smooth diurnal curve and normalizes to preserve NASA daily energy for the selected month.
- This hourly profile is now used as PV baseline in both simulation paths whenever NASA climatology is present.

**Rationale**
- NASA POWER is climatological and aggregate; hourly synthesis with integral preservation is a standard predesign approach.
- This materially improves location differentiation (e.g., Turkana/Kisii/Nairobi) versus a generic shape-only model.

**Acceptance posture**
- Length is 24.
- Daily sum matches NASA monthly daily value (target tolerance: ±0.01 kWh/m²/day).
- Night hours are near zero and most energy is concentrated in daylight windows.
- Missing/invalid NASA data triggers fallback mode with explicit diagnostics in development.

**Remaining gaps / refinement**
- Current hourly synthesis is approximate and does not yet perform full GHI->DNI/DHI->POA transposition.
- Sunrise/sunset handling can be further improved with full solar-position-based windows per month and latitude.

### 2) Shared PV physics model: NASA irradiance + NOCT temperature + soiling (implemented, v1.0)

**What changed**
- Legacy simulation and generalized physics engine now use the same NASA-derived irradiance baseline and NOCT-style temperature derating.
- Cell temperature approximation follows:
  - `Tcell = Tambient + ((NOCT - 20) / 800) * Gpoa`
- Soiling remains multiplicative and stateful, based on configured daily loss and floor constants.

**Rationale**
- Aligning both engines on one physical baseline reduces model drift and simplifies benchmarking.
- NOCT-style thermal treatment is more physically grounded than a fixed-offset approximation.

**Acceptance posture**
- For fixed location/config/inputs, legacy and generalized engines produce closely aligned daily PV totals.
- NASA-off fallback remains supported and documented.
- Units are consistently treated in °C and per-°C coefficients with irradiance conversion documented.

**Remaining gaps / refinement**
- POA is still approximated rather than fully transposed from component irradiance streams.
- Soiling is currently scalar; future work should introduce event-based soiling and cleaning logic in UI/state.

### 3) Versioned KPLC tariff profiles with visible assumptions (implemented, v1.0)

**What changed**
- Tariff values are externalized into `src/lib/tariff-config.ts` as versioned profile objects.
- `src/lib/tariff.ts` now derives effective rates from profiles rather than scattered literals.
- Profile metadata (version/effectiveFrom/source URL) is carried for auditability.

**Rationale**
- Tariffs and levies evolve over time; versioned data-driven profiles avoid code edits for schedule changes.
- Source-linked profiles improve transparency for engineering and finance reviews.

**Acceptance posture**
- Tariff arithmetic is profile-driven.
- Updating profile values updates simulation and finance outputs without changing logic.
- Documentation now references profile metadata and provenance.

**Remaining gaps / refinement**
- Some tariff elements are still represented as effective per-kWh values rather than fully itemized billing constructs.
- Source update workflow remains manual and should be automated/validated periodically.

### 4) NPV, IRR, and LCOE with degradation-aware lifecycle modeling (implemented, v1.0)

**What changed**
- Recommendation engine now outputs NPV, IRR, and LCOE in addition to payback/ROI.
- Lifecycle cashflow includes annual maintenance, tariff escalation, PV degradation, and battery replacement events.
- Finance KPIs are exposed in recommendation UI for direct scenario interpretation.

**Rationale**
- NPV/IRR/LCOE are standard comparison metrics in engineering-economic studies and make recommendations decision-ready.
- Degradation and replacement modeling improves long-horizon realism versus flat-output assumptions.

**Acceptance posture**
- Finance calculations are implemented with discounted cashflow methods and numerical IRR solve.
- UI now surfaces payback + NPV + IRR + LCOE with assumptions context.
- Documentation explains that this is SAM-like structure, not SAM-equivalent parity.

**Remaining gaps / refinement**
- Tax and financing-structure details (loans/depreciation/incentive mechanics) are not yet modeled.
- Degradation and replacement defaults should evolve toward per-manufacturer/project-level parameters.
