'use client';

import React from 'react';
import { Cloud, Sun, Wind, Droplets, Thermometer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WeatherCardProps {
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  condition?: string;
  irradiance?: number;
  locationName?: string;
}

export function WeatherCard({
  temperature = 28,
  humidity = 62,
  windSpeed = 12,
  condition = 'Partly Cloudy',
  irradiance = 720,
  locationName = 'Nairobi, Kenya',
}: WeatherCardProps) {
  const isSunny = condition.toLowerCase().includes('sun') || condition.toLowerCase().includes('clear');

  return (
    <Card className="border-dark-border bg-secondary-900">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-dark-text-primary text-sm">
          {isSunny ? (
            <Sun className="h-4 w-4 text-accent-solar" />
          ) : (
            <Cloud className="h-4 w-4 text-dark-text-secondary" />
          )}
          Weather &amp; Irradiance
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-3xl font-bold text-dark-text-primary">{temperature}°C</div>
            <div className="text-xs text-dark-text-secondary mt-0.5">{condition}</div>
            <div className="text-[10px] text-dark-text-tertiary">{locationName}</div>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-solar-transparent border border-accent-solar/20">
            {isSunny ? (
              <Sun className="h-8 w-8 text-accent-solar" />
            ) : (
              <Cloud className="h-8 w-8 text-dark-text-secondary" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center rounded-lg bg-primary border border-dark-border p-2">
            <Droplets className="h-3.5 w-3.5 text-accent-info mb-1" />
            <div className="text-xs font-semibold text-dark-text-primary">{humidity}%</div>
            <div className="text-[9px] text-dark-text-tertiary">Humidity</div>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-primary border border-dark-border p-2">
            <Wind className="h-3.5 w-3.5 text-accent-grid mb-1" />
            <div className="text-xs font-semibold text-dark-text-primary">{windSpeed} km/h</div>
            <div className="text-[9px] text-dark-text-tertiary">Wind</div>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-primary border border-dark-border p-2">
            <Thermometer className="h-3.5 w-3.5 text-accent-solar mb-1" />
            <div className="text-xs font-semibold text-dark-text-primary">{irradiance} W/m²</div>
            <div className="text-[9px] text-dark-text-tertiary">Solar</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
