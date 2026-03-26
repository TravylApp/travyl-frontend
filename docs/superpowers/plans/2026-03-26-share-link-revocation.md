# Share Link Revocation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Revoke link" button to the share modal that rotates `share_link_token` in Supabase, invalidating the old link and generating a fresh one.

**Architecture:** Single atomic DB write (`rotateShareLinkToken` in shared package) + inline confirm UI in `LinkSharingSection` + wiring in `ShareModal`. No migrations, no Lambda, no new files.

**Tech Stack:** TypeScript, Supabase JS client, React 19, Tailwind CSS v4, iconoir-react, motion/react

**Spec:** `docs/superpowers/specs/2026-03-26-share-link-revocation-design.md`

---

## Chunk 1: Data layer — `rotateShareLinkToken`

**Files:**
- Modify: `packages/shared/src/services/api.ts` (after `ensureShareLinkToken`, ~line 325)
- Modify: `packages/shared/src/services/index.ts` (add to export list)

Note: no unit test infrastructure exists for Supabase-calling service functions in this codebase. Correctness is verified by TypeScript compilation and manual smoke test in Chunk 4.

- [ ] **Step 1: Add `rotateShareLinkToken` to `api.ts`**

Open `packages/shared/src/services/api.ts`. Add this function directly after the closing brace of `ensureShareLinkToken` (~line 325):

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

- [ ] **Step 2: Export from `services/index.ts`**

Open `packages/shared/src/services/index.ts`. Find `ensureShareLinkToken` in the named export block and add `rotateShareLinkToken` on the next line:

```ts
  ensureShareLinkToken,
  rotateShareLinkToken,
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: TypeScript errors on `<LinkSharingSection>` usages because new required props are not yet wired — that is expected and will be resolved in Chunk 3. No unexpected errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/services/api.ts packages/shared/src/services/index.ts
git commit -m "feat(shared): add rotateShareLinkToken service function (TRA-270)"
```

---

## Chunk 2: `LinkSharingSection` — revoke button UI

**Files:**
- Modify: `apps/web/components/calendar/sharing/LinkSharingSection.tsx`

The component currently renders: an "Enable link sharing" button when off, or a row with the permission select + "Copy link" button when on. We add a "Revoke link" text button below the copy-link row that expands into an inline confirm.

- [ ] **Step 5: Update `LinkSharingSectionProps`**

Open `apps/web/components/calendar/sharing/LinkSharingSection.tsx`.

Replace the interface with:

```ts
interface LinkSharingSectionProps {
  visibility: Visibility
  linkPermission: LinkPermission
  shareToken: string | null
  isOwner: boolean
  onToggleLinkSharing: () => void
  onChangeLinkPermission: (permission: LinkPermission) => void
  onCopyLink: () => void
  onRevokeLink: () => Promise<void>
}
```

Update the function signature to destructure `isOwner` and `onRevokeLink`:

```ts
export function LinkSharingSection({
  visibility,
  linkPermission,
  shareToken,
  isOwner,
  onToggleLinkSharing,
  onChangeLinkPermission,
  onCopyLink,
  onRevokeLink,
}: LinkSharingSectionProps) {
```

- [ ] **Step 6: Add revoke state variables and reset effect**

Inside the function body, replace:

```ts
const [copied, setCopied] = useState(false)
```

with:

```ts
const [copied, setCopied] = useState(false)
const [showConfirm, setShowConfirm] = useState(false)
const [isRevoking, setIsRevoking] = useState(false)
const [revoked, setRevoked] = useState(false)

const isLinkEnabled = visibility !== 'private'

// Reset confirm/revoked state if link sharing is turned off
useEffect(() => {
  if (!isLinkEnabled) {
    setShowConfirm(false)
    setRevoked(false)
  }
}, [isLinkEnabled])
```

Also remove the `const isLinkEnabled = visibility !== 'private'` line that currently appears before the return statement (it is now declared above).

Add `useEffect` to the React import at the top of the file:

```ts
import { useEffect, useState } from 'react'
```

- [ ] **Step 7: Add `handleRevoke` function**

After `handleCopy`, add:

```ts
const handleRevoke = async () => {
  setIsRevoking(true)
  try {
    await onRevokeLink()
    setShowConfirm(false)
    setRevoked(true)
    setTimeout(() => setRevoked(false), 2000)
  } finally {
    setIsRevoking(false)
  }
}
```

- [ ] **Step 8: Add revoke UI below the copy-link row**

In the JSX, inside the `isLinkEnabled` branch, find the outer `<div className="flex items-center justify-between">` and wrap it together with the new revoke block:

```tsx
<div>
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Link className="h-4 w-4 text-white/60" />
      <div>
        <div className="text-sm text-white">Anyone with the link</div>
        <div className="text-xs text-white/40">can {linkPermission === 'editor' ? 'edit' : 'view'}</div>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <select value={linkPermission} onChange={(e) => onChangeLinkPermission(e.target.value as LinkPermission)} className="rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80">
        <option value="viewer">Can view</option>
        <option value="editor">Can edit</option>
      </select>
      <button onClick={handleCopy} disabled={!shareToken} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/10">
        {copied ? 'Copied!' : 'Copy link'}
      </button>
    </div>
  </div>

  {isOwner && shareToken && (
    <div className="mt-2">
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
        >
          {revoked ? 'Link revoked' : 'Revoke link'}
        </button>
      ) : (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2">
          <span className="flex-1 text-xs text-red-300">Old link will stop working.</span>
          <button
            onClick={handleRevoke}
            disabled={isRevoking}
            className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            {isRevoking ? 'Revoking…' : 'Revoke'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="text-xs text-white/40 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )}
</div>
```

- [ ] **Step 9: Typecheck**

```bash
npm run typecheck
```

Expected: TypeScript errors on `<LinkSharingSection>` in `ShareModal.tsx` because new required props are not yet passed — expected, fixed in Chunk 3.

---

## Chunk 3: `ShareModal` — wire `handleRevokeLink`

**Files:**
- Modify: `apps/web/components/calendar/sharing/ShareModal.tsx`

- [ ] **Step 10: Add `rotateShareLinkToken` to the import**

Open `apps/web/components/calendar/sharing/ShareModal.tsx`. On line 7, the import from `@travyl/shared` currently reads:

```ts
import { useCollaborators, useAuthStore, updateTripVisibility, ensureShareLinkToken, supabase } from '@travyl/shared'
```

Add `rotateShareLinkToken` to this import:

```ts
import { useCollaborators, useAuthStore, updateTripVisibility, ensureShareLinkToken, rotateShareLinkToken, supabase } from '@travyl/shared'
```

- [ ] **Step 11: Add `revokeUrl` state, `isOwner`, and error handling effect**

Inside `ShareModal`, after the existing `const [inviteLink, setInviteLink] = useState<string | null>(null)` line, add:

```ts
const [revokeUrl, setRevokeUrl] = useState<string | null>(null)
const isOwner = user?.id === trip.user_id
```

Also add a cleanup effect that clears `revokeUrl` when the modal closes, immediately after the existing `useEffect` for the Escape key handler:

```ts
useEffect(() => {
  if (!isOpen) setRevokeUrl(null)
}, [isOpen])
```

- [ ] **Step 12: Add `handleRevokeLink`**

After `handleCopyLink`, add:

```ts
const handleRevokeLink = async () => {
  try {
    const newToken = await rotateShareLinkToken(trip.id)
    const url = `${window.location.origin}/trip/${trip.id}/share/${newToken}`
    try {
      await navigator.clipboard.writeText(url)
      setRevokeUrl(null)
    } catch {
      setRevokeUrl(url)
    }
    await onSettingsChange?.()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to revoke link'
    setInviteError(msg)
  }
}
```

Note: errors from `rotateShareLinkToken` surface via the existing `inviteError` red banner (already rendered in the modal JSX).

- [ ] **Step 13: Add clipboard-failure fallback UI**

In the JSX, after the existing `{inviteLink && (...)}` block, add:

```tsx
{revokeUrl && (
  <div className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2">
    <p className="text-xs text-amber-400 mb-1">Clipboard unavailable — copy your new link:</p>
    <div className="flex items-center gap-2">
      <input
        readOnly
        value={revokeUrl}
        className="flex-1 rounded bg-white/5 px-2 py-1 text-xs text-white/70 outline-none"
        onClick={(e) => (e.target as HTMLInputElement).select()}
      />
      <button
        onClick={() => { navigator.clipboard.writeText(revokeUrl); setRevokeUrl(null) }}
        className="shrink-0 rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/30 transition-colors"
      >
        Copy
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 14: Pass new props to `<LinkSharingSection>`**

Find the `<LinkSharingSection>` JSX and replace it with:

```tsx
<LinkSharingSection
  visibility={trip.visibility}
  linkPermission={trip.link_permission}
  shareToken={trip.share_link_token}
  isOwner={isOwner}
  onToggleLinkSharing={handleToggleLinkSharing}
  onChangeLinkPermission={handleChangeLinkPermission}
  onCopyLink={handleCopyLink}
  onRevokeLink={handleRevokeLink}
/>
```

- [ ] **Step 15: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 16: Lint**

```bash
npm run lint
```

Expected: zero new warnings.

- [ ] **Step 17: Commit**

```bash
git add apps/web/components/calendar/sharing/LinkSharingSection.tsx apps/web/components/calendar/sharing/ShareModal.tsx
git commit -m "feat(calendar): add share link revocation to ShareModal (TRA-270)"
```

---

## Chunk 4: Smoke test checklist

Manual verification steps (no automated test infrastructure for UI components in this codebase):

- [ ] Start the dev server: `npm run web`
- [ ] Open a trip you own. Click Share in the navbar.
- [ ] Verify "Revoke link" button is NOT visible when link sharing is off.
- [ ] Toggle link sharing on. Verify "Revoke link" appears below the "Copy link" button.
- [ ] Click "Revoke link" → confirm row appears with "Old link will stop working."
- [ ] Click "Cancel" → confirm row dismisses, button returns to "Revoke link".
- [ ] Open the share page in a private window using the current link. Confirm it loads.
- [ ] Back in the modal: click "Revoke link" → "Revoke" → wait for completion.
- [ ] Verify "Link revoked" flash appears on the button.
- [ ] Verify clipboard now contains a URL with a different token (paste somewhere to check).
- [ ] Reload the original share page in the private window → should show "Invalid or Expired Link".
- [ ] Paste the new link → should load the trip correctly.
- [ ] Open the modal as a collaborator (non-owner) → verify "Revoke link" is NOT visible.
- [ ] Disable clipboard API (DevTools → Application → Permissions → Clipboard → Block) → revoke again → verify the amber "Clipboard unavailable" fallback appears with the new URL, and the "Copy" button inside it works.
- [ ] Turn off link sharing while the confirm row is open → reopen modal, re-enable link sharing → confirm row should NOT be pre-expanded.

- [ ] **Final commit if any fixes were needed:**

```bash
git add -A
git commit -m "fix(calendar): share link revocation smoke test fixes (TRA-270)"
```
