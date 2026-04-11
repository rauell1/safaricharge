from fastapi import FastAPI, HTTPException

from .models import ValidationJobConfig, ValidationResult
from .runner_pvlib import run_pvlib_reference
from .runner_safaricharge import run_safaricharge_engine
from .metrics import compute_comparison_metrics

app = FastAPI(title="SafariCharge PV Validation Service")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/validate/pv", response_model=ValidationResult)
def validate_pv(config: ValidationJobConfig):
    """Validate SafariCharge physics engine against pvlib/SAM reference.

    This endpoint runs the configured system through both the SafariCharge
    engine and the pvlib reference pipeline, then returns annual/monthly
    energy along with bias/RMSE metrics.
    """

    try:
        reference_series = run_pvlib_reference(config)
        safaricharge_series = run_safaricharge_engine(config)
        comparison = compute_comparison_metrics(reference_series, safaricharge_series)
    except Exception as exc:  # pragma: no cover - defensive catch
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return ValidationResult(
        job=config,
        reference=reference_series,
        safaricharge=safaricharge_series,
        comparison=comparison,
    )
