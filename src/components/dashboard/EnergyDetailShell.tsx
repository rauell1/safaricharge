'use client';

import React from 'react';
import { DashboardLayout } from './DashboardLayout';
import { DashboardHeader } from './DashboardHeader';
import { TimeRangeSwitcher } from './TimeRangeSwitcher';
import { useDemoEnergySystem } from '@/hooks/useDemoEnergySystem';
import { useSimulationState, useTimeRange } from '@/hooks/useEnergySystem';

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
        </div>
      </main>
    </DashboardLayout>
  );
}
