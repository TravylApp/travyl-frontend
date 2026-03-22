# Context Search — Global Semantic Command Palette

**Date:** 2026-03-21
**Branch:** feature/tra-228
**Status:** Draft

## Goal

Replace the trip-scoped `CommandPalette` with a single global command palette (Ctrl+K) that works on every page. It combines static navigation, semantic trip search (via Supabase pgvector + Bedrock Titan embeddings), and context-aware trip commands when on a trip page.

## What's Searchable

| Category | Source | Match Strategy |
|----------|--------|----------------|
| Navigation | Static list (Home, Trips, Profile, Settings) | Client-side fuzzy text match |
| Trips | User's trips via pgvector similarity search | Semantic vector search via API |
| Trip Commands | Existing `useCalendarCommands` | Client-side fuzzy text match (only on trip pages) |

## Architecture

### Why pgvector (not OpenSearch Serverless)

OpenSearch Serverless has a ~$700/month minimum (2 OCU floor). The dataset is small — a user's trips, not millions of catalog items. Supabase Postgres with pgvector handles this scale easily at zero additional cost and keeps everything in one database.

### Database Schema

New table: `trip_embeddings`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| trip_id | uuid | NO | FK → trips.id ON DELETE CASCADE |
| user_id | uuid | NO | FK → auth.users |
| embedding | vector(1024) | NO | — |
| text_content | text | NO | — |
| metadata | jsonb | NO | {} |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

**Constraints:**
- Unique on `trip_id` (one embedding per trip)
- HNSW index on `embedding` column using cosine distance (works without pre-existing data, unlike IVFFlat)
- RLS policy: users can only read their own embeddings

**Metadata jsonb contains:** `title`, `destination`, `status`, `startDate`, `endDate`, `activityCount`

The `text_content` field stores the raw text blob used to generate the embedding, useful for debugging and re-embedding.

Note: `TripCommand` in the palette is a wrapper type — the global palette maps from the existing `Command` type (which has `group: 'edit' | 'activity' | 'view' | 'insert'`) by adding `type: 'command'`. The existing `Command` interface is not modified.

### Embedding Model

Bedrock Titan Text Embeddings v2 (`amazon.titan-embed-text-v2:0`):
- Output dimension: 1024
- Max input tokens: 8,192
- Cost: ~$0.0001 per 1K tokens (negligible at this scale)

### Indexing Pipeline

1. User creates/updates a trip or modifies activities
2. Frontend calls `POST /index` with `{ tripId }` (fire-and-forget, 5-second debounce)
3. `index-trip` Lambda:
   - Validates JWT, extracts userId
   - Fetches trip + all activities from Supabase
   - Builds text blob: `"{title} | {destination} | {status} | {activity_name} ({activity_type}), ... | Notes: {notes}"`
   - Calls Bedrock Titan to generate 1024-dim embedding
   - Upserts to `trip_embeddings` (ON CONFLICT trip_id DO UPDATE)
   - Stores metadata: `{ title, destination, status, startDate, endDate, activityCount }`
4. On trip delete: CASCADE on `trip_id` FK handles cleanup automatically (no separate delete endpoint needed)

**Debouncing:** `useIndexTrip` hook debounces calls by 5 seconds per tripId. During collaborative editing where Yjs flushes frequently, this prevents excessive re-indexing. Only the last call within the window fires.

### Search API

`GET /context-search?q=<query>`

1. Validates JWT, extracts userId
2. Embeds the query text via Bedrock Titan (same model as indexing)
3. Queries Supabase via RPC function:
   ```sql
   SELECT trip_id, metadata, 1 - (embedding <=> $1) AS score
   FROM trip_embeddings
   WHERE user_id = $2
   ORDER BY embedding <=> $1
   LIMIT 5;
   ```
4. Returns top 5 results:
   ```json
   {
     "results": [
       {
         "tripId": "uuid",
         "title": "Paris Adventure",
         "destination": "Paris, France",
         "startDate": "2026-04-10",
         "endDate": "2026-04-17",
         "status": "planning",
         "activityCount": 12,
         "score": 0.92
       }
     ]
   }
   ```

### SST Infrastructure

| Resource | Type | Purpose |
|----------|------|---------|
| Bedrock IAM Policy | `aws.iam.Policy` | `bedrock:InvokeModel` on `arn:aws:bedrock:*::foundation-model/amazon.titan-embed-text-v2:0` |

New file: `infra/search.ts` — defines the Bedrock IAM policy.

Updated file: `infra/api.ts` — adds `POST /index` and `GET /context-search` routes. Both routes link `supabaseUrl`, `supabaseSecretKey`, and attach the Bedrock permission. Uses `NEXT_PUBLIC_RECOMMENDATION_API_URL` env var (same base URL as existing `/suggest` and `/search` endpoints).

### Lambda Functions

| Lambda | Route | Purpose |
|--------|-------|---------|
| `services/context-search.ts` | `GET /context-search` | Embed query + pgvector similarity search |
| `services/index-trip.ts` | `POST /index` | Embed trip text + upsert to trip_embeddings |

Shared utility:
- `services/lib/embeddings.ts` — Bedrock Titan embedding wrapper (returns `number[]` of length 1024)

Both Lambdas connect to Supabase using the existing `supabaseUrl` and `supabaseSecretKey` SST secrets (service role for server-side access).

### Supabase Migration

Enable pgvector and create the search RPC:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create trip_embeddings table
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

-- HNSW index for cosine similarity (works well with any row count, no training needed)
CREATE INDEX trip_embeddings_vector_idx
  ON trip_embeddings USING hnsw (embedding vector_cosine_ops);

-- RLS
ALTER TABLE trip_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own embeddings"
  ON trip_embeddings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage embeddings"
  ON trip_embeddings FOR ALL USING (true);

-- Search RPC
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

### Bootstrap: Backfill Existing Trips

A one-time Lambda or script (`services/backfill-embeddings.ts`) that:
1. Fetches all trips from Supabase
2. For each trip, fetches activities, builds text blob, generates embedding
3. Upserts to `trip_embeddings`

Can be invoked manually via `sst shell` or as a one-off Lambda invocation after deploy.

## Frontend

### Result Item Types

Three distinct types for the three result categories:

```typescript
interface NavItem {
  type: 'navigation'
  id: string
  label: string
  path: string
}

interface TripSearchResult {
  type: 'trip'
  tripId: string
  title: string
  destination: string
  startDate: string
  endDate: string
  status: string
  activityCount: number
  score: number
}

interface TripCommand {
  type: 'command'
  id: string
  label: string
  group: string
  shortcut?: { key: string; meta?: boolean; display: string }
  isEnabled: boolean
  execute: () => void
}

type PaletteItem = NavItem | TripSearchResult | TripCommand
```

### Global Command Palette Component

**New file:** `apps/web/components/GlobalCommandPalette.tsx`

Replaces the existing trip-scoped `CommandPalette`. Mounted once in the root layout so it's available on every page.

**Result groups (in display order):**

1. **Navigation** — static items, always shown, fuzzy-filtered client-side
2. **Trips** — semantic search results from `GET /context-search`, debounced 300ms
3. **Commands** — existing calendar commands, only when on a `/trip/[id]` page

**Behavior:**
- Ctrl+K opens from anywhere
- Text input filters navigation items instantly (client-side) and triggers debounced API search for trips
- Arrow keys navigate results across all groups, Enter executes/navigates
- Click on navigation item or trip → `router.push(path or /trip/{tripId})`
- Hover on a trip → lightweight popover preview (right side, or left if clipped)
- Esc closes
- Minimum 3 characters before triggering semantic search API call (shorter queries produce poor embeddings)
- Results below 0.4 similarity score are filtered out server-side to avoid irrelevant matches

**Empty/error states:**
- No results for query → "No results found" message
- API error → falls back to navigation-only results, no error shown to user (trips section hidden)
- Loading → subtle spinner in the trips section while results load

### Hover Preview Popover

Appears on hover over a trip result. Shows:
- Trip title
- Destination
- Dates (formatted: "Mar 15 - Mar 22, 2026")
- Status badge (color-coded per design tokens: planning=#9CA3AF, booked=#F59E0B, active=#10B981, completed=#003594)
- Activity count (e.g., "12 activities")

Positioned to the right of the result item (or left if insufficient space).

Keyboard accessibility: preview appears when a trip result is focused via arrow keys (same content as hover).

### CalendarCommandsContext

**New file:** `apps/web/components/calendar/CalendarCommandsContext.tsx`

```typescript
const CalendarCommandsContext = createContext<Command[] | null>(null)

export function CalendarCommandsProvider({ children, commands }: {
  children: React.ReactNode
  commands: Command[]
}) {
  return (
    <CalendarCommandsContext.Provider value={commands}>
      {children}
    </CalendarCommandsContext.Provider>
  )
}

export function useCalendarCommandsContext(): Command[] | null {
  return useContext(CalendarCommandsContext)
}
```

**Placement:** The `CalendarCommandsProvider` is mounted in the trip page layout (`apps/web/app/(trips-app)/trip/[id]/layout.tsx` or the trip page component), NOT inside `CalendarDashboard`. This ensures it's above `GlobalCommandPalette` (which lives in the root layout) in the React context tree. `CalendarDashboard` calls `useCalendarCommands` and passes the result into the provider.

The `GlobalCommandPalette` consumes this context — if commands are available (on a trip page), they appear in the "Commands" group; if null (any other page), the group is hidden.

**Ctrl+K conflict resolution:** The `open-palette` command must be removed from `useCalendarCommands` since the global palette owns Ctrl+K. The Ctrl+K handler in `useKeyboardShortcuts` is also removed — the global palette registers its own `keydown` listener at the document level.

### Hook: `useContextSearch`

**New file:** `apps/web/hooks/useContextSearch.ts` (web-only, not in shared package)

```typescript
interface ContextSearchResult {
  tripId: string
  title: string
  destination: string
  startDate: string
  endDate: string
  status: string
  activityCount: number
  score: number
}

function useContextSearch(query: string): {
  results: ContextSearchResult[]
  isLoading: boolean
  isError: boolean
}
```

- Debounces query by 300ms
- Calls `GET /context-search?q=<query>` with Supabase JWT
- Returns results via React Query
- Skips API call when query is empty or < 3 characters
- Uses `NEXT_PUBLIC_RECOMMENDATION_API_URL` as base URL (same as existing API hooks)
- On error: returns empty results, sets `isError` true

### Hook: `useIndexTrip`

**New file:** `apps/web/hooks/useIndexTrip.ts` (web-only)

```typescript
function useIndexTrip(): {
  indexTrip: (tripId: string) => void
}
```

- Fire-and-forget mutation (same pattern as `useInteractionTracking`)
- 5-second debounce per tripId — collapses rapid activity changes into one index call
- Called from existing trip mutation paths (create, update, activity changes)
- Trip deletion handled automatically by CASCADE FK — no explicit delete needed

### Integration Points

| Existing Code | Change |
|---------------|--------|
| Root layout (`apps/web/app/layout.tsx`) | Mount `GlobalCommandPalette` |
| `CalendarDashboard.tsx` | Remove local `CommandPalette` render, wrap with `CalendarCommandsProvider` |
| `useKeyboardShortcuts.ts` | Remove Ctrl+K handler (moved to global palette) |
| Trip creation flow | Call `indexTrip()` after successful create |
| `useYjsSync` or activity mutations | Call `indexTrip()` after activity changes (debounced by hook) |

### Navigation Items (static)

```typescript
const NAV_ITEMS: NavItem[] = [
  { type: 'navigation', id: 'home', label: 'Home', path: '/' },
  { type: 'navigation', id: 'trips', label: 'Trips', path: '/trips' },
  { type: 'navigation', id: 'profile', label: 'Profile', path: '/profile' },
  { type: 'navigation', id: 'settings', label: 'Settings', path: '/settings' },
]
```

## Data Flow Summary

```
User types in Ctrl+K palette
  |
  +--> Navigation items: instant fuzzy filter (client-side)
  |
  +--> Trip search (debounced 300ms, min 3 chars):
  |      Frontend -> GET /context-search?q=... (JWT)
  |        -> Lambda embeds query (Bedrock Titan)
  |        -> Supabase RPC: pgvector cosine similarity (filtered by userId)
  |        -> Returns top 5 trips with metadata
  |
  +--> Trip commands (if on trip page): instant fuzzy filter (client-side)
```

```
Trip created/updated/activities changed
  |
  +--> useIndexTrip fires (5s debounce per tripId)
        -> POST /index { tripId } (fire-and-forget)
        -> Lambda fetches trip + activities from Supabase
        -> Builds text blob
        -> Bedrock Titan embedding (1024-dim)
        -> Upsert to trip_embeddings table
```

## Out of Scope

- Searching activities independently (activities are embedded as part of their trip)
- Searching collaborator trips (only trips you own are indexed; collaborator trip search is a future enhancement)
- Searching favorite places
- Mobile app support (web only for now)
- Search result ranking tuning (use cosine similarity defaults initially)
- Client-side fuzzy matching uses simple `includes()` (same as existing CommandPalette); upgrade to fuse.js only if needed later
- Indexing failure retry/DLQ — if `POST /index` fails, the trip remains un-indexed until the next mutation triggers re-indexing. Acceptable for MVP since the backfill script can catch up.
