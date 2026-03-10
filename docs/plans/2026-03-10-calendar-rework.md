# Calendar Rework Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign calendar blocks (image-header style), add long-press creation flow, activity color settings, presence indicators, and full mobile feature parity — all on one feature branch.

**Architecture:** Layer new capabilities onto existing `CalendarView.tsx` (web, 1,162 lines) and `itinerary.tsx` (mobile, 1,183 lines). Shared types in `packages/shared`. Theme system extended with `activityColorOverrides` following the existing `tabColorOverrides` / `itineraryColorOverrides` pattern.

**Tech Stack:** React + react-dnd (web), React Native + react-native-gesture-handler + reanimated (mobile), @gorhom/bottom-sheet (mobile discover panel), shared TypeScript types.

**Checkpoint:** Commit `7051090` on `develop` — revert target if anything goes wrong.

---

## Phase 1: Shared Foundation

### Task 1: Extend CalendarActivity Type

**Files:**
- Modify: `packages/shared/src/types/index.ts` (CalendarActivity interface, ~line 297)
- Modify: `packages/shared/src/config/mockItineraryData.ts` (mock data)

**Step 1: Add new fields to CalendarActivity**

Add these optional fields to the `CalendarActivity` interface:

```typescript
interface CalendarActivity {
  // ... existing fields ...
  source?: 'user' | 'discover';        // how it was added
  description?: string;                  // user notes
  icon?: string;                         // custom icon name
  lastEditedBy?: {                       // presence tracking (Phase B)
    userId: string;
    name: string;
    avatarInitial: string;
    color: string;
    timestamp: number;
  } | null;
}
```

**Step 2: Add `source` to existing mock activities**

In `mockItineraryData.ts`, add `source: 'discover'` to the `MOCK_CALENDAR_ACTIVITIES` array entries. Add one `source: 'user'` example.

**Step 3: Verify build**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add packages/shared/src/types/index.ts packages/shared/src/config/mockItineraryData.ts
git commit -m "feat(shared): extend CalendarActivity with source, description, icon, lastEditedBy"
```

---

### Task 2: Unify Activity Category Colors

**Files:**
- Modify: `packages/shared/src/config/itineraryData.ts` (~72 lines)
- Modify: `packages/shared/src/config/themes.ts` (~227 lines)

**Context:** Currently activity type colors are defined in 3 places with slightly different values:
- `CalendarView.tsx` `typeConfig` (web-only, 11 types)
- `itineraryData.ts` `ACTIVITY_TYPE_COLORS` (shared, 13 types)
- `itinerary.tsx` hardcoded `CATEGORY_COLORS` (mobile-only, 9 types)

We need one canonical source.

**Step 1: Consolidate ACTIVITY_TYPE_COLORS in itineraryData.ts**

Update `ACTIVITY_TYPE_COLORS` to include all 12 categories from the design doc with consistent `primary`, `bg`, `border`, and `icon` fields:

```typescript
export const ACTIVITY_CATEGORIES = {
  sightseeing: { label: 'Sightseeing', primary: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', icon: 'camera' },
  tour:        { label: 'Tour',        primary: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', icon: 'compass' },
  dining:      { label: 'Dining',      primary: '#ea580c', bg: '#fff7ed', border: '#fed7aa', icon: 'utensils' },
  cultural:    { label: 'Cultural',    primary: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', icon: 'landmark' },
  shopping:    { label: 'Shopping',    primary: '#ec4899', bg: '#fdf2f8', border: '#fbcfe8', icon: 'shopping-bag' },
  nightlife:   { label: 'Nightlife',   primary: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff', icon: 'music' },
  outdoor:     { label: 'Outdoor',     primary: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: 'tree-pine' },
  museum:      { label: 'Museum',      primary: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: 'landmark' },
  event:       { label: 'Event',       primary: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: 'star' },
  hotel:       { label: 'Hotel',       primary: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', icon: 'hotel' },
  transport:   { label: 'Transport',   primary: '#64748b', bg: '#f8fafc', border: '#e2e8f0', icon: 'plane' },
  custom:      { label: 'Custom',      primary: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', icon: 'plus-circle' },
} as const;

export type ActivityCategoryKey = keyof typeof ACTIVITY_CATEGORIES;

export function getActivityCategory(type: string) {
  return ACTIVITY_CATEGORIES[type as ActivityCategoryKey] ?? ACTIVITY_CATEGORIES.custom;
}
```

Keep the old `ACTIVITY_TYPE_COLORS` export as a thin wrapper for backwards compat until web/mobile are updated.

**Step 2: Add resolveActivityColors to themes.ts**

```typescript
export function resolveActivityColors(
  overrides: Record<string, string> = {}
): Record<string, { primary: string; bg: string; border: string }> {
  const result: Record<string, { primary: string; bg: string; border: string }> = {};
  for (const [key, cat] of Object.entries(ACTIVITY_CATEGORIES)) {
    const primary = overrides[key] ?? cat.primary;
    result[key] = {
      primary,
      bg: cat.bg,       // could compute tint from primary later
      border: cat.border,
    };
  }
  return result;
}
```

**Step 3: Export from shared package**

Ensure `ACTIVITY_CATEGORIES`, `getActivityCategory`, and `resolveActivityColors` are exported from `packages/shared/src/index.ts`.

**Step 4: Verify build**

Run: `cd packages/shared && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): unify activity category colors with single canonical source"
```

---

## Phase 2: Activity Color Settings

### Task 3: Add activityColorOverrides to Web Theme Context

**Files:**
- Modify: `apps/web/components/trip/TripThemeContext.tsx` (~153 lines)

**Step 1: Add state + methods**

Following the exact pattern of `itineraryColorOverrides`:

```typescript
// In TripThemeContextValue interface:
activityColorOverrides: Record<string, string>;
setActivityColor: (category: string, color: string) => void;
resetActivityColors: () => void;
```

```typescript
// In TripThemeProvider:
const [activityColorOverrides, setActivityColorOverrides] = useState<Record<string, string>>({});

const setActivityColor = useCallback((category: string, color: string) => {
  setActivityColorOverrides(prev => ({ ...prev, [category]: color }));
}, []);

const resetActivityColors = useCallback(() => {
  setActivityColorOverrides({});
}, []);
```

**Step 2: Persist to localStorage**

Add `activityColorOverrides` to the existing localStorage save/load alongside `tabColorOverrides` and `itineraryColorOverrides`.

**Step 3: Verify build**

Run: `cd apps/web && npx next build` (or `npx tsc --noEmit`)

**Step 4: Commit**

```bash
git add apps/web/components/trip/TripThemeContext.tsx
git commit -m "feat(web): add activityColorOverrides to TripThemeContext"
```

---

### Task 4: Add Activity Colors Section to ThemePicker (Web)

**Files:**
- Modify: `apps/web/components/trip/ThemePicker.tsx` (~309 lines)

**Step 1: Add props**

```typescript
interface ThemePickerProps {
  // ... existing props ...
  activityColorOverrides?: Record<string, string>;
  onActivityColorChange?: (category: string, color: string) => void;
  onResetActivityColors?: () => void;
}
```

**Step 2: Add "Activity Colors" section**

Below the existing "Day Colors" and "Tab Colors" sections, add a new section. Use the `ACTIVITY_CATEGORIES` import to render a grid of category swatches. Each swatch shows:
- Colored circle with category icon
- Category label
- Click to open color picker (same 28-swatch picker used for tabs)

Add a "Reset to defaults" button.

**Step 3: Wire into settings page**

In `apps/web/app/(main)/trip/[id]/settings/page.tsx`, pass the new props to `<ThemePicker>` in the `case 'appearance'` block:

```typescript
activityColorOverrides={activityColorOverrides}
onActivityColorChange={(cat, color) => { setActivityColor(cat, color); markDirty(); }}
onResetActivityColors={() => { resetActivityColors(); markDirty(); }}
```

**Step 4: Verify visually**

Open settings → Appearance → scroll to Activity Colors section. Each category should show its color, clicking should open picker.

**Step 5: Commit**

```bash
git add apps/web/components/trip/ThemePicker.tsx apps/web/app/(main)/trip/[id]/settings/page.tsx
git commit -m "feat(web): add Activity Colors section to ThemePicker"
```

---

### Task 5: Add activityColorOverrides to Mobile TabCtx

**Files:**
- Modify: `apps/mobile/app/trip/[id]/_layout.tsx` (TabCtx context)

**Step 1: Add to TabCtx interface and provider**

Following the same pattern as `tabColorOverrides` and `itineraryColorOverrides` already in TabCtx:

```typescript
// In TabCtx:
activityColorOverrides: Record<string, string>;
setActivityColor: (category: string, color: string) => void;
resetActivityColors: () => void;
```

**Step 2: Persist to AsyncStorage**

Add to the existing AsyncStorage save/load block (around lines 777-804) that already handles `tabColorOverrides` and `itineraryColorOverrides`.

**Step 3: Verify build**

Run: `cd apps/mobile && npx expo start` — confirm no errors

**Step 4: Commit**

```bash
git add apps/mobile/app/trip/[id]/_layout.tsx
git commit -m "feat(mobile): add activityColorOverrides to TabCtx"
```

---

## Phase 3: Block Redesign (Web)

### Task 6: Redesign CalendarCard — Image Header Style

**Files:**
- Modify: `apps/web/components/itinerary/CalendarView.tsx` (CalendarCard component, ~line 600+)

**Context:** The current CalendarCard uses a gradient background with image overlay. The new design uses a structured layout:

```
┌──────────────────────────────┐
│ ░░░ image strip (40px) ░░░░ │  ← activity image or solid category color
│ 🏛 Eiffel Tower         $25 │  ← category icon badge + title + price
│ 9:00 AM – 11:00 AM  ★ 4.5  │  ← time range + rating
└──────────────────────────────┘
```

**Step 1: Update CalendarCard rendering**

Replace the current card layout with the new image-header structure:

- **Image strip**: 40px height div. If `activity.image` exists, render as `background-image` with `object-fit: cover`. Otherwise, solid `category.primary` color.
- **Category icon badge**: 24px colored circle positioned `bottom: -12px, left: 8px` overlapping the image strip. Contains the category icon (from lucide-react, same icons as current `typeConfig`).
- **Content area**: Background uses `category.bg` (light tint). Left border: 3px solid `category.primary`.
  - Row 1: Title (bold, truncated) + price (right-aligned)
  - Row 2: Time range + rating stars (right-aligned)
- **Tiny blocks** (height < 50px): Single-line layout — icon + title + time, no image strip.
- **Compact blocks** (50-80px): Icon badge + title + time, smaller image strip (24px).

**Step 2: Use resolved activity colors**

Import `getActivityCategory` from shared. Use `activityColorOverrides` from `useTripTheme()` to resolve colors:

```typescript
const category = getActivityCategory(activity.type);
const overrideColor = activityColorOverrides[activity.type];
const primary = overrideColor ?? category.primary;
const bg = category.bg;
```

**Step 3: Verify visually**

Open web calendar. All activity blocks should show new image-header layout. Blocks with images show the image strip. Blocks without images show solid category color. Tiny blocks show single-line.

**Step 4: Commit**

```bash
git add apps/web/components/itinerary/CalendarView.tsx
git commit -m "feat(web): redesign CalendarCard with image-header layout"
```

---

### Task 7: Redesign ParentBlockCard — Image Header Style

**Files:**
- Modify: `apps/web/components/itinerary/CalendarView.tsx` (ParentBlockCard component)

**Step 1: Update parent block layout**

Parent blocks (e.g., Disneyland) use the same image-header structure as CalendarCard but larger:
- Image strip: 48px (slightly taller than regular cards)
- Title shows activity count: "Disneyland (5 activities)"
- Expanded mode: Sub-blocks render inside with:
  - Smaller image strip (28px)
  - Indented 16px from left
  - Connected with subtle vertical line (2px, category color, 20% opacity) on the left margin

**Step 2: Update collapsed mode**

Collapsed parent shows:
- Image-header layout (same as CalendarCard)
- Below title: horizontal scroll of child chips (small colored pills with child title)
- "+N more" if > 3 children

**Step 3: Verify visually**

Open web calendar with Day 2 (Disneyland). Parent block should show image header. Expand → sub-blocks appear with smaller headers and connecting line. Collapse → chips visible.

**Step 4: Commit**

```bash
git add apps/web/components/itinerary/CalendarView.tsx
git commit -m "feat(web): redesign ParentBlockCard with image-header layout + sub-block styling"
```

---

## Phase 4: Block Redesign (Mobile)

### Task 8: Redesign Mobile Calendar Blocks

**Files:**
- Modify: `apps/mobile/app/trip/[id]/itinerary.tsx` (MobileCalendarView component)
- Modify: `apps/mobile/components/itinerary/ActivityCard.tsx`

**Context:** Mobile currently renders activities as flat colored cards with a left border. The new design matches web's image-header layout adapted for mobile touch targets.

**Step 1: Update MobileCalendarView block rendering**

Replace the current flat card layout in `MobileCalendarView` with:

```
┌──────────────────────────────┐
│ ░░░ image strip (36px) ░░░░ │  ← activity image or solid category color
│ 🏛 Eiffel Tower         $25 │  ← category icon badge + title + price
│ 9:00 AM – 11:00 AM  ★ 4.5  │  ← time range + rating
└──────────────────────────────┘
```

- Image strip: 36px (slightly smaller than web for touch density)
- Category icon badge: 22px circle, overlapping image strip
- Content area: `backgroundColor: category.bg`, `borderLeftWidth: 3, borderLeftColor: category.primary`
- Minimum block height based on duration: `Math.max(44, duration * HOUR_HEIGHT)`

**Step 2: Handle sub-blocks in parent**

Sub-blocks inside a parent:
- Smaller image strip (24px)
- Indented with `marginLeft: 16`
- Vertical connecting line on left: `borderLeftWidth: 2, borderLeftColor: category.primary + '33'`

**Step 3: Use resolved activity colors**

Import `getActivityCategory` from `@travyl/shared`. Use `activityColorOverrides` from `TabCtx`:

```typescript
const { activityColorOverrides } = useContext(TabCtx);
const category = getActivityCategory(activity.type);
const primary = activityColorOverrides[activity.type] ?? category.primary;
```

**Step 4: Verify on device**

Run Expo → navigate to itinerary → blocks should show image-header layout matching web design.

**Step 5: Commit**

```bash
git add apps/mobile/app/trip/[id]/itinerary.tsx apps/mobile/components/itinerary/ActivityCard.tsx
git commit -m "feat(mobile): redesign calendar blocks with image-header layout"
```

---

## Phase 5: Long-Press Creation Flow

### Task 9: Creation Sheet Component (Web)

**Files:**
- Create: `apps/web/components/itinerary/ActivityCreationForm.tsx`

**Step 1: Build the creation form component**

A popover/modal form with these fields:

```typescript
interface ActivityCreationFormProps {
  day: number;
  startHour: number;
  parentId?: string;        // if creating inside a parent block
  onSubmit: (activity: CalendarActivity) => void;
  onClose: () => void;
}
```

Fields (matching design doc):
| Field | Type | Required | Default |
|-------|------|----------|---------|
| Title | text input | Yes | — |
| Time | time picker | Yes | Pre-filled from slot |
| Duration | number input (hours) | Yes | 1 |
| Category | dropdown (ACTIVITY_CATEGORIES) | No | "custom" |
| Color | color swatch picker | No | Category default |
| Icon | icon picker (subset of lucide) | No | Category default |
| Image | file upload or URL | No | None |
| Description | textarea | No | — |
| Location | text input | No | — |

On submit: creates a `CalendarActivity` with `source: 'user'`, generates UUID, calls `onSubmit`.

**Step 2: Style to match existing UI**

Use same card/form styling as the existing detail modal. Popover variant for quick creation, modal for full form (toggle via "More options" link).

**Step 3: Verify**

Render the form standalone to check all fields work and submission produces valid CalendarActivity.

**Step 4: Commit**

```bash
git add apps/web/components/itinerary/ActivityCreationForm.tsx
git commit -m "feat(web): add ActivityCreationForm component"
```

---

### Task 10: Wire Long-Press / Right-Click Creation (Web)

**Files:**
- Modify: `apps/web/components/itinerary/CalendarView.tsx`

**Step 1: Add right-click handler on empty time slots**

In the calendar grid, add `onContextMenu` to each time-slot area:

```typescript
const handleSlotRightClick = (e: React.MouseEvent, day: number, hour: number) => {
  e.preventDefault();
  setCreationTarget({ day, hour, parentId: undefined });
};
```

**Step 2: Add long-press handler**

Use `onMouseDown`/`onMouseUp` with 500ms timeout for long-press detection on desktop:

```typescript
const longPressTimer = useRef<NodeJS.Timeout>();

const handleSlotMouseDown = (day: number, hour: number) => {
  longPressTimer.current = setTimeout(() => {
    setCreationTarget({ day, hour, parentId: undefined });
  }, 500);
};

const handleSlotMouseUp = () => {
  clearTimeout(longPressTimer.current);
};
```

**Step 3: Add long-press inside parent blocks**

On ParentBlockCard, add long-press handler that sets `parentId`:

```typescript
const handleParentLongPress = (parentId: string, day: number, hour: number) => {
  setCreationTarget({ day, hour, parentId });
};
```

**Step 4: Show ActivityCreationForm**

When `creationTarget` is set, render `<ActivityCreationForm>` as a popover anchored near the click position. On submit, call `addActivity()` from ItineraryContext.

**Step 5: Verify**

Right-click an empty slot → form appears. Fill in title + time → submit → activity appears on calendar. Long-press inside Disneyland → form pre-fills parentId.

**Step 6: Commit**

```bash
git add apps/web/components/itinerary/CalendarView.tsx
git commit -m "feat(web): wire right-click and long-press creation on calendar slots"
```

---

### Task 11: Creation Sheet (Mobile)

**Files:**
- Create: `apps/mobile/components/itinerary/ActivityCreationSheet.tsx`
- Modify: `apps/mobile/app/trip/[id]/itinerary.tsx`

**Step 1: Build creation bottom sheet**

A half-sheet (React Native Modal with `presentationStyle="pageSheet"`) with same fields as web:

```typescript
interface ActivityCreationSheetProps {
  visible: boolean;
  day: number;
  startHour: number;
  parentId?: string;
  onSubmit: (activity: CalendarActivity) => void;
  onClose: () => void;
}
```

Use React Native components:
- `TextInput` for title, description, location
- `Pressable` swatches for category and color selection
- Time picker using simple hour/minute scroll selectors
- Duration as stepper (+/- buttons, 0.5hr increments)
- `Image` picker via `expo-image-picker` (camera + gallery)

**Step 2: Wire long-press on empty calendar slots**

In `MobileCalendarView`, detect long-press (500ms) on empty time slot areas:

```typescript
const handleLongPress = (day: number, hour: number) => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  setCreationSheet({ visible: true, day, hour });
};
```

Use `Pressable` with `onLongPress` and `delayLongPress={500}`.

**Step 3: Wire long-press inside parent blocks**

Same gesture on parent blocks, pre-fills `parentId`.

**Step 4: Verify on device**

Long-press empty slot → haptic feedback → sheet slides up. Fill in details → submit → activity appears.

**Step 5: Commit**

```bash
git add apps/mobile/components/itinerary/ActivityCreationSheet.tsx apps/mobile/app/trip/[id]/itinerary.tsx
git commit -m "feat(mobile): add long-press activity creation with bottom sheet"
```

---

## Phase 6: Presence Indicators

### Task 12: Presence Avatars on Blocks (Web)

**Files:**
- Modify: `apps/web/components/itinerary/CalendarView.tsx` (CalendarCard, ParentBlockCard)

**Step 1: Render lastEditedBy avatar on blocks**

In both CalendarCard and ParentBlockCard, if `activity.lastEditedBy` exists, render a small avatar badge at bottom-right:

```tsx
{activity.lastEditedBy && (
  <div
    title={`Last edited by ${activity.lastEditedBy.name}`}
    style={{
      position: 'absolute', bottom: 4, right: 4,
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: activity.lastEditedBy.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, color: '#fff', fontWeight: 600,
      border: '2px solid white',
    }}
  >
    {activity.lastEditedBy.avatarInitial}
  </div>
)}
```

**Step 2: Track edits locally**

When any activity is updated via `updateActivity()` in ItineraryContext, set `lastEditedBy` to the current user's info:

```typescript
const updateActivity = (id: string, updates: Partial<CalendarActivity>) => {
  setActivities(prev => prev.map(a =>
    a.id === id ? { ...a, ...updates, lastEditedBy: currentUser } : a
  ));
};
```

For now, `currentUser` is hardcoded from `MOCK_COLLABORATORS[0]`. When Supabase auth is wired, this becomes the real user.

**Step 3: Add online status dots in header**

In the calendar header area, render a row of small dots for each collaborator:

```tsx
<div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
  {collaborators.map(c => (
    <div key={c.userId} title={c.name} style={{
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: c.isOnline ? c.color : '#d1d5db',
    }} />
  ))}
</div>
```

**Step 4: Verify**

Edit an activity → avatar badge appears on that block. Header shows colored dots for online collaborators.

**Step 5: Commit**

```bash
git add apps/web/components/itinerary/CalendarView.tsx apps/web/components/itinerary/ItineraryContext.tsx
git commit -m "feat(web): add presence indicators — avatar badges and online dots"
```

---

### Task 13: Presence Avatars on Blocks (Mobile)

**Files:**
- Modify: `apps/mobile/app/trip/[id]/itinerary.tsx`

**Step 1: Render lastEditedBy avatar on mobile blocks**

Same concept as web but using React Native `View` + `Text`:

```tsx
{activity.lastEditedBy && (
  <View style={{
    position: 'absolute', bottom: 4, right: 4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: activity.lastEditedBy.color,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  }}>
    <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>
      {activity.lastEditedBy.avatarInitial}
    </Text>
  </View>
)}
```

**Step 2: Add collaborator dots to DaySelector header**

Add a small row of dots next to the day selector showing who's online.

**Step 3: Verify on device**

Activity blocks show avatar badges. Header shows online status dots.

**Step 4: Commit**

```bash
git add apps/mobile/app/trip/[id]/itinerary.tsx
git commit -m "feat(mobile): add presence indicators — avatar badges and online dots"
```

---

## Phase 7: Mobile Feature Parity

### Task 14: Install Mobile Dependencies

**Files:**
- Modify: `apps/mobile/package.json`

**Step 1: Install required packages**

```bash
cd apps/mobile
npx expo install react-native-gesture-handler @gorhom/bottom-sheet
```

Note: `react-native-reanimated` is already installed (v4.1.1).

**Step 2: Verify GestureHandlerRootView setup**

Wrap the app root (or trip layout) with `<GestureHandlerRootView>` if not already done. Check `apps/mobile/app/_layout.tsx`.

**Step 3: Verify build**

Run: `npx expo start` — confirm no errors.

**Step 4: Commit**

```bash
git add apps/mobile/package.json package-lock.json
git commit -m "feat(mobile): install react-native-gesture-handler and @gorhom/bottom-sheet"
```

---

### Task 15: Mobile Drag-Drop Activities

**Files:**
- Modify: `apps/mobile/app/trip/[id]/itinerary.tsx`

**Context:** Web uses react-dnd for drag-drop. Mobile needs react-native-gesture-handler + reanimated.

**Step 1: Add drag-drop to activity blocks**

Long-press (500ms) on an existing activity → pick it up for drag:

```typescript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Per activity block:
const translateY = useSharedValue(0);
const isDragging = useSharedValue(false);

const longPressGesture = Gesture.LongPress()
  .minDuration(500)
  .onStart(() => {
    isDragging.value = true;
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
  });

const panGesture = Gesture.Pan()
  .activateAfterLongPress(500)
  .onUpdate((e) => { translateY.value = e.translationY; })
  .onEnd(() => {
    // Calculate new time slot from drop position
    isDragging.value = false;
    translateY.value = withSpring(0);
  });

const composedGesture = Gesture.Simultaneous(longPressGesture, panGesture);
```

**Step 2: Add drop zone detection**

Calculate which time slot the activity was dropped on based on `translateY` and the grid layout. Call `updateActivity()` with new `startHour` and `day`.

**Step 3: Gesture disambiguation**

Make sure long-press on existing block = drag, long-press on empty slot = create (Task 11). Use gesture composition to prevent conflicts:

- `Pressable` with `onPress` → select/open detail
- `Pressable` with `onLongPress` on empty → create
- `GestureDetector` with `LongPress + Pan` on block → drag

**Step 4: Verify on device**

Long-press activity → lifts up with haptic. Drag to new time → snaps into place.

**Step 5: Commit**

```bash
git add apps/mobile/app/trip/[id]/itinerary.tsx
git commit -m "feat(mobile): add drag-drop for calendar activities"
```

---

### Task 16: Mobile Discover Panel (Bottom Sheet)

**Files:**
- Create: `apps/mobile/components/itinerary/DiscoverSheet.tsx`
- Modify: `apps/mobile/app/trip/[id]/itinerary.tsx`

**Step 1: Build DiscoverSheet component**

Using `@gorhom/bottom-sheet`:

```typescript
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

export function DiscoverSheet({ onAddActivity }: { onAddActivity: (a: CalendarActivity) => void }) {
  const snapPoints = useMemo(() => ['15%', '50%', '90%'], []);
  // ...
}
```

Content:
- Search bar at top
- Category filter pills (horizontal scroll)
- Activity cards (reuse pattern from existing `BrowseActivityPanel`)
- Each card has "+" button → `onAddActivity` (adds to calendar with next available slot)

**Step 2: Replace BrowseActivityPanel**

Replace the current `BrowseActivityPanel` at the bottom of the itinerary screen with the new `DiscoverSheet`. The sheet peeks at 15% showing a handle + "Discover places" label, expands on drag.

**Step 3: Verify on device**

Swipe up from bottom → discover sheet expands. Search for activities. Tap "+" → activity appears on calendar.

**Step 4: Commit**

```bash
git add apps/mobile/components/itinerary/DiscoverSheet.tsx apps/mobile/app/trip/[id]/itinerary.tsx
git commit -m "feat(mobile): add discover panel as bottom sheet"
```

---

### Task 17: Mobile Sticky Notes (Double-Tap)

**Files:**
- Modify: `apps/mobile/app/trip/[id]/itinerary.tsx`

**Step 1: Add double-tap detection on empty slots**

```typescript
// On empty time slot area:
<Pressable
  onPress={handleSingleTap}       // select slot
  onLongPress={handleLongPress}   // create activity (Task 11)
>
```

For double-tap, track tap timestamps:

```typescript
const lastTap = useRef(0);
const handleSingleTap = (day: number, hour: number) => {
  const now = Date.now();
  if (now - lastTap.current < 300) {
    // Double tap → create note
    handleCreateNote(day, hour);
  }
  lastTap.current = now;
};
```

**Step 2: Create note modal**

Simple modal with:
- Color picker (5 pastel colors matching web's note colors)
- Text input
- Save button → adds `CalendarNote` to state

**Step 3: Render notes on calendar**

Notes appear as small colored sticky squares on the time grid, similar to web.

**Step 4: Verify**

Double-tap empty slot → note creation modal. Enter text → note appears on calendar.

**Step 5: Commit**

```bash
git add apps/mobile/app/trip/[id]/itinerary.tsx
git commit -m "feat(mobile): add sticky notes via double-tap"
```

---

### Task 18: Mobile Day Reordering

**Files:**
- Modify: `apps/mobile/components/itinerary/DaySelector.tsx`

**Step 1: Add drag-to-reorder on day pills**

Long-press a day pill → pick up → drag to reorder:

```typescript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

// Wrap each day pill with GestureDetector
const panGesture = Gesture.Pan()
  .activateAfterLongPress(400)
  .onUpdate((e) => { translateX.value = e.translationX; })
  .onEnd(() => {
    // Calculate new position and call onReorder
  });
```

**Step 2: Add reorder callback**

```typescript
interface DaySelectorProps {
  // ... existing ...
  onReorder?: (fromIndex: number, toIndex: number) => void;
}
```

Wire to itinerary context to swap day data.

**Step 3: Verify**

Long-press day pill → drag left/right → days reorder. Calendar updates.

**Step 4: Commit**

```bash
git add apps/mobile/components/itinerary/DaySelector.tsx apps/mobile/app/trip/[id]/itinerary.tsx
git commit -m "feat(mobile): add day reordering via long-press drag"
```

---

## Phase 8: Duration-Proportional Mobile Blocks

### Task 19: Make Mobile Block Height Proportional to Duration

**Files:**
- Modify: `apps/mobile/app/trip/[id]/itinerary.tsx`

**Context:** Web already uses proportional heights (`duration * HOUR_HEIGHT`). Mobile currently uses fixed-height cards.

**Step 1: Add HOUR_HEIGHT constant and absolute positioning**

In `MobileCalendarView`, switch from flat list rendering to absolute-positioned time grid (matching web):

```typescript
const HOUR_HEIGHT = 56; // slightly taller than web (44px) for touch targets
const START_HOUR = 6;
const END_HOUR = 21;

// Position each activity absolutely:
const top = (activity.startHour - START_HOUR) * HOUR_HEIGHT;
const height = Math.max(HOUR_HEIGHT * 0.5, activity.duration * HOUR_HEIGHT);
```

**Step 2: Add time section dividers**

Render Morning/Afternoon/Evening divider labels at fixed positions:
- Morning: 6 AM
- Afternoon: 12 PM
- Evening: 6 PM

**Step 3: Verify on device**

Activities should be vertically proportional to their duration. A 2-hour activity is twice the height of a 1-hour activity.

**Step 4: Commit**

```bash
git add apps/mobile/app/trip/[id]/itinerary.tsx
git commit -m "feat(mobile): make calendar blocks proportional to duration"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-2 | Shared types + unified category colors |
| 2 | 3-5 | Activity color settings (web + mobile) |
| 3 | 6-7 | Block redesign (web) |
| 4 | 8 | Block redesign (mobile) |
| 5 | 9-11 | Long-press creation (web + mobile) |
| 6 | 12-13 | Presence indicators (web + mobile) |
| 7 | 14-18 | Mobile feature parity (deps, drag-drop, discover, notes, day reorder) |
| 8 | 19 | Duration-proportional mobile blocks |

**Total:** 19 tasks across 8 phases. Phases 1-2 are foundation, 3-4 are visual, 5-8 are interactive features. Each task is independently committable.

**Execution:** Subagent-driven (this session) — fresh subagent per task, spec + quality review between tasks.
