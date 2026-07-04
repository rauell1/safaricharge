import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Live Solar Energy Demo -  Try the Simulator Free',
  description:
    'Try SafariCharge free. Simulate a solar + BESS microgrid, run MILP dispatch optimization, and see real KPLC cost savings -  no sign-up required.',
  keywords: [
    'solar energy simulator Kenya',
    'free solar simulation',
    'BESS demo Africa',
    'solar microgrid demo',
    'KPLC tariff demo',
    'solar dashboard Kenya',
    'battery storage demo',
    'EV charging simulation',
    'grid solar demo Africa',
    'solar ROI demo',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: 'https://solar.rauell.systems/demo',
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://solar.rauell.systems/demo',
    siteName: 'SafariCharge',
    title: 'Live Solar Energy Demo -  Try the Simulator Free | SafariCharge',
    description:
      'Simulate a solar + BESS microgrid, run MILP dispatch optimization, and see KPLC cost savings -  no sign-up required.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'SafariCharge Solar Energy Simulator Demo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@rauell1',
    creator: '@rauell1',
    title: 'Live Solar Energy Demo | SafariCharge',
    description:
      'Simulate solar + BESS, optimize KPLC tariffs, forecast ROI -  free, no sign-up.',
    images: ['/opengraph-image'],
  },
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children
}
