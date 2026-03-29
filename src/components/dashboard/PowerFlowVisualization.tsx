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
  accent: string;
  tint: string;
  badgeContent?: React.ReactNode;
}

function EnergyNode({ icon: Icon, label, valueLine, subLabel, accent, tint, badgeContent }: NodeProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center">
        <div
          className="absolute inset-[-10px] rounded-full border border-dashed opacity-60 animate-[spin_12s_linear_infinite]"
          style={{ borderColor: accent }}
        />
        <div
          className="absolute inset-[-4px] rounded-full blur-xl opacity-30"
          style={{ background: accent }}
        />
        <div
          className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all duration-300 hover:scale-105"
          style={{ backgroundColor: tint, borderColor: accent, boxShadow: '0 10px 30px rgba(0, 0, 0, 0.28)' }}
        >
          <Icon className="h-9 w-9" style={{ color: accent }} />
          {badgeContent && (
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--battery)' }}>
              {badgeContent}
            </div>
          )}
        </div>
      </div>
      <div className="text-center space-y-0.5">
        <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-sm font-bold" style={{ color: accent }}>{valueLine}</p>
        <p className="text-[10px] text-[var(--text-tertiary)]">{subLabel}</p>
      </div>
    </div>
  );
}

interface FlowPathProps {
  active: boolean;
  vertical?: boolean;
  accent: string;
  tint: string;
  reversed?: boolean;
}

function FlowPath({ active, vertical = false, accent, tint, reversed = false }: FlowPathProps) {
  const base = vertical
    ? 'w-0.5 h-20 mx-auto'
    : 'h-0.5 w-20 my-auto';
  if (!active) {
    return <div className={`${base} rounded-full`} style={{ backgroundColor: 'var(--border)' }} />;
  }

  const particleAnimation = vertical
    ? (reversed ? 'flow-up' : 'flow-down')
    : (reversed ? 'flow-right-to-left' : 'flow-left-to-right');

  return (
    <div className={`${base} relative overflow-hidden rounded-full`} style={{ backgroundColor: tint }}>
      <div
        className="absolute rounded-full"
        style={{
          background: vertical
            ? `linear-gradient(${reversed ? '0deg' : '180deg'}, transparent, ${accent})`
            : `linear-gradient(${reversed ? '270deg' : '90deg'}, transparent, ${accent})`,
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
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
          <Zap className="h-5 w-5 text-[var(--battery)]" />
          Energy Flow
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 py-4 select-none">
          <EnergyNode
            icon={Sun}
            label="Solar"
            valueLine={`${solarPower.toFixed(2)} kW`}
            subLabel="Generation"
            accent="var(--solar)"
            tint="var(--solar-soft)"
          />

          <div className="flex justify-center py-1">
            <FlowPath
              active={flowDirection.solarToHome || flowDirection.solarToBattery || flowDirection.solarToGrid}
              vertical
              accent="var(--solar)"
              tint="var(--solar-soft)"
            />
          </div>

          <div className="flex items-center justify-center w-full max-w-xl gap-6">
            <div className="flex-1 flex justify-end">
              <FlowPath
                active={flowDirection.solarToBattery}
                accent="var(--battery)"
                tint="var(--battery-soft)"
              />
            </div>
            <div className="h-4 w-4 rounded-full border-2 shadow-[0_0_0_6px_rgba(245,158,11,0.1)]"
              style={{ backgroundColor: 'var(--solar)', borderColor: 'var(--solar)' }} />
            <div className="flex-1 flex justify-start">
              <FlowPath
                active={flowDirection.solarToGrid}
                accent="var(--grid)"
                tint="var(--grid-soft)"
                reversed
              />
            </div>
          </div>

          <div className="flex items-start justify-center w-full max-w-3xl gap-6 mt-1">
            <div className="flex-1 flex flex-col items-center gap-2">
              <FlowPath
                active={flowDirection.solarToBattery || flowDirection.batteryToHome}
                vertical
                accent="var(--battery)"
                tint="var(--battery-soft)"
              />
              <EnergyNode
                icon={Battery}
                label="Battery"
                valueLine={`${Math.abs(batteryPower).toFixed(1)} kW`}
                subLabel={batteryPower >= 0 ? 'Charging' : 'Discharging'}
                accent="var(--battery)"
                tint="var(--battery-soft)"
                badgeContent={`${Math.round(batteryLevel)}%`}
              />
            </div>

            <div className="flex-1 flex flex-col items-center gap-2">
              <FlowPath
                active={flowDirection.solarToHome}
                vertical
                accent="var(--solar)"
                tint="var(--solar-soft)"
              />
              <EnergyNode
                icon={Home}
                label="Home"
                valueLine={`${homePower.toFixed(2)} kW`}
                subLabel="Consumption"
                accent="var(--consumption)"
                tint="var(--consumption-soft)"
              />
            </div>

            <div className="flex-1 flex flex-col items-center gap-2">
              <FlowPath
                active={flowDirection.solarToGrid || flowDirection.gridToHome}
                vertical
                accent="var(--grid)"
                tint="var(--grid-soft)"
              />
              <EnergyNode
                icon={UtilityPole}
                label="Grid"
                valueLine={`${Math.abs(gridPower).toFixed(2)} kW`}
                subLabel={gridPower > 0 ? 'Importing' : gridPower < 0 ? 'Exporting' : 'Standby'}
                accent="var(--grid)"
                tint="var(--grid-soft)"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 rounded-xl border p-4 bg-[var(--bg-secondary)] border-[var(--border)]">
          <div className="text-center">
            <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Solar</div>
            <div className="text-base font-bold" style={{ color: 'var(--solar)' }}>{solarPower.toFixed(2)} kW</div>
          </div>
          <div className="text-center border-l border-r" style={{ borderColor: 'var(--border)' }}>
            <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Home Load</div>
            <div className="text-base font-bold" style={{ color: 'var(--consumption)' }}>{homePower.toFixed(2)} kW</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Net Grid</div>
            <div
              className="text-base font-bold"
              style={{ color: gridPower > 0 ? 'var(--alert)' : 'var(--battery)' }}
            >
              {gridPower > 0 ? '+' : ''}{gridPower.toFixed(2)} kW
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
