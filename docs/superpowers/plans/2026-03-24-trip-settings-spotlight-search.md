# Trip Settings in Spotlight Search — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface trip-level settings (theme, tab visibility, status) in the GlobalCommandPalette when the user is inside a trip route, using a Zustand registration store to bridge route-scoped context into the global palette.

**Architecture:** Trip routes register their settings into a global Zustand store on mount and unregister on unmount (same pattern as `calendarCommandsStore`). The palette reads the registration and builds trip setting items (pickers, toggles, links). Theme/tab actions are local-only via `TripThemeContext`; status changes persist to Supabase.

**Tech Stack:** Zustand, React, TypeScript, Supabase (`updateTripDetails`)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `apps/web/stores/tripSettingsStore.ts` | **New** — Zustand store with `TripSettingsRegistration` interface, register/unregister actions, `useTripSettingsRegistration` hook |
| `apps/web/app/(trips-app)/trip/[id]/trip-layout-inner.tsx` | **Modify** — Call `useTripSettingsRegistration` in `TripLayoutContent` |
| `apps/web/components/GlobalCommandPalette.tsx` | **Modify** — Import trip settings store, build "Trip Settings" group |

---

## Chunk 1: Registration Store + Hook

### Task 1: Create tripSettingsStore with registration hook

**Files:**
- Create: `apps/web/stores/tripSettingsStore.ts`

- [ ] **Step 1: Create the store and hook**

```ts
// apps/web/stores/tripSettingsStore.ts
import { create } from 'zustand'
import { useEffect } from 'react'
import { useAuthStore, isTripOwner, canEditTrip, updateTripDetails } from '@travyl/shared'
import type { Trip } from '@travyl/shared'
import { useTripTheme } from '@/components/trip/TripThemeContext'
import { useItineraryScreen } from '@travyl/shared'

// ─── Types ────────────────────────────────────────────────────

export interface TripSettingsRegistration {
  tripId: string
  themeId: string
  customColor: string | null
  hiddenTabs: Record<string, boolean>
  status: Trip['status']
  canEdit: boolean
  isOwner: boolean
  setTripTheme: (id: string, color?: string) => void
  setTabHidden: (segment: string, hidden: boolean) => void
  setStatus: (status: Trip['status']) => void
}

interface TripSettingsStoreState {
  registration: TripSettingsRegistration | null
  register: (reg: TripSettingsRegistration) => void
  unregister: () => void
}

// ─── Store ────────────────────────────────────────────────────

export const useTripSettingsStore = create<TripSettingsStoreState>((set) => ({
  registration: null,
  register: (reg) => set({ registration: reg }),
  unregister: () => set({ registration: null }),
}))

// ─── Registration Hook ───────────────────────────────────────

export function useTripSettingsRegistration(tripId: string) {
  const { trip, refetch } = useItineraryScreen(tripId)
  const user = useAuthStore((s) => s.user)
  const { themeId, customColor, hiddenTabs, setTripTheme, setTabHidden } = useTripTheme()
  const register = useTripSettingsStore((s) => s.register)
  const unregister = useTripSettingsStore((s) => s.unregister)

  useEffect(() => {
    if (!trip || !user) return

    const isOwner = isTripOwner(trip, user.id)
    const canEdit = canEditTrip(trip, user.id)

    register({
      tripId: trip.id,
      themeId,
      customColor,
      hiddenTabs,
      status: trip.status,
      canEdit,
      isOwner,
      setTripTheme,
      setTabHidden: (segment, hidden) => setTabHidden(segment, hidden),
      setStatus: async (status) => {
        await updateTripDetails(trip.id, { status })
        refetch()
      },
    })

    return () => unregister()
  }, [trip, user, themeId, customColor, hiddenTabs, register, unregister, setTripTheme, setTabHidden, refetch])
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/stores/tripSettingsStore.ts
git commit -m "feat: add tripSettingsStore with registration hook (TRA-263)"
```

### Task 2: Wire up registration in TripLayoutContent

**Files:**
- Modify: `apps/web/app/(trips-app)/trip/[id]/trip-layout-inner.tsx`

- [ ] **Step 1: Add import**

Add at the top of the file alongside existing imports:

```ts
import { useTripSettingsRegistration } from '@/stores/tripSettingsStore'
```

- [ ] **Step 2: Call the hook in TripLayoutContent**

Inside the `TripLayoutContent` function, after the existing `useItineraryScreen` call (line 129), add:

```ts
useTripSettingsRegistration(tripId)
```

This single line is all that's needed — the hook handles everything internally (getting trip data, user, theme context, computing permissions, registering/unregistering).

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(trips-app)/trip/[id]/trip-layout-inner.tsx
git commit -m "feat: register trip settings in TripLayoutContent (TRA-263)"
```

---

## Chunk 2: Palette Integration

### Task 3: Add trip settings group to GlobalCommandPalette

**Files:**
- Modify: `apps/web/components/GlobalCommandPalette.tsx`

- [ ] **Step 1: Add imports**

Add at the top alongside existing imports:

```ts
import { useTripSettingsStore } from '@/stores/tripSettingsStore'
import { TRIP_THEMES, THEME_ORDER } from '@travyl/shared'
```

- [ ] **Step 2: Add store read inside the component**

After the existing settings store hooks (around line 116), add:

```ts
const tripRegistration = useTripSettingsStore((s) => s.registration)
```

- [ ] **Step 3: Add trip settings items builder**

After the `settingItems` useMemo (around line 248), add:

```ts
// ─── Trip settings registry ─────────────────────────────────

const CONFIGURABLE_TABS = [
  { segment: 'itinerary',   label: 'Itinerary Tab' },
  { segment: 'hotels',      label: 'Hotels Tab' },
  { segment: 'flights',     label: 'Flights Tab' },
  { segment: 'restaurants', label: 'Restaurants Tab' },
  { segment: 'activities',  label: 'Explore Tab' },
  { segment: 'packing',     label: 'Packing Tab' },
  { segment: 'budget',      label: 'Budget Tab' },
  { segment: 'cars',        label: 'Car Rental Tab' },
  { segment: 'favorites',   label: 'Favorites Tab' },
] as const

const tripSettingItems = useMemo<(SettingToggleItem | SettingPickerItem | SettingLinkItem)[]>(() => {
  if (!tripRegistration) return []
  const reg = tripRegistration
  const items: (SettingToggleItem | SettingPickerItem | SettingLinkItem)[] = []

  if (reg.canEdit) {
    // Theme picker
    items.push({
      type: 'setting-picker' as const,
      id: 'trip-theme',
      label: 'Trip Theme',
      keywords: ['theme', 'colors', 'appearance'],
      currentValue: TRIP_THEMES[reg.themeId]?.name ?? 'Custom',
      options: THEME_ORDER.map((id) => ({
        value: id,
        label: TRIP_THEMES[id].name,
      })),
      onSelect: (v: string) => reg.setTripTheme(v),
    })

    // Tab toggles
    for (const tab of CONFIGURABLE_TABS) {
      const isEnabled = !reg.hiddenTabs[tab.segment]
      items.push({
        type: 'setting-toggle' as const,
        id: `trip-tab-${tab.segment}`,
        label: tab.label,
        keywords: [tab.label.toLowerCase().replace(' tab', ''), 'tab', 'show', 'hide'],
        enabled: isEnabled,
        onToggle: () => reg.setTabHidden(tab.segment, isEnabled),
      })
    }

    // Status picker
    items.push({
      type: 'setting-picker' as const,
      id: 'trip-status',
      label: 'Trip Status',
      keywords: ['status', 'planning', 'booked', 'active', 'completed', 'abandoned'],
      currentValue: reg.status.charAt(0).toUpperCase() + reg.status.slice(1),
      options: [
        { value: 'planning', label: 'Planning' },
        { value: 'booked', label: 'Booked' },
        { value: 'active', label: 'Active' },
        { value: 'completed', label: 'Completed' },
        { value: 'abandoned', label: 'Abandoned' },
      ],
      onSelect: (v: string) => reg.setStatus(v as Trip['status']),
    })
  }

  // Link items (always shown when on trip)
  items.push(
    {
      type: 'setting-link' as const,
      id: 'trip-sharing',
      label: 'Trip Sharing',
      keywords: ['sharing', 'share', 'link', 'public'],
      path: `/trip/${reg.tripId}/settings`,
    },
    {
      type: 'setting-link' as const,
      id: 'trip-details',
      label: 'Trip Details',
      keywords: ['details', 'title', 'destination', 'dates', 'budget'],
      path: `/trip/${reg.tripId}/settings`,
    },
    {
      type: 'setting-link' as const,
      id: 'trip-colors',
      label: 'Trip Colors',
      keywords: ['colors', 'tab colors', 'itinerary colors', 'customize'],
      path: `/trip/${reg.tripId}/settings`,
    },
  )

  if (reg.isOwner) {
    items.push({
      type: 'setting-link' as const,
      id: 'trip-delete',
      label: 'Delete Trip',
      keywords: ['delete', 'remove', 'archive'],
      path: `/trip/${reg.tripId}/settings`,
    })
  }

  return items
}, [tripRegistration])
```

- [ ] **Step 4: Add Trip Settings group to the `groups` useMemo**

Inside the `groups` useMemo, after the `filteredSettings` block (around line 267) and before the `tripResults` block, add:

```ts
const filteredTripSettings = tripSettingItems.filter((s) =>
  s.label.toLowerCase().includes(q) ||
  s.keywords.some((kw) => kw.includes(q))
)
if (filteredTripSettings.length > 0) {
  result.push({ key: 'trip-settings', label: 'Trip Settings', items: filteredTripSettings })
}
```

Add `tripSettingItems` to the useMemo dependency array.

Group ordering: Navigation → Settings → **Trip Settings** → Trips → Commands.

- [ ] **Step 5: Add Trip type import for status cast**

Add at the top with existing imports from `@travyl/shared`:

```ts
import type { Trip } from '@travyl/shared'
```

(May already be implicitly available — if `Trip` is not used elsewhere in this file, add this import. If typecheck passes without it, skip.)

- [ ] **Step 6: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 7: Test manually**

1. Navigate to a trip page (`/trip/[id]`)
2. Open palette (Ctrl+K) — should see "Trip Settings" group with Theme, Tab toggles, Status, and link items
3. Type "theme" — should filter to Trip Theme picker
4. Click Trip Theme — picker sub-view with 8 theme options, checkmark on current
5. Select a different theme — should change trip theme immediately
6. Type "hotels" — should see Hotels Tab toggle with On/Off
7. Click to toggle — should hide/show the Hotels tab in sidebar
8. Type "status" — should see Trip Status picker
9. Select "Booked" — should persist to DB
10. Navigate away from trip — Trip Settings group should disappear from palette
11. Non-owner viewing shared trip — should NOT see edit controls (theme/tabs/status), but SHOULD see link items (except Delete Trip)

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/GlobalCommandPalette.tsx
git commit -m "feat: add trip settings group to command palette (TRA-263)"
```

### Task 4: Final cleanup and verification

**Files:**
- Possibly modify: `apps/web/components/GlobalCommandPalette.tsx` (if any import issues)

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: No errors across all workspaces

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No new errors (only pre-existing ones)

- [ ] **Step 3: Commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: cleanup imports for trip settings spotlight search"
```
