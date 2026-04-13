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
  compact?: boolean;
}

function EnergyNode({
  icon: Icon, label, valueLine, subLabel, accent, tint,
  badgeContent, nodeType, onClick, isSelected, compact = false,
}: NodeProps) {
  const handleClick = () => { if (onClick) onClick(nodeType); };
  const circleSize = compact ? 'h-14 w-14' : 'h-20 w-20';
  const iconSize  = compact ? 'h-6 w-6'  : 'h-9 w-9';
  return (
    <div
      className="flex flex-col items-center gap-2 cursor-pointer group"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`View ${label} details`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
    >
      <div className="relative flex items-center justify-center">
        <div
          className={`absolute inset-[-10px] rounded-full border border-dashed opacity-60 animate-[spin_12s_linear_infinite] ${isSelected ? 'opacity-100 border-solid' : ''}`}
          style={{ borderColor: accent }}
        />
        <div className="absolute inset-[-4px] rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity" style={{ background: accent }} />
        <div
          className={`relative flex ${circleSize} items-center justify-center rounded-full border-2 transition-all duration-300 hover:scale-110 ${isSelected ? 'scale-105 ring-2 ring-offset-2 ring-offset-[var(--bg-card)]' : ''}`}
          style={{
            backgroundColor: tint,
            borderColor: accent,
            boxShadow: isSelected ? `0 15px 40px ${accent}66` : '0 10px 30px rgba(0,0,0,0.28)',
            borderWidth: isSelected ? '3px' : '2px',
          }}
        >
          <Icon className={iconSize} style={{ color: accent }} />
          {badgeContent && (
            <div
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border text-[9px] font-bold"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--battery)' }}
            >
              {badgeContent}
            </div>
          )}
        </div>
        {isSelected && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
            <div className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ backgroundColor: accent, color: 'white' }}>Selected</div>
          </div>
        )}
      </div>
      <div className="text-center space-y-0.5">
        <p className="text-[10px] font-semibold text-[var(--text-primary)] group-hover:underline">{label}</p>
        <p className="text-xs font-bold" style={{ color: accent }}>{valueLine}</p>
        <p className="text-[9px] text-[var(--text-tertiary)]">{subLabel}</p>
      </div>
    </div>
  );
}

/* ─── Animated SVG connector line ────────────────────────────────────────── */
interface SvgLineProps {
  x1: number; y1: number;
  x2: number; y2: number;
  active: boolean;
  color: string;        // CSS var string e.g. 'var(--battery)'
  softColor: string;    // tint
  powerKw?: number;
  reversed?: boolean;
}
function SvgLine({ x1, y1, x2, y2, active, color, softColor, powerKw = 0, reversed = false }: SvgLineProps) {
  const thickness = Math.min(6, Math.max(1.5, powerKw / 6 + 1.5));
  const speed     = Math.min(3, Math.max(0.5, 1.2 / (powerKw / 3 + 0.5)));
  const isVert    = x1 === x2;
  const len       = Math.abs(isVert ? y2 - y1 : x2 - x1);
  const particleLen = len * 0.4;

  /* animated gradient id must be unique enough not to collide */
  const gradId = `sg-${Math.round(x1)}-${Math.round(y1)}-${Math.round(x2)}-${Math.round(y2)}`;

  if (!active) {
    return (
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="var(--border)" strokeWidth={1.5} strokeLinecap="round"
      />
    );
  }

  /* determine gradient direction */
  const gx1 = reversed ? (isVert ? 0 : 1) : 0;
  const gy1 = reversed ? (isVert ? 1 : 0) : 0;
  const gx2 = reversed ? 0 : (isVert ? 0 : 1);
  const gy2 = reversed ? 0 : (isVert ? 1 : 0);

  /* particle offset animation: moves along the line */
  const animAttr = isVert
    ? { attributeName: 'y1', from: reversed ? y2 : y1, to: reversed ? y1 : y2, dur: `${speed}s`, repeatCount: 'indefinite' as const }
    : { attributeName: 'x1', from: reversed ? x2 : x1, to: reversed ? x1 : x2, dur: `${speed}s`, repeatCount: 'indefinite' as const };
  const animAttr2 = isVert
    ? { attributeName: 'y2', from: reversed ? y2 + particleLen : y1 + particleLen, to: reversed ? y1 + particleLen : y2 + particleLen, dur: `${speed}s`, repeatCount: 'indefinite' as const }
    : { attributeName: 'x2', from: reversed ? x2 + particleLen : x1 + particleLen, to: reversed ? x1 + particleLen : x2 + particleLen, dur: `${speed}s`, repeatCount: 'indefinite' as const };

  return (
    <g>
      {/* track */}
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={softColor} strokeWidth={thickness} strokeLinecap="round" />
      {/* particle */}
      <defs>
        <linearGradient id={gradId} x1={gx1} y1={gy1} x2={gx2} y2={gy2} gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      <line
        stroke={`url(#${gradId})`}
        strokeWidth={thickness}
        strokeLinecap="round"
      >
        <animate {...animAttr} />
        <animate {...animAttr2} />
      </line>
    </g>
  );
}

/* ─── FlowPath (desktop only, unchanged) ─────────────────────────────────── */
interface FlowPathProps {
  active: boolean;
  vertical?: boolean;
  accent: string;
  tint: string;
  reversed?: boolean;
  powerKw?: number;
}
function FlowPath({ active, vertical = false, accent, tint, reversed = false, powerKw = 0 }: FlowPathProps) {
  const base = vertical ? 'w-0.5 h-20 mx-auto' : 'h-0.5 w-20 my-auto';
  if (!active) return <div className={`${base} rounded-full`} style={{ backgroundColor: 'var(--border)' }} />;
  const thickness = Math.min(12, Math.max(2, powerKw / 3 + 2));
  const speedFactor = Math.min(10, Math.max(0.5, powerKw / 3 + 0.5));
  const particleAnimation = vertical
    ? (reversed ? 'flow-up' : 'flow-down')
    : (reversed ? 'flow-right-to-left' : 'flow-left-to-right');
  return (
    <div
      className={`${base} relative overflow-hidden rounded-full`}
      style={{ backgroundColor: tint, ...(vertical ? { width: thickness } : { height: thickness }) }}
    >
      <div
        className="absolute rounded-full"
        style={{
          background: vertical
            ? `linear-gradient(${reversed ? '0deg' : '180deg'}, transparent, ${accent})`
            : `linear-gradient(${reversed ? '270deg' : '90deg'}, transparent, ${accent})`,
          ...(vertical
            ? { width: '100%', height: '40%', animation: `${particleAnimation} ${1.2 / speedFactor}s linear infinite` }
            : { height: '100%', width: '40%', animation: `${particleAnimation} ${1.2 / speedFactor}s linear infinite` }),
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  MOBILE DIAGRAM
 *  Uses a fixed 320 × 560 SVG viewBox coordinate space.
 *  All lines are drawn in SVG (pixel-perfect, no CSS layout quirks).
 *  Node components are overlaid with absolute positioning matched to the
 *  same coordinates.
 *
 *  Layout (SVG units, centre points):
 *    Solar          cx=160  cy=52
 *    Hub dot        cx=160  cy=152
 *    Battery        cx=72   cy=252
 *    Grid           cx=248  cy=252
 *    Hub→Loads dot  cx=160  cy=330   (junction before loads)
 *    Residential    cx=72   cy=430
 *    Commercial     cx=248  cy=430
 *    Industrial     cx=72   cy=530
 *    EVs            cx=248  cy=530
 * ══════════════════════════════════════════════════════════════════════════ */
const SVG_W = 320;
const SVG_H = 580;
// node centres in SVG space
const C = {
  solar:   { x: 160, y: 52  },
  hub:     { x: 160, y: 148 },
  battery: { x: 72,  y: 255 },
  grid:    { x: 248, y: 255 },
  loadsHub:{ x: 160, y: 325 },
  res:     { x: 72,  y: 432 },
  comm:    { x: 248, y: 432 },
  ind:     { x: 72,  y: 540 },
  ev:      { x: 248, y: 540 },
};

/* Convert SVG centre coords to CSS absolute positioning for the node wrapper.
   Nodes are 72px wide, ~100px tall (circle 56px + label ~44px). */
function nodeStyle(cx: number, cy: number): React.CSSProperties {
  return {
    position: 'absolute',
    left: cx - 36,   // half of 72px node width
    top:  cy - 28,   // half of 56px circle
    width: 72,
  };
}

interface MobileDiagramProps {
  solarPower: number; batteryPower: number; gridPower: number;
  residentialKw: number; commercialKw: number; industrialKw: number; evKw: number;
  siteLoad: number; batteryLevel: number;
  flowDirection: PowerFlowVisualizationProps['flowDirection'];
  handleNodeClick: (n: NodeType) => void;
  isSelected: (n: NodeType) => boolean;
}

function MobileDiagram({
  solarPower, batteryPower, gridPower,
  residentialKw, commercialKw, industrialKw, evKw,
  siteLoad, batteryLevel, flowDirection,
  handleNodeClick, isSelected,
}: MobileDiagramProps) {
  const battActive = flowDirection.solarToBattery || flowDirection.batteryToHome;
  const gridActive = flowDirection.solarToGrid    || flowDirection.gridToHome;
  const loadActive = flowDirection.solarToHome    || flowDirection.batteryToHome || flowDirection.gridToHome;

  return (
    /* outer wrapper: fixed intrinsic size — the SVG and nodes share the same
       coordinate origin so lines land exactly at node centres */
    <div className="relative mx-auto" style={{ width: SVG_W, height: SVG_H }}>

      {/* ── SVG connector layer ─────────────────────────────────────────── */}
      <svg
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="absolute inset-0"
        aria-hidden="true"
        overflow="visible"
      >
        {/* Solar → hub */}
        <SvgLine
          x1={C.solar.x}   y1={C.solar.y + 28}   // bottom of solar circle
          x2={C.hub.x}     y2={C.hub.y - 8}
          active={flowDirection.solarToHome || flowDirection.solarToBattery || flowDirection.solarToGrid}
          color="var(--solar)" softColor="var(--solar-soft)" powerKw={solarPower}
        />
        {/* hub → Battery (elbow: right-angle via corner at hub.x=battery.x) */}
        {/* horizontal leg */}
        <SvgLine
          x1={C.hub.x}     y1={C.hub.y}
          x2={C.battery.x} y2={C.hub.y}
          active={battActive}
          color="var(--battery)" softColor="var(--battery-soft)" powerKw={Math.abs(batteryPower)}
          reversed
        />
        {/* vertical leg */}
        <SvgLine
          x1={C.battery.x} y1={C.hub.y}
          x2={C.battery.x} y2={C.battery.y - 28}
          active={battActive}
          color="var(--battery)" softColor="var(--battery-soft)" powerKw={Math.abs(batteryPower)}
        />
        {/* hub → Grid (elbow) */}
        {/* horizontal leg */}
        <SvgLine
          x1={C.hub.x}  y1={C.hub.y}
          x2={C.grid.x} y2={C.hub.y}
          active={gridActive}
          color="var(--grid)" softColor="var(--grid-soft)" powerKw={Math.abs(gridPower)}
        />
        {/* vertical leg */}
        <SvgLine
          x1={C.grid.x} y1={C.hub.y}
          x2={C.grid.x} y2={C.grid.y - 28}
          active={gridActive}
          color="var(--grid)" softColor="var(--grid-soft)" powerKw={Math.abs(gridPower)}
        />
        {/* hub → loadsHub */}
        <SvgLine
          x1={C.hub.x}      y1={C.hub.y + 8}
          x2={C.loadsHub.x} y2={C.loadsHub.y}
          active={loadActive}
          color="var(--solar)" softColor="var(--solar-soft)" powerKw={siteLoad}
        />
        {/* loadsHub → Residential (elbow) */}
        <SvgLine
          x1={C.loadsHub.x} y1={C.loadsHub.y}
          x2={C.res.x}      y2={C.loadsHub.y}
          active={loadActive}
          color="var(--consumption)" softColor="var(--consumption-soft)" powerKw={residentialKw}
          reversed
        />
        <SvgLine
          x1={C.res.x} y1={C.loadsHub.y}
          x2={C.res.x} y2={C.res.y - 28}
          active={loadActive}
          color="var(--consumption)" softColor="var(--consumption-soft)" powerKw={residentialKw}
        />
        {/* loadsHub → Commercial (elbow) */}
        <SvgLine
          x1={C.loadsHub.x} y1={C.loadsHub.y}
          x2={C.comm.x}     y2={C.loadsHub.y}
          active={loadActive}
          color="var(--grid)" softColor="var(--grid-soft)" powerKw={commercialKw}
        />
        <SvgLine
          x1={C.comm.x} y1={C.loadsHub.y}
          x2={C.comm.x} y2={C.comm.y - 28}
          active={loadActive}
          color="var(--grid)" softColor="var(--grid-soft)" powerKw={commercialKw}
        />
        {/* loadsHub → Industrial (elbow, longer drop) */}
        <SvgLine
          x1={C.loadsHub.x} y1={C.loadsHub.y}
          x2={C.ind.x}      y2={C.loadsHub.y}
          active={loadActive}
          color="var(--alert)" softColor="rgba(239,68,68,0.12)" powerKw={industrialKw}
          reversed
        />
        <SvgLine
          x1={C.ind.x} y1={C.loadsHub.y}
          x2={C.ind.x} y2={C.ind.y - 28}
          active={loadActive}
          color="var(--alert)" softColor="rgba(239,68,68,0.12)" powerKw={industrialKw}
        />
        {/* loadsHub → EVs (elbow, longer drop) */}
        <SvgLine
          x1={C.loadsHub.x} y1={C.loadsHub.y}
          x2={C.ev.x}       y2={C.loadsHub.y}
          active={loadActive}
          color="var(--battery)" softColor="var(--battery-soft)" powerKw={evKw}
        />
        <SvgLine
          x1={C.ev.x} y1={C.loadsHub.y}
          x2={C.ev.x} y2={C.ev.y - 28}
          active={loadActive}
          color="var(--battery)" softColor="var(--battery-soft)" powerKw={evKw}
        />

        {/* loadsHub junction dot */}
        <circle cx={C.loadsHub.x} cy={C.loadsHub.y} r={5} fill="var(--solar)" opacity={loadActive ? 1 : 0.3} />
        {/* hub dot */}
        <circle cx={C.hub.x} cy={C.hub.y} r={7} fill="var(--solar)"
          style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.6))' }}
        />
      </svg>

      {/* ── Node overlay layer ──────────────────────────────────────────── */}

      {/* Solar */}
      <div style={nodeStyle(C.solar.x, C.solar.y)}>
        <EnergyNode
          icon={Sun} label="Solar" valueLine={`${solarPower.toFixed(2)} kW`}
          subLabel="Generation" accent="var(--solar)" tint="var(--solar-soft)"
          nodeType="solar" onClick={handleNodeClick} isSelected={isSelected('solar')}
          compact
        />
      </div>

      {/* Battery */}
      <div style={nodeStyle(C.battery.x, C.battery.y)}>
        <EnergyNode
          icon={Battery}
          label="Battery"
          valueLine={`${Math.abs(batteryPower).toFixed(1)} kW`}
          subLabel={batteryPower >= 0 ? 'Charging' : 'Discharging'}
          accent="var(--battery)" tint="var(--battery-soft)"
          badgeContent={`${Math.round(batteryLevel)}%`}
          nodeType="battery" onClick={handleNodeClick} isSelected={isSelected('battery')}
          compact
        />
      </div>

      {/* Grid */}
      <div style={nodeStyle(C.grid.x, C.grid.y)}>
        <EnergyNode
          icon={UtilityPole}
          label="Grid"
          valueLine={`${Math.abs(gridPower).toFixed(2)} kW`}
          subLabel={gridPower > 0 ? 'Importing' : gridPower < 0 ? 'Exporting' : 'Standby'}
          accent="var(--grid)" tint="var(--grid-soft)"
          nodeType="grid" onClick={handleNodeClick} isSelected={isSelected('grid')}
          compact
        />
      </div>

      {/* Residential */}
      <div style={nodeStyle(C.res.x, C.res.y)}>
        <EnergyNode
          icon={Home} label="Residential" valueLine={`${residentialKw.toFixed(2)} kW`}
          subLabel="Household" accent="var(--consumption)" tint="var(--consumption-soft)"
          nodeType="home" onClick={handleNodeClick} isSelected={isSelected('home')}
          compact
        />
      </div>

      {/* Commercial */}
      <div style={nodeStyle(C.comm.x, C.comm.y)}>
        <EnergyNode
          icon={Building2} label="Commercial" valueLine={`${commercialKw.toFixed(2)} kW`}
          subLabel="Business" accent="var(--grid)" tint="var(--grid-soft)"
          nodeType="home" onClick={handleNodeClick} isSelected={false}
          compact
        />
      </div>

      {/* Industrial */}
      <div style={nodeStyle(C.ind.x, C.ind.y)}>
        <EnergyNode
          icon={Factory} label="Industrial" valueLine={`${industrialKw.toFixed(2)} kW`}
          subLabel="Facility" accent="var(--alert)" tint="rgba(239,68,68,0.12)"
          nodeType="home" onClick={handleNodeClick} isSelected={false}
          compact
        />
      </div>

      {/* EVs */}
      <div style={nodeStyle(C.ev.x, C.ev.y)}>
        <EnergyNode
          icon={Car} label="EVs" valueLine={`${evKw.toFixed(2)} kW`}
          subLabel="Charging" accent="var(--battery)" tint="var(--battery-soft)"
          nodeType="ev1" onClick={handleNodeClick} isSelected={isSelected('ev1') || isSelected('ev2')}
          compact
        />
      </div>

    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  Main component
 * ══════════════════════════════════════════════════════════════════════════ */
export function PowerFlowVisualization({
  solarPower, batteryPower, gridPower, homePower,
  residentialPower, commercialPower, industrialPower, evPower,
  batteryLevel, flowDirection, detailBasePath, isLoading,
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
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-20 w-0.5" />
            <div className="flex items-center justify-center w-full max-w-xl gap-6">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-20 w-20 rounded-full" />
            </div>
            <div className="flex items-start justify-center w-full max-w-4xl gap-6">
              <div className="flex flex-col items-center gap-2"><Skeleton className="h-20 w-0.5" /><Skeleton className="h-20 w-20 rounded-full" /></div>
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-20 w-0.5" />
                <div className="flex flex-wrap justify-center gap-4 max-w-md">
                  <Skeleton className="h-20 w-20 rounded-full" /><Skeleton className="h-20 w-20 rounded-full" />
                  <Skeleton className="h-20 w-20 rounded-full" /><Skeleton className="h-20 w-20 rounded-full" />
                </div>
              </div>
              <div className="flex flex-col items-center gap-2"><Skeleton className="h-20 w-0.5" /><Skeleton className="h-20 w-20 rounded-full" /></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasBreakdown = residentialPower !== undefined || commercialPower !== undefined || industrialPower !== undefined || evPower !== undefined;
  const residentialKw = residentialPower ?? homePower;
  const commercialKw  = commercialPower  ?? 0;
  const industrialKw  = industrialPower  ?? 0;
  const evKw          = evPower          ?? 0;
  const siteLoad = hasBreakdown ? residentialKw + commercialKw + industrialKw + evKw : homePower;
  const usefulEnergy = Math.min(siteLoad, solarPower) + (batteryPower > 0 ? Math.min(batteryPower, Math.max(0, solarPower - siteLoad)) : 0);
  const systemEfficiency = solarPower > 0 ? (usefulEnergy / solarPower) * 100 : 0;
  const totalSolarUse = siteLoad + Math.abs(batteryPower) + Math.abs(gridPower < 0 ? gridPower : 0);
  const solarToHomePercent    = totalSolarUse > 0 ? (Math.min(siteLoad, solarPower) / totalSolarUse) * 100 : 0;
  const solarToBatteryPercent = totalSolarUse > 0 && batteryPower > 0 ? (batteryPower / totalSolarUse) * 100 : 0;
  const solarToGridPercent    = totalSolarUse > 0 && gridPower < 0 ? (Math.abs(gridPower) / totalSolarUse) * 100 : 0;

  return (
    <Card className="dashboard-card overflow-hidden rounded-[28px]">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
          <Zap className="h-5 w-5 text-[var(--battery)]" />
          Energy Flow
          <span className="text-xs text-[var(--text-tertiary)] font-normal ml-2">(Tap nodes for details)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-6">

        {/* Stats row */}
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

        {/* ── MOBILE diagram (< 640 px) ── SVG-based, pixel-perfect connectors */}
        <div className="sm:hidden rounded-[24px] border border-[var(--border)] bg-[var(--bg-secondary)]/60 py-4 overflow-hidden">
          <MobileDiagram
            solarPower={solarPower}
            batteryPower={batteryPower}
            gridPower={gridPower}
            residentialKw={residentialKw}
            commercialKw={commercialKw}
            industrialKw={industrialKw}
            evKw={evKw}
            siteLoad={siteLoad}
            batteryLevel={batteryLevel}
            flowDirection={flowDirection}
            handleNodeClick={handleNodeClick}
            isSelected={isSelected}
          />
        </div>

        {/* ── DESKTOP diagram (≥ 640 px) — unchanged ── */}
        <div className="hidden sm:block rounded-[24px] border border-[var(--border)] bg-[var(--bg-secondary)]/60 p-6">
          <div className="flex flex-col items-center gap-5 py-2">

            <EnergyNode
              icon={Sun} label="Solar" valueLine={`${solarPower.toFixed(2)} kW`}
              subLabel="Generation" accent="var(--solar)" tint="var(--solar-soft)"
              nodeType="solar" onClick={handleNodeClick} isSelected={isSelected('solar')}
            />
            <div className="flex justify-center py-1">
              <FlowPath
                active={flowDirection.solarToHome || flowDirection.solarToBattery || flowDirection.solarToGrid}
                vertical accent="var(--solar)" tint="var(--solar-soft)" powerKw={solarPower}
              />
            </div>
            <div className="flex items-center justify-center w-full gap-6 px-4">
              <div className="flex-1 flex justify-end">
                <FlowPath active={flowDirection.solarToBattery} accent="var(--battery)" tint="var(--battery-soft)" powerKw={Math.max(0, batteryPower)} />
              </div>
              <div
                className="h-4 w-4 shrink-0 rounded-full border-2 shadow-[0_0_0_6px_rgba(245,158,11,0.1)]"
                style={{ backgroundColor: 'var(--solar)', borderColor: 'var(--solar)' }}
              />
              <div className="flex-1 flex justify-start">
                <FlowPath active={flowDirection.solarToGrid} accent="var(--grid)" tint="var(--grid-soft)" reversed powerKw={Math.max(0, -gridPower)} />
              </div>
            </div>
            <div className="flex flex-row items-start justify-center w-full gap-6 lg:gap-10 mt-1">
              <div className="flex flex-col items-center gap-2">
                <FlowPath active={flowDirection.solarToBattery || flowDirection.batteryToHome} vertical accent="var(--battery)" tint="var(--battery-soft)" powerKw={Math.abs(batteryPower)} />
                <EnergyNode
                  icon={Battery} label="Battery" valueLine={`${Math.abs(batteryPower).toFixed(1)} kW`}
                  subLabel={batteryPower >= 0 ? 'Charging' : 'Discharging'}
                  accent="var(--battery)" tint="var(--battery-soft)"
                  badgeContent={`${Math.round(batteryLevel)}%`}
                  nodeType="battery" onClick={handleNodeClick} isSelected={isSelected('battery')}
                />
              </div>
              <div className="flex flex-col items-center gap-2">
                <FlowPath active={flowDirection.solarToHome} vertical accent="var(--solar)" tint="var(--solar-soft)" powerKw={siteLoad} />
                <div className="flex flex-row items-start justify-center gap-5">
                  <EnergyNode icon={Home} label="Residential" valueLine={`${residentialKw.toFixed(2)} kW`} subLabel="Household" accent="var(--consumption)" tint="var(--consumption-soft)" nodeType="home" onClick={handleNodeClick} isSelected={isSelected('home')} />
                  <EnergyNode icon={Building2} label="Commercial" valueLine={`${commercialKw.toFixed(2)} kW`} subLabel="Business" accent="var(--grid)" tint="var(--grid-soft)" nodeType="home" onClick={handleNodeClick} isSelected={false} />
                  <EnergyNode icon={Factory} label="Industrial" valueLine={`${industrialKw.toFixed(2)} kW`} subLabel="Facility" accent="var(--alert)" tint="rgba(239,68,68,0.12)" nodeType="home" onClick={handleNodeClick} isSelected={false} />
                  <EnergyNode icon={Car} label="EVs" valueLine={`${evKw.toFixed(2)} kW`} subLabel="Charging" accent="var(--battery)" tint="var(--battery-soft)" nodeType="ev1" onClick={handleNodeClick} isSelected={isSelected('ev1') || isSelected('ev2')} />
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <FlowPath active={flowDirection.solarToGrid || flowDirection.gridToHome} vertical accent="var(--grid)" tint="var(--grid-soft)" />
                <EnergyNode
                  icon={UtilityPole} label="Grid" valueLine={`${Math.abs(gridPower).toFixed(2)} kW`}
                  subLabel={gridPower > 0 ? 'Importing' : gridPower < 0 ? 'Exporting' : 'Standby'}
                  accent="var(--grid)" tint="var(--grid-soft)"
                  nodeType="grid" onClick={handleNodeClick} isSelected={isSelected('grid')}
                />
              </div>
            </div>

          </div>
        </div>

        {/* Summary stats */}
        <div className="space-y-4">
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
              <div className="text-base font-bold" style={{ color: gridPower > 0 ? 'var(--alert)' : 'var(--battery)' }}>
                {gridPower > 0 ? '+' : ''}{gridPower.toFixed(2)} kW
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-2xl border p-4 bg-[var(--bg-secondary)] border-[var(--border)]">
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-2">System Efficiency</div>
              <div className="flex items-baseline gap-2 mb-2">
                <div className="text-2xl font-bold" style={{ color: systemEfficiency >= 80 ? 'var(--battery)' : systemEfficiency >= 60 ? 'var(--solar)' : 'var(--alert)' }}>{systemEfficiency.toFixed(0)}%</div>
                <div className="text-xs text-[var(--text-tertiary)]">Solar → Usable</div>
              </div>
              <div className="w-full bg-[var(--bg-card-muted)] rounded-full h-2">
                <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${systemEfficiency}%`, background: systemEfficiency >= 80 ? 'var(--battery)' : systemEfficiency >= 60 ? 'var(--solar)' : 'var(--alert)' }} />
              </div>
            </div>
            <div className="rounded-2xl border p-4 bg-[var(--bg-secondary)] border-[var(--border)]">
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide mb-2">Flow Distribution</div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs"><div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--consumption)' }} /><span className="text-[var(--text-secondary)]">To Loads</span></div><span className="font-bold text-[var(--text-primary)]">{solarToHomePercent.toFixed(0)}%</span></div>
                <div className="flex items-center justify-between text-xs"><div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--battery)' }} /><span className="text-[var(--text-secondary)]">To Battery</span></div><span className="font-bold text-[var(--text-primary)]">{solarToBatteryPercent.toFixed(0)}%</span></div>
                <div className="flex items-center justify-between text-xs"><div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--grid)' }} /><span className="text-[var(--text-secondary)]">To Grid</span></div><span className="font-bold text-[var(--text-primary)]">{solarToGridPercent.toFixed(0)}%</span></div>
              </div>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
