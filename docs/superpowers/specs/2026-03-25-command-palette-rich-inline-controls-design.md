# Command Palette — Rich Inline Controls

**Date:** 2026-03-25
**Status:** Approved

## Goal

Replace the drill-down sub-list pattern in the `GlobalCommandPalette` settings items with rich inline controls. Users should be able to see what a setting does and act on it directly from the palette row — no nested screens, no guessing whether a click will toggle, navigate, or open a picker.

## Scope

`GlobalCommandPalette` (`apps/web/components/GlobalCommandPalette.tsx`) only. The calendar-specific `CommandPalette` is unaffected.

## Problem

The palette currently has three settings item types — toggles, pickers, and links — that all look nearly identical (text label + small right-side annotation). Users can't tell at a glance whether clicking a row will flip a toggle, open a sub-list, or navigate away. The picker sub-list replaces the entire palette contents, which is disorienting.

## Design

### Item type → control mapping

| Item | Old behavior | New control |
|---|---|---|
| Toggle (push notifs, email notifs, tab visibility) | "On/Off" badge, click flips | Toggle switch component inline |
| Theme picker | Drills to sub-list | Row of color swatches, click applies |
| Status picker | Drills to sub-list | 5 colored status pills, click applies |
| Distance units | Drills to sub-list | Segmented control (2 options) |
| Travel style | Drills to sub-list | 5 clickable chips inline |
| Currency | Drills to sub-list | Horizontal scrollable pill row (7 codes) |
| Links (sharing, password, delete, etc.) | "→" arrow, navigates | Unchanged |

The picker sub-list (`activePicker` state, `exitPickerMode`, `selectPickerOption`, `savedQuery`) is removed entirely.

### Visual treatment

**Toggle switch**
- 28×16px pill-shaped switch, thumb slides left/right
- On: emerald green (`bg-emerald-500` thumb, `bg-emerald-100 dark:bg-emerald-900/30` track)
- Off: gray track, gray thumb
- Click anywhere on the row triggers the toggle

**Theme swatches**
- Horizontal row of 16px circles, 6px gap
- Each circle uses the theme's `base` field (e.g. `#1e3a5f` for Navy) as the fill color — `base` is the light-mode primary color defined on `TripTheme` in `packages/shared/src/config/themes.ts`
- Active theme: white inner ring + dark outer border (ring + box-shadow approach)
- Click a circle applies immediately, palette stays open

**Status pills**
- 5 small rounded pills using existing status colors:
  - Planning: gray (`#9CA3AF`)
  - Booked: amber (`#F59E0B`)
  - Active: emerald (`#10B981`)
  - Completed: navy (`#003594`)
  - Abandoned: red (`#EF4444`)
- Active: filled/solid. Inactive: outlined
- Click applies immediately

**Segmented control (distance units)**
- Two side-by-side buttons: `Miles` | `Km`
- Active: filled background. Inactive: plain
- Compact, fits in a single row

**Travel style chips**
- 5 small text chips: Balanced, Budget, Luxury, Adventure, Relaxed
- Active: navy bg + white text. Inactive: outlined

**Currency pills (scrollable)**
- 7 currency code pills in a horizontal scroll container: USD EUR GBP JPY CAD AUD MXN
- Active: filled. Overflow scrolls horizontally
- No nested list — all 7 accessible via scroll at palette width

### Row heights
- Plain rows (nav, links, calendar commands): `py-2` unchanged
- Rows with inline controls: `py-2.5`, control vertically centered

### Keyboard behavior
- Arrow keys navigate between rows as before, including rows with inline visual pickers (theme, status, distance, travel style, currency) — they are keyboard-reachable and show the highlight state
- `Enter` on a toggle row flips it
- `Enter` on a visual picker row (swatch/pill/segmented/chip) is a no-op — these controls are mouse/click only. The row shows the highlighted background when focused via keyboard but Enter produces no action and no feedback
- `Enter` on a link row navigates (unchanged)
- All other keyboard behavior unchanged

### Palette open/close behavior
- Toggles and inline pickers keep the palette open after acting (unchanged)
- Only links and navigation items close the palette

### State removed
- `activePicker: SettingPickerItem | null`
- `savedQuery: string`
- `exitPickerMode()`
- `selectPickerOption()`
- Picker mode branch in `handleKeyDown`
- Picker mode branch in the render output
- The back-arrow header shown during picker mode

The `SettingPickerItem` type's `onSelect` is still called — invoked directly from the inline control's `onClick` rather than from the sub-list flow. The `SettingPickerItem` type itself is retained since it defines the data shape that drives the inline controls.

The `setting-picker` branch in `executeItem` currently calls `setActivePicker` — this branch is replaced with a no-op (or removed), since picker rows no longer open a sub-list.

## Files affected

- `apps/web/components/GlobalCommandPalette.tsx` — primary changes
- No new files needed
- No changes to `SettingToggleItem`, `SettingPickerItem`, or `SettingLinkItem` type definitions
- No changes to `tripSettingsStore`, `calendarCommandsStore`, or `useSettingsStore`

## Testing

- Toggle: flip on/off, verify store updates, palette stays open
- Theme swatches: verify all themes render correct colors, clicking applies, palette stays open
- Status pills: verify correct colors, clicking updates trip status
- Distance/currency/travel style: verify active state highlights, clicking calls `onSelect`
- Links: unchanged — still navigate and close palette
- Keyboard: arrow keys navigate rows, Enter flips toggles, palette closes on Esc
- Empty state: no results message still appears when search yields nothing
- Logged-out state: `settingItems` returns `[]` when `user` is null — verify the Settings group is absent from the palette when not authenticated
