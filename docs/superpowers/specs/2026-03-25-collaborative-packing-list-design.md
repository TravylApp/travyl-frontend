# Collaborative Packing List — Design Spec

## Goal

Replace the current client-side-only packing list with a persistent, collaborative packing list. One shared list per trip where all collaborators contribute, items have flexible ownership (shared, claimed, or group-tagged), and an audit log tracks all changes in a collapsible side panel.

AI suggestions are generated based on trip context (destination weather, scheduled activities, traveler metadata) and can create dynamic categories beyond the 6 static defaults.

## Core Concepts

### Single shared list

Each trip has exactly one packing list. All collaborators with edit access can add, remove, pack, and claim items. No per-user lists — everything lives in one place with filtering.

### Hybrid ownership model

Items exist in one of three ownership states:

| State | `owner_id` | `group_tag` | Example |
|-------|-----------|-------------|---------|
| **Shared** | `NULL` | `NULL` | First Aid Kit, Power Adapter |
| **Claimed** | user UUID | `NULL` | Justin's Hoodie |
| **Group-tagged** | `NULL` | `'kids'` / `'adults'` | Kids' Swimsuits |

- Items default to **shared** when added.
- Any collaborator can **claim** a shared item (sets `owner_id`).
- A claimed item can be **released** back to shared or **transferred** to another user.
- Items can be **group-tagged** for traveler groups (Kids, Adults) without being tied to a specific app user.

### Traveler metadata

Stored in `trips.trip_context` as structured JSON — not tied to app user accounts. Describes who is physically going on the trip:

```json
{
  "travelers": {
    "adults": 2,
    "children": 2,
    "infants": 0,
    "child_ages": [8, 12]
  }
}
```

This is set in trip settings and fed to the AI for suggestion generation.

## UI Layout

### Main packing list (left)

- **Toolbar**: Title, packed/total count, filter pills (All | My Items | Shared | Kids | Adults)
- **Progress bar**: Visual packed percentage
- **Category sections**: Collapsible groups. 6 static defaults (`clothing`, `toiletries`, `electronics`, `documents`, `accessories`, `essentials`) plus AI-generated dynamic categories (e.g., "Beach Gear", "Ski Equipment"). Dynamic categories show a small AI indicator.
- **Item row**: Checkbox, item name, ownership pill (colored badge: user name, "Shared", or group tag). Context menu or click actions for claim/release/transfer.
- **AI suggestions banner**: Appears at the bottom of the list. Shows suggestion chips with one-click accept (adds as shared) or dismiss. Contextual label: "Based on beach activities + 28C weather + 2 kids."
- **Add item bar**: Fixed at bottom. Text input with "Add" button. Items added as shared by default.

### Activity sidebar (right, collapsible)

- **Header**: "Activity" label with filter pills (All | Mine)
- **Feed entries**: Avatar + name + action + item + timestamp. Scrollable, most recent first.
- **Collapsible**: Toggle button to collapse/expand. Collapsed state persists per session.
- On mobile: hidden by default, accessible via a button/icon.

## Audit Log

### Actions tracked

| Action | Logged when | Extra data |
|--------|------------|------------|
| `added` | Item created | — |
| `removed` | Item deleted | `item_name` preserved |
| `packed` | `is_packed` set to true | — |
| `unpacked` | `is_packed` set to false | — |
| `claimed` | `owner_id` set from NULL | — |
| `released` | `owner_id` set to NULL | — |
| `transferred` | `owner_id` changed to another user | `target_user_id` |

All entries record: `user_id` (who did it), `item_id`, `item_name`, `created_at`.

### Real-time sync

The existing Supabase Realtime subscription on `packing_items` (already in `usePackingList`) handles live updates. The audit log query is invalidated when items change. No Yjs needed — Supabase postgres_changes is sufficient for this feature.

## AI Suggestions

### Existing infrastructure

- `packing-suggest.ts` Lambda — calls Claude via Bedrock
- `usePackingSuggestions` hook — fetches/manages suggestions
- `packing_suggestions` table — stores pending/accepted/dismissed suggestions
- `SuggestionChip` component — accept/dismiss UI
- `PACKING_CATALOG` — 100+ predefined items for autocomplete

### Enhancements

1. **Traveler metadata in prompt**: Pass `travelers` from `trip_context` to the Lambda. The AI considers "2 kids ages 8 and 12" when suggesting items.
2. **Activity context**: Pass scheduled activities from the calendar (already done — the Lambda fetches activities).
3. **Dynamic categories**: The AI response includes a `category` field. If it doesn't match the 6 static categories, it becomes a new dynamic category. The frontend renders these with an AI indicator badge.
4. **Existing items deduplication**: Already implemented — the Lambda receives current items and avoids duplicates.

### Suggestion flow

1. User opens packing list (or clicks "Refresh suggestions")
2. Frontend calls `POST /packing-suggest` with `tripId`
3. Lambda fetches trip details, activities, weather, traveler metadata, existing items
4. Claude generates suggestions with categories and reasons
5. Suggestions stored in `packing_suggestions` with `status: 'pending'`
6. Frontend shows suggestion chips grouped by category
7. Accept → inserts into `packing_items` as shared, logs `added` in audit
8. Dismiss → updates suggestion status to `dismissed`

## Data Model Changes

### `packing_items` — add columns

```sql
ALTER TABLE packing_items
  ADD COLUMN owner_id uuid REFERENCES auth.users(id) DEFAULT NULL,
  ADD COLUMN group_tag text DEFAULT NULL;
```

- `owner_id`: NULL = shared, set = claimed by that user
- `group_tag`: NULL = no group, 'kids' | 'adults' = group-tagged
- `category`: Already exists as `text` — no enum constraint, so freeform categories work without migration. The 6 static categories are a frontend concern (config constant), not a DB constraint.

### `packing_audit_log` — add column

```sql
ALTER TABLE packing_audit_log
  ADD COLUMN target_user_id uuid REFERENCES auth.users(id) DEFAULT NULL;
```

- Used only for `transferred` actions to record who received the item.
- `action` column already accepts any text — no constraint change needed for new action types.

### `trips.trip_context` — add key

No schema change needed. `trip_context` is `jsonb`. Add the `travelers` key:

```json
{
  "travelers": {
    "adults": 2,
    "children": 2,
    "infants": 0,
    "child_ages": [8, 12]
  }
}
```

### RLS policies

- `packing_items`: SELECT/INSERT/UPDATE/DELETE for trip collaborators with editor role OR trip owner (`trips.user_id`). The existing `is_trip_editor()` function only checks `trip_collaborators` — trip owners are not in that table, so each policy must include an `OR trips.user_id = auth.uid()` clause.
- `packing_audit_log`: SELECT for all trip collaborators and trip owner, INSERT for editors and trip owner
- `packing_suggestions`: SELECT for all collaborators and trip owner, INSERT/UPDATE for editors and trip owner

## Type Changes (`packages/shared`)

### Category type widening

Currently `PackingCategory` is a union type restricted to 6 values, and `DbPackingItem.category`, `PackingSuggestion.category`, and `CatalogItem.category` all use it. To support dynamic AI-generated categories, the following changes cascade across the codebase:

1. **Keep `PACKING_CATEGORIES` as the static defaults** — used for UI ordering, labels, and catalog items
2. **Widen `category` fields to `string`** on `DbPackingItem`, `PackingSuggestion`, and all functions that accept a category parameter
3. **Update `CATEGORY_LABELS`** in `utils.ts` — change from `Record<PackingCategory, string>` to a lookup function that returns the static label if it exists, otherwise title-cases the dynamic category name
4. **Update `itemsByCategory`** in `usePackingList` — derive categories from actual item data (not just iterating `PACKING_CATEGORIES`), with static categories ordered first, dynamic categories sorted alphabetically after
5. **Update `suggestionsByCategory`** in `usePackingSuggestions` — same approach: group by actual category values from suggestions, not just the static list
6. **Update `PackingCategory.tsx` component** — accept `string` prop for category, look up label dynamically
7. **Update `PackingCategoryList.tsx`** — render dynamic categories alongside static ones

```typescript
// Keep the static list as defaults for ordering and labels
export const PACKING_CATEGORIES = ['clothing', 'toiletries', 'electronics', 'documents', 'accessories', 'essentials'] as const
export type StaticPackingCategory = (typeof PACKING_CATEGORIES)[number]

// Updated DbPackingItem
export interface DbPackingItem {
  id: string
  trip_id: string
  user_id: string        // who created the item
  owner_id: string | null // who owns it (null = shared)
  group_tag: string | null // 'kids' | 'adults' | null
  name: string
  category: string       // freeform — static categories or AI-generated
  is_packed: boolean
  packed_by: string | null
  packed_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
  user_display_name?: string
  user_avatar_url?: string
  owner_display_name?: string
}

// Updated PackingSuggestion
export interface PackingSuggestion {
  id: string
  trip_id: string
  user_id: string
  name: string
  category: string       // freeform — matches DbPackingItem
  reason: string
  status: 'pending' | 'accepted' | 'dismissed'
  created_at: string
}

// Updated CatalogItem (static catalog stays typed to static categories)
export interface CatalogItem {
  name: string
  category: StaticPackingCategory
  tags: string[]
}

// Updated PackingAuditEntry
export interface PackingAuditEntry {
  id: string
  trip_id: string
  user_id: string
  item_id: string | null
  action: 'added' | 'packed' | 'unpacked' | 'removed' | 'claimed' | 'released' | 'transferred'
  item_name: string
  target_user_id: string | null
  created_at: string
  user_display_name?: string
  user_avatar_url?: string
  target_display_name?: string
}

// New: traveler metadata
export interface TravelerMetadata {
  adults: number
  children: number
  infants: number
  child_ages: number[]
}

// Update TripContextData to include travelers
// Add to existing TripContextData interface:
//   travelers?: TravelerMetadata
```

## Hook Changes (`packages/shared`)

### `usePackingList` — new mutations and grouping

- `claimItem(itemId)` — sets `owner_id` to current user, with optimistic update
- `releaseItem(itemId)` — sets `owner_id` to null, with optimistic update
- `transferItem(itemId, targetUserId)` — sets `owner_id` to target user, with optimistic update
- `claimItem` should use conditional update (`UPDATE ... WHERE owner_id IS NULL`) to handle concurrent claims gracefully — if someone else claimed first, refetch and show a toast rather than silently overwriting
- Filter support: `filterBy: 'all' | 'mine' | 'shared' | 'kids' | 'adults'`
- **`itemsByCategory` rewrite**: Derive categories from actual item data instead of iterating `PACKING_CATEGORIES`. Order: static categories first (in their defined order, skipping empty ones), then dynamic categories sorted alphabetically.

### `usePackingSuggestions` — enhanced context and grouping

- Passes `travelers` metadata to the Lambda endpoint
- **`suggestionsByCategory` rewrite**: Group by actual `category` values from suggestions, not just static `PACKING_CATEGORIES`. Same ordering: static first, dynamic after.

## Service Changes (`packages/shared`)

### `packingService.ts` — new functions

- `claimPackingItem(itemId, userId)` — UPDATE `owner_id`
- `releasePackingItem(itemId)` — UPDATE `owner_id` to NULL
- `transferPackingItem(itemId, targetUserId)` — UPDATE `owner_id`
- Update `insertPackingItem` to accept optional `owner_id` and `group_tag`

## Component Changes (`apps/web`)

### Existing components to modify

- **`PackingPage.tsx`**: Wire up to `usePackingList` hook (currently the page.tsx uses local state). Add filter toolbar. Add collapsible activity sidebar.
- **`PackingPanel.tsx`**: Update to support ownership pills, claim/release actions, and filter by owner. Must stay consistent with `PackingPage` features.
- **`PackingItem.tsx`**: Add ownership pill display. Add context menu for claim/release/transfer actions. Add optimistic UI updates for claim/release/transfer mutations (the Realtime subscription skips own-user events, so without optimistic updates these actions would not reflect immediately).
- **`PackingCategory.tsx`**: Accept `string` category prop (not just `PackingCategoryType`). Look up label via helper function. Show AI indicator for non-static categories.
- **`PackingCategoryList.tsx`**: Derive category list from actual item data. Render static categories first (in defined order), then dynamic categories alphabetically.
- **`PackingActivityFeed.tsx`**: Add new action types to `actionLabel` switch (claimed, released, transferred). Add "Mine" filter. Handle `target_display_name` for transfer actions.
- **`PackingProgress.tsx`**: No changes needed.
- **`SpotlightSearch.tsx`**: No changes needed (already supports catalog + custom items).
- **`SuggestionChip.tsx`**: Add category display and contextual reason text.
- **`utils.ts`**: Change `CATEGORY_LABELS` from `Record<PackingCategory, string>` to a lookup function: returns the static label if the category is in `PACKING_CATEGORIES`, otherwise title-cases the dynamic category name.

### page.tsx rewrite

The current `apps/web/app/(trips-app)/trip/[id]/packing/page.tsx` is a 376-line self-contained client-state implementation (no DB persistence). The real implementation lives in `PackingPage.tsx` component. Replace `page.tsx` with a thin wrapper that renders `PackingPage` with the trip ID and user ID, similar to how the calendar page wraps `CalendarDashboard`. Delete the client-state code entirely — it is dead code once `PackingPage` is wired up.

### Trip settings UI

Add a "Travelers" section to the trip settings page (`/trip/[id]/settings`) with:
- Stepper inputs for adults, children, infants counts
- Optional age inputs for children
- Saves to `trips.trip_context.travelers`

## Lambda Changes (`services/packing-suggest.ts`)

- Read `trip_context.travelers` from the trip record
- Include traveler metadata in the Claude prompt: "This trip has 2 adults and 2 children (ages 8, 12)"
- **Update `SYSTEM_PROMPT`**: Remove the restriction that categories must be one of the 6 static values. Instead instruct Claude to use the static categories when appropriate, but create descriptive new categories for trip-specific gear (e.g., "Beach Gear", "Ski Equipment", "Hiking Gear")
- **Update `parseBedrockResponse`**: Remove the filter that drops suggestions with categories not in `PACKING_CATEGORIES`. Accept any string category.
- **Update `PackingSuggestion` insert**: The `category` column is already `text` in the DB, so no schema change needed — just stop validating against the enum

## Notes

- **`Trip.travelers` vs `trip_context.travelers`**: The `Trip` interface already has a `travelers: number` field (simple headcount). The new `trip_context.travelers` is a structured object (`TravelerMetadata`). These coexist — the top-level `travelers` number remains for backward compatibility and simple display, while `trip_context.travelers` provides the detailed breakdown for AI suggestions. The trip settings UI should keep both in sync (sum of adults + children + infants = `travelers`).
- **Audit logging mechanism**: Verify whether audit entries are created by a Postgres trigger or by client-side service calls. If trigger-based, the trigger needs updating for new action types (`claimed`, `released`, `transferred`). If client-based, the new service functions must include explicit audit inserts.

## Out of Scope

- Per-activity opt-in/RSVP for collaborators (future feature)
- Named traveler profiles (travelers are described by count/type, not individual names)
- Mobile packing persistence (mobile still uses mock data — separate initiative)
- Quantity tracking on items (e.g., "3x t-shirts" — could be added later)
