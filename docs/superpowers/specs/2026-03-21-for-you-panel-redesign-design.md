# For You Panel Redesign — Pinterest-Style Sectioned Feed

## Goal

Transform the ForYouPanel from a flat masonry grid with filter chips into a rich, sectioned discovery feed with contextual recommendation groups, responsive column layout, and visually distinctive cards.

## Current State

- `ForYouPanel.tsx` — fixed-width sidebar in the trip calendar view
- Flat 2-column flex layout (even/odd index distribution) of `SuggestionCard` components
- Category filter chips (All, Sightseeing, Dining, etc.) at the top
- Single "Recommended for {destination}" section label
- Search bar for client-side text filtering
- Cards: image with gradient overlay, name, category pill, duration; price badge top-left, rating badge top-right
- Cards are draggable via dnd-kit onto the calendar
- `useSuggestions` hook fetches from `${NEXT_PUBLIC_RECOMMENDATION_API_URL}/recommend` (authenticated Lambda) with `/api/suggest` Next.js proxy as fallback; supports infinite scroll via `useInfiniteQuery` with 20-item pages

## Design

### Card Design: Context-Forward Overlay + Action Strip

Image-dominant cards (Pinterest style) with two additions over current design:

1. **"Why" banner** — a subtle gradient text overlay at the top of the card image explaining the recommendation reason (e.g. "Because you liked Musee d'Orsay", "Popular in Montmartre"). Uses the existing `reason` field on `SuggestionCard`.
2. **Action strip** — a thin bar at the bottom of each card with two buttons separated by a border: **Save** (adds to favorites) and **+ Schedule** (quick-adds to calendar). Action strip buttons must call `event.stopPropagation()` to avoid triggering the card's click handler, and must not have dnd-kit drag listeners attached (only the card body has `{...listeners}`).

Card metadata relocates to the bottom gradient overlay: name, category pill, rating, duration, price. The current top-left price badge and top-right rating badge move into the bottom overlay for a cleaner image-dominant look. Varying image heights for masonry effect (preserved from current implementation).

### Section Headers: Full-Width Banners

Inline banner cards that span all columns, visually breaking the feed into recommendation zones. Each banner has:

- Section title text (e.g. "Popular in Paris")
- Subtle background tint or gradient per section type, using CSS custom properties (`--cal-*`) for dark/light theme support
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

**Empty sections** — sections with zero suggestions (after removing scheduled/dismissed items) are hidden entirely. No empty state per section.

### Responsive Width: Draggable Divider

Replace the fixed `FOR_YOU_PANEL_WIDTH` constant with a resizable panel:

- **Draggable divider** — a vertical resize handle between the calendar grid and the For You panel
- Drag left to expand the panel, drag right to shrink it
- **Min width:** ~280px (2 columns)
- **Max width:** ~600px (3 columns)
- **Column breakpoint:** < 360px = 2 columns, >= 360px = 3 columns
- Implemented via `ResizeObserver` on the panel container to determine column count
- User's preferred width persisted to `localStorage` key `travyl:forYouPanelWidth` and restored on mount
- Resize divider uses `onPointerDown`/`onPointerMove`/`onPointerUp` with `touch-action: none` CSS to prevent scroll interference on touch devices

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

**New types in `packages/shared/src/types/index.ts`:**

```typescript
interface RecommendationSection {
  sectionType: 'destination' | 'category' | 'affinity' | 'schedule' | 'social'
  sectionTitle: string
  sectionSubtitle?: string
  suggestions: SuggestionCard[]
}

interface RecommendResponse {
  sections: RecommendationSection[]
}
```

Note: The React component is named `SuggestionSection` while the data interface is `RecommendationSection` to avoid name collision.

**Pagination strategy:** The `/recommend` endpoint returns sections with a flat cursor. Each response contains N sections; the `start` parameter is a global offset across all suggestions (not per-section). The client accumulates sections across pages. If a section spans a page boundary, the next page continues appending to the last section of the previous page (matched by `sectionTitle`). This preserves the existing `useInfiniteQuery` pagination model with minimal changes.

**Backend migration:** The Lambda at `services/suggest.ts` is updated to return the new `{ sections }` shape. During rollout, the endpoint checks for a `format=sections` query parameter; without it, the existing flat `{ suggestions }` shape is returned for backward compatibility. The frontend sends `format=sections` once the new UI ships.

**Fallback grouping:** When the backend returns a flat list (current `/api/suggest` fallback or missing `format` param), the client groups suggestions by category into sections with generated headers (e.g. category "dining" becomes section titled "Top Dining Spots").

**`useSuggestions` hook refactor:** Remove `activeFilter`, `setActiveFilter`, and `filterCategories` from the hook's return value. The `useInfiniteQuery` key changes from `['suggestions', destination, activeFilter]` to `['suggestions', destination, 'sections']`. The hook always requests `category: 'all'` from the backend. A new `sections` computed property (array of `RecommendationSection`) is exposed alongside the existing flat `suggestions` array (used during search).

**SuggestionCard updates:** The existing `reason` field is used for the per-card "why" banner text. No type changes needed.

### Prerequisites

**`useFavoritePlaces` hook/service:** No client-side code exists for the `favorite_places` Supabase table. A new hook must be created in `packages/shared/src/hooks/` that provides `addFavorite(suggestion)` and `removeFavorite(id)` mutations. This is a prerequisite for the Save button. If this blocks the main work, Save can render as a disabled button with a tooltip "Coming soon" in the initial implementation.

### Panel Structure (top to bottom)

1. **Header** — "For You" title + search bar (no filter chips)
2. **Scrollable feed** — alternating section banners and masonry card grids
3. **Infinite scroll sentinel** — triggers next page fetch (preserved)
4. **Footer hint** — "Drag any card onto the calendar to schedule it" (preserved)

### Component Breakdown

All new components live in `apps/web/components/calendar/`. New hooks live in `apps/web/components/calendar/hooks/`.

| Component | Responsibility |
|-----------|---------------|
| `ForYouPanel` | Panel container, scroll container, search state, section rendering |
| `SuggestionSection` | New — renders a `SectionBanner` + masonry grid of cards for one `RecommendationSection` |
| `SectionBanner` | New — full-width banner with title, subtitle, background tint. Uses `--cal-*` CSS vars for theming. |
| `SuggestionCard` | Updated — add "why" banner overlay at top, relocate price/rating to bottom overlay, add action strip |
| `ResizeDivider` | New — vertical drag handle between calendar and panel |
| `useSuggestions` | Updated — handle both sectioned and flat response shapes, remove filter state, expose `sections` |
| `useResizablePanel` | New — manages panel width state, ResizeObserver for column count, localStorage persistence |

### Interaction Behavior

- **Drag to calendar** — preserved. Cards remain `useDraggable` via dnd-kit. Drag listeners stay on the card body, not on action strip buttons.
- **Click card** — opens the existing `CardPopover` with expanded details.
- **Save button** — adds to `favorite_places` table via new `useFavoritePlaces` hook (fire-and-forget). Initially disabled if hook is not yet implemented.
- **+ Schedule button** — calls the existing `createActivity` mutation from `useActivityMutations` with the suggestion data, placing it on the currently selected day at the next available time slot (after the last activity's end time, or 09:00 if empty). No day picker in v1 — uses the calendar's selected day.
- **Resize divider** — `onPointerDown` starts tracking, `onPointerMove` updates width, `onPointerUp` commits and persists. Panel smoothly resizes; calendar grid adjusts via flex layout.

### Loading State

Skeleton state shows:
- 1 section banner placeholder (full-width rounded rect)
- 2-column card placeholders with varying heights (matching current skeleton pattern)
- Repeated once for a second section

### Accessibility

- Resize divider has `role="separator"` with `aria-orientation="vertical"` and `aria-valuenow` reflecting current width
- Keyboard resize: arrow keys adjust width in 20px increments when divider is focused
- Section banners use `<h3>` elements (under the panel's existing `<h2>` "For You" heading) for proper heading hierarchy
- Action strip buttons have clear labels and visible focus styles
