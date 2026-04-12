'use client';

import React from 'react';
import { Cloud, Sun, Wind, Droplets, Thermometer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface WeatherCardProps {
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  condition?: string;
  irradiance?: number;
  locationName?: string;
  isLoading?: boolean;
}

export function WeatherCard({
  temperature = 28,
  humidity = 62,
  windSpeed = 12,
  condition = 'Partly Cloudy',
  irradiance = 720,
  locationName = 'Nairobi, Kenya',
  isLoading,
}: WeatherCardProps) {
  const isSunny = condition.toLowerCase().includes('sun') || condition.toLowerCase().includes('clear');

  if (isLoading) {
    return (
      <Card className="dashboard-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[var(--text-primary)] text-sm">
            <Sun className="h-4 w-4" style={{ color: 'var(--solar)' }} />
            Weather &amp; Irradiance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-4">
            <div className="space-y-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-16 w-16 rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[0,1,2].map(i => (
              <div key={i} className="flex flex-col items-center rounded-lg p-2 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                <Skeleton className="h-3.5 w-3.5 mb-1" />
                <Skeleton className="h-4 w-10 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2.5 text-[var(--text-primary)] text-base font-semibold">
          {isSunny ? <Sun className="h-4.5 w-4.5" style={{ color: 'var(--solar)' }} aria-hidden="true" /> : <Cloud className="h-4.5 w-4.5" style={{ color: 'var(--text-secondary)' }} aria-hidden="true" />}
          <span>Weather &amp; Irradiance</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-3xl font-bold text-[var(--text-primary)]">{temperature}°C</div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5">{condition}</div>
            <div className="text-[10px] text-[var(--text-tertiary)]">{locationName}</div>
          </div>
          <div className="flex h-16 w-16 items-center justify-center rounded-full border" style={{ backgroundColor: 'var(--solar-soft)', borderColor: 'var(--border)' }}>
            {isSunny ? <Sun className="h-8 w-8" style={{ color: 'var(--solar)' }} /> : <Cloud className="h-8 w-8" style={{ color: 'var(--text-secondary)' }} />}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="flex flex-col items-center rounded-lg p-2 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <Droplets className="h-3.5 w-3.5 mb-1" style={{ color: 'var(--consumption)' }} />
            <div className="text-xs font-semibold text-[var(--text-primary)]">{humidity}%</div>
            <div className="text-[9px] text-[var(--text-tertiary)]">Humidity</div>
          </div>
          <div className="flex flex-col items-center rounded-lg p-2 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <Wind className="h-3.5 w-3.5 mb-1" style={{ color: 'var(--grid)' }} />
            <div className="text-xs font-semibold text-[var(--text-primary)]">{windSpeed} km/h</div>
            <div className="text-[9px] text-[var(--text-tertiary)]">Wind</div>
          </div>
          <div className="flex flex-col items-center rounded-lg p-2 border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <Thermometer className="h-3.5 w-3.5 mb-1" style={{ color: 'var(--solar)' }} />
            <div className="text-xs font-semibold text-[var(--text-primary)]">{irradiance} W/m²</div>
            <div className="text-[9px] text-[var(--text-tertiary)]">Solar</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
