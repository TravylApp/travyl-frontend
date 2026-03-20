# Card Popover Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add click-to-popover behavior on SuggestionCards and EventBlocks in the calendar, showing activity details and contextual actions.

**Architecture:** A single shared `CardPopover` component renders a floating popover anchored to the clicked card. `ForYouPanel` manages popover state for suggestions; `CalendarDashboard` manages popover state for event blocks (since it owns `selectedEventId`). The `formatDuration` helper is extracted to `utils.ts` for reuse.

**Tech Stack:** React, motion (Framer Motion), @dnd-kit/core, existing calendar CSS variables

**Spec:** `docs/superpowers/specs/2026-03-19-card-popover-design.md`

---

## Chunk 1: Shared utilities and CardPopover component

### Task 1: Extract formatDuration to shared utils

**Files:**
- Modify: `apps/web/components/calendar/utils.ts`
- Modify: `apps/web/components/calendar/SuggestionCard.tsx:37-41`

- [ ] **Step 1: Add formatDuration to utils.ts**

Add this function to `apps/web/components/calendar/utils.ts`:

```ts
export function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours % 1 === 0) return `${hours}h`
  return `${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`
}
```

- [ ] **Step 2: Update SuggestionCard to import from utils**

In `apps/web/components/calendar/SuggestionCard.tsx`:

1. Add to imports: `import { formatDuration } from './utils'`
2. Remove the local `formatDuration` function (lines 37-41)

- [ ] **Step 3: Verify the app still renders**

Run: `npm run web`
Expected: No errors, SuggestionCard duration labels render the same as before.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/utils.ts apps/web/components/calendar/SuggestionCard.tsx
git commit -m "refactor: extract formatDuration to calendar utils"
```

---

### Task 2: Create CardPopover component

**Files:**
- Create: `apps/web/components/calendar/CardPopover.tsx`

- [ ] **Step 1: Create the CardPopover component file**

Create `apps/web/components/calendar/CardPopover.tsx` with the full component:

```tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import { formatDuration } from './utils'

interface PopoverAction {
  label: string
  onClick: () => void
  variant: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
  tooltip?: string
}

interface CardPopoverProps {
  anchorEl: HTMLElement | null
  isOpen: boolean
  onClose: () => void
  position: 'left' | 'right'
  image?: string | null
  title: string
  category: string
  rating?: number
  price?: string
  duration?: string
  description?: string
  actions: PopoverAction[]
}

const POPOVER_WIDTH = 280
const ARROW_SIZE = 8
const VIEWPORT_PADDING = 12

function computePosition(
  anchorEl: HTMLElement,
  preferredSide: 'left' | 'right',
): { top: number; left: number; side: 'left' | 'right' } {
  const rect = anchorEl.getBoundingClientRect()
  const anchorCenterY = rect.top + rect.height / 2

  // Try preferred side first, fallback if not enough space
  let side = preferredSide
  if (preferredSide === 'left' && rect.left < POPOVER_WIDTH + VIEWPORT_PADDING + ARROW_SIZE) {
    side = 'right'
  } else if (preferredSide === 'right' && window.innerWidth - rect.right < POPOVER_WIDTH + VIEWPORT_PADDING + ARROW_SIZE) {
    side = 'left'
  }

  const left = side === 'left'
    ? rect.left - POPOVER_WIDTH - ARROW_SIZE
    : rect.right + ARROW_SIZE

  // Vertically center on the anchor, but clamp to viewport
  let top = anchorCenterY - 150 // rough center of popover
  top = Math.max(VIEWPORT_PADDING, Math.min(top, window.innerHeight - 400 - VIEWPORT_PADDING))

  return { top, left, side }
}

export function CardPopover({
  anchorEl,
  isOpen,
  onClose,
  position,
  image,
  title,
  category,
  rating,
  price,
  duration,
  description,
  actions,
}: CardPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; side: 'left' | 'right' } | null>(null)

  // Compute position when anchor changes
  useEffect(() => {
    if (isOpen && anchorEl) {
      setPos(computePosition(anchorEl, position))
    }
  }, [isOpen, anchorEl, position])

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    // Delay to avoid the opening click immediately closing
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen, onClose, anchorEl])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Scroll to close — capture phase catches scroll in any container
  useEffect(() => {
    if (!isOpen) return
    function handleScroll() {
      onClose()
    }
    document.addEventListener('scroll', handleScroll, { capture: true })
    return () => document.removeEventListener('scroll', handleScroll, { capture: true })
  }, [isOpen, onClose])

  const tagColor = getActivityColor(category)

  return (
    <AnimatePresence>
      {isOpen && pos && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: POPOVER_WIDTH,
            zIndex: 100,
            transformOrigin: pos.side === 'left' ? 'right center' : 'left center',
          }}
          className="rounded-xl border border-[var(--cal-border)] bg-[var(--cal-surface-elevated)] shadow-xl overflow-hidden"
        >
          {/* Arrow */}
          <div
            className="absolute top-1/2 -translate-y-1/2"
            style={{
              [pos.side === 'left' ? 'right' : 'left']: -ARROW_SIZE,
              width: 0,
              height: 0,
              borderTop: `${ARROW_SIZE}px solid transparent`,
              borderBottom: `${ARROW_SIZE}px solid transparent`,
              [pos.side === 'left' ? 'borderLeft' : 'borderRight']: `${ARROW_SIZE}px solid var(--cal-surface-elevated)`,
            }}
          />

          {/* Image */}
          {image ? (
            <img
              src={image}
              alt=""
              className="w-full object-cover"
              style={{ height: 200 }}
              draggable={false}
            />
          ) : (
            <div
              className="w-full flex items-center justify-center text-white/60 text-3xl"
              style={{ height: 200, backgroundColor: tagColor }}
            >
              {category.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Content */}
          <div className="px-3 pt-2.5 pb-3">
            {/* Title */}
            <h3 className="text-sm font-bold text-[var(--cal-text)] leading-tight">
              {title}
            </h3>

            {/* Category + Duration */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className="inline-flex text-[10px] font-semibold px-[6px] py-[1px] rounded"
                style={{
                  background: `${tagColor}30`,
                  color: tagColor,
                }}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </span>
              {duration && (
                <>
                  <span className="text-[10px] text-[var(--cal-text-tertiary)]">·</span>
                  <span className="text-[10px] text-[var(--cal-text-secondary)]">{duration}</span>
                </>
              )}
            </div>

            {/* Rating + Price */}
            {(rating != null || price) && (
              <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                {rating != null && (
                  <span className="text-amber-500 font-semibold flex items-center gap-0.5">
                    ★ {rating}
                  </span>
                )}
                {price && (
                  <span className="text-[var(--cal-text-secondary)] font-medium">{price}</span>
                )}
              </div>
            )}

            {/* Description */}
            {description && (
              <p className="text-[11px] text-[var(--cal-text-secondary)] mt-2 line-clamp-3 leading-relaxed">
                {description}
              </p>
            )}

            {/* Divider + Actions */}
            {actions.length > 0 && (
              <>
                <div className="border-t border-[var(--cal-border-light)] mt-2.5 mb-2" />
                <div className="flex justify-end gap-1.5">
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      onClick={(e) => {
                        e.stopPropagation()
                        action.onClick()
                      }}
                      disabled={action.disabled}
                      title={action.disabled ? action.tooltip : undefined}
                      className={[
                        'text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors',
                        action.variant === 'primary'
                          ? 'bg-[#003594] text-white hover:bg-[#002a7a] disabled:opacity-50 disabled:cursor-not-allowed'
                          : action.variant === 'danger'
                            ? 'text-[var(--cal-text-secondary)] hover:text-red-500 hover:bg-red-500/10'
                            : 'text-[var(--cal-text-secondary)] hover:text-[var(--cal-text)] hover:bg-[var(--cal-border-light)]',
                      ].join(' ')}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npm run typecheck`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/CardPopover.tsx
git commit -m "feat: add CardPopover component"
```

---

## Chunk 2: SuggestionCard + ForYouPanel integration

### Task 3: Add click handler to SuggestionCard

**Files:**
- Modify: `apps/web/components/calendar/SuggestionCard.tsx`

- [ ] **Step 1: Add activation constraint and onClick prop**

In `apps/web/components/calendar/SuggestionCard.tsx`, make the following changes:

1. Update the interface to add `onClick`:

```ts
interface SuggestionCardProps {
  suggestion: SuggestionCardType
  onVisible?: () => void
  onClick?: (suggestion: SuggestionCardType, anchorEl: HTMLElement) => void
}
```

2. Update the component signature:

```ts
export function SuggestionCard({ suggestion, onVisible, onClick }: SuggestionCardProps) {
```

3. Add `activationConstraint` to `useDraggable` (line 16-19):

```ts
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `suggestion-${suggestion.id}`,
      data: { type: 'suggestion' as const, suggestion },
      activationConstraint: { distance: 5 },
    })
```

4. Add a click handler function after the `useEffect`:

```ts
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(suggestion, e.currentTarget)
  }
```

5. Add `onClick={handleClick}` to the root div (after `{...listeners}`, line 48):

```tsx
      onClick={handleClick}
```

- [ ] **Step 2: Verify drag still works**

Run: `npm run web`, navigate to a trip, verify:
- Dragging a suggestion card still works (moves after 5px)
- Clicking without dragging doesn't break anything (onClick not wired yet)

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/SuggestionCard.tsx
git commit -m "feat: add click handler and activation constraint to SuggestionCard"
```

---

### Task 4: Wire popover into ForYouPanel

**Files:**
- Modify: `apps/web/components/calendar/ForYouPanel.tsx`

- [ ] **Step 1: Add popover state and render CardPopover**

In `apps/web/components/calendar/ForYouPanel.tsx`:

1. Add imports:

```ts
import { useState, useCallback } from 'react'
import { CardPopover } from './CardPopover'
import { formatDuration } from './utils'
import type { SuggestionCard as SuggestionCardType } from './types'
```

2. Add state inside the `ForYouPanel` component, after the `useInteractionTracking` call (line 33):

```ts
  const [popoverSuggestion, setPopoverSuggestion] = useState<SuggestionCardType | null>(null)
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null)

  const handleCardClick = useCallback((suggestion: SuggestionCardType, anchorEl: HTMLElement) => {
    if (popoverSuggestion?.id === suggestion.id) {
      setPopoverSuggestion(null)
      setPopoverAnchor(null)
    } else {
      setPopoverSuggestion(suggestion)
      setPopoverAnchor(anchorEl)
    }
  }, [popoverSuggestion?.id])

  const handlePopoverClose = useCallback(() => {
    setPopoverSuggestion(null)
    setPopoverAnchor(null)
  }, [])

  const formatPrice = (price: number | null, currency: string) => {
    if (price === null || price === 0) return 'Free'
    return `€${price}`
  }
```

3. Pass `onClick` to each `SuggestionCard` (around line 130):

```tsx
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onVisible={() => trackEvent(suggestion.id, 'impression')}
                onClick={handleCardClick}
              />
```

4. Add the `CardPopover` render right before the closing `</aside>` tag (line 146):

```tsx
      <CardPopover
        anchorEl={popoverAnchor}
        isOpen={!!popoverSuggestion}
        onClose={handlePopoverClose}
        position="left"
        image={popoverSuggestion?.imageUrl}
        title={popoverSuggestion?.name ?? ''}
        category={popoverSuggestion?.category ?? ''}
        rating={popoverSuggestion?.rating ?? undefined}
        price={popoverSuggestion ? formatPrice(popoverSuggestion.price, popoverSuggestion.currency) : undefined}
        duration={popoverSuggestion ? formatDuration(popoverSuggestion.duration) : undefined}
        description={popoverSuggestion?.description}
        actions={popoverSuggestion ? [
          {
            label: 'Add to calendar',
            onClick: () => {
              // Will be wired to addActivity in a later task if needed
              handlePopoverClose()
            },
            variant: 'primary' as const,
          },
        ] : []}
      />
```

Note: The "Add to calendar" action is a placeholder that closes the popover. Full wiring to `addActivity` requires passing it down from `CalendarDashboard`, which is a separate concern and can be added later. The popover itself is the deliverable here.

- [ ] **Step 2: Test the popover**

Run: `npm run web`, navigate to a trip page.
Expected:
- Click a SuggestionCard → popover appears to the left with image, name, category, rating, price, duration, description
- Click outside → popover dismisses
- Press Escape → popover dismisses
- Click another card → popover swaps to new card
- Drag a card → popover does NOT open, drag works normally
- Scroll the ForYou panel → popover dismisses

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/ForYouPanel.tsx
git commit -m "feat: wire CardPopover into ForYouPanel for suggestion cards"
```

---

## Chunk 3: EventBlock integration

### Task 5: Add click handler and activation constraint to EventBlock

**Files:**
- Modify: `apps/web/components/calendar/EventBlock.tsx`

- [ ] **Step 1: Update EventBlock props and behavior**

In `apps/web/components/calendar/EventBlock.tsx`:

1. Update the `EventBlockProps` interface — replace `onSelect` with `onClickEvent`:

```ts
interface EventBlockProps {
  activity: CalendarActivity
  viewers?: UserAwareness[]
  isSelected?: boolean
  onClickEvent: (id: string, anchorEl: HTMLElement) => void
  timeRangeStartHour: number
  column?: number
  totalColumns?: number
  hiddenCount?: number
}
```

2. Update the destructured props:

```ts
export function EventBlock({
  activity,
  viewers = [],
  isSelected = false,
  onClickEvent,
  timeRangeStartHour,
  column = 0,
  totalColumns = 1,
  hiddenCount = 0,
}: EventBlockProps) {
```

3. Add `activationConstraint` to `useDraggable` (line 35-38):

```ts
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: activity.id,
    data: { type: 'activity' as const, activity },
    activationConstraint: { distance: 5 },
  })
```

4. Update the click and keyboard handlers:

```ts
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onClickEvent(activity.id, e.currentTarget)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClickEvent(activity.id, e.currentTarget as HTMLElement)
    }
  }
```

5. Update the className array — remove the selection ring (`ring-white ring-offset-1` when `isSelected`), keep hover feedback and focus ring (lines 91-98):

```ts
      className={[
        'rounded-md cursor-grab active:cursor-grabbing overflow-hidden select-none relative',
        'text-white text-xs',
        'ring-2 ring-transparent',
        isDragging ? '' : 'transition-[ring,shadow,opacity] duration-150 hover:-translate-y-px hover:shadow-lg hover:ring-white/40',
        'focus:outline-none focus:ring-white focus:ring-offset-1',
      ].join(' ')}
```

6. Update `onClick` on the root div (line 99):

```tsx
      onClick={handleClick}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npm run typecheck`
Expected: Errors in `DayColumn.tsx` because it still passes `onSelect` — that's expected and fixed in the next task.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/EventBlock.tsx
git commit -m "feat: update EventBlock with click-to-popover handler and activation constraint"
```

---

### Task 6: Update DayColumn, WeekView, DayView, and CalendarDashboard

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx`
- Modify: `apps/web/components/calendar/WeekView.tsx`
- Modify: `apps/web/components/calendar/DayView.tsx`
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Update DayColumn**

In `apps/web/components/calendar/DayColumn.tsx`:

1. Update the `DayColumnProps` interface — rename `onSelectEvent` to `onClickEvent`:

```ts
  onClickEvent: (id: string, anchorEl: HTMLElement) => void
```

2. Update destructured props accordingly.

3. Pass `onClickEvent` to `EventBlock` instead of `onSelect` (around line 254-259):

```tsx
            <EventBlock
              key={activity.id}
              activity={activity}
              viewers={viewers}
              isSelected={selectedEventId === activity.id}
              onClickEvent={onClickEvent}
              timeRangeStartHour={timeRange.startHour}
              column={layout.column}
              totalColumns={layout.totalColumns}
              hiddenCount={hiddenByCluster.get(activity.id) ?? 0}
            />
```

- [ ] **Step 2: Update WeekView**

In `apps/web/components/calendar/WeekView.tsx`:

1. Update `WeekViewProps` — rename `onSelectEvent` to `onClickEvent`:

```ts
  onClickEvent: (id: string, anchorEl: HTMLElement) => void
```

2. Update destructured props.

3. Pass `onClickEvent` to `DayColumn` (around line 53):

```tsx
              onClickEvent={onClickEvent}
```

4. Update the Escape key handler (line 31-34) — this no longer needs the `onSelectEvent('')` call since escape is handled by the popover. Remove the `handleKeyDown` and the `onKeyDown` prop from the root div, or keep it but call `onClickEvent` with empty string and a dummy element. Simplest: remove the Escape handler entirely since CardPopover handles its own Escape.

```ts
  // Remove handleKeyDown and onKeyDown from the div
```

- [ ] **Step 3: Update DayView**

In `apps/web/components/calendar/DayView.tsx`:

1. Update `DayViewProps` — rename `onSelectEvent` to `onClickEvent`:

```ts
  onClickEvent: (id: string, anchorEl: HTMLElement) => void
```

2. Update destructured props.

3. Pass `onClickEvent` to `DayColumn`:

```tsx
              onClickEvent={onClickEvent}
```

- [ ] **Step 4: Update CalendarDashboard**

In `apps/web/components/calendar/CalendarDashboard.tsx`:

1. Add imports:

```ts
import { CardPopover } from './CardPopover'
import { formatDuration } from './utils'
```

2. Add popover state after the existing state declarations (around line 92):

```ts
  const [popoverEventId, setPopoverEventId] = useState<string | null>(null)
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null)
```

3. Replace the existing `handleSelectEvent` function (line 253-255) with:

```ts
  const handleClickEvent = (id: string, anchorEl: HTMLElement) => {
    if (popoverEventId === id) {
      // Toggle off
      setPopoverEventId(null)
      setPopoverAnchor(null)
      selectEvent(null)
    } else {
      setPopoverEventId(id)
      setPopoverAnchor(anchorEl)
      selectEvent(id)
    }
  }

  const handlePopoverClose = () => {
    setPopoverEventId(null)
    setPopoverAnchor(null)
    selectEvent(null)
  }
```

4. Update `WeekView` and `DayView` usage — change `onSelectEvent={handleSelectEvent}` to `onClickEvent={handleClickEvent}`:

In the WeekView render (~line 369):
```tsx
                      onClickEvent={handleClickEvent}
```

In the DayView render (~line 392):
```tsx
                      onClickEvent={handleClickEvent}
```

5. Derive the popover activity from state:

```ts
  const popoverActivity = useMemo(
    () => activities.find((a) => a.id === popoverEventId) ?? null,
    [activities, popoverEventId],
  )
```

6. Add `CardPopover` for event blocks. Place it **after the entire `activeNav` ternary** (after line 481), still inside the main column `<div>` that closes at line 482. This avoids needing a Fragment wrapper inside the ternary:

```tsx
          {/* Event block popover — placed outside ternary, uses fixed positioning */}
          <CardPopover
            anchorEl={popoverAnchor}
            isOpen={!!popoverActivity}
            onClose={handlePopoverClose}
            position="right"
            image={popoverActivity?.image}
            title={popoverActivity?.title ?? ''}
            category={popoverActivity?.type ?? ''}
            rating={popoverActivity?.rating}
            price={popoverActivity?.price ?? undefined}
            duration={popoverActivity ? formatDuration(popoverActivity.duration) : undefined}
            actions={popoverActivity ? [
              {
                label: 'Edit',
                onClick: () => {
                  const activityId = popoverActivity.id
                  setPopoverEventId(null)
                  setPopoverAnchor(null)
                  selectEvent(activityId)
                },
                variant: 'ghost' as const,
              },
              {
                label: 'Delete',
                onClick: () => {
                  handleRemoveActivity(popoverActivity.id)
                  setPopoverEventId(null)
                  setPopoverAnchor(null)
                },
                variant: 'danger' as const,
              },
            ] : []}
          />
```

Note on the "Edit" action: it captures `popoverActivity.id` before clearing popover state, then calls `selectEvent(id)` to open the DetailPanel. This avoids the double-call issue of `handlePopoverClose()` (which calls `selectEvent(null)`) followed by `selectEvent(id)`.

7. Remove the `formatEventPrice` helper added in point 4 — it's unnecessary. Use `popoverActivity?.price ?? undefined` directly (as shown in point 7 above).

- [ ] **Step 5: Verify everything compiles**

Run: `npm run typecheck`
Expected: No TypeScript errors.

- [ ] **Step 6: Test end-to-end**

Run: `npm run web`, navigate to a trip.
Expected:
- Click an EventBlock → popover appears to the right with title, category, duration, image
- "Edit" button → popover closes, DetailPanel opens for that activity
- "Delete" button → activity is removed, popover closes
- Click outside → popover closes
- Escape → popover closes
- Drag an EventBlock → popover does NOT open, drag works normally
- Click a SuggestionCard → suggestion popover appears to the left (from Task 4)
- Both popovers cannot be open simultaneously (clicking one card type closes any open popover from the other)

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx apps/web/components/calendar/WeekView.tsx apps/web/components/calendar/DayView.tsx apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire CardPopover into EventBlock via CalendarDashboard"
```
