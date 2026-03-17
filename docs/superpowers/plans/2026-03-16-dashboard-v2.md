# Dashboard Iteration v2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add background images to event blocks, redesign the header to Google Docs style with collaborators/share, replace all icons with iconoir-react, add click-to-create activities, and wire sidebar nav to placeholder pages.

**Architecture:** Modify existing calendar components in-place. No new files except the dependency install. Key changes touch EventBlock (images), CalendarHeader (redesign), DayColumn (click-to-create), DetailPanel (editable title), TripSidebar (iconoir icons), and CalendarDashboard (orchestration).

**Tech Stack:** Next.js 16, React 19, Tailwind v4, iconoir-react, @dnd-kit/core, motion/react

**Spec:** `docs/superpowers/specs/2026-03-16-dashboard-iteration-v2-design.md`

---

## Chunk 1: Dependencies, Mock Data, and Icons

### Task 1: Install iconoir-react

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install iconoir-react**

```bash
npm install -w @travyl/web iconoir-react
```

- [ ] **Step 2: Verify installation**

```bash
cd apps/web && node -e "require('iconoir-react'); console.log('OK')"
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json package-lock.json
git commit -m "chore: add iconoir-react dependency"
```

---

### Task 2: Add image URLs to mock calendar activities

**Files:**
- Modify: `packages/shared/src/config/mockItineraryData.ts`

- [ ] **Step 1: Update MOCK_CALENDAR_ACTIVITIES with image fields**

Add `image` field to activities that should show background images. Leave some without images to test the solid-color fallback. Update the array (around line 1121) to:

```typescript
export const MOCK_CALENDAR_ACTIVITIES: CalendarActivity[] = [
  { id: 'cal-1', title: 'Eiffel Tower', type: 'sightseeing', day: 0, startHour: 9, duration: 2, location: 'Champ de Mars', rating: 4.7, price: '$26.10', image: 'https://images.unsplash.com/photo-1543349689-9a4d426bee8e?w=400&h=300&fit=crop' },
  { id: 'cal-2', title: 'Lunch: Le Marais', type: 'dining', day: 0, startHour: 12, duration: 1.5, location: 'Le Marais District' },
  { id: 'cal-3', title: 'Louvre Museum', type: 'museum', day: 0, startHour: 15, duration: 3, location: 'Rue de Rivoli', rating: 4.8, price: '$17.00', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=300&fit=crop' },
  { id: 'cal-4', title: 'Montmartre Walk', type: 'outdoor', day: 1, startHour: 9.5, duration: 2, location: 'Montmartre', image: 'https://images.unsplash.com/photo-1550340499-a6c60fc8287c?w=400&h=300&fit=crop' },
  { id: 'cal-5', title: 'Cooking Class', type: 'cultural', day: 1, startHour: 14, duration: 3, location: 'Le Foodist', price: '$85.00', image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=300&fit=crop' },
  { id: 'cal-6', title: 'Dinner: Le Comptoir', type: 'dining', day: 1, startHour: 19.5, duration: 2, location: 'Saint-Germain' },
  { id: 'cal-7', title: 'Versailles Day Trip', type: 'tour', day: 2, startHour: 8, duration: 5, location: 'Palace of Versailles', price: '$20.00', image: 'https://images.unsplash.com/photo-1590099033615-be195f8d575c?w=400&h=300&fit=crop' },
  { id: 'cal-8', title: 'Seine River Cruise', type: 'sightseeing', day: 2, startHour: 18, duration: 1.5, location: 'Pont Neuf', price: '$15.00', image: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&h=300&fit=crop' },
  { id: 'cal-9', title: "Musée d'Orsay", type: 'museum', day: 3, startHour: 10, duration: 2.5, location: "1 Rue de la Légion d'Honneur", rating: 4.7, price: '$16.00', image: 'https://images.unsplash.com/photo-1591289009723-aef0a1a8a211?w=400&h=300&fit=crop' },
  { id: 'cal-10', title: 'Luxembourg Gardens', type: 'outdoor', day: 3, startHour: 14, duration: 1.5, location: '6th Arrondissement' },
  { id: 'cal-11', title: 'Shopping: Le Bon Marché', type: 'shopping', day: 4, startHour: 10, duration: 2, location: '24 Rue de Sèvres' },
  { id: 'cal-12', title: 'Farewell Dinner', type: 'dining', day: 4, startHour: 19, duration: 2.5, location: 'Le Jules Verne', price: '$150.00', image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop' },
]
```

Activities WITHOUT images (solid color fallback): cal-2 (Lunch), cal-6 (Dinner), cal-10 (Gardens), cal-11 (Shopping).

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/config/mockItineraryData.ts
git commit -m "feat: add image URLs to mock calendar activities"
```

---

### Task 3: Replace TripSidebar emoji icons with iconoir-react

**Files:**
- Modify: `apps/web/components/calendar/TripSidebar.tsx`

- [ ] **Step 1: Read TripSidebar.tsx to understand current NAV_ITEMS structure**

The current NAV_ITEMS array (around lines 19-82) uses inline SVGs for icons. Replace them with iconoir-react components.

- [ ] **Step 2: Update imports and NAV_ITEMS**

Add iconoir-react imports at the top:

```typescript
import { Map, Calendar, PageEdit, Wallet, Settings } from 'iconoir-react'
```

Replace the NAV_ITEMS array. Each item's `icon` field should be a React element:

```typescript
const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <Map width={18} height={18} strokeWidth={1.5} /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar width={18} height={18} strokeWidth={1.5} /> },
  { id: 'info', label: 'Info', icon: <PageEdit width={18} height={18} strokeWidth={1.5} /> },
  { id: 'budget', label: 'Budget', icon: <Wallet width={18} height={18} strokeWidth={1.5} /> },
  { id: 'settings', label: 'Settings', icon: <Settings width={18} height={18} strokeWidth={1.5} /> },
]
```

Update the `NavItem` interface if the `icon` field type needs to change from `ReactNode` to match.

- [ ] **Step 3: Remove CollaboratorAvatars from sidebar**

Remove the `CollaboratorAvatars` import and its usage at the bottom of the sidebar. The collaborators section (the divider + `<CollaboratorAvatars>` at the bottom) should be deleted. The sidebar should end after the MiniCalendar and spacer.

Also remove `collaborators` from `TripSidebarProps` since it's no longer needed (avatars moved to header). Check if `activities` is used anywhere else in TripSidebar — if only CollaboratorAvatars used it, remove it too. The `onNavChange` prop already exists on `TripSidebarProps` as optional — it just needs to be wired from CalendarDashboard.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/TripSidebar.tsx
git commit -m "feat: replace sidebar icons with iconoir-react, remove collaborator section"
```

---

### Task 4: Replace DetailPanel emoji icons with iconoir-react

**Files:**
- Modify: `apps/web/components/calendar/DetailPanel.tsx`

- [ ] **Step 1: Read DetailPanel.tsx to find the emoji icon locations**

The detail rows use emoji strings for icons: 🕐 (time), 📍 (location), 💰 (price), ⭐ (rating). The close button uses "✕".

- [ ] **Step 2: Update imports and replace icons**

Add iconoir-react imports:

```typescript
import { Clock, MapPin, Wallet, Star, Xmark } from 'iconoir-react'
```

Replace emoji strings in the detail rows with iconoir components:
- `🕐` → `<Clock width={16} height={16} strokeWidth={1.5} />`
- `📍` → `<MapPin width={16} height={16} strokeWidth={1.5} />`
- `💰` → `<Wallet width={16} height={16} strokeWidth={1.5} />`
- `⭐` → `<Star width={16} height={16} strokeWidth={1.5} fill="currentColor" />`
- Close button `✕` → `<Xmark width={16} height={16} strokeWidth={1.5} />`

The `DetailRow` helper component's `icon` prop type changes from `string` to `React.ReactNode`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/DetailPanel.tsx
git commit -m "feat: replace DetailPanel emoji icons with iconoir-react"
```

---

## Chunk 2: EventBlock Background Images

### Task 5: Redesign EventBlock with background images

**Files:**
- Modify: `apps/web/components/calendar/EventBlock.tsx`

- [ ] **Step 1: Read EventBlock.tsx to understand current structure**

Current layout: solid background color, text at top (title, time, location), viewer avatars at bottom.

- [ ] **Step 2: Rewrite EventBlock with image support**

The component should render two layouts:
- **Image layout** (when `activity.image` exists AND `activity.duration >= 1`): background image with colored overlay + bottom-left text
- **Solid layout** (fallback): current solid color behavior

```tsx
// Determine which layout to use
const hasImage = activity.image && activity.duration >= 1
const color = getActivityColor(activity.type)

// Style for the outer container (both layouts share positioning)
const containerStyle: React.CSSProperties = {
  position: 'absolute',
  top: (activity.startHour - timeRangeStartHour) * HOUR_HEIGHT,
  height: Math.max(activity.duration * HOUR_HEIGHT - 2, 20),
  left: 4,
  right: 4,
  transform: CSS.Translate.toString(transform),
  opacity: isDragging ? 0.5 : 1,
  zIndex: isDragging ? 50 : isSelected ? 10 : 1,
  borderLeft: `3px solid ${color}88`,
}

// For image layout, DON'T set backgroundColor on container
// For solid layout, set backgroundColor
if (!hasImage) {
  containerStyle.backgroundColor = color
}
```

Image layout inner content:

```tsx
{hasImage ? (
  <>
    {/* Background image */}
    <div
      className="absolute inset-0 bg-cover bg-center rounded-md"
      style={{ backgroundImage: `url(${activity.image})` }}
    />
    {/* Colored overlay — light, ~20-30% opacity */}
    <div
      className="absolute inset-0 rounded-md"
      style={{ background: `linear-gradient(135deg, ${color}4d, ${color}33)` }}
    />
    {/* Bottom gradient + text */}
    <div className="absolute bottom-0 left-0 right-0 px-2 pb-1.5 pt-6"
         style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
      <div className="font-semibold truncate text-white text-shadow-sm">{activity.title}</div>
      <div className="text-[10px] text-white/85 truncate text-shadow-sm">{formatTimeRange(activity)}</div>
      {activity.location && (
        <div className="text-[9px] text-white/70 truncate text-shadow-sm">{activity.location}</div>
      )}
    </div>
  </>
) : (
  // Solid layout (existing behavior, text at top)
  <div className="px-2 py-1 flex flex-col gap-0.5">
    <span className="font-semibold truncate leading-tight text-white">{activity.title}</span>
    <span className="opacity-80 truncate text-white">{formatTimeRange(activity)}</span>
    {activity.location && (
      <span className="opacity-70 truncate text-[10px] text-white">{activity.location}</span>
    )}
  </div>
)}
```

Add hover effect: `hover:shadow-lg hover:-translate-y-px transition-all duration-150`

Keep the viewer avatars rendering (absolute top-right) for both layouts.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/EventBlock.tsx
git commit -m "feat: add background images to EventBlock with bottom-left text"
```

---

## Chunk 3: CalendarHeader Redesign

### Task 6: Redesign CalendarHeader to Google Docs style

**Files:**
- Modify: `apps/web/components/calendar/CalendarHeader.tsx`

- [ ] **Step 1: Read CalendarHeader.tsx to understand current structure**

Current: back button, trip name/date, spacer, view toggle, add button. No collaborators or share.

- [ ] **Step 2: Update CalendarHeaderProps interface**

Add new props:

```typescript
interface CalendarHeaderProps {
  tripName: string
  dateRange: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onBack: () => void
  onAddEvent: () => void
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
  collaborators: UserAwareness[]  // NEW
  onShare: () => void             // NEW
}
```

- [ ] **Step 3: Rewrite the header layout**

Add iconoir imports:

```typescript
import { NavArrowLeft, Plus, ShareAndroid, MoreHoriz } from 'iconoir-react'
```

Layout structure:

```
[NavArrowLeft]  TripName  |  [Week][Day]  [Plus New Activity]  ...spacer...  [avatars]  [Share]  [MoreHoriz]
                DateRange
```

Key sections:
- **Back button**: `<NavArrowLeft>` icon in a hover button
- **Trip info**: trip name + date range stacked
- **Divider**: 1px vertical line
- **View toggle**: segmented buttons (same as before, compact)
- **New Activity**: **outlined** button (border, no fill — `border border-white/10 text-gray-400`, NOT solid blue) with `<Plus>` icon + "New Activity" text
- **Spacer**: flex-1
- **Collaborator avatars**: overlapping initial-based circles rendered inline (NOT using CollaboratorAvatars component). Each avatar uses `viewer.avatarInitial` for the letter and `viewer.color` for the background. Online users get a green dot (`bg-green-500`), offline get gray dot + 45% opacity on the avatar circle.
- **Share button**: primary blue with `<ShareAndroid>` icon + "Share" text
- **More menu**: `<MoreHoriz>` icon button (no dropdown yet)

Keep the connection status banner at the top (yellow warning bar).

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/CalendarHeader.tsx
git commit -m "feat: redesign CalendarHeader to Google Docs style with collaborators"
```

---

## Chunk 4: Click-to-Create and Wiring

### Task 7: Add addActivity to useYjsSync

**Files:**
- Modify: `apps/web/components/calendar/hooks/useYjsSync.ts`

- [ ] **Step 1: Read useYjsSync.ts**

- [ ] **Step 2: Add addActivity to the hook**

Add to the return interface and implement:

```typescript
const addActivity = useCallback((activity: CalendarActivity) => {
  setActivities((prev) => [...prev, activity])
}, [])
```

Add to the return object:

```typescript
return {
  // ... existing
  addActivity,
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/hooks/useYjsSync.ts
git commit -m "feat: add addActivity method to useYjsSync"
```

---

### Task 8: Add click-to-create to DayColumn

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx`

- [ ] **Step 1: Read DayColumn.tsx**

- [ ] **Step 2: Add onCreateActivity prop and click handler**

Add to `DayColumnProps`:

```typescript
onCreateActivity?: (dayIndex: number, startHour: number) => void
```

Add click-vs-drag disambiguation using mousedown/mouseup tracking:

```typescript
const mouseDownPos = useRef<{ x: number; y: number } | null>(null)

const handleMouseDown = (e: React.MouseEvent) => {
  mouseDownPos.current = { x: e.clientX, y: e.clientY }
}

const handleMouseUp = (e: React.MouseEvent) => {
  if (!mouseDownPos.current || !onCreateActivity) return
  const dx = Math.abs(e.clientX - mouseDownPos.current.x)
  const dy = Math.abs(e.clientY - mouseDownPos.current.y)
  mouseDownPos.current = null

  // Only create if movement was < 5px (not a drag)
  if (dx < 5 && dy < 5) {
    const rect = e.currentTarget.getBoundingClientRect()
    const offsetY = e.clientY - rect.top
    const rawHour = timeRange.startHour + offsetY / HOUR_HEIGHT
    // Snap to nearest 30 minutes
    const snappedHour = Math.round(rawHour * 2) / 2
    onCreateActivity(dayIndex, snappedHour)
  }
}
```

Add `onMouseDown={handleMouseDown}` and `onMouseUp={handleMouseUp}` to the column body div (the droppable area).

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx
git commit -m "feat: add click-to-create activity on DayColumn"
```

---

### Task 9: Thread onCreateActivity through WeekView and DayView

**Files:**
- Modify: `apps/web/components/calendar/WeekView.tsx`
- Modify: `apps/web/components/calendar/DayView.tsx`

- [ ] **Step 1: Add prop to WeekViewProps**

```typescript
onCreateActivity?: (dayIndex: number, startHour: number) => void
```

Pass it through to each `<DayColumn>`.

- [ ] **Step 2: Add prop to DayViewProps**

Same prop, pass through to the single `<DayColumn>`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/WeekView.tsx apps/web/components/calendar/DayView.tsx
git commit -m "feat: thread onCreateActivity through WeekView and DayView"
```

---

### Task 10: Add editable title to DetailPanel

**Files:**
- Modify: `apps/web/components/calendar/DetailPanel.tsx`

- [ ] **Step 1: Read current title rendering in DetailPanel**

Currently renders `<h2 className="...">activity.title</h2>`.

- [ ] **Step 2: Add onUpdateActivity prop and editable title**

Add to `DetailPanelProps`:

```typescript
onUpdateActivity?: (id: string, updates: Partial<CalendarActivity>) => void
```

Replace the static `<h2>` title with an editable version:

```tsx
const [isEditingTitle, setIsEditingTitle] = useState(false)
const [titleDraft, setTitleDraft] = useState('')

// Auto-edit when activity has empty title (just created)
useEffect(() => {
  if (activity && !activity.title) {
    setIsEditingTitle(true)
    setTitleDraft('')
  } else if (activity) {
    setIsEditingTitle(false)
    setTitleDraft(activity.title)
  }
}, [activity?.id])

const commitTitle = () => {
  if (activity && onUpdateActivity && titleDraft !== activity.title) {
    onUpdateActivity(activity.id, { title: titleDraft })
  }
  setIsEditingTitle(false)
}
```

Render:

```tsx
{isEditingTitle ? (
  <input
    autoFocus
    value={titleDraft}
    onChange={(e) => setTitleDraft(e.target.value)}
    onBlur={commitTitle}
    onKeyDown={(e) => { if (e.key === 'Enter') commitTitle() }}
    className="text-lg font-bold text-gray-100 bg-transparent border-b border-white/20 outline-none w-full"
    placeholder="Activity name..."
  />
) : (
  <h2
    className="text-lg font-bold text-gray-100 cursor-pointer hover:text-white"
    onClick={() => { setIsEditingTitle(true); setTitleDraft(activity.title) }}
  >
    {activity.title || 'Untitled Activity'}
  </h2>
)}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/DetailPanel.tsx
git commit -m "feat: add editable title to DetailPanel for new activities"
```

---

### Task 11: Wire everything in CalendarDashboard

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Read CalendarDashboard.tsx**

- [ ] **Step 2: Add activeNav state, wire sidebar nav, and destructure new hook methods**

```typescript
const [activeNav, setActiveNav] = useState('calendar')

// Update useYjsSync destructuring to include addActivity and updateActivity:
const {
  activities,
  collaborators,
  connectionStatus,
  isLoading,
  error,
  moveActivity,
  removeActivity,
  addActivity,       // NEW — for click-to-create
  updateActivity,    // NEW — for editable title in DetailPanel
} = useYjsSync()
```

Update TripSidebar props — pass `onNavChange={setActiveNav}`. Remove `collaborators` and `activities` props from TripSidebar call (they were removed in Task 3).

- [ ] **Step 3: Add handleCreateActivity and wire to views**

```typescript
const { addActivity, updateActivity, ... } = useYjsSync()

const handleCreateActivity = useCallback((dayIndex: number, startHour: number) => {
  const newActivity: CalendarActivity = {
    id: crypto.randomUUID(),
    title: '',
    type: 'sightseeing',
    day: dayIndex,
    startHour,
    duration: 1,
  }
  addActivity(newActivity)
  selectEvent(newActivity.id)
}, [addActivity, selectEvent])
```

Pass `onCreateActivity={handleCreateActivity}` to both `<WeekView>` and `<DayView>`.

- [ ] **Step 4: Update CalendarHeader props**

Pass collaborators and share handler to CalendarHeader:

```typescript
<CalendarHeader
  // ... existing props
  collaborators={collaborators}
  onShare={() => {}} // no-op for now
/>
```

- [ ] **Step 5: Pass onUpdateActivity to DetailPanel**

```typescript
<DetailPanel
  activity={selectedActivity}
  viewers={collaborators}
  onClose={handleCloseDetail}
  onRemove={handleRemoveActivity}
  onUpdateActivity={updateActivity}  // NEW
/>
```

- [ ] **Step 6: Add conditional rendering for placeholder pages**

Wrap the calendar grid area:

```tsx
{activeNav === 'calendar' ? (
  // ... existing grid content (AllDayRow + DndContext + views + DetailPanel)
) : (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <p className="text-gray-400 text-sm capitalize">{activeNav} — coming soon</p>
    </div>
  </div>
)}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire activeNav, click-to-create, collaborators in header, placeholder pages"
```

---

## Chunk 5: Cleanup and Verification

### Task 12: Remove CollaboratorAvatars component

**Files:**
- Delete: `apps/web/components/calendar/CollaboratorAvatars.tsx`

- [ ] **Step 1: Delete the file**

```bash
rm apps/web/components/calendar/CollaboratorAvatars.tsx
```

- [ ] **Step 2: Search for any remaining imports**

```bash
grep -r "CollaboratorAvatars" apps/web/ --include="*.tsx" --include="*.ts"
```

Remove any stale imports found.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove unused CollaboratorAvatars component"
```

---

### Task 13: Type-check and build verification

- [ ] **Step 1: Run type-check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -30
```

Fix any type errors found.

- [ ] **Step 2: Run tests**

```bash
cd packages/shared && npx vitest run
```

Verify existing tests still pass.

- [ ] **Step 3: Run build**

```bash
cd apps/web && npx next build --no-lint 2>&1 | tail -10
```

Fix any build errors.

- [ ] **Step 4: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve type and build issues"
```

---

### Task 14: Manual verification

- [ ] **Step 1: Start dev server**

```bash
npm run web
```

- [ ] **Step 2: Verify in browser at http://localhost:3000/trip/test-trip-1**

Check:
- Event blocks with images show background image, light overlay, text at bottom-left
- Event blocks without images show solid color (Lunch, Dinner, Gardens, Shopping)
- Header shows: back, trip name, divider, Week/Day toggle, New Activity, spacer, avatars, Share, more
- Collaborator avatars in header with online/offline dots
- Sidebar uses iconoir icons (no emojis)
- Detail panel uses iconoir icons
- Click an empty grid area → new activity created → detail panel opens with editable title
- Sidebar nav: click Overview/Info/Budget/Settings → "coming soon" placeholder
- Click Calendar nav → calendar grid returns
