# Global Command Registry + Sitemap System

## Problem

The Spotlight search (Cmd+K) has only 2 quick actions and 6 navigation items, with no
page-context awareness. Calendar commands are isolated from the rest of the app. There is
no route registry or SEO sitemap.

## Design

### 1. Route Registry (`apps/web/lib/sitemap.ts`)

A single `SITE_ROUTES` constant — a plain `.ts` file (no `'use client'`, no React imports)
that can be imported by both server and client code. The Next.js module graph allows
server-only data modules to be imported by client components as long as they don't import
server-only modules.

```typescript
export interface SiteRoute {
  path: string
  title: string
  description: string
  category: 'main' | 'dashboard' | 'trip' | 'legal' | 'auth' | 'social'
  icon: string           // lucide-react icon name, resolved at render time
  keywords: string[]     // for fuzzy search matching
  seo: boolean           // include in sitemap.xml?
  requiresAuth: boolean
}
```

#### All routes:

| path | title | category | seo | auth |
|------|-------|----------|-----|------|
| `/` | Home | main | yes | no |
| `/explore` | Explore | main | yes | no |
| `/places` | Places | main | yes | no |
| `/about` | About | main | yes | no |
| `/blog` | Blog | main | yes | no |
| `/get` | Get the App | main | yes | no |
| `/privacy` | Privacy Policy | legal | yes | no |
| `/terms` | Terms of Service | legal | yes | no |
| `/trips` | My Trips | dashboard | no | yes |
| `/profile` | Profile | dashboard | no | yes |
| `/profile/settings` | Settings | dashboard | no | yes |

Trip tab routes are generated dynamically via `getTripTabCommands(tripId: string)`.
These are excluded from sitemap.xml (cannot enumerate all trips).

#### Icon resolution

A `resolveIcon(name: string)` function maps string names to lucide-react icon components
via a lookup table. The Spotlight already uses lucide-react exclusively, so we standardize
on lucide-react for the command palette.

```typescript
import { Home, Globe, MapPin, ... } from 'lucide-react'
const ICON_MAP: Record<string, React.ElementType> = { Home, Globe, MapPin, ... }
export function resolveIcon(name: string): React.ElementType { ... }
```

#### Sitemap URL base

```typescript
// apps/web/app/sitemap.ts
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://travyl.com'
```

### 2. Unified Command System

#### Types (`apps/web/lib/commands/types.ts`)

The calendar-specific `Command` type at `apps/web/components/calendar/types.ts` is kept
for backward compatibility. The new unified type has a different name to avoid collisions:

```typescript
export interface GlobalCommand {
  id: string
  label: string
  description: string
  group: 'navigation' | 'action' | 'page-action' | 'settings'
  icon?: string
  shortcut?: { key: string; meta?: boolean; shift?: boolean; display: string }
  chord?: string          // 'gt' for "g then t" → Trips
  isEnabled: boolean
  execute: () => void
}
```

The calendar's existing `Command` interface (with `group: 'edit' | 'activity' | 'view' | 'insert'`)
continues to work within the calendar. When published to the registry, calendar commands are
wrapped into `GlobalCommand` format.

#### Command Registry Store (`apps/web/stores/commandRegistry.ts`)

A Zustand store:

```typescript
interface CommandRegistryState {
  globalCommands: GlobalCommand[]    // Always available
  pageCommands: GlobalCommand[]      // Context-specific, last registration wins
  chordBuffer: string                // Multi-key shortcut tracking
  chordActive: boolean               // Whether HUD should show
  chordTimeoutId: number | null

  // Register page-level commands (auto-deregisters on unmount via useEffect)
  registerPageCommands: (commands: GlobalCommand[]) => () => void

  // Chord management
  pushChord: (key: string, event: KeyboardEvent) => GlobalCommand | null
  clearChord: () => void
}
```

**Lifecycle**: `registerPageCommands` returns a cleanup function. Components call it in
`useEffect` — the cleanup runs on unmount, deregistering the commands. If two components
register simultaneously (e.g., trip layout + calendar page), the most recent registration
wins. This naturally handles nesting: the trip layout registers general trip commands,
then the calendar page registers calendar-specific commands, overriding.

#### Global Commands

Generated from `SITE_ROUTES` on app init (via a `useEffect` in Providers) — all navigation
routes plus universal actions (Create Trip, Open Spotlight).

Navigation to the current page is a no-op (check `pathname === route.path` before pushing).

#### Per-Context Commands

| Context | Commands | Registered by |
|---------|----------|--------------|
| Global | Home, Trips, Explore, Places, Profile, Settings, New Trip | Providers |
| Home page | (global only) | — |
| Trip page | Overview, Itinerary, Calendar, Hotels, Flights, Cars, Activities, Packing, Budget, Settings, Share Trip | Trip layout |
| Calendar page | Add Activity, Delete, Zoom In, Zoom Out, Day/Week/Month View, Today, Prev/Next Day | Calendar page |
| Settings | Toggle Theme, Edit Profile | Settings page |

#### Deadline: `usePageCommands` lifecycle hook

```typescript
function usePageCommands(commands: GlobalCommand[]) {
  const register = useCommandRegistryStore((s) => s.registerPageCommands)
  useEffect(() => {
    return register(commands)  // registers on mount, cleans up on unmount
  }, [commands])
}
```

Prevents stale closures by re-registering when the commands array changes (via deps).

### 3. Chord Shortcuts (`apps/web/hooks/useChordShortcuts.ts`)

Multi-key shortcuts using a 500ms buffer:

| Sequence | Action |
|----------|--------|
| `g h` | Go Home |
| `g t` | Go to Trips |
| `g p` | Go to Profile |
| `g s` | Go to Settings |
| `g e` | Go to Explore |
| `g +` | New Trip |

#### Conflict resolution

Chord shortcuts are suppressed when:
- The user is focused in an input, textarea, or contenteditable element
- Any overlay is open (Spotlight, modal, etc.)
- A page has registered a conflicting single-key shortcut (page shortcut wins)

The calendar registers shortcuts for `t` (Today), `d` (Day View), `w` (Week View), etc.
These suppress chord mode because the calendar page's `useKeyboardShortcuts` handles single
keys. The chord hook checks if `event.target` is the body/document and no overlay is active
before activating.

#### HUD indicator

A small fixed-position pill in the bottom-left corner (z-50), shown only when `chordActive`
is true and the buffer is non-empty. Displays: `g...` with a subtle fade animation.
Auto-dismisses on 500ms timeout or when buffer is cleared.

Cleared on:
- Chord matched (executed)
- Timeout (500ms)
- Overlay open (Spotlight, modal)
- Escape key

### 4. Spotlight Integration

#### `apps/web/heuristics/useSpotlightSearch.ts` — NAV_ITEMS replacement

The hardcoded `NAV_ITEMS` array is replaced by reading from `SITE_ROUTES` and converting
to `SpotlightResult` format. The existing fuzzyMatch logic continues to work unchanged.

#### `apps/web/components/spotlight/SpotlightEmptyState.tsx` — Expanded empty state

**Sections** (top to bottom):
1. **Pinned** (unchanged — existing localStorage pinning)
2. **Quick Actions** — 8 items:
   - New Trip → `/trips?new=true`
   - My Trips → `/trips`
   - Explore → `/explore`
   - Places → `/places`
   - Profile → `/profile`
   - Settings → `/profile/settings`
   - Favorites → `/favorites` (requires auth)
   - About → `/about`
3. **Page Commands** — commands from `pageCommands` in the registry, shown when on a trip
4. **Recent Searches** (unchanged)
5. **Browse** (unchanged — "Restaurants" and "Activities" pills)
6. **Keyboard hint** (unchanged)

#### Calendar command bridge

The calendar's `CalendarDashboard.tsx` currently calls `setCommands(calendarCommands)` on
the calendarCommandsStore. This is extended to also call `registerPageCommands()` on the
new command registry, wrapping calendar commands into `GlobalCommand` format.

The `useSpotlightSearch` hook reads calendar commands from the command registry (not the
old calendarCommandsStore) when available. The calendarCommandsStore is kept for backward
compatibility but considered deprecated.

### 5. SEO Sitemap (`apps/web/app/sitemap.ts`)

```typescript
import { SITE_ROUTES } from '@/lib/sitemap'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://travyl.com'

export default function sitemap() {
  return SITE_ROUTES
    .filter(route => route.seo && !route.requiresAuth)
    .map(route => ({
      url: `${BASE_URL}${route.path}`,
      lastModified: new Date(),
      changeFrequency: route.path === '/' ? ('weekly' as const) : ('monthly' as const),
      priority: route.path === '/' ? 1.0 : 0.8,
    }))
}
```

### 6. Edge Cases

| Case | Handling |
|------|----------|
| Chord mode in text inputs | Suppressed when `event.target` is input/textarea/contenteditable |
| Overlay open + chord buffer | Buffer cleared when Spotlight or any modal opens |
| Empty chord timeout | HUD auto-dismissed after 500ms; buffer cleared |
| Navigate to current page | No-op — pathname checked before router.push |
| Multiple nested command registrations | Last registration wins; cleanup on unmount removes block |
| Sitemap base URL | Uses `NEXT_PUBLIC_SITE_URL` env var, falls back to `https://travyl.com` |

### 7. Error States

| State | Behavior |
|-------|----------|
| No commands registered | Empty state shows Quick Actions + Recent only |
| `SITE_ROUTES` fails to load | Cannot happen — it's a static const |
| Chord hook runs server-side | SSR guard: `typeof window === 'undefined'` bail |

### 8. Testing

- Route registry: Test that `SITE_ROUTES` contains expected entries, no duplicate paths
- Command registry store: Test `registerPageCommands` lifecycle (registers + cleans up)
- Chord shortcuts: Test buffer, timeout, execution, suppression in inputs
- Sitemap: Test filtering (excludes auth-required, includes public)
- Icon resolution: Test that all referenced icon names have entries

## Files

### New files:
- `apps/web/lib/sitemap.ts` — Route registry + icon resolver
- `apps/web/lib/commands/types.ts` — GlobalCommand type
- `apps/web/stores/commandRegistry.ts` — Command registry Zustand store
- `apps/web/hooks/useChordShortcuts.ts` — Chord shortcut hook + HUD
- `apps/web/app/sitemap.ts` — Next.js sitemap generation

### Modified files:
- `apps/web/components/spotlight/SpotlightEmptyState.tsx` — 8 quick actions + page commands
- `apps/web/hooks/useSpotlightSearch.ts` — Replace NAV_ITEMS with SITE_ROUTES
- `apps/web/stores/calendarCommandsStore.ts` — Deprecated, kept for backward compat
- `apps/web/components/calendar/CalendarDashboard.tsx` — Also publish to command registry
- `apps/web/components/providers.tsx` — Register global commands on mount
