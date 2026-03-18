# Trip Sharing & Post-it Notes — Design Spec

**Linear:** [TRA-204](https://linear.app/travyl/issue/TRA-204/trip-sharing-and-post-it-notes)
**Branch:** `feature/tra-204`
**Date:** 2026-03-17

---

## Overview

Add Google Docs-style trip sharing with three visibility tiers, per-collaborator roles, email invite flow via SST/SES, and free-floating post-it notes on the calendar canvas.

## Data Model

### `trips` table changes

Add two columns, remove three:

| Action | Column | Type | Default | Notes |
|--------|--------|------|---------|-------|
| ADD | `visibility` | text (enum) | `'private'` | `'private'` / `'link'` / `'public'`. Note: `'public'` is included in the enum for forward-compatibility but the UI to set it is deferred to Branch 2 (community fork/discover). |
| ADD | `link_permission` | text (enum) | `'viewer'` | `'viewer'` / `'editor'` — permission granted to anyone using the share link |
| DROP | `is_shared` | — | — | Replaced by `visibility != 'private'` |
| DROP | `is_public` | — | — | Replaced by `visibility == 'public'` |
| DROP | `share_link_role` | — | — | Replaced by `link_permission` |
| KEEP | `share_link_token` | text | null | Existing column, no change |

Migration must backfill:
- `is_public = true` → `visibility = 'public'`
- `is_shared = true AND is_public = false` → `visibility = 'link'`
- else → `visibility = 'private'`
- `share_link_role` value → `link_permission`

### `trip_collaborators` table changes

- `user_id` becomes **nullable** (pending invites have email but no user yet)
- `role_type` values: `'viewer'` | `'editor'` (no commenter)
- Add unique constraint: `(trip_id, invited_email)` to prevent duplicate invites

**RLS policies (updated for nullable user_id):**
- SELECT: `user_id = auth.uid()` OR user is trip owner OR (user_id IS NULL AND `invited_email` matches current user's email from `auth.jwt()`)
- INSERT: user is trip owner (only owners can create collaborator rows)
- UPDATE: user is trip owner (only owners can change roles)
- DELETE: user is trip owner OR `user_id = auth.uid()` (collaborator can remove themselves)

### `trip_notes` table (new)

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| trip_id | uuid | NO | FK → trips.id |
| user_id | uuid | NO | FK → auth.users |
| day | integer | NO | — (0-indexed day of trip) |
| hour | integer | NO | — (0-23) |
| text | text | NO | '' |
| color | text | NO | — (auto-assigned from author) |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |

**Triggers:**
- `moddatetime` trigger on `updated_at` to auto-update on row modification

**RLS policies:**
- SELECT: user is trip owner OR has a row in `trip_collaborators` for the trip
- INSERT: user is trip owner OR has `role_type = 'editor'` in `trip_collaborators`
- UPDATE: user is the note author (user_id matches)
- DELETE: user is the note author OR trip owner

## Routes

### `/t/[token]` — Unified share landing (Server Component)

Single route handles all share/invite scenarios. The token can be either a `share_link_token` (from the `trips` table) or an `invite_token` (from `trip_collaborators`).

**Resolution order:**
1. Look up token in `trip_collaborators.invite_token` first → if found, this is a per-user invite
2. If not found, look up in `trips.share_link_token` → this is a general share link
3. No match in either → 404

**Per-user invite flow** (token found in `trip_collaborators`):
1. User logged in + email matches invite → update row: set `user_id`, `invite_status = 'accepted'`, `accepted_at = now()` → redirect to `/trip/[id]`. Role comes from the invite row's `role_type`.
2. User logged in + email doesn't match → show error "This invite was sent to a different email"
3. Not logged in → show read-only trip preview with signup banner. After signup with matching email, auto-accept the invite.

**General share link flow** (token found in `trips`):
1. User logged in + already a collaborator → redirect to `/trip/[id]`
2. User logged in + has a pending invite by email → accept that invite (set `user_id`, `invite_status = 'accepted'`) → redirect to `/trip/[id]` with the invite's `role_type`
3. User logged in + no existing relationship → show trip preview with "Join" button. Clicking creates a `trip_collaborators` row with role = trip's `link_permission`
4. Not logged in → show read-only trip preview with signup banner

No separate `/invite/[token]` route.

### Middleware (`middleware.ts`)

- `/t/[token]` — pass through (Server Component handles all logic)
- `/trip/[id]/*` — check Supabase auth cookie. No session → redirect to `/login?redirect=/trip/[id]`
- All other routes — pass through

Middleware does NOT check collaborator roles. That's handled by `TripPermissionContext` on the client and RLS on the server.

## Permission System

### `TripPermissionContext`

React context wrapping `/trip/[id]` layout. Determines the user's effective role:

| Condition | Effective role |
|-----------|---------------|
| User is `trip.user_id` | `'owner'` |
| User has `trip_collaborators` row with `invite_status = 'accepted'` | Row's `role_type` |

The `/t/[token]` route always creates or accepts a collaborator row before redirecting to `/trip/[id]`, so every non-owner user on the trip page has a collaborator row. There is no "arrived via share link without a row" case.

Exposes `useEffectivePermission()` hook:

```ts
interface EffectivePermission {
  role: 'owner' | 'editor' | 'viewer'
  canEdit: boolean      // owner or editor
  canDelete: boolean    // owner only
  canInvite: boolean    // owner only
  canCreateNotes: boolean  // owner or editor
}
```

### UI gating

- **Viewers:** see everything, interact with nothing. Drag disabled, click-to-create disabled, no Shift+Click notes, no edit buttons.
- **Editors:** full activity CRUD, create/edit/drag notes, cannot invite or change visibility.
- **Owner:** everything editors can do + share modal access, invite, change visibility, delete any note.

### Security

RLS policies on Supabase are the real security layer. `TripPermissionContext` is for UI gating only. Even if a viewer somehow triggers a mutation client-side, RLS blocks it.

## Share Modal

Triggered by "Share" button in trip header (owner only). Google Docs-style single panel:

### Section 1: Email invite bar (top)

- Text input for email address
- Role dropdown: Viewer / Editor
- "Invite" button
- On submit: calls `POST /invite` Lambda → creates `trip_collaborators` row (pending), sends SES email with `/t/[token]` link
- Toast: "Invite sent to {email}"

### Section 2: Collaborator list (middle)

- Owner row: avatar, name, email, "Owner" label (non-editable)
- Each collaborator: avatar, name/email, role dropdown (owner can change), remove button (X)
- Pending invites: shown with amber "Pending" badge, can be removed (cancels invite)
- Data source: `useCollaborators(tripId)` hook

### Section 3: Link sharing (bottom)

- Separated by divider
- Link icon + "Anyone with the link" label
- If visibility is `'private'`: "Enable link sharing" toggle → sets visibility to `'link'`
- If visibility is `'link'` or `'public'`:
  - Permission dropdown: "Can view" / "Can edit" (updates `link_permission`)
  - "Copy link" button (copies `/t/[token]` URL, generates `share_link_token` if none exists)

## Post-it Notes

### Placement

Shift+Click on the time grid (inside `DayColumn`) creates a new note at the clicked day + hour.

### Rendering

Post-it notes render in `DayColumn` alongside `EventBlock` components. Notes use `position: absolute` within the hour cell, offset to the right side of the column to avoid overlapping activities. Z-index is above `EventBlock` so notes are always visible and clickable.

- Fixed size: ~120px wide, auto-height for text content
- Slight random rotation (-3 to +3 degrees, seeded from note `id` for consistency) for organic feel
- Background color: auto-assigned from author's collaborator color palette (5 colors: `#fef3c7`, `#dbeafe`, `#dcfce7`, `#fce7f3`, `#ede9fe`). Mapping: `COLORS[collaboratorIndex % COLORS.length]` where `collaboratorIndex` is the collaborator's position sorted by `created_at`. Owner is always index 0.
- Author initials badge in top-right corner
- Semi-transparent (`opacity: 0.9`) so activities beneath remain visible
- Hover reveals delete X button (for author and owner)

### Interaction

- **Create:** Shift+Click on time grid → new note at that position, auto-focused for typing
- **Edit:** Click on note → contentEditable, auto-focus. Save on blur via `trip_notes` upsert
- **Move:** Drag via dnd-kit (same DndContext as activities). Updates `day` + `hour` columns
- **Delete:** X button on hover. Author and owner can delete

### Real-time sync

Notes use Supabase Realtime Postgres Changes subscription (not Yjs). Simple CRUD rows with no conflict resolution needed. All collaborators see notes appear/move/update/delete in real-time.

### Drag data discrimination

Post-it notes use `{ type: 'note', note }` in drag data, distinct from activity drag data `{ type: 'activity', activity }`. `useCalendarDnd` checks `active.data.current.type` in `onDragEnd` to route to the correct handler.

## SST Infrastructure

### `POST /invite` Lambda

- Input: `{ tripId, email, role }`
- Auth: verify caller is trip owner (check JWT)
- Creates `trip_collaborators` row: `invite_status: 'pending'`, generates `invite_token`, sets `invited_email`
- Generates `share_link_token` on the trip if one doesn't exist yet
- Sends SES email with `/t/[invite_token]` link (per-user token, so the invite role is preserved)
- Returns: `{ collaboratorId, status: 'invited' }`

### `sst.aws.Email`

- SES identity for sending invite emails
- Template: simple branded email with trip name, inviter name, and CTA button linking to `/t/[token]`

## New Types (in `@travyl/shared`)

```ts
type Visibility = 'private' | 'link' | 'public'
type LinkPermission = 'viewer' | 'editor'
type CollaboratorRole = 'viewer' | 'editor'

interface TripNote {
  id: string
  trip_id: string
  user_id: string
  day: number
  hour: number
  text: string
  color: string
  created_at: string
  updated_at: string
}

interface TripCollaborator {
  id: string
  trip_id: string
  user_id: string | null
  invited_email: string | null
  invite_token: string | null
  role_type: CollaboratorRole
  invite_status: 'pending' | 'accepted' | 'declined'
  invited_by: string
  accepted_at: string | null
  created_at: string
}
```

## New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ShareModal` | `apps/web/components/calendar/` | Main share dialog |
| `CollaboratorList` | `apps/web/components/calendar/` | Avatar + role list inside ShareModal |
| `InviteBar` | `apps/web/components/calendar/` | Email + role + invite button |
| `LinkSharingSection` | `apps/web/components/calendar/` | Link toggle, permission, copy |
| `PostItNote` | `apps/web/components/calendar/` | Individual note on canvas |
| `ShareButton` | `apps/web/components/calendar/` | Button in trip header opening modal |

## New Hooks

| Hook | Location | Purpose |
|------|----------|---------|
| `useEffectivePermission` | `apps/web/components/calendar/providers/` | From TripPermissionContext |
| `useCollaborators` | `packages/shared/src/hooks/` | Fetch/mutate trip_collaborators, React Query |
| `useTripNotes` | `packages/shared/src/hooks/` | Fetch notes + Realtime subscription + CRUD |

## Modified Files

| File | Change |
|------|--------|
| `packages/shared/src/types/index.ts` | Add `TripNote`, `TripCollaborator`, `Visibility`, `LinkPermission`, `CollaboratorRole`. Update `Trip` type. |
| `apps/web/components/calendar/DayColumn.tsx` | Render `PostItNote` components, handle Shift+Click |
| `apps/web/components/calendar/hooks/useCalendarDnd.ts` | Handle note drag alongside activity drag |
| `apps/web/middleware.ts` | Add `/trip/*` auth redirect |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Wrap with `TripPermissionContext`, add ShareButton to header |
| `packages/shared/src/utils/permissions.ts` | Replace `is_shared`/`is_public`/`share_link_role` references with `visibility`/`link_permission`. `canViewTrip` checks `visibility != 'private'` or collaborator relationship. `canEditTrip` checks owner or editor collaborator. `canForkTrip` checks `visibility == 'public'`. |
| `packages/shared/src/services/api.ts` | Add collaborator + note API functions |
