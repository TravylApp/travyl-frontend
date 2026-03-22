# Budget Page Design

## Goal

Replace the mock-data budget page with a real, data-driven budget tracker. The page computes costs from existing trip data (activities, flights, hotels), supports per-category budget targets, manual expenses, and multi-currency conversion.

## Database Schema

### `trip_budget_categories`

Per-category budget targets, stored in Supabase. RLS is trip-based — any collaborator with edit permission can manage budget categories.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| trip_id | uuid | NO | FK -> trips.id |
| category | text | NO | e.g. "flights", "hotels", "food" |
| budgeted | numeric | NO | 0 |
| sort_order | integer | NO | 0 (insertion order, no reordering UI) |
| created_by | uuid | NO | FK -> auth.users |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

### `trip_manual_expenses`

Manual line-item expenses not tied to calendar activities.

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid() |
| trip_id | uuid | NO | FK -> trips.id |
| category_id | uuid | NO | FK -> trip_budget_categories.id |
| description | text | NO | |
| amount | numeric | NO | 0 |
| currency | text | NO | (app supplies trip currency, no SQL default) |
| created_by | uuid | NO | FK -> auth.users |
| created_at | timestamptz | NO | now() |

No exchange rate storage — rates are fetched client-side and cached in React Query.

## Data Flow

### Cost computation

1. **Activities** — `useItineraryDays` returns `ItineraryDayWithActivities[]`. Iterate `day.activities` to sum `estimated_cost`, grouped by activity `category` mapped to budget categories via `mapActivityToBudgetCategory()`
2. **Flights** — `useFlights` returns `Flight[]`. Sum `flight.data.price` -> "flights" budget category
3. **Hotels** — `useHotels` returns `Hotel[]`. Sum `hotel.data.total_price` (or `price_per_night * nights`) -> "hotels" budget category
4. **Manual expenses** — fetched from `trip_manual_expenses`, grouped by `category_id`

### Category mapping function

`mapActivityToBudgetCategory(activityCategory: string): string` — lives in `packages/shared/src/utils/budgetMapping.ts`.

| Activity category slug | Budget category |
|---|---|
| flight | flights |
| hotel, accommodation | hotels |
| restaurant, food, dining, cafe, bar | food |
| tour, museum, attraction, entertainment, sightseeing | activities |
| transport, car, bus, train, taxi | transport |
| shopping | shopping |
| * (any unmatched) | other |

### Currency conversion

- Amounts not in the trip's currency are converted using rates from frankfurter.app
- `convertToTripCurrency(amount: number, fromCurrency: string, tripCurrency: string, rates: Record<string, number>): number` — lives in `packages/shared/src/utils/currency.ts`
- If rates unavailable, amounts display in original currency without conversion

### Main hook: `useTripBudget(tripId)`

Composes existing hooks — calls `useItineraryDays`, `useFlights`, `useHotels` directly (not through `useItineraryScreen`, to avoid pulling unnecessary state). Also fetches budget categories and manual expenses via `budgetService`, and exchange rates via `useExchangeRates`.

Returns:
```ts
{
  categories: BudgetCategoryData[]  // see new types below
  totalBudgeted: number
  totalSpent: number
  remaining: number
  isLoading: boolean
  // mutations
  upsertCategory: (category: Partial<TripBudgetCategory>) => Promise<void>
  deleteCategory: (categoryId: string) => Promise<void>
  addExpense: (expense: Partial<TripManualExpense>) => Promise<void>
  deleteExpense: (expenseId: string) => Promise<void>
}
```

Each `BudgetCategoryData` includes:
```ts
{
  id: string
  name: string
  budgeted: number
  actual: number           // computed costs + manual expenses, converted to trip currency
  calendarItems: Array<{ id: string; name: string; day: number; time?: string; cost: number; originalCurrency?: string }>
  manualExpenses: TripManualExpense[]
  percentUsed: number
}
```

### Replaces existing code

- `packages/shared/src/viewmodels/budgetViewModel.ts` (`buildBudgetSummary`) — replaced by `useTripBudget`. The old function can be removed.
- `BudgetItem` and `BudgetExpense` types in `packages/shared/src/types/index.ts` — replaced by `TripBudgetCategory`, `TripManualExpense`, and `BudgetCategoryData`. Old types removed.
- `MOCK_BUDGET_ITEMS` export — removed.

## Exchange Rates

- **Hook:** `useExchangeRates(baseCurrency: string)` fetches `https://api.frankfurter.app/latest?from={currency}`
- **Returns:** `{ rates: Record<string, number>, isLoading: boolean, error: Error | null, refetch: () => void }`
- **Caching:** React Query with `staleTime: 24h`
- **Refresh:** "Refresh rates" link in CurrencyBar calls `refetch()`
- **Fallback:** If API unreachable, `rates` is `null` — consumers skip conversion and display original currencies

## UI Layout

### Summary Row (top)

Three cards in a row:
- **Total Budget** — sum of all category targets, editable
- **Total Spent** — sum of all computed + manual costs
- **Remaining** — difference, green when positive, red when negative

### Main Area (two columns)

**Left column — Donut Chart (`BudgetDonutChart`):**
- Hand-rolled SVG donut (no chart library) — `stroke-dasharray` segments per category
- Total percentage used in the center
- Hoverable color-coded legend below
- Hover tooltip on each segment shows category name + amount + percentage
- Hovering a segment highlights the corresponding category bar (and vice versa)
- Responsive: on screens < 768px, donut stacks above the category list (single column)

**Right column — Category Progress Bars (`BudgetCategoryList`):**
- Each category shows: icon (iconoir-react), name, actual / budgeted, progress bar
- Color-coded per category, turns red/amber at thresholds (80%, 100%)
- Over-budget categories get red background
- Clickable to expand `BudgetCategoryDetail` inline
- "Add Category" dashed button at bottom

### Category Detail (expanded, inline — `BudgetCategoryDetail`)

- **"From Calendar" section** — auto-computed items from activities/flights/hotels, showing name, day/time, and cost. Read-only.
- **"Manual Expenses" section** — user-added items with delete button, distinct styling (yellow background)
- **"Add Manual Expense" button** — opens `AddExpenseForm` inline with description, amount, and currency fields

### Currency Bar (bottom — `CurrencyBar`)

- Trip currency display
- Active exchange rates for currencies present in the trip (e.g. "1 EUR = $1.08")
- "Refresh rates" link
- "Rates unavailable" fallback state

### Hover interactions

- Donut segment hover highlights corresponding category bar
- Category bar hover highlights corresponding donut segment
- Legend items are hoverable
- Managed via shared `hoveredCategory: string | null` state in page component, passed as props

## Component Architecture

### Web components (`apps/web/components/budget/`)

| Component | Props | Responsibility |
|---|---|---|
| `BudgetSummaryCards` | `totalBudgeted, totalSpent, remaining, onEditTotal` | 3 top summary cards |
| `BudgetDonutChart` | `categories, hoveredCategory, onHoverCategory` | Hand-rolled SVG donut with hover tooltips |
| `BudgetCategoryList` | `categories, hoveredCategory, onHoverCategory, onExpandCategory, mutations` | List of category progress bars |
| `BudgetCategoryDetail` | `category, mutations` | Expanded view with calendar items + manual expenses |
| `AddExpenseForm` | `categoryId, tripCurrency, onSubmit, onCancel` | Inline form for adding manual expenses |
| `CurrencyBar` | `tripCurrency, rates, isLoading, onRefresh` | Bottom bar with rates + refresh |

### Shared package (`packages/shared/`)

| Module | Responsibility |
|---|---|
| `hooks/useTripBudget` | Main data hook — composes useItineraryDays, useFlights, useHotels, budgetService, useExchangeRates |
| `hooks/useExchangeRates` | React Query hook for frankfurter.app |
| `services/budgetService` | Supabase CRUD for trip_budget_categories + trip_manual_expenses |
| `utils/budgetMapping` | `mapActivityToBudgetCategory()` function |
| `utils/currency` | `convertToTripCurrency()` function |

### Page file

`apps/web/app/(trips-app)/trip/[id]/budget/page.tsx` becomes a thin wrapper that calls `useTripBudget(tripId)` and renders components. The existing 840-line file is replaced entirely.

## Animations

- Category expand/collapse: `AnimatePresence` + `motion.div` (same pattern as current page)
- Donut segments: CSS transition on hover (opacity)
- Progress bars: width transition on mount/update

## Error Handling

- Budget categories fail to load: show error state with retry button
- Exchange rate fetch fails: show "Rates unavailable" in CurrencyBar, display amounts in original currencies
- Manual expense CRUD fails: toast notification, optimistic update rollback via React Query

## Out of Scope

- Splitting costs between travelers
- Budget templates / presets
- Budget notifications / alerts via push
- Mobile app changes (web only for now)
- Daily spending chart (can add later)
- Category reordering UI (sort_order follows insertion order)
