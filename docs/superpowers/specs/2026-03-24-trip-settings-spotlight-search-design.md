# Trip Settings in Spotlight Search — Design Spec

**Date:** 2026-03-24
**Status:** Approved
**Linear:** TRA-263

## Goal

Make trip-level settings (theme, tab visibility, status) searchable and actionable from the GlobalCommandPalette (Ctrl+K) when the user is inside a trip route. Link items navigate to the trip settings page for complex operations (sharing, details, danger zone).

## Architecture: Zustand Registration Store

The palette is global (`providers.tsx`) but trip settings only exist inside `/trip/[id]` routes via `TripThemeContext`. Bridge this with a **registration store** — the same pattern used by `calendarCommandsStore`.

New Zustand store `tripSettingsStore` at `apps/web/stores/tripSettingsStore.ts` (web-local, not shared):

```ts
interface TripSettingsRegistration {
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
```

## Registration Hook

`useTripSettingsRegistration(trip, canEdit, isOwner)` — called from `TripLayoutContent` in `trip-layout-inner.tsx`. Bridges `TripThemeContext` + trip data into the store.

- **When `trip` is null** (still loading): skip registration, do nothing. Registration only happens once trip data is available.
- On mount/update (when trip is non-null): calls `register()` with current values and action callbacks
- On unmount: calls `unregister()` to clear the registration
- `canEdit` and `isOwner` are computed inside the hook using `isTripOwner(trip, userId)` and `canEditTrip(trip, userId)` from `@travyl/shared`
- `useAuthStore` provides the current user ID

**Action callbacks:**
- `setTripTheme` and `setTabHidden`: delegate to `TripThemeContext` methods (local state only — same as the existing settings page behavior; persistence happens via the settings page save flow)
- `setStatus`: calls `updateTripDetails(trip.id, { status })` from `@travyl/shared` to persist to Supabase, then calls `refetch()` from `useItineraryScreen` to update local state

Dependencies: `useTripTheme()` for theme/tabs state and actions, `useItineraryScreen(tripId)` for trip data and `refetch` (already called in `TripLayoutContent`), `useAuthStore` for user ID.

**New imports needed in `TripLayoutContent`:** `useAuthStore`, `isTripOwner`, `canEditTrip` from `@travyl/shared`.

## Palette Integration

### Trip Settings Items

When `registration !== null`, the palette builds a "Trip Settings" group:

**Theme picker** (requires `canEdit`):
- Label: "Trip Theme"
- Keywords: theme, colors, appearance
- Current value: theme name from `TRIP_THEMES[themeId]?.name ?? 'Custom'`
- Options: Navy, Ocean, Sunset, Rainforest, Lavender Fields, Terracotta, Midnight Sky, Charcoal (from `THEME_ORDER`)
- Action: `registration.setTripTheme(id)`

**Tab toggles** (requires `canEdit`):
- One per configurable tab, matching `CONFIGURABLE_TABS` from `TabsSection.tsx`:

| Segment | Label | Keywords |
|---------|-------|----------|
| `itinerary` | Itinerary Tab | itinerary, tab, show, hide |
| `hotels` | Hotels Tab | hotels, tab, show, hide |
| `flights` | Flights Tab | flights, tab, show, hide |
| `restaurants` | Restaurants Tab | restaurants, tab, show, hide |
| `activities` | Explore Tab | explore, activities, tab, show, hide |
| `packing` | Packing Tab | packing, tab, show, hide |
| `budget` | Budget Tab | budget, tab, show, hide |
| `cars` | Car Rental Tab | car, rental, tab, show, hide |
| `favorites` | Favorites Tab | favorites, tab, show, hide |

- Skips always-on tabs: Overview (`index`), Settings (`settings`)
- Calendar is not a configurable tab (it's always available and not in `CONFIGURABLE_TABS`)
- Enabled: `!registration.hiddenTabs[segment]`
- Action: `registration.setTabHidden(segment, !currentlyHidden)` — toggles sidebar visibility only (route remains accessible via direct URL)

**Status picker** (requires `canEdit`):
- Label: "Trip Status"
- Keywords: status, planning, booked, active, completed, abandoned
- Current value: capitalized `registration.status`
- Options: Planning, Booked, Active, Completed, Abandoned
- Action: `registration.setStatus(status)` — persists to Supabase and refetches trip data

**Link items** (always shown when on trip):
- "Trip Sharing" → `/trip/[id]/settings` (keywords: sharing, share, link, public)
- "Trip Details" → `/trip/[id]/settings` (keywords: details, title, destination, dates, budget)
- "Trip Colors" → `/trip/[id]/settings` (keywords: colors, tab colors, itinerary colors, customize)
- "Delete Trip" → `/trip/[id]/settings` (keywords: delete, remove, archive) — only when `isOwner`

### Group Ordering

Navigation → Settings → Trip Settings → Trips → Commands

The Trip Settings group is inserted after the Settings group and before the Trips group in the `groups` useMemo array.

### Search Matching

Same as profile settings: query matches label OR any keyword (case-insensitive includes). Trip Settings group is always visible when on a trip (filtered by query like all other groups).

## Files Changed

| File | Change |
|------|--------|
| `apps/web/stores/tripSettingsStore.ts` | New — Zustand store with register/unregister + `useTripSettingsRegistration` hook |
| `apps/web/app/(trips-app)/trip/[id]/trip-layout-inner.tsx` | Modify — Add `useTripSettingsRegistration` call in `TripLayoutContent`, add `useAuthStore`/`isTripOwner`/`canEditTrip` imports |
| `apps/web/components/GlobalCommandPalette.tsx` | Modify — Import trip settings store, build "Trip Settings" group from registration |

## Out of Scope

- Custom color picker in palette (too complex — use settings page)
- Tab/itinerary color overrides in palette (color picker UI doesn't fit)
- Sharing toggles in palette (multi-step flow with URL copy)
- Trip details editing in palette (form fields)
- Confirmation dialogs for danger zone actions
- Persistence of theme/tab changes from palette (matches existing settings page behavior — local state only until explicit save)
