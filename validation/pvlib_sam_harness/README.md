# pvlib/SAM Validation Harness

A self-contained FastAPI micro-service that benchmarks SafariCharge's
physics engine against **pvlib** and a **SAM-equivalent** pipeline, computing
RMSE and bias on annual energy and KPIs.

---

## Quick-start

```bash
cd validation/pvlib_sam_harness
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Open http://localhost:8001/docs for the interactive Swagger UI.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service liveness check |
| `POST` | `/validate` | Run pvlib simulation, return KPIs |
| `POST` | `/compare` | Submit SafariCharge results + run pvlib; get RMSE/bias |

---

## POST /validate — request body

```json
{
  "latitude": -1.2921,
  "longitude": 36.8219,
  "altitude_m": 1795,
  "dc_capacity_kwp": 10.0,
  "battery_capacity_kwh": 50.0,
  "battery_max_charge_kw": 5.0,
  "battery_max_discharge_kw": 5.0,
  "inverter_efficiency": 0.96,
  "panel_efficiency": 0.20,
  "tilt_deg": 10,
  "azimuth_deg": 180,
  "year": 2023
}
```

## POST /compare — request body

Same as `/validate` plus a `safaricharge_results` object:

```json
{
  ...(same as validate),
  "safaricharge_results": {
    "annual_solar_kwh": 14250.0,
    "specific_yield_kwh_per_kwp": 1425.0,
    "performance_ratio_pct": 78.5,
    "capacity_factor_pct": 16.3,
    "battery_cycles": 320.0
  }
}
```

---

## Interpretation guide

| KPI | SafariCharge target | pvlib / SAM typical | Pass threshold |
|-----|---------------------|---------------------|----------------|
| Specific yield (kWh/kWp) | 1 300–1 600 | 1 350–1 550 | RMSE < 5 % |
| Performance Ratio (%) | 70–85 | 72–84 | bias < ±3 pp |
| Capacity Factor (%) | 15–22 | 15–20 | RMSE < 2 pp |
| Battery cycles | ∝ DoD | ∝ DoD | bias < ±10 % |

---

## Architecture

```
validation/pvlib_sam_harness/
├── main.py              # FastAPI application
├── pvlib_engine.py      # pvlib PVSystem + ModelChain pipeline
├── sam_engine.py        # SAM-equivalent pipeline (pvlib irradiance + efficiency model)
├── metrics.py           # RMSE / bias helpers
├── schemas.py           # Pydantic request / response models
├── requirements.txt
├── Dockerfile
└── README.md
```
