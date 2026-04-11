import pandas as pd
import pvlib

from .models import ValidationJobConfig, EnergySeries


def run_pvlib_reference(config: ValidationJobConfig) -> EnergySeries:
    """Compute annual and monthly AC energy using pvlib.

    First-pass implementation using clear-sky irradiance. In a later
    iteration we can swap this for NASA POWER or other TMY-based data
    so that assumptions match SafariCharge more closely.
    """

    loc = config.location
    year = config.year

    # 1. Time index (hourly for the whole year)
    times = pd.date_range(
        start=f"{year}-01-01 00:00",
        end=f"{year}-12-31 23:00",
        freq="1H",
        tz=loc.timezone,
    )

    # 2. Simple clear-sky irradiance at the site
    site = pvlib.location.Location(
        latitude=loc.latitude,
        longitude=loc.longitude,
        tz=loc.timezone,
        altitude=loc.altitude_m or 0.0,
    )
    clearsky = site.get_clearsky(times)  # GHI/DNI/DHI

    # 3. Transpose to plane-of-array
    solar_position = site.get_solarposition(times)
    poa = pvlib.irradiance.get_total_irradiance(
        surface_tilt=config.pv_system.tilt_deg,
        surface_azimuth=config.pv_system.azimuth_deg,
        dni=clearsky["dni"],
        ghi=clearsky["ghi"],
        dhi=clearsky["dhi"],
        solar_zenith=solar_position["apparent_zenith"],
        solar_azimuth=solar_position["azimuth"],
    )

    # 4. Simple DC model: Pdc = G_poa/1000 * P_dc_rating * (1 - losses)
    dc_rating_kw = config.pv_system.dc_capacity_kwp
    loss_factor = 1.0 - config.pv_system.loss_fraction
    p_dc_kw = (poa["poa_global"] / 1000.0) * dc_rating_kw * loss_factor

    # 5. Inverter clipping at AC nameplate
    p_ac_kw = p_dc_kw.clip(upper=config.pv_system.inverter_ac_kw)

    # 6. Energy kWh — hourly steps so kWh = kW per step
    energy_hourly_kwh = p_ac_kw

    monthly = energy_hourly_kwh.resample("M").sum()
    annual = float(energy_hourly_kwh.sum())

    monthly_kwh = {
        f"{idx.year}-{idx.month:02d}": float(val)
        for idx, val in monthly.items()
    }

    return EnergySeries(monthly_kwh=monthly_kwh, annual_kwh=annual)
