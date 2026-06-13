import type { MetadataRoute } from 'next'

const BASE_URL = 'https://solar.rauell.systems'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return [
    // ── Primary public pages ────────────────────────────────────────────────
    {
      url: `${BASE_URL}/landing`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/demo`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // ── Demo sub-pages (keyword-rich, indexable) ────────────────────────────
    {
      url: `${BASE_URL}/demo/solar`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/demo/battery`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/demo/grid`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/demo/ev`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]
}
