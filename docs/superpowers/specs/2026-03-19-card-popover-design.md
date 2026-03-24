# Card Popover — Design Spec

## Goal

Replace the current click behavior on SuggestionCards (ForYou panel) and EventBlocks (calendar grid) with a floating popover that shows activity details and contextual actions. Keeps users in the calendar flow without opening a full modal.

## Scope

- New `CardPopover` component shared by both card types
- Click handler integration in `SuggestionCard` and `EventBlock`
- No new data fetching — uses existing loaded data
- No changes to drag-and-drop behavior

## Component: CardPopover

### Props

```ts
interface CardPopoverProps {
  anchorEl: HTMLElement | null    // the clicked card element
  isOpen: boolean
  onClose: () => void
  position: 'left' | 'right'    // which side of the anchor to appear
  image?: string | null
  title: string
  category: string
  rating?: number               // undefined if unavailable
  price?: string                // pre-formatted string (e.g. "€12", "Free")
  duration?: string
  description?: string          // always present for suggestions, may be absent for events
  actions: Array<{
    label: string
    onClick: () => void
    variant: 'primary' | 'ghost' | 'danger'
  }>
}
```

### Layout (top to bottom)

1. **Image** — ~200px tall, rounded top corners, object-cover. Falls back to category-colored placeholder if no image.
2. **Title** — bold, `var(--cal-text)`
3. **Category tag + duration** — inline row. Category uses existing `getActivityColor()` tinted badge. Duration as text.
4. **Rating + price** — inline row. Star icon + number for rating, formatted price or "Free".
5. **Description** — 2-3 line clamp, `var(--cal-text-secondary)`. Omitted entirely if null/empty.
6. **Divider** — 1px `var(--cal-border-light)`
7. **Action buttons** — right-aligned row at the bottom.

### Positioning

- **SuggestionCard**: popover appears to the **left** of the card (panel is on the right edge of the screen).
- **EventBlock**: popover appears to the **right** of the clicked block.
- **Fallback**: if insufficient viewport space on the preferred side, flip to the opposite side.
- **Arrow**: 8px CSS triangle pointing at the source card, matching the popover background color.
- Positioned via absolute/fixed positioning calculated from `anchorEl.getBoundingClientRect()`.

### Sizing

- Width: 280px
- Max height: constrained to viewport with overflow-y auto if needed
- Border radius: 12px (`rounded-xl`)

### Styling

- Background: `var(--cal-surface-elevated)`
- Border: `1px solid var(--cal-border)`
- Shadow: `shadow-xl`
- Dark mode handled automatically via existing calendar CSS variables

### Action button variants

| Variant | Style |
|---------|-------|
| `primary` | Filled `#003594` background, white text |
| `ghost` | Transparent background, `var(--cal-text-secondary)` text |
| `danger` | Transparent background, red text on hover |

### Animation

- **Enter**: fade in (0 → 1 opacity) + scale (0.95 → 1.0), 150ms ease-out. Via `motion` library (`AnimatePresence` + `motion.div`).
- **Exit**: fade out (1 → 0) + scale (1.0 → 0.97), 100ms ease-in.
- Transform origin set toward the anchor side for natural feel.

### Dismiss behavior

- Click outside closes the popover
- Escape key closes the popover
- Only one popover open at a time — clicking another card closes the current one and opens the new one
- Scrolling any container (calendar grid or ForYou panel) closes the popover

## Integration: SuggestionCard

**Click vs drag distinction**: Both `SuggestionCard` and `EventBlock` use `useDraggable` from `@dnd-kit/core`. Currently neither has an `activationConstraint`. To distinguish click from drag, add `activationConstraint: { distance: 5 }` to both `useDraggable` calls. This means the pointer must move 5px before a drag starts — anything shorter is a click. Then add a standard `onClick` handler to the root div.

**Data mapping**:
| Popover prop | Source |
|---|---|
| `image` | `suggestion.imageUrl` |
| `title` | `suggestion.name` |
| `category` | `suggestion.category` |
| `rating` | `suggestion.rating` |
| `price` | Format using existing `formatPrice` from `SuggestionCard` (currently hardcodes `€` — reuse as-is) |
| `duration` | `suggestion.duration` (formatted via existing `formatDuration`) |
| `description` | `suggestion.description` (always present — `string` type on `SuggestionCard`) |

**Actions**:
- "Add to calendar" (`primary`) — constructs a `CalendarActivity` from the suggestion data and calls `addActivity` from `useActivityMutations`, targeting the currently selected day and the next available sort order. If no day is currently selected (e.g. week view with no focus), the button is disabled with a tooltip "Select a day first".

**Position**: `'left'`

**State management**: Popover open/close state lives in `ForYouPanel` (or a small `usePopover` hook). The selected suggestion ID is tracked; clicking a card sets it, clicking outside or Escape clears it.

## Integration: EventBlock

**Click vs drag distinction**: Same activation constraint approach as SuggestionCard — add `activationConstraint: { distance: 5 }` to `useDraggable`. Current `onClick` calls `onSelect(activity.id)` which highlights the block. This changes to open the popover instead. The `isSelected` state is repurposed: when a popover is open for an event, that event is considered "selected" (preserving the elevated `zIndex: 10` for overlapping events). The visual selection ring (`ring-white ring-offset-1`) is removed — the open popover itself indicates selection. Keyboard behavior: Enter/Space on a focused EventBlock opens the popover (same as click). `aria-selected` remains bound to `isSelected`. `focus:ring` styles remain for keyboard focus indication (distinct from selection ring).

**Data mapping**:
| Popover prop | Source |
|---|---|
| `image` | `activity.image` |
| `title` | `activity.title` |
| `category` | `activity.type` |
| `rating` | `activity.rating` (optional on `CalendarActivity`) |
| `price` | `activity.price` (pre-formatted string on `CalendarActivity`, e.g. `"€12"`) |
| `duration` | Format as duration string from `activity.duration` (e.g. `"1h"`, `"2h 30m"`) using same `formatDuration` logic as SuggestionCard — not `formatTimeRange` which produces a range like "9 AM – 10 AM" |
| `description` | Not available on `CalendarActivity` — omitted for event blocks |

**Actions**:
- "Edit" (`ghost`) — for now, calls the existing `onSelect` callback (which selects the activity). A full edit modal is out of scope; this button acts as the selection trigger that could be extended later.
- "Delete" (`danger`) — calls `removeActivity` from `useActivityMutations`

**Position**: `'right'`

**State management**: The parent component managing the calendar day view tracks which event block has an open popover. Selecting a new block swaps the popover.

## Files to create/modify

| File | Action |
|---|---|
| `apps/web/components/calendar/CardPopover.tsx` | **Create** — the shared popover component |
| `apps/web/components/calendar/SuggestionCard.tsx` | **Modify** — add onClick handler, pass popover state up |
| `apps/web/components/calendar/ForYouPanel.tsx` | **Modify** — manage popover state, render CardPopover |
| `apps/web/components/calendar/EventBlock.tsx` | **Modify** — change onClick to open popover instead of just selecting |
| `apps/web/components/calendar/DayColumn.tsx` (or parent view component) | **Modify** — manage popover state for event blocks. Popover state may need to live in `CalendarDashboard` or the view components (`WeekView`/`DayView`) since `DayColumn` doesn't own selection state today. |

## Out of scope

- Map view in the popover
- Photo gallery / multiple images
- Opening hours or tips
- New data fetching or API calls
- Changes to the existing drag-and-drop behavior
- Mobile responsiveness (web-only feature)
