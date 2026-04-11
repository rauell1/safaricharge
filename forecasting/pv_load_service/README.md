# PV & Load Forecasting Micro-service

A FastAPI micro-service that provides 24-hour-ahead PV generation and
load forecasts for the SafariCharge dashboard.

The Next.js proxy at `src/app/api/forecast/route.ts` forwards requests
here when `FORECAST_SERVICE_URL=http://localhost:8001` (the default).

---

## Quick-start

```bash
cd forecasting/pv_load_service
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Open http://localhost:8001/docs for the Swagger UI.

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |
| `POST` | `/forecast` | 24 h PV + load forecast with confidence bands |

---

## POST /forecast — request body

This matches the shape sent by `src/app/api/forecast/route.ts`:

```json
{
  "latitude": -1.2921,
  "longitude": 36.8219,
  "solar_capacity_kw": 10.0,
  "horizon_hours": 24,
  "history": [
    {
      "timestamp": "2026-01-01T06:00:00Z",
      "solar_kw": 4.2,
      "load_kw": 3.1,
      "temperature_c": 23.0,
      "cloud_cover_pct": 10.0
    }
  ]
}
```

## POST /forecast — response

```json
{
  "forecast": [
    {
      "timestamp": "2026-01-02T00:00:00Z",
      "solar_kw": 3.8,
      "load_kw": 2.9,
      "solar_confidence_low": 2.9,
      "solar_confidence_high": 4.7,
      "load_confidence_low": 2.3,
      "load_confidence_high": 3.5
    }
  ]
}
```

---

## Model architecture

- **Algorithm**: scikit-learn `GradientBoostingRegressor` (one model each for solar and load)
- **Quantile regression**: separate `alpha=0.1` and `alpha=0.9` models for 80% confidence intervals
- **Features** (per hourly point):
  - `hour_sin`, `hour_cos` — cyclic hour-of-day encoding
  - `dow_sin`, `dow_cos` — cyclic day-of-week encoding
  - `month_sin`, `month_cos` — cyclic month encoding
  - `solar_lag1`, `solar_lag3_mean` — autoregressive solar lags
  - `load_lag1`, `load_lag3_mean` — autoregressive load lags
  - `solar_capacity_kw` — system size
  - `clearsky_proxy` — `sin(π × hour / 12)` clipped to daylight hours
  - `temperature_c`, `cloud_cover_pct`
- **Fallback**: when < 48 h of history is available, a seasonal sinusoidal heuristic is used

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8001` | Listening port |
| `LOG_LEVEL` | `info` | uvicorn log level |

Copy `.env.example` to `.env` to customise.

---

## Architecture

```
forecasting/pv_load_service/
├── main.py           # FastAPI app + /forecast endpoint
├── features.py       # Feature engineering pipeline
├── model.py          # GBR training + quantile regression
├── fallback.py       # Seasonal heuristic fallback
├── schemas.py        # Pydantic request / response models
├── requirements.txt
├── Dockerfile
├── .env.example
└── README.md
```
