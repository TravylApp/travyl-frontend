# Trip Sharing & Notes — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Docs-style trip sharing (private/link/public visibility, per-collaborator roles, invite flow) and free-floating post-it notes on the calendar canvas.

**Architecture:** Schema migration replaces old `is_shared`/`is_public`/`share_link_role` columns with a `visibility` enum + `link_permission` on `trips`, adds a `trip_notes` table, and relaxes `trip_collaborators.user_id` for pending invites. Shared package gains new hooks and a `TripPermissionContext` that the `/t/[token]` Server Component populates. The calendar's `DayColumn` handles `Shift+Click` for note placement; each column hosts an isolated `DndContext` for note dragging.

**Tech Stack:** Supabase (migrations, RLS, Realtime postgres_changes, Edge Functions), React Query v5, Zustand, dnd-kit, Next.js 15 Server Components + middleware, Vitest

---

## File Map

| File | Action |
|---|---|
| `supabase/migrations/20260317000000_trip_sharing.sql` | Create |
| `packages/shared/src/types/index.ts` | Modify — update `Trip`, add `TripNote`, `CollaboratorRole`, `TripVisibility`, `LinkPermission`, `TripCollaborator` |
| `packages/shared/src/utils/color.ts` | Create — `pickColor`, `DEFAULT_COLORS` |
| `packages/shared/src/utils/permissions.ts` | Rewrite |
| `packages/shared/src/utils/permissions.test.ts` | Create |
| `packages/shared/src/utils/index.ts` | Modify — export `pickColor` |
| `packages/shared/src/config/mockTripsData.ts` | Modify — replace old sharing fields |
| `packages/shared/src/config/mockItineraryData.ts` | Modify — replace old sharing fields |
| `packages/shared/src/viewmodels/tripViewModel.test.ts` | Modify — fix fixture fields |
| `packages/shared/src/context/TripPermissionContext.tsx` | Create |
| `packages/shared/src/hooks/useTripSharing.ts` | Create |
| `packages/shared/src/hooks/useCollaborators.ts` | Create |
| `packages/shared/src/hooks/useEffectivePermission.ts` | Create |
| `packages/shared/src/hooks/useTripNotes.ts` | Create |
| `packages/shared/src/hooks/useNotesMutations.ts` | Create |
| `packages/shared/src/hooks/index.ts` | Modify — add new exports |
| `packages/shared/src/index.ts` | Modify — re-export context |
| `apps/web/components/calendar/hooks/useCollaboratorPresence.ts` | Modify — import `pickColor` from `@travyl/shared` |
| `apps/web/middleware.ts` | Create |
| `apps/web/app/t/[token]/page.tsx` | Create |
| `apps/web/app/invite/[invite_token]/page.tsx` | Create |
| `apps/web/components/trip/ShareModal.tsx` | Create |
| `apps/web/components/calendar/CalendarHeader.tsx` | Modify — Share button opens modal; role badge for non-owners |
| `apps/web/app/(main)/trip/[id]/page.tsx` | Modify — wrap with `TripPermissionProvider` |
| `apps/web/components/calendar/DayColumn.tsx` | Modify — skip `onCreateActivity` on `shiftKey`; expose `onShiftClick` prop |
| `apps/web/components/calendar/NoteOverlay.tsx` | Create |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Modify — add note hooks (has tripId), pass note props to WeekView |
| `apps/web/components/calendar/WeekView.tsx` | Modify — accept note props, render `NoteOverlay` per day column |
| `supabase/functions/send-invite-email/index.ts` | Create |

---

## Task 1: Schema migration

**Files:**
- Create: `supabase/migrations/20260317000000_trip_sharing.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260317000000_trip_sharing.sql

-- 1. Replace old sharing columns on trips
ALTER TABLE trips
  DROP COLUMN IF EXISTS is_shared,
  DROP COLUMN IF EXISTS share_link_role,
  DROP COLUMN IF EXISTS is_public,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'link', 'public')),
  ADD COLUMN IF NOT EXISTS link_permission text NOT NULL DEFAULT 'view'
    CHECK (link_permission IN ('view', 'comment', 'edit'));

-- share_link_token already exists; ensure uniqueness
ALTER TABLE trips
  ADD CONSTRAINT IF NOT EXISTS trips_share_link_token_key UNIQUE (share_link_token);

-- 2. Extend trips RLS: any authenticated user can read link/public trips
-- (assumes existing SELECT policy is named "trips_select" — adjust if different)
-- Add a separate permissive policy for shared trips:
CREATE POLICY IF NOT EXISTS "trips_select_shared"
  ON trips FOR SELECT
  USING (visibility IN ('link', 'public'));

-- 3. Relax trip_collaborators.user_id for pending invites
ALTER TABLE trip_collaborators
  ALTER COLUMN user_id DROP NOT NULL;

-- Extend role_type
ALTER TABLE trip_collaborators
  DROP CONSTRAINT IF EXISTS trip_collaborators_role_type_check;
ALTER TABLE trip_collaborators
  ADD CONSTRAINT trip_collaborators_role_type_check
  CHECK (role_type IN ('viewer', 'commenter', 'editor'));

-- Constrain invite_status
ALTER TABLE trip_collaborators
  DROP CONSTRAINT IF EXISTS trip_collaborators_invite_status_check;
ALTER TABLE trip_collaborators
  ADD CONSTRAINT trip_collaborators_invite_status_check
  CHECK (invite_status IN ('pending', 'accepted', 'cancelled'));

-- Unique invite tokens
ALTER TABLE trip_collaborators
  ADD CONSTRAINT IF NOT EXISTS trip_collaborators_invite_token_key UNIQUE (invite_token);

-- 4. trip_notes table
CREATE TABLE IF NOT EXISTS trip_notes (
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

ALTER TABLE trip_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "trip_notes_select" ON trip_notes
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

CREATE POLICY IF NOT EXISTS "trip_notes_insert" ON trip_notes
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

CREATE POLICY IF NOT EXISTS "trip_notes_update" ON trip_notes
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "trip_notes_delete" ON trip_notes
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM trips t WHERE t.id = trip_notes.trip_id AND t.user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Apply the migration**

```bash
# Using Supabase MCP apply_migration, or:
npx supabase db push
```

Expected: migration applies cleanly, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260317000000_trip_sharing.sql
git commit -m "feat: add trip sharing schema (visibility, link_permission, trip_notes)"
```

---

## Task 2: Update `Trip` type + add new types

**Files:**
- Modify: `packages/shared/src/types/index.ts`

- [ ] **Step 1: Update `Trip` interface**

In `packages/shared/src/types/index.ts`, replace the old sharing fields in `Trip`:

```ts
// Remove these three lines:
//   is_shared: boolean;
//   share_link_role: 'viewer' | 'editor';
//   is_public: boolean;

// Add these two lines after share_link_token:
  visibility: 'private' | 'link' | 'public';
  link_permission: 'view' | 'comment' | 'edit';
```

- [ ] **Step 2: Add new types** (append to end of `types/index.ts`)

```ts
// ─── Sharing ────────────────────────────────────────────────

export type TripVisibility = 'private' | 'link' | 'public'
export type LinkPermission = 'view' | 'comment' | 'edit'
export type CollaboratorRole = 'viewer' | 'commenter' | 'editor'

export interface TripCollaborator {
  id: string
  trip_id: string
  user_id: string | null
  invited_email: string | null
  invite_token: string | null
  role_type: CollaboratorRole
  invite_status: 'pending' | 'accepted' | 'cancelled'
  invited_by: string
  accepted_at: string | null
  created_at: string
  // joined from profiles when accepted:
  display_name?: string | null
  avatar_url?: string | null
}

export interface TripNote {
  id: string
  trip_id: string
  user_id: string | null
  activity_id: string | null
  day: string          // ISO date string
  pos_x: number
  pos_y: number
  content: string
  color: string
  created_at: string
  updated_at: string
  // joined from profiles:
  author_name?: string | null
}
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: type errors only in files that still reference `is_shared`/`is_public`/`share_link_role` — those are fixed in the next tasks.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat: update Trip type, add TripNote/TripCollaborator/sharing types"
```

---

## Task 3: `pickColor` utility

**Files:**
- Create: `packages/shared/src/utils/color.ts`
- Modify: `packages/shared/src/utils/index.ts`
- Modify: `apps/web/components/calendar/hooks/useCollaboratorPresence.ts`

- [ ] **Step 1: Create `color.ts`**

```ts
// packages/shared/src/utils/color.ts

export const DEFAULT_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
]

/** Deterministic color assignment from userId. */
export function pickColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0
  }
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length]
}
```

- [ ] **Step 2: Export from utils barrel**

Add to `packages/shared/src/utils/index.ts`:
```ts
export { pickColor, DEFAULT_COLORS } from './color'
```

- [ ] **Step 3: Update `useCollaboratorPresence.ts`**

In `apps/web/components/calendar/hooks/useCollaboratorPresence.ts`:
- Remove the local `DEFAULT_COLORS` const and `pickColor` function (lines 31–42)
- Add import: `import { pickColor } from '@travyl/shared'`

- [ ] **Step 4: Run typecheck**

```bash
npm run typecheck
```

Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/utils/color.ts packages/shared/src/utils/index.ts \
  apps/web/components/calendar/hooks/useCollaboratorPresence.ts
git commit -m "feat: move pickColor to @travyl/shared"
```

---

## Task 4: Rewrite `permissions.ts` + tests

**Files:**
- Rewrite: `packages/shared/src/utils/permissions.ts`
- Create: `packages/shared/src/utils/permissions.test.ts`

- [ ] **Step 1: Write failing tests first**

```ts
// packages/shared/src/utils/permissions.test.ts
import { describe, it, expect } from 'vitest'
import { canViewTrip, canEditTrip, canForkTrip, isTripOwner } from './permissions'
import type { Trip } from '../types'

const base: Trip = {
  id: 't1', user_id: 'owner', title: 'T', destination: 'D',
  start_date: '2026-01-01', end_date: '2026-01-07',
  budget: null, currency: 'USD', travelers: 1,
  status: 'planning', trip_context: {}, is_generated: false,
  share_link_token: null, forked_from_trip_id: null, fork_count: 0,
  theme: 'navy', custom_theme_color: null,
  created_at: '', updated_at: '',
  visibility: 'private', link_permission: 'view',
}

describe('isTripOwner', () => {
  it('returns true for the owner', () => expect(isTripOwner(base, 'owner')).toBe(true))
  it('returns false for other users', () => expect(isTripOwner(base, 'other')).toBe(false))
  it('returns false for null', () => expect(isTripOwner(base, null)).toBe(false))
})

describe('canViewTrip', () => {
  it('owner can always view', () => expect(canViewTrip(base, 'owner')).toBe(true))
  it('private: other user cannot view', () => expect(canViewTrip(base, 'other')).toBe(false))
  it('link visibility: other user can view', () =>
    expect(canViewTrip({ ...base, visibility: 'link' }, 'other')).toBe(true))
  it('public visibility: other user can view', () =>
    expect(canViewTrip({ ...base, visibility: 'public' }, 'other')).toBe(true))
})

describe('canEditTrip', () => {
  it('owner can always edit', () => expect(canEditTrip(base, 'owner')).toBe(true))
  it('private: other user cannot edit', () => expect(canEditTrip(base, 'other')).toBe(false))
  it('link+edit: other user can edit', () =>
    expect(canEditTrip({ ...base, visibility: 'link', link_permission: 'edit' }, 'other')).toBe(true))
  it('link+view: other user cannot edit', () =>
    expect(canEditTrip({ ...base, visibility: 'link', link_permission: 'view' }, 'other')).toBe(false))
})

describe('canForkTrip', () => {
  it('owner cannot fork own trip', () => expect(canForkTrip(base, 'owner')).toBe(false))
  it('public: other user can fork', () =>
    expect(canForkTrip({ ...base, visibility: 'public' }, 'other')).toBe(true))
  it('private: other user cannot fork', () => expect(canForkTrip(base, 'other')).toBe(false))
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd packages/shared && npm test -- permissions
```

Expected: tests fail because `permissions.ts` still references old fields.

- [ ] **Step 3: Rewrite `permissions.ts`**

```ts
// packages/shared/src/utils/permissions.ts
import type { Trip } from '../types'

export function isTripOwner(trip: Trip, userId: string | null): boolean {
  if (!userId) return false
  return trip.user_id === userId
}

export function canViewTrip(trip: Trip, userId: string | null): boolean {
  if (isTripOwner(trip, userId)) return true
  if (trip.visibility === 'public' || trip.visibility === 'link') return true
  return false
}

export function canEditTrip(trip: Trip, userId: string | null): boolean {
  if (!userId) return false
  if (isTripOwner(trip, userId)) return true
  if (trip.visibility !== 'private' && trip.link_permission === 'edit') return true
  return false
}

export function canForkTrip(trip: Trip, userId: string | null): boolean {
  if (userId && isTripOwner(trip, userId)) return false
  return trip.visibility === 'public'
}

export function canMakePublic(trip: Trip, userId: string | null): boolean {
  return isTripOwner(trip, userId)
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd packages/shared && npm test -- permissions
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/utils/permissions.ts packages/shared/src/utils/permissions.test.ts
git commit -m "feat: rewrite permissions.ts for visibility model, add tests"
```

---

## Task 5: Update mock data + fix remaining type errors

**Files:**
- Modify: `packages/shared/src/config/mockTripsData.ts`
- Modify: `packages/shared/src/config/mockItineraryData.ts`
- Modify: `packages/shared/src/viewmodels/tripViewModel.test.ts`

- [ ] **Step 1: Update `mockTripsData.ts`**

For every object in `MOCK_TRIPS`, replace:
```ts
is_shared: false,           // remove
share_link_role: 'viewer',  // remove
is_public: false,           // remove
```
with:
```ts
visibility: 'private',
link_permission: 'view',
```

For the one trip that has `is_shared: true, share_link_role: 'editor'`, use:
```ts
visibility: 'link',
link_permission: 'edit',
```

- [ ] **Step 2: Update `mockItineraryData.ts`**

Apply the same field replacements for any Trip objects in that file.

- [ ] **Step 3: Fix `tripViewModel.test.ts` fixtures**

Search for `is_shared`, `share_link_role`, `is_public` in the file and replace using the same pattern as Step 1.

- [ ] **Step 4: Run typecheck — expect clean**

```bash
npm run typecheck
```

Expected: zero type errors.

- [ ] **Step 5: Run all tests**

```bash
cd packages/shared && npm test
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/config/ packages/shared/src/viewmodels/tripViewModel.test.ts
git commit -m "chore: update mock data to new visibility model"
```

---

## Task 6: `TripPermissionContext`

**Files:**
- Create: `packages/shared/src/context/TripPermissionContext.tsx`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create the context**

```tsx
// packages/shared/src/context/TripPermissionContext.tsx
'use client'
import { createContext, useContext } from 'react'
import type { CollaboratorRole } from '../types'

interface TripPermissionContextValue {
  /** The effective permission resolved server-side for this render tree. */
  resolvedPermission: CollaboratorRole | 'owner'
}

const TripPermissionContext = createContext<TripPermissionContextValue>({
  resolvedPermission: 'viewer',
})

export function TripPermissionProvider({
  resolvedPermission,
  children,
}: {
  resolvedPermission: CollaboratorRole | 'owner'
  children: React.ReactNode
}) {
  return (
    <TripPermissionContext.Provider value={{ resolvedPermission }}>
      {children}
    </TripPermissionContext.Provider>
  )
}

export function useTripPermissionContext() {
  return useContext(TripPermissionContext)
}
```

- [ ] **Step 2: Export from shared barrel**

Add to `packages/shared/src/index.ts`:
```ts
export { TripPermissionProvider, useTripPermissionContext } from './context/TripPermissionContext'
```

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/context/ packages/shared/src/index.ts
git commit -m "feat: add TripPermissionContext"
```

---

## Task 7: `useTripSharing` hook

**Files:**
- Create: `packages/shared/src/hooks/useTripSharing.ts`

- [ ] **Step 1: Write the hook**

```ts
// packages/shared/src/hooks/useTripSharing.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import type { TripVisibility, LinkPermission } from '../types'

export function useTripSharing(tripId: string) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['tripSharing', tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('visibility, link_permission, share_link_token')
        .eq('id', tripId)
        .single()
      if (error) throw error
      return data as { visibility: TripVisibility; link_permission: LinkPermission; share_link_token: string | null }
    },
    enabled: !!tripId,
  })

  const update = useMutation({
    mutationFn: async (patch: Partial<{ visibility: TripVisibility; link_permission: LinkPermission; share_link_token: string }>) => {
      const { error } = await supabase.from('trips').update(patch).eq('id', tripId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tripSharing', tripId] }),
  })

  const generateToken = useMutation({
    mutationFn: async () => {
      const token = crypto.randomUUID()
      const { error } = await supabase.from('trips').update({ share_link_token: token }).eq('id', tripId)
      if (error) throw error
      return token
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tripSharing', tripId] }),
  })

  return { ...query, update: update.mutateAsync, generateToken: generateToken.mutateAsync, isUpdating: update.isPending }
}
```

- [ ] **Step 2: Add to hooks barrel**

Add to `packages/shared/src/hooks/index.ts`:
```ts
export { useTripSharing } from './useTripSharing'
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/hooks/useTripSharing.ts packages/shared/src/hooks/index.ts
git commit -m "feat: add useTripSharing hook"
```

---

## Task 8: `useCollaborators` hook

**Files:**
- Create: `packages/shared/src/hooks/useCollaborators.ts`

- [ ] **Step 1: Write the hook**

```ts
// packages/shared/src/hooks/useCollaborators.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import type { TripCollaborator, CollaboratorRole } from '../types'

export function useCollaborators(tripId: string) {
  const qc = useQueryClient()
  const key = ['collaborators', tripId]

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_collaborators')
        .select('*, profiles:user_id(display_name, avatar_url)')
        .eq('trip_id', tripId)
        .neq('invite_status', 'cancelled')
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as TripCollaborator[]
    },
    enabled: !!tripId,
  })

  const invite = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: CollaboratorRole }) => {
      const inviteToken = crypto.randomUUID()
      const { error } = await supabase.from('trip_collaborators').insert({
        trip_id: tripId,
        invited_email: email,
        invite_token: inviteToken,
        role_type: role,
        invite_status: 'pending',
        invited_by: (await supabase.auth.getUser()).data.user?.id,
      })
      if (error) throw error
      // Trigger email send — fire and forget; errors surfaced by the caller
      const { data: tripData } = await supabase.from('trips').select('title').eq('id', tripId).single()
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.functions.invoke('send-invite-email', {
        body: { inviteToken, invitedEmail: email, tripTitle: tripData?.title ?? '', inviterName: user?.email ?? '' },
      })
      return inviteToken
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  const updateRole = useMutation({
    mutationFn: async ({ collaboratorId, role }: { collaboratorId: string; role: CollaboratorRole }) => {
      const { error } = await supabase.from('trip_collaborators').update({ role_type: role }).eq('id', collaboratorId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  const remove = useMutation({
    mutationFn: async (collaboratorId: string) => {
      const { error } = await supabase.from('trip_collaborators').delete().eq('id', collaboratorId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  const cancel = useMutation({
    mutationFn: async (collaboratorId: string) => {
      const { error } = await supabase.from('trip_collaborators').update({ invite_status: 'cancelled' }).eq('id', collaboratorId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  })

  const resend = useMutation({
    mutationFn: async (collaboratorId: string) => {
      const { data: collab, error } = await supabase
        .from('trip_collaborators').select('invited_email, invite_token').eq('id', collaboratorId).single()
      if (error) throw error
      const { data: tripData } = await supabase.from('trips').select('title').eq('id', tripId).single()
      const { data: { user } } = await supabase.auth.getUser()
      const { error: fnError } = await supabase.functions.invoke('send-invite-email', {
        body: { inviteToken: collab.invite_token, invitedEmail: collab.invited_email, tripTitle: tripData?.title ?? '', inviterName: user?.email ?? '' },
      })
      if (fnError) throw fnError
    },
  })

  return {
    ...query,
    invite: invite.mutateAsync,
    updateRole: updateRole.mutateAsync,
    remove: remove.mutateAsync,
    cancel: cancel.mutateAsync,
    resend: resend.mutateAsync,
    isInviting: invite.isPending,
    inviteError: invite.error,
  }
}
```

- [ ] **Step 2: Add to hooks barrel**

```ts
export { useCollaborators } from './useCollaborators'
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add packages/shared/src/hooks/useCollaborators.ts packages/shared/src/hooks/index.ts
git commit -m "feat: add useCollaborators hook"
```

---

## Task 9: `useEffectivePermission` hook

**Files:**
- Create: `packages/shared/src/hooks/useEffectivePermission.ts`

- [ ] **Step 1: Write the hook**

```ts
// packages/shared/src/hooks/useEffectivePermission.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { useAuthStore } from '../stores/authStore'
import { useTripPermissionContext } from '../context/TripPermissionContext'
import type { CollaboratorRole } from '../types'

/** Returns the effective role for the current user on this trip.
 *  Priority order:
 *  1. Context says 'owner' (set by /trip/[id] Server Component) → always 'owner'
 *  2. Explicit trip_collaborators row (accepted) → use that role
 *  3. Fall back to context resolvedPermission (link visitor or default)
 */
export function useEffectivePermission(tripId: string): CollaboratorRole | 'owner' {
  const user = useAuthStore((s) => s.user)
  const { resolvedPermission } = useTripPermissionContext()

  const { data: collaboratorRole } = useQuery({
    queryKey: ['collaboratorRole', tripId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('trip_collaborators')
        .select('role_type')
        .eq('trip_id', tripId)
        .eq('user_id', user!.id)
        .eq('invite_status', 'accepted')
        .maybeSingle()
      return (data?.role_type ?? null) as CollaboratorRole | null
    },
    // Skip the query if context already resolved to 'owner' — no need to hit DB.
    enabled: !!user && !!tripId && resolvedPermission !== 'owner',
  })

  // 1. Owner context wins immediately (set by trip owner's /trip/[id] route).
  if (resolvedPermission === 'owner') return 'owner'
  // 2. Explicit collaborator row overrides link_permission.
  if (collaboratorRole) return collaboratorRole
  // 3. Fall back to server-resolved permission (link visitor).
  return resolvedPermission
}
```

- [ ] **Step 2: Add to hooks barrel**

```ts
export { useEffectivePermission } from './useEffectivePermission'
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add packages/shared/src/hooks/useEffectivePermission.ts packages/shared/src/hooks/index.ts
git commit -m "feat: add useEffectivePermission hook"
```

---

## Task 10: `useTripNotes` + `useNotesMutations` hooks

**Files:**
- Create: `packages/shared/src/hooks/useTripNotes.ts`
- Create: `packages/shared/src/hooks/useNotesMutations.ts`

- [ ] **Step 1: Write `useTripNotes`**

```ts
// packages/shared/src/hooks/useTripNotes.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../services/supabase'
import type { TripNote } from '../types'

export function useTripNotes(tripId: string) {
  const qc = useQueryClient()
  const key = ['tripNotes', tripId]

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_notes')
        .select('*, profiles:user_id(display_name)')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as TripNote[]
    },
    enabled: !!tripId,
  })

  // Realtime subscription
  useEffect(() => {
    if (!tripId) return
    const channel = supabase
      .channel(`trip-notes:${tripId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'trip_notes',
        filter: `trip_id=eq.${tripId}`,
      }, (payload) => {
        qc.setQueryData<TripNote[]>(key, (old = []) => {
          if (payload.eventType === 'DELETE') {
            return old.filter((n) => n.id !== (payload.old as TripNote).id)
          }
          const note = payload.new as TripNote
          const idx = old.findIndex((n) => n.id === note.id)
          if (idx === -1) return [...old, note]
          const updated = [...old]
          updated[idx] = note
          return updated
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tripId]) // eslint-disable-line react-hooks/exhaustive-deps

  return query
}
```

- [ ] **Step 2: Write `useNotesMutations`**

```ts
// packages/shared/src/hooks/useNotesMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import type { TripNote } from '../types'

export function useNotesMutations(tripId: string) {
  const qc = useQueryClient()
  const key = ['tripNotes', tripId]

  const createNote = useMutation({
    mutationFn: async (note: Omit<TripNote, 'id' | 'created_at' | 'updated_at' | 'author_name'>) => {
      const { data, error } = await supabase.from('trip_notes').insert(note).select().single()
      if (error) throw error
      return data as TripNote
    },
    onMutate: async (note) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<TripNote[]>(key)
      const optimistic: TripNote = { ...note, id: `optimistic-${Date.now()}`, created_at: '', updated_at: '' }
      qc.setQueryData<TripNote[]>(key, (old = []) => [...old, optimistic])
      return { prev, optimisticId: optimistic.id }
    },
    onSuccess: (real, _, ctx) => {
      // Replace optimistic entry with real server row
      qc.setQueryData<TripNote[]>(key, (old = []) =>
        old.map((n) => n.id === ctx?.optimisticId ? real : n)
      )
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
  })

  const updateNotePosition = useMutation({
    mutationFn: async ({ id, pos_x, pos_y }: { id: string; pos_x: number; pos_y: number }) => {
      const { error } = await supabase.from('trip_notes').update({ pos_x, pos_y }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, pos_x, pos_y }) => {
      const prev = qc.getQueryData<TripNote[]>(key)
      qc.setQueryData<TripNote[]>(key, (old = []) => old.map((n) => n.id === id ? { ...n, pos_x, pos_y } : n))
      return { prev }
    },
    onError: (_, __, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev) },
  })

  const updateNoteContent = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase.from('trip_notes').update({ content }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, content }) => {
      const prev = qc.getQueryData<TripNote[]>(key)
      qc.setQueryData<TripNote[]>(key, (old = []) => old.map((n) => n.id === id ? { ...n, content } : n))
      return { prev }
    },
    onError: (_, __, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev) },
  })

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('trip_notes').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      const prev = qc.getQueryData<TripNote[]>(key)
      qc.setQueryData<TripNote[]>(key, (old = []) => old.filter((n) => n.id !== id))
      return { prev }
    },
    onError: (_, __, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev) },
  })

  return { createNote: createNote.mutateAsync, updateNotePosition: updateNotePosition.mutateAsync, updateNoteContent: updateNoteContent.mutateAsync, deleteNote: deleteNote.mutateAsync }
}
```

- [ ] **Step 3: Add to hooks barrel**

```ts
export { useTripNotes } from './useTripNotes'
export { useNotesMutations } from './useNotesMutations'
```

- [ ] **Step 4: Typecheck + commit**

```bash
npm run typecheck
git add packages/shared/src/hooks/useTripNotes.ts packages/shared/src/hooks/useNotesMutations.ts \
  packages/shared/src/hooks/index.ts
git commit -m "feat: add useTripNotes and useNotesMutations hooks"
```

---

## Task 11: `middleware.ts`

**Files:**
- Create: `apps/web/middleware.ts`

- [ ] **Step 1: Write middleware**

```ts
// apps/web/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Leave the legacy share summary view unauthenticated-friendly
  if (/^\/trip\/[^/]+\/share\//.test(pathname)) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: (cs) => cs.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/t/:path*', '/invite/:path*', '/trip/:path*'],
}
```

- [ ] **Step 2: Install `@supabase/ssr` if not present**

```bash
cd apps/web && npm install @supabase/ssr
```

- [ ] **Step 3: Typecheck + commit**

```bash
npm run typecheck
git add apps/web/middleware.ts
git commit -m "feat: add auth middleware for /t, /invite, /trip routes"
```

---

## Task 12: `/t/[token]` share route

**Files:**
- Create: `apps/web/app/t/[token]/page.tsx`

- [ ] **Step 1: Write the Server Component**

```tsx
// apps/web/app/t/[token]/page.tsx
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { YjsTripProvider } from '@/components/calendar/providers/YjsTripProvider'
import { CalendarDashboard } from '@/components/calendar/CalendarDashboard'
import { TripPermissionProvider } from '@travyl/shared'
import type { CollaboratorRole } from '@travyl/shared'

export default async function ShareTripPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: trip } = await supabase
    .from('trips')
    .select('id, visibility, link_permission')
    .eq('share_link_token', token)
    .neq('visibility', 'private')
    .single()

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">This trip is private</h2>
          <p className="text-gray-500">The share link is invalid or the trip is no longer shared.</p>
        </div>
      </div>
    )
  }

  const { data: { user } } = await supabase.auth.getUser()
  const userName = user?.user_metadata?.display_name ?? user?.email ?? 'Anonymous'

  // Map link_permission ('view'|'comment'|'edit') to CollaboratorRole ('viewer'|'commenter'|'editor')
  const permissionMap: Record<string, CollaboratorRole> = {
    view: 'viewer',
    comment: 'commenter',
    edit: 'editor',
  }
  const resolvedPermission: CollaboratorRole = permissionMap[trip.link_permission] ?? 'viewer'

  return (
    <TripPermissionProvider resolvedPermission={resolvedPermission}>
      <YjsTripProvider tripId={trip.id}>
        <CalendarDashboard
          tripId={trip.id}
          userId={user!.id}
          userName={userName}
        />
      </YjsTripProvider>
    </TripPermissionProvider>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck
git add apps/web/app/t/
git commit -m "feat: add /t/[token] share route (Server Component)"
```

---

## Task 13: `/invite/[invite_token]` route

**Files:**
- Create: `apps/web/app/invite/[invite_token]/page.tsx`

- [ ] **Step 1: Write the route**

```tsx
// apps/web/app/invite/[invite_token]/page.tsx
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'

export default async function InvitePage({ params }: { params: Promise<{ invite_token: string }> }) {
  const { invite_token } = await params
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/invite/${invite_token}`)

  const { data: collab } = await supabase
    .from('trip_collaborators')
    .select('id, trip_id, invite_status, invited_email')
    .eq('invite_token', invite_token)
    .maybeSingle()

  if (!collab) return notFound()

  // Already accepted — idempotent redirect
  if (collab.invite_status === 'accepted') redirect(`/trip/${collab.trip_id}`)

  // Email mismatch
  if (collab.invited_email && collab.invited_email !== user.email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Wrong email address</h2>
          <p className="text-gray-500">This invite was sent to a different email address.</p>
        </div>
      </div>
    )
  }

  // Accept the invite
  const { error } = await supabase
    .from('trip_collaborators')
    .update({ invite_status: 'accepted', user_id: user.id, accepted_at: new Date().toISOString() })
    .eq('id', collab.id)

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Failed to accept invite. Please try again.</p>
      </div>
    )
  }

  redirect(`/trip/${collab.trip_id}`)
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck
git add apps/web/app/invite/
git commit -m "feat: add /invite/[token] acceptance route"
```

---

## Task 14: `ShareModal` component

**Files:**
- Create: `apps/web/components/trip/ShareModal.tsx`

- [ ] **Step 1: Write `ShareModal`**

This is a large client component. Build it in sections. Full implementation:

```tsx
// apps/web/components/trip/ShareModal.tsx
'use client'
import { useState } from 'react'
import { X, Copy, RefreshCw, Link, Globe, Lock, Check } from 'lucide-react'
import { useTripSharing, useCollaborators, useAuthStore, isTripOwner } from '@travyl/shared'
import type { CollaboratorRole, TripVisibility, LinkPermission, TripCollaborator } from '@travyl/shared'

interface ShareModalProps {
  tripId: string
  onClose: () => void
}

const VISIBILITY_OPTIONS: { value: TripVisibility; label: string; icon: React.ReactNode }[] = [
  { value: 'private', label: 'Private', icon: <Lock size={14} /> },
  { value: 'link',    label: 'Link',    icon: <Link size={14} /> },
  { value: 'public',  label: 'Public',  icon: <Globe size={14} /> },
]

const PERMISSION_OPTIONS: { value: LinkPermission; label: string }[] = [
  { value: 'view',    label: 'View only' },
  { value: 'comment', label: 'Can comment' },
  { value: 'edit',    label: 'Can edit' },
]

const ROLE_OPTIONS: { value: CollaboratorRole; label: string }[] = [
  { value: 'viewer',    label: 'Viewer' },
  { value: 'commenter', label: 'Commenter' },
  { value: 'editor',    label: 'Editor' },
]

export function ShareModal({ tripId, onClose }: ShareModalProps) {
  const user = useAuthStore((s) => s.user)
  const { data: sharing, update, generateToken, isUpdating } = useTripSharing(tripId)
  const { data: collaborators = [], invite, updateRole, remove, cancel, resend, isInviting, inviteError } = useCollaborators(tripId)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>('viewer')
  const [copied, setCopied] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const shareUrl = sharing?.share_link_token
    ? `${window.location.origin}/t/${sharing.share_link_token}`
    : null

  const toast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000) }

  const handleVisibilityChange = async (v: TripVisibility) => {
    if ((v === 'link' || v === 'public') && !sharing?.share_link_token) {
      await generateToken()
    }
    await update({ visibility: v })
  }

  const handleCopy = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = async () => {
    await generateToken()
    toast('Link regenerated — old links no longer work')
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    try {
      await invite({ email: inviteEmail.trim(), role: inviteRole })
      setInviteEmail('')
      toast('Invite sent!')
    } catch (e) {
      toast('Failed to send invite')
    }
  }

  const accepted = collaborators.filter((c) => c.invite_status === 'accepted')
  const pending  = collaborators.filter((c) => c.invite_status === 'pending')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Share trip</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        {/* Visibility */}
        <div className="flex gap-2 mb-4">
          {VISIBILITY_OPTIONS.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => handleVisibilityChange(value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                sharing?.visibility === value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Share link */}
        {sharing?.visibility !== 'private' && (
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-500 truncate">
                {shareUrl ?? 'Generating…'}
              </div>
              <button onClick={handleCopy} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 flex items-center gap-1">
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Anyone with link can</span>
                <select
                  value={sharing?.link_permission ?? 'view'}
                  onChange={(e) => update({ link_permission: e.target.value as LinkPermission })}
                  className="text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1"
                >
                  {PERMISSION_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <button onClick={handleRegenerate} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <RefreshCw size={11} />Regenerate
              </button>
            </div>
          </div>
        )}

        {/* Invite */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Collaborators</p>
          <div className="flex gap-2">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              placeholder="Email address"
              className="flex-1 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 outline-none border border-transparent focus:border-indigo-400"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as CollaboratorRole)}
              className="text-sm bg-gray-100 dark:bg-gray-700 rounded-lg px-2"
            >
              {ROLE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button
              onClick={handleInvite}
              disabled={isInviting || !inviteEmail.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Invite
            </button>
          </div>
        </div>

        {/* Accepted collaborators */}
        {accepted.length > 0 && (
          <div className="space-y-2 mb-3">
            {accepted.map((c) => (
              <CollaboratorRow key={c.id} collab={c} onUpdateRole={(role) => updateRole({ collaboratorId: c.id, role })} onRemove={() => remove(c.id)} />
            ))}
          </div>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <div className="space-y-2">
            {pending.map((c) => (
              <PendingRow key={c.id} collab={c} onResend={() => resend(c.id)} onCancel={() => cancel(c.id)} />
            ))}
          </div>
        )}

        {/* Toast */}
        {toastMsg && (
          <div className="mt-3 text-xs text-center text-indigo-600 font-medium">{toastMsg}</div>
        )}
      </div>
    </div>
  )
}

function CollaboratorRow({ collab, onUpdateRole, onRemove }: {
  collab: TripCollaborator
  onUpdateRole: (role: CollaboratorRole) => void
  onRemove: () => void
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
          {(collab.display_name ?? collab.invited_email ?? '?')[0].toUpperCase()}
        </div>
        <span className="text-sm text-gray-700 dark:text-gray-300">{collab.display_name ?? collab.invited_email}</span>
      </div>
      <div className="flex items-center gap-2">
        <select value={collab.role_type} onChange={(e) => onUpdateRole(e.target.value as CollaboratorRole)} className="text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1">
          {ROLE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
      </div>
    </div>
  )
}

function PendingRow({ collab, onResend, onCancel }: {
  collab: TripCollaborator
  onResend: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">?</div>
        <div>
          <span className="text-sm text-gray-600">{collab.invited_email}</span>
          <span className="ml-2 text-xs text-amber-500 font-medium">Pending</span>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onResend} className="text-xs text-gray-400 hover:text-gray-600">Resend</button>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-red-500">Cancel</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
npm run typecheck
git add apps/web/components/trip/ShareModal.tsx
git commit -m "feat: add ShareModal component"
```

---

## Task 15: Wire Share button + role badge in `CalendarHeader`

**Files:**
- Modify: `apps/web/components/calendar/CalendarHeader.tsx`
- Modify: `apps/web/app/(main)/trip/[id]/page.tsx`

- [ ] **Step 1: Update `CalendarHeader`**

`CalendarHeader` already has `onShare: () => void` prop (line 16) and a Share button (line 157). Add a `permission` prop for the role badge:

```tsx
// Add to CalendarHeaderProps interface:
permission?: 'viewer' | 'commenter' | 'editor' | 'owner'
```

**You must wrap the existing Share button** so it only shows for owners, and add a role badge for non-owners. Find the Share button in the JSX and replace it with:

```tsx
{permission && permission !== 'owner' && (
  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full capitalize">
    {permission === 'viewer' ? 'Viewing' : permission === 'commenter' ? 'Commenting' : 'Editing'}
  </span>
)}
{(!permission || permission === 'owner') && (
  <button onClick={onShare} /* keep all existing props/classes unchanged */>
    {/* existing button content unchanged */}
  </button>
)}
```

The `!permission` guard preserves backward compatibility for any callers that don't pass the prop yet.

- [ ] **Step 2: Update `apps/web/app/(main)/trip/[id]/page.tsx`**

Wrap with `TripPermissionProvider` with `resolvedPermission='owner'`:

```tsx
import { TripPermissionProvider } from '@travyl/shared'

// Inside return:
<TripPermissionProvider resolvedPermission="owner">
  <YjsTripProvider tripId={tripId}>
    <CalendarDashboard tripId={tripId} userId={userId} userName={userName} />
  </YjsTripProvider>
</TripPermissionProvider>
```

- [ ] **Step 3: Connect ShareModal in `CalendarDashboard`**

Find where `CalendarHeader` is rendered in `CalendarDashboard`. Add state for modal open/close:

```tsx
const [shareOpen, setShareOpen] = useState(false)
// ...
<CalendarHeader onShare={() => setShareOpen(true)} permission={effectivePermission} ... />
{shareOpen && <ShareModal tripId={tripId} onClose={() => setShareOpen(false)} />}
```

Import `useEffectivePermission` from `@travyl/shared` and call it to get `effectivePermission`.

- [ ] **Step 4: Typecheck + commit**

```bash
npm run typecheck
git add apps/web/components/calendar/CalendarHeader.tsx \
  apps/web/app/(main)/trip/[id]/page.tsx \
  apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire ShareModal and role badge into CalendarHeader"
```

---

## Task 16: `DayColumn` — shiftKey guard + note placement

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx`

- [ ] **Step 1: Add `onShiftClick` prop and update handlers**

```tsx
// Add to DayColumnProps:
onShiftClick?: (day: Date, pos_x: number, pos_y: number) => void
```

Update `handleMouseUp` to check `shiftKey`:

```ts
const handleMouseUp = (e: React.MouseEvent) => {
  if (!mouseDownPos.current) return
  const dx = Math.abs(e.clientX - mouseDownPos.current.x)
  const dy = Math.abs(e.clientY - mouseDownPos.current.y)
  mouseDownPos.current = null
  if (dx >= 5 || dy >= 5) return

  if (e.shiftKey) {
    // Note placement
    if (!onShiftClick) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pos_x = Math.min(0.95, Math.max(0.05, (e.clientX - rect.left) / rect.width))
    const pos_y = Math.min(0.95, Math.max(0.05, (e.clientY - rect.top) / rect.height))
    const day = new Date(tripStartDate.getTime() + dayIndex * 24 * 60 * 60 * 1000)
    onShiftClick(day, pos_x, pos_y)
    return
  }

  // Existing activity creation
  if (!onCreateActivity) return
  const rect = e.currentTarget.getBoundingClientRect()
  const offsetY = e.clientY - rect.top
  const rawHour = timeRange.startHour + offsetY / HOUR_HEIGHT
  const snappedHour = Math.round(rawHour * 2) / 2
  onCreateActivity(dayIndex, snappedHour)
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx
git commit -m "feat: add shiftKey guard and onShiftClick to DayColumn"
```

---

## Task 17: `NoteOverlay` component

**Files:**
- Create: `apps/web/components/calendar/NoteOverlay.tsx`

- [ ] **Step 1: Write the component**

```tsx
// apps/web/components/calendar/NoteOverlay.tsx
'use client'
import { useState, useRef } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import type { TripNote } from '@travyl/shared'

interface NoteOverlayProps {
  notes: TripNote[]
  day: Date
  currentUserId: string | null
  isOwner: boolean
  canAddNotes: boolean
  onUpdatePosition: (id: string, pos_x: number, pos_y: number) => void
  onUpdateContent: (id: string, content: string) => void
  onDelete: (id: string) => void
  containerRef: React.RefObject<HTMLDivElement>
}

function StickyNote({
  note,
  currentUserId,
  isOwner,
  onUpdateContent,
  onDelete,
  containerRef,
}: {
  note: TripNote
  currentUserId: string | null
  isOwner: boolean
  onUpdateContent: (id: string, content: string) => void
  onDelete: (id: string) => void
  containerRef: React.RefObject<HTMLDivElement>
}) {
  const [editing, setEditing] = useState(note.content === '')
  const [draft, setDraft] = useState(note.content)
  const canEdit = note.user_id === currentUserId
  const canDelete = canEdit || isOwner

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: note.id })

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${note.pos_x * 100}%`,
    top: `${note.pos_y * 100}%`,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    zIndex: isDragging ? 50 : 20,
    opacity: isDragging ? 0.8 : 1,
  }

  const rotation = ((note.id.charCodeAt(0) % 7) - 3) * 1.5 // deterministic slight rotation

  return (
    <div ref={setNodeRef} style={style} className="group w-24 select-none">
      <div
        style={{ backgroundColor: note.color, transform: `rotate(${rotation}deg)` }}
        className="rounded shadow-md p-2 min-h-[80px] relative cursor-default"
      >
        {/* Drag handle */}
        {canEdit && (
          <div
            {...listeners}
            {...attributes}
            className="absolute top-1 left-1 cursor-grab opacity-0 group-hover:opacity-60 text-gray-600"
            style={{ fontSize: 10 }}
          >⠿</div>
        )}
        {/* Delete */}
        {canDelete && (
          <button
            onClick={() => onDelete(note.id)}
            className="absolute top-0.5 right-1 opacity-0 group-hover:opacity-70 text-gray-700 text-xs leading-none"
          >✕</button>
        )}
        {/* Content */}
        {editing && canEdit ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              onUpdateContent(note.id, draft)
              setEditing(false)
            }}
            className="w-full text-xs bg-transparent resize-none outline-none text-gray-800 mt-3"
            rows={3}
          />
        ) : (
          <p
            onClick={() => canEdit && setEditing(true)}
            className={`text-xs text-gray-800 mt-3 whitespace-pre-wrap break-words ${canEdit ? 'cursor-text' : ''}`}
          >
            {note.content || <span className="italic text-gray-500">Empty</span>}
          </p>
        )}
        {/* Author */}
        <p className="text-[9px] text-gray-500 mt-1 text-right truncate">
          — {note.author_name ?? (note.user_id ? '?' : 'Unknown')}
        </p>
      </div>
    </div>
  )
}

export function NoteOverlay({
  notes,
  day,
  currentUserId,
  isOwner,
  canAddNotes,
  onUpdatePosition,
  onUpdateContent,
  onDelete,
  containerRef,
}: NoteOverlayProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const dayStr = day.toISOString().split('T')[0]
  const dayNotes = notes.filter((n) => n.day === dayStr)

  function handleDragEnd(event: any) {
    const { active, delta } = event
    const note = dayNotes.find((n) => n.id === active.id)
    if (!note || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const newPosX = Math.min(0.95, Math.max(0.05, note.pos_x + delta.x / rect.width))
    const newPosY = Math.min(0.95, Math.max(0.05, note.pos_y + delta.y / rect.height))
    onUpdatePosition(active.id, newPosX, newPosY)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
        <div className="relative w-full h-full pointer-events-auto">
          {dayNotes.map((note) => (
            <StickyNote
              key={note.id}
              note={note}
              currentUserId={currentUserId}
              isOwner={isOwner}
              onUpdateContent={onUpdateContent}
              onDelete={onDelete}
              containerRef={containerRef}
            />
          ))}
        </div>
      </div>
    </DndContext>
  )
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/NoteOverlay.tsx
git commit -m "feat: add NoteOverlay post-it component with dnd-kit"
```

---

## Task 18: Wire notes into `WeekView`

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx` — hoist note hooks here (already has `tripId`)
- Modify: `apps/web/components/calendar/WeekView.tsx` — receive notes props + render NoteOverlay per column

**Why hoist to CalendarDashboard?** `WeekView` does not receive `tripId` as a prop. Rather than thread `tripId` through, hoist the hooks into `CalendarDashboard` (which already has `tripId`) and pass derived note data down.

- [ ] **Step 1: Find where DayColumn is rendered in WeekView**

```bash
grep -n "DayColumn" apps/web/components/calendar/WeekView.tsx
```

- [ ] **Step 2: Add note hooks to `CalendarDashboard`**

`CalendarDashboard` already has `tripId`. Add these hooks there:

```tsx
import { useTripNotes, useNotesMutations, useEffectivePermission, useAuthStore, pickColor } from '@travyl/shared'
import type { TripNote } from '@travyl/shared'

// Inside CalendarDashboard (alongside existing hooks):
const user = useAuthStore((s) => s.user)
const { data: notes = [] } = useTripNotes(tripId)
const { createNote, updateNotePosition, updateNoteContent, deleteNote } = useNotesMutations(tripId)
const effectivePermission = useEffectivePermission(tripId)
const canAddNotes = ['commenter', 'editor', 'owner'].includes(effectivePermission)
const isOwner = effectivePermission === 'owner'
```

Pass these as props to `WeekView` (add to `WeekViewProps` interface first):

```tsx
<WeekView
  ...existingProps
  notes={notes}
  canAddNotes={canAddNotes}
  isOwner={isOwner}
  currentUserId={user?.id ?? null}
  onCreateNote={(day, pos_x, pos_y) => createNote({
    trip_id: tripId,
    user_id: user!.id,
    activity_id: null,
    day: day.toISOString().split('T')[0],
    pos_x,
    pos_y,
    content: '',
    color: pickColor(user!.id),
  })}
  onUpdateNotePosition={updateNotePosition}
  onUpdateNoteContent={updateNoteContent}
  onDeleteNote={deleteNote}
/>
```

- [ ] **Step 3: Update `WeekView` to render NoteOverlay per column**

Add props to `WeekViewProps`:

```tsx
notes: TripNote[]
canAddNotes: boolean
isOwner: boolean
currentUserId: string | null
onCreateNote: (day: Date, pos_x: number, pos_y: number) => void
onUpdateNotePosition: (id: string, pos_x: number, pos_y: number) => void
onUpdateNoteContent: (id: string, content: string) => void
onDeleteNote: (id: string) => void
```

Inside `WeekView`, import `NoteOverlay` and add per-column refs. **Use a ref array — not a single ref — because multiple columns render in a loop:**

```tsx
import { NoteOverlay } from './NoteOverlay'
import { useRef } from 'react'

// At component top level:
const colRefs = useRef<(HTMLDivElement | null)[]>([])

// Inside the map/loop that renders each DayColumn (index = loop index):
<div
  key={dayDate.toISOString()}
  ref={(el) => { colRefs.current[index] = el }}
  className="relative flex-1 min-w-0"
>
  <DayColumn
    ...existingProps
    onShiftClick={canAddNotes ? (day, pos_x, pos_y) => onCreateNote(day, pos_x, pos_y) : undefined}
  />
  <NoteOverlay
    notes={notes}
    day={dayDate}
    currentUserId={currentUserId}
    isOwner={isOwner}
    canAddNotes={canAddNotes}
    onUpdatePosition={onUpdateNotePosition}
    onUpdateContent={onUpdateNoteContent}
    onDelete={onDeleteNote}
    containerRef={{ current: colRefs.current[index] ?? null }}
  />
</div>
```

- [ ] **Step 4: Typecheck + test manually**

```bash
npm run typecheck
npm run web
```

Manual test:
1. Open a trip calendar
2. Shift+Click on an empty day column → post-it note appears
3. Type in the note → blur → content saved
4. Drag note → repositions

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx \
  apps/web/components/calendar/WeekView.tsx
git commit -m "feat: integrate NoteOverlay into WeekView with Shift+Click placement"
```

---

## Task 19: `send-invite-email` Edge Function

**Files:**
- Create: `supabase/functions/send-invite-email/index.ts`

- [ ] **Step 1: Write the function**

```ts
// supabase/functions/send-invite-email/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

interface Payload {
  inviteToken: string
  invitedEmail: string
  tripTitle: string
  inviterName: string
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const { inviteToken, invitedEmail, tripTitle, inviterName }: Payload = await req.json()

  const inviteUrl = `${Deno.env.get('APP_URL')}/invite/${inviteToken}`

  const html = `
    <p>${inviterName} invited you to collaborate on <strong>${tripTitle}</strong>.</p>
    <p><a href="${inviteUrl}">Accept Invite</a></p>
    <p>Or copy this link: ${inviteUrl}</p>
  `

  // Use Resend or SMTP — example with Resend:
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500 })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Travyl <noreply@travyl.app>',
      to: [invitedEmail],
      subject: `${inviterName} invited you to "${tripTitle}"`,
      html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return new Response(JSON.stringify({ error: err }), { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 })
})
```

- [ ] **Step 2: Set secrets**

```bash
# In Supabase dashboard or via CLI:
supabase secrets set RESEND_API_KEY=<your-key>
supabase secrets set APP_URL=https://travyl.app
```

- [ ] **Step 3: Deploy**

```bash
supabase functions deploy send-invite-email
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/
git commit -m "feat: add send-invite-email Edge Function"
```

---

## Task 20: Final typecheck + lint + test pass

- [ ] **Step 1: Full typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: zero new lint errors.

- [ ] **Step 3: Unit tests**

```bash
cd packages/shared && npm test
```

Expected: all pass.

- [ ] **Step 4: Manual smoke test**

1. Open a trip as owner → Share button visible → Share modal opens → set to Link → copy URL → works
2. Open share URL in incognito (logged in) → calendar renders read-only
3. Shift+Click on calendar → note appears → type → blur → persists on reload
4. Drag note → repositions
5. Invite collaborator by email → they receive email → accept invite → see correct role badge
6. Commenter visitor: Shift+Click works; create activity button absent

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: trip sharing — complete Branch 1 (visibility, permissions, notes, invite flow)"
```
