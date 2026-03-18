# For You Panel + SST Recommendation Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x] `) syntax for tracking.

**Goal:** Build a Pinterest-style "For You" sidebar on the calendar dashboard where users drag AI-powered activity suggestions onto their trip calendar, backed by an SST-deployed AWS recommendation engine.

**Architecture:** The feature has two independent subsystems: (1) frontend — ForYou panel with masonry grid cards, drag-to-calendar via @dnd-kit, panel state switching with DetailPanel; (2) backend — SST v3 monorepo integration deploying API Gateway, Lambda, OpenSearch Serverless, DynamoDB, EventBridge, Bedrock, and Personalize. Frontend starts with mock data, backend wired in last.

**Tech Stack:** Next.js 16, React 19, @dnd-kit/core, Tailwind CSS 4, motion/react, React Query v5, SST v3 (Ion), AWS Lambda, OpenSearch Serverless, DynamoDB, EventBridge, Bedrock (Titan), Amazon Personalize, Supabase

**Spec:** `docs/superpowers/specs/2026-03-17-for-you-panel-design.md`

---

## File Map

### New Files — Frontend

| File | Responsibility |
|------|---------------|
| `apps/web/components/calendar/ForYouPanel.tsx` | Panel shell: search box, filter chips, masonry grid, loading/error/empty states |
| `apps/web/components/calendar/SuggestionCard.tsx` | Single full-image card: draggable, hover effects, price/rating badges |
| `apps/web/components/calendar/hooks/useSuggestions.ts` | React Query hook: fetches suggestions (mock → API), search with debounce, filter state |
| `apps/web/components/calendar/hooks/useInteractionTracking.ts` | Fires impression/click/drag/dismiss events to `/interact` endpoint |
| `packages/shared/src/config/mockSuggestions.ts` | Mock suggestion data for Paris (8-10 cards with realistic data) |
| `packages/shared/src/utils/suggestionMapper.ts` | `suggestionToCalendarActivity()` conversion function |
| `packages/shared/src/utils/suggestionMapper.test.ts` | Tests for the mapper |

### New Files — SST Infrastructure

| File | Responsibility |
|------|---------------|
| `sst.config.ts` | SST entry point, links infra modules |
| `infra/api.ts` | API Gateway v2 + Lambda route bindings, CORS config |
| `infra/storage.ts` | OpenSearch Serverless collection, DynamoDB table, S3 bucket, CloudFront |
| `infra/events.ts` | EventBridge bus + rules for interaction events |
| `infra/secrets.ts` | SST secrets: Google Places API key, Supabase service role key |

### New Files — Lambda Functions

| File | Responsibility |
|------|---------------|
| `services/suggest.ts` | GET /suggest — check DynamoDB cache, query OpenSearch, re-rank via Personalize |
| `services/search.ts` | GET /search — embed query via Bedrock Titan, OpenSearch kNN, filter by destination |
| `services/interact.ts` | POST /interact — publish to EventBridge bus |
| `services/ingest.ts` | Catalog ingestion job — Google Places / Viator → OpenSearch |
| `services/embed.ts` | Batch compute Bedrock Titan embeddings for new activities |
| `services/lib/embedding.ts` | Bedrock Titan embedding client wrapper |
| `services/lib/opensearch.ts` | OpenSearch query builder (vector search + filters) |
| `services/lib/cache.ts` | DynamoDB recommendation cache read/write with TTL |
| `services/lib/personalize.ts` | Amazon Personalize runtime client |
| `services/lib/auth.ts` | Supabase JWT validation for Lambda handlers |
| `services/lib/types.ts` | Backend-specific types (API request/response shapes) |

### Modified Files

| File | Change |
|------|--------|
| `packages/shared/src/types/index.ts` | Add `SuggestionCard` interface |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Hoist DndContext, add right column with ForYou/Detail swap |
| `apps/web/components/calendar/hooks/useCalendarDnd.ts` | Add `onAddFromSuggestion`, branch `handleDragEnd` by type |
| `apps/web/components/calendar/EventBlock.tsx` | Add `type: 'activity'` to drag data |
| `apps/web/components/calendar/constants.ts` | Add `FOR_YOU_PANEL_WIDTH` constant |
| `package.json` | Add `services` to workspaces (if needed for SST) |

---

## Phase 1: Frontend — Mock Data + Panel UI

### Task 1: Add SuggestionCard type and mock data

**Files:**
- Modify: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/config/mockSuggestions.ts`

- [x] **Step 1: Add SuggestionCard type**

In `packages/shared/src/types/index.ts`, add after the `CalendarActivity` interface:

```typescript
// ─── Suggestion / For You Panel ─────────────────────────────

export interface SuggestionCard {
  id: string
  name: string
  category: ActivityCategory
  imageUrl: string
  duration: number        // hours
  price: number | null
  currency: string
  rating: number | null
  location: string
  latitude: number
  longitude: number
  description: string
  source: 'ai' | 'search'
  relevanceScore: number
  reason?: string
}
```

- [x]  **Step 2: Create mock suggestions**

Create `packages/shared/src/config/mockSuggestions.ts` with 10 Paris activities. Use Unsplash image URLs matching the mockup (e.g., `https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=300&h=220&fit=crop` for Eiffel Tower). Include a mix of categories: sightseeing, museum, dining, tour, cultural, shopping, nightlife, outdoor. Vary durations (1-3h) and prices (Free to €87).

```typescript
import type { SuggestionCard } from '../types'

export const MOCK_SUGGESTIONS: SuggestionCard[] = [
  {
    id: 'sug-1',
    name: 'Eiffel Tower',
    category: 'sightseeing',
    imageUrl: 'https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=300&h=220&fit=crop',
    duration: 2,
    price: 26,
    currency: 'EUR',
    rating: 4.7,
    location: '7th arrondissement, Paris',
    latitude: 48.8584,
    longitude: 2.2945,
    description: 'Iconic iron lattice tower on the Champ de Mars. Visit the summit for panoramic views of Paris. Best at sunset.',
    source: 'ai',
    relevanceScore: 0.95,
    reason: 'Top attraction in Paris',
  },
  {
    id: 'sug-2',
    name: 'Louvre Museum',
    category: 'museum',
    imageUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=300&h=260&fit=crop',
    duration: 3,
    price: 17,
    currency: 'EUR',
    rating: 4.8,
    location: '1st arrondissement, Paris',
    latitude: 48.8606,
    longitude: 2.3376,
    description: 'World\'s largest art museum. Home to the Mona Lisa, Venus de Milo, and 380,000+ works.',
    source: 'ai',
    relevanceScore: 0.93,
    reason: 'Must-see museum',
  },
  {
    id: 'sug-3',
    name: 'Le Bouillon Chartier',
    category: 'dining',
    imageUrl: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=300&h=160&fit=crop',
    duration: 1.5,
    price: 15,
    currency: 'EUR',
    rating: 4.3,
    location: '9th arrondissement, Paris',
    latitude: 48.8745,
    longitude: 2.3444,
    description: 'Historic Parisian brasserie since 1896. Classic French dishes at unbeatable prices in a stunning Belle Époque dining hall.',
    source: 'ai',
    relevanceScore: 0.88,
    reason: 'Affordable local favorite',
  },
  {
    id: 'sug-4',
    name: 'Montmartre Walking Tour',
    category: 'tour',
    imageUrl: 'https://images.unsplash.com/photo-1478391679764-b2d8b3cd1e94?w=300&h=200&fit=crop',
    duration: 2.5,
    price: null,
    currency: 'EUR',
    rating: 4.6,
    location: '18th arrondissement, Paris',
    latitude: 48.8867,
    longitude: 2.3431,
    description: 'Explore the artistic hilltop village. See Sacré-Cœur, Place du Tertre artists, and hidden cobblestone streets.',
    source: 'ai',
    relevanceScore: 0.87,
    reason: 'Great for first-time visitors',
  },
  {
    id: 'sug-5',
    name: 'Sainte-Chapelle',
    category: 'cultural',
    imageUrl: 'https://images.unsplash.com/photo-1509439581779-6298f75bf6e5?w=300&h=200&fit=crop',
    duration: 1,
    price: 11.5,
    currency: 'EUR',
    rating: 4.9,
    location: 'Île de la Cité, Paris',
    latitude: 48.8554,
    longitude: 2.3451,
    description: '13th-century Gothic chapel with the most stunning stained glass windows in Paris. 1,113 panels of biblical scenes.',
    source: 'ai',
    relevanceScore: 0.85,
    reason: 'Highest-rated cultural site',
  },
  {
    id: 'sug-6',
    name: 'Seine River Cruise',
    category: 'tour',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&h=170&fit=crop',
    duration: 1,
    price: 15,
    currency: 'EUR',
    rating: 4.4,
    location: 'Port de la Bourdonnais, Paris',
    latitude: 48.8600,
    longitude: 2.2885,
    description: 'Cruise past Notre-Dame, the Louvre, and the Eiffel Tower from the water.',
    source: 'ai',
    relevanceScore: 0.82,
  },
  {
    id: 'sug-7',
    name: 'Le Marais District',
    category: 'shopping',
    imageUrl: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=300&h=190&fit=crop',
    duration: 3,
    price: null,
    currency: 'EUR',
    rating: 4.5,
    location: '3rd & 4th arrondissement, Paris',
    latitude: 48.8566,
    longitude: 2.3622,
    description: 'Trendy boutiques, galleries, vintage shops, and the best falafel in Paris.',
    source: 'ai',
    relevanceScore: 0.80,
  },
  {
    id: 'sug-8',
    name: 'Moulin Rouge Show',
    category: 'nightlife',
    imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=300&h=230&fit=crop',
    duration: 2.5,
    price: 87,
    currency: 'EUR',
    rating: 4.2,
    location: 'Montmartre, Paris',
    latitude: 48.8841,
    longitude: 2.3322,
    description: 'Iconic cabaret show since 1889. Dazzling costumes, can-can dancers, and champagne.',
    source: 'ai',
    relevanceScore: 0.78,
  },
  {
    id: 'sug-9',
    name: 'Jardin du Luxembourg',
    category: 'outdoor',
    imageUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=300&h=180&fit=crop',
    duration: 1.5,
    price: null,
    currency: 'EUR',
    rating: 4.7,
    location: '6th arrondissement, Paris',
    latitude: 48.8462,
    longitude: 2.3372,
    description: 'Beautiful formal gardens. Relax by the Medici Fountain or rent a toy sailboat.',
    source: 'ai',
    relevanceScore: 0.76,
  },
  {
    id: 'sug-10',
    name: 'Musée d\'Orsay',
    category: 'museum',
    imageUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=300&h=200&fit=crop',
    duration: 2.5,
    price: 16,
    currency: 'EUR',
    rating: 4.8,
    location: '7th arrondissement, Paris',
    latitude: 48.8600,
    longitude: 2.3266,
    description: 'Impressionist and Post-Impressionist masterpieces in a stunning converted railway station.',
    source: 'ai',
    relevanceScore: 0.75,
  },
]
```

- [x]  **Step 3: Run typecheck**

Run: `npx tsc --noEmit -p packages/shared/tsconfig.json`
Expected: No errors

- [x]  **Step 4: Commit**

```bash
git add packages/shared/src/types/index.ts packages/shared/src/config/mockSuggestions.ts
git commit -m "feat: add SuggestionCard type and mock suggestion data"
```

---

### Task 2: SuggestionCard → CalendarActivity mapper

**Files:**
- Create: `packages/shared/src/utils/suggestionMapper.ts`
- Create: `packages/shared/src/utils/suggestionMapper.test.ts`

- [x]  **Step 1: Write the test**

```typescript
// packages/shared/src/utils/suggestionMapper.test.ts
import { describe, it, expect } from 'vitest'
import { suggestionToCalendarActivity } from './suggestionMapper'
import type { SuggestionCard } from '../types'

const MOCK_SUGGESTION: SuggestionCard = {
  id: 'sug-1',
  name: 'Eiffel Tower',
  category: 'sightseeing',
  imageUrl: 'https://example.com/eiffel.jpg',
  duration: 2,
  price: 26,
  currency: 'EUR',
  rating: 4.7,
  location: '7th arrondissement',
  latitude: 48.8584,
  longitude: 2.2945,
  description: 'Iconic tower',
  source: 'ai',
  relevanceScore: 0.95,
  reason: 'Top attraction',
}

describe('suggestionToCalendarActivity', () => {
  it('maps all fields correctly', () => {
    const result = suggestionToCalendarActivity(MOCK_SUGGESTION, 2, 9.5)

    expect(result.id).toBeDefined()
    expect(result.id).not.toBe('sug-1') // new UUID, not suggestion id
    expect(result.title).toBe('Eiffel Tower')
    expect(result.type).toBe('sightseeing')
    expect(result.day).toBe(2)
    expect(result.startHour).toBe(9.5)
    expect(result.duration).toBe(2)
    expect(result.price).toBe('26')
    expect(result.rating).toBe(4.7)
    expect(result.location).toBe('7th arrondissement')
    expect(result.image).toBe('https://example.com/eiffel.jpg')
    expect(result.latitude).toBe(48.8584)
    expect(result.longitude).toBe(2.2945)
    expect(result.notes).toBe('Iconic tower')
  })

  it('converts null price to undefined', () => {
    const suggestion = { ...MOCK_SUGGESTION, price: null }
    const result = suggestionToCalendarActivity(suggestion, 0, 10)
    expect(result.price).toBeUndefined()
  })

  it('converts null rating to undefined', () => {
    const suggestion = { ...MOCK_SUGGESTION, rating: null }
    const result = suggestionToCalendarActivity(suggestion, 0, 10)
    expect(result.rating).toBeUndefined()
  })
})
```

- [x]  **Step 2: Run test to verify it fails**

Run: `npm -w @travyl/shared run test -- suggestionMapper`
Expected: FAIL — module not found

- [x]  **Step 3: Write the mapper**

```typescript
// packages/shared/src/utils/suggestionMapper.ts
import type { SuggestionCard, CalendarActivity } from '../types'

/**
 * Convert a SuggestionCard (from the For You panel) into a CalendarActivity
 * for placement on the calendar grid.
 *
 * Generates a new UUID — the suggestion's original id is not reused.
 */
export function suggestionToCalendarActivity(
  suggestion: SuggestionCard,
  day: number,
  startHour: number,
): CalendarActivity {
  return {
    id: crypto.randomUUID(),
    title: suggestion.name,
    type: suggestion.category,
    day,
    startHour,
    duration: suggestion.duration,
    price: suggestion.price != null ? String(suggestion.price) : undefined,
    rating: suggestion.rating ?? undefined,
    location: suggestion.location,
    image: suggestion.imageUrl,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
    notes: suggestion.description,
  }
}
```

- [x]  **Step 4: Run test to verify it passes**

Run: `npm -w @travyl/shared run test -- suggestionMapper`
Expected: 3 tests PASS

- [x]  **Step 5: Commit**

```bash
git add packages/shared/src/utils/suggestionMapper.ts packages/shared/src/utils/suggestionMapper.test.ts
git commit -m "feat: add suggestionToCalendarActivity mapper with tests"
```

---

### Task 3: Add FOR_YOU_PANEL_WIDTH constant and re-export types

**Files:**
- Modify: `apps/web/components/calendar/constants.ts`
- Modify: `apps/web/components/calendar/types.ts`

- [x]  **Step 1: Add constant**

In `apps/web/components/calendar/constants.ts`, add:

```typescript
export const FOR_YOU_PANEL_WIDTH = 340
```

- [x]  **Step 2: Re-export SuggestionCard from calendar types**

In `apps/web/components/calendar/types.ts`, add:

```typescript
export type { SuggestionCard } from '@travyl/shared/types'
```

- [x]  **Step 3: Commit**

```bash
git add apps/web/components/calendar/constants.ts apps/web/components/calendar/types.ts
git commit -m "feat: add FOR_YOU_PANEL_WIDTH constant and SuggestionCard re-export"
```

---

### Task 4: useSuggestions hook (mock data)

**Files:**
- Create: `apps/web/components/calendar/hooks/useSuggestions.ts`

- [x]  **Step 1: Create the hook**

This hook manages suggestion state: loads mock data, handles search filtering, category filtering. Will be swapped to React Query + API calls later.

```typescript
// apps/web/components/calendar/hooks/useSuggestions.ts
'use client'

import { useState, useMemo, useCallback } from 'react'
import { MOCK_SUGGESTIONS } from '@travyl/shared/config/mockSuggestions'
import type { SuggestionCard } from '../types'

const FILTER_CATEGORIES = [
  'All',
  'Sightseeing',
  'Dining',
  'Tours',
  'Culture',
  'Shopping',
  'Nightlife',
  'Outdoor',
] as const

/** Maps filter chip labels to activity category slugs */
const CATEGORY_MAP: Record<string, string[]> = {
  Sightseeing: ['sightseeing'],
  Dining: ['dining'],
  Tours: ['tour'],
  Culture: ['cultural', 'museum'],
  Shopping: ['shopping'],
  Nightlife: ['nightlife'],
  Outdoor: ['outdoor'],
}

export type FilterCategory = (typeof FILTER_CATEGORIES)[number]

interface UseSuggestionsOptions {
  destination: string
  scheduledActivityIds?: string[]
}

interface UseSuggestionsReturn {
  suggestions: SuggestionCard[]
  isLoading: boolean
  error: string | null
  searchQuery: string
  setSearchQuery: (query: string) => void
  activeFilter: FilterCategory
  setActiveFilter: (filter: FilterCategory) => void
  filterCategories: readonly FilterCategory[]
  removeSuggestion: (id: string) => void
  restoreSuggestion: (id: string) => void
}

export function useSuggestions({
  destination,
  scheduledActivityIds = [],
}: UseSuggestionsOptions): UseSuggestionsReturn {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('All')
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  const removeSuggestion = useCallback((id: string) => {
    setRemovedIds((prev) => new Set(prev).add(id))
  }, [])

  const restoreSuggestion = useCallback((id: string) => {
    setRemovedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const suggestions = useMemo(() => {
    let filtered = MOCK_SUGGESTIONS.filter(
      (s) => !removedIds.has(s.id) && !scheduledActivityIds.includes(s.id),
    )

    // Category filter
    if (activeFilter !== 'All') {
      const slugs = CATEGORY_MAP[activeFilter] ?? []
      filtered = filtered.filter((s) => slugs.includes(s.category))
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      )
    }

    return filtered
  }, [searchQuery, activeFilter, removedIds, scheduledActivityIds])

  return {
    suggestions,
    isLoading: false,   // mock — always ready
    error: null,        // mock — no errors
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    filterCategories: FILTER_CATEGORIES,
    removeSuggestion,
    restoreSuggestion,
  }
}
```

- [x]  **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`

- [x]  **Step 3: Commit**

```bash
git add apps/web/components/calendar/hooks/useSuggestions.ts
git commit -m "feat: add useSuggestions hook with mock data, search, and category filtering"
```

---

### Task 5: SuggestionCard component

**Files:**
- Create: `apps/web/components/calendar/SuggestionCard.tsx`

- [x]  **Step 1: Create the component**

Full-image card with overlaid metadata. Uses `useDraggable` from @dnd-kit/core with `data: { type: 'suggestion', suggestion }`.

```typescript
// apps/web/components/calendar/SuggestionCard.tsx
'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'
import type { SuggestionCard as SuggestionCardType } from './types'

interface SuggestionCardProps {
  suggestion: SuggestionCardType
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `suggestion-${suggestion.id}`,
      data: { type: 'suggestion' as const, suggestion },
    })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  const tagColor = getActivityColor(suggestion.category)

  const formatPrice = (price: number | null, currency: string) => {
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
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={[
        'group break-inside-avoid mb-2 rounded-[10px] overflow-hidden cursor-grab active:cursor-grabbing',
        'relative transition-all duration-200',
        isDragging ? '' : 'hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.4)]',
      ].join(' ')}
    >
      {/* Image */}
      <img
        src={suggestion.imageUrl}
        alt=""
        className="w-full block object-cover"
        style={{ height: [130, 150, 170, 140, 160, 120, 145, 155, 135, 165][suggestion.id.charCodeAt(suggestion.id.length - 1) % 10] }}
        draggable={false}
      />

      {/* Price badge — top left */}
      <div className="absolute top-[7px] left-[7px] bg-black/55 backdrop-blur-[8px] rounded-md px-[7px] py-[2px] text-[11px] font-semibold text-white">
        {formatPrice(suggestion.price, suggestion.currency)}
      </div>

      {/* Rating badge — top right */}
      {suggestion.rating != null && (
        <div className="absolute top-[7px] right-[7px] bg-black/55 backdrop-blur-[8px] rounded-md px-[7px] py-[2px] text-[10px] font-semibold text-amber-400 flex items-center gap-[3px]">
          ★ {suggestion.rating}
        </div>
      )}

      {/* Bottom gradient with metadata */}
      <div
        className="absolute bottom-0 left-0 right-0 px-[10px] pb-[9px] pt-8"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)',
        }}
      >
        <div className="text-[12px] font-bold text-white leading-[1.3] [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
          {suggestion.name}
        </div>
        <div className="flex items-center gap-1 mt-[3px] text-[10px] text-white/75 [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
          <span
            className="inline-flex text-[9px] font-semibold px-[5px] py-[1px] rounded-[3px] backdrop-blur-[4px]"
            style={{
              background: `${tagColor}40`,
              color: `${tagColor}cc`,
            }}
          >
            {suggestion.category.charAt(0).toUpperCase() + suggestion.category.slice(1)}
          </span>
          <span className="opacity-50">·</span>
          <span>{formatDuration(suggestion.duration)}</span>
        </div>
      </div>

      {/* Hover overlay + drag badge */}
      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-[10px] rounded-lg px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-white text-[11px] font-medium flex items-center gap-[5px]">
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
  )
}
```

- [x]  **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`

- [x]  **Step 3: Commit**

```bash
git add apps/web/components/calendar/SuggestionCard.tsx
git commit -m "feat: add SuggestionCard component with full-image masonry layout"
```

---

### Task 6: ForYouPanel component

**Files:**
- Create: `apps/web/components/calendar/ForYouPanel.tsx`

- [x]  **Step 1: Create the panel**

Shell component: header with search box, filter chips, masonry grid of SuggestionCards, loading/error/empty states.

```typescript
// apps/web/components/calendar/ForYouPanel.tsx
'use client'

import { Search } from 'iconoir-react'
import { FOR_YOU_PANEL_WIDTH } from './constants'
import { SuggestionCard } from './SuggestionCard'
import { useSuggestions } from './hooks/useSuggestions'
import type { FilterCategory } from './hooks/useSuggestions'

interface ForYouPanelProps {
  destination: string
  scheduledActivityIds?: string[]
}

export function ForYouPanel({
  destination,
  scheduledActivityIds,
}: ForYouPanelProps) {
  const {
    suggestions,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    filterCategories,
  } = useSuggestions({ destination, scheduledActivityIds })

  return (
    <aside
      style={{ width: FOR_YOU_PANEL_WIDTH }}
      className="flex flex-col shrink-0 border-l border-gray-200 dark:border-[#1e3a5f]/30 bg-white dark:bg-[#0f1d2e] overflow-hidden"
      aria-label="Activity suggestions"
    >
      {/* Header */}
      <div className="p-3.5 pb-3 border-b border-gray-200/50 dark:border-[#1e3a5f]/20">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-[#f5efe8] mb-2.5">
          For You
        </h2>
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#1a2d42] border border-gray-200 dark:border-[#1e3a5f] rounded-lg px-3 py-2">
          <Search
            width={14}
            height={14}
            strokeWidth={1.5}
            className="shrink-0 text-gray-400 dark:text-[#4a7ab5] opacity-50"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-[#f5efe8] placeholder-gray-400 dark:placeholder-[#4a7ab5] outline-none"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 px-3.5 pt-2.5 pb-0 overflow-x-auto">
        {filterCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat as FilterCategory)}
            className={[
              'text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-all border',
              activeFilter === cat
                ? 'bg-[#003594] border-[#003594] text-white'
                : 'border-gray-200 dark:border-[#1e3a5f] text-gray-500 dark:text-[#6a8fba] hover:bg-gray-100 dark:hover:bg-[#1a2d42] hover:text-gray-900 dark:hover:text-[#f5efe8]',
            ].join(' ')}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Section label */}
      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-400 dark:text-[#4a7ab5] px-3.5 pt-3 pb-1.5">
        {searchQuery.trim()
          ? `Results for '${searchQuery}'`
          : `Recommended for ${destination}`}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {isLoading ? (
          /* Skeleton loading */
          <div className="columns-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="break-inside-avoid mb-2 rounded-[10px] bg-gray-200 dark:bg-[#1a2d42] animate-pulse"
                style={{ height: 120 + i * 20 }}
              />
            ))}
          </div>
        ) : error ? (
          /* Error state */
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <p className="text-sm text-gray-500 dark:text-[#4a7ab5]">
              Couldn't load suggestions
            </p>
            <button className="text-xs text-[#003594] dark:text-[#4a7dff] hover:underline">
              Tap to retry
            </button>
          </div>
        ) : suggestions.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-12 gap-1">
            <p className="text-sm text-gray-500 dark:text-[#4a7ab5]">
              {searchQuery.trim()
                ? `No results for '${searchQuery}'`
                : 'No suggestions available'}
            </p>
            {searchQuery.trim() && (
              <p className="text-xs text-gray-400 dark:text-[#4a7ab5]/70">
                Try broader terms
              </p>
            )}
          </div>
        ) : (
          /* Masonry grid */
          <div className="columns-2 gap-2">
            {suggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </div>
        )}
      </div>

      {/* Footer hint */}
      {suggestions.length > 0 && (
        <div className="text-center text-[11px] text-gray-400/50 dark:text-[#4a7ab5]/30 py-2.5 border-t border-gray-100 dark:border-[#1e3a5f]/15">
          Drag any card onto the calendar to schedule it
        </div>
      )}
    </aside>
  )
}
```

- [x]  **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`

- [x]  **Step 3: Commit**

```bash
git add apps/web/components/calendar/ForYouPanel.tsx
git commit -m "feat: add ForYouPanel with masonry grid, search, filter chips, and loading/error/empty states"
```

---

## Phase 2: Drag-and-Drop Integration

### Task 7: Add type discriminator to EventBlock

**Files:**
- Modify: `apps/web/components/calendar/EventBlock.tsx:29-32`

- [x]  **Step 1: Update drag data**

In `EventBlock.tsx`, change line 31 from:

```typescript
    data: { activity },
```

to:

```typescript
    data: { type: 'activity' as const, activity },
```

This adds the type discriminator so `handleDragEnd` can distinguish activity moves from suggestion drops.

- [x]  **Step 2: Verify typecheck and existing drag still works**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`

- [x]  **Step 3: Commit**

```bash
git add apps/web/components/calendar/EventBlock.tsx
git commit -m "feat: add type discriminator to EventBlock drag data"
```

---

### Task 8: Extend useCalendarDnd for suggestion drops

**Files:**
- Modify: `apps/web/components/calendar/hooks/useCalendarDnd.ts`

- [x]  **Step 1: Update the hook**

Replace the entire file content with:

```typescript
import { useState, useCallback } from 'react'
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragEndEvent,
} from '@dnd-kit/core'
import { suggestionToCalendarActivity } from '@travyl/shared/utils/suggestionMapper'
import { HOUR_HEIGHT } from '../constants'
import type { CalendarActivity } from '../types'
import type { SuggestionCard } from '../types'

export { DndContext } from '@dnd-kit/core'

interface UseCalendarDndOptions {
  onMoveActivity: (id: string, newDay: number, newStartHour: number) => void
  onAddFromSuggestion: (activity: CalendarActivity, suggestionId: string) => void
  /** Ref to the scrollable grid container — used to compute absolute drop position for suggestions */
  scrollRef: React.RefObject<HTMLDivElement | null>
  /** Start hour of the visible time range (e.g., 7 for 7 AM) */
  timeRangeStartHour: number
}

export function useCalendarDnd({
  onMoveActivity,
  onAddFromSuggestion,
  scrollRef,
  timeRangeStartHour,
}: UseCalendarDndOptions) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor),
  )

  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over, delta } = event

      if (!over) return

      const overIdStr = String(over.id)
      let newDay: number | null = null

      if (overIdStr.startsWith('day-')) {
        const parsed = parseInt(overIdStr.replace('day-', ''), 10)
        if (!isNaN(parsed)) newDay = parsed
      }

      if (newDay === null) return

      const dragData = active.data?.current as
        | { type: 'activity'; activity: CalendarActivity }
        | { type: 'suggestion'; suggestion: SuggestionCard }
        | undefined

      if (!dragData) return

      if (dragData.type === 'activity') {
        // Existing activity move — use delta from current position
        const rawHourDelta = delta.y / HOUR_HEIGHT
        const snappedHourDelta = Math.round(rawHourDelta * 2) / 2
        const currentStartHour = dragData.activity.startHour ?? 0
        const newStartHour = Math.max(0, Math.min(23, currentStartHour + snappedHourDelta))
        onMoveActivity(String(active.id), newDay, newStartHour)
      } else if (dragData.type === 'suggestion') {
        // New activity from suggestion — compute absolute drop position on grid
        // Use the over droppable's rect + pointer offset to find the hour
        const overRect = over.rect
        const scrollTop = scrollRef.current?.scrollTop ?? 0
        // activatorEvent is the pointer event that initiated the drag
        const pointerY = (event.activatorEvent as PointerEvent)?.clientY ?? 0
        const dropY = pointerY + delta.y
        // Convert from screen Y to grid-relative Y
        const gridRelativeY = dropY - overRect.top + scrollTop
        const rawHour = timeRangeStartHour + gridRelativeY / HOUR_HEIGHT
        const snappedStartHour = Math.max(0, Math.min(23, Math.round(rawHour * 2) / 2))

        const newActivity = suggestionToCalendarActivity(
          dragData.suggestion,
          newDay,
          snappedStartHour,
        )
        onAddFromSuggestion(newActivity, dragData.suggestion.id)
      }
    },
    [onMoveActivity, onAddFromSuggestion, scrollRef, timeRangeStartHour],
  )

  return {
    sensors,
    activeId,
    handleDragStart,
    handleDragEnd,
  }
}
```

- [x]  **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit -p apps/web/tsconfig.json`

- [x]  **Step 3: Commit**

```bash
git add apps/web/components/calendar/hooks/useCalendarDnd.ts
git commit -m "feat: extend useCalendarDnd to handle suggestion drops with type branching"
```

---

## Phase 3: CalendarDashboard Integration

### Task 9: Hoist DndContext and add right column panel switching

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

This is the largest single change. Key modifications:
1. Hoist `DndContext` to wrap both the grid and the right column
2. Add `ForYouPanel` import
3. Add `rightPanel` state: `'for-you' | 'detail'`
4. Wire `onAddFromSuggestion` into the dnd hook
5. Switch right column between ForYouPanel and DetailPanel

- [x]  **Step 1: Add imports**

At the top of CalendarDashboard.tsx, add:

```typescript
import { ForYouPanel } from './ForYouPanel'
```

- [x]  **Step 2: Add state for tracking dropped suggestion IDs**

After the existing hook calls, add:

```typescript
  const [droppedSuggestionIds, setDroppedSuggestionIds] = useState<string[]>([])
```

- [x]  **Step 3: Update useCalendarDnd call**

Change the existing `useCalendarDnd` call (around line 62) to pass `scrollRef`, `timeRangeStartHour`, and the new `onAddFromSuggestion` callback:

```typescript
  const handleAddFromSuggestion = useCallback(async (activity: CalendarActivity, suggestionId: string) => {
    await addActivity(activity)
    selectEvent(activity.id)
    setDroppedSuggestionIds((prev) => [...prev, suggestionId])
  }, [addActivity, selectEvent])

  const { sensors, activeId, handleDragStart, handleDragEnd } = useCalendarDnd({
    onMoveActivity: moveActivity,
    onAddFromSuggestion: handleAddFromSuggestion,
    scrollRef,
    timeRangeStartHour: timeRange.startHour,
  })
```

- [x]  **Step 4: Add right panel state**

After the `useCalendarNavigation` hook, add:

```typescript
  // Right panel: 'for-you' by default, 'detail' when an event is selected
  const rightPanel = selectedEventId ? 'detail' : 'for-you'
```

- [x]  **Step 5: Add DragOverlay import**

Add to the imports at the top:

```typescript
import { DndContext, DragOverlay } from '@dnd-kit/core'
```

(Remove the existing `import { DndContext } from '@dnd-kit/core'` if present.)

- [x]  **Step 6: Restructure the JSX — hoist DndContext, add right column, add DragOverlay**

Replace the grid area section (from the `{activeNav === 'calendar' ? (` block through the closing `)}`) with the restructured version that:
- Moves `DndContext` outside the scrollable grid to wrap both grid + right column
- Adds the ForYouPanel / DetailPanel conditional render as a sibling to the grid

The key structural change:

```tsx
{activeNav === 'calendar' ? (
  <DndContext
    sensors={sensors}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
  >
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex flex-1 min-w-0 overflow-auto">
        <AnimatePresence mode="wait" initial={false}>
          {viewMode === 'week' ? (
            <motion.div
              key="week"
              className="flex flex-1 min-w-0"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <WeekView
                days={TRIP_DAYS}
                activities={activities}
                viewers={collaborators}
                selectedEventId={selectedEventId}
                timeRange={timeRange}
                tripStartDate={parsedStartDate}
                onSelectEvent={handleSelectEvent}
                onClickDayHeader={handleClickDayHeader}
                onCreateActivity={handleCreateActivity}
              />
            </motion.div>
          ) : (
            <motion.div
              key={`day-${selectedDayIndex}`}
              className="flex flex-1 min-w-0"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <DayView
                dayIndex={selectedDayIndex}
                label={TRIP_DAYS[selectedDayIndex]?.label ?? ''}
                activities={activities}
                viewers={collaborators}
                selectedEventId={selectedEventId}
                timeRange={timeRange}
                tripStartDate={parsedStartDate}
                onSelectEvent={handleSelectEvent}
                onCreateActivity={handleCreateActivity}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right column: For You panel or Detail panel */}
      {rightPanel === 'detail' ? (
        <DetailPanel
          activity={selectedActivity}
          viewers={collaborators}
          onClose={handleCloseDetail}
          onRemove={handleRemoveActivity}
          onUpdateActivity={updateActivity}
        />
      ) : (
        <ForYouPanel
          destination={trip?.destination ?? ''}
          scheduledActivityIds={droppedSuggestionIds}
        />
      )}
    </div>

    {/* Drag overlay — shows ghost of dragged item */}
    <DragOverlay dropAnimation={null}>
      {activeId ? (
        <div className="opacity-60 pointer-events-none rounded-lg shadow-2xl" />
      ) : null}
    </DragOverlay>

    {/* Empty state */}
    {activities.length === 0 && (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
        {/* ... existing empty state SVG and text ... */}
      </div>
    )}
  </DndContext>
) : (
  /* ... existing non-calendar nav placeholder ... */
)}
```

- [x]  **Step 7: Wire restore-on-delete — suggestion reappears when activity is removed**

Update the `handleRemoveActivity` function to also remove the suggestion ID from the tracked list:

```typescript
  // Track mapping from activity ID → suggestion ID for restore-on-delete
  const [activityToSuggestion, setActivityToSuggestion] = useState<Map<string, string>>(new Map())
```

Update `handleAddFromSuggestion` to also record the mapping:

```typescript
  const handleAddFromSuggestion = useCallback(async (activity: CalendarActivity, suggestionId: string) => {
    await addActivity(activity)
    selectEvent(activity.id)
    setDroppedSuggestionIds((prev) => [...prev, suggestionId])
    setActivityToSuggestion((prev) => new Map(prev).set(activity.id, suggestionId))
  }, [addActivity, selectEvent])
```

Update `handleRemoveActivity` to restore the suggestion:

```typescript
  const handleRemoveActivity = (id: string) => {
    removeActivity(id)
    if (selectedEventId === id) selectEvent(null)
    // Restore the suggestion card in the ForYou panel
    const suggestionId = activityToSuggestion.get(id)
    if (suggestionId) {
      setDroppedSuggestionIds((prev) => prev.filter((sid) => sid !== suggestionId))
      setActivityToSuggestion((prev) => { const next = new Map(prev); next.delete(id); return next })
    }
  }
```

- [x]  **Step 8: Verify the app runs**

Run: `npm -w @travyl/web run dev`
Open a trip page. Verify:
- ForYou panel appears on the right with mock suggestion cards
- Clicking an event on the calendar swaps to DetailPanel
- Closing the DetailPanel returns to ForYou panel
- Filter chips filter the suggestions
- Search box filters the suggestions
- Dragging a suggestion card onto a day column creates a new activity
- The dragged suggestion disappears from the ForYou panel
- Hover over a suggestion card shows the "Drag to schedule" badge

- [x]  **Step 9: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: integrate ForYouPanel into CalendarDashboard with DndContext hoist and panel switching"
```

---

## Phase 4: SST Infrastructure Setup

### Task 10: Initialize SST in the monorepo

**Files:**
- Create: `sst.config.ts`
- Modify: `package.json` (if needed for workspaces)

- [x]  **Step 1: Install SST**

Run: `npx sst@latest init`

Follow the prompts. This creates `sst.config.ts` at the repo root. If it asks about framework, select "Other" (we'll configure Next.js manually).

- [x]  **Step 2: Configure sst.config.ts**

Replace the generated `sst.config.ts` with:

```typescript
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'travyl',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage ?? ''),
      home: 'aws',
    }
  },
  async run() {
    const secrets = await import('./infra/secrets')
    const storage = await import('./infra/storage')
    const events = await import('./infra/events')
    const api = await import('./infra/api')

    return {
      apiUrl: api.api.url,
    }
  },
})
```

- [x]  **Step 3: Commit**

```bash
git add sst.config.ts
git commit -m "feat: initialize SST v3 in monorepo root"
```

---

### Task 11: Define SST secrets

**Files:**
- Create: `infra/secrets.ts`

- [x]  **Step 1: Create secrets file**

```typescript
// infra/secrets.ts
export const googlePlacesApiKey = new sst.Secret('GooglePlacesApiKey')
export const supabaseServiceRoleKey = new sst.Secret('SupabaseServiceRoleKey')
export const supabaseUrl = new sst.Secret('SupabaseUrl')
```

- [x]  **Step 2: Commit**

```bash
git add infra/secrets.ts
git commit -m "feat: add SST secrets for API keys"
```

---

### Task 12: Define SST storage resources

**Files:**
- Create: `infra/storage.ts`

- [x]  **Step 1: Create storage definitions**

```typescript
// infra/storage.ts

// Recommendation cache
export const cacheTable = new sst.aws.Dynamo('RecommendationCache', {
  fields: {
    pk: 'string',   // {userId}:{destination}
    sk: 'string',   // {travelStyle}:{budgetTier}
  },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  ttl: 'expiresAt',
})

// Activity images + Personalize training data
export const bucket = new sst.aws.Bucket('ActivityAssets')

// CDN for activity images
export const cdn = new sst.aws.Router('ActivityCdn', {
  routes: {
    '/*': bucket.name,
  },
})

// Note: OpenSearch Serverless collection requires custom Pulumi resource.
// Defined separately during Phase 5 (OpenSearch + embeddings) to avoid
// incurring costs before the catalog ingestion pipeline is ready.
```

- [x]  **Step 2: Commit**

```bash
git add infra/storage.ts
git commit -m "feat: add SST storage resources — DynamoDB cache, S3, CloudFront"
```

---

### Task 13: Define SST EventBridge

**Files:**
- Create: `infra/events.ts`

- [x]  **Step 1: Create events definition**

```typescript
// infra/events.ts

export const bus = new sst.aws.Bus('InteractionBus')

// Subscriber: store interaction events (wired up in Task 16)
// bus.subscribe('services/handle-interaction.handler')
```

- [x]  **Step 2: Commit**

```bash
git add infra/events.ts
git commit -m "feat: add SST EventBridge bus for interaction events"
```

---

### Task 14: Define SST API Gateway + Lambda routes

**Files:**
- Create: `infra/api.ts`

- [x]  **Step 1: Create API definition**

```typescript
// infra/api.ts
import { cacheTable } from './storage'
import { bus } from './events'
import { supabaseServiceRoleKey, supabaseUrl } from './secrets'

export const api = new sst.aws.ApiGatewayV2('RecommendationApi', {
  cors: {
    allowOrigins: ['http://localhost:3000', 'https://*.vercel.app'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
  },
})

api.route('GET /suggest', {
  handler: 'services/suggest.handler',
  link: [cacheTable, supabaseServiceRoleKey, supabaseUrl],
})

api.route('GET /search', {
  handler: 'services/search.handler',
  link: [supabaseServiceRoleKey, supabaseUrl],
})

api.route('POST /interact', {
  handler: 'services/interact.handler',
  link: [bus, supabaseServiceRoleKey, supabaseUrl],
})
```

- [x]  **Step 2: Commit**

```bash
git add infra/api.ts
git commit -m "feat: add SST API Gateway with suggest, search, and interact routes"
```

---

## Phase 5: Lambda Functions

### Task 15: Auth helper + shared types

**Files:**
- Create: `services/lib/auth.ts`
- Create: `services/lib/types.ts`

- [x]  **Step 1: Create auth helper**

```typescript
// services/lib/auth.ts
import { Resource } from 'sst'
import { createClient } from '@supabase/supabase-js'

export async function validateAuth(authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header')
  }

  const token = authHeader.slice(7)
  const supabase = createClient(
    Resource.SupabaseUrl.value,
    Resource.SupabaseServiceRoleKey.value,
  )

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    throw new Error('Invalid token')
  }

  return data.user.id
}
```

- [x]  **Step 2: Create shared types**

```typescript
// services/lib/types.ts

// Re-export from shared package
export type { SuggestionCard } from '@travyl/shared/types'

import type { SuggestionCard } from '@travyl/shared/types'

export interface SuggestResponse {
  suggestions: SuggestionCard[]
  source: 'cache' | 'fresh'
}

export interface SearchResponse {
  results: SuggestionCard[]
}

export interface InteractRequest {
  suggestionId: string
  action: 'impression' | 'click' | 'drag' | 'dismiss'
  tripId: string
}
```

- [x]  **Step 3: Commit**

```bash
git add services/lib/auth.ts services/lib/types.ts
git commit -m "feat: add Supabase JWT auth helper and shared Lambda types"
```

---

### Task 16: suggest Lambda (with DynamoDB cache)

**Files:**
- Create: `services/lib/cache.ts`
- Create: `services/suggest.ts`

- [x]  **Step 1: Create cache helper**

```typescript
// services/lib/cache.ts
import { Resource } from 'sst'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import type { SuggestionCard } from './types'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

interface CacheEntry {
  pk: string
  sk: string
  suggestions: SuggestionCard[]
  expiresAt: number
}

export async function getCachedSuggestions(
  userId: string,
  destination: string,
): Promise<SuggestionCard[] | null> {
  const result = await client.send(
    new GetCommand({
      TableName: Resource.RecommendationCache.name,
      Key: { pk: `${userId}:${destination}`, sk: 'suggestions' },
    }),
  )

  if (!result.Item) return null
  const entry = result.Item as CacheEntry
  if (entry.expiresAt < Math.floor(Date.now() / 1000)) return null
  return entry.suggestions
}

export async function setCachedSuggestions(
  userId: string,
  destination: string,
  suggestions: SuggestionCard[],
  ttlSeconds: number = 1800, // 30 min default
): Promise<void> {
  await client.send(
    new PutCommand({
      TableName: Resource.RecommendationCache.name,
      Item: {
        pk: `${userId}:${destination}`,
        sk: 'suggestions',
        suggestions,
        expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
      },
    }),
  )
}
```

- [x]  **Step 2: Create suggest Lambda**

```typescript
// services/suggest.ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { validateAuth } from './lib/auth'
import { getCachedSuggestions, setCachedSuggestions } from './lib/cache'
import type { SuggestResponse } from './lib/types'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const destination = event.queryStringParameters?.destination
    const tripId = event.queryStringParameters?.tripId

    if (!destination) {
      return { statusCode: 400, body: JSON.stringify({ error: 'destination required' }) }
    }

    // Check cache
    const cached = await getCachedSuggestions(userId, destination)
    if (cached) {
      const response: SuggestResponse = { suggestions: cached, source: 'cache' }
      return { statusCode: 200, body: JSON.stringify(response) }
    }

    // TODO: Query OpenSearch + re-rank via Personalize
    // For now, return empty (frontend falls back to mock data)
    const response: SuggestResponse = { suggestions: [], source: 'fresh' }
    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('suggest error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
```

- [x]  **Step 3: Commit**

```bash
git add services/lib/cache.ts services/suggest.ts
git commit -m "feat: add suggest Lambda with DynamoDB cache layer"
```

---

### Task 17: search Lambda (stub)

**Files:**
- Create: `services/search.ts`

- [x]  **Step 1: Create search Lambda**

```typescript
// services/search.ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { validateAuth } from './lib/auth'
import type { SearchResponse } from './lib/types'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const query = event.queryStringParameters?.q
    const destination = event.queryStringParameters?.destination

    if (!query || !destination) {
      return { statusCode: 400, body: JSON.stringify({ error: 'q and destination required' }) }
    }

    // TODO: Embed query via Bedrock Titan → OpenSearch kNN → filter by destination
    // For now, return empty (frontend uses client-side mock filtering)
    const response: SearchResponse = { results: [] }
    return { statusCode: 200, body: JSON.stringify(response) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('search error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
```

- [x]  **Step 2: Commit**

```bash
git add services/search.ts
git commit -m "feat: add search Lambda stub with auth validation"
```

---

### Task 18: interact Lambda + EventBridge publish

**Files:**
- Create: `services/interact.ts`

- [x]  **Step 1: Create interact Lambda**

```typescript
// services/interact.ts
import { Resource } from 'sst'
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge'
import { validateAuth } from './lib/auth'
import type { InteractRequest } from './lib/types'

const eb = new EventBridgeClient({})

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)

    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'body required' }) }
    }

    const body: InteractRequest = JSON.parse(event.body)
    const { suggestionId, action, tripId } = body

    if (!suggestionId || !action || !tripId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'suggestionId, action, tripId required' }) }
    }

    await eb.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'travyl.recommendations',
            DetailType: 'suggestion.interaction',
            EventBusName: Resource.InteractionBus.name,
            Detail: JSON.stringify({
              userId,
              suggestionId,
              action,
              tripId,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      }),
    )

    return { statusCode: 202, body: '' }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('interact error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
```

- [x]  **Step 2: Commit**

```bash
git add services/interact.ts
git commit -m "feat: add interact Lambda publishing to EventBridge"
```

---

## Phase 6: Wire Frontend to API

### Task 19: useInteractionTracking hook

**Files:**
- Create: `apps/web/components/calendar/hooks/useInteractionTracking.ts`

- [x]  **Step 1: Create the hook**

```typescript
// apps/web/components/calendar/hooks/useInteractionTracking.ts
'use client'

import { useCallback } from 'react'
import { useAuthStore } from '@travyl/shared/stores/authStore'

type InteractionAction = 'impression' | 'click' | 'drag' | 'dismiss'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export function useInteractionTracking(tripId: string) {
  const session = useAuthStore((s) => s.session)

  const trackInteraction = useCallback(
    async (suggestionId: string, action: InteractionAction) => {
      if (!API_URL || !session?.access_token) return

      try {
        await fetch(`${API_URL}/interact`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ suggestionId, action, tripId }),
        })
      } catch {
        // Fire-and-forget — don't block UI on tracking failures
      }
    },
    [tripId, session?.access_token],
  )

  return { trackInteraction }
}
```

- [x]  **Step 2: Commit**

```bash
git add apps/web/components/calendar/hooks/useInteractionTracking.ts
git commit -m "feat: add useInteractionTracking hook for suggestion interaction events"
```

---

### Task 20: Wire interaction tracking into CalendarDashboard

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [x]  **Step 1: Import and use the hook**

Add import:
```typescript
import { useInteractionTracking } from './hooks/useInteractionTracking'
```

Add after other hooks:
```typescript
const { trackInteraction } = useInteractionTracking(tripId)
```

Update `handleAddFromSuggestion` to fire the drag event:
```typescript
  const handleAddFromSuggestion = useCallback(async (activity: CalendarActivity, suggestionId: string) => {
    await addActivity(activity)
    selectEvent(activity.id)
    trackInteraction(suggestionId, 'drag')
  }, [addActivity, selectEvent, trackInteraction])
```

- [x]  **Step 2: Verify the app runs**

Run: `npm -w @travyl/web run dev`
Verify drag-to-calendar still works and no console errors appear.

- [x]  **Step 3: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire interaction tracking into suggestion drop handler"
```

---

## Phase 7: Deploy and verify

### Task 21: First SST deploy

- [x]  **Step 1: Set secrets**

Run:
```bash
npx sst secret set GooglePlacesApiKey <your-key>
npx sst secret set SupabaseServiceRoleKey <your-key>
npx sst secret set SupabaseUrl <your-url>
```

- [x]  **Step 2: Deploy to dev stage**

Run: `npx sst deploy --stage dev`

Expected: Deploys API Gateway, Lambda functions, DynamoDB table, S3 bucket, CloudFront distribution, EventBridge bus. Outputs the API URL.

- [x]  **Step 3: Add API URL to frontend env**

Add to `apps/web/.env.local`:
```
NEXT_PUBLIC_RECOMMENDATION_API_URL=<api-url-from-deploy-output>
```

- [x]  **Step 4: Verify endpoints**

Test the suggest endpoint:
```bash
curl -H "Authorization: Bearer <valid-supabase-jwt>" "<api-url>/suggest?destination=Paris&tripId=test"
```
Expected: `{ "suggestions": [], "source": "fresh" }` (empty until OpenSearch is wired)

- [x]  **Step 5: Commit env example**

```bash
echo "NEXT_PUBLIC_RECOMMENDATION_API_URL=" >> apps/web/.env.example
git add apps/web/.env.example
git commit -m "docs: add NEXT_PUBLIC_RECOMMENDATION_API_URL to env example"
```

---

## Remaining work (future tasks, not in this plan)

The following items from the spec are deferred to separate implementation plans:

- **OpenSearch Serverless collection** — Pulumi resource definition + index creation
- **Bedrock Titan embedding client** (`services/lib/embedding.ts`) — embed activities + queries
- **OpenSearch query builder** (`services/lib/opensearch.ts`) — vector similarity search
- **Catalog ingestion job** (`services/ingest.ts`) — Google Places / Viator API integration
- **Batch embedding job** (`services/embed.ts`) — compute vectors for new activities
- **Amazon Personalize setup** — Dataset Group, Schemas, EventTracker, Solution, Campaign (highest-complexity infra item)
- **Personalize runtime client** (`services/lib/personalize.ts`) — re-ranking integration
- **Swap mock data for real API** in `useSuggestions.ts` — React Query with fallback to mocks
- **Drag preview polish** — custom DragOverlay with proximity-based scaling
- **Keyboard accessibility** — "Schedule" button on cards with day/time picker popover
- **useCalendarDnd integration tests** — the type-branching and coordinate math in `handleDragEnd` should be tested, but requires DOM measurement mocking (droppable rects, scroll positions). Deferred to a dedicated testing task once the feature stabilizes. The `suggestionToCalendarActivity` mapper (which is pure) is tested in this plan.
