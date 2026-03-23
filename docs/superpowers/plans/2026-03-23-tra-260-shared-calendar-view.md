# TRA-260 Shared Calendar View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the share page's basic trip info card with the full read-only calendar so anyone with a share link sees the live itinerary.

**Architecture:** Anonymous visitors call `supabase.auth.signInAnonymously()` on the global Supabase client (after checking no session already exists) to get an `authenticated` JWT; two new RLS policies allow any authenticated user to read `activity` and `yjs_documents` for `visibility='link'` trips. `CalendarDashboard` gets an `isSharedView` prop that forces viewer permissions, disables presence (via new `disabled` option on `useCollaboratorPresence`), skips ForYouPanel/collaborator fetch, and disables DnD. The share page renders `YjsTripProvider → CalendarDashboard` in place of the old info card.

**Note on Supabase client:** The global `supabase` singleton is used because `YjsTripProvider`, `useTripActivities`, and all hooks depend on it. Calling `signInAnonymously()` on it is safe because: (a) authenticated users are protected by a `getSession()` guard — `signInAnonymously()` is only called when no session exists; (b) for unauthenticated visitors, the anonymous session is written to localStorage, which is acceptable — Supabase supports upgrading anonymous accounts when users later sign up.

**Tech Stack:** Next.js 16 App Router, Supabase (RLS migrations, `signInAnonymously`), Yjs + y-supabase (real-time), `@dnd-kit/core` (`disabled` prop), React Query v5

**Spec:** `docs/superpowers/specs/2026-03-23-tra-260-shared-calendar-view-design.md`

---

## File Map

| Action | File | What changes |
|--------|------|--------------|
| Create | `supabase/migrations/20260323000000_shared_calendar_rls.sql` | 2 RLS policies: activity + yjs_documents read for link-visibility trips |
| Modify | `apps/web/components/calendar/hooks/useCollaboratorPresence.ts` | Add `disabled?: boolean` option — skip channel subscription when true |
| Modify | `apps/web/components/calendar/providers/TripPermissionContext.tsx` | Add `isSharedView` prop → force viewer permissions |
| Modify | `apps/web/components/calendar/TripNavbar.tsx` | Add `isSharedView` prop; hide share button, avatar dropdown → "Viewing" label, New Activity button |
| Modify | `apps/web/components/calendar/CalendarDashboard.tsx` | Add `isSharedView` prop; thread to TripPermissionProvider, TripNavbar, DndContext; skip fetchCollaborators, ForYouPanel; pass `disabled` to useCollaboratorPresence |
| Modify | `apps/web/app/(trips-app)/trip/[id]/share/[token]/page.tsx` | Full rewrite: anonymous auth + YjsTripProvider + CalendarDashboard with read-only banner |

---

## Task 1: RLS Migration

**Files:**
- Create: `supabase/migrations/20260323000000_shared_calendar_rls.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260323000000_shared_calendar_rls.sql
-- Allow any authenticated user (including anonymous) to SELECT from
-- activity and yjs_documents when the parent trip has visibility='link'.

-- Activity: public read for link-shared trips
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'activity'
      AND policyname = 'public_read_link_trips_activity'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "public_read_link_trips_activity"
        ON activity FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM trips
            WHERE trips.id = activity.trip_id
              AND trips.visibility = 'link'
          )
        )
    $policy$;
  END IF;
END$$;

-- yjs_documents: public read for link-shared trips
-- Note: yjs_documents.id is text (trip_id as key); trips.id is uuid — explicit cast required.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'yjs_documents'
      AND policyname = 'public_read_link_trips_yjs'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "public_read_link_trips_yjs"
        ON yjs_documents FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM trips
            WHERE trips.id::text = yjs_documents.id
              AND trips.visibility = 'link'
          )
        )
    $policy$;
  END IF;
END$$;
```

- [ ] **Step 2: Apply migration to local Supabase**

```bash
npx supabase db push
```

Expected: migration applied with no errors.

- [ ] **Step 3: Verify policies exist**

Check Supabase Studio → Authentication → Policies → `activity` and `yjs_documents` tables for the two new policies.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260323000000_shared_calendar_rls.sql
git commit -m "feat(TRA-260): add RLS policies for shared calendar read access"
```

---

## Task 2: `useCollaboratorPresence` — add `disabled` option

**Files:**
- Modify: `apps/web/components/calendar/hooks/useCollaboratorPresence.ts`

Add `disabled?: boolean` to `UseCollaboratorPresenceOptions`. When `disabled: true`, skip the channel subscription entirely and return no-op callbacks with an empty collaborators list.

- [ ] **Step 1: Edit the interface and hook**

In `useCollaboratorPresence.ts`, update `UseCollaboratorPresenceOptions` to add the new field:

```ts
interface UseCollaboratorPresenceOptions {
  tripId: string
  userId: string
  userName: string
  userColor?: string
  /** When true, skip the presence channel entirely (e.g. share page viewers) */
  disabled?: boolean
}
```

Then in the hook body, add an early-return guard inside the `useEffect`. The effect dependency array must still include `disabled` to re-run if it changes. Replace the `useEffect` at lines 59-115 with:

```ts
useEffect(() => {
  if (disabled) return

  const channel = supabase.channel(`presence:trip:${tripId}`, {
    config: { presence: { key: userId } },
  })

  channelRef.current = channel

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState<{
      userId: string
      userName: string
      color: string
      selectedEventId: string | null
      currentView: ViewMode
      selectedDayIndex?: number
    }>()

    const users: UserAwareness[] = []
    for (const key of Object.keys(state)) {
      const entries = state[key]
      if (!entries || entries.length === 0) continue
      const entry = entries[entries.length - 1]
      if (entry.userId === userId) continue
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
    }
    setCollaborators(users)
  })

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        userId,
        userName,
        color,
        selectedEventId: localStateRef.current.selectedEventId,
        currentView: localStateRef.current.currentView,
        selectedDayIndex: localStateRef.current.selectedDayIndex,
      })
    }
  })

  return () => {
    channelRef.current = null
    channel.unsubscribe()
  }
}, [tripId, userId, userName, color, disabled])
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/hooks/useCollaboratorPresence.ts
git commit -m "feat(TRA-260): add disabled option to useCollaboratorPresence"
```

---

## Task 3: `TripPermissionContext` — `isSharedView` prop

**Files:**
- Modify: `apps/web/components/calendar/providers/TripPermissionContext.tsx`

- [ ] **Step 1: Edit `TripPermissionContext.tsx`**

Replace the `TripPermissionProviderProps` interface and `TripPermissionProvider` function body. The full file after edit:

```tsx
'use client'

import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Trip, EffectivePermission, TripCollaborator } from '@travyl/shared'
import { useAuthStore } from '@travyl/shared'

const TripPermissionCtx = createContext<EffectivePermission>({
  role: 'viewer',
  canEdit: false,
  canDelete: false,
  canInvite: false,
  canCreateNotes: false,
})

export function useEffectivePermission(): EffectivePermission {
  return useContext(TripPermissionCtx)
}

interface TripPermissionProviderProps {
  trip: Trip
  collaborators: TripCollaborator[]
  children: ReactNode
  /** When true, always returns viewer permissions regardless of user identity */
  isSharedView?: boolean
}

export function TripPermissionProvider({ trip, collaborators, children, isSharedView }: TripPermissionProviderProps) {
  const user = useAuthStore((s) => s.user)

  const permission = useMemo<EffectivePermission>(() => {
    if (isSharedView) {
      return { role: 'viewer', canEdit: false, canDelete: false, canInvite: false, canCreateNotes: false }
    }
    if (!user) {
      return { role: 'viewer', canEdit: false, canDelete: false, canInvite: false, canCreateNotes: false }
    }
    if (trip.user_id === user.id) {
      return { role: 'owner', canEdit: true, canDelete: true, canInvite: true, canCreateNotes: true }
    }
    const collab = collaborators.find((c) => c.user_id === user.id && c.invite_status === 'accepted')
    if (collab) {
      const isEditor = collab.role_type === 'editor'
      return { role: isEditor ? 'editor' : 'viewer', canEdit: isEditor, canDelete: false, canInvite: false, canCreateNotes: isEditor }
    }
    return { role: 'viewer', canEdit: false, canDelete: false, canInvite: false, canCreateNotes: false }
  }, [isSharedView, user, trip.user_id, collaborators])

  return <TripPermissionCtx.Provider value={permission}>{children}</TripPermissionCtx.Provider>
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/providers/TripPermissionContext.tsx
git commit -m "feat(TRA-260): add isSharedView prop to TripPermissionProvider"
```

---

## Task 4: `TripNavbar` — `isSharedView` prop

**Files:**
- Modify: `apps/web/components/calendar/TripNavbar.tsx`

Add `isSharedView?: boolean` to `TripNavbarProps`. When true: hide Share button, hide "New Activity" button, replace avatar dropdown with a "Viewing" label.

- [ ] **Step 1: Add prop to `TripNavbarProps` interface**

Find the `TripNavbarProps` interface (starts around line 117). Add after `onDeleteUnscheduled`:

```tsx
/** When true: read-only shared view — hides share, avatar dropdown, and new activity controls */
isSharedView?: boolean
```

- [ ] **Step 2: Add to function destructuring**

In the `TripNavbar` function signature, add `isSharedView = false` to the destructured props.

- [ ] **Step 3: Wrap "New Activity" button in conditional**

Find the New Activity button (look for `onAddEvent` and `Plus` icon). Wrap it:

```tsx
{!isSharedView && (
  // existing New Activity button — no changes inside
)}
```

- [ ] **Step 4: Wrap Share button in conditional**

Find the Share button (look for `ShareAndroid` icon and amber background `bg-[#F59E0B]`). Wrap it:

```tsx
{!isSharedView && (
  // existing Share button — no changes inside
)}
```

- [ ] **Step 5: Replace avatar dropdown with "Viewing" label when `isSharedView`**

Find the avatar dropdown section (starts with `<div className="relative" ref={avatarRef}>`). **Do not modify the avatar dropdown internals.** Instead, wrap the entire block in a conditional and add the "Viewing" label before it:

```tsx
{isSharedView ? (
  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-[#1e3a5f]/20">
    <span className="text-xs text-gray-500 dark:text-[#4a7ab5]">Viewing</span>
  </div>
) : (
  <div className="relative" ref={avatarRef}>
    {/* entire existing avatar dropdown block — unchanged */}
  </div>
)}
```

When making this edit, copy the entire existing `<div className="relative" ref={avatarRef}>...</div>` block verbatim into the `else` branch. Do not omit any of its children.

- [ ] **Step 6: Typecheck**

```bash
npm run typecheck 2>&1 | head -20
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/calendar/TripNavbar.tsx
git commit -m "feat(TRA-260): add isSharedView prop to TripNavbar"
```

---

## Task 5: `CalendarDashboard` — wire `isSharedView`

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

Add `isSharedView?: boolean` to props. Thread to: `useCollaboratorPresence` (disabled), `TripPermissionProvider`, `TripNavbar`, `DndContext` (disabled). Skip `fetchCollaborators` and `ForYouPanel` when true.

- [ ] **Step 1: Add `isSharedView` to props interface and signature**

Find the `CalendarDashboardProps` interface (around line 68):

```tsx
interface CalendarDashboardProps {
  tripId: string
  userId: string
  userName: string
  /** When true: read-only shared view */
  isSharedView?: boolean
}

export function CalendarDashboard({ tripId, userId, userName, isSharedView = false }: CalendarDashboardProps) {
```

- [ ] **Step 2: Pass `disabled` to `useCollaboratorPresence`**

Find the `useCollaboratorPresence` call (look for `{ collaborators, setCurrentView, setSelectedDay }`). Update it:

```tsx
const { collaborators, setCurrentView, setSelectedDay } = useCollaboratorPresence({
  tripId,
  userId,
  userName,
  disabled: isSharedView,
})
```

- [ ] **Step 3: Disable `fetchCollaborators` query when `isSharedView`**

Find the `useQuery` that calls `fetchCollaborators` (look for `queryKey: ['collaborators', tripId]`). Add `&& !isSharedView` to the `enabled` option:

```tsx
const { data: tripCollaborators = [] } = useQuery({
  queryKey: ['collaborators', tripId],
  queryFn: () => fetchCollaborators(tripId),
  enabled: !!tripId && !isSharedView,
})
```

- [ ] **Step 4: Pass `isSharedView` to `TripPermissionProvider`**

Find `<TripPermissionProvider trip={trip!} collaborators={tripCollaborators}>` (around line 443). Add the prop:

```tsx
<TripPermissionProvider trip={trip!} collaborators={tripCollaborators} isSharedView={isSharedView}>
```

- [ ] **Step 5: Pass `disabled` to `DndContext`**

Find `<DndContext` (look for `sensors={sensors}`). Add `disabled`:

```tsx
<DndContext
  sensors={sensors}
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDragEnd={handleDragEnd}
  onDragCancel={handleDragCancel}
  disabled={isSharedView}
>
```

- [ ] **Step 6: Pass `isSharedView` to `TripNavbar`**

Find the `<TripNavbar` render. Add:

```tsx
isSharedView={isSharedView}
```

- [ ] **Step 7: Conditionally render `ForYouPanel`**

Find `<ForYouPanel` (look for `destination={trip?.destination ?? ''}`). Wrap it:

```tsx
{!isSharedView && (
  <ForYouPanel
    destination={trip?.destination ?? ''}
    tripId={trip?.id ?? ''}
    scheduledActivityIds={droppedSuggestionIds}
    width={forYouWidth}
  />
)}
```

- [ ] **Step 8: Typecheck**

```bash
npm run typecheck 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat(TRA-260): add isSharedView prop to CalendarDashboard"
```

---

## Task 6: Share Page — anonymous auth + calendar

**Files:**
- Modify: `apps/web/app/(trips-app)/trip/[id]/share/[token]/page.tsx`

Full rewrite. Replace `SharedTripView` with a calendar view. Add anonymous auth on mount. Keep the error states.

- [ ] **Step 1: Rewrite the share page**

Replace the entire file contents with:

```tsx
'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, GitFork } from 'lucide-react'
import { supabase, fetchTripByShareToken, useForkTrip, useAuthStore } from '@travyl/shared'
import type { Trip } from '@travyl/shared'
import { YjsTripProvider } from '@/components/calendar/providers/YjsTripProvider'
import { CalendarDashboard } from '@/components/calendar/CalendarDashboard'

const BRAND = '#1e3a5f'

function SharedCalendarView({ trip }: { trip: Trip }) {
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const { mutate: forkTripMutation, isPending } = useForkTrip()

  const handleFork = () => {
    forkTripMutation(
      { tripId: trip.id },
      { onSuccess: () => router.push('/trips') },
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Read-only banner */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-[#1e3a5f] text-white text-sm shrink-0">
        <div className="flex items-center gap-2">
          <Lock size={13} className="opacity-70" />
          <span className="opacity-80">Viewing shared trip — read only</span>
        </div>
        <div className="flex items-center gap-3">
          {user && !user.is_anonymous ? (
            <button
              onClick={handleFork}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs font-medium disabled:opacity-50"
            >
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <GitFork size={12} />}
              Fork this trip
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs font-medium"
            >
              Sign in to fork
            </Link>
          )}
        </div>
      </div>

      {/* Calendar */}
      <YjsTripProvider tripId={trip.id}>
        <CalendarDashboard
          tripId={trip.id}
          userId={user?.id ?? 'anonymous'}
          userName={user?.user_metadata?.display_name ?? ''}
          isSharedView={true}
        />
      </YjsTripProvider>
    </div>
  )
}

export default function SharedTripPage({ params }: { params: Promise<{ id: string; token: string }> }) {
  const { id, token } = use(params)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<'invalid' | 'error' | null>(null)

  useEffect(() => {
    async function init() {
      try {
        // Check if user already has a session (authenticated users skip anonymous sign-in)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          const { error: anonError } = await supabase.auth.signInAnonymously()
          if (anonError) throw anonError
        }

        const fetchedTrip = await fetchTripByShareToken(token)
        if (!fetchedTrip || fetchedTrip.id !== id) {
          setError('invalid')
        } else {
          setTrip(fetchedTrip)
        }
      } catch (err) {
        console.error('share page init error:', err)
        setError('error')
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [id, token])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (error === 'invalid' || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h2>
          <p className="text-gray-500 mb-6">
            This share link is invalid or the trip is no longer shared.
          </p>
          <Link
            href="/explore"
            className="inline-block px-6 py-2.5 rounded-xl text-white font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            Explore Trips
          </Link>
        </div>
      </div>
    )
  }

  if (error === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-6">Unable to load this trip. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block px-6 py-2.5 rounded-xl text-white font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return <SharedCalendarView trip={trip} />
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Start dev server and test manually**

```bash
npm run web
```

1. Enable link sharing on a trip via the ShareModal
2. Copy the share link
3. Open in incognito → verify calendar renders with read-only banner, no share/new activity buttons, "Viewing" label
4. Click an activity → verify detail popover opens (read-only)
5. Try to drag an activity → verify nothing moves
6. Open same URL while signed in as trip owner → verify read-only banner still shows
7. Verify owner's session persists (navigate to `/trips` — should still be logged in)

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(trips-app)/trip/[id]/share/[token]/page.tsx"
git commit -m "feat(TRA-260): replace share page info card with live read-only calendar"
```

---

## Task 7: Final typecheck and lint

- [ ] **Step 1: Full typecheck**

```bash
npm run typecheck 2>&1
```

Expected: zero errors.

- [ ] **Step 2: Lint**

```bash
npm run lint 2>&1 | head -40
```

Fix any lint errors before proceeding.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "chore(TRA-260): fix lint warnings"
```

---

## Acceptance Criteria Checklist

Before calling this done, verify each criterion from the spec:

- [ ] Visiting `/trip/<id>/share/<token>` shows the full calendar with all activities
- [ ] Activities update in real-time as the owner/collaborators make changes
- [ ] Clicking an activity opens the detail popover (read-only)
- [ ] No mutations possible — drag-and-drop disabled, edit modal does not open
- [ ] Read-only banner is visible
- [ ] Unauthenticated visitors see the calendar without being prompted to log in
- [ ] Authenticated users visiting the share link see the same read-only calendar
- [ ] Authenticated user's existing session is not destroyed by visiting the share page
