'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatCards } from '@/components/dashboard/StatCards';
import { PowerFlowVisualization } from '@/components/dashboard/PowerFlowVisualization';
import { PanelStatusTable } from '@/components/dashboard/PanelStatusTable';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { TimeRangeSwitcher } from '@/components/dashboard/TimeRangeSwitcher';
import DailyEnergyGraph from '@/components/DailyEnergyGraph';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, TrendingUp } from 'lucide-react';

export default function ModularDashboardDemo() {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('today');
  const currentDate = new Date();

  // Mock data for demonstration
  const mockData = {
    totalGeneration: 245.6,
    currentPower: 38.5,
    consumption: 198.3,
    savings: 2847,
    solarPower: 38.5,
    batteryPower: 5.2,
    gridPower: -8.3,
    homePower: 24.8,
    batteryLevel: 85,
    flowDirection: {
      solarToHome: true,
      solarToBattery: true,
      solarToGrid: true,
      batteryToHome: false,
      gridToHome: false,
    },
  };

  const mockGraphData = [
    { timeOfDay: 0, solar: 0, load: 15, batSoc: 80, gridImport: 10, gridExport: 0 },
    { timeOfDay: 6, solar: 5, load: 20, batSoc: 75, gridImport: 12, gridExport: 0 },
    { timeOfDay: 12, solar: 45, load: 30, batSoc: 85, gridImport: 0, gridExport: 15 },
    { timeOfDay: 18, solar: 10, load: 35, batSoc: 80, gridImport: 5, gridExport: 0 },
    { timeOfDay: 24, solar: 0, load: 18, batSoc: 75, gridImport: 15, gridExport: 0 },
  ];

  return (
    <DashboardLayout>
      <DashboardHeader
        currentDate={currentDate}
        onReset={() => console.log('Reset clicked')}
        onLocationClick={() => console.log('Location clicked')}
        onDownload={() => console.log('Download clicked')}
        locationName="Nairobi, Kenya"
        notificationCount={3}
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Time Range Switcher */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-dark-text-primary">Energy Dashboard</h2>
            <p className="text-sm text-dark-text-secondary">Monitor your solar energy system performance</p>
          </div>
          <TimeRangeSwitcher selectedRange={timeRange} onRangeChange={setTimeRange} />
        </div>

        {/* Stat Cards */}
        <StatCards
          totalGeneration={mockData.totalGeneration}
          currentPower={mockData.currentPower}
          consumption={mockData.consumption}
          savings={mockData.savings}
        />

        {/* Power Flow and Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PowerFlowVisualization
            solarPower={mockData.solarPower}
            batteryPower={mockData.batteryPower}
            gridPower={mockData.gridPower}
            homePower={mockData.homePower}
            batteryLevel={mockData.batteryLevel}
            flowDirection={mockData.flowDirection}
          />

          <Card className="border-dark-border bg-secondary-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-dark-text-primary">
                <TrendingUp className="h-5 w-5 text-accent-energy" />
                Generation vs Consumption
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DailyEnergyGraph data={mockGraphData} dateLabel={currentDate.toISOString().slice(0, 10)} />
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-dark-border bg-secondary-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-dark-text-primary">
                <BarChart3 className="h-5 w-5 text-accent-info" />
                Monthly Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-dark-text-tertiary">
                Monthly trend chart will be displayed here
              </div>
            </CardContent>
          </Card>

          <Card className="border-dark-border bg-secondary-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-dark-text-primary">
                <PieChart className="h-5 w-5 text-accent-grid" />
                Energy Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64 text-dark-text-tertiary">
                Distribution chart will be displayed here
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel Status and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PanelStatusTable />
          <AlertsList />
        </div>

        {/* Environmental Impact */}
        <Card className="border-dark-border bg-secondary-900">
          <CardHeader>
            <CardTitle className="text-dark-text-primary">Environmental Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-accent-energy mb-2">2.4 tons</div>
                <div className="text-sm text-dark-text-secondary">CO₂ Offset (Year)</div>
              </div>
              <div className="text-center border-l border-r border-dark-border">
                <div className="text-3xl font-bold text-accent-solar mb-2">148</div>
                <div className="text-sm text-dark-text-secondary">Trees Equivalent</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-accent-info mb-2">12,450 km</div>
                <div className="text-sm text-dark-text-secondary">Car Miles Offset</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </DashboardLayout>
  );
}
