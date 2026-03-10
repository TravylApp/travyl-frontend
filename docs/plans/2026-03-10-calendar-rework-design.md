# Calendar Rework Design

## Goal

Redesign the calendar view on both web and mobile with improved activity blocks, full itinerary creation capabilities, customizable activity colors, collaboration presence, and full feature parity between platforms.

## Architecture

Enhance the existing `CalendarView` (web) and `MobileCalendarView` (mobile) rather than rewriting. All existing features are preserved — drag-drop, discover panel, notes, parent/child nesting, day reordering, detail modal, collaborator dots. New capabilities are layered on top.

**Checkpoint:** Commit `7051090` on `develop` — revert target if needed.

---

## 1. Block Redesign (Web + Mobile)

### New Block Layout — Image Header Style

Every activity block uses this structure:

```
┌──────────────────────────────┐
│ ░░░ image strip (40px) ░░░░ │  ← activity image or solid category color
│ 🏛 Eiffel Tower         $25 │  ← category icon badge + title + price
│ 9:00 AM – 11:00 AM  ★ 4.5  │  ← time range + rating
└──────────────────────────────┘
```

- **Image strip**: 40px tall. Falls back to solid category color if no image.
- **Category icon badge**: Small colored circle with icon, overlapping image strip bottom-left.
- **Block height**: Proportional to duration — `duration * HOUR_HEIGHT`, minimum 1 slot.
- **Block border-left**: 3px solid category color.
- **Sub-blocks** inside a parent: Same layout, smaller image strip (28px), indented, connected with subtle vertical line on left.
- **Tiny blocks** (< 30min): Single-line — icon + title + time, no image strip.
- **Colors**: Block background uses category `bgColor` (light tint). Image strip, icon badge, and border use category `primary` — all customizable via settings.

### Affected Components

- **Web**: `CalendarCard`, `ParentBlockCard` in `CalendarView.tsx`
- **Mobile**: `MobileCalendarView` activity rendering in `itinerary.tsx`
- **Shared**: `CalendarActivity` type (no changes needed — already has `image`, `color`, `type`)

---

## 2. Long-Press Creation Flow

### Interaction

- **Long-press empty time slot** (500ms) → haptic feedback (mobile) / visual pulse (web) → opens creation sheet
- **Long-press inside a parent block** → same sheet, pre-fills `parentId` and inherits parent's day/time
- **Web alternative**: Right-click empty slot opens same creation form as a popover

### Creation Sheet Fields

| Field | Required | Default |
|-------|----------|---------|
| Title | Yes | — |
| Time | Yes | Pre-filled from slot |
| Duration | Yes | 1 hour |
| Category/Type | No | "custom" |
| Color | No | Theme default for category |
| Icon | No | Category default |
| Image | No | None (camera/gallery picker) |
| Description/Notes | No | — |
| Location | No | — |

### Platform UI

- **Mobile**: Half-sheet sliding up from bottom
- **Web**: Popover anchored to the time slot, or modal for full form

### Data

New activities created this way get `source: 'user'` (vs `source: 'discover'` for ones added from the discover panel). Stored in `ItineraryContext.activities` array.

---

## 3. Activity Category Colors in Settings

### Pattern

Same as existing tab color customization — theme sets defaults, users override per-category.

### New Setting Section

"Activity Colors" in ThemePicker, below existing "Tab Colors" and "Itinerary Colors":

- Grid of category swatches: sightseeing, tour, dining, cultural, shopping, nightlife, outdoor, museum, event, hotel, transport, custom
- Each: colored icon + label + color picker on tap
- "Reset to theme defaults" button

### Data

- New field: `activityColorOverrides: Record<string, string>` in theme context
- Persisted alongside existing `tabColorOverrides` and `itineraryColorOverrides`
- Web: `TripThemeContext` + localStorage
- Mobile: `TabCtx` + AsyncStorage

### Theme Integration

`resolveTheme()` gains `activityColors: Record<string, { primary, bg, border }>` computed from the base theme, overridable per-category.

---

## 4. Presence Indicators (Phase B — polling)

### Per Activity Block

- Small avatar circle (20px) bottom-right showing last editor
- Multiple editors: stack up to 3 avatars with overlap
- Tooltip/press: "Last edited by Sarah, 2 min ago"

### Online Status

- Dot grid in calendar header showing who's viewing this trip
- Green = online, gray = offline

### Data

```typescript
interface ActivityEditInfo {
  lastEditedBy: {
    userId: string;
    name: string;
    avatarInitial: string;
    color: string;
    timestamp: number;
  } | null;
}
```

Added to `CalendarActivity` type. For now, locally tracked. When WebSocket/Supabase Realtime is added later, this becomes live.

### Future Upgrade Path (Phase A — real-time)

- Supabase Realtime presence channel per trip
- Broadcasts: cursor position, selected block, online status
- CRDT/Yjs for conflict resolution on simultaneous edits
- Live cursor rendering with name labels

---

## 5. Mobile Feature Parity

All web calendar features ported to mobile:

| Web Feature | Mobile Implementation |
|---|---|
| Drag-drop activities | Long-press pick up → drag to new slot via `react-native-gesture-handler` + `reanimated` |
| Discover panel (side drawer) | Bottom sheet (`@gorhom/bottom-sheet`) with search + categories |
| Sticky notes (double-click) | Double-tap empty slot → note creation |
| Day reordering | Long-press day pill → drag to reorder |
| Drop from discover | Tap "+" on discover card → pick time slot |
| Detail modal | Tap activity → full detail bottom sheet |
| Parent expand/collapse | Tap parent header → animate sub-blocks in/out |
| Time section dividers | Morning/Afternoon/Evening visual dividers in grid |

### Gesture Disambiguation

- **Single tap**: Select/open detail
- **Double tap**: Create note
- **Long press (empty)**: Create activity
- **Long press (on block)**: Pick up for drag
- **Long press (inside parent)**: Create sub-activity

### Dependencies

- `react-native-gesture-handler` (already installed)
- `react-native-reanimated` (already installed)
- `@gorhom/bottom-sheet` (new — install needed)

---

## Summary

| Feature | Web | Mobile |
|---|---|---|
| Image-header blocks | Redesign CalendarCard/ParentBlockCard | Redesign MobileCalendarView blocks |
| Duration-proportional height | Already exists, refine | New — currently fixed height |
| Long-press creation | Right-click + long-press | Long-press |
| Sub-block creation | Long-press inside parent | Long-press inside parent |
| Activity color settings | ThemePicker extension | ThemePicker extension |
| Presence indicators | Avatar badges on blocks | Avatar badges on blocks |
| Drag-drop | Keep existing react-dnd | New — gesture handler |
| Discover panel | Keep existing side drawer | New — bottom sheet |
| Sticky notes | Keep existing double-click | New — double-tap |
| Day reordering | Keep existing drag headers | New — drag day pills |
