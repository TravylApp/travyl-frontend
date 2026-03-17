# Collaborator Awareness UI — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface collaborator presence data (who is on which day, in which view) in three new places: avatar tooltip in CalendarHeader, day column headers in WeekView, and day view header — with one new field (`selectedDayIndex`) added to the broadcast payload.

**Architecture:** Add `selectedDayIndex` to the `UserAwareness` type and the Supabase Realtime presence broadcast in `useCollaboratorPresence`. Wire `CalendarDashboard` to broadcast the local user's current day. Render the data in `CalendarHeader` (tooltip) and `DayColumn` (tiny avatar stack in day header). No schema changes, no new props on `WeekView` or `DayView`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Supabase Realtime presence (`@supabase/supabase-js` 2.95), `useRef`/`useCallback`/`useEffect` from React.

---

## File Map

| File | Change |
|---|---|
| `packages/shared/src/types/index.ts` | Add `selectedDayIndex?: number` to `UserAwareness` (line 354) |
| `apps/web/components/calendar/hooks/useCollaboratorPresence.ts` | Extend `localStateRef`, add `setSelectedDay`, update all `track()` calls, update `presenceState` cast and `users.push()` |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Destructure `setSelectedDay`, add `useEffect` watching `selectedDayIndex`, pass `tripDays` to `<CalendarHeader>` |
| `apps/web/components/calendar/CalendarHeader.tsx` | Add `tripDays` prop, replace `title` attr with hover tooltip popover |
| `apps/web/components/calendar/DayColumn.tsx` | Filter `viewers` by `dayIndex`, render avatar stack in day header |

No changes to `WeekView`, `DayView`, `EventBlock`, `useYjsSync`, or any Supabase schema.

---

## Task 1: Add `selectedDayIndex` to `UserAwareness`

**Files:**
- Modify: `packages/shared/src/types/index.ts:354-365`

This is the type-layer foundation. Everything downstream depends on this field existing.

- [ ] **Step 1.1: Open the file and locate `UserAwareness`**

  Find the interface at line 354. Current state:
  ```ts
  export interface UserAwareness {
    userId: string;
    name: string;
    avatarInitial: string;
    color: string;
    isOnline: boolean;
    selectedEventId: string | null;
    currentView: ViewMode;
    /** Legacy itinerary view — selected block id */
    selectedBlockId?: string;
    cursor?: { day: number; hour: number };
  }
  ```

- [ ] **Step 1.2: Add `selectedDayIndex` to the interface**

  Insert `selectedDayIndex?: number;` after `currentView`:
  ```ts
  export interface UserAwareness {
    userId: string;
    name: string;
    avatarInitial: string;
    color: string;
    isOnline: boolean;
    selectedEventId: string | null;
    currentView: ViewMode;
    selectedDayIndex?: number;
    /** Legacy itinerary view — selected block id */
    selectedBlockId?: string;
    cursor?: { day: number; hour: number };
  }
  ```

  > Note: `apps/web/components/calendar/types.ts` re-exports `UserAwareness` from `@travyl/shared` verbatim — no second edit needed there.

- [ ] **Step 1.3: Typecheck**

  ```bash
  cd C:/Users/justi/dev/travyl-frontend && npm run typecheck
  ```

  Expected: no new errors (the field is optional, so existing consumers are unaffected).

- [ ] **Step 1.4: Commit**

  ```bash
  git add packages/shared/src/types/index.ts
  git commit -m "feat(types): add selectedDayIndex to UserAwareness"
  ```

---

## Task 2: Update `useCollaboratorPresence` to broadcast `selectedDayIndex`

**Files:**
- Modify: `apps/web/components/calendar/hooks/useCollaboratorPresence.ts`

Five changes in this file: `localStateRef`, `presenceState` inline cast, `users.push()`, all three `track()` call sites, and the return type + `setSelectedDay` implementation.

- [ ] **Step 2.1: Extend `localStateRef` to include `selectedDayIndex`**

  Current (lines 49-52):
  ```ts
  const localStateRef = useRef({
    selectedEventId: null as string | null,
    currentView: 'week' as ViewMode,
  })
  ```

  New:
  ```ts
  const localStateRef = useRef({
    selectedEventId: null as string | null,
    currentView: 'week' as ViewMode,
    selectedDayIndex: 0,
  })
  ```

- [ ] **Step 2.2: Update `UseCollaboratorPresenceReturn` to include `setSelectedDay`**

  Current (lines 20-26):
  ```ts
  interface UseCollaboratorPresenceReturn {
    collaborators: UserAwareness[]
    /** Broadcast the locally selected event to all collaborators. */
    setSelectedEvent: (eventId: string | null) => void
    /** Broadcast the current view mode to all collaborators. */
    setCurrentView: (view: ViewMode) => void
  }
  ```

  New:
  ```ts
  interface UseCollaboratorPresenceReturn {
    collaborators: UserAwareness[]
    /** Broadcast the locally selected event to all collaborators. */
    setSelectedEvent: (eventId: string | null) => void
    /** Broadcast the current view mode to all collaborators. */
    setCurrentView: (view: ViewMode) => void
    /** Broadcast the currently focused day index to all collaborators. */
    setSelectedDay: (dayIndex: number) => void
  }
  ```

- [ ] **Step 2.3: Update the initial `track()` call in the subscribe callback**

  Current (lines 95-101):
  ```ts
  await channel.track({
    userId,
    userName,
    color,
    selectedEventId: localStateRef.current.selectedEventId,
    currentView: localStateRef.current.currentView,
  })
  ```

  New:
  ```ts
  await channel.track({
    userId,
    userName,
    color,
    selectedEventId: localStateRef.current.selectedEventId,
    currentView: localStateRef.current.currentView,
    selectedDayIndex: localStateRef.current.selectedDayIndex,
  })
  ```

- [ ] **Step 2.4: Update the `presenceState` inline type cast**

  Current (lines 64-70):
  ```ts
  const state = channel.presenceState<{
    userId: string
    userName: string
    color: string
    selectedEventId: string | null
    currentView: ViewMode
  }>()
  ```

  New:
  ```ts
  const state = channel.presenceState<{
    userId: string
    userName: string
    color: string
    selectedEventId: string | null
    currentView: ViewMode
    selectedDayIndex?: number
  }>()
  ```

- [ ] **Step 2.5: Update `users.push()` to forward `selectedDayIndex`**

  Current (lines 80-88):
  ```ts
  users.push({
    userId: entry.userId,
    name: entry.userName,
    avatarInitial: (entry.userName ?? '?').charAt(0).toUpperCase(),
    color: entry.color,
    isOnline: true,
    selectedEventId: entry.selectedEventId ?? null,
    currentView: entry.currentView ?? 'week',
  })
  ```

  New:
  ```ts
  users.push({
    userId: entry.userId,
    name: entry.userName,
    avatarInitial: (entry.userName ?? '?').charAt(0).toUpperCase(),
    color: entry.color,
    isOnline: true,
    selectedEventId: entry.selectedEventId ?? null,
    currentView: entry.currentView ?? 'week',
    selectedDayIndex: entry.selectedDayIndex ?? 0,
  })
  ```

- [ ] **Step 2.6: Update `setSelectedEvent` callback to include `selectedDayIndex`**

  Current (lines 111-123):
  ```ts
  const setSelectedEvent = useCallback(
    (eventId: string | null) => {
      localStateRef.current.selectedEventId = eventId
      channelRef.current?.track({
        userId,
        userName,
        color,
        selectedEventId: eventId,
        currentView: localStateRef.current.currentView,
      })
    },
    [userId, userName, color],
  )
  ```

  New:
  ```ts
  const setSelectedEvent = useCallback(
    (eventId: string | null) => {
      localStateRef.current.selectedEventId = eventId
      channelRef.current?.track({
        userId,
        userName,
        color,
        selectedEventId: eventId,
        currentView: localStateRef.current.currentView,
        selectedDayIndex: localStateRef.current.selectedDayIndex,
      })
    },
    [userId, userName, color],
  )
  ```

- [ ] **Step 2.7: Update `setCurrentView` callback to include `selectedDayIndex`**

  Current (lines 125-137):
  ```ts
  const setCurrentView = useCallback(
    (view: ViewMode) => {
      localStateRef.current.currentView = view
      channelRef.current?.track({
        userId,
        userName,
        color,
        selectedEventId: localStateRef.current.selectedEventId,
        currentView: view,
      })
    },
    [userId, userName, color],
  )
  ```

  New:
  ```ts
  const setCurrentView = useCallback(
    (view: ViewMode) => {
      localStateRef.current.currentView = view
      channelRef.current?.track({
        userId,
        userName,
        color,
        selectedEventId: localStateRef.current.selectedEventId,
        currentView: view,
        selectedDayIndex: localStateRef.current.selectedDayIndex,
      })
    },
    [userId, userName, color],
  )
  ```

- [ ] **Step 2.8: Add `setSelectedDay` callback and return it**

  After `setCurrentView`, add:
  ```ts
  const setSelectedDay = useCallback(
    (dayIndex: number) => {
      localStateRef.current.selectedDayIndex = dayIndex
      channelRef.current?.track({
        userId,
        userName,
        color,
        selectedEventId: localStateRef.current.selectedEventId,
        currentView: localStateRef.current.currentView,
        selectedDayIndex: dayIndex,
      })
    },
    [userId, userName, color],
  )
  ```

  Update the return at line 139:
  ```ts
  return { collaborators, setSelectedEvent, setCurrentView, setSelectedDay }
  ```

- [ ] **Step 2.9: Typecheck**

  ```bash
  cd C:/Users/justi/dev/travyl-frontend && npm run typecheck
  ```

  Expected: no errors.

- [ ] **Step 2.10: Commit**

  ```bash
  git add apps/web/components/calendar/hooks/useCollaboratorPresence.ts
  git commit -m "feat(presence): broadcast selectedDayIndex in presence payload"
  ```

---

## Task 3: Wire `CalendarDashboard` to broadcast day and pass `tripDays` to header

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

Two wiring changes: destructure `setSelectedDay` and add the broadcast `useEffect`, then pass `tripDays` to `<CalendarHeader>`.

- [ ] **Step 3.1: Add `setSelectedDay` to the `useCollaboratorPresence` destructure**

  Current (line 47):
  ```ts
  const { collaborators, setSelectedEvent: setPresenceSelectedEvent, setCurrentView } = useCollaboratorPresence({ tripId, userId, userName })
  ```

  New:
  ```ts
  const { collaborators, setSelectedEvent: setPresenceSelectedEvent, setCurrentView, setSelectedDay } = useCollaboratorPresence({ tripId, userId, userName })
  ```

- [ ] **Step 3.2: Add `useEffect` to broadcast `selectedDayIndex`**

  After the existing view-mode effect (currently lines 68-71):
  ```ts
  // Sync view mode to presence
  useEffect(() => {
    setCurrentView(viewMode)
  }, [viewMode, setCurrentView])
  ```

  Add immediately after:
  ```ts
  // Sync selected day to presence
  useEffect(() => {
    setSelectedDay(selectedDayIndex)
  }, [selectedDayIndex, setSelectedDay])
  ```

- [ ] **Step 3.3: Pass `tripDays` to `<CalendarHeader>`**

  Find the `<CalendarHeader>` render (lines 247-259). Current:
  ```tsx
  <CalendarHeader
    tripName={trip?.title ?? 'Loading...'}
    dateRange={viewMode === 'day' ? currentDayLabel : dateRange}
    viewMode={viewMode}
    onViewModeChange={handleViewModeChange}
    onBack={handleBack}
    onAddEvent={handleAddEvent}
    connectionStatus={connectionStatus}
    collaborators={collaborators}
    onShare={() => {}}
    theme={theme}
    onToggleTheme={toggleTheme}
  />
  ```

  New (add `tripDays={TRIP_DAYS}` before the closing `/>` ):
  ```tsx
  <CalendarHeader
    tripName={trip?.title ?? 'Loading...'}
    dateRange={viewMode === 'day' ? currentDayLabel : dateRange}
    viewMode={viewMode}
    onViewModeChange={handleViewModeChange}
    onBack={handleBack}
    onAddEvent={handleAddEvent}
    connectionStatus={connectionStatus}
    collaborators={collaborators}
    onShare={() => {}}
    theme={theme}
    onToggleTheme={toggleTheme}
    tripDays={TRIP_DAYS}
  />
  ```

  > Do NOT typecheck or commit yet — `CalendarHeaderProps` doesn't have `tripDays` until Task 4. Commit both files together after Task 4's clean typecheck (Step 4.6).

---

## Task 4: Add hover tooltip to `CalendarHeader` collaborator avatars

**Files:**
- Modify: `apps/web/components/calendar/CalendarHeader.tsx`

Add `tripDays` prop and replace the `title` attribute on each avatar with a CSS hover tooltip showing the collaborator's name, view mode, and current day.

- [ ] **Step 4.1: Add `tripDays` to `CalendarHeaderProps`**

  Current (lines 7-19):
  ```ts
  interface CalendarHeaderProps {
    tripName: string
    dateRange: string
    viewMode: ViewMode
    onViewModeChange: (mode: ViewMode) => void
    onBack: () => void
    onAddEvent: () => void
    connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
    collaborators: UserAwareness[]
    onShare: () => void
    theme: CalendarTheme
    onToggleTheme: () => void
  }
  ```

  New:
  ```ts
  interface CalendarHeaderProps {
    tripName: string
    dateRange: string
    viewMode: ViewMode
    onViewModeChange: (mode: ViewMode) => void
    onBack: () => void
    onAddEvent: () => void
    connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
    collaborators: UserAwareness[]
    onShare: () => void
    theme: CalendarTheme
    onToggleTheme: () => void
    tripDays: { dayIndex: number; label: string }[]
  }
  ```

- [ ] **Step 4.2: Add `tripDays` to the destructured props in the function signature**

  Current (lines 21-33):
  ```ts
  export function CalendarHeader({
    tripName,
    dateRange,
    viewMode,
    onViewModeChange,
    onBack,
    onAddEvent,
    connectionStatus,
    collaborators,
    onShare,
    theme,
    onToggleTheme,
  }: CalendarHeaderProps) {
  ```

  New:
  ```ts
  export function CalendarHeader({
    tripName,
    dateRange,
    viewMode,
    onViewModeChange,
    onBack,
    onAddEvent,
    connectionStatus,
    collaborators,
    onShare,
    theme,
    onToggleTheme,
    tripDays,
  }: CalendarHeaderProps) {
  ```

- [ ] **Step 4.3: Replace the collaborator avatars section with tooltip-enabled avatars**

  Find the collaborator avatars block (lines 106-132):
  ```tsx
  {/* Collaborator avatars — inline, overlapping */}
  {collaborators.length > 0 && (
    <div className="flex items-center shrink-0" style={{ marginRight: '4px' }}>
      {collaborators.map((user, index) => (
        <div
          key={user.userId}
          title={user.name}
          className="relative flex items-center justify-center h-7 w-7 rounded-full text-[11px] font-semibold text-white select-none ring-2 ring-white dark:ring-[#0a1520]"
          style={{
            backgroundColor: user.color,
            opacity: user.isOnline ? 1 : 0.45,
            marginLeft: index === 0 ? 0 : '-8px',
            zIndex: collaborators.length - index,
          }}
        >
          {user.avatarInitial}
          {/* Online/offline dot */}
          <span
            className={[
              'absolute bottom-0 right-0 h-2 w-2 rounded-full ring-1 ring-white dark:ring-[#0a1520]',
              user.isOnline ? 'bg-green-500' : 'bg-gray-500',
            ].join(' ')}
          />
        </div>
      ))}
    </div>
  )}
  ```

  Replace with:
  ```tsx
  {/* Collaborator avatars — inline, overlapping, with hover tooltip */}
  {collaborators.length > 0 && (
    <div className="flex items-center shrink-0" style={{ marginRight: '4px' }}>
      {collaborators.map((user, index) => {
        const dayLabel = tripDays.find(
          (d) => d.dayIndex === (user.selectedDayIndex ?? 0),
        )?.label ?? ''
        const viewLabel =
          user.currentView === 'day' ? 'Day view' : 'Week view'
        return (
          <div
            key={user.userId}
            className="group relative flex items-center justify-center h-7 w-7 rounded-full text-[11px] font-semibold text-white select-none ring-2 ring-white dark:ring-[#0a1520]"
            style={{
              backgroundColor: user.color,
              opacity: user.isOnline ? 1 : 0.45,
              marginLeft: index === 0 ? 0 : '-8px',
              zIndex: collaborators.length - index,
            }}
          >
            {user.avatarInitial}
            {/* Online/offline dot */}
            <span
              className={[
                'absolute bottom-0 right-0 h-2 w-2 rounded-full ring-1 ring-white dark:ring-[#0a1520]',
                user.isOnline ? 'bg-green-500' : 'bg-gray-500',
              ].join(' ')}
            />
            {/* Hover tooltip */}
            <div
              className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-50 hidden group-hover:flex flex-col gap-0.5 bg-white dark:bg-[#0f1a28] border border-gray-200 dark:border-[#1e3a5f]/40 rounded-lg shadow-md px-2.5 py-2 min-w-[120px] whitespace-nowrap"
            >
              <span className="text-xs font-semibold text-gray-800 dark:text-[#f5efe8]">
                {user.name}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-[#4a7ab5]">
                {viewLabel}{dayLabel ? ` · ${dayLabel}` : ''}
              </span>
              {/* Triangle pointer */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-200 dark:border-t-[#1e3a5f]/40" />
            </div>
          </div>
        )
      })}
    </div>
  )}
  ```

- [ ] **Step 4.4: Typecheck**

  ```bash
  cd C:/Users/justi/dev/travyl-frontend && npm run typecheck
  ```

  Expected: no errors (Task 3 added the prop at the call site, Task 4 added it to the interface).

- [ ] **Step 4.5: Manual smoke test**

  Run `npm run web` and open two browser tabs with the same trip. Confirm:
  - Hovering a collaborator avatar shows a popover with name, view mode, and day label.
  - The popover disappears when the cursor leaves the avatar.

- [ ] **Step 4.6: Commit both dashboard and header together**

  ```bash
  git add apps/web/components/calendar/CalendarDashboard.tsx apps/web/components/calendar/CalendarHeader.tsx
  git commit -m "feat(header): add tripDays prop and hover tooltip on collaborator avatars"
  ```

---

## Task 5: Add collaborator avatar stack to `DayColumn` day header

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx:101-124`

Filter `viewers` by `selectedDayIndex === dayIndex` and render a tiny avatar stack in the day header strip, after the date label. `WeekView` and `DayView` already pass the full `viewers` array — no changes needed there.

- [ ] **Step 5.1: Add `dayCollaborators` derivation inside `DayColumn`**

  In the `DayColumn` function body, after the `mouseDownPos` ref and before the `handleMouseDown` function, add:
  ```ts
  const dayCollaborators = viewers.filter(
    (c) => (c.selectedDayIndex ?? 0) === dayIndex,
  )
  ```

  Place it after line 70 (`const mouseDownPos = useRef...`), so it reads:
  ```ts
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null)

  const dayCollaborators = viewers.filter(
    (c) => (c.selectedDayIndex ?? 0) === dayIndex,
  )
  ```

- [ ] **Step 5.2: Render the avatar stack in the day header**

  Replace the existing day header `<div>` (lines 102-124, verbatim) with this new version that appends the avatar stack after `{label}`:

  Old (lines 102-124):
  ```tsx
      <div
        className={[
          'text-center text-xs font-medium py-1 border-b border-gray-200 dark:border-[#1e3a5f]/30 text-gray-500 dark:text-[#4a7ab5] select-none',
          onClickDayHeader
            ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/25 transition-colors'
            : '',
        ].join(' ')}
        onClick={onClickDayHeader}
        role={onClickDayHeader ? 'button' : undefined}
        tabIndex={onClickDayHeader ? 0 : undefined}
        onKeyDown={
          onClickDayHeader
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClickDayHeader()
                }
              }
            : undefined
        }
      >
        {label}
      </div>
  ```

  New:
  ```tsx
      <div
        className={[
          'text-center text-xs font-medium py-1 border-b border-gray-200 dark:border-[#1e3a5f]/30 text-gray-500 dark:text-[#4a7ab5] select-none',
          onClickDayHeader
            ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/25 transition-colors'
            : '',
        ].join(' ')}
        onClick={onClickDayHeader}
        role={onClickDayHeader ? 'button' : undefined}
        tabIndex={onClickDayHeader ? 0 : undefined}
        onKeyDown={
          onClickDayHeader
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClickDayHeader()
                }
              }
            : undefined
        }
      >
        {label}
        {dayCollaborators.length > 0 && (
          <div className="flex items-center justify-center gap-0 mt-0.5">
            {dayCollaborators.slice(0, 3).map((c, i) => (
              <div
                key={c.userId}
                title={c.name}
                style={{
                  backgroundColor: c.color,
                  marginLeft: i === 0 ? 0 : '-4px',
                  zIndex: 3 - i,
                }}
                className="w-4 h-4 rounded-full text-[8px] font-bold text-white flex items-center justify-center ring-1 ring-white dark:ring-[#0a1520]"
              >
                {c.avatarInitial}
              </div>
            ))}
            {dayCollaborators.length > 3 && (
              <span className="text-[9px] text-gray-400 ml-1">
                +{dayCollaborators.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
  ```

- [ ] **Step 5.3: Typecheck**

  ```bash
  cd C:/Users/justi/dev/travyl-frontend && npm run typecheck
  ```

  Expected: no errors.

- [ ] **Step 5.4: Manual smoke test**

  With two browser tabs open on the same trip:
  - In week view, both tabs should show small avatars on the day column header matching whichever day the other user is focused on.
  - Switching to day view on one tab should show that user's avatar on the correct day header in the other tab's week view.
  - With no collaborators, the day headers render normally with no visible change.

- [ ] **Step 5.5: Commit**

  ```bash
  git add apps/web/components/calendar/DayColumn.tsx
  git commit -m "feat(day-column): show collaborator avatars on day header strip"
  ```

---

## Final typecheck

- [ ] **Run full typecheck to confirm all five tasks integrate cleanly:**

  ```bash
  cd C:/Users/justi/dev/travyl-frontend && npm run typecheck
  ```

  Expected: exit 0, no errors.
