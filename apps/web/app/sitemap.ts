import { SITE_ROUTES } from '@/lib/sitemap'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gotravyl.com'

export default function sitemap() {
  return SITE_ROUTES
    .filter((route) => route.seo && !route.requiresAuth)
    .map((route) => ({
      url: `${BASE_URL}${route.path}`,
      lastModified: new Date(),
      changeFrequency: (route.path === '/' ? 'daily' : 'monthly') as 'daily' | 'monthly',
      priority: route.path === '/' ? 1.0 : 0.8,
    }))
}
