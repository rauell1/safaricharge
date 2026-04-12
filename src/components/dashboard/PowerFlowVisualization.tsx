'use client';

import React from 'react';
import { Sun, Home, Battery, UtilityPole, Zap, Building2, Car, Factory } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FlowDirection {
  solarToHome: boolean;
  solarToBattery: boolean;
  solarToGrid: boolean;
  batteryToHome: boolean;
  gridToHome: boolean;
}

interface PowerFlowVisualizationProps {
  solarPower: number;
  batteryPower: number;
  gridPower: number;
  homePower: number;
  batteryLevel: number;
  flowDirection: FlowDirection;
  detailBasePath?: string;
}

interface FlowLineProps {
  active: boolean;
  animated?: boolean;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

function FlowLine({ active, animated = true, color = 'var(--solar)', className = '', style = {} }: FlowLineProps) {
  return (
    <div
      className={`absolute rounded-full transition-all duration-500 ${className}`}
      style={{
        backgroundColor: active ? color : 'var(--border)',
        opacity: active ? 1 : 0.3,
        ...style,
      }}
    >
      {active && animated && (
        <div
          className="absolute rounded-full animate-pulse"
          style={{
            inset: '-2px',
            backgroundColor: color,
            opacity: 0.4,
            animationDuration: '1.5s',
          }}
        />
      )}
    </div>
  );
}

interface NodeCardProps {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  subValue?: string;
  color: string;
  bgColor: string;
  active?: boolean;
  href?: string;
}

function NodeCard({ icon: Icon, label, value, subValue, color, bgColor, active = true }: NodeCardProps) {
  return (
    <div
      className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-300"
      style={{
        backgroundColor: bgColor,
        borderColor: active ? color : 'var(--border)',
        opacity: active ? 1 : 0.6,
        minWidth: '90px',
      }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: color + '22' }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="text-center">
        <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</div>
        <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
        {subValue && <div className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{subValue}</div>}
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
  flowDirection,
}: PowerFlowVisualizationProps) {
  const isCharging = batteryPower >= 0;
  const isExporting = gridPower < 0;

  const totalGeneration = solarPower + (batteryPower < 0 ? Math.abs(batteryPower) : 0);
  const solarToHomePercent = totalGeneration > 0 ? Math.min(100, (Math.min(solarPower, homePower) / totalGeneration) * 100) : 0;
  const solarToBatteryPercent = totalGeneration > 0 && isCharging ? Math.min(100, (batteryPower / totalGeneration) * 100) : 0;
  const solarToGridPercent = totalGeneration > 0 && isExporting ? Math.min(100, (Math.abs(gridPower) / totalGeneration) * 100) : 0;

  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[var(--text-primary)]">
          <Zap className="h-5 w-5 text-[var(--solar)]" />
          Power Flow
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile layout */}
        <div className="block md:hidden space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <NodeCard
              icon={Sun}
              label="Solar"
              value={`${solarPower.toFixed(1)} kW`}
              color="var(--solar)"
              bgColor="var(--solar-soft)"
              active={solarPower > 0.1}
            />
            <NodeCard
              icon={Home}
              label="Home"
              value={`${homePower.toFixed(1)} kW`}
              color="var(--consumption)"
              bgColor="var(--consumption-soft)"
              active={homePower > 0.1}
            />
            <NodeCard
              icon={Battery}
              label="Battery"
              value={`${batteryLevel.toFixed(0)}%`}
              subValue={batteryPower !== 0 ? `${isCharging ? '+' : ''}${batteryPower.toFixed(1)} kW` : 'Idle'}
              color="var(--battery)"
              bgColor="var(--battery-soft)"
              active={batteryLevel > 5}
            />
            <NodeCard
              icon={UtilityPole}
              label="Grid"
              value={`${Math.abs(gridPower).toFixed(1)} kW`}
              subValue={isExporting ? 'Exporting' : gridPower > 0.1 ? 'Importing' : 'Idle'}
              color="var(--grid)"
              bgColor="var(--grid-soft)"
              active={Math.abs(gridPower) > 0.1}
            />
          </div>

          {/* Flow summary bars */}
          <div className="space-y-2 rounded-xl border p-3" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card-muted)' }}>
            <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Energy Flow</div>
            {[
              { label: 'Solar → Home', pct: solarToHomePercent, color: 'var(--solar)', active: flowDirection.solarToHome },
              { label: 'Solar → Battery', pct: solarToBatteryPercent, color: 'var(--battery)', active: flowDirection.solarToBattery },
              { label: 'Solar → Grid', pct: solarToGridPercent, color: 'var(--grid)', active: flowDirection.solarToGrid },
              { label: 'Battery → Home', pct: flowDirection.batteryToHome ? 60 : 0, color: 'var(--battery)', active: flowDirection.batteryToHome },
              { label: 'Grid → Home', pct: flowDirection.gridToHome ? 40 : 0, color: 'var(--grid)', active: flowDirection.gridToHome },
            ].filter(f => f.active).map(({ label, pct, color }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-[11px] w-28 shrink-0" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                <div className="flex-1 rounded-full h-1.5" style={{ backgroundColor: 'var(--border)' }}>
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
                <span className="text-[11px] w-8 text-right font-medium" style={{ color: 'var(--text-primary)' }}>{pct.toFixed(0)}%</span>
              </div>
            ))}
            {!flowDirection.solarToHome && !flowDirection.solarToBattery && !flowDirection.solarToGrid && !flowDirection.batteryToHome && !flowDirection.gridToHome && (
              <div className="text-xs text-center py-2" style={{ color: 'var(--text-tertiary)' }}>System idle</div>
            )}
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden md:block">
          <div className="relative flex items-center justify-between gap-4 py-6 px-4">
            {/* Solar */}
            <div className="flex flex-col items-center gap-1 z-10">
              <NodeCard
                icon={Sun}
                label="Solar"
                value={`${solarPower.toFixed(1)} kW`}
                color="var(--solar)"
                bgColor="var(--solar-soft)"
                active={solarPower > 0.1}
              />
            </div>

            {/* Center hub */}
            <div className="flex-1 relative flex items-center justify-center" style={{ minHeight: '160px' }}>
              {/* Flow lines - horizontal */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Solar to center */}
                <div className="absolute left-0 right-1/2 top-1/2 h-0.5 -translate-y-1/2"
                  style={{ backgroundColor: flowDirection.solarToHome || flowDirection.solarToBattery || flowDirection.solarToGrid ? 'var(--solar)' : 'var(--border)', opacity: 0.6 }} />
                {/* Center to home */}
                <div className="absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2"
                  style={{ backgroundColor: flowDirection.solarToHome || flowDirection.batteryToHome || flowDirection.gridToHome ? 'var(--consumption)' : 'var(--border)', opacity: 0.6 }} />
                {/* Center to battery (vertical) */}
                <div className="absolute left-1/2 bottom-0 top-1/2 w-0.5 -translate-x-1/2"
                  style={{ backgroundColor: flowDirection.solarToBattery || flowDirection.batteryToHome ? 'var(--battery)' : 'var(--border)', opacity: 0.6 }} />
                {/* Center to grid (vertical up) */}
                <div className="absolute left-1/2 top-0 bottom-1/2 w-0.5 -translate-x-1/2"
                  style={{ backgroundColor: flowDirection.solarToGrid || flowDirection.gridToHome ? 'var(--grid)' : 'var(--border)', opacity: 0.6 }} />

                {/* Center dot */}
                <div className="relative z-10 h-8 w-8 rounded-full border-2 flex items-center justify-center"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-strong)' }}>
                  <Zap className="h-4 w-4" style={{ color: 'var(--solar)' }} />
                </div>
              </div>

              {/* Battery (bottom) */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
                <NodeCard
                  icon={Battery}
                  label="Battery"
                  value={`${batteryLevel.toFixed(0)}%`}
                  subValue={batteryPower !== 0 ? `${isCharging ? '+' : ''}${batteryPower.toFixed(1)} kW` : 'Idle'}
                  color="var(--battery)"
                  bgColor="var(--battery-soft)"
                  active={batteryLevel > 5}
                />
              </div>

              {/* Grid (top) */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2">
                <NodeCard
                  icon={UtilityPole}
                  label="Grid"
                  value={`${Math.abs(gridPower).toFixed(1)} kW`}
                  subValue={isExporting ? 'Exporting' : gridPower > 0.1 ? 'Importing' : 'Idle'}
                  color="var(--grid)"
                  bgColor="var(--grid-soft)"
                  active={Math.abs(gridPower) > 0.1}
                />
              </div>
            </div>

            {/* Home */}
            <div className="flex flex-col items-center gap-1 z-10">
              <NodeCard
                icon={Home}
                label="Home"
                value={`${homePower.toFixed(1)} kW`}
                color="var(--consumption)"
                bgColor="var(--consumption-soft)"
                active={homePower > 0.1}
              />
            </div>
          </div>

          {/* Flow breakdown */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Solar → Home', value: `${solarToHomePercent.toFixed(0)}%`, color: 'var(--solar)', active: flowDirection.solarToHome },
              { label: isCharging ? 'Solar → Battery' : 'Battery → Home', value: isCharging ? `${solarToBatteryPercent.toFixed(0)}%` : `${batteryPower < 0 ? Math.abs(batteryPower).toFixed(1) : '0'} kW`, color: 'var(--battery)', active: flowDirection.solarToBattery || flowDirection.batteryToHome },
              { label: isExporting ? 'Solar → Grid' : 'Grid → Home', value: `${solarToGridPercent.toFixed(0)}%`, color: 'var(--grid)', active: flowDirection.solarToGrid || flowDirection.gridToHome },
            ].map(({ label, value, color, active }) => (
              <div key={label} className="rounded-lg border p-2 text-center" style={{ borderColor: active ? color + '44' : 'var(--border)', backgroundColor: active ? color + '11' : 'var(--bg-card-muted)' }}>
                <div className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{label}</div>
                <div className="text-sm font-bold" style={{ color: active ? color : 'var(--text-secondary)' }}>{active ? value : '—'}</div>
              </div>
            ))}
          </div>

          {/* Additional loads */}
          <div className="mt-3 flex items-center gap-3 rounded-lg border p-2" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card-muted)' }}>
            <div className="flex items-center gap-1.5">
              <Car className="h-4 w-4" style={{ color: 'var(--battery)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>EV Chargers</span>
            </div>
            <div className="flex items-center gap-1.5 ml-4">
              <Building2 className="h-4 w-4" style={{ color: 'var(--consumption)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Commercial</span>
            </div>
            <div className="flex items-center gap-1.5 ml-4">
              <Factory className="h-4 w-4" style={{ color: 'var(--grid)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Industrial</span>
            </div>
            <div className="ml-auto">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                Total Load: <span style={{ color: 'var(--consumption)' }}>{homePower.toFixed(1)} kW</span>
              </span>
            </div>
          </div>

          {/* Solar distribution bar */}
          {solarPower > 0 && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Solar Distribution</span>
                <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{solarPower.toFixed(1)} kW total</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border)' }}>
                <div className="h-full transition-all duration-700" style={{ width: `${solarToHomePercent}%`, backgroundColor: 'var(--consumption)' }} title={`Home: ${solarToHomePercent.toFixed(0)}%`} />
                <div className="h-full transition-all duration-700" style={{ width: `${solarToBatteryPercent}%`, backgroundColor: 'var(--battery)' }} title={`Battery: ${solarToBatteryPercent.toFixed(0)}%`} />
                <div className="h-full transition-all duration-700" style={{ width: `${solarToGridPercent}%`, backgroundColor: 'var(--grid)' }} title={`Grid: ${solarToGridPercent.toFixed(0)}%`} />
              </div>
              <div className="flex items-center gap-3">
                {[
                  { label: 'Home', pct: solarToHomePercent, color: 'var(--consumption)' },
                  { label: 'Battery', pct: solarToBatteryPercent, color: 'var(--battery)' },
                  { label: 'Grid Export', pct: solarToGridPercent, color: 'var(--grid)' },
                ].map(({ label, pct, color }) => (
                  <div key={label} className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-primary)' }}>{pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
