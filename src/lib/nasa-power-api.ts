/**
 * NASA POWER API Integration
 *
 * Fetches location-specific solar irradiance data for anywhere in Kenya.
 * NASA POWER API provides free access to meteorological and solar data
 * covering every coordinate globally with daily resolution.
 *
 * API Documentation: https://power.larc.nasa.gov/docs/services/api/
 */

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  name: string;
}

export interface SolarIrradianceData {
  latitude: number;
  longitude: number;
  location: string;
  // Average daily solar irradiance by month (kWh/m²/day)
  monthlyAverage: number[];
  // Annual average (kWh/m²/day)
  annualAverage: number;
  // Temperature data by month (°C)
  monthlyTemperature: number[];
  // Peak sun hours by month
  peakSunHours: number[];
}

// Common Kenya locations with coordinates
export const KENYA_LOCATIONS: LocationCoordinates[] = [
  { latitude: -1.2921, longitude: 36.8219, name: 'Nairobi' },
  { latitude: -0.0917, longitude: 34.7680, name: 'Kisumu' },
  { latitude: -4.0435, longitude: 39.6682, name: 'Mombasa' },
  { latitude: 0.5143, longitude: 35.2698, name: 'Eldoret' },
  { latitude: -0.2827, longitude: 36.0800, name: 'Nakuru' },
  { latitude: 3.1167, longitude: 35.6000, name: 'Turkana (Lodwar)' },
  { latitude: -0.6799, longitude: 34.7520, name: 'Kisii' },
  { latitude: -1.5177, longitude: 37.2674, name: 'Embu' },
  { latitude: 0.3556, longitude: 37.6486, name: 'Meru' },
  { latitude: -3.3869, longitude: 38.5626, name: 'Garissa' },
];

/**
 * Fetch solar irradiance data from NASA POWER API
 * Uses the climatology endpoint for monthly averages over 30-year period
 */
export async function fetchSolarData(
  latitude: number,
  longitude: number,
  locationName?: string
): Promise<SolarIrradianceData> {
  try {
    // NASA POWER API endpoint for solar irradiance data
    // Parameters: ALLSKY_SFC_SW_DWN = All Sky Surface Shortwave Downward Irradiance
    //             T2M = Temperature at 2 Meters
    const params = new URLSearchParams({
      start: '20100101',
      end: '20201231',
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      community: 'RE', // Renewable Energy community
      parameters: 'ALLSKY_SFC_SW_DWN,T2M',
      format: 'JSON',
      header: 'false',
      'time-standard': 'UTC'
    });

    const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?${params}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 24 hours since climatology data doesn't change frequently
      next: { revalidate: 86400 }
    });

    if (!response.ok) {
      throw new Error(`NASA POWER API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const irradianceData = data.properties.parameter.ALLSKY_SFC_SW_DWN;
    const temperatureData = data.properties.parameter.T2M;

    // The temporal/monthly endpoint keys entries as YYYYMM (e.g. "201001").
    // Aggregate all entries for each calendar month and average across years.
    const irradSums: number[] = Array(12).fill(0);
    const irradCounts: number[] = Array(12).fill(0);
    const tempSums: number[] = Array(12).fill(0);
    const tempCounts: number[] = Array(12).fill(0);

    for (const [key, val] of Object.entries(irradianceData)) {
      if (key.length === 6) {
        // YYYYMM format: extract the MM portion and convert to a 0-based index
        // (e.g. "201001" → month "01" → index 0; "202012" → month "12" → index 11)
        const monthIdx = parseInt(key.slice(4), 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12 && typeof val === 'number' && val > 0) {
          irradSums[monthIdx] += val;
          irradCounts[monthIdx]++;
        }
      }
    }
    for (const [key, val] of Object.entries(temperatureData)) {
      if (key.length === 6) {
        const monthIdx = parseInt(key.slice(4), 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12 && typeof val === 'number') {
          tempSums[monthIdx] += val;
          tempCounts[monthIdx]++;
        }
      }
    }

    // Convert to arrays (months 1-12)
    const monthlyAverage: number[] = [];
    const monthlyTemperature: number[] = [];
    const peakSunHours: number[] = [];

    for (let i = 0; i < 12; i++) {
      const irradiance = irradCounts[i] > 0 ? irradSums[i] / irradCounts[i] : 5.5;
      const temp = tempCounts[i] > 0 ? tempSums[i] / tempCounts[i] : 25.0;
      monthlyAverage.push(irradiance);
      monthlyTemperature.push(temp);
      peakSunHours.push(irradiance);
    }

    const annualAverage = monthlyAverage.reduce((a, b) => a + b, 0) / 12;

    return {
      latitude,
      longitude,
      location: locationName || `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
      monthlyAverage,
      annualAverage,
      monthlyTemperature,
      peakSunHours,
    };
  } catch (error) {
    console.error('Failed to fetch NASA POWER data:', error);

    // Fallback to Nairobi-like values if API fails
    return getFallbackData(latitude, longitude, locationName);
  }
}

/**
 * Fallback data based on typical Equatorial East Africa patterns
 * Used when NASA API is unavailable
 */
function getFallbackData(
  latitude: number,
  longitude: number,
  locationName?: string
): SolarIrradianceData {
  // Rough estimation based on latitude:
  // Near equator (Turkana, northern Kenya): higher irradiance (~6-7 kWh/m²/day)
  // Central Kenya (Nairobi): moderate (~5-6 kWh/m²/day)
  // Coastal/wetter areas: slightly lower (~4.5-5.5 kWh/m²/day)

  const baseIrradiance = 5.5 - Math.abs(latitude) * 0.3;

  // Seasonal variation (dry vs wet seasons)
  const monthlyAverage = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    // Kenya has bimodal rainfall: Mar-May and Oct-Dec are wetter
    const isWetSeason = (month >= 3 && month <= 5) || (month >= 10 && month <= 12);
    const seasonalFactor = isWetSeason ? 0.85 : 1.1;
    return baseIrradiance * seasonalFactor;
  });

  const monthlyTemperature = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    // Simplified temperature model for Kenya
    return 22 + 8 * Math.sin(((month - 3) / 12) * 2 * Math.PI);
  });

  return {
    latitude,
    longitude,
    location: locationName || `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
    monthlyAverage,
    annualAverage: monthlyAverage.reduce((a, b) => a + b, 0) / 12,
    monthlyTemperature,
    peakSunHours: monthlyAverage,
  };
}

/**
 * Get solar data for a predefined Kenya location
 */
export async function getSolarDataForLocation(
  locationName: string
): Promise<SolarIrradianceData | null> {
  const location = KENYA_LOCATIONS.find(
    loc => loc.name.toLowerCase() === locationName.toLowerCase()
  );

  if (!location) {
    return null;
  }

  return fetchSolarData(location.latitude, location.longitude, location.name);
}

/**
 * Calculate solar peak hour based on latitude and month
 * More accurate than hardcoded values
 */
export function calculateSeasonalPeakHour(latitude: number, month: number): number {
  // In the Northern Hemisphere, sun peaks earlier in summer (June)
  // In the Southern Hemisphere, sun peaks earlier in winter (June)
  // At the equator, variation is minimal

  const latitudeEffect = Math.abs(latitude) * 0.05; // 0.05 hours per degree
  const phaseRad = ((month - 6) / 12) * 2 * Math.PI;

  // Base peak at solar noon (12:00)
  // Adjust based on latitude and season
  const adjustment = Math.cos(phaseRad) * latitudeEffect * Math.sign(latitude);

  return 12.75 + adjustment; // Slightly after noon due to time zones
}

/**
 * Build a physically-plausible hourly irradiance profile whose daily integral
 * matches NASA POWER monthly daily climatology (kWh/m²/day).
 *
 * Output units are kW/m² for each timestep.
 */
export function buildHourlyIrradianceProfile(
  monthlyAverage: number[],
  month: number,
  latitude: number,
  stepsPerHour: number = 1
): number[] {
  const safeStepsPerHour = Math.max(1, Math.floor(stepsPerHour));
  const totalSteps = 24 * safeStepsPerHour;
  const dtHours = 1 / safeStepsPerHour;
  const monthIndex = Math.min(11, Math.max(0, month - 1));
  const dailyEnergyKwhM2 = Math.max(0, monthlyAverage[monthIndex] ?? 0);

  if (dailyEnergyKwhM2 <= 0) {
    return Array(totalSteps).fill(0);
  }

  // Approximate daylight duration from latitude + solar declination.
  // Declination approximation (degrees): 23.45 * sin(2π(284+n)/365)
  const dayOfYearMidMonth = [15, 45, 74, 105, 135, 166, 196, 227, 258, 288, 319, 349][monthIndex];
  const declinationDeg = 23.45 * Math.sin((2 * Math.PI * (284 + dayOfYearMidMonth)) / 365);
  const latRad = (latitude * Math.PI) / 180;
  const decRad = (declinationDeg * Math.PI) / 180;
  const cosWs = Math.max(-1, Math.min(1, -Math.tan(latRad) * Math.tan(decRad)));
  const omegaSunset = Math.acos(cosWs);
  const dayLengthHours = (2 * omegaSunset * 24) / (2 * Math.PI);

  const sunrise = 12 - dayLengthHours / 2;
  const sunset = 12 + dayLengthHours / 2;

  const shape: number[] = [];
  for (let step = 0; step < totalSteps; step++) {
    const hour = step / safeStepsPerHour + dtHours / 2;
    if (hour <= sunrise || hour >= sunset) {
      shape.push(0);
      continue;
    }

    const dayProgress = (hour - sunrise) / Math.max(0.1, dayLengthHours);
    // Smooth clear-sky-like envelope (0..1) during daylight
    const envelope = Math.max(0, Math.sin(Math.PI * dayProgress));
    shape.push(envelope);
  }

  const shapeIntegral = shape.reduce((sum, value) => sum + value * dtHours, 0);
  if (shapeIntegral <= 0) {
    return Array(totalSteps).fill(0);
  }

  // Scale profile to match NASA daily energy (kWh/m²/day)
  const scale = dailyEnergyKwhM2 / shapeIntegral;
  return shape.map(value => value * scale);
}
