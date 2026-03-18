# Trip Sharing & Post-it Notes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Docs-style trip sharing with visibility tiers, collaborator invites via SES, permission gating, and free-floating post-it notes on the calendar canvas.

**Architecture:** Three-tier visibility (private/link/public) replaces old boolean sharing flags. `TripPermissionContext` gates UI based on collaborator role. Post-it notes are simple CRUD rows synced via Supabase Realtime Postgres Changes. Email invites go through an SST Lambda calling SES.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, @dnd-kit/core, Supabase (RLS + Realtime), SST v3 (Lambda + SES), vitest

**Spec:** `docs/superpowers/specs/2026-03-17-trip-sharing-design.md`

---

## Chunk 1: Foundation — Types, Permissions, API Functions

### Task 1: Add new types to shared package

**Files:**
- Modify: `packages/shared/src/types/index.ts`

- [ ] **Step 1: Add Visibility, LinkPermission, CollaboratorRole types**

After the existing type exports, add:

```ts
export type Visibility = 'private' | 'link' | 'public'
export type LinkPermission = 'viewer' | 'editor'
export type CollaboratorRole = 'viewer' | 'editor'
```

- [ ] **Step 2: Add TripNote interface**

```ts
export interface TripNote {
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
```

- [ ] **Step 3: Add TripCollaborator interface**

```ts
export interface TripCollaborator {
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

- [ ] **Step 4: Update Trip interface — replace sharing fields**

In the existing `Trip` interface, replace:
```ts
is_shared: boolean
is_public: boolean
share_link_role: 'viewer' | 'editor'
```

With:
```ts
visibility: Visibility
link_permission: LinkPermission
```

Keep `share_link_token: string | null` unchanged.

- [ ] **Step 5: Add EffectivePermission interface**

```ts
export interface EffectivePermission {
  role: 'owner' | 'editor' | 'viewer'
  canEdit: boolean
  canDelete: boolean
  canInvite: boolean
  canCreateNotes: boolean
}
```

- [ ] **Step 6: Run typecheck to see what breaks**

Run: `npm run typecheck 2>&1 | head -60`
Expected: Type errors in `permissions.ts`, `api.ts`, share page, and anywhere referencing `is_shared`/`is_public`/`share_link_role`. This is expected — we'll fix them in subsequent tasks.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/types/index.ts
git commit -m "feat: add trip sharing and post-it note types

Add Visibility, LinkPermission, CollaboratorRole types.
Add TripNote and TripCollaborator interfaces.
Add EffectivePermission interface.
Update Trip interface to use visibility/link_permission."
```

---

### Task 2: Update permission helpers

**Files:**
- Modify: `packages/shared/src/utils/permissions.ts`
- Modify: `packages/shared/src/utils/permissions.test.ts` (create if not exists)

- [ ] **Step 1: Write tests for updated permission helpers**

Create `packages/shared/src/utils/permissions.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { canEditTrip, canViewTrip, canForkTrip, isTripOwner, canMakePublic } from './permissions'
import type { Trip } from '../types'

// Note: userId params accept string | null to match existing callers
// (null when user is not logged in)

const baseTripFields = {
  id: 'trip-1',
  user_id: 'owner-1',
  title: 'Test Trip',
  destination: 'Paris',
  start_date: '2026-06-01',
  end_date: '2026-06-07',
  status: 'planning' as const,
  created_at: '',
  updated_at: '',
  budget: 0,
  currency: 'USD',
  travelers: 1,
  trip_context: {},
  is_generated: false,
  share_link_token: 'abc123',
  forked_from_trip_id: null,
  fork_count: 0,
  theme: null,
  custom_theme_color: null,
}

const privateTrip: Trip = {
  ...baseTripFields,
  visibility: 'private',
  link_permission: 'viewer',
}

const linkTrip: Trip = {
  ...baseTripFields,
  visibility: 'link',
  link_permission: 'editor',
}

const publicTrip: Trip = {
  ...baseTripFields,
  visibility: 'public',
  link_permission: 'viewer',
}

describe('isTripOwner', () => {
  it('returns true for owner', () => {
    expect(isTripOwner(privateTrip, 'owner-1')).toBe(true)
  })
  it('returns false for non-owner', () => {
    expect(isTripOwner(privateTrip, 'other-user')).toBe(false)
  })
})

describe('canViewTrip', () => {
  it('owner can always view', () => {
    expect(canViewTrip(privateTrip, 'owner-1')).toBe(true)
  })
  it('non-owner cannot view private trip', () => {
    expect(canViewTrip(privateTrip, 'other-user')).toBe(false)
  })
  it('non-owner can view link trip', () => {
    expect(canViewTrip(linkTrip, 'other-user')).toBe(true)
  })
  it('non-owner can view public trip', () => {
    expect(canViewTrip(publicTrip, 'other-user')).toBe(true)
  })
})

describe('canEditTrip', () => {
  it('owner can always edit', () => {
    expect(canEditTrip(privateTrip, 'owner-1')).toBe(true)
  })
  it('non-owner cannot edit private trip', () => {
    expect(canEditTrip(privateTrip, 'other-user')).toBe(false)
  })
  it('non-owner can edit link trip with editor permission', () => {
    expect(canEditTrip(linkTrip, 'other-user')).toBe(true)
  })
  it('non-owner cannot edit public trip with viewer permission', () => {
    expect(canEditTrip(publicTrip, 'other-user')).toBe(false)
  })
})

describe('canForkTrip', () => {
  it('cannot fork own trip', () => {
    expect(canForkTrip(publicTrip, 'owner-1')).toBe(false)
  })
  it('can fork public trip', () => {
    expect(canForkTrip(publicTrip, 'other-user')).toBe(true)
  })
  it('cannot fork private trip', () => {
    expect(canForkTrip(privateTrip, 'other-user')).toBe(false)
  })
  it('cannot fork link trip', () => {
    expect(canForkTrip(linkTrip, 'other-user')).toBe(false)
  })
})

describe('canMakePublic', () => {
  it('owner can make public', () => {
    expect(canMakePublic(privateTrip, 'owner-1')).toBe(true)
  })
  it('non-owner cannot make public', () => {
    expect(canMakePublic(privateTrip, 'other-user')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/shared && npx vitest run src/utils/permissions.test.ts`
Expected: FAIL — current helpers use `is_shared`/`is_public` which no longer exist on Trip type.

- [ ] **Step 3: Rewrite permission helpers**

Replace the contents of `packages/shared/src/utils/permissions.ts`:

```ts
import type { Trip } from '../types'

/**
 * Returns true if the given userId is the trip owner.
 */
export function isTripOwner(trip: Trip, userId: string | null): boolean {
  if (!userId) return false
  return trip.user_id === userId
}

/**
 * Returns true if the user can view the trip via trip-level flags.
 * Owner always can. Non-owners can view if visibility is 'link' or 'public'.
 * Note: collaborator-level access (invited to a private trip) is checked
 * via TripPermissionContext, not here. These helpers only check trip-level flags.
 */
export function canViewTrip(trip: Trip, userId: string | null): boolean {
  if (isTripOwner(trip, userId)) return true
  return trip.visibility !== 'private'
}

/**
 * Returns true if the user can edit via trip-level flags.
 * Owner always can. Non-owners can edit if visibility is 'link' or 'public'
 * AND link_permission is 'editor'.
 * Note: collaborator-level edit permission is checked via TripPermissionContext.
 */
export function canEditTrip(trip: Trip, userId: string | null): boolean {
  if (isTripOwner(trip, userId)) return true
  if (trip.visibility === 'private') return false
  return trip.link_permission === 'editor'
}

/**
 * Returns true if the user can fork the trip.
 * Only public trips can be forked, and not by the owner.
 * Breaking change: previously allowed forking shared (link) trips too.
 */
export function canForkTrip(trip: Trip, userId: string | null): boolean {
  if (isTripOwner(trip, userId)) return false
  return trip.visibility === 'public'
}

/**
 * Returns true if the user can change the trip's visibility to public.
 * Only the owner can do this.
 */
export function canMakePublic(trip: Trip, userId: string | null): boolean {
  return isTripOwner(trip, userId)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/shared && npx vitest run src/utils/permissions.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/utils/permissions.ts packages/shared/src/utils/permissions.test.ts
git commit -m "feat: update permission helpers for visibility model

Replace is_shared/is_public/share_link_role checks with
visibility/link_permission. Add comprehensive tests."
```

---

### Task 3: Add collaborator and note API functions

**Files:**
- Modify: `packages/shared/src/services/api.ts`

- [ ] **Step 1: Add necessary imports at top of api.ts**

Add to the import section of `packages/shared/src/services/api.ts`:

```ts
import type {
  TripCollaborator,
  TripNote,
  Visibility,
  LinkPermission,
  CollaboratorRole,
} from '../types'
```

- [ ] **Step 2: Add collaborator API functions**

Add to `packages/shared/src/services/api.ts`:

```ts
// ── Collaborators ──────────────────────────────────────

export async function fetchCollaborators(tripId: string): Promise<TripCollaborator[]> {
  const { data, error } = await supabase
    .from('trip_collaborators')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function updateCollaboratorRole(
  collaboratorId: string,
  role: CollaboratorRole
): Promise<void> {
  const { error } = await supabase
    .from('trip_collaborators')
    .update({ role_type: role })
    .eq('id', collaboratorId)

  if (error) throw error
}

export async function removeCollaborator(collaboratorId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_collaborators')
    .delete()
    .eq('id', collaboratorId)

  if (error) throw error
}

export async function acceptInviteByToken(
  inviteToken: string,
  userId: string
): Promise<{ tripId: string }> {
  const { data, error } = await supabase
    .from('trip_collaborators')
    .update({
      user_id: userId,
      invite_status: 'accepted',
      accepted_at: new Date().toISOString(),
    })
    .eq('invite_token', inviteToken)
    .eq('invite_status', 'pending')
    .select('trip_id')
    .single()

  if (error) throw error
  return { tripId: data.trip_id }
}

export async function joinTripViaLink(
  tripId: string,
  userId: string,
  role: CollaboratorRole
): Promise<void> {
  const { error } = await supabase
    .from('trip_collaborators')
    .insert({
      trip_id: tripId,
      user_id: userId,
      role_type: role,
      invite_status: 'accepted',
      invited_by: userId,
      accepted_at: new Date().toISOString(),
    })

  if (error) throw error
}

export async function findPendingInviteByEmail(
  tripId: string,
  email: string
): Promise<TripCollaborator | null> {
  const { data, error } = await supabase
    .from('trip_collaborators')
    .select('*')
    .eq('trip_id', tripId)
    .eq('invited_email', email.toLowerCase())
    .eq('invite_status', 'pending')
    .maybeSingle()

  if (error) throw error
  return data
}
```

- [ ] **Step 3: Add trip notes API functions**

```ts
// ── Trip Notes ─────────────────────────────────────────

export async function fetchTripNotes(tripId: string): Promise<TripNote[]> {
  const { data, error } = await supabase
    .from('trip_notes')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createTripNote(
  tripId: string,
  userId: string,
  day: number,
  hour: number,
  color: string
): Promise<TripNote> {
  const { data, error } = await supabase
    .from('trip_notes')
    .insert({
      trip_id: tripId,
      user_id: userId,
      day,
      hour,
      text: '',
      color,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateTripNote(
  noteId: string,
  text: string
): Promise<void> {
  const { error } = await supabase
    .from('trip_notes')
    .update({ text })
    .eq('id', noteId)

  if (error) throw error
}

export async function moveTripNote(
  noteId: string,
  day: number,
  hour: number
): Promise<void> {
  const { error } = await supabase
    .from('trip_notes')
    .update({ day, hour })
    .eq('id', noteId)

  if (error) throw error
}

export async function deleteTripNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_notes')
    .delete()
    .eq('id', noteId)

  if (error) throw error
}
```

- [ ] **Step 4: Add/update updateTripVisibility function**

The existing `updateTripVisibility` (if present) returns `Promise<Trip>` and takes `(tripId, isPublic: boolean)`. Replace it with the new signature below. **Note:** any callers using the return value will need updating in Task 4.

```ts
export async function updateTripVisibility(
  tripId: string,
  visibility: Visibility,
  linkPermission?: LinkPermission
): Promise<void> {
  const updates: Record<string, unknown> = { visibility }
  if (linkPermission !== undefined) {
    updates.link_permission = linkPermission
  }
  const { error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', tripId)

  if (error) throw error
}

export async function ensureShareLinkToken(tripId: string): Promise<string> {
  // Check if trip already has a token
  const { data: trip, error: fetchError } = await supabase
    .from('trips')
    .select('share_link_token')
    .eq('id', tripId)
    .single()

  if (fetchError) throw fetchError
  if (trip.share_link_token) return trip.share_link_token

  // Generate and save a new token
  const token = crypto.randomUUID()
  const { error: updateError } = await supabase
    .from('trips')
    .update({ share_link_token: token })
    .eq('id', tripId)

  if (updateError) throw updateError
  return token
}
```

- [ ] **Step 5: Update shared package exports**

In `packages/shared/src/index.ts`, verify that `types`, `services`, and `utils` are re-exported. They should already be via wildcard exports. If not, add explicit re-exports for the new functions.

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck 2>&1 | head -40`
Expected: Remaining errors should only be in files we haven't touched yet (share page, etc.), not in the files we just modified.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/services/api.ts packages/shared/src/index.ts
git commit -m "feat: add collaborator and trip note API functions

Add CRUD for trip_collaborators and trip_notes.
Add updateTripVisibility and ensureShareLinkToken helpers."
```

---

### Task 4: Fix existing share page and other type errors

**Files:**
- Modify: `apps/web/app/(main)/trip/[id]/share/[token]/page.tsx`
- Modify: any other files with type errors from the Trip interface change

- [ ] **Step 1: Identify all remaining type errors**

Run: `npm run typecheck 2>&1`
List all files with errors related to `is_shared`, `is_public`, `share_link_role`.

- [ ] **Step 2: Fix each file**

Apply these replacements:
- `trip.is_shared` → `trip.visibility !== 'private'`
- `trip.is_public` → `trip.visibility === 'public'`
- `trip.share_link_role` → `trip.link_permission`
- `is_shared: false` (in object literals) → `visibility: 'private' as const, link_permission: 'viewer' as const`
- `is_shared: true` → `visibility: 'link' as const`
- `is_public: true` → `visibility: 'public' as const`
- `is_public: false` → (remove, covered by visibility)

**Specific files to fix:**

1. **`api.ts` — `forkTrip()`**: Replace `is_shared: false, is_public: false` with `visibility: 'private', link_permission: 'viewer'` in the forked trip insert. Also destructures `is_public` — replace with `visibility`.

2. **`api.ts` — `fetchPublicTrips()`**: Replace `.eq('is_public', true)` with `.eq('visibility', 'public')`.

3. **`api.ts` — `fetchUserPublicTrips()`**: Same — replace `.eq('is_public', true)` with `.eq('visibility', 'public')`.

4. **`api.ts` — old `updateTripVisibility()`**: Remove if it still exists (replaced in Task 3).

5. **Share page (`trip/[id]/share/[token]/page.tsx`)**: Replace `trip.is_shared` and `trip.is_public` references.

6. **Mock data files** (`mockTripsData.ts`, etc.): Add `visibility: 'private'` and `link_permission: 'viewer'` fields, remove old `is_shared`/`is_public`/`share_link_role`.

7. **View models** (`tripViewModel.ts`, `tripViewModel.test.ts`): Update any field references.

8. **UI components** (`TripCard.tsx`, `TripListItem.tsx`, settings page): Update conditional rendering that checks old fields.

- [ ] **Step 3: Run typecheck to verify all errors resolved**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 4: Run existing tests**

Run: `cd packages/shared && npx vitest run`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: update all references from old sharing fields to visibility model

Replace is_shared/is_public/share_link_role with
visibility/link_permission across codebase."
```

---

## Chunk 2: Permission Context & Middleware

### Task 5: Create TripPermissionContext

**Files:**
- Create: `apps/web/components/calendar/providers/TripPermissionContext.tsx`

- [ ] **Step 1: Create the context provider**

```tsx
'use client'

import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Trip, EffectivePermission, TripCollaborator } from '@travyl/shared'
import { useAuthStore } from '@travyl/shared'

const TripPermissionCtx = createContext<EffectivePermission>({
  role: 'viewer',
  canEdit: false,
  canDelete: false,
  canInvite: false,
  canCreateNotes: false,
})

export function useEffectivePermission(): EffectivePermission {
  return useContext(TripPermissionCtx)
}

interface TripPermissionProviderProps {
  trip: Trip
  collaborators: TripCollaborator[]
  children: ReactNode
}

export function TripPermissionProvider({
  trip,
  collaborators,
  children,
}: TripPermissionProviderProps) {
  const user = useAuthStore((s) => s.user)

  const permission = useMemo<EffectivePermission>(() => {
    if (!user) {
      return {
        role: 'viewer',
        canEdit: false,
        canDelete: false,
        canInvite: false,
        canCreateNotes: false,
      }
    }

    // Owner
    if (trip.user_id === user.id) {
      return {
        role: 'owner',
        canEdit: true,
        canDelete: true,
        canInvite: true,
        canCreateNotes: true,
      }
    }

    // Collaborator
    const collab = collaborators.find(
      (c) => c.user_id === user.id && c.invite_status === 'accepted'
    )
    if (collab) {
      const isEditor = collab.role_type === 'editor'
      return {
        role: isEditor ? 'editor' : 'viewer',
        canEdit: isEditor,
        canDelete: false,
        canInvite: false,
        canCreateNotes: isEditor,
      }
    }

    // Fallback — viewer
    return {
      role: 'viewer',
      canEdit: false,
      canDelete: false,
      canInvite: false,
      canCreateNotes: false,
    }
  }, [user, trip.user_id, collaborators])

  return (
    <TripPermissionCtx.Provider value={permission}>
      {children}
    </TripPermissionCtx.Provider>
  )
}
```

- [ ] **Step 2: Export from providers**

Add to any barrel export or ensure it's importable. Since calendar components import directly from file paths, no barrel needed — just verify the file exists.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/providers/TripPermissionContext.tsx
git commit -m "feat: add TripPermissionContext for role-based UI gating

Provides useEffectivePermission() hook with canEdit, canDelete,
canInvite, canCreateNotes based on trip ownership and collaborator role."
```

---

### Task 6: Create useCollaborators hook

**Files:**
- Create: `packages/shared/src/hooks/useCollaborators.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchCollaborators,
  updateCollaboratorRole,
  removeCollaborator,
} from '../services/api'
import type { CollaboratorRole } from '../types'

export function useCollaborators(tripId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = ['collaborators', tripId]

  const query = useQuery({
    queryKey,
    queryFn: () => fetchCollaborators(tripId!),
    enabled: !!tripId,
  })

  const updateRole = useMutation({
    mutationFn: ({
      collaboratorId,
      role,
    }: {
      collaboratorId: string
      role: CollaboratorRole
    }) => updateCollaboratorRole(collaboratorId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const remove = useMutation({
    mutationFn: (collaboratorId: string) => removeCollaborator(collaboratorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return {
    collaborators: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    updateRole: updateRole.mutate,
    removeCollaborator: remove.mutate,
  }
}
```

- [ ] **Step 2: Export from hooks index**

Add to `packages/shared/src/hooks/index.ts`:

```ts
export { useCollaborators } from './useCollaborators'
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/hooks/useCollaborators.ts packages/shared/src/hooks/index.ts
git commit -m "feat: add useCollaborators hook with React Query"
```

---

### Task 7: Create useTripNotes hook with Realtime subscription

**Files:**
- Create: `packages/shared/src/hooks/useTripNotes.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchTripNotes,
  createTripNote,
  updateTripNote,
  moveTripNote,
  deleteTripNote,
} from '../services/api'
import { supabase } from '../services/supabase'
import type { TripNote } from '../types'

export function useTripNotes(tripId: string | undefined) {
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => ['tripNotes', tripId], [tripId])

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTripNotes(tripId!),
    enabled: !!tripId,
  })

  // Subscribe to Realtime Postgres Changes for trip_notes
  useEffect(() => {
    if (!tripId) return

    const channel = supabase
      .channel(`trip-notes-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_notes',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tripNotes', tripId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tripId, queryClient])

  const create = useMutation({
    mutationFn: ({
      userId,
      day,
      hour,
      color,
    }: {
      userId: string
      day: number
      hour: number
      color: string
    }) => createTripNote(tripId!, userId, day, hour, color),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const update = useMutation({
    mutationFn: ({ noteId, text }: { noteId: string; text: string }) =>
      updateTripNote(noteId, text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const move = useMutation({
    mutationFn: ({
      noteId,
      day,
      hour,
    }: {
      noteId: string
      day: number
      hour: number
    }) => moveTripNote(noteId, day, hour),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const remove = useMutation({
    mutationFn: (noteId: string) => deleteTripNote(noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return {
    notes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createNote: create.mutate,
    updateNote: update.mutate,
    moveNote: move.mutate,
    deleteNote: remove.mutate,
  }
}
```

- [ ] **Step 2: Export from hooks index**

Add to `packages/shared/src/hooks/index.ts`:

```ts
export { useTripNotes } from './useTripNotes'
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/hooks/useTripNotes.ts packages/shared/src/hooks/index.ts
git commit -m "feat: add useTripNotes hook with Realtime subscription

Fetches notes via React Query, subscribes to Supabase Realtime
Postgres Changes for live updates across collaborators."
```

---

### Task 8: Create Next.js middleware

**Files:**
- Create: `apps/web/middleware.ts`

- [ ] **Step 1: Create the middleware**

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /t/[token] — pass through, Server Component handles logic
  if (pathname.startsWith('/t/')) {
    return NextResponse.next()
  }

  // /trip/[id]/* — require authentication
  if (pathname.startsWith('/trip/')) {
    const res = NextResponse.next()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              res.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/trip/:path*', '/t/:path*'],
}
```

- [ ] **Step 2: Install @supabase/ssr if not present**

Run: `cd apps/web && npm ls @supabase/ssr 2>&1`

If not installed:
```bash
npm install --workspace=apps/web @supabase/ssr
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/middleware.ts apps/web/package.json package-lock.json
git commit -m "feat: add Next.js middleware for trip auth redirect

Redirects unauthenticated users from /trip/* to /login.
Passes through /t/* for Server Component handling."
```

---

## Chunk 3: Share Modal UI

### Task 9: Create InviteBar component

**Files:**
- Create: `apps/web/components/calendar/sharing/InviteBar.tsx`

- [ ] **Step 1: Create InviteBar**

```tsx
'use client'

import { useState } from 'react'
import type { CollaboratorRole } from '@travyl/shared'

interface InviteBarProps {
  onInvite: (email: string, role: CollaboratorRole) => void
  isLoading?: boolean
}

export function InviteBar({ onInvite, isLoading }: InviteBarProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<CollaboratorRole>('viewer')

  const handleSubmit = () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    onInvite(trimmed, role)
    setEmail('')
  }

  return (
    <div className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder="Add people by email..."
        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-[#003594]"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as CollaboratorRole)}
        className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-sm text-white/80"
      >
        <option value="viewer">Viewer</option>
        <option value="editor">Editor</option>
      </select>
      <button
        onClick={handleSubmit}
        disabled={isLoading || !email.trim()}
        className="rounded-lg bg-[#003594] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Invite
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/sharing/InviteBar.tsx
git commit -m "feat: add InviteBar component for collaborator email invites"
```

---

### Task 10: Create CollaboratorList component

**Files:**
- Create: `apps/web/components/calendar/sharing/CollaboratorList.tsx`

- [ ] **Step 1: Create CollaboratorList**

```tsx
'use client'

import type { TripCollaborator, CollaboratorRole } from '@travyl/shared'

interface CollaboratorListProps {
  ownerName: string
  ownerEmail: string
  collaborators: TripCollaborator[]
  onChangeRole: (collaboratorId: string, role: CollaboratorRole) => void
  onRemove: (collaboratorId: string) => void
}

export function CollaboratorList({
  ownerName,
  ownerEmail,
  collaborators,
  onChangeRole,
  onRemove,
}: CollaboratorListProps) {
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-wide text-white/40">
        People with access
      </div>

      {/* Owner row */}
      <div className="flex items-center justify-between border-b border-white/10 py-2">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#003594] text-xs text-white">
            {ownerName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm text-white">{ownerName}</div>
            <div className="text-xs text-white/40">{ownerEmail}</div>
          </div>
        </div>
        <span className="text-xs text-white/40">Owner</span>
      </div>

      {/* Collaborator rows */}
      {collaborators.map((collab) => (
        <div
          key={collab.id}
          className="flex items-center justify-between py-2"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
              {(collab.invited_email ?? 'U').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-sm text-white">
                {collab.invited_email ?? 'Unknown'}
              </div>
              {collab.invite_status === 'pending' && (
                <span className="text-xs text-amber-400">Pending</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={collab.role_type}
              onChange={(e) =>
                onChangeRole(collab.id, e.target.value as CollaboratorRole)
              }
              className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button
              onClick={() => onRemove(collab.id)}
              className="text-white/30 transition-colors hover:text-red-400"
              aria-label="Remove collaborator"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/sharing/CollaboratorList.tsx
git commit -m "feat: add CollaboratorList component for share modal"
```

---

### Task 11: Create LinkSharingSection component

**Files:**
- Create: `apps/web/components/calendar/sharing/LinkSharingSection.tsx`

- [ ] **Step 1: Create LinkSharingSection**

```tsx
'use client'

import { useState } from 'react'
import { Link } from 'iconoir-react'
import type { Visibility, LinkPermission } from '@travyl/shared'

interface LinkSharingSectionProps {
  visibility: Visibility
  linkPermission: LinkPermission
  shareToken: string | null
  onToggleLinkSharing: () => void
  onChangeLinkPermission: (permission: LinkPermission) => void
  onCopyLink: () => void
}

export function LinkSharingSection({
  visibility,
  linkPermission,
  shareToken,
  onToggleLinkSharing,
  onChangeLinkPermission,
  onCopyLink,
}: LinkSharingSectionProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    onCopyLink()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isLinkEnabled = visibility !== 'private'

  return (
    <div className="border-t border-white/10 pt-4">
      {!isLinkEnabled ? (
        <button
          onClick={onToggleLinkSharing}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          <Link className="h-4 w-4 text-white/60" />
          <span>Enable link sharing</span>
        </button>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4 text-white/60" />
            <div>
              <div className="text-sm text-white">Anyone with the link</div>
              <div className="text-xs text-white/40">
                can {linkPermission === 'editor' ? 'edit' : 'view'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={linkPermission}
              onChange={(e) =>
                onChangeLinkPermission(e.target.value as LinkPermission)
              }
              className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80"
            >
              <option value="viewer">Can view</option>
              <option value="editor">Can edit</option>
            </select>
            <button
              onClick={handleCopy}
              disabled={!shareToken}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/10"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/sharing/LinkSharingSection.tsx
git commit -m "feat: add LinkSharingSection component for share modal"
```

---

### Task 12: Create ShareModal component

**Files:**
- Create: `apps/web/components/calendar/sharing/ShareModal.tsx`

- [ ] **Step 1: Create ShareModal**

```tsx
'use client'

import { useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Trip, CollaboratorRole, LinkPermission } from '@travyl/shared'
import {
  useCollaborators,
  useAuthStore,
  updateTripVisibility,
  ensureShareLinkToken,
} from '@travyl/shared'
import { InviteBar } from './InviteBar'
import { CollaboratorList } from './CollaboratorList'
import { LinkSharingSection } from './LinkSharingSection'

interface ShareModalProps {
  trip: Trip
  isOpen: boolean
  onClose: () => void
  onInvite: (email: string, role: CollaboratorRole) => Promise<void>
}

export function ShareModal({ trip, isOpen, onClose, onInvite }: ShareModalProps) {
  const user = useAuthStore((s) => s.user)
  const { collaborators, updateRole, removeCollaborator } = useCollaborators(
    isOpen ? trip.id : undefined
  )
  const modalRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose()
      }
    },
    [onClose]
  )

  const handleInvite = async (email: string, role: CollaboratorRole) => {
    await onInvite(email, role)
  }

  const handleToggleLinkSharing = async () => {
    await updateTripVisibility(trip.id, 'link')
    await ensureShareLinkToken(trip.id)
  }

  const handleChangeLinkPermission = async (permission: LinkPermission) => {
    await updateTripVisibility(trip.id, trip.visibility, permission)
  }

  const handleCopyLink = async () => {
    const token = await ensureShareLinkToken(trip.id)
    const url = `${window.location.origin}/t/${token}`
    await navigator.clipboard.writeText(url)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={handleBackdropClick}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md rounded-xl border border-white/10 bg-[#1a1a2e] p-5 shadow-2xl"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Share &ldquo;{trip.title}&rdquo;
              </h2>
              <button
                onClick={onClose}
                className="text-white/40 transition-colors hover:text-white"
              >
                &times;
              </button>
            </div>

            {/* Invite bar */}
            <div className="mb-5">
              <InviteBar onInvite={handleInvite} />
            </div>

            {/* Collaborator list */}
            <div className="mb-5">
              <CollaboratorList
                ownerName={user?.user_metadata?.display_name ?? user?.email ?? 'You'}
                ownerEmail={user?.email ?? ''}
                collaborators={collaborators}
                onChangeRole={(id, role) => updateRole({ collaboratorId: id, role })}
                onRemove={removeCollaborator}
              />
            </div>

            {/* Link sharing */}
            <LinkSharingSection
              visibility={trip.visibility}
              linkPermission={trip.link_permission}
              shareToken={trip.share_link_token}
              onToggleLinkSharing={handleToggleLinkSharing}
              onChangeLinkPermission={handleChangeLinkPermission}
              onCopyLink={handleCopyLink}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/sharing/ShareModal.tsx
git commit -m "feat: add ShareModal with invite, collaborator list, link sharing

Google Docs-style share dialog with email invite bar,
collaborator role management, and link sharing controls."
```

---

## Chunk 4: Post-it Notes on Calendar Canvas

### Task 13: Create PostItNote component

**Files:**
- Create: `apps/web/components/calendar/PostItNote.tsx`

- [ ] **Step 1: Create PostItNote**

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { TripNote } from '@travyl/shared'

const NOTE_COLORS = ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#ede9fe']

/** Deterministic rotation from note ID */
function getRotation(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return ((hash % 7) - 3) // -3 to +3 degrees
}

export function getNoteColor(collaboratorIndex: number): string {
  return NOTE_COLORS[collaboratorIndex % NOTE_COLORS.length]
}

/** Height of one hour in the time grid (must match DayColumn's HOUR_HEIGHT) */
const HOUR_HEIGHT = 60

interface PostItNoteProps {
  note: TripNote
  authorInitials: string
  canEdit: boolean
  canDelete: boolean
  timeRangeStartHour: number
  onUpdate: (noteId: string, text: string) => void
  onDelete: (noteId: string) => void
}

export function PostItNote({
  note,
  authorInitials,
  canEdit,
  canDelete,
  timeRangeStartHour,
  onUpdate,
  onDelete,
}: PostItNoteProps) {
  const [isEditing, setIsEditing] = useState(!note.text)
  const [isHovered, setIsHovered] = useState(false)
  const textRef = useRef<HTMLDivElement>(null)

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `note-${note.id}`,
      data: { type: 'note' as const, note },
      disabled: !canEdit,
    })

  const rotation = getRotation(note.id)

  // Compute vertical position from hour offset (same grid as EventBlock)
  const topPx = (note.hour - timeRangeStartHour) * HOUR_HEIGHT

  const style: React.CSSProperties = {
    position: 'absolute',
    right: 4,
    top: topPx,
    width: 120,
    zIndex: isDragging ? 100 : 20,
    transform: transform
      ? `translate(${transform.x}px, ${transform.y}px) rotate(${rotation}deg)`
      : `rotate(${rotation}deg)`,
    opacity: isDragging ? 0.8 : 0.9,
    transition: isDragging ? undefined : 'box-shadow 0.15s ease',
  }

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus()
    }
  }, [isEditing])

  const handleBlur = () => {
    setIsEditing(false)
    const text = textRef.current?.textContent ?? ''
    if (text !== note.text) {
      onUpdate(note.id, text)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-grab rounded-sm shadow-md active:cursor-grabbing"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...(canEdit ? { ...attributes, ...listeners } : {})}
    >
      <div
        className="relative rounded-sm p-2"
        style={{ backgroundColor: note.color }}
      >
        {/* Author initials */}
        <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/10 text-[8px] font-bold text-black/50">
          {authorInitials}
        </div>

        {/* Delete button */}
        {canDelete && isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(note.id)
            }}
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow"
          >
            &times;
          </button>
        )}

        {/* Text content */}
        <div
          ref={textRef}
          contentEditable={canEdit}
          suppressContentEditableWarning
          onClick={(e) => {
            if (canEdit) {
              e.stopPropagation()
              setIsEditing(true)
            }
          }}
          onBlur={handleBlur}
          className="min-h-[24px] text-xs leading-relaxed text-black/80 outline-none"
        >
          {note.text}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/calendar/PostItNote.tsx
git commit -m "feat: add PostItNote component with drag, inline edit, delete

Draggable post-it with auto-rotation, author initials badge,
contentEditable text, and hover-reveal delete button."
```

---

### Task 14: Wire post-it notes into DayColumn

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx`

- [ ] **Step 1: Add note imports and props**

Add to imports:
```tsx
import { PostItNote } from './PostItNote'
import type { TripNote } from '@travyl/shared'
```

Add to the component's props interface (find the existing interface):
```tsx
notes?: TripNote[]
canCreateNotes?: boolean
canEditNotes?: boolean
onCreateNote?: (day: number, hour: number) => void
onUpdateNote?: (noteId: string, text: string) => void
onDeleteNote?: (noteId: string) => void
```

- [ ] **Step 2: Add Shift+Click handler for note creation**

In the existing click handler (the `handleMouseUp` or equivalent function that handles click-to-create activities), add a Shift key check at the top:

```tsx
// Inside the click handler, before the activity creation logic:
if (e.shiftKey && canCreateNotes && onCreateNote) {
  const hour = /* use existing hour calculation from the click handler */
  onCreateNote(dayIndex, hour)
  return
}
```

- [ ] **Step 3: Render PostItNote components alongside EventBlocks**

Notes render as a flat list in the same `position: relative` container as `EventBlock` components (not inside per-hour cells — `DayColumn` has no per-hour content wrappers). Each `PostItNote` computes its own `top` from `note.hour`. Add this alongside the existing `EventBlock` map:

```tsx
{notes
  ?.filter((n) => n.day === dayIndex)
  .map((note) => (
    <PostItNote
      key={note.id}
      note={note}
      authorInitials={note.user_id.slice(0, 2).toUpperCase()}
      canEdit={canEditNotes ?? false}
      canDelete={note.user_id === userId || isOwner}
      timeRangeStartHour={timeRange.startHour}
      onUpdate={onUpdateNote ?? (() => {})}
      onDelete={onDeleteNote ?? (() => {})}
    />
  ))}
```

Note: `canDelete` is per-note — only the note author and trip owner can delete. Pass `userId` and `isOwner` as additional props to DayColumn (from `useEffectivePermission`).

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: No errors (new props are optional).

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx
git commit -m "feat: wire post-it notes into DayColumn

Add Shift+Click to create notes, render PostItNote components
alongside EventBlocks in hour cells."
```

---

### Task 15: Add note drag handling to useCalendarDnd

**Files:**
- Modify: `apps/web/components/calendar/hooks/useCalendarDnd.ts`

- [ ] **Step 1: Update drag data type union**

Find the existing type cast for `active.data.current` and add the note type:

```ts
import type { TripNote } from '@travyl/shared'

// Update the drag data type union to include:
| { type: 'note'; note: TripNote }
```

- [ ] **Step 2: Add onMoveNote to the hook's parameters**

Add to the hook's options/props:

```ts
onMoveNote?: (noteId: string, day: number, hour: number) => void
```

- [ ] **Step 3: Handle note drag in onDragEnd**

In the `onDragEnd` handler, add a case for `type === 'note'`:

```ts
if (dragData.type === 'note' && onMoveNote) {
  const { note } = dragData
  // Calculate target day and hour from the over droppable
  // (use same logic as activity drag — extract dayIndex from over.id, compute hour from delta)
  onMoveNote(note.id, targetDay, targetHour)
  return
}
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/hooks/useCalendarDnd.ts
git commit -m "feat: add note drag handling to useCalendarDnd

Route note drags to onMoveNote callback, discriminating
by type field in drag data."
```

---

### Task 16: Wire everything into CalendarDashboard

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`
- Modify: `apps/web/app/(main)/trip/[id]/page.tsx`

- [ ] **Step 1: Add useTripNotes and useCollaborators to CalendarDashboard**

Add imports:
```tsx
import { useTripNotes, useCollaborators, useAuthStore } from '@travyl/shared'
import { TripPermissionProvider, useEffectivePermission } from './providers/TripPermissionContext'
import { getNoteColor } from './PostItNote'
import { ShareModal } from './sharing/ShareModal'
```

Add hooks inside the component (after existing hooks):
```tsx
const { notes, createNote, updateNote, moveNote, deleteNote } = useTripNotes(trip?.id)
const { collaborators } = useCollaborators(trip?.id)
const user = useAuthStore((s) => s.user)
const permission = useEffectivePermission()
const [isShareModalOpen, setIsShareModalOpen] = useState(false)
```

- [ ] **Step 2: Create note handler with auto-color**

```tsx
const handleCreateNote = useCallback(
  (day: number, hour: number) => {
    if (!user || !trip) return
    // Determine collaborator index for color
    const collabIndex = collaborators.findIndex((c) => c.user_id === user.id)
    const colorIndex = collabIndex >= 0 ? collabIndex + 1 : 0 // +1 because owner is 0
    const color = getNoteColor(trip.user_id === user.id ? 0 : colorIndex)
    createNote({ userId: user.id, day, hour, color })
  },
  [user, trip, collaborators, createNote]
)
```

- [ ] **Step 3: Pass note props down to WeekView → DayColumn**

Thread these props through `WeekView` (and `DayView` if it exists) to `DayColumn`. Update the prop interfaces of both `WeekView` and `DayView` to accept and forward these:
```tsx
notes={notes}
canCreateNotes={permission.canCreateNotes}
canEditNotes={permission.canEdit}
onCreateNote={handleCreateNote}
onUpdateNote={(noteId, text) => updateNote({ noteId, text })}
onDeleteNote={(noteId) => deleteNote(noteId)}
```

And pass `onMoveNote` to the dnd hook:
```tsx
onMoveNote={(noteId, day, hour) => moveNote({ noteId, day, hour })}
```

- [ ] **Step 4: Add ShareModal and share button trigger**

Add the ShareModal at the end of the component's return. Use a placeholder for `onInvite` — the real implementation comes in Task 19:
```tsx
<ShareModal
  trip={trip}
  isOpen={isShareModalOpen}
  onClose={() => setIsShareModalOpen(false)}
  onInvite={async () => { /* wired in Task 19 */ }}
```

Add a "Share" button in the CalendarHeader area (only for owners):
```tsx
{permission.canInvite && (
  <button
    onClick={() => setIsShareModalOpen(true)}
    className="rounded-lg bg-[#003594] px-3 py-1.5 text-sm font-medium text-white"
  >
    Share
  </button>
)}
```

- [ ] **Step 5: Wrap trip page with TripPermissionProvider**

In `apps/web/app/(main)/trip/[id]/page.tsx`, wrap `CalendarDashboard` with `TripPermissionProvider`:

```tsx
<YjsTripProvider tripId={id}>
  <TripPermissionProvider trip={trip} collaborators={collaborators}>
    <CalendarDashboard />
  </TripPermissionProvider>
</YjsTripProvider>
```

This requires fetching trip and collaborators at the page level. If the trip data is currently fetched inside `CalendarDashboard`, it may need to be lifted up — or `TripPermissionProvider` can be placed inside `CalendarDashboard` where the trip data is already available.

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 7: Start dev server and test manually**

Run: `npm run web`

Test:
1. Open a trip — verify calendar still renders normally
2. Shift+Click on the time grid — should create a post-it note
3. Click on the note — should be editable
4. Drag the note — should move to new position
5. Hover and click X — should delete

- [ ] **Step 8: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx apps/web/app/\(main\)/trip/\[id\]/page.tsx
git commit -m "feat: wire post-it notes and share modal into CalendarDashboard

Add useTripNotes hook, note creation with auto-color,
TripPermissionProvider, ShareModal trigger, and note
callbacks plumbed through to DayColumn."
```

---

## Chunk 5: Share Landing Route & SST Infrastructure

### Task 17: Create `/t/[token]` share landing page

**Files:**
- Create: `apps/web/app/(main)/t/[token]/page.tsx`

- [ ] **Step 1: Create the Server Component**

```tsx
import { redirect } from 'next/navigation'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { ShareLandingClient } from './ShareLandingClient'

interface Props {
  params: Promise<{ token: string }>
}

export default async function ShareLandingPage({ params }: Props) {
  const { token } = await params
  const supabase = createServerComponentClient({ cookies })

  // 1. Try invite_token in trip_collaborators
  const { data: invite } = await supabase
    .from('trip_collaborators')
    .select('*, trips!inner(id, title, destination, start_date, end_date, user_id, visibility, link_permission)')
    .eq('invite_token', token)
    .maybeSingle()

  // 2. Try share_link_token in trips
  const { data: trip } = invite
    ? { data: null }
    : await supabase
        .from('trips')
        .select('*')
        .eq('share_link_token', token)
        .maybeSingle()

  const resolvedTrip = invite?.trips ?? trip
  if (!resolvedTrip) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a] text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Link not found</h1>
          <p className="mt-2 text-white/60">This share link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  // 3. Check auth
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    const userId = session.user.id
    const userEmail = session.user.email?.toLowerCase()

    // Already a collaborator? Redirect to trip
    const { data: existingCollab } = await supabase
      .from('trip_collaborators')
      .select('id')
      .eq('trip_id', resolvedTrip.id)
      .eq('user_id', userId)
      .eq('invite_status', 'accepted')
      .maybeSingle()

    if (resolvedTrip.user_id === userId || existingCollab) {
      redirect(`/trip/${resolvedTrip.id}`)
    }

    // Has a pending invite? Check email matches, then accept
    if (invite && invite.invite_status === 'pending') {
      if (userEmail !== invite.invited_email?.toLowerCase()) {
        return (
          <ShareLandingClient
            trip={resolvedTrip}
            isLoggedIn={true}
            linkPermission={resolvedTrip.link_permission}
            token={token}
            errorMessage="This invite was sent to a different email address."
          />
        )
      }
      await supabase
        .from('trip_collaborators')
        .update({
          user_id: userId,
          invite_status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invite.id)
      redirect(`/trip/${resolvedTrip.id}`)
    }

    // Check for pending invite by email (general share link flow)
    if (userEmail) {
      const { data: pendingByEmail } = await supabase
        .from('trip_collaborators')
        .select('id')
        .eq('trip_id', resolvedTrip.id)
        .eq('invited_email', userEmail)
        .eq('invite_status', 'pending')
        .maybeSingle()

      if (pendingByEmail) {
        await supabase
          .from('trip_collaborators')
          .update({
            user_id: userId,
            invite_status: 'accepted',
            accepted_at: new Date().toISOString(),
          })
          .eq('id', pendingByEmail.id)
        redirect(`/trip/${resolvedTrip.id}`)
      }
    }
  }

  // 4. Show preview (logged in but not collaborator, or not logged in)
  return (
    <ShareLandingClient
      trip={resolvedTrip}
      isLoggedIn={!!session}
      linkPermission={resolvedTrip.link_permission}
      token={token}
    />
  )
}
```

- [ ] **Step 2: Create ShareLandingClient component**

Create `apps/web/app/(main)/t/[token]/ShareLandingClient.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import type { Trip, LinkPermission } from '@travyl/shared'
import { joinTripViaLink, useAuthStore } from '@travyl/shared'

interface Props {
  trip: Trip
  isLoggedIn: boolean
  linkPermission: LinkPermission
  token: string
  errorMessage?: string
}

export function ShareLandingClient({ trip, isLoggedIn, linkPermission, token, errorMessage }: Props) {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  const handleJoin = async () => {
    if (!user) return
    await joinTripViaLink(trip.id, user.id, linkPermission)
    router.push(`/trip/${trip.id}`)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f0f1a]">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#1a1a2e] p-8 text-center">
        <h1 className="text-2xl font-bold text-white">{trip.title}</h1>
        <p className="mt-2 text-white/60">{trip.destination}</p>
        <p className="mt-1 text-sm text-white/40">
          {trip.start_date} &mdash; {trip.end_date}
        </p>

        {errorMessage && (
          <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        <div className="mt-6">
          {errorMessage ? null : isLoggedIn ? (
            <button
              onClick={handleJoin}
              className="w-full rounded-lg bg-[#003594] px-4 py-3 font-medium text-white transition-opacity hover:opacity-90"
            >
              Join as {linkPermission}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-white/60">
                Sign up or log in to join this trip
              </p>
              <button
                onClick={() => router.push(`/login?redirect=/t/${token}`)}
                className="w-full rounded-lg bg-[#003594] px-4 py-3 font-medium text-white transition-opacity hover:opacity-90"
              >
                Sign in to join
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(main\)/t/
git commit -m "feat: add /t/[token] unified share landing route

Server Component resolves invite_token or share_link_token,
handles auto-accept for pending invites, shows preview
for unauthenticated users."
```

---

### Task 18: Add invite Lambda and SST infrastructure

**Files:**
- Create: `services/invite.ts`
- Modify: `infra/api.ts`
- Modify: `infra/secrets.ts` (if SES identity needs adding)

- [ ] **Step 1: Create invite Lambda handler**

Create `services/invite.ts`:

```ts
import { Resource } from 'sst'
import { createClient } from '@supabase/supabase-js'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'

const supabase = createClient(
  Resource.SupabaseUrl.value,
  Resource.SupabaseServiceRoleKey.value
)

const ses = new SESv2Client({})

interface InviteRequest {
  tripId: string
  email: string
  role: 'viewer' | 'editor'
}

export async function handler(event: { body?: string; headers: Record<string, string> }) {
  try {
    // Verify JWT from Authorization header
    const authHeader = event.headers['authorization'] ?? event.headers['Authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) }
    }

    const body: InviteRequest = JSON.parse(event.body ?? '{}')
    const { tripId, email, role } = body

    if (!tripId || !email || !role) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) }
    }

    // Verify caller is trip owner
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, user_id, title, share_link_token')
      .eq('id', tripId)
      .single()

    if (tripError || !trip) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Trip not found' }) }
    }

    if (trip.user_id !== user.id) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Only trip owner can invite' }) }
    }

    // Generate invite token
    const inviteToken = crypto.randomUUID()

    // Ensure trip has a share_link_token
    if (!trip.share_link_token) {
      const shareToken = crypto.randomUUID()
      await supabase
        .from('trips')
        .update({ share_link_token: shareToken, visibility: 'link' })
        .eq('id', tripId)
    }

    // Check if collaborator already exists and is accepted
    const { data: existing } = await supabase
      .from('trip_collaborators')
      .select('id, invite_status')
      .eq('trip_id', tripId)
      .eq('invited_email', email.toLowerCase())
      .maybeSingle()

    if (existing?.invite_status === 'accepted') {
      return { statusCode: 409, body: JSON.stringify({ error: 'User is already a collaborator' }) }
    }

    // Create or update collaborator row (upsert only if not accepted)
    const { data: collab, error: collabError } = await supabase
      .from('trip_collaborators')
      .upsert(
        {
          trip_id: tripId,
          invited_email: email.toLowerCase(),
          invite_token: inviteToken,
          role_type: role,
          invite_status: 'pending',
          invited_by: user.id,
        },
        { onConflict: 'trip_id,invited_email' }
      )
      .select('id')
      .single()

    if (collabError) {
      return { statusCode: 500, body: JSON.stringify({ error: collabError.message }) }
    }

    // Get inviter name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const inviterName = profile?.display_name ?? user.email ?? 'Someone'
    const inviteUrl = `${process.env.APP_URL ?? 'https://app.gotravyl.com'}/t/${inviteToken}`

    // Send email via SES
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: Resource.EmailIdentity.sender,
        Destination: { ToAddresses: [email] },
        Content: {
          Simple: {
            Subject: { Data: `${inviterName} invited you to "${trip.title}" on Travyl` },
            Body: {
              Html: {
                Data: `
                  <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px">
                    <h2 style="color:#1e3a5f">${inviterName} invited you to a trip!</h2>
                    <p><strong>${trip.title}</strong></p>
                    <p>You've been invited as a <strong>${role}</strong>.</p>
                    <a href="${inviteUrl}" style="display:inline-block;background:#003594;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;margin-top:16px">
                      View Trip
                    </a>
                    <p style="color:#888;font-size:12px;margin-top:24px">
                      Or copy this link: ${inviteUrl}
                    </p>
                  </div>
                `,
              },
            },
          },
        },
      })
    )

    return {
      statusCode: 200,
      body: JSON.stringify({ collaboratorId: collab.id, status: 'invited' }),
    }
  } catch (err) {
    console.error('Invite error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) }
  }
}
```

- [ ] **Step 2: Add SES identity and route to SST infra**

In `infra/api.ts`, add the invite route. The exact syntax depends on what's already there, but it should look like:

```ts
api.route('POST /invite', {
  handler: 'services/invite.handler',
  link: [supabaseServiceRoleKey, supabaseUrl, emailIdentity],
})
```

If `sst.aws.Email` is not yet defined, add to `infra/` (e.g., `infra/email.ts`):

```ts
export const emailIdentity = new sst.aws.Email('EmailIdentity', {
  sender: 'noreply@gotravyl.com',
})
```

And import/link it in `sst.config.ts`.

- [ ] **Step 3: Install @aws-sdk/client-sesv2 in services**

```bash
npm install @aws-sdk/client-sesv2
```

- [ ] **Step 4: Add invite caller function to shared API**

Add to `packages/shared/src/services/api.ts`:

```ts
export async function sendInvite(
  tripId: string,
  email: string,
  role: CollaboratorRole,
  apiBaseUrl: string
): Promise<{ collaboratorId: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(`${apiBaseUrl}/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ tripId, email, role }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Invite failed')
  }

  return res.json()
}
```

- [ ] **Step 5: Commit**

```bash
git add services/invite.ts infra/ packages/shared/src/services/api.ts package-lock.json
git commit -m "feat: add invite Lambda with SES email delivery

POST /invite creates collaborator row, sends branded
invite email via SES with /t/[invite_token] link."
```

---

### Task 19: Wire invite into ShareModal

**Files:**
- Modify: `apps/web/components/calendar/sharing/ShareModal.tsx`
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Update CalendarDashboard to pass invite handler**

In `CalendarDashboard.tsx`, create the invite handler:

```tsx
import { sendInvite } from '@travyl/shared'

const handleInvite = useCallback(
  async (email: string, role: CollaboratorRole) => {
    if (!trip) return
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
    await sendInvite(trip.id, email, role, apiBaseUrl)
    // Collaborator list will auto-refresh via React Query invalidation
  },
  [trip]
)
```

Pass it to `ShareModal`:
```tsx
<ShareModal
  trip={trip}
  isOpen={isShareModalOpen}
  onClose={() => setIsShareModalOpen(false)}
  onInvite={handleInvite}
/>
```

- [ ] **Step 2: Add toast notification on invite success**

In the `ShareModal`'s `handleInvite`, add a toast after successful invite. If the project uses a toast library, use it. Otherwise, a simple approach:

```tsx
const handleInvite = async (email: string, role: CollaboratorRole) => {
  try {
    await onInvite(email, role)
    // Simple alert for now — replace with toast when available
    alert(`Invite sent to ${email}`)
  } catch (err) {
    alert(`Failed to send invite: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/sharing/ShareModal.tsx apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire invite Lambda into ShareModal

Calls POST /invite on invite submission, shows
success/error feedback to user."
```

---

### Task 20: Permission-gate existing calendar interactions

**Files:**
- Modify: `apps/web/components/calendar/DayColumn.tsx`
- Modify: `apps/web/components/calendar/EventBlock.tsx`
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Gate click-to-create in DayColumn**

In `DayColumn.tsx`, the existing click-to-create handler should check `canEdit`:

```tsx
// Only allow click-to-create if user has edit permission
if (!canEdit) return
```

Add `canEdit` to the component's props (from `useEffectivePermission().canEdit`).

- [ ] **Step 2: Gate drag in EventBlock**

In `EventBlock.tsx`, pass `disabled` to `useDraggable` when user can't edit. Keep the existing `id: activity.id` (do NOT add a prefix — changing it would break `activeId` references in CalendarDashboard and DragOverlay):

```tsx
const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
  id: activity.id,
  data: { type: 'activity' as const, activity },
  disabled: !canEdit, // Add this prop
})
```

Add `canEdit` to EventBlock's props.

- [ ] **Step 3: Gate detail panel editing**

If `DetailPanel` has edit/delete buttons, conditionally render them based on `canEdit`/`canDelete` from `useEffectivePermission()`.

- [ ] **Step 4: Run typecheck and manual test**

Run: `npm run typecheck`
Expected: No errors.

Manual test: Open a trip as viewer (by manipulating collaborator role in DB) and verify:
- Cannot click to create activities
- Cannot drag activities
- Cannot Shift+Click to create notes
- Can view everything

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/calendar/DayColumn.tsx apps/web/components/calendar/EventBlock.tsx apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: permission-gate calendar interactions

Disable drag, click-to-create, and note creation for viewers.
Gate edit/delete controls behind canEdit/canDelete permissions."
```

---

## Chunk 6: Final Wiring & Cleanup

### Task 21: Update ARCHITECTURE.md with new schema

**Files:**
- Modify: `ARCHITECTURE.md`

- [ ] **Step 1: Add trip_notes table to schema section**

Add the `trip_notes` table definition after `trip_collaborators` in the schema section.

- [ ] **Step 2: Update trips table schema**

Add `visibility` and `link_permission` columns. Note the DROP of `is_shared`, `is_public`, `share_link_role` if they were documented.

- [ ] **Step 3: Update trip_collaborators**

Note `user_id` is now nullable. Add the unique constraint on `(trip_id, invited_email)`.

- [ ] **Step 4: Add SST resources**

Add `POST /invite` Lambda and `sst.aws.Email` to the SST resources table.

- [ ] **Step 5: Commit**

```bash
git add ARCHITECTURE.md
git commit -m "docs: update architecture with sharing schema and SST resources"
```

---

### Task 22: Update PLANNING.md

**Files:**
- Modify: `PLANNING.md`

- [ ] **Step 1: Add TRA-204 branch entry**

```markdown
## `feature/tra-204` — Trip sharing & post-it notes
**Linear:** [TRA-204](https://linear.app/travyl/issue/TRA-204/trip-sharing-and-post-it-notes)
**Status:** In Progress

### Goal
Google Docs-style trip sharing with visibility tiers, email invites via SES, per-collaborator roles, permission-gated UI, and free-floating post-it notes on the calendar canvas.

### Completed
- Types: Visibility, LinkPermission, CollaboratorRole, TripNote, TripCollaborator, EffectivePermission
- Updated permission helpers for visibility model
- Collaborator + note API functions
- TripPermissionContext + useEffectivePermission hook
- useCollaborators + useTripNotes hooks
- Next.js middleware for /trip/* auth redirect
- ShareModal (InviteBar, CollaboratorList, LinkSharingSection)
- PostItNote component (drag, inline edit, auto-color, auto-rotation)
- /t/[token] unified share landing route
- POST /invite Lambda with SES email
- Permission-gated calendar interactions
```

- [ ] **Step 2: Commit**

```bash
git add PLANNING.md
git commit -m "docs: add TRA-204 branch log to PLANNING.md"
```

---

### Task 23: Final typecheck and test run

- [ ] **Step 1: Full typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 2: Full test run**

Run: `cd packages/shared && npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No errors (or only pre-existing warnings).

- [ ] **Step 4: Manual smoke test**

Start: `npm run web`

Test checklist:
1. Create a new trip — verify default visibility is 'private'
2. Open trip → click Share button → modal opens
3. Enable link sharing → copy link
4. Open link in incognito → see read-only preview
5. Sign in in incognito → click Join → redirected to trip as viewer
6. Verify viewer cannot edit/drag/create
7. Owner changes role to editor → viewer can now edit
8. Shift+Click on time grid → post-it note appears
9. Type text → click away → text persists
10. Drag note to new time slot → position updates
11. Hover note → delete → note removed
12. Open in two browser tabs → verify real-time note sync
