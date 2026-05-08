# Packing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the trip Packing tab to use the shared `Module` shell + theme color, in a balanced two-column dashboard layout (left: list; right sticky stack: At a glance, Suggestions, Activity).

**Architecture:** Add a small `titleSize` prop to the shared `Module` so the right-column Modules can render at 17px instead of 26px. Restyle every existing leaf component (PackingItem, PackingCategory, PackingCategoryList, SpotlightSearch, SuggestionChip, PackingActivityFeed) to swap calendar tokens for theme color + gray scale. Add three new presentational components (PackingGlance, PackingSuggestions, PackingListModule). Rewrite `PackingPage.tsx` as a thin orchestrator that composes them inside the 12-col grid Settings + Budget already use. Delete the now-unused `PackingPanel` and `PackingProgress`.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS, motion/react, Lucide + iconoir-react. No new dependencies. Persistence via existing `usePackingList` hook (no changes).

**Spec:** `docs/superpowers/specs/2026-05-06-packing-page-redesign-design.md` (commit `cce5a303`)

**Branch:** `develop` — commits land directly on develop, no feature branch.

---

## Critical context for the implementer

- **Settings page WIP collision risk is gone for this work.** The Settings page imports `Module` already (Noah's WIP), but the change in this plan is *adding an optional prop with a default* — Settings keeps rendering identically without any edit. Do NOT touch `settings/page.tsx`.
- Vitest runs `node` env, no `@testing-library/react`. Most verification is manual via dev server (`npm run web` from repo root → `http://localhost:3001`).
- The page already has lint debt around `any` types in the seed effect — keep the existing `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comments verbatim if you carry that code over.
- `iconoir-react` (used by current packing components) is fine to keep — the codebase already mixes Lucide and iconoir. Don't migrate icon libraries.
- `motion/react` is the import path (not `framer-motion`). Already standard in this repo.

---

## File Map

### Files created

| File | Responsibility |
| ---- | -------------- |
| `apps/web/components/packing/PackingGlance.tsx` | The 2×2 stat grid for the "At a glance" Module body. |
| `apps/web/components/packing/PackingSuggestions.tsx` | The Suggestions Module body — wraps suggestion chips + empty/loading states. |
| `apps/web/components/packing/PackingListModule.tsx` | The left Module's body: filter chips + SpotlightSearch + PackingCategoryList. |

### Files modified

| File | Change |
| ---- | ------ |
| `apps/web/components/trip/Module.tsx` | Add optional `titleSize?: 'lg' \| 'sm'` prop (default `'lg'`). `'sm'` renders title at 17px. |
| `apps/web/components/packing/PackingPage.tsx` | Full rewrite — orchestrator only; composes the 4 Modules in a 12-col grid. |
| `apps/web/components/packing/PackingItem.tsx` | Token swaps: `var(--cal-*)` → gray + theme; `#003594` → `var(--trip-base)`. Pill palette → theme tint for Mine, neutral gray for everything else. |
| `apps/web/components/packing/PackingCategory.tsx` | Token swaps. Drop the `✦ AI` per-category badge. Drop inline suggestions render. |
| `apps/web/components/packing/PackingCategoryList.tsx` | Drop the `suggestionsByCategory` prop and its inline render branch. |
| `apps/web/components/packing/SuggestionChip.tsx` | Restyle for the right-column Module context (tighter padding). Keep purple AI accent. |
| `apps/web/components/packing/PackingActivityFeed.tsx` | Strip outer header + collapse chevron; render as a flat list inside its parent Module. |
| `apps/web/components/packing/SpotlightSearch.tsx` | Wrap in `React.forwardRef` + `useImperativeHandle({ focus })`. Restyle trigger input to match Settings' `Input` primitive. |
| `apps/web/components/packing/index.ts` | Drop exports for deleted files (`PackingPanel`, `PackingProgress`). Add exports for the 3 new components. |

### Files deleted

| File | Reason |
| ---- | ------ |
| `apps/web/components/packing/PackingPanel.tsx` | Unused after this rewrite. Only PackingPage referenced it transitively, and no external file imports it. |
| `apps/web/components/packing/PackingProgress.tsx` | Replaced by an inline progress bar in the Packing list Module header. No external consumer. |

### Files NOT touched

- `apps/web/app/(dashboard)/trip/[id]/packing/page.tsx` — already a 9-line `<PackingPage tripId={id} />` wrapper. No change.
- `apps/web/components/packing/utils.ts` — `getCategoryLabel`, `isStaticCategory`, `stringToColor` are all reused as-is.
- `packages/shared/src/hooks/usePackingList.ts` — no API changes.
- `packages/shared/src/hooks/usePackingSuggestions.ts` — no API changes.
- `packages/shared/src/utils/seedDefaultPackingItems.ts` — no API changes.
- `apps/web/app/(dashboard)/trip/[id]/settings/page.tsx` (Noah's WIP) — DO NOT touch. The `Module` change is backwards-compatible.
- `apps/web/app/(dashboard)/trip/[id]/budget/page.tsx` — already on the new Module shell.

---

## Pre-flight (one-time)

- [ ] **Step 0.1: Confirm branch + working tree**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git status
git branch --show-current
```

Expected: branch `develop`. Working tree shows Noah's WIP files unchanged from before (settings/page.tsx etc.). Do not stash, revert, or stage them.

- [ ] **Step 0.2: Confirm no external consumers of the deprecated components**

```bash
grep -rn "import.*PackingPanel\|import.*PackingProgress" apps/web --include="*.tsx" --include="*.ts" | grep -v "components/packing/" | grep -v ".next"
```

Expected: empty. If anything outside `components/packing/` imports them, **stop and report NEEDS_CONTEXT** — those callers must be updated before deletion.

- [ ] **Step 0.3: Confirm Module is currently used by Settings + Budget**

```bash
grep -rn "from '@/components/trip/Module'" apps/web --include="*.tsx" --include="*.ts"
```

Expected: 2 hits — `budget/page.tsx` and `settings/page.tsx`. The `titleSize` change in Task 1 must not break either.

- [ ] **Step 0.4: Spin up the dev server** (leave running for visual checks)

```bash
npm run web
```

Open `http://localhost:3001/trip/<trip-id>/packing` in a browser. This is your starting state — current ugly packing page.

---

## Task 1: Add `titleSize` prop to `Module`

**Files:**
- Modify: `apps/web/components/trip/Module.tsx`

Backwards-compatible addition. Default `'lg'` keeps Settings + Budget identical.

- [ ] **Step 1.1: Edit `Module.tsx`**

Update the `ModuleProps` interface and the render to support `titleSize`:

```tsx
'use client';

export interface ModuleProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  titleSize?: 'lg' | 'sm';
}

export function Module({ title, description, action, children, className = '', titleSize = 'lg' }: ModuleProps) {
  const titleClass = titleSize === 'sm'
    ? 'text-[17px] font-serif font-normal text-gray-900 dark:text-white tracking-tight leading-tight'
    : 'text-[26px] font-serif font-normal text-gray-900 dark:text-white tracking-tight leading-tight';
  const headerPadClass = titleSize === 'sm'
    ? 'flex items-start justify-between gap-4 px-5 lg:px-6 pt-5 lg:pt-5 pb-4 border-b border-gray-100 dark:border-white/[0.06]'
    : 'flex items-start justify-between gap-4 px-7 lg:px-8 pt-7 lg:pt-8 pb-5 border-b border-gray-100 dark:border-white/[0.06]';
  const bodyPadClass = titleSize === 'sm'
    ? 'flex-1 px-5 lg:px-6 py-5 lg:py-6'
    : 'flex-1 px-7 lg:px-8 py-6 lg:py-7';

  return (
    <section className={`bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col ${className}`}>
      <header className={headerPadClass}>
        <div>
          <h2 className={titleClass}>{title}</h2>
          {description && <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5">{description}</p>}
        </div>
        {action}
      </header>
      <div className={bodyPadClass}>{children}</div>
    </section>
  );
}
```

The smaller variant tightens horizontal padding too (5/6 vs 7/8) so the right-column Modules don't waste lateral space.

- [ ] **Step 1.2: Typecheck + visual no-op check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | head -10
```

In the browser, open `http://localhost:3001/trip/<id>/settings` and `http://localhost:3001/trip/<id>/budget`. Confirm both pages look identical to before (the default `titleSize='lg'` is the same code path).

- [ ] **Step 1.3: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/trip/Module.tsx
git commit -m "Add optional titleSize prop to Module for subordinate side panels"
```

---

## Task 2: Restyle leaf components — `PackingItem`, `PackingCategory`, `PackingCategoryList`, `SuggestionChip`

**Files:**
- Modify: `apps/web/components/packing/PackingItem.tsx`
- Modify: `apps/web/components/packing/PackingCategory.tsx`
- Modify: `apps/web/components/packing/PackingCategoryList.tsx`
- Modify: `apps/web/components/packing/SuggestionChip.tsx`

Token swaps + drop the inline-suggestions render branch. Behavior preserved across all four files. No new tests; verification is visual.

### 2a. `PackingItem.tsx`

- [ ] **Step 2a.1: Replace tokens in `PackingItem.tsx`**

The current file has these tokens to replace:

| Old | New |
| --- | --- |
| `bg-cal-surface` | `bg-gray-50 dark:bg-white/[0.04]` |
| `var(--cal-text)` (style) | `inherit` (drop the inline style; rely on Tailwind classes) |
| `var(--cal-text-muted)` (style) | `inherit` (same) |
| `var(--cal-border)` (style) | `var(--trip-base)` for active, `rgb(229 231 235)` (gray-200) for inactive |
| `#003594` (hard-coded checkbox bg) | `var(--trip-base)` |

Replace the whole `PackingItem` component body with this version (functionality unchanged):

```tsx
'use client'

import { useState, useRef } from 'react'
import { motion } from 'motion/react'
import { Xmark } from 'iconoir-react'
import type { DbPackingItem } from '@travyl/shared'
import { stringToColor } from './utils'

interface PackingItemProps {
  item: DbPackingItem
  onToggle: (id: string) => void
  onIncrementPacked: (id: string) => void
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  onClaim?: (id: string) => void
  onRelease?: (id: string) => void
  currentUserId?: string
}

export function PackingItem({ item, onToggle, onIncrementPacked, onUpdateQuantity, onRemove, onClaim, onRelease, currentUserId }: PackingItemProps) {
  const displayName = item.user_display_name ?? 'User'
  const avatarColor = stringToColor(displayName)
  const [qtyHover, setQtyHover] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    setEditValue(String(item.quantity))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitEdit() {
    const parsed = parseInt(editValue, 10)
    const clamped = isNaN(parsed) || parsed <= 0 ? 1 : Math.min(99, parsed)
    if (clamped !== item.quantity) onUpdateQuantity(item.id, clamped)
    setEditing(false)
  }

  function cancelEdit() {
    setEditing(false)
  }

  // Ownership pill: theme tint for current user's items, neutral gray for everything else.
  const isMine = item.owner_id === currentUserId
  const pillClass = item.group_tag
    ? 'bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300'
    : isMine
      ? 'text-[var(--trip-base)]'
      : item.owner_id
        ? 'bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300'
        : 'bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300'
  const pillStyle = isMine ? { backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)' } : undefined
  const pillLabel = item.group_tag
    ? (item.group_tag === 'kids' ? 'Kids' : 'Adults')
    : isMine
      ? 'Mine'
      : item.owner_id
        ? (item.owner_display_name || 'Claimed')
        : 'Shared'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="group flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors duration-150"
    >
      {/* Checkbox (qty=1) or packed-count pill (qty>1) */}
      {item.quantity === 1 ? (
        <button
          onClick={() => onToggle(item.id)}
          aria-label={item.is_packed ? 'Unpack item' : 'Pack item'}
          className="shrink-0 w-5 h-5 rounded-[4px] border transition-all duration-150 flex items-center justify-center"
          style={{
            backgroundColor: item.is_packed ? 'var(--trip-base)' : 'transparent',
            borderColor: item.is_packed ? 'var(--trip-base)' : 'rgb(209 213 219)',
          }}
        >
          {item.is_packed && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 3.5L3.8 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      ) : (
        <button
          onClick={() => onIncrementPacked(item.id)}
          aria-label={`Packed ${item.packed_count} of ${item.quantity}`}
          className="shrink-0 px-1.5 h-5 rounded-full border text-[10px] font-semibold tabular-nums transition-all duration-150 flex items-center"
          style={{
            backgroundColor: item.packed_count > 0 ? 'var(--trip-base)' : 'transparent',
            borderColor: item.packed_count > 0 ? 'var(--trip-base)' : 'rgb(209 213 219)',
            color: item.packed_count > 0 ? 'white' : 'rgb(107 114 128)',
          }}
        >
          {item.packed_count}/{item.quantity}
        </button>
      )}

      {/* Item name */}
      <span
        className={`flex-1 text-sm transition-colors duration-150 ${item.is_packed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}
      >
        {item.name}
      </span>

      {/* Quantity stepper — only for quantity > 1, shown on item hover */}
      {item.quantity > 1 && (
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          onMouseEnter={() => setQtyHover(true)}
          onMouseLeave={() => { if (!editing) setQtyHover(false) }}
        >
          {qtyHover || editing ? (
            <>
              <button
                onClick={() => { if (item.quantity > 1) onUpdateQuantity(item.id, item.quantity - 1) }}
                disabled={item.quantity <= 1}
                className="w-4 h-4 flex items-center justify-center rounded text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >−</button>
              {editing ? (
                <input
                  ref={inputRef}
                  type="number"
                  min={1}
                  max={99}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    else if (e.key === 'Escape') cancelEdit()
                  }}
                  className="w-8 text-center text-xs bg-transparent border-b border-gray-300 text-gray-900 dark:text-white outline-none"
                />
              ) : (
                <button
                  onClick={startEditing}
                  className="w-5 text-center text-xs text-gray-700 dark:text-gray-200"
                >{item.quantity}</button>
              )}
              <button
                onClick={() => { if (item.quantity < 99) onUpdateQuantity(item.id, item.quantity + 1) }}
                disabled={item.quantity >= 99}
                className="w-4 h-4 flex items-center justify-center rounded text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >+</button>
            </>
          ) : (
            <span className="text-xs text-gray-400">× {item.quantity}</span>
          )}
        </div>
      )}

      {/* Ownership pill */}
      <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium ${pillClass}`} style={pillStyle}>
        {pillLabel}
      </span>

      {/* User avatar — preserved per-user color via stringToColor */}
      <span
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
        style={{ backgroundColor: avatarColor }}
        title={displayName}
      >
        {displayName[0].toUpperCase()}
      </span>

      {/* Claim/Release buttons — appear on hover */}
      {!item.owner_id && !item.group_tag && onClaim && (
        <button onClick={() => onClaim(item.id)}
          className="opacity-0 group-hover:opacity-100 text-[10px] text-[var(--trip-base)] hover:underline transition-opacity">
          Claim
        </button>
      )}
      {item.owner_id === currentUserId && onRelease && (
        <button onClick={() => onRelease(item.id)}
          className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-opacity">
          Release
        </button>
      )}

      {/* Remove button — appears on hover */}
      <button
        onClick={() => onRemove(item.id)}
        aria-label="Remove item"
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-gray-400 hover:text-red-500"
      >
        <Xmark width={14} height={14} />
      </button>
    </motion.div>
  )
}
```

### 2b. `PackingCategory.tsx`

- [ ] **Step 2b.1: Replace `PackingCategory.tsx` body**

Drop the `suggestions` prop, the inline `SuggestionChip` render, and the `✦ AI` badge:

```tsx
'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { NavArrowDown, NavArrowRight } from 'iconoir-react'
import type { DbPackingItem } from '@travyl/shared'
import { getCategoryLabel } from './utils'
import { PackingItem } from './PackingItem'

interface PackingCategoryProps {
  category: string
  items: DbPackingItem[]
  onToggle: (id: string) => void
  onIncrementPacked: (id: string) => void
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  onClaim?: (id: string) => void
  onRelease?: (id: string) => void
  currentUserId?: string
  defaultExpanded?: boolean
}

export function PackingCategory({
  category,
  items,
  onToggle,
  onIncrementPacked,
  onUpdateQuantity,
  onRemove,
  onClaim,
  onRelease,
  currentUserId,
  defaultExpanded = true,
}: PackingCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const packedUnits = items.reduce((s, i) => s + i.packed_count, 0)
  const totalUnits = items.reduce((s, i) => s + i.quantity, 0)

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors duration-150 group"
      >
        {isExpanded ? (
          <NavArrowDown width={14} height={14} className="text-gray-400 shrink-0 transition-transform duration-200" />
        ) : (
          <NavArrowRight width={14} height={14} className="text-gray-400 shrink-0 transition-transform duration-200" />
        )}

        <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-gray-400 flex-1 text-left">
          {getCategoryLabel(category)}
        </span>

        <span className="text-xs tabular-nums text-gray-400">
          {packedUnits}/{totalUnits}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <motion.div layout className="pt-0.5">
              <AnimatePresence>
                {items.map((item) => (
                  <PackingItem
                    key={item.id}
                    item={item}
                    onToggle={onToggle}
                    onIncrementPacked={onIncrementPacked}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemove={onRemove}
                    onClaim={onClaim}
                    onRelease={onRelease}
                    currentUserId={currentUserId}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

### 2c. `PackingCategoryList.tsx`

- [ ] **Step 2c.1: Read the current file to understand its props**

```bash
cat apps/web/components/packing/PackingCategoryList.tsx
```

- [ ] **Step 2c.2: Drop `suggestionsByCategory` and the suggestion-related props/render**

The current props include `suggestionsByCategory`, `onAcceptSuggestion`, `onDismissSuggestion`, `isGenerating`. After the redesign, those move to `PackingSuggestions`. Replace the file with:

```tsx
'use client'

import { motion, AnimatePresence } from 'motion/react'
import type { DbPackingItem } from '@travyl/shared'
import { PackingCategory } from './PackingCategory'

interface PackingCategoryListProps {
  orderedCategories: string[]
  itemsByCategory: Record<string, DbPackingItem[]>
  onToggle: (id: string) => void
  onIncrementPacked: (id: string) => void
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  onClaim?: (id: string) => void
  onRelease?: (id: string) => void
  currentUserId?: string
}

export function PackingCategoryList({
  orderedCategories,
  itemsByCategory,
  onToggle,
  onIncrementPacked,
  onUpdateQuantity,
  onRemove,
  onClaim,
  onRelease,
  currentUserId,
}: PackingCategoryListProps) {
  if (orderedCategories.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">
        No items yet — add one above.
      </div>
    )
  }

  return (
    <motion.div layout className="flex flex-col gap-1">
      <AnimatePresence>
        {orderedCategories.map((category) => {
          const items = itemsByCategory[category] ?? []
          if (items.length === 0) return null
          return (
            <PackingCategory
              key={category}
              category={category}
              items={items}
              onToggle={onToggle}
              onIncrementPacked={onIncrementPacked}
              onUpdateQuantity={onUpdateQuantity}
              onRemove={onRemove}
              onClaim={onClaim}
              onRelease={onRelease}
              currentUserId={currentUserId}
            />
          )
        })}
      </AnimatePresence>
    </motion.div>
  )
}
```

### 2d. `SuggestionChip.tsx`

- [ ] **Step 2d.1: Read the current file**

```bash
cat apps/web/components/packing/SuggestionChip.tsx
```

- [ ] **Step 2d.2: Restyle for the right-column Module context**

Tighter padding (the right column is narrower), preserved purple AI accent, theme-color "+ Add" link:

```tsx
'use client'

import { motion } from 'motion/react'
import { Sparks, Plus, Xmark } from 'iconoir-react'
import type { PackingSuggestion } from '@travyl/shared'

interface SuggestionChipProps {
  suggestion: PackingSuggestion
  onAccept: (id: string) => void
  onDismiss: (id: string) => void
}

export function SuggestionChip({ suggestion, onAccept, onDismiss }: SuggestionChipProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="group grid grid-cols-[18px_1fr_auto_22px] items-center gap-2.5 py-1.5 px-1.5 -mx-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
    >
      <div className="w-[18px] h-[18px] rounded-md bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 flex items-center justify-center">
        <Sparks width={10} height={10} />
      </div>
      <span className="text-[12px] text-gray-700 dark:text-gray-300 truncate">
        {suggestion.name}
      </span>
      <button
        onClick={() => onAccept(suggestion.id)}
        className="text-[11px] font-semibold text-[var(--trip-base)] hover:underline flex items-center gap-1"
      >
        <Plus width={11} height={11} />
        Add
      </button>
      <button
        onClick={() => onDismiss(suggestion.id)}
        aria-label="Dismiss suggestion"
        className="text-gray-300 hover:text-red-500 transition-colors flex items-center justify-center"
      >
        <Xmark width={11} height={11} />
      </button>
    </motion.div>
  )
}
```

### 2e. Verify + commit

- [ ] **Step 2e.1: Typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | head -10
```

Expected: typecheck may fail because `PackingPage.tsx` still passes `suggestionsByCategory` and other dropped props to `PackingCategoryList`, and `PackingCategoryList` may still import `SuggestionChip`. **Don't fix those failures yet** — they're addressed in Task 5/6. The errors should be limited to those callsites.

- [ ] **Step 2e.2: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/packing/PackingItem.tsx apps/web/components/packing/PackingCategory.tsx apps/web/components/packing/PackingCategoryList.tsx apps/web/components/packing/SuggestionChip.tsx
git commit -m "Restyle packing item/category/list/chip to theme color + drop inline AI"
```

---

## Task 3: `SpotlightSearch` — `forwardRef` + restyle

**Files:**
- Modify: `apps/web/components/packing/SpotlightSearch.tsx`

- [ ] **Step 3.1: Read the current file**

```bash
cat apps/web/components/packing/SpotlightSearch.tsx
```

Identify the trigger input element + the dropdown. The component needs:
1. A `forwardRef` wrapper exposing `{ focus(): void }`.
2. The trigger input restyled to match Settings' `Input` (h-11, rounded-xl, theme focus ring).
3. Dropdown styling that uses theme color (no `var(--cal-*)`).

- [ ] **Step 3.2: Wrap in `forwardRef`**

The current export is `export function SpotlightSearch(...)`. Change it to:

```tsx
import { forwardRef, useImperativeHandle, useRef, /* existing imports */ } from 'react'

export interface SpotlightSearchHandle {
  focus: () => void
}

export const SpotlightSearch = forwardRef<SpotlightSearchHandle, SpotlightSearchProps>(function SpotlightSearch(
  { existingItems, onAddItem }: SpotlightSearchProps,
  ref,
) {
  const triggerInputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    focus: () => triggerInputRef.current?.focus(),
  }), [])

  // ... rest of component ...

  return (
    <input
      ref={triggerInputRef}
      // ... rest of props ...
    />
  )
})
```

(Adapt the structure to whatever the existing component's outer element is. If the trigger is a `<button>` that opens a modal-style search, `focus()` should focus that button instead.)

- [ ] **Step 3.3: Restyle the trigger to match Settings' Input**

The current trigger likely has classes like `text-[var(--cal-text-muted)]`, `border-[var(--cal-border)]`, etc. Replace with Settings' Input pattern:

```
className="w-full h-11 rounded-xl border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] px-4 text-[14px] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--trip-base)]/20 focus:border-[var(--trip-base)]/50 transition"
```

Strip any `var(--cal-*)` references throughout. The dropdown overlay (if any) should use `bg-white dark:bg-[#1a2230] border-gray-200 dark:border-white/10 rounded-xl shadow-xl`. Highlighted dropdown row: `bg-[rgb(var(--trip-base-rgb)/0.08)] text-[var(--trip-base)]`.

- [ ] **Step 3.4: Typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | head -10
```

Expected: still has unrelated errors in `PackingPage.tsx` (Task 6 fixes those). The `SpotlightSearch` itself should typecheck cleanly.

- [ ] **Step 3.5: Commit**

```bash
git add apps/web/components/packing/SpotlightSearch.tsx
git commit -m "SpotlightSearch: forwardRef + Settings-style input"
```

---

## Task 4: `PackingActivityFeed` — strip outer header

**Files:**
- Modify: `apps/web/components/packing/PackingActivityFeed.tsx`

- [ ] **Step 4.1: Read the current file**

```bash
cat apps/web/components/packing/PackingActivityFeed.tsx
```

Note its current structure: probably has its own header with a title + collapsible chevron. After this redesign it lives inside a Module that already provides those affordances — strip them.

- [ ] **Step 4.2: Replace the file**

```tsx
'use client'

import type { PackingAuditEntry } from '@travyl/shared'
import { stringToColor } from './utils'

interface PackingActivityFeedProps {
  entries: PackingAuditEntry[]
  currentUserId?: string
  maxVisible?: number
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`

  return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

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

export function PackingActivityFeed({ entries, currentUserId, maxVisible = 6 }: PackingActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <p className="text-[12px] text-gray-400 py-2">
        No activity yet — start packing to see updates here.
      </p>
    )
  }

  const visible = entries.slice(0, maxVisible)

  return (
    <div className="flex flex-col">
      {visible.map((entry, idx) => {
        const displayName = entry.user_display_name ?? 'User'
        const avatarColor = stringToColor(displayName)
        const isMe = entry.user_id === currentUserId
        return (
          <div
            key={`${entry.created_at}-${idx}`}
            className="flex items-center gap-2.5 py-2 text-[12px] text-gray-600 dark:text-gray-300"
          >
            <span
              className="shrink-0 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-semibold text-white"
              style={{ backgroundColor: avatarColor }}
              title={displayName}
            >
              {displayName[0].toUpperCase()}
            </span>
            <span className="flex-1 min-w-0 truncate">
              <span className="font-semibold text-[var(--trip-base)]">
                {isMe ? 'You' : displayName}
              </span>{' '}
              {actionLabel(entry.action)}{' '}
              <span className="text-gray-900 dark:text-gray-100">{entry.item_name}</span>
            </span>
            <span className="text-[10px] text-gray-300 shrink-0 tabular-nums">
              {formatRelativeTime(entry.created_at)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

If the existing `PackingAuditEntry` type has different field names than `user_display_name`, `user_id`, `item_name`, `created_at`, `action` — read its definition first (`grep -rn "interface PackingAuditEntry\|type PackingAuditEntry" packages/shared/src`) and adjust accordingly.

- [ ] **Step 4.3: Commit**

```bash
git add apps/web/components/packing/PackingActivityFeed.tsx
git commit -m "Strip activity feed outer header; flat list rendering for Module context"
```

---

## Task 5: New components — `PackingGlance`, `PackingSuggestions`, `PackingListModule`

**Files:**
- Create: `apps/web/components/packing/PackingGlance.tsx`
- Create: `apps/web/components/packing/PackingSuggestions.tsx`
- Create: `apps/web/components/packing/PackingListModule.tsx`

### 5a. `PackingGlance`

- [ ] **Step 5a.1: Create `PackingGlance.tsx`**

```tsx
'use client'

import type { Trip, TravelerMetadata } from '@travyl/shared'

interface PackingGlanceProps {
  trip: Trip | null | undefined
  packed: number
  total: number
  percent: number
}

function daysUntil(dateStr?: string | null): { value: number; label: string } | null {
  if (!dateStr) return null
  const start = new Date(dateStr)
  const today = new Date()
  const diffMs = start.getTime() - today.getTime()
  const days = Math.ceil(diffMs / 86400000)
  if (days > 0) return { value: days, label: 'until trip' }
  return { value: 0, label: 'trip in progress' }
}

function avgTemp(forecast: { high?: number }[] | undefined): { value: string; label: string } {
  if (!forecast || forecast.length === 0) return { value: '—', label: 'no forecast' }
  const sum = forecast.reduce((s, d) => s + (d.high ?? 0), 0)
  const avg = Math.round(sum / forecast.length)
  const label = avg > 22 ? 'light packing' : avg < 12 ? 'layer up' : 'moderate'
  return { value: `${avg}°`, label }
}

function travelerSub(t: number | undefined, metadata: TravelerMetadata | undefined): string {
  if (!metadata) return 'travelers'
  const parts: string[] = []
  if (metadata.adults) parts.push(`${metadata.adults} adult${metadata.adults === 1 ? '' : 's'}`)
  if (metadata.children) parts.push(`${metadata.children} kid${metadata.children === 1 ? '' : 's'}`)
  if (metadata.infants) parts.push(`${metadata.infants} infant${metadata.infants === 1 ? '' : 's'}`)
  return parts.join(' · ') || 'travelers'
}

interface StatProps {
  label: string
  value: string | number
  sub: string
}

function Stat({ label, value, sub }: StatProps) {
  return (
    <div className="bg-[#fafaf7] dark:bg-white/[0.02] rounded-xl p-3">
      <div className="text-[9px] uppercase tracking-[0.1em] font-semibold text-gray-400 mb-1">{label}</div>
      <div className="font-serif text-[22px] font-normal text-gray-900 dark:text-white leading-tight tabular-nums">{value}</div>
      <div className="text-[10px] text-gray-400 mt-1">{sub}</div>
    </div>
  )
}

export function PackingGlance({ trip, packed, total, percent }: PackingGlanceProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = (trip?.trip_context as any) ?? {}
  const days = daysUntil(trip?.start_date)
  const temp = avgTemp(ctx.weather?.forecast)
  const travelersMeta = ctx.travelers as TravelerMetadata | undefined

  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Stat label="Days left" value={days?.value ?? '—'} sub={days?.label ?? 'no dates'} />
      <Stat label="Avg temp" value={temp.value} sub={temp.label} />
      <Stat label="Packed" value={`${packed}/${total}`} sub={`${percent}%`} />
      <Stat label="Travelers" value={trip?.travelers ?? 1} sub={travelerSub(trip?.travelers, travelersMeta)} />
    </div>
  )
}
```

### 5b. `PackingSuggestions`

- [ ] **Step 5b.1: Create `PackingSuggestions.tsx`**

```tsx
'use client'

import { AnimatePresence } from 'motion/react'
import { Sparks } from 'iconoir-react'
import type { PackingSuggestion } from '@travyl/shared'
import { SuggestionChip } from './SuggestionChip'

interface PackingSuggestionsProps {
  suggestionsByCategory: Record<string, PackingSuggestion[]>
  isGenerating: boolean
  hasGenerated: boolean
  onAccept: (id: string) => void
  onDismiss: (id: string) => void
  maxVisible?: number
}

export function PackingSuggestions({
  suggestionsByCategory,
  isGenerating,
  hasGenerated,
  onAccept,
  onDismiss,
  maxVisible = 6,
}: PackingSuggestionsProps) {
  const flat = Object.values(suggestionsByCategory).flat()
  const visible = flat.slice(0, maxVisible)

  if (isGenerating && flat.length === 0) {
    return (
      <div className="flex flex-col gap-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-7 rounded-lg bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
        ))}
      </div>
    )
  }

  if (flat.length === 0) {
    return (
      <p className="text-[12px] text-gray-400 py-2">
        {hasGenerated
          ? 'All caught up — nothing new to suggest right now.'
          : 'Tap More to get AI suggestions based on your trip.'}
      </p>
    )
  }

  return (
    <div className="flex flex-col">
      <AnimatePresence>
        {visible.map((suggestion) => (
          <SuggestionChip
            key={suggestion.id}
            suggestion={suggestion}
            onAccept={onAccept}
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
      {flat.length > visible.length && (
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          +{flat.length - visible.length} more
        </p>
      )}
    </div>
  )
}

export function SuggestionsHeaderAction({
  onGenerate,
  isGenerating,
}: {
  onGenerate: () => void
  isGenerating: boolean
}) {
  return (
    <button
      onClick={onGenerate}
      disabled={isGenerating}
      className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--trip-base)] hover:bg-[rgb(var(--trip-base-rgb)/0.08)] px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      <Sparks width={11} height={11} />
      {isGenerating ? 'Thinking…' : 'More'}
    </button>
  )
}
```

### 5c. `PackingListModule`

- [ ] **Step 5c.1: Create `PackingListModule.tsx`**

```tsx
'use client'

import { forwardRef } from 'react'
import type { DbPackingItem } from '@travyl/shared'
import { SpotlightSearch, type SpotlightSearchHandle } from './SpotlightSearch'
import { PackingCategoryList } from './PackingCategoryList'

export interface PackingListModuleProps {
  filterBy: string
  onFilterChange: (next: string) => void
  isLoggedIn: boolean
  existingItems: DbPackingItem[]
  onAddItem: (name: string, category: string) => void
  orderedCategories: string[]
  itemsByCategory: Record<string, DbPackingItem[]>
  onToggle: (id: string) => void
  onIncrementPacked: (id: string) => void
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  onClaim?: (id: string) => void
  onRelease?: (id: string) => void
  currentUserId?: string
}

export const PackingListModule = forwardRef<SpotlightSearchHandle, PackingListModuleProps>(function PackingListModule(
  props,
  searchRef,
) {
  const {
    filterBy, onFilterChange, isLoggedIn,
    existingItems, onAddItem,
    orderedCategories, itemsByCategory,
    onToggle, onIncrementPacked, onUpdateQuantity, onRemove, onClaim, onRelease, currentUserId,
  } = props

  const filters = isLoggedIn
    ? ['all', 'mine', 'shared', 'adults', 'kids']
    : ['all', 'adults', 'kids']

  const filterLabel = (f: string) =>
    f === 'all' ? 'All'
    : f === 'mine' ? 'My items'
    : f.charAt(0).toUpperCase() + f.slice(1)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        {filters.map((f) => {
          const active = filterBy === f
          return (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                active
                  ? 'bg-[var(--trip-base)] text-white'
                  : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.08]'
              }`}
            >
              {filterLabel(f)}
            </button>
          )
        })}
      </div>

      <SpotlightSearch ref={searchRef} existingItems={existingItems} onAddItem={onAddItem} />

      <PackingCategoryList
        orderedCategories={orderedCategories}
        itemsByCategory={itemsByCategory}
        onToggle={onToggle}
        onIncrementPacked={onIncrementPacked}
        onUpdateQuantity={onUpdateQuantity}
        onRemove={onRemove}
        onClaim={onClaim}
        onRelease={onRelease}
        currentUserId={currentUserId}
      />
    </div>
  )
})
```

### 5d. Verify + commit

- [ ] **Step 5d.1: Typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | head -10
```

Expected: still has errors in `PackingPage.tsx` (fixed in Task 6). The 3 new files should typecheck clean.

- [ ] **Step 5d.2: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/packing/PackingGlance.tsx apps/web/components/packing/PackingSuggestions.tsx apps/web/components/packing/PackingListModule.tsx
git commit -m "Add PackingGlance, PackingSuggestions, PackingListModule"
```

---

## Task 6: Rewrite `PackingPage.tsx` orchestrator

**Files:**
- Modify: `apps/web/components/packing/PackingPage.tsx` (full rewrite)

The new orchestrator: 12-col grid, 4 Modules, sticky right column. Auto-seed effect preserved verbatim.

- [ ] **Step 6.1: Read the current file (you'll need the seed effect)**

```bash
cat apps/web/components/packing/PackingPage.tsx
```

Copy the auto-seed `useEffect` block — you'll paste it into the new file.

- [ ] **Step 6.2: Replace `PackingPage.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import {
  usePackingList,
  usePackingSuggestions,
  useItineraryScreen,
  useAuthStore,
  supabase,
  seedDefaultPackingItems,
} from '@travyl/shared'
import { Module } from '@/components/trip/Module'
import { PackingListModule } from './PackingListModule'
import { PackingGlance } from './PackingGlance'
import { PackingSuggestions, SuggestionsHeaderAction } from './PackingSuggestions'
import { PackingActivityFeed } from './PackingActivityFeed'
import type { SpotlightSearchHandle } from './SpotlightSearch'

interface PackingPageProps {
  tripId: string
}

export function PackingPage({ tripId }: PackingPageProps) {
  const { user } = useAuthStore()
  const userId = user?.id
  const [filterBy, setFilterBy] = useState<string>('all')
  const { trip } = useItineraryScreen(tripId)
  const queryClient = useQueryClient()
  const searchRef = useRef<SpotlightSearchHandle>(null)

  const {
    items,
    filteredItems,
    auditLog,
    progress,
    isLoading,
    error,
    addItem,
    togglePacked,
    incrementPacked,
    updateQuantity,
    removeItem,
    claimItem,
    releaseItem,
  } = usePackingList(tripId, userId, filterBy)

  // Auto-seed default items once when the trip's packing_items table is empty.
  // Preserved verbatim from the previous version.
  const seedAttempted = useRef(false)
  useEffect(() => {
    if (seedAttempted.current) return
    if (isLoading || !trip || !userId || !tripId) return
    if (items.length > 0) { seedAttempted.current = true; return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (trip.trip_context as any) || {}
    if (ctx.packing_seeded) { seedAttempted.current = true; return }
    seedAttempted.current = true
    ;(async () => {
      try {
        const days = trip.start_date && trip.end_date
          ? Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000))
          : (ctx.weather?.forecast?.length ?? 5)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const forecast: any[] = ctx.weather?.forecast ?? []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const avgTemp = forecast.length > 0
          ? forecast.reduce((sum: number, d: any) => sum + (d.high ?? 20), 0) / forecast.length
          : 20
        const isWarm = avgTemp > 22
        const isCold = avgTemp < 12
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasRain = forecast.some((d: any) => (d.conditions || d.icon || '').toLowerCase().includes('rain'))
        await seedDefaultPackingItems(tripId, userId, { days, isWarm, isCold, hasRain })
        await supabase.from('trips').update({ trip_context: { ...ctx, packing_seeded: true } }).eq('id', tripId)
        queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
        queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
      } catch (e) {
        console.error('Failed to seed packing items', e)
        seedAttempted.current = false
      }
    })()
  }, [isLoading, trip, userId, tripId, items.length, queryClient])

  const {
    suggestionsByCategory,
    isGenerating,
    hasGenerated,
    generateSuggestions,
    acceptSuggestion,
    dismissSuggestion,
  } = usePackingSuggestions(
    tripId,
    items,
    addItem as (name: string, category: string) => void,
  )

  // Compute itemsByCategory + ordered category list from filteredItems
  const filteredItemsByCategory: Record<string, typeof filteredItems> = {}
  for (const item of filteredItems) {
    if (!filteredItemsByCategory[item.category]) filteredItemsByCategory[item.category] = []
    filteredItemsByCategory[item.category].push(item)
  }
  const orderedCategories = Object.keys(filteredItemsByCategory)

  if (error) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-10 py-12">
        <Module title="Packing" description="Failed to load packing list.">
          <p className="text-sm text-red-500 dark:text-red-400">Try refreshing the page.</p>
        </Module>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-10 py-12">
        <Module title="Packing list" description="Loading…">
          <div className="h-40 animate-pulse bg-gray-100 dark:bg-white/[0.04] rounded-xl" />
        </Module>
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left column — packing list */}
        <div className="lg:col-span-7">
          <Module
            title="Packing list"
            description={`${progress.packed} of ${progress.total} items packed`}
            action={
              <button
                onClick={() => searchRef.current?.focus()}
                className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
                style={{ backgroundColor: 'var(--trip-base)' }}
              >
                <Plus size={13} /> Item
              </button>
            }
          >
            {/* Progress bar — sits between description and body */}
            <div className="-mt-2 mb-5 flex items-center gap-3 text-[11px] text-gray-500">
              <div className="flex-1 h-[4px] rounded-full bg-[#f0eee9] dark:bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%`, backgroundColor: 'var(--trip-base)' }}
                />
              </div>
              <span className="font-semibold tabular-nums text-[var(--trip-base)]">{progress.percent}%</span>
            </div>

            <PackingListModule
              ref={searchRef}
              filterBy={filterBy}
              onFilterChange={setFilterBy}
              isLoggedIn={!!userId}
              existingItems={items}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onAddItem={(name: string, category: string) => addItem(name, category as any, filterBy === 'mine')}
              orderedCategories={orderedCategories}
              itemsByCategory={filteredItemsByCategory}
              onToggle={togglePacked}
              onIncrementPacked={incrementPacked}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
              onClaim={claimItem}
              onRelease={releaseItem}
              currentUserId={userId}
            />
          </Module>
        </div>

        {/* Right column — sticky stack */}
        <div className="lg:col-span-5 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto space-y-6 lg:space-y-6">
          <Module title="At a glance" titleSize="sm">
            <PackingGlance
              trip={trip}
              packed={progress.packed}
              total={progress.total}
              percent={progress.percent}
            />
          </Module>

          <Module
            title="Suggestions"
            description="From AI based on your trip"
            titleSize="sm"
            action={<SuggestionsHeaderAction onGenerate={generateSuggestions} isGenerating={isGenerating} />}
          >
            <PackingSuggestions
              suggestionsByCategory={suggestionsByCategory}
              isGenerating={isGenerating}
              hasGenerated={hasGenerated}
              onAccept={acceptSuggestion}
              onDismiss={dismissSuggestion}
            />
          </Module>

          <Module
            title="Activity"
            titleSize="sm"
            description={auditLog.length > 0 ? `Last ${Math.min(auditLog.length, 6)} of ${auditLog.length}` : undefined}
          >
            <PackingActivityFeed entries={auditLog} currentUserId={userId} />
          </Module>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6.3: Typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | head -20
```

Expected: clean for the packing files. Pre-existing errors in `app/(main)/page.tsx` and `TakeoffScene3D` are fine.

- [ ] **Step 6.4: Visual check** (the moment of truth)

In the browser, open `http://localhost:3001/trip/<id>/packing`:
- Two columns at md+: Packing list on the left (col-span-7), three Modules stacked on the right (col-span-5).
- Right column stays put when you scroll the list (sticky).
- Module titles: 26px serif on the left "Packing list", 17px serif on the three right Modules.
- Filter chips at top of the list. Active chip is theme-color background.
- SpotlightSearch matches Settings' input style (h-11, rounded-xl).
- Click "+ Item" → SpotlightSearch focuses.
- Categories collapsible.
- Item checkboxes use theme color when packed.
- Ownership pills: theme-color tint for "Mine", neutral gray for everything else. No blue/orange/teal/pink anywhere.
- AI suggestions only appear in the right Suggestions Module — not inline within categories.
- Activity feed shows latest 6 entries.
- "+ More" button in Suggestions header generates suggestions.
- Resize narrow → single column, modules stack.

If anything breaks, fix it before committing.

- [ ] **Step 6.5: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/packing/PackingPage.tsx
git commit -m "Rewrite PackingPage as 12-col dashboard with 4 Modules"
```

---

## Task 7: Cleanup — delete unused files + update index

**Files:**
- Delete: `apps/web/components/packing/PackingPanel.tsx`
- Delete: `apps/web/components/packing/PackingProgress.tsx`
- Modify: `apps/web/components/packing/index.ts`

- [ ] **Step 7.1: Confirm no references**

```bash
grep -rn "PackingPanel\|PackingProgress" apps/web --include="*.tsx" --include="*.ts" | grep -v ".next"
```

Expected: only references inside the files being deleted + the index.ts. If anything else references them, fix first.

- [ ] **Step 7.2: Delete the files**

```bash
git rm apps/web/components/packing/PackingPanel.tsx apps/web/components/packing/PackingProgress.tsx
```

- [ ] **Step 7.3: Update `index.ts`**

Replace `apps/web/components/packing/index.ts` with:

```ts
export { PackingPage } from './PackingPage'
export { PackingItem } from './PackingItem'
export { PackingCategory } from './PackingCategory'
export { PackingCategoryList } from './PackingCategoryList'
export { PackingListModule } from './PackingListModule'
export { PackingGlance } from './PackingGlance'
export { PackingSuggestions, SuggestionsHeaderAction } from './PackingSuggestions'
export { SpotlightSearch, type SpotlightSearchHandle } from './SpotlightSearch'
export { PackingActivityFeed } from './PackingActivityFeed'
export { getCategoryLabel, isStaticCategory, stringToColor } from './utils'
```

- [ ] **Step 7.4: Typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | head -10
```

Expected: clean. If the deletions broke anything, fix.

- [ ] **Step 7.5: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/packing/index.ts
git commit -m "Remove unused PackingPanel and PackingProgress; update packing exports"
```

---

## Task 8: Suite + lint + push

- [ ] **Step 8.1: Run all web tests**

```bash
cd apps/web && npx vitest run 2>&1 | tail -10
```

Expected: 45/45 pass (no new tests added in this work — pure-logic helpers were not extracted).

- [ ] **Step 8.2: Lint the new + modified files**

```bash
cd apps/web && npx eslint components/trip/Module.tsx components/packing/ 2>&1 | tail -20
```

Expected: clean. Pre-existing repo lint debt elsewhere is out of scope. If a new lint warning appears in your changes (most likely `react-hooks/exhaustive-deps`), fix it.

- [ ] **Step 8.3: Push**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git push origin develop
```

No PR — Noah ships directly on develop.

---

## Out of Scope (deferred)

- "Show all" activity dialog when `auditLog.length > 6` — spec § 4.5. Defer to a follow-up; the truncated 6-entry view is sufficient for the first cut.
- Category labels next to each suggestion chip in the right column — spec § 6 "non-goal", but flagged by spec reviewer as a minor UX rough edge.
- New collaboration features (per-day claims, splits, transfers UI improvements).
- AI suggestion backend changes.
- Mobile gesture polish.
- Tests for the new components — vitest in `node` env can't render JSX without infrastructure additions that are out of scope.

## Risk Notes

- **Sticky right column on tall lists.** When the packing list grows past viewport height, the right column's `lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto` keeps it scrollable in place. Verify this manually on a long list (15+ items).
- **`PackingAuditEntry` field names.** The new `PackingActivityFeed` assumes `user_display_name`, `user_id`, `item_name`, `created_at`, `action`. If the actual type uses different names, the implementer will see a typecheck error — fix by matching the real shape.
- **`SpotlightSearch` trigger element.** If the existing component opens a modal-style search rather than rendering an inline input, the `forwardRef` `focus()` should focus the modal trigger button, not a hidden input. Inspect the file before forcing a specific structure.
- **`stringToColor` per-user avatar colors** stay multi-color by design — that's a useful per-user affordance, not theme-discipline weakness.
- **Theme color via `var(--trip-base-rgb)`.** The CSS var is set by `TripThemeProvider` already in scope. If for some reason it's missing, tints fall through to `rgb(/0.1)` which is invalid CSS and renders transparent — degrade-to-invisible, not breaking.
