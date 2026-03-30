'use client';

import React from 'react';
import { Sun, Zap, Home, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkline } from './Sparkline';

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accentColor: 'solar' | 'energy' | 'info' | 'grid';
  sparklineData?: number[];
  comparisonText?: string;
}

function StatCard({ title, value, unit, subtitle, icon, trend, trendValue, accentColor, sparklineData, comparisonText }: StatCardProps) {
  const accentColorClasses = {
    solar: {
      bg: 'bg-[var(--solar-soft)]',
      icon: 'text-[var(--solar)]',
      glow: 'stat-card-solar',
      gradient: 'gradient-text-solar'
    },
    energy: {
      bg: 'bg-[var(--battery-soft)]',
      icon: 'text-[var(--battery)]',
      glow: 'stat-card-energy',
      gradient: 'gradient-text-energy'
    },
    info: {
      bg: 'bg-[var(--consumption-soft)]',
      icon: 'text-[var(--consumption)]',
      glow: 'hover:shadow-glow-md',
      gradient: 'text-[var(--consumption)]'
    },
    grid: {
      bg: 'bg-[var(--grid-soft)]',
      icon: 'text-[var(--grid)]',
      glow: 'hover:shadow-glow-md',
      gradient: 'text-[var(--grid)]'
    }
  };

  const colors = accentColorClasses[accentColor];

  return (
    <Card className={`dashboard-card relative overflow-hidden transition-all duration-300 ${colors.glow}`}>
      <CardContent className="p-6">
        {/* % change badge top-right */}
        {trend && trendValue && (
          <div className={`absolute top-3 right-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur ${
            trend === 'up'
              ? 'bg-[var(--battery-soft)] text-[var(--battery)]'
              : trend === 'down'
              ? 'bg-[var(--alert-soft)] text-[var(--alert)]'
              : 'bg-[var(--bg-card-muted)] text-[var(--text-secondary)]'
          }`}>
            {trend === 'up' && <TrendingUp className="h-2.5 w-2.5" />}
            {trend === 'down' && <TrendingDown className="h-2.5 w-2.5" />}
            {trendValue}
          </div>
        )}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-1 tracking-tight">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className={`text-3xl font-bold ${colors.gradient} animate-counter`}>
                {value}
              </h3>
              {unit && (
                <span className="text-sm font-medium text-[var(--text-tertiary)]">
                  {unit}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {subtitle}
              </p>
            )}
            {comparisonText && (
              <p className="text-xs text-[var(--text-secondary)] mt-2 font-medium">
                {comparisonText}
              </p>
            )}
          </div>
          {sparklineData && sparklineData.length > 0 && (
            <div className="flex flex-col items-end gap-2">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg} border border-[var(--border)]`}>
                <div className={colors.icon}>
                  {icon}
                </div>
              </div>
              <Sparkline
                data={sparklineData}
                color={`var(--${accentColor === 'info' ? 'consumption' : accentColor})`}
                height={20}
                width={60}
              />
            </div>
          )}
          {(!sparklineData || sparklineData.length === 0) && (
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg} border border-[var(--border)]`}>
              <div className={colors.icon}>
                {icon}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface StatCardsProps {
  totalGeneration: number;
  currentPower: number;
  consumption: number;
  savings: number;
  generationHistory?: number[];
  powerHistory?: number[];
  consumptionHistory?: number[];
  savingsHistory?: number[];
  weeklyAvgGeneration?: number;
  weeklyAvgConsumption?: number;
  yesterdaySavings?: number;
}

export function StatCards({
  totalGeneration,
  currentPower,
  consumption,
  savings,
  generationHistory = [],
  powerHistory = [],
  consumptionHistory = [],
  savingsHistory = [],
  weeklyAvgGeneration,
  weeklyAvgConsumption,
  yesterdaySavings,
}: StatCardsProps) {
  // Calculate dynamic trends
  const generationTrend = weeklyAvgGeneration && weeklyAvgGeneration > 0
    ? ((totalGeneration - weeklyAvgGeneration) / weeklyAvgGeneration) * 100
    : 0;
  const generationTrendText = weeklyAvgGeneration
    ? `${generationTrend >= 0 ? '+' : ''}${generationTrend.toFixed(1)}%`
    : '+0%';
  const generationComparison = weeklyAvgGeneration
    ? `${generationTrend >= 0 ? '↑' : '↓'} ${Math.abs(generationTrend).toFixed(1)}% vs weekly avg`
    : undefined;

  const consumptionTrend = weeklyAvgConsumption && weeklyAvgConsumption > 0
    ? ((consumption - weeklyAvgConsumption) / weeklyAvgConsumption) * 100
    : 0;
  const consumptionTrendText = weeklyAvgConsumption
    ? `${consumptionTrend >= 0 ? '+' : ''}${consumptionTrend.toFixed(1)}%`
    : '+0%';
  const consumptionComparison = weeklyAvgConsumption
    ? `${consumptionTrend >= 0 ? '↑' : '↓'} ${Math.abs(consumptionTrend).toFixed(1)}% vs weekly avg`
    : undefined;

  const savingsChange = yesterdaySavings ? savings - yesterdaySavings : 0;
  const savingsTrendText = yesterdaySavings
    ? `${savingsChange >= 0 ? '+' : ''}KES ${Math.abs(savingsChange).toFixed(0)}`
    : '+KES 0';
  const savingsComparison = yesterdaySavings
    ? `${savingsChange >= 0 ? '↑' : '↓'} KES ${Math.abs(savingsChange).toFixed(0)} vs yesterday`
    : undefined;

  // Power trend based on recent history
  const powerTrend = powerHistory.length >= 2
    ? powerHistory[powerHistory.length - 1] > powerHistory[0] ? 'up' : 'down'
    : 'neutral';
  const powerTrendValue = powerHistory.length >= 2
    ? `${((powerHistory[powerHistory.length - 1] - powerHistory[0]) / (powerHistory[0] || 1) * 100).toFixed(1)}%`
    : '+0%';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Generation"
        value={totalGeneration.toFixed(1)}
        unit="kWh"
        subtitle="Today's solar energy"
        icon={<Sun className="h-6 w-6" />}
        trend={generationTrend >= 0 ? 'up' : 'down'}
        trendValue={generationTrendText}
        accentColor="solar"
        sparklineData={generationHistory}
        comparisonText={generationComparison}
      />
      <StatCard
        title="Current Power"
        value={currentPower.toFixed(2)}
        unit="kW"
        subtitle="Live generation"
        icon={<Zap className="h-6 w-6" />}
        trend={powerTrend}
        trendValue={powerTrendValue}
        accentColor="energy"
        sparklineData={powerHistory}
      />
      <StatCard
        title="Consumption"
        value={consumption.toFixed(1)}
        unit="kWh"
        subtitle="Total energy used"
        icon={<Home className="h-6 w-6" />}
        trend={consumptionTrend >= 0 ? 'up' : 'down'}
        trendValue={consumptionTrendText}
        accentColor="info"
        sparklineData={consumptionHistory}
        comparisonText={consumptionComparison}
      />
      <StatCard
        title="Savings"
        value={`KES ${savings.toFixed(0)}`}
        subtitle="Cost saved today"
        icon={<DollarSign className="h-6 w-6" />}
        trend={savingsChange >= 0 ? 'up' : 'down'}
        trendValue={savingsTrendText}
        accentColor="energy"
        sparklineData={savingsHistory}
        comparisonText={savingsComparison}
      />
    </div>
  );
}
