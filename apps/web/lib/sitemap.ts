// apps/web/lib/sitemap.ts
// Plain data module -- no 'use client', no React imports.
// Safe for both server-side (sitemap) and client-side (command palette) imports.

export interface SiteRoute {
  path: string
  title: string
  description: string
  category: 'main' | 'dashboard' | 'trip' | 'legal' | 'auth' | 'social'
  icon: string    // lucide-react icon name, resolved client-side via resolveIcon()
  keywords: string[]
  seo: boolean
  requiresAuth: boolean
}

export const SITE_ROUTES: SiteRoute[] = [
  // Main (public -- included in sitemap.xml)
  { path: '/',          title: 'Home',         description: 'Discover destinations',           category: 'main',   icon: 'Home',      keywords: ['home', 'discover', 'destinations'], seo: true, requiresAuth: false },
  { path: '/explore',   title: 'Explore',      description: 'Explore destinations',            category: 'main',   icon: 'Compass',   keywords: ['explore', 'discover', 'travel'], seo: true, requiresAuth: false },
  { path: '/places',    title: 'Places',        description: 'Browse travel places',            category: 'main',   icon: 'MapPin',    keywords: ['places', 'browse', 'locations'], seo: true, requiresAuth: false },
  { path: '/about',     title: 'About',         description: 'About Travyl',                   category: 'main',   icon: 'Info',      keywords: ['about', 'team'], seo: true, requiresAuth: false },
  { path: '/blog',      title: 'Blog',          description: 'Travel blog & articles',          category: 'main',   icon: 'Newspaper', keywords: ['blog', 'articles', 'travel tips'], seo: true, requiresAuth: false },
  { path: '/get',       title: 'Get the App',   description: 'Download the Travyl app',         category: 'main',   icon: 'Download',  keywords: ['download', 'app', 'mobile'], seo: true, requiresAuth: false },
  { path: '/login',     title: 'Log In',        description: 'Sign in to your account',         category: 'auth',   icon: 'LogIn',     keywords: ['login', 'sign in', 'log in'], seo: true, requiresAuth: false },
  { path: '/signup',    title: 'Sign Up',       description: 'Create an account',               category: 'auth',   icon: 'UserPlus',  keywords: ['signup', 'sign up', 'register'], seo: true, requiresAuth: false },

  // Legal (public -- included in sitemap.xml)
  { path: '/privacy',   title: 'Privacy Policy',   description: 'Privacy policy',              category: 'legal',  icon: 'Shield',    keywords: ['privacy', 'policy'], seo: true, requiresAuth: false },
  { path: '/terms',     title: 'Terms of Service', description: 'Terms of service',            category: 'legal',  icon: 'FileText',  keywords: ['terms', 'service'], seo: true, requiresAuth: false },

  // Dashboard (auth required -- excluded from sitemap.xml)
  { path: '/trips',            title: 'My Trips',  description: 'View all your trips',          category: 'dashboard', icon: 'Suitcase', keywords: ['trips', 'my trips', 'plans'], seo: false, requiresAuth: true },
  { path: '/profile',          title: 'Profile',   description: 'Your profile',                 category: 'dashboard', icon: 'User',     keywords: ['profile', 'account'], seo: false, requiresAuth: true },
  { path: '/profile/settings', title: 'Settings',  description: 'App settings & preferences',   category: 'dashboard', icon: 'Settings', keywords: ['settings', 'preferences', 'theme'], seo: false, requiresAuth: true },
]
