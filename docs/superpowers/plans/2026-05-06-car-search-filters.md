# Car Search Filters (Year & MPG) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add minimum-year and minimum-MPG filter controls to the car search results panel.

**Architecture:** All changes are in a single file (`CarSearchPanel.tsx`): two new state variables, two filter sections in the existing collapsible filter panel, and additional filter steps in the rates `useMemo` pipeline.

**Tech Stack:** React, TypeScript, Next.js, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-05-06-car-search-filters-design.md`

---

### Task 1: Add Year & MPG Filters to CarSearchPanel

**Files:**
- Modify: `apps/web/components/trip/cars/CarSearchPanel.tsx`

- [ ] **Step 1: Add new state variables for the filters**

After line 129 (`const [showFilters, setShowFilters] = useState(true);`), add:

```typescript
const [minYear, setMinYear] = useState<number | ''>('');
const [minMpg, setMinMpg] = useState<number | ''>('');
```

After line 130 (`const [page, setPage] = useState(1);`), update the page-reset useEffect to include the new deps:

```typescript
// Reset to page 1 when filters or sort change
useEffect(() => {
  setPage(1);
}, [supplierFilter, categoryFilter, sortMode, minYear, minMpg]);
```

- [ ] **Step 2: Add year + MPG filter logic to the rates `useMemo`**

Inside the `rates` useMemo (line 204-239), after the category filter block (line 212-216) and before the sort block, add:

```typescript
// Year filter (min year)
if (minYear !== '') {
  filtered = filtered.filter((r: any) => {
    const mpg = getMpg(r);
    return (mpg?.year ?? 0) >= (minYear as number);
  });
}
// MPG filter (min MPG)
if (minMpg !== '') {
  filtered = filtered.filter((r: any) => {
    const mpg = getMpg(r);
    return (mpg?.mpg ?? 0) >= (minMpg as number);
  });
}
```

Add `minYear, minMpg, mpgData` to the useMemo dependency array at line 239. Note: `mpgData` is needed because `getMpg` reads from it, so the memo re-runs when MPG data loads asynchronously.

```typescript
}, [allRates, supplierFilter, categoryFilter, sortMode, minYear, minMpg, mpgData]);
```

Note: The `getMpg` function is defined outside this useMemo (line 274) but uses `mpgData` via closure. Adding `mpgData` as a dep ensures the memo re-computes when fuel-economy data arrives asynchronously.

- [ ] **Step 3: Update `hasActiveFilters` to include new filters**

Replace lines 384-385:

```typescript
const hasActiveFilters =
  supplierFilter.length > 0 || categoryFilter.length > 0 || minYear !== '' || minMpg !== '';
```

And update the filter badge count (line 539) to include the new filters:

```typescript
` (${supplierFilter.length + categoryFilter.length + (minYear !== '' ? 1 : 0) + (minMpg !== '' ? 1 : 0)})`
```

- [ ] **Step 4: Add filter UI sections**

Inside the filter panel div (line 546), after the Category filter section (closing `</div>` around line 609) and before the filter panel's closing `</div>` (line 610), add:

```tsx
{/* Year filter */}
<div>
  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
    Min Year
  </p>
  <div className="flex items-center gap-2">
    <input
      type="number"
      min={1900}
      max={2030}
      value={minYear}
      onChange={(e) => setMinYear(e.target.value === '' ? '' : Number(e.target.value))}
      placeholder="e.g. 2020"
      className="w-28 text-[12px] h-8 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
    {minYear !== '' && (
      <button
        onClick={() => setMinYear('')}
        className="text-[11px] px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
      >
        <X size={10} /> Clear
      </button>
    )}
  </div>
</div>

{/* MPG filter */}
<div>
  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
    Min MPG
  </p>
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        max={200}
        value={minMpg}
        onChange={(e) => setMinMpg(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder="e.g. 30"
        className="w-28 text-[12px] h-8 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {minMpg !== '' && (
        <button
          onClick={() => setMinMpg('')}
          className="text-[11px] px-2 py-1 rounded-full border border-gray-200 bg-white text-gray-400 hover:text-gray-600 inline-flex items-center gap-1"
        >
          <X size={10} /> Clear
        </button>
      )}
    </div>
    <div className="flex flex-wrap gap-1.5">
      {[20, 30, 40].map((val) => (
        <button
          key={val}
          onClick={() => setMinMpg(minMpg === val ? '' : val)}
          className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
            minMpg === val
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          {val}+ MPG
        </button>
      ))}
    </div>
  </div>
</div>
```

- [ ] **Step 5: Verify build**

Run: `npm run typecheck` — expected: no errors
Run: `npm run lint` — expected: no errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/trip/cars/CarSearchPanel.tsx
git commit -m "feat: add year and MPG filters to car search panel"
```
