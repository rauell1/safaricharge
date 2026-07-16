'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

/* Shared form styling for the auth/onboarding surfaces — one definition so
   login, signup, and onboarding inputs render identically. */
export const authInputCls =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-3 pl-[42px] pr-3.5 text-sm ' +
  'text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all duration-200 ' +
  'focus:border-[var(--battery)] focus:ring-2 focus:ring-[var(--battery-soft)]';

export const authLabelCls =
  'block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)] mb-1.5';

export const authButtonCls =
  'w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--battery-bright)] py-3 text-sm font-semibold text-white ' +
  'shadow-[0_1px_2px_rgba(4,120,87,0.35),0_0_0_1px_rgba(4,120,87,0.12)] transition-all duration-200 ' +
  'hover:bg-[var(--battery)] hover:shadow-[0_4px_12px_rgba(4,120,87,0.25)] disabled:opacity-70 disabled:cursor-not-allowed';

export const authErrorCls =
  'rounded-lg border border-[var(--alert)]/20 bg-[var(--alert-soft)] px-3.5 py-2.5 text-[13px] text-[var(--alert)] mb-[18px]';

export const authSuccessCls =
  'rounded-lg border border-[var(--battery)]/20 bg-[var(--battery-soft)] px-4 py-3 text-[13.5px] leading-snug text-[var(--battery)] mb-[18px]';

/**
 * Full-screen shell for auth and onboarding pages: grid backdrop + hero glow,
 * blurred header with back link, centered card, footer. Children render inside
 * the card.
 */
export function AuthShell({
  children,
  maxWidth = 440,
}: {
  children: React.ReactNode;
  maxWidth?: number;
}) {
  return (
    // Backdrop layers are absolutely positioned inside this relative wrapper —
    // never on <body> — so Radix fixed portals keep the viewport as their
    // containing block.
    <div className="relative flex min-h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Subtle grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(var(--grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--grid-line)_1px,transparent_1px)] [background-size:64px_64px]"
      />
      {/* Top glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_55%_45%_at_50%_0%,var(--hero-glow)_0%,transparent_70%)]"
      />

      {/* Header */}
      <header className="relative z-10 flex h-[60px] items-center justify-between border-b border-[var(--border)] bg-[var(--nav-bg)] px-6 backdrop-blur-md">
        <BrandLogo href="/landing" />
        <Link
          href="/landing"
          className="flex items-center gap-1.5 text-[13px] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={14} /> Back to home
        </Link>
      </header>

      {/* Centered card */}
      <div className="relative z-10 flex flex-1 items-center justify-center overflow-y-auto p-6">
        <div
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 shadow-[var(--card-shadow-hover)]"
          style={{ maxWidth }}
        >
          {children}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border)] bg-[var(--nav-bg)] p-3.5 text-center text-xs text-[var(--text-tertiary)]">
        © {new Date().getFullYear()} SafariCharge · Secure access for clean energy professionals
      </footer>
    </div>
  );
}
