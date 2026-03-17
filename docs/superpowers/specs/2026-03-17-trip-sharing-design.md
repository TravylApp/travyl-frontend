# Trip Sharing & Notes — Design Spec

**Date:** 2026-03-17
**Branch:** feature/tra-XXX (to be created)
**Scope:** Branch 1 of 2 — Sharing, permissions, and post-it notes. Branch 2 (community fork/discover) follows separately.

---

## Overview

Add Google Docs-style sharing to trips: a visibility toggle (private / link / public), a shareable link with a configurable permission level, per-collaborator roles, and free-floating post-it notes on the calendar canvas. The eventual goal is a community loop where public trips are featured on the home page and can be forked — that is Branch 2.

---

## Schema Changes

### `trips` — new columns

```sql
ALTER TABLE trips
  ADD COLUMN visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'link', 'public')),
  ADD COLUMN link_permission text NOT NULL DEFAULT 'view'
    CHECK (link_permission IN ('view', 'comment', 'edit')),
  ADD COLUMN share_link_token text UNIQUE;

-- Branch 2 (not in this branch):
-- ADD COLUMN forked_from_trip_id uuid REFERENCES trips(id),
-- ADD COLUMN fork_count integer NOT NULL DEFAULT 0
```

- `visibility = 'private'` — only owner and accepted collaborators can access.
- `visibility = 'link'` — anyone with the link gets `link_permission` access.
- `visibility = 'public'` — same as link, plus discoverable on the home page (Branch 2).
- `share_link_token` — generated on first share, regeneratable to invalidate old links.

### `trip_collaborators` — role_type extension

`role_type` already exists with default `'viewer'`. Extend valid values to `'viewer' | 'commenter' | 'editor'`. Existing rows are unaffected.

### New `trip_notes` table

```sql
CREATE TABLE trip_notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     uuid        NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL,
  activity_id uuid        REFERENCES activity(id) ON DELETE SET NULL,
  day         date,
  pos_x       numeric     NOT NULL DEFAULT 0.5,
  pos_y       numeric     NOT NULL DEFAULT 0.5,
  content     text        NOT NULL,
  color       text        NOT NULL DEFAULT 'yellow',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

- `pos_x` / `pos_y` — 0–1 fractions relative to the day column width and calendar height. Resolution-independent.
- `day` — anchors the note to a specific day column, so it stays visible regardless of which week is shown.
- `activity_id` — optional loose reference; notes can float freely or near an activity.
- `color` — auto-assigned per user from the presence color palette (no user picker).

---

## Permission Model

Three layers; the most permissive role for the authenticated user applies.

| Layer | Source |
|---|---|
| Owner | `trips.user_id = auth.uid()` |
| Collaborator | `trip_collaborators` where `user_id = auth.uid()` and `invite_status = 'accepted'` |
| Link | `trips.link_permission` when `visibility IN ('link', 'public')` and request includes valid `share_link_token` |

### Role capabilities

| Action | viewer | commenter | editor | owner |
|---|---|---|---|---|
| View trip & calendar | ✓ | ✓ | ✓ | ✓ |
| Add / move / delete notes | — | ✓ | ✓ | ✓ |
| Delete any note | — | — | — | ✓ |
| Edit activities (create / move / delete) | — | — | ✓ | ✓ |
| Manage collaborators | — | — | — | ✓ |
| Change visibility / regenerate link | — | — | — | ✓ |
| Delete trip | — | — | — | ✓ |

Enforcement is two-layer: **Supabase RLS policies** are the authoritative gate; the UI simply hides controls the user cannot use.

---

## Routes

| Route | Purpose |
|---|---|
| `/t/[token]` | Public share link — resolves `share_link_token`, determines effective permission, renders trip view |
| `/invite/[invite_token]` | Collaborator invite acceptance — flips `invite_status` to `accepted`, redirects to trip |

Both routes require authentication. Unauthenticated visitors are sent to `/login` with a redirect back.

---

## Sharing UI

### Share modal

Triggered by a **"Share" button** in the trip header (visible to owner only). The modal contains:

1. **Visibility selector** — segmented control: Private / Link / Public. Changing to Link or Public generates `share_link_token` if not already set.
2. **Share link row** — shows `travyl.app/t/[token]`, Copy button, Regenerate link option (invalidates old token).
3. **Link permission dropdown** — "Anyone with link can: View / Comment / Edit". Only visible when visibility is Link or Public.
4. **Collaborators section:**
   - Email input + role dropdown (Viewer / Commenter / Editor) + Invite button
   - List of existing collaborators with role dropdown (owner can change) and remove option
   - Pending invites shown with a "Pending" badge

### Invite flow

1. Owner submits email + role → `trip_collaborators` row created with `invite_status: 'pending'` and a generated `invite_token`.
2. Supabase Edge Function sends an email with link: `travyl.app/invite/[invite_token]`.
3. Recipient authenticates → Edge Function or API route flips `invite_status` to `'accepted'`, populates `user_id`, redirects to `/trip/[id]`.
4. Owner sees collaborator avatar appear in the trip header (existing Supabase Realtime presence).

---

## Post-it Notes

### Placement

- **Shift+Click** on any empty area of a day column places a note at that exact position (pos_x / pos_y computed from click coordinates relative to the column).
- Only available to users with `commenter` role or higher.
- No toolbar mode, no tooltips.
- **Mobile:** long-press on empty day space.

### Interactions

| Interaction | Behaviour |
|---|---|
| Shift+click empty space | Place new note; text input focused immediately |
| Click note | Edit content inline |
| Hover note | Shows ✕ button; drag handle visible |
| Drag note | Reposition within the same day column (dnd-kit) |
| ✕ button | Delete note (own notes only; owner can delete any) |

### Appearance

- Post-it note shape: slightly rotated rectangle with a subtle drop shadow.
- Color auto-assigned per user from the existing presence color palette — visually attributable without a picker.
- Author name shown in small text at the bottom of the note.
- Notes render in a layer above activities; they do not push activities around.

### Data flow

- Notes use React Query + direct Supabase write (not Yjs — they are not activity data).
- Optimistic update on place / move / delete; rollback on error.
- Realtime: subscribe to `trip_notes` changes via Supabase Realtime so all collaborators see notes appear live.

---

## Shared package additions

New exports from `@travyl/shared`:

- `useTripNotes(tripId)` — React Query hook, fetches and subscribes to notes for a trip
- `useNotesMutations(tripId)` — create / update / delete note mutations
- `useTripSharing(tripId)` — fetch / update visibility, link_permission, share_link_token
- `useCollaborators(tripId)` — fetch collaborator list, invite, update role, remove
- `TripNote`, `TripCollaborator`, `TripVisibility`, `LinkPermission` types

---

## Out of scope (Branch 1)

- Fork mechanic and fork count
- Discovery feed / home page evolution
- Public trip browse / search
- Mobile feature parity beyond long-press note placement

---

## Branch 2 preview

Branch 2 adds the community loop:
- `trips.forked_from_trip_id` + `trips.fork_count`
- Fork button on public trip view → copies trip + all activities into viewer's trips list with attribution
- Home page `/` evolved into a community feed ranked by fork count
