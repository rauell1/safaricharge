/**
 * Meteonorm API Integration (Fallback Weather Data Source)
 *
 * Provides an alternative weather data source alongside NASA POWER API.
 * Note: This is a simplified integration using open-meteo.com which provides
 * similar meteorological data without requiring API keys.
 *
 * For production use with actual Meteonorm, you would need:
 * - Meteonorm license and API credentials
 * - Update endpoints to use official Meteonorm API
 *
 * Current implementation uses Open-Meteo as a Meteonorm-like alternative
 * API Documentation: https://open-meteo.com/en/docs
 */

import type { SolarIrradianceData } from './nasa-power-api';

/**
 * Fetch solar irradiance data from Open-Meteo (Meteonorm alternative)
 * Uses the historical weather API for accurate location-specific data
 */
export async function fetchMeteonormData(
  latitude: number,
  longitude: number,
  locationName?: string
): Promise<SolarIrradianceData> {
  try {
    // Open-Meteo API endpoint for solar radiation data
    // We'll fetch one year of historical data and calculate monthly averages
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear - 1}-01-01`;
    const endDate = `${currentYear - 1}-12-31`;

    const params = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      start_date: startDate,
      end_date: endDate,
      daily: 'shortwave_radiation_sum,temperature_2m_mean',
      timezone: 'Africa/Nairobi',
    });

    const url = `https://archive-api.open-meteo.com/v1/archive?${params}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 24 hours since historical data doesn't change
      next: { revalidate: 86400 }
    });

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Extract daily radiation data (MJ/m²) and convert to kWh/m²/day
    const radiationData = data.daily.shortwave_radiation_sum; // MJ/m²/day
    const temperatureData = data.daily.temperature_2m_mean; // °C

    // Group by month and calculate averages
    const monthlyRadiation: number[][] = Array.from({ length: 12 }, () => []);
    const monthlyTemp: number[][] = Array.from({ length: 12 }, () => []);

    for (let i = 0; i < radiationData.length; i++) {
      const date = new Date(data.daily.time[i]);
      const month = date.getMonth(); // 0-11

      // Convert MJ/m² to kWh/m² (1 MJ = 0.2778 kWh)
      const radiationKwh = radiationData[i] * 0.2778;
      monthlyRadiation[month].push(radiationKwh);
      monthlyTemp[month].push(temperatureData[i]);
    }

    // Calculate monthly averages
    const monthlyAverage = monthlyRadiation.map(days =>
      days.length > 0 ? days.reduce((a, b) => a + b, 0) / days.length : 5.5
    );

    const monthlyTemperature = monthlyTemp.map(days =>
      days.length > 0 ? days.reduce((a, b) => a + b, 0) / days.length : 25.0
    );

    const peakSunHours = monthlyAverage; // Same as irradiance for solar calculations
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
    console.error('Failed to fetch Meteonorm/Open-Meteo data:', error);
    throw error; // Let caller handle fallback
  }
}

/**
 * Fetch solar data with automatic fallback between APIs
 * Tries NASA first, then Meteonorm/Open-Meteo
 */
export async function fetchSolarDataWithFallback(
  latitude: number,
  longitude: number,
  locationName?: string
): Promise<{ data: SolarIrradianceData; source: 'nasa' | 'meteonorm' | 'fallback' }> {
  // Import NASA API function
  const { fetchSolarData: fetchNASAData } = await import('./nasa-power-api');

  // Try NASA POWER API first
  try {
    console.log(`Fetching solar data from NASA POWER API for ${locationName || 'coordinates'}...`);
    const nasaData = await fetchNASAData(latitude, longitude, locationName);
    return { data: nasaData, source: 'nasa' };
  } catch (nasaError) {
    console.warn('NASA POWER API failed, trying Meteonorm/Open-Meteo...', nasaError);

    // Try Meteonorm/Open-Meteo as backup
    try {
      console.log(`Fetching solar data from Open-Meteo for ${locationName || 'coordinates'}...`);
      const meteoData = await fetchMeteonormData(latitude, longitude, locationName);
      return { data: meteoData, source: 'meteonorm' };
    } catch (meteoError) {
      console.warn('Meteonorm/Open-Meteo also failed, using fallback data...', meteoError);

      // Use fallback data (imported from nasa-power-api.ts which has the fallback function)
      const { fetchSolarData } = await import('./nasa-power-api');
      try {
        const fallbackData = await fetchSolarData(latitude, longitude, locationName);
        return { data: fallbackData, source: 'fallback' };
      } catch {
        // If even fallback fails, create basic estimates
        const baseIrradiance = 5.5 - Math.abs(latitude) * 0.3;
        const monthlyAverage = Array.from({ length: 12 }, (_, i) => {
          const month = i + 1;
          const isWetSeason = (month >= 3 && month <= 5) || (month >= 10 && month <= 12);
          return baseIrradiance * (isWetSeason ? 0.85 : 1.1);
        });

        return {
          data: {
            latitude,
            longitude,
            location: locationName || `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
            monthlyAverage,
            annualAverage: monthlyAverage.reduce((a, b) => a + b, 0) / 12,
            monthlyTemperature: Array.from({ length: 12 }, (_, i) => 22 + 8 * Math.sin(((i + 1 - 3) / 12) * 2 * Math.PI)),
            peakSunHours: monthlyAverage,
          },
          source: 'fallback'
        };
      }
    }
  }
}

/**
 * Validate and compare data from multiple sources
 * Returns averaged data if both sources are available
 */
export async function fetchAndValidateSolarData(
  latitude: number,
  longitude: number,
  locationName?: string
): Promise<{ data: SolarIrradianceData; sources: string[] }> {
  const results: { data: SolarIrradianceData; source: string }[] = [];

  // Import NASA API function
  const { fetchSolarData: fetchNASAData } = await import('./nasa-power-api');

  // Try both APIs in parallel
  const [nasaResult, meteoResult] = await Promise.allSettled([
    fetchNASAData(latitude, longitude, locationName).then(data => ({ data, source: 'NASA POWER' })),
    fetchMeteonormData(latitude, longitude, locationName).then(data => ({ data, source: 'Open-Meteo' })),
  ]);

  if (nasaResult.status === 'fulfilled') results.push(nasaResult.value);
  if (meteoResult.status === 'fulfilled') results.push(meteoResult.value);

  if (results.length === 0) {
    // Both failed, use fallback
    const fallback = await fetchSolarDataWithFallback(latitude, longitude, locationName);
    return { data: fallback.data, sources: ['Fallback'] };
  }

  if (results.length === 1) {
    // Only one source available
    return { data: results[0].data, sources: [results[0].source] };
  }

  // Both sources available - average the values for better accuracy
  const averaged: SolarIrradianceData = {
    latitude,
    longitude,
    location: locationName || results[0].data.location,
    monthlyAverage: results[0].data.monthlyAverage.map((val, i) =>
      (val + results[1].data.monthlyAverage[i]) / 2
    ),
    annualAverage: (results[0].data.annualAverage + results[1].data.annualAverage) / 2,
    monthlyTemperature: results[0].data.monthlyTemperature.map((val, i) =>
      (val + results[1].data.monthlyTemperature[i]) / 2
    ),
    peakSunHours: results[0].data.peakSunHours.map((val, i) =>
      (val + results[1].data.peakSunHours[i]) / 2
    ),
  };

  return {
    data: averaged,
    sources: results.map(r => r.source),
  };
}
