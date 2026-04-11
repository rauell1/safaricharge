# SafariCharge Validation Harness

A FastAPI microservice that benchmarks the SafariCharge TypeScript physics
engine against **pvlib** (and optionally NREL SAM) by comparing annual
energy output and hourly AC power curves, reporting RMSE, bias, and MAPE.

---

## Directory layout

```
validation/
  main.py                 FastAPI app entry point
  requirements.txt        Python dependencies
  README.md               This file
  harness/
    __init__.py
    models.py             Pydantic v2 request/response models
    pvlib_runner.py       Runs pvlib TMY simulation
    sam_runner.py         SAM SDK stub (see SAM Integration below)
    comparator.py         RMSE / bias / MAPE computation
  tests/
    test_comparator.py    Unit tests for metrics
    test_pvlib_runner.py  Tests for pvlib runner (mocked network)
```

---

## Prerequisites

- Python 3.11 +
- The SafariCharge Next.js app running locally (optional – for engine
  comparison)

---

## Installation

```bash
cd validation
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

---

## Running the service locally

```bash
cd validation
uvicorn main:app --reload --port 8000
```

The API docs are available at http://localhost:8000/docs (Swagger UI).

---

## API endpoints

### `GET /health`

Liveness probe.

```bash
curl http://localhost:8000/health
# → {"status":"ok"}
```

### `POST /validate/pvlib`

Runs a pvlib TMY simulation for the supplied system config and (optionally)
compares it against the SafariCharge engine output.

#### Minimal request (pvlib only, no engine comparison)

```bash
curl -s -X POST http://localhost:8000/validate/pvlib \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -1.2921,
    "longitude": 36.8219,
    "solar_capacity_kw": 50,
    "battery_capacity_kwh": 60,
    "tilt_deg": 15,
    "azimuth_deg": 180,
    "simulation_year": 2023
  }' | python -m json.tool
```

Example response (engine comparison skipped — `annual_engine_kwh` is `null`):

```json
{
  "rmse_kwh": "NaN",
  "bias_kwh": "NaN",
  "mape_pct": "NaN",
  "annual_engine_kwh": null,
  "annual_reference_kwh": 87432.1,
  "reference_tool": "pvlib"
}
```

#### Full request (with engine comparison)

Start the Next.js app first (`npm run dev`), then:

```bash
curl -s -X POST http://localhost:8000/validate/pvlib \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": -1.2921,
    "longitude": 36.8219,
    "solar_capacity_kw": 50,
    "battery_capacity_kwh": 60,
    "tilt_deg": 15,
    "azimuth_deg": 180,
    "simulation_year": 2023,
    "engine_output_url": "http://localhost:3000/api/engine-output"
  }' | python -m json.tool
```

You can also set the engine URL via an environment variable instead of
including it in every request body:

```bash
export ENGINE_OUTPUT_URL=http://localhost:3000/api/engine-output
uvicorn main:app --reload --port 8000
```

---

## Interpreting RMSE / bias output

| Metric | Meaning |
|--------|---------|
| `rmse_kwh` | Root-mean-square error per hour (kWh). Lower is better. A value below 5% of the hourly average is generally acceptable. |
| `bias_kwh` | Mean signed error per hour (kWh). Positive = engine overestimates. Ideally near zero. |
| `mape_pct` | Mean absolute percentage error (%). Night-time zero hours use a floor of 1 kWh in the denominator. |
| `annual_engine_kwh` | Annual AC energy from the SafariCharge engine (kWh). |
| `annual_reference_kwh` | Annual AC energy from the pvlib simulation (kWh). |

A typical well-calibrated PV model should achieve:
- RMSE < 10 % of mean hourly output
- Bias within ± 3 %
- Annual totals within ± 5 %

---

## Running the test suite

```bash
cd validation
pip install -r requirements.txt
pytest tests/ -v
```

---

## SAM Integration

SAM (NREL System Advisor Model) integration requires the `nrel-pysam` package
and is currently **stubbed out** in `harness/sam_runner.py`.

To enable it:

1. Install the SDK:
   ```bash
   pip install nrel-pysam
   ```

2. Follow the detailed integration guide in the module docstring of
   `harness/sam_runner.py`.

3. Replace the `NotImplementedError` with a real implementation following
   the skeleton provided.

4. A `POST /validate/sam` endpoint can be added to `main.py` by copying the
   `/validate/pvlib` route and replacing `run_pvlib` with `run_sam`.

No API keys are required for SAM; it uses bundled weather data or external
TMY files.

---

## Environment variables

| Variable | Description |
|----------|-------------|
| `ENGINE_OUTPUT_URL` | URL of the SafariCharge Next.js `/api/engine-output` endpoint. Overrides the per-request `engine_output_url` field. |
