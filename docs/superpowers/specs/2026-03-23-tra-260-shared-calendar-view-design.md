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
CREATE POLICY "public_read_link_trips_yjs"
ON yjs_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM trips
    WHERE trips.id = yjs_documents.id
    AND trips.visibility = 'link'
  )
);
```

### 2. Share Page (`apps/web/app/(trips-app)/trip/[id]/share/[token]/page.tsx`)

Replace the current `SharedTripView` component with a `SharedCalendarPage`:

- On mount: call `supabase.auth.signInAnonymously()` — store session locally, do not write to global `useAuthStore`
- Fetch trip via existing `fetchTripByShareToken(token)`
- Verify `trip.id === id` param (existing guard)
- Render: `YjsTripProvider` → `TripPermissionProvider` → `CalendarDashboard`
- Show a read-only banner above the calendar ("Viewing shared trip — read only")
- Keep the "Fork this trip" CTA accessible (e.g. in the banner or TripNavbar)

### 3. DndContext — disable when viewer

In `CalendarDashboard`, wrap `DndContext` with `disabled={!permission.canEdit}` so drag gestures do not fire at all for viewers. Currently mutations are blocked at the hook level but the drag gesture itself still fires, which is confusing UX.

### 4. TripNavbar — shared view adjustments

When rendered on the share page, hide or disable:
- Share button (no point sharing from a shared view)
- Settings link
- Any action that calls a mutation

`useEffectivePermission()` gates most of these already — verify all action buttons check `canEdit`/`canInvite` before rendering.

---

## Data Flow

```
Share page loads
  → supabase.auth.signInAnonymously()        (anonymous JWT)
  → fetchTripByShareToken(token)             (existing, no auth required)
  → YjsTripProvider(tripId)                  (real-time sync via y-supabase)
  → TripPermissionProvider(trip, [])         (no collaborators match → viewer)
  → CalendarDashboard                        (read-only: no DnD, no mutations)
       → WeekView / DayView                  (display only)
       → EventBlock → CardPopover            (click to view details ✓)
       → ActivityEditModal                   (blocked by canEdit: false)
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
- `link_permission = 'editor'` share links — not implemented, viewer-only for now

---

## Acceptance Criteria

1. Visiting `/trip/[id]/share/[token]` shows the full calendar with all activities
2. Activities update in real-time as the owner/collaborators make changes
3. Clicking an activity opens the detail popover (read-only)
4. No mutations are possible — drag-and-drop is disabled, edit modal does not open
5. A clear "read-only" banner is visible
6. Unauthenticated visitors see the calendar without being prompted to log in
7. Authenticated users visiting a share link see the same calendar (not redirected)
