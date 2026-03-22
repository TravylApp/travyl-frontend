# Fork & Share Wiring Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up existing fork/share components so the full sharing and forking flow works end-to-end.

**Architecture:** Pure integration work — all UI components and API functions already exist but aren't connected. We modify permissions, add one missing API function, fix a broken URL, and mount components in their rendering surfaces.

**Tech Stack:** React 19, Next.js 16, Supabase, TanStack Query, motion/react

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/shared/src/utils/permissions.ts` | Modify | Relax `canForkTrip` + add auth guard |
| `packages/shared/src/utils/permissions.test.ts` | Modify | Update tests for new permission logic |
| `packages/shared/src/services/api.ts` | Modify | Add `inviteCollaborator` function |
| `packages/shared/src/services/index.ts` | Modify | Export `inviteCollaborator` |
| `apps/web/components/calendar/sharing/ShareModal.tsx` | Modify | Fix share link URL pattern |
| `apps/web/components/calendar/CalendarDashboard.tsx` | Modify | Wire ShareModal + ForkAttribution |
| `apps/web/components/trip/ForkButton.tsx` | Modify | Change fork landing to `/trips` |
| `apps/web/app/(trips-app)/trip/[id]/share/[token]/page.tsx` | Modify | Add router navigation on fork success |
| `apps/web/components/trips/TripCard.tsx` | Modify | Add ForkCountBadge |

---

## Chunk 1: Permissions + API

### Task 1: Update canForkTrip permissions

**Files:**
- Modify: `packages/shared/src/utils/permissions.ts:19-22`
- Modify: `packages/shared/src/utils/permissions.test.ts:50-55`

- [ ] **Step 1: Update the test for link-shared trips**

In `packages/shared/src/utils/permissions.test.ts`, change line 54:

```ts
// Before:
it('cannot fork link trip', () => { expect(canForkTrip(linkTrip, 'other-user')).toBe(false) })

// After:
it('can fork link trip', () => { expect(canForkTrip(linkTrip, 'other-user')).toBe(true) })
```

- [ ] **Step 2: Add test for unauthenticated users**

In the same `describe('canForkTrip')` block, add after line 54:

```ts
it('cannot fork when not authenticated', () => { expect(canForkTrip(publicTrip, null)).toBe(false) })
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd packages/shared && npm test -- --run`
Expected: 2 failures — "can fork link trip" and "cannot fork when not authenticated"

- [ ] **Step 4: Update canForkTrip implementation**

In `packages/shared/src/utils/permissions.ts`, replace lines 19-22:

```ts
export function canForkTrip(trip: Trip, userId: string | null): boolean {
  if (!userId) return false
  if (isTripOwner(trip, userId)) return false
  return trip.visibility !== 'private'
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/shared && npm test -- --run`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add packages/shared/src/utils/permissions.ts packages/shared/src/utils/permissions.test.ts
git commit -m "feat: allow forking on link-shared trips, require auth"
```

### Task 2: Add inviteCollaborator API function

**Files:**
- Modify: `packages/shared/src/services/api.ts:422` (after `findPendingInviteByEmail`)
- Modify: `packages/shared/src/services/index.ts`

- [ ] **Step 1: Add inviteCollaborator function**

In `packages/shared/src/services/api.ts`, add after the `findPendingInviteByEmail` function (after line 422):

```ts
export async function inviteCollaborator(tripId: string, email: string, role: CollaboratorRole): Promise<TripCollaborator> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  // Skip if there's already a pending invite for this email
  const existing = await findPendingInviteByEmail(tripId, email)
  if (existing) return existing

  const inviteToken = crypto.randomUUID()
  const { data, error } = await supabase
    .from('trip_collaborators')
    .insert({
      trip_id: tripId,
      invited_email: email.toLowerCase(),
      role_type: role,
      invite_status: 'pending',
      invited_by: user.id,
      invite_token: inviteToken,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
```

- [ ] **Step 2: Export from services barrel**

In `packages/shared/src/services/index.ts`, add `inviteCollaborator` to the **existing** export block from `'./api'`. Do NOT replace the whole file — just add one line. The file has two export statements (first for supabase, second for api). Add `inviteCollaborator,` after `updateTripSettings,` in the api export block:

```ts
  updateTripSettings,
  inviteCollaborator,
} from './api';
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/services/api.ts packages/shared/src/services/index.ts
git commit -m "feat: add inviteCollaborator API function"
```

---

## Chunk 2: Fix ShareModal + Wire into CalendarDashboard

### Task 3: Fix share link URL in ShareModal

**Files:**
- Modify: `apps/web/components/calendar/sharing/ShareModal.tsx:52`

- [ ] **Step 1: Fix handleCopyLink URL pattern**

In `apps/web/components/calendar/sharing/ShareModal.tsx`, change line 52:

```ts
// Before:
const url = `${window.location.origin}/t/${token}`

// After:
const url = `${window.location.origin}/trip/${trip.id}/share/${token}`
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/calendar/sharing/ShareModal.tsx
git commit -m "fix: correct share link URL to match actual route"
```

### Task 4: Wire ShareModal into CalendarDashboard

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Add imports**

Add these imports at the top of `CalendarDashboard.tsx`:

```ts
import { ShareModal } from './sharing/ShareModal'
import { inviteCollaborator } from '@travyl/shared'
import type { CollaboratorRole } from '@travyl/shared'
```

- [ ] **Step 2: Add state and handler**

Inside the `CalendarDashboard` component function, after the existing `useState` declarations (around line 65), add:

```ts
const [shareModalOpen, setShareModalOpen] = useState(false)
```

Add handler function (after the other handlers, around line 280):

```ts
const handleInvite = useCallback(async (email: string, role: CollaboratorRole) => {
  if (!trip) return
  await inviteCollaborator(trip.id, email, role)
}, [trip])
```

- [ ] **Step 3: Wire onShare prop**

Change line 349:

```ts
// Before:
onShare={() => {}}

// After:
onShare={() => setShareModalOpen(true)}
```

- [ ] **Step 4: Mount ShareModal**

After the `<TripNavbar>` closing tag (after line 355), add:

```tsx
{trip && (
  <ShareModal
    trip={trip}
    isOpen={shareModalOpen}
    onClose={() => setShareModalOpen(false)}
    onInvite={handleInvite}
  />
)}
```

- [ ] **Step 5: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No new errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: wire ShareModal into CalendarDashboard"
```

### Task 5: Show ForkAttribution on forked trips

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Add import**

Add to imports in `CalendarDashboard.tsx`:

```ts
import { ForkAttribution } from '../trip/ForkAttribution'
```

- [ ] **Step 2: Render ForkAttribution between navbar and grid**

After the `ShareModal` block added in Task 4 (and before the `{/* Grid area */}` comment at line 357), add:

```tsx
{trip?.forked_from_trip_id && (
  <div className="px-4 py-2 border-b border-gray-200 dark:border-[#1e3a5f]/30 bg-white dark:bg-[#0f1a28]">
    <ForkAttribution trip={trip} />
  </div>
)}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: show ForkAttribution banner on forked trips"
```

---

## Chunk 3: Fork Landing + Share Page + TripCard Badge

### Task 6: Change ForkButton landing to /trips

**Files:**
- Modify: `apps/web/components/trip/ForkButton.tsx:35`

- [ ] **Step 1: Update default onSuccess navigation**

In `apps/web/components/trip/ForkButton.tsx`, change line 35:

```ts
// Before:
router.push(`/trip/${newTrip.id}`);

// After:
router.push('/trips');
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/trip/ForkButton.tsx
git commit -m "feat: navigate to trips list after forking"
```

### Task 7: Add fork success navigation to share page

**Files:**
- Modify: `apps/web/app/(trips-app)/trip/[id]/share/[token]/page.tsx`

- [ ] **Step 1: Add useRouter import and hook**

In the share page file, `useRouter` is not currently imported. Add to imports:

```ts
import { useRouter } from 'next/navigation';
```

Inside the `SharedTripView` component (after line 18), add:

```ts
const router = useRouter();
```

- [ ] **Step 2: Add onSuccess callback to fork handler**

Replace the `handleFork` function (lines 22-24):

```ts
// Before:
const handleFork = () => {
  forkTripMutation({ tripId: trip.id });
};

// After:
const handleFork = () => {
  forkTripMutation(
    { tripId: trip.id },
    { onSuccess: () => router.push('/trips') }
  );
};
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(trips-app)/trip/[id]/share/[token]/page.tsx"
git commit -m "feat: navigate to trips list after forking from share page"
```

### Task 8: Add ForkCountBadge to TripCard

**Files:**
- Modify: `apps/web/components/trips/TripCard.tsx`

- [ ] **Step 1: Add import**

Add to imports in `TripCard.tsx`:

```ts
import { ForkCountBadge } from '../trip/ForkAttribution';
```

- [ ] **Step 2: Render ForkCountBadge**

In the bottom content area, after the status pill block (after line 213, after the closing `)}` of the `statusInfo &&` block), add:

```tsx
{trip.fork_count > 0 && (
  <ForkCountBadge count={trip.fork_count} />
)}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/trips/TripCard.tsx
git commit -m "feat: show ForkCountBadge on trip cards"
```

### Task 9: Final verification

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 2: Run shared package tests**

Run: `cd packages/shared && npm test -- --run`
Expected: All tests pass

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No new warnings/errors

- [ ] **Step 4: Start dev server and smoke test**

Run: `npm run web`

Manual checks:
1. Open a trip → click Share button in navbar → ShareModal opens
2. Enable link sharing → copy link → URL follows `/trip/{id}/share/{token}` pattern
3. Open share link in incognito → see shared trip page with "Sign in to Fork" (not logged in)
4. Log in as different user → open share link → Fork button visible → click Fork → lands on /trips
5. Open the forked trip → ForkAttribution banner visible at top
6. Go back to trips list → forked trip appears, original trip shows ForkCountBadge (if fork_count > 0)
