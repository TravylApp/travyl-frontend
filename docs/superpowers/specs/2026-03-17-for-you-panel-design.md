# For You Panel + Recommendation Engine — Design Spec

## Overview

A Pinterest-style "For You" sidebar panel on the calendar dashboard that surfaces AI-powered activity suggestions and search results. Users drag suggestion cards directly onto the calendar to schedule them. The backend recommendation engine runs on AWS via SST, with Supabase handling auth and trip data.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Panel position | Right column, permanent | Always visible; swaps to DetailPanel on event click |
| Card style | Full-image masonry (Pinterest) | Image-forward, compact, visually rich without a separate text section |
| Default content | AI suggestions by destination | Immediate value on page load, no user action required |
| Search behavior | Replaces suggestions when user types | Single panel, clean state transition |
| Drag-and-drop | Extends existing @dnd-kit/core setup | Suggestion cards are new drag sources into existing day column drop targets |
| Backend framework | SST v3 (Ion) | All AWS infra as code in the monorepo, type-safe bindings, live Lambda dev |
| Vector search | Amazon OpenSearch Serverless | Scales to billions of activities, sub-100ms queries |
| Embeddings | Amazon Bedrock (Titan) | Managed, no GPU infra to maintain |
| Recommendation engine | Amazon Personalize | Collaborative filtering + contextual re-ranking out of the box |
| Cache | DynamoDB | Instant reads, TTL-based expiry, SST-native |
| Event ingestion | EventBridge | Decouples interaction logging from request path |
| Activity images | S3 + CloudFront | Edge-served, resized on the fly |
| Initial implementation | Mock data first | Build and polish drag-to-calendar UX before wiring real backend |

## Layout

The For You panel is a permanent ~340px right column in CalendarDashboard. It shares space with the existing DetailPanel.

```
┌──────┬──────────────────────────────┬────────────┐
│ Nav  │        Calendar Grid         │  For You   │
│ Side │     (WeekView/DayView)       │  (default) │
│ bar  │                              │  or Detail │
└──────┴──────────────────────────────┴────────────┘
```

The panel is flush with the dashboard — same background, borders, and styling. Not floating or overlaid.

## For You Panel UI

### Card Design

Full-image masonry cards in a 2-column grid. All metadata overlaid on the image:

- **Bottom gradient overlay (always visible):** title, category tag, duration
- **Top-left badge:** price
- **Top-right badge:** star rating
- **On hover:** slight lift + shadow, dark overlay, centered "Drag to schedule" badge with grip icon

### Panel Anatomy

```
┌─────────────────────────┐
│ For You                 │
│ [🔍 Search activities...]│
│ [All] [Sights] [Dining] │
│ ─ Recommended for Paris ─│
│ ┌──────┐ ┌──────┐       │
│ │ img  │ │ img  │       │
│ │ ──── │ │      │       │
│ │title │ │ ──── │       │
│ │tag·2h│ │title │       │
│ └──────┘ │tag·3h│       │
│ ┌──────┐ └──────┘       │
│ │ img  │ ┌──────┐       │
│ │      │ │ img  │       │
│ │ ──── │ │ ──── │       │
│ │title │ │title │       │
│ │tag·1h│ │tag·2h│       │
│ └──────┘ └──────┘       │
│                         │
│ Drag to schedule ↑      │
└─────────────────────────┘
```

### Panel State Machine

```
ForYou (default) ──[user types]──→ Search Results
     │                                    │
     │←──────[clears search]──────────────┘
     │
     ├──[user clicks event on calendar]──→ DetailPanel
     │                                         │
     │←──────[closes detail]───────────────────┘
     │
     └──[user drags card to calendar]──→ Activity created, card removed from suggestions
```

### Filter Chips

Horizontal scrollable row below the search box: All, Sightseeing, Dining, Tours, Culture, Shopping, Nightlife, Outdoor. "All" is active by default. Selecting a category filters the masonry grid.

### Section Labels

- Default mode: "Recommended for {destination}"
- Search mode: "Results for '{query}'"

### Loading, Error, and Empty States

- **Loading:** Skeleton masonry grid with pulsing placeholder cards (2 columns, 4 placeholder cards)
- **API error:** "Couldn't load suggestions — tap to retry" with retry button, panel remains functional for search
- **Empty search results:** "No results for '{query}'" with suggestion to try broader terms
- **Unknown destination / empty catalog:** Fall back to generic popular activities for the country/region
- **No travel profile yet (new user):** Tiers 3-5 gracefully degrade — Tier 1 (trip context) and Tier 2 defaults provide baseline recommendations

## Drag-from-Panel-to-Calendar Interaction

### DndContext Restructure

**Critical:** The current `DndContext` in `CalendarDashboard.tsx` wraps only the scrollable grid area. The ForYou panel sits in the same position as DetailPanel — outside this boundary. For drag-from-panel-to-calendar to work, `DndContext` must be hoisted to wrap both the calendar grid and the right column (ForYou/Detail panel).

```
Before:
  <div className="flex flex-1">
    <div className="flex flex-1 overflow-auto">
      <DndContext>           ← only wraps grid
        <WeekView />
      </DndContext>
    </div>
    <DetailPanel />          ← outside DndContext
  </div>

After:
  <DndContext>               ← wraps grid + right column
    <div className="flex flex-1">
      <div className="flex flex-1 overflow-auto">
        <WeekView />
      </div>
      <ForYouPanel /> or <DetailPanel />
    </div>
  </DndContext>
```

### Type Discriminator on Drag Sources

EventBlock currently sets `data: { activity }` with no type field. Must be updated to `data: { type: 'activity', activity }` so `handleDragEnd` can distinguish suggestion drops from activity moves. This means **EventBlock is a modified file**, not unchanged.

### How It Works

1. Each For You card is a `useDraggable` with `data: { type: 'suggestion', suggestion: SuggestionCard }`
2. Each EventBlock is a `useDraggable` with `data: { type: 'activity', activity: CalendarActivity }` (updated from current)
3. Existing `DayColumn` drop targets use `useDroppable` with `id: "day-{dayIndex}"`
4. `handleDragEnd` branches on `active.data.current.type`:
   - `'suggestion'` → converts SuggestionCard to CalendarActivity (see mapping below), calls `onAddFromSuggestion(activity)`
   - `'activity'` → existing move behavior via `onMoveActivity` (unchanged logic)
5. Duration comes from suggestion metadata (e.g., `duration: 2` → 2-hour block)
6. Drop position determines `startHour`, snapped to 30-minute increments

### useCalendarDnd Interface Change

```typescript
// Before
interface UseCalendarDndOptions {
  onMoveActivity: (id: string, newDay: number, newStartHour: number) => void
}

// After
interface UseCalendarDndOptions {
  onMoveActivity: (id: string, newDay: number, newStartHour: number) => void
  onAddFromSuggestion: (activity: CalendarActivity) => void
}
```

### SuggestionCard → CalendarActivity Mapping

| SuggestionCard | CalendarActivity | Notes |
|---|---|---|
| `id` | `id` | Generate new UUID (don't reuse suggestion ID) |
| `name` | `title` | Rename |
| `category` | `type` | Both `string`, direct |
| `duration` | `duration` | Both hours as number |
| `String(price)` | `price` | Number → string conversion |
| `rating ?? undefined` | `rating` | `null` → `undefined` |
| `location` | `location` | Direct |
| `imageUrl` | `image` | Rename |
| `latitude` | `latitude` | Direct |
| `longitude` | `longitude` | Direct |
| `description` | `notes` | Direct |
| — | `day` | From drop target (`day-{dayIndex}`) |
| — | `startHour` | From drop position (snapped to 0.5h) |
| `source`, `relevanceScore`, `reason` | — | Display-only, dropped on conversion |

### Drag Preview

Ghost of the full-image card at 60% opacity. Custom `DragOverlay` component — scaling-by-proximity requires manual implementation using dnd-kit `modifiers` API. This is a polish item for after the core interaction works.

### After Drop

- Suggestion card animates out of the For You panel
- New EventBlock appears on the calendar at the drop position
- Activity is created via `addActivity` (existing mutation flow)
- Interaction event fired: `{ action: 'drag', suggestionId }`
- If the activity is later deleted from the calendar, the suggestion card reappears in the panel

### Keyboard Accessibility

Keyboard users cannot drag. Each suggestion card includes a "Schedule" icon button as an alternative — clicking it opens a quick day/time picker popover to place the activity without dragging.

## API Contract

### Endpoints

**`GET /suggest`**
```
Authorization: Bearer <supabase-jwt>
?destination=Paris&tripId=xxx
→ { suggestions: SuggestionCard[], source: 'cache' | 'fresh' }
```

**`GET /search`**
```
Authorization: Bearer <supabase-jwt>
?q=romantic+dinner&destination=Paris
→ { results: SuggestionCard[] }
```

**`POST /interact`**
```
Authorization: Bearer <supabase-jwt>
{ suggestionId, action: 'impression' | 'click' | 'drag' | 'dismiss', tripId }
→ 202 Accepted
```

### SuggestionCard Type

Defined in `packages/shared/src/types/index.ts` (shared package owns all entity interfaces, and this type is used by both the frontend and SST Lambda functions).

```typescript
interface SuggestionCard {
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
  description: string     // for hover context
  source: 'ai' | 'search'
  relevanceScore: number  // for ordering
  reason?: string         // "Popular with cultural travelers"
}
```

### Authentication

All API endpoints require a Supabase JWT in the `Authorization: Bearer <token>` header. Lambda functions validate the token using the Supabase service role key before processing. The `userId` is extracted from the validated token, not passed as a query parameter.

## SST Infrastructure

### Project Structure

```
travyl-frontend/
├── sst.config.ts
├── infra/
│   ├── api.ts              ← API Gateway + all Lambda routes
│   ├── storage.ts          ← OpenSearch, DynamoDB, S3, CloudFront
│   ├── events.ts           ← EventBridge bus + rules
│   └── secrets.ts          ← API keys
├── services/
│   ├── suggest.ts          ← get suggestions endpoint
│   ├── search.ts           ← semantic search endpoint
│   ├── interact.ts         ← log interaction event
│   ├── ingest.ts           ← catalog ingestion job
│   ├── embed.ts            ← compute embeddings job
│   └── lib/
│       ├── embedding.ts    ← Bedrock Titan client
│       ├── opensearch.ts   ← OpenSearch query builder
│       ├── cache.ts        ← DynamoDB read/write
│       ├── personalize.ts  ← Personalize runtime client
│       └── types.ts        ← shared backend types
├── apps/
│   ├── web/
│   └── mobile/
├── packages/
│   └── shared/
```

### AWS Resources

| Resource | SST Component | Purpose |
|----------|--------------|---------|
| OpenSearch Serverless | `aws.opensearch.ServerlessCollection` | Activity catalog + vector search |
| DynamoDB | `sst.aws.Dynamo` | Recommendation cache (user+destination → suggestions) |
| API Gateway | `sst.aws.ApiGatewayV2` | REST endpoints for frontend |
| Lambda functions | `sst.aws.Function` | All compute |
| EventBridge | `sst.aws.Bus` | Interaction event ingestion |
| S3 | `sst.aws.Bucket` | Activity images + Personalize training data |
| CloudFront | `sst.aws.Router` | CDN for activity images |
| Bedrock | IAM policy grant | Titan embeddings + Claude for ranking explanations |
| Amazon Personalize | Custom Pulumi resource | Collaborative filtering + contextual re-ranking. Multi-step setup: Dataset Group, Datasets (Users/Items/Interactions), Schemas, EventTracker, Solution, Campaign. Highest-complexity infra item — consider a separate setup phase. |
| Secrets | `sst.Secret` | Google Places API key, Supabase service role key |

### API Gateway CORS

SST's `ApiGatewayV2` handles CORS via the `cors` config option. Allow origin from the Next.js frontend domain(s), `Authorization` header, and `GET`/`POST` methods.

### Data Flow

```
Frontend (For You Panel)
    │
    ├─ GET /suggest ──→ API Gateway ──→ suggest Lambda
    │                                      │
    │                            ┌─────────▼──────────┐
    │                            │ 1. DynamoDB cache   │
    │                            │ 2. If miss:         │
    │                            │    → OpenSearch     │
    │                            │      vector query   │
    │                            │    → Personalize    │
    │                            │      re-rank        │
    │                            │    → Write cache    │
    │                            │ 3. Return results   │
    │                            └─────────────────────┘
    │
    ├─ GET /search ──→ API Gateway ──→ search Lambda
    │                                      │
    │                            ┌─────────▼──────────┐
    │                            │ 1. Embed query via  │
    │                            │    Bedrock Titan    │
    │                            │ 2. OpenSearch kNN   │
    │                            │ 3. Filter by dest   │
    │                            │ 4. Return results   │
    │                            └─────────────────────┘
    │
    └─ POST /interact ──→ API Gateway ──→ interact Lambda
                                              │
                                    ┌─────────▼──────────┐
                                    │ EventBridge bus     │
                                    │    │                │
                                    │    ├→ store event   │
                                    │    └→ update user   │
                                    │       taste vector  │
                                    └─────────────────────┘
```

### Personalization Tiers

All active from day one:

1. **Trip context** — destination, dates, budget, travelers, what's already scheduled
2. **User travel profile** — `user_travel_profile` table (travel_style, pace, budget_split)
3. **Behavioral signals** — `favorite_places`, `search_session`, past trip activities → user taste vector
4. **Contextual intelligence** — schedule gaps, geographic clustering, category diversity, time-of-day appropriateness
5. **Collaborative filtering** — Amazon Personalize: "travelers like you also loved..."

### Cache Strategy

- DynamoDB TTL: 6 hours for destination-level suggestions, 30 min for personalized results
- Cache key: `{userId}:{destination}:{travelStyle}:{budgetTier}`
- Cache invalidated when user adds/removes activities (schedule context changed)

### Catalog Ingestion

Nightly batch job (`ingest.ts`) pulls activity data from:
- Google Places API (venues, ratings, photos, hours)
- Viator / GetYourGuide (tours, experiences, prices)
- Foursquare (categories, tips)

`embed.ts` runs after ingestion to compute Bedrock Titan embeddings for new/updated activities and upsert into OpenSearch.

## Component Changes

### New Files

```
apps/web/components/calendar/ForYouPanel.tsx
apps/web/components/calendar/SuggestionCard.tsx
apps/web/components/calendar/hooks/useSuggestions.ts
apps/web/components/calendar/hooks/useInteractionTracking.ts
```

### Modified Files

- `CalendarDashboard.tsx` — hoist DndContext to wrap grid + right column; right column swaps between ForYouPanel and DetailPanel
- `useCalendarDnd.ts` — add `onAddFromSuggestion` to interface; branch `handleDragEnd` by `active.data.current.type`
- `EventBlock.tsx` — add `type: 'activity'` discriminator to drag data (`data: { type: 'activity', activity }`)
- `packages/shared/src/types/index.ts` — add SuggestionCard type

### Unchanged

WeekView, DayView, DayColumn, TripSidebar, CalendarHeader, AllDayRow, TimeGutter, DetailPanel.

## Build Order

1. **Mock data + For You panel UI** — masonry grid, cards, search box, filter chips
2. **Drag from panel to calendar** — extend useCalendarDnd for suggestion drops
3. **Panel state switching** — ForYou ↔ DetailPanel in the right column
4. **SST setup** — sst.config.ts, infra definitions
5. **Lambda functions** — suggest, search, interact endpoints
6. **OpenSearch + embeddings** — catalog ingestion, vector search
7. **Personalize integration** — collaborative filtering, re-ranking
8. **Swap mock for real data** — connect frontend to API

## Out of Scope

- Mobile app changes (separate effort)
- Activity booking/purchasing flow
- Social features (sharing suggestions between collaborators)
- Suggestion notifications/push
- A/B testing framework for recommendation quality
