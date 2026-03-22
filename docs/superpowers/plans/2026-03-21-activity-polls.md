# Activity Polls Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add collaborative yes/no voting on calendar activities with inline poll bar, context menu, and grayed-out resolution state.

**Architecture:** Polls live in a separate Yjs `pollsMap` alongside `activitiesMap`, with per-user vote keys for CRDT-safe concurrent voting. A `usePollSync` hook handles Supabase persistence independently from activity sync. UI surfaces through a context menu (right-click) on EventBlock and an inline PollBar at the bottom of cards with active polls.

**Tech Stack:** Yjs, Supabase (migration + RLS), React 19, TypeScript, Tailwind CSS v4, motion/react

**Spec:** `docs/superpowers/specs/2026-03-21-activity-polls-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `apps/web/components/calendar/PollBar.tsx` | Inline vote bar (active) + resolved remove bar |
| `apps/web/components/calendar/ActivityContextMenu.tsx` | Right-click context menu on EventBlock |
| `apps/web/components/calendar/hooks/usePollMutations.ts` | Poll CRUD operations on Yjs pollsMap |
| `apps/web/components/calendar/hooks/usePollObserver.ts` | Observe pollsMap, auto-resolve, periodic cleanup |
| `apps/web/components/calendar/hooks/usePollSync.ts` | Dirty tracking + Supabase flush for polls |
| `packages/shared/src/utils/__tests__/pollHelpers.test.ts` | Tests for poll helper functions |
| `packages/shared/src/utils/pollHelpers.ts` | Pure functions: vote parsing, resolution logic |

### Modified Files
| File | Change |
|------|--------|
| `packages/shared/src/types/index.ts` | Add `pollResult` to `CalendarActivity` + `ActivityData`; export `Poll` interface |
| `packages/shared/src/index.ts` | Re-export `Poll` type and poll helpers |
| `packages/shared/src/utils/activityMapper.ts` | Round-trip `pollResult` in `toCalendarActivity` / `toActivityRow` |
| `apps/web/components/calendar/hooks/useActivityMutations.ts` | Add `pollResult` to `CALENDAR_ACTIVITY_KEYS`; cleanup `pollsMap` in `removeActivity` |
| `apps/web/components/calendar/hooks/useYjsSync.ts` | Add `pollResult` to `CALENDAR_ACTIVITY_KEYS` |
| `apps/web/components/calendar/hooks/useTripActivities.ts` | Add `pollResult` to `CALENDAR_ACTIVITY_KEYS` |
| `apps/web/components/calendar/providers/YjsTripProvider.tsx` | Expose `pollsMap` in context |
| `apps/web/components/calendar/EventBlock.tsx` | Add `onContextMenu`, render PollBar, grayed-out state |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Wire poll hooks, pass poll data to DayColumn/EventBlock |
| `apps/web/components/calendar/DayColumn.tsx` | Pass poll props through to EventBlock |
| `apps/web/components/calendar/WeekView.tsx` | Pass poll props through to DayColumn |
| `apps/web/components/calendar/DayView.tsx` | Pass poll props through (if renders EventBlock/DayColumn) |

---

## Chunk 1: Foundation

### Task 1: Supabase Migration

**Files:**
- Create: Supabase migration via MCP

- [ ] **Step 1: Apply the migration**

Use the Supabase MCP `apply_migration` tool with name `create_activity_polls` and the following SQL:

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

- [ ] **Step 2: Verify migration**

Run: `npx supabase migration list` or use Supabase MCP `list_migrations` to confirm the migration was applied.

- [ ] **Step 3: Verify table exists**

Use Supabase MCP `execute_sql`:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'activity_polls' ORDER BY ordinal_position;
```

Expected: 9 columns (id, trip_id, activity_id, started_by, votes, status, result, created_at, resolved_at).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(polls): add activity_polls table with RLS"
```

---

### Task 2: Type Definitions

**Files:**
- Modify: `packages/shared/src/types/index.ts`

Note: `packages/shared/src/index.ts` uses `export * from './types'`, so `Poll` is auto-exported. No edit to `src/index.ts` needed.

- [ ] **Step 1: Add `pollResult` to `CalendarActivity`**

In `packages/shared/src/types/index.ts`, find the `CalendarActivity` interface and add at the end (before the closing `}`):

```typescript
pollResult?: 'remove'
```

- [ ] **Step 2: Add `pollResult` to `ActivityData`**

In the same file, find the `ActivityData` interface and add:

```typescript
pollResult?: 'remove'
```

- [ ] **Step 3: Add `Poll` interface**

In the same file, add after the `CalendarActivity` interface:

```typescript
export interface Poll {
  activityId: string
  startedBy: string
  startedAt: string
  status: 'active' | 'resolved'
  result: 'keep' | 'remove' | ''
  votes: Record<string, 'yes' | 'no'>
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors — new fields are optional, new type is unused so far)

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat(polls): add Poll type and pollResult to CalendarActivity/ActivityData"
```

---

### Task 3: Poll Helper Functions (TDD)

**Files:**
- Create: `packages/shared/src/utils/pollHelpers.ts`
- Create: `packages/shared/src/utils/__tests__/pollHelpers.test.ts`
- Modify: `packages/shared/src/utils/index.ts`

These are pure functions with no Yjs/React dependencies — ideal for unit testing.

- [ ] **Step 1: Write failing tests**

Create `packages/shared/src/utils/__tests__/pollHelpers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { parseVotesFromYMap, resolveVotes, isVoteKey, userIdFromVoteKey } from '../pollHelpers'

describe('isVoteKey', () => {
  it('returns true for vote: prefixed keys', () => {
    expect(isVoteKey('vote:abc-123')).toBe(true)
  })
  it('returns false for non-vote keys', () => {
    expect(isVoteKey('status')).toBe(false)
    expect(isVoteKey('startedBy')).toBe(false)
  })
})

describe('userIdFromVoteKey', () => {
  it('extracts userId from vote key', () => {
    expect(userIdFromVoteKey('vote:abc-123')).toBe('abc-123')
  })
})

describe('parseVotesFromYMap', () => {
  it('extracts vote entries from a flat key-value map', () => {
    const entries = new Map<string, unknown>([
      ['activityId', 'act-1'],
      ['startedBy', 'user-1'],
      ['status', 'active'],
      ['vote:user-1', 'yes'],
      ['vote:user-2', 'no'],
      ['vote:user-3', 'yes'],
    ])
    const votes = parseVotesFromYMap(entries)
    expect(votes).toEqual({
      'user-1': 'yes',
      'user-2': 'no',
      'user-3': 'yes',
    })
  })

  it('returns empty object when no votes exist', () => {
    const entries = new Map<string, unknown>([
      ['activityId', 'act-1'],
      ['status', 'active'],
    ])
    expect(parseVotesFromYMap(entries)).toEqual({})
  })
})

describe('resolveVotes', () => {
  it('returns "keep" when yes votes are majority', () => {
    expect(resolveVotes({ a: 'yes', b: 'yes', c: 'no' })).toBe('keep')
  })
  it('returns "remove" when no votes are majority', () => {
    expect(resolveVotes({ a: 'no', b: 'no', c: 'yes' })).toBe('remove')
  })
  it('returns "keep" on tie (benefit of the doubt)', () => {
    expect(resolveVotes({ a: 'yes', b: 'no' })).toBe('keep')
  })
  it('returns "keep" when no votes exist', () => {
    expect(resolveVotes({})).toBe('keep')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/shared && npm test -- --run src/utils/__tests__/pollHelpers.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement poll helpers**

Create `packages/shared/src/utils/pollHelpers.ts`:

```typescript
const VOTE_PREFIX = 'vote:'

export function isVoteKey(key: string): boolean {
  return key.startsWith(VOTE_PREFIX)
}

export function userIdFromVoteKey(key: string): string {
  return key.slice(VOTE_PREFIX.length)
}

export function parseVotesFromYMap(
  entries: Map<string, unknown>,
): Record<string, 'yes' | 'no'> {
  const votes: Record<string, 'yes' | 'no'> = {}
  for (const [key, value] of entries) {
    if (isVoteKey(key) && (value === 'yes' || value === 'no')) {
      votes[userIdFromVoteKey(key)] = value
    }
  }
  return votes
}

export function resolveVotes(
  votes: Record<string, 'yes' | 'no'>,
): 'keep' | 'remove' {
  let yes = 0
  let no = 0
  for (const v of Object.values(votes)) {
    if (v === 'yes') yes++
    else no++
  }
  return no > yes ? 'remove' : 'keep'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/shared && npm test -- --run src/utils/__tests__/pollHelpers.test.ts`
Expected: PASS (all 9 tests)

- [ ] **Step 5: Re-export from utils barrel**

In `packages/shared/src/utils/index.ts`, add at the end:
```typescript
export { isVoteKey, userIdFromVoteKey, parseVotesFromYMap, resolveVotes } from './pollHelpers'
```

This is auto-re-exported via `packages/shared/src/index.ts`'s `export * from './utils'`.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/utils/pollHelpers.ts packages/shared/src/utils/__tests__/pollHelpers.test.ts packages/shared/src/utils/index.ts
git commit -m "feat(polls): add poll helper functions with tests"
```

---

### Task 4: Activity Mapper + CALENDAR_ACTIVITY_KEYS

**Files:**
- Modify: `packages/shared/src/utils/activityMapper.ts`
- Modify: `apps/web/components/calendar/hooks/useActivityMutations.ts`
- Modify: `apps/web/components/calendar/hooks/useYjsSync.ts`
- Modify: `apps/web/components/calendar/hooks/useTripActivities.ts`

- [ ] **Step 1: Update `toCalendarActivity` in activityMapper.ts**

Find the return object in `toCalendarActivity` and add `pollResult`:

```typescript
pollResult: row.activity_data?.pollResult,
```

Add it after the `sortOrder` line.

- [ ] **Step 2: Update `toActivityRow` in activityMapper.ts**

Find the `activity_data` object in the return of `toActivityRow` and add:

```typescript
pollResult: cal.pollResult,
```

- [ ] **Step 3: Add `'pollResult'` to CALENDAR_ACTIVITY_KEYS in useActivityMutations.ts**

In `apps/web/components/calendar/hooks/useActivityMutations.ts`, find the `CALENDAR_ACTIVITY_KEYS` array and add `'pollResult'` at the end (before `] as const`).

- [ ] **Step 4: Add `'pollResult'` to CALENDAR_ACTIVITY_KEYS in useYjsSync.ts**

In `apps/web/components/calendar/hooks/useYjsSync.ts`, find the `CALENDAR_ACTIVITY_KEYS` array and add `'pollResult'` at the end (before `]`).

- [ ] **Step 5: Add `'pollResult'` to CALENDAR_ACTIVITY_KEYS in useTripActivities.ts**

In `apps/web/components/calendar/hooks/useTripActivities.ts`, find the `CALENDAR_ACTIVITY_KEYS` array and add `'pollResult'` at the end (before `] as const`).

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/utils/activityMapper.ts apps/web/components/calendar/hooks/useActivityMutations.ts apps/web/components/calendar/hooks/useYjsSync.ts apps/web/components/calendar/hooks/useTripActivities.ts
git commit -m "feat(polls): add pollResult to activity mapper and CALENDAR_ACTIVITY_KEYS"
```

---

### Task 5: YjsTripProvider — Expose pollsMap

**Files:**
- Modify: `apps/web/components/calendar/providers/YjsTripProvider.tsx`

- [ ] **Step 1: Add `pollsMap` to the context interface**

In `YjsTripProvider.tsx`, update `YjsTripContextValue`:

```typescript
interface YjsTripContextValue {
  doc: Y.Doc
  activitiesMap: Y.Map<Y.Map<unknown>>
  pollsMap: Y.Map<Y.Map<unknown>>
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
}
```

- [ ] **Step 2: Add `pollsMap` to the context value**

In the `useMemo` that creates the context value (around line 111-119), add `pollsMap`:

```typescript
const value = useMemo(
  () => ({
    doc: docRef.current!,
    activitiesMap: docRef.current!.getMap('activities') as Y.Map<Y.Map<unknown>>,
    pollsMap: docRef.current!.getMap('polls') as Y.Map<Y.Map<unknown>>,
    connectionStatus,
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [tripId, connectionStatus],
)
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (pollsMap is now available but unused)

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/providers/YjsTripProvider.tsx
git commit -m "feat(polls): expose pollsMap from YjsTripProvider context"
```

---

## Chunk 2: Hooks

### Task 6: usePollMutations Hook

**Files:**
- Create: `apps/web/components/calendar/hooks/usePollMutations.ts`

This hook provides CRUD operations for polls on the Yjs `pollsMap`.

- [ ] **Step 1: Create the hook**

Create `apps/web/components/calendar/hooks/usePollMutations.ts`:

```typescript
import { useCallback } from 'react'
import * as Y from 'yjs'
import { useYjsTripContext } from '../providers/YjsTripProvider'
import { resolveVotes, parseVotesFromYMap } from '@travyl/shared'

interface UsePollMutationsReturn {
  startPoll: (activityId: string, userId: string) => void
  vote: (activityId: string, userId: string, value: 'yes' | 'no') => void
  closePoll: (activityId: string) => void
  restoreActivity: (activityId: string) => void
}

export function usePollMutations(): UsePollMutationsReturn {
  const { pollsMap, activitiesMap } = useYjsTripContext()

  const startPoll = useCallback(
    (activityId: string, userId: string) => {
      const doc = pollsMap.doc!
      doc.transact(() => {
        // Delete any existing resolved poll for this activity
        if (pollsMap.has(activityId)) {
          pollsMap.delete(activityId)
        }
        const yMap = new Y.Map<unknown>()
        yMap.set('activityId', activityId)
        yMap.set('startedBy', userId)
        yMap.set('startedAt', new Date().toISOString())
        yMap.set('status', 'active')
        yMap.set('result', '')
        pollsMap.set(activityId, yMap as any)
      })
    },
    [pollsMap],
  )

  const vote = useCallback(
    (activityId: string, userId: string, value: 'yes' | 'no') => {
      const poll = pollsMap.get(activityId)
      if (!poll) return
      const status = poll.get('status') as string
      if (status !== 'active') return

      const voteKey = `vote:${userId}`
      const currentVote = poll.get(voteKey) as string | undefined

      // Toggle off if voting the same way
      if (currentVote === value) {
        poll.delete(voteKey)
      } else {
        poll.set(voteKey, value)
      }
    },
    [pollsMap],
  )

  const closePoll = useCallback(
    (activityId: string) => {
      const poll = pollsMap.get(activityId)
      if (!poll) return

      const entries = new Map<string, unknown>()
      poll.forEach((v, k) => entries.set(k, v))
      const votes = parseVotesFromYMap(entries)
      const hasVotes = Object.keys(votes).length > 0

      if (!hasVotes) {
        // No votes — cancel the poll
        pollsMap.delete(activityId)
        return
      }

      const result = resolveVotes(votes)
      const doc = pollsMap.doc!
      doc.transact(() => {
        if (result === 'remove') {
          poll.set('status', 'resolved')
          poll.set('result', result)
          const activity = activitiesMap.get(activityId)
          if (activity) {
            activity.set('pollResult', 'remove')
          }
        } else {
          // "keep" — delete poll immediately (spec requirement)
          pollsMap.delete(activityId)
        }
      })
    },
    [pollsMap, activitiesMap],
  )

  const restoreActivity = useCallback(
    (activityId: string) => {
      const doc = pollsMap.doc!
      doc.transact(() => {
        // Clear pollResult from activity
        const activity = activitiesMap.get(activityId)
        if (activity) {
          activity.delete('pollResult')
        }
        // Delete the poll
        pollsMap.delete(activityId)
      })
    },
    [pollsMap, activitiesMap],
  )

  return { startPoll, vote, closePoll, restoreActivity }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Manual smoke test**

Start the dev server (`npm run web`), navigate to a trip, open browser console, verify no errors related to polls.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/hooks/usePollMutations.ts
git commit -m "feat(polls): add usePollMutations hook for poll CRUD"
```

---

### Task 7: usePollObserver Hook

**Files:**
- Create: `apps/web/components/calendar/hooks/usePollObserver.ts`

Observes `pollsMap` for changes, runs auto-resolution, periodic stale poll cleanup, and orphan pruning.

- [ ] **Step 1: Create the hook**

Create `apps/web/components/calendar/hooks/usePollObserver.ts`:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react'
import { useYjsTripContext } from '../providers/YjsTripProvider'
import type { Poll } from '@travyl/shared'
import { parseVotesFromYMap, resolveVotes, isVoteKey } from '@travyl/shared'
import type * as Y from 'yjs'

const STALE_POLL_MS = 24 * 60 * 60 * 1000 // 24 hours
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

interface UsePollObserverOptions {
  editorCount: number // total editors including owner
  editorIds: string[] // all current editor user IDs (for pruning stale votes)
}

export function usePollObserver(options: UsePollObserverOptions) {
  const { editorCount, editorIds } = options
  const { pollsMap, activitiesMap } = useYjsTripContext()
  const [polls, setPolls] = useState<Map<string, Poll>>(new Map())
  const editorIdsRef = useRef(editorIds)
  editorIdsRef.current = editorIds

  // Convert a Y.Map poll entry to a Poll object
  const yMapToPoll = useCallback((yMap: import('yjs').Map<unknown>): Poll => {
    const entries = new Map<string, unknown>()
    yMap.forEach((value, key) => {
      entries.set(key, value)
    })
    return {
      activityId: (yMap.get('activityId') as string) ?? '',
      startedBy: (yMap.get('startedBy') as string) ?? '',
      startedAt: (yMap.get('startedAt') as string) ?? '',
      status: (yMap.get('status') as Poll['status']) ?? 'active',
      result: (yMap.get('result') as Poll['result']) ?? '',
      votes: parseVotesFromYMap(entries),
    }
  }, [])

  // Check if a poll should auto-resolve
  const checkAutoResolve = useCallback(
    (activityId: string, yMap: import('yjs').Map<unknown>) => {
      const status = yMap.get('status') as string
      if (status !== 'active') return

      const entries = new Map<string, unknown>()
      yMap.forEach((value, key) => entries.set(key, value))
      const votes = parseVotesFromYMap(entries)
      const voterCount = Object.keys(votes).length

      // Check stale expiration
      const startedAt = yMap.get('startedAt') as string
      const isStale = Date.now() - new Date(startedAt).getTime() > STALE_POLL_MS

      // Guard against resolving before editors are loaded
      if (editorCount === 0) return

      // Auto-resolve if all editors voted OR poll is stale
      if (voterCount >= editorCount || isStale) {
        const result = resolveVotes(votes)
        const doc = pollsMap.doc!
        doc.transact(() => {
          if (result === 'remove') {
            yMap.set('status', 'resolved')
            yMap.set('result', result)
            const activity = activitiesMap.get(activityId)
            if (activity) activity.set('pollResult', 'remove')
          } else {
            // "keep" — delete the poll immediately, no need to set status
            pollsMap.delete(activityId)
          }
        })
      }
    },
    [editorCount, pollsMap, activitiesMap],
  )

  // Prune votes from removed editors + orphaned polls
  const runCleanup = useCallback(() => {
    const editorSet = new Set(editorIdsRef.current)

    // Collect orphaned poll IDs first (don't mutate during forEach)
    const orphanIds: string[] = []
    const pollsToCheck: Array<[string, Y.Map<unknown>]> = []

    pollsMap.forEach((yMap, activityId) => {
      if (!activitiesMap.has(activityId)) {
        orphanIds.push(activityId)
      } else {
        pollsToCheck.push([activityId, yMap])
      }
    })

    // Delete orphans
    for (const id of orphanIds) pollsMap.delete(id)

    // Prune votes from removed editors
    for (const [activityId, yMap] of pollsToCheck) {
      const status = yMap.get('status') as string
      if (status !== 'active') continue

      const keysToDelete: string[] = []
      yMap.forEach((_value, key) => {
        if (isVoteKey(key)) {
          const voterId = key.slice(5) // 'vote:'.length
          if (!editorSet.has(voterId)) {
            keysToDelete.push(key)
          }
        }
      })
      if (keysToDelete.length > 0) {
        const doc = pollsMap.doc!
        doc.transact(() => {
          for (const key of keysToDelete) yMap.delete(key)
        })
      }

      // Re-check auto-resolve after pruning
      checkAutoResolve(activityId, yMap)
    }
  }, [pollsMap, activitiesMap, checkAutoResolve])

  // Rebuild polls state from pollsMap
  const rebuildPolls = useCallback(() => {
    const next = new Map<string, Poll>()
    pollsMap.forEach((yMap, activityId) => {
      next.set(activityId, yMapToPoll(yMap))
    })
    setPolls(next)
  }, [pollsMap, yMapToPoll])

  // Observe pollsMap changes
  useEffect(() => {
    const handler = () => {
      rebuildPolls()
      // Check auto-resolve for all active polls
      pollsMap.forEach((yMap, activityId) => {
        checkAutoResolve(activityId, yMap)
      })
    }

    pollsMap.observeDeep(handler)
    // Initial build
    rebuildPolls()

    return () => {
      pollsMap.unobserveDeep(handler)
    }
  }, [pollsMap, rebuildPolls, checkAutoResolve])

  // Periodic cleanup interval (stale polls, orphans, removed editors)
  useEffect(() => {
    runCleanup() // run on mount
    const interval = setInterval(runCleanup, CLEANUP_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [runCleanup])

  return { polls }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/hooks/usePollObserver.ts
git commit -m "feat(polls): add usePollObserver hook with auto-resolve and cleanup"
```

---

### Task 8: usePollSync Hook

**Files:**
- Create: `apps/web/components/calendar/hooks/usePollSync.ts`

Handles dirty tracking and Supabase persistence for polls, mirroring the `useYjsSync` pattern.

- [ ] **Step 1: Create the hook**

Create `apps/web/components/calendar/hooks/usePollSync.ts`:

```typescript
import { useEffect, useRef, useCallback } from 'react'
import * as Y from 'yjs'
import { supabase } from '@travyl/shared'
import { useYjsTripContext } from '../providers/YjsTripProvider'
import { parseVotesFromYMap } from '@travyl/shared'

const FLUSH_DELAY_MS = 1000

export function usePollSync(tripId: string) {
  const { pollsMap } = useYjsTripContext()
  const dirtyIds = useRef(new Set<string>())
  const deletedIds = useRef(new Set<string>())
  const flushTimer = useRef<ReturnType<typeof setTimeout>>()

  const flush = useCallback(async () => {
    const toUpsert = [...dirtyIds.current]
    const toDelete = [...deletedIds.current]
    dirtyIds.current.clear()
    deletedIds.current.clear()

    // Upsert dirty polls
    if (toUpsert.length > 0) {
      const rows = toUpsert
        .map((activityId) => {
          const yMap = pollsMap.get(activityId)
          if (!yMap) return null
          const entries = new Map<string, unknown>()
          yMap.forEach((v, k) => entries.set(k, v))
          return {
            trip_id: tripId,
            activity_id: activityId,
            started_by: (yMap.get('startedBy') as string) ?? '',
            votes: parseVotesFromYMap(entries),
            status: (yMap.get('status') as string) ?? 'active',
            result: (yMap.get('result') as string) || null,
            resolved_at:
              (yMap.get('status') as string) === 'resolved'
                ? new Date().toISOString()
                : null,
          }
        })
        .filter(Boolean) as any[]

      if (rows.length > 0) {
        // Use individual upserts since the unique index is partial (WHERE status = 'active')
        for (const row of rows) {
          const { error } = await supabase
            .from('activity_polls')
            .upsert(row, { onConflict: 'id' })
          if (error) console.error('[usePollSync] upsert error:', error.message)
        }
      }
    }

    // Delete removed polls
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('activity_polls')
        .delete()
        .eq('trip_id', tripId)
        .in('activity_id', toDelete)
      if (error) console.error('[usePollSync] delete error:', error.message)
    }
  }, [tripId, pollsMap])

  const scheduleFlush = useCallback(() => {
    clearTimeout(flushTimer.current)
    flushTimer.current = setTimeout(flush, FLUSH_DELAY_MS)
  }, [flush])

  // Observe pollsMap for dirty tracking
  useEffect(() => {
    const handler = (events: Y.YEvent<any>[]) => {
      for (const event of events) {
        // Y.Map event on pollsMap itself (add/delete poll entries)
        if (event.target === pollsMap) {
          for (const [key, { action }] of event.changes.keys) {
            if (action === 'delete') {
              deletedIds.current.add(key)
              dirtyIds.current.delete(key)
            } else {
              dirtyIds.current.add(key)
            }
          }
        } else if (event.target instanceof Y.Map) {
          // Nested Y.Map event (vote/status change within a poll)
          // The parent of the nested Y.Map is pollsMap — find the key
          pollsMap.forEach((yMap, activityId) => {
            if (yMap === event.target) {
              dirtyIds.current.add(activityId)
            }
          })
        }
      }
      scheduleFlush()
    }

    pollsMap.observeDeep(handler)
    return () => {
      pollsMap.unobserveDeep(handler)
      clearTimeout(flushTimer.current)
    }
  }, [pollsMap, scheduleFlush])

  // Tab-refocus reconciliation
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return

      const { data: serverPolls } = await supabase
        .from('activity_polls')
        .select('*')
        .eq('trip_id', tripId)

      if (!serverPolls) return

      const serverIds = new Set(serverPolls.map((p) => p.activity_id))

      // Collect polls to remove (don't mutate during forEach)
      const toRemove: string[] = []
      pollsMap.forEach((_yMap, activityId) => {
        if (!serverIds.has(activityId) && !dirtyIds.current.has(activityId)) {
          toRemove.push(activityId)
        }
      })
      for (const id of toRemove) pollsMap.delete(id)

      // Reconcile server polls into Yjs (server wins unless locally dirty)
      const doc = pollsMap.doc!
      doc.transact(() => {
        for (const row of serverPolls) {
          if (dirtyIds.current.has(row.activity_id)) continue

          let yMap = pollsMap.get(row.activity_id)
          if (!yMap) {
            yMap = new Y.Map<unknown>()
            pollsMap.set(row.activity_id, yMap as any)
          }
          yMap.set('activityId', row.activity_id)
          yMap.set('startedBy', row.started_by)
          yMap.set('startedAt', row.created_at)
          yMap.set('status', row.status)
          yMap.set('result', row.result ?? '')

          // Clear existing votes, re-apply from server
          const keysToDelete: string[] = []
          yMap.forEach((_v, k) => {
            if (k.startsWith('vote:')) keysToDelete.push(k)
          })
          for (const k of keysToDelete) yMap.delete(k)

          const votes = (row.votes ?? {}) as Record<string, string>
          for (const [userId, value] of Object.entries(votes)) {
            yMap.set(`vote:${userId}`, value)
          }
        }
      })
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [tripId, pollsMap])

  return null
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/hooks/usePollSync.ts
git commit -m "feat(polls): add usePollSync hook for Supabase persistence"
```

---

### Task 9: Update useActivityMutations — pollsMap Cleanup

**Files:**
- Modify: `apps/web/components/calendar/hooks/useActivityMutations.ts`

- [ ] **Step 1: Destructure pollsMap from context**

In `useActivityMutations`, change:
```typescript
const { activitiesMap } = useYjsTripContext()
```
to:
```typescript
const { activitiesMap, pollsMap } = useYjsTripContext()
```

- [ ] **Step 2: Add pollsMap cleanup in removeActivity**

In the `removeActivity` callback, replace the line `activitiesMap.delete(id)` with a transacted block that also cleans up polls:

```typescript
// Remove from Y.Map + clean up any associated poll atomically
activitiesMap.doc?.transact(() => {
  activitiesMap.delete(id)
  if (pollsMap.has(id)) {
    pollsMap.delete(id)
  }
})
```

Note: The `activity_polls` Supabase row is also cascade-deleted by the FK `ON DELETE CASCADE` when the `activity` row is deleted above. The `pollsMap.delete` triggers `usePollSync` to issue a redundant delete, which is harmless (no-op on an already-cascaded row).

- [ ] **Step 3: Add pollsMap to removeActivity dependencies**

Update the dependency array of the `removeActivity` useCallback from `[activitiesMap]` to `[activitiesMap, pollsMap]`.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/hooks/useActivityMutations.ts
git commit -m "feat(polls): cleanup pollsMap entry on activity deletion"
```

---

## Chunk 3: UI Components

### Task 10: PollBar Component

**Files:**
- Create: `apps/web/components/calendar/PollBar.tsx`

- [ ] **Step 1: Create the PollBar component**

Create `apps/web/components/calendar/PollBar.tsx`:

```tsx
'use client'

import type { Poll, UserAwareness } from '@travyl/shared'

interface PollBarProps {
  poll: Poll
  userId: string
  onVote: (vote: 'yes' | 'no') => void
  collaborators: UserAwareness[]
  compact?: boolean // true when card height < 40px
}

interface ResolvedBarProps {
  onRestore: () => void
  onRemove: () => void
}

// ─── Active vote bar ──────────────────────────────────────────

function ActivePollBar({ poll, userId, onVote, collaborators, compact }: PollBarProps) {
  const myVote = poll.votes[userId] as 'yes' | 'no' | undefined
  const yesCount = Object.values(poll.votes).filter((v) => v === 'yes').length
  const noCount = Object.values(poll.votes).filter((v) => v === 'no').length

  // Voter avatars (non-compact only)
  const voterIds = Object.keys(poll.votes)

  return (
    <div
      className="flex items-center gap-2 px-2 py-1 border-t border-white/10 bg-black/20"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onVote('yes')
        }}
        className={[
          'flex items-center gap-1 text-xs rounded px-1.5 py-0.5 transition-colors',
          myVote === 'yes'
            ? 'bg-emerald-500/30 text-emerald-300'
            : 'text-white/60 hover:text-emerald-300 hover:bg-emerald-500/10',
        ].join(' ')}
      >
        <span className="text-sm">👍</span>
        <span>{yesCount}</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onVote('no')
        }}
        className={[
          'flex items-center gap-1 text-xs rounded px-1.5 py-0.5 transition-colors',
          myVote === 'no'
            ? 'bg-red-500/30 text-red-300'
            : 'text-white/60 hover:text-red-300 hover:bg-red-500/10',
        ].join(' ')}
      >
        <span className="text-sm">👎</span>
        <span>{noCount}</span>
      </button>

      {!compact && voterIds.length > 0 && (
        <div className="ml-auto flex -space-x-1">
          {voterIds.slice(0, 5).map((voterId) => {
            const collab = collaborators.find((c) => c.userId === voterId)
            const initial = collab?.avatarInitial ?? voterId.charAt(0).toUpperCase()
            const color = collab?.color ?? '#6366f1'
            return (
              <div
                key={voterId}
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white border border-[#1e3a5f]"
                style={{ backgroundColor: color }}
                title={collab?.name ?? voterId}
              >
                {initial}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Resolved "remove" bar ────────────────────────────────────

function ResolvedRemoveBar({ onRestore, onRemove }: ResolvedBarProps) {
  return (
    <div
      className="flex items-center justify-center gap-3 px-2 py-1 border-t border-white/10 bg-black/20"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRestore()
        }}
        className="flex items-center gap-1 text-xs text-white/60 hover:text-emerald-300 transition-colors"
      >
        <span>↩</span> Restore
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="flex items-center gap-1 text-xs text-white/60 hover:text-red-300 transition-colors"
      >
        <span>✕</span> Remove
      </button>
    </div>
  )
}

// ─── Exported PollBar ─────────────────────────────────────────

export interface PollBarExportProps extends PollBarProps {
  isResolved: boolean
  canManage: boolean // true if user is poll starter or trip owner
  onRestore: () => void
  onRemove: () => void
}

export function PollBar({
  poll,
  userId,
  onVote,
  collaborators,
  compact,
  isResolved,
  canManage,
  onRestore,
  onRemove,
}: PollBarExportProps) {
  if (isResolved && canManage) {
    return <ResolvedRemoveBar onRestore={onRestore} onRemove={onRemove} />
  }

  if (isResolved) {
    // Other collaborators see no bar — just the grayed-out card
    return null
  }

  return (
    <ActivePollBar
      poll={poll}
      userId={userId}
      onVote={onVote}
      collaborators={collaborators}
      compact={compact}
    />
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/PollBar.tsx
git commit -m "feat(polls): add PollBar component with active and resolved states"
```

---

### Task 11: ActivityContextMenu Component

**Files:**
- Create: `apps/web/components/calendar/ActivityContextMenu.tsx`

- [ ] **Step 1: Create the context menu**

Create `apps/web/components/calendar/ActivityContextMenu.tsx`:

```tsx
'use client'

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'

export interface ContextMenuAction {
  id: string
  label: string
  disabled?: boolean
  danger?: boolean
  separator?: boolean
}

interface ActivityContextMenuProps {
  x: number
  y: number
  actions: ContextMenuAction[]
  onAction: (actionId: string) => void
  onClose: () => void
}

export function ActivityContextMenu({
  x,
  y,
  actions,
  onAction,
  onClose,
}: ActivityContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  // Filter out separators for keyboard navigation (memoized to avoid effect re-registration)
  const navigableActions = useMemo(
    () => actions.filter((a) => !a.separator && !a.disabled),
    [actions],
  )

  // Clamp menu to viewport
  const [position, setPosition] = useState({ top: y, left: x })

  useEffect(() => {
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const clampedX = Math.min(x, window.innerWidth - rect.width - 8)
    const clampedY = Math.min(y, window.innerHeight - rect.height - 8)
    setPosition({ top: Math.max(8, clampedY), left: Math.max(8, clampedX) })
  }, [x, y])

  // Close on click outside, Escape, scroll
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < navigableActions.length - 1 ? prev + 1 : prev,
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const action = navigableActions[highlightedIndex]
        if (action) {
          onAction(action.id)
          onClose()
        }
      }
    }
    const handleScroll = () => onClose()

    document.addEventListener('mousedown', handleClick, true)
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClick, true)
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [onClose, onAction, navigableActions, highlightedIndex])

  // Render via portal to escape EventBlock's overflow-hidden and transform stacking context
  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[160px] bg-white dark:bg-[#0f1a28] rounded-lg border border-gray-200 dark:border-[#1e3a5f]/40 shadow-xl py-1 text-sm"
      style={position}
    >
      {actions.map((action, i) => {
        if (action.separator) {
          return (
            <div
              key={`sep-${i}`}
              className="h-px bg-gray-200 dark:bg-[#1e3a5f]/30 my-1"
            />
          )
        }

        const navIndex = navigableActions.indexOf(action)
        const isHighlighted = navIndex === highlightedIndex

        return (
          <button
            key={action.id}
            disabled={action.disabled}
            onClick={() => {
              if (!action.disabled) {
                onAction(action.id)
                onClose()
              }
            }}
            onMouseEnter={() => {
              if (!action.disabled) setHighlightedIndex(navIndex)
            }}
            className={[
              'w-full text-left px-3 py-1.5 transition-colors',
              action.disabled
                ? 'text-gray-400 dark:text-[#484f58] cursor-default'
                : isHighlighted
                  ? 'bg-gray-100 dark:bg-[#1e3a5f]/30'
                  : '',
              action.danger && !action.disabled
                ? 'text-red-500 dark:text-red-400'
                : action.disabled
                  ? ''
                  : 'text-gray-700 dark:text-[#cdd9e5]',
            ].join(' ')}
          >
            {action.label}
          </button>
        )
      })}
    </div>,
    document.body,
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/ActivityContextMenu.tsx
git commit -m "feat(polls): add ActivityContextMenu component"
```

---

### Task 12: EventBlock Changes

**Files:**
- Modify: `apps/web/components/calendar/EventBlock.tsx`

- [ ] **Step 1: Add new props to EventBlockProps**

Add these props to the `EventBlockProps` interface:

```typescript
poll?: Poll | null
pollUserId?: string
pollCollaborators?: UserAwareness[]
isPollManager?: boolean // true if user can manage this poll (starter or owner)
tripOwnerId?: string
onVote?: (activityId: string, vote: 'yes' | 'no') => void
onStartPoll?: (activityId: string) => void
onClosePoll?: (activityId: string) => void
onRestoreActivity?: (activityId: string) => void
onRemoveActivity?: (activityId: string) => void
```

Add imports at the top:
```typescript
import type { Poll } from '@travyl/shared'
import { PollBar } from './PollBar'
import { ActivityContextMenu, type ContextMenuAction } from './ActivityContextMenu'
```

- [ ] **Step 2: Add context menu state**

Inside the `EventBlock` component, add state for the context menu:

```typescript
const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
```

Import `useState` if not already imported.

- [ ] **Step 3: Add onContextMenu handler**

Add a handler function inside the component:

```typescript
const handleContextMenu = useCallback((e: React.MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  setContextMenu({ x: e.clientX, y: e.clientY })
}, [])
```

Import `useCallback` if not already imported.

- [ ] **Step 4: Build context menu actions**

Add context menu actions computation:

```typescript
const contextMenuActions = useMemo((): ContextMenuAction[] => {
  const hasPoll = poll && poll.status === 'active'
  const canClosePoll = hasPoll && isPollManager
  return [
    { id: 'cut', label: 'Cut', disabled: true },
    { id: 'duplicate', label: 'Duplicate' },
    { id: 'separator-1', label: '', separator: true },
    hasPoll
      ? canClosePoll
        ? { id: 'close-poll', label: 'Close Poll' }
        : { id: 'start-poll', label: 'Start Poll', disabled: true }
      : { id: 'start-poll', label: 'Start Poll' },
    { id: 'separator-2', label: '', separator: true },
    { id: 'delete', label: 'Delete', danger: true },
  ]
}, [poll, isPollManager])
```

Import `useMemo` if not already imported.

- [ ] **Step 5: Handle context menu actions**

Add the action handler:

```typescript
const handleContextAction = useCallback(
  (actionId: string) => {
    setContextMenu(null)
    switch (actionId) {
      case 'duplicate':
        // Trigger duplicate via existing command system (click event re-use)
        break
      case 'start-poll':
        onStartPoll?.(activity.id)
        break
      case 'close-poll':
        onClosePoll?.(activity.id)
        break
      case 'delete':
        onRemoveActivity?.(activity.id)
        break
    }
  },
  [activity.id, onStartPoll, onClosePoll, onRemoveActivity],
)
```

- [ ] **Step 6: Apply grayed-out state and onContextMenu to the root element**

Find the root `<div>` of EventBlock and:

1. Add `onContextMenu={handleContextMenu}` to it.
2. Wrap the content area in a conditional class for grayed-out state:

Add this computed value:
```typescript
const isGrayedOut = activity.pollResult === 'remove'
```

Apply to the content wrapper inside the card (the div that holds the title/time/image):
```typescript
className={`... ${isGrayedOut ? 'opacity-40 grayscale' : ''}`}
```

- [ ] **Step 7: Render PollBar at the bottom of the card**

Inside the EventBlock's return, after the content area but still inside the root div, add:

```typescript
{poll && poll.status === 'active' && pollUserId && (
  <PollBar
    poll={poll}
    userId={pollUserId}
    onVote={(vote) => onVote?.(activity.id, vote)}
    collaborators={pollCollaborators ?? []}
    compact={displayActivity.duration * HOUR_HEIGHT < 40}
    isResolved={false}
    canManage={!!isPollManager}
    onRestore={() => onRestoreActivity?.(activity.id)}
    onRemove={() => onRemoveActivity?.(activity.id)}
  />
)}
{isGrayedOut && pollUserId && (
  <PollBar
    poll={poll ?? { activityId: activity.id, startedBy: '', startedAt: '', status: 'resolved', result: 'remove', votes: {} }}
    userId={pollUserId}
    onVote={() => {}}
    collaborators={pollCollaborators ?? []}
    isResolved={true}
    canManage={!!isPollManager}
    onRestore={() => onRestoreActivity?.(activity.id)}
    onRemove={() => onRemoveActivity?.(activity.id)}
  />
)}
```

- [ ] **Step 8: Render context menu portal**

After the root div's closing tag (but still inside the component's return), add:

```typescript
{contextMenu && (
  <ActivityContextMenu
    x={contextMenu.x}
    y={contextMenu.y}
    actions={contextMenuActions}
    onAction={handleContextAction}
    onClose={() => setContextMenu(null)}
  />
)}
```

- [ ] **Step 9: Add flexbox layout for PollBar**

The root div of EventBlock needs to become a flex column so PollBar sits at the bottom:

Add `flex flex-col` to the root div's className. Wrap the existing content in a `<div className="flex-1 min-h-0 overflow-hidden">` so it fills remaining space.

- [ ] **Step 10: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add apps/web/components/calendar/EventBlock.tsx
git commit -m "feat(polls): add context menu, PollBar, and grayed-out state to EventBlock"
```

---

### Task 13: DayColumn — Pass Poll Props

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx`

- [ ] **Step 1: Add poll-related props to DayColumn**

Add these to DayColumn's props interface:

```typescript
polls?: Map<string, Poll>
pollUserId?: string
pollCollaborators?: UserAwareness[]
tripOwnerId?: string
onVote?: (activityId: string, vote: 'yes' | 'no') => void
onStartPoll?: (activityId: string) => void
onClosePoll?: (activityId: string) => void
onRestoreActivity?: (activityId: string) => void
onRemoveActivity?: (activityId: string) => void
```

Add `Poll` to the import from `@travyl/shared`.

- [ ] **Step 2: Pass poll props through to EventBlock**

In the EventBlock render inside DayColumn's `activities.map(...)`, add these props:

```typescript
poll={polls?.get(activity.id) ?? null}
pollUserId={pollUserId}
pollCollaborators={pollCollaborators}
isPollManager={
  polls?.get(activity.id)
    ? (polls.get(activity.id)!.startedBy === pollUserId || tripOwnerId === pollUserId)
    : false
}
tripOwnerId={tripOwnerId}
onVote={onVote}
onStartPoll={onStartPoll}
onClosePoll={onClosePoll}
onRestoreActivity={onRestoreActivity}
onRemoveActivity={onRemoveActivity}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx
git commit -m "feat(polls): pass poll props through DayColumn to EventBlock"
```

---

### Task 14: CalendarDashboard Integration

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

This is the final wiring task — connecting all poll hooks and passing data down.

- [ ] **Step 1: Import poll hooks and supabase**

Add imports at the top of CalendarDashboard:

```typescript
import { usePollMutations } from './hooks/usePollMutations'
import { usePollObserver } from './hooks/usePollObserver'
import { usePollSync } from './hooks/usePollSync'
import { supabase } from '@travyl/shared'
import { useQuery } from '@tanstack/react-query'
```

Note: `useQuery` may already be imported if used elsewhere in the file — check first.

- [ ] **Step 2: Fetch editor count and IDs**

The `usePollObserver` needs `editorCount` and `editorIds`. Add a query for trip collaborators.

After the existing hooks (around line 88), add:

```typescript
// Poll infrastructure
const { startPoll, vote, closePoll, restoreActivity: restorePollActivity } = usePollMutations()
```

For editor count, use a simple React Query fetch:

```typescript
import { useQuery } from '@tanstack/react-query'

// Inside the component, after other hooks:
const { data: editors } = useQuery({
  queryKey: ['trip-editors', tripId],
  queryFn: async () => {
    // Fetch collaborators with editor role
    const { data: collabs } = await supabase
      .from('trip_collaborators')
      .select('user_id')
      .eq('trip_id', tripId)
      .eq('role_type', 'editor')

    // Fetch trip owner
    const { data: tripRow } = await supabase
      .from('trips')
      .select('user_id')
      .eq('id', tripId)
      .single()

    const editorIds = (collabs ?? []).map((c) => c.user_id)
    if (tripRow?.user_id && !editorIds.includes(tripRow.user_id)) {
      editorIds.push(tripRow.user_id)
    }
    return editorIds
  },
  staleTime: 5 * 60_000,
})

const editorIds = editors ?? [userId]
const editorCount = editorIds.length
```

- [ ] **Step 3: Wire poll observer and sync**

After the editor query:

```typescript
const { polls } = usePollObserver({ editorCount, editorIds })
usePollSync(tripId)
```

- [ ] **Step 4: Get trip owner ID**

The trip owner ID is needed for `isPollManager` checks. The `trip` object from `useTripActivities` should have this. Check what `useTripActivities` returns — if it includes `trip.user_id`, use that. Otherwise extract from the editors query's `tripRow`.

```typescript
const tripOwnerId = trip?.user_id ?? ''
```

- [ ] **Step 5: Pass poll props to WeekView/DayView**

CalendarDashboard renders `<WeekView>` and `<DayView>`, not `<DayColumn>` directly. The poll props are added to WeekView/DayView in Step 6. Here, just verify that `collaborators` (from the existing `useCollaboratorPresence` hook) and `handleRemoveActivity` are available in scope for the wiring in Step 6.

- [ ] **Step 6: Pass poll props through WeekView and DayView**

DayColumn is rendered inside `WeekView.tsx` (not directly in CalendarDashboard). So CalendarDashboard passes poll props to WeekView, which passes to DayColumn.

In `apps/web/components/calendar/WeekView.tsx`:
1. Add these props to the `WeekViewProps` interface:
```typescript
polls?: Map<string, Poll>
pollUserId?: string
pollCollaborators?: UserAwareness[]
tripOwnerId?: string
onVote?: (activityId: string, vote: 'yes' | 'no') => void
onStartPoll?: (activityId: string) => void
onClosePoll?: (activityId: string) => void
onRestoreActivity?: (activityId: string) => void
onRemoveActivity?: (activityId: string) => void
```
2. Add `import type { Poll } from '@travyl/shared'` at the top.
3. Destructure the new props and pass them to each `<DayColumn>` render.

In `apps/web/components/calendar/DayView.tsx`:
If DayView renders EventBlock directly (not via DayColumn), add the same props and pass them through. If DayView uses DayColumn, follow the same pattern as WeekView.

In CalendarDashboard, the poll props go on `<WeekView>` and `<DayView>`, NOT directly on DayColumn:

```typescript
<WeekView
  // ...existing props...
  polls={polls}
  pollUserId={userId}
  pollCollaborators={collaborators}
  tripOwnerId={tripOwnerId}
  onVote={(activityId, v) => vote(activityId, userId, v)}
  onStartPoll={(activityId) => startPoll(activityId, userId)}
  onClosePoll={(activityId) => closePoll(activityId)}
  onRestoreActivity={(activityId) => restorePollActivity(activityId)}
  onRemoveActivity={(activityId) => handleRemoveActivity(activityId)}
/>
```

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 8: Manual end-to-end test**

Start the dev server (`npm run web`), navigate to a trip with activities:

1. **Context menu:** Right-click an activity card → context menu appears with Cut (disabled), Duplicate, Start Poll, Delete
2. **Start poll:** Click "Start Poll" → PollBar appears at bottom of card with 👍 0 👎 0
3. **Vote:** Click 👍 → count updates to 1, button highlights
4. **Toggle vote:** Click 👍 again → vote removed
5. **Switch vote:** Click 👎 → switches from yes to no
6. **Context menu on active poll:** Right-click same card → shows "Close Poll" instead of "Start Poll"
7. **Close poll:** Click "Close Poll" → if result is "remove", card grays out with Restore/Remove bar
8. **Restore:** Click Restore → card returns to normal
9. **Delete via context menu:** Right-click → Delete → activity removed

- [ ] **Step 9: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx apps/web/components/calendar/WeekView.tsx apps/web/components/calendar/DayView.tsx
git commit -m "feat(polls): wire poll hooks into CalendarDashboard and pass to components"
```

---

## Post-Implementation

- [ ] **Run full typecheck:** `npm run typecheck`
- [ ] **Run lint:** `npm run lint`
- [ ] **Run shared tests:** `cd packages/shared && npm test`
- [ ] **Manual QA with two browser tabs** (simulate two collaborators):
  1. Tab A starts poll on an activity
  2. Tab B sees the poll appear in real-time
  3. Both tabs vote → poll auto-resolves when all editors have voted
  4. Verify grayed-out state syncs across tabs
  5. Restore from one tab → both see activity restored
