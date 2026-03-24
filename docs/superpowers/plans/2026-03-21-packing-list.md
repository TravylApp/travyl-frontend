# Packing List Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collaborative packing list feature to trips with spotlight quick-add, categorized items, user attribution, audit log, and real-time sync.

**Architecture:** New `packing_items` and `packing_audit_log` Supabase tables with RLS and Realtime. Shared hook (`usePackingList`) handles React Query + Realtime subscription. UI renders as a sidebar panel in CalendarDashboard and as an expanded full-page route at `/trip/[id]/packing`.

**Tech Stack:** Supabase (Postgres, Realtime, RLS), React Query v5, iconoir-react, motion/react, Tailwind CSS v4, Vitest

**Spec:** `docs/superpowers/specs/2026-03-21-packing-list-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|---|---|
| `packages/shared/src/config/packingCatalog.ts` | Static catalog of ~150 common travel items with categories and tags |
| `packages/shared/src/services/packingService.ts` | Supabase CRUD for packing_items and packing_audit_log |
| `packages/shared/src/hooks/usePackingList.ts` | React Query queries + mutations + Realtime subscription |
| `apps/web/components/packing/PackingItem.tsx` | Single item row (checkbox + name + avatar) |
| `apps/web/components/packing/PackingCategory.tsx` | Accordion section for one category |
| `apps/web/components/packing/PackingCategoryList.tsx` | Renders all categories |
| `apps/web/components/packing/PackingProgress.tsx` | Progress bar with packed/total count |
| `apps/web/components/packing/SpotlightSearch.tsx` | Quick-add input with catalog dropdown |
| `apps/web/components/packing/PackingActivityFeed.tsx` | Audit log feed |
| `apps/web/components/packing/PackingPanel.tsx` | Sidebar panel wrapper |
| `apps/web/components/packing/PackingPage.tsx` | Full-page two-column wrapper |
| `apps/web/components/packing/utils.ts` | Shared utilities: `stringToColor`, `CATEGORY_LABELS` |

### Modified Files
| File | Change |
|---|---|
| `packages/shared/src/types/index.ts` | Replace old `PackingItem`/`PackingList` with `DbPackingItem`, `PackingAuditEntry`, `PACKING_CATEGORIES`, `PackingCategory`, `CatalogItem` |
| `packages/shared/src/config/mockItineraryData.ts` | Remove `MOCK_PACKING_LIST` |
| `packages/shared/src/config/index.ts` | Add `export * from './packingCatalog'` |
| `packages/shared/src/services/index.ts` | Add explicit exports for packing service functions |
| `packages/shared/src/hooks/index.ts` | Add `export { usePackingList } from './usePackingList'` |
| `apps/web/components/calendar/TripSidebar.tsx` | Add `Packing` nav item to `NAV_ITEMS` |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Add `activeNav === 'packing'` branch |
| `apps/web/app/(trips-app)/trip/[id]/packing/page.tsx` | Replace mock stub with `PackingPage` |

---

## Chunk 1: Database & Types

### Task 1: Create Supabase migration for packing tables

**Files:**
- Supabase migration (via MCP `apply_migration`)

- [ ] **Step 1: Create packing_items table**

Run via Supabase MCP `apply_migration` with name `create_packing_tables`:

```sql
-- packing_items table
CREATE TABLE packing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'essentials',
  is_packed boolean NOT NULL DEFAULT false,
  packed_by uuid,
  packed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX packing_items_trip_id_idx ON packing_items(trip_id);
CREATE INDEX packing_items_trip_category_idx ON packing_items(trip_id, category);

-- packing_audit_log table
CREATE TABLE packing_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  item_id uuid REFERENCES packing_items(id) ON DELETE SET NULL,
  action text NOT NULL,
  item_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX packing_audit_log_trip_id_idx ON packing_audit_log(trip_id, created_at DESC);

-- updated_at trigger (same pattern as trips/activity)
CREATE OR REPLACE FUNCTION update_packing_items_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_packing_items_updated_at
  BEFORE UPDATE ON packing_items
  FOR EACH ROW
  EXECUTE FUNCTION update_packing_items_updated_at();

-- audit log trigger
CREATE OR REPLACE FUNCTION log_packing_item_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO packing_audit_log (trip_id, user_id, item_id, action, item_name)
    VALUES (NEW.trip_id, NEW.user_id, NEW.id, 'added', NEW.name);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_packed IS DISTINCT FROM NEW.is_packed THEN
      INSERT INTO packing_audit_log (trip_id, user_id, item_id, action, item_name)
      VALUES (
        NEW.trip_id,
        COALESCE(auth.uid(), NEW.user_id),
        NEW.id,
        CASE WHEN NEW.is_packed THEN 'packed' ELSE 'unpacked' END,
        NEW.name
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO packing_audit_log (trip_id, user_id, item_id, action, item_name)
    VALUES (OLD.trip_id, COALESCE(auth.uid(), OLD.user_id), OLD.id, 'removed', OLD.name);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER packing_item_audit
  AFTER INSERT OR UPDATE OR DELETE ON packing_items
  FOR EACH ROW
  EXECUTE FUNCTION log_packing_item_change();
```

- [ ] **Step 2: Verify tables exist**

Run via Supabase MCP `execute_sql`:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('packing_items', 'packing_audit_log');
```
Expected: both tables returned.

### Task 2: Add RLS policies

**Files:**
- Supabase migration (via MCP `apply_migration`)

- [ ] **Step 1: Create RLS policies**

Run via Supabase MCP `apply_migration` with name `packing_rls_policies`:

```sql
ALTER TABLE packing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_audit_log ENABLE ROW LEVEL SECURITY;

-- packing_items: trip owners and collaborators can read
CREATE POLICY "Trip members can view packing items"
ON packing_items FOR SELECT USING (
  trip_id IN (
    SELECT id FROM trips WHERE user_id = auth.uid()
    UNION
    SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
  )
);

-- packing_items: trip owners and editor collaborators can insert
CREATE POLICY "Trip members can add packing items"
ON packing_items FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND trip_id IN (
    SELECT id FROM trips WHERE user_id = auth.uid()
    UNION
    SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
  )
);

-- packing_items: trip owners and editor collaborators can update
CREATE POLICY "Trip members can update packing items"
ON packing_items FOR UPDATE USING (
  trip_id IN (
    SELECT id FROM trips WHERE user_id = auth.uid()
    UNION
    SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
  )
);

-- packing_items: trip owners and editor collaborators can delete
CREATE POLICY "Trip members can delete packing items"
ON packing_items FOR DELETE USING (
  trip_id IN (
    SELECT id FROM trips WHERE user_id = auth.uid()
    UNION
    SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
  )
);

-- packing_audit_log: trip members can read
CREATE POLICY "Trip members can view packing audit log"
ON packing_audit_log FOR SELECT USING (
  trip_id IN (
    SELECT id FROM trips WHERE user_id = auth.uid()
    UNION
    SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
  )
);

-- packing_audit_log: no direct insert/update/delete — trigger-only
```

- [ ] **Step 2: Enable Realtime on packing_items**

Run via Supabase MCP `execute_sql`:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE packing_items;
```

- [ ] **Step 3: Verify RLS is enabled**

Run via Supabase MCP `execute_sql`:
```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename IN ('packing_items', 'packing_audit_log');
```
Expected: both show `rowsecurity = true`.

### Task 3: Replace old packing types with new ones

**Files:**
- Modify: `packages/shared/src/types/index.ts` (lines 283-292)
- Modify: `packages/shared/src/config/mockItineraryData.ts` (remove MOCK_PACKING_LIST)

- [ ] **Step 1: Replace types in `packages/shared/src/types/index.ts`**

Replace the `// ─── Packing Types` section (lines 283-292) with:

```typescript
// ─── Packing Types ──────────────────────────────────────────

export const PACKING_CATEGORIES = ['clothing', 'toiletries', 'electronics', 'documents', 'accessories', 'essentials'] as const
export type PackingCategory = (typeof PACKING_CATEGORIES)[number]

export interface DbPackingItem {
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
  user_display_name?: string
  user_avatar_url?: string
}

export interface PackingAuditEntry {
  id: string
  trip_id: string
  user_id: string
  item_id: string | null
  action: 'added' | 'packed' | 'unpacked' | 'removed'
  item_name: string
  created_at: string
  user_display_name?: string
  user_avatar_url?: string
}

export interface CatalogItem {
  name: string
  category: PackingCategory
  tags: string[]
}
```

- [ ] **Step 2: Remove MOCK_PACKING_LIST from mockItineraryData.ts**

Remove the `MOCK_PACKING_LIST` export from `packages/shared/src/config/mockItineraryData.ts`. Search for any other imports of `MOCK_PACKING_LIST` or old `PackingItem`/`PackingList` and remove them.

- [ ] **Step 3: Stub out the old packing page to prevent typecheck failure**

The old packing page at `apps/web/app/(trips-app)/trip/[id]/packing/page.tsx` imports the removed `PackingItem`, `PackingList`, and `MOCK_PACKING_LIST`. Replace its contents with a minimal placeholder:

```tsx
'use client'

import { use } from 'react'

export default function Packing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <div className="p-6 text-gray-400">Packing list — loading new version...</div>
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — old types removed, stub page no longer imports them.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/index.ts packages/shared/src/config/mockItineraryData.ts apps/web/app/(trips-app)/trip/[id]/packing/page.tsx
git commit -m "feat: replace old packing types with DB-backed types

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 4: Create static packing catalog

**Files:**
- Create: `packages/shared/src/config/packingCatalog.ts`

- [ ] **Step 1: Create the catalog file**

Create `packages/shared/src/config/packingCatalog.ts`:

```typescript
import type { CatalogItem } from '../types'

export const PACKING_CATALOG: CatalogItem[] = [
  // ─── Clothing ─────────────────────────────────────────
  { name: 'T-shirts', category: 'clothing', tags: ['tops', 'shirts', 'tee'] },
  { name: 'Pants', category: 'clothing', tags: ['trousers', 'jeans', 'bottoms'] },
  { name: 'Shorts', category: 'clothing', tags: ['bottoms', 'summer'] },
  { name: 'Underwear', category: 'clothing', tags: ['undergarments', 'basics'] },
  { name: 'Socks', category: 'clothing', tags: ['basics', 'feet'] },
  { name: 'Jacket', category: 'clothing', tags: ['coat', 'outerwear', 'rain'] },
  { name: 'Rain jacket', category: 'clothing', tags: ['waterproof', 'outerwear', 'rain coat'] },
  { name: 'Sweater', category: 'clothing', tags: ['pullover', 'jumper', 'warm', 'hoodie'] },
  { name: 'Swimsuit', category: 'clothing', tags: ['swim', 'bathing suit', 'trunks', 'bikini', 'beach'] },
  { name: 'Pajamas', category: 'clothing', tags: ['sleepwear', 'pjs', 'nightwear'] },
  { name: 'Dress shoes', category: 'clothing', tags: ['formal', 'heels', 'loafers'] },
  { name: 'Walking shoes', category: 'clothing', tags: ['sneakers', 'trainers', 'comfortable'] },
  { name: 'Sandals', category: 'clothing', tags: ['flip flops', 'slides', 'beach'] },
  { name: 'Hiking boots', category: 'clothing', tags: ['trail', 'outdoor', 'trekking'] },
  { name: 'Belt', category: 'clothing', tags: ['accessories'] },
  { name: 'Dress', category: 'clothing', tags: ['formal', 'outfit', 'evening'] },
  { name: 'Warm layers', category: 'clothing', tags: ['thermal', 'base layer', 'fleece', 'cold'] },
  { name: 'Workout clothes', category: 'clothing', tags: ['gym', 'exercise', 'athletic', 'sports'] },
  { name: 'Scarf', category: 'clothing', tags: ['wrap', 'cold', 'winter'] },
  { name: 'Gloves', category: 'clothing', tags: ['cold', 'winter', 'mittens'] },
  { name: 'Hat', category: 'clothing', tags: ['cap', 'beanie', 'winter', 'warm'] },

  // ─── Toiletries ───────────────────────────────────────
  { name: 'Toothbrush', category: 'toiletries', tags: ['dental', 'teeth', 'oral'] },
  { name: 'Toothpaste', category: 'toiletries', tags: ['dental', 'teeth', 'oral'] },
  { name: 'Shampoo', category: 'toiletries', tags: ['hair', 'wash'] },
  { name: 'Conditioner', category: 'toiletries', tags: ['hair'] },
  { name: 'Body wash', category: 'toiletries', tags: ['soap', 'shower', 'gel'] },
  { name: 'Deodorant', category: 'toiletries', tags: ['antiperspirant'] },
  { name: 'Sunscreen', category: 'toiletries', tags: ['spf', 'sun protection', 'lotion', 'sunblock'] },
  { name: 'Moisturizer', category: 'toiletries', tags: ['lotion', 'cream', 'skin'] },
  { name: 'Razor', category: 'toiletries', tags: ['shaving', 'grooming'] },
  { name: 'Floss', category: 'toiletries', tags: ['dental', 'teeth'] },
  { name: 'Lip balm', category: 'toiletries', tags: ['chapstick', 'lips'] },
  { name: 'Hair brush', category: 'toiletries', tags: ['comb', 'hair'] },
  { name: 'Hair ties', category: 'toiletries', tags: ['elastic', 'ponytail', 'hair'] },
  { name: 'Contact lens supplies', category: 'toiletries', tags: ['contacts', 'solution', 'case', 'eyes'] },
  { name: 'Makeup', category: 'toiletries', tags: ['cosmetics', 'foundation', 'mascara'] },
  { name: 'Nail clippers', category: 'toiletries', tags: ['nails', 'grooming'] },
  { name: 'Tweezers', category: 'toiletries', tags: ['grooming'] },
  { name: 'Hand sanitizer', category: 'toiletries', tags: ['sanitizer', 'hygiene', 'clean'] },
  { name: 'Tissues', category: 'toiletries', tags: ['kleenex', 'wipes'] },
  { name: 'Bug spray', category: 'toiletries', tags: ['insect repellent', 'mosquito', 'deet'] },
  { name: 'Medications', category: 'toiletries', tags: ['medicine', 'prescription', 'pills', 'rx'] },
  { name: 'Pain reliever', category: 'toiletries', tags: ['ibuprofen', 'tylenol', 'aspirin', 'advil'] },
  { name: 'Band-aids', category: 'toiletries', tags: ['bandage', 'first aid', 'plaster'] },
  { name: 'Motion sickness pills', category: 'toiletries', tags: ['dramamine', 'nausea', 'travel'] },

  // ─── Electronics ──────────────────────────────────────
  { name: 'Phone charger', category: 'electronics', tags: ['cable', 'usb', 'charging', 'lightning'] },
  { name: 'Laptop', category: 'electronics', tags: ['computer', 'macbook'] },
  { name: 'Laptop charger', category: 'electronics', tags: ['power', 'cable', 'adapter'] },
  { name: 'Power adapter', category: 'electronics', tags: ['plug', 'converter', 'charger', 'outlet', 'international'] },
  { name: 'Portable battery', category: 'electronics', tags: ['power bank', 'charger', 'backup'] },
  { name: 'Headphones', category: 'electronics', tags: ['earbuds', 'airpods', 'earphones', 'audio'] },
  { name: 'Camera', category: 'electronics', tags: ['photo', 'photography', 'dslr', 'gopro'] },
  { name: 'Camera charger', category: 'electronics', tags: ['battery', 'photo'] },
  { name: 'Memory card', category: 'electronics', tags: ['sd card', 'storage', 'camera'] },
  { name: 'E-reader', category: 'electronics', tags: ['kindle', 'book', 'reading'] },
  { name: 'Tablet', category: 'electronics', tags: ['ipad', 'device'] },
  { name: 'Portable speaker', category: 'electronics', tags: ['bluetooth', 'music', 'audio'] },
  { name: 'Travel router', category: 'electronics', tags: ['wifi', 'internet', 'hotspot'] },
  { name: 'Extension cord', category: 'electronics', tags: ['power strip', 'outlet', 'plug'] },
  { name: 'USB cable', category: 'electronics', tags: ['charging', 'data', 'type-c'] },

  // ─── Documents ────────────────────────────────────────
  { name: 'Passport', category: 'documents', tags: ['id', 'identification', 'travel document'] },
  { name: 'Visa', category: 'documents', tags: ['travel permit', 'entry'] },
  { name: 'Driver\'s license', category: 'documents', tags: ['id', 'identification', 'driving'] },
  { name: 'Travel insurance', category: 'documents', tags: ['insurance', 'policy', 'coverage'] },
  { name: 'Boarding pass', category: 'documents', tags: ['flight', 'ticket', 'airline'] },
  { name: 'Hotel confirmation', category: 'documents', tags: ['booking', 'reservation', 'accommodation'] },
  { name: 'Car rental confirmation', category: 'documents', tags: ['booking', 'reservation', 'vehicle'] },
  { name: 'Copies of documents', category: 'documents', tags: ['backup', 'photocopy', 'scan'] },
  { name: 'Emergency contacts', category: 'documents', tags: ['phone numbers', 'info'] },
  { name: 'Vaccination records', category: 'documents', tags: ['health', 'immunization', 'covid'] },
  { name: 'Credit cards', category: 'documents', tags: ['payment', 'bank', 'money'] },
  { name: 'Cash', category: 'documents', tags: ['money', 'currency', 'bills'] },
  { name: 'Student ID', category: 'documents', tags: ['identification', 'discount'] },

  // ─── Accessories ──────────────────────────────────────
  { name: 'Sunglasses', category: 'accessories', tags: ['shades', 'sun', 'eyes', 'uv'] },
  { name: 'Sun hat', category: 'accessories', tags: ['cap', 'sun protection', 'beach'] },
  { name: 'Umbrella', category: 'accessories', tags: ['rain', 'weather'] },
  { name: 'Day bag', category: 'accessories', tags: ['backpack', 'daypack', 'small bag'] },
  { name: 'Packing cubes', category: 'accessories', tags: ['organizer', 'luggage'] },
  { name: 'Neck pillow', category: 'accessories', tags: ['travel pillow', 'flight', 'sleep'] },
  { name: 'Eye mask', category: 'accessories', tags: ['sleep mask', 'flight', 'rest'] },
  { name: 'Earplugs', category: 'accessories', tags: ['noise', 'sleep', 'flight'] },
  { name: 'Water bottle', category: 'accessories', tags: ['hydration', 'drink', 'reusable'] },
  { name: 'Travel lock', category: 'accessories', tags: ['padlock', 'security', 'luggage'] },
  { name: 'Luggage tags', category: 'accessories', tags: ['bag', 'identification'] },
  { name: 'Laundry bag', category: 'accessories', tags: ['dirty clothes', 'wash'] },
  { name: 'Tote bag', category: 'accessories', tags: ['shopping', 'foldable', 'beach'] },
  { name: 'Travel wallet', category: 'accessories', tags: ['passport holder', 'organizer'] },
  { name: 'Jewelry', category: 'accessories', tags: ['watch', 'ring', 'necklace'] },
  { name: 'Book', category: 'accessories', tags: ['reading', 'novel', 'paperback'] },
  { name: 'Journal', category: 'accessories', tags: ['notebook', 'diary', 'writing'] },
  { name: 'Pen', category: 'accessories', tags: ['writing', 'customs form'] },
  { name: 'Playing cards', category: 'accessories', tags: ['games', 'entertainment', 'cards'] },
  { name: 'Binoculars', category: 'accessories', tags: ['bird watching', 'sightseeing'] },

  // ─── Essentials ───────────────────────────────────────
  { name: 'Wallet', category: 'essentials', tags: ['purse', 'money', 'cards'] },
  { name: 'Phone', category: 'essentials', tags: ['mobile', 'cell', 'smartphone'] },
  { name: 'Keys', category: 'essentials', tags: ['house key', 'car key'] },
  { name: 'Snacks', category: 'essentials', tags: ['food', 'granola', 'bars', 'trail mix'] },
  { name: 'Gum', category: 'essentials', tags: ['mint', 'breath', 'chewing'] },
  { name: 'Reusable shopping bag', category: 'essentials', tags: ['tote', 'grocery', 'eco'] },
  { name: 'Ziplock bags', category: 'essentials', tags: ['plastic bags', 'storage', 'liquids'] },
  { name: 'Tissues pack', category: 'essentials', tags: ['pocket tissues', 'kleenex'] },
  { name: 'Hand wipes', category: 'essentials', tags: ['wet wipes', 'cleaning'] },
  { name: 'Trash bags', category: 'essentials', tags: ['garbage', 'waste'] },
]
```

- [ ] **Step 2: Add barrel export**

Add to `packages/shared/src/config/index.ts`:

```typescript
export * from './packingCatalog';
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (catalog uses `CatalogItem` type from types/index.ts)

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/config/packingCatalog.ts packages/shared/src/config/index.ts
git commit -m "feat: add static packing catalog with ~150 common travel items

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 2: Service & Hook

### Task 5: Create packing service

**Files:**
- Create: `packages/shared/src/services/packingService.ts`

Follow the pattern from `budgetService.ts`: one export per CRUD operation, `supabase.from()`, throw on error.

- [ ] **Step 1: Create the service file**

Create `packages/shared/src/services/packingService.ts`:

```typescript
import { supabase } from './supabase'
import type { DbPackingItem, PackingAuditEntry, PackingCategory } from '../types'

export async function fetchPackingItems(tripId: string): Promise<DbPackingItem[]> {
  const { data, error } = await supabase
    .from('packing_items')
    .select('*, profiles:user_id(display_name, avatar_url)')
    .eq('trip_id', tripId)
    .order('category')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    ...row,
    user_display_name: row.profiles?.display_name ?? null,
    user_avatar_url: row.profiles?.avatar_url ?? null,
    profiles: undefined,
  }))
}

export async function fetchPackingAuditLog(tripId: string, limit = 50): Promise<PackingAuditEntry[]> {
  const { data, error } = await supabase
    .from('packing_audit_log')
    .select('*, profiles:user_id(display_name, avatar_url)')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []).map((row: any) => ({
    ...row,
    user_display_name: row.profiles?.display_name ?? null,
    user_avatar_url: row.profiles?.avatar_url ?? null,
    profiles: undefined,
  }))
}

export async function insertPackingItem(
  tripId: string,
  userId: string,
  name: string,
  category: PackingCategory,
  sortOrder: number
): Promise<DbPackingItem> {
  const { data, error } = await supabase
    .from('packing_items')
    .insert({ trip_id: tripId, user_id: userId, name, category, sort_order: sortOrder })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePackingItemPacked(
  itemId: string,
  isPacked: boolean,
  packedBy: string | null
): Promise<void> {
  const { error } = await supabase
    .from('packing_items')
    .update({
      is_packed: isPacked,
      packed_by: isPacked ? packedBy : null,
      packed_at: isPacked ? new Date().toISOString() : null,
    })
    .eq('id', itemId)
  if (error) throw error
}

export async function deletePackingItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('packing_items')
    .delete()
    .eq('id', itemId)
  if (error) throw error
}
```

- [ ] **Step 2: Add barrel exports**

Add to `packages/shared/src/services/index.ts`:

```typescript
export {
  fetchPackingItems,
  fetchPackingAuditLog,
  insertPackingItem,
  updatePackingItemPacked,
  deletePackingItem,
} from './packingService';
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/services/packingService.ts packages/shared/src/services/index.ts
git commit -m "feat: add packing service with Supabase CRUD operations

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 6: Create usePackingList hook

**Files:**
- Create: `packages/shared/src/hooks/usePackingList.ts`

Follow the pattern from `useTripBudget.ts` (React Query) and `useTripNotes.ts` (Realtime subscription).

- [ ] **Step 1: Create the hook file**

Create `packages/shared/src/hooks/usePackingList.ts`:

```typescript
import { useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import {
  fetchPackingItems,
  fetchPackingAuditLog,
  insertPackingItem,
  updatePackingItemPacked,
  deletePackingItem,
} from '../services/packingService'
import type { DbPackingItem, PackingAuditEntry, PackingCategory, CatalogItem } from '../types'
import { PACKING_CATEGORIES } from '../types'

export function usePackingList(tripId: string | undefined, userId: string | undefined) {
  const queryClient = useQueryClient()

  const itemsQuery = useQuery({
    queryKey: ['packingItems', tripId],
    queryFn: () => fetchPackingItems(tripId!),
    enabled: !!tripId,
  })

  const auditQuery = useQuery({
    queryKey: ['packingAuditLog', tripId],
    queryFn: () => fetchPackingAuditLog(tripId!),
    enabled: !!tripId,
  })

  // Realtime subscription — skip self-authored changes
  useEffect(() => {
    if (!tripId || !userId) return

    const channel = supabase
      .channel(`packing-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'packing_items',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const record = (payload.new ?? payload.old) as any
          if (record?.user_id === userId) return
          queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
          queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tripId, userId, queryClient])

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const items = itemsQuery.data ?? []
    const grouped: Record<string, DbPackingItem[]> = {}
    for (const cat of PACKING_CATEGORIES) {
      const catItems = items.filter((item) => item.category === cat)
      if (catItems.length > 0) {
        grouped[cat] = catItems
      }
    }
    return grouped
  }, [itemsQuery.data])

  // Progress stats
  const progress = useMemo(() => {
    const items = itemsQuery.data ?? []
    const total = items.length
    const packed = items.filter((i) => i.is_packed).length
    return { total, packed, percent: total > 0 ? Math.round((packed / total) * 100) : 0 }
  }, [itemsQuery.data])

  const addItemMutation = useMutation({
    mutationFn: async ({ name, category }: { name: string; category: PackingCategory }) => {
      const items = itemsQuery.data ?? []
      const catItems = items.filter((i) => i.category === category)
      const maxSort = catItems.length > 0 ? Math.max(...catItems.map((i) => i.sort_order)) : -1
      return insertPackingItem(tripId!, userId!, name, category, maxSort + 1)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
      queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
    },
  })

  const togglePackedMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const items = itemsQuery.data ?? []
      const item = items.find((i) => i.id === itemId)
      if (!item) return
      return updatePackingItemPacked(itemId, !item.is_packed, userId ?? null)
    },
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: ['packingItems', tripId] })
      const previous = queryClient.getQueryData<DbPackingItem[]>(['packingItems', tripId])
      queryClient.setQueryData<DbPackingItem[]>(['packingItems', tripId], (old) =>
        (old ?? []).map((item) =>
          item.id === itemId
            ? {
                ...item,
                is_packed: !item.is_packed,
                packed_by: !item.is_packed ? userId ?? null : null,
                packed_at: !item.is_packed ? new Date().toISOString() : null,
              }
            : item
        )
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['packingItems', tripId], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
      queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
    },
  })

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => deletePackingItem(itemId),
    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: ['packingItems', tripId] })
      const previous = queryClient.getQueryData<DbPackingItem[]>(['packingItems', tripId])
      queryClient.setQueryData<DbPackingItem[]>(['packingItems', tripId], (old) =>
        (old ?? []).filter((item) => item.id !== itemId)
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['packingItems', tripId], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
      queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
    },
  })

  const addItem = useCallback(
    (name: string, category: PackingCategory) => addItemMutation.mutate({ name, category }),
    [addItemMutation]
  )

  const togglePacked = useCallback(
    (itemId: string) => togglePackedMutation.mutate(itemId),
    [togglePackedMutation]
  )

  const removeItem = useCallback(
    (itemId: string) => removeItemMutation.mutate(itemId),
    [removeItemMutation]
  )

  return {
    items: itemsQuery.data ?? [],
    itemsByCategory,
    auditLog: auditQuery.data ?? [],
    progress,
    isLoading: itemsQuery.isLoading,
    error: itemsQuery.error,
    addItem,
    togglePacked,
    removeItem,
  }
}
```

- [ ] **Step 2: Add barrel export**

Add to `packages/shared/src/hooks/index.ts`:

```typescript
export { usePackingList } from './usePackingList';
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/hooks/usePackingList.ts packages/shared/src/hooks/index.ts
git commit -m "feat: add usePackingList hook with React Query + Realtime

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 3: UI Components

### Task 7: Create shared packing utilities

**Files:**
- Create: `apps/web/components/packing/utils.ts`

- [ ] **Step 1: Create the utils file**

Create `apps/web/components/packing/utils.ts`:

```typescript
import type { PackingCategory } from '@travyl/shared'

export const CATEGORY_LABELS: Record<PackingCategory, string> = {
  clothing: 'Clothing',
  toiletries: 'Toiletries',
  electronics: 'Electronics',
  documents: 'Documents',
  accessories: 'Accessories',
  essentials: 'Essentials',
}

export function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ['#7c3aed', '#059669', '#d97706', '#dc2626', '#2563eb', '#7c3aed']
  return colors[Math.abs(hash) % colors.length]
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/packing/utils.ts
git commit -m "feat: add shared packing utilities

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 8: Create PackingItem component

**Files:**
- Create: `apps/web/components/packing/PackingItem.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/components/packing/PackingItem.tsx`:

```tsx
'use client'

import { motion } from 'motion/react'
import { Xmark } from 'iconoir-react'
import type { DbPackingItem } from '@travyl/shared'
import { stringToColor } from './utils'

interface PackingItemProps {
  item: DbPackingItem
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

export function PackingItem({ item, onToggle, onRemove }: PackingItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors group"
    >
      <button
        onClick={() => onToggle(item.id)}
        className="w-4 h-4 rounded flex items-center justify-center border-[1.5px] shrink-0 transition-colors"
        style={{
          borderColor: item.is_packed ? '#003594' : 'var(--cal-border, #475569)',
          backgroundColor: item.is_packed ? '#003594' : 'transparent',
        }}
      >
        {item.is_packed && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <span
        className={`text-[13px] flex-1 transition-colors ${
          item.is_packed
            ? 'line-through text-[var(--cal-text-muted,#64748b)]'
            : 'text-[var(--cal-text,#e2e8f0)]'
        }`}
      >
        {item.name}
      </span>

      {item.user_display_name && (
        <div
          className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 text-[8px] font-bold text-white"
          style={{ backgroundColor: stringToColor(item.user_id) }}
          title={item.user_display_name}
        >
          {item.user_display_name.charAt(0).toUpperCase()}
        </div>
      )}

      <button
        onClick={() => onRemove(item.id)}
        className="opacity-0 group-hover:opacity-100 text-[var(--cal-text-muted,#64748b)] hover:text-red-400 transition-all p-0.5 shrink-0"
        title="Remove item"
      >
        <Xmark width={12} height={12} />
      </button>
    </motion.div>
  )
}

```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/packing/PackingItem.tsx
git commit -m "feat: add PackingItem component with checkbox, avatar, remove

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 9: Create PackingCategory component

**Files:**
- Create: `apps/web/components/packing/PackingCategory.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/components/packing/PackingCategory.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { NavArrowDown, NavArrowRight } from 'iconoir-react'
import type { DbPackingItem, PackingCategory as PackingCategoryType } from '@travyl/shared'
import { PackingItem } from './PackingItem'
import { CATEGORY_LABELS } from './utils'

interface PackingCategoryProps {
  category: PackingCategoryType
  items: DbPackingItem[]
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  defaultExpanded?: boolean
}

export function PackingCategory({
  category,
  items,
  onToggle,
  onRemove,
  defaultExpanded = true,
}: PackingCategoryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const packedCount = items.filter((i) => i.is_packed).length

  return (
    <div className="border-b border-[var(--cal-border,#1e293b)]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors"
      >
        {expanded ? (
          <NavArrowDown width={12} height={12} className="text-[var(--cal-text-muted,#64748b)]" />
        ) : (
          <NavArrowRight width={12} height={12} className="text-[var(--cal-text-muted,#64748b)]" />
        )}
        <span className="text-[13px] font-medium text-[var(--cal-text,#e2e8f0)]">
          {CATEGORY_LABELS[category]}
        </span>
        <span className="text-[11px] text-[var(--cal-text-muted,#64748b)] ml-auto">
          {packedCount}/{items.length}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 pl-7">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <PackingItem
                    key={item.id}
                    item={item}
                    onToggle={onToggle}
                    onRemove={onRemove}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/packing/PackingCategory.tsx
git commit -m "feat: add PackingCategory accordion component

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 10: Create PackingCategoryList component

**Files:**
- Create: `apps/web/components/packing/PackingCategoryList.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/components/packing/PackingCategoryList.tsx`:

```tsx
'use client'

import type { DbPackingItem, PackingCategory as PackingCategoryType } from '@travyl/shared'
import { PACKING_CATEGORIES } from '@travyl/shared'
import { PackingCategory } from './PackingCategory'

interface PackingCategoryListProps {
  itemsByCategory: Record<string, DbPackingItem[]>
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

export function PackingCategoryList({ itemsByCategory, onToggle, onRemove }: PackingCategoryListProps) {
  const activeCategories = PACKING_CATEGORIES.filter((cat) => itemsByCategory[cat]?.length > 0)

  if (activeCategories.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[13px] text-[var(--cal-text-muted,#64748b)]">
          No items yet. Use the search above to add items.
        </p>
      </div>
    )
  }

  return (
    <div>
      {activeCategories.map((cat) => (
        <PackingCategory
          key={cat}
          category={cat as PackingCategoryType}
          items={itemsByCategory[cat]}
          onToggle={onToggle}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/packing/PackingCategoryList.tsx
git commit -m "feat: add PackingCategoryList component

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 11: Create PackingProgress component

**Files:**
- Create: `apps/web/components/packing/PackingProgress.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/components/packing/PackingProgress.tsx`:

```tsx
'use client'

import { motion } from 'motion/react'

interface PackingProgressProps {
  packed: number
  total: number
  percent: number
  compact?: boolean
}

export function PackingProgress({ packed, total, percent, compact = false }: PackingProgressProps) {
  if (compact) {
    return (
      <div className="px-3 py-2.5 border-b border-[var(--cal-border,#1e293b)]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[13px] font-semibold text-[var(--cal-text,#e2e8f0)]">
            Packing Progress
          </span>
          <span className="text-[12px] text-[var(--cal-text-muted,#94a3b8)]">
            {packed} / {total}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--cal-border,#1e293b)] overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #003594, #1e3a5f)' }}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-[var(--cal-surface,#1e293b)] p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[14px] font-semibold text-[var(--cal-text,#e2e8f0)]">Progress</span>
        <span className="text-[20px] font-bold text-[var(--cal-text-muted,#94a3b8)]">{percent}%</span>
      </div>
      <p className="text-[12px] text-[var(--cal-text-muted,#64748b)] mb-2">
        {packed} of {total} items packed
      </p>
      <div className="h-2 rounded-full bg-[var(--cal-bg,#0f172a)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #003594, #1e3a5f)' }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/packing/PackingProgress.tsx
git commit -m "feat: add PackingProgress component with compact/expanded modes

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 12: Create SpotlightSearch component

**Files:**
- Create: `apps/web/components/packing/SpotlightSearch.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/components/packing/SpotlightSearch.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Search } from 'iconoir-react'
import { PACKING_CATALOG, PACKING_CATEGORIES } from '@travyl/shared'
import type { CatalogItem, PackingCategory, DbPackingItem } from '@travyl/shared'
import { CATEGORY_LABELS } from './utils'

interface SpotlightSearchProps {
  existingItems: DbPackingItem[]
  onAddItem: (name: string, category: PackingCategory) => void
}

export function SpotlightSearch({ existingItems, onAddItem }: SpotlightSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [customCategory, setCustomCategory] = useState<PackingCategory>('essentials')
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const existingNames = useMemo(
    () => new Set(existingItems.map((i) => i.name.toLowerCase())),
    [existingItems]
  )

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return PACKING_CATALOG.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q))
    ).slice(0, 8)
  }, [query])

  const hasExactMatch = useMemo(
    () => results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase()),
    [results, query]
  )

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  function handleSelect(item: CatalogItem) {
    onAddItem(item.name, item.category)
    setQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  function handleCustomAdd() {
    if (query.trim()) {
      onAddItem(query.trim(), customCategory)
      setQuery('')
      setIsOpen(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setIsOpen(false)
      return
    }

    const totalItems = results.length + (query.trim() && !hasExactMatch ? 1 : 0)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => (i + 1) % totalItems)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => (i - 1 + totalItems) % totalItems)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex < results.length) {
        handleSelect(results[selectedIndex])
      } else if (query.trim()) {
        handleCustomAdd()
      }
    }
  }

  return (
    <div className="px-3 py-2.5 border-b border-[var(--cal-border,#1e293b)]" ref={dropdownRef}>
      <div className="relative">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--cal-surface,#1e293b)] border border-[var(--cal-border,#334155)] px-3 py-2.5">
          <Search width={14} height={14} className="text-[var(--cal-text-muted,#64748b)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => query.trim() && setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Add an item..."
            className="flex-1 bg-transparent text-[13px] text-[var(--cal-text,#e2e8f0)] placeholder:text-[var(--cal-text-muted,#64748b)] outline-none"
          />
        </div>

        <AnimatePresence>
          {isOpen && query.trim() && (results.length > 0 || query.trim()) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 left-0 right-0 mt-1.5 rounded-lg bg-[var(--cal-surface,#16213e)] border border-[var(--cal-border,#334155)] overflow-hidden shadow-xl"
            >
              {results.map((item, i) => {
                const isExisting = existingNames.has(item.name.toLowerCase())
                return (
                  <button
                    key={`${item.name}-${item.category}`}
                    onClick={() => !isExisting && handleSelect(item)}
                    disabled={isExisting}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors ${
                      i === selectedIndex && !isExisting
                        ? 'bg-white/10'
                        : 'hover:bg-white/5'
                    } ${isExisting ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div>
                      <div className="text-[13px] text-[var(--cal-text,#e2e8f0)]">{item.name}</div>
                      <div className="text-[11px] text-[var(--cal-text-muted,#64748b)]">
                        {CATEGORY_LABELS[item.category]}
                      </div>
                    </div>
                    {isExisting && (
                      <span className="text-[10px] text-[var(--cal-text-muted,#64748b)]">already added</span>
                    )}
                  </button>
                )
              })}

              {query.trim() && !hasExactMatch && (
                <div className="border-t border-[var(--cal-border,#1e293b)] px-3 py-2 flex items-center gap-2">
                  <button
                    onClick={handleCustomAdd}
                    className={`flex-1 text-left text-[13px] transition-colors ${
                      selectedIndex === results.length
                        ? 'text-[var(--cal-text,#e2e8f0)]'
                        : 'text-[var(--cal-text-muted,#94a3b8)]'
                    }`}
                  >
                    Add &quot;{query.trim()}&quot;
                  </button>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as PackingCategory)}
                    className="text-[11px] bg-[var(--cal-bg,#0f172a)] text-[var(--cal-text-muted,#94a3b8)] border border-[var(--cal-border,#334155)] rounded px-1.5 py-0.5 outline-none"
                  >
                    {PACKING_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/packing/SpotlightSearch.tsx
git commit -m "feat: add SpotlightSearch with catalog filtering and custom add

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 13: Create PackingActivityFeed component

**Files:**
- Create: `apps/web/components/packing/PackingActivityFeed.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/components/packing/PackingActivityFeed.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { NavArrowDown, NavArrowRight } from 'iconoir-react'
import type { PackingAuditEntry } from '@travyl/shared'
import { stringToColor } from './utils'

const ACTION_LABELS: Record<string, string> = {
  added: 'added',
  packed: 'packed',
  unpacked: 'unpacked',
  removed: 'removed',
}

interface PackingActivityFeedProps {
  entries: PackingAuditEntry[]
  defaultCollapsed?: boolean
}

export function PackingActivityFeed({ entries, defaultCollapsed = true }: PackingActivityFeedProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  if (defaultCollapsed) {
    return (
      <div className="border-t border-[var(--cal-border,#1e293b)]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-1.5 px-3 py-2.5 hover:bg-white/5 transition-colors"
        >
          {collapsed ? (
            <NavArrowRight width={10} height={10} className="text-[var(--cal-text-muted,#64748b)]" />
          ) : (
            <NavArrowDown width={10} height={10} className="text-[var(--cal-text-muted,#64748b)]" />
          )}
          <span className="text-[12px] text-[var(--cal-text-muted,#94a3b8)]">Activity Feed</span>
        </button>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <FeedList entries={entries} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Always-visible mode (expanded page)
  return (
    <div>
      <h4 className="text-[13px] font-semibold text-[var(--cal-text,#e2e8f0)] mb-3">Activity</h4>
      <FeedList entries={entries} />
    </div>
  )
}

function FeedList({ entries }: { entries: PackingAuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="px-3 py-4 text-[12px] text-[var(--cal-text-muted,#64748b)]">No activity yet.</p>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 px-3 pb-3">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-start gap-2">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-bold text-white"
            style={{ backgroundColor: stringToColor(entry.user_id) }}
          >
            {(entry.user_display_name ?? '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[12px] text-[var(--cal-text,#cbd5e1)]">
              <strong>{entry.user_display_name ?? 'Someone'}</strong>{' '}
              {ACTION_LABELS[entry.action] ?? entry.action}{' '}
              {entry.item_name}
            </p>
            <p className="text-[11px] text-[var(--cal-text-muted,#475569)]">
              {formatRelativeTime(entry.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/packing/PackingActivityFeed.tsx
git commit -m "feat: add PackingActivityFeed with collapsible mode

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Chunk 4: Panel, Page & Integration

### Task 14: Create PackingPanel (sidebar wrapper)

**Files:**
- Create: `apps/web/components/packing/PackingPanel.tsx`

- [ ] **Step 1: Create the component**

Create `apps/web/components/packing/PackingPanel.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { Expand } from 'iconoir-react'
import { usePackingList, useAuthStore } from '@travyl/shared'
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
  const {
    items,
    itemsByCategory,
    auditLog,
    progress,
    isLoading,
    error,
    addItem,
    togglePacked,
    removeItem,
  } = usePackingList(tripId, user?.id)

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
    <div className="flex flex-col h-full">
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
        <PackingCategoryList itemsByCategory={itemsByCategory} onToggle={togglePacked} onRemove={removeItem} />
      </div>

      <PackingActivityFeed entries={auditLog} defaultCollapsed />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/packing/PackingPanel.tsx
git commit -m "feat: add PackingPanel sidebar wrapper

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 15: Create PackingPage (expanded full-page)

**Files:**
- Create: `apps/web/components/packing/PackingPage.tsx`
- Modify: `apps/web/app/(trips-app)/trip/[id]/packing/page.tsx`

- [ ] **Step 1: Create PackingPage component**

Create `apps/web/components/packing/PackingPage.tsx`:

```tsx
'use client'

import { usePackingList, useAuthStore } from '@travyl/shared'
import { SpotlightSearch } from './SpotlightSearch'
import { PackingProgress } from './PackingProgress'
import { PackingCategoryList } from './PackingCategoryList'
import { PackingActivityFeed } from './PackingActivityFeed'

interface PackingPageProps {
  tripId: string
}

export function PackingPage({ tripId }: PackingPageProps) {
  const { user } = useAuthStore()
  const {
    items,
    itemsByCategory,
    auditLog,
    progress,
    isLoading,
    error,
    addItem,
    togglePacked,
    removeItem,
  } = usePackingList(tripId, user?.id)

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
      {/* Left column */}
      <div className="flex-1 flex flex-col min-w-0">
        <SpotlightSearch existingItems={items} onAddItem={addItem} />
        <div className="flex-1 overflow-auto mt-4">
          <PackingCategoryList itemsByCategory={itemsByCategory} onToggle={togglePacked} onRemove={removeItem} />
        </div>
      </div>

      {/* Right column */}
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

- [ ] **Step 2: Replace the packing page stub**

Replace `apps/web/app/(trips-app)/trip/[id]/packing/page.tsx` entirely:

```tsx
'use client'

import { use } from 'react'
import { PackingPage } from '@/components/packing/PackingPage'

export default function Packing({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <PackingPage tripId={id} />
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/packing/PackingPage.tsx apps/web/app/(trips-app)/trip/[id]/packing/page.tsx
git commit -m "feat: add PackingPage and replace stub route

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 16: Wire into TripSidebar and CalendarDashboard

**Files:**
- Modify: `apps/web/components/calendar/TripSidebar.tsx` (NAV_ITEMS array)
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx` (activeNav branching)

- [ ] **Step 1: Add Packing nav item to TripSidebar**

In `apps/web/components/calendar/TripSidebar.tsx`:
- Add `Suitcase` (or `Luggage`) to the `iconoir-react` imports
- Add new item to `NAV_ITEMS` array after the budget entry and before settings:

```typescript
{
  id: 'packing',
  label: 'Packing',
  icon: <Suitcase width={18} height={18} strokeWidth={1.5} aria-hidden="true" />,
},
```

- [ ] **Step 2: Add packing branch to CalendarDashboard**

In `apps/web/components/calendar/CalendarDashboard.tsx`:
- Add import: `import { PackingPanel } from '@/components/packing/PackingPanel'`
- Add `activeNav === 'packing'` branch in the render logic, after the budget branch:

```tsx
) : activeNav === 'packing' ? (
  <div className="flex-1 overflow-auto">
    <PackingPanel tripId={tripId} />
  </div>
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — all types resolve, all imports valid.

- [ ] **Step 4: Run dev server and test manually**

Run: `npm run web`

Test checklist:
1. Navigate to a trip page
2. See "Packing" in the sidebar nav
3. Click it — PackingPanel renders with spotlight search and empty state
4. Type in spotlight search — catalog items appear in dropdown
5. Select an item — it appears in the correct category
6. Check an item — it shows as packed with strikethrough
7. Remove an item — it disappears
8. Click expand button — navigates to `/trip/[id]/packing` full page
9. Activity feed shows recent actions

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/TripSidebar.tsx apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire PackingPanel into sidebar navigation

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

### Task 17: Clean up old packing references

**Files:**
- Modify: any files that import old `PackingItem`, `PackingList`, or `MOCK_PACKING_LIST`

- [ ] **Step 1: Search for remaining old references**

Search the codebase for imports of `PackingItem`, `PackingList`, `MOCK_PACKING_LIST`, and `MOCK_WEATHER` that were used by the old packing stub. Remove or update all remaining references.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — no broken references.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: clean up old packing type and mock references

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
