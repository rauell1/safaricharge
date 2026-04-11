"""
sam_runner.py
~~~~~~~~~~~~~
Stub for NREL System Advisor Model (SAM) SDK integration.

SAM SDK integration
-------------------
The NREL SAM SDK (``nrel-pysam``) requires:

1. Download the SAM desktop application from https://sam.nrel.gov/ to obtain
   the required shared libraries, **or** install ``nrel-pysam`` from PyPI:

       pip install nrel-pysam

2. Create an SAM case file (.json) with your system configuration using the
   SAM GUI, then load it via ``PySAM.Pvwattsv8.wrap(data)`` or the equivalent
   module for your simulation type.

3. Example integration skeleton (once the SDK is available)::

       import PySAM.Pvwattsv8 as pv
       import PySAM.ResourceTools as tools

       def run_sam(config: SystemConfig) -> dict:
           system = pv.default("PVwattsNone")
           # Set location
           system.SolarResource.solar_resource_data = tools.TMYData(
               lat=config.latitude, lon=config.longitude, ...
           )
           # Set system parameters
           system.SystemDesign.system_capacity = config.solar_capacity_kw
           system.SystemDesign.tilt = config.tilt_deg
           system.SystemDesign.azimuth = config.azimuth_deg
           system.execute()
           hourly_ac = list(system.Outputs.gen)  # kWh per hour
           return {"annual_kwh": sum(hourly_ac), "hourly_ac": hourly_ac}

4. Replace the ``NotImplementedError`` below with the real implementation.

No API keys are required for SAM; it uses locally bundled weather data or
can import TMY files.  See https://nrel-pysam.readthedocs.io/ for full docs.
"""

from __future__ import annotations

from .models import PvlibRunResult, SystemConfig


def run_sam(config: SystemConfig) -> PvlibRunResult:  # noqa: ARG001
    """
    Run an SAM (PVWatts v8) simulation for the supplied *config*.

    This function is a **stub**.  SAM SDK integration requires the
    ``nrel-pysam`` package and the SAM shared libraries.  See the module
    docstring above for integration instructions.

    Parameters
    ----------
    config:
        SafariCharge system configuration.

    Raises
    ------
    NotImplementedError
        Always – until the SDK is installed and the stub is replaced with a
        real implementation (see module docstring).
    """
    raise NotImplementedError(
        "SAM SDK integration is not yet available. "
        "Install 'nrel-pysam' (pip install nrel-pysam) and follow the "
        "integration guide in validation/harness/sam_runner.py to enable "
        "this endpoint."
    )
