'use client';

import React from 'react';
import { Sun, Zap, Home, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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
      bg: 'bg-accent-solar-transparent',
      icon: 'text-accent-solar',
      glow: 'stat-card-solar',
      gradient: 'gradient-text-solar'
    },
    energy: {
      bg: 'bg-accent-energy-transparent',
      icon: 'text-accent-energy',
      glow: 'stat-card-energy',
      gradient: 'gradient-text-energy'
    },
    info: {
      bg: 'bg-accent-info-transparent',
      icon: 'text-accent-info',
      glow: 'hover:shadow-glow-md',
      gradient: 'text-accent-info'
    },
    grid: {
      bg: 'bg-accent-grid-transparent',
      icon: 'text-accent-grid',
      glow: 'hover:shadow-glow-md',
      gradient: 'text-accent-grid'
    }
  };

  const colors = accentColorClasses[accentColor];

  return (
    <Card className={`relative overflow-hidden border-dark-border bg-secondary-900 transition-all duration-300 hover:-translate-y-1 ${colors.glow}`}>
      <CardContent className="p-6">
        {/* % change badge top-right */}
        {trend && trendValue && (
          <div className={`absolute top-3 right-3 flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            trend === 'up'
              ? 'bg-accent-energy-transparent text-accent-energy'
              : trend === 'down'
              ? 'bg-accent-alert-transparent text-accent-alert'
              : 'bg-dark-border text-dark-text-secondary'
          }`}>
            {trend === 'up' && <TrendingUp className="h-2.5 w-2.5" />}
            {trend === 'down' && <TrendingDown className="h-2.5 w-2.5" />}
            {trendValue}
          </div>
        )}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-dark-text-secondary mb-1">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className={`text-3xl font-bold ${colors.gradient} animate-counter`}>
                {value}
              </h3>
              {unit && (
                <span className="text-sm font-medium text-dark-text-tertiary">
                  {unit}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-dark-text-tertiary mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg}`}>
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
}

export function StatCards({ totalGeneration, currentPower, consumption, savings }: StatCardsProps) {
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
        accentColor="energy"
      />
      <StatCard
        title="Consumption"
        value={consumption.toFixed(1)}
        unit="kWh"
        subtitle="Total energy used"
        icon={<Home className="h-6 w-6" />}
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
