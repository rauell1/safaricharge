"""
pvlib_runner.py
~~~~~~~~~~~~~~~
Runs a full pvlib PVSystem + ModelChain simulation for a given
SafariCharge system configuration.

Steps:
1. Fetch TMY data from PVGIS for the supplied lat/lon.
2. Build a pvlib Location and PVSystem.
3. Run ModelChain to obtain hourly AC power.
4. Return hourly AC output (kWh) and annual energy total.

Requirements: pvlib >= 0.10
"""

from __future__ import annotations

import logging
from typing import Any

import pvlib
from pvlib.location import Location
from pvlib.pvsystem import PVSystem, FixedMount
from pvlib.modelchain import ModelChain

from .models import PvlibRunResult, SystemConfig

logger = logging.getLogger(__name__)


def run_pvlib(config: SystemConfig) -> PvlibRunResult:
    """
    Execute a pvlib simulation for the supplied *config* and return hourly
    AC energy output plus the annual total.

    Parameters
    ----------
    config:
        SafariCharge system configuration (Pydantic model).

    Returns
    -------
    PvlibRunResult
        ``annual_kwh`` – annual AC energy (kWh).
        ``hourly_ac``  – list of 8 760 hourly AC energy values (kWh).

    Notes
    -----
    * TMY data is fetched from the PVGIS REST API (requires internet access).
      Set the ``PVGIS_URL`` environment variable to override the base URL if
      you are running behind a proxy.
    * The ``pvlib.iotools.get_pvgis_tmy`` call may be slow on first run
      (~2–5 s) as it hits an external endpoint.
    * Panel efficiency / module parameters use the ``pvwatts`` model which
      requires only capacity and standard losses, making it well-suited for
      rapid benchmarking without needing a CEC module database entry.
    """
    logger.info(
        "Running pvlib simulation for %.1f kW system",
        config.solar_capacity_kw,
    )

    # ------------------------------------------------------------------
    # 1. Fetch TMY
    # ------------------------------------------------------------------
    tmy_data, _, _, _ = pvlib.iotools.get_pvgis_tmy(
        latitude=config.latitude,
        longitude=config.longitude,
        outputformat="json",
        usehorizon=True,
        userhorizon=None,
        startyear=None,
        endyear=None,
        map_variables=True,
    )

    # ------------------------------------------------------------------
    # 2. Location
    # ------------------------------------------------------------------
    location = Location(
        latitude=config.latitude,
        longitude=config.longitude,
        altitude=1660.0,  # Nairobi default; PVGIS provides metadata but
        # pvlib Location does not ingest it from tmy directly
        tz="Africa/Nairobi",
    )

    # ------------------------------------------------------------------
    # 3. PVSystem using PVWatts-style parameters
    # ------------------------------------------------------------------
    mount = FixedMount(
        surface_tilt=config.tilt_deg,
        surface_azimuth=config.azimuth_deg,
    )

    # Use the CEC inverter/module databases via the 'pvwatts' model chain
    # to avoid requiring a specific module lookup.
    system = PVSystem(
        arrays=[
            pvlib.pvsystem.Array(
                mount=mount,
                module_parameters={
                    "pdc0": config.solar_capacity_kw * 1000,  # W (DC nameplate)
                    "gamma_pdc": -0.004,  # temperature coefficient (%/°C)
                },
                temperature_model_parameters=pvlib.temperature.TEMPERATURE_MODEL_PARAMETERS[
                    "sapm"
                ]["open_rack_glass_glass"],
            )
        ],
        inverter_parameters={
            "pdc0": config.solar_capacity_kw * 1000,
            "eta_inv_nom": 0.96,
        },
    )

    # ------------------------------------------------------------------
    # 4. ModelChain
    # ------------------------------------------------------------------
    mc = ModelChain(
        system=system,
        location=location,
        aoi_model="physical",
        spectral_model="no_loss",
        dc_model="pvwatts",
        ac_model="pvwatts",
    )

    mc.run_model(tmy_data)

    # ------------------------------------------------------------------
    # 5. Extract hourly AC power (W → kWh per hour)
    # ------------------------------------------------------------------
    ac_power_w: Any = mc.results.ac  # pandas Series, index = hourly timestamps
    hourly_ac_kwh: list[float] = [max(0.0, float(v) / 1000.0) for v in ac_power_w]

    annual_kwh = sum(hourly_ac_kwh)

    logger.info("pvlib simulation complete. Annual yield: %.0f kWh", annual_kwh)

    return PvlibRunResult(annual_kwh=annual_kwh, hourly_ac=hourly_ac_kwh)
