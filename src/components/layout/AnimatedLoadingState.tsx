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
    /*
      Use fixed inset-0 so the loading overlay is always exactly the viewport
      size regardless of what parent containers wrap it. Any parent with a
      narrower width, missing w-full, or inline layout would otherwise shrink
      the flex container and cause the card to render as a narrow pill with
      single-word-per-line text wrapping.
    */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'var(--bg-primary, #f5f7f4)' }}
    >
      <div
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center"
        style={{
          maxWidth: '420px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          background: 'var(--bg-card, #ffffff)',
          borderColor: 'var(--border, rgba(7,18,14,0.10))',
        }}
      >
        {/* Animated icon */}
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
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

        {/* Text — explicit width + whitespace handling prevents word-per-line wrapping */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
          <p
            className="text-sm text-[var(--text-secondary)] leading-relaxed"
            style={{ overflowWrap: 'normal', wordBreak: 'normal', whiteSpace: 'normal' }}
          >
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
