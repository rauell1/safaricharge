# SafariCharge Forecasting Service

A FastAPI microservice that provides next-24h solar generation and load demand forecasts using Random Forest and XGBoost.

## Requirements

- Python 3.11+
- scikit-learn ≥ 1.4
- xgboost ≥ 2.0
- pydantic v2

## Installation

```bash
cd forecasting
pip install -r requirements.txt
```

## Running

```bash
uvicorn main:app --reload --port 8001
```

The service will be available at `http://localhost:8001`.

## Environment Variables

| Variable             | Default                   | Description                                   |
|----------------------|---------------------------|-----------------------------------------------|
| `FORECAST_SERVICE_URL` | `http://localhost:8001` | URL used by the Next.js proxy (`/api/forecast`) |

## Endpoints

| Method | Path              | Description                       |
|--------|-------------------|-----------------------------------|
| GET    | `/health`         | Liveness probe                    |
| POST   | `/forecast`       | Full solar + load forecast        |
| POST   | `/forecast/solar` | Solar-only forecast               |
| POST   | `/forecast/load`  | Load-only forecast                |

## Sample `curl`

```bash
curl -s -X POST http://localhost:8001/forecast \
  -H 'Content-Type: application/json' \
  -d '{
    "latitude": -1.2921,
    "longitude": 36.8219,
    "solar_capacity_kw": 10,
    "horizon_hours": 24,
    "history": [
      {"timestamp": "2026-01-05T00:00:00Z", "solar_kw": 0, "load_kw": 2.1, "temperature_c": 19, "cloud_cover_pct": 10},
      ... (at least 24 points)
    ]
  }' | python -m json.tool
```

## Constraints

- Minimum **24 historical data points** required (returns HTTP 422 if fewer supplied).
- No pre-trained model files are committed — models are trained on-the-fly from supplied history.

## Model Details

### Solar Forecaster (`models/solar_forecaster.py`)
- Algorithm: `sklearn.ensemble.RandomForestRegressor` (100 trees)
- Features: hour, day-of-week, month, sin/cos time encodings, cloud cover, temperature, 1h/24h solar lags, PV capacity
- Confidence intervals: 10th / 90th percentile across individual trees
- Night clamping: pvlib `simplified_solis` clear-sky model; GHI = 0 → forecast = 0

### Load Forecaster (`models/load_forecaster.py`)
- Algorithm: `xgboost.XGBRegressor` with `objective='reg:quantileerror'`
- Three models trained at q = 0.10, 0.50, 0.90
- Features: hour, day-of-week, month, weekend/peak flags, sin/cos time encodings, 1h/24h/168h load lags

### Feature Engineering (`models/feature_engineering.py`)
- `add_time_features(df)` – adds calendar + cyclic features
- `add_lag_features(df, col, lags)` – adds lag columns (NaN for unavailable rows)

## Model Improvement Path

1. **Weather integration** — replace carried-forward cloud cover with a live NWP feed (e.g. Open-Meteo API).
2. **Online learning** — retrain incrementally as new meter readings arrive.
3. **Ensemble** — combine RF + XGBoost + LightGBM predictions for lower variance.
4. **Hyperparameter tuning** — Optuna/Bayesian search over the training history.

## Running Tests

```bash
cd forecasting
pip install pytest
pytest tests/ -v
```
