# Budget Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock-data budget page with a data-driven, Apple-minimal budget tracker that computes costs from trip activities/flights/hotels, supports per-category targets, manual expenses, and multi-currency conversion — with hover-reveal interactions throughout.

**Architecture:** New Supabase tables (`trip_budget_categories`, `trip_manual_expenses`) store budget targets and manual expenses. A `useTripBudget` hook composes existing data hooks with new budget CRUD to compute category breakdowns. The page renders a summary strip + two-column layout (SVG donut chart + category list) with a shared `hoveredCategory` state driving cross-highlight hover interactions.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, React Query v5, Supabase, motion/react v12, iconoir-react, Vitest

**Spec:** `docs/superpowers/specs/2026-03-19-budget-page-design.md`

**Prerequisites:** The Supabase migration (Task 18) MUST be run before functional testing of the page (Task 17 Step 3). Run it anytime before reaching Task 17.

**Codebase conventions:**
- `@travyl/shared` barrel exports — all new hooks/types/utils auto-export via `index.ts` barrels
- `supabase` singleton in services requires `configureSupabase()` called at app startup (already done in web Providers)
- Mutations use `.mutate` (fire-and-forget) matching existing hooks like `useTripNotes` — not `.mutateAsync`
- Optimistic rollback is deferred to a follow-up; v1 uses simple invalidation on success

---

## File Structure

### New files

| File | Responsibility |
|---|---|
| `packages/shared/src/utils/budgetMapping.ts` | `mapActivityToBudgetCategory()` — maps activity category slugs to budget categories |
| `packages/shared/src/utils/budgetMapping.test.ts` | Tests for mapping function |
| `packages/shared/src/utils/currency.ts` | `convertToTripCurrency()` + `formatBudgetAmount()` — currency conversion and formatting |
| `packages/shared/src/utils/currency.test.ts` | Tests for currency utilities |
| `packages/shared/src/services/budgetService.ts` | Supabase CRUD for `trip_budget_categories` + `trip_manual_expenses` |
| `packages/shared/src/hooks/useExchangeRates.ts` | React Query hook for frankfurter.app exchange rates |
| `packages/shared/src/hooks/useTripBudget.ts` | Main composition hook — assembles budget data from all sources |
| `apps/web/components/budget/budgetColors.ts` | Shared `CATEGORY_COLORS` map used by donut chart and category list |
| `apps/web/components/budget/BudgetSummaryStrip.tsx` | Three stat groups with hover-editable total |
| `apps/web/components/budget/BudgetDonutChart.tsx` | Hand-rolled SVG donut with radial hover tooltips |
| `apps/web/components/budget/BudgetCategoryList.tsx` | Category rows with hover progress bars + cross-highlight |
| `apps/web/components/budget/BudgetCategoryDetail.tsx` | Expanded view: calendar items + manual expenses |
| `apps/web/components/budget/AddExpenseForm.tsx` | Inline underline-style form for manual expenses |
| `apps/web/components/budget/AddCategoryForm.tsx` | Inline underline-style form for new categories |
| `apps/web/components/budget/CurrencyFooter.tsx` | Single line of rate text |
| `apps/web/components/budget/BudgetSkeleton.tsx` | Loading skeleton matching two-column layout |
| `apps/web/components/budget/index.ts` | Barrel export |

### Modified files

| File | Change |
|---|---|
| `packages/shared/src/types/index.ts` | Remove `BudgetExpense` + `BudgetItem` types, add `TripBudgetCategory` + `TripManualExpense` + `BudgetCategoryData` |
| `packages/shared/src/utils/index.ts` | Add exports for `budgetMapping` and `currency` |
| `packages/shared/src/services/index.ts` | Add exports from `budgetService` |
| `packages/shared/src/hooks/index.ts` | Add exports for `useExchangeRates` + `useTripBudget` |
| `packages/shared/src/viewmodels/index.ts` | Remove `budgetViewModel` exports |
| `apps/web/app/(trips-app)/trip/[id]/budget/page.tsx` | Complete rewrite — thin wrapper with `useTripBudget` |

### Deleted files

| File | Reason |
|---|---|
| `packages/shared/src/viewmodels/budgetViewModel.ts` | Replaced by `useTripBudget` hook |

---

## Chunk 1: Shared Utilities (TDD)

### Task 1: Budget Category Mapping

**Files:**
- Create: `packages/shared/src/utils/budgetMapping.ts`
- Create: `packages/shared/src/utils/budgetMapping.test.ts`
- Modify: `packages/shared/src/utils/index.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/shared/src/utils/budgetMapping.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mapActivityToBudgetCategory } from './budgetMapping'

describe('mapActivityToBudgetCategory', () => {
  it('maps flight to flights', () => {
    expect(mapActivityToBudgetCategory('flight')).toBe('flights')
  })

  it('maps hotel and accommodation to hotels', () => {
    expect(mapActivityToBudgetCategory('hotel')).toBe('hotels')
    expect(mapActivityToBudgetCategory('accommodation')).toBe('hotels')
  })

  it('maps food-related categories to food', () => {
    for (const slug of ['restaurant', 'food', 'dining', 'cafe', 'bar']) {
      expect(mapActivityToBudgetCategory(slug)).toBe('food')
    }
  })

  it('maps activity-related categories to activities', () => {
    for (const slug of ['tour', 'museum', 'attraction', 'entertainment', 'sightseeing']) {
      expect(mapActivityToBudgetCategory(slug)).toBe('activities')
    }
  })

  it('maps transport-related categories to transport', () => {
    for (const slug of ['transport', 'car', 'bus', 'train', 'taxi']) {
      expect(mapActivityToBudgetCategory(slug)).toBe('transport')
    }
  })

  it('maps shopping to shopping', () => {
    expect(mapActivityToBudgetCategory('shopping')).toBe('shopping')
  })

  it('maps unknown categories to other', () => {
    expect(mapActivityToBudgetCategory('xyz')).toBe('other')
    expect(mapActivityToBudgetCategory('')).toBe('other')
  })

  it('is case-insensitive', () => {
    expect(mapActivityToBudgetCategory('Flight')).toBe('flights')
    expect(mapActivityToBudgetCategory('HOTEL')).toBe('hotels')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/shared && npx vitest run src/utils/budgetMapping.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement mapping function**

Create `packages/shared/src/utils/budgetMapping.ts`:

```ts
const CATEGORY_MAP: Record<string, string> = {
  flight: 'flights',
  hotel: 'hotels',
  accommodation: 'hotels',
  restaurant: 'food',
  food: 'food',
  dining: 'food',
  cafe: 'food',
  bar: 'food',
  tour: 'activities',
  museum: 'activities',
  attraction: 'activities',
  entertainment: 'activities',
  sightseeing: 'activities',
  transport: 'transport',
  car: 'transport',
  bus: 'transport',
  train: 'transport',
  taxi: 'transport',
  shopping: 'shopping',
}

export function mapActivityToBudgetCategory(activityCategory: string): string {
  return CATEGORY_MAP[activityCategory.toLowerCase()] ?? 'other'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/shared && npx vitest run src/utils/budgetMapping.test.ts`
Expected: All 8 tests PASS

- [ ] **Step 5: Add export to utils barrel**

Add to end of `packages/shared/src/utils/index.ts`:

```ts
export { mapActivityToBudgetCategory } from './budgetMapping'
```

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/utils/budgetMapping.ts packages/shared/src/utils/budgetMapping.test.ts packages/shared/src/utils/index.ts
git commit -m "feat: add mapActivityToBudgetCategory utility with tests"
```

---

### Task 2: Currency Conversion & Formatting Utilities

**Files:**
- Create: `packages/shared/src/utils/currency.ts`
- Create: `packages/shared/src/utils/currency.test.ts`
- Modify: `packages/shared/src/utils/index.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/shared/src/utils/currency.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { convertToTripCurrency, formatBudgetAmount } from './currency'

describe('convertToTripCurrency', () => {
  const rates: Record<string, number> = { EUR: 0.92, GBP: 0.79 }

  it('returns amount unchanged when currencies match', () => {
    expect(convertToTripCurrency(100, 'USD', 'USD', rates)).toBe(100)
  })

  it('converts from a foreign currency to trip currency', () => {
    // 100 EUR -> USD: 100 / 0.92 ≈ 108.70
    const result = convertToTripCurrency(100, 'EUR', 'USD', rates)
    expect(result).toBeCloseTo(108.70, 1)
  })

  it('returns original amount when rate is missing', () => {
    expect(convertToTripCurrency(100, 'JPY', 'USD', rates)).toBe(100)
  })

  it('returns original amount when rates is null', () => {
    expect(convertToTripCurrency(100, 'EUR', 'USD', null as unknown as Record<string, number>)).toBe(100)
  })
})

describe('formatBudgetAmount', () => {
  it('formats USD amounts', () => {
    expect(formatBudgetAmount(1234.5, 'USD')).toBe('$1,234.50')
  })

  it('formats EUR amounts', () => {
    const result = formatBudgetAmount(1234.5, 'EUR')
    expect(result).toContain('1,234.50')
  })

  it('handles zero', () => {
    expect(formatBudgetAmount(0, 'USD')).toBe('$0.00')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/shared && npx vitest run src/utils/currency.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement currency utilities**

Create `packages/shared/src/utils/currency.ts`:

```ts
export function convertToTripCurrency(
  amount: number,
  fromCurrency: string,
  tripCurrency: string,
  rates: Record<string, number> | null,
): number {
  if (fromCurrency === tripCurrency) return amount
  if (!rates) return amount
  const rate = rates[fromCurrency]
  if (!rate) return amount
  return amount / rate
}

export function formatBudgetAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/shared && npx vitest run src/utils/currency.test.ts`
Expected: All 7 tests PASS

- [ ] **Step 5: Add export to utils barrel**

Add to `packages/shared/src/utils/index.ts`:

```ts
export { convertToTripCurrency, formatBudgetAmount } from './currency'
```

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/utils/currency.ts packages/shared/src/utils/currency.test.ts packages/shared/src/utils/index.ts
git commit -m "feat: add currency conversion and formatting utilities with tests"
```

---

### Task 3: Update Types — Replace Old Budget Types

**Files:**
- Modify: `packages/shared/src/types/index.ts`

- [ ] **Step 1: Remove old budget types from `packages/shared/src/types/index.ts`**

Find the `// ─── Budget Types ───` section comment and delete the `BudgetExpense` and `BudgetItem` interfaces below it.

Replace with:

```ts
// ─── Budget Types ───────────────────────────────────────────

export interface TripBudgetCategory {
  id: string
  trip_id: string
  category: string
  budgeted: number
  sort_order: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface TripManualExpense {
  id: string
  trip_id: string
  category_id: string
  description: string
  amount: number
  currency: string
  created_by: string
  created_at: string
}

export interface BudgetCategoryData {
  id: string
  name: string
  budgeted: number
  actual: number
  calendarItems: Array<{
    id: string
    name: string
    day: number
    time?: string
    cost: number
    originalCurrency?: string
  }>
  manualExpenses: TripManualExpense[]
  percentUsed: number
}
```

- [ ] **Step 2: Run typecheck to verify no regressions**

Run: `npm run typecheck`
Expected: May show errors in `budgetViewModel.ts` (which references old types) and the existing budget page — both will be replaced. Any other errors need fixing.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat: replace BudgetItem/BudgetExpense with TripBudgetCategory, TripManualExpense, BudgetCategoryData types"
```

---

## Chunk 2: Budget Service & Hooks

### Task 4: Budget Service (Supabase CRUD)

**Files:**
- Create: `packages/shared/src/services/budgetService.ts`
- Modify: `packages/shared/src/services/index.ts`

- [ ] **Step 1: Create budget service**

Create `packages/shared/src/services/budgetService.ts`:

```ts
import { supabase } from './supabase'
import type { TripBudgetCategory, TripManualExpense } from '../types'

// ─── Budget Categories ──────────────────────────────────────

export async function fetchBudgetCategories(tripId: string): Promise<TripBudgetCategory[]> {
  const { data, error } = await supabase
    .from('trip_budget_categories')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function upsertBudgetCategory(
  category: Partial<TripBudgetCategory> & { trip_id: string; category: string; created_by: string },
): Promise<void> {
  const { error } = await supabase
    .from('trip_budget_categories')
    .upsert(category, { onConflict: 'id' })
  if (error) throw error
}

export async function deleteBudgetCategory(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_budget_categories')
    .delete()
    .eq('id', categoryId)
  if (error) throw error
}

// ─── Manual Expenses ────────────────────────────────────────

export async function fetchManualExpenses(tripId: string): Promise<TripManualExpense[]> {
  const { data, error } = await supabase
    .from('trip_manual_expenses')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function addManualExpense(
  expense: Omit<TripManualExpense, 'id' | 'created_at'>,
): Promise<void> {
  const { error } = await supabase
    .from('trip_manual_expenses')
    .insert(expense)
  if (error) throw error
}

export async function deleteManualExpense(expenseId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_manual_expenses')
    .delete()
    .eq('id', expenseId)
  if (error) throw error
}
```

- [ ] **Step 2: Add exports to services barrel**

Add to `packages/shared/src/services/index.ts`:

```ts
export {
  fetchBudgetCategories,
  upsertBudgetCategory,
  deleteBudgetCategory,
  fetchManualExpenses,
  addManualExpense,
  deleteManualExpense,
} from './budgetService';
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/services/budgetService.ts packages/shared/src/services/index.ts
git commit -m "feat: add budgetService with Supabase CRUD for categories and manual expenses"
```

---

### Task 5: Exchange Rates Hook

**Files:**
- Create: `packages/shared/src/hooks/useExchangeRates.ts`
- Modify: `packages/shared/src/hooks/index.ts`

- [ ] **Step 1: Create exchange rates hook**

Create `packages/shared/src/hooks/useExchangeRates.ts`:

```ts
import { useQuery } from '@tanstack/react-query'

interface ExchangeRatesResult {
  rates: Record<string, number> | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

async function fetchRates(baseCurrency: string): Promise<Record<string, number>> {
  const res = await fetch(`https://api.frankfurter.app/latest?from=${baseCurrency}`)
  if (!res.ok) throw new Error(`Exchange rate fetch failed: ${res.status}`)
  const data = await res.json()
  return data.rates
}

export function useExchangeRates(baseCurrency: string): ExchangeRatesResult {
  const query = useQuery({
    queryKey: ['exchangeRates', baseCurrency],
    queryFn: () => fetchRates(baseCurrency),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
  })

  return {
    rates: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
```

- [ ] **Step 2: Add export to hooks barrel**

Add to `packages/shared/src/hooks/index.ts`:

```ts
export { useExchangeRates } from './useExchangeRates';
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/hooks/useExchangeRates.ts packages/shared/src/hooks/index.ts
git commit -m "feat: add useExchangeRates hook with 24h React Query cache"
```

---

### Task 6: Main `useTripBudget` Hook

**Files:**
- Create: `packages/shared/src/hooks/useTripBudget.ts`
- Modify: `packages/shared/src/hooks/index.ts`

- [ ] **Step 1: Create the composition hook**

Create `packages/shared/src/hooks/useTripBudget.ts`:

```ts
import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useItineraryDays } from './useItineraryDays'
import { useFlights } from './useFlights'
import { useHotels } from './useHotels'
import { useExchangeRates } from './useExchangeRates'
import {
  fetchBudgetCategories,
  upsertBudgetCategory,
  deleteBudgetCategory,
  fetchManualExpenses,
  addManualExpense,
  deleteManualExpense,
} from '../services/budgetService'
import { mapActivityToBudgetCategory } from '../utils/budgetMapping'
import { convertToTripCurrency } from '../utils/currency'
import { useAuthStore } from '../stores/authStore'
import type { TripBudgetCategory, TripManualExpense, BudgetCategoryData } from '../types'

export function useTripBudget(tripId: string | undefined, tripCurrency = 'USD') {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)

  // ─── Fetch existing trip data ──────────────────────────────
  const { data: days = [], isLoading: daysLoading } = useItineraryDays(tripId)
  const { data: flights = [], isLoading: flightsLoading } = useFlights(tripId)
  const { data: hotels = [], isLoading: hotelsLoading } = useHotels(tripId)
  const { rates, isLoading: ratesLoading, refetch: refetchRates } = useExchangeRates(tripCurrency)

  // ─── Fetch budget-specific data ────────────────────────────
  const categoriesQuery = useQuery({
    queryKey: ['budgetCategories', tripId],
    queryFn: () => fetchBudgetCategories(tripId!),
    enabled: !!tripId,
  })

  const expensesQuery = useQuery({
    queryKey: ['manualExpenses', tripId],
    queryFn: () => fetchManualExpenses(tripId!),
    enabled: !!tripId,
  })

  const budgetCategories = categoriesQuery.data ?? []
  const manualExpenses = expensesQuery.data ?? []

  // ─── Compute category data ─────────────────────────────────
  const categories: BudgetCategoryData[] = useMemo(() => {
    // Build a map of budget category name -> accumulated costs
    const costMap = new Map<string, { calendarItems: BudgetCategoryData['calendarItems']; manualTotal: number; manualExpenses: TripManualExpense[] }>()

    // Initialize from budget categories
    for (const cat of budgetCategories) {
      costMap.set(cat.category, { calendarItems: [], manualTotal: 0, manualExpenses: [] })
    }

    // Sum activity costs
    for (const day of days) {
      for (const activity of day.activities) {
        if (activity.estimated_cost == null) continue
        const budgetCat = mapActivityToBudgetCategory(activity.category)
        if (!costMap.has(budgetCat)) {
          costMap.set(budgetCat, { calendarItems: [], manualTotal: 0, manualExpenses: [] })
        }
        const entry = costMap.get(budgetCat)!
        const converted = convertToTripCurrency(activity.estimated_cost, activity.currency, tripCurrency, rates)
        entry.calendarItems.push({
          id: activity.id,
          name: activity.name,
          day: day.day_number,
          time: activity.start_time ?? undefined,
          cost: converted,
          originalCurrency: activity.currency !== tripCurrency ? activity.currency : undefined,
        })
      }
    }

    // Sum flight costs
    for (const flight of flights) {
      if (flight.data.price == null) continue
      if (!costMap.has('flights')) {
        costMap.set('flights', { calendarItems: [], manualTotal: 0, manualExpenses: [] })
      }
      const entry = costMap.get('flights')!
      const converted = convertToTripCurrency(flight.data.price, flight.data.currency ?? tripCurrency, tripCurrency, rates)
      entry.calendarItems.push({
        id: flight.id,
        name: `${flight.data.airline} ${flight.data.flight_number ?? ''} ${flight.data.origin_iata}→${flight.data.dest_iata}`.trim(),
        day: 0,
        cost: converted,
        originalCurrency: flight.data.currency && flight.data.currency !== tripCurrency ? flight.data.currency : undefined,
      })
    }

    // Sum hotel costs
    for (const hotel of hotels) {
      let cost = hotel.data.total_price
      if (cost == null && hotel.data.price_per_night != null) {
        const checkIn = new Date(hotel.data.check_in + 'T00:00:00')
        const checkOut = new Date(hotel.data.check_out + 'T00:00:00')
        const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
        cost = hotel.data.price_per_night * nights
      }
      if (cost == null) continue
      if (!costMap.has('hotels')) {
        costMap.set('hotels', { calendarItems: [], manualTotal: 0, manualExpenses: [] })
      }
      const entry = costMap.get('hotels')!
      const converted = convertToTripCurrency(cost, hotel.data.currency ?? tripCurrency, tripCurrency, rates)
      entry.calendarItems.push({
        id: hotel.id,
        name: hotel.data.name,
        day: 0,
        cost: converted,
        originalCurrency: hotel.data.currency && hotel.data.currency !== tripCurrency ? hotel.data.currency : undefined,
      })
    }

    // Sum manual expenses grouped by category_id
    for (const expense of manualExpenses) {
      const cat = budgetCategories.find((c) => c.id === expense.category_id)
      if (!cat) continue
      if (!costMap.has(cat.category)) {
        costMap.set(cat.category, { calendarItems: [], manualTotal: 0, manualExpenses: [] })
      }
      const entry = costMap.get(cat.category)!
      const converted = convertToTripCurrency(expense.amount, expense.currency, tripCurrency, rates)
      entry.manualTotal += converted
      entry.manualExpenses.push(expense)
    }

    // Build final category data array
    return budgetCategories.map((cat) => {
      const entry = costMap.get(cat.category) ?? { calendarItems: [], manualTotal: 0, manualExpenses: [] }
      const calendarTotal = entry.calendarItems.reduce((sum, item) => sum + item.cost, 0)
      const actual = calendarTotal + entry.manualTotal
      return {
        id: cat.id,
        name: cat.category,
        budgeted: cat.budgeted,
        actual,
        calendarItems: entry.calendarItems,
        manualExpenses: entry.manualExpenses,
        percentUsed: cat.budgeted > 0 ? (actual / cat.budgeted) * 100 : 0,
      }
    })
  }, [days, flights, hotels, manualExpenses, budgetCategories, tripCurrency, rates])

  // ─── Derived totals ────────────────────────────────────────
  const totalBudgeted = categories.reduce((sum, c) => sum + c.budgeted, 0)
  const totalSpent = categories.reduce((sum, c) => sum + c.actual, 0)
  const remaining = totalBudgeted - totalSpent

  // ─── Mutations ─────────────────────────────────────────────
  const upsertCat = useMutation({
    mutationFn: (category: Partial<TripBudgetCategory>) =>
      upsertBudgetCategory({
        trip_id: tripId!,
        created_by: user!.id,
        category: '',
        ...category,
      } as TripBudgetCategory),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgetCategories', tripId] }),
  })

  const deleteCat = useMutation({
    mutationFn: (categoryId: string) => deleteBudgetCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgetCategories', tripId] })
      queryClient.invalidateQueries({ queryKey: ['manualExpenses', tripId] })
    },
  })

  const addExp = useMutation({
    mutationFn: (expense: Partial<TripManualExpense>) =>
      addManualExpense({
        trip_id: tripId!,
        created_by: user!.id,
        category_id: '',
        description: '',
        amount: 0,
        currency: tripCurrency,
        ...expense,
      } as Omit<TripManualExpense, 'id' | 'created_at'>),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manualExpenses', tripId] }),
  })

  const deleteExp = useMutation({
    mutationFn: (expenseId: string) => deleteManualExpense(expenseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['manualExpenses', tripId] }),
  })

  // ─── Loading state ─────────────────────────────────────────
  const isLoading = daysLoading || flightsLoading || hotelsLoading || categoriesQuery.isLoading || expensesQuery.isLoading

  return {
    categories,
    totalBudgeted,
    totalSpent,
    remaining,
    isLoading,
    error: categoriesQuery.error || expensesQuery.error,
    rates,
    ratesLoading,
    refetchRates,
    upsertCategory: upsertCat.mutate,
    deleteCategory: deleteCat.mutate,
    addExpense: addExp.mutate,
    deleteExpense: deleteExp.mutate,
  }
}
```

- [ ] **Step 2: Add export to hooks barrel**

Add to `packages/shared/src/hooks/index.ts`:

```ts
export { useTripBudget } from './useTripBudget';
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/hooks/useTripBudget.ts packages/shared/src/hooks/index.ts
git commit -m "feat: add useTripBudget composition hook"
```

---

### Task 7: Clean Up Old Budget Code

**Files:**
- Delete: `packages/shared/src/viewmodels/budgetViewModel.ts`
- Modify: `packages/shared/src/viewmodels/index.ts`

- [ ] **Step 1: Remove budgetViewModel exports from barrel**

In `packages/shared/src/viewmodels/index.ts`, remove:

```ts
export {
  buildBudgetSummary,
  type BudgetCategory,
  type BudgetSummary,
} from './budgetViewModel';
```

- [ ] **Step 2: Delete the file**

```bash
rm packages/shared/src/viewmodels/budgetViewModel.ts
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: Errors only in `apps/web/app/(trips-app)/trip/[id]/budget/page.tsx` (the old page we're about to replace). Any other errors need fixing.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/viewmodels/budgetViewModel.ts packages/shared/src/viewmodels/index.ts
git commit -m "chore: remove old budgetViewModel (replaced by useTripBudget hook)"
```

---

## Chunk 3: Web Components — Donut Chart & Summary

### Task 8: Shared Budget Colors + BudgetSkeleton

**Files:**
- Create: `apps/web/components/budget/budgetColors.ts`

- [ ] **Step 1: Create shared color constant**

Create `apps/web/components/budget/budgetColors.ts`:

```ts
export const CATEGORY_COLORS: Record<string, string> = {
  flights: '#6B8EAE',
  hotels: '#C4956A',
  food: 'var(--trip-base)',
  activities: '#7BA69E',
  transport: '#9B8EC4',
  shopping: '#8FB87A',
  other: '#9CA3AF',
}

export function getCategoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? '#9CA3AF'
}
```

- [ ] **Step 2: Create BudgetSkeleton**

Create `apps/web/components/budget/BudgetSkeleton.tsx`:

```tsx
export function BudgetSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary strip skeleton */}
      <div className="flex items-start gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-8 w-20 bg-gray-100 animate-pulse rounded" />
            <div className="h-3 w-16 bg-gray-100 animate-pulse rounded" />
          </div>
        ))}
      </div>

      <div className="h-[1px] bg-gray-100" />

      {/* Two-column layout skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Donut skeleton */}
        <div className="flex items-center justify-center">
          <div className="w-[200px] h-[200px] rounded-full border-[28px] border-gray-100 animate-pulse" />
        </div>

        {/* Category list skeleton */}
        <div className="space-y-4 py-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-100 animate-pulse" />
              <div className="h-4 bg-gray-100 animate-pulse rounded" style={{ width: `${60 + i * 8}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/budget/budgetColors.ts apps/web/components/budget/BudgetSkeleton.tsx
git commit -m "feat: add budget color constants and BudgetSkeleton loading state"
```

---

### Task 9: BudgetSummaryStrip

**Files:**
- Create: `apps/web/components/budget/BudgetSummaryStrip.tsx`

- [ ] **Step 1: Create summary strip component**

Create `apps/web/components/budget/BudgetSummaryStrip.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { EditPencil } from 'iconoir-react'

interface BudgetSummaryStripProps {
  totalBudgeted: number
  totalSpent: number
  remaining: number
  formatAmount: (amount: number) => string
  onEditTotal: (newTotal: number) => void
}

export function BudgetSummaryStrip({
  totalBudgeted,
  totalSpent,
  remaining,
  formatAmount,
  onEditTotal,
}: BudgetSummaryStripProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const handleStartEdit = () => {
    setTempValue(totalBudgeted.toString())
    setIsEditing(true)
  }

  const handleCommit = () => {
    const parsed = parseFloat(tempValue)
    if (!isNaN(parsed) && parsed > 0) {
      onEditTotal(parsed)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCommit()
    if (e.key === 'Escape') setIsEditing(false)
  }

  return (
    <>
      <div className="flex items-start gap-12">
        {/* Total Budget — hover-editable */}
        <div className="group">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <input
                ref={inputRef}
                type="number"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={handleCommit}
                onKeyDown={handleKeyDown}
                className="text-3xl font-serif font-normal tracking-wide text-gray-900 bg-transparent border-b border-gray-300 focus:border-gray-500 outline-none w-36 transition-all duration-150"
              />
            ) : (
              <>
                <span className="text-3xl font-serif font-normal tracking-wide text-gray-900">
                  {formatAmount(totalBudgeted)}
                </span>
                <button
                  onClick={handleStartEdit}
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-300 hover:text-gray-500"
                >
                  <EditPencil width={14} height={14} />
                </button>
              </>
            )}
          </div>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 mt-1 block">
            Total Budget
          </span>
        </div>

        {/* Total Spent */}
        <div>
          <span className="text-3xl font-serif font-normal tracking-wide text-gray-900 block">
            {formatAmount(totalSpent)}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 mt-1 block">
            Total Spent
          </span>
        </div>

        {/* Remaining */}
        <div>
          <span className={`text-3xl font-serif font-normal tracking-wide block ${
            remaining >= 0 ? 'text-emerald-600' : 'text-red-500'
          }`}>
            {formatAmount(Math.abs(remaining))}
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 mt-1 block">
            Remaining
          </span>
        </div>
      </div>

      <div className="h-[1px] bg-gray-100 my-6" />
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/budget/BudgetSummaryStrip.tsx
git commit -m "feat: add BudgetSummaryStrip with hover-editable total"
```

---

### Task 10: BudgetDonutChart

**Files:**
- Create: `apps/web/components/budget/BudgetDonutChart.tsx`

- [ ] **Step 1: Create donut chart component**

Create `apps/web/components/budget/BudgetDonutChart.tsx`:

```tsx
'use client'

import { useState, useRef } from 'react'
import type { BudgetCategoryData } from '@travyl/shared'
import { getCategoryColor } from './budgetColors'

interface DonutTooltip {
  name: string
  amount: string
  percent: string
  x: number
  y: number
}

interface BudgetDonutChartProps {
  categories: BudgetCategoryData[]
  hoveredCategory: string | null
  onHoverCategory: (name: string | null) => void
  formatAmount: (amount: number) => string
}

export function BudgetDonutChart({
  categories,
  hoveredCategory,
  onHoverCategory,
  formatAmount,
}: BudgetDonutChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<DonutTooltip | null>(null)

  const totalSpent = categories.reduce((sum, c) => sum + c.actual, 0)
  const totalBudgeted = categories.reduce((sum, c) => sum + c.budgeted, 0)
  const percentUsed = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0

  // SVG constants
  const cx = 100
  const cy = 100
  const r = 80
  const circumference = 2 * Math.PI * r
  const tooltipOffset = 40

  // Compute segments
  const segments = categories
    .filter((c) => c.actual > 0)
    .map((c) => ({
      name: c.name,
      value: c.actual,
      percent: totalSpent > 0 ? (c.actual / totalSpent) * 100 : 0,
      color: getCategoryColor(c.name),
    }))

  // Build dash offsets
  let cumulativePercent = 0
  const segmentData = segments.map((seg) => {
    const startPercent = cumulativePercent
    cumulativePercent += seg.percent
    const dashLength = (seg.percent / 100) * circumference
    const dashOffset = -((startPercent / 100) * circumference)

    // Midpoint angle for tooltip positioning (0° = top)
    const midAngleDeg = (startPercent + seg.percent / 2) * 3.6 // percent -> degrees
    const midAngleRad = ((midAngleDeg - 90) * Math.PI) / 180
    const tooltipX = cx + (r + tooltipOffset) * Math.cos(midAngleRad)
    const tooltipY = cy + (r + tooltipOffset) * Math.sin(midAngleRad)

    return { ...seg, dashLength, dashOffset, tooltipX, tooltipY }
  })

  const handleSegmentHover = (seg: typeof segmentData[0] | null) => {
    if (!seg) {
      onHoverCategory(null)
      setTooltip(null)
      return
    }
    onHoverCategory(seg.name)

    // Convert SVG coords to DOM coords
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const svgSize = 200 // viewBox size
    const scaleX = rect.width / svgSize
    const scaleY = rect.height / svgSize
    let x = seg.tooltipX * scaleX
    let y = seg.tooltipY * scaleY

    // Clamp to container bounds (with padding)
    const pad = 8
    x = Math.max(pad, Math.min(rect.width - pad, x))
    y = Math.max(pad, Math.min(rect.height - pad, y))

    setTooltip({
      name: seg.name,
      amount: formatAmount(seg.value),
      percent: `${Math.round(seg.percent)}%`,
      x,
      y,
    })
  }

  // Empty state
  if (segments.length === 0) {
    return (
      <div className="flex items-center justify-center">
        <div className="relative w-full max-w-[280px] aspect-square">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle
              cx={cx} cy={cy} r={r}
              fill="none" stroke="#F3F4F6" strokeWidth={28}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm text-gray-400">No budget</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center">
      <div ref={containerRef} className="relative w-full max-w-[280px] aspect-square">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {segmentData.map((seg) => {
            const isHovered = hoveredCategory === seg.name
            const isAnyHovered = hoveredCategory !== null
            const opacity = isAnyHovered ? (isHovered ? 1 : 0.25) : 0.75
            const brightness = isHovered ? 'brightness(1.05)' : 'brightness(1)'

            return (
              <circle
                key={seg.name}
                cx={cx} cy={cy} r={r}
                fill="none"
                strokeWidth={28}
                strokeLinecap="round"
                strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
                strokeDashoffset={seg.dashOffset}
                style={{
                  stroke: seg.color,
                  opacity,
                  filter: brightness,
                  transition: 'opacity 200ms ease-out, filter 200ms ease-out',
                  cursor: 'pointer',
                }}
                onMouseEnter={() => handleSegmentHover(seg)}
                onMouseLeave={() => handleSegmentHover(null)}
              />
            )
          })}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-serif font-normal text-gray-900">{percentUsed}</span>
          <span className="text-xs text-gray-400">% used</span>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-white shadow-md rounded-full px-3 py-1.5 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap z-10"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              opacity: 1,
              transition: 'opacity 150ms, transform 150ms',
            }}
          >
            <span className="text-xs font-medium text-gray-700">
              {tooltip.name} · {tooltip.amount} · {tooltip.percent}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/budget/BudgetDonutChart.tsx
git commit -m "feat: add BudgetDonutChart with SVG segments, radial tooltips, and cross-highlight"
```

---

## Chunk 4: Web Components — Category List & Detail

### Task 11: AddExpenseForm

**Files:**
- Create: `apps/web/components/budget/AddExpenseForm.tsx`

- [ ] **Step 1: Create inline expense form**

Create `apps/web/components/budget/AddExpenseForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

interface AddExpenseFormProps {
  categoryId: string
  tripCurrency: string
  onSubmit: (expense: { category_id: string; description: string; amount: number; currency: string }) => void
  onCancel: () => void
}

export function AddExpenseForm({ categoryId, tripCurrency, onSubmit, onCancel }: AddExpenseFormProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')

  const handleSubmit = () => {
    const parsed = parseFloat(amount)
    if (description.trim() && !isNaN(parsed) && parsed > 0) {
      onSubmit({
        category_id: categoryId,
        description: description.trim(),
        amount: parsed,
        currency: tripCurrency,
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="flex items-end gap-3 mt-3">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Description"
          autoFocus
          className="flex-1 border-b border-gray-200 focus:border-gray-400 outline-none text-sm py-1 bg-transparent transition-colors"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="$0"
          className="w-24 border-b border-gray-200 focus:border-gray-400 outline-none text-sm py-1 bg-transparent tabular-nums transition-colors"
        />
        <button
          onClick={handleSubmit}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors shrink-0"
        >
          Add
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors shrink-0"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/budget/AddExpenseForm.tsx
git commit -m "feat: add AddExpenseForm with minimal underline-style inputs"
```

---

### Task 12: AddCategoryForm

**Files:**
- Create: `apps/web/components/budget/AddCategoryForm.tsx`

- [ ] **Step 1: Create inline category form**

Create `apps/web/components/budget/AddCategoryForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'motion/react'

interface AddCategoryFormProps {
  onSubmit: (category: { category: string; budgeted: number }) => void
  onCancel: () => void
}

export function AddCategoryForm({ onSubmit, onCancel }: AddCategoryFormProps) {
  const [name, setName] = useState('')
  const [budgeted, setBudgeted] = useState('')

  const handleSubmit = () => {
    if (name.trim()) {
      onSubmit({
        category: name.trim().toLowerCase(),
        budgeted: parseFloat(budgeted) || 0,
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onCancel()
  }

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="flex items-end gap-3 py-2.5">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Category name"
          autoFocus
          className="flex-1 border-b border-gray-200 focus:border-gray-400 outline-none text-sm py-1 bg-transparent transition-colors"
        />
        <input
          type="number"
          value={budgeted}
          onChange={(e) => setBudgeted(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="$0"
          className="w-24 border-b border-gray-200 focus:border-gray-400 outline-none text-sm py-1 bg-transparent tabular-nums transition-colors"
        />
        <button
          onClick={handleSubmit}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors shrink-0"
        >
          Add
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors shrink-0"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/budget/AddCategoryForm.tsx
git commit -m "feat: add AddCategoryForm with minimal underline-style inputs"
```

---

### Task 13: BudgetCategoryDetail

**Files:**
- Create: `apps/web/components/budget/BudgetCategoryDetail.tsx`

- [ ] **Step 1: Create category detail component**

Create `apps/web/components/budget/BudgetCategoryDetail.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Xmark, Plus } from 'iconoir-react'
import { convertToTripCurrency } from '@travyl/shared'
import type { BudgetCategoryData } from '@travyl/shared'
import { AddExpenseForm } from './AddExpenseForm'

interface BudgetMutations {
  addExpense: (expense: { category_id: string; description: string; amount: number; currency: string }) => void
  deleteExpense: (expenseId: string) => void
}

interface BudgetCategoryDetailProps {
  category: BudgetCategoryData
  mutations: BudgetMutations
  tripCurrency: string
  rates: Record<string, number> | null
  formatAmount: (amount: number) => string
}

export function BudgetCategoryDetail({
  category,
  mutations,
  tripCurrency,
  rates,
  formatAmount,
}: BudgetCategoryDetailProps) {
  const [showAddForm, setShowAddForm] = useState(false)

  return (
    <div className="pl-5 border-t border-gray-100 mt-2 pt-3">
      {/* From Calendar section */}
      {category.calendarItems.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 mb-2">
            From Calendar
          </div>
          <div className="space-y-2">
            {category.calendarItems.map((item) => (
              <div key={item.id} className="flex items-start justify-between">
                <div>
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <span className="text-xs text-gray-400 block">
                    {item.day > 0 ? `Day ${item.day}` : ''}
                    {item.time ? ` · ${item.time}` : ''}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900 tabular-nums shrink-0 ml-4">
                  {formatAmount(item.cost)}
                  {item.originalCurrency && (
                    <span className="text-xs text-gray-400 ml-1">
                      ({item.originalCurrency})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Expenses section */}
      {category.manualExpenses.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 mb-2 mt-4">
            Manual Expenses
          </div>
          <div className="space-y-2">
            {category.manualExpenses.map((expense) => (
              <div key={expense.id} className="group flex items-start justify-between">
                <div>
                  <span className="text-sm text-gray-700">{expense.description}</span>
                  <span className="text-[10px] uppercase tracking-[0.06em] text-amber-500 font-medium ml-2">
                    Manual
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <span className="text-sm font-medium text-gray-900 tabular-nums">
                    {formatAmount(convertToTripCurrency(expense.amount, expense.currency, tripCurrency, rates))}
                  </span>
                  <button
                    onClick={() => mutations.deleteExpense(expense.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all duration-150"
                  >
                    <Xmark width={14} height={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add expense action */}
      <AnimatePresence>
        {showAddForm ? (
          <AddExpenseForm
            key="form"
            categoryId={category.id}
            tripCurrency={tripCurrency}
            onSubmit={(expense) => {
              mutations.addExpense(expense)
              setShowAddForm(false)
            }}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <button
            key="link"
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-3"
          >
            <Plus width={12} height={12} />
            Add expense
          </button>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/budget/BudgetCategoryDetail.tsx
git commit -m "feat: add BudgetCategoryDetail with calendar items, manual expenses, and hover-reveal delete"
```

---

### Task 14: BudgetCategoryList

**Files:**
- Create: `apps/web/components/budget/BudgetCategoryList.tsx`

- [ ] **Step 1: Create category list component**

Create `apps/web/components/budget/BudgetCategoryList.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { EditPencil, Xmark, NavArrowDown, Plus } from 'iconoir-react'
import type { BudgetCategoryData } from '@travyl/shared'
import { BudgetCategoryDetail } from './BudgetCategoryDetail'
import { AddCategoryForm } from './AddCategoryForm'
import { getCategoryColor } from './budgetColors'

interface BudgetMutations {
  upsertCategory: (category: { category: string; budgeted: number; [key: string]: unknown }) => void
  deleteCategory: (categoryId: string) => void
  addExpense: (expense: { category_id: string; description: string; amount: number; currency: string }) => void
  deleteExpense: (expenseId: string) => void
}

interface BudgetCategoryListProps {
  categories: BudgetCategoryData[]
  hoveredCategory: string | null
  onHoverCategory: (name: string | null) => void
  expandedCategory: string | null
  onExpandCategory: (id: string | null) => void
  mutations: BudgetMutations
  tripCurrency: string
  rates: Record<string, number> | null
  formatAmount: (amount: number) => string
}

export function BudgetCategoryList({
  categories,
  hoveredCategory,
  onHoverCategory,
  expandedCategory,
  onExpandCategory,
  mutations,
  tripCurrency,
  rates,
  formatAmount,
}: BudgetCategoryListProps) {
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editBudgetValue, setEditBudgetValue] = useState('')

  return (
    <div>
      {categories.map((cat) => {
        const isExpanded = expandedCategory === cat.id
        const isHovered = hoveredCategory === cat.name
        const color = getCategoryColor(cat.name)
        const percentClamped = Math.min(cat.percentUsed, 100)
        const barColor = cat.percentUsed >= 100 ? '#EF4444' : cat.percentUsed >= 80 ? '#F59E0B' : color

        return (
          <div key={cat.id}>
            {/* Row */}
            <div
              className={`group py-2.5 px-2 -mx-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                isHovered ? 'bg-gray-50' : ''
              }`}
              onMouseEnter={() => onHoverCategory(cat.name)}
              onMouseLeave={() => onHoverCategory(null)}
              onClick={() => onExpandCategory(isExpanded ? null : cat.id)}
            >
              <div className="flex items-center">
                {/* Color dot */}
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 mr-3"
                  style={{ backgroundColor: color }}
                />

                {/* Category name */}
                <span className="text-sm font-medium text-gray-700">{cat.name}</span>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Amounts */}
                <span className={`text-sm tabular-nums mr-1 ${
                  cat.percentUsed >= 100 ? 'text-red-500 font-medium' : 'text-gray-900 font-medium'
                }`}>
                  {formatAmount(cat.actual)}
                </span>
                <span className="text-sm tabular-nums text-gray-400">
                  / {formatAmount(cat.budgeted)}
                </span>

                {/* Hover actions — inline edit budgeted amount */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingCategoryId(cat.id)
                    setEditBudgetValue(cat.budgeted.toString())
                  }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-600 ml-2 transition-opacity duration-150"
                >
                  <EditPencil width={14} height={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); mutations.deleteCategory(cat.id) }}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-600 ml-1 transition-opacity duration-150"
                >
                  <Xmark width={14} height={14} />
                </button>

                {/* Chevron */}
                <NavArrowDown
                  width={16}
                  height={16}
                  className={`text-gray-400 ml-1 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>

              {/* Hover progress bar — uses both CSS group-hover (instant on native hover)
                  and isHovered prop (cross-highlight from donut) */}
              <div className={`mt-1.5 h-0.5 rounded-full bg-gray-100 overflow-hidden transition-opacity duration-200 opacity-0 group-hover:opacity-100 ${
                isHovered ? '!opacity-100' : ''
              }`}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${percentClamped}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
            </div>

            {/* Inline budget edit */}
            {editingCategoryId === cat.id && (
              <div className="flex items-center gap-2 px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs text-gray-400">Budget:</span>
                <input
                  type="number"
                  value={editBudgetValue}
                  onChange={(e) => setEditBudgetValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const parsed = parseFloat(editBudgetValue)
                      if (!isNaN(parsed)) mutations.upsertCategory({ id: cat.id, category: cat.name, budgeted: parsed })
                      setEditingCategoryId(null)
                    }
                    if (e.key === 'Escape') setEditingCategoryId(null)
                  }}
                  onBlur={() => {
                    const parsed = parseFloat(editBudgetValue)
                    if (!isNaN(parsed)) mutations.upsertCategory({ id: cat.id, category: cat.name, budgeted: parsed })
                    setEditingCategoryId(null)
                  }}
                  autoFocus
                  className="w-24 border-b border-gray-200 focus:border-gray-400 outline-none text-sm py-0.5 bg-transparent tabular-nums transition-colors"
                />
              </div>
            )}

            {/* Expanded detail */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  key="detail"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <BudgetCategoryDetail
                    category={cat}
                    mutations={mutations}
                    tripCurrency={tripCurrency}
                    rates={rates}
                    formatAmount={formatAmount}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {/* Add category action */}
      <AnimatePresence>
        {showAddCategory ? (
          <AddCategoryForm
            key="form"
            onSubmit={(cat) => {
              mutations.upsertCategory(cat)
              setShowAddCategory(false)
            }}
            onCancel={() => setShowAddCategory(false)}
          />
        ) : (
          <button
            key="link"
            onClick={() => setShowAddCategory(true)}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors mt-4"
          >
            <Plus width={14} height={14} />
            Add category
          </button>
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/budget/BudgetCategoryList.tsx
git commit -m "feat: add BudgetCategoryList with hover progress bars, cross-highlight, and accordion expand"
```

---

### Task 15: CurrencyFooter

**Files:**
- Create: `apps/web/components/budget/CurrencyFooter.tsx`

- [ ] **Step 1: Create currency footer component**

Create `apps/web/components/budget/CurrencyFooter.tsx`:

```tsx
'use client'

interface CurrencyFooterProps {
  tripCurrency: string
  rates: Record<string, number> | null
  isLoading: boolean
  onRefresh: () => void
  /** Currencies present in the trip's data (to filter which rates to show) */
  activeCurrencies: string[]
}

export function CurrencyFooter({
  tripCurrency,
  rates,
  isLoading,
  onRefresh,
  activeCurrencies,
}: CurrencyFooterProps) {
  if (isLoading) return null

  const relevantCurrencies = activeCurrencies.filter((c) => c !== tripCurrency)

  return (
    <div className="mt-8 text-xs text-gray-400">
      {rates && relevantCurrencies.length > 0 ? (
        <span>
          {tripCurrency}
          {relevantCurrencies.map((currency) => {
            const rate = rates[currency]
            if (!rate) return null
            const inverse = (1 / rate).toFixed(2)
            return (
              <span key={currency}>
                {' · '}1 {currency} = {new Intl.NumberFormat('en-US', { style: 'currency', currency: tripCurrency }).format(Number(inverse))}
              </span>
            )
          })}
          {' · '}
          <button
            onClick={onRefresh}
            className="hover:text-gray-600 hover:underline transition-colors cursor-pointer"
          >
            Refresh
          </button>
        </span>
      ) : rates ? (
        <span>{tripCurrency}</span>
      ) : (
        <span>Rates unavailable</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/budget/CurrencyFooter.tsx
git commit -m "feat: add CurrencyFooter with filtered exchange rates and refresh"
```

---

## Chunk 5: Page Assembly & Barrel Export

### Task 16: Barrel Export

**Files:**
- Create: `apps/web/components/budget/index.ts`

- [ ] **Step 1: Create barrel export**

Create `apps/web/components/budget/index.ts`:

```ts
export { BudgetSkeleton } from './BudgetSkeleton'
export { BudgetSummaryStrip } from './BudgetSummaryStrip'
export { BudgetDonutChart } from './BudgetDonutChart'
export { BudgetCategoryList } from './BudgetCategoryList'
export { BudgetCategoryDetail } from './BudgetCategoryDetail'
export { AddExpenseForm } from './AddExpenseForm'
export { AddCategoryForm } from './AddCategoryForm'
export { CurrencyFooter } from './CurrencyFooter'
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/budget/index.ts
git commit -m "feat: add budget components barrel export"
```

---

### Task 17: Budget Page — Full Rewrite

**Files:**
- Rewrite: `apps/web/app/(trips-app)/trip/[id]/budget/page.tsx`

- [ ] **Step 1: Rewrite budget page**

Replace the entire contents of `apps/web/app/(trips-app)/trip/[id]/budget/page.tsx`:

```tsx
'use client'

import { use, useState, useMemo } from 'react'
import { useTripBudget, useTrip, formatBudgetAmount } from '@travyl/shared'
import {
  BudgetSkeleton,
  BudgetSummaryStrip,
  BudgetDonutChart,
  BudgetCategoryList,
  CurrencyFooter,
} from '@/components/budget'

export default function Budget({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: trip } = useTrip(id)
  const tripCurrency = trip?.currency ?? 'USD'

  const {
    categories,
    totalBudgeted,
    totalSpent,
    remaining,
    isLoading,
    error,
    rates,
    ratesLoading,
    refetchRates,
    upsertCategory,
    deleteCategory,
    addExpense,
    deleteExpense,
  } = useTripBudget(id, tripCurrency)

  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const formatAmount = useMemo(
    () => (amount: number) => formatBudgetAmount(amount, tripCurrency),
    [tripCurrency],
  )

  const mutations = useMemo(() => ({
    upsertCategory,
    deleteCategory,
    addExpense,
    deleteExpense,
  }), [upsertCategory, deleteCategory, addExpense, deleteExpense])

  // Collect currencies present in trip data for CurrencyFooter
  const activeCurrencies = useMemo(() => {
    const currencies = new Set<string>()
    for (const cat of categories) {
      for (const item of cat.calendarItems) {
        if (item.originalCurrency) currencies.add(item.originalCurrency)
      }
      for (const expense of cat.manualExpenses) {
        if (expense.currency !== tripCurrency) currencies.add(expense.currency)
      }
    }
    return Array.from(currencies)
  }, [categories, tripCurrency])

  // Handle total budget edit (proportional redistribution).
  // Note: fires one mutation per category. React Query dedupes the invalidation
  // since all mutations share the same queryKey. The last onSuccess triggers the refetch.
  const handleEditTotal = (newTotal: number) => {
    if (totalBudgeted <= 0) return
    const ratio = newTotal / totalBudgeted
    for (const cat of categories) {
      upsertCategory({
        id: cat.id,
        category: cat.name,
        budgeted: Math.round(cat.budgeted * ratio * 100) / 100,
      })
    }
  }

  if (isLoading) return <BudgetSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-gray-500 mb-2">Failed to load budget data</p>
        <button
          onClick={() => window.location.reload()}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      <BudgetSummaryStrip
        totalBudgeted={totalBudgeted}
        totalSpent={totalSpent}
        remaining={remaining}
        formatAmount={formatAmount}
        onEditTotal={handleEditTotal}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <BudgetDonutChart
          categories={categories}
          hoveredCategory={hoveredCategory}
          onHoverCategory={setHoveredCategory}
          formatAmount={formatAmount}
        />
        <BudgetCategoryList
          categories={categories}
          hoveredCategory={hoveredCategory}
          onHoverCategory={setHoveredCategory}
          expandedCategory={expandedCategory}
          onExpandCategory={setExpandedCategory}
          mutations={mutations}
          tripCurrency={tripCurrency}
          rates={rates}
          formatAmount={formatAmount}
        />
      </div>

      <CurrencyFooter
        tripCurrency={tripCurrency}
        rates={rates}
        isLoading={ratesLoading}
        onRefresh={refetchRates}
        activeCurrencies={activeCurrencies}
      />
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (all imports should resolve)

- [ ] **Step 3: Run dev server and visually verify**

Run: `npm run web`
Navigate to a trip's budget tab. Verify:
- Skeleton shows on load
- Summary strip renders with serif numbers
- Donut chart renders segments
- Category list shows rows
- Hover cross-highlight works between donut and list
- Currency footer shows at bottom

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(trips-app\)/trip/\[id\]/budget/page.tsx
git commit -m "feat: rewrite budget page with Apple-minimal design and hover interactions"
```

---

## Chunk 6: Database Migration & Final Cleanup

### Task 18: Supabase Migration

**Files:**
- Create SQL migration via Supabase dashboard or CLI

- [ ] **Step 1: Create the two new tables in Supabase**

Run this SQL in the Supabase SQL Editor for the Travyl project:

```sql
-- Budget categories per trip
CREATE TABLE trip_budget_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  category text NOT NULL,
  budgeted numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Manual expenses per budget category
CREATE TABLE trip_manual_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES trip_budget_categories(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS policies — same trip-based pattern as other tables
ALTER TABLE trip_budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_manual_expenses ENABLE ROW LEVEL SECURITY;

-- Budget categories: trip owner + collaborators with edit role can CRUD
CREATE POLICY "trip_budget_categories_select" ON trip_budget_categories
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid() AND invite_status = 'accepted'
    )
  );

CREATE POLICY "trip_budget_categories_insert" ON trip_budget_categories
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid() AND role_type = 'editor' AND invite_status = 'accepted'
    )
  );

CREATE POLICY "trip_budget_categories_update" ON trip_budget_categories
  FOR UPDATE USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid() AND role_type = 'editor' AND invite_status = 'accepted'
    )
  );

CREATE POLICY "trip_budget_categories_delete" ON trip_budget_categories
  FOR DELETE USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid() AND role_type = 'editor' AND invite_status = 'accepted'
    )
  );

-- Manual expenses: same policies
CREATE POLICY "trip_manual_expenses_select" ON trip_manual_expenses
  FOR SELECT USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid() AND invite_status = 'accepted'
    )
  );

CREATE POLICY "trip_manual_expenses_insert" ON trip_manual_expenses
  FOR INSERT WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid() AND role_type = 'editor' AND invite_status = 'accepted'
    )
  );

CREATE POLICY "trip_manual_expenses_delete" ON trip_manual_expenses
  FOR DELETE USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid() AND role_type = 'editor' AND invite_status = 'accepted'
    )
  );

-- Indexes
CREATE INDEX idx_budget_categories_trip ON trip_budget_categories(trip_id);
CREATE INDEX idx_manual_expenses_trip ON trip_manual_expenses(trip_id);
CREATE INDEX idx_manual_expenses_category ON trip_manual_expenses(category_id);
```

- [ ] **Step 2: Verify tables exist**

Run in Supabase SQL Editor:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'trip_budget%' OR table_name LIKE 'trip_manual%';
```
Expected: `trip_budget_categories` and `trip_manual_expenses`

---

### Task 19: Run All Tests

- [ ] **Step 1: Run shared package tests**

Run: `cd packages/shared && npm test`
Expected: All tests pass, including new `budgetMapping.test.ts` and `currency.test.ts`

- [ ] **Step 2: Run typecheck across all workspaces**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS (or only pre-existing warnings)
