# Packing List Quantities — Design Spec

**Date:** 2026-03-26
**Status:** Approved

## Goal

Add per-item quantity tracking to the packing list, with partial packing support (e.g., "packed 2 of 3 shirts").

---

## Data Model

### DB Migration

Add two columns to `packing_items`:

```sql
ALTER TABLE packing_items
  ADD COLUMN quantity     INT NOT NULL DEFAULT 1,
  ADD COLUMN packed_count INT NOT NULL DEFAULT 0;
```

- `quantity` — total number needed (min 1; 1–99 cap is UI-only, no DB CHECK)
- `packed_count` — 0 ≤ packed_count ≤ quantity; invariant maintained by app layer
- `is_packed` stays and is always kept in sync: `true` iff `packed_count >= quantity`
- Race condition: if real-time sync delivers `packed_count > quantity`, UI clamps display to `quantity`; next write corrects DB
- Mobile: DB migration must run before web deployment (mobile reads same table)

### Type Update (`DbPackingItem`)

```ts
quantity: number       // default 1
packed_count: number   // default 0
```

---

## Service Layer (`packingService.ts`)

**`updatePackingQuantity(itemId, quantity, currentPackedCount)`**
- `quantity <= currentPackedCount`: writes `{ quantity, packed_count: quantity, is_packed: true }` (intentionally lossy — clamped packed_count is acceptable)
- `quantity > currentPackedCount`: writes `{ quantity, is_packed: false }`

**`updatePackedCount(itemId, packedCount, quantity)`**
- Writes `{ packed_count, is_packed: packedCount >= quantity }`
- Does not update `packed_by` / `packed_at` — intentional; partial packing is a multi-user action; audit log tracks activity instead

**`insertPackingItem`** — include `quantity: 1, packed_count: 0`

**`updatePackingItemPacked(itemId, isPacked, packedBy, quantity)`** — updated signature adds `quantity`:
- Pack: `{ is_packed: true, packed_count: quantity, packed_by, packed_at: now }`
- Unpack: `{ is_packed: false, packed_count: 0, packed_by: null, packed_at: null }`
- All existing call sites in `usePackingList` must be updated to pass `item.quantity`

---

## Hook (`usePackingList`)

### Callbacks

**`updateQuantity(id, quantity)`**
- Optimistic update: set `item.quantity = quantity`; if `quantity <= item.packed_count`, also set `item.packed_count = quantity` and `item.is_packed = true` (mirrors service-layer clamp to prevent `packed_count/quantity` pill briefly showing `3/2`)
- Then calls `updatePackingQuantity(id, quantity, previousPackedCount)`
- Rollback to snapshot on DB error

**`incrementPacked(id)`**
- Optimistic update: increment `packed_count` by 1; if `packed_count === quantity`, wrap to 0
- Derive and set `is_packed = packed_count >= quantity`
- When `is_packed` flips to `true`: call `insertAuditEntry(tripId, userId, item.id, 'packed', item.name)` — no `packed_by` attribution (intentional, matches `updatePackedCount` design)
- When `is_packed` flips to `false` (wrap-to-zero): call `insertAuditEntry(tripId, userId, item.id, 'unpacked', item.name)`
- When `is_packed` does not flip (intermediate increment, e.g. 1→2 of 3): no audit entry
- Rollback to snapshot on DB error

**`togglePacked(id)`**
- `quantity = 1`: calls `updatePackingItemPacked`; the `onMutate` optimistic update must write `{ is_packed: newPacked, packed_count: newPacked ? 1 : 0, packed_by: ..., packed_at: ... }` into the cache (i.e. the existing `onMutate` block must be extended to include `packed_count`). Fires `packed`/`unpacked` audit via existing path.
- `quantity > 1`: delegates to `incrementPacked` (audit entries are unattributed per `incrementPacked` spec above)
- Rollback to snapshot on DB error; `onSettled` invalidates query cache

**`updateQuantity` and `incrementPacked`** also call `onSettled` → `queryClient.invalidateQueries` to reconcile skipped own-user real-time events.

### `progress` object

- `total` = `sum(item.quantity)`, `packed` = `sum(item.packed_count)` — from full unfiltered `items`
- `percent` = `total > 0 ? packed / total * 100 : 0`
- No changes to `PackingProgress` component

---

## Component prop changes

### Changed prop interfaces (all four in the threading chain)

**`PackingItemProps`** — new props:
```ts
onIncrementPacked: (id: string) => void
onUpdateQuantity: (id: string, quantity: number) => void
```
`onToggle` kept; used when `quantity = 1`. `onIncrementPacked` used when `quantity > 1`.

**`PackingCategoryProps`** — new props (threaded through):
```ts
onIncrementPacked: (id: string) => void
onUpdateQuantity: (id: string, quantity: number) => void
```

**`PackingCategoryListProps`** — new props (threaded through):
```ts
onIncrementPacked: (id: string) => void
onUpdateQuantity: (id: string, quantity: number) => void
```

**`PackingPage` / `PackingPanel`** — destructure `updateQuantity` and `incrementPacked` from `usePackingList` hook and pass them to `PackingCategoryList`.

---

## UI

### `PackingItem.tsx`

**Checkbox area (left):**
- `quantity = 1`: existing checkbox, no change
- `quantity > 1`: `packed_count/quantity` pill (e.g. `2/3`); click calls `onIncrementPacked`; cycles 0 → 1 → … → quantity → 0; blue (`#003594`) when `packed_count > 0`, gray (`var(--cal-border)`) when 0

**Quantity control (right, on hover):**
- `quantity = 1`: nothing shown
- `quantity > 1`: `× N` badge at rest; hover shows `−` / `+` flanking the number; `−` disabled when `quantity = 1`
- Click number: inline `<input type="number" min="1" max="99">`; blur or Enter clamps to [1, 99] (non-integer, empty, or ≤ 0 → 1 silently), calls `onUpdateQuantity`; Escape restores previous display value

Existing right-side elements (ownership pill, avatar, claim/release, remove) remain in the same order.

### `PackingCategory.tsx`

Progress counter computed locally from `items` prop (no prop interface change):

```ts
const totalUnits  = items.reduce((s, i) => s + i.quantity, 0)
const packedUnits = items.reduce((s, i) => s + i.packed_count, 0)
// display: `${packedUnits}/${totalUnits}`
```

Note: visible semantic change — was "items packed", now "units packed".

---

## Scope Boundaries

- `PackingPage` / `PackingPanel`: destructure and pass two new callbacks only
- No changes to `PackingActivityFeed`, `SpotlightSearch`, `SuggestionChip`, mobile
- Audit: `packed`/`unpacked` on `is_packed` flip only; intermediate increments do not log
- Accepted suggestions default to `quantity: 1`
