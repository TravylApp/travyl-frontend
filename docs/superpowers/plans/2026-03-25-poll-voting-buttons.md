# Poll Voting Buttons Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bottom-strip poll bar on calendar event cards with two floating `ThumbsUp`/`ThumbsDown` buttons that appear to the right of the card on hover.

**Architecture:** `PollBar.tsx` is rewritten to export a new `FloatingVoteButtons` component; `EventBlock.tsx` is restructured to split `overflow-hidden` into an inner wrapper so the buttons can float outside the card boundary; `CalendarDashboard.tsx` gains context-menu items for resolved-poll management.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, `iconoir-react` (`ThumbsUp`, `ThumbsDown`), `@dnd-kit/core`

**Spec:** `docs/superpowers/specs/2026-03-25-poll-voting-buttons-design.md`

---

## Chunk 1: FloatingVoteButtons component + EventBlock restructure

### Task 1: Rewrite PollBar.tsx as FloatingVoteButtons

**Files:**
- Modify: `apps/web/components/calendar/PollBar.tsx`

- [ ] **Step 1: Replace the entire file contents**

Open `apps/web/components/calendar/PollBar.tsx` and replace with:

```tsx
'use client'

import { ThumbsUp, ThumbsDown } from 'iconoir-react'
import type { Poll } from '@travyl/shared'

interface FloatingVoteButtonsProps {
  poll: Poll
  userId: string
  onVote: (vote: 'yes' | 'no') => void
  compact?: boolean
  isResolved: boolean
}

export function FloatingVoteButtons({
  poll,
  userId,
  onVote,
  compact,
  isResolved,
}: FloatingVoteButtonsProps) {
  if (isResolved) return null

  const myVote = poll.votes[userId] as 'yes' | 'no' | undefined
  const yesCount = Object.values(poll.votes).filter((v) => v === 'yes').length
  const noCount = Object.values(poll.votes).filter((v) => v === 'no').length

  const positionClass = compact ? 'top-1' : 'top-1/2 -translate-y-1/2'

  return (
    <div
      className={[
        'absolute left-full ml-1.5 flex flex-col gap-1 z-20',
        'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
        'pointer-events-none group-hover:pointer-events-auto',
        positionClass,
      ].join(' ')}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col items-center">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onVote('yes')
          }}
          className={[
            'w-7 h-7 rounded-md flex items-center justify-center transition-colors duration-150',
            myVote === 'yes'
              ? 'bg-emerald-500/80 text-white hover:bg-emerald-500/60'
              : 'bg-black/60 backdrop-blur-sm text-white/60 hover:text-white hover:bg-black/80',
          ].join(' ')}
          aria-label="Vote yes"
        >
          <ThumbsUp width={13} height={13} />
        </button>
        {yesCount > 0 && (
          <span className="text-[9px] text-white/70 text-center leading-none mt-0.5">
            {yesCount}
          </span>
        )}
      </div>

      <div className="flex flex-col items-center">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onVote('no')
          }}
          className={[
            'w-7 h-7 rounded-md flex items-center justify-center transition-colors duration-150',
            myVote === 'no'
              ? 'bg-red-500/80 text-white hover:bg-red-500/60'
              : 'bg-black/60 backdrop-blur-sm text-white/60 hover:text-white hover:bg-black/80',
          ].join(' ')}
          aria-label="Vote no"
        >
          <ThumbsDown width={13} height={13} />
        </button>
        {noCount > 0 && (
          <span className="text-[9px] text-white/70 text-center leading-none mt-0.5">
            {noCount}
          </span>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck on the file**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck 2>&1 | head -40
```

Expected: errors only from `EventBlock.tsx` still importing `PollBar` (now gone) — not from `PollBar.tsx` itself.

---

### Task 2: Restructure EventBlock.tsx

**Files:**
- Modify: `apps/web/components/calendar/EventBlock.tsx`

The goal is:
1. Remove `overflow-hidden` from the root div
2. Add `group` to the root div
3. Wrap all visual content in `<div className="absolute inset-0 rounded-md overflow-hidden">`
4. Replace `<PollBar>` with `<FloatingVoteButtons>`

- [ ] **Step 1: Update the import at the top of the file**

Change:
```tsx
import { PollBar } from './PollBar'
```
To:
```tsx
import { FloatingVoteButtons } from './PollBar'
```

- [ ] **Step 2: Add `group` and remove `overflow-hidden` from the root div className**

Find the `className={[...].filter(Boolean).join(' ')}` array on the root `<div>` (around line 135). The array has multiple string entries; the first one is:

```
'rounded-md cursor-grab active:cursor-grabbing overflow-hidden select-none relative'
```

Change **that string only** to:
```
'group rounded-md cursor-grab active:cursor-grabbing select-none relative'
```

(Removed `overflow-hidden`, added `group`. Leave all other entries in the className array untouched.)

- [ ] **Step 3: Wrap visual content in the inner clip div**

The root div's children are currently:
- A `{hasImage ? (...) : (...)}` block — image or text content
- `{activeViewers.length > 0 && ...}` viewer avatars
- `{hiddenCount > 0 && ...}` hidden count badge
- `{poll && ... <PollBar>}` poll bar (being replaced)
- `{onResize && ...}` resize handles

**Important:** The resize handles must remain as **direct children of the root div**, not inside the inner clip wrapper. This keeps them at the correct stacking level and ensures their hit areas aren't clipped.

Replace all the existing children of the root div with the following structure. The image/text content, viewer avatars, and hiddenCount badge move inside the inner clip wrapper. The resize handles stay outside it. The PollBar is replaced by `FloatingVoteButtons`.

```tsx
{/* Inner clip wrapper — provides overflow-hidden and rounded corners for card content */}
<div className="absolute inset-0 rounded-md overflow-hidden">
  {hasImage ? (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center rounded-md"
        style={{ backgroundImage: `url(${activity.image})` }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 px-2 pb-1.5 pt-6"
        style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}
      >
        <div
          className="font-semibold truncate text-white"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
        >
          {activity.title}
        </div>
        <div
          className="text-[10px] text-white/85 truncate"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {formatTimeRange(activity)}
        </div>
        {activity.location && (
          <div
            className="text-[9px] text-white/70 truncate"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          >
            {activity.location}
          </div>
        )}
      </div>
    </>
  ) : (
    <div className="px-2 py-1 flex flex-col gap-0.5">
      <span className="font-semibold truncate leading-tight text-white">{activity.title}</span>
      <span className="opacity-80 truncate text-white">{formatTimeRange(activity)}</span>
      {activity.location && (
        <span className="opacity-70 truncate text-[10px] text-white">{activity.location}</span>
      )}
    </div>
  )}

  {activeViewers.length > 0 && (
    <div className="absolute top-1 right-1 flex gap-0.5">
      {activeViewers.slice(0, 5).map((viewer) => (
        <span
          key={viewer.userId}
          title={viewer.name}
          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white ring-1 ring-white/50"
          style={{ backgroundColor: viewer.color }}
        >
          {viewer.avatarInitial}
        </span>
      ))}
      {activeViewers.length > 5 && (
        <span className="text-[9px] opacity-80">+{activeViewers.length - 5}</span>
      )}
    </div>
  )}

  {hiddenCount > 0 && (
    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-auto">
      +{hiddenCount} more
    </div>
  )}
</div>

{/* Resize handles — direct children of root div, NOT inside inner clip wrapper */}
{onResize && (
  <>
    <div
      {...topHandleProps}
      className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize z-20 group/handle"
      style={{ touchAction: 'none' }}
    >
      <div className="absolute top-0 left-1/4 right-1/4 h-[2px] rounded-full bg-white/0 group-hover/handle:bg-white/60 transition-colors" />
    </div>
    <div
      {...bottomHandleProps}
      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-20 group/handle"
      style={{ touchAction: 'none' }}
    >
      <div className="absolute bottom-0 left-1/4 right-1/4 h-[2px] rounded-full bg-white/0 group-hover/handle:bg-white/60 transition-colors" />
    </div>
  </>
)}

{/* Floating vote buttons — outside inner clip, floats right of card */}
{poll && userId && onVote && (
  <FloatingVoteButtons
    poll={poll}
    userId={userId}
    onVote={(v) => onVote(activity.id, v)}
    compact={displayDuration < 0.67}
    isResolved={poll.status === 'resolved'}
  />
)}
```

The `isSelected` / `isMultiSelected` ring styling on the root div is unchanged — it works regardless of `overflow-hidden`.

- [ ] **Step 3: Run typecheck**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck 2>&1 | head -40
```

Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 4: Verify visually in the browser**

Start the dev server if not already running:
```bash
npm run web
```

Open a trip with at least one activity. Start a poll on the activity via right-click → "Start Poll".

Check:
- Hovering the activity card shows two small buttons to the right of the card
- Buttons fade in/out smoothly on hover
- Clicking thumbs up highlights it in emerald, shows count
- Clicking thumbs down highlights it in red, shows count
- No bottom bar is visible on the card
- Dragging the card still works normally

- [ ] **Step 5: Commit**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend
git add apps/web/components/calendar/PollBar.tsx apps/web/components/calendar/EventBlock.tsx
git commit -m "feat: replace poll bar strip with floating vote buttons on event cards"
```

---

## Chunk 2: Resolved poll context menu + cleanup

### Task 3: Add resolved-poll actions to CalendarDashboard context menu

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

- [ ] **Step 1: Add `isResolvedPoll` and `canManagePoll` variables in the context menu block**

Find the `{contextMenu && (() => {` block (around line 726). Currently it computes:
```tsx
const poll = polls.get(contextMenu.activityId)
const hasActivePoll = poll?.status === 'active'
const canClosePoll = hasActivePoll && (poll.startedBy === userId || trip?.user_id === userId)
```

Add two new lines after these:
```tsx
const isResolvedPoll = poll?.status === 'resolved'
const canManagePoll = poll ? (poll.startedBy === userId || trip?.user_id === userId) : false
```

Also update `canClosePoll` to use `canManagePoll` (avoids duplicating the condition):
```tsx
const canClosePoll = hasActivePoll && canManagePoll
```

- [ ] **Step 2: Update the `actions` array to handle resolved polls**

Find the `actions={[...]}` array in the same block. Currently the poll slot is:
```tsx
hasActivePoll
  ? { id: 'close-poll', label: 'Close Poll', disabled: !canClosePoll }
  : { id: 'start-poll', label: 'Start Poll' },
```

Replace with a spread so resolved polls can inject two items:
```tsx
...(isResolvedPoll && canManagePoll
  ? [
      { id: 'restore-poll', label: 'Restore Poll' },
      { id: 'remove-activity', label: 'Remove from Calendar', danger: true },
    ]
  : hasActivePoll
    ? [{ id: 'close-poll', label: 'Close Poll', disabled: !canClosePoll }]
    : [{ id: 'start-poll', label: 'Start Poll' }]
),
```

The full `actions` array becomes:
```tsx
actions={[
  { id: 'edit', label: 'Edit' },
  { id: 'duplicate', label: 'Duplicate' },
  { id: 'separator', label: '', separator: true },
  ...(isResolvedPoll && canManagePoll
    ? [
        { id: 'restore-poll', label: 'Restore Poll' },
        { id: 'remove-activity', label: 'Remove from Calendar', danger: true },
      ]
    : hasActivePoll
      ? [{ id: 'close-poll', label: 'Close Poll', disabled: !canClosePoll }]
      : [{ id: 'start-poll', label: 'Start Poll' }]
  ),
  { id: 'separator2', label: '', separator: true },
  { id: 'delete', label: 'Delete', danger: true },
]}
```

- [ ] **Step 3: Add handlers for the new action IDs**

Find `handleContextMenuAction` (around line 384). Add two new branches inside it, after the `close-poll` branch:

```tsx
} else if (actionId === 'restore-poll') {
  restoreActivity(activityId)
} else if (actionId === 'remove-activity') {
  handleRemoveActivity(activityId)
}
```

- [ ] **Step 4: Run typecheck**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run typecheck 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 5: Verify visually in the browser**

With a trip open and a poll active:
1. Right-click a card with an active poll → menu should show "Close Poll"
2. Close the poll (the poll manager can do this)
3. Right-click the same card → menu should now show "Restore Poll" and "Remove from Calendar"
4. Click "Restore Poll" → the poll should go active again (card shows vote buttons again on hover)
5. Right-click → "Remove from Calendar" → activity is removed

- [ ] **Step 6: Run lint**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend && npm run lint 2>&1 | head -40
```

Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/justi/dev/travyl2/travyl-frontend
git add apps/web/components/calendar/CalendarDashboard.tsx
git commit -m "feat: add restore/remove context menu actions for resolved polls"
```
