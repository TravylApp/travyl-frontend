# Share & Invite Feature Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up end-to-end trip sharing with Google Docs permission model — link = view-only (no account), email invite = editor (requires auth).

**Architecture:** Simplify existing ShareModal components (remove role pickers), add RLS policies for anonymous shared trip access, create `/invite/accept` route, build `ReadOnlyCalendarDashboard` for the share page, and fix the login redirect flow.

**Tech Stack:** Next.js 16 App Router, Supabase (RLS policies, auth), SST Lambda (SES email), React Query, Tailwind CSS v4.

---

## Task 1: RLS Policy Migrations

The existing RLS policies block anonymous access to shared trips and activities, and prevent invite acceptance. We need three policy changes.

**Security note:** The trip and activity policies use Postgres functions that check `share_link_token` against a runtime parameter. This prevents enumeration — anonymous users can only see trips/activities when they provide the correct token. The token check happens at the RLS level (not just the application query), so even a crafted `SELECT * FROM trips` returns nothing without the token.

**Files:**
- Create: Supabase migration (via `apply_migration`)

- [ ] **Step 1: Create a Postgres function for token-scoped access and add trip RLS policy**

Run this migration via Supabase MCP `apply_migration`:

```sql
-- Function to get the share token from the request context (set by the app via .rpc or headers)
-- The client sets this via supabase.rpc or via a custom header in the request
CREATE OR REPLACE FUNCTION public.current_share_token()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.headers', true)::json->>'x-share-token',
    ''
  );
$$;

-- Allow anyone to SELECT a trip ONLY if they provide the correct share_link_token
CREATE POLICY "trips_select_by_share_token"
  ON public.trips
  FOR SELECT
  USING (
    visibility IN ('link', 'public')
    AND share_link_token IS NOT NULL
    AND share_link_token = public.current_share_token()
  );
```

This ensures anonymous users can only access a specific trip when they provide its exact token via the `x-share-token` header.

- [ ] **Step 2: Add RLS policy for token-scoped activity access on shared trips**

Run this migration via Supabase MCP `apply_migration`:

```sql
-- Allow anyone to SELECT activities ONLY for a trip whose share token matches
CREATE POLICY "activity_select_shared"
  ON public.activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trips t
      WHERE t.id = activity.trip_id
        AND t.visibility IN ('link', 'public')
        AND t.share_link_token IS NOT NULL
        AND t.share_link_token = public.current_share_token()
    )
  );
```

- [ ] **Step 3: Add RLS policy for invite acceptance by token**

The accepting user needs to UPDATE their `trip_collaborators` row, but `user_id` is NULL on pending invites so the existing policy doesn't match.

Run this migration via Supabase MCP `apply_migration`:

```sql
-- Allow authenticated users to accept a pending invite by token
CREATE POLICY "trip_collaborators_accept_invite"
  ON public.trip_collaborators
  FOR UPDATE
  USING (
    invite_status = 'pending'
    AND invite_token IS NOT NULL
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    invite_status = 'accepted'
    AND user_id = auth.uid()
  );
```

The `USING` clause matches pending invites (any authenticated user can attempt), and the `WITH CHECK` ensures they can only set `user_id` to themselves and `invite_status` to `'accepted'`.

- [ ] **Step 4: Verify policies**

```sql
SELECT policyname, cmd, qual FROM pg_policies
WHERE tablename IN ('trips', 'activity', 'trip_collaborators')
ORDER BY tablename, policyname;
```

Confirm the three new policies and the `current_share_token()` function appear.

- [ ] **Step 5: Create shared fetch functions that pass the share token header**

Add two new functions to `packages/shared/src/services/api.ts` that set the `x-share-token` header so the RLS policies can verify access:

```ts
/** Fetch a trip by share token — sets x-share-token header for RLS */
export async function fetchSharedTrip(shareToken: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('share_link_token', shareToken)
    .single()
    .setHeader('x-share-token', shareToken)
  if (error) return null
  return data as Trip
}

/** Fetch activities for a shared trip — sets x-share-token header for RLS */
export async function fetchSharedActivities(tripId: string, shareToken: string): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from('activity')
    .select('*')
    .eq('trip_id', tripId)
    .order('sort_order', { ascending: true })
    .setHeader('x-share-token', shareToken)
  if (error) throw error
  return (data ?? []) as ActivityRow[]
}
```

Also export these from `packages/shared/src/services/index.ts` and `packages/shared/src/index.ts`.

**Important:** The existing `fetchTripByShareToken` queries `.eq('share_link_token', token)` but does NOT set the `x-share-token` header — so it won't work with the new RLS policy for anonymous users. The share page (Task 10) should use `fetchSharedTrip` instead.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add RLS policies for shared trip access and invite acceptance"
```

---

## Task 2: Simplify InviteBar — Remove Role Picker

**Files:**
- Modify: `apps/web/components/calendar/sharing/InviteBar.tsx`

- [ ] **Step 1: Update InviteBar interface and remove role state**

Replace the entire file content. Remove `CollaboratorRole` import, the `role` state, the `<select>`, and simplify the `onInvite` callback:

```tsx
'use client'

import { useState } from 'react'

interface InviteBarProps {
  onInvite: (email: string) => void
  isLoading?: boolean
}

export function InviteBar({ onInvite, isLoading }: InviteBarProps) {
  const [email, setEmail] = useState('')

  const handleSubmit = () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    onInvite(trimmed)
    setEmail('')
  }

  return (
    <div className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="Add people by email..."
        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-[#003594]"
      />
      <button
        onClick={handleSubmit}
        disabled={isLoading || !email.trim()}
        className="rounded-lg bg-[#003594] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Invite
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npm run typecheck`

This will initially fail because `ShareModal` still passes `(email, role)` — that's expected and will be fixed in Task 4.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/sharing/InviteBar.tsx
git commit -m "feat: simplify InviteBar to editor-only invites"
```

---

## Task 3: Simplify LinkSharingSection — Remove Permission Dropdown

**Files:**
- Modify: `apps/web/components/calendar/sharing/LinkSharingSection.tsx`

- [ ] **Step 1: Remove permission dropdown and simplify props**

Replace the entire file. Remove `LinkPermission` import, the `onChangeLinkPermission` prop, the permission `<select>`, and hardcode "can view" text:

```tsx
'use client'

import { useState } from 'react'
import { Link } from 'iconoir-react'
import type { Visibility } from '@travyl/shared'

interface LinkSharingSectionProps {
  visibility: Visibility
  shareToken: string | null
  onToggleLinkSharing: () => void
  onCopyLink: () => void
}

export function LinkSharingSection({ visibility, shareToken, onToggleLinkSharing, onCopyLink }: LinkSharingSectionProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    onCopyLink()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isLinkEnabled = visibility !== 'private'

  return (
    <div className="border-t border-white/10 pt-4">
      {!isLinkEnabled ? (
        <button onClick={onToggleLinkSharing} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white">
          <Link className="h-4 w-4 text-white/60" />
          <span>Enable link sharing</span>
        </button>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4 text-white/60" />
            <div>
              <div className="text-sm text-white">Anyone with the link</div>
              <div className="text-xs text-white/40">can view</div>
            </div>
          </div>
          <button onClick={handleCopy} disabled={!shareToken} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/10">
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/sharing/LinkSharingSection.tsx
git commit -m "feat: simplify LinkSharingSection to view-only"
```

---

## Task 4: Update ShareModal — Wire Simplified Components

**Files:**
- Modify: `apps/web/components/calendar/sharing/ShareModal.tsx`

- [ ] **Step 1: Update handleInvite signature and remove link permission handler**

In `ShareModal.tsx`, make these changes:

1. Remove `LinkPermission` from the import on line 6 (keep `Trip`, `CollaboratorRole`)
2. Change `handleInvite` (line 38) from `async (email: string, role: CollaboratorRole)` to `async (email: string)` — and in the `body` on line 50, change to `JSON.stringify({ tripId: trip.id, email })` (remove `role`)
3. Remove the `handleChangeLinkPermission` function (lines 73-76)
4. Remove `linkPermission` and `onChangeLinkPermission` props from `<LinkSharingSection>` (line 104-106):

Before:
```tsx
<LinkSharingSection
  visibility={trip.visibility}
  linkPermission={trip.link_permission}
  shareToken={trip.share_link_token}
  onToggleLinkSharing={handleToggleLinkSharing}
  onChangeLinkPermission={handleChangeLinkPermission}
  onCopyLink={handleCopyLink}
/>
```

After:
```tsx
<LinkSharingSection
  visibility={trip.visibility}
  shareToken={trip.share_link_token}
  onToggleLinkSharing={handleToggleLinkSharing}
  onCopyLink={handleCopyLink}
/>
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`

Expected: PASS — all three sharing components should now have aligned interfaces.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/sharing/ShareModal.tsx
git commit -m "feat: update ShareModal for editor-only invites, view-only links"
```

---

## Task 5: Update Lambda — Hardcode Editor Role

**Files:**
- Modify: `services/invite.ts`

- [ ] **Step 1: Hardcode role_type to 'editor'**

In `services/invite.ts`, make two changes:

Line 19 — change the destructure to ignore `role`:
```ts
const { tripId, email } = JSON.parse(event.body)
```

Line 20 — update validation:
```ts
if (!tripId || !email) {
  return { statusCode: 400, body: JSON.stringify({ error: 'tripId, email required' }) }
}
```

Line 66 — the insert already uses `role_type: role`. Change to hardcoded:
```ts
role_type: 'editor',
```

Line 77 — the email body uses `roleLabel`. Change to hardcoded:
```ts
const roleLabel = 'edit'
```

- [ ] **Step 2: Commit**

```bash
git add services/invite.ts
git commit -m "feat: hardcode editor role in invite Lambda"
```

---

## Task 6: Fix Login Redirect

**Files:**
- Modify: `apps/web/app/login/page.tsx`

- [ ] **Step 1: Use redirect param after auth**

In `apps/web/app/login/page.tsx`, find `handleSubmit` (line 34). Change line 45 from:

```ts
router.replace('/');
```

To:

```ts
const redirectTo = searchParams.get('redirect') || '/'
// Prevent open redirects — only allow relative paths
const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/'
router.replace(safeRedirect);
```

Move the `redirectTo` and `safeRedirect` computation outside the try block (before the `if (isSignUp)` check on line 40), since `searchParams` is stable and doesn't need to be inside try/catch. Or keep it simple and put it right before `router.replace`.

- [ ] **Step 2: Test manually**

1. Navigate to `/login?redirect=/trips` — after login, should go to `/trips`
2. Navigate to `/login` — after login, should go to `/`
3. Navigate to `/login?redirect=//evil.com` — after login, should go to `/` (blocked)

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/login/page.tsx
git commit -m "feat: use redirect query param after login with open-redirect protection"
```

---

## Task 7: Middleware — Allow Share and Invite Routes

**Files:**
- Modify: `apps/web/middleware.ts`

- [ ] **Step 1: Add pass-through rules**

In `apps/web/middleware.ts`, add two pass-through checks after the existing `/t/` check (line 9-11) and before the Supabase client creation (line 13):

```ts
// /trip/[id]/share/[token] — public read-only access, no auth required
if (/^\/trip\/[^/]+\/share\/[^/]+/.test(pathname)) {
  return NextResponse.next()
}

// /invite/accept — handles its own auth redirect with token preservation
if (pathname.startsWith('/invite/')) {
  return NextResponse.next()
}
```

These go right after line 11 (`return NextResponse.next()` for `/t/`), before line 13 (`const res = NextResponse.next()`).

- [ ] **Step 2: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "feat: allow unauthenticated access to share links and invite accept"
```

---

## Task 8: Update canEditTrip Permission Util

**Files:**
- Modify: `packages/shared/src/utils/permissions.ts`

- [ ] **Step 1: Remove link_permission editor path**

In `packages/shared/src/utils/permissions.ts`, update `canEditTrip` (lines 13-17). Under the Google Docs model, link access is always view-only. Edit access requires being the owner (collaborator-based editing is checked elsewhere at the component level).

Change from:
```ts
export function canEditTrip(trip: Trip, userId: string | null): boolean {
  if (isTripOwner(trip, userId)) return true
  if (trip.visibility === 'private') return false
  return trip.link_permission === 'editor'
}
```

To:
```ts
export function canEditTrip(trip: Trip, userId: string | null): boolean {
  return isTripOwner(trip, userId)
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/utils/permissions.ts
git commit -m "feat: restrict canEditTrip to owner only (link sharing is view-only)"
```

---

## Task 9: Create `/invite/accept` Route

**Files:**
- Create: `apps/web/app/invite/accept/page.tsx`

- [ ] **Step 1: Create the invite accept page**

Create `apps/web/app/invite/accept/page.tsx`:

```tsx
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore, acceptInviteByToken } from '@travyl/shared'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

function InviteAcceptInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)

  const [status, setStatus] = useState<'loading' | 'accepted' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (loading) return // wait for auth to initialize

    if (!token) {
      setStatus('error')
      setErrorMessage('Invalid invite link — no token provided.')
      return
    }

    if (!user) {
      // Not logged in — redirect to login, preserving the invite token
      const returnPath = `/invite/accept?token=${encodeURIComponent(token)}`
      router.replace(`/login?redirect=${encodeURIComponent(returnPath)}`)
      return
    }

    // Logged in — accept the invite
    acceptInviteByToken(token, user.id)
      .then(({ tripId }) => {
        setStatus('accepted')
        // Brief delay so user sees the success state
        setTimeout(() => router.replace(`/trip/${tripId}`), 1500)
      })
      .catch((err) => {
        setStatus('error')
        const msg = err?.message ?? ''
        if (msg.includes('No rows') || msg.includes('0 rows')) {
          setErrorMessage('This invite has already been accepted or is no longer valid.')
        } else {
          setErrorMessage('Something went wrong accepting this invite. Please try again.')
        }
      })
  }, [token, user, loading, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f6f3]">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-[#1e3a5f] mx-auto mb-4" />
          <p className="text-[#1e3a5f]/60 text-sm">Accepting your invite...</p>
        </div>
      </div>
    )
  }

  if (status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f6f3]">
        <div className="text-center">
          <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#1e3a5f] mb-2">You're in!</h1>
          <p className="text-[#1e3a5f]/60 text-sm">Redirecting to the trip...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f6f3]">
      <div className="text-center max-w-md mx-auto px-4">
        <XCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-[#1e3a5f] mb-2">Invite Error</h1>
        <p className="text-[#1e3a5f]/60 text-sm mb-6">{errorMessage}</p>
        <button
          onClick={() => router.push('/trips')}
          className="px-6 py-2.5 rounded-xl bg-[#1e3a5f] text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Go to My Trips
        </button>
      </div>
    </div>
  )
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#f8f6f3]">
        <Loader2 size={32} className="animate-spin text-[#1e3a5f]" />
      </div>
    }>
      <InviteAcceptInner />
    </Suspense>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`

- [ ] **Step 3: Test manually**

1. Open `/invite/accept` with no token → should show error
2. Open `/invite/accept?token=fake` while not logged in → should redirect to `/login?redirect=%2Finvite%2Faccept%3Ftoken%3Dfake`
3. Open `/invite/accept?token=fake` while logged in → should show error (invalid token)

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/invite/accept/page.tsx
git commit -m "feat: create /invite/accept route for email invite flow"
```

---

## Task 10: ReadOnlyCalendarDashboard — Share Page Calendar View

This is the largest task. Build a simplified calendar dashboard that renders the trip calendar without DnD, Yjs, mutations, or command palette. Uses static Supabase fetch via `fetchSharedActivities` (from Task 1).

**Important table name note:** The DB table is `public.activity` (singular). The existing `fetchActivities` in `api.ts` queries `.from('activities')` (plural) — this is a legacy function for a different table/view. The share page uses `fetchSharedActivities` which correctly queries `.from('activity')`.

**Files:**
- Create: `apps/web/components/calendar/ReadOnlyCalendarDashboard.tsx`
- Modify: `apps/web/app/(trips-app)/trip/[id]/share/[token]/page.tsx`

- [ ] **Step 1: Create ReadOnlyCalendarDashboard component**

Create `apps/web/components/calendar/ReadOnlyCalendarDashboard.tsx`.

Note on imports:
- `computeTimeRange` is imported via sub-path `@travyl/shared/viewmodels/calendarViewModel` — this matches the existing pattern in `CalendarDashboard.tsx:7` and works because Next.js transpiles `@travyl/shared`.
- `toCalendarActivity` and `ActivityRow` are imported from `@travyl/shared` root (matches `useTripActivities.ts:3`).
- No `TripSidebar` — the sidebar navigates to auth-gated `/trip/[id]/*` routes which would fail for anonymous users. The read-only view uses a simple header instead.

```tsx
'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { computeTimeRange } from '@travyl/shared/viewmodels/calendarViewModel'
import { toCalendarActivity, fetchSharedActivities } from '@travyl/shared'
import type { Trip, ActivityRow } from '@travyl/shared'
import { HOUR_HEIGHT } from './constants'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { AllDayRow } from './AllDayRow'
import { CalendarSkeleton } from './CalendarSkeleton'
import { CalendarError } from './CalendarError'
import { useCalendarNavigation } from './hooks/useCalendarNavigation'
import { useCalendarTheme } from './hooks/useCalendarTheme'
import { CalendarThemeContext } from './CalendarThemeContext'
import type { CalendarActivity } from './types'

interface ReadOnlyCalendarDashboardProps {
  trip: Trip
  shareToken: string
}

export function ReadOnlyCalendarDashboard({ trip, shareToken }: ReadOnlyCalendarDashboardProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { theme } = useCalendarTheme()

  const parsedStartDate = new Date(trip.start_date + 'T00:00:00Z')
  const parsedEndDate = new Date(trip.end_date + 'T00:00:00Z')
  const parsedStartMs = parsedStartDate.getTime()
  const tripTotalDays = Math.round((parsedEndDate.getTime() - parsedStartMs) / (1000 * 60 * 60 * 24))

  const TRIP_DAYS = useMemo(() => Array.from({ length: tripTotalDays }, (_, i) => {
    const date = new Date(parsedStartMs + i * 24 * 60 * 60 * 1000)
    return {
      dayIndex: i,
      label: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }),
    }
  }), [tripTotalDays, parsedStartMs])

  // Fetch activities via static Supabase query with share token header (not Yjs)
  const { data: rawActivities, isLoading, error } = useQuery({
    queryKey: ['sharedActivities', trip.id],
    queryFn: () => fetchSharedActivities(trip.id, shareToken),
  })

  // Map DB rows (ActivityRow) to CalendarActivity format
  const activities: CalendarActivity[] = useMemo(() => {
    if (!rawActivities) return []
    return rawActivities.map((row: ActivityRow) => toCalendarActivity(row, trip.start_date))
  }, [rawActivities, trip.start_date])

  const timeRange = useMemo(() => computeTimeRange(activities), [activities])

  const {
    viewMode,
    selectedDayIndex,
    selectedEventId,
    setViewMode,
    selectEvent,
    goToDayView,
  } = useCalendarNavigation()

  // Auto-scroll to first event on mount
  useEffect(() => {
    if (!scrollRef.current || activities.length === 0) return
    const firstEvent = activities.reduce(
      (earliest, a) => (a.startHour < earliest ? a.startHour : earliest),
      timeRange.startHour,
    )
    const scrollTop = Math.max(0, (firstEvent - timeRange.startHour - 0.5) * HOUR_HEIGHT)
    scrollRef.current.scrollTop = scrollTop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities.length])

  if (isLoading) return <CalendarSkeleton />
  if (error) return <CalendarError message={error instanceof Error ? error.message : 'Failed to load activities'} />

  const visibleDays = viewMode === 'week' ? TRIP_DAYS : [TRIP_DAYS[selectedDayIndex]]

  const handleSelectEvent = (id: string) => {
    selectEvent(selectedEventId === id ? null : id)
  }

  const formatDateRange = (startDate: Date, endDate: Date): string => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }
    const start = startDate.toLocaleDateString('en-US', opts)
    const end = endDate.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
    return `${start} – ${end}`
  }

  const dateRange = formatDateRange(parsedStartDate, parsedEndDate)
  const currentDayLabel = viewMode === 'day' ? TRIP_DAYS[selectedDayIndex]?.label ?? '' : ''

  return (
    <CalendarThemeContext.Provider value={{ isDark: theme === 'dark' }}>
    <div className={theme === 'dark' ? 'dark' : ''}>
    <div className="flex h-screen overflow-hidden bg-[var(--cal-bg)] text-[var(--cal-text)]">
      {/* Main column — no sidebar (sidebar links to auth-gated routes) */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Simplified header — no share button, no commands, no connection status */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--cal-border)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-[var(--cal-text-secondary)] hover:text-[var(--cal-text)] transition-colors"
            >
              &larr; Back
            </button>
            <h1 className="text-lg font-semibold text-[var(--cal-text)]">{trip.title}</h1>
            <span className="text-sm text-[var(--cal-text-tertiary)]">
              {viewMode === 'day' ? currentDayLabel : dateRange}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${viewMode === 'week' ? 'bg-[var(--cal-accent)] text-white' : 'text-[var(--cal-text-secondary)] hover:bg-[var(--cal-surface-hover)]'}`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${viewMode === 'day' ? 'bg-[var(--cal-accent)] text-white' : 'text-[var(--cal-text-secondary)] hover:bg-[var(--cal-surface-hover)]'}`}
            >
              Day
            </button>
          </div>
        </div>

        {/* Grid area — no DndContext, no ForYou panel */}
        <div className="flex flex-col flex-1 min-w-0">
          <AllDayRow days={visibleDays} flights={[]} hotels={[]} />
          <div ref={scrollRef} className="flex flex-1 min-w-0 overflow-auto">
            <AnimatePresence mode="wait" initial={false}>
              {viewMode === 'week' ? (
                <motion.div
                  key="week"
                  className="flex flex-1 min-w-0"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  <WeekView
                    days={TRIP_DAYS}
                    activities={activities}
                    selectedEventId={selectedEventId}
                    timeRange={timeRange}
                    tripStartDate={parsedStartDate}
                    onSelectEvent={handleSelectEvent}
                    onClickDayHeader={(dayIndex) => goToDayView(dayIndex)}
                    onDeselect={() => selectEvent(null)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={`day-${selectedDayIndex}`}
                  className="flex flex-1 min-w-0"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  <DayView
                    dayIndex={selectedDayIndex}
                    label={TRIP_DAYS[selectedDayIndex]?.label ?? ''}
                    activities={activities}
                    selectedEventId={selectedEventId}
                    timeRange={timeRange}
                    tripStartDate={parsedStartDate}
                    onSelectEvent={handleSelectEvent}
                    onDeselect={() => selectEvent(null)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
    </div>
    </CalendarThemeContext.Provider>
  )
}
```

Key differences from `CalendarDashboard`:
- No `DndContext`, `DragOverlay`, marquee selection, resize handles
- No `useYjsSync`, `useActivityMutations`, `useCollaboratorPresence`
- No command palette, keyboard shortcuts, ForYou panel
- No `ShareModal`, no `CardPopover`
- No `TripSidebar` (it links to auth-gated routes)
- Static activity fetch via React Query + `fetchSharedActivities` (with share token header for RLS)
- Uses `ActivityRow` type (not `any` cast) for `toCalendarActivity`
- Simplified header (no share button, no connection status)
- `onSelectEvent` only highlights, no edit/delete actions
- `WeekView`/`DayView` called without mutation props (`onResizeEvent`, `pendingDrop`, etc.)

- [ ] **Step 2: Update the share page to use ReadOnlyCalendarDashboard**

Replace `apps/web/app/(trips-app)/trip/[id]/share/[token]/page.tsx`:

```tsx
'use client'

import { use } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Lock } from 'lucide-react'
import { fetchSharedTrip, useAuthStore } from '@travyl/shared'
import { ReadOnlyCalendarDashboard } from '@/components/calendar/ReadOnlyCalendarDashboard'

const BRAND = '#1e3a5f'

export default function SharedTripPage({ params }: { params: Promise<{ id: string; token: string }> }) {
  const { id, token } = use(params)
  const user = useAuthStore((s) => s.user)

  const { data: trip, isLoading, error } = useQuery({
    queryKey: ['sharedTrip', token],
    queryFn: () => fetchSharedTrip(token),
  })

  const isValidTrip = trip?.id === id

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !trip || !isValidTrip) {
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
            href="/"
            className="inline-block px-6 py-2.5 rounded-xl text-white font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Sign up banner */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-[#1e3a5f] text-white text-center py-2.5 px-4 text-sm">
        You&apos;re viewing <strong>{trip.title}</strong> &mdash;{' '}
        {user ? (
          <Link href="/trips" className="underline font-semibold hover:opacity-80">
            Go to My Trips
          </Link>
        ) : (
          <Link
            href={`/login?mode=signup&redirect=${encodeURIComponent(`/trip/${id}/share/${token}`)}`}
            className="underline font-semibold hover:opacity-80"
          >
            Sign up to edit
          </Link>
        )}
      </div>
      {/* Calendar with top padding to account for banner */}
      <div className="pt-10">
        <ReadOnlyCalendarDashboard trip={trip} shareToken={token} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`

Ensure `fetchSharedTrip`, `fetchSharedActivities`, `toCalendarActivity`, and `ActivityRow` are all exported from `@travyl/shared`. If any are missing from the barrel export, add them to `packages/shared/src/index.ts`.

- [ ] **Step 4: Verify the dev server runs**

Run: `npm run web`

Navigate to a share URL (e.g., `/trip/<id>/share/<token>`) and confirm:
- The calendar renders with activities
- No DnD, no ForYou panel, no sidebar
- Week/Day toggle works
- "Sign up to edit" banner appears at the top

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/ReadOnlyCalendarDashboard.tsx apps/web/app/\(trips-app\)/trip/\[id\]/share/\[token\]/page.tsx
git commit -m "feat: read-only calendar view for shared trips"
```

---

## Task 11: End-to-End Smoke Test

No new files — this task verifies the full flow works.

- [ ] **Step 1: Test link sharing flow**

1. Log in as a trip owner
2. Open a trip → click Share
3. Toggle "Enable link sharing" → click "Copy link"
4. Open the link in an incognito window (no auth)
5. Verify: calendar renders read-only, "Sign up to edit" banner shows

- [ ] **Step 2: Test email invite flow**

1. In ShareModal, type an email and click "Invite"
2. Check: collaborator appears in the list as "Pending"
3. Check SES: email was sent (check CloudWatch logs for the Lambda if needed)
4. Open the invite link from the email
5. If not logged in → redirected to login
6. After login → invite accepted → redirected to the trip

- [ ] **Step 3: Verify permissions**

1. As the invited user, confirm you can edit the calendar (add/move/delete activities)
2. Open the share link (not the invite link) → should be view-only even for logged-in users who aren't collaborators

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete share & invite feature (TRA-246)"
```
