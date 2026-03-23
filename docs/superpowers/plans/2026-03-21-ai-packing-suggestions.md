# AI Packing Suggestions Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add AI-powered packing suggestions that analyze a trip's itinerary via AWS Bedrock (Claude 3 Haiku) and present contextual recommendations as inline chips in the packing list.

**Architecture:** A new Lambda endpoint gathers trip context (destination, dates, activities, existing items) and calls Bedrock to generate suggestions. Suggestions are persisted in a `packing_suggestions` Supabase table. The client fetches suggestions via React Query, renders them as inline chips per category, and supports accept/dismiss/auto-generate flows.

**Tech Stack:** AWS Bedrock (Claude 3 Haiku), SST v4 Lambda + API Gateway, Supabase (Postgres + RLS), React Query v5, React 19, iconoir-react, motion/react, Tailwind CSS v4

---

## Chunk 1: Database + Types + Service Layer

### Task 1: Create `packing_suggestions` table via Supabase migration

**Files:**
- Create: Supabase migration (via MCP `apply_migration`)

- [ ] **Step 1: Apply the migration**

Use Supabase MCP `apply_migration` with name `create_packing_suggestions` and the following SQL:

```sql
-- Create packing_suggestions table
CREATE TABLE packing_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'essentials',
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX packing_suggestions_trip_id_idx ON packing_suggestions (trip_id);
CREATE INDEX packing_suggestions_trip_status_idx ON packing_suggestions (trip_id, status);

-- RLS
ALTER TABLE packing_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suggestions for their trips"
  ON packing_suggestions FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM trips WHERE trips.id = packing_suggestions.trip_id AND trips.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM trip_collaborators WHERE trip_collaborators.trip_id = packing_suggestions.trip_id AND trip_collaborators.user_id = auth.uid())
  );

CREATE POLICY "Users can insert suggestions for their trips"
  ON packing_suggestions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = packing_suggestions.trip_id AND trips.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM trip_collaborators WHERE trip_collaborators.trip_id = packing_suggestions.trip_id AND trip_collaborators.user_id = auth.uid())
  );

CREATE POLICY "Users can update suggestions for their trips"
  ON packing_suggestions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = packing_suggestions.trip_id AND trips.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM trip_collaborators WHERE trip_collaborators.trip_id = packing_suggestions.trip_id AND trip_collaborators.user_id = auth.uid())
  );
```

- [ ] **Step 2: Verify the table exists**

Use Supabase MCP `list_tables` and confirm `packing_suggestions` appears in the output.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: create packing_suggestions table with RLS policies"
```

---

### Task 2: Add `PackingSuggestion` type

**Files:**
- Modify: `packages/shared/src/types/index.ts`

- [ ] **Step 1: Add the type after `CatalogItem` interface (around line 320)**

Add this after the `CatalogItem` interface:

```ts
export interface PackingSuggestion {
  id: string
  trip_id: string
  user_id: string
  name: string
  category: PackingCategory
  reason: string
  status: 'pending' | 'accepted' | 'dismissed'
  created_at: string
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS (no errors related to PackingSuggestion)

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat: add PackingSuggestion type"
```

---

### Task 3: Add suggestion service functions

**Files:**
- Modify: `packages/shared/src/services/packingService.ts`
- Modify: `packages/shared/src/services/index.ts`

- [ ] **Step 1: Add three functions to `packingService.ts`**

Add these after the existing `deletePackingItem` function:

```ts
export async function fetchPackingSuggestions(tripId: string): Promise<PackingSuggestion[]> {
  const { data, error } = await supabase
    .from('packing_suggestions')
    .select('*')
    .eq('trip_id', tripId)
    .eq('status', 'pending')
    .order('category')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function updateSuggestionStatus(suggestionId: string, status: 'accepted' | 'dismissed'): Promise<void> {
  const { error } = await supabase.from('packing_suggestions').update({ status }).eq('id', suggestionId)
  if (error) throw error
}

export async function dismissAllSuggestions(tripId: string): Promise<void> {
  const { error } = await supabase.from('packing_suggestions').update({ status: 'dismissed' }).eq('trip_id', tripId).eq('status', 'pending')
  if (error) throw error
}
```

Also add the import for `PackingSuggestion` to the existing import line at the top of the file:

```ts
import type { DbPackingItem, PackingAuditEntry, PackingCategory, PackingSuggestion } from '../types'
```

- [ ] **Step 2: Re-export from `services/index.ts`**

Add to the `packingService` export block in `packages/shared/src/services/index.ts`:

```ts
export {
  fetchPackingItems,
  fetchPackingAuditLog,
  insertPackingItem,
  updatePackingItemPacked,
  deletePackingItem,
  fetchPackingSuggestions,
  updateSuggestionStatus,
  dismissAllSuggestions,
} from './packingService';
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/services/packingService.ts packages/shared/src/services/index.ts
git commit -m "feat: add packing suggestion service functions"
```

---

## Chunk 2: Lambda Endpoint

### Task 4: Create the `packing-suggest` Lambda handler

**Files:**
- Create: `services/packing-suggest.ts`

- [ ] **Step 1: Create the Lambda handler**

Create `services/packing-suggest.ts`:

```ts
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { Resource } from 'sst'
import { createClient } from '@supabase/supabase-js'
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { validateAuth } from './lib/auth'

const PACKING_CATEGORIES = ['clothing', 'toiletries', 'electronics', 'documents', 'accessories', 'essentials']
const MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0'
const RATE_LIMIT_MS = 2 * 60 * 1000 // 2 minutes
const MAX_SUGGESTIONS = 15

const bedrockClient = new BedrockRuntimeClient({})

const SYSTEM_PROMPT = `You are a travel packing assistant. Given a trip itinerary, suggest practical items to pack. Return ONLY a JSON array of objects with keys: name (string), category (one of: clothing, toiletries, electronics, documents, accessories, essentials), reason (short phrase explaining why, referencing specific activities or conditions). Suggest 10-15 items. Be specific and practical — prefer "Rain jacket" over "Outerwear". Do not suggest items the user already has.`

function buildUserMessage(trip: any, activities: any[], packedNames: string[], suggestedNames: string[]): string {
  const start = new Date(trip.start_date)
  const end = new Date(trip.end_date)
  const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  const activityLines = activities.map((a) => {
    const base = `- ${a.activity_name} (${a.activity_type})`
    return a.notes ? `${base} — ${a.notes}` : base
  }).join('\n')

  let message = `Trip to ${trip.destination}\nDates: ${trip.start_date} to ${trip.end_date} (${duration} days)\nTravelers: ${trip.travelers ?? 1}`

  if (activityLines) {
    message += `\n\nActivities:\n${activityLines}`
  }
  if (packedNames.length > 0) {
    message += `\n\nAlready packed: ${packedNames.join(', ')}`
  }
  if (suggestedNames.length > 0) {
    message += `\n\nAlready suggested: ${suggestedNames.join(', ')}`
  }

  return message
}

function parseBedrockResponse(responseBody: string): { name: string; category: string; reason: string }[] {
  try {
    const parsed = JSON.parse(responseBody)
    const text: string = parsed.content?.[0]?.text ?? ''

    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    const items = JSON.parse(cleaned)
    if (!Array.isArray(items)) return []

    return items
      .filter((item: any) =>
        typeof item.name === 'string' &&
        typeof item.category === 'string' &&
        typeof item.reason === 'string' &&
        PACKING_CATEGORIES.includes(item.category)
      )
      .slice(0, MAX_SUGGESTIONS)
  } catch {
    console.error('[packing-suggest] Failed to parse Bedrock response')
    return []
  }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)

    const body = JSON.parse(event.body ?? '{}')
    const tripId = body.tripId
    const refresh = body.refresh === true

    if (!tripId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'tripId required' }) }
    }

    const supabase = createClient(Resource.SupabaseUrl.value, Resource.SupabaseSecretKey.value)

    // Check for existing pending suggestions
    const { data: existing } = await supabase
      .from('packing_suggestions')
      .select('*')
      .eq('trip_id', tripId)
      .eq('status', 'pending')
      .order('category')
      .order('created_at', { ascending: true })

    if (!refresh && existing && existing.length > 0) {
      return { statusCode: 200, body: JSON.stringify({ suggestions: existing }) }
    }

    // Rate limit check
    if (refresh) {
      const { data: latest } = await supabase
        .from('packing_suggestions')
        .select('created_at')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(1)

      if (latest && latest.length > 0) {
        const lastCreated = new Date(latest[0].created_at).getTime()
        if (Date.now() - lastCreated < RATE_LIMIT_MS) {
          return { statusCode: 429, body: JSON.stringify({ error: 'Too many requests. Try again in a few minutes.', suggestions: existing ?? [] }) }
        }
      }
    }

    // Fetch trip context
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('destination, start_date, end_date, travelers')
      .eq('id', tripId)
      .single()

    if (tripError || !trip) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Trip not found' }) }
    }

    const { data: activities } = await supabase
      .from('activity')
      .select('activity_name, activity_type, notes')
      .eq('trip_id', tripId)

    const { data: packedItems } = await supabase
      .from('packing_items')
      .select('name')
      .eq('trip_id', tripId)

    const { data: existingSuggestions } = await supabase
      .from('packing_suggestions')
      .select('name')
      .eq('trip_id', tripId)

    const packedNames = (packedItems ?? []).map((i) => i.name)
    const suggestedNames = (existingSuggestions ?? []).map((s) => s.name)

    const userMessage = buildUserMessage(trip, activities ?? [], packedNames, suggestedNames)

    console.log('[packing-suggest] calling Bedrock for trip:', tripId)

    // Call Bedrock
    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
          max_tokens: 1024,
          temperature: 0.3,
        }),
      }),
    )

    const responseBody = new TextDecoder().decode(response.body)
    const suggestions = parseBedrockResponse(responseBody)

    if (suggestions.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ suggestions: [] }) }
    }

    // Insert suggestions
    const rows = suggestions.map((s) => ({
      trip_id: tripId,
      user_id: userId,
      name: s.name,
      category: s.category,
      reason: s.reason,
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('packing_suggestions')
      .insert(rows)
      .select()

    if (insertError) {
      console.error('[packing-suggest] insert error:', insertError)
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to save suggestions' }) }
    }

    return { statusCode: 200, body: JSON.stringify({ suggestions: inserted ?? [] }) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('[packing-suggest] error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit services/packing-suggest.ts` (or just verify no red squiggles in editor). Note: The Lambda files use `sst` Resource type which resolves at deploy time, so minor type warnings about `Resource` are expected.

- [ ] **Step 3: Commit**

```bash
git add services/packing-suggest.ts
git commit -m "feat: add packing-suggest Lambda handler with Bedrock integration"
```

---

### Task 5: Add API route in SST infra

**Files:**
- Modify: `infra/api.ts`

- [ ] **Step 1: Add the route**

Add this after the existing `api.route('GET /recommend', ...)` block at the end of `infra/api.ts`:

```ts
api.route('POST /packing-suggest', {
  handler: 'services/packing-suggest.handler',
  link: [supabaseSecretKey, supabaseUrl],
  permissions: [
    {
      actions: ['bedrock:InvokeModel'],
      resources: ['arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0'],
    },
  ],
})
```

Make sure `supabaseSecretKey` and `supabaseUrl` are already imported at the top of the file (they are — line 3).

- [ ] **Step 2: Commit**

```bash
git add infra/api.ts
git commit -m "feat: add POST /packing-suggest API route with Bedrock permissions"
```

---

## Chunk 3: Client Hook

### Task 6: Create `usePackingSuggestions` hook

**Files:**
- Create: `packages/shared/src/hooks/usePackingSuggestions.ts`
- Modify: `packages/shared/src/hooks/index.ts`

- [ ] **Step 1: Create the hook**

Create `packages/shared/src/hooks/usePackingSuggestions.ts`:

```ts
import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { fetchPackingSuggestions, updateSuggestionStatus } from '../services/packingService'
import type { PackingSuggestion, PackingCategory, DbPackingItem } from '../types'
import { PACKING_CATEGORIES } from '../types'

export function usePackingSuggestions(
  tripId: string | undefined,
  items: DbPackingItem[],
  addItem: (name: string, category: PackingCategory) => void,
) {
  const queryClient = useQueryClient()
  const hasAttemptedGeneration = useRef(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const suggestionsQuery = useQuery({
    queryKey: ['packingSuggestions', tripId],
    queryFn: () => fetchPackingSuggestions(tripId!),
    enabled: !!tripId,
  })

  const suggestions = suggestionsQuery.data ?? []

  const suggestionsByCategory = useMemo(() => {
    const grouped: Record<string, PackingSuggestion[]> = {}
    for (const cat of PACKING_CATEGORIES) {
      const catSuggestions = suggestions.filter((s) => s.category === cat)
      if (catSuggestions.length > 0) grouped[cat] = catSuggestions
    }
    return grouped
  }, [suggestions])

  const generateSuggestions = useCallback(async (refresh = false) => {
    if (!tripId || isGenerating) return
    setIsGenerating(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return

      const apiUrl = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL
      await fetch(`${apiUrl}/packing-suggest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tripId, refresh }),
      })

      queryClient.invalidateQueries({ queryKey: ['packingSuggestions', tripId] })
    } catch (err) {
      console.error('[usePackingSuggestions] generate error:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [tripId, isGenerating, queryClient])

  // Auto-generate on first visit when packing list is empty
  useEffect(() => {
    if (!tripId) return
    if (suggestionsQuery.isLoading) return
    if (items.length > 0) return
    if (suggestions.length > 0) return
    if (hasAttemptedGeneration.current) return

    hasAttemptedGeneration.current = true
    generateSuggestions(false)
  }, [tripId, suggestionsQuery.isLoading, items.length, suggestions.length, generateSuggestions])

  const acceptMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const suggestion = suggestions.find((s) => s.id === suggestionId)
      if (!suggestion) return
      await updateSuggestionStatus(suggestionId, 'accepted')
      addItem(suggestion.name, suggestion.category)
    },
    onMutate: async (suggestionId: string) => {
      await queryClient.cancelQueries({ queryKey: ['packingSuggestions', tripId] })
      const previous = queryClient.getQueryData<PackingSuggestion[]>(['packingSuggestions', tripId])
      queryClient.setQueryData<PackingSuggestion[]>(['packingSuggestions', tripId], (old) =>
        (old ?? []).filter((s) => s.id !== suggestionId)
      )
      return { previous }
    },
    onError: (_err: unknown, _id: string, context: { previous?: PackingSuggestion[] } | undefined) => {
      if (context?.previous) queryClient.setQueryData(['packingSuggestions', tripId], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['packingSuggestions', tripId] })
    },
  })

  const dismissMutation = useMutation({
    mutationFn: (suggestionId: string) => updateSuggestionStatus(suggestionId, 'dismissed'),
    onMutate: async (suggestionId: string) => {
      await queryClient.cancelQueries({ queryKey: ['packingSuggestions', tripId] })
      const previous = queryClient.getQueryData<PackingSuggestion[]>(['packingSuggestions', tripId])
      queryClient.setQueryData<PackingSuggestion[]>(['packingSuggestions', tripId], (old) =>
        (old ?? []).filter((s) => s.id !== suggestionId)
      )
      return { previous }
    },
    onError: (_err: unknown, _id: string, context: { previous?: PackingSuggestion[] } | undefined) => {
      if (context?.previous) queryClient.setQueryData(['packingSuggestions', tripId], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['packingSuggestions', tripId] })
    },
  })

  const acceptSuggestion = useCallback((id: string) => acceptMutation.mutate(id), [acceptMutation])
  const dismissSuggestion = useCallback((id: string) => dismissMutation.mutate(id), [dismissMutation])

  const acceptAll = useCallback(async () => {
    const pending = [...suggestions]
    for (const s of pending) {
      try {
        await updateSuggestionStatus(s.id, 'accepted')
        addItem(s.name, s.category)
      } catch (err) {
        console.error('[usePackingSuggestions] acceptAll error for:', s.name, err)
      }
    }
    queryClient.invalidateQueries({ queryKey: ['packingSuggestions', tripId] })
    queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
  }, [suggestions, addItem, queryClient, tripId])

  return {
    suggestions,
    suggestionsByCategory,
    isLoading: suggestionsQuery.isLoading,
    isGenerating,
    hasGenerated: hasAttemptedGeneration.current,
    generateSuggestions: useCallback(() => generateSuggestions(true), [generateSuggestions]),
    acceptSuggestion,
    dismissSuggestion,
    acceptAll,
  }
}
```

- [ ] **Step 2: Re-export from hooks barrel**

Add to the end of `packages/shared/src/hooks/index.ts`:

```ts
export { usePackingSuggestions } from './usePackingSuggestions';
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/hooks/usePackingSuggestions.ts packages/shared/src/hooks/index.ts
git commit -m "feat: add usePackingSuggestions hook with auto-generate and optimistic updates"
```

---

## Chunk 4: UI Components

### Task 7: Create `SuggestionChip` component

**Files:**
- Create: `apps/web/components/packing/SuggestionChip.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/components/packing/SuggestionChip.tsx`:

```tsx
'use client'

import { motion } from 'motion/react'
import { Plus, Xmark } from 'iconoir-react'
import type { PackingSuggestion } from '@travyl/shared'

interface SuggestionChipProps {
  suggestion: PackingSuggestion
  onAccept: (id: string) => void
  onDismiss: (id: string) => void
}

export function SuggestionChip({ suggestion, onAccept, onDismiss }: SuggestionChipProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="group flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg border border-dashed border-[var(--cal-border)] bg-[var(--cal-surface)]/50 hover:bg-[var(--cal-surface)] transition-colors duration-150"
    >
      {/* Accept button */}
      <button
        onClick={() => onAccept(suggestion.id)}
        className="shrink-0 w-5 h-5 rounded-[4px] border border-[var(--cal-border)] flex items-center justify-center text-[var(--cal-text-muted)] hover:border-[#003594] hover:text-[#003594] transition-colors duration-150"
        aria-label="Accept suggestion"
      >
        <Plus width={12} height={12} />
      </button>

      {/* Name + reason */}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-[var(--cal-text)]">{suggestion.name}</span>
        <p className="text-[11px] text-[var(--cal-text-muted)] truncate">{suggestion.reason}</p>
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(suggestion.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[var(--cal-text-muted)] hover:text-red-500"
        aria-label="Dismiss suggestion"
      >
        <Xmark width={14} height={14} />
      </button>
    </motion.div>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/packing/SuggestionChip.tsx
git commit -m "feat: add SuggestionChip component for AI packing suggestions"
```

---

### Task 8: Update `PackingCategory` to render suggestions

**Files:**
- Modify: `apps/web/components/packing/PackingCategory.tsx`

- [ ] **Step 1: Add suggestions support**

Update `PackingCategory.tsx` to accept and render suggestions. Replace the entire file content:

```tsx
'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { NavArrowDown, NavArrowRight } from 'iconoir-react'
import type { DbPackingItem, PackingCategory as PackingCategoryType, PackingSuggestion } from '@travyl/shared'
import { CATEGORY_LABELS } from './utils'
import { PackingItem } from './PackingItem'
import { SuggestionChip } from './SuggestionChip'

interface PackingCategoryProps {
  category: PackingCategoryType
  items: DbPackingItem[]
  suggestions?: PackingSuggestion[]
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onAcceptSuggestion?: (id: string) => void
  onDismissSuggestion?: (id: string) => void
  defaultExpanded?: boolean
}

export function PackingCategory({
  category,
  items,
  suggestions = [],
  onToggle,
  onRemove,
  onAcceptSuggestion,
  onDismissSuggestion,
  defaultExpanded = true,
}: PackingCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const packedCount = items.filter((i) => i.is_packed).length
  const totalCount = items.length

  return (
    <div className="mb-1">
      {/* Header row */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-[var(--cal-surface)] transition-colors duration-150 group"
      >
        {isExpanded ? (
          <NavArrowDown
            width={14}
            height={14}
            className="text-[var(--cal-text-muted)] shrink-0 transition-transform duration-200"
          />
        ) : (
          <NavArrowRight
            width={14}
            height={14}
            className="text-[var(--cal-text-muted)] shrink-0 transition-transform duration-200"
          />
        )}

        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--cal-text-muted)] flex-1 text-left">
          {CATEGORY_LABELS[category]}
        </span>

        <span className="text-xs tabular-nums text-[var(--cal-text-muted)]">
          {packedCount}/{totalCount}
        </span>
      </button>

      {/* Expanded items list */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <motion.div layout className="pt-0.5">
              <AnimatePresence>
                {items.map((item) => (
                  <PackingItem
                    key={item.id}
                    item={item}
                    onToggle={onToggle}
                    onRemove={onRemove}
                  />
                ))}
                {suggestions.map((suggestion) => (
                  <SuggestionChip
                    key={`suggestion-${suggestion.id}`}
                    suggestion={suggestion}
                    onAccept={onAcceptSuggestion ?? (() => {})}
                    onDismiss={onDismissSuggestion ?? (() => {})}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/packing/PackingCategory.tsx
git commit -m "feat: render suggestion chips in PackingCategory accordion"
```

---

### Task 9: Update `PackingCategoryList` to pass suggestions

**Files:**
- Modify: `apps/web/components/packing/PackingCategoryList.tsx`

- [ ] **Step 1: Update the component**

Replace the entire file content of `PackingCategoryList.tsx`:

```tsx
'use client'

import { useMemo } from 'react'
import type { DbPackingItem, PackingSuggestion } from '@travyl/shared'
import { PACKING_CATEGORIES } from '@travyl/shared'
import { PackingCategory } from './PackingCategory'

interface PackingCategoryListProps {
  itemsByCategory: Record<string, DbPackingItem[]>
  suggestionsByCategory?: Record<string, PackingSuggestion[]>
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onAcceptSuggestion?: (id: string) => void
  onDismissSuggestion?: (id: string) => void
  isGenerating?: boolean
}

export function PackingCategoryList({
  itemsByCategory,
  suggestionsByCategory = {},
  onToggle,
  onRemove,
  onAcceptSuggestion,
  onDismissSuggestion,
  isGenerating = false,
}: PackingCategoryListProps) {
  const visibleCategories = useMemo(() =>
    PACKING_CATEGORIES.filter(
      (cat) => (itemsByCategory[cat]?.length ?? 0) > 0 || (suggestionsByCategory[cat]?.length ?? 0) > 0
    ),
    [itemsByCategory, suggestionsByCategory]
  )

  if (visibleCategories.length === 0) {
    if (isGenerating) {
      return (
        <div className="flex flex-col gap-3 py-6 px-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-[var(--cal-surface)] animate-pulse" />
          ))}
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <span className="text-3xl">🧳</span>
        <p className="text-sm text-[var(--cal-text-muted)]">No items yet — search above to add</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {visibleCategories.map((category) => (
        <PackingCategory
          key={category}
          category={category}
          items={itemsByCategory[category] ?? []}
          suggestions={suggestionsByCategory[category]}
          onToggle={onToggle}
          onRemove={onRemove}
          onAcceptSuggestion={onAcceptSuggestion}
          onDismissSuggestion={onDismissSuggestion}
          defaultExpanded
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/packing/PackingCategoryList.tsx
git commit -m "feat: pass suggestion props through PackingCategoryList to categories"
```

---

### Task 10: Wire up `PackingPanel` with suggestions

**Files:**
- Modify: `apps/web/components/packing/PackingPanel.tsx`

- [ ] **Step 1: Update PackingPanel**

Replace the entire file content of `PackingPanel.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { Expand, Sparks } from 'iconoir-react'
import { usePackingList, useAuthStore, usePackingSuggestions } from '@travyl/shared'
import { SpotlightSearch } from './SpotlightSearch'
import { PackingProgress } from './PackingProgress'
import { PackingCategoryList } from './PackingCategoryList'
import { PackingActivityFeed } from './PackingActivityFeed'

interface PackingPanelProps {
  tripId: string
}

export function PackingPanel({ tripId }: PackingPanelProps) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { items, itemsByCategory, auditLog, progress, isLoading, error, addItem, togglePacked, removeItem } = usePackingList(tripId, user?.id)
  const {
    suggestionsByCategory,
    isGenerating,
    hasGenerated,
    generateSuggestions,
    acceptSuggestion,
    dismissSuggestion,
  } = usePackingSuggestions(tripId, items, addItem)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--cal-border,#334155)] border-t-[#003594] rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[13px] text-red-400">Failed to load packing list.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--cal-border,#1e293b)]">
        <h3 className="text-[14px] font-semibold text-[var(--cal-text,#e2e8f0)]">Packing List</h3>
        <button
          onClick={() => router.push(`/trip/${tripId}/packing`)}
          className="p-1 rounded hover:bg-white/10 transition-colors text-[var(--cal-text-muted,#64748b)]"
          title="Expand to full page"
        >
          <Expand width={14} height={14} />
        </button>
      </div>
      <SpotlightSearch existingItems={items} onAddItem={addItem} />
      <PackingProgress packed={progress.packed} total={progress.total} percent={progress.percent} compact />
      <div className="flex-1 overflow-auto">
        <PackingCategoryList
          itemsByCategory={itemsByCategory}
          suggestionsByCategory={suggestionsByCategory}
          onToggle={togglePacked}
          onRemove={removeItem}
          onAcceptSuggestion={acceptSuggestion}
          onDismissSuggestion={dismissSuggestion}
          isGenerating={isGenerating}
        />
      </div>
      {/* Suggest button */}
      <div className="px-3 py-2 border-t border-[var(--cal-border,#1e293b)]">
        <button
          onClick={generateSuggestions}
          disabled={isGenerating}
          className="flex items-center gap-1.5 text-xs text-[var(--cal-text-muted)] hover:text-[var(--cal-text)] transition-colors disabled:opacity-50"
        >
          {isGenerating ? (
            <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Sparks width={14} height={14} />
          )}
          {isGenerating ? 'Generating...' : hasGenerated ? 'Suggest more' : 'Suggest items'}
        </button>
      </div>
      <PackingActivityFeed entries={auditLog} defaultCollapsed />
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/packing/PackingPanel.tsx
git commit -m "feat: wire AI suggestions into PackingPanel with suggest button"
```

---

### Task 11: Wire up `PackingPage` with suggestions

**Files:**
- Modify: `apps/web/components/packing/PackingPage.tsx`

- [ ] **Step 1: Update PackingPage**

Replace the entire file content of `PackingPage.tsx`:

```tsx
'use client'

import { Sparks } from 'iconoir-react'
import { usePackingList, useAuthStore, usePackingSuggestions } from '@travyl/shared'
import { SpotlightSearch } from './SpotlightSearch'
import { PackingProgress } from './PackingProgress'
import { PackingCategoryList } from './PackingCategoryList'
import { PackingActivityFeed } from './PackingActivityFeed'

interface PackingPageProps {
  tripId: string
}

export function PackingPage({ tripId }: PackingPageProps) {
  const { user } = useAuthStore()
  const { items, itemsByCategory, auditLog, progress, isLoading, error, addItem, togglePacked, removeItem } = usePackingList(tripId, user?.id)
  const {
    suggestionsByCategory,
    isGenerating,
    hasGenerated,
    generateSuggestions,
    acceptSuggestion,
    dismissSuggestion,
  } = usePackingSuggestions(tripId, items, addItem)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[var(--cal-border,#334155)] border-t-[#003594] rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[13px] text-red-400">Failed to load packing list.</p>
      </div>
    )
  }

  return (
    <div className="flex gap-6 h-full p-6">
      <div className="flex-1 flex flex-col min-w-0">
        <SpotlightSearch existingItems={items} onAddItem={addItem} />
        <div className="flex-1 overflow-auto mt-4">
          <PackingCategoryList
            itemsByCategory={itemsByCategory}
            suggestionsByCategory={suggestionsByCategory}
            onToggle={togglePacked}
            onRemove={removeItem}
            onAcceptSuggestion={acceptSuggestion}
            onDismissSuggestion={dismissSuggestion}
            isGenerating={isGenerating}
          />
        </div>
        {/* Suggest button */}
        <div className="py-3">
          <button
            onClick={generateSuggestions}
            disabled={isGenerating}
            className="flex items-center gap-1.5 text-xs text-[var(--cal-text-muted)] hover:text-[var(--cal-text)] transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Sparks width={14} height={14} />
            )}
            {isGenerating ? 'Generating...' : hasGenerated ? 'Suggest more' : 'Suggest items'}
          </button>
        </div>
      </div>
      <div className="w-80 flex flex-col gap-4 shrink-0">
        <PackingProgress packed={progress.packed} total={progress.total} percent={progress.percent} />
        <div className="flex-1 overflow-auto">
          <PackingActivityFeed entries={auditLog} defaultCollapsed={false} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/packing/PackingPage.tsx
git commit -m "feat: wire AI suggestions into PackingPage with suggest button"
```

---

### Task 12: Final typecheck and integration verification

**Files:**
- No new files — verification only

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS with zero errors

- [ ] **Step 2: Run shared package tests**

Run: `cd packages/shared && npm test`
Expected: All existing tests pass (no regressions)

- [ ] **Step 3: Verify the web dev server starts**

Run: `npm run web` (let it compile, check for errors, then Ctrl+C)
Expected: Compiles without errors

- [ ] **Step 4: Commit any fixes if needed, then final commit**

```bash
git add -A
git commit -m "feat: complete AI packing suggestions integration"
```
