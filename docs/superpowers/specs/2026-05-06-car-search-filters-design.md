# Car Search: Year & MPG Filters

**Date:** 2026-05-06
**Feature:** Add minimum-year and minimum-MPG filters to the car search results panel

## Problem

The car search panel (`CarSearchPanel.tsx`) currently filters results only by supplier and category. Users want to narrow results by vehicle year and fuel efficiency (MPG).

## Data sources

Both new filters operate on data from the existing MPG lookup endpoint (`POST /api/cars/mpg`, backed by fueleconomy.gov):

- **Year** — returned as `year: number | null` per vehicle (most recent matching year from fueleconomy.gov)
- **MPG** — returned as `mpg: number | null` per vehicle; complemented by fallback estimates (by category + fuel type) when fueleconomy.gov has no match

Both values are already stored in `CarSearchPanel`'s `mpgData` state (`Record<string, { mpg, label, year }>`) and accessed through the existing `getMpg(rate)` helper.

## Design

### New state variables

```typescript
const [minYear, setMinYear] = useState<number | ''>('')
const [minMpg, setMinMpg] = useState<number | ''>('')
```

### Filter placement

Both controls live inside the existing collapsible filter panel (below Supplier and Category sections).

#### Year section

- Label: **Min year**
- Input: `<input type="number">` with placeholder `"e.g. 2020"`
- Min/max constraints: `min=1900`, `max=2030`
- Filter: `rates = rates.filter(r => (getMpg(r)?.year ?? 0) >= minYear)`
- Vehicles with no year data are excluded when filter is active

#### MPG section

- Label: **Min MPG**
- Input: `<input type="number">` with placeholder `"e.g. 30"`
- Min/max constraints: `min=0`, `max=200`
- Quick-select pills below the input: **20+**, **30+**, **40+**
  - Clicking a pill sets `minMpg` to that value
  - If the user types a custom value, all pills deselect
  - If the user clicks an already-active pill, it deselects (clears the filter)
- Filter: `rates = rates.filter(r => (getMpg(r)?.mpg ?? 0) >= minMpg)`
- Vehicles with no MPG data are excluded when filter is active

### Filter pipeline order

```
allRates → supplier → category → year → MPG → sort → paginate
```

### Active filter count

The filter button badge (`Filters (N)`) already increments for supplier + category. Extend the count to include year and MPG when active:
```typescript
const hasActiveFilters = supplierFilter.length > 0 || categoryFilter.length > 0 || minYear !== '' || minMpg !== ''
```

### Empty state

No changes needed. When all results are filtered out, `rates` is empty, and the existing "No car rentals found" state renders.

### TypeScript

No new types or interfaces needed. All data is already typed via `mpgData` and the rate objects returned by the Priceline API.

### Files changed

| File | Change |
|---|---|
| `apps/web/components/trip/cars/CarSearchPanel.tsx` | Add state, filter UI sections, filter logic in the rates `useMemo` |

No API, type, or shared-package changes needed.

## Future considerations

- If the Priceline API later returns year data directly, the year filter could become more reliable (not dependent on MPG lookup matching)
- Fuel type (gas/diesel/hybrid/electric) as a standalone filter could be added similarly since the API already returns `rate.fuel`
