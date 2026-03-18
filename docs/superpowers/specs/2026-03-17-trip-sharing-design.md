# Trip Sharing & Notes — Design Spec

**Date:** 2026-03-17
**Branch:** feature/tra-XXX (to be created)
**Scope:** Branch 1 of 2 — Sharing, permissions, and post-it notes. Branch 2 (community fork/discover) follows separately.

---

## Overview

Add Google Docs-style sharing to trips: a visibility toggle (private / link / public), a shareable link with a configurable permission level, per-collaborator roles, and free-floating post-it notes on the calendar canvas. The eventual goal is a community loop where public trips are featured on the home page and can be forked — that is Branch 2.

---

## Schema Changes

### `trips` — replace old sharing columns

The existing `is_shared`, `share_link_role`, and `is_public` columns are **dropped** and replaced by `visibility` and `link_permission`. `share_link_token` already exists and is kept.

```sql
ALTER TABLE trips
  DROP COLUMN IF EXISTS is_shared,
  DROP COLUMN IF EXISTS share_link_role,
  DROP COLUMN IF EXISTS is_public,
  ADD COLUMN visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'link', 'public')),
  ADD COLUMN link_permission text NOT NULL DEFAULT 'view'
    CHECK (link_permission IN ('view', 'comment', 'edit'));
```

- `visibility = 'private'` — owner and accepted collaborators only.
- `visibility = 'link'` — anyone with a valid `share_link_token` gets `link_permission` access. Token validity is enforced by the Server Component (query filters `WHERE share_link_token = token`); RLS allows any authenticated user to read `link`-visibility trips.
- `visibility = 'public'` — any authenticated user, no token required. Unauthenticated access is **not** supported in Branch 1.
- `share_link_token` — already exists; generated on first share, regeneratable to invalidate old links. Reverting `visibility` to `'private'` makes any existing token inoperative.

**Accessing `/t/[token]` when `visibility = 'private'` or token not found:** Return a "This trip is private" page. Do not reveal trip existence to non-collaborators.

**Updated `trips` RLS SELECT policy:** Extend to allow any authenticated user to read trips where `visibility IN ('link', 'public')`. The Server Component WHERE clause (`share_link_token = token`) is the access gate for `link`-visibility trips; DB-level token verification is not performed in RLS.

**`Trip` type in `packages/shared/src/types/index.ts`:** Remove `is_shared`, `share_link_role`, `is_public`. Add:
```ts
visibility: 'private' | 'link' | 'public';
link_permission: 'view' | 'comment' | 'edit';
```

**`permissions.ts`:** Rewrite `canEditTrip`, `canViewTrip`, `canForkTrip` against `visibility` and `link_permission`. Remove all references to old fields.

**Mock data** (`mockTripsData.ts`, `mockItineraryData.ts`): Replace old fields with `visibility: 'private'`, `link_permission: 'view'`.

### `trip_collaborators` — relax `user_id`, extend `role_type`, constrain `invite_status`

Pending rows are created before the recipient authenticates, so `user_id` must be nullable. `role_type` gains `'commenter'`. `invite_token` must be unique. `invite_status` gets an explicit CHECK.

```sql
ALTER TABLE trip_collaborators
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE trip_collaborators
  DROP CONSTRAINT IF EXISTS trip_collaborators_role_type_check;
ALTER TABLE trip_collaborators
  ADD CONSTRAINT trip_collaborators_role_type_check
  CHECK (role_type IN ('viewer', 'commenter', 'editor'));

ALTER TABLE trip_collaborators
  DROP CONSTRAINT IF EXISTS trip_collaborators_invite_status_check;
ALTER TABLE trip_collaborators
  ADD CONSTRAINT trip_collaborators_invite_status_check
  CHECK (invite_status IN ('pending', 'accepted', 'cancelled'));

ALTER TABLE trip_collaborators
  ADD CONSTRAINT trip_collaborators_invite_token_key UNIQUE (invite_token);
```

On acceptance, `user_id` is set to `auth.uid()` and `invite_status` flips to `'accepted'`. When the owner cancels a pending invite from the modal, `invite_status` is set to `'cancelled'`.

### New `trip_notes` table

```sql
CREATE TABLE trip_notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_id uuid        REFERENCES activity(id) ON DELETE SET NULL,
  day         date        NOT NULL,
  pos_x       numeric     NOT NULL DEFAULT 0.5,
  pos_y       numeric     NOT NULL DEFAULT 0.5,
  content     text        NOT NULL DEFAULT '',
  color       text        NOT NULL DEFAULT '#ffd93d',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

- `user_id` — nullable (`ON DELETE SET NULL`). Notes inserted by authenticated users (including link visitors) always have a non-null `user_id`. Ownerless notes (`user_id IS NULL`) only arise when a user account is later deleted — not during normal use. Ownerless notes can only be deleted by the trip owner.
- `day` — NOT NULL. Written as `new Date(tripStartDate.getTime() + dayIndex * 86400000)` (same formula `DayColumn` uses internally to compute `columnDate`). The note-placement handler receives `tripStartDate` and `dayIndex` from the `DayColumn` context and computes the date identically — no new prop required on `DayColumn`.
- `pos_x` / `pos_y` — 0–1 fractions of the day column's `getBoundingClientRect()` at placement or drag-end. Clamped to [0.05, 0.95]. Not viewport-relative.
- `activity_id` — **unused in Branch 1.** Always `null`. Reserved for future use.
- `color` — CSS hex string. Written from `pickColor(userId)` on insert; stored value used at render, never recomputed. Palette changes don't retroactively affect existing notes.

### RLS policies for `trip_notes`

Token validation for `link`-visibility trips is the Server Component's responsibility (WHERE clause). RLS trusts that any authenticated user who reached the calendar already has access.

```sql
ALTER TABLE trip_notes ENABLE ROW LEVEL SECURITY;

-- SELECT: trip owner, accepted collaborators, or link/public trips (token verified by server)
CREATE POLICY "trip_notes_select" ON trip_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM trips t WHERE t.id = trip_notes.trip_id AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trip_collaborators tc
          WHERE tc.trip_id = t.id AND tc.user_id = auth.uid() AND tc.invite_status = 'accepted'
        )
        OR t.visibility IN ('link', 'public')
      )
    )
  );

-- INSERT: authenticated user, and has write permission on the trip
CREATE POLICY "trip_notes_insert" ON trip_notes
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM trips t WHERE t.id = trip_notes.trip_id AND (
        t.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM trip_collaborators tc
          WHERE tc.trip_id = t.id AND tc.user_id = auth.uid()
            AND tc.invite_status = 'accepted'
            AND tc.role_type IN ('commenter', 'editor')
        )
        OR (t.visibility IN ('link','public') AND t.link_permission IN ('comment','edit'))
      )
    )
  );

-- UPDATE: own notes only
CREATE POLICY "trip_notes_update" ON trip_notes
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: own notes OR trip owner; ownerless notes (user_id IS NULL) by trip owner only
CREATE POLICY "trip_notes_delete" ON trip_notes
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM trips t WHERE t.id = trip_notes.trip_id AND t.user_id = auth.uid()
    )
  );
```

---

## Permission Model

Three layers; most permissive role for the authenticated user applies.

| Layer | Source |
|---|---|
| Owner | `trips.user_id = auth.uid()` |
| Collaborator | `trip_collaborators` where `user_id = auth.uid()` and `invite_status = 'accepted'` |
| Link | `trips.link_permission` when `visibility = 'link'` (token verified by Server Component); or `visibility = 'public'` (no token required) |

### Effective permission resolution (`useEffectivePermission`)

The Server Component at `/t/[token]` resolves the trip and its `link_permission`, then places it in a `TripPermissionContext`. `useEffectivePermission(tripId)` resolves the effective role using this precedence:

1. **Owner** → always `'edit'`
2. **Accepted collaborator** (has a row in `trip_collaborators`) → collaborator `role_type` is used **as-is**. Link permission does **not** override or elevate a collaborator's explicit role. If an editor link is active but the user's collaborator role is `'viewer'`, they get `'viewer'`.
3. **No collaborator row** (link visitor or public visitor) → `link_permission` from `TripPermissionContext`.

On `/trip/[id]` (owner's own route), context is initialised with `'edit'`.

### Role capabilities

| Action | viewer | commenter | editor | owner |
|---|---|---|---|---|
| View trip & calendar | ✓ | ✓ | ✓ | ✓ |
| Add / move / delete own notes | — | ✓ | ✓ | ✓ |
| Delete any note | — | — | — | ✓ |
| Edit activities (create / move / delete) | — | — | ✓ | ✓ |
| Manage collaborators | — | — | — | ✓ |
| Change visibility / regenerate link | — | — | — | ✓ |
| Delete trip | — | — | — | ✓ |

RLS policies are the authoritative gate; the UI hides unavailable controls.

### Non-owner permission indicator

Non-owners see a read-only role badge in the trip header ("Viewing", "Commenting", "Editing"). The Share button is not shown to non-owners.

---

## Routes

| Route | File location | Purpose |
|---|---|---|
| `/t/[token]` | `apps/web/app/t/[token]/page.tsx` (root level, **outside** `(main)/`) | New share URL — renders full calendar with permission gating. No `(main)` navbar/sidebar shell. |
| `/invite/[invite_token]` | `apps/web/app/invite/[invite_token]/page.tsx` (root level) | Collaborator invite acceptance |
| `/trip/[id]/share/[token]` | `apps/web/app/(main)/trip/[id]/share/[token]/page.tsx` | Existing summary view — **untouched in Branch 1** |

### `middleware.ts` (new file: `apps/web/middleware.ts`)

`(main)/layout.tsx` has no auth check (confirmed). The only auth enforcement is client-side. Middleware is the new gate.

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Preserve the existing unauthenticated-friendly summary view
  if (/^\/trip\/[^/]+\/share\//.test(request.nextUrl.pathname)) {
    return NextResponse.next()
  }
  // Auth check: read Supabase session cookie; redirect to /login?redirect=... if absent
}

export const config = {
  matcher: ['/t/:path*', '/invite/:path*', '/trip/:path*'],
}
```

### `/t/[token]` — token resolution and security model

**File:** `apps/web/app/t/[token]/page.tsx` — Next.js Server Component.

Uses the regular Supabase client (publishable key):
```ts
supabase.from('trips').select('*').eq('share_link_token', token).neq('visibility', 'private').single()
```

**Token security trade-off:** The extended `trips` RLS SELECT policy allows any authenticated user to read `link`/`public` trips. This means an authenticated user who knows a `trip_id` can query the trip directly without presenting the token. The token is enforced by the Server Component's WHERE clause — not at the DB level. This is an accepted trade-off (consistent with how most share-link systems work at the application layer). This is explicitly not a DB-enforced security guarantee.

On success: passes `tripId` and resolved `link_permission` to a `TripPermissionProvider` wrapping the client tree. Shows a loading skeleton during resolution.

On failure (no row / `visibility = 'private'`): renders "This trip is private" page (does not leak trip existence).

Client mounts `YjsTripProvider` + `CalendarDashboard`. Effective permission computed by `useEffectivePermission(tripId)`. Yjs provisioned for all permission levels. Permission gating:
- **viewer** — calendar read-only; drag disabled; no create/edit controls; Shift+Click is a no-op; notes visible but not editable.
- **commenter** — same as viewer, plus Shift+Click places notes; own notes editable/deletable.
- **editor** — full calendar editing, same as an accepted editor collaborator.

### `/invite/[invite_token]` error cases

| Condition | Behaviour |
|---|---|
| Token not found | 404 page |
| Already accepted | Redirect to `/trip/[id]` (idempotent) |
| `auth.users.email` ≠ `invited_email` | Error page: "This invite was sent to a different email address." No state change. |
| Valid token, email matches, status pending | Accept: `invite_status = 'accepted'`, `user_id = auth.uid()`, redirect to `/trip/[id]` |

Email comparison uses `auth.users.email` (Supabase Auth canonical email), not `profiles.email`.

---

## Sharing UI

### Share modal

Triggered by **"Share" button** in the trip header (owner only). Non-owners see the role badge instead.

1. **Visibility selector** — segmented control: Private / Link / Public. Switching to Link or Public generates `share_link_token` (UUID v4) if not set.
2. **Share link row** — `travyl.app/t/[token]`, Copy, Regenerate (new token; old links stop working). Shown when `visibility != 'private'`.
3. **Link permission dropdown** — "Anyone with link can: View / Comment / Edit". Shown when `visibility != 'private'`.
4. **Collaborators section:**
   - Email input + role dropdown (Viewer / Commenter / Editor) + Invite button
   - Accepted collaborators: avatar, name/email, role dropdown (owner can change), ✕ remove
   - Pending invites: email, role, "Pending" badge, Resend and Cancel options. Cancel sets `invite_status = 'cancelled'`.

### Invite flow

1. Owner submits email + role → `trip_collaborators` row: `invite_status: 'pending'`, `user_id: null`, `invite_token: UUID v4`, `invited_by: auth.uid()`, `role_type`.
2. Client calls `supabase.functions.invoke('send-invite-email', { body: { inviteToken, invitedEmail, tripTitle, inviterName } })`. On failure: pending row remains; toast error in modal; owner can Resend from the list.
3. Recipient authenticates (token in `?redirect=` URL) → `/invite/[token]` validates → accept → `/trip/[id]`.
4. Owner sees collaborator avatar appear live via Supabase Realtime.

---

## Post-it Notes

### Placement

- **Shift+Click** on any empty area of a day column.
- `pos_x = (event.clientX - rect.left) / rect.width`, `pos_y = (event.clientY - rect.top) / rect.height`, clamped to [0.05, 0.95].
- `day` computed as `new Date(tripStartDate.getTime() + dayIndex * 86400000)` — uses `tripStartDate` and `dayIndex` already available in `DayColumn`'s render scope. No new prop added to `DayColumn`.
- **Existing `onCreateActivity` click handler** in `DayColumn` must be updated to skip when `e.shiftKey === true`. Note placement takes precedence over activity creation on Shift+Click.
- Commenter role or higher only. Shift+Click is a no-op for viewers.
- **Mobile:** long-press (300ms threshold) on empty day space.

### Note dragging — same day column only

Each day column's note overlay is wrapped in its own isolated `DndContext`, separate from the activity `DndContext` on `WeekView`/`CalendarDashboard`:

```tsx
<DndContext sensors={sensors} onDragEnd={handleNoteDragEnd}>
  {/* note overlays for this day column only */}
</DndContext>
```

- **Sensors:** `PointerSensor` with `activationConstraint: { distance: 5 }`.
- **Collision detection:** not needed — only one droppable zone per context (the column itself).
- **`onDragEnd`:** if `event.over` is the column's own droppable ID, update `pos_x`/`pos_y` from the delta and persist. Otherwise (`over` is null or mismatched), discard — note snaps back.
- Position saved on `dragEnd` only. Optimistic update on drag start; rollback on Supabase error.

Cross-day dragging is **not supported in Branch 1.**

### Visual position across views

Same stored fractions render at different absolute pixels in week view vs day view (different column widths). Acceptable — note is anchored to the correct day in both views.

### Color

`pickColor(userId: string): string` — deterministic hash in `useCollaboratorPresence.ts`. Move it and its palette to `@travyl/shared` and export. Called on note insert; result stored in `trip_notes.color`. Stored value is used at render time — `pickColor` is not re-called. Ownerless notes (`user_id IS NULL`) render with their stored color and show "Unknown" as author.

### Content editing

Click a note to edit inline. Content saved **on blur**. On Supabase failure: revert to pre-edit value and surface a toast. Handled by `useNotesMutations.updateNoteContent`.

### Interactions

| Interaction | Behaviour |
|---|---|
| Shift+click empty space | Place note; `day` from `tripStartDate + dayIndex`; `content = ''`; input focused |
| Click note | Edit inline; save on blur |
| Hover note | Shows ✕ and drag handle (⠿) |
| ✕ button | Shown only when `note.user_id === currentUserId` OR user is owner. Deletes note. RLS rejects unauthorized; hook rolls back. |
| Drag (handle) | Reposition in same column; save on dragEnd |

### Appearance

- Slightly rotated rectangle, drop shadow, post-it aesthetic.
- Color from `pickColor(userId)`. No user-facing picker.
- Author display name at bottom. Ownerless notes show "Unknown".
- Renders above activities (higher z-index). Does not push activities.

### Data flow

- React Query + direct Supabase write (not Yjs).
- `useTripNotes` called inside the calendar component tree (inside `YjsTripProvider`).
- Realtime: `postgres_changes`, event `*`, filter `trip_id=eq.{tripId}`, channel `trip-notes:{tripId}`.
  - INSERT → upsert into cache by `id`.
  - UPDATE → update cached entry by `id`.
  - DELETE → remove from cache by `id`.
  - Optimistic entries use the real server `id` on create; subsequent Realtime INSERT deduplicates by `id`.

---

## Shared package additions

New exports from `@travyl/shared`:

- `pickColor(userId: string): string` — moved from `useCollaboratorPresence.ts`
- `useTripNotes(tripId)` — React Query + Realtime subscription
- `useNotesMutations(tripId)` — `createNote` / `updateNotePosition` / `updateNoteContent` / `deleteNote` with optimistic updates
- `useTripSharing(tripId)` — `visibility` / `link_permission` / `share_link_token` CRUD
- `useCollaborators(tripId)` — list / invite / update-role / remove / resend / cancel
- `useEffectivePermission(tripId)` — reads `TripPermissionContext` (set by Server Component) and `trip_collaborators`; returns most permissive role
- `TripPermissionContext` / `TripPermissionProvider` — React context providing resolved permission to the calendar tree
- Updated `Trip` type: remove `is_shared`, `share_link_role`, `is_public`; add `visibility`, `link_permission`
- New types: `TripNote`, `TripVisibility`, `LinkPermission`, `CollaboratorRole`
- Updated `permissions.ts`: rewrite `canEditTrip`, `canViewTrip`, `canForkTrip` against new fields

---

## Out of scope (Branch 1)

- Fork mechanic and fork count
- Discovery feed / home page evolution
- Public trip browse / search
- Cross-day note dragging
- Mobile feature parity beyond long-press note placement
- Modifying the existing `/trip/[id]/share/[token]` summary view
- Unauthenticated (anonymous) access to public trips

---

## Branch 2 preview

- `trips.forked_from_trip_id` + `trips.fork_count`
- Fork button on any public trip → copies trip + all activities into viewer's trips list with attribution
- Home page `/` evolved into a community feed ranked by fork count
