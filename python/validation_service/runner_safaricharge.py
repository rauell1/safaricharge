from .models import ValidationJobConfig, EnergySeries


def run_safaricharge_engine(config: ValidationJobConfig) -> EnergySeries:
    """Run the SafariCharge physics engine in batch mode.

    TODO: Replace this stub with a real batch runner that calls the
    SafariCharge physics engine over the same period and weather as
    the pvlib reference. For now, we scale the reference output by a
    small factor so that the comparison pipeline can be tested end-to-
    end without wiring the full engine.
    """

    # Temporary stub: import the pvlib reference and scale it so that
    # bias / RMSE metrics are non-zero but predictable.
    from .runner_pvlib import run_pvlib_reference

    reference = run_pvlib_reference(config)
    monthly_kwh = {k: v * 0.97 for k, v in reference.monthly_kwh.items()}
    annual_kwh = reference.annual_kwh * 0.97

    return EnergySeries(monthly_kwh=monthly_kwh, annual_kwh=annual_kwh)
