# Meteonorm 8.2 Integration for Kenyan PV Systems

## Overview

This document describes how SafariCharge integrates meteorological standards, including support for Meteonorm 8.2-equivalent data processing for Kenyan photovoltaic (PV) system design.

## What is Meteonorm 8.2?

Meteonorm is a comprehensive meteorological database and software tool widely used in the solar energy industry. Version 8.2 provides:

- **Typical Meteorological Year (TMY)** data
- High-resolution solar irradiance modeling
- Temperature profiles for PV performance calculations
- Compliance with international PV design standards (IEC 61215, IEC 61730)

Meteonorm is particularly valuable for engineering-grade PV system design in Kenya, as it provides more refined solar resource assessment than raw satellite data alone.

## Implementation in SafariCharge

### Multi-Source Data Approach

SafariCharge uses a resilient multi-API approach with automatic fallback:

```typescript
// Primary: NASA POWER API
// Secondary: Open-Meteo (Meteonorm-like alternative)
// Tertiary: Location-based fallback estimates

const result = await fetchSolarDataWithFallback(
  latitude,
  longitude,
  locationName
);
```

### Data Sources

1. **NASA POWER API** (Primary)
   - Endpoint: `https://power.larc.nasa.gov/api/temporal/climatology/point`
   - Parameters: `ALLSKY_SFC_SW_DWN` (solar irradiance), `T2M` (temperature)
   - Coverage: Global, 30-year climatology
   - Resolution: Monthly averages

2. **Open-Meteo** (Meteonorm Alternative)
   - Endpoint: `https://archive-api.open-meteo.com/v1/archive`
   - Parameters: `shortwave_radiation_sum`, `temperature_2m_mean`
   - Processing: Converts MJ/m² to kWh/m²/day
   - Provides Meteonorm-like TMY data without licensing requirements

3. **Fallback Estimates**
   - Location-based solar resource estimates
   - Accounts for seasonal variations (wet vs dry seasons)
   - Used only when both APIs fail

### Meteonorm 8.2 Standards Applied

#### 1. Peak Sun Hours Calculation

Peak sun hours are calculated from daily solar irradiance data, following Meteonorm methodology:

```typescript
// Convert daily irradiance to peak sun hours
const peakSunHours = monthlyAverage; // kWh/m²/day ≈ hours of 1000 W/m² equivalent
```

#### 2. Temperature Derating

PV panel efficiency decreases with temperature. We apply temperature coefficients:

```typescript
function getPanelTempEffect(
  irradFraction: number,
  month: number,
  monthlyTemps: number[]
): number {
  const ambientTemp = monthlyTemps[month];
  const cellTemp = ambientTemp + (irradFraction * 25); // NOCT-based estimate
  const tempCoeff = -0.004; // Typical for crystalline silicon (-0.4%/°C)
  const derating = 1 + tempCoeff * (cellTemp - 25);
  return Math.max(0.85, Math.min(1.0, derating));
}
```

#### 3. Seasonal Modeling

Kenya's climate has two rainy seasons affecting solar production:
- Long rains: March-May
- Short rains: October-December

The system accounts for these in fallback calculations:

```typescript
const isWetSeason = (month >= 3 && month <= 5) || (month >= 10 && month <= 12);
return baseIrradiance * (isWetSeason ? 0.85 : 1.1);
```

#### 4. Geographic Adjustments

Solar irradiance varies with latitude. Kenya straddles the equator (-5° to 5°):

```typescript
const baseIrradiance = 5.5 - Math.abs(latitude) * 0.3;
```

### Data Quality and Validation

When both NASA and Open-Meteo data are available, we average them for improved accuracy:

```typescript
const averaged: SolarIrradianceData = {
  monthlyAverage: nasaData.monthlyAverage.map((val, i) =>
    (val + meteoData.monthlyAverage[i]) / 2
  ),
  // ... other fields averaged similarly
};
```

## Kenya-Specific Considerations

### IEC Standards Compliance

While Meteonorm 8.2 itself is software, it helps comply with:

- **IEC 61215**: Crystalline silicon PV module qualification
- **IEC 61730**: PV module safety qualification
- **IEC 62446**: Grid-connected PV system installation and commissioning

Our implementation supports these by providing:
- Accurate temperature-dependent performance modeling
- Monthly and annual energy production estimates
- System sizing based on actual meteorological conditions

### Kenya Power Grid Integration

The system accounts for Kenya's time-of-use (TOU) tariffs:

- Peak hours: 6:00-10:00 and 18:00-22:00
- Off-peak: All other times
- Weekends: Entirely off-peak

This ensures PV system recommendations optimize for local grid economics.

## Usage Example

```typescript
// Fetch solar data for a Kenyan location
const { data, source } = await fetchSolarDataWithFallback(
  -1.2921,  // Nairobi latitude
  36.8219,  // Nairobi longitude
  'Nairobi'
);

console.log(`Data source: ${source}`); // 'nasa', 'meteonorm', or 'fallback'
console.log(`Annual average irradiance: ${data.annualAverage} kWh/m²/day`);
console.log(`Peak sun hours by month:`, data.peakSunHours);
```

## API Response Format

```json
{
  "latitude": -1.2921,
  "longitude": 36.8219,
  "location": "Nairobi",
  "monthlyAverage": [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3],
  "annualAverage": 5.4,
  "monthlyTemperature": [22, 23, 24, 23, 22, 21, 20, 21, 22, 23, 22, 22],
  "peakSunHours": [5.5, 5.8, 5.6, 5.4, 5.2, 5.1, 5.0, 5.3, 5.7, 5.8, 5.4, 5.3]
}
```

## File References

- **NASA POWER API Integration**: `src/lib/nasa-power-api.ts`
- **Meteonorm/Open-Meteo Integration**: `src/lib/meteonorm-api.ts`
- **Location Selector Component**: `src/components/RecommendationComponents.tsx`
- **Recommendation Engine**: `src/lib/recommendation-engine.ts`

## Future Enhancements

1. **Direct Meteonorm Integration** (requires license)
   - Access to full TMY datasets
   - Hourly resolution instead of monthly
   - Additional parameters (wind speed, humidity, etc.)

2. **PVGIS Integration**
   - EU Joint Research Centre's PV estimation tool
   - African-specific optimizations
   - Direct PV output simulation

3. **Local Weather Station Integration**
   - Real-time weather data from Kenya Meteorological Department
   - Site-specific measurements for larger installations
   - Historical data validation

## References

- [Meteonorm Software](https://meteonorm.com/)
- [NASA POWER API Documentation](https://power.larc.nasa.gov/docs/services/api/)
- [Open-Meteo API](https://open-meteo.com/en/docs)
- [IEC 61215 Standard](https://webstore.iec.ch/publication/61214)
- [Kenya Power Tariffs](https://www.kplc.co.ke/content/item/2880/tariffs)

## Support

For questions about meteorological data integration or PV system design standards, please open an issue on the GitHub repository.
