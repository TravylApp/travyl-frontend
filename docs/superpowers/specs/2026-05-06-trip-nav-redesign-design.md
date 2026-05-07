# Trip Page Nav Redesign — Design Spec

**Date:** 2026-05-06
**Status:** Approved by user — ready for implementation plan
**Scope:** Replace the trip-page side navigation with a modern always-on left rail. Web only; mobile bottom bar updated to match.
**Out of scope:** Global app navbar, individual tab content pages, the magazine/compact layout toggle, calendar page's hover-reveal sidebar.

---

## 1. Why

The current trip nav (`apps/web/components/trip-tabs.tsx`) is a 56px frosted-glass vertical spine with 11 icon-only tabs stacked plus a History toggle, Customize button, and drag handle. Users have to hover each icon to learn what it is. The pile of identically-styled rounded squares creates visual noise without hierarchy, and the floating pill aesthetic feels dated next to the rest of the trip page.

The redesign optimizes for one thing: **a first-time user can look at the nav and use it without questions.** Labels are always visible. Sections are visually grouped. The active page is unambiguous.

## 2. What changes

### 2.1 The rail itself

- **Always-expanded left rail at 220px.** Replaces the 56px floating spine.
- **Solid white background** (`bg-white` / dark theme equivalent) with a 1px right border. Drops the `backdrop-filter: blur(16px)` floating pill treatment.
- **Anchored to the page**, not floating. Top edge sits flush against the global navbar (top: 48px); bottom edge runs to the viewport bottom.
- **Internal padding:** 14px top, 10px sides, 10px bottom.

### 2.2 Trip context header (new, top of rail)

A small header block at the top of the rail, above the nav rows:
- **Destination** — serif font (matches existing `font-serif` usage), 16px, `text-[var(--trip-base)]` color.
- **Date range + traveler count** — 11px, `text-gray-400`. Format: `May 14 – May 22 · 4 travelers`.
- 14px bottom padding, separated from nav rows by a 1px hairline divider.

This anchors the rail to *this* trip rather than feeling like generic chrome. Pulls data from the existing `trip` object already in `TripLayoutContent`.

### 2.3 Nav rows

Each tab is a 32px-tall row:
- **Layout:** `[16px icon] 11px gap [13px medium label]`, padded 10px horizontal, 7px border radius.
- **Default state:** `text-gray-600`, transparent background.
- **Hover:** background `bg-[#f5f3ee]` (warm cream — matches the trip page palette), text `text-[var(--trip-base)]`.
- **Active state:** background = theme color at 8% opacity (`rgba(<trip-base>, 0.08)`), text = theme color, font weight 600, plus a 3px-wide × 18px-tall accent bar pinned to the left edge of the row.

### 2.4 Grouping

Three groups, separated only by a 1px hairline divider with 6px vertical margin (no text labels — keeps it clean):

| Group       | Tabs                                                 |
| ----------- | ---------------------------------------------------- |
| Plan        | Overview, Itinerary, Calendar                        |
| Book        | Hotels, Flights, Cars (renamed from "Car Rental")    |
| Explore     | Explore (currently "Activities"), Packing, Budget, Favorites |

Order matches the table.

### 2.5 Footer row (utility)

Pinned to the bottom of the rail (`mt-auto`), separated from the last group by a 1px hairline divider with 6px top padding:
- **Settings** — same row style as the nav rows.
- **Trip History** — same row style. Replaces the inline `TripHistoryToggle` icon-button.

### 2.6 What gets removed

| Removed | Replaced by |
| ------- | ----------- |
| `useDragToReposition` + drag handle | — (cut entirely; no replacement) |
| `position` prop (`left` / `right` / `top`) and `onPositionChange` | — (rail is always left-anchored) |
| Standalone `SlidersHorizontal` Customize button | Color overrides move into the Settings page |
| `TabCustomizePopover` (inline color editor) | A "Tab colors" section on `/trip/[id]/settings` |
| `dark` prop variant + magazine mode dark styling | Rail is always light (the magazine hero darkens the *content*, not the nav) |
| Tooltip-on-hover for icons | Labels are always visible — tooltips not needed |
| `TripHistoryToggle` icon button | Replaced by the "Trip History" row in the footer |

The drag-reposition feature ships in `trip-tabs.tsx` today but is not visible in the layout (the layout passes `position="left"` and never wires `onPositionChange`). It's effectively dead code we're removing.

### 2.7 Mobile

The mobile horizontal bottom bar (`md:hidden fixed bottom-0`) keeps its current pattern but trims to a fixed set of 5 tabs to remove the horizontal-scroll smell:

| Visible | Hidden behind "More" sheet |
| ------- | -------------------------- |
| Overview, Itinerary, Hotels, Flights, Explore | Calendar, Cars, Packing, Budget, Favorites, Settings, Trip History |

A 6th "More" tab opens a bottom sheet listing the hidden tabs. Tapping any hidden tab navigates and closes the sheet. The active state on the bottom bar matches the rail's active style (theme color tint, no full filled pill).

### 2.8 Calendar page exception

The calendar page currently uses a hover-reveal sidebar (3px invisible strip → expands `TripTabs` on hover) because the calendar takes the full viewport. We keep this pattern, but the revealed nav uses the new rail design (220px wide, dark variant of the same component since it sits over the dark calendar canvas).

The new rail accepts a `dark` prop that swaps:
- Background: `bg-white` → `bg-black/85` with `backdrop-blur-xl`.
- Border: `border-gray-200` → `border-white/10`.
- Text default: `text-gray-600` → `text-white/70`.
- Hover: `bg-[#f5f3ee]` → `bg-white/10`.
- Active background opacity: 8% → 18% (more visible on dark).

This is the only place the dark variant is used.

## 3. Files affected

| File | Change |
| ---- | ------ |
| `apps/web/components/trip-tabs.tsx` | Rewrite — new rail markup, remove drag/customize/dark-magazine logic, retain `getTabMeta` export |
| `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx` | Update layout container widths: `md:pl-[100px]` → `md:pl-[240px]`; remove `position` / `dark` props passed to `TripTabs` (except calendar's `dark` for the hover-reveal); remove the layout-mode toggle button's interaction with the spine |
| `apps/web/app/(dashboard)/trip/[id]/settings/page.tsx` | Add a "Tab colors" section that contains the swatch grid currently inside `TabCustomizePopover` |
| `apps/web/components/trip/TripHistoryPanel.tsx` | Keep `TripHistoryPanel` (the slide-in panel itself is unchanged); trigger now comes from the rail row instead of `TripHistoryToggle`. The standalone `TripHistoryToggle` export can be deleted if no other callers use it. |
| Renamed labels in `ALL_TABS`: `"Car Rental"` → `"Cars"` | Tighter, fits the rail. |

The 220px rail width changes the content-area math. Today the content uses `md:pl-[100px]` to leave room for the 56px spine + margin. After: `md:pl-[240px]` (220 + 20 gutter). This is a global find-and-replace across `trip-layout-inner.tsx` and any per-tab page that hardcodes `md:pl-[100px]`.

## 4. Behavior details

### 4.1 Active route detection

Unchanged from today: compare `pathname` to `${basePath}/${segment}` (or `pathname === basePath` for Overview). Calendar sub-routes still resolve to the Calendar tab.

### 4.2 Theme color integration

The rail respects the existing `useTripTheme()` hook:
- The 3px accent bar uses `theme.base`.
- The 8% active background uses `theme.base` at 8% opacity (compute via `theme.base + '14'` since hex alpha works in CSS).
- Per-tab color overrides (`tabColorOverrides[key]`) continue to apply to that tab's accent bar and active background.

### 4.3 Trip context header data source

Pulls from the same `useItineraryScreen(tripId)` hook the layout already uses:
- `trip.destination` → top line.
- `trip.start_date`, `trip.end_date` → "May 14 – May 22" (formatted with existing date utility, locale-aware).
- `trip.travelers?.length ?? 1` → "4 travelers" / "1 traveler".

If trip is `null` / loading, render placeholder skeletons (16px line + 11px line) so the rail doesn't jump on load.

### 4.4 Mobile "More" sheet

- Trigger: a 6th bottom-bar slot labeled "More" with an ellipsis icon.
- Sheet: opens from the bottom, full-width, max-height 60vh, list of remaining 7 tabs as full-width rows (icon + label, same row style as desktop rail).
- Dismiss: tap a row, tap the backdrop, or swipe down.
- Implementation: reuse the existing motion/react slide-up pattern from `TripHistoryPanel` if straightforward; otherwise a simple fixed-position div with backdrop.

### 4.5 Keyboard / a11y

- Each row is a `<Link>` (already), so keyboard nav with Tab works.
- Active row gets `aria-current="page"`.
- Group dividers are decorative (`role="presentation"`) so screen readers skip them.
- No keyboard shortcuts in this iteration. (Cmd-K palette is a future enhancement.)

## 5. Visual specs (quick-reference)

| Token | Value |
| ----- | ----- |
| Rail width | 220px |
| Rail background | `bg-white` / dark: `rgba(0,0,0,0.85)` + blur(16px) |
| Rail border | 1px right, `border-gray-200` / dark: `border-white/10` |
| Row height | 32px |
| Row padding | 0 10px |
| Row border-radius | 7px |
| Row icon size | 16px, stroke-width 1.8 |
| Row label | 13px, font-weight 500 (active: 600) |
| Row gap (icon → label) | 11px |
| Group divider | 1px, `bg-[#f0eee9]` / dark: `bg-white/[0.06]`, `mx-3 my-1.5` |
| Active accent bar | 3px × 18px, `bg-[var(--trip-base)]`, pinned to left edge of row |
| Active background | theme.base at 8% opacity (dark: 18%) |
| Trip header destination | 16px, `font-serif`, weight 400, `text-[var(--trip-base)]` |
| Trip header meta | 11px, weight 400, `text-gray-400` |

## 6. Non-goals

- **No global navbar changes.** The 48px top navbar stays as-is.
- **No new icons.** Reuse the existing Lucide icons from `ALL_TABS`.
- **No keyboard palette / Cmd-K.** Tracked separately if we want it.
- **No collapsing the rail to icon-only.** The whole point is always-visible labels — a collapse toggle reintroduces the original problem.
- **No reordering tabs.** Order is fixed in `ALL_TABS`.
- **No per-user pinning of "favorite" tabs.** Same reason — adds complexity without clear win.

## 7. Open questions

None blocking. Date formatting in the trip header should use whatever utility the rest of the trip page uses for consistency — to be confirmed during implementation.

## 8. Acceptance criteria

- The trip page renders the new rail at 220px on viewports ≥ md breakpoint.
- All 11 tabs from `ALL_TABS` are visible with their labels at all times — no scroll, no overflow, no hover required.
- The active tab is unambiguous: its row has the 8% theme background, the 3px left accent bar, and a bolder label.
- Settings page has a "Tab colors" section that lets the user override per-tab colors (same swatch grid as today's popover).
- The standalone Customize button, the drag handle, and the inline color popover are gone from the rail.
- Mobile: bottom bar shows exactly 5 tabs + "More". The More sheet shows the other 7.
- Calendar page: hover-reveal still works, using the dark variant of the rail.
- No regressions in: trip theme color application, route highlighting, calendar full-screen layout, or per-tab color overrides (still functional via Settings).
