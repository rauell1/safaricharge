"""FastAPI entry point for the optimizer service."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import OptimizeRequest, OptimizeResponse
from .optimizer import solve

app = FastAPI(
    title="SafariCharge MILP Dispatch Optimizer",
    description=(
        "Block-structured MILP energy management system (EMS) "
        "built with Pyomo. Finds the optimal 24-hour BESS dispatch "
        "schedule that minimises KPLC import costs."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "optimizer", "version": "1.0.0"}


@app.post("/optimize", response_model=OptimizeResponse)
def optimize(req: OptimizeRequest) -> OptimizeResponse:
    """Run the MILP optimizer for the given system configuration.

    Takes PV forecast, load forecast, BESS parameters, and KPLC tariff
    prices, and returns the cost-optimal BESS charge/discharge schedule
    for the requested horizon.
    """
    # Validate array lengths match horizon_steps
    n = req.horizon_steps
    errors = []
    if len(req.pv.pv_forecast_kw) != n:
        errors.append(f"pv.pv_forecast_kw must have {n} elements, got {len(req.pv.pv_forecast_kw)}")
    if len(req.load.load_forecast_kw) != n:
        errors.append(f"load.load_forecast_kw must have {n} elements, got {len(req.load.load_forecast_kw)}")
    if len(req.grid.import_price_kes_kwh) != n:
        errors.append(f"grid.import_price_kes_kwh must have {n} elements")
    if len(req.grid.export_price_kes_kwh) != n:
        errors.append(f"grid.export_price_kes_kwh must have {n} elements")
    if errors:
        raise HTTPException(status_code=422, detail=errors)

    try:
        return solve(req)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
