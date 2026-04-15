'use client';

import React from 'react';
import { Sun, Zap, Home, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
    <Card className={`dashboard-card relative overflow-hidden transition-all duration-220 ${colors.glow}`}>
      <CardContent className="p-5 md:p-6">
        {/* % change badge top-right */}
        {trend && trendValue && (
          <div className={`absolute top-4 right-4 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm shadow-sm ${
            trend === 'up'
              ? 'bg-[var(--battery-soft)] text-[var(--battery)]'
              : trend === 'down'
              ? 'bg-[var(--alert-soft)] text-[var(--alert)]'
              : 'bg-[var(--bg-card-muted)] text-[var(--text-secondary)]'
          }`}
          role="status"
          aria-label={`Trend: ${trend} ${trendValue}`}
          >
            {trend === 'up' && <TrendingUp className="h-3 w-3" aria-hidden="true" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3" aria-hidden="true" />}
            <span>{trendValue}</span>
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-secondary)] mb-2 tracking-tight">
              {title}
            </p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <h3 className={`text-3xl md:text-4xl font-bold ${colors.gradient} animate-counter`}>
                {value}
              </h3>
              {unit && (
                <span className="text-sm font-medium text-[var(--text-tertiary)]">
                  {unit}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-base text-[var(--text-secondary)] mt-2 leading-relaxed prose-comfortable">
                {subtitle}
              </p>
            )}
            {comparisonText && (
              <p className="text-sm text-[var(--text-secondary)] mt-2.5 font-medium leading-relaxed">
                {comparisonText}
              </p>
            )}
          </div>
          {sparklineData && sparklineData.length > 0 && (
            <div className="flex flex-col items-end gap-2">
              <div className={`flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl ${colors.bg} border border-[var(--border)] transition-transform duration-200 hover:scale-105`}
                aria-hidden="true"
              >
                <div className={`${colors.icon} transition-colors duration-200`}>
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
  isLoading?: boolean;
}

function StatCardSkeleton() {
  return (
    <Card className="dashboard-card relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-12 w-12 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
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
  weeklyAvgGeneration = 0,
  weeklyAvgConsumption = 0,
  yesterdaySavings = 0,
  isLoading
}: StatCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  const generationTrend = weeklyAvgGeneration > 0
    ? ((totalGeneration - weeklyAvgGeneration) / weeklyAvgGeneration) * 100
    : 0;
  const generationTrendText = `${generationTrend >= 0 ? '+' : ''}${generationTrend.toFixed(1)}%`;
  const generationComparison = weeklyAvgGeneration > 0
    ? `vs ${weeklyAvgGeneration.toFixed(1)} kWh weekly avg`
    : undefined;

  const avgPower = powerHistory.length > 0
    ? powerHistory.reduce((a, b) => a + b, 0) / powerHistory.length
    : 0;
  const powerTrend = currentPower >= avgPower ? 'up' : 'down';
  const powerTrendValue = avgPower > 0
    ? `${currentPower >= avgPower ? '+' : ''}${(((currentPower - avgPower) / avgPower) * 100).toFixed(1)}%`
    : undefined;

  const consumptionTrend = weeklyAvgConsumption > 0
    ? ((consumption - weeklyAvgConsumption) / weeklyAvgConsumption) * 100
    : 0;
  const consumptionTrendText = `${consumptionTrend >= 0 ? '+' : ''}${consumptionTrend.toFixed(1)}%`;
  const consumptionComparison = weeklyAvgConsumption > 0
    ? `vs ${weeklyAvgConsumption.toFixed(1)} kWh weekly avg`
    : undefined;

  const savingsChange = yesterdaySavings > 0
    ? ((savings - yesterdaySavings) / yesterdaySavings) * 100
    : 0;
  const savingsTrendText = `${savingsChange >= 0 ? '+' : ''}${savingsChange.toFixed(1)}%`;
  const savingsComparison = yesterdaySavings > 0
    ? `vs KES ${yesterdaySavings.toFixed(0)} yesterday`
    : undefined;

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
