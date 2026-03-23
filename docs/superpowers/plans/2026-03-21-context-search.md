# Context Search — Global Semantic Command Palette Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the trip-scoped CommandPalette with a global Ctrl+K palette that combines navigation, semantic trip search (pgvector + Bedrock Titan), and context-aware trip commands.

**Architecture:** Supabase pgvector stores trip embeddings (1024-dim from Bedrock Titan). Two new SST Lambdas: `index-trip` (embed + upsert) and `context-search` (embed query + similarity search). Frontend: global `GlobalCommandPalette` component in Providers, Zustand store to share calendar commands across the React tree (sidesteps context nesting issues).

**Tech Stack:** SST v4, AWS Bedrock Titan Embeddings v2, Supabase pgvector, React 19, React Query v5, Zustand v5, Next.js 16 App Router

**Spec:** `docs/superpowers/specs/2026-03-21-context-search-design.md`

---

## Chunk 1: Backend Infrastructure & Lambdas

### Task 1: Supabase Migration — pgvector + trip_embeddings table

**Files:**
- Create: Supabase migration via MCP `apply_migration`

- [ ] **Step 1: Enable pgvector and create trip_embeddings table**

Run the Supabase migration via MCP:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE trip_embeddings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  embedding vector(1024) NOT NULL,
  text_content text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trip_id)
);

CREATE INDEX trip_embeddings_vector_idx
  ON trip_embeddings USING hnsw (embedding vector_cosine_ops);

ALTER TABLE trip_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own embeddings"
  ON trip_embeddings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage embeddings"
  ON trip_embeddings FOR ALL USING (true);
```

- [ ] **Step 2: Create the search_trips RPC function**

```sql
CREATE OR REPLACE FUNCTION search_trips(
  query_embedding vector(1024),
  match_user_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  trip_id uuid,
  metadata jsonb,
  score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.trip_id,
    te.metadata,
    (1 - (te.embedding <=> query_embedding))::float AS score
  FROM trip_embeddings te
  WHERE te.user_id = match_user_id
    AND (1 - (te.embedding <=> query_embedding)) >= 0.4
  ORDER BY te.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

- [ ] **Step 3: Verify migration**

Run via MCP `execute_sql`:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'trip_embeddings' ORDER BY ordinal_position;
```

Expected: 8 columns (id, trip_id, user_id, embedding, text_content, metadata, created_at, updated_at).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add trip_embeddings table with pgvector + search RPC"
```

---

### Task 2: Install Bedrock SDK Dependency

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Install the AWS Bedrock Runtime SDK**

```bash
npm install @aws-sdk/client-bedrock-runtime
```

Note: `@aws-sdk/client-eventbridge`, `@aws-sdk/client-dynamodb`, and `@aws-sdk/lib-dynamodb` are already installed (used by existing Lambdas). Only the Bedrock client is new.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json && git commit -m "feat: add @aws-sdk/client-bedrock-runtime dependency"
```

---

### Task 3: Bedrock Embeddings Utility

**Files:**
- Create: `services/lib/embeddings.ts`

- [ ] **Step 1: Create the embeddings utility**

```typescript
// services/lib/embeddings.ts
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const client = new BedrockRuntimeClient({})

const MODEL_ID = 'amazon.titan-embed-text-v2:0'

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await client.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: text,
        dimensions: 1024,
      }),
    }),
  )

  const result = JSON.parse(new TextDecoder().decode(response.body))
  return result.embedding as number[]
}
```

- [ ] **Step 2: Commit**

```bash
git add services/lib/embeddings.ts && git commit -m "feat: add Bedrock Titan embedding utility"
```

---

### Task 4: Index Trip Lambda

**Files:**
- Create: `services/index-trip.ts`

- [ ] **Step 1: Create the index-trip Lambda handler**

```typescript
// services/index-trip.ts
import { Resource } from 'sst'
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'
import { generateEmbedding } from './lib/embeddings'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)

    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'body required' }) }
    }

    const { tripId } = JSON.parse(event.body)
    if (!tripId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'tripId required' }) }
    }

    const supabase = createClient(
      Resource.SupabaseUrl.value,
      Resource.SupabaseSecretKey.value,
    )

    // Fetch trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, title, destination, status, start_date, end_date, user_id')
      .eq('id', tripId)
      .single()

    if (tripError || !trip) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Trip not found' }) }
    }

    // Verify ownership
    if (trip.user_id !== userId) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) }
    }

    // Fetch activities
    const { data: activities } = await supabase
      .from('activity')
      .select('activity_name, activity_type, notes')
      .eq('trip_id', tripId)

    // Build text blob
    const activityText = (activities ?? [])
      .map((a) => {
        const base = `${a.activity_name} (${a.activity_type})`
        return a.notes ? `${base} - ${a.notes}` : base
      })
      .join(', ')

    const textContent = [
      trip.title,
      trip.destination,
      trip.status,
      activityText,
    ].filter(Boolean).join(' | ')

    // Generate embedding
    const embedding = await generateEmbedding(textContent)

    // Upsert to trip_embeddings
    const metadata = {
      title: trip.title,
      destination: trip.destination,
      status: trip.status,
      startDate: trip.start_date,
      endDate: trip.end_date,
      activityCount: activities?.length ?? 0,
    }

    const { error: upsertError } = await supabase
      .from('trip_embeddings')
      .upsert(
        {
          trip_id: tripId,
          user_id: userId,
          embedding: JSON.stringify(embedding),
          text_content: textContent,
          metadata,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'trip_id' },
      )

    if (upsertError) {
      console.error('upsert error:', upsertError)
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to index trip' }) }
    }

    return { statusCode: 200, body: JSON.stringify({ indexed: true }) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('index-trip error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add services/index-trip.ts && git commit -m "feat: add index-trip Lambda for embedding trips"
```

---

### Task 5: Context Search Lambda

**Files:**
- Create: `services/context-search.ts`

- [ ] **Step 1: Create the context-search Lambda handler**

```typescript
// services/context-search.ts
import { Resource } from 'sst'
import { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { createClient } from '@supabase/supabase-js'
import { validateAuth } from './lib/auth'
import { generateEmbedding } from './lib/embeddings'

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userId = await validateAuth(event.headers.authorization)
    const query = event.queryStringParameters?.q

    if (!query || query.length < 3) {
      return { statusCode: 400, body: JSON.stringify({ error: 'q must be at least 3 characters' }) }
    }

    const supabase = createClient(
      Resource.SupabaseUrl.value,
      Resource.SupabaseSecretKey.value,
    )

    // Embed the query
    const queryEmbedding = await generateEmbedding(query)

    // Search via RPC
    const { data, error } = await supabase.rpc('search_trips', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_user_id: userId,
      match_count: 5,
    })

    if (error) {
      console.error('search error:', error)
      return { statusCode: 500, body: JSON.stringify({ error: 'Search failed' }) }
    }

    const results = (data ?? []).map((row: any) => ({
      tripId: row.trip_id,
      title: row.metadata.title,
      destination: row.metadata.destination,
      startDate: row.metadata.startDate,
      endDate: row.metadata.endDate,
      status: row.metadata.status,
      activityCount: row.metadata.activityCount,
      score: row.score,
    }))

    return { statusCode: 200, body: JSON.stringify({ results }) }
  } catch (err: any) {
    if (err.message === 'Invalid token' || err.message?.includes('Authorization')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }
    console.error('context-search error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add services/context-search.ts && git commit -m "feat: add context-search Lambda for semantic trip search"
```

---

### Task 6: SST Infrastructure — API Routes + Bedrock Permissions

**Files:**
- Modify: `infra/api.ts`

No standalone `infra/search.ts` needed — Bedrock permissions are applied inline on each route (same pattern as the existing `locationPolicy` + `permissions` on `GET /search`).

- [ ] **Step 1: Add routes to infra/api.ts**

Add at the end of `infra/api.ts`, after the existing `POST /interact` route:

```typescript
api.route('POST /index', {
  handler: 'services/index-trip.handler',
  link: [supabaseSecretKey, supabaseUrl],
  permissions: [
    {
      actions: ['bedrock:InvokeModel'],
      resources: ['arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0'],
    },
  ],
})

api.route('GET /context-search', {
  handler: 'services/context-search.handler',
  link: [supabaseSecretKey, supabaseUrl],
  permissions: [
    {
      actions: ['bedrock:InvokeModel'],
      resources: ['arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0'],
    },
  ],
})
```

- [ ] **Step 2: Commit**

```bash
git add infra/api.ts && git commit -m "feat: add SST API routes for context search + trip indexing"
```

---

### Task 7: Backfill Script for Existing Trips

**Files:**
- Create: `services/backfill-embeddings.ts`

- [ ] **Step 1: Create the backfill script**

```typescript
// services/backfill-embeddings.ts
// One-time script to index all existing trips. Run via:
//   npx sst shell node -e "require('./services/backfill-embeddings').backfill()"
// Or invoke as a Lambda manually.

import { Resource } from 'sst'
import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from './lib/embeddings'

export async function backfill() {
  const supabase = createClient(
    Resource.SupabaseUrl.value,
    Resource.SupabaseSecretKey.value,
  )

  // Fetch all trips
  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, title, destination, status, start_date, end_date, user_id')

  if (error || !trips) {
    console.error('Failed to fetch trips:', error)
    return
  }

  console.log(`Backfilling ${trips.length} trips...`)

  for (const trip of trips) {
    try {
      // Fetch activities for this trip
      const { data: activities } = await supabase
        .from('activity')
        .select('activity_name, activity_type, notes')
        .eq('trip_id', trip.id)

      // Build text blob
      const activityText = (activities ?? [])
        .map((a) => {
          const base = `${a.activity_name} (${a.activity_type})`
          return a.notes ? `${base} - ${a.notes}` : base
        })
        .join(', ')

      const textContent = [
        trip.title,
        trip.destination,
        trip.status,
        activityText,
      ].filter(Boolean).join(' | ')

      // Generate embedding
      const embedding = await generateEmbedding(textContent)

      // Upsert
      const metadata = {
        title: trip.title,
        destination: trip.destination,
        status: trip.status,
        startDate: trip.start_date,
        endDate: trip.end_date,
        activityCount: activities?.length ?? 0,
      }

      const { error: upsertError } = await supabase
        .from('trip_embeddings')
        .upsert(
          {
            trip_id: trip.id,
            user_id: trip.user_id,
            embedding: JSON.stringify(embedding),
            text_content: textContent,
            metadata,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'trip_id' },
        )

      if (upsertError) {
        console.error(`Failed to index trip ${trip.id}:`, upsertError)
      } else {
        console.log(`Indexed: ${trip.title} (${trip.id})`)
      }
    } catch (err) {
      console.error(`Error indexing trip ${trip.id}:`, err)
    }
  }

  console.log('Backfill complete.')
}
```

- [ ] **Step 2: Commit**

```bash
git add services/backfill-embeddings.ts && git commit -m "feat: add backfill script for existing trip embeddings"
```

---

## Chunk 2: Frontend — Global Command Palette

### Task 8: Calendar Commands Zustand Store

**Files:**
- Create: `apps/web/stores/calendarCommandsStore.ts`

We use a Zustand store instead of React Context to share calendar commands with the global palette. This avoids context tree ordering issues — the store is global, so `GlobalCommandPalette` (in Providers) can read commands set by `CalendarDashboard` (deep in the trip page tree) regardless of nesting.

- [ ] **Step 1: Create the store**

```typescript
// apps/web/stores/calendarCommandsStore.ts
import { create } from 'zustand'
import type { Command } from '@/components/calendar/types'

interface CalendarCommandsState {
  commands: Command[] | null
  setCommands: (commands: Command[]) => void
  clearCommands: () => void
}

export const useCalendarCommandsStore = create<CalendarCommandsState>((set) => ({
  commands: null,
  setCommands: (commands) => set({ commands }),
  clearCommands: () => set({ commands: null }),
}))
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/stores/calendarCommandsStore.ts && git commit -m "feat: add Zustand store for calendar commands"
```

---

### Task 9: useContextSearch Hook

**Files:**
- Create: `apps/web/hooks/useContextSearch.ts`

- [ ] **Step 1: Create the hook**

```typescript
// apps/web/hooks/useContextSearch.ts
'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export interface ContextSearchResult {
  tripId: string
  title: string
  destination: string
  startDate: string
  endDate: string
  status: string
  activityCount: number
  score: number
}

async function fetchContextSearch(query: string): Promise<ContextSearchResult[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) return []

  const res = await fetch(`${API_URL}/context-search?q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) return []
  const json = await res.json()
  return json.results ?? []
}

export function useContextSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const enabled = debouncedQuery.length >= 3

  const { data, isLoading, isError } = useQuery({
    queryKey: ['context-search', debouncedQuery],
    queryFn: () => fetchContextSearch(debouncedQuery),
    enabled,
    staleTime: 30_000,
  })

  return {
    results: data ?? [],
    isLoading: enabled && isLoading,
    isError,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/hooks/useContextSearch.ts && git commit -m "feat: add useContextSearch hook for semantic trip search"
```

---

### Task 10: useIndexTrip Hook

**Files:**
- Create: `apps/web/hooks/useIndexTrip.ts`

- [ ] **Step 1: Create the hook**

```typescript
// apps/web/hooks/useIndexTrip.ts
'use client'

import { useCallback, useRef } from 'react'
import { supabase } from '@travyl/shared'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

export function useIndexTrip() {
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const indexTrip = useCallback((tripId: string) => {
    // Clear existing timer for this tripId (5s debounce per trip)
    const existing = timers.current.get(tripId)
    if (existing) clearTimeout(existing)

    timers.current.set(
      tripId,
      setTimeout(() => {
        timers.current.delete(tripId)

        // Fire and forget
        supabase.auth.getSession().then(({ data: { session } }) => {
          const token = session?.access_token
          if (!token) return

          fetch(`${API_URL}/index`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tripId }),
          }).catch(() => {}) // swallow errors
        })
      }, 5000),
    )
  }, [])

  return { indexTrip }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/hooks/useIndexTrip.ts && git commit -m "feat: add useIndexTrip hook with 5s debounce"
```

---

### Task 11: GlobalCommandPalette Component

**Files:**
- Create: `apps/web/components/GlobalCommandPalette.tsx`

This is the largest component. It handles:
- Ctrl+K global listener (captures the event to prevent `useKeyboardShortcuts` from also handling it)
- Navigation items (fuzzy filtered)
- Trip search results (from `useContextSearch`)
- Trip commands (from Zustand store, when on trip page)
- Hover preview popover for trips (also shown on keyboard-highlighted trip)

- [ ] **Step 1: Create the component**

```typescript
// apps/web/components/GlobalCommandPalette.tsx
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { useContextSearch } from '@/hooks/useContextSearch'
import type { ContextSearchResult } from '@/hooks/useContextSearch'
import { useCalendarCommandsStore } from '@/stores/calendarCommandsStore'
import type { Command } from './calendar/types'

// ─── Types ───────────────────────────────────────────────────

interface NavItem {
  type: 'navigation'
  id: string
  label: string
  path: string
}

interface TripItem {
  type: 'trip'
  id: string
  label: string
  data: ContextSearchResult
}

interface CommandItem {
  type: 'command'
  id: string
  label: string
  command: Command
}

type PaletteItem = NavItem | TripItem | CommandItem

interface PaletteGroup {
  key: string
  label: string
  items: PaletteItem[]
}

// ─── Static nav items ────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { type: 'navigation', id: 'home', label: 'Home', path: '/' },
  { type: 'navigation', id: 'trips', label: 'Trips', path: '/trips' },
  { type: 'navigation', id: 'profile', label: 'Profile', path: '/profile' },
  { type: 'navigation', id: 'settings', label: 'Settings', path: '/settings' },
]

// ─── Status badge colors ─────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-gray-400',
  booked: 'bg-amber-500',
  active: 'bg-emerald-500',
  completed: 'bg-[#003594]',
  abandoned: 'bg-red-500',
}

// ─── Date formatting ─────────────────────────────────────────

function formatTripDates(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T00:00:00Z')
  const end = new Date(endDate + 'T00:00:00Z')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }
  const startStr = start.toLocaleDateString('en-US', opts)
  const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${startStr} - ${endStr}`
}

// ─── Exported open state for external coordination ───────────

let globalPaletteOpen = false
export function isGlobalPaletteOpen() { return globalPaletteOpen }

// ─── Component ───────────────────────────────────────────────

export function GlobalCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [hoveredTrip, setHoveredTrip] = useState<ContextSearchResult | null>(null)
  const [hoverAnchor, setHoverAnchor] = useState<HTMLElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Sync exported flag
  useEffect(() => { globalPaletteOpen = isOpen }, [isOpen])

  const calendarCommands = useCalendarCommandsStore((s) => s.commands)
  const { results: tripResults, isLoading: tripSearchLoading } = useContextSearch(query)

  // ─── Global Ctrl+K listener ──────────────────────────────
  // Uses capture phase so it fires BEFORE useKeyboardShortcuts' bubble listener

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        e.stopPropagation() // prevent useKeyboardShortcuts from also handling
        setIsOpen((prev) => !prev)
      }
      // When palette is open, suppress all other keyboard shortcuts
      if (globalPaletteOpen && e.key !== 'k') {
        // Let the modal's React onKeyDown handle it
      }
    }
    document.addEventListener('keydown', handler, true) // capture phase
    return () => document.removeEventListener('keydown', handler, true)
  }, [])

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setHighlightedIndex(0)
      setHoveredTrip(null)
      setHoverAnchor(null)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  // ─── Build grouped items ─────────────────────────────────

  const groups = useMemo<PaletteGroup[]>(() => {
    const q = query.toLowerCase()
    const result: PaletteGroup[] = []

    // Navigation (fuzzy text filter)
    const filteredNav = NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(q))
    if (filteredNav.length > 0) {
      result.push({ key: 'navigation', label: 'Navigation', items: filteredNav })
    }

    // Trips (from semantic search)
    if (tripResults.length > 0) {
      result.push({
        key: 'trips',
        label: 'Trips',
        items: tripResults.map((t) => ({
          type: 'trip' as const,
          id: `trip-${t.tripId}`,
          label: t.title,
          data: t,
        })),
      })
    }

    // Commands (if on trip page, filter by query)
    if (calendarCommands) {
      const filtered = calendarCommands
        .filter((c) => c.label.toLowerCase().includes(q))
      if (filtered.length > 0) {
        // Enabled first, disabled last
        filtered.sort((a, b) => {
          if (a.isEnabled && !b.isEnabled) return -1
          if (!a.isEnabled && b.isEnabled) return 1
          return 0
        })
        result.push({
          key: 'commands',
          label: 'Commands',
          items: filtered.map((c) => ({
            type: 'command' as const,
            id: `cmd-${c.id}`,
            label: c.label,
            command: c,
          })),
        })
      }
    }

    return result
  }, [query, tripResults, calendarCommands])

  // Flat list for index tracking
  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups])

  // Reset highlight when results change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [flatItems.length])

  // ─── Show preview for keyboard-highlighted trip ──────────
  useEffect(() => {
    const item = flatItems[highlightedIndex]
    if (item?.type === 'trip') {
      setHoveredTrip(item.data)
      // hoverAnchor will be null for keyboard nav — preview uses fixed position fallback
    } else {
      setHoveredTrip(null)
      setHoverAnchor(null)
    }
  }, [highlightedIndex, flatItems])

  // ─── Execute item ────────────────────────────────────────

  function executeItem(item: PaletteItem) {
    setIsOpen(false)
    if (item.type === 'navigation') {
      router.push(item.path)
    } else if (item.type === 'trip') {
      router.push(`/trip/${item.data.tripId}`)
    } else if (item.type === 'command') {
      if (item.command.isEnabled) {
        item.command.execute()
      }
    }
  }

  function isItemDisabled(item: PaletteItem): boolean {
    return item.type === 'command' && !item.command.isEnabled
  }

  // ─── Keyboard navigation ────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => {
        for (let i = prev + 1; i < flatItems.length; i++) {
          if (!isItemDisabled(flatItems[i])) return i
        }
        return prev
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => {
        for (let i = prev - 1; i >= 0; i--) {
          if (!isItemDisabled(flatItems[i])) return i
        }
        return prev
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatItems[highlightedIndex]
      if (item && !isItemDisabled(item)) {
        executeItem(item)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setIsOpen(false)
    }
  }

  // ─── Hover preview position ──────────────────────────────

  const previewStyle = useMemo(() => {
    if (!hoveredTrip) return { display: 'none' as const }
    if (!hoverAnchor) {
      // Keyboard navigation fallback: position to the right of the modal
      return { top: '15vh', left: 'calc(50% + 280px)', display: 'block' as const }
    }
    const rect = hoverAnchor.getBoundingClientRect()
    const spaceRight = window.innerWidth - rect.right
    if (spaceRight > 260) {
      return { top: rect.top, left: rect.right + 8, display: 'block' as const }
    }
    return { top: rect.top, right: window.innerWidth - rect.left + 8, display: 'block' as const }
  }, [hoverAnchor, hoveredTrip])

  // ─── Render ──────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false)
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-[520px] mx-4 bg-white dark:bg-[#0f1a28] rounded-xl border border-gray-200 dark:border-[#1e3a5f]/40 shadow-2xl overflow-hidden"
            initial={{ scale: 0.96, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: -8 }}
            transition={{ duration: 0.12 }}
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-[#1e3a5f]/30">
              <svg
                width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                className="text-gray-400 dark:text-[#4a7ab5] shrink-0"
              >
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search trips, navigate..."
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-[#f5efe8] placeholder-gray-400 dark:placeholder-[#4a7ab5] outline-none"
              />
              <kbd className="text-[10px] text-gray-400 dark:text-[#484f58] bg-gray-100 dark:bg-[#0a1520] border border-gray-200 dark:border-[#1e3a5f]/30 px-1.5 py-0.5 rounded">
                Esc
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[360px] overflow-y-auto py-1">
              {flatItems.length === 0 && !tripSearchLoading && (
                <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-[#4a7ab5]">
                  No results found
                </div>
              )}

              {tripSearchLoading && query.length >= 3 && tripResults.length === 0 && (
                <div className="px-4 py-3 text-center text-sm text-gray-400 dark:text-[#4a7ab5]">
                  Searching trips...
                </div>
              )}

              {groups.map((group) => (
                <div key={group.key}>
                  <div className="px-3 py-1.5 text-[10px] font-medium text-gray-400 dark:text-[#4a7ab5] uppercase tracking-wider">
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const index = flatItems.indexOf(item)
                    const isHighlighted = index === highlightedIndex
                    const disabled = isItemDisabled(item)

                    return (
                      <button
                        key={item.id}
                        disabled={disabled}
                        onClick={() => {
                          if (!disabled) executeItem(item)
                        }}
                        onMouseEnter={(e) => {
                          if (!disabled) setHighlightedIndex(index)
                          if (item.type === 'trip') {
                            setHoveredTrip(item.data)
                            setHoverAnchor(e.currentTarget)
                          }
                        }}
                        onMouseLeave={() => {
                          if (item.type === 'trip') {
                            setHoveredTrip(null)
                            setHoverAnchor(null)
                          }
                        }}
                        className={[
                          'w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors',
                          disabled
                            ? 'text-gray-400 dark:text-[#484f58] cursor-default pointer-events-none'
                            : isHighlighted
                              ? 'bg-gray-100 dark:bg-[#1e3a5f]/30 text-gray-900 dark:text-[#f5efe8]'
                              : 'text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20',
                        ].join(' ')}
                      >
                        <span className="flex items-center gap-2">
                          {item.type === 'trip' && (
                            <span className="text-xs text-gray-400 dark:text-[#4a7ab5]">
                              {item.data.destination}
                            </span>
                          )}
                          <span>{item.label}</span>
                        </span>
                        {item.type === 'command' && item.command.shortcut && (
                          <kbd className="text-[10px] text-gray-400 dark:text-[#484f58] bg-gray-100 dark:bg-[#0a1520] border border-gray-200 dark:border-[#1e3a5f]/30 px-1.5 py-0.5 rounded ml-4 shrink-0">
                            {item.command.shortcut.display}
                          </kbd>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Hover preview popover */}
          {hoveredTrip && (
            <div
              className="fixed z-[60] w-[240px] bg-white dark:bg-[#0f1a28] rounded-lg border border-gray-200 dark:border-[#1e3a5f]/40 shadow-xl p-3 pointer-events-none"
              style={previewStyle}
            >
              <div className="font-medium text-sm text-gray-900 dark:text-[#f5efe8]">
                {hoveredTrip.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-[#4a7ab5] mt-0.5">
                {hoveredTrip.destination}
              </div>
              <div className="text-xs text-gray-500 dark:text-[#4a7ab5] mt-1">
                {formatTripDates(hoveredTrip.startDate, hoveredTrip.endDate)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[hoveredTrip.status] ?? STATUS_COLORS.planning}`} />
                <span className="text-xs text-gray-500 dark:text-[#4a7ab5] capitalize">
                  {hoveredTrip.status}
                </span>
                <span className="text-xs text-gray-400 dark:text-[#484f58] ml-auto">
                  {hoveredTrip.activityCount} activities
                </span>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/GlobalCommandPalette.tsx && git commit -m "feat: add GlobalCommandPalette with semantic search + hover preview"
```

---

## Chunk 3: Integration — Wire Everything Together

### Task 12: Mount GlobalCommandPalette in Providers

**Files:**
- Modify: `apps/web/components/providers.tsx`

- [ ] **Step 1: Add GlobalCommandPalette to Providers**

Add import at the top of `apps/web/components/providers.tsx`:
```typescript
import { GlobalCommandPalette } from './GlobalCommandPalette'
```

Update the return JSX to include `GlobalCommandPalette`:
```typescript
return (
  <QueryClientProvider client={queryClientRef.current}>
    {children}
    <GlobalCommandPalette />
  </QueryClientProvider>
);
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/providers.tsx && git commit -m "feat: mount GlobalCommandPalette in root Providers"
```

---

### Task 13: Wire Calendar Commands into Zustand Store + Remove Old Palette

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`
- Modify: `apps/web/components/calendar/hooks/useCalendarCommands.ts`
- Modify: `apps/web/components/calendar/TripNavbar.tsx`

This task: (a) publishes commands to Zustand, (b) removes the old CommandPalette, (c) removes open-palette command, (d) removes isPaletteOpen state, (e) updates TripNavbar prop interface.

- [ ] **Step 1: Remove `open-palette` command and `isPaletteOpen`/`onOpenPalette` from useCalendarCommands**

In `apps/web/components/calendar/hooks/useCalendarCommands.ts`:

1. Delete the `open-palette` command object (~lines 199-206):
```typescript
// DELETE this entire command block:
{
  id: 'open-palette',
  label: 'Open Command Palette',
  group: 'view',
  shortcut: { key: 'k', meta: true, display: 'Ctrl K' },
  isEnabled: true,
  execute: onOpenPalette,
},
```

2. Remove `isPaletteOpen` and `onOpenPalette` from the `UseCalendarCommandsInput` interface:
```typescript
// REMOVE these two lines from the interface:
isPaletteOpen: boolean
onOpenPalette: () => void
```

3. Remove `isPaletteOpen` and `onOpenPalette` from the destructured params of the hook function.

4. Remove `isPaletteOpen` and `onOpenPalette` from the `useMemo` dependency array.

5. Update `isEnabled` on move commands — replace `hasSelection && !isPaletteOpen` with just `hasSelection`:

For commands `move-up`, `move-down`, `move-prev-day`, `move-next-day` (~lines 108, 118, 128, 138), change:
```typescript
isEnabled: hasSelection && !isPaletteOpen,
```
to:
```typescript
isEnabled: hasSelection,
```

- [ ] **Step 2: Update CalendarDashboard — remove old palette, publish to Zustand**

In `apps/web/components/calendar/CalendarDashboard.tsx`:

1. Remove imports:
```typescript
// DELETE:
import { CommandPalette } from './CommandPalette'
```

2. Add import:
```typescript
import { useCalendarCommandsStore } from '@/stores/calendarCommandsStore'
import { useIndexTrip } from '@/hooks/useIndexTrip'
```

3. Remove state:
```typescript
// DELETE:
const [isPaletteOpen, setIsPaletteOpen] = useState(false)
```

4. Update `useCalendarCommands` call — remove `isPaletteOpen` and `onOpenPalette`:
```typescript
const commands = useCalendarCommands({
  selectedActivity,
  moveActivity,
  removeActivity,
  updateActivity,
  duplicateActivity,
  onViewModeChange: setViewMode,
  selectDay,
  tripDays: TRIP_DAYS,
  tripStartDate: parsedStartDate,
  onAddEvent: () => handleCreateActivity(selectedDayIndex ?? 0, 12),
  marqueeSelectedIds,
  onBulkDelete: handleBulkDelete,
  onBulkDuplicate: handleBulkDuplicate,
})
```

5. Publish commands to Zustand store and clean up on unmount:
```typescript
const setStoreCommands = useCalendarCommandsStore((s) => s.setCommands)
const clearStoreCommands = useCalendarCommandsStore((s) => s.clearCommands)

useEffect(() => {
  setStoreCommands(commands)
}, [commands, setStoreCommands])

useEffect(() => {
  return () => clearStoreCommands()
}, [clearStoreCommands])
```

6. Update `useKeyboardShortcuts` call — the global palette handles Ctrl+K via capture-phase listener and `e.stopPropagation()`, so `useKeyboardShortcuts` won't see it. Pass `false` for isPaletteOpen since the global palette suppresses keys when open via focus capture:
```typescript
useKeyboardShortcuts(
  commands,
  false,
  () => {},
  () => selectEvent(null),
  marqueeSelectedIds.size > 0,
  clearMarqueeSelection,
)
```

7. Remove `onOpenPalette` from `TripNavbar` props:
```typescript
// DELETE from TripNavbar JSX:
onOpenPalette={() => setIsPaletteOpen(true)}
```

8. Delete the old `CommandPalette` render at the bottom (~lines 633-637):
```typescript
// DELETE:
<CommandPalette
  isOpen={isPaletteOpen}
  onClose={() => setIsPaletteOpen(false)}
  commands={commands}
/>
```

9. Add indexing effect:
```typescript
const { indexTrip } = useIndexTrip()

useEffect(() => {
  if (tripId && activities.length > 0) {
    indexTrip(tripId)
  }
}, [tripId, activities.length, indexTrip])
```

- [ ] **Step 3: Update TripNavbar interface**

In `apps/web/components/calendar/TripNavbar.tsx`, remove `onOpenPalette` from the component's props interface. Find the interface/type that defines the props and remove:
```typescript
// DELETE:
onOpenPalette: () => void
```

Also remove any usage of `onOpenPalette` inside the component (likely a button's onClick handler). If there's a Ctrl+K button/hint in the navbar, update it to note it's handled globally, or remove the button.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx apps/web/components/calendar/hooks/useCalendarCommands.ts apps/web/components/calendar/TripNavbar.tsx apps/web/stores/calendarCommandsStore.ts && git commit -m "feat: wire calendar commands to Zustand store, remove old CommandPalette"
```

---

### Task 14: Typecheck + Verify

- [ ] **Step 1: Run typecheck**

```bash
npm run typecheck
```

Expected: No errors. Fix any type issues found — common ones:
- `isPaletteOpen` references in `useCalendarCommands` (should be fully removed)
- `onOpenPalette` references in `TripNavbar` or `CalendarDashboard`
- Missing imports for new stores/hooks

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No new lint errors.

- [ ] **Step 3: Fix any issues and commit**

```bash
git add -A && git commit -m "fix: resolve typecheck and lint issues"
```

(Only if there were issues to fix — skip if clean.)
