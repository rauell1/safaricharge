'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { createClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export interface SiteNavLink {
  label: string;
  href: string;
}

const DEFAULT_LINKS: SiteNavLink[] = [
  { label: 'Features', href: '/landing#features' },
  { label: 'Performance', href: '/landing#stats' },
  { label: 'Pricing', href: '/pricing' },
];

/** Marketing CTA button classes (primary pill) — single definition so every
 *  marketing surface renders the identical button. */
export const marketingCta =
  'group inline-flex items-center gap-2 rounded-full bg-[var(--battery-bright)] text-white font-semibold ' +
  'shadow-[0_1px_2px_rgba(4,120,87,0.35),0_0_0_1px_rgba(4,120,87,0.12)] transition-all duration-200 ' +
  'hover:bg-[var(--battery)] hover:shadow-[0_4px_12px_rgba(4,120,87,0.25)] hover:-translate-y-px';

export function SiteNav({ links = DEFAULT_LINKS }: { links?: SiteNavLink[] }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session?.user);
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  const navLinkCls =
    'text-sm px-3.5 py-2 rounded-md text-[var(--text-tertiary)] transition-colors ' +
    'hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)]';

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-[var(--border)] bg-[var(--nav-bg)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto max-w-7xl px-6 sm:px-10 h-16 flex items-center justify-between">
        <BrandLogo href="/landing" />

        <nav className="hidden md:flex items-center gap-1">
          {links.map((item) => (
            <Link key={item.label} href={item.href} className={navLinkCls}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated === true ? (
            <Link href="/dashboard" className={cn(marketingCta, 'hidden sm:inline-flex text-sm px-4 py-1.5')}>
              Go to Dashboard <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center text-sm font-medium px-3.5 py-1.5 rounded-md text-[var(--text-tertiary)] transition-colors hover:text-[var(--battery)]"
              >
                Sign In
              </Link>
              <Link href="/signup" className={cn(marketingCta, 'hidden sm:inline-flex text-sm px-4 py-1.5')}>
                Get Started <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border)] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--nav-bg)] px-6 py-4 flex flex-col gap-1">
          {links.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm px-3 py-2.5 rounded-md text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)]"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-2 pt-3 flex flex-col gap-2 border-t border-[var(--border)]">
            {isAuthenticated === true ? (
              <Link
                href="/dashboard"
                className={cn(marketingCta, 'justify-center text-sm px-4 py-2.5')}
                onClick={() => setMobileMenuOpen(false)}
              >
                Go to Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center justify-center text-sm font-medium px-4 py-2 rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className={cn(marketingCta, 'justify-center text-sm px-4 py-2.5')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
