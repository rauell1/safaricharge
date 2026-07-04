import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'EV Charging Session Monitoring -  Live Demo | SafariCharge',
  description:
    'Simulate EV charging sessions, schedules, and live consumption alongside solar + battery dispatch in the free SafariCharge simulator -  built for Kenya and African microgrids.',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: 'https://solar.rauell.systems/demo/ev',
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://solar.rauell.systems/demo/ev',
    siteName: 'SafariCharge',
    title: 'EV Charging Session Monitoring | SafariCharge',
    description:
      'Simulate EV charging sessions, schedules, and live consumption alongside solar + battery dispatch -  free, no sign-up.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'SafariCharge EV Charging Monitoring',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@rauell1',
    creator: '@rauell1',
    title: 'EV Charging Monitoring | SafariCharge',
    description: 'Simulate EV charging sessions and live consumption -  free, no sign-up.',
    images: ['/opengraph-image'],
  },
}

export default function EvDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
