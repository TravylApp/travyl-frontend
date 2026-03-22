# For You Panel Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the ForYouPanel from a flat masonry grid into a Pinterest-style sectioned discovery feed with contextual section banners, responsive draggable width, and rich action-strip cards.

**Architecture:** The panel remains a sidebar in CalendarDashboard. New components (`SectionBanner`, `SuggestionSection`, `ResizeDivider`) compose inside the existing `ForYouPanel`. The `useSuggestions` hook is refactored to expose sections instead of a flat list. A new `useResizablePanel` hook manages drag-to-resize and column count.

**Tech Stack:** React 19, Tailwind CSS v4, dnd-kit, @tanstack/react-query v5, ResizeObserver, CSS custom properties (`--cal-*`)

**Spec:** `docs/superpowers/specs/2026-03-21-for-you-panel-redesign-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `apps/web/components/calendar/hooks/useResizablePanel.ts` | Panel width state, ResizeObserver column count, localStorage persistence |
| Create | `apps/web/components/calendar/ResizeDivider.tsx` | Vertical drag handle between calendar and panel |
| Create | `apps/web/components/calendar/SectionBanner.tsx` | Full-width section header with title, subtitle, tinted background |
| Create | `apps/web/components/calendar/SuggestionSection.tsx` | Renders one SectionBanner + masonry grid of cards |
| Modify | `apps/web/components/calendar/hooks/useSuggestions.ts` | Remove filter state, add client-side section grouping, expose `sections` |
| Modify | `apps/web/components/calendar/SuggestionCard.tsx` | Add "why" banner, relocate badges, add action strip |
| Modify | `apps/web/components/calendar/ForYouPanel.tsx` | Remove chips, render sections, accept dynamic width |
| Modify | `apps/web/components/calendar/CalendarDashboard.tsx:536-542` | Wrap ForYouPanel with ResizeDivider, remove fixed width |
| Modify | `apps/web/components/calendar/constants.ts:7` | Replace `FOR_YOU_PANEL_WIDTH` with min/max/default constants |
| Modify | `packages/shared/src/types/index.ts:409-427` | Add `RecommendationSection` interface |
| Modify | `apps/web/components/calendar/types.ts:2` | Re-export `RecommendationSection` from shared |

---

## Chunk 1: Data Layer + Types

### Task 1: Add RecommendationSection type to shared package

**Files:**
- Modify: `packages/shared/src/types/index.ts:427` (after SuggestionCard)
- Modify: `packages/shared/src/index.ts` (re-export if not auto-exported)

- [ ] **Step 1: Add the RecommendationSection interface**

In `packages/shared/src/types/index.ts`, after the `SuggestionCard` interface (line 427), add:

```typescript
export interface RecommendationSection {
  sectionType: 'destination' | 'category' | 'affinity' | 'schedule' | 'social'
  sectionTitle: string
  sectionSubtitle?: string
  suggestions: SuggestionCard[]
}
```

- [ ] **Step 2: Verify the type is exported from the package root**

Check that `packages/shared/src/index.ts` re-exports from `./types` (it should already — all types are re-exported via `export * from './types'`). If `RecommendationSection` is not included, add it to the export list.

- [ ] **Step 3: Add re-export to local calendar types file**

In `apps/web/components/calendar/types.ts`, add the re-export so all calendar components can import from `'./types'`:

```typescript
export type { RecommendationSection } from '@travyl/shared/types'
```

Add this after the existing `SuggestionCard` re-export line.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — no errors

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/index.ts packages/shared/src/index.ts apps/web/components/calendar/types.ts
git commit -m "feat: add RecommendationSection type for sectioned For You feed"
```

---

### Task 2: Refactor useSuggestions hook — remove filters, add section grouping

**Files:**
- Modify: `apps/web/components/calendar/hooks/useSuggestions.ts` (full rewrite)

The hook currently exposes `activeFilter`, `setActiveFilter`, `filterCategories` for filter chips, and queries with a `category` parameter. We remove all filter state, always fetch `category: 'all'`, and add a `sections` computed property that groups flat suggestions into `RecommendationSection[]`.

- [ ] **Step 1: Update the return interface**

Replace `UseSuggestionsReturn` (lines 39-54) with:

```typescript
interface UseSuggestionsReturn {
  /** Grouped sections for the feed (hidden during search) */
  sections: RecommendationSection[]
  /** Flat filtered list (used during search) */
  suggestions: SuggestionCard[]
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  error: string | null
  searchQuery: string
  setSearchQuery: (query: string) => void
  removeSuggestion: (id: string) => void
  restoreSuggestion: (id: string) => void
  refetch: () => void
}
```

Import `RecommendationSection` at the top:

```typescript
import type { SuggestionCard, RecommendationSection } from '../types'
```

- [ ] **Step 2: Remove filter constants and state**

Delete `FILTER_CATEGORIES` (lines 10-19), `FILTER_TO_CATEGORY` (lines 21-30), and the `FilterCategory` type export (line 32).

In the hook body, delete:
- `const [activeFilter, setActiveFilter] = useState<FilterCategory>('All')` (line 118)
- `const category = FILTER_TO_CATEGORY[activeFilter] ?? 'all'` (line 121)

- [ ] **Step 3: Update the query to always fetch all categories**

Change the `useInfiniteQuery` call:
- `queryKey`: change from `['suggestions', destination, activeFilter]` to `['suggestions', destination]`
- `queryFn`: change `fetchSuggestions(destination, category, ...)` to `fetchSuggestions(destination, 'all', ...)`

```typescript
const {
  data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: ['suggestions', destination],
  queryFn: ({ pageParam }) => fetchSuggestions(destination, 'all', pageParam as number),
  initialPageParam: 0,
  getNextPageParam: (lastPage, allPages) => {
    if (lastPage.length < 20) return undefined
    return allPages.length * 20
  },
  enabled: !!destination,
  staleTime: 30 * 60 * 1000,
})
```

- [ ] **Step 4: Add the groupByCategory helper and sections memo**

Add a helper function above the hook (after the `fetchSuggestions` function):

```typescript
const CATEGORY_TITLES: Record<string, string> = {
  sightseeing: 'Must-See Sights',
  dining: 'Top Dining Spots',
  tour: 'Guided Tours',
  cultural: 'Arts & Culture',
  shopping: 'Shopping',
  nightlife: 'Nightlife',
  outdoor: 'Outdoor Activities',
  other: 'More to Explore',
}

function groupIntoSections(suggestions: SuggestionCard[], destination: string): RecommendationSection[] {
  // First section: top-rated across all categories (destination-level)
  const topRated = [...suggestions]
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 6)
  const topRatedIds = new Set(topRated.map((s) => s.id))

  const sections: RecommendationSection[] = []

  if (topRated.length > 0) {
    sections.push({
      sectionType: 'destination',
      sectionTitle: destination ? `Popular in ${destination}` : 'Popular Nearby',
      suggestions: topRated,
    })
  }

  // Remaining suggestions grouped by category
  const remaining = suggestions.filter((s) => !topRatedIds.has(s.id))
  const byCategory = new Map<string, SuggestionCard[]>()
  for (const s of remaining) {
    const cat = s.category || 'other'
    if (!byCategory.has(cat)) byCategory.set(cat, [])
    byCategory.get(cat)!.push(s)
  }

  for (const [cat, items] of byCategory) {
    if (items.length === 0) continue
    sections.push({
      sectionType: 'category',
      sectionTitle: CATEGORY_TITLES[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1),
      sectionSubtitle: `${items.length} places`,
      suggestions: items,
    })
  }

  return sections
}
```

Then in the hook body, after the `allSuggestions` memo, add:

```typescript
const filteredSuggestions = useMemo(() => {
  return allSuggestions.filter(
    (s) => !removedIds.has(s.id) && !scheduledSet.has(s.id),
  )
}, [allSuggestions, removedIds, scheduledSet])

const sections = useMemo(
  () => groupIntoSections(filteredSuggestions, destination),
  [filteredSuggestions, destination],
)
```

- [ ] **Step 5: Update the search-filtered suggestions memo**

Replace the existing `suggestions` memo with one that only applies search filtering:

```typescript
const suggestions = useMemo(() => {
  if (!searchQuery.trim()) return filteredSuggestions

  const q = searchQuery.toLowerCase()
  return filteredSuggestions.filter((s) =>
    s.name.toLowerCase().includes(q) ||
    s.location.toLowerCase().includes(q) ||
    s.description.toLowerCase().includes(q),
  )
}, [filteredSuggestions, searchQuery])
```

- [ ] **Step 6: Update the return statement**

Remove `activeFilter`, `setActiveFilter`, `filterCategories` from the return. Add `sections`:

```typescript
return {
  sections,
  suggestions,
  isLoading,
  isFetchingNextPage,
  hasNextPage: hasNextPage ?? false,
  fetchNextPage,
  error: error ? (error as Error).message : null,
  searchQuery,
  setSearchQuery,
  removeSuggestion,
  restoreSuggestion,
  refetch,
}
```

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: Errors in `ForYouPanel.tsx` because it still references `activeFilter`, `setActiveFilter`, `filterCategories`, and the `FilterCategory` type. This is expected — we fix it in Task 5.

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/calendar/hooks/useSuggestions.ts
git commit -m "feat: refactor useSuggestions — remove filters, add section grouping"
```

---

## Chunk 2: New UI Components

### Task 3: Create useResizablePanel hook

**Files:**
- Create: `apps/web/components/calendar/hooks/useResizablePanel.ts`
- Modify: `apps/web/components/calendar/constants.ts:7`

- [ ] **Step 1: Update constants**

In `apps/web/components/calendar/constants.ts`, replace line 7:

```typescript
// Old: export const FOR_YOU_PANEL_WIDTH = 340
export const FOR_YOU_PANEL_MIN_WIDTH = 280
export const FOR_YOU_PANEL_MAX_WIDTH = 600
export const FOR_YOU_PANEL_DEFAULT_WIDTH = 340
export const FOR_YOU_PANEL_3COL_BREAKPOINT = 360
```

- [ ] **Step 2: Create the hook**

Create `apps/web/components/calendar/hooks/useResizablePanel.ts`:

```typescript
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FOR_YOU_PANEL_MIN_WIDTH,
  FOR_YOU_PANEL_MAX_WIDTH,
  FOR_YOU_PANEL_DEFAULT_WIDTH,
  FOR_YOU_PANEL_3COL_BREAKPOINT,
} from '../constants'

const STORAGE_KEY = 'travyl:forYouPanelWidth'

function getStoredWidth(): number {
  if (typeof window === 'undefined') return FOR_YOU_PANEL_DEFAULT_WIDTH
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return FOR_YOU_PANEL_DEFAULT_WIDTH
  const num = parseInt(stored, 10)
  if (isNaN(num)) return FOR_YOU_PANEL_DEFAULT_WIDTH
  return Math.max(FOR_YOU_PANEL_MIN_WIDTH, Math.min(FOR_YOU_PANEL_MAX_WIDTH, num))
}

export function useResizablePanel() {
  const [width, setWidth] = useState(getStoredWidth)
  const [columnCount, setColumnCount] = useState(width >= FOR_YOU_PANEL_3COL_BREAKPOINT ? 3 : 2)
  const [isDragging, setIsDragging] = useState(false)
  const panelRef = useRef<HTMLElement>(null)

  // Persist width and update column count
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width))
    setColumnCount(width >= FOR_YOU_PANEL_3COL_BREAKPOINT ? 3 : 2)
  }, [width])

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDrag = useCallback((deltaX: number) => {
    // Dragging left (negative deltaX) = wider panel
    setWidth((prev) => {
      const next = prev - deltaX
      return Math.max(FOR_YOU_PANEL_MIN_WIDTH, Math.min(FOR_YOU_PANEL_MAX_WIDTH, next))
    })
  }, [])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  return {
    width,
    columnCount,
    isDragging,
    panelRef,
    handleDragStart,
    handleDrag,
    handleDragEnd,
  }
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (new file, no consumers yet). Existing error from `ForYouPanel.tsx` still expected.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/constants.ts apps/web/components/calendar/hooks/useResizablePanel.ts
git commit -m "feat: add useResizablePanel hook with drag resize and localStorage"
```

---

### Task 4: Create ResizeDivider, SectionBanner, and SuggestionSection components

**Files:**
- Create: `apps/web/components/calendar/ResizeDivider.tsx`
- Create: `apps/web/components/calendar/SectionBanner.tsx`
- Create: `apps/web/components/calendar/SuggestionSection.tsx`

- [ ] **Step 1: Create ResizeDivider**

Create `apps/web/components/calendar/ResizeDivider.tsx`:

```tsx
'use client'

import { useCallback, useRef } from 'react'

interface ResizeDividerProps {
  width: number
  onDragStart: () => void
  onDrag: (deltaX: number) => void
  onDragEnd: () => void
}

export function ResizeDivider({ width, onDragStart, onDrag, onDragEnd }: ResizeDividerProps) {
  const lastXRef = useRef(0)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      lastXRef.current = e.clientX
      onDragStart()

      const handlePointerMove = (ev: PointerEvent) => {
        const deltaX = ev.clientX - lastXRef.current
        lastXRef.current = ev.clientX
        onDrag(deltaX)
      }

      const handlePointerUp = () => {
        document.removeEventListener('pointermove', handlePointerMove)
        document.removeEventListener('pointerup', handlePointerUp)
        onDragEnd()
      }

      document.addEventListener('pointermove', handlePointerMove)
      document.addEventListener('pointerup', handlePointerUp)
    },
    [onDragStart, onDrag, onDragEnd],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onDrag(-20)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onDrag(20)
      }
    },
    [onDrag],
  )

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      className="w-[5px] shrink-0 cursor-col-resize relative group"
      style={{ touchAction: 'none' }}
    >
      {/* Visible handle line */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-[var(--cal-border)] group-hover:w-[3px] group-hover:bg-[var(--cal-accent)] transition-all rounded-full" />
      {/* Wider hit target */}
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  )
}
```

- [ ] **Step 2: Create SectionBanner**

Create `apps/web/components/calendar/SectionBanner.tsx`:

```tsx
import type { RecommendationSection } from './types'

const SECTION_TINTS: Record<RecommendationSection['sectionType'], string> = {
  destination: 'var(--cal-accent)',
  category: 'var(--cal-text-secondary)',
  affinity: '#f59e0b',
  schedule: '#10b981',
  social: '#8b5cf6',
}

interface SectionBannerProps {
  sectionType: RecommendationSection['sectionType']
  title: string
  subtitle?: string
}

export function SectionBanner({ sectionType, title, subtitle }: SectionBannerProps) {
  const tint = SECTION_TINTS[sectionType]

  return (
    <div
      className="rounded-lg px-3 py-2.5 mb-2"
      style={{ background: `color-mix(in srgb, ${tint} 8%, var(--cal-surface-elevated))` }}
    >
      <h3
        className="text-[12px] font-semibold tracking-wide"
        style={{ color: tint }}
      >
        {title}
      </h3>
      {subtitle && (
        <p className="text-[10px] text-[var(--cal-text-tertiary)] mt-0.5">
          {subtitle}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create SuggestionSection**

Create `apps/web/components/calendar/SuggestionSection.tsx`:

```tsx
import type { RecommendationSection, SuggestionCard as SuggestionCardType } from './types'
import { SectionBanner } from './SectionBanner'
import { SuggestionCard } from './SuggestionCard'

interface SuggestionSectionProps {
  section: RecommendationSection
  columnCount: number
  onCardVisible?: (id: string, category: string) => void
  onCardClick?: (suggestion: SuggestionCardType, anchorEl: HTMLElement) => void
  onSave?: (suggestion: SuggestionCardType) => void
  onSchedule?: (suggestion: SuggestionCardType) => void
}

export function SuggestionSection({
  section,
  columnCount,
  onCardVisible,
  onCardClick,
  onSave,
  onSchedule,
}: SuggestionSectionProps) {
  if (section.suggestions.length === 0) return null

  // Distribute cards across columns (even/odd for 2, mod 3 for 3)
  const columns: SuggestionCardType[][] = Array.from({ length: columnCount }, () => [])
  section.suggestions.forEach((s, i) => {
    columns[i % columnCount].push(s)
  })

  return (
    <div className="mb-3">
      <SectionBanner
        sectionType={section.sectionType}
        title={section.sectionTitle}
        subtitle={section.sectionSubtitle}
      />
      <div className="flex gap-2">
        {columns.map((col, colIdx) => (
          <div key={colIdx} className="flex-1 flex flex-col gap-2">
            {col.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onVisible={() => onCardVisible?.(suggestion.id, suggestion.category)}
                onClick={onCardClick}
                onSave={onSave}
                onSchedule={onSchedule}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: Errors because `SuggestionCard` component doesn't accept `onSave`/`onSchedule` props yet. This is expected — we fix it in Task 5.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/ResizeDivider.tsx apps/web/components/calendar/SectionBanner.tsx apps/web/components/calendar/SuggestionSection.tsx
git commit -m "feat: add ResizeDivider, SectionBanner, and SuggestionSection components"
```

---

## Chunk 3: Card Redesign + Panel Integration

### Task 5: Update SuggestionCard — why banner, relocated badges, action strip

**Files:**
- Modify: `apps/web/components/calendar/SuggestionCard.tsx` (full rewrite)

- [ ] **Step 1: Rewrite SuggestionCard**

Replace the entire contents of `apps/web/components/calendar/SuggestionCard.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { SuggestionCard as SuggestionCardType } from './types'
import { formatDuration } from './utils'

interface SuggestionCardProps {
  suggestion: SuggestionCardType
  onVisible?: () => void
  onClick?: (suggestion: SuggestionCardType, anchorEl: HTMLElement) => void
  onSave?: (suggestion: SuggestionCardType) => void
  onSchedule?: (suggestion: SuggestionCardType) => void
}

export function SuggestionCard({ suggestion, onVisible, onClick, onSave, onSchedule }: SuggestionCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `suggestion-${suggestion.id}`,
      data: { type: 'suggestion' as const, suggestion },
      activationConstraint: { distance: 5 },
    })

  useEffect(() => {
    onVisible?.()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    onClick?.(suggestion, e.currentTarget)
  }

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  const tagColor = getActivityColor(suggestion.category)

  const formatPrice = (price: number | null) => {
    if (price === null || price === 0) return 'Free'
    return `\u20AC${price}`
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={handleClick}
      className={[
        'group rounded-[10px] overflow-hidden cursor-pointer',
        'relative transition-all duration-200 bg-[var(--cal-surface-elevated)]',
        isDragging ? '' : 'hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.4)]',
      ].join(' ')}
    >
      {/* Image area */}
      <div className="relative">
        {suggestion.imageUrl ? (
          <img
            src={suggestion.imageUrl}
            alt=""
            className="w-full block object-cover"
            style={{ height: [130, 150, 170, 140, 160, 120, 145, 155, 135, 165][suggestion.id.charCodeAt(suggestion.id.length - 1) % 10] }}
            draggable={false}
          />
        ) : (
          <div
            className="w-full flex items-center justify-center text-2xl"
            style={{
              height: [130, 150, 170, 140, 160, 120, 145, 155, 135, 165][suggestion.id.charCodeAt(suggestion.id.length - 1) % 10],
              backgroundColor: tagColor + '33',
            }}
          >
            {suggestion.category.charAt(0).toUpperCase()}
          </div>
        )}

        {/* "Why" banner — top of image */}
        {suggestion.reason && (
          <div
            className="absolute top-0 left-0 right-0 px-[10px] pt-[8px] pb-6"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%)',
            }}
          >
            <div className="text-[9px] font-medium text-white/80 uppercase tracking-[0.5px] [text-shadow:0_1px_2px_rgba(0,0,0,0.4)]">
              {suggestion.reason}
            </div>
          </div>
        )}

        {/* Bottom gradient with metadata — name, category, rating, duration, price */}
        <div
          className="absolute bottom-0 left-0 right-0 px-[10px] pb-[9px] pt-10"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)',
          }}
        >
          <div className="text-[12px] font-bold text-white leading-[1.3] [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
            {suggestion.name}
          </div>
          <div className="flex items-center gap-1 mt-[3px] text-[10px] text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.3)] flex-wrap">
            <span
              className="inline-flex text-[9px] font-semibold px-[5px] py-[1px] rounded-[3px] backdrop-blur-[4px]"
              style={{ background: `${tagColor}40`, color: `${tagColor}cc` }}
            >
              {suggestion.category.charAt(0).toUpperCase() + suggestion.category.slice(1)}
            </span>
            <span className="opacity-50">&middot;</span>
            <span>{formatDuration(suggestion.duration)}</span>
            {suggestion.rating != null && (
              <>
                <span className="opacity-50">&middot;</span>
                <span className="text-amber-400 font-semibold">{suggestion.rating}</span>
              </>
            )}
            <span className="opacity-50">&middot;</span>
            <span>{formatPrice(suggestion.price)}</span>
          </div>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Drag handle */}
        <div
          {...listeners}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-[10px] rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-white text-[11px] font-medium flex items-center gap-[5px]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
          Drag to schedule
        </div>
      </div>

      {/* Action strip */}
      <div className="flex border-t border-[var(--cal-border-light)]">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSave?.(suggestion)
          }}
          className="flex-1 py-[7px] text-[11px] text-[var(--cal-text-tertiary)] hover:text-[var(--cal-text)] hover:bg-[var(--cal-border-light)] transition-colors border-r border-[var(--cal-border-light)]"
        >
          Save
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSchedule?.(suggestion)
          }}
          className="flex-1 py-[7px] text-[11px] font-semibold text-[var(--cal-accent)] hover:bg-[var(--cal-border-light)] transition-colors"
        >
          + Schedule
        </button>
      </div>
    </div>
  )
}
```

Key changes from the current card:
- **Removed** top-left price badge and top-right rating badge (relocated into bottom overlay)
- **Added** "why" banner at top of image using `suggestion.reason`
- **Added** rating and price inline in the bottom metadata row
- **Added** action strip with Save and + Schedule buttons (with `stopPropagation`)
- **Wrapped** image area in a `<div className="relative">` so action strip sits below, not overlapping
- **Preserved** drag handle, hover overlay, dnd-kit integration, varying image heights
- **New props:** `onSave`, `onSchedule`

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: Errors still in `ForYouPanel.tsx` (filter state references). `SuggestionSection.tsx` should now type-check cleanly.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/SuggestionCard.tsx
git commit -m "feat: redesign SuggestionCard — why banner, inline metadata, action strip"
```

---

### Task 6: Rewrite ForYouPanel — sections feed, no filter chips

**Files:**
- Modify: `apps/web/components/calendar/ForYouPanel.tsx` (full rewrite)

- [ ] **Step 1: Rewrite ForYouPanel**

Replace the entire contents of `apps/web/components/calendar/ForYouPanel.tsx`:

```tsx
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Search } from 'iconoir-react'
import { SuggestionCard } from './SuggestionCard'
import { SuggestionSection } from './SuggestionSection'
import { CardPopover } from './CardPopover'
import { formatDuration } from './utils'
import { useSuggestions } from './hooks/useSuggestions'
import { useInteractionTracking } from './hooks/useInteractionTracking'
import type { SuggestionCard as SuggestionCardType } from './types'

interface ForYouPanelProps {
  destination: string
  tripId: string
  scheduledActivityIds?: string[]
  width: number
  columnCount: number
}

export function ForYouPanel({
  destination,
  tripId,
  scheduledActivityIds,
  width,
  columnCount,
}: ForYouPanelProps) {
  const {
    sections,
    suggestions,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    searchQuery,
    setSearchQuery,
    refetch,
  } = useSuggestions({ destination, scheduledActivityIds })

  const sentinelRef = useRef<HTMLDivElement>(null)

  // Prefetch next page as soon as the current page lands
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasNextPage])

  // Also trigger on scroll — 400px before sentinel becomes visible
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const { trackEvent } = useInteractionTracking(tripId)

  const [popoverSuggestion, setPopoverSuggestion] = useState<SuggestionCardType | null>(null)
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null)

  const handleCardClick = useCallback((suggestion: SuggestionCardType, anchorEl: HTMLElement) => {
    trackEvent(suggestion.id, 'click', suggestion.category)
    if (popoverSuggestion?.id === suggestion.id) {
      setPopoverSuggestion(null)
      setPopoverAnchor(null)
    } else {
      setPopoverSuggestion(suggestion)
      setPopoverAnchor(anchorEl)
    }
  }, [popoverSuggestion?.id, trackEvent])

  const handlePopoverClose = useCallback(() => {
    setPopoverSuggestion(null)
    setPopoverAnchor(null)
  }, [])

  const handleSave = useCallback((suggestion: SuggestionCardType) => {
    // TODO: wire to useFavoritePlaces hook when available
    console.log('[ForYou] save:', suggestion.id)
  }, [])

  const handleSchedule = useCallback((suggestion: SuggestionCardType) => {
    // TODO: wire to createActivity mutation for quick-schedule
    console.log('[ForYou] schedule:', suggestion.id)
  }, [])

  const handleCardVisible = useCallback((id: string, category: string) => {
    trackEvent(id, 'impression', category)
  }, [trackEvent])

  const formatPrice = (price: number | null, currency: string) => {
    if (price === null || price === 0) return 'Free'
    return `\u20AC${price}`
  }

  const isSearching = searchQuery.trim().length > 0
  const totalSuggestions = sections.reduce((sum, s) => sum + s.suggestions.length, 0)

  return (
    <aside
      style={{ width }}
      className="flex flex-col shrink-0 border-l border-[var(--cal-border)] bg-[var(--cal-surface-elevated)] overflow-hidden"
      aria-label="Activity suggestions"
    >
      {/* Header */}
      <div className="p-3.5 pb-3 border-b border-[var(--cal-border-light)]">
        <h2 className="text-base font-serif font-normal tracking-wide text-[var(--cal-text)] mb-2.5">
          For You
        </h2>
        <div className="flex items-center gap-2 bg-[var(--cal-border-light)] border border-[var(--cal-border)] rounded-lg px-3 py-2">
          <Search
            width={14}
            height={14}
            strokeWidth={1.5}
            className="shrink-0 text-[var(--cal-text-tertiary)] opacity-50"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities..."
            className="flex-1 bg-transparent text-sm text-[var(--cal-text)] placeholder-[var(--cal-text-tertiary)] outline-none"
          />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 pt-2">
        {isLoading ? (
          /* Skeleton loading — section banner + card placeholders */
          <>
            {[0, 1].map((sectionIdx) => (
              <div key={sectionIdx} className="mb-3">
                <div className="rounded-lg bg-[var(--cal-border)] animate-pulse h-10 mb-2" />
                <div className="flex gap-2">
                  {Array.from({ length: columnCount }).map((_, colIdx) => (
                    <div key={colIdx} className="flex-1 flex flex-col gap-2">
                      {[0, 1].map((i) => (
                        <div
                          key={i}
                          className="rounded-[10px] bg-[var(--cal-border)] animate-pulse"
                          style={{ height: 120 + ((sectionIdx * 2 + colIdx + i) % 4) * 15 }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : error ? (
          /* Error state */
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-sm text-[var(--cal-text-secondary)]">
              Couldn&apos;t load suggestions
            </p>
            <button onClick={() => refetch()} className="text-xs text-[var(--cal-accent)] hover:underline">
              Tap to retry
            </button>
          </div>
        ) : isSearching ? (
          /* Search mode — flat grid */
          suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-1">
              <p className="text-sm text-[var(--cal-text-secondary)]">
                No results for &lsquo;{searchQuery}&rsquo;
              </p>
              <p className="text-xs text-[var(--cal-text-tertiary)]">
                Try broader terms
              </p>
            </div>
          ) : (
            <>
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--cal-text-secondary)] px-1.5 pb-2">
                {suggestions.length} results for &lsquo;{searchQuery}&rsquo;
              </div>
              <div className="flex gap-2">
                {Array.from({ length: columnCount }).map((_, colIdx) => (
                  <div key={colIdx} className="flex-1 flex flex-col gap-2">
                    {suggestions.filter((_, i) => i % columnCount === colIdx).map((suggestion) => (
                      <SuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        onVisible={() => handleCardVisible(suggestion.id, suggestion.category)}
                        onClick={handleCardClick}
                        onSave={handleSave}
                        onSchedule={handleSchedule}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </>
          )
        ) : totalSuggestions === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 gap-1">
            <p className="text-sm text-[var(--cal-text-secondary)]">
              No suggestions available
            </p>
          </div>
        ) : (
          /* Sectioned feed */
          sections.map((section) => (
            <SuggestionSection
              key={section.sectionTitle}
              section={section}
              columnCount={columnCount}
              onCardVisible={handleCardVisible}
              onCardClick={handleCardClick}
              onSave={handleSave}
              onSchedule={handleSchedule}
            />
          ))
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />

        {isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <div className="w-4 h-4 rounded-full border-2 border-[var(--cal-border)] border-t-[var(--cal-accent)] animate-spin" />
          </div>
        )}
      </div>

      {/* Footer hint */}
      {totalSuggestions > 0 && (
        <div className="text-center text-[11px] text-[var(--cal-text-tertiary)] py-2.5 border-t border-[var(--cal-border-light)]">
          Drag any card onto the calendar to schedule it
        </div>
      )}

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
              handlePopoverClose()
            },
            variant: 'primary' as const,
          },
        ] : []}
      />
    </aside>
  )
}
```

Key changes:
- **Removed** filter chips, `activeFilter`, `setActiveFilter`, `filterCategories`, `FilterCategory` import
- **Added** `width` and `columnCount` props (from parent via `useResizablePanel`)
- **Added** sectioned feed rendering with `SuggestionSection` components
- **Added** search mode: flat grid when searching, sectioned feed otherwise
- **Added** `handleSave` and `handleSchedule` callbacks (stubbed with TODO)
- **Updated** skeleton to show section banner placeholders
- **Updated** empty state to check `totalSuggestions` across all sections

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: Error in `CalendarDashboard.tsx` because `ForYouPanel` now requires `width` and `columnCount` props. We fix this next.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/ForYouPanel.tsx
git commit -m "feat: rewrite ForYouPanel — sectioned feed, search collapse, no filter chips"
```

---

### Task 7: Integrate ResizeDivider into CalendarDashboard

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx:35,536-542`

- [ ] **Step 1: Update imports**

At the top of `CalendarDashboard.tsx`, update the ForYouPanel-related imports:

Replace:
```typescript
import { ForYouPanel } from './ForYouPanel'
```

With:
```typescript
import { ForYouPanel } from './ForYouPanel'
import { ResizeDivider } from './ResizeDivider'
import { useResizablePanel } from './hooks/useResizablePanel'
```

Also remove any import of `FOR_YOU_PANEL_WIDTH` from `./constants` if it exists in this file.

- [ ] **Step 2: Add the hook call**

Inside the `CalendarDashboard` component body (near the top, with other hooks), add:

```typescript
const {
  width: forYouWidth,
  columnCount: forYouColumnCount,
  handleDragStart: handleResizeStart,
  handleDrag: handleResizeDrag,
  handleDragEnd: handleResizeEnd,
} = useResizablePanel()
```

- [ ] **Step 3: Update the ForYouPanel rendering**

Find the section around line 537-542 where `<ForYouPanel>` is rendered. Replace:

```tsx
<ForYouPanel
  destination={trip?.destination ?? ''}
  tripId={trip?.id ?? ''}
  scheduledActivityIds={droppedSuggestionIds}
/>
```

With:

```tsx
<ResizeDivider
  width={forYouWidth}
  onDragStart={handleResizeStart}
  onDrag={handleResizeDrag}
  onDragEnd={handleResizeEnd}
/>
<ForYouPanel
  destination={trip?.destination ?? ''}
  tripId={trip?.id ?? ''}
  scheduledActivityIds={droppedSuggestionIds}
  width={forYouWidth}
  columnCount={forYouColumnCount}
/>
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — all components should now type-check cleanly.

- [ ] **Step 5: Run the dev server and verify visually**

Run: `npm run web`

Open a trip page. Verify:
1. The For You panel renders with section banners and card grids
2. The resize divider is visible between the calendar and the panel
3. Dragging the divider resizes the panel and columns adapt (2 -> 3)
4. Search collapses into a flat grid
5. Cards show the "why" banner when `reason` is present
6. Save and + Schedule buttons appear on cards
7. Drag-to-calendar still works

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: integrate ResizeDivider and dynamic width into CalendarDashboard"
```

---

## Chunk 4: Cleanup

### Task 8: Remove dead code and clean up constants

**Files:**
- Modify: `apps/web/components/calendar/constants.ts`

- [ ] **Step 1: Verify FOR_YOU_PANEL_WIDTH is no longer imported anywhere**

Search for `FOR_YOU_PANEL_WIDTH` across the codebase. If no other files import it, the old constant was already replaced in Task 3, Step 1. Confirm it's gone.

- [ ] **Step 2: Run full lint and typecheck**

Run: `npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 3: Commit any cleanup**

```bash
git add -u
git commit -m "chore: remove dead FOR_YOU_PANEL_WIDTH constant and unused imports"
```

Only commit if there are actual changes. If the constant was already replaced in Task 3, this step may be a no-op.
