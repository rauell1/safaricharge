'use client';

import React from 'react';
import { Sun, Home, Battery, UtilityPole, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNodeSelection } from '@/hooks/useEnergySystem';
import type { NodeType } from '@/stores/energySystemStore';

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
  nodeType: NodeType;
  onClick?: (nodeType: NodeType) => void;
  isSelected?: boolean;
}

function EnergyNode({ icon: Icon, label, valueLine, subLabel, accent, tint, badgeContent, nodeType, onClick, isSelected }: NodeProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(nodeType);
    }
  };

  return (
    <div
      className="flex flex-col items-center gap-3 cursor-pointer group"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`View ${label} details`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <div className="relative flex items-center justify-center">
        <div
          className={`absolute inset-[-10px] rounded-full border border-dashed opacity-60 animate-[spin_12s_linear_infinite] ${isSelected ? 'opacity-100 border-solid' : ''}`}
          style={{ borderColor: accent }}
        />
        <div
          className="absolute inset-[-4px] rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"
          style={{ background: accent }}
        />
        <div
          className={`relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all duration-300 hover:scale-110 ${isSelected ? 'scale-105 ring-2 ring-offset-2 ring-offset-[var(--bg-card)]' : ''}`}
          style={{
            backgroundColor: tint,
            borderColor: accent,
            boxShadow: isSelected ? `0 15px 40px ${accent}66` : '0 10px 30px rgba(0, 0, 0, 0.28)',
            borderWidth: isSelected ? '3px' : '2px'
          }}
        >
          <Icon className="h-9 w-9" style={{ color: accent }} />
          {badgeContent && (
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--battery)' }}>
              {badgeContent}
            </div>
          )}
        </div>
        {isSelected && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
            <div className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: accent, color: 'white' }}>
              Selected
            </div>
          </div>
        )}
      </div>
      <div className="text-center space-y-0.5">
        <p className="text-xs font-semibold text-[var(--text-primary)] group-hover:underline">{label}</p>
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
  const { selectNode, isSelected } = useNodeSelection();

  const handleNodeClick = (nodeType: NodeType) => {
    selectNode(nodeType);
    // Optionally navigate to detail page in the future
    // router.push(`/${nodeType}`);
  };

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
          <Zap className="h-5 w-5 text-[var(--battery)]" />
          Energy Flow
          <span className="text-xs text-[var(--text-tertiary)] font-normal ml-2">(Click nodes for details)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 py-4">
          <EnergyNode
            icon={Sun}
            label="Solar"
            valueLine={`${solarPower.toFixed(2)} kW`}
            subLabel="Generation"
            accent="var(--solar)"
            tint="var(--solar-soft)"
            nodeType="solar"
            onClick={handleNodeClick}
            isSelected={isSelected('solar')}
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
                nodeType="battery"
                onClick={handleNodeClick}
                isSelected={isSelected('battery')}
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
                nodeType="home"
                onClick={handleNodeClick}
                isSelected={isSelected('home')}
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
                nodeType="grid"
                onClick={handleNodeClick}
                isSelected={isSelected('grid')}
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
