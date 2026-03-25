# Suggestion Detail Drawer + Image Navigation — Design Spec

**Date:** 2026-03-25
**Branch:** feature/tra-263
**Scope:** For You panel — click-through image arrows on cards + right-drawer detail view

---

## Overview

Two related UX improvements to the For You suggestion cards:

1. **Image arrows** — left/right arrow buttons on the card image, visible on hover, to manually click through photos instead of only auto-cycling.
2. **Detail drawer** — clicking a card opens a right-side overlay panel inside the For You panel showing full detail (large photo carousel, name, rating, price, category, location, description). Purely informational; users still drag from the card list to schedule.

---

## Feature 1: Card Image Arrow Navigation

### Current behavior
Images auto-cycle every 1800ms on hover. No manual navigation.

### New behavior
- On image hover, left (`<`) and right (`>`) arrow buttons appear on the left/right edges of the image.
- Clicking an arrow navigates to the previous/next photo and resets the auto-cycle timer.
- Left arrow hidden when on the first image; right arrow hidden when on the last.
- Auto-cycle on hover is preserved alongside manual navigation.
- Dot indicators update to reflect current index (already implemented).

### Component changes
- `SuggestionCard.tsx` — add two arrow `<button>` elements absolutely positioned over the image area, visible when `isHovered && images.length > 1`. Clicking them calls `setActiveIdx` and stops event propagation so the card click (drawer open) is not triggered.

---

## Feature 2: Right-Side Detail Drawer

### Trigger
Clicking anywhere on a `SuggestionCard` that is **not** a drag start opens the drawer. The existing `useDraggable` hook from dnd-kit provides an `isDragging` flag — if a drag is detected, suppress the click handler.

### Layout
The drawer renders as an absolutely-positioned overlay inside `ForYouPanel`, covering the card list from the right. It slides in with a translate-x animation (from `translate-x-full` to `translate-x-0`). The card list remains mounted underneath.

### State
```ts
const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionCard | null>(null)
```
Lives in `ForYouPanel`. Passed down to `SuggestionCard` as an `onSelect` callback. Cleared by the drawer's close button or Esc key.

### Drawer content (top to bottom)
1. **Close button** (`✕`) — top-right corner.
2. **Photo carousel** — full-width image, same `imageUrls` array, with left/right arrow navigation. Shows current index / total count. `onError` handling same as card.
3. **Name** — large heading.
4. **Meta row** — rating (star + number), price ($ symbols), category badge.
5. **Location** — address string with a pin icon.
6. **Description** — full text, scrollable if long.
7. **Duration** — "~2 hours" hint.

### Dismissal
- Click the `✕` button.
- Press `Esc` (keydown listener added when drawer is open, removed on close).
- No backdrop click-to-close (drawer is an overlay within the panel, not a modal over the full page).

### Animations
- Entry: `transition-transform duration-300`, slides in from right.
- Exit: reverse translate, then unmount after transition completes (`transitionend` or a 300ms timeout).

---

## Component Structure

```
ForYouPanel
├── state: selectedSuggestion
├── SuggestionsList
│   └── SuggestionCard (each)
│       ├── image area with arrow buttons
│       └── onClick → onSelect(suggestion)  [suppressed during drag]
└── SuggestionDetailDrawer (conditional render)
    ├── photo carousel with arrows
    ├── name, meta, location, description
    └── close button + Esc handler
```

`SuggestionDetailDrawer` is a new component in `apps/web/components/calendar/`.

---

## Data Flow

- `SuggestionCard` receives `onSelect: (s: SuggestionCard) => void` prop.
- Click handler: `if (!isDragging) onSelect(suggestion)`.
- `ForYouPanel` sets `selectedSuggestion` on select, clears on drawer close.
- `SuggestionDetailDrawer` receives `suggestion: SuggestionCard` and `onClose: () => void`.

---

## Files Changed

| File | Change |
|------|--------|
| `apps/web/components/calendar/SuggestionCard.tsx` | Add arrow buttons; add `onSelect` prop; suppress click during drag |
| `apps/web/components/calendar/ForYouPanel.tsx` | Add `selectedSuggestion` state; pass `onSelect` to cards; render drawer |
| `apps/web/components/calendar/SuggestionDetailDrawer.tsx` | New component — full detail view with carousel and close logic |

---

## Out of Scope

- "Add to trip" button in the drawer — users drag from the card list as before.
- Map view of the location.
- Sharing or saving suggestions.
- Mobile-specific bottom sheet variant (desktop-only for now).
