'use client';

import React from 'react';
import { Sun, Home, Battery, UtilityPole, Zap, Building2, Car, Factory } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useNodeSelection } from '@/hooks/useEnergySystem';
import type { NodeType } from '@/stores/energySystemStore';
import { useRouter } from 'next/navigation';

interface PowerFlowVisualizationProps {
  solarPower: number;
  batteryPower: number;
  gridPower: number;
  homePower: number;
  residentialPower?: number;
  commercialPower?: number;
  industrialPower?: number;
  evPower?: number;
  batteryLevel: number;
  flowDirection: {
    solarToHome: boolean;
    solarToBattery: boolean;
    solarToGrid: boolean;
    batteryToHome: boolean;
    gridToHome: boolean;
  };
  detailBasePath?: string;
  isLoading?: boolean;
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
      className="flex min-w-[80px] sm:min-w-[96px] md:min-w-[108px] flex-col items-center gap-3 cursor-pointer group"
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
          className={`relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border-2 transition-all duration-300 hover:scale-110 ${isSelected ? 'scale-105 ring-2 ring-offset-2 ring-offset-[var(--bg-card)]' : ''}`}
          style={{
            backgroundColor: tint,
            borderColor: accent,
            boxShadow: isSelected ? `0 15px 40px ${accent}66` : '0 10px 30px rgba(0, 0, 0, 0.28)',
            borderWidth: isSelected ? '3px' : '2px'
          }}
        >
          <Icon className="h-7 w-7 sm:h-9 sm:w-9" style={{ color: accent }} />
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
  powerKw?: number;
}

function FlowPath({ active, vertical = false, accent, tint, reversed = false, powerKw = 0 }: FlowPathProps) {
  const base = vertical
    ? 'w-0.5 h-20 mx-auto'
    : 'h-0.5 w-20 my-auto';
  if (!active) {
    return <div className={`${base} rounded-full`} style={{ backgroundColor: 'var(--border)' }} />;
  }

  const thickness = Math.min(12, Math.max(2, powerKw / 3 + 2));
  const speedFactor = Math.min(10, Math.max(0.5, powerKw / 3 + 0.5));
  const particleAnimation = vertical
    ? (reversed ? 'flow-up' : 'flow-down')
    : (reversed ? 'flow-right-to-left' : 'flow-left-to-right');

  return (
    <div
      className={`${base} relative overflow-hidden rounded-full`}
      style={{
        backgroundColor: tint,
        ...(vertical ? { width: thickness } : { height: thickness })
      }}
    >
      <div
        className="absolute rounded-full"
        style={{
          background: vertical
            ? `linear-gradient(${reversed ? '0deg' : '180deg'}, transparent, ${accent})`
            : `linear-gradient(${reversed ? '270deg' : '90deg'}, transparent, ${accent})`,
          ...(vertical
            ? { width: '100%', height: '40%', animation: `${particleAnimation} ${1.2 / speedFactor}s linear infinite` }
            : { height: '100%', width: '40%', animation: `${particleAnimation} ${1.2 / speedFactor}s linear infinite` }
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
  residentialPower,
  commercialPower,
  industrialPower,
  evPower,
  batteryLevel,
  flowDirection,
  detailBasePath,
  isLoading,
}: PowerFlowVisualizationProps) {
  const { selectNode, isSelected } = useNodeSelection();
  const router = useRouter();

  const handleNodeClick = (nodeType: NodeType) => {
    selectNode(nodeType);
    if (detailBasePath) {
      const pathNode = nodeType === 'ev1' || nodeType === 'ev2' ? 'ev' : nodeType;
      router.push(`${detailBasePath}/${pathNode}`);
    }
  };

  if (isLoading) {
    return (
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
            <Zap className="h-5 w-5 text-[var(--battery)]" />
            Energy Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-4">
            {/* Top node - Solar */}
            <Skeleton className="h-20 w-20 rounded-full" />

            {/* Vertical line */}
            <Skeleton className="h-20 w-0.5" />

            {/* Middle row with 3 nodes - split junction */}
            <div className="flex items-center justify-center w-full max-w-xl gap-6">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-20 w-20 rounded-full" />
            </div>

            {/* Bottom row with 3 sections - responsive layout */}
            <div className="flex flex-col md:flex-row items-center md:items-start justify-center w-full max-w-4xl gap-4 md:gap-6 mt-1">
              {/* Battery */}
              <div className="flex md:flex-1 flex-col items-center gap-2">
                <Skeleton className="h-20 w-0.5" />
                <Skeleton className="h-20 w-20 rounded-full" />
              </div>
              {/* Loads - 4 icons */}
              <div className="flex md:flex-1 flex-col items-center gap-2">
                <Skeleton className="h-20 w-0.5" />
                <div className="flex flex-wrap justify-center gap-4 max-w-md">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <Skeleton className="h-20 w-20 rounded-full" />
                </div>
              </div>
              {/* Grid */}
              <div className="flex md:flex-1 flex-col items-center gap-2">
                <Skeleton className="h-20 w-0.5" />
                <Skeleton className="h-20 w-20 rounded-full" />
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 rounded-xl border p-4 bg-[var(--bg-secondary)] border-[var(--border)]">
            <div className="text-center space-y-2">
              <Skeleton className="h-3 w-16 mx-auto" />
              <Skeleton className="h-5 w-20 mx-auto" />
            </div>
            <div className="text-center space-y-2 sm:border-l sm:border-r" style={{ borderColor: 'var(--border)' }}>
              <Skeleton className="h-3 w-20 mx-auto" />
              <Skeleton className="h-5 w-20 mx-auto" />
            </div>
            <div className="text-center space-y-2">
              <Skeleton className="h-3 w-16 mx-auto" />
              <Skeleton className="h-5 w-20 mx-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasBreakdown = residentialPower !== undefined || commercialPower !== undefined || industrialPower !== undefined || evPower !== undefined;
  const residentialKw = residentialPower ?? homePower;
  const commercialKw = commercialPower ?? (hasBreakdown ? 0 : 0);
  const industrialKw = industrialPower ?? (hasBreakdown ? 0 : 0);
  const evKw = evPower ?? (hasBreakdown ? 0 : 0);
  const siteLoad = hasBreakdown ? residentialKw + commercialKw + industrialKw + evKw : homePower;

  // Calculate system efficiency and flow distribution
  const usefulEnergy = Math.min(siteLoad, solarPower) + (batteryPower > 0 ? Math.min(batteryPower, Math.max(0, solarPower - siteLoad)) : 0);
  const systemEfficiency = solarPower > 0 ? (usefulEnergy / solarPower) * 100 : 0;

  // Calculate solar flow distribution percentages
  const totalSolarUse = siteLoad + Math.abs(batteryPower) + Math.abs(gridPower < 0 ? gridPower : 0);
  const solarToHomePercent = totalSolarUse > 0 ? (Math.min(siteLoad, solarPower) / totalSolarUse) * 100 : 0;
  const solarToBatteryPercent = totalSolarUse > 0 && batteryPower > 0 ? (batteryPower / totalSolarUse) * 100 : 0;
  const solarToGridPercent = totalSolarUse > 0 && gridPower < 0 ? (Math.abs(gridPower) / totalSolarUse) * 100 : 0;

  return (
      <Card className="dashboard-card overflow-hidden rounded-[28px]">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
          <Zap className="h-5 w-5 text-[var(--battery)]" />
          Energy Flow
          <span className="text-xs text-[var(--text-tertiary)] font-normal ml-2">(Click nodes for details)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Solar</p>
            <p className="mt-1 text-lg font-semibold text-[var(--solar)]">{solarPower.toFixed(2)} kW</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Site Load</p>
            <p className="mt-1 text-lg font-semibold text-[var(--consumption)]">{siteLoad.toFixed(2)} kW</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Battery</p>
            <p className="mt-1 text-lg font-semibold text-[var(--battery)]">{Math.abs(batteryPower).toFixed(2)} kW</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-muted)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">Efficiency</p>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{systemEfficiency.toFixed(0)}%</p>
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-secondary)]/60 p-4 sm:p-6">
        <div className="flex flex-col items-center gap-5 py-2">
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
              powerKw={solarPower}
            />
          </div>

          <div className="flex items-center justify-center w-full max-w-2xl gap-4 sm:gap-6 px-1 sm:px-0">
            <div className="flex-1 flex justify-end">
              <FlowPath
                active={flowDirection.solarToBattery}
                accent="var(--battery)"
                tint="var(--battery-soft)"
                powerKw={Math.max(0, batteryPower)}
              />
            </div>
            <div className="h-4 w-4 shrink-0 rounded-full border-2 shadow-[0_0_0_6px_rgba(245,158,11,0.1)]"
              style={{ backgroundColor: 'var(--solar)', borderColor: 'var(--solar)' }} />
            <div className="flex-1 flex justify-start">
              <FlowPath
                active={flowDirection.solarToGrid}
                accent="var(--grid)"
                tint="var(--grid-soft)"
                reversed
                powerKw={Math.max(0, -gridPower)}
              />
            </div>
          </div>

          {/* Desktop: Horizontal layout, Mobile: Vertical layout */}
          <div className="flex flex-col md:flex-row items-center md:items-start justify-center w-full max-w-5xl gap-3 sm:gap-4 md:gap-8 lg:gap-10 mt-1">
            {/* Battery Section */}
            <div className="flex md:flex-1 min-w-0 flex-col items-center gap-2">
              <FlowPath
                active={flowDirection.solarToBattery || flowDirection.batteryToHome}
                vertical
                accent="var(--battery)"
                tint="var(--battery-soft)"
                powerKw={Math.abs(batteryPower)}
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

            {/* Loads Section - Centered on mobile */}
            <div className="flex md:flex-1 flex-col items-center gap-2 w-full md:w-auto">
              <FlowPath
                active={flowDirection.solarToHome}
                vertical
                accent="var(--solar)"
                tint="var(--solar-soft)"
                powerKw={siteLoad}
              />
              <div className="flex w-full flex-wrap items-start justify-center gap-x-4 gap-y-5 px-2 sm:gap-x-6 md:gap-x-8 max-w-md md:max-w-none">
                <EnergyNode
                  icon={Home}
                  label="Residential"
                  valueLine={`${residentialKw.toFixed(2)} kW`}
                  subLabel="Household"
                  accent="var(--consumption)"
                  tint="var(--consumption-soft)"
                  nodeType="home"
                  onClick={handleNodeClick}
                  isSelected={isSelected('home')}
                />
                <EnergyNode
                  icon={Building2}
                  label="Commercial"
                  valueLine={`${commercialKw.toFixed(2)} kW`}
                  subLabel="Business"
                  accent="var(--grid)"
                  tint="var(--grid-soft)"
                  nodeType="home"
                  onClick={handleNodeClick}
                  isSelected={false}
                />
                <EnergyNode
                  icon={Factory}
                  label="Industrial"
                  valueLine={`${industrialKw.toFixed(2)} kW`}
                  subLabel="Facility"
                  accent="var(--alert)"
                  tint="rgba(239,68,68,0.12)"
                  nodeType="home"
                  onClick={handleNodeClick}
                  isSelected={false}
                />
                <EnergyNode
                  icon={Car}
                  label="EVs"
                  valueLine={`${evKw.toFixed(2)} kW`}
                  subLabel="Charging"
                  accent="var(--battery)"
                  tint="var(--battery-soft)"
                  nodeType="ev1"
                  onClick={handleNodeClick}
                  isSelected={isSelected('ev1') || isSelected('ev2')}
                />
              </div>
            </div>

            {/* Grid Section */}
            <div className="flex md:flex-1 flex-col items-center gap-2">
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
        </div>

        <div className="space-y-4">
          {/* Power Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 rounded-2xl border p-4 bg-[var(--bg-secondary)] border-[var(--border)]">
            <div className="text-center">
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Solar</div>
              <div className="text-base font-bold" style={{ color: 'var(--solar)' }}>{solarPower.toFixed(2)} kW</div>
            </div>
            <div className="text-center space-y-1 sm:space-y-2 sm:border-l sm:border-r" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">Site Load</div>
              <div className="text-base font-bold" style={{ color: 'var(--consumption)' }}>{siteLoad.toFixed(2)} kW</div>
              <div className="text-[9px] text-[var(--text-tertiary)]">R {residentialKw.toFixed(1)} / C {commercialKw.toFixed(1)} / I {industrialKw.toFixed(1)} / EV {evKw.toFixed(1)}</div>
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

          {/* Efficiency & Flow Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-2xl border p-4 bg-[var(--bg-secondary)] border-[var(--border)]">
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-2">System Efficiency</div>
              <div className="flex items-baseline gap-2 mb-2">
                <div className="text-2xl font-bold" style={{ color: systemEfficiency >= 80 ? 'var(--battery)' : systemEfficiency >= 60 ? 'var(--solar)' : 'var(--alert)' }}>
                  {systemEfficiency.toFixed(0)}%
                </div>
                <div className="text-xs text-[var(--text-tertiary)]">Solar → Usable</div>
              </div>
              <div className="w-full bg-[var(--bg-card-muted)] rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${systemEfficiency}%`,
                    background: systemEfficiency >= 80 ? 'var(--battery)' : systemEfficiency >= 60 ? 'var(--solar)' : 'var(--alert)'
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border p-4 bg-[var(--bg-secondary)] border-[var(--border)]">
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-2">Flow Distribution</div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--consumption)' }} />
                    <span className="text-[var(--text-secondary)]">To Loads</span>
                  </div>
                  <span className="font-bold text-[var(--text-primary)]">{solarToHomePercent.toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--battery)' }} />
                    <span className="text-[var(--text-secondary)]">To Battery</span>
                  </div>
                  <span className="font-bold text-[var(--text-primary)]">{solarToBatteryPercent.toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--grid)' }} />
                    <span className="text-[var(--text-secondary)]">To Grid</span>
                  </div>
                  <span className="font-bold text-[var(--text-primary)]">{solarToGridPercent.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
