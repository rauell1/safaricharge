# Grid Resilience for Fast EV Charging in SafariCharge Deployments

SafariCharge deploys solar-backed DC fast charging in Sub-Saharan Africa, where voltage sags, brownouts, and feeder instability can directly reduce charging quality and availability. This reference summarizes peer-reviewed evidence on disturbance ride-through and peak-shaving controls relevant to SafariCharge system design.

## 1. Overview

SafariCharge operates in grid conditions where instability is a practical operational constraint, not a theoretical edge case. The paper by Ngotho & Basu (2025) evaluates a **DVShave** architecture that combines:

- **DVR (Dynamic Voltage Restorer)** for disturbance ride-through
- **Peak shaving control** for demand smoothing
- A **700 V DC-link charging system** supported by an ESS
- **ANN-based control** using a **Synchronous Reference Frame (SRF)** strategy

The method was evaluated in **MATLAB/Simulink** and validated on **OPAL-RT real-time hardware**, strengthening implementation confidence beyond simulation-only studies.

## 2. Grid Disturbance Impact on Fast EV Charging (from paper)

The paper reports the following behavior for a 50 kW DC fast charger under voltage dip conditions:

| Voltage Dip | DC Bus Voltage | Charging Current | Charging Power |
|---|---|---|---|
| 10% | Minor dip, self-restored | 125 A (stable) | 50 kW (stable) |
| 30% | Noticeable fluctuation | ~100 A | Reduced |
| 60% | Drops to ~400 V | ~70 A | Significantly reduced |
| 80% | Drops to ~400 V | ~30 A | ~12 kW (76% reduction) |

> Note: Undervoltage protection guidance recommends disconnecting chargers when voltage falls below **80% of nominal**.

## 3. DVR Response Performance (tested data from paper)

DVR response times (milliseconds):

| Fault Type | Phase A | Phase B | Phase C | Average |
|---|---|---|---|---|
| 10% Dip | 0.717 ms | 0.655 ms | 0.824 ms | 0.732 ms |
| 30% Dip | 0.956 ms | 0.963 ms | 0.960 ms | 0.960 ms |
| 60% Dip | 1.17 ms | 1.07 ms | 1.08 ms | 1.107 ms |
| 80% Dip | 1.340 ms | 1.18 ms | 1.293 ms | 1.271 ms |
| S-L-G Fault | 0.518 ms | 0.120 ms | 0.517 ms | 0.385 ms |

All measured response times are well below **10 ms**, satisfying the industry expectation of response within **<0.5 cycle at 50 Hz**.

## 4. Harmonic Distortion (THD) Reduction

- Supply voltage THD improved from **19.60%** to **4.84%** after DVR compensation.
- This satisfies the **IEEE 519-2022** 5% THD limit at the PCC.
- ANN control slightly outperformed PI control across tested disturbances (example: Phase B at 80% dip = **0.93% ANN** vs **0.98% PI**).

Full THD comparison:

| Controller | Phase | 10% Sag | 30% Sag | 60% Sag | 80% Sag | S-L-G |
|---|---|---|---|---|---|---|
| ANN | A | 0.64% | 0.76% | 0.86% | 0.94% | 1.05% |
| ANN | B | 0.63% | 0.76% | 0.82% | 0.93% | 1.28% |
| ANN | C | 0.64% | 0.75% | 0.83% | 0.93% | 1.05% |
| PI | A | 0.69% | 0.80% | 0.88% | 0.96% | 1.07% |
| PI | B | 0.67% | 0.78% | 0.84% | 0.98% | 1.30% |
| PI | C | 0.65% | 0.76% | 0.88% | 0.97% | 1.13% |

## 5. Peak Shaving Performance

Key peak-shaving outcomes from the 50-charger station study:

- Peak-to-average ratio (PAR) reduced from **1.9** to **1.49** over a 4.5-hour daily charging window.
- ESS configuration: **180 Ah, 600 V** with **80% DoD** gives **86.4 kWh usable energy**.
- Maximum ESS discharge rate: **67.5 kW**.
- Control strategy is rule-based, checking grid quality, SOC, station load, and ESS limits.
- Station loading behavior was generated via **Monte Carlo simulation**.

## 6. EV Charger Specifications (from validated model)

| Parameter | Value |
|---|---|
| Grid voltage | 400 V, 50 Hz |
| DC link voltage | 700 V |
| EV battery | 125 Ah, 360 V nominal |
| Charging current | 125 A |
| Switching frequency | 50 kHz |
| DVR rating | 45 kVA |
| DVR ESS voltage | 600 V, 180 Ah |
| DVR ESS DoD | 80% |

## 7. Industrial Cross-Reference & Standards Compliance

| Standard / Source | Relevant Requirement or Context | Alignment with Paper Findings |
|---|---|---|
| IEC 61851 | EV conductive charging system safety/performance framework | Paper’s ride-through and charger stability analysis supports design choices for safe operation under disturbances |
| IEEE 519-2022 | THD at PCC should remain ≤5% | DVR-compensated THD reaches **4.84%**, meeting the limit |
| IEC 61000-4-11 | Voltage dip immunity test framework (including severe dip classes) | 80% dip scenario aligns with severe immunity testing conditions (Class 3 context) |
| EN 50160 | Public LV network voltage characteristics include sag events | Paper’s 10–60% sag scenarios are consistent with documented LV network disturbance behavior |
| IEA Africa EV Outlook 2024 | Grid instability is a major EV adoption barrier in Africa | Findings directly address this barrier via ride-through + power quality support |

**Kenya / East Africa relevance:** KPLC-connected distribution feeders frequently exhibit sags from high-impedance LV lines, load shedding, and distributed generation injection, matching the disturbance scenarios tested in the study.

## 8. Implications for SafariCharge System Design

- Integrate **DVR or equivalent voltage conditioning** at the EVCS PCC for ride-through capability.
- Use **ANN-based disturbance control** where feasible; gains versus PI are modest but measurable for harmonic suppression and control precision.
- Operate ESS in a **dual-purpose mode** (ride-through + peak shaving) to improve utilization and reduce demand-related OPEX.
- Set dashboard voltage alerts at **<80% of nominal** in line with standards guidance and observed performance collapse at deep sags.
- Track **PAR target = 1.49 (from 1.9 baseline)** as a measurable SafariCharge operations KPI.
- Preserve **CCCV charging behavior** in firmware, including transition behavior near **80% SOC**, consistent with validated model assumptions.

## 9. Citation & Reference

Ngotho, S., & Basu, M. (2025). *Evaluating Disturbance Ride-Through Capability of Fast Electric Vehicle Charging Stations Using DVShave*. **IET Power Electronics, 18**, e70128. https://doi.org/10.1049/pel2.70128

- Open access (CC BY)
- Validated with OPAL-RT real-time simulation
