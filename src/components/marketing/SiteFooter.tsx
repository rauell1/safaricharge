import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';

const footerLinkCls =
  'block text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]';

/** Shared marketing footer. Server-component friendly (no hooks). */
export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] py-12 px-6 sm:px-10">
      <div className="mx-auto max-w-7xl grid gap-10 md:grid-cols-3 text-sm text-[var(--text-tertiary)]">
        <div>
          <div className="mb-4">
            <BrandLogo href="/landing" size="sm" />
          </div>
          <p className="mb-2">Solar energy management for Kenya and Africa</p>
          <p>© {new Date().getFullYear()} SafariCharge</p>
        </div>

        <div>
          <p className="font-semibold mb-3 text-[var(--text-primary)]">Links</p>
          <div className="space-y-2">
            <Link href="/landing#features" className={footerLinkCls}>Features</Link>
            <Link href="/pricing" className={footerLinkCls}>Pricing</Link>
            <Link href="/signup" className={footerLinkCls}>Get Started</Link>
          </div>
        </div>

        <div>
          <p className="font-semibold mb-3 text-[var(--text-primary)]">Contact</p>
          <a href="mailto:hello@safaricharge.ke" className={`${footerLinkCls} inline-flex mb-2`}>
            hello@safaricharge.ke
          </a>
          <p>Built in Nairobi 🇰🇪</p>
        </div>
      </div>
    </footer>
  );
}
