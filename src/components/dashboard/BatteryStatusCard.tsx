'use client';

import React from 'react';
import { Battery, BatteryCharging, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BatteryStatusCardProps {
  batteryLevel?: number;
  batteryPower?: number;
  capacity?: number;
  voltage?: number;
  temperature?: number;
  isCharging?: boolean;
}

export function BatteryStatusCard({
  batteryLevel = 85,
  batteryPower = 5.2,
  capacity = 20,
  voltage = 48.5,
  temperature = 32,
  isCharging = true,
}: BatteryStatusCardProps) {
  const getColor = (level: number) => {
    if (level >= 60) return { bar: 'bg-accent-energy', text: 'text-accent-energy', glow: 'shadow-glow-energy' };
    if (level >= 30) return { bar: 'bg-accent-solar', text: 'text-accent-solar', glow: 'shadow-glow-solar' };
    return { bar: 'bg-accent-alert', text: 'text-accent-alert', glow: 'shadow-glow-alert' };
  };

  const colors = getColor(batteryLevel);
  const storedKwh = ((batteryLevel / 100) * capacity).toFixed(1);

  return (
    <Card className="border-dark-border bg-secondary-900 rounded-2xl card-hover">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-dark-text-primary text-sm">
          {isCharging ? (
            <BatteryCharging className="h-4 w-4 text-accent-energy" />
          ) : (
            <Battery className="h-4 w-4 text-dark-text-secondary" />
          )}
          Battery Status
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Level display */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className={`text-3xl font-bold ${colors.text}`}>{batteryLevel}%</span>
            <span className="text-xs text-dark-text-secondary ml-2">{storedKwh} / {capacity} kWh</span>
          </div>
          <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${isCharging ? 'bg-accent-energy-transparent text-accent-energy' : 'bg-accent-alert-transparent text-accent-alert'}`}>
            <Zap className="h-3 w-3" />
            {isCharging ? 'Charging' : 'Discharging'}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 w-full rounded-full bg-primary border border-dark-border overflow-hidden mb-4">
          <div
            className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
            style={{ width: `${batteryLevel}%` }}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-primary border border-dark-border p-2 text-center">
            <div className="text-xs font-semibold text-dark-text-primary">{batteryPower.toFixed(1)} kW</div>
            <div className="text-[9px] text-dark-text-tertiary mt-0.5">Power</div>
          </div>
          <div className="rounded-lg bg-primary border border-dark-border p-2 text-center">
            <div className="text-xs font-semibold text-dark-text-primary">{voltage} V</div>
            <div className="text-[9px] text-dark-text-tertiary mt-0.5">Voltage</div>
          </div>
          <div className="rounded-lg bg-primary border border-dark-border p-2 text-center">
            <div className="text-xs font-semibold text-dark-text-primary">{temperature}°C</div>
            <div className="text-[9px] text-dark-text-tertiary mt-0.5">Temp</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
