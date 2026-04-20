'use client';

import React from 'react';

type AnimatedLoadingStateProps = {
  title: string;
  description: string;
  accentClassName?: string;
};

export function AnimatedLoadingState({
  title,
  description,
  accentClassName = 'border-t-[var(--battery)]',
}: AnimatedLoadingStateProps) {
  const bars = [
    { height: 'h-3', delayClass: 'delay-0' },
    { height: 'h-5', delayClass: 'delay-100' },
    { height: 'h-8', delayClass: 'delay-200' },
    { height: 'h-4', delayClass: 'delay-300' },
    { height: 'h-6', delayClass: 'delay-500' },
  ];

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[var(--border)]/60 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.14),transparent_68%)] animate-pulse" />
          <div className="absolute inset-2 rounded-full border border-[var(--border)]/80" />
          <div className={`absolute inset-0 rounded-full border-2 border-transparent ${accentClassName} animate-spin`} />
          <div className="absolute inset-x-3 bottom-2 flex items-end justify-center gap-1.5">
            {bars.map((bar) => (
              <span
                key={bar.delayClass}
                className={`w-1.5 rounded-full bg-[var(--solar)]/70 ${bar.height} animate-pulse ${bar.delayClass}`}
              />
            ))}
          </div>
          <div className="absolute inset-x-5 top-5 h-5 rounded-full bg-[var(--battery)]/20 blur-xl animate-pulse" />
        </div>

        <div className="mx-auto max-w-sm space-y-2">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
          <p className="text-sm text-[var(--text-secondary)]">{description}</p>
        </div>
      </div>
    </main>
  );
}
