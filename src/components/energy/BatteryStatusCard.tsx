'use client';

import React from 'react';
import { Battery, BatteryCharging, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface BatteryStatusCardProps {
  batteryLevel?: number;
  batteryPower?: number;
  capacity?: number;
  voltage?: number;
  temperature?: number;
  isCharging?: boolean;
  isLoading?: boolean;
  deratingPct?: number;
  showDeratingBadge?: boolean;
  showSoCBands?: boolean;
  minSoCBand?: number;
  maxSoCBand?: number;
}

export function BatteryStatusCard({
  batteryLevel = 85,
  batteryPower = 5.2,
  capacity = 20,
  voltage = 48.5,
  temperature = 32,
  isCharging = true,
  isLoading,
  deratingPct = 0,
  showDeratingBadge = false,
  showSoCBands = false,
  minSoCBand = 20,
  maxSoCBand = 90,
}: BatteryStatusCardProps) {
  const getColor = (level: number) => {
    if (level >= 60) return { bar: 'var(--battery)', text: 'var(--battery)' };
    if (level >= 30) return { bar: 'var(--solar)', text: 'var(--solar)' };
    return { bar: 'var(--alert)', text: 'var(--alert)' };
  };

  const colors = getColor(batteryLevel);
  const formattedLevel = Number.isFinite(batteryLevel) ? batteryLevel.toFixed(2) : '0.00';
  const storedKwh = ((batteryLevel / 100) * capacity).toFixed(1);
  const deratingClass =
    deratingPct > 15 ? 'text-red-600 bg-red-50' : deratingPct >= 5 ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50';

  if (isLoading) {
    return (
      <Card className="dashboard-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[var(--text-primary)] text-base font-semibold">
            <BatteryCharging className="h-4 w-4" style={{ color: 'var(--battery)' }} />
            Battery Status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-3">
            <div className="space-y-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full rounded-full mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg p-2 text-center border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <Skeleton className="h-4 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-8 mx-auto" />
            </div>
            <div className="rounded-lg p-2 text-center border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <Skeleton className="h-4 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-8 mx-auto" />
            </div>
            <div className="rounded-lg p-2 text-center border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
              <Skeleton className="h-4 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-8 mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-card">
      <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-[var(--text-primary)] text-base font-semibold">
          {isCharging ? (
            <BatteryCharging className="h-4 w-4" style={{ color: 'var(--battery)' }} />
          ) : (
            <Battery className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
          )}
          Battery Status
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-3xl font-bold" style={{ color: colors.text }}>{formattedLevel}%</span>
            <span className="text-sm text-[var(--text-secondary)] ml-2">{storedKwh} / {capacity} kWh</span>
          </div>
          <div className="flex items-center gap-2">
            {showDeratingBadge && (
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${deratingClass}`}>
                Derating {Math.max(0, deratingPct).toFixed(1)}%
              </span>
            )}
            <div
              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold"
              style={{
                backgroundColor: isCharging ? 'var(--battery-soft)' : 'var(--alert-soft)',
                color: isCharging ? 'var(--battery)' : 'var(--alert)'
              }}
            >
              <Zap className="h-3 w-3" />
              {isCharging ? 'Charging' : 'Discharging'}
            </div>
          </div>
        </div>
        <div className="space-y-1.5 mb-4">
          <div className="h-3 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${batteryLevel}%`, backgroundColor: colors.bar }}
            />
          </div>
          {showSoCBands && (
            <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
              <span>SoC band min {minSoCBand}%</span>
              <span>max {maxSoCBand}%</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-lg p-2 text-center border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <div className="text-sm font-semibold text-[var(--text-primary)]">{batteryPower.toFixed(1)} kW</div>
            <div className="text-sm text-[var(--text-tertiary)] mt-0.5">Power</div>
          </div>
          <div className="rounded-lg p-2 text-center border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <div className="text-sm font-semibold text-[var(--text-primary)]">{voltage} V</div>
            <div className="text-sm text-[var(--text-tertiary)] mt-0.5">Voltage</div>
          </div>
          <div className="rounded-lg p-2 text-center border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
            <div className="text-sm font-semibold text-[var(--text-primary)]">{temperature}°C</div>
            <div className="text-sm text-[var(--text-tertiary)] mt-0.5">Temp</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
