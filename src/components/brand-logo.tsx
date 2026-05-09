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
  const wrapperClassName = size === 'sm' ? 'h-8 w-[118px]' : 'h-10 w-[140px]';

  return (
    <Link href={href} className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className={`relative shrink-0 ${wrapperClassName}`}>
        <Image
          src="/logo.png"
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