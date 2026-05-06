# Packing Page Redesign — Design Spec

**Date:** 2026-05-06
**Status:** Approved by user (auto-approved, proceeding directly to plan)
**Scope:** Restyle the trip Packing tab to use the new `Module` shell + theme color, in a balanced two-column dashboard layout. Reuses every existing data hook and the seed function — this is a presentation-layer redesign.
**Out of scope:** New collaboration features, mobile gesture rework, replacing the AI suggestions backend, the activity feed schema, the SpotlightSearch fuzzy logic.

---

## 1. Why

The current packing page (`apps/web/components/packing/PackingPage.tsx`) is functionally rich but visually disconnected from the rest of the redesigned trip area:

- It uses calendar-app tokens (`var(--cal-text)`, `var(--cal-border)`, `var(--cal-text-muted)`) instead of the trip theme color.
- The `PackingProgress` widget, sidebar toggle, filter chips, spotlight search, and category list all sit at the top of an unframed `flex flex-col h-full p-6` div with no visual hierarchy. There's no Module shell, no serif title, no card containers.
- The activity feed lives in a slide-out right sidebar that's hidden by default — users miss it.
- Per-pill colors (blue / orange / pink / amber for ownership states) clash with the theme-color discipline now used by Settings, Budget, and the trip rail.

After Settings + Budget shipped on `develop`, Packing is the visual outlier. This redesign makes it cohere with the same `Module` shell + theme color palette while organizing the page into a balanced two-column dashboard so the right column ("at a glance" stats, AI suggestions, activity) is no longer hidden.

## 2. What changes

### 2.1 Page layout

12-column grid (matches Settings):

| Region                  | Span        | Content                                                       |
| ----------------------- | ----------- | ------------------------------------------------------------- |
| Left column             | `lg:col-span-7` | Single Module: **Packing list** (header + body)           |
| Right column (sticky)   | `lg:col-span-5` | Three Modules stacked: **At a glance**, **Suggestions**, **Activity** |

- Outer container: `w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12` (matches Settings/Budget).
- Grid: `grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8`.
- Right column is `lg:sticky lg:top-4 lg:self-start` so it stays in view as the list scrolls.
- Below `lg`: single column, right column rendered after left.

Column heights are designed to be roughly balanced at typical content (7 categories × 3-8 items ≈ 800px left; 4 stats + 5 suggestions + 6 activity entries ≈ 760px right). The right column's three Modules give it enough vertical content to hold its own next to the list.

### 2.2 Left Module — "Packing list"

**Module header:**
- Title: `Packing list`
- Description: `12 of 24 items packed`
- Beneath the description, a 4px progress bar (full width of the description column) using `var(--trip-base)` fill.
- Header action (right side):
  - `+ Item` primary button (theme-color bg, white text, rounded-xl, h-9, 12px font, semibold). Focuses the spotlight search input on click.

**Module body:**
1. **Filter chips** — `All`, `My items` (when logged in), `Shared`, `Adults`, `Kids`. Active chip = theme-color bg + white text. Inactive = `bg-gray-50` / `bg-white/[0.04]` + gray-600. Same chip styling pattern as Budget's `+ Add expense` link area.
2. **SpotlightSearch** — restyled to match Settings' `Input` primitive (h-11, rounded-xl, theme focus ring). Type to search existing items OR add a new one. Existing fuzzy-search behavior preserved.
3. **Category list** — uses the existing `PackingCategoryList` component, restyled (see § 2.6). Categories collapsible, items show checkbox + name + qty + ownership pill + owner avatar + hover-revealed claim/release/remove.

### 2.3 Right Module #1 — "At a glance"

A 2×2 grid of stat cards inside a Module body. Cards are `bg-[#fafaf7]` / `dark:bg-white/[0.02]`, rounded-xl, padding 12px.

| Stat        | Value                                                       | Sub                                                   |
| ----------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| Days left   | `daysUntilTrip(trip.start_date)` (clamped ≥ 0)              | "until trip" / "trip started" / "trip ended"          |
| Avg temp    | `avg(trip.trip_context.weather.forecast.high)` rounded      | "light packing" (>22°) / "layer up" (<12°) / "moderate" |
| Packed      | `progress.packed/progress.total`                            | `progress.percent%`                                   |
| Travelers   | `trip.travelers` (number)                                   | "X adults · Y kids" if breakdown available            |

- Module title: `At a glance` (17px serif — slightly smaller than the page-level Module to read as a "side panel" subordinate).
- No description.
- No action button.

If the trip has no weather forecast, the Avg temp card shows `—` with sub `"no forecast yet"`. Other stats degrade similarly.

### 2.4 Right Module #2 — "Suggestions"

The AI suggestions list, lifted from inline-in-categories to its own Module.

**Header:**
- Title: `Suggestions` (17px serif)
- Description: `From AI based on your trip`
- Action: small `✦ More` button (secondary style) that calls `generateSuggestions()`.

**Body:**
- Up to 6 suggestion chips visible. Each chip: `[✦ icon] [item name] [+ Add] [×]`.
  - Icon: small purple AI tile (`bg-violet-100 text-violet-700` / `bg-violet-500/15 text-violet-400`). Purple is the only color that breaks theme discipline — kept because "this came from AI" is a distinct affordance and the existing `SuggestionChip` already uses it.
  - Name: gray-600.
  - `+ Add`: theme-color text, becomes pill-shaped on hover.
  - `×`: gray-300, hover red.
- If more than 6 suggestions, scroll the inner list (max-height ~280px).
- If no suggestions and `!hasGenerated`: empty state — `"Tap More to get AI suggestions based on your trip"`.
- If no suggestions and `hasGenerated`: empty state — `"All caught up — nothing new to suggest right now"`.
- While `isGenerating`: skeleton chips with shimmer.

**Behavioral change vs today:** the existing `SuggestionChip` rendered inline within categories. After this redesign, suggestions ONLY appear in this right-column Module. The `PackingCategoryList` no longer renders inline suggestions. This removes the per-category visual jitter when suggestions arrive and gives the AI feature a dedicated home.

### 2.5 Right Module #3 — "Activity"

The packing activity feed, formerly the slide-out sidebar.

**Header:**
- Title: `Activity` (17px serif)
- Description: count of entries shown (e.g., `Last 6 of 24`).
- No action.

**Body:**
- Latest 6 entries. Each entry: `[avatar] [Who packed What] [when]`.
  - Avatar: 18px circle with first-letter, color from `stringToColor(displayName)` (preserved — per-user colors are a useful affordance).
  - Body: `<who> packed <item>` style. `who` is `font-semibold text-[var(--trip-base)]`, action is gray-600.
  - `when`: relative time (`2m ago`, `1h ago`) in gray-300, right-aligned.
- If more than 6, a `Show all` link at the bottom that opens a sheet/dialog with the full feed.
- Empty state: `No activity yet — start packing to see updates here`.

The existing `PackingActivityFeed` component renders inside this Module's body — restyled, no functional changes. Drops its own header (the Module's header replaces it) and its own collapsible chevron (no longer needed — the Module surface already provides the affordance).

### 2.6 Restyling existing leaf components

These components keep their behavior; only their styling changes.

| Component                        | Change                                                                                                                                                |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PackingItem.tsx`                | Replace hard-coded `#003594` checkbox bg with `var(--trip-base)`. Replace `var(--cal-*)` tokens with gray scale + theme. Ownership pills use neutral grays + theme tints (Mine = theme-color tint, Shared = gray-100, Adults = gray-100, Kids = gray-100 with a small `K` letter avatar instead of pink — keeps theme discipline). Avatar `stringToColor` stays. |
| `PackingCategory.tsx`            | Replace `var(--cal-text-muted)` etc. Header style: 9px uppercase tracking-[0.08em] gray-400 (matches Budget table thead). Drop the inline `✦ AI` badge for non-static categories — suggestions live in their own Module now. |
| `PackingCategoryList.tsx`        | Drop the `suggestionsByCategory` prop and its inline-suggestion rendering. Becomes a pure list-of-categories component.                              |
| `SpotlightSearch.tsx`            | Restyle the trigger input to match Settings' `Input` primitive. Keep the dropdown overlay; restyle dropdown items with theme-color highlight on selection. |
| `PackingProgress.tsx`            | Removed from page-level use (the inline progress bar in the Module header replaces it). Keep the file in case anything else imports it; mark as deprecated in a comment. |
| `PackingPanel.tsx`               | If unused after this work, remove. Otherwise leave alone.                                                                                            |
| `SuggestionChip.tsx`             | Restyle for the new Suggestions Module. Same purple-violet AI accent. Tighter padding to fit a stack of 6 in a fixed-height Module.                  |
| `PackingActivityFeed.tsx`        | Strip its outer header + collapse chevron; render as a flat list inside the Activity Module.                                                         |
| `utils.ts`                       | No changes.                                                                                                                                          |

### 2.7 Mobile

Below `lg` (1024px), the grid collapses to a single column. Order: Packing list Module → At a glance → Suggestions → Activity. The right-column sticky behavior turns off (no `sticky` at `< lg`). Filter chips, search, and category list keep their existing mobile behavior.

### 2.8 Auto-seed flow

The current page has an `useEffect` that auto-seeds default packing items via `seedDefaultPackingItems` if the trip's packing list is empty and `trip_context.packing_seeded` is false. **This stays unchanged** — pure data initialization, no UI relevance.

The seed effect moves from `PackingPage.tsx` into the new orchestrator (also called `PackingPage.tsx` after the rewrite). Same logic, same dependencies, same gate via `trip_context.packing_seeded`.

## 3. Files affected

### Files modified (restyle, behavior preserved)

| File                                                              | Change                                                                          |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `apps/web/components/packing/PackingPage.tsx`                     | Rewrite — orchestrator only; renders the new layout with the new Modules.       |
| `apps/web/components/packing/PackingItem.tsx`                     | Tokens: `var(--cal-*)` → gray + theme; `#003594` → `var(--trip-base)`; pill palette. |
| `apps/web/components/packing/PackingCategory.tsx`                 | Tokens; drop inline suggestion rendering; drop `✦ AI` per-category badge.       |
| `apps/web/components/packing/PackingCategoryList.tsx`             | Drop `suggestionsByCategory` prop and its render branch.                        |
| `apps/web/components/packing/SpotlightSearch.tsx`                 | Restyle trigger input + dropdown.                                               |
| `apps/web/components/packing/SuggestionChip.tsx`                  | Restyle for the right-column Module context.                                    |
| `apps/web/components/packing/PackingActivityFeed.tsx`             | Strip outer header + collapse chevron; tighter row styling.                     |
| `apps/web/components/packing/PackingProgress.tsx`                 | Mark as deprecated in a top-of-file comment (no longer used by the page).       |

### Files created

| File                                                              | Responsibility                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `apps/web/components/packing/PackingGlance.tsx`                   | The 2×2 stat grid for the "At a glance" Module body. Pure presentational.       |
| `apps/web/components/packing/PackingSuggestions.tsx`              | The Suggestions Module body — wraps the suggestion chips + empty/loading states. |
| `apps/web/components/packing/PackingListModule.tsx`               | The left Module's body: filters + search + category list. Pulls the page's existing inline JSX into a focused component. |

### Files NOT touched

- `packages/shared/src/hooks/usePackingList.ts` — no API changes.
- `packages/shared/src/hooks/usePackingSuggestions.ts` — no API changes.
- `packages/shared/src/utils/seedDefaultPackingItems.ts` — no API changes.
- `apps/web/app/(dashboard)/trip/[id]/packing/page.tsx` — already a 9-line wrapper around `<PackingPage tripId={id} />`. No change.
- The `Module` component at `apps/web/components/trip/Module.tsx` (already shared between Settings + Budget).

## 4. Behavior details

### 4.1 Filter chips when logged out

When `userId` is not set, the `My items` and `Shared` filters are hidden — only `All`, `Adults`, `Kids` show. Same logic as today.

### 4.2 SpotlightSearch contract

- Trigger: `apps/web/components/packing/SpotlightSearch.tsx` accepts `existingItems` and `onAddItem(name, category)`.
- The new "+ Item" button in the Module header calls a ref method on `SpotlightSearch` to focus the trigger input. Add a `forwardRef` wrapper if needed.
- All other behavior preserved.

### 4.3 At-a-glance computations

- `daysLeft = max(0, ceil((start - today) / 86400000))`. If trip already started, `daysLeft = 0` and sub reads `"trip in progress"` (or `"trip ended"` if `today > end_date`).
- `avgTemp = round(mean(forecast.map(d => d.high)))` if forecast.length > 0, else `null`. If `null`, render `—` with sub `"no forecast"`.
- Packed: read directly from `progress.packed / progress.total / progress.percent`.
- Travelers: `trip.travelers` (number) for the value. If `trip.trip_context.travelers` exists, build the breakdown sub `"X adults · Y kids"`; else just `"travelers"`.

### 4.4 Suggestion module behavior

- Renders all categories' suggestions concatenated into a flat list (no per-category grouping in the right column — the inline category context is gone).
- Order: by category order from `orderedCategories`, then by suggestion `id` (stable).
- The `+ Add` action calls `acceptSuggestion(id)` — it adds to the appropriate category in the left list.
- The `×` action calls `dismissSuggestion(id)`.
- The `✦ More` header button calls `generateSuggestions()`. Disabled while `isGenerating`.

### 4.5 Activity module — show all link

If `auditLog.length > 6`, render a `Show all` text link at the bottom of the body. On click, open a centered modal/dialog (motion/react `AnimatePresence` slide-up) showing the full feed scrollable. Dialog dismisses on backdrop click, Esc, or close button.

### 4.6 Sticky right column

```tsx
<div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto space-y-6 lg:space-y-8">
  <Module>...</Module>
  <Module>...</Module>
  <Module>...</Module>
</div>
```

The `lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto` lets the right column scroll internally when its content exceeds the viewport (e.g., a long activity feed) without breaking the sticky pin.

## 5. Visual specs (quick-reference)

| Token                                  | Value                                                          |
| -------------------------------------- | -------------------------------------------------------------- |
| Page wrapper                           | `w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12`                   |
| Grid                                   | `grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8`              |
| Left column                            | `lg:col-span-7`                                                |
| Right column                           | `lg:col-span-5 lg:sticky lg:top-4 lg:self-start space-y-6 lg:space-y-8` |
| Page-level Module title                | 26px serif (already in `Module` component)                     |
| Side-Module title                      | 17px serif (custom — pass via `className` or use a smaller variant; see implementation note) |
| Stat card                              | `bg-[#fafaf7] dark:bg-white/[0.02] rounded-xl p-3`             |
| Stat card label                        | 9px uppercase tracking-[0.1em] font-semibold text-gray-400     |
| Stat card value                        | 22px serif font-normal                                         |
| Stat card sub                          | 10px text-gray-400                                             |
| Filter chip — active                   | `bg-[var(--trip-base)] text-white`                             |
| Filter chip — inactive                 | `bg-gray-50 dark:bg-white/[0.04] text-gray-600 dark:text-gray-400 hover:bg-gray-100` |
| Item checkbox — checked                | `bg-[var(--trip-base)] border-[var(--trip-base)]`              |
| Item checkbox — unchecked              | `bg-transparent border-gray-200 dark:border-white/[0.10]`      |
| Item name — packed                     | `text-gray-400 line-through`                                   |
| Item name — unpacked                   | `text-gray-900 dark:text-white`                                |
| Ownership pill — Mine                  | theme-color tint (`bg-[rgb(var(--trip-base-rgb)/0.1)] text-[var(--trip-base)]`) |
| Ownership pill — Shared                | `bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-gray-400` |
| Ownership pill — Adults / Kids         | `bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-gray-400` (group label is enough; no special color) |
| Suggestion AI icon                     | `bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400` |

**Implementation note re: side-Module title size.** The page-level Module title is hard-coded at 26px in `Module.tsx`. The right-column Modules want 17px to read as subordinate. Two options for the planner:

1. Add an optional `titleSize?: 'lg' | 'sm'` prop to `Module` (default `'lg'` = 26px; `'sm'` = 17px). Smallest change, cleanest API.
2. Render the right-column Modules with `<Module>` and override the heading via custom `title` content (pass a `<h2>` JSX element) — requires `Module` to accept `title: React.ReactNode`.

Option 1 is preferred. Add the prop; default keeps Settings/Budget unchanged.

## 6. Non-goals

- **No new collaboration features.** Claim/release/transfer behavior is preserved verbatim.
- **No new AI features.** `usePackingSuggestions` is consumed as-is.
- **No mobile gesture rework.** Tap behavior is the same as today.
- **No SpotlightSearch logic changes.** Just visual restyle.
- **No new tests for the existing hooks.** They have their own tests in shared.

## 7. Open questions

None blocking. Two judgment calls during implementation:

- The "Show all" activity dialog (§ 4.5) — if the existing `PackingActivityFeed` already supports rendering an unbounded list, we can reuse it inside the dialog. If it bakes in a `defaultCollapsed` collapse pattern, the dialog version may need a small wrapper.
- The Suggestions module's max visible count (6) is a guess. Tweak based on visual fit during build.

## 8. Acceptance criteria

- The Packing page renders inside the same outer wrapper as Settings + Budget (`w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12`).
- A 12-column grid (`lg:grid-cols-12 gap-6 lg:gap-8`) splits the page into a `col-span-7` Packing list Module and a `col-span-5` right column.
- The right column is sticky at `lg+`, with three Modules: At a glance, Suggestions, Activity.
- Column heights are roughly balanced at typical content (≥4 categories with items, ≥3 suggestions, ≥3 activity entries) — the right column never collapses to <50% of the left column's height.
- All theme color usage is via `var(--trip-base)` / `rgb(var(--trip-base-rgb) / 0.X)`. No hard-coded `#003594`. No `var(--cal-*)` tokens in any of the changed files.
- Filter chips use the new active/inactive style. Active chip = theme-color background.
- Item checkboxes, progress bars, and primary buttons all use `var(--trip-base)`.
- Ownership pills use neutral gray for Shared/Adults/Kids and theme-color tint for Mine. No blue/orange/teal/pink.
- AI suggestions ONLY appear in the Suggestions Module, not inline in categories.
- The page-level "+ Item" header button focuses the SpotlightSearch input on click.
- Mobile (< lg): single column, right-column Modules stack below the list.
- No regressions in: auto-seed on first visit, claim/release/remove behavior, fuzzy search, AI suggestion accept/dismiss, activity feed entries.
- The shared `Module` component gains an optional `titleSize` prop; Settings + Budget continue to render with the default 26px.
