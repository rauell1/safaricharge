'use client';

import React from 'react';
import { Sun, Zap, Home, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  accentColor: 'solar' | 'energy' | 'info' | 'grid';
}

function StatCard({ title, value, unit, subtitle, icon, trend, trendValue, accentColor }: StatCardProps) {
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
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg} border border-[var(--border)]`}>
            <div className={colors.icon}>
              {icon}
            </div>
          </div>
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

export function StatCards({ totalGeneration, currentPower, consumption, savings, isLoading }: StatCardsProps) {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Generation"
        value={totalGeneration.toFixed(1)}
        unit="kWh"
        subtitle="Today's solar energy"
        icon={<Sun className="h-6 w-6" />}
        trend="up"
        trendValue="+12.5%"
        accentColor="solar"
      />
      <StatCard
        title="Current Power"
        value={currentPower.toFixed(2)}
        unit="kW"
        subtitle="Live generation"
        icon={<Zap className="h-6 w-6" />}
        trend="up"
        trendValue="+4.3%"
        accentColor="energy"
      />
      <StatCard
        title="Consumption"
        value={consumption.toFixed(1)}
        unit="kWh"
        subtitle="Total energy used"
        icon={<Home className="h-6 w-6" />}
        trend="up"
        trendValue="+2.1%"
        accentColor="info"
      />
      <StatCard
        title="Savings"
        value={`KES ${savings.toFixed(0)}`}
        subtitle="Cost saved today"
        icon={<DollarSign className="h-6 w-6" />}
        trend="up"
        trendValue="+KES 145"
        accentColor="energy"
      />
    </div>
  );
}
