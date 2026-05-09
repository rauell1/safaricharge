import Image from 'next/image';
import Link from 'next/link';

interface BrandLogoProps {
  href?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function BrandLogo({
  href = '/landing',
  showLabel = true,
  size = 'md',
  className = '',
}: BrandLogoProps) {
  // logo.svg (4.5 KB vector) replaces logo.png (6.48 MB raster).
  // SVG scales perfectly at any DPI/zoom, loads ~1400× faster on mobile.
  const wrapperClassName = size === 'sm' ? 'h-8 w-[118px]' : 'h-10 w-[140px]';

  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className={`relative shrink-0 ${wrapperClassName}`}>
        <Image
          src="/logo.svg"
          alt="SafariCharge logo"
          fill
          priority
          sizes={size === 'sm' ? '118px' : '140px'}
          className="object-contain"
        />
      </span>
      {showLabel ? (
        <span className="font-semibold text-sm tracking-tight text-[var(--text-primary)]">SafariCharge</span>
      ) : null}
    </Link>
  );
}