# Collaborative Packing List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the client-state packing list with a persistent, collaborative packing list featuring hybrid ownership (shared/claimed/group-tagged), a collapsible audit log sidebar, AI suggestions with dynamic categories, and traveler metadata.

**Architecture:** Supabase Postgres for persistence with Realtime subscriptions for live collaboration. Existing `packing_items`, `packing_audit_log`, and `packing_suggestions` tables get new columns. The shared package (types, hooks, services) is updated first, then web components, then the Lambda.

**Tech Stack:** Supabase (Postgres + Realtime + RLS), React Query v5, Zustand, Next.js 16, Tailwind CSS 4, AWS Lambda + Bedrock (Claude 3 Haiku)

**Spec:** `docs/superpowers/specs/2026-03-25-collaborative-packing-list-design.md`

---

## File Map

### Supabase Migrations (create)
- `supabase/migrations/YYYYMMDDHHMMSS_packing_collaborative.sql` — schema changes + RLS

### Shared Package — Types (modify)
- `packages/shared/src/types/index.ts` — widen PackingCategory, update interfaces, add TravelerMetadata

### Shared Package — Services (modify)
- `packages/shared/src/services/packingService.ts` — add claim/release/transfer functions, update insertPackingItem signature

### Shared Package — Hooks (modify)
- `packages/shared/src/hooks/usePackingList.ts` — new mutations, rewrite itemsByCategory, add filter support
- `packages/shared/src/hooks/usePackingSuggestions.ts` — rewrite suggestionsByCategory, pass travelers to Lambda

### Web Components — Utils (modify)
- `apps/web/components/packing/utils.ts` — CATEGORY_LABELS → getCategoryLabel function

### Web Components — Items & Categories (modify)
- `apps/web/components/packing/PackingItem.tsx` — ownership pill, claim/release/transfer context menu
- `apps/web/components/packing/PackingCategory.tsx` — accept string category, AI indicator
- `apps/web/components/packing/PackingCategoryList.tsx` — derive categories from data, render dynamic categories

### Web Components — Activity Feed (modify)
- `apps/web/components/packing/PackingActivityFeed.tsx` — new action types, "Mine" filter, target_display_name

### Web Components — Suggestion Chip (modify)
- `apps/web/components/packing/SuggestionChip.tsx` — show category + reason context

### Web Components — Page Layout (modify)
- `apps/web/components/packing/PackingPage.tsx` — filter toolbar, collapsible activity sidebar
- `apps/web/components/packing/PackingPanel.tsx` — ownership pills, filter support
- `apps/web/components/packing/index.ts` — update exports

### Route Page (rewrite)
- `apps/web/app/(trips-app)/trip/[id]/packing/page.tsx` — thin wrapper replacing 377-line client-state page

### Trip Settings (modify)
- `apps/web/app/(trips-app)/trip/[id]/settings/page.tsx` — add Travelers section

### Lambda (modify)
- `services/packing-suggest.ts` — update prompt, parser, add traveler metadata

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/YYYYMMDDHHMMSS_packing_collaborative.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- Add ownership columns to packing_items
ALTER TABLE packing_items
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS group_tag text DEFAULT NULL;

-- Add target_user_id to packing_audit_log for transfers
ALTER TABLE packing_audit_log
  ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES auth.users(id) DEFAULT NULL;

-- RLS policies for packing_items
ALTER TABLE packing_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packing_items_select" ON packing_items;
DROP POLICY IF EXISTS "packing_items_insert" ON packing_items;
DROP POLICY IF EXISTS "packing_items_update" ON packing_items;
DROP POLICY IF EXISTS "packing_items_delete" ON packing_items;

CREATE POLICY "packing_items_select" ON packing_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM trips WHERE trips.id = packing_items.trip_id AND trips.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM trip_collaborators
    WHERE trip_collaborators.trip_id = packing_items.trip_id
      AND trip_collaborators.user_id = auth.uid()
      AND trip_collaborators.invite_status = 'accepted'
  )
);

CREATE POLICY "packing_items_insert" ON packing_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips WHERE trips.id = packing_items.trip_id AND trips.user_id = auth.uid()
  )
  OR is_trip_editor(packing_items.trip_id)
);

CREATE POLICY "packing_items_update" ON packing_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM trips WHERE trips.id = packing_items.trip_id AND trips.user_id = auth.uid()
  )
  OR is_trip_editor(packing_items.trip_id)
);

CREATE POLICY "packing_items_delete" ON packing_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM trips WHERE trips.id = packing_items.trip_id AND trips.user_id = auth.uid()
  )
  OR is_trip_editor(packing_items.trip_id)
);

-- RLS policies for packing_audit_log
ALTER TABLE packing_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packing_audit_log_select" ON packing_audit_log;
DROP POLICY IF EXISTS "packing_audit_log_insert" ON packing_audit_log;

CREATE POLICY "packing_audit_log_select" ON packing_audit_log FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM trips WHERE trips.id = packing_audit_log.trip_id AND trips.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM trip_collaborators
    WHERE trip_collaborators.trip_id = packing_audit_log.trip_id
      AND trip_collaborators.user_id = auth.uid()
      AND trip_collaborators.invite_status = 'accepted'
  )
);

CREATE POLICY "packing_audit_log_insert" ON packing_audit_log FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips WHERE trips.id = packing_audit_log.trip_id AND trips.user_id = auth.uid()
  )
  OR is_trip_editor(packing_audit_log.trip_id)
);

-- RLS policies for packing_suggestions
ALTER TABLE packing_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packing_suggestions_select" ON packing_suggestions;
DROP POLICY IF EXISTS "packing_suggestions_modify" ON packing_suggestions;
DROP POLICY IF EXISTS "packing_suggestions_insert" ON packing_suggestions;
DROP POLICY IF EXISTS "packing_suggestions_update" ON packing_suggestions;

CREATE POLICY "packing_suggestions_select" ON packing_suggestions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM trips WHERE trips.id = packing_suggestions.trip_id AND trips.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM trip_collaborators
    WHERE trip_collaborators.trip_id = packing_suggestions.trip_id
      AND trip_collaborators.user_id = auth.uid()
      AND trip_collaborators.invite_status = 'accepted'
  )
);

CREATE POLICY "packing_suggestions_insert" ON packing_suggestions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM trips WHERE trips.id = packing_suggestions.trip_id AND trips.user_id = auth.uid()
  )
  OR is_trip_editor(packing_suggestions.trip_id)
);

CREATE POLICY "packing_suggestions_update" ON packing_suggestions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM trips WHERE trips.id = packing_suggestions.trip_id AND trips.user_id = auth.uid()
  )
  OR is_trip_editor(packing_suggestions.trip_id)
);
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Run: `mcp__plugin_supabase_supabase__apply_migration` with the SQL above and name `packing_collaborative`.

- [ ] **Step 3: Check for existing audit triggers**

Run: `mcp__plugin_supabase_supabase__execute_sql` with:
```sql
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'packing_items';
```
If triggers exist that auto-insert into `packing_audit_log`, either update them to handle new action types (`claimed`, `released`, `transferred`) or drop them in favor of client-side audit logging via `insertAuditEntry`. If no triggers exist, the client-side approach in Task 3-4 is correct.

- [ ] **Step 4: Verify columns exist**

Run: `mcp__plugin_supabase_supabase__execute_sql` with:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'packing_items' AND column_name IN ('owner_id', 'group_tag')
ORDER BY column_name;
```
Expected: 2 rows — `group_tag` (text, YES) and `owner_id` (uuid, YES).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add ownership columns and RLS for collaborative packing"
```

---

## Task 2: Type Changes in Shared Package

**Files:**
- Modify: `packages/shared/src/types/index.ts` (lines 333-379 for packing types, lines 17-57 for TripContextData)

- [ ] **Step 1: Rename PackingCategory to StaticPackingCategory**

At line 334, change:
```typescript
// FROM
export type PackingCategory = (typeof PACKING_CATEGORIES)[number]
// TO
export type StaticPackingCategory = (typeof PACKING_CATEGORIES)[number]
/** @deprecated Use StaticPackingCategory for static categories, or string for freeform */
export type PackingCategory = StaticPackingCategory
```

Keep `PackingCategory` as an alias for backward compatibility during migration — components that only use static categories can still import it.

- [ ] **Step 2: Update DbPackingItem interface**

At lines 336-350, replace with:
```typescript
export interface DbPackingItem {
  id: string
  trip_id: string
  user_id: string
  owner_id: string | null
  group_tag: string | null
  name: string
  category: string
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
```

- [ ] **Step 3: Update PackingAuditEntry interface**

At lines 352-362, replace with:
```typescript
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
```

- [ ] **Step 4: Update PackingSuggestion interface**

At lines 370-379, change `category: PackingCategory` to `category: string`.

- [ ] **Step 5: Add TravelerMetadata interface**

After the PackingSuggestion interface, add:
```typescript
export interface TravelerMetadata {
  adults: number
  children: number
  infants: number
  child_ages: number[]
}
```

- [ ] **Step 6: Update TripContextData**

At lines 17-57, add `travelers?: TravelerMetadata` to the `TripContextData` interface. Import `TravelerMetadata` if it's defined in the same file (it is).

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`
Expected: May have errors in consumers of PackingCategory — note them for subsequent tasks. The types file itself should be clean.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat(types): widen packing category to string, add ownership and traveler types"
```

---

## Task 3: Service Layer — Ownership Mutations

**Files:**
- Modify: `packages/shared/src/services/packingService.ts`

- [ ] **Step 1: Update insertPackingItem signature**

At line 26, add optional `ownerId` and `groupTag` params:

```typescript
export async function insertPackingItem(
  tripId: string,
  userId: string,
  name: string,
  category: string,
  sortOrder: number,
  ownerId?: string | null,
  groupTag?: string | null,
): Promise<DbPackingItem> {
  const { data, error } = await supabase
    .from('packing_items')
    .insert({
      trip_id: tripId,
      user_id: userId,
      name,
      category,
      sort_order: sortOrder,
      ...(ownerId !== undefined && { owner_id: ownerId }),
      ...(groupTag !== undefined && { group_tag: groupTag }),
    })
    .select()
    .single()
  if (error) throw error
  return data
}
```

- [ ] **Step 2: Add claimPackingItem**

```typescript
export async function claimPackingItem(itemId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('packing_items')
    .update({ owner_id: userId, updated_at: new Date().toISOString() })
    .eq('id', itemId)
    .is('owner_id', null)
    .select('id')
    .single()
  if (error) return false
  return !!data
}
```

- [ ] **Step 3: Add releasePackingItem**

```typescript
export async function releasePackingItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('packing_items')
    .update({ owner_id: null, updated_at: new Date().toISOString() })
    .eq('id', itemId)
  if (error) throw error
}
```

- [ ] **Step 4: Add transferPackingItem**

```typescript
export async function transferPackingItem(itemId: string, targetUserId: string): Promise<void> {
  const { error } = await supabase
    .from('packing_items')
    .update({ owner_id: targetUserId, updated_at: new Date().toISOString() })
    .eq('id', itemId)
  if (error) throw error
}
```

- [ ] **Step 5: Add insertAuditEntry helper**

```typescript
export async function insertAuditEntry(
  tripId: string,
  userId: string,
  itemId: string | null,
  action: PackingAuditEntry['action'],
  itemName: string,
  targetUserId?: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('packing_audit_log')
    .insert({
      trip_id: tripId,
      user_id: userId,
      item_id: itemId,
      action,
      item_name: itemName,
      ...(targetUserId && { target_user_id: targetUserId }),
    })
  if (error) throw error
}
```

- [ ] **Step 6: Export new functions from shared index**

Verify `packages/shared/src/index.ts` re-exports from services. If packingService functions are individually exported, add the new ones.

- [ ] **Step 7: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/services/packingService.ts packages/shared/src/index.ts
git commit -m "feat(services): add claim/release/transfer and audit entry functions"
```

---

## Task 4: Hook — usePackingList Ownership Mutations and Dynamic Categories

**Files:**
- Modify: `packages/shared/src/hooks/usePackingList.ts`

- [ ] **Step 1: Rewrite itemsByCategory memo**

Replace the existing `itemsByCategory` memo (lines 37-45) with dynamic category grouping:

```typescript
const itemsByCategory = useMemo(() => {
  const grouped: Record<string, DbPackingItem[]> = {}
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  }
  return grouped
}, [items])

const orderedCategories = useMemo(() => {
  const allCats = Object.keys(itemsByCategory)
  const staticOrder = PACKING_CATEGORIES.filter((c) => allCats.includes(c))
  const dynamic = allCats.filter((c) => !(PACKING_CATEGORIES as readonly string[]).includes(c)).sort()
  return [...staticOrder, ...dynamic]
}, [itemsByCategory])
```

- [ ] **Step 2: Add claimItem mutation**

```typescript
const claimItem = useCallback(async (itemId: string) => {
  if (!tripId || !userId) return
  const item = items.find((i) => i.id === itemId)
  if (!item) return
  const success = await claimPackingItem(itemId, userId)
  if (!success) {
    queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
    return
  }
  await insertAuditEntry(tripId, userId, itemId, 'claimed', item.name)
  queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
  queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
}, [items, tripId, userId, queryClient])
```

- [ ] **Step 3: Add releaseItem mutation**

```typescript
const releaseItem = useCallback(async (itemId: string) => {
  if (!tripId || !userId) return
  const item = items.find((i) => i.id === itemId)
  if (!item) return
  await releasePackingItem(itemId)
  await insertAuditEntry(tripId, userId, itemId, 'released', item.name)
  queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
  queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
}, [items, tripId, userId, queryClient])
```

- [ ] **Step 4: Add transferItem mutation**

```typescript
const transferItem = useCallback(async (itemId: string, targetUserId: string) => {
  if (!tripId || !userId) return
  const item = items.find((i) => i.id === itemId)
  if (!item) return
  await transferPackingItem(itemId, targetUserId)
  await insertAuditEntry(tripId, userId, itemId, 'transferred', item.name, targetUserId)
  queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
  queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
}, [items, tripId, userId, queryClient])
```

- [ ] **Step 5: Add filter support**

```typescript
const filteredItems = useMemo(() => {
  if (!filterBy || filterBy === 'all') return items
  switch (filterBy) {
    case 'mine': return items.filter((i) => i.owner_id === userId)
    case 'shared': return items.filter((i) => !i.owner_id && !i.group_tag)
    case 'kids': return items.filter((i) => i.group_tag === 'kids')
    case 'adults': return items.filter((i) => i.group_tag === 'adults')
    default: return items
  }
}, [items, filterBy, userId])
```

Add `filterBy` as a parameter to the hook: `usePackingList(tripId: string, userId: string, filterBy?: string)`.

- [ ] **Step 6: Update return object**

Add `claimItem`, `releaseItem`, `transferItem`, `orderedCategories`, `filteredItems` to the returned object.

- [ ] **Step 7: Add imports for new service functions**

Add imports for `claimPackingItem`, `releasePackingItem`, `transferPackingItem`, `insertAuditEntry` from `packingService`.

- [ ] **Step 8: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 9: Commit**

```bash
git add packages/shared/src/hooks/usePackingList.ts
git commit -m "feat(hooks): add ownership mutations, dynamic categories, and filtering to usePackingList"
```

---

## Task 5: Hook — usePackingSuggestions Dynamic Categories

**Files:**
- Modify: `packages/shared/src/hooks/usePackingSuggestions.ts`

- [ ] **Step 1: Rewrite suggestionsByCategory memo**

Replace lines 25-32 with dynamic category grouping:

```typescript
const suggestionsByCategory = useMemo(() => {
  const grouped: Record<string, PackingSuggestion[]> = {}
  for (const s of suggestions) {
    if (!grouped[s.category]) grouped[s.category] = []
    grouped[s.category].push(s)
  }
  return grouped
}, [suggestions])
```

- [ ] **Step 2: Pass travelers metadata to Lambda**

In the `generateSuggestions` callback (around line 34-58), update the POST body to include travelers if available. Add a `travelers` parameter to the hook:

```typescript
export function usePackingSuggestions(
  tripId: string,
  items: DbPackingItem[],
  addItem: (name: string, category: string) => void,
)
```

No `travelers` parameter needed — the Lambda reads travelers from the trip record server-side.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/hooks/usePackingSuggestions.ts
git commit -m "feat(hooks): dynamic category grouping and traveler metadata in suggestions"
```

---

## Task 6: Utils — Dynamic Category Labels

**Files:**
- Modify: `apps/web/components/packing/utils.ts`

- [ ] **Step 1: Replace CATEGORY_LABELS with getCategoryLabel**

Replace lines 3-10:

```typescript
import { PACKING_CATEGORIES } from '@travyl/shared'

const STATIC_LABELS: Record<string, string> = {
  clothing: 'Clothing',
  toiletries: 'Toiletries',
  electronics: 'Electronics',
  documents: 'Documents',
  accessories: 'Accessories',
  essentials: 'Essentials',
}

export function getCategoryLabel(category: string): string {
  if (STATIC_LABELS[category]) return STATIC_LABELS[category]
  return category
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function isStaticCategory(category: string): boolean {
  return (PACKING_CATEGORIES as readonly string[]).includes(category)
}
```

- [ ] **Step 2: Update index.ts exports**

In `apps/web/components/packing/index.ts`, replace `CATEGORY_LABELS` export with `getCategoryLabel` and `isStaticCategory`. Also add exports for `PackingPage` and `PackingPanel`:

```typescript
export { default as PackingPage } from './PackingPage'
export { default as PackingPanel } from './PackingPanel'
```

- [ ] **Step 3: Fix all imports of CATEGORY_LABELS**

Search for `CATEGORY_LABELS` across the web app and replace with `getCategoryLabel(category)` calls. Key files:
- `PackingCategory.tsx` — use `getCategoryLabel(category)` in header
- `SpotlightSearch.tsx` — replace `CATEGORY_LABELS[category]` with `getCategoryLabel(category)`, widen `onAddItem` callback type from `PackingCategory` to `string`, and update internal `customCategory` state type to `string`

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/packing/utils.ts apps/web/components/packing/index.ts
git commit -m "feat(packing): replace static CATEGORY_LABELS with dynamic getCategoryLabel"
```

---

## Task 7: PackingItem — Ownership Pill and Actions

**Files:**
- Modify: `apps/web/components/packing/PackingItem.tsx`

- [ ] **Step 1: Update props interface**

Add ownership-related props:

```typescript
interface PackingItemProps {
  item: DbPackingItem
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onClaim?: (id: string) => void
  onRelease?: (id: string) => void
  onTransfer?: (id: string, targetUserId: string) => void
  currentUserId?: string
  collaborators?: { userId: string; displayName: string }[]
}
```

- [ ] **Step 2: Add ownership pill**

After the item name span, add:

```tsx
{/* Ownership pill */}
{item.group_tag ? (
  <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400 shrink-0">
    {item.group_tag === 'kids' ? 'Kids' : 'Adults'}
  </span>
) : item.owner_id ? (
  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 shrink-0">
    {item.owner_display_name || 'Claimed'}
  </span>
) : (
  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 shrink-0">
    Shared
  </span>
)}
```

- [ ] **Step 3: Add claim/release button**

Next to the remove button, add a contextual ownership action:

```tsx
{/* Claim/Release button */}
{!item.owner_id && !item.group_tag && onClaim && (
  <button
    onClick={() => onClaim(item.id)}
    className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-600 hover:text-blue-800 transition-opacity"
  >
    Claim
  </button>
)}
{item.owner_id === currentUserId && onRelease && (
  <button
    onClick={() => onRelease(item.id)}
    className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-500 hover:text-gray-700 transition-opacity"
  >
    Release
  </button>
)}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/packing/PackingItem.tsx
git commit -m "feat(packing): add ownership pill and claim/release actions to PackingItem"
```

---

## Task 8: PackingCategory and PackingCategoryList — Dynamic Categories

**Files:**
- Modify: `apps/web/components/packing/PackingCategory.tsx`
- Modify: `apps/web/components/packing/PackingCategoryList.tsx`

- [ ] **Step 1: Update PackingCategory props**

Change `category` prop from `PackingCategoryType` to `string`. Import `getCategoryLabel` and `isStaticCategory` from utils:

```typescript
interface PackingCategoryProps {
  category: string
  items: DbPackingItem[]
  suggestions?: PackingSuggestion[]
  // ... existing props
}
```

Use `getCategoryLabel(category)` in the header. Add AI indicator for dynamic categories:

```tsx
<span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">
  {getCategoryLabel(category)}
</span>
{!isStaticCategory(category) && (
  <span className="text-[9px] text-purple-600 dark:text-purple-400 ml-1">✦ AI</span>
)}
```

- [ ] **Step 2: Rewrite PackingCategoryList to use orderedCategories**

Replace the `visibleCategories` memo and render loop (lines 27-66). Accept `orderedCategories` and `itemsByCategory` as props instead of deriving from `PACKING_CATEGORIES`:

```typescript
interface PackingCategoryListProps {
  orderedCategories: string[]
  itemsByCategory: Record<string, DbPackingItem[]>
  suggestionsByCategory?: Record<string, PackingSuggestion[]>
  // ... existing action props
}
```

Render loop:
```tsx
{orderedCategories.map((category) => {
  const categoryItems = itemsByCategory[category] || []
  const categorySuggestions = suggestionsByCategory?.[category] || []
  if (categoryItems.length === 0 && categorySuggestions.length === 0) return null
  return (
    <PackingCategory
      key={category}
      category={category}
      items={categoryItems}
      suggestions={categorySuggestions}
      // ... pass through action props
    />
  )
})}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/packing/PackingCategory.tsx apps/web/components/packing/PackingCategoryList.tsx
git commit -m "feat(packing): support dynamic categories in PackingCategory and PackingCategoryList"
```

---

## Task 9: PackingActivityFeed — New Action Types

**Files:**
- Modify: `apps/web/components/packing/PackingActivityFeed.tsx`

- [ ] **Step 1: Update actionLabel function**

Replace the switch at lines 35-42:

```typescript
function actionLabel(action: PackingAuditEntry['action']): string {
  switch (action) {
    case 'added': return 'added'
    case 'packed': return 'packed'
    case 'unpacked': return 'unpacked'
    case 'removed': return 'removed'
    case 'claimed': return 'claimed'
    case 'released': return 'released'
    case 'transferred': return 'transferred'
    default: return action
  }
}
```

- [ ] **Step 2: Handle transfer target display**

In the feed entry rendering, after the item name, add transfer target:

```tsx
<span className="text-gray-600 dark:text-gray-300">
  {entry.user_display_name} {actionLabel(entry.action)}{' '}
  <span className="font-medium">{entry.item_name}</span>
  {entry.action === 'transferred' && entry.target_display_name && (
    <> → <span className="font-medium">{entry.target_display_name}</span></>
  )}
</span>
```

- [ ] **Step 3: Add "Mine" filter**

Add a `filterUserId` prop. When set, filter audit entries to only show the current user's actions:

```typescript
interface PackingActivityFeedProps {
  entries: PackingAuditEntry[]
  defaultCollapsed?: boolean
  filterUserId?: string | null
}
```

Apply filter:
```typescript
const displayEntries = filterUserId
  ? entries.filter((e) => e.user_id === filterUserId)
  : entries
```

- [ ] **Step 4: Add filter toggle UI in header**

```tsx
<div className="flex items-center gap-2">
  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Activity</span>
  <div className="flex gap-1">
    <button
      onClick={() => setFilterMine(false)}
      className={`text-[10px] px-2 py-0.5 rounded-full ${!filterMine ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
    >All</button>
    <button
      onClick={() => setFilterMine(true)}
      className={`text-[10px] px-2 py-0.5 rounded-full ${filterMine ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}
    >Mine</button>
  </div>
</div>
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/packing/PackingActivityFeed.tsx
git commit -m "feat(packing): add claimed/released/transferred actions and Mine filter to activity feed"
```

---

## Task 10: PackingPage — Filter Toolbar and Collapsible Activity Sidebar

**Files:**
- Modify: `apps/web/components/packing/PackingPage.tsx`

- [ ] **Step 1: Add filter state and pass to usePackingList**

```typescript
const [filterBy, setFilterBy] = useState<string>('all')
const [sidebarOpen, setSidebarOpen] = useState(true)

const {
  items, itemsByCategory, orderedCategories, filteredItems,
  auditLog, progress, addItem, togglePacked, removeItem,
  claimItem, releaseItem, transferItem,
} = usePackingList(tripId, userId, filterBy)
```

- [ ] **Step 2: Add filter toolbar**

After the header, add filter pills:

```tsx
<div className="flex items-center gap-1.5 mb-4">
  {['all', 'mine', 'shared', 'kids', 'adults'].map((filter) => (
    <button
      key={filter}
      onClick={() => setFilterBy(filter)}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        filterBy === filter
          ? 'bg-[#1e3a5f] text-white'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10'
      }`}
    >
      {filter === 'all' ? 'All' : filter === 'mine' ? 'My Items' : filter.charAt(0).toUpperCase() + filter.slice(1)}
    </button>
  ))}
</div>
```

- [ ] **Step 3: Restructure layout to flex with sidebar**

Wrap the main content and activity feed in a flex container:

```tsx
<div className="flex gap-4 h-full">
  {/* Main list area */}
  <div className="flex-1 min-w-0 flex flex-col">
    {/* Filter toolbar, progress, category list, add bar */}
  </div>

  {/* Collapsible activity sidebar */}
  {sidebarOpen && (
    <div className="w-72 shrink-0 border-l border-gray-200 dark:border-white/10 pl-4">
      <PackingActivityFeed entries={auditLog} filterUserId={filterMine ? userId : null} />
    </div>
  )}

  {/* Sidebar toggle */}
  <button
    onClick={() => setSidebarOpen((o) => !o)}
    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
    aria-label={sidebarOpen ? 'Hide activity' : 'Show activity'}
  >
    {sidebarOpen ? '→' : '←'}
  </button>
</div>
```

- [ ] **Step 4: Pass ownership props through to PackingCategoryList → PackingCategory → PackingItem**

Thread `onClaim`, `onRelease`, `currentUserId` through the component tree.

- [ ] **Step 5: Run typecheck and dev server check**

Run: `npm run typecheck`
Run: `npm run web` — navigate to `/trip/[id]/packing` and verify layout renders.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/packing/PackingPage.tsx
git commit -m "feat(packing): add filter toolbar and collapsible activity sidebar to PackingPage"
```

---

## Task 11: Page.tsx Rewrite — Thin Wrapper

**Files:**
- Rewrite: `apps/web/app/(trips-app)/trip/[id]/packing/page.tsx`

- [ ] **Step 1: Replace the 377-line page with a thin wrapper**

```typescript
'use client'

import { use } from 'react'
import { PackingPage } from '@/components/packing'

export default function PackingRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <PackingPage tripId={id} />
}
```

Note: `PackingPage` already gets `userId` internally from `useAuthStore` — do not pass it as a prop.

- [ ] **Step 2: Verify it renders**

Run: `npm run web` — navigate to a trip's packing page. Verify the collaborative PackingPage loads instead of the old client-state page.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(trips-app)/trip/[id]/packing/page.tsx
git commit -m "feat(packing): replace client-state page with collaborative PackingPage wrapper"
```

---

## Task 12: Trip Settings — Traveler Metadata

**Files:**
- Modify: `apps/web/app/(trips-app)/trip/[id]/settings/page.tsx`

- [ ] **Step 1: Add Travelers section**

In the settings page (688 lines), find the trip details section and add a "Travelers" subsection. Read the file first to find the right insertion point.

Add a `TravelerEditor` inline component:

```tsx
function TravelerEditor({ tripId, tripContext }: { tripId: string; tripContext: TripContextData | null }) {
  const travelers = tripContext?.travelers ?? { adults: 1, children: 0, infants: 0, child_ages: [] }
  const [adults, setAdults] = useState(travelers.adults)
  const [children, setChildren] = useState(travelers.children)
  const [infants, setInfants] = useState(travelers.infants)
  const [childAges, setChildAges] = useState<number[]>(travelers.child_ages)

  const handleSave = async () => {
    const newTravelers = { adults, children, infants, child_ages: childAges }
    // Update trip_context via supabase
    const { error } = await supabase
      .from('trips')
      .update({
        trip_context: { ...tripContext, travelers: newTravelers },
        travelers: adults + children + infants,
      })
      .eq('id', tripId)
    if (error) console.error(error)
  }

  // Render stepper inputs for adults, children, infants
  // Render age inputs for children when children > 0
}
```

- [ ] **Step 2: Wire up stepper UI**

Each count field gets increment/decrement buttons:

```tsx
<div className="flex items-center gap-3">
  <label className="text-sm text-gray-600 w-20">Adults</label>
  <button onClick={() => setAdults(Math.max(1, adults - 1))} className="w-7 h-7 rounded border ...">−</button>
  <span className="text-sm font-medium w-6 text-center">{adults}</span>
  <button onClick={() => setAdults(adults + 1)} className="w-7 h-7 rounded border ...">+</button>
</div>
```

Repeat for children (min 0) and infants (min 0). When children > 0, show age inputs.

- [ ] **Step 3: Auto-save on change**

Use a debounced effect to save whenever values change:

```typescript
useEffect(() => {
  const timer = setTimeout(handleSave, 500)
  return () => clearTimeout(timer)
}, [adults, children, infants, childAges])
```

- [ ] **Step 4: Run dev server check**

Navigate to `/trip/[id]/settings` and verify the Travelers section renders and saves.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/(trips-app)/trip/[id]/settings/page.tsx
git commit -m "feat(settings): add traveler metadata editor to trip settings"
```

---

## Task 13: Lambda — Dynamic Categories and Traveler Metadata

**Files:**
- Modify: `services/packing-suggest.ts`

- [ ] **Step 1: Update SYSTEM_PROMPT**

At line 14, replace the system prompt. Remove the restriction to 6 categories:

```typescript
const SYSTEM_PROMPT = `You are a travel packing assistant. Given trip details, suggest packing items as a JSON array.

Each item: { "name": "Item Name", "category": "category_name", "reason": "Brief reason" }

Use these standard categories when appropriate: clothing, toiletries, electronics, documents, accessories, essentials.

When the trip involves specific activities (beach, skiing, hiking, etc.), create descriptive categories for that gear (e.g., "beach gear", "ski equipment", "hiking gear"). Keep dynamic category names lowercase and descriptive.

Return ONLY a JSON array, no markdown.`
```

- [ ] **Step 2: Update parseBedrockResponse**

At lines 41-64, remove the filter that drops non-static categories:

```typescript
function parseBedrockResponse(body: string): { name: string; category: string; reason: string }[] {
  try {
    const text = body.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(text)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item: any) =>
        typeof item.name === 'string' &&
        typeof item.category === 'string' &&
        typeof item.reason === 'string'
      )
      .slice(0, MAX_SUGGESTIONS)
  } catch {
    return []
  }
}
```

- [ ] **Step 3: Add traveler metadata to prompt**

In the `buildUserMessage` function (lines 16-39), add travelers context:

```typescript
function buildUserMessage(trip: any, activities: any[], existingItems: string[], travelers?: any): string {
  let msg = `Trip to ${trip.destination}\nDates: ${trip.start_date} to ${trip.end_date}\n`

  if (travelers) {
    const parts = []
    if (travelers.adults) parts.push(`${travelers.adults} adult${travelers.adults > 1 ? 's' : ''}`)
    if (travelers.children) {
      const ages = travelers.child_ages?.length
        ? ` (ages ${travelers.child_ages.join(', ')})`
        : ''
      parts.push(`${travelers.children} child${travelers.children > 1 ? 'ren' : ''}${ages}`)
    }
    if (travelers.infants) parts.push(`${travelers.infants} infant${travelers.infants > 1 ? 's' : ''}`)
    if (parts.length) msg += `Travelers: ${parts.join(', ')}\n`
  }

  // ... rest of existing function (activities, weather, existing items)
}
```

- [ ] **Step 4: Read travelers from trip record in handler**

In the handler (around line 111-124), update the trip select to include `trip_context`:

```typescript
// Update the existing select clause to include trip_context
.select('destination, start_date, end_date, travelers, trip_context')
```

Then extract travelers and pass to buildUserMessage:

```typescript
const travelers = trip.trip_context?.travelers ?? null
const userMessage = buildUserMessage(trip, activities, existingItemNames, travelers)
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add services/packing-suggest.ts
git commit -m "feat(lambda): support dynamic categories and traveler metadata in packing suggestions"
```

---

## Task 14: PackingPanel — Ownership Support

**Files:**
- Modify: `apps/web/components/packing/PackingPanel.tsx`

- [ ] **Step 1: Add ownership props and filter**

Mirror the changes from PackingPage but in the compact layout. Add filter pills and pass ownership action props through to PackingCategoryList → PackingItem.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/packing/PackingPanel.tsx
git commit -m "feat(packing): add ownership support to compact PackingPanel"
```

---

## Task 15: Final Typecheck and Integration Test

- [ ] **Step 1: Full typecheck**

Run: `npm run typecheck`
Fix any remaining type errors across all workspaces.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Fix any lint errors.

- [ ] **Step 3: Manual integration check**

Run: `npm run web` and verify:
1. Navigate to `/trip/[id]/packing` — collaborative packing list loads
2. Add an item — appears in real-time
3. Claim an item — ownership pill shows your name
4. Release an item — returns to "Shared"
5. Activity sidebar shows all actions
6. Filter pills work (All, My Items, Shared)
7. Navigate to `/trip/[id]/settings` — Travelers section appears
8. Set 2 adults, 2 kids — saves without error

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve any remaining type/lint issues for collaborative packing"
```
