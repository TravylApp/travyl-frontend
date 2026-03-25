# Suggestion Detail Drawer + Image Navigation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add hover arrow buttons to For You suggestion cards for manual photo navigation, and a right-side detail drawer that slides in when a card is clicked.

**Architecture:** `ForYouPanel` owns the drawer state (`selectedSuggestion`, `isClosing`). A new `SuggestionDetailDrawer` component renders as an absolute overlay inside `ForYouPanel`. `SuggestionCard` gains arrow buttons and an `onSelect` callback; drag vs. click is disambiguated with a ref that tracks whether dnd-kit started a drag during the current pointer interaction.

**Tech Stack:** React 19, dnd-kit (`@dnd-kit/core`), Tailwind CSS v4, TypeScript, iconoir-react icons, `motion/react` NOT used (plain CSS transitions only)

**Spec:** `docs/superpowers/specs/2026-03-25-suggestion-detail-drawer-design.md`

---

## Chunk 1: SuggestionCard — arrow buttons + onSelect + drag detection

### Task 1: Add `onSelect` prop, drag/click ref, and arrow buttons to SuggestionCard

**Files:**
- Modify: `apps/web/components/calendar/SuggestionCard.tsx`

No automated tests exist for web components. Verify manually in the browser after each task.

- [ ] **Step 1: Read the current file**

```bash
# Confirm current state before editing
cat apps/web/components/calendar/SuggestionCard.tsx
```

- [ ] **Step 2: Update the props interface and add imports**

In `apps/web/components/calendar/SuggestionCard.tsx`, replace the props interface and import line:

Replace:
```tsx
import { useEffect, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { SuggestionCard as SuggestionCardType } from './types'

interface SuggestionCardProps {
  suggestion: SuggestionCardType
  onVisible?: () => void
}
```

With:
```tsx
import { useEffect, useRef, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { SuggestionCard as SuggestionCardType } from './types'

interface SuggestionCardProps {
  suggestion: SuggestionCardType
  onVisible?: () => void
  onSelect?: (suggestion: SuggestionCardType) => void
}
```

- [ ] **Step 3: Add drag/click ref and cycleKey, extend listeners**

After the `useDraggable` call, add the following. Replace:
```tsx
export function SuggestionCard({ suggestion, onVisible }: SuggestionCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `suggestion-${suggestion.id}`,
      data: { type: 'suggestion' as const, suggestion },
    })

  useEffect(() => {
    onVisible?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [activeIdx, setActiveIdx] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())
```

With:
```tsx
export function SuggestionCard({ suggestion, onVisible, onSelect }: SuggestionCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `suggestion-${suggestion.id}`,
      data: { type: 'suggestion' as const, suggestion },
    })

  useEffect(() => {
    onVisible?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Drag vs. click detection: intercept dnd-kit listeners to track drag start/reset
  const didDragRef = useRef(false)
  const extendedListeners = listeners
    ? {
        ...listeners,
        onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
          didDragRef.current = false
          listeners.onPointerDown?.(e as any)
        },
        // onDragStart fires synchronously when dnd-kit activates a drag
        onDragStart: (e: any) => {
          didDragRef.current = true
          listeners.onDragStart?.(e)
        },
      }
    : {}

  const [activeIdx, setActiveIdx] = useState(0)
  const [cycleKey, setCycleKey] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())
```

- [ ] **Step 4: Update auto-cycle effect to use cycleKey**

Replace:
```tsx
  useEffect(() => {
    if (!hasMultiple || !isHovered) return
    const id = setInterval(() => {
      setActiveIdx(i => (i + 1) % images.length)
    }, 1800)
    return () => clearInterval(id)
  }, [isHovered, hasMultiple, images.length])
```

With:
```tsx
  useEffect(() => {
    if (!hasMultiple || !isHovered) return
    const id = setInterval(() => {
      setActiveIdx(i => (i + 1) % images.length)
    }, 1800)
    return () => clearInterval(id)
  }, [isHovered, hasMultiple, images.length, cycleKey])
```

- [ ] **Step 5: Add navigate helper and onClick handler**

Replace:
```tsx
  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    if (hours % 1 === 0) return `${hours}h`
    return `${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`
  }
```

With:
```tsx
  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    if (hours % 1 === 0) return `${hours}h`
    return `${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`
  }

  const navigate = (dir: 1 | -1, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveIdx(i => Math.max(0, Math.min(images.length - 1, i + dir)))
    setCycleKey(k => k + 1)
  }

  const handleClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false
      return
    }
    onSelect?.(suggestion)
  }
```

Then swap `{...listeners}` → `{...extendedListeners}` and add `onClick={handleClick}` to the root card div:

Replace:
```tsx
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={[
        'group break-inside-avoid mb-2 rounded-[10px] overflow-hidden cursor-grab active:cursor-grabbing',
        'relative transition-all duration-200',
        isDragging ? '' : 'hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.4)]',
      ].join(' ')}
    >
```

With:
```tsx
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...extendedListeners}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      className={[
        'group break-inside-avoid mb-2 rounded-[10px] overflow-hidden cursor-grab active:cursor-grabbing',
        'relative transition-all duration-200',
        isDragging ? '' : 'hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.4)]',
      ].join(' ')}
    >
```

- [ ] **Step 6: Add arrow buttons inside the image area**

Inside the image `<div>` (right after the dot indicators block, still inside the image container div), add the arrow buttons. Replace the closing of the image container div:

Replace:
```tsx
        {hasMultiple && (
          <div className="absolute bottom-[7px] left-1/2 -translate-x-1/2 flex gap-[3px] z-10">
            {images.map((_, idx) => (
              <div
                key={idx}
                className="h-[3px] rounded-full transition-all duration-300"
                style={{
                  width: idx === activeIdx ? 14 : 4,
                  background: idx === activeIdx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </div>
        )}
      </div>
```

With:
```tsx
        {hasMultiple && (
          <div className="absolute bottom-[7px] left-1/2 -translate-x-1/2 flex gap-[3px] z-10">
            {images.map((_, idx) => (
              <div
                key={idx}
                className="h-[3px] rounded-full transition-all duration-300"
                style={{
                  width: idx === activeIdx ? 14 : 4,
                  background: idx === activeIdx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </div>
        )}

        {/* Arrow navigation — visible on hover when multiple images exist */}
        {isHovered && hasMultiple && activeIdx > 0 && (
          <button
            aria-label="Previous photo"
            onClick={(e) => navigate(-1, e)}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white text-[10px] hover:bg-black/70 transition-colors"
          >
            ‹
          </button>
        )}
        {isHovered && hasMultiple && activeIdx < images.length - 1 && (
          <button
            aria-label="Next photo"
            onClick={(e) => navigate(1, e)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white text-[10px] hover:bg-black/70 transition-colors"
          >
            ›
          </button>
        )}
      </div>
```

- [ ] **Step 7: Run typecheck**

```bash
npm run typecheck
```

Expected: no new TypeScript errors.

- [ ] **Step 8: Verify in browser**

Start dev server (`npm run web`), open a trip page, hover a For You card with multiple images. Confirm:
- Left/right arrows appear on hover at image boundaries
- Clicking an arrow advances the photo without opening a drawer
- Dragging a card to the calendar still works

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/calendar/SuggestionCard.tsx
git commit -m "feat: add arrow image navigation and onSelect prop to SuggestionCard"
```

---

## Chunk 2: SuggestionDetailDrawer + ForYouPanel wiring

### Task 2: Create SuggestionDetailDrawer component

**Files:**
- Create: `apps/web/components/calendar/SuggestionDetailDrawer.tsx`

- [ ] **Step 1: Create the file**

Create `apps/web/components/calendar/SuggestionDetailDrawer.tsx` with this content:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { SuggestionCard } from './types'

interface SuggestionDetailDrawerProps {
  suggestion: SuggestionCard
  isClosing: boolean
  onClose: () => void
}

export function SuggestionDetailDrawer({
  suggestion,
  isClosing,
  onClose,
}: SuggestionDetailDrawerProps) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [isImageHovered, setIsImageHovered] = useState(false)
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set())

  const images = suggestion.imageUrls.filter((u) => !failedUrls.has(u))
  const hasMultiple = images.length > 1
  const tagColor = getActivityColor(suggestion.category)

  // Reset image index when suggestion changes
  useEffect(() => {
    setActiveIdx(0)
    setFailedUrls(new Set())
  }, [suggestion.id])

  // Esc key: capture phase, stopPropagation to prevent CommandPalette from also closing
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handler, { capture: true })
    return () => document.removeEventListener('keydown', handler, { capture: true })
  }, [onClose])

  const navigateImage = (dir: 1 | -1) => {
    setActiveIdx((i) => Math.max(0, Math.min(images.length - 1, i + dir)))
  }

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return 'Free'
    return `€${price}`
  }

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    if (hours % 1 === 0) return `${hours}h`
    return `${Math.floor(hours)}h${Math.round((hours % 1) * 60)}m`
  }

  return (
    <div
      className={[
        'absolute inset-y-0 right-0 w-full z-30',
        'bg-[var(--cal-surface-elevated)] flex flex-col',
        'transition-transform duration-300 ease-out',
        isClosing ? 'translate-x-full' : 'translate-x-0',
      ].join(' ')}
    >
      {/* Photo carousel — sticky header */}
      <div
        className="relative w-full shrink-0 overflow-hidden"
        style={{ height: 200 }}
        onMouseEnter={() => setIsImageHovered(true)}
        onMouseLeave={() => setIsImageHovered(false)}
      >
        {images.length === 0 ? (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${tagColor}28 0%, ${tagColor}55 100%)`,
            }}
          />
        ) : (
          images.map((url, idx) => (
            <img
              key={url}
              src={url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{ opacity: idx === activeIdx ? 1 : 0 }}
              draggable={false}
              onError={() => {
                setFailedUrls((prev) => new Set(prev).add(url))
                if (idx === activeIdx) setActiveIdx((i) => Math.max(0, i - 1))
              }}
            />
          ))
        )}

        {/* Dot indicators */}
        {hasMultiple && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-[3px] z-10">
            {images.map((_, idx) => (
              <div
                key={idx}
                className="h-[3px] rounded-full transition-all duration-300"
                style={{
                  width: idx === activeIdx ? 14 : 4,
                  background:
                    idx === activeIdx
                      ? 'rgba(255,255,255,0.95)'
                      : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </div>
        )}

        {/* Image nav arrows */}
        {isImageHovered && hasMultiple && activeIdx > 0 && (
          <button
            aria-label="Previous photo"
            onClick={() => navigateImage(-1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white text-sm hover:bg-black/70 transition-colors"
          >
            ‹
          </button>
        )}
        {isImageHovered && hasMultiple && activeIdx < images.length - 1 && (
          <button
            aria-label="Next photo"
            onClick={() => navigateImage(1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white text-sm hover:bg-black/70 transition-colors"
          >
            ›
          </button>
        )}

        {/* Close button */}
        <button
          aria-label="Close detail"
          onClick={onClose}
          className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white text-xs hover:bg-black/70 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {/* Name */}
        <h3 className="text-[15px] font-semibold text-[var(--cal-text)] leading-snug">
          {suggestion.name}
        </h3>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {suggestion.rating != null && (
            <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-[3px]">
              ★ {suggestion.rating}
            </span>
          )}
          {suggestion.price != null && (
            <span className="text-[11px] text-[var(--cal-text-secondary)]">
              {formatPrice(suggestion.price)}
            </span>
          )}
          <span
            className="text-[10px] font-semibold px-[6px] py-[2px] rounded-[4px]"
            style={{
              background: `${tagColor}28`,
              color: `${tagColor}cc`,
            }}
          >
            {suggestion.category.charAt(0).toUpperCase() +
              suggestion.category.slice(1)}
          </span>
          <span className="text-[11px] text-[var(--cal-text-tertiary)]">
            ~{formatDuration(suggestion.duration)}
          </span>
        </div>

        {/* Location */}
        {suggestion.location && (
          <p className="text-[11px] text-[var(--cal-text-secondary)] flex items-start gap-1">
            <span className="mt-[1px] shrink-0">📍</span>
            <span>{suggestion.location}</span>
          </p>
        )}

        {/* Description */}
        {suggestion.description && (
          <p className="text-[12px] text-[var(--cal-text-secondary)] leading-relaxed">
            {suggestion.description}
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/SuggestionDetailDrawer.tsx
git commit -m "feat: add SuggestionDetailDrawer component"
```

---

### Task 3: Wire drawer into ForYouPanel

**Files:**
- Modify: `apps/web/components/calendar/ForYouPanel.tsx`

- [ ] **Step 1: Add drawer import and state**

Replace:
```tsx
import { Search } from 'iconoir-react'
import { FOR_YOU_PANEL_DEFAULT_WIDTH } from './constants'
import { SuggestionCard } from './SuggestionCard'
import { useSuggestions } from './hooks/useSuggestions'
import type { FilterCategory } from './hooks/useSuggestions'
import { useInteractionTracking } from './hooks/useInteractionTracking'
```

With:
```tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { Search } from 'iconoir-react'
import { FOR_YOU_PANEL_DEFAULT_WIDTH } from './constants'
import { SuggestionCard } from './SuggestionCard'
import { SuggestionDetailDrawer } from './SuggestionDetailDrawer'
import { useSuggestions } from './hooks/useSuggestions'
import type { FilterCategory } from './hooks/useSuggestions'
import { useInteractionTracking } from './hooks/useInteractionTracking'
import type { SuggestionCard as SuggestionCardType } from './types'
```

- [ ] **Step 2: Add drawer state and onClose inside the component function**

Replace:
```tsx
  const { trackEvent } = useInteractionTracking(tripId)

  return (
```

With:
```tsx
  const { trackEvent } = useInteractionTracking(tripId)

  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionCardType | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openDrawer = useCallback((suggestion: SuggestionCardType) => {
    setSelectedSuggestion(suggestion)
    setIsClosing(false)
  }, [])

  const closeDrawer = useCallback(() => {
    setIsClosing(true)
    closeTimerRef.current = setTimeout(() => {
      setSelectedSuggestion(null)
      setIsClosing(false)
    }, 300)
  }, [])

  // Clear pending close timer on unmount to prevent setState on unmounted component
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  return (
```

- [ ] **Step 3: Add `relative` positioning and render the drawer**

The `<aside>` element needs `relative` class so the absolutely-positioned drawer anchors inside it. Replace:

```tsx
    <aside
      style={{ width: width ?? FOR_YOU_PANEL_DEFAULT_WIDTH }}
      className="flex flex-col shrink-0 border-l border-[var(--cal-border)] bg-[var(--cal-surface-elevated)] overflow-hidden"
      aria-label="Activity suggestions"
    >
```

With:

```tsx
    <aside
      style={{ width: width ?? FOR_YOU_PANEL_DEFAULT_WIDTH }}
      className="relative flex flex-col shrink-0 border-l border-[var(--cal-border)] bg-[var(--cal-surface-elevated)] overflow-hidden"
      aria-label="Activity suggestions"
    >
```

- [ ] **Step 4: Pass `onSelect` to each SuggestionCard and render the drawer**

Replace:
```tsx
          <div className="columns-2 gap-2">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onVisible={() => trackEvent(suggestion.id, 'impression', suggestion.category)}
              />
            ))}
          </div>
```

With:
```tsx
          <div className="columns-2 gap-2">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onVisible={() => trackEvent(suggestion.id, 'impression', suggestion.category)}
                onSelect={openDrawer}
              />
            ))}
          </div>
```

Then just before the closing `</aside>` tag, add the conditional drawer render:

Replace:
```tsx
      {/* Footer hint */}
      {suggestions.length > 0 && (
        <div className="text-center text-[11px] text-[var(--cal-text-tertiary)] py-2.5 border-t border-[var(--cal-border-light)]">
          Drag any card onto the calendar to schedule it
        </div>
      )}
    </aside>
```

With:
```tsx
      {/* Footer hint */}
      {suggestions.length > 0 && (
        <div className="text-center text-[11px] text-[var(--cal-text-tertiary)] py-2.5 border-t border-[var(--cal-border-light)]">
          Drag any card onto the calendar to schedule it
        </div>
      )}

      {/* Detail drawer — conditionally mounted, slides in from right */}
      {selectedSuggestion && (
        <SuggestionDetailDrawer
          suggestion={selectedSuggestion}
          isClosing={isClosing}
          onClose={closeDrawer}
        />
      )}
    </aside>
```

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Verify in browser**

Start dev server (`npm run web`), open a trip page with suggestions:

1. **Click a card** → drawer slides in from the right over the For You panel
2. **Click ✕ button** → drawer slides out
3. **Press Esc** → drawer slides out
4. **Hover image in drawer** → left/right arrows appear; clicking them navigates photos
5. **Drag a card** → drawer does NOT open; card drags normally onto the calendar
6. **Click another card while drawer is open** → drawer updates to show the new suggestion
7. **Empty images** → gradient placeholder shown, no arrows
8. **CommandPalette (Ctrl+K)** → with drawer open, Ctrl+K still works; Esc closes the drawer first (not the palette)

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/calendar/ForYouPanel.tsx
git commit -m "feat: wire SuggestionDetailDrawer into ForYouPanel"
```
