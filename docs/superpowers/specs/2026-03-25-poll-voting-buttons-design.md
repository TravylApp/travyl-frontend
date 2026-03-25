# Poll Voting Buttons Redesign — Design Spec

**Date:** 2026-03-25
**Branch:** feature/tra-264
**Scope:** Replace the bottom-strip `PollBar` on calendar event cards with floating side buttons

---

## Problem

The current `PollBar` renders as a `border-t` bar pinned to the bottom of `EventBlock`. It uses emoji (👍👎), a mismatched dark overlay style, and occupies vertical space inside an already-small card. The result feels like a tacked-on UI that doesn't match the app's design language.

---

## Solution Overview

Replace the poll bar with two small pill buttons that float to the **right of the card**, appearing on hover. Buttons use `iconoir-react` icons (`ThumbsUp` / `ThumbsDown`), match the calendar's dark glass aesthetic, and never intrude on card content.

---

## Layout & Positioning

### EventBlock restructure

`EventBlock`'s root `<div>` currently has `overflow-hidden` to clip the image and content to the card's rounded corners. To allow children to float outside the card boundary, this is split:

- Root `<div>`: remove `overflow-hidden`, keep `relative`, add `group` class
- New inner wrapper `<div className="absolute inset-0 rounded-md overflow-hidden">`: owns the clipping, contains all image and text content
- Vote buttons: absolute children of the root div, positioned to the right of the inner wrapper

**dnd-kit note:** dnd-kit attaches listeners and transform styles to the root div. Wrapping the visual content in an inner div does not affect dnd-kit's drag hit-testing or transforms because dnd-kit operates purely on the root element's ref and event listeners — the inner wrapper is invisible to it.

### Button placement

```
absolute left-full ml-1.5 top-1/2 -translate-y-1/2
```

`left-full` positions the button container at 100% of the *parent card's width* (not the button container's own width), placing it flush against the card's right edge. `ml-1.5` (6px) adds the gap. `top-1/2 -translate-y-1/2` vertically centers the stack.

### Viewport right-edge overflow

Cards in the rightmost calendar column will have floating buttons that render outside the visible scroll area. This edge case is **deferred for v1** — the buttons are small (28px wide), and rightmost-column events are rare in typical trip planning. If user feedback identifies this as a problem, a future iteration can flip the buttons to `right-full -mr-1.5` when the card is near the viewport right edge.

### Z-index

The floating button container uses `z-20`, matching the resize handles already on `EventBlock`. Since all `EventBlock` elements are siblings in the same stacking context (a day column), `z-20` ensures the hovered card's buttons render above adjacent cards' content.

### Visibility

```
opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto
```

Buttons are hidden by default and fade in when the card (or the buttons themselves, since they share the same `group` parent) is hovered. `pointer-events-none` when hidden prevents accidental clicks on invisible buttons.

---

## Button Design

Each button is a small square pill:

```
w-7 h-7 rounded-md flex items-center justify-center transition-colors duration-150
```

### Default (unvoted)

```
bg-black/60 backdrop-blur-sm text-white/60 hover:text-white hover:bg-black/80
```

### Voted — Yes

```
bg-emerald-500/80 text-white hover:bg-emerald-500/60
```

Hovering a button that is already in a voted state dims it slightly, providing a visual affordance that clicking again will toggle the vote off (i.e., calling `onVote` with the same value de-selects — this behavior is controlled by the existing `vote` mutation which toggles on repeat).

### Voted — No

```
bg-red-500/80 text-white hover:bg-red-500/60
```

### Icons

- Yes: `<ThumbsUp width={13} height={13} />` from `iconoir-react`
- No: `<ThumbsDown width={13} height={13} />` from `iconoir-react`

### Vote counts

A small count badge sits below each button when `count > 0`:

```
text-[9px] text-white/70 text-center leading-none mt-0.5
```

If `count === 0`, no badge is shown (avoid visual clutter).

---

## Compact Mode

Compact mode is defined as `displayDuration < 0.67` (matching the existing `compact` prop threshold in `EventBlock`). At this duration the card is approximately 40px tall.

In compact mode, vertical centering changes from `top-1/2 -translate-y-1/2` to `top-1`, keeping buttons reachable at the top of very short cards.

---

## Resolved Poll State

When `poll.status === 'resolved'`:

- **Floating vote buttons are hidden for all users** — no voting on a resolved poll.
- **Poll manager** (`canManagePoll === true`, which encapsulates the existing `poll.startedBy === userId || trip?.user_id === userId` logic already computed in `CalendarDashboard`): two new context menu items appear on right-click — "Restore Poll" and "Remove from Calendar".
- **Other collaborators**: no voting UI at all (same as current behavior).

### Context menu wiring for resolved polls

`ActivityContextMenu` uses a data-driven `actions` array passed from `CalendarDashboard`. The existing `handleContextMenuAction` already handles `start-poll` and `close-poll`. The following additions are required:

**In `CalendarDashboard` context menu action array** (the `contextMenu && ...` block):
- When `poll?.status === 'resolved' && canManagePoll`:
  - Add `{ id: 'restore-poll', label: 'Restore Poll' }`
  - Add `{ id: 'remove-activity', label: 'Remove from Calendar', danger: true }`
  - Remove the `start-poll` / `close-poll` conditional for this state

**In `handleContextMenuAction`**:
- Add `else if (actionId === 'restore-poll') { restoreActivity(activityId) }` — `restoreActivity` already exists from `usePollMutations`
- Add `else if (actionId === 'remove-activity') { handleRemoveActivity(activityId) }` — `handleRemoveActivity` already exists

No changes are needed to `ActivityContextMenu.tsx` itself — it is fully data-driven.

---

## Voter Avatars

The mini avatar row currently in `ActivePollBar` is **removed in v1**. Vote counts are sufficient. This can be revisited if user feedback asks for it.

---

## Files Changed

### `apps/web/components/calendar/EventBlock.tsx`

- Add `group` to root div className
- Remove `overflow-hidden` from root div
- Add inner `<div className="absolute inset-0 rounded-md overflow-hidden">` wrapping all image/text content (replaces the need for `overflow-hidden` on the root)
- Replace `<PollBar>` absolute bottom section with new `<FloatingVoteButtons>` component
- Props passed to `<FloatingVoteButtons>`: `poll`, `userId`, `onVote`, `compact` (already computed as `displayDuration < 0.67`), `isResolved` (`poll.status === 'resolved'`)

### `apps/web/components/calendar/PollBar.tsx`

- Replace `ActivePollBar` with new `FloatingVoteButtons` component in the same file
- Remove `ResolvedRemoveBar` entirely (actions moved to context menu)
- Simplify or remove the `PollBar` wrapper export — `FloatingVoteButtons` is exported directly and used in `EventBlock`

### `apps/web/components/calendar/CalendarDashboard.tsx`

- Add resolved-poll context menu items (`restore-poll`, `remove-activity`) and their handlers in `handleContextMenuAction`

---

## Non-Goals

- No changes to poll data model or mutation hooks
- No changes to how polls are started or closed
- No mobile (Expo) changes
- Voter avatar tooltips deferred to a future iteration
- Rightmost-column button flipping deferred to a future iteration

---

## Acceptance Criteria

1. Hovering a polled event card reveals two `ThumbsUp` / `ThumbsDown` buttons to the right of the card, 6px gap from the card edge
2. Buttons are not visible (opacity 0, pointer-events none) when not hovering
3. Hovering from the card to the buttons (or vice versa) does not cause flicker — both are within the same CSS `group`
4. Clicking yes/no correctly calls `onVote` and reflects voted state: emerald for yes, red for no
5. Re-clicking an already-voted button dims it slightly (hover state) and calls `onVote` again to toggle off
6. Vote counts appear below each button when count > 0; no badge when count is 0
7. On compact cards (`displayDuration < 0.67`), buttons are positioned at `top-1` instead of vertically centered
8. The floating button container uses `z-20` and does not render underneath adjacent event cards
9. No bottom strip bar remains on any polled event card
10. For resolved polls with `canManagePoll === true`: right-click context menu shows "Restore Poll" and "Remove from Calendar"; these call `restoreActivity` and `handleRemoveActivity` respectively
11. For resolved polls with `canManagePoll === false`: no voting UI visible
12. dnd-kit drag behavior (drag, drop, transform) is unaffected by the inner wrapper restructure
13. No TypeScript errors, no lint errors
