# Travyl — Architecture

## Monorepo

npm workspaces + SST v3 (Ion). Four top-level concerns:

- `apps/web` — Next.js 16 web app (`@travyl/web`)
- `apps/mobile` — Expo 54 React Native app (`@travyl/mobile`)
- `packages/shared` — shared library consumed by both (`@travyl/shared`)
- `services/` — AWS Lambda functions for the recommendation engine
- `infra/` — SST resource definitions (all AWS infrastructure as code)

`@travyl/shared` has **no sub-path exports**. Always import from the root:
```ts
// ✅
import { useTrips, supabase, useAuthStore } from '@travyl/shared'
// ❌ — will fail at runtime
import { supabase } from '@travyl/shared/services/supabase'
```

## Web stack

- **Next.js 16** App Router, `output: 'standalone'`, `transpilePackages: ['@travyl/shared']`
- **React 19.2** with React Compiler
- **Tailwind CSS 4**
- **Supabase JS v2** (`@supabase/supabase-js` 2.95)
- **React Query v5** (`@tanstack/react-query`) — server state
- **Zustand v5** — client state (auth)
- **Yjs 13** + `y-supabase` — real-time collaborative state
- **dnd-kit** — drag-and-drop on calendar
- **motion** (Framer Motion) — animations
- **Lucide React** — icons

## Mobile stack

- **Expo 54**, **React Native 0.81**, **expo-router**
- **NativeWind 4** (Tailwind for RN)
- **React Query v5**, **Zustand v5** (same as web, from shared)

## Shared package owns

- **Types** — all entity interfaces (`Trip`, `Activity`, `Profile`, etc.) in `src/types/index.ts`
- **Hooks** — data fetching hooks (`useTrips`, `useTrip`, `useActivities`, etc.)
- **Stores** — `useAuthStore` (Zustand auth state)
- **Services** — Supabase client (`supabase`) + all fetcher functions
- **Utils** — `activityMapper.ts` (CalendarActivity ↔ DB row conversion)
- **Config** — design tokens, mock data, animation constants

## Auth

- Supabase Auth, email + password
- Client: `createClient` with `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (publishable key format, not JWT anon key)
- State: `useAuthStore` (Zustand) — `user`, `session`, `loading`, `initialize()`
- `initialize()` must be called once at app root to hydrate session and subscribe to auth changes

## Real-time sync (Yjs)

- `YjsTripProvider` wraps each `/trip/[id]` route — provides `Y.Doc` and `Y.Map<"activities">` via context
- `y-supabase` is the transport (persists Yjs doc to `yjs_documents` table)
- `useYjsSync` observes Y.Map changes → debounced 1s flush to `activity` table via Supabase upsert
- `useActivityMutations` — create/delete do immediate Supabase write + Y.Map update; move/update do Y.Map only (flush handles persistence)
- `useCollaboratorPresence` — Supabase Realtime presence broadcast (not Yjs awareness)

## Data layer

| Concern | Tool |
|---|---|
| Server state (trips, places, profile) | React Query v5 |
| Collaborative state (activities on calendar) | Yjs Y.Map |
| Auth state | Zustand |
| Persistence | Supabase Postgres |
| Real-time transport | y-supabase + Supabase Realtime |

## Database schema

### `trips`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | — |
| title | text | NO | — |
| destination | text | NO | — |
| start_date | date | NO | — |
| end_date | date | NO | — |
| status | text | NO | 'planning' |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

### `activity`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| trip_id | uuid | NO | — (FK → trips.id) |
| user_id | uuid | NO | — |
| activity_name | text | NO | — |
| activity_type | text | NO | 'other' |
| starting_date | date | NO | — |
| ending_date | date | NO | — |
| starting_time | time | NO | — |
| ending_time | time | NO | — |
| estimated_cost | numeric | NO | 0 |
| latitude | numeric | NO | — |
| longitude | numeric | NO | — |
| currency | text | YES | — |
| notes | text | YES | — |
| sort_order | integer | NO | — |
| activity_data | jsonb | NO | {} |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

**Constraint:** `activity_dates_order` — `CHECK (ending_date >= starting_date)`

### `profiles`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | — (FK → auth.users) |
| display_name | text | YES | — |
| email | text | YES | — |
| avatar_url | text | YES | — |
| onboarding_completed | boolean | NO | false |
| preferences | jsonb | NO | {} |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

### `trip_collaborators`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| trip_id | uuid | NO | — (FK → trips.id) |
| user_id | uuid | NO | — |
| invited_email | text | YES | — |
| invite_token | text | YES | — |
| role_type | text | NO | 'viewer' |
| invite_status | text | NO | 'pending' |
| invited_by | uuid | NO | — |
| accepted_at | timestamptz | YES | — |
| created_at | timestamptz | NO | now() |

### `yjs_documents`
| Column | Type | Nullable | Default |
|---|---|---|---|
| id | text | NO | — (trip_id as key) |
| content | bytea | NO | \x |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

### Other tables
- `itinerary_edits` — audit log of calendar changes (trip_id, activity_id, edit_type, original_data, new_data)
- `trip_change_log` — high-level trip mutation log (action_type, entity_type, previous_data, new_data)
- `trip_feedback` — post-trip ratings (overall_rating, agent_accuracy, highlights, lowlights)
- `favorite_places` — saved places per user (activity_type, activity_data jsonb)
- `search_session` — flight/hotel search session tracking
- `user_travel_profile` — travel preferences (travel_style, pace, budget, cabin class)

## SST (Serverless Stack)

All AWS infrastructure is defined and deployed via **SST v3 (Ion)**, which uses Pulumi under the hood. SST lives in the monorepo root — `sst.config.ts` is the entry point, `infra/` contains resource definitions, `services/` contains Lambda function code.

### Why SST

- **Single `sst deploy`** provisions everything — Lambdas, OpenSearch, DynamoDB, API Gateway, S3, CloudFront, EventBridge
- **`sst dev`** gives live Lambda debugging with hot reload — no redeploy cycle
- **Type-safe resource bindings** — Lambda functions automatically get credentials and URLs for the resources they're bound to via `Resource.MyTable.name` etc.
- **Pulumi underneath** — anything Pulumi/AWS can do, SST can do. Custom resources for services like Amazon Personalize
- **Monorepo native** — designed for this exact setup (frontend + backend in one repo)

### Project Layout

```
travyl-frontend/
├── sst.config.ts               ← SST entry point, links infra + app
├── infra/
│   ├── api.ts                  ← API Gateway + Lambda route bindings
│   ├── storage.ts              ← OpenSearch Serverless, DynamoDB, S3, CloudFront
│   ├── events.ts               ← EventBridge bus + event rules
│   └── secrets.ts              ← SST secrets (API keys, Supabase service role key)
├── services/
│   ├── suggest.ts              ← GET /suggest — personalized recommendations
│   ├── search.ts               ← GET /search — semantic activity search
│   ├── interact.ts             ← POST /interact — log user interactions
│   ├── ingest.ts               ← Catalog ingestion job (Google Places, Viator)
│   ├── embed.ts                ← Batch compute Bedrock Titan embeddings
│   └── lib/
│       ├── embedding.ts        ← Bedrock Titan embedding client
│       ├── opensearch.ts       ← OpenSearch vector query builder
│       ├── cache.ts            ← DynamoDB recommendation cache
│       ├── personalize.ts      ← Amazon Personalize runtime client
│       └── types.ts            ← Shared backend types
├── apps/
├── packages/
```

### AWS Resources

| Resource | SST Component | Purpose |
|----------|--------------|---------|
| API Gateway v2 | `sst.aws.ApiGatewayV2` | REST endpoints consumed by frontend |
| Lambda | `sst.aws.Function` | All backend compute |
| OpenSearch Serverless | `aws.opensearch.ServerlessCollection` | Activity catalog + vector similarity search |
| DynamoDB | `sst.aws.Dynamo` | Recommendation cache (user+destination → suggestions) |
| EventBridge | `sst.aws.Bus` | Interaction event ingestion + async processing |
| S3 | `sst.aws.Bucket` | Activity images + Personalize training data export |
| CloudFront | `sst.aws.Router` | CDN for activity images |
| Bedrock | IAM policy grant | Titan embeddings + Claude for ranking explanations |
| Amazon Personalize | Custom Pulumi resource | Collaborative filtering + contextual re-ranking |

### Responsibility Split: Supabase vs AWS

| Concern | Owner | Why |
|---------|-------|-----|
| Auth | Supabase | Already wired, works with RLS |
| Trip/activity CRUD | Supabase | Real-time sync via Yjs, RLS policies |
| User profiles, travel preferences | Supabase | Simple relational data |
| Real-time collaboration | Supabase Realtime + Yjs | Already built |
| Activity catalog (millions of venues) | AWS OpenSearch | Vector search at scale |
| Recommendation engine | AWS Personalize + Lambda | ML-powered, collaborative filtering |
| Embeddings | AWS Bedrock | Managed, no GPU infra |
| Interaction tracking | AWS EventBridge + DynamoDB | High-throughput event ingestion |
| Image CDN | AWS S3 + CloudFront | Edge delivery, on-the-fly resize |

### Recommendation Data Flow

1. User opens trip → frontend calls `GET /suggest?destination=Paris&tripId=xxx&userId=xxx`
2. Lambda checks DynamoDB cache (key: `{userId}:{destination}:{travelStyle}:{budgetTier}`)
3. Cache hit → return immediately
4. Cache miss → query OpenSearch (vector similarity by destination + user taste vector) → re-rank via Personalize → write to DynamoDB → return
5. User interacts with suggestion cards → `POST /interact` → EventBridge → async update user taste vector
6. Nightly batch: `ingest.ts` pulls from Google Places / Viator → `embed.ts` computes vectors → upserts to OpenSearch

### Personalization Signals

| Tier | Source | Signal |
|------|--------|--------|
| 1 | `trips` table | Destination, dates, budget, travelers, scheduled activities |
| 2 | `user_travel_profile` table | travel_style, pace, budget_split, avg_budget_per_day |
| 3 | `favorite_places` + `search_session` | Saved places, search patterns, booking conversions |
| 4 | Schedule analysis | Time gaps, geographic clustering, category diversity |
| 5 | Amazon Personalize | Collaborative filtering across all users |

### Cache Strategy

- DynamoDB TTL: 6h destination-level, 30min personalized
- Invalidated on activity add/remove (schedule context changed)

## Key conventions

- **Column names matter** — `trips` uses `title`, `start_date`, `end_date`, `status`, `destination`. The `activity` table uses `activity_name`, `starting_date`, `ending_date`, `starting_time`, `ending_time`. Don't mix them up.
- **`useTrips` guard** — `enabled: !!user` must stay enabled; unauthenticated users should not trigger Supabase queries.
- **Hooks before early returns** — all hooks must be called before any conditional `return` in a component. Learned the hard way with `useCallback` in `CalendarDashboard`.
- **dnd-kit + nested scroll** — don't put `overflow-auto` inside `DndContext`. The outer scroll container owns scrolling; inner views use `min-w-0` only.
- **moveActivity must update endDay** — when moving an activity to a new day, shift `endDay` by the same delta as `day` or the `activity_dates_order` constraint will be violated.
