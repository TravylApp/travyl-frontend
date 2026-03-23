# TRA-260 — Shared Calendar View Design

**Date:** 2026-03-23
**Branch:** feature/tra-260 (to be cut from feature/session-2026-03-23)
**Linear:** https://linear.app/travyl/issue/TRA-260

---

## Problem

The existing share page (`/trip/[id]/share/[token]`) shows a basic trip info card with a "Fork Trip" button. It does not show the calendar itinerary. Users sharing a trip link cannot see the actual schedule.

## Goal

When a trip owner shares a link, the recipient sees the full calendar view — read-only, with live updates as collaborators edit.

---

## Approach

**Anonymous Supabase session + Yjs real-time + existing permission system.**

Supabase supports `signInAnonymously()` which issues a real JWT with the `authenticated` role. The existing `TripPermissionProvider` already returns `{ canEdit: false, canDelete: false, canInvite: false }` for any user who isn't the owner or an accepted collaborator — including anonymous users. No new permission logic is needed.

`YjsTripProvider` connects with the anonymous session and provides live real-time updates — viewers see edits as they happen, same transport as authenticated collaborators.

---

## Changes

### 1. Supabase RLS Policies (migration)

Two new `SELECT` policies allowing any `authenticated` user (including anonymous) to read from `activity` and `yjs_documents` when the trip's `visibility = 'link'`:

```sql
-- activity: public read for link-shared trips
CREATE POLICY "public_read_link_trips_activity"
ON activity FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = activity.trip_id
    AND trips.visibility = 'link'
  )
);

-- yjs_documents: public read for link-shared trips
-- Note: yjs_documents.id is text (trip_id as key), trips.id is uuid — explicit cast required
CREATE POLICY "public_read_link_trips_yjs"
ON yjs_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id::text = yjs_documents.id
    AND trips.visibility = 'link'
  )
);
```

### 2. Share Page (`apps/web/app/(trips-app)/trip/[id]/share/[token]/page.tsx`)

Replace the current `SharedTripView` component with a `SharedCalendarPage`:

- On mount: instantiate a **dedicated secondary Supabase client** scoped to the share page:
  ```ts
  createClient(url, anonKey, { auth: { storageKey: 'travyl-share-session', persistSession: false } })
  ```
  This leaves the primary client and `useAuthStore` completely untouched — authenticated users who open a share link in the same browser are not signed out.
- Call `signInAnonymously()` on the secondary client, then `await` its resolution before fetching any data (RLS requires an `authenticated` role; sequencing matters).
- Check `supabase.auth.getSession()` on the **primary** client first — if a valid session already exists, use it directly and skip `signInAnonymously()` entirely (authenticated users should see the calendar as themselves, not as an anonymous guest).
- Fetch trip via existing `fetchTripByShareToken(token)` using the resolved session
- Verify `trip.id === id` param (existing guard)
- Render: `YjsTripProvider` → `CalendarDashboard` with `isSharedView={true}`
- `CalendarDashboard` already renders `TripPermissionProvider` internally — add an `isSharedView` prop that skips `fetchCollaborators` and forces viewer-only permission instead of querying collaborators
- Show a read-only banner above the calendar ("Viewing shared trip — read only")
- Keep the "Fork this trip" CTA accessible (e.g. in the banner or TripNavbar)
- Error states: invalid/expired token → show "Invalid or expired link" message (existing error UI); network failure → show generic error with retry

### 3. DndContext — disable when viewer

In `CalendarDashboard`, wrap `DndContext` with `disabled={!permission.canEdit}` so drag gestures do not fire at all for viewers. Currently mutations are blocked at the hook level but the drag gesture itself still fires, which is confusing UX.

### 4. TripNavbar — shared view adjustments

When `isSharedView={true}`:
- Hide the avatar dropdown entirely — anonymous users have no `user_metadata` (no display name, no email, no initials), and the sign-out button would destroy the anonymous session and break Yjs connectivity with no recovery path. Replace with a static "Viewing" label.
- Hide share button, settings link, and any mutation-triggering action
- `useEffectivePermission()` gates most actions already — verify all action buttons check `canEdit`/`canInvite` before rendering

### 5. ForYouPanel — hide on share page

`CalendarDashboard` always renders `ForYouPanel`, which calls `GET /suggest` via the SST API. The anonymous JWT is valid, so the call will succeed — but suggestions are irrelevant for a read-only viewer. When `isSharedView={true}`, skip rendering `ForYouPanel`.

### 6. Collaborator presence — skip on share page

`useCollaboratorPresence` broadcasts the current user's presence to the Realtime channel. Anonymous viewers would appear as ghost entries in the trip owner's collaborator avatar list. When `isSharedView={true}`, skip calling `useCollaboratorPresence`.

---

## Data Flow

```
Share page loads
  → supabase.auth.signInAnonymously()        (anonymous JWT, not stored in useAuthStore)
  → fetchTripByShareToken(token)             (existing, no auth required)
      → error/invalid → show error UI
  → YjsTripProvider(tripId)                  (real-time sync via y-supabase)
  → CalendarDashboard(isSharedView=true)
       → TripPermissionProvider internal     (skips fetchCollaborators, forces viewer)
       → DndContext(disabled=true)           (no drag gestures)
       → WeekView / DayView                  (display only)
       → EventBlock → CardPopover            (click to view details ✓)
       → ActivityEditModal                   (blocked by canEdit: false)
       → ForYouPanel                         (skipped)
       → useCollaboratorPresence             (skipped)
       → TripNavbar(isSharedView=true)       (no avatar dropdown, no share/settings)
```

---

## What Is NOT Changing

- `ShareModal`, `InviteBar`, `LinkSharingSection` — unchanged
- `fetchTripByShareToken` — unchanged
- `YjsTripProvider` internals — unchanged
- `TripPermissionProvider` logic — unchanged
- Activity detail click / `CardPopover` — works as-is (read-only display)

---

## Out of Scope

- Collaborator presence avatars on the share page (anonymous users have no display name)
- Share page on mobile (Expo app) — separate ticket
- `link_permission = 'edit'` share links — not implemented, viewer-only for now
  (Note: DB constraint uses `'edit'`, not `'editor'` — pre-existing mismatch with the TypeScript `LinkPermission = 'viewer' | 'editor'` type; file separate bug)

---

## Acceptance Criteria

1. Visiting `/trip/[id]/share/[token]` shows the full calendar with all activities
2. Activities update in real-time as the owner/collaborators make changes
3. Clicking an activity opens the detail popover (read-only)
4. No mutations are possible — drag-and-drop is disabled, edit modal does not open
5. A clear "read-only" banner is visible
6. Unauthenticated visitors see the calendar without being prompted to log in
7. Authenticated users visiting a share link see the same calendar (not redirected)
