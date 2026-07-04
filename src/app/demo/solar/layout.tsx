import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Solar Generation Monitoring -  Live Demo | SafariCharge',
  description:
    'Track real-time solar PV output, peak production, and generation efficiency trends in the free SafariCharge simulator -  built for Kenya and African microgrids.',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: 'https://solar.rauell.systems/demo/solar',
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://solar.rauell.systems/demo/solar',
    siteName: 'SafariCharge',
    title: 'Solar Generation Monitoring | SafariCharge',
    description:
      'Track real-time solar PV output, peak production, and generation efficiency trends -  free, no sign-up.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'SafariCharge Solar Generation Monitoring',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@rauell1',
    creator: '@rauell1',
    title: 'Solar Generation Monitoring | SafariCharge',
    description: 'Track real-time solar PV output and generation trends -  free, no sign-up.',
    images: ['/opengraph-image'],
  },
}

export default function SolarDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
