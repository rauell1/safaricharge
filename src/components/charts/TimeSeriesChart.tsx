'use client';

import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  ResponsiveContainer,
} from 'recharts';

export interface SeriesConfig {
  key: string;
  label: string;
  color: string;
  type: 'line' | 'area' | 'bar';
  yAxisId?: 'left' | 'right';
  dashed?: boolean;
  fillOpacity?: number;
}

interface TimeSeriesChartProps {
  series: SeriesConfig[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[];
  xKey: string;
  rightAxisLabel?: string;
  leftAxisLabel?: string;
  height?: number;
  showBrush?: boolean;
}

export function TimeSeriesChart({
  series,
  data,
  xKey,
  rightAxisLabel,
  leftAxisLabel,
  height = 280,
  showBrush = false,
}: TimeSeriesChartProps) {
  const hasRightAxis = series.some((s) => s.yAxisId === 'right');

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 4, right: hasRightAxis ? 44 : 8, left: 8, bottom: showBrush ? 24 : 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
          tickLine={false}
          axisLine={false}
          label={
            leftAxisLabel
              ? {
                  value: leftAxisLabel,
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 10, fill: 'var(--text-tertiary)' },
                }
              : undefined
          }
        />
        {hasRightAxis && (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
            tickLine={false}
            axisLine={false}
            label={
              rightAxisLabel
                ? {
                    value: rightAxisLabel,
                    angle: 90,
                    position: 'insideRight',
                    style: { fontSize: 10, fill: 'var(--text-tertiary)' },
                  }
                : undefined
            }
          />
        )}
        <Tooltip
          contentStyle={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--text-primary)',
          }}
          labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600 }}
          itemStyle={{ color: 'var(--text-primary)' }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
        {showBrush && (
          <Brush
            dataKey={xKey}
            height={20}
            stroke="var(--border)"
            fill="var(--bg-card-muted)"
            travellerWidth={6}
          />
        )}
        {series.map((s) => {
          const yId = s.yAxisId ?? 'left';
          if (s.type === 'area') {
            return (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                fill={s.color}
                fillOpacity={s.fillOpacity ?? 0.18}
                strokeWidth={2}
                yAxisId={yId}
                dot={false}
              />
            );
          }
          if (s.type === 'bar') {
            return (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.label}
                fill={s.color}
                fillOpacity={s.fillOpacity ?? 0.8}
                yAxisId={yId}
                radius={[2, 2, 0, 0]}
              />
            );
          }
          return (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? '5 3' : undefined}
              yAxisId={yId}
              dot={false}
            />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
