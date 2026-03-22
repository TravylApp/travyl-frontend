# Budget Page Design

## Goal

Replace the mock-data budget page with a data-driven budget tracker. Computes costs from existing trip data (activities, flights, hotels), supports per-category budget targets, manual expenses, and multi-currency conversion.

**Design philosophy:** Apple-minimal. Typography-driven hierarchy, generous whitespace, monochrome at rest. Hover is the primary feature-discovery mechanism — the page looks quiet and clean until you interact, then everything comes alive with tooltips, cross-highlights, progress bars, and action reveals.

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
  categories: BudgetCategoryData[]
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
- **Refresh:** "Refresh" link in currency footer calls `refetch()`
- **Fallback:** If API unreachable, `rates` is `null` — consumers skip conversion and display original currencies

## UI Design

### Design Principles

1. **Typography IS the hierarchy.** Large serif numbers, tiny overline labels. No card borders on summary stats.
2. **Monochrome at rest, color on hover.** The donut chart provides all color. Category rows are gray-scale until interacted with.
3. **Hover reveals features.** Progress bars, action buttons, tooltips, and cross-highlights all appear on hover. The page looks almost static until you move your mouse.
4. **One accent source.** The donut is the single piece of visual richness. Everything else recedes behind it.
5. **All transitions:** `transition-all duration-200 ease-out`. No springs, no bounce — quiet linear dissolves.

### Summary Strip (top)

Three stat groups in a horizontal row. No cards, no borders, no backgrounds — just type.

```
$2,560                    $1,830                    $730
Total Budget              Total Spent               Remaining
```

- Numbers: `text-3xl font-serif font-normal tracking-wide text-gray-900` (Lustria)
- Labels: `text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400` (Satoshi overline)
- "Total Budget" is **hover-editable**: on hover, a subtle pencil icon (`EditPencil` from iconoir, 14px, `text-gray-300`) fades in to the right of the number (`opacity-0 group-hover:opacity-100 transition-opacity`). Click transitions the number to an inline input with same typography, auto-focused, commits on Enter/blur.
- "Remaining" number: `text-emerald-600` when positive, `text-red-500` when negative
- Below the strip: a single `h-[1px] bg-gray-100` divider with `my-6` spacing

### Main Area (two columns)

`grid grid-cols-1 md:grid-cols-2 gap-8` — donut left, category list right. On mobile, donut stacks above list.

#### Left Column — Donut Chart (`BudgetDonutChart`)

Hand-rolled SVG, no chart library. Sized to fill column width, max ~280px.

**Geometry:**
- `viewBox="0 0 200 200"`, circle at center (100,100)
- `r="80"`, `strokeWidth="28"` — a thin, elegant ring (not chunky)
- `fill="none"`, segments via `stroke-dasharray` / `stroke-dashoffset` with `stroke-linecap: round`
- Each segment colored per category (see Category Colors below)

**Center text:**
- Percentage: `text-2xl font-serif font-normal text-gray-900` (e.g. "72")
- Unit: `text-xs text-gray-400` below ("% used")

**Resting state:**
- All segments at `opacity: 0.75`
- No legend below the chart — the category list on the right IS the legend

**Hover behavior (per segment):**
- Hovered segment: `opacity: 1`, slight `filter: brightness(1.05)`
- All other segments: `opacity: 0.25`
- **Tooltip**: floating pill that appears near the hovered segment, positioned radially (outside the ring). White bg, `shadow-md`, `rounded-full`, `px-3 py-1.5`. Content: `"Flights · $750 · 29%"` in `text-xs font-medium text-gray-700`. Pointer events none. Appears with `opacity` + `translate` transition (subtle slide-in from center).
- **Cross-highlight**: sets `hoveredCategory` state, which the category list reads

**Empty state (no budget data):**
- Full gray ring, center text: "No budget" in `text-sm text-gray-400`

#### Right Column — Category List (`BudgetCategoryList`)

A vertical stack of category rows. No grid, no cards — just clean rows separated by whitespace.

**Each row (resting state):**
```
[●] Flights ·························· $750 / $800
```

- Color dot: `w-2.5 h-2.5 rounded-full` matching donut segment color
- Category name: `text-sm font-medium text-gray-700`
- Dot leaders: flex spacer (not literal dots — just `flex-1` gap)
- Amounts: `text-sm tabular-nums` — actual in `text-gray-900 font-medium`, `/ budgeted` in `text-gray-400 font-normal`
- Over-budget rows: actual amount turns `text-red-500`
- Row padding: `py-2.5`

**Hover behavior (per row):**
- Row background: `bg-gray-50` fades in via `hover:bg-gray-50 transition-colors`
- A **2px progress bar fades in below the row** (`opacity-0 group-hover:opacity-100 transition-opacity duration-200`). Category color fill, `bg-gray-100` track, `h-0.5 rounded-full`. Width = percentage used, capped at 100%. Turns `bg-red-500` if over budget, `bg-amber-500` if >80%.
- **Hover actions appear** at the right edge: edit (pencil) and delete (x) icons, `opacity-0 group-hover:opacity-100`, `text-gray-300 hover:text-gray-600`, 14px icons
- **Cross-highlight**: sets `hoveredCategory`, causing corresponding donut segment to highlight

**Click behavior:**
- Clicking a row expands it inline to show `BudgetCategoryDetail` (AnimatePresence height animation)
- Chevron icon rotates 180 degrees on expand

**Bottom action:**
- `+ Add category` as a text link: `text-sm text-gray-400 hover:text-gray-600 transition-colors`, with a small `+` icon. No dashed border card. Clicking expands an inline form.

### Cross-Highlight System

Single shared state in page component: `hoveredCategory: string | null`, passed as props to both donut and list.

| User action | Donut response | List response |
|---|---|---|
| Hover donut segment | Hovered = opacity 1, others = 0.25 | Hovered row gets `bg-gray-50`, progress bar fades in |
| Hover category row | Corresponding segment = opacity 1, others = 0.25 | Row gets `bg-gray-50`, progress bar fades in |
| Hover nothing | All segments at 0.75 | All rows neutral, no progress bars visible |

### Category Detail (expanded inline — `BudgetCategoryDetail`)

Appears below the clicked category row via `motion.div` with `initial={{ height: 0, opacity: 0 }}` / `animate={{ height: 'auto', opacity: 1 }}`.

**Layout inside:**
- Indented slightly (`pl-5`) to align with category name (past the color dot)
- Subtle top border: `border-t border-gray-100 mt-2 pt-3`

**"From Calendar" section:**
- Section label: `text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 mb-2` — "From Calendar"
- Each item as a quiet row:
  - Left: activity name in `text-sm text-gray-700`
  - Below name: `Day 3 · 2:00 PM` in `text-xs text-gray-400`
  - Right: `$cost` in `text-sm font-medium text-gray-900 tabular-nums`
  - No icons, no badges, no backgrounds
- If original currency differs: small `(EUR 45)` in `text-xs text-gray-400` after the converted amount

**"Manual Expenses" section:**
- Section label: `text-[11px] font-medium uppercase tracking-[0.08em] text-gray-400 mb-2 mt-4` — "Manual Expenses"
- Same row layout as calendar items, but with:
  - A `text-[10px] uppercase tracking-[0.06em] text-amber-500 font-medium` "Manual" tag inline after the description
  - Delete button: `opacity-0 group-hover:opacity-100` x icon at far right, `text-gray-300 hover:text-red-500 transition-colors`

**"Add expense" action:**
- `+ Add expense` text link in `text-xs text-gray-400 hover:text-gray-600 mt-3`
- Clicking expands a minimal inline form (AnimatePresence):
  - Two fields side by side: description (flex-1) + amount (w-24), both as minimal inputs — `border-b border-gray-200 focus:border-gray-400 outline-none text-sm py-1 bg-transparent` (underline style, no box)
  - "Add" text button at right: `text-sm font-medium text-gray-600 hover:text-gray-900`
  - "Cancel" as a secondary text link: `text-sm text-gray-400 hover:text-gray-600`
  - No card wrapper, no heavy form chrome

### Add Category Form (inline)

Appears at bottom of category list when "+ Add category" is clicked. Same minimal form pattern:

- Category name input: underline style, `text-sm`, placeholder "Category name"
- Budget amount input: underline style, `w-24`, placeholder "$0"
- "Add" + "Cancel" text buttons
- Wrapped in `motion.div` height animation

### Currency Footer

Not a bar — a quiet line of text pinned to the bottom of the budget area:

```
USD · 1 EUR = $1.08 · 1 GBP = $1.27 · Refresh
```

- All in `text-xs text-gray-400`
- Separator: ` · ` (middle dot)
- "Refresh" is `hover:text-gray-600 hover:underline transition-colors cursor-pointer`
- If rates unavailable: `Rates unavailable` in same style, no refresh link
- Spacing: `mt-8` above, generous bottom padding

### Category Colors

Muted, sophisticated palette — not saturated primaries. These map to both donut segments and row dots.

| Category | Color | Tailwind |
|---|---|---|
| Flights | `#6B8EAE` | slate-blue |
| Hotels | `#C4956A` | warm sand |
| Food & Dining | `var(--trip-base)` | trip theme color |
| Activities | `#7BA69E` | sage green |
| Transport | `#9B8EC4` | soft purple |
| Shopping | `#8FB87A` | muted green |
| Other | `#9CA3AF` | gray-400 |

These are intentionally desaturated to keep the donut elegant. On hover, they gain a slight brightness boost.

### Skeleton Loading State

Matches the minimal aesthetic:
- Summary strip: three `h-8 w-20` skeleton bars where numbers would be
- Donut area: a `w-[200px] h-[200px] rounded-full` skeleton ring (border only, not filled)
- Category list: 4-5 rows of `h-4` skeleton bars at varying widths
- All skeletons use `bg-gray-100 animate-pulse rounded`

## Component Architecture

### Web components (`apps/web/components/budget/`)

| Component | Props | Responsibility |
|---|---|---|
| `BudgetSummaryStrip` | `totalBudgeted, totalSpent, remaining, onEditTotal` | Three stat groups, hover-editable total |
| `BudgetDonutChart` | `categories, hoveredCategory, onHoverCategory` | SVG donut ring with radial hover tooltips |
| `BudgetCategoryList` | `categories, hoveredCategory, onHoverCategory, expandedCategory, onExpandCategory, mutations` | Rows with hover progress bars + cross-highlight |
| `BudgetCategoryDetail` | `category, mutations` | Expanded view: calendar items + manual expenses |
| `AddExpenseForm` | `categoryId, tripCurrency, onSubmit, onCancel` | Inline underline-style form |
| `CurrencyFooter` | `tripCurrency, rates, isLoading, onRefresh` | Single line of rate text |

### Shared package (`packages/shared/`)

| Module | Responsibility |
|---|---|
| `hooks/useTripBudget` | Main data hook — composes useItineraryDays, useFlights, useHotels, budgetService, useExchangeRates |
| `hooks/useExchangeRates` | React Query hook for frankfurter.app |
| `services/budgetService` | Supabase CRUD for trip_budget_categories + trip_manual_expenses |
| `utils/budgetMapping` | `mapActivityToBudgetCategory()` function |
| `utils/currency` | `convertToTripCurrency()` function |

### Page file

`apps/web/app/(trips-app)/trip/[id]/budget/page.tsx` becomes a thin wrapper:
- Calls `useTripBudget(tripId)`
- Manages `hoveredCategory` and `expandedCategory` state
- Renders `BudgetSummaryStrip`, two-column grid with `BudgetDonutChart` + `BudgetCategoryList`, and `CurrencyFooter`
- The existing 840-line file is replaced entirely

## Animations

All animations use `motion/react` (Framer Motion v12):

- **Category expand/collapse:** `AnimatePresence` + `motion.div` with `height: 0 -> auto`, `opacity: 0 -> 1`, duration 250ms ease-in-out
- **Add expense form expand:** Same height animation pattern
- **Donut segments:** CSS `transition: opacity 200ms ease-out, filter 200ms ease-out`
- **Hover progress bars:** `transition-opacity duration-200` (fade in/out)
- **Hover action icons:** `transition-opacity duration-150` (slightly faster than bars)
- **Tooltip:** `transition: opacity 150ms, transform 150ms` (fade + slight translate)
- **Inline edit transition:** `transition-all duration-150` on input appearance

## Error Handling

- Budget categories fail to load: show error state with retry button
- Exchange rate fetch fails: show "Rates unavailable" in CurrencyFooter, display amounts in original currencies
- Manual expense CRUD fails: toast notification, optimistic update rollback via React Query

## Out of Scope

- Splitting costs between travelers
- Budget templates / presets
- Budget notifications / alerts via push
- Mobile app changes (web only for now)
- Daily spending chart (can add later)
- Category reordering UI (sort_order follows insertion order)
- Donut click-to-expand (click goes through the list, not the chart)
