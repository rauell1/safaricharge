"""pvlib simulation pipeline for the SafariCharge validation harness.

Uses pvlib's ModelChain with the Sandia Array Performance Model (SAPM)
against a synthetic TMY built from location-specific monthly averages
(PVGIS-style). For production use, swap the TMY source for a real
PVGIS or NSRDB dataset.
"""

from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd
import pvlib
from pvlib import location as pvloc
from pvlib.modelchain import ModelChain
from pvlib.pvsystem import PVSystem, FixedMount

from schemas import SystemConfig, KpiResult

# ── Nairobi-representative monthly irradiance & temperature ───────────────────
# Source: PVGIS SARAH-2 for Nairobi (-1.29, 36.82) — used as TMY proxy when
# real TMY data is unavailable. Values are monthly averages of daily GHI
# (kWh/m²/day) and ambient temperature (°C).

_NAIROBI_MONTHLY_GHI_KWH_M2_DAY = [
    5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3
]
_NAIROBI_MONTHLY_TEMP_C = [
    22, 23, 24, 23, 22, 21, 20, 21, 22, 23, 22, 22
]

# Days per month (non-leap year)
_DAYS_PER_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


def _build_synthetic_tmy(latitude: float, longitude: float, year: int) -> pd.DataFrame:
    """Build an hourly synthetic TMY DataFrame from monthly averages.

    Uses a simple daily sinusoidal profile for GHI scaled to the monthly
    average. Real deployments should replace this with PVGIS/NSRDB data.
    """
    records: list[dict[str, Any]] = []
    for month_idx, (ghi_avg, temp_avg, days) in enumerate(
        zip(_NAIROBI_MONTHLY_GHI_KWH_M2_DAY, _NAIROBI_MONTHLY_TEMP_C, _DAYS_PER_MONTH)
    ):
        # Convert kWh/m²/day → W/m² peak (sinusoidal profile, 12 h daylight)
        ghi_peak_w = ghi_avg * 1000 / (math.pi / 2 * 12)  # integral of half-sine over 12 h
        for day in range(days):
            for hour in range(24):
                # Simple sinusoidal daytime profile between 06:00 and 18:00
                if 6 <= hour < 18:
                    angle = math.pi * (hour - 6) / 12
                    ghi = ghi_peak_w * math.sin(angle)
                    dni = ghi * 0.85  # approximate
                    dhi = ghi * 0.15
                else:
                    ghi = dni = dhi = 0.0

                # Diurnal temperature variation ±3 °C
                temp = temp_avg + 3 * math.sin(math.pi * (hour - 6) / 12)

                dt = pd.Timestamp(
                    year=year, month=month_idx + 1, day=day + 1, hour=hour, tz="UTC"
                )
                records.append({"dt": dt, "ghi": ghi, "dni": dni, "dhi": dhi, "temp_air": temp, "wind_speed": 2.0})

    df = pd.DataFrame(records).set_index("dt")
    df.index = pd.DatetimeIndex(df.index)
    return df


def run_pvlib(config: SystemConfig) -> KpiResult:
    """Run a full annual pvlib simulation and return KPIs."""

    tmy = _build_synthetic_tmy(config.latitude, config.longitude, config.year)

    site = pvloc.Location(
        latitude=config.latitude,
        longitude=config.longitude,
        altitude=config.altitude_m,
        tz="UTC",
    )

    # Use a generic Sandia module scaled to the requested dc_capacity_kwp
    # The 'Canadian_Solar_CS5P_220M___2009_' module is 0.220 kWp; we scale.
    sandia_modules = pvlib.pvsystem.retrieve_sam("SandiaMod")
    module_name = "Canadian_Solar_CS5P_220M___2009_"
    module = sandia_modules[module_name].copy()
    # Scale module to represent 1 kWp (so n_modules = dc_capacity_kwp)
    scale = 1000 / module["Pmp0"]  # normalise to 1 kWp per module slot
    for key in ["Pmp0", "Imp0", "Vmp0", "Isc0", "Voc0", "Impo", "Vmpo",
                "Aisc", "Aimp", "C0", "C1", "C2", "C3", "A0", "A1", "A2", "A3", "A4",
                "B0", "B1", "B2", "B3", "B4", "B5", "IXO", "IXXO",
                "Isco", "Voco", "Bvoco", "Mbvoc", "Bvmpo", "Mbvmp",
                "Cells_in_Series", "Parallel_Strings"]:
        if key in module:
            try:
                module[key] = float(module[key]) * scale
            except (TypeError, ValueError):
                pass
    module["Area"] = float(module.get("Area", 1.7)) * scale

    inverters = pvlib.pvsystem.retrieve_sam("cecinverter")
    inverter = inverters["ABB__MICRO_0_25_I_OUTD_US_208__208V_"]

    mount = FixedMount(surface_tilt=config.tilt_deg, surface_azimuth=config.azimuth_deg)
    system = PVSystem(
        arrays=[
            pvlib.pvsystem.Array(
                mount=mount,
                module_parameters=module,
                temperature_model_parameters=pvlib.temperature.TEMPERATURE_MODEL_PARAMETERS[
                    "sapm"
                ]["open_rack_glass_glass"],
                modules_per_string=1,
                strings=int(round(config.dc_capacity_kwp)),
            )
        ],
        inverter_parameters=inverter,
    )

    mc = ModelChain(
        system=system,
        location=site,
        aoi_model="physical",
        spectral_model="no_loss",
    )

    mc.run_model(
        tmy[["ghi", "dni", "dhi", "temp_air", "wind_speed"]].rename(
            columns={"ghi": "ghi", "dni": "dni", "dhi": "dhi"}
        )
    )

    ac_power_w: pd.Series = mc.results.ac.fillna(0).clip(lower=0)
    annual_solar_kwh = float(ac_power_w.sum() / 1000)  # Wh → kWh

    # Plane-of-array irradiance for PR calculation
    poa: pd.Series = mc.results.total_irrad["poa_global"].fillna(0)  # type: ignore[index]
    annual_poa_kwh_m2 = float(poa.sum() / 1000)

    specific_yield = annual_solar_kwh / config.dc_capacity_kwp if config.dc_capacity_kwp > 0 else 0
    pr = (specific_yield / annual_poa_kwh_m2 * 100) if annual_poa_kwh_m2 > 0 else 0
    cf = (annual_solar_kwh / (config.dc_capacity_kwp * 8760) * 100) if config.dc_capacity_kwp > 0 else 0

    # Simple battery cycle model: assume battery cycles once per day when
    # solar > load (i.e. 60 % of days in a sunny Nairobi year)
    avg_daily_solar = annual_solar_kwh / 365
    estimated_daily_discharge = min(avg_daily_solar * 0.4, config.battery_max_discharge_kw * 8)
    battery_cycles = (
        (estimated_daily_discharge * 365) / config.battery_capacity_kwh
        if config.battery_capacity_kwh > 0
        else 0
    )

    return KpiResult(
        annual_solar_kwh=round(annual_solar_kwh, 2),
        specific_yield_kwh_per_kwp=round(specific_yield, 2),
        performance_ratio_pct=round(min(pr, 100), 2),
        capacity_factor_pct=round(min(cf, 100), 2),
        battery_cycles=round(battery_cycles, 2),
    )
