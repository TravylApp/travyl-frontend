# Global Command Registry + Sitemap Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified command registry system with per-page context, chord shortcuts, expanded Spotlight quick actions, and an SEO sitemap powered by a single route registry.

**Architecture:** A `SITE_ROUTES` constant in a server-safe `.ts` file serves as the single source of truth for both the command palette and SEO sitemap.xml. A Zustand `commandRegistry` store holds global + page-scoped commands and a chord buffer (timeout management lives in the hook, not the store, to avoid SSR crashes). Pages register their commands via `usePageCommands()`. The Spotlight reads from the registry to show context-aware commands alongside navigation and search results. Icon resolution is split into a separate client-only file to prevent server bundle bloat.

**Tech Stack:** Next.js 16, Zustand, lucide-react, vitest

**Spec:** `docs/superpowers/specs/2026-05-06-global-command-registry-sitemap-design.md`

---

## Chunk 1: Route Registry Data + Icon Resolver

Two files: a server-safe data module and a client-only icon resolver. The data module only exports plain TypeScript types and a const array — no React imports, safe for sitemap generation.

**Files:**
- Create: `apps/web/lib/sitemap.ts` (data only — types + SITE_ROUTES constant)
- Create: `apps/web/lib/resolve-icon.ts` (client-only — icon map + resolver)
- Create: `apps/web/lib/__tests__/sitemap.test.ts`

### Task 1.1: Create the route registry

- [ ] **Step 1: Write `apps/web/lib/sitemap.ts`**

```typescript
// apps/web/lib/sitemap.ts
// Plain data module — no 'use client', no React imports.
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
  // Main (public — included in sitemap.xml)
  { path: '/',          title: 'Home',         description: 'Discover destinations',           category: 'main',   icon: 'Home',      keywords: ['home', 'discover', 'destinations'], seo: true, requiresAuth: false },
  { path: '/explore',   title: 'Explore',      description: 'Explore destinations',            category: 'main',   icon: 'Compass',   keywords: ['explore', 'discover', 'travel'], seo: true, requiresAuth: false },
  { path: '/places',    title: 'Places',        description: 'Browse travel places',            category: 'main',   icon: 'MapPin',    keywords: ['places', 'browse', 'locations'], seo: true, requiresAuth: false },
  { path: '/about',     title: 'About',         description: 'About Travyl',                   category: 'main',   icon: 'Info',      keywords: ['about', 'team'], seo: true, requiresAuth: false },
  { path: '/blog',      title: 'Blog',          description: 'Travel blog & articles',          category: 'main',   icon: 'Newspaper', keywords: ['blog', 'articles', 'travel tips'], seo: true, requiresAuth: false },
  { path: '/get',       title: 'Get the App',   description: 'Download the Travyl app',         category: 'main',   icon: 'Download',  keywords: ['download', 'app', 'mobile'], seo: true, requiresAuth: false },
  { path: '/login',     title: 'Log In',        description: 'Sign in to your account',         category: 'auth',   icon: 'LogIn',     keywords: ['login', 'sign in', 'log in'], seo: true, requiresAuth: false },
  { path: '/signup',    title: 'Sign Up',       description: 'Create an account',               category: 'auth',   icon: 'UserPlus',  keywords: ['signup', 'sign up', 'register'], seo: true, requiresAuth: false },

  // Legal (public — included in sitemap.xml)
  { path: '/privacy',   title: 'Privacy Policy',   description: 'Privacy policy',              category: 'legal',  icon: 'Shield',    keywords: ['privacy', 'policy'], seo: true, requiresAuth: false },
  { path: '/terms',     title: 'Terms of Service', description: 'Terms of service',            category: 'legal',  icon: 'FileText',  keywords: ['terms', 'service'], seo: true, requiresAuth: false },

  // Dashboard (auth required — excluded from sitemap.xml)
  { path: '/trips',            title: 'My Trips',  description: 'View all your trips',          category: 'dashboard', icon: 'Suitcase', keywords: ['trips', 'my trips', 'plans'], seo: false, requiresAuth: true },
  { path: '/profile',          title: 'Profile',   description: 'Your profile',                 category: 'dashboard', icon: 'User',     keywords: ['profile', 'account'], seo: false, requiresAuth: true },
  { path: '/profile/settings', title: 'Settings',  description: 'App settings & preferences',   category: 'dashboard', icon: 'Settings', keywords: ['settings', 'preferences', 'theme'], seo: false, requiresAuth: true },
]
```

- [ ] **Step 2: Create `apps/web/lib/resolve-icon.ts`**

```typescript
'use client'

import {
  Home, Compass, MapPin, Info, Newspaper, Download,
  LogIn, UserPlus, Shield, FileText, Suitcase, User, Settings,
  type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  Home, Compass, MapPin, Info, Newspaper, Download,
  LogIn, UserPlus, Shield, FileText, Suitcase, User, Settings,
}

export function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? MapPin
}
```

- [ ] **Step 3: Write tests at `apps/web/lib/__tests__/sitemap.test.ts`**

```typescript
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
```

Note: Tests for `resolveIcon` live with the icon file in Chunk 2.

- [ ] **Step 4: Run tests**

Run: `cd apps/web && npx vitest run lib/__tests__/sitemap.test.ts`
Expected: All 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/sitemap.ts apps/web/lib/__tests__/sitemap.test.ts
git commit -m "feat: add route registry data module"
```

---

## Chunk 2: Icon Resolver Tests + Unified Command Types + Registry Store

- [ ] **Step 1: Write icon resolver tests at `apps/web/lib/__tests__/resolve-icon.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { resolveIcon } from '../resolve-icon'
import { MapPin } from 'lucide-react'

describe('resolveIcon', () => {
  it('returns an icon component for known names', () => {
    const icon = resolveIcon('Home')
    expect(icon).toBeDefined()
  })

  it('returns MapPin for unknown names', () => {
    const icon = resolveIcon('NonExistent')
    expect(icon).toBe(MapPin)
  })
})
```

Run: `cd apps/web && npx vitest run lib/__tests__/resolve-icon.test.ts`

- [ ] **Step 2: Create `apps/web/lib/commands/types.ts`**

```typescript
export interface GlobalCommand {
  id: string
  label: string
  description: string
  group: 'navigation' | 'action' | 'page-action' | 'settings'
  icon?: string
  shortcut?: { key: string; meta?: boolean; shift?: boolean; display: string }
  chord?: string
  isEnabled: boolean
  execute: () => void
}
```

- [ ] **Step 3: Create `apps/web/stores/commandRegistry.ts`**

The store holds command state and chord data BUT does NOT manage timeouts (that lives in the hook to avoid SSR crashes and vitest node environment issues).

```typescript
import { create } from 'zustand'
import type { GlobalCommand } from '@/lib/commands/types'

interface CommandRegistryState {
  globalCommands: GlobalCommand[]
  pageCommands: GlobalCommand[]
  chordBuffer: string
  chordActive: boolean

  setGlobalCommands: (commands: GlobalCommand[]) => void
  registerPageCommands: (commands: GlobalCommand[]) => () => void
  pushChord: (key: string) => GlobalCommand | null
  setChordBuffer: (buffer: string, active: boolean) => void
  clearChord: () => void
}

export const useCommandRegistry = create<CommandRegistryState>((set, get) => ({
  globalCommands: [],
  pageCommands: [],
  chordBuffer: '',
  chordActive: false,

  setGlobalCommands: (commands) => set({ globalCommands: commands }),

  registerPageCommands: (commands) => {
    set({ pageCommands: commands })
    return () => { set({ pageCommands: [] }) }
  },

  pushChord: (key) => {
    const state = get()
    const newBuffer = state.chordBuffer + key

    const allCommands = [...state.globalCommands, ...state.pageCommands]
    const match = allCommands.find(
      (cmd) => cmd.chord === newBuffer && cmd.isEnabled,
    )

    if (match) {
      set({ chordBuffer: '', chordActive: false })
      return match
    }

    const hasPartial = allCommands.some(
      (cmd) => cmd.chord?.startsWith(newBuffer) && cmd.isEnabled,
    )

    if (!hasPartial) {
      set({ chordBuffer: '', chordActive: false })
      return null
    }

    set({ chordBuffer: newBuffer, chordActive: true })
    return null
  },

  setChordBuffer: (buffer, active) => set({ chordBuffer: buffer, chordActive: active }),

  clearChord: () => {
    set({ chordBuffer: '', chordActive: false })
  },
}))
```

- [ ] **Step 4: Write store tests at `apps/web/lib/__tests__/commandRegistry.test.ts`**

(Using `lib/__tests__/` path since that's in the vitest config's include patterns.)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCommandRegistry } from '../../stores/commandRegistry'
import type { GlobalCommand } from '../commands/types'

function makeCmd(overrides: Partial<GlobalCommand> = {}): GlobalCommand {
  return {
    id: 'test', label: 'Test', description: 'Test command',
    group: 'navigation', isEnabled: true, execute: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  useCommandRegistry.setState({
    globalCommands: [], pageCommands: [],
    chordBuffer: '', chordActive: false,
  })
})

describe('registerPageCommands', () => {
  it('registers and cleans up page commands', () => {
    const cmd = makeCmd({ id: 'page-cmd' })
    const cleanup = useCommandRegistry.getState().registerPageCommands([cmd])
    expect(useCommandRegistry.getState().pageCommands).toHaveLength(1)
    cleanup()
    expect(useCommandRegistry.getState().pageCommands).toHaveLength(0)
  })

  it('replaces previous page commands on re-registration', () => {
    const cmd1 = makeCmd({ id: 'cmd1' })
    const cmd2 = makeCmd({ id: 'cmd2' })
    useCommandRegistry.getState().registerPageCommands([cmd1])
    useCommandRegistry.getState().registerPageCommands([cmd2])
    expect(useCommandRegistry.getState().pageCommands.map((c) => c.id)).toEqual(['cmd2'])
  })
})

describe('pushChord', () => {
  it('returns null for no match', () => {
    expect(useCommandRegistry.getState().pushChord('z')).toBeNull()
  })

  it('matches and returns a command, clearing buffer', () => {
    const cmd = makeCmd({ id: 'go-trips', chord: 'gt', execute: vi.fn() })
    useCommandRegistry.getState().setGlobalCommands([cmd])
    expect(useCommandRegistry.getState().pushChord('g')).toBeNull()
    expect(useCommandRegistry.getState().chordActive).toBe(true)
    expect(useCommandRegistry.getState().chordBuffer).toBe('g')
    const match = useCommandRegistry.getState().pushChord('t')
    expect(match?.id).toBe('go-trips')
    expect(useCommandRegistry.getState().chordActive).toBe(false)
    expect(useCommandRegistry.getState().chordBuffer).toBe('')
  })

  it('clears buffer on no partial match', () => {
    useCommandRegistry.getState().pushChord('x')
    expect(useCommandRegistry.getState().chordActive).toBe(false)
    expect(useCommandRegistry.getState().chordBuffer).toBe('')
  })
})

describe('clearChord', () => {
  it('clears chord state', () => {
    useCommandRegistry.getState().pushChord('g')
    useCommandRegistry.getState().clearChord()
    expect(useCommandRegistry.getState().chordActive).toBe(false)
    expect(useCommandRegistry.getState().chordBuffer).toBe('')
  })
})
```

- [ ] **Step 5: Run all tests so far**

Run: `cd apps/web && npx vitest run lib/__tests__/`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/resolve-icon.ts apps/web/lib/commands/types.ts apps/web/stores/commandRegistry.ts apps/web/lib/__tests__/resolve-icon.test.ts apps/web/lib/__tests__/commandRegistry.test.ts
git commit -m "feat: add icon resolver, GlobalCommand type, and command registry store"
```

---

## Chunk 3: Chord Shortcuts Hook + HUD

The global keyboard listener for multi-key (chord) shortcuts. Crucially, the chord hook only activates on the `g` prefix key (not every printable character), preventing conflicts with the calendar's single-key shortcuts. Timeout management lives in the hook, not the store.

**Files:**
- Create: `apps/web/hooks/useChordShortcuts.ts`
- Create: `apps/web/components/ChordHUD.tsx`
- Modify: `apps/web/components/providers.tsx`

### Task 3.1: Create the chord shortcut hook

**File:** `apps/web/hooks/useChordShortcuts.ts`

```typescript
'use client'

import { useEffect, useRef } from 'react'
import { useCommandRegistry } from '@/stores/commandRegistry'

const CHORD_TIMEOUT_MS = 500
const CHORD_PREFIX_KEYS = new Set(['g'])  // Only 'g' prefix activates chord mode

export function useChordShortcuts() {
  const pushChord = useCommandRegistry((s) => s.pushChord)
  const clearChord = useCommandRegistry((s) => s.clearChord)
  const setChordBuffer = useCommandRegistry((s) => s.setChordBuffer)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // SSR guard — only runs in browser
      if (typeof window === 'undefined') return

      // Skip if focus is in an input/textarea/contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Skip if Spotlight is open (check data attribute set by SpotlightSearch)
      if (document.querySelector('[data-spotlight-open="true"]')) {
        if (getChordActive()) clearChordWithTimeout()
        return
      }

      // Escape clears chord buffer
      if (e.key === 'Escape') {
        clearChordWithTimeout()
        return
      }

      // Only 'g' prefix starts a chord sequence (avoids conflicts with calendar shortcuts like T, D, W)
      if (e.key === 'g') {
        pushChord('g')
        startTimeout()
        return
      }

      // If chord mode is active, accept second key
      if (getChordActive() && (e.key.length === 1 || e.key === '+')) {
        const match = pushChord(e.key.toLowerCase())
        if (match) {
          // Chord matched — execute and clear
          clearChordWithTimeout()
          match.execute()
        } else {
          // Either matched fully (already handled above) or no match — clear
          clearChordWithTimeout()
        }
      }
    }

    function getChordActive(): boolean {
      return useCommandRegistry.getState().chordActive
    }

    function startTimeout() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        clearChordWithTimeout()
      }, CHORD_TIMEOUT_MS)
    }

    function clearChordWithTimeout() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = null
      clearChord()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [pushChord, clearChord, setChordBuffer])
}
```

### Task 3.2: Create the Chord HUD component

**File:** `apps/web/components/ChordHUD.tsx`

```typescript
'use client'

import { useCommandRegistry } from '@/stores/commandRegistry'
import { AnimatePresence, motion } from 'motion/react'

export function ChordHUD() {
  const chordBuffer = useCommandRegistry((s) => s.chordBuffer)
  const chordActive = useCommandRegistry((s) => s.chordActive)

  return (
    <AnimatePresence>
      {chordActive && chordBuffer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.15 }}
          className="fixed bottom-4 left-4 z-50 pointer-events-none"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/90 dark:bg-gray-100/90 backdrop-blur-sm rounded-lg shadow-lg">
            <span className="text-xs font-mono text-white dark:text-gray-900 font-semibold">
              {chordBuffer}...
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

### Task 3.3: Add data-spotlight-open attribute to SpotlightSearch

In `apps/web/components/spotlight/SpotlightSearch.tsx`, add `data-spotlight-open` attribute to the overlay when the spotlight is open, so the chord hook can detect it:

```typescript
// In the backdrop div:
<motion.div
  data-spotlight-open={isOpen ? 'true' : undefined}
  ...
/>
```

### Task 3.4: Wire into Providers

In `apps/web/components/providers.tsx`:

```typescript
import { useChordShortcuts } from '@/hooks/useChordShortcuts'
import { ChordHUD } from '@/components/ChordHUD'

function ChordShortcutProvider({ children }: { children: React.ReactNode }) {
  useChordShortcuts()
  return <>{children}</>
}
```

Wrap children with `<ChordShortcutProvider>` and add `<ChordHUD />` at the end of the main Providers component.

- [ ] **Step 1: Add all files and verify**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 2: Commit**

```bash
git add apps/web/hooks/useChordShortcuts.ts apps/web/components/ChordHUD.tsx apps/web/components/providers.tsx apps/web/components/spotlight/SpotlightSearch.tsx
git commit -m "feat: add chord shortcuts hook and HUD indicator"
```

---

## Chunk 4: SEO Sitemap

Update the existing sitemap to use the route registry. Only imports the data module (not the icon resolver), so no server bundle bloat.

**Files:**
- Modify: `apps/web/app/sitemap.ts`

- [ ] **Step 1: Read the existing sitemap.ts**

- [ ] **Step 2: Rewrite using SITE_ROUTES**

```typescript
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
```

- [ ] **Step 3: Verify the sitemap**

Run: `npm run web`
Visit `http://localhost:3000/sitemap.xml`
Expected: Shows all public routes (Home, Explore, Places, About, Blog, Get, Login, Signup, Privacy, Terms)

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/sitemap.ts
git commit -m "feat: use route registry for sitemap generation"
```

---

## Chunk 5: Replace NAV_ITEMS with SITE_ROUTES in Spotlight

**Files:**
- Modify: `apps/web/hooks/useSpotlightSearch.ts`
- Modify: `apps/web/components/providers.tsx`

### Task 5.1: Replace NAV_ITEMS with SITE_ROUTES

- [ ] **Step 1: Read the current `apps/web/hooks/useSpotlightSearch.ts`**

Pay attention to: NAV_ITEMS constant (lines ~28-36), the `commands` variable from `useCalendarCommandsStore` (line ~185), the `commandResults` useMemo (lines ~243-269), and the `navResults` useMemo (lines ~225-240).

- [ ] **Step 2: Apply these changes:**

1. **Remove** the `NAV_ITEMS` constant entirely.
2. **Remove** the `commands` variable: `const commands = useCalendarCommandsStore((s) => s.commands)` (it becomes unused).
3. **Rewrite** the `navResults` useMemo to read from `SITE_ROUTES`:

```typescript
// Memoize the keyword lookup
const routeKeywords = useMemo(() => {
  const kw: Record<string, string[]> = {}
  for (const route of SITE_ROUTES) {
    kw[`nav-${route.path}`] = [route.title, route.description, ...route.keywords].map((s) => s.toLowerCase())
  }
  return kw
}, [])

// Nav results — fuzzy match against SITE_ROUTES
const navResults = useMemo((): Record<string, SpotlightResult[]> => {
  if (debouncedQuery.length < 1) return {}
  if (scope && scope !== 'commands') return {}
  const q = debouncedQuery.toLowerCase()

  const navItems: SpotlightResult[] = SITE_ROUTES.map((route) => ({
    id: `nav-${route.path}`,
    type: 'navigation' as const,
    title: route.title,
    subtitle: route.description,
    href: route.path,
    score: 1,
  }))

  const matched = navItems
    .map((item) => {
      const titleScore = fuzzyMatch(item.title, q)
      const subtitleScore = fuzzyMatch(item.subtitle, q)
      const kwScore = fuzzyMatchKeywords(routeKeywords[item.id] ?? [], q)
      const bestScore = Math.max(titleScore ?? -1, subtitleScore ?? -1, kwScore ?? -1)
      return bestScore >= 0 ? { item, score: bestScore } : null
    })
    .filter((m): m is { item: SpotlightResult; score: number } => m !== null)
    .sort((a, b) => b.score - a.score)
    .map((m) => m.item)

  return matched.length ? { navigation: matched } : {}
}, [debouncedQuery, scope, routeKeywords])
```

4. **Add** the `fuzzyMatchKeywords` helper:

```typescript
function fuzzyMatchKeywords(keywords: string[], query: string): number | null {
  let best: number | null = null
  for (const kw of keywords) {
    const score = fuzzyMatch(kw, query)
    if (score !== null && (best === null || score > best)) best = score
  }
  return best
}
```

Also add import for `SITE_ROUTES` from `@/lib/sitemap`.

- [ ] **Step 3: Verify the search works**

Run: `npm run web`
Open Cmd+K, type "privacy" — Privacy Policy appears in navigation
Type "settings" — Settings appears
Type "my trips" — My Trips appears

- [ ] **Step 4: Run TypeScript check**

Run: `npm run typecheck`
Expected: No type errors (no unused imports/vars)

- [ ] **Step 5: Commit**

```bash
git add apps/web/hooks/useSpotlightSearch.ts
git commit -m "feat: replace hardcoded NAV_ITEMS with SITE_ROUTES"
```

### Task 5.2: Register global commands in Providers

- [ ] **Step 1: Read `apps/web/components/providers.tsx`**

- [ ] **Step 2: Add GlobalCommandRegistrar component**

```typescript
import { useRouter } from 'next/navigation'
import { useCommandRegistry } from '@/stores/commandRegistry'
import { SITE_ROUTES } from '@/lib/sitemap'
import type { GlobalCommand } from '@/lib/commands/types'

function GlobalCommandRegistrar() {
  const router = useRouter()
  const setGlobalCommands = useCommandRegistry((s) => s.setGlobalCommands)

  useEffect(() => {
    const commands: GlobalCommand[] = SITE_ROUTES.map((route) => ({
      id: `nav-${route.path}`,
      label: route.title,
      description: route.description,
      group: 'navigation' as const,
      icon: route.icon,
      isEnabled: true,
      execute: () => {
        const pathname = window.location.pathname
        if (pathname !== route.path) {
          router.push(route.path)
        }
      },
    }))

    commands.push({
      id: 'new-trip',
      label: 'New Trip',
      description: 'Create a new trip',
      group: 'action',
      chord: 'g+',
      isEnabled: true,
      execute: () => { router.push('/trips?new=true') },
    })

    setGlobalCommands(commands)
  }, [setGlobalCommands, router])

  return null
}
```

Add `<GlobalCommandRegistrar />` inside the Provider tree.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/providers.tsx
git commit -m "feat: register global navigation commands from SITE_ROUTES"
```

---

## Chunk 6: Expand Spotlight Empty State

**Files:**
- Modify: `apps/web/components/spotlight/SpotlightEmptyState.tsx`

### Task 6.1: Expand QUICK_ACTIONS and add Page Commands section

- [ ] **Step 1: Read the current `SpotlightEmptyState.tsx`**

- [ ] **Step 2: Expand QUICK_ACTIONS to 7 items**

```typescript
const QUICK_ACTIONS = [
  { label: 'New Trip', icon: Plus, href: '/trips?new=true' },
  { label: 'My Trips', icon: Suitcase, href: '/trips' },
  { label: 'Explore', icon: Compass, href: '/explore' },
  { label: 'Places', icon: MapPin, href: '/places' },
  { label: 'Profile', icon: User, href: '/profile' },
  { label: 'Settings', icon: Settings, href: '/profile/settings' },
  { label: 'About', icon: Info, href: '/about' },
]
```

Replace the current QUICK_ACTIONS constant (currently has 2 items: New Trip and Go to Calendar).

Import missing icons: `Suitcase`, `User`, `Info` from `lucide-react`.

- [ ] **Step 3: Add Page Commands section**

Add import:
```typescript
import { useCommandRegistry } from '@/stores/commandRegistry'
import { Terminal } from 'lucide-react'
```

Inside the component, add after Quick Actions and before Recent Searches:

```typescript
const pageCommands = useCommandRegistry((s) => s.pageCommands)

// After Quick Actions section, before Recent Searches:
{pageCommands.length > 0 && (
  <div className="mb-4">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2 block">
      Page Commands
    </span>
    <div className="space-y-0.5">
      {pageCommands.slice(0, 6).map((cmd) => (
        <button
          key={cmd.id}
          onClick={() => { cmd.execute(); onClose() }}
          className="flex items-center gap-2.5 w-full px-2.5 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
        >
          <div className="w-7 h-7 rounded-md bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
            <Terminal className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-medium truncate">{cmd.label}</div>
            {cmd.shortcut && (
              <span className="text-xs text-gray-400">{cmd.shortcut.display}</span>
            )}
          </div>
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 4: Run TypeScript check**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/spotlight/SpotlightEmptyState.tsx
git commit -m "feat: expand quick actions and add page commands section to spotlight"
```

---

## Chunk 7: Calendar Bridge

Publish calendar commands through the new command registry. Fixes the `description` field (uses the command label, not the cryptic group identifier).

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`
- Modify: `apps/web/hooks/useSpotlightSearch.ts` (switch to command registry)

### Task 7.1: Publish calendar commands to the command registry

- [ ] **Step 1: Read CalendarDashboard.tsx lines ~576-610**

- [ ] **Step 2: Add command registry publishing**

Add import:
```typescript
import { useCommandRegistry } from '@/stores/commandRegistry'
import type { GlobalCommand } from '@/lib/commands/types'
```

Inside CalendarDashboard, alongside existing `setCommands`/`clearCommands`:

```typescript
const registerPageCommands = useCommandRegistry((s) => s.registerPageCommands)

const globalCommands: GlobalCommand[] = useMemo(() => {
  return commands
    .filter((cmd) => cmd.isEnabled)
    .map((cmd) => ({
      id: `cal-${cmd.id}`,
      label: cmd.label,
      description: cmd.label,  // Use label, not the internal group name
      group: 'page-action' as const,
      shortcut: cmd.shortcut,
      isEnabled: true,
      execute: cmd.execute,
    }))
}, [commands])

useEffect(() => {
  return registerPageCommands(globalCommands)
}, [globalCommands, registerPageCommands])
```

### Task 7.2: Switch useSpotlightSearch to command registry

- [ ] **Step 1: Read `apps/web/hooks/useSpotlightSearch.ts` commandResults section**

- [ ] **Step 2: Switch from calendarCommandsStore to commandRegistry**

Add import:
```typescript
import { useCommandRegistry } from '@/stores/commandRegistry'
```

Add inside the hook:
```typescript
const registryCommands = useCommandRegistry((s) => s.pageCommands)
```

Replace the existing `commandResults` useMemo (the one that reads from `useCalendarCommandsStore`) with one that reads from `registryCommands`:

```typescript
const commandResults = useMemo((): Record<string, SpotlightResult[]> => {
  if (!registryCommands?.length || debouncedQuery.length < 1) return {}
  if (scope && scope !== 'commands') return {}
  const q = debouncedQuery.toLowerCase()

  const matched: (SpotlightResult & { _fuzzyScore: number })[] = registryCommands
    .filter((cmd) => cmd.isEnabled)
    .map((cmd) => {
      const score = fuzzyMatch(cmd.label, q)
      if (score === null) return null
      return {
        id: cmd.id,
        type: 'command' as const,
        title: cmd.label,
        subtitle: cmd.description,
        href: '',
        score: 1,
        shortcut: cmd.shortcut,
        execute: cmd.execute,
        _fuzzyScore: score,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b._fuzzyScore - a._fuzzyScore)

  const cleaned = matched.map(({ _fuzzyScore, ...rest }) => rest)
  return cleaned.length ? { command: cleaned } : {}
}, [registryCommands, debouncedQuery, scope])
```

Also remove the old `commands` variable and `useCalendarCommandsStore` import if they're no longer used (check if other parts of the file still reference them).

- [ ] **Step 3: Run TypeScript check**

Run: `npm run typecheck`
Expected: No type errors

- [ ] **Step 4: Run all tests**

Run: `cd apps/web && npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx apps/web/hooks/useSpotlightSearch.ts
git commit -m "feat: bridge calendar commands to command registry"
```

---

## Final Verification

Run all tests and type checks:

```bash
cd apps/web && npx vitest run
npm run typecheck
```

Expected: All pass.

Manual verification checklist:
1. Open Cmd+K from any page — empty state shows 7 quick actions instead of 2
2. Type "settings" — navigation result appears
3. Type "privacy" — Privacy Policy appears
4. Navigate to a trip page, open Cmd+K — "Page Commands" section shows trip tab commands
5. Navigate to calendar page, open Cmd+K — calendar commands (Add Activity, Delete, etc.) appear
6. Press `g` — HUD shows `g...` in bottom-left
7. Press `g` then `t` within 500ms — navigates to /trips
8. Press `g` and wait — HUD disappears after 500ms
9. Visit `http://localhost:3000/sitemap.xml` — shows 10 public routes
10. Calendar page: press `t` (should jump to today, NOT trigger chord mode)
