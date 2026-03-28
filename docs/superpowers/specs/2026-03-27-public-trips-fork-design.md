# Public Trips & Fork Flow — Design Spec

**Date:** 2026-03-27
**Status:** Approved

---

## Problem

Three root causes prevent sharing/forking from working end-to-end:

1. **Explore page always empty** — `fetchPublicTrips` queries `is_public = true` but `updateTripVisibility` only sets the `visibility` column. The columns are out of sync and no UI exists to make a trip public.
2. **Fork count silently fails** — Post-security-hardening RLS blocks non-owners from updating another user's trip row. The `fork_count++` call `console.warn`s and is ignored.
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

**Decision:** Link-shared trips (`visibility = 'link'`) intentionally do NOT appear on Explore. Explore is only for truly public trips.

### `fetchUserPublicTrips` (packages/shared/src/services/api.ts)

Change the filter from:
```
.eq('is_public', true)
```
to:
```
.eq('visibility', 'public')
```

Both public trip queries must use `visibility` as the source of truth, not `is_public`.

### `updateTripVisibility` (packages/shared/src/services/api.ts)

Current signature: `updateTripVisibility(tripId: string, visibility: Visibility, linkPermission?: LinkPermission)`

No signature change. The Supabase update call in this function must include `is_public` in the same update object:
- `visibility = 'public'` → also write `is_public: true`
- `visibility = 'private'` or `'link'` → also write `is_public: false`

This keeps both columns in sync for any code that may still query `is_public` directly.

### `forkTrip` (packages/shared/src/services/api.ts)

The current code at the end of `forkTrip` (lines ~248–255) does a read-then-write increment:
```ts
await supabase
  .from('trips')
  .update({ fork_count: (originalTrip.fork_count || 0) + 1 })
  .eq('id', tripId)
```

Replace this with an RPC call:
```ts
await supabase.rpc('increment_fork_count', { trip_id: tripId })
```

No other changes to `forkTrip`. The RLS-failing raw `.update()` is the only source trip mutation.

### Supabase migration

Single migration file:

```sql
-- Backfill 1: sync visibility for rows where is_public = true
UPDATE trips
SET visibility = 'public'
WHERE is_public = true
  AND visibility IS DISTINCT FROM 'public';

-- Backfill 2: sync visibility for rows where is_shared = true (link-shared trips)
UPDATE trips
SET visibility = 'link'
WHERE is_shared = true
  AND is_public = false
  AND visibility IS DISTINCT FROM 'link';

-- RPC: increment fork_count bypassing RLS, restricted to authenticated users
-- Also validates that the target trip is publicly visible (prevents count abuse on private trips)
CREATE OR REPLACE FUNCTION increment_fork_count(trip_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trip_visibility text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT visibility INTO trip_visibility FROM trips WHERE id = trip_id;

  IF trip_visibility IS DISTINCT FROM 'public' THEN
    RAISE EXCEPTION 'Trip is not public';
  END IF;

  UPDATE trips SET fork_count = fork_count + 1 WHERE id = trip_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_fork_count(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION increment_fork_count(uuid) FROM anon;
```

A no-op (0 rows updated in the final UPDATE) is tolerated — if the source trip was deleted between fork creation and counter increment, the fork still exists and the stale counter is acceptable.

---

## Section 2: "Make Public" Toggle in ShareModal

### New component: `PublicSharingSection`

A new section rendered inside `ShareModal` (above `LinkSharingSection`), visible only to the trip owner.

**Props:**
```ts
interface PublicSharingSectionProps {
  tripId: string
  currentVisibility: Visibility
  currentLinkPermission: LinkPermission
  isOwner: boolean
  onSettingsChange: () => Promise<void>
}
```

**UI:**
- Row with a toggle switch
- Label: "Public on Explore"
- Subtitle: "Anyone can find and fork this trip on the Explore page"

**Behavior — derived state:**

`isPublic` is derived from props: `currentVisibility === 'public'`. No local toggle state — the trip object refreshed via `onSettingsChange` is the source of truth. Updates are server-confirmed (not optimistic): the toggle awaits `updateTripVisibility`, then calls `onSettingsChange()`.

**Behavior — prior state for restore:**

Prior state is captured in refs at the moment the user first toggles ON (not at mount), so that if the component stays mounted across multiple cycles, the snapshot is always relative to the most recent toggle-on:

```ts
const hasToggledOnRef = useRef(false)
const priorVisibilityRef = useRef<Visibility>(currentVisibility)
const priorLinkPermissionRef = useRef<LinkPermission>(currentLinkPermission)

const handleToggle = async () => {
  if (!isPublic) {
    // Toggling ON — snapshot current state before changing
    if (!hasToggledOnRef.current) {
      priorVisibilityRef.current = currentVisibility
      priorLinkPermissionRef.current = currentLinkPermission
      hasToggledOnRef.current = true
    }
    await updateTripVisibility(tripId, 'public')
  } else {
    // Toggling OFF — restore to priorVisibilityRef exactly
    // Pass priorLinkPermissionRef only if prior visibility was 'link'
    if (priorVisibilityRef.current === 'link') {
      await updateTripVisibility(tripId, 'link', priorLinkPermissionRef.current)
    } else {
      await updateTripVisibility(tripId, 'private')
    }
    hasToggledOnRef.current = false
  }
  await onSettingsChange()
}
```

**Owner-only:** section does not render if `!isOwner`.

### ShareModal wiring

`ShareModal` renders `<PublicSharingSection>` with:
- `tripId={trip.id}`
- `currentVisibility={trip.visibility}`
- `currentLinkPermission={trip.link_permission}`
- `isOwner={isOwner}`
- `onSettingsChange={onSettingsChange}` (the existing prop on ShareModal)

`onSettingsChange` in ShareModal calls `queryClient.invalidateQueries({ queryKey: ['trip', trip.id] })` — same pattern used for collaborator updates.

---

## Section 3: Post-Fork UX

### `useForkTrip` hook

No change. Mutation already returns the new `Trip`. Callers handle navigation via React Query's `onSuccess`.

### `PublicTripCard` (explore/page.tsx + user/[username]/page.tsx)

Both files define a `PublicTripCard` component. Apply the same changes to both:

**Fork success:** `router.push(`/trip/${newTrip.id}`)` (`router` from `useRouter()`).

**Fork error:** Inline error beneath the fork button: "Fork failed — try again". Clear `forkError` state when the user clicks again.

**Rendering logic (replaces current `canForkTrip` gate):**

```
if user === null:
  render "Sign in to fork" button → /login?redirect=${pathname}
else if canForkTrip(trip, user.id) is true:
  render fork button (existing behavior)
else:
  render nothing (user is the owner)
```

`pathname` is from `usePathname()` (next/navigation) — SSR-safe. `canForkTrip` is only used to gate the mutation call, not rendering; rendering is gated on the `user === null` check directly.

---

## Files Changed

| File | Change |
|---|---|
| `packages/shared/src/services/api.ts` | Fix `fetchPublicTrips` + `fetchUserPublicTrips` filters; sync `is_public` in `updateTripVisibility`; call RPC in `forkTrip` |
| `packages/shared/src/hooks/useForkTrip.ts` | No change |
| `apps/web/components/calendar/sharing/ShareModal.tsx` | Render `PublicSharingSection` with props |
| `apps/web/components/calendar/sharing/PublicSharingSection.tsx` | New component |
| `apps/web/app/(main)/explore/page.tsx` | router.push on fork success; sign-in prompt using usePathname; updated rendering logic |
| `apps/web/app/(main)/user/[username]/page.tsx` | Same fork UX changes |
| Supabase migration | Backfill + `increment_fork_count` RPC |

---

## Out of Scope

- Public trip discovery feed with filters — deferred
- Fork attribution UI on the forked trip — deferred
- Email notifications when someone forks your trip — deferred
- Mobile app sharing/fork UI — deferred
