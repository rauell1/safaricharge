'use client';

import React from 'react';
import { Sun, Home, Battery, UtilityPole, ArrowRight, Zap } from 'lucide-react';
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

function FlowLine({ active, color = 'accent-energy' }: { active: boolean; color?: string }) {
  if (!active) return <div className="h-0.5 w-16 bg-dark-border" />;

  return (
    <div className="relative h-0.5 w-16 bg-dark-border overflow-hidden">
      <div className={`absolute inset-0 bg-${color}`} />
      <div className={`absolute h-full w-4 bg-${color} blur-sm animate-flow-horizontal`} />
    </div>
  );
}

function PowerNode({
  icon: Icon,
  label,
  value,
  color,
  subLabel
}: {
  icon: any;
  label: string;
  value: number;
  color: string;
  subLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`relative flex h-20 w-20 items-center justify-center rounded-2xl bg-${color}-transparent border-2 border-${color}/50 transition-all duration-300 hover:scale-110 hover:shadow-glow-md`}>
        <Icon className={`h-10 w-10 text-${color}`} />
        {label === 'Battery' && (
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-secondary-900 border border-accent-energy">
            <span className="text-[10px] font-bold text-accent-energy">{Math.round(value)}%</span>
          </div>
        )}
      </div>
      <div className="text-center">
        <div className="text-xs font-medium text-dark-text-primary">{label}</div>
        {subLabel && (
          <div className={`text-sm font-bold text-${color}`}>
            {typeof value === 'number' && label !== 'Battery' ? value.toFixed(2) : value} {label !== 'Battery' ? 'kW' : ''}
          </div>
        )}
        {subLabel && <div className="text-[10px] text-dark-text-tertiary">{subLabel}</div>}
      </div>
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
          Power Flow Visualization
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-8 py-6">
          {/* Solar Panel */}
          <div>
            <PowerNode
              icon={Sun}
              label="Solar"
              value={solarPower}
              color="accent-solar"
              subLabel="Generation"
            />
          </div>

          {/* Flow from Solar */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center gap-2">
              <FlowLine active={flowDirection.solarToBattery} color="accent-solar" />
              <div className="rotate-90">
                {flowDirection.solarToBattery && (
                  <ArrowRight className="h-4 w-4 text-accent-solar" />
                )}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <FlowLine active={flowDirection.solarToHome} color="accent-solar" />
              <div className="rotate-90">
                {flowDirection.solarToHome && (
                  <ArrowRight className="h-4 w-4 text-accent-solar" />
                )}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <FlowLine active={flowDirection.solarToGrid} color="accent-grid" />
              <div className="rotate-90">
                {flowDirection.solarToGrid && (
                  <ArrowRight className="h-4 w-4 text-accent-grid" />
                )}
              </div>
            </div>
          </div>

          {/* Middle Row - Battery, Home, Grid */}
          <div className="flex items-center justify-center gap-12">
            <PowerNode
              icon={Battery}
              label="Battery"
              value={batteryLevel}
              color="accent-energy"
              subLabel={batteryPower >= 0 ? 'Charging' : 'Discharging'}
            />

            <PowerNode
              icon={Home}
              label="Home"
              value={homePower}
              color="accent-info"
              subLabel="Consumption"
            />

            <PowerNode
              icon={UtilityPole}
              label="Grid"
              value={Math.abs(gridPower)}
              color="accent-grid"
              subLabel={gridPower > 0 ? 'Import' : gridPower < 0 ? 'Export' : 'Standby'}
            />
          </div>

          {/* Flow to Home */}
          <div className="flex items-center gap-8">
            {flowDirection.batteryToHome && (
              <div className="flex flex-col items-center gap-2">
                <div className="rotate-90">
                  <ArrowRight className="h-4 w-4 text-accent-energy" />
                </div>
                <FlowLine active={true} color="accent-energy" />
                <div className="text-[10px] text-accent-energy">From Battery</div>
              </div>
            )}
            {flowDirection.gridToHome && (
              <div className="flex flex-col items-center gap-2">
                <div className="rotate-90">
                  <ArrowRight className="h-4 w-4 text-accent-grid" />
                </div>
                <FlowLine active={true} color="accent-grid" />
                <div className="text-[10px] text-accent-grid">From Grid</div>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Values Summary */}
        <div className="mt-6 grid grid-cols-3 gap-4 rounded-lg bg-primary p-4">
          <div className="text-center">
            <div className="text-xs text-dark-text-tertiary">Solar Power</div>
            <div className="text-lg font-bold text-accent-solar">{solarPower.toFixed(2)} kW</div>
          </div>
          <div className="text-center border-l border-r border-dark-border">
            <div className="text-xs text-dark-text-tertiary">Home Load</div>
            <div className="text-lg font-bold text-accent-info">{homePower.toFixed(2)} kW</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-dark-text-tertiary">Net Grid</div>
            <div className={`text-lg font-bold ${gridPower > 0 ? 'text-accent-alert' : 'text-accent-energy'}`}>
              {gridPower > 0 ? '+' : ''}{gridPower.toFixed(2)} kW
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
