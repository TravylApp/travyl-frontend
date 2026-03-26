# Share Link Revocation — Design Spec

**Issue:** TRA-270
**Branch:** feature/tra-270
**Date:** 2026-03-26

## Problem

Once a share link is generated, there is no way to invalidate it. If a link is leaked or shared with the wrong person, the only recourse is to turn off link sharing entirely — which also breaks any other valid recipients.

## Goal

Add a "Revoke link" button to `LinkSharingSection` that rotates `share_link_token` in the DB. The old link immediately stops working; a fresh link is generated and copied to clipboard. Link sharing remains enabled.

## Behavior

1. Revoke button appears only when `visibility !== 'private'`, `shareToken` is non-null, and the current user is the trip owner.
2. Clicking shows an inline confirmation row: "Old link will stop working." + **Revoke** / **Cancel** — no separate modal.
3. On confirm:
   - Call `rotateShareLinkToken(tripId)` (new shared package function)
   - Attempt to copy the new link URL to clipboard
   - If clipboard succeeds: show brief "Link revoked — new link copied" flash
   - If clipboard fails: surface the new URL in a read-only input (same pattern as the `inviteLink` fallback already in `ShareModal`) so the user can copy manually
   - `onRevokeLink()` prop fires so `ShareModal` can call `onSettingsChange?.()` to refetch the trip and propagate the new token
4. Confirmation/success state resets after 2 s.

## Owner Guard

The Revoke button is only rendered when `isOwner` is true. `isOwner` is computed in `ShareModal` as `user?.id === trip.user_id` and passed as a prop to `LinkSharingSection`. This prevents collaborators with modal access from revoking the link.

## Data Layer

### `packages/shared/src/services/api.ts`

New function — **single-statement rotation** (atomic, no null window):

```ts
export async function rotateShareLinkToken(tripId: string): Promise<string> {
  const newToken = crypto.randomUUID()
  const { error } = await supabase
    .from('trips')
    .update({ share_link_token: newToken })
    .eq('id', tripId)
  if (error) throw error
  return newToken
}
```

This writes the new token directly without ever setting the column to `null`, eliminating the race window where concurrent `fetchTripByShareToken` calls would return "not found".

Export `rotateShareLinkToken` from `packages/shared/src/services/index.ts` (and the root `index.ts` re-export barrel picks it up automatically via `export * from './services'`).

## Component Changes

### `LinkSharingSection.tsx`

**New props:**
```ts
isOwner: boolean
onRevokeLink: () => Promise<void>
```

**New local state:**
```ts
const [showConfirm, setShowConfirm] = useState(false)   // confirmation row visible
const [isRevoking, setIsRevoking] = useState(false)      // async in-flight
const [revoked, setRevoked] = useState(false)            // success flash
```

**Placement:** below the copy-link row, as a small text button ("Revoke link") that expands into an inline confirmation on click. Only rendered when `isOwner && shareToken`. Destructive styling (red/amber tint) to signal irreversibility.

### `ShareModal.tsx`

Compute `isOwner` and wire `handleRevokeLink`:

```ts
const isOwner = user?.id === trip.user_id

const handleRevokeLink = async () => {
  const newToken = await rotateShareLinkToken(trip.id)
  const url = `${window.location.origin}/trip/${trip.id}/share/${newToken}`
  try {
    await navigator.clipboard.writeText(url)
    // success path — LinkSharingSection shows "copied" flash
  } catch {
    // clipboard failed — surface url for manual copy
    setRevokeUrl(url)
  }
  await onSettingsChange?.()
}
```

Add `revokeUrl` state (mirrors existing `inviteLink` pattern) for the clipboard-failure fallback. Pass `isOwner={isOwner}` and `onRevokeLink={handleRevokeLink}` to `<LinkSharingSection>`.

`LinkSharingSection.onRevokeLink` = `ShareModal.handleRevokeLink`. No new props are required from `CalendarDashboard` — the existing `onSettingsChange` (already `refetchTrip`) handles the refresh.

## Scope

| File | Change |
|---|---|
| `packages/shared/src/services/api.ts` | Add `rotateShareLinkToken` |
| `packages/shared/src/services/index.ts` | Export `rotateShareLinkToken` |
| `apps/web/components/calendar/sharing/LinkSharingSection.tsx` | Add `isOwner` + `onRevokeLink` props, revoke button + inline confirm |
| `apps/web/components/calendar/sharing/ShareModal.tsx` | Add `isOwner`, `handleRevokeLink`, `revokeUrl` state, pass new props |

No DB migration. No new files. No Lambda changes.

## Error Handling

- If `rotateShareLinkToken` throws, catch in `ShareModal.handleRevokeLink` and surface via the existing `inviteError` red banner pattern.
- Clipboard failure: non-fatal. Surface the new URL in a read-only input inside the modal (same pattern as `inviteLink` fallback) so the user can copy manually.

## Out of Scope

- Mobile sharing UI
- Email notification on revoke
- Audit log entry for token rotation
