# Calendar Tab: Hero Banner & Layout Fix

> Linear: workspace at free-tier issue cap — could not create TRA-XXX. Work proceeds on `develop` and will be linked when the cap clears.

## Problem

The Calendar tab feels "chopped":

1. **No trip identity at the top.** Every other tab (hotels, flights, budget, restaurants, itinerary, etc.) renders `CompactTripHeader` — a 300px banner with the destination photo, country tag + flag, big serif city name, dates, traveler count, and weather/currency/timezone/AQ/safety pills. The calendar shows none of it.
2. **Duplicate nav rendering bug.** The calendar uses a special branch in `trip-layout-inner.tsx` that renders the dashboard with `position: fixed; inset: 0; z-index: 40`. The dashboard layout's nav chrome (and footer/mobile bottom bar) leak through above and below the fixed layer, so the user sees two nav bars stacked vertically.
3. **Toolbar feels ungrounded.** With no header anchor, the calendar toolbar floats at the very top of the page next to a generic GlobalNavbar.

## Solution

Drop the calendar's special fullscreen overlay branch entirely. Let the calendar tab render inside the same shell as every other tab.

```
GlobalNavbar (48px, dashboard chrome)
├── TripRail (left sidebar)
└── content column (flex, min-h-screen)
    ├── CompactTripHeader        (~300px hero — banner photo + city + dates + pills)
    ├── ContentHeader             ("Calendar" tab label + Share + Map)
    └── CalendarDashboard         (flex-1 min-h-0, fills remaining viewport)
```

This is exactly how every other tab renders today. Calendar joins the family.

The duplicate-nav bug is fixed as a *side effect* of removing the `position: fixed` overlay — the dashboard chrome no longer has anything to leak around.

## What changes

### 1. `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx`

Remove the `isCalendar ? <fullscreen layout> : <standard layout>` branch in `TripLayoutContent` (lines ~518–533). Calendar uses the standard layout path.

The standard path already renders `CompactTripHeader` + `ContentHeader` + `{children}`. The only addition: when on the calendar route, the `{children}` slot needs to fill remaining viewport height (instead of growing only as tall as its content). Achieve this by:

- Making the standard-layout content wrapper `flex flex-col min-h-screen`
- Wrapping `{children}` in a `flex-1 min-h-0` container so the calendar dashboard inherits a sized flex parent

The padding/styling tweaks the `isCalendar` branch was doing (no card wrapper, no `max-w-7xl`) need to be preserved on the calendar tab — the dashboard wants edge-to-edge width. Use a conditional class similar to the existing `isMagazine` pattern: when `isCalendar`, skip the `max-w-7xl mx-auto` wrapper and the `bg-white/85 backdrop-blur-xl rounded-2xl` magazine card; otherwise use the existing styling.

### 2. `apps/web/components/calendar/CalendarDashboard.tsx`

The root `<div>` already uses `flex h-full overflow-hidden` — works the moment its parent has a defined height. No code change required if (1) is implemented correctly (parent supplies `flex-1 min-h-0`).

If a child container doesn't propagate height correctly, add `min-h-0` to the relevant flex children (TypeScript-only flex sizing fix, no behavioral change).

### 3. No new components

Reuses `CompactTripHeader`, `ContentHeader`, and `CalendarDashboard` as-is. No new files. No prop additions.

## Hero behavior

**No sticky-collapse.** The hero stays 300px and you scroll past it — same as every other tab. Sticky-collapse would be a one-off pattern not used anywhere else in the site, which would *not* "match the rest of the site." If the hero feels too tall in practice, sticky-collapse can be added in a follow-up.

## Vertical math (sanity check)

On a 900px viewport:
- 48px GlobalNavbar
- 300px CompactTripHeader
- ~52px ContentHeader
- ~44px CalendarToolbar
- = 444px chrome, leaving ~456px for the week grid

The week grid scrolls hours internally (`scrollRef` with `overflow-auto` + `HOUR_HEIGHT = 60`), so ~7–8 hours visible at once. Acceptable. On larger displays the grid gets correspondingly more room.

## What this fixes

| Issue | Fix |
|---|---|
| Two nav bars (top + bottom) | Calendar no longer overlays as a fixed layer — single GlobalNavbar at top, no leak below |
| No trip identity | `CompactTripHeader` renders at top with the destination banner |
| Floating toolbar | Now anchored under the hero + ContentHeader, same as every other tab |
| Awkward whitespace | `flex-1 min-h-0` makes the dashboard fill remaining viewport height |

## Out of scope

- Redesigning the For You / Events / Map sidebar
- Changing the calendar toolbar visuals
- Changing the trip rail
- Sticky-collapse behavior on scroll (potential follow-up if 300px hero is too tall in practice)
- Mobile layout overhaul (the standard shell already handles mobile; calendar inherits whatever the rest of the trip tabs do on small screens)

## Files to modify

| File | Change |
|---|---|
| `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx` | Remove `isCalendar` branch, add `flex-1 min-h-0` content wrapper, conditional max-w/card-wrapper |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Possible `min-h-0` adjustment if flex height doesn't propagate cleanly (verify in browser) |

## Verification plan

1. `npm run typecheck` — no new errors in either modified file
2. Open `/trip/<id>/calendar` in dev — verify:
   - Hero (banner + city + dates + pills) renders at top, matching `/trip/<id>/hotels`
   - No duplicate GlobalNavbar at bottom
   - Calendar grid fills remaining viewport (no whitespace below)
   - Right-side panel (For You / Events / Map) still works
   - Resize browser height — calendar grid scrolls internally, no layout break
3. Navigate between calendar ↔ other tabs — transition is smooth (the previous fullscreen-vs-standard layout-mode crossfade is no longer needed; both modes are now the same)
