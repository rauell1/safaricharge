import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Battery Storage & State of Charge Monitoring -  Live Demo | SafariCharge',
  description:
    'Simulate battery state of charge, charge/discharge behavior, and BESS efficiency in the free SafariCharge simulator -  built for Kenya and African microgrids.',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: 'https://solar.rauell.systems/demo/battery',
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://solar.rauell.systems/demo/battery',
    siteName: 'SafariCharge',
    title: 'Battery Storage & State of Charge Monitoring | SafariCharge',
    description:
      'Simulate battery state of charge, charge/discharge behavior, and BESS efficiency -  free, no sign-up.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'SafariCharge Battery Storage Monitoring',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@rauell1',
    creator: '@rauell1',
    title: 'Battery Storage Monitoring | SafariCharge',
    description: 'Simulate battery state of charge and BESS efficiency -  free, no sign-up.',
    images: ['/opengraph-image'],
  },
}

export default function BatteryDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
