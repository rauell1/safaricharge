import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Solar Energy Management for Kenya & Africa',
  description:
    'Simulate solar PV + BESS systems, optimize KPLC tariff costs with MILP dispatch, and forecast financial returns. Free to use. Built for Kenya and African microgrids.',
  keywords: [
    'solar energy Kenya',
    'BESS optimization',
    'KPLC tariff savings',
    'solar simulation tool',
    'microgrid Kenya',
    'battery storage Africa',
    'off-grid solar simulator',
    'solar ROI calculator Africa',
    'EV charging Kenya',
    'MILP solar optimizer',
    'solar panel sizing Kenya',
    'Nairobi solar energy',
    'Africa energy management',
    'solar financial model Kenya',
    'carbon reduction solar',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
  },
  alternates: {
    canonical: 'https://solar.rauell.systems/landing',
  },
  openGraph: {
    type: 'website',
    locale: 'en_KE',
    url: 'https://solar.rauell.systems/landing',
    siteName: 'SafariCharge',
    title: 'Solar Energy Management for Kenya & Africa | SafariCharge',
    description:
      'Simulate solar PV + BESS systems, optimize KPLC tariff costs with MILP dispatch, and forecast financial returns. Free to use.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'SafariCharge -  Solar Energy Management for Kenya and Africa',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@rauell1',
    creator: '@rauell1',
    title: 'Solar Energy Management for Kenya & Africa | SafariCharge',
    description:
      'Simulate solar PV + BESS systems, optimize KPLC tariffs with MILP dispatch. Free to use.',
    images: ['/opengraph-image'],
  },
}

const landingPageGraphJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://solar.rauell.systems/#organization',
      name: 'SafariCharge',
      url: 'https://solar.rauell.systems',
      logo: 'https://solar.rauell.systems/logo.png',
      description:
        'Solar PV + BESS simulation and energy management platform for Kenya and Africa.',
      founder: {
        '@type': 'Person',
        name: 'Roy Okola',
      },
      areaServed: ['KE', 'NG', 'ZA', 'ET', 'TZ', 'UG', 'GH', 'SN'],
      knowsAbout: [
        'Solar Energy',
        'Battery Energy Storage Systems',
        'KPLC Tariff Optimization',
        'Microgrid Management',
        'Renewable Energy Africa',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://solar.rauell.systems/#website',
      name: 'SafariCharge',
      url: 'https://solar.rauell.systems',
      description:
        'Solar PV + BESS simulation, MILP dispatch optimization, and KPLC tariff analysis for Kenya and Africa.',
      inLanguage: 'en-KE',
      publisher: {
        '@id': 'https://solar.rauell.systems/#organization',
      },
    },
    {
      '@type': 'WebApplication',
      '@id': 'https://solar.rauell.systems/#webapplication',
      name: 'SafariCharge Solar Dashboard',
      url: 'https://solar.rauell.systems',
      applicationCategory: 'EnergyApplication',
      operatingSystem: 'Web',
      description:
        'Advanced solar PV and BESS simulation platform with MILP dispatch optimization and KPLC tariff analysis for Kenya and African microgrids.',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free to use',
      },
      featureList: [
        'Solar PV simulation',
        'Battery storage optimization',
        'KPLC tariff engine',
        'MILP dispatch optimizer',
        'EV charging integration',
        'Financial ROI analysis',
        'Carbon footprint tracking',
        'Africa location database',
      ],
      screenshot: 'https://solar.rauell.systems/og-image.png',
      creator: {
        '@type': 'Person',
        name: 'Roy Okola',
      },
      publisher: {
        '@id': 'https://solar.rauell.systems/#organization',
      },
    },
  ],
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingPageGraphJsonLd) }}
      />
      {children}
    </>
  )
}
