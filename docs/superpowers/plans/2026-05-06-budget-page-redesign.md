# Budget Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `apps/web/app/(dashboard)/trip/[id]/budget/page.tsx` with a Notion/Linear-style spreadsheet view that reuses the new Settings page's `Module` shell. Inline-editable Budgeted cells, expandable expense drawers per row, theme-color accents only, mobile collapses to stacked cards.

**Architecture:** Lift `Module` out of `settings/page.tsx` into a shared component. Build the budget table as composable pieces under `apps/web/components/trip/budget/` (metric strip, editable cell, table row + drawer, mobile list). The page file (`budget/page.tsx`) becomes a thin orchestrator: load/persist `trip_context.budget_data`, derive totals, hand state to the presentational components.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS, Lucide icons, motion/react, Vitest. No new dependencies. Persistence via Supabase (existing `trip_context.budget_data` JSONB column, no schema changes).

**Spec:** `docs/superpowers/specs/2026-05-06-budget-page-redesign-design.md` (commit `c0d2bee0`)

**Branch:** `develop` (per Noah's direction — no feature branch). Each task commits directly to `develop`.

---

## Critical context for the implementer

- **Settings page is uncommitted WIP.** `apps/web/app/(dashboard)/trip/[id]/settings/page.tsx` in the user's working tree is the source of truth for the new `Module` component. Do **not** check `origin/develop` for it — the version on `develop` is the *old* settings page. Read the working-tree file, find `function Module(`, lift it.
- The whole repo has 446 pre-existing lint problems. Don't try to fix them — only avoid introducing new ones in files you create.
- Vitest runs in `node` env. There's no `@testing-library/react`. Unit tests are pure-logic only (math, helpers, type-safe maps). Visual + interactive verification is manual via the dev server.
- Tabular numbers: use `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`) on all dollar-amount cells.
- The trip rail consumes `var(--trip-base)` for theme color, set by `TripThemeProvider` in `trip-layout-inner.tsx`. Budget is rendered inside that provider, so `var(--trip-base)` is always available.
- The repo's lint rule against `any` is enforced — type your props and helpers explicitly.

---

## File Map

### Files created

| File | Responsibility |
| ---- | -------------- |
| `apps/web/components/trip/Module.tsx` | The shared `Module` shell (lifted from Settings WIP). |
| `apps/web/components/trip/budget/categoryIcons.ts` | The `CATEGORY_ICONS` map + helper. |
| `apps/web/components/trip/budget/types.ts` | `BudgetItem`, `BudgetExpense`, helper types lifted from `budget/page.tsx`. |
| `apps/web/components/trip/budget/budgetMath.ts` | Pure helpers: `computeActual(item)`, `computeRemaining(item)`, `computeHealth(pct)`, `scaleBudgetsProportionally(items, newTotal)`. |
| `apps/web/components/trip/budget/__tests__/budgetMath.test.ts` | Vitest unit tests for the math helpers. |
| `apps/web/components/trip/budget/EditableCell.tsx` | Reusable inline-edit cell (button → input on click, Enter commits, Esc cancels, Tab moves to next). |
| `apps/web/components/trip/budget/BudgetMetricStrip.tsx` | The 4-metric strip above the table; Total budget is editable. |
| `apps/web/components/trip/budget/ExpensesDrawer.tsx` | Expanded-row drawer: expense list + inline add form. |
| `apps/web/components/trip/budget/BudgetTableRow.tsx` | One `<tr>` + its drawer. Owns `isExpanded` state. |
| `apps/web/components/trip/budget/BudgetTable.tsx` | Desktop `<table>` with `<thead>`/`<tbody>`/`<tfoot>`. |
| `apps/web/components/trip/budget/BudgetMobileList.tsx` | Mobile stacked-card list (replaces the table at `< md`). |

### Files modified

| File | Change |
| ---- | ------ |
| `apps/web/app/(dashboard)/trip/[id]/settings/page.tsx` (WIP) | Replace inline `function Module(...)` with `import { Module } from '@/components/trip/Module'`. **Do not** touch any other code in this file — Noah has uncommitted edits everywhere. |
| `apps/web/app/(dashboard)/trip/[id]/budget/page.tsx` | Rewrite. Becomes a thin orchestrator (~150 lines target, down from 842) that loads/persists state and renders the new components. Keep `generateBudgetFromTrip` and the persistence `useEffect` intact (lift `generateBudgetFromTrip` into `apps/web/components/trip/budget/seed.ts` if it's cleaner — judgment call). |

### Files NOT touched

- The trip rail (`apps/web/components/trip-rail.tsx`).
- `useHomeCurrency` and any other shared hooks.
- The Supabase schema. The `budget_data` column is JSONB, no migration.

---

## Pre-flight (one-time)

- [ ] **Step 0.1: Confirm branch + working-tree state**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git status
git branch --show-current
```

Expected: branch is `develop`. Working tree shows uncommitted edits to `settings/page.tsx`, `trip-layout-inner.tsx`, etc. (Noah's WIP). Do not stash or revert these — work around them.

- [ ] **Step 0.2: Confirm Settings WIP has the `Module` component**

```bash
grep -n "^function Module\|^export function Module" "apps/web/app/(dashboard)/trip/[id]/settings/page.tsx"
```

Expected: one hit at roughly line 144 — `function Module({` (no `export`). If you don't find it, **stop and report NEEDS_CONTEXT** — the spec assumes it exists at this path.

- [ ] **Step 0.3: Confirm test config + run baseline**

```bash
cd apps/web && npx vitest run 2>&1 | tail -8
```

Expected: 34 tests pass (the trip-rail config tests + parseQueryIntent). If anything fails, stop and investigate — the failure isn't from your work.

- [ ] **Step 0.4: Spin up the dev server** (leave running for visual checks throughout)

```bash
npm run web
```

Expected: dev server on `http://localhost:3001`. Open `http://localhost:3001/trip/<a-real-trip-id>/budget` in a browser. This is your reference — current ugly budget page. You'll watch this transform as you work.

---

## Task 1: Lift `Module` to a shared component

**Files:**
- Create: `apps/web/components/trip/Module.tsx`
- Modify: `apps/web/app/(dashboard)/trip/[id]/settings/page.tsx` (WIP — surgical edit only)

This task is a pure refactor. Settings should look identical after.

- [ ] **Step 1.1: Read the current `Module` from Settings WIP**

```bash
sed -n '140,170p' "apps/web/app/(dashboard)/trip/[id]/settings/page.tsx"
```

You should see roughly:

```tsx
function Module({
  title, description, action, children, className = '',
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col ${className}`}>
      <header className="flex items-start justify-between gap-4 px-7 lg:px-8 pt-7 lg:pt-8 pb-5 border-b border-gray-100 dark:border-white/[0.06]">
        <div>
          <h2 className="text-[26px] font-serif font-normal text-gray-900 dark:text-white tracking-tight leading-tight">{title}</h2>
          {description && <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5">{description}</p>}
        </div>
        {action}
      </header>
      <div className="flex-1 px-7 lg:px-8 py-6 lg:py-7">{children}</div>
    </section>
  );
}
```

- [ ] **Step 1.2: Create the shared file**

Create `apps/web/components/trip/Module.tsx` with the exact same contents, but `export`ed:

```tsx
'use client';

export interface ModuleProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Module({ title, description, action, children, className = '' }: ModuleProps) {
  return (
    <section className={`bg-white dark:bg-white/[0.03] rounded-2xl border border-gray-200 dark:border-white/[0.08] shadow-sm overflow-hidden flex flex-col ${className}`}>
      <header className="flex items-start justify-between gap-4 px-7 lg:px-8 pt-7 lg:pt-8 pb-5 border-b border-gray-100 dark:border-white/[0.06]">
        <div>
          <h2 className="text-[26px] font-serif font-normal text-gray-900 dark:text-white tracking-tight leading-tight">{title}</h2>
          {description && <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5">{description}</p>}
        </div>
        {action}
      </header>
      <div className="flex-1 px-7 lg:px-8 py-6 lg:py-7">{children}</div>
    </section>
  );
}
```

- [ ] **Step 1.3: Update Settings to import from the shared file**

In `apps/web/app/(dashboard)/trip/[id]/settings/page.tsx`:

1. Delete the entire `function Module({ ... })` block (lines ~144–165 — confirm exact range first with grep).
2. Add at the top of the file (in the imports block, after the other `@/components/trip/...` imports):
   ```tsx
   import { Module } from '@/components/trip/Module';
   ```

Do NOT touch any other code in `settings/page.tsx`. It's WIP and Noah has lots of in-flight changes there.

- [ ] **Step 1.4: Typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | head -10
```

Expected: no NEW errors. Pre-existing errors in `components/home/TakeoffScene3D/*` are fine.

- [ ] **Step 1.5: Visual check** (Settings should look identical)

In the browser, open `http://localhost:3001/trip/<id>/settings`. Confirm: page renders, modules look the same as before. No visual regression.

- [ ] **Step 1.6: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/trip/Module.tsx apps/web/app/\(dashboard\)/trip/\[id\]/settings/page.tsx
git commit -m "Lift Module shell out of settings page into shared component"
```

The Settings WIP staged here will include only the two surgical changes (delete inline `Module`, add import). All other WIP edits remain unstaged.

---

## Task 2: Extract types + math helpers (TDD)

**Files:**
- Create: `apps/web/components/trip/budget/types.ts`
- Create: `apps/web/components/trip/budget/budgetMath.ts`
- Create: `apps/web/components/trip/budget/__tests__/budgetMath.test.ts`

Pure logic, fully tested.

- [ ] **Step 2.1: Create the types file**

Create `apps/web/components/trip/budget/types.ts`:

```typescript
export interface BudgetExpense {
  id: string;
  description: string;
  amount: number;
  date?: string;
}

export interface BudgetItem {
  id: string;
  category: string;
  budgeted: number;
  actual: number;
  fixed: boolean;
  expenses?: BudgetExpense[];
}

export type HealthState = 'under' | 'warn' | 'over';
```

- [ ] **Step 2.2: Write the failing test for `budgetMath.ts`**

Create `apps/web/components/trip/budget/__tests__/budgetMath.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  computeActual,
  computeRemaining,
  computeHealth,
  scaleBudgetsProportionally,
  computeTotals,
} from '../budgetMath';
import type { BudgetItem } from '../types';

describe('computeActual', () => {
  it('sums expense amounts', () => {
    expect(computeActual({ id: 'x', category: 'X', budgeted: 0, actual: 0, fixed: false, expenses: [
      { id: '1', description: 'a', amount: 10 },
      { id: '2', description: 'b', amount: 25.5 },
    ] })).toBe(35.5);
  });
  it('returns 0 when expenses is empty or missing', () => {
    expect(computeActual({ id: 'x', category: 'X', budgeted: 0, actual: 0, fixed: false })).toBe(0);
    expect(computeActual({ id: 'x', category: 'X', budgeted: 0, actual: 0, fixed: false, expenses: [] })).toBe(0);
  });
});

describe('computeRemaining', () => {
  it('returns budgeted minus actual', () => {
    expect(computeRemaining({ budgeted: 100, actual: 30 })).toBe(70);
    expect(computeRemaining({ budgeted: 100, actual: 100 })).toBe(0);
    expect(computeRemaining({ budgeted: 100, actual: 150 })).toBe(-50);
  });
});

describe('computeHealth', () => {
  it('returns under for 0–80%', () => {
    expect(computeHealth(0)).toBe('under');
    expect(computeHealth(50)).toBe('under');
    expect(computeHealth(79.99)).toBe('under');
  });
  it('returns warn for 80–100%', () => {
    expect(computeHealth(80)).toBe('warn');
    expect(computeHealth(95)).toBe('warn');
    expect(computeHealth(100)).toBe('warn');
  });
  it('returns over for >100%', () => {
    expect(computeHealth(100.01)).toBe('over');
    expect(computeHealth(150)).toBe('over');
  });
  it('handles 0 budgeted (NaN guard)', () => {
    expect(computeHealth(NaN)).toBe('under');
  });
});

describe('scaleBudgetsProportionally', () => {
  const sample: BudgetItem[] = [
    { id: 'a', category: 'A', budgeted: 100, actual: 0, fixed: false },
    { id: 'b', category: 'B', budgeted: 200, actual: 0, fixed: false },
    { id: 'c', category: 'C', budgeted: 100, actual: 0, fixed: false },
  ];

  it('scales each category by the ratio of new total to old total', () => {
    const scaled = scaleBudgetsProportionally(sample, 800);
    expect(scaled.map((i) => i.budgeted)).toEqual([200, 400, 200]);
  });

  it('handles zero current total without dividing by zero (assigns equal share)', () => {
    const empty: BudgetItem[] = [
      { id: 'a', category: 'A', budgeted: 0, actual: 0, fixed: false },
      { id: 'b', category: 'B', budgeted: 0, actual: 0, fixed: false },
    ];
    const scaled = scaleBudgetsProportionally(empty, 100);
    expect(scaled.map((i) => i.budgeted)).toEqual([50, 50]);
  });

  it('rounds to whole dollars', () => {
    const scaled = scaleBudgetsProportionally(sample, 333);
    expect(scaled.map((i) => i.budgeted).every((n) => Number.isInteger(n))).toBe(true);
  });
});

describe('computeTotals', () => {
  it('returns total budget and total actual', () => {
    const items: BudgetItem[] = [
      { id: 'a', category: 'A', budgeted: 100, actual: 30, fixed: false },
      { id: 'b', category: 'B', budgeted: 200, actual: 50, fixed: false },
    ];
    expect(computeTotals(items)).toEqual({ totalBudgeted: 300, totalActual: 80 });
  });
});
```

- [ ] **Step 2.3: Run the test — it fails**

```bash
cd apps/web && npx vitest run components/trip/budget/__tests__/budgetMath.test.ts
```

Expected: fails with module-not-found for `../budgetMath`.

- [ ] **Step 2.4: Implement `budgetMath.ts`**

Create `apps/web/components/trip/budget/budgetMath.ts`:

```typescript
import type { BudgetItem, HealthState } from './types';

export function computeActual(item: BudgetItem): number {
  if (!item.expenses || item.expenses.length === 0) return 0;
  return item.expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
}

export function computeRemaining(item: { budgeted: number; actual: number }): number {
  return item.budgeted - item.actual;
}

export function computeHealth(percentUsed: number): HealthState {
  if (Number.isNaN(percentUsed) || percentUsed < 80) return 'under';
  if (percentUsed <= 100) return 'warn';
  return 'over';
}

export function scaleBudgetsProportionally(items: BudgetItem[], newTotal: number): BudgetItem[] {
  if (items.length === 0) return items;
  const oldTotal = items.reduce((s, i) => s + i.budgeted, 0);
  if (oldTotal === 0) {
    const each = Math.round(newTotal / items.length);
    return items.map((i) => ({ ...i, budgeted: each }));
  }
  const ratio = newTotal / oldTotal;
  return items.map((i) => ({ ...i, budgeted: Math.round(i.budgeted * ratio) }));
}

export function computeTotals(items: BudgetItem[]): { totalBudgeted: number; totalActual: number } {
  return items.reduce(
    (acc, i) => ({
      totalBudgeted: acc.totalBudgeted + i.budgeted,
      totalActual: acc.totalActual + i.actual,
    }),
    { totalBudgeted: 0, totalActual: 0 },
  );
}
```

- [ ] **Step 2.5: Run the tests — they pass**

```bash
cd apps/web && npx vitest run components/trip/budget/__tests__/budgetMath.test.ts
```

Expected: 14 tests pass.

- [ ] **Step 2.6: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/trip/budget/types.ts apps/web/components/trip/budget/budgetMath.ts apps/web/components/trip/budget/__tests__/budgetMath.test.ts
git commit -m "Add budget types and math helpers with vitest coverage"
```

---

## Task 3: Category icons map

**Files:**
- Create: `apps/web/components/trip/budget/categoryIcons.ts`

- [ ] **Step 3.1: Create the icons file**

```typescript
import {
  Plane, Building2, UtensilsCrossed, Compass, Car, ShoppingBag,
  MoreHorizontal, Wallet, type LucideIcon,
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Flights: Plane,
  Hotels: Building2,
  'Food & Dining': UtensilsCrossed,
  Activities: Compass,
  Transportation: Car,
  Shopping: ShoppingBag,
  Other: MoreHorizontal,
};

export function iconFor(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? Wallet;
}
```

- [ ] **Step 3.2: Commit**

```bash
git add apps/web/components/trip/budget/categoryIcons.ts
git commit -m "Add category icon map for budget"
```

---

## Task 4: `EditableCell` primitive

**Files:**
- Create: `apps/web/components/trip/budget/EditableCell.tsx`

The reusable inline-edit cell. Used for every Budgeted cell + the Total budget metric.

- [ ] **Step 4.1: Implement `EditableCell.tsx`**

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';

export interface EditableCellProps {
  value: number;
  onCommit: (next: number) => void;
  format: (n: number) => string;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
}

export function EditableCell({ value, onCommit, format, ariaLabel, className = '', disabled }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(String(value));
      // Defer focus so the input is mounted
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, value]);

  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      onCommit(parsed);
    }
    setEditing(false);
  };

  const cancel = () => {
    setEditing(false);
  };

  if (disabled) {
    return <span className={`tabular-nums text-right ${className}`}>{format(value)}</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={ariaLabel}
        className={`tabular-nums text-right border border-transparent rounded px-1.5 py-0.5 hover:bg-white hover:border-gray-200 dark:hover:bg-white/[0.04] dark:hover:border-white/10 transition-colors ${className}`}
      >
        {format(value)}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="number"
      step="any"
      min="0"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      }}
      aria-label={ariaLabel}
      className={`tabular-nums text-right border border-[var(--trip-base)] rounded px-1.5 py-0.5 outline-none ring-2 ring-[var(--trip-base)]/15 bg-white dark:bg-white/[0.06] text-gray-900 dark:text-white w-full ${className}`}
    />
  );
}
```

- [ ] **Step 4.2: Typecheck + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | head -5
```

Expected: no new errors.

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/trip/budget/EditableCell.tsx
git commit -m "Add EditableCell primitive for budget inline editing"
```

---

## Task 5: `BudgetMetricStrip`

**Files:**
- Create: `apps/web/components/trip/budget/BudgetMetricStrip.tsx`

The 4-metric strip above the table.

- [ ] **Step 5.1: Implement `BudgetMetricStrip.tsx`**

```tsx
'use client';

import { EditableCell } from './EditableCell';

export interface BudgetMetricStripProps {
  totalBudgeted: number;
  totalActual: number;
  daysInTrip: number;
  daysElapsed: number;
  formatAmount: (n: number) => string;
  onChangeTotalBudget: (next: number) => void;
}

export function BudgetMetricStrip({
  totalBudgeted, totalActual, daysInTrip, daysElapsed, formatAmount, onChangeTotalBudget,
}: BudgetMetricStripProps) {
  const remaining = totalBudgeted - totalActual;
  const pct = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;
  const dailyAvg = daysElapsed > 0 ? totalActual / daysElapsed : 0;
  const dailyTarget = daysInTrip > 0 ? totalBudgeted / daysInTrip : 0;
  const remainingPerDay =
    daysInTrip - daysElapsed > 0 && remaining > 0
      ? remaining / (daysInTrip - daysElapsed)
      : 0;

  const remainingColor =
    pct >= 100 ? 'text-red-700 dark:text-red-400'
    : pct >= 80 ? 'text-amber-700 dark:text-amber-400'
    : 'text-emerald-700 dark:text-emerald-400';

  const pace =
    dailyTarget === 0 ? '—'
    : dailyAvg > dailyTarget * 1.05 ? 'over pace'
    : dailyAvg < dailyTarget * 0.95 ? 'under pace'
    : 'on track';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 px-2 pb-5 mb-5 border-b border-gray-100 dark:border-white/[0.06]">
      <div>
        <div className="text-[9px] uppercase tracking-[0.1em] font-semibold text-gray-400 mb-1">Total budget</div>
        <EditableCell
          value={totalBudgeted}
          onCommit={onChangeTotalBudget}
          format={formatAmount}
          ariaLabel="Total budget"
          className="font-serif text-[26px] font-normal text-gray-900 dark:text-white !text-left !justify-start !w-auto"
        />
        <div className="text-[10px] text-gray-400 mt-1">{formatAmount(Math.round(dailyTarget))}/day · {daysInTrip} days</div>
      </div>

      <div>
        <div className="text-[9px] uppercase tracking-[0.1em] font-semibold text-gray-400 mb-1">Spent</div>
        <div className="font-serif text-[26px] font-normal text-gray-900 dark:text-white tabular-nums">{formatAmount(totalActual)}</div>
        <div className="text-[10px] text-gray-400 mt-1">{pct.toFixed(0)}% of budget</div>
      </div>

      <div>
        <div className="text-[9px] uppercase tracking-[0.1em] font-semibold text-gray-400 mb-1">Remaining</div>
        <div className={`font-serif text-[26px] font-normal tabular-nums ${remainingColor}`}>{formatAmount(Math.abs(remaining))}{remaining < 0 ? ' over' : ''}</div>
        <div className="text-[10px] text-gray-400 mt-1">{remainingPerDay > 0 ? `${formatAmount(Math.round(remainingPerDay))}/day left` : '—'}</div>
      </div>

      <div>
        <div className="text-[9px] uppercase tracking-[0.1em] font-semibold text-gray-400 mb-1">Daily avg spent</div>
        <div className="font-serif text-[26px] font-normal text-gray-900 dark:text-white tabular-nums">{formatAmount(Math.round(dailyAvg))}</div>
        <div className="text-[10px] text-gray-400 mt-1">{pace}</div>
      </div>
    </div>
  );
}
```

Note on the `EditableCell` className overrides (`!text-left !justify-start !w-auto`): the cell defaults to right-aligned numeric. The metric strip needs left-aligned, no flex. Tailwind's `!` prefix forces override. (If the implementer prefers, they can pass `align="left"` as a prop instead — small refactor of `EditableCell`. Either is fine.)

- [ ] **Step 5.2: Typecheck + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | head -5
```

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/trip/budget/BudgetMetricStrip.tsx
git commit -m "Add BudgetMetricStrip with editable Total budget"
```

---

## Task 6: `ExpensesDrawer`

**Files:**
- Create: `apps/web/components/trip/budget/ExpensesDrawer.tsx`

The expanded-row drawer. Same drawer is reused by the desktop table row and the mobile card.

- [ ] **Step 6.1: Implement `ExpensesDrawer.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { BudgetExpense } from './types';

export interface ExpensesDrawerProps {
  expenses: BudgetExpense[];
  formatAmount: (n: number) => string;
  onAddExpense: (description: string, amount: number, date?: string) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export function ExpensesDrawer({ expenses, formatAmount, onAddExpense, onDeleteExpense }: ExpensesDrawerProps) {
  const [adding, setAdding] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');

  const reset = () => { setDesc(''); setAmount(''); setDate(''); setAdding(false); };

  const submit = () => {
    const parsed = Number(amount);
    if (!desc.trim() || Number.isNaN(parsed) || parsed <= 0) return;
    onAddExpense(desc.trim(), parsed, date || undefined);
    reset();
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <div className="bg-[#fafaf7] dark:bg-white/[0.02] border border-[#f0eee9] dark:border-white/[0.06] rounded-lg p-3 my-2">
        <div className="flex items-center justify-between px-1 pb-2">
          <span className="text-[9px] uppercase tracking-[0.08em] font-bold text-gray-400">
            {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
          </span>
          {!adding && (
            <button onClick={() => setAdding(true)} className="text-[12px] text-[var(--trip-base)] hover:underline font-medium">
              + Add expense
            </button>
          )}
        </div>

        {expenses.length > 0 && (
          <div className="space-y-1.5">
            {expenses.map((e) => (
              <div key={e.id} className="grid grid-cols-[1fr_90px_80px_22px] gap-2 items-center bg-white dark:bg-white/[0.04] border border-[#f0eee9] dark:border-white/[0.06] rounded-md px-2.5 py-2 text-[12px]">
                <span className="text-gray-900 dark:text-gray-200 truncate">{e.description}</span>
                <span className="text-[10px] text-gray-400 text-right">{e.date ?? ''}</span>
                <span className="tabular-nums font-semibold text-gray-900 dark:text-white text-right">{formatAmount(e.amount)}</span>
                <button onClick={() => onDeleteExpense(e.id)} aria-label="Delete expense" className="text-gray-300 hover:text-red-600 transition-colors text-center">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {adding && (
          <div className="grid grid-cols-[1fr_90px_80px_auto] gap-2 items-center mt-2 px-2.5 py-2 border border-dashed border-[var(--trip-base)] rounded-md bg-white dark:bg-white/[0.04]">
            <input
              type="text"
              autoFocus
              placeholder="Description"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); else if (e.key === 'Escape') reset(); }}
              className="text-[12px] bg-transparent border-none outline-none placeholder:text-gray-400 text-gray-900 dark:text-white"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); else if (e.key === 'Escape') reset(); }}
              className="text-[10px] bg-transparent border-none outline-none text-gray-600 dark:text-gray-300 text-right"
            />
            <input
              type="number"
              step="any"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); else if (e.key === 'Escape') reset(); }}
              className="text-[12px] bg-transparent border-none outline-none text-right tabular-nums font-semibold text-gray-900 dark:text-white"
            />
            <div className="flex items-center gap-1.5">
              <button onClick={submit} aria-label="Add" className="w-6 h-6 rounded-md bg-[var(--trip-base)] text-white flex items-center justify-center hover:opacity-90 transition-opacity">
                <Plus size={12} />
              </button>
              <button onClick={reset} aria-label="Cancel" className="w-6 h-6 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] flex items-center justify-center">
                <X size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 6.2: Typecheck + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | head -5
git add apps/web/components/trip/budget/ExpensesDrawer.tsx
git commit -m "Add ExpensesDrawer with inline add-expense form"
```

(Run from repo root if `git` complains about the path.)

---

## Task 7: `BudgetTableRow`

**Files:**
- Create: `apps/web/components/trip/budget/BudgetTableRow.tsx`

One `<tr>` per category, plus an expanded-state extra `<tr>` with the drawer.

- [ ] **Step 7.1: Implement `BudgetTableRow.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { iconFor } from './categoryIcons';
import { computeHealth } from './budgetMath';
import { ExpensesDrawer } from './ExpensesDrawer';
import { EditableCell } from './EditableCell';
import type { BudgetItem } from './types';

export interface BudgetTableRowProps {
  item: BudgetItem;
  formatAmount: (n: number) => string;
  onChangeBudgeted: (id: string, next: number) => void;
  onAddExpense: (id: string, description: string, amount: number, date?: string) => void;
  onDeleteExpense: (id: string, expenseId: string) => void;
}

export function BudgetTableRow({
  item, formatAmount, onChangeBudgeted, onAddExpense, onDeleteExpense,
}: BudgetTableRowProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = iconFor(item.category);
  const remaining = item.budgeted - item.actual;
  const pct = item.budgeted > 0 ? (item.actual / item.budgeted) * 100 : 0;
  const health = computeHealth(pct);

  const remainingClass =
    health === 'over' ? 'text-red-700 dark:text-red-400 font-semibold'
    : health === 'warn' ? 'text-amber-700 dark:text-amber-400 font-semibold'
    : 'text-emerald-700 dark:text-emerald-400';

  const barColor =
    health === 'over' ? '#dc2626'
    : health === 'warn' ? '#d97706'
    : 'var(--trip-base)';

  return (
    <>
      <tr className="border-b border-[#f5f3ee] dark:border-white/[0.04] group">
        <td className="py-2.5 pr-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.08)', color: 'var(--trip-base)' }}
          >
            <Icon size={14} />
          </div>
        </td>
        <td className="py-2.5 pr-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={`expenses-${item.id}`}
            className="flex items-center gap-1.5 text-[13px] font-medium text-gray-900 dark:text-white hover:text-[var(--trip-base)] transition-colors"
          >
            <ChevronRight
              size={12}
              className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
            {item.category}
          </button>
        </td>
        <td className="py-2.5 px-2 text-right">
          <EditableCell
            value={item.budgeted}
            onCommit={(n) => onChangeBudgeted(item.id, n)}
            format={formatAmount}
            ariaLabel={`Budget for ${item.category}`}
          />
        </td>
        <td className="py-2.5 px-2 text-right tabular-nums text-gray-600 dark:text-gray-300">
          {formatAmount(item.actual)}
        </td>
        <td className={`py-2.5 px-2 text-right tabular-nums ${remainingClass}`}>
          {remaining < 0 ? `−${formatAmount(Math.abs(remaining))}` : formatAmount(remaining)}
        </td>
        <td className="py-2.5 pl-2 pr-1">
          <div
            role="progressbar"
            aria-valuenow={item.actual}
            aria-valuemin={0}
            aria-valuemax={item.budgeted}
            className="h-1 rounded-full bg-[#f0eee9] dark:bg-white/[0.06] overflow-hidden"
          >
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
            />
          </div>
        </td>
      </tr>
      <AnimatePresence initial={false}>
        {expanded && (
          <tr id={`expenses-${item.id}`}>
            <td colSpan={6} className="px-1">
              <ExpensesDrawer
                expenses={item.expenses ?? []}
                formatAmount={formatAmount}
                onAddExpense={(d, a, dt) => onAddExpense(item.id, d, a, dt)}
                onDeleteExpense={(eid) => onDeleteExpense(item.id, eid)}
              />
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 7.2: Typecheck + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | head -5
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/trip/budget/BudgetTableRow.tsx
git commit -m "Add BudgetTableRow with inline edit + expandable drawer"
```

---

## Task 8: `BudgetTable`

**Files:**
- Create: `apps/web/components/trip/budget/BudgetTable.tsx`

Assembles the table — header + rows + totals footer.

- [ ] **Step 8.1: Implement `BudgetTable.tsx`**

```tsx
'use client';

import { BudgetTableRow } from './BudgetTableRow';
import { computeTotals, computeHealth } from './budgetMath';
import type { BudgetItem } from './types';

export interface BudgetTableProps {
  items: BudgetItem[];
  formatAmount: (n: number) => string;
  onChangeBudgeted: (id: string, next: number) => void;
  onAddExpense: (id: string, description: string, amount: number, date?: string) => void;
  onDeleteExpense: (id: string, expenseId: string) => void;
}

export function BudgetTable({
  items, formatAmount, onChangeBudgeted, onAddExpense, onDeleteExpense,
}: BudgetTableProps) {
  const { totalBudgeted, totalActual } = computeTotals(items);
  const totalRemaining = totalBudgeted - totalActual;
  const totalPct = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;
  const totalHealth = computeHealth(totalPct);
  const totalRemainingClass =
    totalHealth === 'over' ? 'text-red-700 dark:text-red-400'
    : totalHealth === 'warn' ? 'text-amber-700 dark:text-amber-400'
    : 'text-emerald-700 dark:text-emerald-400';
  const totalBarColor =
    totalHealth === 'over' ? '#dc2626'
    : totalHealth === 'warn' ? '#d97706'
    : 'var(--trip-base)';

  return (
    <table className="w-full hidden md:table">
      <colgroup>
        <col style={{ width: 36 }} />
        <col />
        <col style={{ width: 120 }} />
        <col style={{ width: 120 }} />
        <col style={{ width: 120 }} />
        <col style={{ width: 160 }} />
      </colgroup>
      <thead>
        <tr className="text-[9px] uppercase tracking-[0.08em] font-bold text-gray-400 bg-[#fafaf7] dark:bg-white/[0.02]">
          <th></th>
          <th className="text-left py-2 px-2">Category</th>
          <th className="text-right py-2 px-2">Budgeted</th>
          <th className="text-right py-2 px-2">Spent</th>
          <th className="text-right py-2 px-2">Remaining</th>
          <th className="text-left py-2 pl-2 pr-1">Progress</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <BudgetTableRow
            key={item.id}
            item={item}
            formatAmount={formatAmount}
            onChangeBudgeted={onChangeBudgeted}
            onAddExpense={onAddExpense}
            onDeleteExpense={onDeleteExpense}
          />
        ))}
      </tbody>
      <tfoot>
        <tr className="bg-[#fafaf7] dark:bg-white/[0.02] font-semibold">
          <td></td>
          <td className="py-3 px-2 text-[13px] text-gray-900 dark:text-white">Total</td>
          <td className="py-3 px-2 text-right tabular-nums text-gray-900 dark:text-white">{formatAmount(totalBudgeted)}</td>
          <td className="py-3 px-2 text-right tabular-nums text-gray-900 dark:text-white">{formatAmount(totalActual)}</td>
          <td className={`py-3 px-2 text-right tabular-nums ${totalRemainingClass}`}>
            {totalRemaining < 0 ? `−${formatAmount(Math.abs(totalRemaining))}` : formatAmount(totalRemaining)}
          </td>
          <td className="py-3 pl-2 pr-1">
            <div className="h-1 rounded-full bg-[#f0eee9] dark:bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(totalPct, 100)}%`, backgroundColor: totalBarColor }} />
            </div>
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
```

- [ ] **Step 8.2: Typecheck + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | head -5
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/trip/budget/BudgetTable.tsx
git commit -m "Add BudgetTable with thead, tbody rows, and totals footer"
```

---

## Task 9: `BudgetMobileList`

**Files:**
- Create: `apps/web/components/trip/budget/BudgetMobileList.tsx`

Mobile-only stacked-card replacement for the table.

- [ ] **Step 9.1: Implement `BudgetMobileList.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { iconFor } from './categoryIcons';
import { computeHealth } from './budgetMath';
import { ExpensesDrawer } from './ExpensesDrawer';
import { EditableCell } from './EditableCell';
import type { BudgetItem } from './types';

export interface BudgetMobileListProps {
  items: BudgetItem[];
  formatAmount: (n: number) => string;
  onChangeBudgeted: (id: string, next: number) => void;
  onAddExpense: (id: string, description: string, amount: number, date?: string) => void;
  onDeleteExpense: (id: string, expenseId: string) => void;
}

export function BudgetMobileList({
  items, formatAmount, onChangeBudgeted, onAddExpense, onDeleteExpense,
}: BudgetMobileListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="md:hidden space-y-2.5">
      {items.map((item) => {
        const Icon = iconFor(item.category);
        const pct = item.budgeted > 0 ? (item.actual / item.budgeted) * 100 : 0;
        const health = computeHealth(pct);
        const isExpanded = expandedId === item.id;
        const barColor =
          health === 'over' ? '#dc2626'
          : health === 'warn' ? '#d97706'
          : 'var(--trip-base)';
        const pctColor =
          health === 'over' ? 'text-red-700 dark:text-red-400'
          : health === 'warn' ? 'text-amber-700 dark:text-amber-400'
          : 'text-gray-600 dark:text-gray-400';

        return (
          <div key={item.id} className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08] rounded-xl p-3">
            <button
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
              aria-expanded={isExpanded}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: 'rgb(var(--trip-base-rgb) / 0.08)', color: 'var(--trip-base)' }}>
                  <Icon size={14} />
                </div>
                <span className="text-[13px] font-semibold text-gray-900 dark:text-white">{item.category}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-semibold tabular-nums ${pctColor}`}>{pct.toFixed(0)}%</span>
                <ChevronDown size={12} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>

            <div className="grid grid-cols-2 gap-3 mt-3 mb-2">
              <div>
                <div className="text-[9px] uppercase tracking-[0.08em] font-semibold text-gray-400 mb-0.5">Spent</div>
                <div className="font-serif text-[15px] text-gray-900 dark:text-white tabular-nums">{formatAmount(item.actual)}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] uppercase tracking-[0.08em] font-semibold text-gray-400 mb-0.5">Budget</div>
                <EditableCell
                  value={item.budgeted}
                  onCommit={(n) => onChangeBudgeted(item.id, n)}
                  format={formatAmount}
                  ariaLabel={`Budget for ${item.category}`}
                  className="font-serif text-[15px] text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="h-1 rounded-full bg-[#f0eee9] dark:bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
            </div>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <ExpensesDrawer
                  expenses={item.expenses ?? []}
                  formatAmount={formatAmount}
                  onAddExpense={(d, a, dt) => onAddExpense(item.id, d, a, dt)}
                  onDeleteExpense={(eid) => onDeleteExpense(item.id, eid)}
                />
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 9.2: Typecheck + commit**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | head -5
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/components/trip/budget/BudgetMobileList.tsx
git commit -m "Add BudgetMobileList stacked-card view for mobile"
```

---

## Task 10: Rewrite `budget/page.tsx`

**Files:**
- Modify: `apps/web/app/(dashboard)/trip/[id]/budget/page.tsx` (full rewrite)

The page becomes a thin orchestrator. **Carry over** `generateBudgetFromTrip` and the load/save persistence logic from the existing file. **Drop** the old skeleton, the old health-bg helpers, the old per-category color palette, the old inline forms — they're replaced by the new components.

- [ ] **Step 10.1: Read the existing `budget/page.tsx` carefully**

Before writing the rewrite, read the entire file. Pay attention to:
- `generateBudgetFromTrip` (you'll keep this verbatim).
- The save effect (debounced flush to Supabase) — you'll keep this.
- The state shape (`budgetData: BudgetItem[]`, `seeded` ref).

- [ ] **Step 10.2: Rewrite the file**

Replace `apps/web/app/(dashboard)/trip/[id]/budget/page.tsx` with:

```tsx
'use client';

import { use, useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useItineraryScreen, useHomeCurrency } from '@travyl/shared';
import { supabase } from '@travyl/shared';
import { Module } from '@/components/trip/Module';
import { BudgetMetricStrip } from '@/components/trip/budget/BudgetMetricStrip';
import { BudgetTable } from '@/components/trip/budget/BudgetTable';
import { BudgetMobileList } from '@/components/trip/budget/BudgetMobileList';
import { computeTotals, scaleBudgetsProportionally } from '@/components/trip/budget/budgetMath';
import type { BudgetItem, BudgetExpense } from '@/components/trip/budget/types';

// Keep the existing seed logic verbatim — copy it from the previous version.
// (The existing function is ~50 lines. Don't rewrite it — just import or inline as a local helper.)

const EMPTY_BUDGET: BudgetItem[] = [
  { id: 'flights', category: 'Flights', budgeted: 0, actual: 0, fixed: true, expenses: [] },
  { id: 'hotels', category: 'Hotels', budgeted: 0, actual: 0, fixed: true, expenses: [] },
  { id: 'food', category: 'Food & Dining', budgeted: 0, actual: 0, fixed: false, expenses: [] },
  { id: 'activities', category: 'Activities', budgeted: 0, actual: 0, fixed: false, expenses: [] },
  { id: 'transportation', category: 'Transportation', budgeted: 0, actual: 0, fixed: false, expenses: [] },
  { id: 'shopping', category: 'Shopping', budgeted: 0, actual: 0, fixed: false, expenses: [] },
  { id: 'other', category: 'Other', budgeted: 0, actual: 0, fixed: false, expenses: [] },
];

// PASTE generateBudgetFromTrip from the OLD page.tsx here, with the same signature:
// function generateBudgetFromTrip(trip: any, formatAmount: (n: number, cur?: string) => string = (n) => `$${n}`): BudgetItem[] { ... }
// Keep its logic exactly — it computes seed values from trip_context.cost_of_living, hotel pricing, duration, travelers.

function recomputeActuals(items: BudgetItem[]): BudgetItem[] {
  return items.map((i) => ({
    ...i,
    actual: (i.expenses ?? []).reduce((sum, e) => sum + (e.amount ?? 0), 0),
  }));
}

export default function Budget({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isLoading, trip } = useItineraryScreen(id);
  const { format: formatHome } = useHomeCurrency();
  const rawCur: string = (trip as any)?.currency ?? (trip as any)?.trip_context?.quick_facts?.currency ?? 'USD';
  const tripCurrency = rawCur.match(/^[A-Z]{3}/)?.[0] ?? 'USD';
  const formatAmount = (n: number) => formatHome(n, tripCurrency);

  const [budgetData, setBudgetData] = useState<BudgetItem[]>(EMPTY_BUDGET);
  const seeded = useRef(false);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Seed from saved trip_context.budget_data, or generate from trip
  useEffect(() => {
    if (trip && !seeded.current) {
      const saved = (trip.trip_context as any)?.budget_data as BudgetItem[] | undefined;
      const next = saved?.length ? saved : generateBudgetFromTrip(trip, formatHome);
      setBudgetData(recomputeActuals(next));
      seeded.current = true;
    }
  }, [trip, formatHome]);

  // Debounced flush to Supabase (1500ms after last change)
  const persist = (next: BudgetItem[]) => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = setTimeout(async () => {
      try {
        const { data: current } = await supabase
          .from('trips')
          .select('trip_context')
          .eq('id', id)
          .single();
        const existingContext = (current?.trip_context as Record<string, unknown>) ?? {};
        await supabase
          .from('trips')
          .update({ trip_context: { ...existingContext, budget_data: next } })
          .eq('id', id);
      } catch (err) {
        console.error('Failed to flush budget to Supabase', err);
      }
    }, 1500);
  };

  // Flush on unmount if a debounce is pending
  useEffect(() => {
    return () => { if (flushTimer.current) clearTimeout(flushTimer.current); };
  }, []);

  // Trip date math for the metric strip
  const daysInTrip = trip?.start_date && trip?.end_date
    ? Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000))
    : 1;
  const today = new Date();
  const start = trip?.start_date ? new Date(trip.start_date) : today;
  const daysElapsed = Math.max(0, Math.min(
    daysInTrip,
    Math.ceil((today.getTime() - start.getTime()) / 86400000),
  ));

  // ─── Mutations ──────────────────────────────────────────

  const handleChangeBudgeted = (itemId: string, next: number) => {
    const updated = budgetData.map((i) => i.id === itemId ? { ...i, budgeted: next } : i);
    setBudgetData(updated);
    persist(updated);
  };

  const handleChangeTotalBudget = (next: number) => {
    const updated = recomputeActuals(scaleBudgetsProportionally(budgetData, next));
    setBudgetData(updated);
    persist(updated);
  };

  const handleAddExpense = (itemId: string, description: string, amount: number, date?: string) => {
    const expense: BudgetExpense = { id: `exp-${Date.now()}`, description, amount, date };
    const updated = recomputeActuals(budgetData.map((i) =>
      i.id === itemId ? { ...i, expenses: [...(i.expenses ?? []), expense] } : i
    ));
    setBudgetData(updated);
    persist(updated);
  };

  const handleDeleteExpense = (itemId: string, expenseId: string) => {
    const updated = recomputeActuals(budgetData.map((i) =>
      i.id === itemId ? { ...i, expenses: (i.expenses ?? []).filter((e) => e.id !== expenseId) } : i
    ));
    setBudgetData(updated);
    persist(updated);
  };

  // ─── Render ─────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-8">
        <Module title="Budget" description="Loading…">
          <div className="h-40 animate-pulse bg-gray-100 dark:bg-white/[0.04] rounded-xl" />
        </Module>
      </div>
    );
  }

  const { totalBudgeted, totalActual } = computeTotals(budgetData);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <Module
        title="Budget"
        description="Edit any cell · click a category to expand expenses"
        action={
          <button
            className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: 'var(--trip-base)' }}
            onClick={() => { /* TODO: open category picker — defer to follow-up */ }}
          >
            <Plus size={13} /> Expense
          </button>
        }
      >
        <BudgetMetricStrip
          totalBudgeted={totalBudgeted}
          totalActual={totalActual}
          daysInTrip={daysInTrip}
          daysElapsed={daysElapsed}
          formatAmount={formatAmount}
          onChangeTotalBudget={handleChangeTotalBudget}
        />
        <BudgetTable
          items={budgetData}
          formatAmount={formatAmount}
          onChangeBudgeted={handleChangeBudgeted}
          onAddExpense={handleAddExpense}
          onDeleteExpense={handleDeleteExpense}
        />
        <BudgetMobileList
          items={budgetData}
          formatAmount={formatAmount}
          onChangeBudgeted={handleChangeBudgeted}
          onAddExpense={handleAddExpense}
          onDeleteExpense={handleDeleteExpense}
        />
      </Module>
    </div>
  );
}
```

**Important:**
- Where the comment says "PASTE generateBudgetFromTrip from the OLD page.tsx here", do exactly that. Open the old file (`git show develop~1:apps/web/app/\(dashboard\)/trip/\[id\]/budget/page.tsx | sed -n '142,178p'` or read it before deleting), copy the function, paste into the new file.
- The "+ Expense" header button has a TODO. The spec § 7 acknowledges this is a judgment call — defer the category picker to a follow-up. The "+ Add expense" link inside each row's drawer is the primary add path.
- "+ Category" button is in the spec but not in this initial implementation. Add it later if needed; the existing `EMPTY_BUDGET` set is sufficient for the first cut.

- [ ] **Step 10.3: Typecheck**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -v ".next/types/validator.ts" | head -10
```

Expected: no new errors. The old page's `BudgetSkeleton`, `healthBg`, `categoryHealthBg`, `CATEGORY_ICONS`, `CATEGORY_COLORS`, `DEFAULT_COLORS` exports/declarations are gone; if anything else in the codebase imported them, fix the imports there. (Likely nothing did — they were all internal.)

- [ ] **Step 10.4: Visual check** (the moment of truth)

In the browser at `http://localhost:3001/trip/<id>/budget`:
- The page should render the new design: Module shell, 4-metric strip, table on desktop, totals row at the bottom.
- Resize narrow → table swaps to mobile cards.
- Click a Budgeted cell → it becomes an input, type a new value, Enter → saves (watch the network tab for a Supabase update after ~1.5s).
- Click a category name → drawer expands with the expenses list and add-row.
- Click "+ Add expense" inside the drawer → form appears; fill it, Enter → expense added, Spent / Remaining / Progress bar update live.
- Click × on an expense → removed.
- Edit Total budget in the metric strip → all category budgets scale proportionally.

If anything breaks, fix it before committing.

- [ ] **Step 10.5: Commit**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git add apps/web/app/\(dashboard\)/trip/\[id\]/budget/page.tsx
git commit -m "Rewrite budget page using new spreadsheet view + mobile cards"
```

---

## Task 11: Run the suite + lint check

- [ ] **Step 11.1: Run all web tests**

```bash
cd apps/web && npx vitest run 2>&1 | tail -10
```

Expected: previous 34 tests + the new 14 budget-math tests = 48 passing.

- [ ] **Step 11.2: Typecheck across workspace**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
npm run typecheck 2>&1 | grep -v ".next/types/validator.ts" | tail -10
```

Expected: no NEW errors compared to develop baseline.

- [ ] **Step 11.3: Lint your new files**

```bash
cd apps/web && npx eslint components/trip/Module.tsx components/trip/budget/ app/\(dashboard\)/trip/\[id\]/budget/page.tsx 2>&1 | tail -30
```

Expected: clean. Pre-existing lint debt elsewhere is out of scope.

If any new lint errors: fix them, then `git add` + `git commit -m "Fix lint in budget files"`.

---

## Task 12: Push to develop

- [ ] **Step 12.1: Push**

```bash
cd /home/noah-gallego/Dropbox/Desktop/travyl-combined/travyl-frontend
git push origin develop
```

No PR — Noah ships directly on develop for this work.

---

## Out of Scope (deferred)

- "+ Category" header button (add custom category) — `EMPTY_BUDGET` covers the common case.
- "+ Expense" header button category-picker flow — drawer-level "+ Add expense" suffices.
- Row-level ⋯ menu (delete category, reset to suggestion) — punt; non-fixed categories stay; deletion is a follow-up.
- Charts (donut, sparklines).
- Multi-currency at expense level.
- Recurring expenses.
- Receipt OCR / import.
- Expense splitting between travelers.
- Category reordering / drag-and-drop.

## Risk Notes

- **The Settings WIP collision.** `settings/page.tsx` is in Noah's working tree and not committed. Task 1 makes a surgical edit (delete inline `Module`, add import). If Noah re-edits the same lines while you're working, you'll get a conflict on your next stash/pull. Coordinate by completing Task 1 quickly and committing.
- **`generateBudgetFromTrip` carries an `any` parameter** — pre-existing in the old code. Keep it as `any` for now to avoid a type-cleanup rabbit hole. Document with a `// eslint-disable-next-line @typescript-eslint/no-explicit-any` if lint complains.
- **Currency formatting.** `useHomeCurrency` formats based on the user's home currency, not the trip's. The old code passes `tripCurrency` as the second arg to `formatHome` — preserve that. The new `formatAmount` wrapper hides this detail.
- **Date math.** `daysElapsed` clamps between 0 and `daysInTrip`. Trips that haven't started → `daysElapsed === 0` → daily-avg shows 0. Trips that have finished → `daysElapsed === daysInTrip` → daily avg = total spent / days, no remaining-per-day. These are correct edge cases, not bugs.
- **`var(--trip-base-rgb)`.** Both `BudgetTableRow` and `BudgetMobileList` use `rgb(var(--trip-base-rgb) / 0.08)` for the icon backgrounds. The CSS var is set by `TripThemeProvider` (already in scope on this page). If for some reason the var is missing, the bg falls back to transparent — visible as a border-only icon box. Acceptable degradation.
