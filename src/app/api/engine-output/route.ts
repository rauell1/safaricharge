/**
 * POST /api/engine-output
 *
 * Thin adapter that runs the SafariCharge TypeScript physics engine across
 * all 8 760 hours of a simulated year and returns a JSON array of hourly
 * AC output values in kWh.
 *
 * This endpoint is consumed by the Python validation harness
 * (`validation/main.py`) so that pvlib results can be compared against the
 * SafariCharge engine without requiring cross-language IPC.
 *
 * Request body (JSON):
 * {
 *   "latitude":           number   // default -1.2921 (Nairobi)
 *   "longitude":          number   // default  36.8219
 *   "solarCapacityKw":    number   // DC nameplate kW
 *   "batteryCapacityKwh": number   // usable battery kWh
 *   "tiltDeg":            number   // panel tilt (degrees)
 *   "azimuthDeg":         number   // panel azimuth (degrees, 180 = south)
 *   "performanceRatio":   number   // optional PV PR derate (0.65–0.95)
 *   "shadingLossPct":     number   // optional shading loss in percent (0–50)
 *   "simulationYear":     number   // calendar year (e.g. 2023)
 * }
 *
 * Response: JSON array of 8 760 floats (kWh per hour, ≥ 0).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateInstantPhysics,
  generateDayScenario,
  type PhysicsEngineState,
  type SolarData,
} from '@/lib/physics-engine';
import {
  DEFAULT_SYSTEM_CONFIG,
  type SystemConfiguration,
} from '@/lib/system-config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EngineOutputRequestBody {
  latitude?: number;
  longitude?: number;
  solarCapacityKw?: number;
  batteryCapacityKwh?: number;
  tiltDeg?: number;
  azimuthDeg?: number;
  performanceRatio?: number;
  shadingLossPct?: number;
  simulationYear?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NAIROBI_MONTHLY_KWH_PER_KWP = [
  5.1, 5.3, 5.5, 5.2, 4.9, 4.8, 4.7, 4.9, 5.2, 5.4, 5.3, 5.0,
];
const NAIROBI_MONTHLY_TEMP = [
  22, 23, 23, 21, 19, 18, 17, 18, 19, 20, 21, 22,
];
const TICK_HOURS = 1; // hourly resolution for 8 760-step annual run

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: EngineOutputRequestBody = {};
  try {
    body = (await request.json()) as EngineOutputRequestBody;
  } catch {
    // Empty or invalid body – use all defaults
  }

  const latitude = body.latitude ?? -1.2921;
  const longitude = body.longitude ?? 36.8219;
  const solarCapacityKw = body.solarCapacityKw ?? DEFAULT_SYSTEM_CONFIG.solar.totalCapacityKw;
  const batteryCapacityKwh = body.batteryCapacityKwh ?? DEFAULT_SYSTEM_CONFIG.battery.capacityKwh;
  const simulationYear = body.simulationYear ?? new Date().getFullYear();

  // ------------------------------------------------------------------
  // Build a SystemConfiguration from the request params
  // ------------------------------------------------------------------
  const config: SystemConfiguration = {
    ...DEFAULT_SYSTEM_CONFIG,
    solar: {
      ...DEFAULT_SYSTEM_CONFIG.solar,
      totalCapacityKw: solarCapacityKw,
      panelCount: Math.round(solarCapacityKw / 0.42), // assume 420 W panels
      panelWattage: 420,
    },
    battery: {
      ...DEFAULT_SYSTEM_CONFIG.battery,
      capacityKwh: batteryCapacityKwh,
    },
    performanceRatio: Math.max(0.65, Math.min(0.95, body.performanceRatio ?? DEFAULT_SYSTEM_CONFIG.performanceRatio)),
    shadingLossPct: Math.max(0, Math.min(50, body.shadingLossPct ?? DEFAULT_SYSTEM_CONFIG.shadingLossPct)),
  };

  // ------------------------------------------------------------------
  // Solar data using Nairobi monthly averages as defaults
  // ------------------------------------------------------------------
  const solarData: SolarData = {
    latitude,
    longitude,
    annualAvgKwhPerKwp: 5.1,
    monthlyAvgKwhPerKwp: NAIROBI_MONTHLY_KWH_PER_KWP,
    monthlyAvgTemp: NAIROBI_MONTHLY_TEMP,
    tiltDeg: body.tiltDeg ?? 15,
    azimuthDeg: body.azimuthDeg ?? 180,
  };

  // ------------------------------------------------------------------
  // Physics engine state — initialised once, mutated across ticks
  // ------------------------------------------------------------------
  const state: PhysicsEngineState = {
    batteryKwh: batteryCapacityKwh * 0.5, // start at 50 % SOC
    evSocs: {},
    evIsHome: {},
    soilingFactor: 1.0,
  };

  // Initialise EV SOC state
  for (const load of config.loads) {
    if (load.type === 'ev') {
      state.evSocs[load.id] = 50;
      state.evIsHome[load.id] = true;
    }
  }

  // ------------------------------------------------------------------
  // Run 8 760 hourly ticks
  // ------------------------------------------------------------------
  const hourlyAcKwh: number[] = new Array(8760).fill(0);
  let currentDayOfYear = -1;
  let scenario = generateDayScenario(config, new Date(simulationYear, 0, 1), solarData, state.evSocs);

  for (let hourOfYear = 0; hourOfYear < 8760; hourOfYear++) {
    const dayOfYear = Math.floor(hourOfYear / 24);
    const hourOfDay = hourOfYear % 24;

    // Rebuild scenario once per calendar day
    if (dayOfYear !== currentDayOfYear) {
      currentDayOfYear = dayOfYear;
      const simDate = new Date(simulationYear, 0, 1);
      simDate.setDate(simDate.getDate() + dayOfYear);
      scenario = generateDayScenario(config, simDate, solarData, { ...state.evSocs });
    }

    const tick = calculateInstantPhysics(
      config,
      scenario,
      hourOfDay,           // timeOfDay in hours (0–23)
      solarData,
      state,
      'auto',
      true,                // gridEnabled
      hourOfDay >= 18 && hourOfDay < 22, // isPeakTime (18:00–22:00)
      25.0,                // peakRate (KES/kWh)
      15.0,                // offPeakRate (KES/kWh)
    );

    // solarPowerKw is instantaneous kW; multiply by TICK_HOURS (1 h) to get kWh
    hourlyAcKwh[hourOfYear] = Math.max(0, tick.solarPowerKw * TICK_HOURS);
  }

  return NextResponse.json(hourlyAcKwh);
}
