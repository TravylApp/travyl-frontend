# Activity Polls — Collaborative Voting on Activities

**Date:** 2026-03-21
**Branch:** TBD
**Status:** Draft

## Goal

Let trip collaborators vote on whether an activity should stay or go. A poll is started on a specific activity, collaborators vote yes/no, and the result either keeps the activity or grays it out as "should be removed." No separate poll UI — voting lives directly on the calendar's activity cards.

## Concepts

- **Poll:** A yes/no vote attached to a single activity. One active poll per activity at a time.
- **Active poll:** Voting is open. The activity card shows an inline vote bar.
- **Resolved poll:** Voting is closed. Result is either "keep" (card returns to normal) or "remove" (card grays out).
- **Grayed-out activity:** An activity whose poll resolved to "remove." Still visible on the calendar at reduced opacity, with restore/remove actions. Not auto-deleted.

## Data Model

### Yjs Structure

A new `pollsMap` (`Y.Map<Y.Map<unknown>>`) lives alongside the existing `activitiesMap` in the trip's Yjs document. Keyed by activity ID (one poll per activity).

Each poll entry's Y.Map contains:

| Key | Type | Description |
|-----|------|-------------|
| activityId | string | Matches the activity key |
| startedBy | string | userId of poll creator |
| startedAt | string | ISO timestamp |
| vote:{userId} | `'yes'` \| `'no'` | One key per voter (e.g. `vote:abc-123`) |
| status | string | `'active'` or `'resolved'` |
| result | string | `'keep'`, `'remove'`, or `''` (empty while active) |

Votes use per-user keys (`vote:{userId}`) directly on the poll's Y.Map rather than a single JSON blob. This ensures concurrent votes from different users merge correctly via Yjs CRDT semantics — two users voting at the same time won't overwrite each other. To read all votes, iterate the Y.Map keys that start with `vote:`.

When a poll resolves to "remove", the activity's own Y.Map entry gets a `pollResult: 'remove'` field. This is what drives the grayed-out rendering. Restoring an activity clears this field and deletes the poll from `pollsMap`.

### Supabase Table: `activity_polls`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| trip_id | uuid | NO | FK → trips(id) ON DELETE CASCADE |
| activity_id | uuid | NO | FK → activity(id) ON DELETE CASCADE |
| started_by | uuid | NO | FK → auth.users(id) |
| votes | jsonb | NO | '{}' |
| status | text | NO | 'active' |
| result | text | YES | null |
| created_at | timestamptz | NO | now() |
| resolved_at | timestamptz | YES | null |

The `votes` column stores a `Record<userId, 'yes' | 'no'>` JSON object, flushed from the Yjs `vote:*` keys.

**Constraints:**
- Partial unique index on `(trip_id, activity_id) WHERE status = 'active'` — one *active* poll per activity (resolved polls are deleted from both `pollsMap` and Supabase when a new poll starts or on restore)
- RLS: trip members can read/write polls for their trips

### CalendarActivity Extension

Add optional field to the existing `CalendarActivity` interface:

```typescript
pollResult?: 'remove'  // set when poll resolves to "remove"
```

This field is synced via Yjs (`CALENDAR_ACTIVITY_KEYS` gets `pollResult` added) and flushed to Supabase's `activity_data` jsonb column. The `ActivityData` interface in `packages/shared/src/types/index.ts` also needs `pollResult?: 'remove'` added.

### Poll Type

```typescript
interface Poll {
  activityId: string
  startedBy: string
  startedAt: string
  status: 'active' | 'resolved'
  result: 'keep' | 'remove' | ''
  votes: Record<string, 'yes' | 'no'>  // derived from vote:* keys on the Y.Map
}
```

## UI Components

### ActivityContextMenu

**New component:** `apps/web/components/calendar/ActivityContextMenu.tsx`

A floating context menu triggered by right-click on any EventBlock. Positioned at cursor coordinates, clamped to viewport.

**Menu items:**
- Cut (disabled — wired later)
- Duplicate
- ── separator ──
- Start Poll (disabled if poll already active; changes to "Close Poll" for poll starter/trip owner when active)
- ── separator ──
- Delete

**Behavior:**
- `onContextMenu` handler on EventBlock prevents browser default, opens menu at `(e.clientX, e.clientY)`.
- Closes on: click outside, Escape, scroll, or item selection.
- Keyboard: arrow keys navigate, Enter selects.

### PollBar

**New component:** `apps/web/components/calendar/PollBar.tsx`

Thin inline bar rendered at the bottom of EventBlock when an active poll exists.

**Layout:**
```
│  👍 2    👎 1    [J S M]  │
```

- 👍/👎 buttons — outlined by default, filled when you've voted that option.
- Vote counts next to each button.
- Tiny voter avatar circles on the right (same `AvatarCircle` pattern from TripNavbar collaborator display).
- Clicking a button casts your vote (or toggles off if already voted that way).
- Clicking the opposite button switches your vote.

**Compact mode:** When the activity's computed pixel height (`duration * HOUR_HEIGHT`) is under 40px, show only the two buttons with counts (no avatars). The height is passed as a prop from EventBlock (which already computes it for positioning).

**Props:**
```typescript
interface PollBarProps {
  poll: Poll
  userId: string
  onVote: (vote: 'yes' | 'no') => void
  collaborators: UserAwareness[]  // from useCollaboratorPresence hook
}
```

Voting is optimistic — the Yjs write is local-first and renders immediately. Remote peers see the update via Yjs broadcast.

### Resolved "Remove" Bar

When `activity.pollResult === 'remove'`, the PollBar switches to a resolved state:

**Layout:**
```
│  ↩ Restore    ✕ Remove   │
```

- Restore: clears `pollResult` from activity, deletes the poll from `pollsMap`.
- Remove: calls `removeActivity(id)` — actual deletion.
- Only visible to: poll starter or trip owner.
- For other editors: the card is grayed out with no action buttons.
- For viewers: same grayed-out card, no action buttons, consistent with their read-only access.

### EventBlock Changes

Modify `EventBlock.tsx`:

1. **Right-click handler:** `onContextMenu` opens `ActivityContextMenu`.
2. **Poll bar:** Render `PollBar` at the bottom when `pollsMap` has an active poll for this activity.
3. **Grayed-out state:** When `activity.pollResult === 'remove'`, apply `opacity-40 grayscale` to the card content and render the resolved bar.
4. **Height adjustment:** EventBlock uses absolute positioning with `height = duration * HOUR_HEIGHT`. The PollBar (~28px) renders *inside* the card's existing height via `overflow: hidden` + flexbox layout. Activity content area shrinks to accommodate. No height recalculation needed — the bar takes space from the content, not from the grid.

## Resolution Logic

### Auto-resolve

Runs client-side in a Yjs observer on `pollsMap`. When a vote is added:

1. Parse the votes object.
2. Count total editors on the trip (from `trip_collaborators` where `role_type = 'editor'`, plus the trip owner from `trips.user_id`).
3. If all editors have voted:
   - Count yes vs no votes.
   - Majority wins. Ties → "keep" (benefit of the doubt).
   - Set `status: 'resolved'`, `result: 'keep' | 'remove'` on the poll.
   - If "remove": set `pollResult: 'remove'` on the activity's Y.Map entry.

Since this runs in Yjs, concurrent resolution attempts from multiple clients converge automatically — last-write-wins on the same values.

### Stale Poll Expiration

Polls that have been active for more than 24 hours without all editors voting auto-resolve on the next check. The `usePollObserver` hook runs a periodic interval (every 5 minutes, plus on mount) that checks `startedAt` against `Date.now()` and resolves expired polls using current majority (ties → "keep"). This runs independently of Yjs observer callbacks, ensuring stale polls are caught even when no new votes arrive.

### Early Close

The poll starter (or trip owner) can close a poll early via the context menu ("Close Poll"):

1. Compute current majority from existing votes.
2. If no votes exist: cancel the poll (delete from `pollsMap`, no result applied).
3. If votes exist: resolve with current majority (ties → "keep").

### Collaborator Removal Mid-Poll

When an editor is removed from the trip while a poll is active, their `vote:{userId}` key (if any) is deleted from the poll's Y.Map. The auto-resolve check re-evaluates against the new editor count. This cleanup runs in `usePollObserver` — on each observation, it verifies that all `vote:*` keys belong to current editors and prunes stale ones.

### "Keep" Resolution Cleanup

When a poll resolves to "keep", the poll is immediately deleted from `pollsMap` (and from `activity_polls` on the next flush). No `pollResult` is set on the activity. The card returns to normal with no residual state.

### Restore

Accessible from the resolved remove bar (poll starter or trip owner):

1. Delete `pollResult` from the activity's Y.Map entry.
2. Delete the poll from `pollsMap`.
3. Activity renders normally again.

## Permissions

| Action | Who |
|--------|-----|
| Start a poll | Any editor |
| Vote | Any editor |
| Close poll early | Poll starter or trip owner |
| Restore grayed-out activity | Poll starter or trip owner |
| Remove grayed-out activity | Poll starter or trip owner |
| View polls and votes | Any member (editors + viewers) |

Viewers can see polls and their results but cannot interact.

## Yjs Sync

### Hooks

**`usePollMutations`** — new hook providing:
- `startPoll(activityId: string)` — creates poll entry in `pollsMap`
- `vote(activityId: string, vote: 'yes' | 'no')` — sets `vote:{userId}` key on the poll's Y.Map
- `closePoll(activityId: string)` — resolves poll early
- `restoreActivity(activityId: string)` — clears pollResult + deletes poll

**`usePollObserver`** — new hook that:
- Observes `pollsMap` for changes
- Runs auto-resolution check when votes change
- Prunes orphaned polls (polls whose `activityId` no longer exists in `activitiesMap`)
- Runs a periodic check (on mount + every 5 minutes) for stale poll expiration and orphan cleanup, since Yjs observers only fire on changes
- Returns `polls: Map<string, Poll>` for the current trip

### Poll Sync (`usePollSync`)

A separate `usePollSync` hook (not part of `useYjsSync`) owns all poll persistence. It follows the same patterns as `useYjsSync` but operates on `pollsMap`:

- **Dirty tracking:** Maintains `dirtyPollIds: Set<string>` and `deletedPollIds: Set<string>` refs. When a poll's Y.Map changes, its ID is added to `dirtyPollIds`. When a poll is deleted from `pollsMap`, its ID is added to `deletedPollIds`.
- **Debounced flush (1s):** Upserts dirty polls to `activity_polls` table. Deletes `deletedPollIds` from `activity_polls`. Clears both sets after flush.
- **Tab-refocus reconciliation:** Registers its own `visibilitychange` listener. On refocus, fetches `activity_polls` for the trip and reconciles `pollsMap` — server wins unless locally dirty.

## Supabase Migration

```sql
CREATE TABLE activity_polls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES activity(id) ON DELETE CASCADE,
  started_by uuid NOT NULL REFERENCES auth.users(id),
  votes jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active',
  result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE UNIQUE INDEX activity_polls_one_active
  ON activity_polls (trip_id, activity_id)
  WHERE status = 'active';

ALTER TABLE activity_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members can read polls"
  ON activity_polls FOR SELECT
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors can manage polls"
  ON activity_polls FOR ALL
  USING (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid() AND role_type = 'editor'
    )
  )
  WITH CHECK (
    trip_id IN (
      SELECT id FROM trips WHERE user_id = auth.uid()
      UNION
      SELECT trip_id FROM trip_collaborators WHERE user_id = auth.uid() AND role_type = 'editor'
    )
  );
```

## Integration Points

| Existing Code | Change |
|---------------|--------|
| `CalendarActivity` type | Add optional `pollResult?: 'remove'` field |
| `CALENDAR_ACTIVITY_KEYS` | Add `'pollResult'` to synced keys — duplicated in 3 files: `useActivityMutations.ts`, `useYjsSync.ts`, `useTripActivities.ts` (all must be updated) |
| `YjsTripProvider` | Add `pollsMap: Y.Map<Y.Map<unknown>>` to context value (via `doc.getMap('polls')`) |
| `useYjsSync` | No changes — poll sync is handled by the new `usePollSync` hook |
| `EventBlock.tsx` | Add `onContextMenu`, render `PollBar`, grayed-out state |
| `useActivityMutations` | Destructure `pollsMap` from context; `removeActivity` also deletes the activity's entry from `pollsMap` (if any) |
| `activityMapper.ts` | `toCalendarActivity`: read `activity_data.pollResult` into `CalendarActivity.pollResult`. `toActivityRow`: write `pollResult` into the `activity_data` jsonb object. |

## Out of Scope

- Poll notifications (e.g., push notification when a poll is started)
- Poll history or audit log
- Polls on non-activity items (e.g., poll on which hotel to book)
- Anonymous voting
- Weighted votes (e.g., trip owner's vote counts double)
- Mobile app support (web only for now)
- Cut/paste in context menu (listed in menu but can be wired later)
