'use client';

import React from 'react';
import { Sun, Home, Battery, UtilityPole, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PowerFlowVisualizationProps {
  solarPower: number;
  batteryPower: number;
  gridPower: number;
  homePower: number;
  batteryLevel: number;
  flowDirection: {
    solarToHome: boolean;
    solarToBattery: boolean;
    solarToGrid: boolean;
    batteryToHome: boolean;
    gridToHome: boolean;
  };
}

interface NodeProps {
  icon: React.ElementType;
  label: string;
  valueLine: string;
  subLabel: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  glowClass: string;
  badgeContent?: React.ReactNode;
}

function EnergyNode({ icon: Icon, label, valueLine, subLabel, colorClass, bgClass, borderClass, glowClass, badgeContent }: NodeProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative flex h-20 w-20 items-center justify-center rounded-full ${bgClass} border-2 ${borderClass} transition-all duration-300 hover:scale-105 ${glowClass}`}>
        <div className={`absolute inset-1 rounded-full border border-dashed ${borderClass} opacity-60 animate-[spin_8s_linear_infinite]`} />
        <Icon className={`relative z-10 h-9 w-9 ${colorClass}`} />
        {badgeContent && (
          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-secondary-900 border border-dark-border text-[10px] font-bold text-accent-energy">
            {badgeContent}
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-dark-text-primary">{label}</p>
        <p className={`text-sm font-bold ${colorClass}`}>{valueLine}</p>
        <p className="text-[10px] text-dark-text-tertiary">{subLabel}</p>
      </div>
    </div>
  );
}

interface FlowPathProps {
  active: boolean;
  vertical?: boolean;
  colorClass: string;
  trackClass: string;
  reversed?: boolean;
}

function FlowPath({ active, vertical = false, colorClass, trackClass, reversed = false }: FlowPathProps) {
  const base = vertical
    ? 'w-0.5 h-16 mx-auto'
    : 'h-0.5 w-16 my-auto';
  if (!active) {
    return <div className={`${base} bg-dark-border rounded-full`} />;
  }

  const particleAnimation = vertical
    ? (reversed ? 'flow-up' : 'flow-down')
    : (reversed ? 'flow-right-to-left' : 'flow-left-to-right');

  return (
    <div className={`${base} relative overflow-hidden rounded-full ${trackClass}`}>
      <div
        className={`absolute rounded-full ${colorClass}`}
        style={{
          ...(vertical
            ? { width: '100%', height: '40%', animation: `${particleAnimation} 1.2s linear infinite` }
            : { height: '100%', width: '40%', animation: `${particleAnimation} 1.2s linear infinite` }
          )
        }}
      />
    </div>
  );
}

export function PowerFlowVisualization({
  solarPower,
  batteryPower,
  gridPower,
  homePower,
  batteryLevel,
  flowDirection
}: PowerFlowVisualizationProps) {
  return (
    <Card className="border-dark-border bg-secondary-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-dark-text-primary">
          <Zap className="h-5 w-5 text-accent-energy" />
          Energy Flow
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Layout: Solar (top center), Battery (bottom-left), Home (bottom-center), Grid (bottom-right) */}
        <div className="flex flex-col items-center gap-0 py-4 select-none">

          {/* TOP: Solar */}
          <EnergyNode
            icon={Sun}
            label="Solar"
            valueLine={`${solarPower.toFixed(2)} kW`}
            subLabel="Generation"
            colorClass="text-accent-solar"
            bgClass="bg-accent-solar-transparent"
            borderClass="border-accent-solar/40"
            glowClass="hover:shadow-glow-solar"
          />

          {/* Vertical line from Solar down */}
          <div className="flex justify-center py-1">
            <FlowPath active={flowDirection.solarToHome || flowDirection.solarToBattery || flowDirection.solarToGrid} vertical colorClass="bg-accent-solar" trackClass="bg-accent-solar-transparent" />
          </div>

          {/* Middle horizontal connector row */}
          <div className="flex items-center justify-center w-full max-w-xs gap-0">
            {/* Battery side */}
            <div className="flex-1 flex justify-end">
              <FlowPath active={flowDirection.solarToBattery} colorClass="bg-accent-energy" trackClass="bg-accent-energy-transparent" />
            </div>
            {/* Center hub dot */}
            <div className="h-3 w-3 rounded-full bg-accent-solar border-2 border-accent-solar/60 shadow-glow-solar flex-shrink-0" />
            {/* Grid side */}
            <div className="flex-1 flex justify-start">
              <FlowPath active={flowDirection.solarToGrid} colorClass="bg-accent-grid" trackClass="bg-accent-grid-transparent" reversed />
            </div>
          </div>

          {/* BOTTOM ROW: Battery | Home | Grid */}
          <div className="flex items-start justify-center w-full max-w-xs gap-2 mt-1">
            {/* Battery */}
            <div className="flex-1 flex flex-col items-center gap-1">
              <FlowPath active={flowDirection.solarToBattery || flowDirection.batteryToHome} vertical colorClass="bg-accent-energy" trackClass="bg-accent-energy-transparent" />
              <EnergyNode
                icon={Battery}
                label="Battery"
                valueLine={`${Math.abs(batteryPower).toFixed(1)} kW`}
                subLabel={batteryPower >= 0 ? 'Charging' : 'Discharging'}
                colorClass="text-accent-energy"
                bgClass="bg-accent-energy-transparent"
                borderClass="border-accent-energy/40"
                glowClass="hover:shadow-glow-energy"
                badgeContent={`${Math.round(batteryLevel)}%`}
              />
            </div>

            {/* Home center */}
            <div className="flex-1 flex flex-col items-center gap-1">
              <FlowPath active={flowDirection.solarToHome} vertical colorClass="bg-accent-solar" trackClass="bg-accent-solar-transparent" />
              <EnergyNode
                icon={Home}
                label="Home"
                valueLine={`${homePower.toFixed(2)} kW`}
                subLabel="Consumption"
                colorClass="text-accent-info"
                bgClass="bg-accent-info-transparent"
                borderClass="border-accent-info/40"
                glowClass="hover:shadow-glow-md"
              />
            </div>

            {/* Grid */}
            <div className="flex-1 flex flex-col items-center gap-1">
              <FlowPath active={flowDirection.solarToGrid || flowDirection.gridToHome} vertical colorClass="bg-accent-grid" trackClass="bg-accent-grid-transparent" />
              <EnergyNode
                icon={UtilityPole}
                label="Grid"
                valueLine={`${Math.abs(gridPower).toFixed(2)} kW`}
                subLabel={gridPower > 0 ? 'Importing' : gridPower < 0 ? 'Exporting' : 'Standby'}
                colorClass="text-accent-grid"
                bgClass="bg-accent-grid-transparent"
                borderClass="border-accent-grid/40"
                glowClass="hover:shadow-glow-md"
              />
            </div>
          </div>
        </div>

        {/* Real-time Values Summary */}
        <div className="mt-6 grid grid-cols-3 gap-4 rounded-xl bg-primary border border-dark-border p-4">
          <div className="text-center">
            <div className="text-[10px] text-dark-text-tertiary uppercase tracking-wide mb-1">Solar</div>
            <div className="text-base font-bold text-accent-solar">{solarPower.toFixed(2)} kW</div>
          </div>
          <div className="text-center border-l border-r border-dark-border">
            <div className="text-[10px] text-dark-text-tertiary uppercase tracking-wide mb-1">Home Load</div>
            <div className="text-base font-bold text-accent-info">{homePower.toFixed(2)} kW</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-dark-text-tertiary uppercase tracking-wide mb-1">Net Grid</div>
            <div className={`text-base font-bold ${gridPower > 0 ? 'text-accent-alert' : 'text-accent-energy'}`}>
              {gridPower > 0 ? '+' : ''}{gridPower.toFixed(2)} kW
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
