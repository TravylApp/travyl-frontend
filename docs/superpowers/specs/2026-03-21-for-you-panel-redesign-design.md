# For You Panel Redesign — Pinterest-Style Sectioned Feed

## Goal

Transform the ForYouPanel from a flat masonry grid with filter chips into a rich, sectioned discovery feed with contextual recommendation groups, responsive column layout, and visually distinctive cards.

## Current State

- `ForYouPanel.tsx` — fixed-width sidebar in the trip calendar view
- Flat 2-column masonry grid of `SuggestionCard` components
- Category filter chips (All, Sightseeing, Dining, etc.) at the top
- Single "Recommended for {destination}" section label
- Search bar for client-side text filtering
- Cards: image with gradient overlay, name, category pill, duration, price/rating badges
- Cards are draggable via dnd-kit onto the calendar
- `useSuggestions` hook fetches from `/recommend` (authenticated) or `/api/suggest` (fallback), supports infinite scroll

## Design

### Card Design: Context-Forward Overlay + Action Strip

Image-dominant cards (Pinterest style) with two additions over current design:

1. **"Why" banner** — a subtle gradient text overlay at the top of the card image explaining the recommendation reason (e.g. "Because you liked Musee d'Orsay", "Popular in Montmartre"). Uses the existing `reason` field on `SuggestionCard`.
2. **Action strip** — a thin bar at the bottom of each card with two buttons separated by a border: **Save** (adds to favorites) and **+ Schedule** (opens a date picker or quick-adds to the next open slot). This replaces the current hover-only "Drag to schedule" overlay as the primary action surface, though drag-to-calendar remains functional.

Card metadata stays in the bottom gradient overlay: name, category pill, rating, duration, price. Varying image heights for masonry effect (preserved from current implementation).

### Section Headers: Full-Width Banners

Inline banner cards that span all columns, visually breaking the feed into recommendation zones. Each banner has:

- Section title text (e.g. "Popular in Paris")
- Subtle background tint or gradient per section type
- Optional subtitle or count ("12 places")

Five recommendation reason types, sprinkled throughout the feed:

| Type | Example Header | Data Source |
|------|---------------|-------------|
| Destination-level | "Popular in Paris", "Hidden gems in Montmartre" | Available now — destination query |
| Category clusters | "Top dining spots", "Outdoor activities nearby" | Available now — category grouping |
| Affinity-based | "Because you liked Musee d'Orsay" | Future — requires favorite/interaction history |
| Schedule-aware | "Perfect for your free Wednesday" | Future — requires calendar gap analysis |
| Social | "Trending with travelers" | Future — requires aggregate interaction data |

Backend starts with destination-level and category cluster sections. Affinity, schedule-aware, and social sections are progressively enabled as signals become available.

### Responsive Width: Draggable Divider

Replace the fixed `FOR_YOU_PANEL_WIDTH` constant with a resizable panel:

- **Draggable divider** — a vertical resize handle between the calendar grid and the For You panel
- Drag left to expand the panel, drag right to shrink it
- **Min width:** ~280px (2 columns)
- **Max width:** ~600px (3 columns)
- **Column breakpoint:** < 360px = 2 columns, >= 360px = 3 columns
- Implemented via `ResizeObserver` on the panel container to determine column count
- User's preferred width persisted to `localStorage` and restored on mount

### Removed Elements

- **Category filter chips** — sections now handle categorization; chips are redundant
- **Single "Recommended for {destination}" label** — replaced by per-section banners

### Search Behavior

Search bar remains at the top of the panel. When the user types a query:

- The sectioned feed collapses into a flat masonry grid of matching results (across all sections)
- Section headers are hidden during search
- Clearing the search restores the sectioned feed
- Existing client-side filtering logic (name, location, description match) is preserved

### Data Model Changes

**New response shape from `/recommend`:**

```typescript
interface SuggestionSection {
  sectionType: 'destination' | 'category' | 'affinity' | 'schedule' | 'social'
  sectionTitle: string
  sectionSubtitle?: string
  suggestions: SuggestionCard[]
}

// /recommend returns:
interface RecommendResponse {
  sections: SuggestionSection[]
}
```

**Fallback grouping:** When the backend returns a flat list (current `/api/suggest` behavior), the client groups suggestions by category into sections with generated headers (e.g. category "dining" becomes section titled "Top Dining Spots").

**SuggestionCard updates:** The existing `reason` field is used for the per-card "why" banner text. No schema changes needed.

### Panel Structure (top to bottom)

1. **Header** — "For You" title + search bar (no filter chips)
2. **Scrollable feed** — alternating section banners and masonry card grids
3. **Infinite scroll sentinel** — triggers next page fetch (preserved)
4. **Footer hint** — "Drag any card onto the calendar to schedule it" (preserved)

### Component Breakdown

| Component | Responsibility |
|-----------|---------------|
| `ForYouPanel` | Panel container, resize handle, scroll container, search state |
| `SuggestionSection` | New — renders a section banner + masonry grid of cards for one section |
| `SectionBanner` | New — full-width banner with title, subtitle, background tint |
| `SuggestionCard` | Updated — add "why" banner overlay, add action strip (Save / Schedule) |
| `ResizeDivider` | New — vertical drag handle, dispatches width changes, persists to localStorage |
| `useSuggestions` | Updated — handle both sectioned and flat response shapes, client-side fallback grouping |
| `useResizablePanel` | New — manages panel width state, ResizeObserver for column count, localStorage persistence |

### Interaction Behavior

- **Drag to calendar** — preserved. Cards remain `useDraggable` via dnd-kit.
- **Click card** — opens the existing `CardPopover` with expanded details.
- **Save button** — adds to `favorite_places` table via existing Supabase service (fire-and-forget).
- **+ Schedule button** — same behavior as dragging onto calendar, but auto-places into the next available slot on the selected day. Opens a lightweight day picker if needed.
- **Resize divider** — `onPointerDown` starts tracking, `onPointerMove` updates width, `onPointerUp` commits and persists. Panel smoothly resizes; calendar grid adjusts via flex layout.

### Accessibility

- Resize divider has `role="separator"` with `aria-orientation="vertical"` and `aria-valuenow` reflecting current width
- Keyboard resize: arrow keys adjust width in 20px increments when divider is focused
- Section banners are `role="heading" aria-level="3"`
- Action strip buttons have clear labels and focus styles
