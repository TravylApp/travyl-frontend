# Suggestion Detail Drawer + Image Navigation — Design Spec

**Date:** 2026-03-25
**Branch:** feature/tra-264
**Scope:** For You panel — click-through image arrows on cards + right-drawer detail view

---

## Overview

Two related UX improvements to the For You suggestion cards:

1. **Image arrows** — left/right arrow buttons on the card image, visible on hover, to manually click through photos.
2. **Detail drawer** — clicking a card opens a right-side overlay panel inside the For You panel showing full detail (large photo carousel, name, rating, price, category, location, description). Purely informational; users still drag from the card list to schedule.

---

## Type Clarification

The shared data type is `SuggestionCard` (from `@travyl/shared`). The React component that renders a card is also named `SuggestionCard` (in `apps/web/components/calendar/SuggestionCard.tsx`). Throughout this spec, **`SuggestionCard` (type)** refers to the data shape, and **`<SuggestionCard>`** refers to the component. The new drawer component is `<SuggestionDetailDrawer>` and receives a `suggestion: SuggestionCard` prop.

---

## Feature 1: Card Image Arrow Navigation

### Current behavior
Images auto-cycle every 1800ms on hover. No manual navigation.

### New behavior
- On image hover, left (`<`) and right (`>`) arrow `<button>` elements appear on the left/right edges of the image area.
- Buttons are only shown when `isHovered && images.length > 1`.
- Left arrow is hidden (or disabled) when `activeIdx === 0`. Right arrow is hidden when `activeIdx === images.length - 1`.
- Clicking an arrow: calls `setActiveIdx`, resets the auto-cycle timer (clear + restart the interval), and calls `e.stopPropagation()` so the card's click handler (which opens the drawer) is not triggered.
- Auto-cycle on hover is preserved alongside manual navigation.
- Dot indicators continue reflecting the current index.
- Arrow buttons have `aria-label="Previous photo"` / `aria-label="Next photo"`.

---

## Feature 2: Right-Side Detail Drawer

### Drag vs. Click Distinction

dnd-kit's `isDragging` flag is `false` by the time the `click` event fires (pointer has been released). To distinguish a completed drag from a tap/click, use a ref:

```ts
const didDragRef = useRef(false)
// In drag event handlers (onDragStart / onMouseMove threshold):
didDragRef.current = true
// In onClick:
if (didDragRef.current) { didDragRef.current = false; return }
onSelect(suggestion)
```

Specifically: attach an `onMouseDown` that sets `didDragRef.current = false`, and use the dnd-kit `useDraggable` listeners' `onDragStart` event (from the `listeners` spread) to set `didDragRef.current = true`. Do not use a custom `onMouseMove` threshold — rely solely on dnd-kit's `onDragStart`. On `onClick`, check and reset the ref before calling `onSelect`.

### State in ForYouPanel

```ts
const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionCard | null>(null)
```

`ForYouPanel` must have `position: relative` (add `relative` Tailwind class) to serve as the positioning context for the absolutely-positioned drawer overlay.

### Layout

The drawer renders as an `absolute inset-y-0 right-0` overlay inside `ForYouPanel`, with a fixed width equal to the full panel width (i.e., `w-full`). The card list stays mounted underneath.

Entry animation: `transition-transform duration-300 ease-out`, translates from `translate-x-full` to `translate-x-0`.

Exit: `ForYouPanel` owns an `isClosing: boolean` state. `onClose` (passed to `<SuggestionDetailDrawer>`) is a function defined in `ForYouPanel` that sets `isClosing = true` and starts a 300ms timeout, after which it sets `selectedSuggestion = null` and `isClosing = false`. `isClosing` is passed as a prop to `<SuggestionDetailDrawer>`, which applies `translate-x-full` when `isClosing` is true, driving the exit animation.

`<SuggestionDetailDrawer>` is **conditionally rendered** — mounted only when `selectedSuggestion !== null`. During the exit sequence, `isClosing` is `true` but `selectedSuggestion` is still non-null, so the component remains mounted and visible through the slide-out animation. After the 300ms timeout, `selectedSuggestion` is nulled and the component unmounts. The Esc key listener `useEffect` inside `SuggestionDetailDrawer` naturally attaches and detaches with the mount/unmount cycle.

### Drawer Structure

The drawer has a **fixed-height layout** that fills the panel height:
- **Sticky header zone** (non-scrolling): photo carousel + close button.
- **Scrollable body**: name, meta row, location, description. Overflows with `overflow-y-auto`.

This prevents the photo from scrolling away immediately.

### Drawer Content (top to bottom)

1. **Close button** (`✕`) — absolutely positioned top-right within the header zone. `aria-label="Close detail"`.
2. **Photo carousel** — full-width image, fixed height (~200px). Left/right arrow navigation, same pattern as Feature 1 (arrows visible on hover, hidden at boundaries). Current index / total count shown as dot indicators. `onError` removes failed URLs, adjusts index if needed.
   - **No-images case**: show the same gradient placeholder used in the card (category-based `tagColor` gradient), no arrows shown.
3. **Scrollable body** (below the photo):
   - **Name** — large heading.
   - **Meta row** — star rating (if non-null), price symbols (if non-null), category badge.
   - **Location** — address string with a pin icon (if non-empty).
   - **Description** — full text (if non-empty).
   - **Duration** — "~N hours" hint.

### Dismissal

- Click the `✕` button → triggers close (sets `isClosing`).
- Press `Esc` → keydown listener added via `useEffect` when `selectedSuggestion !== null`, removed on cleanup. The handler calls `e.stopPropagation()` to avoid interfering with the existing `CommandPalette` Esc handler. The drawer listener should be added with `{ capture: true }` so it fires before the palette's bubbling listener when the drawer is open.
- No backdrop click-to-close (drawer is a panel overlay, not a full-screen modal).

### Esc Key Priority

The project already uses Esc to close the `CommandPalette`. Conflict resolution: the drawer's Esc listener is registered with `{ capture: true }` on `document`, calls `e.stopPropagation()`, and only fires when `selectedSuggestion !== null`. This ensures the drawer closes first if open; if the drawer is closed, Esc propagates normally to the palette.

---

## Component Structure

```
ForYouPanel  (position: relative)
├── state: selectedSuggestion: SuggestionCard | null
├── state: isClosing: boolean
├── onClose(): sets isClosing=true, 300ms → nulls selectedSuggestion
├── SuggestionsList
│   └── <SuggestionCard>  (each)
│       ├── image area with hover arrow buttons (stopPropagation on click)
│       ├── didDragRef for drag vs. click distinction
│       └── onClick → onSelect(suggestion)
└── {selectedSuggestion && (
    <SuggestionDetailDrawer
      suggestion={selectedSuggestion}
      isClosing={isClosing}
      onClose={onClose}
    />
  )}  — absolute overlay, conditionally mounted
    ├── sticky photo carousel with arrows + close button
    └── scrollable body: name, meta, location, description, duration
```

`SuggestionDetailDrawer` is a new file: `apps/web/components/calendar/SuggestionDetailDrawer.tsx`.

---

## Data Flow

- `<SuggestionCard>` receives `onSelect: (s: SuggestionCard) => void` prop.
- `onClick`: if `didDragRef.current`, reset and return. Otherwise call `onSelect(suggestion)`.
- Arrow button clicks call `e.stopPropagation()` to prevent `onSelect` from firing.
- `ForYouPanel` sets `selectedSuggestion` on select.
- Close: sets `isClosing = true`, waits 300ms, then nulls `selectedSuggestion`.
- `<SuggestionDetailDrawer>` receives `suggestion: SuggestionCard`, `isClosing: boolean`, and `onClose: () => void`. It applies `translate-x-full` when `isClosing` is true.

---

## Files Changed

| File | Change |
|------|--------|
| `apps/web/components/calendar/SuggestionCard.tsx` | Add hover arrow buttons with stopPropagation; add `onSelect` prop; drag/click ref pattern |
| `apps/web/components/calendar/ForYouPanel.tsx` | Add `selectedSuggestion` + `isClosing` state; add `relative` positioning; pass `onSelect`; render drawer |
| `apps/web/components/calendar/SuggestionDetailDrawer.tsx` | New — full detail overlay with photo carousel, scrollable body, Esc handler, exit animation |

---

## Out of Scope

- "Add to trip" button in the drawer — users drag from the card list as before.
- Map view of the location.
- Sharing or saving suggestions.
- Mobile-specific bottom sheet variant (desktop-only for now).
- Full keyboard tab navigation within the drawer (arrow buttons have aria-labels; full tab flow is deferred).
