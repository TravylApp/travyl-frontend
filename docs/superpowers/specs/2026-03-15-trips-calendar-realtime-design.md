# Trips Page — Calendar View, Real-time Collaboration & Layout Redesign

**Date:** 2026-03-15
**Status:** Approved

---

## Overview

Redesign the trips page into a full-screen monthly calendar experience with collaborative real-time sync powered by Yjs + y-supabase. Remove the settings page. The trip detail/overview page is out of scope — another engineer owns that work.

---

## 1. Layout & Navigation

### Route Group Restructure

The trips page currently lives inside the `(main)` route group, which unconditionally renders the global `<Navbar />` for all child routes. Since the trips page needs its own top bar without the global navbar, the trips route must be moved out of `(main)` into a new route group.

**New route group:** `apps/web/app/(trips-app)/`

```
apps/web/app/
  (main)/          ← existing, unchanged (home, profile, explore, etc.)
    layout.tsx     ← renders global Navbar — untouched
    page.tsx
    ...
  (trips-app)/     ← new route group
    layout.tsx     ← renders TripsTopBar only, NO global Navbar
    trips/
      page.tsx     ← trips calendar page (moved from (main)/trips/)
```

The URL `/trips` is unchanged — Next.js route groups do not affect paths.

`(trips-app)/layout.tsx`:
```tsx
import { TripsTopBar } from '@/components/trips/TripsTopBar';
import { TripCommandPalette } from '@/components/trips/TripCommandPalette';

export default function TripsAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TripsTopBar />
      <TripCommandPalette />
      <main className="pt-12">{children}</main>
    </>
  );
}
```

`pt-12` = 48px = exact height of the fixed top bar.

### Top Bar — `TripsTopBar`

Fixed, 48px height, white bg, `border-b border-gray-200`, `z-50`.

Three zones:

| Zone | Content |
|------|---------|
| Left | Back arrow link (→ `/`) · "Travyl" wordmark (Lustria, navy `#1e3a5f`) |
| Center | `‹` prev button · current month + year label (Lustria) · `›` next button · "Today" pill button |
| Right | Presence avatar stack (up to 4 + `+N` overflow) · ⌘K search icon button · user avatar |

Month state lives in the trips page and is passed up via a shared context or prop-drilled through the layout. Simplest approach: a `useMonthState` context exported from a `MonthStateProvider` mounted in the layout, consumed by both `TripsTopBar` (for controls) and `CalendarGrid` (for rendering).

---

## 2. Calendar Grid — `CalendarGrid`

### Month State

- `{ year: number; month: number }` — `month` is 0-indexed (Jan = 0)
- Initialised to today's month on every page load
- **No persistence** — resets on reload, no localStorage, no URL param
- Controlled via `MonthStateProvider` shared between `TripsTopBar` and `CalendarGrid`

### Grid Structure

- 7-column CSS grid (Sunday–Saturday), full viewport width
- Minimum cell height: 80px; rows expand dynamically to fit stacked spans
- `border border-gray-100` grid lines on each cell

### Day Cells

- Date number: `text-sm font-medium text-gray-700`, top-left of cell
- **Today:** 24px navy `#003594` filled circle behind the date number; date number in white
- **Outside current month:** date number at 30% opacity; no trip spans rendered in these cells

### Trip Spans

**Color:** Use `resolveTheme(trip.theme, trip.custom_theme_color).base` from `@travyl/shared/config/themes` — this handles both named themes (e.g. `'navy'` → `#1e3a5f`) and `custom_theme_color` overrides in one call. Applied as `backgroundColor` inline style on the span element.

**Layout within a cell:**
- Each span is 22px tall with a 2px gap between stacked spans
- Truncated destination name (`overflow-hidden text-ellipsis whitespace-nowrap`) in white, `text-xs font-medium`
- Status dot: 6px circle, right-aligned within the span, color by status:
  - `planning` → gray `#9CA3AF`
  - `booked` → amber `#F59E0B`
  - `active` → emerald `#10B981`
  - `completed` → navy `#003594`
  - `abandoned` → red `#EF4444`

**Interaction:**
- `cursor-pointer`, `hover:shadow-sm` transition
- Click → `router.push('/trip/' + trip.id)`

### Week Boundary Handling

When a trip crosses a Sunday→Saturday boundary, split into per-row segments:

- Segment continuing from previous row: `‹` at left edge, inline within the span, `text-[10px] text-white/70 mr-1`, always visible
- Segment continuing into next row: `›` at right edge, inline within the span, `text-[10px] text-white/70 ml-1`, always visible
- Minimum span width: 1 cell. On a 1-cell-wide span that has both indicators, omit both indicators to prevent overflow — show only the destination initial (first character) instead of the full label

---

## 3. Real-time Collaboration — `useRealtimeTrips`

### Packages to install in `apps/web`

```
yjs
y-supabase
```

### Yjs Document Schema

One shared `Y.Doc` per session. The doc contains a single top-level `Y.Map` named `"trips"`. Each entry in the map is keyed by `trip.id` (string UUID) and holds a `Y.Map` representing one trip with these fields mirroring the `Trip` type from `@travyl/shared`:

```
id: string
title: string
destination: string
start_date: string   // ISO date "YYYY-MM-DD"
end_date: string     // ISO date "YYYY-MM-DD"
status: string
theme: string
custom_theme_color: string | null
```

Only these fields are needed for the calendar view. Other `Trip` fields (budget, travelers, etc.) are not synced via Yjs — they live only in Supabase and are loaded separately if needed.

### Hook Signature

New file: `packages/shared/src/hooks/useRealtimeTrips.ts`

```ts
import type { Trip } from '../types';

export type CalendarTrip = Pick<Trip,
  'id' | 'title' | 'destination' | 'start_date' | 'end_date' |
  'status' | 'theme' | 'custom_theme_color'
>;

export function useRealtimeTrips(): {
  trips: CalendarTrip[];
  isLoading: boolean;
  isError: boolean;
}
```

This replaces `useTrips()` on the trips calendar page. The return shape is intentionally similar to `useTrips()` to minimise changes to the page component.

### Hook Internals

1. Read `session.user.id` from the Supabase auth session (already available via `@travyl/shared`'s auth store)
2. If not authenticated: return `{ trips: [], isLoading: false, isError: false }` immediately
3. Create `new Y.Doc()`
4. **Seed first:** fetch trips from Supabase (existing REST API), populate the `"trips"` Y.Map synchronously with each trip's `CalendarTrip` fields. Seeding completes before the provider connects, so there is no race with incoming remote updates.
5. Create `new SupabaseProvider(ydoc, supabaseClient, { channel: 'trips-' + userId })` — imported from `'y-supabase'` as `import { SupabaseProvider } from 'y-supabase'`. Pass the same authenticated Supabase client used elsewhere in the app (from `@travyl/shared`'s Supabase singleton). Once connected, the provider merges any remote Yjs updates via CRDT — no manual conflict resolution needed.
6. On the `"trips"` Y.Map's `observe` event, derive and set local `trips` state by iterating all map entries and converting each `Y.Map` to a plain `CalendarTrip` object
7. **On unmount:** call `provider.destroy()` then `ydoc.destroy()`. On remount, a fresh doc and provider are created — Yjs re-syncs from Supabase on reconnect. No in-flight state is preserved across unmounts.
8. The `ydoc` and `provider` instances are **not** returned to the consumer.
9. The `CalendarTrip` type alias is defined in the hook file itself (`useRealtimeTrips.ts`) and exported from there — it does not need to go into `packages/shared/src/types/index.ts`.

### Conflict Resolution

Yjs handles concurrent edits automatically via CRDT merge. The last-writer-wins on individual fields within a `Y.Map`. No custom conflict logic needed.

---

## 4. Presence — Supabase Presence Channel

- Channel name: `trips-presence-${session.user.id}` (Supabase auth UUID)
- On mount, join channel broadcasting:
  ```ts
  {
    user_id: string;       // required — session.user.id
    avatar_url: string | null;   // from user profile, may be null
    display_name: string | null; // from user profile, may be null
  }
  ```
- If `avatar_url` is null, render initials fallback (same as existing `<Avatar>` pattern in navbar)
- If `display_name` is null, render "?" as initials fallback
- Avatar stack in `TripsTopBar`: up to 4 avatars left-to-right, then `+N` text for overflow
- Animate in: `opacity-0 → opacity-100` over 200ms on join. Animate out: `opacity-100 → opacity-0` over 200ms on leave. No stagger.
- On unmount, call `channel.untrack()` and `supabase.removeChannel(channel)`

---

## 5. Context Search — `TripCommandPalette`

### Package to install in `apps/web`

```
cmdk
```

### Component — `apps/web/components/trips/TripCommandPalette.tsx`

Mounted once in the `(trips-app)` layout above `{children}` (already shown in Section 1 layout code).

### Behaviour

- Open: `⌘K` / `Ctrl+K` keyboard shortcut, or clicking the search icon in `TripsTopBar` (communicate via a shared `usePaletteOpen` context or a simple event emitter)
- On open: take a **snapshot** of the current trips array (shallow copy of the array, shallow copies of each trip object). Updates to `useRealtimeTrips` while the palette is open are **ignored** — the palette always searches against the snapshot. If a trip is deleted mid-search it will still appear in results; clicking it navigates to the (now gone) trip page.
- Search: client-side fuzzy match against `title` and `destination` fields of the snapshot
- Result row: 40×40px rounded destination thumbnail (or gray placeholder if no image) · trip name (Satoshi semibold, `text-sm`) · date range (`text-xs text-gray-500`) · status badge
- Select → `router.push('/trip/' + trip.id)`, close palette
- `Esc` → close palette

---

## 6. Settings Page Removal

Both changes must land in the same commit:

1. **Delete** `apps/web/app/(main)/profile/settings/page.tsx`
2. **Remove** from `apps/web/components/navbar.tsx` the Settings `<Link>` block (the `<Link href="/profile/settings">` item inside the dropdown menu)

---

## 7. Files Affected

| Action | Path |
|--------|------|
| Create | `apps/web/app/(trips-app)/layout.tsx` |
| Create | `apps/web/app/(trips-app)/trips/page.tsx` (moved + updated from `(main)/trips/page.tsx`) |
| Delete | `apps/web/app/(main)/trips/page.tsx` |
| Create | `apps/web/components/trips/TripsTopBar.tsx` |
| Create | `apps/web/components/trips/CalendarGrid.tsx` |
| Create | `apps/web/components/trips/TripSpan.tsx` |
| Create | `apps/web/components/trips/TripCommandPalette.tsx` |
| Create | `apps/web/contexts/MonthStateContext.tsx` |
| Create | `apps/web/contexts/PaletteOpenContext.tsx` |
| Create | `packages/shared/src/hooks/useRealtimeTrips.ts` |
| Modify | `packages/shared/src/hooks/index.ts` (export new hook) |
| Delete | `apps/web/app/(main)/profile/settings/page.tsx` |
| Modify | `apps/web/components/navbar.tsx` (remove Settings link) |

---

## 8. Out of Scope

- Trip detail / overview page (separate engineer)
- Mobile app changes
- Creating or editing trips from the calendar (future milestone)
- Offline support / IndexedDB persistence for Yjs
- URL-based month persistence
