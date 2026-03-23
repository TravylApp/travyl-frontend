# Fork & Share Wiring Design

## Goal

Wire up the existing fork/share components so the full flow works end-to-end. All UI components and API functions already exist but are not connected to any rendering surfaces.

## Current State

### Components (built, not wired)
- `ShareModal` — invite collaborators by email, toggle link sharing, copy share link
- `InviteBar` — email + role input for inviting collaborators
- `CollaboratorList` — shows owner + collaborators with role management
- `LinkSharingSection` — toggle link sharing, set viewer/editor permission, copy link
- `ForkButton` — fork a trip (default + compact variants)
- `ForkAttribution` — "Forked from X by Y" banner
- `ForkCountBadge` — fork count pill for trip cards
- Share token page (`/trip/[id]/share/[token]`) — read-only trip preview with inline fork button

### API functions (built, working)
- `forkTrip(tripId)` — deep-copies trip + itinerary + activities + flights + hotels
- `fetchTripByShareToken(token)` — lookup trip by share link token
- `updateTripVisibility()` — set private/link/public
- `ensureShareLinkToken()` — generate UUID share token
- `fetchCollaborators` / `updateCollaboratorRole` / `removeCollaborator`

### What's broken
- `CalendarDashboard` passes `onShare={() => {}}` — Share button does nothing
- `ShareModal` is never mounted anywhere
- `ForkButton`, `ForkAttribution`, `ForkCountBadge` are never rendered
- `canForkTrip` only allows forking on `public` trips, but we want it on any non-private trip
- `ShareModal.handleCopyLink` generates `/t/{token}` URLs but no such route exists — the actual route is `/trip/{id}/share/{token}`
- `inviteCollaborator` API function does not exist — `ShareModal.onInvite` has no backend
- `canForkTrip` returns true for unauthenticated users (userId=null) on non-private trips, leading to runtime errors when they try to fork

## Design

### 1. Wire ShareModal into CalendarDashboard

**File:** `apps/web/components/calendar/CalendarDashboard.tsx`

- Add `useState<boolean>` for `shareModalOpen`
- Change `onShare={() => {}}` to `onShare={() => setShareModalOpen(true)}`
- Mount `<ShareModal>` with `isOpen={shareModalOpen}` and `onClose`
- Pass `onInvite` that calls `inviteCollaborator` (see Section 7)
- `useTripActivities` returns the full `Trip` object (confirmed: fetches with `select('*')`)

### 2. Fix share link URL

**File:** `apps/web/components/calendar/sharing/ShareModal.tsx`

The `handleCopyLink` function generates `/t/${token}` but the actual route is `/trip/${trip.id}/share/${token}`. Fix to:

```ts
const url = `${window.location.origin}/trip/${trip.id}/share/${token}`
```

### 3. Relax canForkTrip permission + add auth guard

**File:** `packages/shared/src/utils/permissions.ts`

Change:
```ts
export function canForkTrip(trip: Trip, userId: string | null): boolean {
  if (isTripOwner(trip, userId)) return false
  return trip.visibility === 'public'
}
```

To:
```ts
export function canForkTrip(trip: Trip, userId: string | null): boolean {
  if (!userId) return false
  if (isTripOwner(trip, userId)) return false
  return trip.visibility !== 'private'
}
```

This allows forking on both `link`-shared and `public` trips, but requires authentication. Unauthenticated users see "Sign in to Fork" instead.

**File:** `packages/shared/src/utils/permissions.test.ts`

- Change test on line 54 from `expect(canForkTrip(linkTrip, 'other-user')).toBe(false)` to `true`
- Add test: `canForkTrip` returns `false` when userId is `null`

### 4. Fork landing: navigate to /trips

**File:** `apps/web/components/trip/ForkButton.tsx`

Change the default `onSuccess` behavior from `router.push(/trip/${newTrip.id})` to `router.push('/trips')`. User lands on their trips list where the new forked trip appears.

**File:** `apps/web/app/(trips-app)/trip/[id]/share/[token]/page.tsx`

Add `useRouter` and `router.push('/trips')` in the inline fork handler's `onSuccess` callback.

### 5. Show ForkAttribution on forked trips

**File:** `apps/web/components/calendar/CalendarDashboard.tsx`

- Check if the current trip has `forked_from_trip_id`
- If so, render `<ForkAttribution>` below the navbar, above the calendar grid
- Pass the trip object; `originalTrip` and `originalOwner` can be null (the component gracefully falls back to "original trip" text)

### 6. Show ForkCountBadge on TripCard

**File:** `apps/web/components/trips/TripCard.tsx`

- `MockTripCard` extends `Trip` which already has `fork_count: number`
- If `fork_count > 0`, render `<ForkCountBadge count={trip.fork_count}>` in the bottom content area next to the status pill

### 7. Add inviteCollaborator API

**File:** `packages/shared/src/services/api.ts`

Add `inviteCollaborator(tripId, email, role)`:
- Insert a row into `trip_collaborators` with `invite_status: 'pending'`, `invited_email: email`, `role_type: role`, `invited_by: currentUser.id`
- The `trip_collaborators` table already has these columns (confirmed from the `TripCollaborator` type)
- No email notification for now (out of scope)

**File:** `packages/shared/src/services/index.ts`

Export the new function.

## Note: icon library mismatch

`ForkButton` and `ForkAttribution` use `lucide-react` (GitFork, Loader2, ExternalLink) while the project convention is `iconoir-react`. This is pre-existing technical debt — not blocking for this wiring work but should be addressed separately.

## Files to modify

1. `packages/shared/src/utils/permissions.ts` — relax `canForkTrip` + add auth guard
2. `packages/shared/src/utils/permissions.test.ts` — update tests for new behavior
3. `packages/shared/src/services/api.ts` — add `inviteCollaborator`
4. `packages/shared/src/services/index.ts` — export new function
5. `apps/web/components/calendar/sharing/ShareModal.tsx` — fix share link URL
6. `apps/web/components/calendar/CalendarDashboard.tsx` — wire ShareModal + ForkAttribution
7. `apps/web/components/trip/ForkButton.tsx` — change fork landing to `/trips`
8. `apps/web/app/(trips-app)/trip/[id]/share/[token]/page.tsx` — add router.push to /trips on fork
9. `apps/web/components/trips/TripCard.tsx` — add ForkCountBadge

## Out of scope

- Toast/notification after fork completes
- Email notifications for invites
- Mobile app wiring (web only)
- Explore/discover page fork buttons
- Read-only itinerary preview on share page
- ForkButton on CalendarDashboard for non-owner viewers (only on share landing page)
- Migrating lucide-react icons to iconoir-react in fork components
