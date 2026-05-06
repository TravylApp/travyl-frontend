# Budget Page Redesign — Design Spec

**Date:** 2026-05-06
**Status:** Approved by user — ready for implementation plan
**Scope:** Replace `apps/web/app/(dashboard)/trip/[id]/budget/page.tsx` with a Notion/Linear-style spreadsheet view that reuses the new Settings page's `Module` shell. Web only (mobile collapses to stacked cards).
**Out of scope:** Charts (donut, sparklines, time-series), multi-currency at the expense level, recurring expenses, receipt OCR / import, sharing budget with non-trip collaborators, the Settings page or ThemePicker (handled separately by user's WIP).

---

## 1. Why

The current budget page is a 2-column card grid with collapsing per-category cards, multi-color category palette (blue/orange/teal/purple/green/gray), small 3-up summary cards, and inline edit controls scattered across icon-buttons. After the trip page rail + Settings redesign, Budget is the visual outlier: it doesn't reuse Settings' `Module` shell, it doesn't lean on the trip theme color, and its dense data is hard to compare across categories because each lives in its own card.

The redesign optimizes for two things:

1. **Cohesion with Settings.** Same `Module` shell, same typography, same theme-color accent, same form primitives.
2. **Dense, scannable, editable.** Compare every category's Budgeted/Spent/Remaining at a glance. Edit any number inline without opening a modal or expanding a card.

## 2. What changes

### 2.1 Page shell

A single `Module` (defined in Settings page, lifted to a shared location — see § 3) wraps the whole page:

- **Title:** "Budget" (26px serif, matches Settings module headers).
- **Description:** "Edit any cell · click a category to expand expenses".
- **Header actions** (right side of the module header):
  - `+ Category` — secondary button (white bg, gray border, rounded-xl, 12px font).
  - `+ Expense` — primary button (theme-color bg, white text, rounded-xl, 12px font, semibold). Opens a small picker that asks "Which category?" then drops the user into the inline expense form on the chosen category's drawer.
- **Body:** the metric strip + the table.

### 2.2 Metric strip (top of body)

A 4-column grid above the table, separated from the table by a 1px divider:

| Metric          | Value source                                            | Sub-label                                |
| --------------- | ------------------------------------------------------- | ---------------------------------------- |
| Total budget    | `sum(item.budgeted)`, **inline-editable**               | `$X/day · N days` (computed from trip)   |
| Spent           | `sum(item.actual)`                                      | `X% of budget`                           |
| Remaining       | `total budget − spent` — green/amber/red by health      | `$X/day left` (over remaining days)      |
| Daily avg spent | `spent / days_elapsed` (clamped ≥ 1)                    | `on track` / `over pace` / `under pace`  |

- **Label:** 9px uppercase, gray-400, letter-spacing 0.1em, font-weight 600.
- **Value:** 26px serif, font-weight 400, gray-900 (or green-700 / amber-700 / red-700 for Remaining).
- **Sub:** 10px, gray-400.
- **Total budget editing:** click anywhere in the metric box → it becomes an input (inherits styling, focus ring uses `var(--trip-base)/20`). Enter commits, Esc cancels. Pencil icon appears on hover at top-right of the box to advertise the affordance.
- Editing the Total budget scales each category's `budgeted` proportionally — same behavior as today's `handleSaveTotalBudget`. No confirm prompt, no two-path branching: this is the existing behavior preserved verbatim.

### 2.3 The table

Below the metric strip. 7-column grid:

| Column        | Width    | Content                                          |
| ------------- | -------- | ------------------------------------------------ |
| (empty/icon)  | 28px     | Category icon (theme-color tint background)      |
| Category      | flex 2fr | Chevron + category name                          |
| Budgeted      | 110px    | Right-aligned, tabular-nums, **inline-editable** |
| Spent         | 110px    | Right-aligned, tabular-nums (read-only — derived from expenses) |
| Remaining     | 110px    | Right-aligned, tabular-nums, **health colored**  |
| Progress      | flex 1fr | 4px progress bar (theme-color → amber → red)     |
| ⋯             | 30px     | Row actions (hover-revealed)                     |

**Row sizes:**

- Header row: 9px uppercase labels, gray-400, padding 9px 6px, gray bg `bg-[#fafaf7]`, border-radius 6px 6px 0 0.
- Data row: 13px text, padding 11px 6px, hairline `border-bottom: 1px solid #f5f3ee`. No row background by default — the table reads as a unified surface.
- Totals row: same grid, font-weight 600, bg `#fafaf7`, 2px top border, radius 0 0 6px 6px, padding 13px 6px.

**Health states** apply only to:
- The **Remaining** cell text color: green (`text-emerald-700`) when under 80%, amber (`text-amber-700`) when 80–100%, red (`text-red-700`) when over 100%. Font-weight 600 on amber/red.
- The **Progress bar fill**: `var(--trip-base)` 0–80%, `#d97706` 80–100%, `#dc2626` over 100%.

No per-category color palette. Icons render in the theme color at 8% opacity bg (matches the trip rail's active state pattern). This is the most visible signal of cohesion with Settings + the rail.

### 2.4 Inline editing

**Budgeted cells** (one per row, plus the metric-strip Total):

- Default state: subtle gray text, transparent border, hover reveals 1px gray-200 border + white bg + a small pencil icon.
- Click → cell becomes a focused `<input type="number">`. Same width, same right-alignment. Outline ring uses `var(--trip-base)/15`.
- **Enter** commits → save to localStorage + debounce-flush to `trip_context.budget_data` in Supabase.
- **Esc** or click-outside cancels → reverts to original value.
- **Tab** commits and moves focus to the next Budgeted cell down. (Tab from the last Budgeted cell focuses the totals row's Total budget metric.)
- The Spent and Remaining cells recompute live as the user types (visual feedback before commit).
- Invalid input (negative, non-numeric) shows a red ring on blur and refuses to commit.

**Currency:** values display via `useHomeCurrency().format()` like today (USD by default, respects trip currency). Editing strips the symbol; commit re-applies it.

### 2.5 Row expansion (expenses drawer)

Click anywhere on the **Category column** (chevron or name) to expand the row. The chevron rotates 90°, and an "expenses drawer" slides open as a `motion/react` `<motion.div>` between the row and the next:

- Drawer is grid-column: 1 / -1 (spans full width).
- Background `#fafaf7`, 1px border `#f0eee9`, rounded-lg, 8px margin.
- **Drawer header:** `<count> Expenses` (9px uppercase, font-weight 700, gray-400) on the left, `+ Add expense` link on the right (12px, theme color).
- **Each expense row** (4-column grid): `description | date | amount | × delete`. White bg, hairline border, 7px radius, 5px gap between rows.
- **Bottom dashed "add-expense" row:** triggers an inline form (description input + date input + amount input + commit/cancel buttons). Reuse Settings' `Input` primitive (h-11, rounded-xl, theme focus ring); if the default 11-tall feels heavy in the drawer, add a `compact` prop to `Input` that drops it to h-9 and tightens horizontal padding — flag during implementation, not blocking.

Multiple categories can be expanded simultaneously. Expansion state is local React state (not persisted) — collapses on page reload.

### 2.6 Row actions (⋯)

Hover-revealed at the right edge of each row:

- **Reset budget to suggestion** (only if `generateBudgetFromTrip` would produce a different value).
- **Delete category** (only for non-fixed categories; fixed: Flights, Hotels).

Implemented as a small popover (motion/react), not a hover-only auto-popup — click ⋯ to open, click outside to close.

### 2.7 Empty state

If the trip has no `budget_data` and `generateBudgetFromTrip` produces all-zero values (e.g., trip has no enriched cost-of-living data, no hotel pricing), the table renders with all categories at $0 and the metric strip prompts:

> "Set a Total budget to get started."

with a focus ring on the Total budget metric. No special empty-state illustration — the empty table is itself the affordance.

### 2.8 Mobile (< md breakpoint)

The 5-number-column table doesn't fit. Below `md` the table swaps to **stacked cards**:

- Metric strip compresses to 2×2 grid (Total / Spent on top, Remaining / Daily avg below).
- Each category renders as a card (white bg, hairline border, rounded-xl, 12px padding):
  - Top row: `[icon] [Name]` on left, `[%]` on right.
  - Middle row: `Spent $X / Budget $Y` as two stacked label+value pairs.
  - Bottom: 3px progress bar.
- Tap a card to expand the expenses drawer below it (same drawer markup, just full-width).
- Tap any number cell to focus it for inline edit (same as desktop, just bigger touch target).

The header stays the same (`+ Category`, `+ Expense` buttons) but the buttons compact to icon-only at the smallest breakpoint to save space.

### 2.9 Data persistence (unchanged from today)

Today's budget page already saves `budget_data` to `trip_context.budget_data` via Supabase, with debounced flush. Reuse that mechanism intact:

- `useEffect` debounce-flushes to Supabase 1500ms after the last change.
- On page load, `trip_context.budget_data` is the source of truth; if missing, seed from `generateBudgetFromTrip(trip, formatHome)`.
- No schema changes. No new columns.

The expense list per category lives inside `BudgetItem.expenses[]` — same shape as today.

## 3. Files affected

| File                                                                   | Change                                                                                                         |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `apps/web/app/(dashboard)/trip/[id]/budget/page.tsx`                   | Rewrite top-to-bottom around the new structure. Keep `generateBudgetFromTrip`, persistence, and types intact.  |
| `apps/web/components/trip/Module.tsx` (NEW)                            | Lift the `Module` component out of Settings so Budget can use the same shell. Pure presentational, no state.   |
| `apps/web/app/(dashboard)/trip/[id]/settings/page.tsx`                 | Replace its inline `Module` with the import from the shared file. No visual change — pure refactor.            |

> **Note for the implementation plan:** `settings/page.tsx` is currently uncommitted WIP in the user's working tree (the redesign that defines `Module`). Read it from working-tree state — do NOT assume it matches `origin/develop`. The planner / implementer should `git status` first, then read the file as it sits, and lift `Module` from there.
| `apps/web/components/trip/budget/BudgetTable.tsx` (NEW)                | The desktop spreadsheet table. Rows + header + totals.                                                         |
| `apps/web/components/trip/budget/BudgetTableRow.tsx` (NEW)             | A single row with its expenses drawer. Owns the inline-edit + expansion state.                                 |
| `apps/web/components/trip/budget/BudgetMobileList.tsx` (NEW)           | The mobile stacked-card list (rendered in place of the table at `< md`).                                       |
| `apps/web/components/trip/budget/BudgetMetricStrip.tsx` (NEW)          | The 4-metric strip with inline-editable Total budget.                                                          |
| `apps/web/components/trip/budget/EditableCell.tsx` (NEW)               | Reusable controlled cell with hover/focus/edit/commit/cancel/Tab logic. Used by `BudgetTableRow` and the strip. |
| `apps/web/components/trip/budget/ExpensesDrawer.tsx` (NEW)             | The expanded-row drawer with expense list + inline add form.                                                   |
| `apps/web/components/trip/budget/categoryIcons.ts` (NEW)               | The CATEGORY_ICONS map (lifted out of the page file).                                                          |

The current `apps/web/app/(dashboard)/trip/[id]/budget/page.tsx` (842 lines) is a bag of state, render, and helpers. Splitting into the structure above is part of this work — the new `page.tsx` should orchestrate state and persist, not hold all the markup.

The new files live under `apps/web/components/trip/budget/` so they're co-located and obviously a feature group, mirroring how Settings keeps its sub-controls inline. (Settings is one file because each control is small and shares a lot of state; Budget benefits from splitting because the table row + drawer + mobile card duplicate non-trivial markup.)

## 4. Behavior details

### 4.1 Saving state

- **Local edits update React state immediately** — Spent/Remaining/Total recompute in real time.
- **Debounced flush** to Supabase happens 1500ms after the last edit (matches today's `flushTimer` pattern). If the user navigates away mid-debounce, flush on unmount.
- **Optimistic save:** no toast on success. On error, toast: "Couldn't save budget — your changes are still here, try again."
- **Save indicator:** a small "Saving…" / "Saved · just now" pill in the panel header (matches Settings' `appearanceDirty` pattern). Hides after 2 seconds of clean state.

### 4.2 Expanded rows + state ownership

- Each `BudgetTableRow` owns its own `isExpanded` boolean. The parent `BudgetTable` does not track which rows are open.
- `EditableCell` is fully controlled — value comes from props, edit-mode-toggle is local state.

### 4.3 Recompute math

- `Remaining = item.budgeted - item.actual` (negative when over).
- `Spent (column)` = `item.actual`. `item.actual` is recomputed on every state change as `sum(item.expenses[].amount)`. Adding/removing/editing an expense recomputes `actual` automatically.
- `Total budget metric` = `sum(item.budgeted)`. Editing this scales each category's budgeted value proportionally (current behavior, preserved).
- `Total spent metric` = `sum(item.actual)`.
- `Total remaining` = `total budget - total spent`.
- `Daily avg spent` = `total spent / days_elapsed` where `days_elapsed = max(1, min(days_in_trip, days_since_start))`. Before the trip starts, daily avg = `total spent / days_in_trip`.
- Health %: `actual / budgeted * 100`. For the metric-strip Remaining, use `total spent / total budget * 100`.

### 4.4 Keyboard

- **Tab** through Budgeted cells top-to-bottom, then to Total budget metric.
- **Enter** commits a focused cell.
- **Esc** cancels.
- **Cmd/Ctrl + Enter** (in the dashed add-expense row) commits and re-focuses for a second add — same UX as adding multiple expenses fast.
- The category-name chevron is a `<button>` (focusable, `aria-expanded`, `aria-controls` pointing at the drawer's id).

### 4.5 a11y

- The table is a real `<table>` element (not a CSS-grid emulation). Header in `<thead>`, body in `<tbody>`, totals in `<tfoot>`. Column widths come from `<colgroup>` so cells line up across rows. Editable cells use a focusable element (button when at rest, input when editing) with appropriate `aria-label` ("Budget for Hotels").
- Progress bars use `<div role="progressbar" aria-valuenow={spent} aria-valuemin={0} aria-valuemax={budgeted}>`.
- The drawer's expand/collapse uses `aria-expanded` on the row's chevron button and `aria-hidden` on the drawer when collapsed.
- Mobile cards use `<button>` for the whole card with `aria-expanded`.

## 5. Visual specs (quick-reference)

| Token                           | Value                                           |
| ------------------------------- | ----------------------------------------------- |
| Module surface                  | `bg-white border border-gray-200 rounded-2xl shadow-sm` |
| Module title                    | 26px serif, font-weight 400                      |
| Module description              | 13px, `text-gray-500`                            |
| Metric label                    | 9px uppercase, `text-gray-400`, weight 600       |
| Metric value                    | 26px serif, weight 400                           |
| Metric sub                      | 10px, `text-gray-400`                            |
| Table header label              | 9px uppercase, `text-gray-400`, weight 700, padding 9px 6px |
| Data row text                   | 13px, padding 11px 6px                           |
| Data row separator              | 1px `#f5f3ee`                                    |
| Tabular numbers                 | `font-variant-numeric: tabular-nums`             |
| Editable-cell hover             | `bg-white border border-gray-200 rounded`        |
| Editable-cell focus             | `border-[var(--trip-base)] outline 2px outline-[var(--trip-base)/15]` |
| Health · under 80%              | `text-emerald-700 font-semibold` / progress `var(--trip-base)` |
| Health · 80–100%                | `text-amber-700 font-semibold` / progress `#d97706` |
| Health · over 100%              | `text-red-700 font-semibold` / progress `#dc2626` |
| Category icon background        | `var(--trip-base) at 8% alpha`                   |
| Category icon color             | `var(--trip-base)`                               |
| Drawer surface                  | `bg-[#fafaf7] border border-[#f0eee9] rounded-lg` |
| Expense row                     | `bg-white border border-[#f0eee9] rounded-md`    |
| Add-expense dashed row          | `border-dashed border-gray-200`, hover → `border-[var(--trip-base)]` |

## 6. Non-goals

- **No per-category color palette.** Theme color only. (This is the biggest carry-forward decision and is intentional for cohesion.)
- **No charts** in this iteration. The progress bar is the only visualization.
- **No CSV import / export.** Manual entry only.
- **No multi-currency.** All amounts use the trip's currency, displayed via `useHomeCurrency`.
- **No expense splitting between travelers.** Future concern.
- **No category reordering.** Order is fixed in `EMPTY_BUDGET`.

## 7. Open questions

None blocking. Two judgment calls during implementation:
- The "+ Expense" button in the panel header opens a category picker, then drops into the drawer's add form. If the picker UX feels heavy, consider expanding the user's most recently edited category and focusing its add row instead.
- The mobile add-expense flow may want to be a full-screen sheet instead of an in-card form. Decide based on feel during build.

## 8. Acceptance criteria

- The Budget page renders with the same `Module` shell as Settings (white card, hairline border, rounded-2xl, 26px serif title).
- Single theme color is used for category icons, progress bars (under 80%), and edit-focus rings. No blue/orange/teal/purple/green per-category palette.
- The metric strip shows 4 metrics; Total budget is inline-editable and scales categories proportionally on save.
- The table renders 7 categories + a totals row by default. All Budgeted cells are inline-editable. Spent and Remaining recompute live.
- Health colors apply to Remaining text + Progress bar fill only, not row backgrounds.
- Clicking a category name expands the row to show its expenses + an inline add-form. Multiple rows can be expanded.
- Adding an expense: type description + amount + (optional) date, Enter commits, the row's Spent/Remaining/Progress recompute live, and a debounced flush hits Supabase within ~2 seconds.
- Mobile (< md): table collapses to stacked cards with the same interactions.
- No regressions vs today's behavior: data persists across reloads, `generateBudgetFromTrip` seeds correctly on first visit, currency formatting respects `useHomeCurrency`, deleting a non-fixed category works via the ⋯ menu.
- The shared `Module` component is imported by Settings (no visual change there) — confirms the lift is a pure refactor.
