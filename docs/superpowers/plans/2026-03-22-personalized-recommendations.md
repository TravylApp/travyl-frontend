# Personalized For You Recommendations — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add affinity-based re-ranking to the For You panel so suggestions reflect user interests, using EventBridge interaction data persisted to DynamoDB.

**Architecture:** EventBridge subscriber writes interaction events + running affinity aggregates to a new UserInteractions DynamoDB table. A new `/recommend` Lambda loads affinity data and re-ranks SerpAPI results. Frontend switches from `/api/suggest` to the authenticated `/recommend` endpoint.

**Tech Stack:** SST v4 (Ion), DynamoDB, EventBridge, AWS Lambda, TypeScript, React Query, Vitest

**Spec:** `docs/superpowers/specs/2026-03-22-personalized-recommendations-design.md`

---

## Chunk 1: Infrastructure + Backend

### Task 1: Add UserInteractions DynamoDB table

**Files:**
- Modify: `infra/storage.ts`

- [ ] **Step 1: Add the table definition**

Add to the end of `infra/storage.ts`:

```typescript
// User interaction events + affinity aggregates for personalized recommendations
export const userInteractions = new sst.aws.Dynamo('UserInteractions', {
  fields: { pk: 'string', sk: 'string' },
  primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
  ttl: 'expiresAt',
})
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — no type errors

- [ ] **Step 3: Commit**

```bash
git add infra/storage.ts
git commit -m "infra: add UserInteractions DynamoDB table for affinity tracking"
```

---

### Task 2: Wire EventBridge subscriber

**Files:**
- Modify: `infra/events.ts`
- Modify: `infra/api.ts` (import new table)

- [ ] **Step 1: Update events.ts to subscribe**

Replace the commented-out subscriber in `infra/events.ts`:

```typescript
import { userInteractions } from './storage'

export const bus = new sst.aws.Bus('InteractionBus')

bus.subscribe('services/processInteraction.handler', {
  link: [userInteractions],
})
```

- [ ] **Step 2: Add /recommend route to api.ts**

Add the import of `userInteractions` from `./storage` and the new route at the end of `infra/api.ts`:

```typescript
// At top, update import:
import { cacheTable, placeIndex, userInteractions } from './storage'

// At bottom, add:
api.route('GET /recommend', {
  handler: 'services/recommend.handler',
  link: [cacheTable, userInteractions, supabaseSecretKey, supabaseUrl, serpApiKey],
})
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: May warn about missing handler files (processInteraction, recommend) — that's fine, they're created in the next tasks.

- [ ] **Step 4: Commit**

```bash
git add infra/events.ts infra/api.ts
git commit -m "infra: wire EventBridge subscriber and /recommend route"
```

---

### Task 3: Add category to interaction payload

**Files:**
- Modify: `services/lib/types.ts`
- Modify: `services/interact.ts`

- [ ] **Step 1: Update InteractRequest type**

In `services/lib/types.ts`, add `category` to `InteractRequest`:

```typescript
export interface InteractRequest {
  suggestionId: string
  action: 'impression' | 'click' | 'drag' | 'dismiss'
  tripId: string
  category?: string  // ActivityCategory slug, optional for backwards compat
}
```

- [ ] **Step 2: Pass category through in interact.ts**

In `services/interact.ts`, destructure `category` from body and include it in the EventBridge detail. Change line 18-19:

```typescript
const { suggestionId, action, tripId, category } = body
```

And update the `Detail` JSON.stringify to include `category`:

```typescript
Detail: JSON.stringify({
  userId,
  suggestionId,
  action,
  category,
  tripId,
  timestamp: new Date().toISOString(),
}),
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add services/lib/types.ts services/interact.ts
git commit -m "feat: add category field to interaction event payload"
```

---

### Task 4: Build affinity logic (testable pure functions)

**Files:**
- Create: `services/lib/affinity.ts`
- Create: `services/lib/affinity.test.ts`

- [ ] **Step 1: Write tests for affinity weight calculation and re-ranking**

Create `services/lib/affinity.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  ACTION_WEIGHTS,
  normalizeScores,
  rerank,
} from './affinity'
import type { SuggestionCard } from './types'

describe('ACTION_WEIGHTS', () => {
  it('maps actions to correct weights', () => {
    expect(ACTION_WEIGHTS.impression).toBe(0.1)
    expect(ACTION_WEIGHTS.click).toBe(0.3)
    expect(ACTION_WEIGHTS.drag).toBe(1.0)
    expect(ACTION_WEIGHTS.dismiss).toBe(-0.5)
  })
})

describe('normalizeScores', () => {
  it('normalizes scores to 0-1 range by dividing by max', () => {
    const scores = { dining: 10, sightseeing: 5, shopping: 2 }
    const result = normalizeScores(scores)
    expect(result).toEqual({ dining: 1.0, sightseeing: 0.5, shopping: 0.2 })
  })

  it('returns empty object for empty scores', () => {
    expect(normalizeScores({})).toEqual({})
  })

  it('returns 1.0 for single category', () => {
    expect(normalizeScores({ dining: 3 })).toEqual({ dining: 1.0 })
  })

  it('handles all-zero scores', () => {
    expect(normalizeScores({ dining: 0, shopping: 0 })).toEqual({})
  })
})

describe('rerank', () => {
  const makeSuggestion = (id: string, category: string, relevanceScore: number): SuggestionCard => ({
    id,
    name: `Place ${id}`,
    category,
    imageUrl: '',
    duration: 2,
    price: null,
    currency: 'USD',
    rating: null,
    location: '',
    latitude: 0,
    longitude: 0,
    description: '',
    source: 'search',
    relevanceScore,
  })

  it('boosts suggestions matching high-affinity categories', () => {
    const suggestions = [
      makeSuggestion('1', 'sightseeing', 1.0),
      makeSuggestion('2', 'dining', 0.8),
      makeSuggestion('3', 'shopping', 0.6),
    ]
    const affinityScores = { dining: 10, sightseeing: 2 }

    const result = rerank(suggestions, affinityScores)

    // dining has highest affinity (normalized=1.0), should be boosted
    expect(result[0].id).toBe('2') // dining: 0.8*0.6 + 1.0*0.4 = 0.88
    expect(result[1].id).toBe('1') // sightseeing: 1.0*0.6 + 0.2*0.4 = 0.68
    expect(result[2].id).toBe('3') // shopping: 0.6*0.6 + 0*0.4 = 0.36
  })

  it('returns original order when no affinity data', () => {
    const suggestions = [
      makeSuggestion('1', 'sightseeing', 1.0),
      makeSuggestion('2', 'dining', 0.8),
    ]

    const result = rerank(suggestions, {})
    expect(result[0].id).toBe('1')
    expect(result[1].id).toBe('2')
  })

  it('adds reason for high-affinity categories (normalized > 0.5)', () => {
    const suggestions = [
      makeSuggestion('1', 'dining', 0.8),
      makeSuggestion('2', 'shopping', 0.6),
    ]
    const affinityScores = { dining: 10, shopping: 2 }

    const result = rerank(suggestions, affinityScores)

    // dining normalized=1.0 > 0.5, gets reason
    const diningResult = result.find(s => s.id === '1')!
    expect(diningResult.reason).toBe('Matches your interest in dining')

    // shopping normalized=0.2 < 0.5, no reason
    const shoppingResult = result.find(s => s.id === '2')!
    expect(shoppingResult.reason).toBeUndefined()
  })

  it('treats unknown categories as 0 affinity', () => {
    const suggestions = [makeSuggestion('1', 'nightlife', 0.5)]
    const affinityScores = { dining: 10 }

    const result = rerank(suggestions, affinityScores)
    expect(result[0].relevanceScore).toBeCloseTo(0.3) // 0.5*0.6 + 0*0.4
    expect(result[0].reason).toBeUndefined()
  })

  it('does not mutate the original array', () => {
    const suggestions = [
      makeSuggestion('1', 'dining', 1.0),
      makeSuggestion('2', 'sightseeing', 0.8),
    ]
    const original = [...suggestions]

    rerank(suggestions, { dining: 5 })

    expect(suggestions).toEqual(original)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/shared && npx vitest run ../../../services/lib/affinity.test.ts`

Wait — tests for services don't have a vitest config. We need to run them differently. Since these are pure functions with no SST dependencies, add a vitest config for services:

Create `services/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
  },
})
```

Run: `cd services && npx vitest run lib/affinity.test.ts`
Expected: FAIL — module `./affinity` not found

- [ ] **Step 3: Implement affinity.ts**

Create `services/lib/affinity.ts`:

```typescript
import type { SuggestionCard } from './types'

export const ACTION_WEIGHTS: Record<string, number> = {
  impression: 0.1,
  click: 0.3,
  drag: 1.0,
  dismiss: -0.5,
}

const SERP_WEIGHT = 0.6
const AFFINITY_WEIGHT = 0.4
const REASON_THRESHOLD = 0.5

export function normalizeScores(
  scores: Record<string, number>,
): Record<string, number> {
  const values = Object.values(scores)
  const max = Math.max(...values, 0)
  if (max === 0) return {}

  const normalized: Record<string, number> = {}
  for (const [category, score] of Object.entries(scores)) {
    normalized[category] = score / max
  }
  return normalized
}

export function rerank(
  suggestions: SuggestionCard[],
  categoryScores: Record<string, number>,
): SuggestionCard[] {
  const normalized = normalizeScores(categoryScores)

  if (Object.keys(normalized).length === 0) {
    return suggestions
  }

  return suggestions
    .map((s) => {
      const affinity = normalized[s.category] ?? 0
      const finalScore =
        s.relevanceScore * SERP_WEIGHT + affinity * AFFINITY_WEIGHT
      const reason =
        affinity > REASON_THRESHOLD
          ? `Matches your interest in ${s.category}`
          : undefined

      return { ...s, relevanceScore: finalScore, reason }
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd services && npx vitest run lib/affinity.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add services/lib/affinity.ts services/lib/affinity.test.ts services/vitest.config.ts
git commit -m "feat: add affinity scoring and re-ranking logic with tests"
```

---

### Task 5: Build processInteraction Lambda

**Files:**
- Create: `services/processInteraction.ts`

- [ ] **Step 1: Implement the EventBridge subscriber handler**

Create `services/processInteraction.ts`:

```typescript
import { Resource } from 'sst'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { ACTION_WEIGHTS } from './lib/affinity'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

interface InteractionDetail {
  userId: string
  suggestionId: string
  action: string
  category?: string
  tripId: string
  timestamp: string
}

export const handler = async (event: { detail: InteractionDetail }) => {
  const { userId, suggestionId, action, category, tripId, timestamp } =
    event.detail

  if (!category) {
    console.log('[processInteraction] skipping event without category')
    return
  }

  const weight = ACTION_WEIGHTS[action]
  if (weight === undefined) {
    console.log('[processInteraction] unknown action:', action)
    return
  }

  const tableName = Resource.UserInteractions.name

  // 1. Write raw event row (90-day TTL)
  const ttl = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60
  const ulid = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: `USER#${userId}`,
        sk: `INT#${timestamp}#${ulid}`,
        suggestionId,
        action,
        category,
        tripId,
        expiresAt: ttl,
      },
    }),
  )

  // 2. Atomic update affinity aggregate
  // First ensure the categoryScores map exists on the AFFINITY row
  // (needed for first-ever interaction — ADD on nested paths requires the parent map)
  await client.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk: `USER#${userId}`, sk: 'AFFINITY' },
      UpdateExpression:
        'SET categoryScores = if_not_exists(categoryScores, :empty), lastUpdated = :ts',
      ExpressionAttributeValues: { ':empty': {}, ':ts': timestamp },
    }),
  )

  if (weight > 0) {
    // Positive weight: SET with if_not_exists for the category key
    await client.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { pk: `USER#${userId}`, sk: 'AFFINITY' },
        UpdateExpression:
          'SET categoryScores.#cat = if_not_exists(categoryScores.#cat, :zero) + :w',
        ExpressionAttributeNames: { '#cat': category },
        ExpressionAttributeValues: { ':w': weight, ':zero': 0 },
      }),
    )
  } else {
    // Negative weight (dismiss): decrement but floor at 0
    try {
      await client.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { pk: `USER#${userId}`, sk: 'AFFINITY' },
          UpdateExpression:
            'SET categoryScores.#cat = if_not_exists(categoryScores.#cat, :zero) + :w',
          ConditionExpression:
            'attribute_not_exists(categoryScores.#cat) OR categoryScores.#cat >= :absw',
          ExpressionAttributeNames: { '#cat': category },
          ExpressionAttributeValues: {
            ':w': weight,
            ':zero': 0,
            ':absw': Math.abs(weight),
          },
        }),
      )
    } catch (err: any) {
      if (err.name === 'ConditionalCheckFailedException') {
        // Score would go negative — floor at 0
        await client.send(
          new UpdateCommand({
            TableName: tableName,
            Key: { pk: `USER#${userId}`, sk: 'AFFINITY' },
            UpdateExpression: 'SET categoryScores.#cat = :zero',
            ExpressionAttributeNames: { '#cat': category },
            ExpressionAttributeValues: { ':zero': 0 },
          }),
        )
      } else {
        throw err
      }
    }
  }

  console.log(
    '[processInteraction]',
    action,
    category,
    'weight:', weight,
    'user:', userId,
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add services/processInteraction.ts
git commit -m "feat: add processInteraction EventBridge subscriber Lambda"
```

---

### Task 6: Build recommend Lambda

**Files:**
- Create: `services/recommend.ts`

- [ ] **Step 1: Implement the recommend handler**

Create `services/recommend.ts`:

```typescript
import { Resource } from 'sst'
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { validateAuth } from './lib/auth'
import { getCachedSuggestions, setCachedSuggestions } from './lib/cache'
import { searchPlaces } from './lib/serpapi'
import { rerank } from './lib/affinity'

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

const PAGE_SIZE = 20

async function getAffinityScores(
  userId: string,
): Promise<Record<string, number> | null> {
  const result = await client.send(
    new GetCommand({
      TableName: Resource.UserInteractions.name,
      Key: { pk: `USER#${userId}`, sk: 'AFFINITY' },
    }),
  )

  if (!result.Item?.categoryScores) return null
  return result.Item.categoryScores as Record<string, number>
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const destination = event.queryStringParameters?.destination
    const category = event.queryStringParameters?.category ?? 'all'
    const start = parseInt(event.queryStringParameters?.start ?? '0', 10)

    if (!destination) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'destination required' }),
      }
    }

    console.log(
      '[recommend] destination:', destination,
      'category:', category,
      'start:', start,
      'userId:', userId,
    )

    // Fetch suggestions (cache-first, same as /suggest)
    let suggestions = await getCachedSuggestions(destination, category)

    if (!suggestions) {
      console.log('[recommend] cache miss, calling SerpAPI')
      suggestions = await searchPlaces(destination, category, { limit: 20 })

      if (suggestions.length > 0) {
        await setCachedSuggestions(destination, category, suggestions)
      }
    }

    // Load user affinity and re-rank
    const affinityScores = await getAffinityScores(userId)

    if (affinityScores) {
      console.log('[recommend] applying affinity re-ranking')
      suggestions = rerank(suggestions, affinityScores)
    }

    // Paginate after re-ranking
    const page = suggestions.slice(start, start + PAGE_SIZE)

    return {
      statusCode: 200,
      body: JSON.stringify({ suggestions: page }),
    }
  } catch (err: any) {
    if (
      err.message === 'Invalid token' ||
      err.message?.includes('Authorization')
    ) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }
    console.error('recommend error:', err)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add services/recommend.ts
git commit -m "feat: add /recommend Lambda with affinity-based re-ranking"
```

---

## Chunk 2: Frontend Changes

### Task 7: Add category to interaction tracking

**Files:**
- Modify: `apps/web/components/calendar/hooks/useInteractionTracking.ts`
- Modify: `apps/web/components/calendar/ForYouPanel.tsx`
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Update trackEvent to accept category**

In `apps/web/components/calendar/hooks/useInteractionTracking.ts`, update the `trackEvent` callback signature and POST body.

Change the callback (line 14-36) to:

```typescript
const trackEvent = useCallback(
  (suggestionId: string, action: InteractionAction, category: string) => {
    // Skip duplicate impressions
    if (action === 'impression') {
      if (impressedIds.current.has(suggestionId)) return
      impressedIds.current.add(suggestionId)
    }

    // Fire and forget — no await, no error handling
    supabase.auth.getSession().then(({ data: { session } }) => {
      const token = session?.access_token
      if (!token) return

      fetch(`${API_URL}/interact`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ suggestionId, action, tripId, category }),
      }).catch(() => {}) // swallow errors
    })
  },
  [tripId],
)
```

- [ ] **Step 2: Update ForYouPanel.tsx impression call sites**

In `apps/web/components/calendar/ForYouPanel.tsx`, update the `onVisible` callbacks (lines 201 and 211):

```typescript
onVisible={() => trackEvent(suggestion.id, 'impression', suggestion.category)}
```

Both masonry column instances need this change.

- [ ] **Step 2b: Add click tracking to ForYouPanel.tsx**

In `apps/web/components/calendar/ForYouPanel.tsx`, update the `handleCardClick` callback (line 71) to also fire a tracking event:

```typescript
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
```

Note: `dismiss` tracking is not wired yet — there's no dismiss UI element in the current ForYouPanel. The `removeSuggestion` function exists in `useSuggestions` but is not exposed to any UI button. Dismiss tracking can be added when that UI is built.

- [ ] **Step 3: Update CalendarDashboard.tsx drag call site**

In `apps/web/components/calendar/CalendarDashboard.tsx` line 115, update:

```typescript
trackEvent(suggestionId, 'drag', activity.type)
```

The `activity` parameter in `handleAddFromSuggestion` is a `CalendarActivity` which uses `type` (not `category`) for the activity category. The `type` value comes from `suggestion.category` when the suggestion is converted to a `CalendarActivity` in `useCalendarDnd.ts`.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — all call sites now pass 3 arguments

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/hooks/useInteractionTracking.ts apps/web/components/calendar/ForYouPanel.tsx apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: pass category through interaction tracking pipeline"
```

---

### Task 8: Switch useSuggestions to /recommend endpoint

**Files:**
- Modify: `apps/web/components/calendar/hooks/useSuggestions.ts`

- [ ] **Step 1: Update fetchSuggestions to call /recommend with JWT**

In `apps/web/components/calendar/hooks/useSuggestions.ts`, add the supabase import and rewrite `fetchSuggestions` (lines 1-73):

```typescript
// apps/web/components/calendar/hooks/useSuggestions.ts
'use client'

import { useState, useMemo, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'
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

const FILTER_TO_CATEGORY: Record<string, string> = {
  All: 'all',
  Sightseeing: 'sightseeing',
  Dining: 'dining',
  Tours: 'tour',
  Culture: 'cultural',
  Shopping: 'shopping',
  Nightlife: 'nightlife',
  Outdoor: 'outdoor',
}

export type FilterCategory = (typeof FILTER_CATEGORIES)[number]

// ... (keep existing interfaces unchanged)

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

async function fetchSuggestions(
  destination: string,
  category: string,
  start: number,
): Promise<SuggestionCard[]> {
  // Try authenticated /recommend endpoint first
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  if (token && API_URL) {
    const url = `${API_URL}/recommend?destination=${encodeURIComponent(destination)}&category=${encodeURIComponent(category)}&start=${start}`
    console.log('[ForYou] fetching (recommend):', url)

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    if (res.ok) {
      const data = await res.json()
      console.log('[ForYou] got', data.suggestions?.length ?? 0, 'personalized suggestions')
      return data.suggestions ?? []
    }

    console.warn('[ForYou] /recommend failed, falling back to /api/suggest')
  }

  // Fallback: unauthenticated Next.js proxy
  const url = `/api/suggest?destination=${encodeURIComponent(destination)}&category=${encodeURIComponent(category)}&start=${start}`
  console.log('[ForYou] fetching (fallback):', url)

  const res = await fetch(url)

  if (!res.ok) {
    const body = await res.text()
    console.error('[ForYou] error body:', body)
    throw new Error(`${res.status}: ${body}`)
  }

  const data = await res.json()
  console.log('[ForYou] got', data.suggestions?.length ?? 0, 'suggestions at start', start)
  return data.suggestions ?? []
}
```

Keep everything from `export function useSuggestions(...)` onward unchanged.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/hooks/useSuggestions.ts
git commit -m "feat: switch ForYou to /recommend endpoint with JWT auth"
```

---

### Task 9: Add reason badge to SuggestionCard

**Files:**
- Modify: `apps/web/components/calendar/SuggestionCard.tsx`

- [ ] **Step 1: Add reason text below the category tag**

In `apps/web/components/calendar/SuggestionCard.tsx`, add the following JSX **after** the existing `</div>` that closes the category/duration row (after line 112, before the closing `</div>` of the bottom gradient). Only add the new `{suggestion.reason && ...}` block — do NOT duplicate the existing category/duration row:

```tsx
        {suggestion.reason && (
          <div className="text-[9px] text-white/55 mt-[2px] [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
            {suggestion.reason}
          </div>
        )}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — `reason` is already on `SuggestionCard` type as optional

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/SuggestionCard.tsx
git commit -m "feat: show personalization reason on suggestion cards"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS across all workspaces

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS (or only pre-existing warnings)

- [ ] **Step 3: Run affinity tests**

Run: `cd services && npx vitest run lib/affinity.test.ts`
Expected: All tests PASS

- [ ] **Step 4: Run shared package tests**

Run: `cd packages/shared && npm test`
Expected: All tests PASS (no regressions)

- [ ] **Step 5: Manual smoke test**

Start web dev server (`npm run web`), open a trip with a For You panel:
1. Verify suggestions load (via `/recommend` or fallback to `/api/suggest`)
2. Click a suggestion card — check browser network tab for `POST /interact` with `category` in the body
3. Check console for `[ForYou] fetching (recommend):` log

- [ ] **Step 6: Commit any fixups**

If any fixes were needed, commit them:
```bash
git add -A
git commit -m "fix: address lint/type issues from personalization integration"
```
