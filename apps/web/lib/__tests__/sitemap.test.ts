import { describe, it, expect } from 'vitest'
import { SITE_ROUTES } from '../sitemap'

describe('SITE_ROUTES', () => {
  it('has no duplicate paths', () => {
    const paths = SITE_ROUTES.map((r) => r.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('includes expected public routes', () => {
    const publicRoutes = SITE_ROUTES.filter((r) => !r.requiresAuth && r.seo)
    const paths = publicRoutes.map((r) => r.path)
    expect(paths).toContain('/')
    expect(paths).toContain('/explore')
    expect(paths).toContain('/about')
    expect(paths).toContain('/privacy')
    expect(paths).toContain('/terms')
    expect(paths).toContain('/login')
    expect(paths).toContain('/signup')
  })

  it('marks auth routes as non-seo', () => {
    const authRoutes = SITE_ROUTES.filter((r) => r.requiresAuth)
    for (const route of authRoutes) {
      expect(route.seo).toBe(false)
    }
  })
})
