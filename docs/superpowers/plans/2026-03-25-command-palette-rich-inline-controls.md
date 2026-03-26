# Command Palette — Rich Inline Controls Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the drill-down picker sub-list in `GlobalCommandPalette` with rich inline controls — toggle switches, color swatches, status pills, segmented controls, and scrollable chip rows — so users can act on settings directly from the palette without nested navigation.

**Architecture:** All changes are confined to `apps/web/components/GlobalCommandPalette.tsx`. A new optional `variant` field on `SettingPickerItem` tells the renderer which inline control to use. The picker sub-list state (`activePicker`, `savedQuery`) and its associated logic are removed after the new rendering is wired in.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, `motion/react`, `@travyl/shared` (TRIP_THEMES, THEME_ORDER)

---

## Chunk 1: Add variant discriminant + inline control components

### Task 1: Add `variant` to `SettingPickerItem` and assign to all pickers

**Files:**
- Modify: `apps/web/components/GlobalCommandPalette.tsx:38-55` (SettingPickerItem interface)
- Modify: `apps/web/components/GlobalCommandPalette.tsx:167-266` (settingItems memo)
- Modify: `apps/web/components/GlobalCommandPalette.tsx:270-357` (tripSettingItems memo)

- [ ] **Step 1: Add `variant` field to `SettingPickerItem`**

Find the `SettingPickerItem` interface (around line 48) and add the optional variant field:

```ts
interface SettingPickerItem {
  type: 'setting-picker'
  id: string
  label: string
  keywords: string[]
  currentValue: string
  options: { value: string; label: string }[]
  onSelect: (value: string) => void
  variant?: 'swatches' | 'pills' | 'segmented' | 'chips' | 'scrollable-pills'
}
```

- [ ] **Step 2: Assign `variant: 'scrollable-pills'` to currency picker**

In the `settingItems` memo, find the `id: 'setting-currency'` picker and add:

```ts
{
  type: 'setting-picker' as const,
  id: 'setting-currency',
  label: 'Currency',
  keywords: ['currency', 'money', 'usd', 'eur', 'gbp', 'jpy', 'cad', 'aud', 'mxn'],
  currentValue: currency,
  options: [
    { value: 'USD', label: 'USD — US Dollar' },
    { value: 'EUR', label: 'EUR — Euro' },
    { value: 'GBP', label: 'GBP — British Pound' },
    { value: 'JPY', label: 'JPY — Japanese Yen' },
    { value: 'CAD', label: 'CAD — Canadian Dollar' },
    { value: 'AUD', label: 'AUD — Australian Dollar' },
    { value: 'MXN', label: 'MXN — Mexican Peso' },
  ],
  onSelect: (v: string) => setCurrency(v as Currency),
  variant: 'scrollable-pills',
},
```

- [ ] **Step 3: Assign `variant: 'segmented'` to distance picker**

```ts
{
  type: 'setting-picker' as const,
  id: 'setting-distance',
  label: 'Distance Units',
  keywords: ['distance', 'units', 'miles', 'kilometers', 'km'],
  currentValue: distanceUnits === 'miles' ? 'Miles' : 'Kilometers',
  options: [
    { value: 'miles', label: 'Miles' },
    { value: 'kilometers', label: 'Kilometers' },
  ],
  onSelect: (v: string) => setDistanceUnits(v as DistanceUnits),
  variant: 'segmented',
},
```

- [ ] **Step 4: Assign `variant: 'chips'` to travel style picker**

```ts
{
  type: 'setting-picker' as const,
  id: 'setting-travel-style',
  label: 'Travel Style',
  keywords: ['travel', 'style', 'balanced', 'budget', 'luxury', 'adventure', 'relaxed'],
  currentValue: travelStyle.charAt(0).toUpperCase() + travelStyle.slice(1),
  options: [
    { value: 'balanced', label: 'Balanced' },
    { value: 'budget', label: 'Budget' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'adventure', label: 'Adventure' },
    { value: 'relaxed', label: 'Relaxed' },
  ],
  onSelect: (v: string) => setTravelStyle(v as TravelStyle),
  variant: 'chips',
},
```

- [ ] **Step 5: Assign `variant: 'swatches'` to trip theme picker**

In the `tripSettingItems` memo, find the `id: 'trip-theme'` picker and add `variant: 'swatches'`.

Note: `THEME_ORDER` is imported from `@travyl/shared` at the top of the file alongside `TRIP_THEMES`. Confirm both are present in the import; if `THEME_ORDER` is missing, add it to the `@travyl/shared` import line.

```ts
items.push({
  type: 'setting-picker' as const,
  id: 'trip-theme',
  label: 'Trip Theme',
  keywords: ['theme', 'colors', 'appearance'],
  currentValue: TRIP_THEMES[reg.themeId]?.name ?? 'Custom',
  options: THEME_ORDER.map((id) => ({
    value: id,
    label: TRIP_THEMES[id].name,
  })),
  onSelect: (v: string) => reg.setTripTheme(v),
  variant: 'swatches',
})
```

- [ ] **Step 6: Assign `variant: 'pills'` to trip status picker**

Find the `id: 'trip-status'` picker and add `variant: 'pills'`:

```ts
items.push({
  type: 'setting-picker' as const,
  id: 'trip-status',
  label: 'Trip Status',
  keywords: ['status', 'planning', 'booked', 'active', 'completed', 'abandoned'],
  currentValue: reg.status.charAt(0).toUpperCase() + reg.status.slice(1),
  options: [
    { value: 'planning', label: 'Planning' },
    { value: 'booked', label: 'Booked' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'abandoned', label: 'Abandoned' },
  ],
  onSelect: (v: string) => reg.setStatus(v as Trip['status']),
  variant: 'pills',
})
```

- [ ] **Step 7: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/GlobalCommandPalette.tsx
git commit -m "feat: add variant discriminant to SettingPickerItem for inline controls"
```

---

### Task 2: Add inline control constants and components

**Files:**
- Modify: `apps/web/components/GlobalCommandPalette.tsx` — add constants and helper components before the main `GlobalCommandPalette` function

- [ ] **Step 1: Add STATUS_COLORS constant**

Add this after the `CONFIGURABLE_TABS` constant (around line 96):

```ts
// ─── Status colors ────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  planning:  '#9CA3AF',
  booked:    '#F59E0B',
  active:    '#10B981',
  completed: '#003594',
  abandoned: '#EF4444',
}
```

- [ ] **Step 2: Add `ToggleSwitch` component**

Add after the `formatTripDates` function (around line 108):

```tsx
// ─── Inline control components ────────────────────────────────

// ToggleSwitch: track is a soft tint (emerald-100 on, gray off), white thumb is the visual indicator.
// pointer-events-none — the row button handles the click via executeItem → onToggle.
function ToggleSwitch({ enabled }: { enabled: boolean }) {
  return (
    <div
      className={[
        'relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors duration-150 pointer-events-none',
        enabled
          ? 'bg-emerald-100 dark:bg-emerald-900/30'
          : 'bg-gray-300 dark:bg-[#1e3a5f]/60',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-3 w-3 rounded-full shadow transition-transform duration-150 mt-0.5',
          enabled
            ? 'translate-x-3.5 bg-emerald-500'
            : 'translate-x-0.5 bg-gray-400 dark:bg-gray-500',
        ].join(' ')}
      />
    </div>
  )
}
```

Note: `pointer-events-none` — the row's `onClick` (via `executeItem`) handles the toggle. The switch is visual only.

- [ ] **Step 3: Add `renderPickerControl` function**

Add directly after `ToggleSwitch`:

```tsx
function renderPickerControl(item: SettingPickerItem) {
  function isActive(opt: { value: string; label: string }) {
    return (
      opt.value === item.currentValue ||
      opt.label.toLowerCase() === item.currentValue.toLowerCase()
    )
  }

  if (item.variant === 'swatches') {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {item.options.map((opt) => {
          const color = TRIP_THEMES[opt.value]?.base ?? '#888'
          const active = isActive(opt)
          return (
            <button
              key={opt.value}
              onClick={(e) => { e.stopPropagation(); item.onSelect(opt.value) }}
              title={opt.label}
              style={{ backgroundColor: color }}
              className={[
                'w-4 h-4 rounded-full transition-all shrink-0',
                active
                  ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-100 dark:ring-offset-[#0f1a28] shadow'
                  : 'opacity-60 hover:opacity-100',
              ].join(' ')}
            />
          )
        })}
      </div>
    )
  }

  if (item.variant === 'pills') {
    return (
      <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
        {item.options.map((opt) => {
          const color = STATUS_COLORS[opt.value] ?? '#888'
          const active = isActive(opt)
          return (
            <button
              key={opt.value}
              onClick={(e) => { e.stopPropagation(); item.onSelect(opt.value) }}
              style={active
                ? { backgroundColor: color, borderColor: color }
                : { borderColor: color }
              }
              className={[
                'text-[10px] px-1.5 py-0.5 rounded-full border transition-colors whitespace-nowrap',
                active ? 'text-white' : 'text-gray-500 dark:text-gray-400',
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  if (item.variant === 'segmented') {
    return (
      <div
        className="flex items-center rounded overflow-hidden border border-gray-200 dark:border-[#1e3a5f]/40 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {item.options.map((opt, i) => {
          const active = isActive(opt)
          return (
            <button
              key={opt.value}
              onClick={(e) => { e.stopPropagation(); item.onSelect(opt.value) }}
              className={[
                'text-[10px] px-2 py-0.5 transition-colors',
                i > 0 ? 'border-l border-gray-200 dark:border-[#1e3a5f]/40' : '',
                active
                  ? 'bg-[#1e3a5f] text-white dark:bg-[#4a7ab5]'
                  : 'text-gray-500 dark:text-[#4a7ab5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20',
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  if (item.variant === 'chips') {
    return (
      <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
        {item.options.map((opt) => {
          const active = isActive(opt)
          return (
            <button
              key={opt.value}
              onClick={(e) => { e.stopPropagation(); item.onSelect(opt.value) }}
              className={[
                'text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                active
                  ? 'bg-[#1e3a5f] dark:bg-[#4a7ab5] text-white border-transparent'
                  : 'border-gray-300 dark:border-[#1e3a5f]/40 text-gray-500 dark:text-[#4a7ab5] hover:border-gray-400',
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  // variant === 'scrollable-pills' (default) — used for currency.
  // Intentionally renders opt.value (e.g. "USD") not opt.label ("USD — US Dollar")
  // so pills are compact enough to fit in a scrollable row.
  return (
    <div
      className="flex items-center gap-1 overflow-x-auto max-w-[200px] pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {item.options.map((opt) => {
        const active = isActive(opt)
        return (
          <button
            key={opt.value}
            onClick={(e) => { e.stopPropagation(); item.onSelect(opt.value) }}
            className={[
              'text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors shrink-0',
              active
                ? 'bg-[#1e3a5f] dark:bg-[#4a7ab5] text-white border-transparent'
                : 'border-gray-300 dark:border-[#1e3a5f]/40 text-gray-500 dark:text-[#4a7ab5]',
            ].join(' ')}
          >
            {opt.value}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. `renderPickerControl` is not called yet so the compiler just checks the function body.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/GlobalCommandPalette.tsx
git commit -m "feat: add ToggleSwitch and renderPickerControl inline control components"
```

---

## Chunk 2: Wire controls in, clean up sub-list

### Task 3: Swap `renderItemRight` to use new inline controls + update row heights

**Files:**
- Modify: `apps/web/components/GlobalCommandPalette.tsx:563-596` (`renderItemRight` function)
- Modify: `apps/web/components/GlobalCommandPalette.tsx:700-750` (row render in JSX)

- [ ] **Step 1: Replace `renderItemRight` body**

Find `renderItemRight` (around line 563) and replace the entire function body:

```tsx
function renderItemRight(item: PaletteItem) {
  if (item.type === 'setting-toggle') {
    return <ToggleSwitch enabled={item.enabled} />
  }
  if (item.type === 'setting-picker') {
    return renderPickerControl(item)
  }
  if (item.type === 'setting-link') {
    return (
      <span className="text-[10px] text-gray-400 dark:text-[#484f58]">→</span>
    )
  }
  if (item.type === 'command' && item.command.shortcut) {
    return (
      <kbd className="text-[10px] text-gray-400 dark:text-[#484f58] bg-gray-100 dark:bg-[#0a1520] border border-gray-200 dark:border-[#1e3a5f]/30 px-1.5 py-0.5 rounded ml-4 shrink-0">
        {item.command.shortcut.display}
      </kbd>
    )
  }
  return null
}
```

- [ ] **Step 2: Update row padding to `py-2.5` for settings rows**

In the JSX where group items are rendered (around line 710–730), find the row `button` className and update the padding condition. The row currently uses `py-2` for all items. Change it so settings rows (toggle, picker, link) use `py-2.5`:

```tsx
className={[
  'w-full flex items-center justify-between px-4 text-sm text-left transition-colors',
  (item.type === 'setting-toggle' || item.type === 'setting-picker' || item.type === 'setting-link')
    ? 'py-2.5'
    : 'py-2',
  disabled
    ? 'text-gray-400 dark:text-[#484f58] cursor-default pointer-events-none'
    : isHighlighted
      ? 'bg-gray-100 dark:bg-[#1e3a5f]/30 text-gray-900 dark:text-[#f5efe8]'
      : 'text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20',
].join(' ')}
```

- [ ] **Step 3: Start dev server and manually verify inline controls render**

```bash
npm run web
```

Open the app, sign in, press Ctrl+K.

Expected:
- Toggle rows (push notifications, email notifications, tab visibility) show a toggle switch on the right instead of an "On/Off" badge
- Currency row shows 7 scrollable pills (USD EUR GBP JPY CAD AUD MXN)
- Distance row shows a segmented `Miles | Km` control
- Travel style row shows 5 outlined chips
- Navigate to a trip, open Ctrl+K — Trip Theme row shows 8 colored circles, Trip Status row shows 5 colored pills

- [ ] **Step 4: Verify clicking inline controls works**

- Click a currency pill → currency updates (check Settings page or re-open palette to see active pill shift)
- Click a distance segment → distance units updates
- Click a travel style chip → travel style updates
- Click a theme swatch on a trip → trip theme changes visually
- Click a status pill on a trip → trip status updates
- Click a toggle row → toggle flips (switch animates)

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/GlobalCommandPalette.tsx
git commit -m "feat: wire inline controls into command palette renderItemRight"
```

---

### Task 4: Remove picker sub-list state and dead code

**Files:**
- Modify: `apps/web/components/GlobalCommandPalette.tsx` — remove activePicker state, savedQuery state, picker-mode logic

- [ ] **Step 1: Remove `activePicker` and `savedQuery` state declarations**

Find (around line 115–117):
```ts
const [activePicker, setActivePicker] = useState<SettingPickerItem | null>(null)
const [savedQuery, setSavedQuery] = useState('')
```

Delete both lines.

- [ ] **Step 2: Remove picker state reset in the `isOpen` effect**

Find the `useEffect` that resets on open (around line 155–163). Remove these two lines from it:
```ts
setActivePicker(null)
setSavedQuery('')
```

The effect should now be:
```ts
useEffect(() => {
  if (isOpen) {
    setQuery('')
    setHighlightedIndex(0)
    setTimeout(() => inputRef.current?.focus(), 0)
  }
}, [isOpen])
```

- [ ] **Step 3: Remove `exitPickerMode` function**

Delete the entire `exitPickerMode` function:
```ts
function exitPickerMode() {
  setActivePicker(null)
  setQuery(savedQuery)
  setSavedQuery('')
  setHighlightedIndex(0)
}
```

- [ ] **Step 4: Remove `selectPickerOption` function**

Delete the entire `selectPickerOption` function:
```ts
function selectPickerOption(value: string) {
  if (activePicker) {
    activePicker.onSelect(value)
    exitPickerMode()
  }
}
```

- [ ] **Step 5: Remove picker mode branch from `handleKeyDown`**

Find `handleKeyDown`. Remove the top block that starts with `if (activePicker) {` and ends with `return` — the entire early-return picker mode handler. Keep only the non-picker keyboard logic.

Also remove the now-dead `activePicker` checks in the `ArrowDown` and `ArrowUp` branches (the `if (activePicker)` sub-branches inside those — only the non-picker path remains):

```ts
function handleKeyDown(e: React.KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    setHighlightedIndex((prev) => {
      for (let i = prev + 1; i < flatItems.length; i++) {
        if (!isItemDisabled(flatItems[i])) return i
      }
      return prev
    })
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    setHighlightedIndex((prev) => {
      for (let i = prev - 1; i >= 0; i--) {
        if (!isItemDisabled(flatItems[i])) return i
      }
      return prev
    })
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const item = flatItems[highlightedIndex]
    if (item && !isItemDisabled(item)) {
      executeItem(item)
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(false)
  }
}
```

- [ ] **Step 6: Replace `setting-picker` branch in `executeItem` with no-op**

Find `executeItem`. The `setting-picker` branch currently calls `setActivePicker`. Replace with a comment:

```ts
} else if (item.type === 'setting-picker') {
  // no-op — inline controls handle onSelect directly via their own onClick
}
```

- [ ] **Step 7: Remove picker mode render branches from JSX**

In the render output, find the input header section. Remove the `activePicker ? (back-arrow header) : (search input header)` conditional — keep only the search input header:

```tsx
<div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-[#1e3a5f]/30">
  <svg
    width="16" height="16" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    className="text-gray-400 dark:text-[#4a7ab5] shrink-0"
  >
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
  <input
    ref={inputRef}
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    placeholder="Search trips, settings, navigate..."
    className="flex-1 bg-transparent text-sm text-gray-900 dark:text-[#f5efe8] placeholder-gray-400 dark:placeholder-[#4a7ab5] outline-none"
  />
  <kbd className="text-[10px] text-gray-400 dark:text-[#484f58] bg-gray-100 dark:bg-[#0a1520] border border-gray-200 dark:border-[#1e3a5f]/30 px-1.5 py-0.5 rounded">
    Esc
  </kbd>
</div>
```

In the results area, find the `<div className="max-h-[360px] overflow-y-auto py-1">` container. It currently contains:

```tsx
<div className="max-h-[360px] overflow-y-auto py-1">
  {activePicker ? (
    activePicker.options.map((opt, i) => { ... })
  ) : (
    <>
      {flatItems.length === 0 && ...}
      {tripSearchLoading && ...}
      {groups.map((group) => ( ... ))}
    </>
  )}
</div>
```

Remove the outer `activePicker ? (...) : (...)` ternary. Keep only the inner fragment as the direct child:

```tsx
<div className="max-h-[360px] overflow-y-auto py-1">
  {flatItems.length === 0 && !tripSearchLoading && (
    <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-[#4a7ab5]">
      No results found
    </div>
  )}
  {tripSearchLoading && query.length >= 3 && tripResults.length === 0 && (
    <div className="px-4 py-3 text-center text-sm text-gray-400 dark:text-[#4a7ab5]">
      Searching trips...
    </div>
  )}
  {groups.map((group) => (
    <div key={group.key}>
      {/* ... group header and items unchanged ... */}
    </div>
  ))}
</div>
```

The `activePicker.options.map(...)` block (the old picker option list) is deleted entirely.

- [ ] **Step 8: Typecheck**

```bash
npm run typecheck
```

Expected: no errors. If `activePicker` or `savedQuery` references remain, the compiler will catch them.

- [ ] **Step 9: Manual verification — full flow**

Open the app (dev server already running from Task 3).

- [ ] Press Ctrl+K — palette opens with search input (no picker mode possible)
- [ ] Arrow keys navigate all rows including settings rows
- [ ] Enter on a toggle row flips the toggle
- [ ] Enter on a picker row (currency, distance, theme, status) does nothing
- [ ] Enter on a nav/link row navigates
- [ ] Esc closes the palette
- [ ] Log out, open palette — Settings group is absent

- [ ] **Step 10: Commit**

```bash
git add apps/web/components/GlobalCommandPalette.tsx
git commit -m "feat: remove picker sub-list state and dead code from command palette"
```
