'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { TimeRangeSwitcher } from './TimeRangeSwitcher';
import { useDemoEnergySystem } from '@/hooks/useDemoEnergySystem';
import { useMinuteData, useSimulationState, useTimeRange, useEnergyNode } from '@/hooks/useEnergySystem';
import { ThermalDeratingPanel } from '@/components/energy/ThermalDeratingPanel';
import { GridStabilityWidget } from '@/components/energy/GridStabilityWidget';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface EnergyDetailShellProps {
  title: string;
  subtitle: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

export function EnergyDetailShell({ title, subtitle, rightSlot, children }: EnergyDetailShellProps) {
  useDemoEnergySystem();
  const { currentDate } = useSimulationState();
  const { timeRange, setTimeRange } = useTimeRange();
  const minuteData = useMinuteData(timeRange);
  const batteryNode = useEnergyNode('battery');
  const gridNode = useEnergyNode('grid');

  const latestPoint = minuteData[minuteData.length - 1];
  const ambientTemp = 26 + Math.max(0, (latestPoint?.solarKW ?? 0) * 0.25);
  const batteryTemp = batteryNode.temperature ?? 30 + Math.max(0, Math.abs(batteryNode.powerKW) * 0.8);
  const inverterTemp = 32 + Math.max(0, (latestPoint?.solarKW ?? 0) * 1.4);
  const deratingPct = Math.max(0, (inverterTemp - 60) * 1.8);
  const thermalHistory = minuteData
    .filter((_, idx) => idx % 30 === 0)
    .slice(-24)
    .map((point) => ({
      time: `${String(point.hour).padStart(2, '0')}:${String(point.minute).padStart(2, '0')}`,
      temp: Number((26 + Math.max(0, point.solarKW * 0.25)).toFixed(1)),
      output: Number(point.solarKW.toFixed(1)),
    }));
  const liveFrequency = 50 + Math.max(-0.25, Math.min(0.25, gridNode.powerKW * 0.01));
  const stabilityRisk = Math.abs(liveFrequency - 50) > 0.15 ? 'high' : Math.abs(liveFrequency - 50) > 0.07 ? 'medium' : 'low';

  return (
    <DashboardLayout>
      <DashboardHeader
        currentDate={currentDate}
        onReset={() => window.location.reload()}
        onLocationClick={() => console.log('Location clicked')}
        onDownload={() => console.log('Download clicked')}
        locationName="Nairobi, Kenya"
        notificationCount={3}
      />

      <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto px-4 py-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h2>
              <p className="text-sm text-[var(--text-tertiary)]">{subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              {rightSlot}
              <TimeRangeSwitcher selectedRange={timeRange} onRangeChange={setTimeRange} />
            </div>
          </div>
          {children}
          <ThermalDeratingPanel
            ambientTemp={ambientTemp}
            batteryTemp={batteryTemp}
            inverterTemp={inverterTemp}
            deratingPct={deratingPct}
            historicalData={thermalHistory}
          />
          <Accordion type="single" collapsible className="rounded-xl border border-[var(--border)] px-4">
            <AccordionItem value="grid-stability">
              <AccordionTrigger className="text-sm font-medium text-muted-foreground">
                Grid Stability Insights
              </AccordionTrigger>
              <AccordionContent>
                <GridStabilityWidget
                  frequencyHz={liveFrequency}
                  stabilityRisk={stabilityRisk}
                  gridMode={gridNode.powerKW >= 0 ? 'following' : 'forming'}
                  isLive={minuteData.length > 0}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </main>
    </DashboardLayout>
  );
}
