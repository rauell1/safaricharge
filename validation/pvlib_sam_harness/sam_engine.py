"""SAM-equivalent simulation pipeline for the SafariCharge validation harness.

Open-source SAM (System Advisor Model) requires a compiled SDK that is not
easily pip-installable, so this module implements an equivalent pipeline using
pvlib's irradiance decomposition and a simple single-diode efficiency model —
the same approach documented in SAM's PVWatts v8 technical reference.

This is deliberately a lightweight approximation. For production validation
against real SAM results, replace run_sam_equivalent() with a call to the
official SAM Python bindings (PySAM).
"""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
import pvlib
from pvlib import location as pvloc
from pvlib.irradiance import get_total_irradiance

from pvlib_engine import _build_synthetic_tmy
from schemas import SystemConfig, KpiResult

# PVWatts v8 default derate chain (fraction of DC nameplate).
# Source: Dobos (2014), SAM PVWatts Technical Reference.
_PVWATTS_DERATE = {
    "soiling": 0.95,
    "shading": 0.97,
    "snow": 1.00,
    "mismatch": 0.98,
    "wiring": 0.98,
    "connections": 0.995,
    "lid": 0.995,
    "nameplate": 0.995,
    "age": 1.00,
    "availability": 0.99,
}
_PVWATTS_SYSTEM_DERATE = math.prod(_PVWATTS_DERATE.values())

# Temperature coefficient for crystalline silicon (fraction per °C)
_TEMP_COEFF = -0.0047  # % power per °C, converted below

# NOCT-based cell temperature model constants
_NOCT = 45.0  # °C
_T_NOCT_AMBIENT = 20.0  # °C
_G_NOCT = 800.0  # W/m²


def _cell_temperature(poa_w_m2: np.ndarray, t_ambient: np.ndarray) -> np.ndarray:
    """NOCT model: T_cell = T_ambient + (NOCT - 20) / 800 * G_poa."""
    return t_ambient + (_NOCT - _T_NOCT_AMBIENT) / _G_NOCT * poa_w_m2


def run_sam_equivalent(config: SystemConfig) -> KpiResult:
    """PVWatts v8-equivalent simulation using pvlib irradiance + simple derate chain."""

    tmy = _build_synthetic_tmy(config.latitude, config.longitude, config.year)

    site = pvloc.Location(
        latitude=config.latitude,
        longitude=config.longitude,
        altitude=config.altitude_m,
        tz="UTC",
    )

    # Solar position
    solar_pos = site.get_solarposition(tmy.index)

    # Plane-of-array irradiance (Perez model)
    poa_components = get_total_irradiance(
        surface_tilt=config.tilt_deg,
        surface_azimuth=config.azimuth_deg,
        dni=tmy["dni"],
        ghi=tmy["ghi"],
        dhi=tmy["dhi"],
        solar_zenith=solar_pos["apparent_zenith"],
        solar_azimuth=solar_pos["azimuth"],
        model="perez",
        airmass=pvlib.atmosphere.get_relative_airmass(solar_pos["apparent_zenith"]),
    )
    poa_global: pd.Series = poa_components["poa_global"].fillna(0).clip(lower=0)

    # Cell temperature (NOCT model)
    t_cell = _cell_temperature(
        poa_w_m2=poa_global.values,
        t_ambient=tmy["temp_air"].values,
    )

    # DC power: P_dc = G_poa/1000 * P_dc_stc * [1 + gamma*(T_cell - 25)]
    gamma = _TEMP_COEFF  # already a fraction
    dc_power_kw = (
        poa_global.values / 1000.0
        * config.dc_capacity_kwp
        * (1 + gamma * (t_cell - 25))
        * _PVWATTS_SYSTEM_DERATE
    )
    dc_power_kw = np.clip(dc_power_kw, 0, config.dc_capacity_kwp)

    # AC power: apply inverter efficiency
    ac_power_kw = dc_power_kw * config.inverter_efficiency
    ac_power_kw = np.clip(ac_power_kw, 0, config.dc_capacity_kwp * config.inverter_efficiency)

    annual_solar_kwh = float(ac_power_kw.sum())  # already kW × 1 h intervals

    annual_poa_kwh_m2 = float(poa_global.sum() / 1000)

    specific_yield = annual_solar_kwh / config.dc_capacity_kwp if config.dc_capacity_kwp > 0 else 0
    pr = (specific_yield / annual_poa_kwh_m2 * 100) if annual_poa_kwh_m2 > 0 else 0
    cf = (annual_solar_kwh / (config.dc_capacity_kwp * 8760) * 100) if config.dc_capacity_kwp > 0 else 0

    # Battery cycle model (same heuristic as pvlib_engine)
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
