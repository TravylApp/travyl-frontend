# Packing List Quantities Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `quantity` and `packed_count` to packing items so travellers can track "packed 2 of 3 shirts" instead of a binary packed/unpacked state.

**Architecture:** New DB columns feed through service → hook → UI. Pure logic helpers are extracted into `packingUtils.ts` for testability. The existing `togglePacked` API is preserved; new `incrementPacked` and `updateQuantity` callbacks are added alongside it.

**Tech Stack:** Supabase (Postgres migration via MCP), TypeScript, React Query mutations with optimistic updates, React/Tailwind UI.

**Spec:** `docs/superpowers/specs/2026-03-26-packing-quantities-design.md`

---

## Chunk 1: DB, Types, Service, and Pure Utils

### Task 1: DB migration

**Files:**
- Create: `supabase/migrations/20260326000006_packing_list_quantities.sql`

- [ ] **Create the migration file**

```sql
-- Add quantity and packed_count to packing_items
ALTER TABLE packing_items
  ADD COLUMN IF NOT EXISTS quantity     INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS packed_count INT NOT NULL DEFAULT 0;
```

- [ ] **Apply the migration via Supabase MCP**

Use `mcp__supabase__apply_migration` with name `packing_list_quantities` and the SQL above.

Expected: migration applied without error. Verify with `mcp__supabase__list_migrations` — `packing_list_quantities` should appear.

- [ ] **Commit**

```bash
git add supabase/migrations/20260326000006_packing_list_quantities.sql
git commit -m "feat(db): add quantity and packed_count to packing_items"
```

---

### Task 2: Type update

**Files:**
- Modify: `packages/shared/src/types/index.ts` (around line 354)

- [ ] **Add fields to `DbPackingItem`**

Find the `DbPackingItem` interface (currently ends at `owner_display_name?`) and add:

```ts
export interface DbPackingItem {
  id: string
  trip_id: string
  user_id: string
  name: string
  category: string
  is_packed: boolean
  packed_by: string | null
  packed_at: string | null
  sort_order: number
  created_at: string
  updated_at: string
  owner_id: string | null
  group_tag: string | null
  quantity: number        // ← new
  packed_count: number    // ← new
  user_display_name?: string
  user_avatar_url?: string
  owner_display_name?: string
}
```

- [ ] **Run typecheck**

```bash
cd C:\Users\justi\dev\travyl2\travyl-frontend && npm run typecheck
```

Expected: no new errors (new fields are not yet used anywhere — that's fine).

- [ ] **Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat(types): add quantity and packed_count to DbPackingItem"
```

---

### Task 3: Pure utils (testable logic)

**Files:**
- Create: `packages/shared/src/utils/packingUtils.ts`
- Create: `packages/shared/src/utils/packingUtils.test.ts`

These isolate the pure logic that would otherwise be buried in the hook.

- [ ] **Write the failing tests first**

Create `packages/shared/src/utils/packingUtils.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computePackingProgress, clampPackedCount } from './packingUtils'

describe('computePackingProgress', () => {
  it('returns zeros when items array is empty', () => {
    expect(computePackingProgress([])).toEqual({ total: 0, packed: 0, percent: 0 })
  })

  it('sums quantity and packed_count across items', () => {
    const items = [
      { quantity: 3, packed_count: 2 },
      { quantity: 2, packed_count: 2 },
    ] as any
    expect(computePackingProgress(items)).toEqual({ total: 5, packed: 4, percent: 80 })
  })

  it('rounds percent to nearest integer', () => {
    const items = [{ quantity: 3, packed_count: 1 }] as any
    expect(computePackingProgress(items)).toEqual({ total: 3, packed: 1, percent: 33 })
  })

  it('returns 0 percent when total is 0', () => {
    const items = [{ quantity: 0, packed_count: 0 }] as any
    expect(computePackingProgress(items)).toEqual({ total: 0, packed: 0, percent: 0 })
  })
})

describe('clampPackedCount', () => {
  it('returns packed_count unchanged when quantity is greater', () => {
    expect(clampPackedCount(2, 3)).toEqual({ packed_count: 2, is_packed: false })
  })

  it('clamps packed_count to quantity when quantity is reduced below it', () => {
    expect(clampPackedCount(5, 3)).toEqual({ packed_count: 3, is_packed: true })
  })

  it('sets is_packed true when packed_count equals quantity', () => {
    expect(clampPackedCount(3, 3)).toEqual({ packed_count: 3, is_packed: true })
  })

  it('sets is_packed false when packed_count is 0', () => {
    expect(clampPackedCount(0, 5)).toEqual({ packed_count: 0, is_packed: false })
  })
})
```

- [ ] **Run tests — expect FAIL**

```bash
cd C:\Users\justi\dev\travyl2\travyl-frontend\packages\shared && npm test -- --reporter=verbose 2>&1 | head -40
```

Expected: `Cannot find module './packingUtils'`

- [ ] **Implement `packingUtils.ts`**

Create `packages/shared/src/utils/packingUtils.ts`:

```ts
import type { DbPackingItem } from '../types'

export function computePackingProgress(items: Pick<DbPackingItem, 'quantity' | 'packed_count'>[]) {
  const total = items.reduce((s, i) => s + i.quantity, 0)
  const packed = items.reduce((s, i) => s + i.packed_count, 0)
  return { total, packed, percent: total > 0 ? Math.round((packed / total) * 100) : 0 }
}

export function clampPackedCount(currentPackedCount: number, newQuantity: number) {
  if (newQuantity <= currentPackedCount) {
    // Reducing quantity below packed count: clamp and mark fully packed
    return { packed_count: newQuantity, is_packed: true }
  }
  // Increasing quantity: packed_count unchanged, not fully packed
  return { packed_count: currentPackedCount, is_packed: false }
}
```

- [ ] **Export from utils barrel**

Add to `packages/shared/src/utils/index.ts`:

```ts
export { computePackingProgress, clampPackedCount } from './packingUtils'
```

- [ ] **Run tests — expect PASS**

```bash
cd C:\Users\justi\dev\travyl2\travyl-frontend\packages\shared && npm test -- --reporter=verbose 2>&1 | head -40
```

Expected: all `packingUtils` tests pass; existing tests still pass.

- [ ] **Commit**

```bash
git add packages/shared/src/utils/packingUtils.ts packages/shared/src/utils/packingUtils.test.ts
git commit -m "feat(utils): add computePackingProgress and clampPackedCount helpers"
```

---

### Task 4: Service layer

**Files:**
- Modify: `packages/shared/src/services/packingService.ts`

- [ ] **Update `insertPackingItem` to include default quantity/packed_count**

Replace the entire `.insert({...})` call (around line 45):

```ts
.insert({
  trip_id: tripId, user_id: userId, name, category, sort_order: sortOrder,
  quantity: 1,
  packed_count: 0,
  ...(ownerId !== undefined && { owner_id: ownerId }),
  ...(groupTag !== undefined && { group_tag: groupTag }),
})
```

- [ ] **Update `updatePackingItemPacked` signature to accept `quantity`**

Change from:
```ts
export async function updatePackingItemPacked(itemId: string, isPacked: boolean, packedBy: string | null): Promise<void> {
  const { error } = await supabase.from('packing_items').update({ is_packed: isPacked, packed_by: isPacked ? packedBy : null, packed_at: isPacked ? new Date().toISOString() : null }).eq('id', itemId)
  if (error) throw error
}
```

To:
```ts
export async function updatePackingItemPacked(itemId: string, isPacked: boolean, packedBy: string | null, quantity = 1): Promise<void> {
  const { error } = await supabase.from('packing_items').update({
    is_packed: isPacked,
    packed_count: isPacked ? quantity : 0,
    packed_by: isPacked ? packedBy : null,
    packed_at: isPacked ? new Date().toISOString() : null,
  }).eq('id', itemId)
  if (error) throw error
}
```

- [ ] **Add `updatePackingQuantity`**

After `updatePackingItemPacked`, add:

```ts
export async function updatePackingQuantity(itemId: string, quantity: number, currentPackedCount: number): Promise<void> {
  const fields: Record<string, unknown> = { quantity, is_packed: quantity <= currentPackedCount }
  if (quantity <= currentPackedCount) {
    fields.packed_count = quantity
  }
  const { error } = await supabase.from('packing_items').update(fields).eq('id', itemId)
  if (error) throw error
}
```

- [ ] **Add `updatePackedCount`**

```ts
export async function updatePackedCount(itemId: string, packedCount: number, quantity: number): Promise<void> {
  const { error } = await supabase.from('packing_items').update({
    packed_count: packedCount,
    is_packed: packedCount >= quantity,
  }).eq('id', itemId)
  if (error) throw error
}
```

- [ ] **Run typecheck**

```bash
cd C:\Users\justi\dev\travyl2\travyl-frontend && npm run typecheck
```

Expected: no errors.

- [ ] **Commit**

```bash
git add packages/shared/src/services/packingService.ts
git commit -m "feat(service): add quantity/packed_count support to packingService"
```

---

## Chunk 2: Hook

> **Depends on Chunk 1:** `DbPackingItem` must have `quantity`/`packed_count` fields, `packingService.ts` must have `updatePackingQuantity`/`updatePackedCount`/updated `updatePackingItemPacked`, and `packingUtils.ts` must exist before starting this chunk.

### Task 5: Update `usePackingList`

**Files:**
- Modify: `packages/shared/src/hooks/usePackingList.ts`

This is the most complex task. Make changes one mutation at a time.

- [ ] **Update imports at the top**

Add `updatePackingQuantity` and `updatePackedCount` to the import from `packingService`:

```ts
import { fetchPackingItems, fetchPackingAuditLog, insertPackingItem, insertAuditEntry, updatePackingItemPacked, updatePackingQuantity, updatePackedCount, deletePackingItem, claimPackingItem, releasePackingItem, transferPackingItem } from '../services/packingService'
```

Also add the utility import:
```ts
import { computePackingProgress } from '../utils/packingUtils'
```

- [ ] **Update `progress` to use unit sums**

Replace the current `progress` useMemo (lines 66-70):

```ts
const progress = useMemo(() => computePackingProgress(items), [items])
```

- [ ] **Update `togglePackedMutation` optimistic update to include `packed_count`**

The `onMutate` block currently sets `is_packed`, `packed_by`, `packed_at`. Extend it to also set `packed_count`:

```ts
onMutate: async (itemId: string) => {
  await queryClient.cancelQueries({ queryKey: ['packingItems', tripId] })
  const previous = queryClient.getQueryData<DbPackingItem[]>(['packingItems', tripId])
  queryClient.setQueryData<DbPackingItem[]>(['packingItems', tripId], (old) =>
    (old ?? []).map((item) => {
      if (item.id !== itemId) return item
      const newPacked = !item.is_packed
      return {
        ...item,
        is_packed: newPacked,
        packed_count: newPacked ? item.quantity : 0,
        packed_by: newPacked ? userId ?? null : null,
        packed_at: newPacked ? new Date().toISOString() : null,
      }
    })
  )
  return { previous }
},
```

Also update the `mutationFn` to pass `item.quantity` to `updatePackingItemPacked`:

```ts
mutationFn: async (itemId: string) => {
  const item = items.find((i) => i.id === itemId)
  if (!item) return
  const newPacked = !item.is_packed
  await updatePackingItemPacked(itemId, newPacked, userId ?? null, item.quantity)
  await insertAuditEntry(tripId!, userId!, itemId, newPacked ? 'packed' : 'unpacked', item.name).catch(() => {})
},
```

But wait — for `quantity > 1` items, `togglePacked` will delegate to `incrementPacked` instead of calling `updatePackingItemPacked`. So add the delegation logic in the `togglePacked` callback (at the bottom of the hook, after mutations are defined):

```ts
const togglePacked = useCallback((itemId: string) => {
  const item = items.find((i) => i.id === itemId)
  if (!item) return
  if ((item.quantity ?? 1) > 1) {
    incrementPackedMutation.mutate(itemId)
  } else {
    togglePackedMutation.mutate(itemId)
  }
}, [items, togglePackedMutation, incrementPackedMutation])
```

(Note: `incrementPackedMutation` is defined in the next step — write this callback after adding `incrementPackedMutation`.)

- [ ] **Add `incrementPackedMutation`**

Insert this mutation after `togglePackedMutation`:

```ts
const incrementPackedMutation = useMutation({
  mutationFn: async ({ itemId, newPackedCount, newIsPacked }: { itemId: string; newPackedCount: number; newIsPacked: boolean }) => {
    await updatePackedCount(itemId, newPackedCount, items.find((i) => i.id === itemId)?.quantity ?? 1)
    if (newIsPacked) {
      await insertAuditEntry(tripId!, userId!, itemId, 'packed', items.find((i) => i.id === itemId)?.name ?? '').catch(() => {})
    } else if (newPackedCount === 0) {
      await insertAuditEntry(tripId!, userId!, itemId, 'unpacked', items.find((i) => i.id === itemId)?.name ?? '').catch(() => {})
    }
  },
  onMutate: async ({ itemId, newPackedCount, newIsPacked }) => {
    await queryClient.cancelQueries({ queryKey: ['packingItems', tripId] })
    const previous = queryClient.getQueryData<DbPackingItem[]>(['packingItems', tripId])
    queryClient.setQueryData<DbPackingItem[]>(['packingItems', tripId], (old) =>
      (old ?? []).map((item) =>
        item.id === itemId ? { ...item, packed_count: newPackedCount, is_packed: newIsPacked } : item
      )
    )
    return { previous }
  },
  onError: (_err: unknown, _vars: unknown, context: { previous: DbPackingItem[] | undefined } | undefined) => {
    if (context?.previous) queryClient.setQueryData(['packingItems', tripId], context.previous)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
    queryClient.invalidateQueries({ queryKey: ['packingAuditLog', tripId] })
  },
})
```

- [ ] **Add `updateQuantityMutation`**

Insert after `incrementPackedMutation`:

```ts
const updateQuantityMutation = useMutation({
  mutationFn: async ({ itemId, quantity, currentPackedCount }: { itemId: string; quantity: number; currentPackedCount: number }) => {
    await updatePackingQuantity(itemId, quantity, currentPackedCount)
  },
  onMutate: async ({ itemId, quantity, currentPackedCount }) => {
    await queryClient.cancelQueries({ queryKey: ['packingItems', tripId] })
    const previous = queryClient.getQueryData<DbPackingItem[]>(['packingItems', tripId])
    queryClient.setQueryData<DbPackingItem[]>(['packingItems', tripId], (old) =>
      (old ?? []).map((item) => {
        if (item.id !== itemId) return item
        const newPackedCount = quantity <= currentPackedCount ? quantity : item.packed_count
        return { ...item, quantity, packed_count: newPackedCount, is_packed: newPackedCount >= quantity }
      })
    )
    return { previous }
  },
  onError: (_err: unknown, _vars: unknown, context: { previous: DbPackingItem[] | undefined } | undefined) => {
    if (context?.previous) queryClient.setQueryData(['packingItems', tripId], context.previous)
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
  },
})
```

- [ ] **Add `incrementPacked` and `updateQuantity` callbacks**

Add these near the other `useCallback` lines:

```ts
const incrementPacked = useCallback((itemId: string) => {
  const item = items.find((i) => i.id === itemId)
  if (!item) return
  const newPackedCount = item.packed_count >= item.quantity ? 0 : item.packed_count + 1
  const newIsPacked = newPackedCount >= item.quantity
  incrementPackedMutation.mutate({ itemId, newPackedCount, newIsPacked })
}, [items, incrementPackedMutation])

const updateQuantity = useCallback((itemId: string, quantity: number) => {
  const item = items.find((i) => i.id === itemId)
  if (!item) return
  const clamped = Math.max(1, Math.min(99, Math.round(quantity)))
  updateQuantityMutation.mutate({ itemId, quantity: clamped, currentPackedCount: item.packed_count })
}, [items, updateQuantityMutation])
```

- [ ] **Update the final `togglePacked` callback to delegate**

Replace the existing `togglePacked` line:
```ts
const togglePacked = useCallback((itemId: string) => togglePackedMutation.mutate(itemId), [togglePackedMutation])
```

With:
```ts
const togglePacked = useCallback((itemId: string) => {
  const item = items.find((i) => i.id === itemId)
  if (!item) return
  if (item.quantity > 1) {
    incrementPacked(itemId)
  } else {
    togglePackedMutation.mutate(itemId)
  }
}, [items, togglePackedMutation, incrementPacked])
```

- [ ] **Export `incrementPacked` and `updateQuantity` from the return value**

Update the return object at the bottom of the hook:

```ts
return {
  items, itemsByCategory, orderedCategories, filteredItems,
  auditLog: auditQuery.data ?? [],
  progress,
  isLoading: itemsQuery.isLoading,
  error: itemsQuery.error,
  addItem, togglePacked, removeItem, claimItem, releaseItem, transferItem,
  incrementPacked,    // ← new
  updateQuantity,     // ← new
}
```

- [ ] **Run typecheck**

```bash
cd C:\Users\justi\dev\travyl2\travyl-frontend && npm run typecheck
```

Expected: no errors. Fix any that appear.

- [ ] **Run shared tests**

```bash
cd C:\Users\justi\dev\travyl2\travyl-frontend\packages\shared && npm test
```

Expected: all pass.

- [ ] **Commit**

```bash
git add packages/shared/src/hooks/usePackingList.ts
git commit -m "feat(hook): add incrementPacked and updateQuantity to usePackingList"
```

---

## Chunk 3: UI Components

> **Depends on Chunk 1 and 2:** All type, service, and hook changes must be complete before starting this chunk.

### Task 6: `PackingItem.tsx`

**Files:**
- Modify: `apps/web/components/packing/PackingItem.tsx`

- [ ] **Update `PackingItemProps`**

Add the two new callbacks:

```ts
interface PackingItemProps {
  item: DbPackingItem
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onClaim?: (id: string) => void
  onRelease?: (id: string) => void
  currentUserId?: string
  onIncrementPacked: (id: string) => void       // ← new
  onUpdateQuantity: (id: string, qty: number) => void  // ← new
}
```

- [ ] **Add local state for inline quantity editing**

Add at the top of the component function:

```ts
const [editingQty, setEditingQty] = useState(false)
const [qtyInput, setQtyInput] = useState(String(item.quantity))

// Reset input whenever item.quantity changes (e.g. after optimistic update settles)
useEffect(() => {
  if (!editingQty) setQtyInput(String(item.quantity))
}, [item.quantity, editingQty])
```

You'll need to import `useState` and `useEffect` from React.

- [ ] **Replace the checkbox area with conditional rendering**

Replace the existing `{/* Checkbox */}` block:

```tsx
{/* Checkbox / packed-count pill */}
{item.quantity > 1 ? (
  <button
    onClick={() => onIncrementPacked(item.id)}
    className="shrink-0 w-8 h-5 rounded-full border flex items-center justify-center text-[11px] font-semibold transition-all duration-150"
    style={{
      backgroundColor: item.packed_count > 0 ? '#003594' : 'transparent',
      borderColor: item.packed_count > 0 ? '#003594' : 'var(--cal-border)',
      color: item.packed_count > 0 ? 'white' : 'var(--cal-text-muted)',
    }}
    aria-label={`${item.packed_count} of ${item.quantity} packed`}
  >
    {item.packed_count}/{item.quantity}
  </button>
) : (
  <button
    onClick={() => onToggle(item.id)}
    className="shrink-0 w-5 h-5 rounded-[4px] border transition-all duration-150 flex items-center justify-center"
    style={{
      backgroundColor: item.is_packed ? '#003594' : 'transparent',
      borderColor: item.is_packed ? '#003594' : 'var(--cal-border)',
    }}
    aria-label={item.is_packed ? 'Unpack item' : 'Pack item'}
  >
    {item.is_packed && (
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
        <path d="M1 3.5L3.8 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </button>
)}
```

- [ ] **Add the quantity control after the item name**

Insert this block between the item name `<span>` and the ownership pill `{item.group_tag ? ...}`:

```tsx
{/* Quantity control — visible on hover when quantity > 1; stepper always shown, badge at rest */}
{item.quantity > 1 && (
  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
    <button
      onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, item.quantity - 1) }}
      disabled={item.quantity <= 1}
      className="w-4 h-4 rounded flex items-center justify-center text-[10px] text-[var(--cal-text-muted)] hover:text-[var(--cal-text)] hover:bg-[var(--cal-surface)] disabled:opacity-30 transition-colors"
      aria-label="Decrease quantity"
    >−</button>

    {editingQty ? (
      <input
        type="number"
        min={1}
        max={99}
        value={qtyInput}
        onChange={(e) => setQtyInput(e.target.value)}
        onBlur={() => {
          const parsed = parseInt(qtyInput, 10)
          const clamped = isNaN(parsed) || parsed < 1 ? 1 : Math.min(parsed, 99)
          onUpdateQuantity(item.id, clamped)
          setEditingQty(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
          if (e.key === 'Escape') { setQtyInput(String(item.quantity)); setEditingQty(false) }
        }}
        autoFocus
        className="w-7 text-center text-[11px] bg-transparent border-b border-[var(--cal-border)] outline-none text-[var(--cal-text)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
    ) : (
      <button
        onClick={(e) => { e.stopPropagation(); setQtyInput(String(item.quantity)); setEditingQty(true) }}
        className="text-[11px] text-[var(--cal-text-muted)] hover:text-[var(--cal-text)] min-w-[1.25rem] text-center transition-colors"
        title="Edit quantity"
      >
        ×{item.quantity}
      </button>
    )}

    <button
      onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, item.quantity + 1) }}
      disabled={item.quantity >= 99}
      className="w-4 h-4 rounded flex items-center justify-center text-[10px] text-[var(--cal-text-muted)] hover:text-[var(--cal-text)] hover:bg-[var(--cal-surface)] disabled:opacity-30 transition-colors"
      aria-label="Increase quantity"
    >+</button>
  </div>
)}

{/* Quantity badge at rest (quantity > 1, not hovering) — hidden when stepper is visible */}
{item.quantity > 1 && (
  <span className="text-[10px] text-[var(--cal-text-muted)] shrink-0 group-hover:hidden">
    ×{item.quantity}
  </span>
)}
```

Do not typecheck or commit yet — callers are wired in Tasks 7 and 8.

---

### Task 7: `PackingCategory.tsx`

**Files:**
- Modify: `apps/web/components/packing/PackingCategory.tsx`

- [ ] **Add new props to `PackingCategoryProps`**

```ts
interface PackingCategoryProps {
  category: string
  items: DbPackingItem[]
  suggestions?: PackingSuggestion[]
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onClaim?: (id: string) => void
  onRelease?: (id: string) => void
  currentUserId?: string
  onAcceptSuggestion?: (id: string) => void
  onDismissSuggestion?: (id: string) => void
  defaultExpanded?: boolean
  onIncrementPacked: (id: string) => void        // ← new
  onUpdateQuantity: (id: string, qty: number) => void  // ← new
}
```

- [ ] **Update the progress counter to use unit sums**

Replace:
```ts
const packedCount = items.filter((i) => i.is_packed).length
const totalCount = items.length
```

With:
```ts
const packedCount = items.reduce((s, i) => s + i.packed_count, 0)
const totalCount = items.reduce((s, i) => s + i.quantity, 0)
```

- [ ] **Thread new props down to `PackingItem`**

Add `onIncrementPacked` and `onUpdateQuantity` to the `PackingCategory` function signature, then pass them to each `PackingItem`:

```tsx
<PackingItem
  key={item.id}
  item={item}
  onToggle={onToggle}
  onRemove={onRemove}
  onClaim={onClaim}
  onRelease={onRelease}
  currentUserId={currentUserId}
  onIncrementPacked={onIncrementPacked}   // ← new
  onUpdateQuantity={onUpdateQuantity}     // ← new
/>
```

- [ ] **Run typecheck — expect errors in `PackingCategoryList` (not yet updated)**

```bash
cd C:\Users\justi\dev\travyl2\travyl-frontend && npm run typecheck
```

Expected: errors about missing `onIncrementPacked`/`onUpdateQuantity` in `PackingCategoryList`. These are fixed in Task 8.

---

### Task 8: `PackingCategoryList.tsx`, `PackingPage.tsx`, `PackingPanel.tsx`

**Files:**
- Modify: `apps/web/components/packing/PackingCategoryList.tsx`
- Modify: `apps/web/components/packing/PackingPage.tsx`
- Modify: `apps/web/components/packing/PackingPanel.tsx`

- [ ] **Add new props to `PackingCategoryListProps` and thread them to `PackingCategory`**

In `PackingCategoryList.tsx`, add to the interface:
```ts
onIncrementPacked: (id: string) => void
onUpdateQuantity: (id: string, qty: number) => void
```

Add them to the destructure in the function signature, then pass to `<PackingCategory>`:
```tsx
<PackingCategory
  ...existing props...
  onIncrementPacked={onIncrementPacked}
  onUpdateQuantity={onUpdateQuantity}
/>
```

- [ ] **Update `PackingPage.tsx`**

Destructure the new callbacks from the hook:
```ts
const { items, itemsByCategory, orderedCategories, filteredItems, auditLog, progress, isLoading, error, addItem, togglePacked, removeItem, claimItem, releaseItem, transferItem, incrementPacked, updateQuantity } = usePackingList(tripId, userId, filterBy)
```

Pass them to `PackingCategoryList`:
```tsx
<PackingCategoryList
  ...existing props...
  onIncrementPacked={incrementPacked}
  onUpdateQuantity={updateQuantity}
/>
```

- [ ] **Update `PackingPanel.tsx`**

Same pattern — destructure and pass to `PackingCategoryList`:
```ts
const { items, itemsByCategory, orderedCategories, auditLog, progress, isLoading, error, addItem, togglePacked, removeItem, claimItem, releaseItem, incrementPacked, updateQuantity } = usePackingList(tripId, user?.id)
```

```tsx
<PackingCategoryList
  ...existing props...
  onIncrementPacked={incrementPacked}
  onUpdateQuantity={updateQuantity}
/>
```

- [ ] **Run typecheck — expect clean**

```bash
cd C:\Users\justi\dev\travyl2\travyl-frontend && npm run typecheck
```

Expected: no errors.

- [ ] **Run shared tests**

```bash
cd C:\Users\justi\dev\travyl2\travyl-frontend\packages\shared && npm test
```

Expected: all pass.

- [ ] **Commit**

```bash
git add apps/web/components/packing/PackingItem.tsx apps/web/components/packing/PackingCategory.tsx apps/web/components/packing/PackingCategoryList.tsx apps/web/components/packing/PackingPage.tsx apps/web/components/packing/PackingPanel.tsx
git commit -m "feat(ui): add quantity tracking and stepper to packing list components"
```

---

## Done

- [ ] **Final lint check**

```bash
cd C:\Users\justi\dev\travyl2\travyl-frontend && npm run lint
```

Fix any issues, commit if needed.

- [ ] **Verify end-to-end manually**

1. Open any trip → Packing tab
2. Add an item. Confirm it shows a normal checkbox (quantity=1, nothing on the right)
3. Hover the item — no quantity controls shown (correct, quantity=1)
4. Hover and click `+` once — item becomes `×2`. The checkbox area becomes a `0/2` pill.
5. Click the `0/2` pill — becomes `1/2` (blue). Click again — `2/2` (fully blue). Click again — resets to `0/2`.
6. Hover and click the `×2` number — an inline input appears. Type `5`, press Enter — item becomes `×5`.
7. Type `0` in the input, blur — should clamp to 1.
8. Category header progress should show unit sums (e.g. `3/7` not `2/4`).
9. Overall packing progress bar should reflect unit sums.
