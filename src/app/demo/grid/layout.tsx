import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Grid Import/Export & KPLC Tariff Monitoring -  Live Demo | SafariCharge',
  description:
    'Simulate grid import vs export, KPLC tariff costs, and time-of-use savings in the free SafariCharge simulator -  built for Kenya and African microgrids.',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: 'https://solar.rauell.systems/demo/grid',
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://solar.rauell.systems/demo/grid',
    siteName: 'SafariCharge',
    title: 'Grid Import/Export & KPLC Tariff Monitoring | SafariCharge',
    description:
      'Simulate grid import vs export, KPLC tariff costs, and time-of-use savings -  free, no sign-up.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'SafariCharge Grid & KPLC Tariff Monitoring',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@rauell1',
    creator: '@rauell1',
    title: 'Grid & KPLC Tariff Monitoring | SafariCharge',
    description: 'Simulate grid import/export and KPLC tariff costs -  free, no sign-up.',
    images: ['/opengraph-image'],
  },
}

export default function GridDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
