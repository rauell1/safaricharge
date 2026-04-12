'use client';

import React, { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
  width?: number;
}

export function Sparkline({ data, color, height = 24, width = 60 }: SparklineProps) {
  const pathData = useMemo(() => {
    if (data.length < 2) return '';

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [data, height, width]);

  const areaPathData = useMemo(() => {
    if (data.length < 2) return '';

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });

    return `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;
  }, [data, height, width]);

  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-[10px] text-[var(--text-tertiary)]"
        style={{ width, height }}
      >
        N/A
      </div>
    );
  }

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={areaPathData} fill={color} opacity="0.15" />
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
