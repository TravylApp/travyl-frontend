# Packing List Feature — Design Spec

## Goal

Add a collaborative packing list to each trip. Users can quickly add items via spotlight search (backed by a static catalog of common travel items), check them off, and see who added what. The list lives as a sidebar panel in the trip view with an expandable full-page layout for deeper packing sessions.

## Migration Notes

The codebase has existing packing stubs that this feature replaces:

- **Types:** `PackingItem` (`{ item, packed }`) and `PackingList` in `packages/shared/src/types/index.ts` (lines 285-292) — replace with the new `DbPackingItem` and `PackingAuditEntry` types. The old types are only used by mock data and the stub page.
- **Mock data:** `MOCK_PACKING_LIST` in shared — remove once the real data layer is in place.
- **Stub page:** `apps/web/app/(trips-app)/trip/[id]/packing/page.tsx` — replace entirely with the new `PackingPage` component. The stub uses `lucide-react` icons; the replacement uses `iconoir-react` (project convention for trip pages).

## Core Decisions

- **Data persistence:** Supabase table + Realtime subscription (hybrid). Not Yjs — packing data doesn't need CRDT merge semantics.
- **Collaboration model:** One shared list per trip. Each item shows who added it (avatar + name). No claim/assignment system — just natural attribution.
- **Spotlight search:** Static catalog of ~150-200 common travel items with pre-assigned categories and tags. Fuzzy substring matching on name + tags. Custom items supported for anything not in the catalog.
- **Layout:** Sidebar panel (compact) + full-page route (expanded). Shared leaf components (`SpotlightSearch`, `PackingProgress`, `PackingCategoryList`, `PackingActivityFeed`), different layout wrappers (`PackingPanel` for sidebar, `PackingPage` for full-page).
- **Audit log:** Inline attribution on items + collapsible activity feed. Log entries written via Supabase DB trigger on `packing_items` table changes.
- **Icons:** `iconoir-react` (consistent with TripSidebar and trip page components).
- **Duplicates:** Allowed — two travelers may both want to bring sunscreen. No uniqueness constraint on `(trip_id, name)`.

## Database Schema

### `packing_items`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| trip_id | uuid | NO | FK → trips.id ON DELETE CASCADE |
| user_id | uuid | NO | who added the item |
| name | text | NO | — |
| category | text | NO | 'essentials' |
| is_packed | boolean | NO | false |
| packed_by | uuid | YES | who checked it off |
| packed_at | timestamptz | YES | when checked off |
| sort_order | integer | NO | 0 |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

**Indexes:**
- `packing_items_trip_id_idx` on `(trip_id)`
- `packing_items_trip_category_idx` on `(trip_id, category)`

**Triggers:**
- `set_updated_at` — auto-update `updated_at` on row changes (same pattern as `trips` and `activity` tables).

**RLS policies:** Same pattern as `activity` — users can read/write packing items for trips they own or collaborate on (via `trips.user_id` or `trip_collaborators`).

**Realtime:** Enable Supabase Realtime on this table for INSERT/UPDATE/DELETE events.

### `packing_audit_log`

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| trip_id | uuid | NO | FK → trips.id ON DELETE CASCADE |
| user_id | uuid | NO | who performed the action |
| item_id | uuid | YES | FK → packing_items.id ON DELETE SET NULL |
| action | text | NO | 'added' / 'packed' / 'unpacked' / 'removed' |
| item_name | text | NO | snapshot of item name at action time |
| created_at | timestamptz | NO | now() |

**Index:** `packing_audit_log_trip_id_idx` on `(trip_id, created_at DESC)`

**Population:** DB trigger on `packing_items` that reads `auth.uid()` from the request context:
- INSERT → log `added` with `item_name` snapshot
- UPDATE where `is_packed` changes: `true` → log `packed`, `false` → log `unpacked`
- DELETE → log `removed` with `item_name` snapshot

Note: The trigger uses `auth.uid()` which is available when mutations go through the PostgREST API (standard client path). Service-role operations would not populate `user_id` — this is acceptable since all packing mutations originate from the client.

### Categories

Predefined values: `clothing`, `toiletries`, `electronics`, `documents`, `accessories`, `essentials`.

Stored as plain text in the `category` column — no Postgres enum. The TypeScript type uses a const array + derived union so adding a category only requires updating one array:

```ts
const PACKING_CATEGORIES = ['clothing', 'toiletries', 'electronics', 'documents', 'accessories', 'essentials'] as const
type PackingCategory = (typeof PACKING_CATEGORIES)[number]
```

## Component Architecture

### Shared vs Layout-Specific Components

**Shared leaf components** (used by both panel and page):
- `SpotlightSearch` — quick-add input + dropdown
- `PackingProgress` — progress bar (accepts a `compact` prop for panel vs page sizing)
- `PackingCategoryList` — accordion of categories
- `PackingCategory` — single category section
- `PackingItem` — single item row (checkbox + name + avatar)
- `PackingActivityFeed` — audit log feed (accepts `collapsed` prop, defaults true in panel)

**Layout wrappers** (one per mode):
- `PackingPanel` — sidebar panel, vertical stack of shared components
- `PackingPage` — full-page, two-column grid layout

### Component Tree

```
PackingPanel (sidebar panel — compact mode)
├── SpotlightSearch
│   └── dropdown with filtered catalog results + "Add custom item" option
├── PackingProgress (compact=true)
├── PackingCategoryList (accordion)
│   └── PackingCategory (one per category with items)
│       └── PackingItem (checkbox + name + avatar of who added)
└── PackingActivityFeed (collapsed by default)
    └── chronological list of audit log entries

PackingPage (expanded full-page at /trip/[id]/packing)
└── two-column layout:
    left: SpotlightSearch + PackingCategoryList
    right: PackingProgress (compact=false, larger card) + PackingActivityFeed (always visible)
```

### File Locations

```
apps/web/components/packing/
├── PackingPanel.tsx              ← sidebar panel wrapper
├── PackingPage.tsx               ← expanded full-page wrapper
├── SpotlightSearch.tsx           ← quick-add input + dropdown
├── PackingProgress.tsx           ← progress bar
├── PackingCategoryList.tsx       ← accordion of categories
├── PackingCategory.tsx           ← single category section
├── PackingItem.tsx               ← single item row
└── PackingActivityFeed.tsx       ← audit log feed

packages/shared/src/
├── config/packingCatalog.ts      ← static catalog data
├── types/index.ts                ← add DbPackingItem, PackingAuditEntry, PackingCategory (replace old PackingItem/PackingList)
├── hooks/usePackingList.ts       ← React Query + Realtime hook
└── services/packingService.ts    ← Supabase CRUD functions
```

All new shared files must be re-exported from `packages/shared/src/index.ts` (the root barrel export).

### Shared Hook: `usePackingList(tripId)`

Returns:
- `items: DbPackingItem[]` — all items for the trip
- `auditLog: PackingAuditEntry[]` — recent audit entries (last 50)
- `isLoading`, `error` — standard React Query states
- `addItem(name, category)` — insert item + optimistic update
- `togglePacked(itemId)` — flip `is_packed`, set `packed_by`/`packed_at`
- `removeItem(itemId)` — delete item

**Realtime subscription:** Subscribes to `packing_items` changes filtered by `trip_id`. On receiving a change from another user, invalidates both `packing_items` and `packing_audit_log` React Query caches. Self-authored changes (where `user_id` matches current user) are skipped to avoid flicker from optimistic update → refetch race.

**Optimistic updates:** `addItem`, `togglePacked`, and `removeItem` update the local cache immediately, then sync to Supabase. On error, roll back.

## Spotlight Search

### Static Catalog

File: `packages/shared/src/config/packingCatalog.ts`

Structure:
```ts
type CatalogItem = {
  name: string
  category: PackingCategory
  tags: string[]
}
```

~150-200 items covering common travel needs. Examples:
- `{ name: 'Sunscreen', category: 'toiletries', tags: ['spf', 'sun protection', 'lotion'] }`
- `{ name: 'Power adapter', category: 'electronics', tags: ['plug', 'converter', 'charger', 'outlet'] }`
- `{ name: 'Passport', category: 'documents', tags: ['id', 'identification', 'travel document'] }`

### Search Behavior

1. User types in the spotlight input
2. Case-insensitive substring match against `name` and `tags` of catalog items
3. Results grouped by category, limited to ~8 visible results
4. Already-added items shown as dimmed/disabled in results
5. "Add custom item" option always visible at bottom if typed text doesn't exactly match a catalog item — user picks a category from a small dropdown
6. Selecting a catalog item auto-assigns its category and inserts immediately

## Sidebar Integration

### TripSidebar Changes

Add `Packing` to `NAV_ITEMS` array in `TripSidebar.tsx`:
- Icon: `Suitcase` from `iconoir-react`
- Position: after Budget, before Settings

### CalendarDashboard Changes

Add `activeNav === 'packing'` branch in the content rendering logic:
```
if activeNav === 'packing' → <PackingPanel tripId={tripId} />
```

### Expanded View

The existing `/trip/[id]/packing/page.tsx` stub is replaced entirely with the new `PackingPage` component — the two-column expanded layout. The sidebar panel includes an expand icon button that navigates to this route via `router.push`.

## Real-time Data Flow

1. **Mount:** React Query fetches `packing_items` and `packing_audit_log` for the trip
2. **Supabase Realtime:** Subscribe to `packing_items` table changes filtered by `trip_id`
3. **Local action:** User adds/checks/removes item → optimistic update → Supabase mutation → DB trigger writes audit log
4. **Remote action:** Another user's change arrives via Realtime → check `user_id` — if it's from the current user, skip (already handled by optimistic update). If from another user, invalidate both `packing_items` and `packing_audit_log` React Query caches → re-fetch.

## Types

```ts
const PACKING_CATEGORIES = ['clothing', 'toiletries', 'electronics', 'documents', 'accessories', 'essentials'] as const
type PackingCategory = (typeof PACKING_CATEGORIES)[number]

interface DbPackingItem {
  id: string
  trip_id: string
  user_id: string
  name: string
  category: PackingCategory
  is_packed: boolean
  packed_by: string | null
  packed_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
  // Joined from profiles:
  user_display_name?: string
  user_avatar_url?: string
}

interface PackingAuditEntry {
  id: string
  trip_id: string
  user_id: string
  item_id: string | null
  action: 'added' | 'packed' | 'unpacked' | 'removed'
  item_name: string
  created_at: string
  // Joined from profiles:
  user_display_name?: string
  user_avatar_url?: string
}
```

Note: Type is named `DbPackingItem` to avoid collision with the old `PackingItem` type during migration. Once the old type and its references are removed, it can be renamed if desired.

## Out of Scope

- AI-powered suggestions (future enhancement — catalog interface designed to support swapping in an API endpoint)
- Drag-and-drop reordering (within or between categories)
- Packing list templates (e.g., "Beach trip starter pack") — future feature
- Mobile app implementation (web first)
- Quantity tracking (just presence/absence of items)
- `sort_order` management — items append to the end of their category. Manual reorder is out of scope for v1.
