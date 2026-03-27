# Unified Dashboard Navigation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace four disconnected nav systems with a single unified dashboard shell (persistent sidebar + contextual top bar) across `/trips` and `/trip/[id]/*`.

**Architecture:** Merge `(dashboard)` and `(trips-app)` route groups into one `(dashboard)` group with a single layout rendering DashboardSidebar + DashboardTopBar. Calendar renders its own CalendarToolbar below the top bar. Trip tabs inject into DashboardTopBar via a React context slot.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, iconoir-react, lucide-react, motion v12

**Spec:** `docs/superpowers/specs/2026-03-27-unified-dashboard-nav-design.md`

---

## File Structure

### Created
- `apps/web/components/dashboard/DashboardLayout.tsx` — unified shell (sidebar + top bar + content)
- `apps/web/components/dashboard/DashboardSidebar.tsx` — persistent left sidebar
- `apps/web/components/dashboard/DashboardTopBar.tsx` — contextual top tab bar
- `apps/web/components/dashboard/DashboardTopBarSlot.tsx` — React context for trip tab injection
- `apps/web/components/calendar/CalendarToolbar.tsx` — calendar-specific toolbar replacing TripNavbar
- `apps/web/hooks/useDashboardNav.ts` — nav state logic hook

### Modified
- `apps/web/app/(dashboard)/layout.tsx` — render DashboardLayout instead of DashboardNavbar
- `apps/web/app/(trips-app)/trip/[id]/trip-layout-inner.tsx` → moves to `(dashboard)/trip/[id]/` — remove sidebar rendering, remove calendar fullscreen branch
- `apps/web/app/(trips-app)/trip/[id]/layout.tsx` → moves to `(dashboard)/trip/[id]/` — add DashboardTopBarSlot provider
- `apps/web/components/calendar/CalendarDashboard.tsx` — render CalendarToolbar instead of TripNavbar
- `apps/web/components/Providers.tsx` — hide GlobalNavbar on dashboard routes

### Moved
- `app/(trips-app)/trip/[id]/**` → `app/(dashboard)/trip/[id]/**`
- `app/(trips-app)/trip/preview/page.tsx` → `app/(main)/trip/preview/page.tsx`

### Removed
- `apps/web/components/DashboardNavbar.tsx`
- `apps/web/components/calendar/TripNavbar.tsx`
- `apps/web/components/trip/TripSidebar.tsx`
- `apps/web/app/(trips-app)/` route group (after move)

---

## Chunk 1: Dashboard Shell Components

Build the three new dashboard components and the context slot. These are standalone — they don't affect existing pages yet.

### Task 1: useDashboardNav hook

**Pre-requisite:** `TabDef` interface in `trip-tabs.tsx` is not exported. Before this task, add `export` before `interface TabDef` in `apps/web/components/trip-tabs.tsx`.

**Files:**
- Create: `apps/web/hooks/useDashboardNav.ts`
- Modify: `apps/web/components/trip-tabs.tsx` (add `export` to `interface TabDef`)

- [ ] **Step 1: Create the hook**

```typescript
// apps/web/hooks/useDashboardNav.ts
'use client'

import { usePathname } from 'next/navigation'
import {
  HomeSimple,
  Globe,
  MapPin,
} from 'iconoir-react'
import type { TabDef } from '@/components/trip-tabs'
// NOTE: TabDef is not currently exported from trip-tabs.tsx.
// Step 0: Add `export` before `interface TabDef` in trip-tabs.tsx

export interface DashboardNavItem {
  icon: React.ElementType
  label: string
  href: string
  segment: string
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { icon: HomeSimple, label: 'My Trips', href: '/trips', segment: 'trips' },
  { icon: Globe, label: 'Explore', href: '/explore', segment: 'explore' },
  { icon: MapPin, label: 'Places', href: '/places', segment: 'places' },
]

export function useDashboardNav() {
  const pathname = usePathname()

  const tripIdMatch = pathname.match(/^\/trip\/([^/]+)/)
  const tripId = tripIdMatch ? tripIdMatch[1] : null
  const isInsideTrip = tripId !== null && tripId !== 'preview'

  const activeSection = pathname.startsWith('/explore')
    ? 'explore' as const
    : pathname.startsWith('/places')
      ? 'places' as const
      : 'trips' as const

  const activeTab = isInsideTrip
    ? (() => {
        const basePath = `/trip/${tripId}`
        const segment = pathname.replace(basePath, '').replace(/^\//, '') || ''
        return segment || null
      })()
    : null

  return {
    sidebarItems: DASHBOARD_NAV_ITEMS,
    activeSection,
    isInsideTrip,
    tripId,
    activeTab,
    pathname,
  }
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in the new file (may have errors in other files — that's fine)

- [ ] **Step 3: Commit**

```bash
git add apps/web/hooks/useDashboardNav.ts
git commit -m "feat: add useDashboardNav hook for unified dashboard navigation"
```

### Task 2: DashboardTopBarSlot context

**Files:**
- Create: `apps/web/components/dashboard/DashboardTopBarSlot.tsx`

- [ ] **Step 1: Create the context**

```typescript
// apps/web/components/dashboard/DashboardTopBarSlot.tsx
'use client'

import { createContext, useContext } from 'react'

/**
 * Context slot for trip layout to inject tab bar into DashboardTopBar.
 * DashboardTopBar reads this — if set, it renders the trip tabs instead
 * of a breadcrumb. The trip layout sets this inside TripThemeProvider
 * so the tabs have access to trip theme colors.
 */
export const DashboardTopBarSlot = createContext<React.ReactNode>(null)

export function useDashboardTopBarSlot() {
  return useContext(DashboardTopBarSlot)
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/dashboard/DashboardTopBarSlot.tsx
git commit -m "feat: add DashboardTopBarSlot context for trip tab injection"
```

### Task 3: DashboardSidebar

**Files:**
- Create: `apps/web/components/dashboard/DashboardSidebar.tsx`

- [ ] **Step 1: Create the sidebar component**

This is a standalone component. Key behaviors:
- Collapses to 48px icons by default, expands to 200px on hover
- Shows trip badge when inside a trip (reads tripId from URL, fetches trip name)
- Bottom section: user avatar with dropdown
- Active item highlighting

```typescript
// apps/web/components/dashboard/DashboardSidebar.tsx
'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { NavArrowLeft } from 'iconoir-react'
import { useAuthStore, useItineraryScreen } from '@travyl/shared'
import { DASHBOARD_NAV_ITEMS } from '@/hooks/useDashboardNav'
import type { DashboardNavItem } from '@/hooks/useDashboardNav'

const COLLAPSED_WIDTH = 48
const EXPANDED_WIDTH = 200
const COLLAPSE_DELAY = 200

export function DashboardSidebar() {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Trip detection
  const tripIdMatch = pathname.match(/^\/trip\/([^/]+)/)
  const tripId = tripIdMatch?.[1] ?? null
  const isInsideTrip = !!tripId && tripId !== 'preview'
  // Only fetch trip data when inside a trip — useItineraryScreen will skip the query
  // when tripId is empty (React Query enabled: false)
  const { trip } = isInsideTrip ? useItineraryScreen(tripId!) : { trip: null as any }

  const { user } = useAuthStore()

  function isActive(item: DashboardNavItem) {
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  function handleMouseEnter() {
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current)
      collapseTimer.current = null
    }
    setExpanded(true)
  }

  function handleMouseLeave() {
    collapseTimer.current = setTimeout(() => setExpanded(false), COLLAPSE_DELAY)
  }

  const initials = user?.email?.[0]?.toUpperCase() ?? 'U'

  return (
    <motion.nav
      animate={{ width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative flex flex-col shrink-0 overflow-hidden border-r border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-[#111827] h-screen"
      aria-label="Dashboard navigation"
    >
      {/* Trip badge — shown when inside a trip */}
      <AnimatePresence>
        {isInsideTrip && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-2 pt-3 pb-1 border-b border-gray-200 dark:border-white/[0.06]">
              <Link
                href="/trips"
                className="flex items-center gap-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <NavArrowLeft width={16} height={16} strokeWidth={1.5} />
                {expanded && (
                  <span className="text-[11px] font-medium">Back to Trips</span>
                )}
              </Link>
              {expanded && trip?.destination && (
                <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-200 mt-1 truncate px-0.5">
                  {trip.destination}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main nav items */}
      <ul className="flex flex-col gap-0.5 p-2 mt-2">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <li key={item.segment}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors group relative',
                  active
                    ? 'bg-[#1e3a5f]/10 text-[#1e3a5f] dark:bg-white/10 dark:text-white font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-gray-200',
                ].join(' ')}
              >
                <Icon width={18} height={18} strokeWidth={1.5} className="shrink-0" />
                {expanded ? (
                  <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.label}
                  </span>
                ) : (
                  <span className="absolute left-full ml-2 px-2.5 py-1 bg-gray-900 text-white text-[11px] font-medium rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg z-30">
                    {item.label}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section: user avatar */}
      <div className="p-2 border-t border-gray-200 dark:border-white/[0.06]">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1e3a5f] text-white text-[11px] font-medium mx-auto">
          {initials}
        </div>
      </div>
    </motion.nav>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep -i "DashboardSidebar" | head -5`
Expected: No errors referencing DashboardSidebar

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/dashboard/DashboardSidebar.tsx
git commit -m "feat: add DashboardSidebar component with trip badge"
```

### Task 4: DashboardTopBar

**Files:**
- Create: `apps/web/components/dashboard/DashboardTopBar.tsx`

- [ ] **Step 1: Create the top bar component**

Key behaviors:
- On `/trips`: renders breadcrumb "Dashboard › My Trips"
- On `/trip/[id]/*`: reads DashboardTopBarSlot context for trip tabs
- Mobile: hamburger menu icon (left side) for sidebar toggle

```typescript
// apps/web/components/dashboard/DashboardTopBar.tsx
'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'iconoir-react'
import { useDashboardNav } from '@/hooks/useDashboardNav'
import { useDashboardTopBarSlot } from '@/components/dashboard/DashboardTopBarSlot'

interface DashboardTopBarProps {
  onMobileMenuToggle?: () => void
}

export function DashboardTopBar({ onMobileMenuToggle }: DashboardTopBarProps) {
  const pathname = usePathname()
  const { activeSection, isInsideTrip } = useDashboardNav()
  const tripTabs = useDashboardTopBarSlot()

  return (
    <header className="shrink-0 h-12 border-b border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[var(--background)] flex items-center px-4 sticky top-0 z-20">
      {/* Mobile hamburger */}
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden mr-3 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
        aria-label="Toggle menu"
      >
        <Menu width={20} height={20} strokeWidth={1.5} className="text-gray-600 dark:text-gray-400" />
      </button>

      {/* Content — breadcrumb or trip tabs */}
      {!isInsideTrip ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Dashboard</span>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {activeSection === 'trips' ? 'My Trips' : activeSection === 'explore' ? 'Explore' : 'Places'}
          </span>
        </div>
      ) : (
        tripTabs ?? <div /> // Placeholder while trip tabs load via context
      )}
    </header>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/dashboard/DashboardTopBar.tsx
git commit -m "feat: add DashboardTopBar component with breadcrumb and context slot"
```

### Task 5: DashboardLayout

**Files:**
- Create: `apps/web/components/dashboard/DashboardLayout.tsx`

- [ ] **Step 1: Create the layout component**

```typescript
// apps/web/components/dashboard/DashboardLayout.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Close mobile menu on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    if (mobileMenuOpen) document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileMenuOpen])

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-[var(--background)]">
      {/* Single sidebar instance — hidden on mobile via CSS, shown in overlay when toggled */}
      <div
        ref={sidebarRef}
        className={[
          'shrink-0 transition-transform duration-300 md:translate-x-0 z-40',
          mobileMenuOpen ? 'fixed inset-y-0 left-0 translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <DashboardSidebar />
      </div>

      {/* Backdrop for mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopBar onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/dashboard/DashboardLayout.tsx
git commit -m "feat: add DashboardLayout component with mobile sidebar overlay"
```

---

## Chunk 2: Route Restructuring

Move files from `(trips-app)` to `(dashboard)`, wire the new layout.

### Task 6: Move trip files into (dashboard)

**Files:**
- Move: `app/(trips-app)/trip/` → `app/(dashboard)/trip/`
- Move: `app/(trips-app)/trip/preview/` → `app/(main)/trip/preview/`

- [ ] **Step 1: Read (trips-app)/layout.tsx to check for providers**

Read `apps/web/app/(trips-app)/layout.tsx`. It currently renders `<div className="pt-14">{children}</div>`.
No providers are provided at this level — `TripThemeProvider` and `ItineraryProvider` are inside `trip-layout-inner.tsx`.
Safe to delete.

- [ ] **Step 2: Move the trip directory**

```bash
# Move all trip files from (trips-app) into (dashboard)
mv apps/web/app/\(trips-app\)/trip apps/web/app/\(dashboard\)/trip
```

**Note on orphan routes:** The following directories exist but aren't in the tab bar:
- `info/` — exists in the file tree but not in ALL_TABS. Moves as-is. Accessible via direct URL only.
- `restaurants/` — exists in TripSidebar but not in ALL_TABS (merged into `activities`). Moves as-is. The sidebar had it as a separate nav item but it's being removed. Accessible via direct URL only.

- [ ] **Step 2: Move preview page to (main)**

```bash
# Move preview out of dashboard (it's standalone)
mkdir -p apps/web/app/\(main\)/trip/preview
mv apps/web/app/\(dashboard\)/trip/preview/page.tsx apps/web/app/\(main\)/trip/preview/page.tsx
rmdir apps/web/app/\(dashboard\)/trip/preview
```

- [ ] **Step 3: Remove empty (trips-app) directory**

```bash
# Remove the now-empty (trips-app) route group
rm -rf apps/web/app/\(trips-app\)
```

- [ ] **Step 4: Verify files moved correctly**

Run: `find apps/web/app/\(dashboard\)/trip -type f -name "*.tsx" | sort`
Expected: All trip sub-page files listed under `(dashboard)/trip/[id]/`

Run: `ls apps/web/app/\(main\)/trip/preview/page.tsx`
Expected: File exists

Run: `ls apps/web/app/\(trips-app\) 2>/dev/null`
Expected: No such file or directory

- [ ] **Step 5: Commit**

```bash
git add -A apps/web/app/\(dashboard\)/trip apps/web/app/\(main\)/trip/preview
git commit -m "refactor: move trip routes into (dashboard) route group"
```

### Task 7: Wire DashboardLayout into (dashboard) route layout

**Files:**
- Modify: `apps/web/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Replace DashboardNavbar with DashboardLayout**

Read the current file. Replace its contents:

```typescript
// apps/web/app/(dashboard)/layout.tsx
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
```

- [ ] **Step 2: Verify the app boots**

Run: `cd apps/web && npx next build 2>&1 | tail -20` (or just check typecheck)
Expected: No import errors for DashboardLayout

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/layout.tsx
git commit -m "feat: wire DashboardLayout into (dashboard) route group"
```

### Task 8: Update trip [id] layout to provide DashboardTopBarSlot

**Files:**
- Modify: `apps/web/app/(dashboard)/trip/[id]/layout.tsx`

- [ ] **Step 1: Update the trip layout to inject tabs via context slot**

The current file passes tripId to `TripLayoutInner`. We need to wrap it with `DashboardTopBarSlot.Provider` providing the trip tab bar. Read the current file first.

The updated layout should look like:

```typescript
// apps/web/app/(dashboard)/trip/[id]/layout.tsx
import TripLayoutInner from "./trip-layout-inner";
import { DashboardTopBarSlot } from "@/components/dashboard/DashboardTopBarSlot";
import { TripTabBar } from "@/components/dashboard/TripTabBar";
import { TripThemeProvider } from "@/components/trip/TripThemeContext";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <TripThemeProvider trip={null}>
      <DashboardTopBarSlot.Provider value={<TripTabBar tripId={id} />}>
        <TripLayoutInner tripId={id}>{children}</TripLayoutInner>
      </DashboardTopBarSlot.Provider>
    </TripThemeProvider>
  );
}
```

**CRITICAL:** `TripThemeProvider` wraps `DashboardTopBarSlot.Provider` so `TripTabBar` (which calls `useTripTheme`) has access to the theme context. The `trip={null}` is a placeholder — `TripThemeProvider` will need to accept an initial null and hydrate when the client loads. If `TripThemeProvider` requires a non-null trip, use a wrapper client component that fetches the trip first.

Also note: `trip-layout-inner.tsx` currently wraps with `TripThemeProvider` — this must be **removed** from there since it's now provided at the layout level.

- [ ] **Step 2: Commit** (after Task 9 is complete)

### Task 9: Create TripTabBar (horizontal tab bar for DashboardTopBar)

**Files:**
- Create: `apps/web/components/dashboard/TripTabBar.tsx`

- [ ] **Step 1: Create the component**

This reuses the `ALL_TABS` config from `trip-tabs.tsx` but renders as a horizontal bar in DashboardTopBar instead of a floating spine.

```typescript
// apps/web/components/dashboard/TripTabBar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTripTheme } from '@/components/trip/TripThemeContext'
import { getTabMeta } from '@/components/trip-tabs'

interface TripTabBarProps {
  tripId: string
}

export function TripTabBar({ tripId }: TripTabBarProps) {
  const pathname = usePathname()
  const basePath = `/trip/${tripId}`
  const { theme } = useTripTheme()

  // Define the tab segments to show (excludes restaurants — merged into activities)
  const tabSegments = [
    '', 'itinerary', 'calendar', 'hotels', 'flights',
    'activities', 'packing', 'budget', 'cars', 'favorites', 'settings',
  ]

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
      {tabSegments.map((segment) => {
        const tab = getTabMeta(segment)
        if (!tab) return null
        const Icon = tab.icon
        const href = segment ? `${basePath}/${segment}` : basePath
        const isActive = segment === ''
          ? pathname === basePath || pathname === basePath + '/'
          : pathname === `${basePath}/${segment}` || pathname.startsWith(`${basePath}/${segment}/`)

        return (
          <Link
            key={segment || 'overview'}
            href={href}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'text-white'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06]',
            ].join(' ')}
            style={isActive ? { backgroundColor: theme.base } : undefined}
          >
            <Icon size={14} />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep -i "TripTabBar" | head -5`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/dashboard/TripTabBar.tsx apps/web/app/\(dashboard\)/trip/\[id\]/layout.tsx
git commit -m "feat: add TripTabBar and wire DashboardTopBarSlot in trip layout"
```

### Task 10: Update trip-layout-inner.tsx — remove sidebar, remove calendar branch, remove TripTabs, fix ContentHeader

**Files:**
- Modify: `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx`

This is the biggest modification. Key changes:
1. Remove all `<TripSidebar />` renders (lines where TripSidebar appears)
2. Remove the `isCalendar` branch that renders `flex h-screen overflow-hidden` — calendar now flows through the normal content path
3. Remove the import of `TripSidebar`
4. Keep everything else (hero, animations, map panel, ContentHeader, TripExploreSection)

- [ ] **Step 1: Read the current file**

Read `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx` fully.

- [ ] **Step 2: Remove TripSidebar import**

Remove: `import { TripSidebar } from '@/components/trip/TripSidebar'`

- [ ] **Step 3: Remove the isCalendar fullscreen branch**

Find the block that looks like:
```typescript
if (isCalendar) {
  return (
    <div className="flex h-screen overflow-hidden">
      <TripSidebar tripId={tripId} />
      <div className="flex-1 min-w-0 h-full">
        {children}
      </div>
    </div>
  )
}
```
Delete this entire block. Calendar now renders through the normal layout flow.

- [ ] **Step 4: Remove TripSidebar from the main layout**

In the main return block, find and remove:
```typescript
<TripSidebar tripId={tripId} />
```
This appears inside the `<div className="flex flex-col md:flex-row">` wrapper.

- [ ] **Step 5: Remove TripTabs render**

Search for `<TripTabs` in the file. If it's rendered (it may be imported but conditionally rendered), remove the render and the import. The tab navigation is now handled by `TripTabBar` in `DashboardTopBar`.

- [ ] **Step 6: Remove TripThemeProvider wrap**

Since `TripThemeProvider` is now provided at the layout level (Task 8), remove it from `trip-layout-inner.tsx`. Find `TripThemeProvider` in the render and unwrap its children.

- [ ] **Step 7: Remove Calendar shortcut from ContentHeader**

In the `ContentHeader` component, find the calendar link button:
```tsx
<a href={`/trip/${tripId}/calendar`} ...>
  <Calendar size={13} />
  <span className="text-[12px] font-medium">Calendar</span>
</a>
```
Delete it. Calendar is now accessible via the top tabs.

- [ ] **Step 8: Simplify the layout wrapper**

Since the sidebar is gone, the `<div className="flex flex-col md:flex-row">` wrapper can be simplified to just a flex column. The ContentHeader and content area don't need the sidebar structure.

- [ ] **Step 6: Verify typecheck**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors related to trip-layout-inner

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/\(dashboard\)/trip/\[id\]/trip-layout-inner.tsx
git commit -m "refactor: remove TripSidebar and calendar fullscreen from trip layout"
```

---

## Chunk 3: Calendar Integration

Create CalendarToolbar to replace TripNavbar, and update CalendarDashboard.

### Task 11: Create CalendarToolbar

**Files:**
- Create: `apps/web/components/calendar/CalendarToolbar.tsx`

This is the component that replaces TripNavbar. It renders inside CalendarDashboard (not in the layout), containing all calendar-specific controls.

- [ ] **Step 1: Read TripNavbar.tsx fully**

Read `apps/web/components/calendar/TripNavbar.tsx` to understand the full props interface and sub-components (TripMenuBar, RescoperPopover, UnscheduledPopover, AvatarCircle, selection indicator).

- [ ] **Step 2: Create CalendarToolbar**

The new CalendarToolbar takes the same props as TripNavbar minus the ones that moved elsewhere (theme toggle → sidebar, user dropdown → sidebar, back button → top tabs). It renders:

```
[← Trip Name] | [Week][Day] [+New] | [👤👤 presence] [Share] [⋯]
```

Key implementation notes:
- `TripMenuBar` is NOT exported from TripNavbar.tsx — it's an internal function component.
- **Approach:** Extract `TripMenuBar` into its own file `apps/web/components/calendar/TripMenuBar.tsx` first, then import it in both `TripNavbar.tsx` (temporarily) and `CalendarToolbar.tsx`.
- `RescoperPopover` and `UnscheduledPopover` are already separate files — import them directly.
- `AvatarCircle` is also an internal component in TripNavbar — extract it too, or inline the simple rendering in CalendarToolbar.
- Props are a subset of `TripNavbarProps` — remove `onBack`, `theme`, `onToggleTheme` (moved to sidebar).

**Sub-steps:**
1. Extract `TripMenuBar` (including `MENU_GROUPS`, `MENU_LABELS` constants) into `apps/web/components/calendar/TripMenuBar.tsx` — export it
2. Extract `AvatarCircle` into `apps/web/components/calendar/AvatarCircle.tsx` — export it
3. Create `CalendarToolbar.tsx` — copy TripNavbar, remove back button, user dropdown, theme toggle, rename component and props
4. Update `TripNavbar.tsx` to import `TripMenuBar` and `AvatarCircle` from their new files (temporary — keeps share page working during migration)

```typescript
// apps/web/components/calendar/CalendarToolbar.tsx
// Based on TripNavbar — stripped of sidebar/topbar concerns (back button, user dropdown, theme toggle)
// Renders as a toolbar bar below DashboardTopBar inside the calendar content area

// See TripNavbar.tsx for the full implementation pattern — this is a subset.
// Key changes from TripNavbar:
// - Remove: onBack prop (navigation handled by sidebar/top tabs)
// - Remove: theme/onToggleTheme (moved to DashboardSidebar)
// - Remove: user avatar dropdown (moved to DashboardSidebar)
// - Keep: TripMenuBar, view toggle, presence, share, rescoper, unscheduled popover, selection indicator
```

Since this is a large component (~400+ lines), the implementer should:
1. Copy `TripNavbar.tsx` to `CalendarToolbar.tsx`
2. Rename the component and its props interface
3. Remove the sections noted above
4. Adjust styling — it no longer needs `fixed` positioning or top-level page layout concerns

- [ ] **Step 3: Verify typecheck**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep -i "CalendarToolbar" | head -5`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/CalendarToolbar.tsx
git commit -m "feat: add CalendarToolbar replacing TripNavbar for unified shell"
```

### Task 12: Update CalendarDashboard to use CalendarToolbar

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Read CalendarDashboard.tsx**

Find where `TripNavbar` is imported and rendered (around line 18 and 529).

- [ ] **Step 2: Replace TripNavbar import with CalendarToolbar**

Replace: `import { TripNavbar } from './TripNavbar'`
With: `import { CalendarToolbar } from './CalendarToolbar'`

- [ ] **Step 3: Replace the TripNavbar render**

Find the `<TripNavbar .../>` JSX block. Replace it with `<CalendarToolbar .../>`.

The props passed should be the same subset — CalendarToolbar accepts the same props minus `onBack`, `theme`, `onToggleTheme`. Remove those from the spread.

- [ ] **Step 4: Verify the app renders**

Run: `cd apps/web && npm run dev` and navigate to `/trip/[id]/calendar`
Expected: Page renders with sidebar + top bar + calendar toolbar below top bar

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "refactor: CalendarDashboard renders CalendarToolbar instead of TripNavbar"
```

### Task 13: Update Providers.tsx — hide GlobalNavbar on dashboard routes

**Files:**
- Modify: `apps/web/components/Providers.tsx`

- [ ] **Step 1: Read Providers.tsx**

Find where GlobalNavbar is conditionally shown/hidden.

- [ ] **Step 2: Add dashboard routes to the hide list**

GlobalNavbar currently hides on auth pages and calendar pages via:
```typescript
const isCalendarTab = /\/trip\/[^/]+\/calendar$/.test(pathname)
if (isAuthPage || isCalendarTab) return null
```

Replace this with a broader dashboard route check. The GlobalNavbar should only show on `(main)` routes:

```typescript
const isDashboardRoute =
  pathname.startsWith('/trips') ||
  pathname.startsWith('/trip') ||
  pathname.startsWith('/explore') ||
  pathname.startsWith('/places')

if (isAuthPage || isDashboardRoute) return null
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/Providers.tsx
git commit -m "fix: hide GlobalNavbar on all dashboard routes"
```

---

## Chunk 4: Cleanup

Remove old components and verify everything works end-to-end.

### Task 14: Handle share page layout override

**Files:**
- Create: `apps/web/app/(dashboard)/trip/[id]/share/[token]/layout.tsx`

The share page (`/trip/[id]/share/[token]`) is a public-facing view that should NOT render the dashboard shell (sidebar + top bar). Since it's inside the `(dashboard)` route group, it inherits the DashboardLayout wrapper.

- [ ] **Step 1: Create a share layout that opts out of the dashboard shell**

```typescript
// apps/web/app/(dashboard)/trip/[id]/share/[token]/layout.tsx
// This layout overrides the parent (dashboard)/layout.tsx for the share route.
// Next.js allows nested layouts, but does NOT allow opting out of a parent layout.
// Instead, we render the share page content directly without the sidebar/top bar chrome.
// The share page already handles its own full layout.

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

**IMPORTANT:** Next.js does not support "opting out" of parent layouts. The share page will still be wrapped by `(dashboard)/layout.tsx`. The correct fix is to **move the share page OUT of the `(dashboard)` route group** into a standalone route.

```bash
# Move share to standalone route outside (dashboard)
mkdir -p apps/web/app/trip/\[id\]/share/\[token\]
mv apps/web/app/\(dashboard\)/trip/\[id\]/share/\[token\]/page.tsx apps/web/app/trip/\[id\]/share/\[token\]/page.tsx
rm -rf apps/web/app/\(dashboard\)/trip/\[id\]/share
```

This way the share page at `/trip/[id]/share/[token]` renders without any dashboard shell.

- [ ] **Step 2: Verify share page loads independently**

Run: `cd apps/web && npm run dev`, navigate to a share URL
Expected: Page renders without sidebar/top bar

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: move share page out of (dashboard) route group"
```

### Task 15: Remove old navigation components

**Files:**
- Delete: `apps/web/components/DashboardNavbar.tsx`
- Delete: `apps/web/components/trip/TripSidebar.tsx`
- Delete: `apps/web/components/calendar/TripNavbar.tsx` (only if no other imports remain)

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -rn "DashboardNavbar" apps/web/ --include="*.tsx" --include="*.ts"
grep -rn "TripSidebar" apps/web/ --include="*.tsx" --include="*.ts"
grep -rn "from.*TripNavbar" apps/web/ --include="*.tsx" --include="*.ts"
```
Expected: Only the component files themselves (and CalendarDashboard if TripNavbar types are still referenced — update those references first)

- [ ] **Step 2: Delete the files**

```bash
git rm apps/web/components/DashboardNavbar.tsx
git rm apps/web/components/trip/TripSidebar.tsx
```

Note: Don't delete TripNavbar.tsx yet if CalendarToolbar re-exports TripMenuBar from it. If TripMenuBar is extracted, TripNavbar can be deleted. Otherwise keep it as a source for the internal components.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove DashboardNavbar and TripSidebar (replaced by unified dashboard shell)"
```

### Task 15: End-to-end verification

- [ ] **Step 1: Run typecheck**

Run: `cd apps/web && npx tsc --noEmit --pretty`
Expected: No new errors

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No new errors

- [ ] **Step 3: Manual verification checklist**

Navigate to each page and verify:
- [ ] `/trips` — shows sidebar + breadcrumb top bar, trips list renders
- [ ] `/trip/[id]` — shows sidebar with trip badge + trip tabs top bar + overview content
- [ ] `/trip/[id]/calendar` — shows sidebar + tabs + CalendarToolbar + calendar grid (no fullscreen breakout)
- [ ] `/trip/[id]/hotels` — shows sidebar + tabs + content header + hotels content
- [ ] Browser back from `/trip/[id]/hotels` to `/trips` — smooth transition, trip badge fades, breadcrumb appears
- [ ] Sidebar collapses/expands on hover
- [ ] Mobile: hamburger menu opens sidebar overlay

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during e2e verification"
```
