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
  const iconSize = size === 'sm' ? 26 : 36;
  const textSizeClass = size === 'sm' ? 'text-base' : 'text-xl';
  const gapClass = size === 'sm' ? 'gap-2' : 'gap-2.5';

  return (
    <Link 
      href={href} 
      className={`inline-flex items-center select-none group focus:outline-none ${gapClass} ${className}`}
    >
      <span className="relative shrink-0 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]">
        <Image
          src="/favicon.png"
          alt="SafariCharge Icon"
          width={iconSize}
          height={iconSize}
          priority
          className="object-contain"
        />
      </span>
      {showLabel ? (
        <span className={`${textSizeClass} font-bold tracking-tight flex items-center leading-none select-none font-inter`}>
          <span className="text-[var(--text-primary)] opacity-85 transition-opacity duration-200 group-hover:opacity-100">
            Safari
          </span>
          <span className="text-[#22c55e] opacity-100 font-extrabold ml-[1px]">
            Charge
          </span>
        </span>
      ) : null}
    </Link>
  );
}