# TRA-404: Trip Page Restyle — Unified App Shell

## Problem

Trip pages use two incompatible layout patterns:
- **Magazine layout** (overview, itinerary): full-viewport hero with parallax, quote blockquote, explore sections, footer
- **Suitcase card layout** (all other tabs): rounded-2xl card with shadow inside max-w-7xl container

This creates six issues:
1. Window-in-window feel from nested containers (card inside max-w container inside dashboard)
2. No trip identity visible — title/destination/dates not in the header
3. Sidebar inconsistency between views
4. Empty overview page below the hero
5. Marketing footer on workspace pages
6. Decorative quote consuming prime real estate

## Solution: Unified App Shell

Replace both layouts with one consistent app-shell pattern. Trip pages are a workspace, not a magazine.

### Layout Structure

```
┌─────────────────────────────────────────────────┐
│ GlobalNavbar (48px, fixed)                      │
├────┬────────────────────────────────────────────┤
│    │ CompactTripHeader (~180px)                  │
│ S  │ ┌─ bg image + gradient overlay ──────────┐ │
│ I  │ │ Trip Title        [dates] [travelers]  │ │
│ D  │ │ Destination           [edit] [share]   │ │
│ E  │ └───────────────────────────────────────┘ │
│ B  ├────────────────────────────────────────────┤
│ A  │ Content Area (full-width, no card wrapper) │
│ R  │                                            │
│    │ max-w-7xl mx-auto px-6                     │
│    │                                            │
│ 56 │ {children} — each tab renders here         │
│ px │                                            │
│    │                                            │
│    │ NO FOOTER                                  │
├────┴────────────────────────────────────────────┤
│ Mobile: bottom tab bar (48px)                   │
└─────────────────────────────────────────────────┘
```

### Components Changed

#### 1. `trip-layout-inner.tsx` — Unified Layout
- Remove the magazine vs suitcase card branching
- Single layout path for all tabs (except calendar which stays full-screen)
- Structure: sidebar + compact header + content area
- No footer rendering
- No OceanWave decorative element

#### 2. New: `CompactTripHeader` (replaces `TripMagazineHero`)
- Fixed height ~180px (not full viewport)
- Background image with gradient overlay (reuse trip destination image)
- Shows: trip title (editable), destination, date range, traveler count
- Action buttons: edit, share, collaborators
- Collapses to ~120px on scroll (optional, stretch goal)
- No quote/blockquote
- No "Hide Info" toggle

#### 3. `trip-tabs.tsx` — Consistent Sidebar
- Desktop: always 56px icon-only vertical spine, left side
- No mode switching between collapsed/expanded
- Keep tooltip on hover, keep drag-to-reposition
- Mobile: horizontal bottom bar (unchanged)

#### 4. Content Area
- Remove the rounded-2xl card wrapper and its shadow
- Content renders directly in max-w-7xl container
- Keep ContentHeader (sticky tab label + map toggle) but restyle to match flat layout
- Keep AnimatePresence page transitions
- Keep map side panel behavior

#### 5. Footer Visibility
- Add condition to Footer or dashboard layout: hide footer when inside `/trip/[id]/*` routes
- Footer still shows on marketing pages (/, /places, /trips list, /profile)

### Files to Modify

| File | Change |
|------|--------|
| `apps/web/app/(dashboard)/trip/[id]/trip-layout-inner.tsx` | Replace dual layout with unified shell |
| `apps/web/components/trip/TripMagazineHero.tsx` | Replace with CompactTripHeader (~180px) |
| `apps/web/components/trip-tabs.tsx` | Remove expanded mode, ensure consistent 56px spine |
| `apps/web/app/(dashboard)/layout.tsx` | Conditionally hide footer on trip routes |
| `apps/web/components/home/Footer.tsx` | (possibly) accept `hidden` prop |

### What Stays the Same

- Calendar view (already has its own full-screen layout — keep it)
- Mobile bottom tab bar behavior
- Map side panel
- AnimatePresence transitions
- Dark mode support
- Tab customization/color coding
- All tab content pages (hotels, flights, etc.)

### Design Tokens

Reuse existing CSS variables:
- `--magazine-bg`, `--magazine-surface` for header gradient
- `--magazine-heading`, `--magazine-accent` for text
- Shadows: remove heavy card shadows, use subtle dividers instead

### Out of Scope

- Redesigning individual tab content (hotels page, flights page, etc.)
- Changing the global navbar
- Mobile layout overhaul (just ensure consistency)
- New features or data display — this is purely layout/style
