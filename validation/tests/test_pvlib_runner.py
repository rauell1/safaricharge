"""
test_pvlib_runner.py
~~~~~~~~~~~~~~~~~~~~~
Unit tests for harness/pvlib_runner.py.

The PVGIS TMY network call is mocked so the test suite can run offline and
in CI without requiring internet access.

Runs with pytest from the validation/ directory:

    cd validation
    pytest tests/
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from harness.models import SystemConfig, PvlibRunResult
from harness.pvlib_runner import run_pvlib


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _make_tmy_dataframe() -> pd.DataFrame:
    """
    Build a minimal 8 760-row TMY DataFrame that satisfies the pvlib
    ModelChain irradiance inputs.  All irradiance values are set to a
    constant clear-sky level to produce a predictable non-zero output.
    """
    index = pd.date_range("2023-01-01", periods=8760, freq="h", tz="UTC")
    df = pd.DataFrame(
        {
            "ghi": [500.0] * 8760,
            "dhi": [100.0] * 8760,
            "dni": [800.0] * 8760,
            "temp_air": [25.0] * 8760,
            "wind_speed": [2.0] * 8760,
        },
        index=index,
    )
    return df


@pytest.fixture()
def minimal_config() -> SystemConfig:
    """Nairobi defaults with a small 10 kW system."""
    return SystemConfig(
        latitude=-1.2921,
        longitude=36.8219,
        solar_capacity_kw=10.0,
        battery_capacity_kwh=12.0,
        tilt_deg=15.0,
        azimuth_deg=180.0,
        simulation_year=2023,
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


class TestRunPvlib:
    def test_returns_pvlib_run_result(self, minimal_config: SystemConfig) -> None:
        """run_pvlib should return a PvlibRunResult instance."""
        tmy_df = _make_tmy_dataframe()

        with patch(
            "harness.pvlib_runner.pvlib.iotools.get_pvgis_tmy",
            return_value=(tmy_df, MagicMock(), MagicMock(), MagicMock()),
        ):
            result = run_pvlib(minimal_config)

        assert isinstance(result, PvlibRunResult)

    def test_result_has_annual_kwh_key(self, minimal_config: SystemConfig) -> None:
        """Result must contain ``annual_kwh``."""
        tmy_df = _make_tmy_dataframe()

        with patch(
            "harness.pvlib_runner.pvlib.iotools.get_pvgis_tmy",
            return_value=(tmy_df, MagicMock(), MagicMock(), MagicMock()),
        ):
            result = run_pvlib(minimal_config)

        assert hasattr(result, "annual_kwh")
        assert isinstance(result.annual_kwh, float)

    def test_result_has_hourly_ac_key(self, minimal_config: SystemConfig) -> None:
        """Result must contain ``hourly_ac``."""
        tmy_df = _make_tmy_dataframe()

        with patch(
            "harness.pvlib_runner.pvlib.iotools.get_pvgis_tmy",
            return_value=(tmy_df, MagicMock(), MagicMock(), MagicMock()),
        ):
            result = run_pvlib(minimal_config)

        assert hasattr(result, "hourly_ac")
        assert isinstance(result.hourly_ac, list)

    def test_hourly_ac_length_equals_tmy_rows(self, minimal_config: SystemConfig) -> None:
        """hourly_ac should have the same number of entries as the TMY DataFrame."""
        tmy_df = _make_tmy_dataframe()

        with patch(
            "harness.pvlib_runner.pvlib.iotools.get_pvgis_tmy",
            return_value=(tmy_df, MagicMock(), MagicMock(), MagicMock()),
        ):
            result = run_pvlib(minimal_config)

        assert len(result.hourly_ac) == len(tmy_df)

    def test_annual_kwh_equals_sum_of_hourly_ac(self, minimal_config: SystemConfig) -> None:
        """annual_kwh must equal sum(hourly_ac)."""
        tmy_df = _make_tmy_dataframe()

        with patch(
            "harness.pvlib_runner.pvlib.iotools.get_pvgis_tmy",
            return_value=(tmy_df, MagicMock(), MagicMock(), MagicMock()),
        ):
            result = run_pvlib(minimal_config)

        assert result.annual_kwh == pytest.approx(sum(result.hourly_ac), rel=1e-9)

    def test_hourly_ac_values_are_non_negative(self, minimal_config: SystemConfig) -> None:
        """AC output should never be negative."""
        tmy_df = _make_tmy_dataframe()

        with patch(
            "harness.pvlib_runner.pvlib.iotools.get_pvgis_tmy",
            return_value=(tmy_df, MagicMock(), MagicMock(), MagicMock()),
        ):
            result = run_pvlib(minimal_config)

        assert all(v >= 0.0 for v in result.hourly_ac)

    def test_annual_kwh_is_positive_for_clear_sky(self, minimal_config: SystemConfig) -> None:
        """With constant 500 W/m² GHI the system should produce measurable energy."""
        tmy_df = _make_tmy_dataframe()

        with patch(
            "harness.pvlib_runner.pvlib.iotools.get_pvgis_tmy",
            return_value=(tmy_df, MagicMock(), MagicMock(), MagicMock()),
        ):
            result = run_pvlib(minimal_config)

        assert result.annual_kwh > 0.0

    def test_pvgis_api_called_with_correct_coords(self, minimal_config: SystemConfig) -> None:
        """get_pvgis_tmy should be invoked with the config lat/lon."""
        tmy_df = _make_tmy_dataframe()

        with patch(
            "harness.pvlib_runner.pvlib.iotools.get_pvgis_tmy",
            return_value=(tmy_df, MagicMock(), MagicMock(), MagicMock()),
        ) as mock_tmy:
            run_pvlib(minimal_config)

        call_kwargs = mock_tmy.call_args.kwargs
        assert call_kwargs["latitude"] == pytest.approx(minimal_config.latitude)
        assert call_kwargs["longitude"] == pytest.approx(minimal_config.longitude)
