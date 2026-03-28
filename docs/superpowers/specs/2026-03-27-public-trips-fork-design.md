# Public Trips & Fork Flow — Design Spec

**Date:** 2026-03-27
**Status:** Approved

---

## Problem

Three root causes prevent sharing/forking from working end-to-end:

1. **Explore page always empty** — `fetchPublicTrips` queries `is_public = true` but `updateTripVisibility` only sets the `visibility` column. The columns are out of sync and no UI exists to make a trip public.
2. **Fork count silently fails** — Post-security-hardening RLS blocks non-owners from updating another user's trip row. The `fork_count++` call `console.warn`s and is ignored. The fork creation itself succeeds but users receive no feedback.
3. **No post-fork UX** — `useForkTrip` invalidates queries but does not navigate or notify. Users cannot find their copy.

---

## Scope

Three focused changes, no new routes or pages:

1. Fix the data layer inconsistency between `visibility` and `is_public`
2. Add a "Make Public" toggle to the existing ShareModal
3. Navigate to the forked trip on success; surface a sign-in prompt for unauthenticated users

---

## Section 1: Data Layer

### `fetchPublicTrips` (packages/shared/src/services/api.ts)

Change the Supabase query filter from:
```
.or('is_public.eq.true,is_shared.eq.true')
```
to:
```
.eq('visibility', 'public')
```

This aligns with the `visibility` column that `updateTripVisibility` actually writes.

### `updateTripVisibility` (packages/shared/src/services/api.ts)

When writing the `visibility` column, also sync `is_public`:
- `visibility = 'public'` → `is_public = true`
- `visibility = 'private'` or `'link'` → `is_public = false`

Keeps both columns consistent for any code that may query either.

### Fork count RPC (Supabase migration)

Add a SQL migration to create:

```sql
CREATE OR REPLACE FUNCTION increment_fork_count(trip_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE trips SET fork_count = fork_count + 1 WHERE id = trip_id;
END;
$$;
```

`SECURITY DEFINER` means the function runs as the DB owner, bypassing RLS. `forkTrip` in api.ts calls `supabase.rpc('increment_fork_count', { trip_id: tripId })` instead of the raw `.update()`.

---

## Section 2: "Make Public" Toggle in ShareModal

### New component: `PublicSharingSection`

A new section rendered inside `ShareModal` (above `LinkSharingSection`), visible only to the trip owner.

**UI:**
- Row with a toggle switch
- Label: "Public on Explore"
- Subtitle: "Anyone can find and fork this trip on the Explore page"

**Behavior:**
- Toggle ON: calls `updateTripVisibility(tripId, 'public')` — trip appears in `/explore`
- Toggle OFF: restores previous non-public visibility
  - If trip had `visibility = 'link'` before being made public, restore to `'link'`
  - Otherwise restore to `'private'`
  - Track prior state in component local state (set when modal opens, before any toggle)

**Owner-only:** section does not render if `!isOwner`.

### ShareModal wiring

Add `onTogglePublic` handler alongside existing `handleToggleLinkSharing`. Pass current `trip.visibility` and `trip.link_permission` into `PublicSharingSection`.

---

## Section 3: Post-Fork UX

### `useForkTrip` hook (packages/shared/src/hooks/useForkTrip.ts)

No API change — mutation already returns the new `Trip`. The hook exposes `onSuccess` through React Query's mutation callbacks. Callers handle navigation.

### `PublicTripCard` (apps/web/app/(main)/explore/page.tsx + user/[username]/page.tsx)

On fork success: call `router.push(`/trip/${newTrip.id}`)` to navigate the user directly to their copy. This is the clearest feedback — the user lands on their own editable trip.

On fork error: show a brief inline error below the fork button ("Fork failed — try again"). Clear the error when the user tries again.

**Unauthenticated users:**
- Currently `canForkTrip` returns false for null userId, so the button is hidden entirely.
- Change: if the user is not logged in, render a "Sign in to fork" button (same visual style) that links to `/login?redirect=/explore`. This surfaces the action exists even before auth.

### Fork button loading state

During the fork mutation: show a spinner inside the button and disable it. Already implemented via `isPending` — no change needed.

---

## Files Changed

| File | Change |
|---|---|
| `packages/shared/src/services/api.ts` | Fix `fetchPublicTrips` filter; sync `is_public` in `updateTripVisibility`; call RPC for fork count |
| `packages/shared/src/hooks/useForkTrip.ts` | No change — callers handle navigation |
| `apps/web/components/calendar/sharing/ShareModal.tsx` | Add `PublicSharingSection` + `onTogglePublic` handler |
| `apps/web/components/calendar/sharing/PublicSharingSection.tsx` | New component |
| `apps/web/app/(main)/explore/page.tsx` | Add router.push on fork success; add sign-in prompt for anon |
| `apps/web/app/(main)/user/[username]/page.tsx` | Same fork UX changes |
| Supabase migration | `increment_fork_count` RPC |

---

## Out of Scope

- A public trip discovery feed with filters (destination, duration, traveler count) — deferred
- Fork attribution UI on the forked trip (e.g. "forked from @user") — deferred
- Email notifications when someone forks your trip — deferred
- Mobile app sharing/fork UI — deferred
