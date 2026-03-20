# Calendar Keyboard Commands + Trip Navbar Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add keyboard commands to the trip calendar via a command registry, wired to a custom trip navbar (menu bar), keyboard shortcut hook, and Ctrl+K command palette — all replacing the global floating navbar on trip pages.

**Architecture:** A `useCalendarCommands` hook produces a `Command[]` registry consumed by three surfaces: `TripMenuBar` (inside `TripNavbar`), `CommandPalette`, and `useKeyboardShortcuts`. The `TripNavbar` replaces both the global pill `Navbar` and the existing `CalendarHeader`. Trip pages move to a new `(trips-app)` route group whose layout renders no navbar.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, iconoir-react, motion/react, @travyl/shared. No new dependencies required.

---

## Chunk 1: Foundation — Command Type, duplicateActivity, Route Migration

### Task 1: Add `Command` interface to calendar types

**Files:**
- Modify: `apps/web/components/calendar/types.ts`

- [ ] **Step 1: Open the file and read the current contents**

  `apps/web/components/calendar/types.ts` currently re-exports types from `@travyl/shared`. It looks like:
  ```ts
  export type { CalendarActivity, ViewMode, UserAwareness } from '@travyl/shared/types'
  export type { SuggestionCard } from '@travyl/shared/types'
  export type { TimeRange } from '@travyl/shared/viewmodels/calendarViewModel'
  ```

- [ ] **Step 2: Add the `Command` interface**

  Append to `apps/web/components/calendar/types.ts`:
  ```ts
  export interface Command {
    id: string
    label: string
    group: 'edit' | 'activity' | 'view' | 'insert'
    shortcut?: {
      key: string
      meta?: boolean   // Ctrl / Cmd
      shift?: boolean
      display: string  // e.g. "Ctrl D", "↑", "Del"
    }
    isEnabled: boolean
    execute: () => void
  }
  ```
  `Command` is web-local (not in `@travyl/shared`) because `execute: () => void` is a runtime function, not a serializable data type.

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npm run typecheck
  ```
  Expected: no new errors.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/web/components/calendar/types.ts
  git commit -m "feat: add Command interface to calendar types"
  ```

---

### Task 2: Add `duplicateActivity` to `useActivityMutations`

**Files:**
- Modify: `apps/web/components/calendar/hooks/useActivityMutations.ts`

The current `UseActivityMutationsReturn` interface and hook need one new method. `duplicateActivity` computes `sortOrder` from the Yjs `activitiesMap` (already in scope in the hook) — no additional parameter needed.

- [ ] **Step 1: Update `UseActivityMutationsReturn` interface**

  In `useActivityMutations.ts`, change:
  ```ts
  interface UseActivityMutationsReturn {
    addActivity: (activity: CalendarActivity) => Promise<void>
    updateActivity: (id: string, patch: Partial<CalendarActivity>) => void
    moveActivity: (id: string, newDay: number, newStartHour: number) => void
    removeActivity: (id: string) => Promise<void>
  }
  ```
  To:
  ```ts
  interface UseActivityMutationsReturn {
    addActivity: (activity: CalendarActivity) => Promise<void>
    updateActivity: (id: string, patch: Partial<CalendarActivity>) => void
    moveActivity: (id: string, newDay: number, newStartHour: number) => void
    removeActivity: (id: string) => Promise<void>
    duplicateActivity: (source: CalendarActivity) => Promise<void>
  }
  ```

- [ ] **Step 2: Implement `duplicateActivity` inside the hook body**

  Add this `useCallback` after `removeActivity` and before the `return` statement:
  ```ts
  const duplicateActivity = useCallback(
    async (source: CalendarActivity): Promise<void> => {
      // Compute max sortOrder from the live Yjs activitiesMap
      let maxSortOrder = 0
      activitiesMap.forEach((yMap) => {
        const so = yMap.get('sortOrder') as number | undefined
        if (so !== undefined && so > maxSortOrder) maxSortOrder = so
      })
      const clone: CalendarActivity = {
        ...source,
        id: crypto.randomUUID(),
        sortOrder: maxSortOrder + 1,
      }
      await addActivity(clone)
    },
    [activitiesMap, addActivity],
  )
  ```

- [ ] **Step 3: Add `duplicateActivity` to the return statement**

  Change:
  ```ts
  return { addActivity, updateActivity, moveActivity, removeActivity }
  ```
  To:
  ```ts
  return { addActivity, updateActivity, moveActivity, removeActivity, duplicateActivity }
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  ```bash
  npm run typecheck
  ```
  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/components/calendar/hooks/useActivityMutations.ts
  git commit -m "feat: add duplicateActivity to useActivityMutations"
  ```

---

### Task 3: Create `(trips-app)` route group and migrate trip pages

**Files:**
- Create: `apps/web/app/(trips-app)/layout.tsx`
- Move: all files under `apps/web/app/(main)/trip/` → `apps/web/app/(trips-app)/trip/`

The `(main)` layout renders `<Navbar />` and `<main className="pt-16">`. Trip pages must opt out. Next.js route groups don't affect URLs — `/trip/[id]` resolves identically from either group.

- [ ] **Step 1: Create the new route group layout**

  Create `apps/web/app/(trips-app)/layout.tsx`:
  ```tsx
  export default function TripsAppLayout({
    children,
  }: {
    children: React.ReactNode
  }) {
    return <>{children}</>
  }
  ```
  No navbar, no `pt-16`. `CalendarDashboard` manages its own `h-screen` layout.

- [ ] **Step 2: Create the directory structure**

  ```bash
  mkdir -p "apps/web/app/(trips-app)/trip/[id]"
  ```

- [ ] **Step 3: Move all trip route files**

  Run each `mv` individually to avoid shell glob issues on Windows:
  ```bash
  cd "apps/web/app"
  mkdir -p "(trips-app)/trip/[id]/itinerary"
  mkdir -p "(trips-app)/trip/[id]/activities"
  mkdir -p "(trips-app)/trip/[id]/budget"
  mkdir -p "(trips-app)/trip/[id]/cars"
  mkdir -p "(trips-app)/trip/[id]/favorites"
  mkdir -p "(trips-app)/trip/[id]/flights"
  mkdir -p "(trips-app)/trip/[id]/hotels"
  mkdir -p "(trips-app)/trip/[id]/info"
  mkdir -p "(trips-app)/trip/[id]/packing"
  mkdir -p "(trips-app)/trip/[id]/restaurants"
  mkdir -p "(trips-app)/trip/[id]/settings"
  mkdir -p "(trips-app)/trip/[id]/share/[token]"
  mv "(main)/trip/[id]/layout.tsx" "(trips-app)/trip/[id]/layout.tsx"
  mv "(main)/trip/[id]/page.tsx" "(trips-app)/trip/[id]/page.tsx"
  mv "(main)/trip/[id]/itinerary/page.tsx" "(trips-app)/trip/[id]/itinerary/page.tsx"
  mv "(main)/trip/[id]/activities/page.tsx" "(trips-app)/trip/[id]/activities/page.tsx"
  mv "(main)/trip/[id]/budget/page.tsx" "(trips-app)/trip/[id]/budget/page.tsx"
  mv "(main)/trip/[id]/cars/page.tsx" "(trips-app)/trip/[id]/cars/page.tsx"
  mv "(main)/trip/[id]/favorites/page.tsx" "(trips-app)/trip/[id]/favorites/page.tsx"
  mv "(main)/trip/[id]/flights/page.tsx" "(trips-app)/trip/[id]/flights/page.tsx"
  mv "(main)/trip/[id]/hotels/page.tsx" "(trips-app)/trip/[id]/hotels/page.tsx"
  mv "(main)/trip/[id]/info/page.tsx" "(trips-app)/trip/[id]/info/page.tsx"
  mv "(main)/trip/[id]/packing/page.tsx" "(trips-app)/trip/[id]/packing/page.tsx"
  mv "(main)/trip/[id]/restaurants/page.tsx" "(trips-app)/trip/[id]/restaurants/page.tsx"
  mv "(main)/trip/[id]/settings/page.tsx" "(trips-app)/trip/[id]/settings/page.tsx"
  mv "(main)/trip/[id]/share/[token]/page.tsx" "(trips-app)/trip/[id]/share/[token]/page.tsx"
  ```
  Then clean up empty directories:
  ```bash
  rm -rf "(main)/trip"
  ```

- [ ] **Step 4: Verify the app still builds and routes work**

  ```bash
  npm run typecheck
  ```
  Then start dev server (`npm run web`) and navigate to `/trip/<any-id>`. The page should load without the floating pill navbar.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/app/
  git commit -m "feat: move trip routes to (trips-app) route group, remove global navbar from trip pages"
  ```

---

## Chunk 2: useCalendarCommands + useKeyboardShortcuts

### Task 4: Create `useCalendarCommands`

**Files:**
- Create: `apps/web/components/calendar/hooks/useCalendarCommands.ts`

This hook is the single source of truth for all commands. It takes live state/callbacks and returns a stable `Command[]` array. The array is recomputed whenever any dependency changes (React `useMemo`).

- [ ] **Step 1: Create the file**

  Create `apps/web/components/calendar/hooks/useCalendarCommands.ts`:

  ```ts
  import { useMemo } from 'react'
  import type { CalendarActivity, ViewMode } from '../types'
  import type { Command } from '../types'

  interface UseCalendarCommandsInput {
    selectedActivity: CalendarActivity | null
    isPaletteOpen: boolean
    moveActivity: (id: string, newDay: number, newStartHour: number) => void
    removeActivity: (id: string) => Promise<void>
    updateActivity: (id: string, patch: Partial<CalendarActivity>) => void
    duplicateActivity: (source: CalendarActivity) => Promise<void>
    onViewModeChange: (mode: ViewMode) => void
    selectDay: (dayIndex: number) => void
    tripDays: { dayIndex: number; label: string }[]
    tripStartDate: Date
    onAddEvent: () => void
    onOpenPalette: () => void
  }

  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  export function useCalendarCommands({
    selectedActivity,
    isPaletteOpen,
    moveActivity,
    removeActivity,
    updateActivity,
    duplicateActivity,
    onViewModeChange,
    selectDay,
    tripDays,
    tripStartDate,
    onAddEvent,
    onOpenPalette,
  }: UseCalendarCommandsInput): Command[] {
    return useMemo<Command[]>(() => {
      const hasSelection = selectedActivity !== null
      const id = selectedActivity?.id ?? ''
      const day = selectedActivity?.day ?? 0
      const startHour = selectedActivity?.startHour ?? 0
      const duration = selectedActivity?.duration ?? 1

      return [
        // ── Edit ──────────────────────────────────────────────────
        {
          id: 'undo',
          label: 'Undo',
          group: 'edit',
          shortcut: { key: 'z', meta: true, display: 'Ctrl Z' },
          isEnabled: false, // TODO: implement undo stack
          execute: () => { /* TODO: implement undo stack */ },
        },
        {
          id: 'redo',
          label: 'Redo',
          group: 'edit',
          shortcut: { key: 'y', meta: true, display: 'Ctrl Y' },
          isEnabled: false, // TODO: implement undo stack
          execute: () => { /* TODO: implement undo stack */ },
        },
        {
          id: 'delete',
          label: 'Delete Activity',
          group: 'edit',
          shortcut: { key: 'Delete', display: 'Del' },
          isEnabled: hasSelection,
          execute: () => { if (hasSelection) removeActivity(id) },
        },
        {
          id: 'duplicate',
          label: 'Duplicate Activity',
          group: 'edit',
          shortcut: { key: 'd', meta: true, display: 'Ctrl D' },
          isEnabled: hasSelection,
          execute: () => { if (selectedActivity) duplicateActivity(selectedActivity) },
        },

        // ── Activity ──────────────────────────────────────────────
        {
          id: 'move-up',
          label: 'Move Up 30 min',
          group: 'activity',
          shortcut: { key: 'ArrowUp', display: '↑' },
          isEnabled: hasSelection && !isPaletteOpen,
          execute: () => {
            if (hasSelection) moveActivity(id, day, clamp(startHour - 0.5, 0, 24 - duration))
          },
        },
        {
          id: 'move-down',
          label: 'Move Down 30 min',
          group: 'activity',
          shortcut: { key: 'ArrowDown', display: '↓' },
          isEnabled: hasSelection && !isPaletteOpen,
          execute: () => {
            if (hasSelection) moveActivity(id, day, clamp(startHour + 0.5, 0, 24 - duration))
          },
        },
        {
          id: 'move-prev-day',
          label: 'Move to Prev Day',
          group: 'activity',
          shortcut: { key: 'ArrowLeft', display: '←' },
          isEnabled: hasSelection && !isPaletteOpen,
          execute: () => {
            if (hasSelection) moveActivity(id, clamp(day - 1, 0, tripDays.length - 1), startHour)
          },
        },
        {
          id: 'move-next-day',
          label: 'Move to Next Day',
          group: 'activity',
          shortcut: { key: 'ArrowRight', display: '→' },
          isEnabled: hasSelection && !isPaletteOpen,
          execute: () => {
            if (hasSelection) moveActivity(id, clamp(day + 1, 0, tripDays.length - 1), startHour)
          },
        },
        {
          id: 'extend',
          label: 'Extend Duration',
          group: 'activity',
          shortcut: { key: '+', display: '+' },
          isEnabled: hasSelection && startHour + duration + 0.5 <= 24,
          execute: () => {
            if (hasSelection) updateActivity(id, { duration: duration + 0.5 })
          },
        },
        {
          id: 'shorten',
          label: 'Shorten Duration',
          group: 'activity',
          shortcut: { key: '-', display: '-' },
          isEnabled: hasSelection && duration > 0.5,
          execute: () => {
            if (hasSelection) updateActivity(id, { duration: Math.max(0.5, duration - 0.5) })
          },
        },

        // ── View ──────────────────────────────────────────────────
        {
          id: 'week-view',
          label: 'Week View',
          group: 'view',
          shortcut: { key: 'w', display: 'W' },
          isEnabled: true,
          execute: () => onViewModeChange('week'),
        },
        {
          id: 'day-view',
          label: 'Day View',
          group: 'view',
          shortcut: { key: 'd', display: 'D' },
          isEnabled: true,
          execute: () => onViewModeChange('day'),
        },
        {
          id: 'jump-today',
          label: 'Jump to Today',
          group: 'view',
          shortcut: { key: 't', display: 'T' },
          isEnabled: true,
          execute: () => {
            const today = new Date()
            const msPerDay = 1000 * 60 * 60 * 24
            const todayDayIndex = Math.round(
              (today.getTime() - tripStartDate.getTime()) / msPerDay,
            )
            if (todayDayIndex >= 0 && todayDayIndex < tripDays.length) {
              selectDay(todayDayIndex)
            }
            // No-op if today is outside trip date range
          },
        },
        {
          id: 'open-palette',
          label: 'Open Command Palette',
          group: 'view',
          shortcut: { key: 'k', meta: true, display: 'Ctrl K' },
          isEnabled: true,
          execute: onOpenPalette,
        },

        // ── Insert ────────────────────────────────────────────────
        {
          id: 'new-activity',
          label: 'New Activity',
          group: 'insert',
          shortcut: { key: 'n', display: 'N' },
          isEnabled: true,
          execute: onAddEvent,
        },
      ]
    }, [
      selectedActivity, isPaletteOpen,
      id, day, startHour, duration,
      moveActivity, removeActivity, updateActivity, duplicateActivity,
      onViewModeChange, selectDay, tripDays, tripStartDate,
      onAddEvent, onOpenPalette,
    ])
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run typecheck
  ```
  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/components/calendar/hooks/useCalendarCommands.ts
  git commit -m "feat: add useCalendarCommands hook (command registry)"
  ```

---

### Task 5: Create `useKeyboardShortcuts`

**Files:**
- Create: `apps/web/components/calendar/hooks/useKeyboardShortcuts.ts`

This hook attaches a single `keydown` listener to `document`. It is called from `CalendarDashboard`, which stays mounted for the lifetime of the trip page. Escape is handled as special-case logic outside the command registry.

- [ ] **Step 1: Create the file**

  Create `apps/web/components/calendar/hooks/useKeyboardShortcuts.ts`:

  ```ts
  import { useEffect } from 'react'
  import type { Command } from '../types'

  export function useKeyboardShortcuts(
    commands: Command[],
    isPaletteOpen: boolean,
    onClosePalette: () => void,
    onDeselect: () => void,
  ): void {
    useEffect(() => {
      function handler(e: KeyboardEvent) {
        const target = e.target as HTMLElement
        const isInput =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.getAttribute('contenteditable') === 'true'

        // Escape is always handled, even inside inputs
        if (e.key === 'Escape') {
          e.preventDefault()
          if (isPaletteOpen) {
            onClosePalette()
          } else if (commands.some((c) => c.id === 'delete' && c.isEnabled)) {
            // 'delete' command is only enabled when an activity is selected
            onDeselect()
          }
          return
        }

        // Skip all other shortcuts when focus is in a text input
        if (isInput) return

        // Find matching enabled command
        const match = commands.find((cmd) => {
          if (!cmd.shortcut || !cmd.isEnabled) return false
          const keyMatch = e.key === cmd.shortcut.key
          const metaMatch = !!cmd.shortcut.meta === (e.ctrlKey || e.metaKey)
          const shiftMatch = !!cmd.shortcut.shift === e.shiftKey
          return keyMatch && metaMatch && shiftMatch
        })

        if (match) {
          e.preventDefault()
          match.execute()
        }
      }

      document.addEventListener('keydown', handler)
      return () => document.removeEventListener('keydown', handler)
    }, [commands, isPaletteOpen, onClosePalette, onDeselect])
  }
  ```

  **Note on key matching:** `e.key` for arrow keys is `'ArrowUp'`, `'ArrowDown'`, `'ArrowLeft'`, `'ArrowRight'`. For Delete it is `'Delete'`. For Backspace it is `'Backspace'`. For `+` it is `'+'`. For `-` it is `'-'`. Letters are case-sensitive in `e.key` — `e.key === 'n'` only matches lowercase. The `delete` command uses `key: 'Delete'` per the registry. To also handle Backspace, add a second command entry or check both in the find. Per spec, delete fires on both `Del` and `Backspace` — handle this by registering two shortcut objects or checking both keys in the handler. Simplest approach: add a `Backspace` variant of the delete command:

  Actually, rather than two commands, change the handler to also check `'Backspace'` for the `delete` command:
  ```ts
  const match = commands.find((cmd) => {
    if (!cmd.shortcut || !cmd.isEnabled) return false
    // delete command also fires on Backspace
    const keyMatch =
      e.key === cmd.shortcut.key ||
      (cmd.id === 'delete' && e.key === 'Backspace')
    const metaMatch = !!cmd.shortcut.meta === (e.ctrlKey || e.metaKey)
    const shiftMatch = !!cmd.shortcut.shift === e.shiftKey
    return keyMatch && metaMatch && shiftMatch
  })
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run typecheck
  ```
  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/components/calendar/hooks/useKeyboardShortcuts.ts
  git commit -m "feat: add useKeyboardShortcuts hook"
  ```

---

## Chunk 3: CommandPalette + TripNavbar

### Task 6: Create `CommandPalette`

**Files:**
- Create: `apps/web/components/calendar/CommandPalette.tsx`

A full-screen modal with backdrop, autofocused search, grouped results, keyboard navigation.

- [ ] **Step 1: Create the file**

  Create `apps/web/components/calendar/CommandPalette.tsx`:

  ```tsx
  'use client'
  import { useState, useEffect, useRef, useMemo } from 'react'
  import { motion, AnimatePresence } from 'motion/react'
  import type { Command } from './types'

  interface CommandPaletteProps {
    isOpen: boolean
    onClose: () => void
    commands: Command[]
  }

  const GROUP_ORDER = ['edit', 'activity', 'view', 'insert'] as const
  const GROUP_LABELS: Record<string, string> = {
    edit: 'Edit',
    activity: 'Activity',
    view: 'View',
    insert: 'Insert',
  }

  export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
    const [query, setQuery] = useState('')
    const [highlightedIndex, setHighlightedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)

    // Reset query and highlight on open
    useEffect(() => {
      if (isOpen) {
        setQuery('')
        setHighlightedIndex(0)
        setTimeout(() => inputRef.current?.focus(), 0)
      }
    }, [isOpen])

    // Filtered and sorted commands
    const filtered = useMemo(() => {
      const q = query.toLowerCase()
      return commands
        .filter((c) => c.label.toLowerCase().includes(q))
        .sort((a, b) => {
          // Enabled first, then disabled
          if (a.isEnabled && !b.isEnabled) return -1
          if (!a.isEnabled && b.isEnabled) return 1
          // Within same enabled state, preserve group order
          const ai = GROUP_ORDER.indexOf(a.group as typeof GROUP_ORDER[number])
          const bi = GROUP_ORDER.indexOf(b.group as typeof GROUP_ORDER[number])
          return ai - bi
        })
    }, [commands, query])

    // Reset highlight to first enabled when filtered list changes
    useEffect(() => {
      const firstEnabled = filtered.findIndex((c) => c.isEnabled)
      setHighlightedIndex(firstEnabled >= 0 ? firstEnabled : 0)
    }, [filtered])

    function handleKeyDown(e: React.KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) => {
          for (let i = prev + 1; i < filtered.length; i++) {
            if (filtered[i].isEnabled) return i
          }
          return prev
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) => {
          for (let i = prev - 1; i >= 0; i--) {
            if (filtered[i].isEnabled) return i
          }
          return prev
        })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = filtered[highlightedIndex]
        if (cmd?.isEnabled) {
          cmd.execute()
          onClose()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    // Group the filtered list for rendering
    const grouped = useMemo(() => {
      const map = new Map<string, Command[]>()
      for (const g of GROUP_ORDER) map.set(g, [])
      for (const cmd of filtered) {
        map.get(cmd.group)?.push(cmd)
      }
      return map
    }, [filtered])

    // Flat index for highlight tracking (needed across groups)
    let flatIndex = 0

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) onClose()
            }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Modal */}
            <motion.div
              className="relative w-full max-w-[480px] mx-4 bg-white dark:bg-[#0f1a28] rounded-xl border border-gray-200 dark:border-[#1e3a5f]/40 shadow-2xl overflow-hidden"
              initial={{ scale: 0.96, y: -8 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: -8 }}
              transition={{ duration: 0.12 }}
              onKeyDown={handleKeyDown}
            >
              {/* Search input */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-[#1e3a5f]/30">
                <svg
                  width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2"
                  className="text-gray-400 dark:text-[#4a7ab5] shrink-0"
                >
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands..."
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-[#f5efe8] placeholder-gray-400 dark:placeholder-[#4a7ab5] outline-none"
                />
                <kbd className="text-[10px] text-gray-400 dark:text-[#484f58] bg-gray-100 dark:bg-[#0a1520] border border-gray-200 dark:border-[#1e3a5f]/30 px-1.5 py-0.5 rounded">
                  Esc
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-[360px] overflow-y-auto py-1">
                {filtered.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-[#4a7ab5]">
                    No commands found
                  </div>
                )}
                {GROUP_ORDER.map((group) => {
                  const cmds = grouped.get(group)
                  if (!cmds?.length) return null
                  return (
                    <div key={group}>
                      <div className="px-3 py-1.5 text-[10px] font-medium text-gray-400 dark:text-[#4a7ab5] uppercase tracking-wider">
                        {GROUP_LABELS[group]}
                      </div>
                      {cmds.map((cmd) => {
                        const index = flatIndex++
                        const isHighlighted = index === highlightedIndex
                        return (
                          <button
                            key={cmd.id}
                            disabled={!cmd.isEnabled}
                            onClick={() => {
                              if (cmd.isEnabled) {
                                cmd.execute()
                                onClose()
                              }
                            }}
                            onMouseEnter={() => {
                              if (cmd.isEnabled) setHighlightedIndex(index)
                            }}
                            className={[
                              'w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors',
                              cmd.isEnabled
                                ? isHighlighted
                                  ? 'bg-gray-100 dark:bg-[#1e3a5f]/30 text-gray-900 dark:text-[#f5efe8]'
                                  : 'text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20'
                                : 'text-gray-400 dark:text-[#484f58] cursor-default',
                              cmd.id === 'delete' && cmd.isEnabled ? 'text-red-600 dark:text-red-400' : '',
                            ].join(' ')}
                          >
                            <span>{cmd.label}</span>
                            {cmd.shortcut && (
                              <kbd className="text-[10px] text-gray-400 dark:text-[#484f58] bg-gray-100 dark:bg-[#0a1520] border border-gray-200 dark:border-[#1e3a5f]/30 px-1.5 py-0.5 rounded ml-4 shrink-0">
                                {cmd.shortcut.display}
                              </kbd>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }
  ```

  **Note on `flatIndex`:** The variable `flatIndex` is declared outside the `.map()` call to track position across groups. It resets to `0` on each render, which is correct since the render is synchronous.

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run typecheck
  ```
  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/components/calendar/CommandPalette.tsx
  git commit -m "feat: add CommandPalette component"
  ```

---

### Task 7: Create `TripNavbar`

**Files:**
- Create: `apps/web/components/calendar/TripNavbar.tsx`

This is the largest component. It contains `TripMenuBar` as an internal sub-component (not a separate file). It replaces both the global `Navbar` and the existing `CalendarHeader`.

Read the existing `CalendarHeader.tsx` and `navbar.tsx` before implementing — the collaborator avatar block and the avatar dropdown can be ported directly.

- [ ] **Step 1: Read the source files before implementing**

  Read `apps/web/components/calendar/CalendarHeader.tsx`. Key things to port into TripNavbar:
  - Connection banner block (the yellow `bg-yellow-500/10` div): copy verbatim
  - Collaborator avatars block: copy verbatim (the `.map()` over `collaborators` with hover tooltip)
  - View toggle (the `role="group"` segmented control): copy verbatim

  Read `apps/web/components/navbar.tsx`. Key things to adapt:
  - Avatar initials helper (`getInitials` function): copy verbatim
  - Avatar circle rendering (the initials/image div): copy and adapt
  - Avatar dropdown state (`dropdownOpen`, `dropdownRef`, outside-click effect): adapt for TripNavbar
  - Sign out handler: copy verbatim
  - Theme toggle button rendering inside the dropdown: copy and adapt

- [ ] **Step 2: Create `TripNavbar.tsx`**

  Create `apps/web/components/calendar/TripNavbar.tsx`:

  ```tsx
  'use client'
  import { useState, useRef, useEffect } from 'react'
  import Link from 'next/link'
  import { NavArrowLeft, Plus, ShareAndroid, Settings, LogOut, Sun, Moon, User } from 'iconoir-react'
  import { useAuthStore } from '@travyl/shared'
  import { PaperPlane } from '@/components/icons/PaperPlane'
  import { ThemeToggle } from './ThemeToggle'
  import type { ViewMode, UserAwareness, CalendarActivity } from './types'
  import type { Command } from './types'
  import type { CalendarTheme } from './hooks/useCalendarTheme'

  // ─── TripMenuBar ────────────────────────────────────────────────
  // Internal sub-component. Not exported.

  const MENU_GROUPS = ['edit', 'activity', 'view', 'insert'] as const
  type MenuGroup = typeof MENU_GROUPS[number]

  const MENU_LABELS: Record<MenuGroup, string> = {
    edit: 'Edit',
    activity: 'Activity',
    view: 'View',
    insert: 'Insert',
  }

  interface TripMenuBarProps {
    commands: Command[]
    onOpenPalette: () => void
  }

  function TripMenuBar({ commands, onOpenPalette: _ }: TripMenuBarProps) {
    const [openGroup, setOpenGroup] = useState<MenuGroup | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setOpenGroup(null)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    function toggleGroup(group: MenuGroup) {
      setOpenGroup((prev) => (prev === group ? null : group))
    }

    const hasAnyEnabled = (group: MenuGroup) =>
      commands.some((c) => c.group === group && c.isEnabled)

    return (
      <div ref={menuRef} className="flex items-center h-full px-1 border-r border-gray-200 dark:border-[#1e3a5f]/30">
        {MENU_GROUPS.map((group) => {
          const groupCommands = commands.filter((c) => c.group === group)
          const isOpen = openGroup === group
          const hasEnabled = hasAnyEnabled(group)

          return (
            <div key={group} className="relative h-full flex items-center">
              <button
                onClick={() => toggleGroup(group)}
                className={[
                  'px-3 h-full text-[13px] transition-colors rounded',
                  isOpen
                    ? 'bg-gray-100 dark:bg-[#1e3a5f]/30 text-gray-900 dark:text-[#f5efe8]'
                    : hasEnabled
                    ? 'text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20'
                    : 'text-gray-400 dark:text-[#4a7ab5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20',
                ].join(' ')}
              >
                {MENU_LABELS[group]}
              </button>

              {isOpen && (
                <div className="absolute top-[calc(100%+2px)] left-0 z-50 w-56 bg-white dark:bg-[#0f1a28] border border-gray-200 dark:border-[#1e3a5f]/40 rounded-xl shadow-xl py-1 overflow-hidden">
                  {groupCommands.map((cmd) => (
                    <button
                      key={cmd.id}
                      disabled={!cmd.isEnabled}
                      onClick={() => {
                        if (cmd.isEnabled) {
                          cmd.execute()
                          setOpenGroup(null)
                        }
                      }}
                      className={[
                        'w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors',
                        cmd.isEnabled
                          ? cmd.id === 'delete'
                            ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                            : 'text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20'
                          : 'text-gray-400 dark:text-[#484f58] cursor-default',
                      ].join(' ')}
                    >
                      <span>{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="text-[10px] text-gray-400 dark:text-[#484f58] bg-gray-100 dark:bg-[#0a1520] border border-gray-200 dark:border-[#1e3a5f]/30 px-1.5 py-0.5 rounded ml-4 shrink-0">
                          {cmd.shortcut.display}
                        </kbd>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ─── TripNavbar ─────────────────────────────────────────────────

  export interface TripNavbarProps {
    tripName: string
    dateRange: string
    commands: Command[]
    onOpenPalette: () => void
    viewMode: ViewMode
    onViewModeChange: (mode: ViewMode) => void
    onAddEvent: () => void
    onBack: () => void
    connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
    collaborators: UserAwareness[]
    onShare: () => void
    selectedActivity: CalendarActivity | null
    onDeselect: () => void
    theme: CalendarTheme
    onToggleTheme: () => void
    tripDays: { dayIndex: number; label: string }[]
  }

  function getInitials(name: string | undefined): string {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  export function TripNavbar({
    tripName,
    dateRange,
    commands,
    onOpenPalette,
    viewMode,
    onViewModeChange,
    onAddEvent,
    onBack,
    connectionStatus,
    collaborators,
    onShare,
    selectedActivity,
    onDeselect,
    theme,
    onToggleTheme,
    tripDays,
  }: TripNavbarProps) {
    const user = useAuthStore((s) => s.user)
    const signOut = useAuthStore((s) => s.signOut)
    const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false)
    const avatarRef = useRef<HTMLDivElement>(null)

    const avatarUrl = user?.user_metadata?.avatar_url
    const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name
    const email = user?.email
    const initials = getInitials(displayName)

    // Close avatar dropdown on outside click
    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
          setAvatarDropdownOpen(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSignOut = async () => {
      setAvatarDropdownOpen(false)
      await signOut()
    }

    const AvatarCircle = ({ size = 28 }: { size?: number }) => (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-full overflow-hidden bg-[#1e3a5f] text-white font-medium text-[11px]"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName || 'User'} className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </div>
    )

    return (
      <div className="flex flex-col shrink-0">
        {/* Connection status banner */}
        {connectionStatus !== 'connected' && (
          <div className="flex items-center justify-center gap-2 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400">
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
            {connectionStatus === 'reconnecting'
              ? 'Reconnecting to collaboration server…'
              : 'Disconnected — changes may not sync'}
          </div>
        )}

        {/* Main navbar row */}
        <div className="flex items-center h-11 border-b border-gray-200 dark:border-[#1e3a5f]/30 bg-white dark:bg-[#0f1a28] shrink-0">

          {/* Logo */}
          <Link
            href="/trips"
            className="flex items-center gap-1 px-3 h-full border-r border-gray-200 dark:border-[#1e3a5f]/30 text-[#1e3a5f] dark:text-[#f5efe8] shrink-0"
            style={{ fontFamily: 'var(--font-brand)', fontWeight: 800, fontSize: 13, letterSpacing: 2 }}
          >
            <span className="hidden sm:inline">TRAVYL</span>
            <PaperPlane size={18} />
          </Link>

          {/* Back button */}
          <button
            onClick={onBack}
            aria-label="Back to trips"
            className="flex items-center justify-center h-full w-10 border-r border-gray-200 dark:border-[#1e3a5f]/30 text-gray-400 dark:text-[#4a7ab5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 hover:text-gray-700 dark:hover:text-white transition-colors shrink-0"
          >
            <NavArrowLeft width={16} height={16} />
          </button>

          {/* Menu bar */}
          <TripMenuBar commands={commands} onOpenPalette={onOpenPalette} />

          {/* Trip info */}
          <div className="flex flex-col justify-center px-4 h-full border-r border-gray-200 dark:border-[#1e3a5f]/30 shrink-0 min-w-0">
            <span
              className="truncate text-[13px] text-[#1e3a5f] dark:text-[#f5efe8] leading-tight"
              style={{ fontFamily: 'var(--font-brand)' }}
            >
              {tripName}
            </span>
            <span className="text-[10px] text-[#4a7ab5] leading-tight">{dateRange}</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Selection indicator */}
          {selectedActivity && (
            <div className="flex items-center gap-2 px-3 h-full border-l border-gray-200 dark:border-[#1e3a5f]/30 shrink-0">
              <div className="w-2 h-2 rounded-sm bg-blue-500 shrink-0" />
              <span className="text-[12px] text-gray-700 dark:text-[#cdd9e5] truncate max-w-[140px]">
                {selectedActivity.title || 'Untitled'}
              </span>
              <button
                onClick={onDeselect}
                aria-label="Deselect activity"
                className="text-gray-400 dark:text-[#4a7ab5] hover:text-gray-600 dark:hover:text-white transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {/* Right controls */}
          <div className="flex items-center gap-2 px-3 h-full shrink-0">

            {/* View toggle */}
            <div
              role="group"
              aria-label="View mode"
              className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-[#1e3a5f]/30 text-sm shrink-0"
            >
              {(['week', 'day'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onViewModeChange(mode)}
                  aria-pressed={viewMode === mode}
                  className={[
                    'px-3 py-1.5 capitalize transition-colors text-xs',
                    viewMode === mode
                      ? 'bg-[#003594] text-white'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-[#4a7ab5] dark:hover:bg-[#1e3a5f]/25 dark:hover:text-white',
                  ].join(' ')}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* New Activity */}
            <button
              onClick={onAddEvent}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-[#1e3a5f]/30 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-[#4a7ab5] hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#1e3a5f]/25 dark:hover:text-white transition-colors shrink-0"
            >
              <Plus width={12} height={12} />
              <span className="hidden sm:inline">New Activity</span>
              <kbd className="text-[9px] text-gray-400 dark:text-[#484f58] bg-gray-100 dark:bg-[#0a1520] border border-gray-200 dark:border-[#1e3a5f]/30 px-1 rounded hidden sm:inline">
                N
              </kbd>
            </button>

            {/* Theme toggle */}
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />

            {/* Collaborator avatars */}
            {collaborators.length > 0 && (
              <div className="flex items-center shrink-0">
                {collaborators.map((collab, index) => {
                  const dayLabel = tripDays.find((d) => d.dayIndex === (collab.selectedDayIndex ?? 0))?.label ?? ''
                  const viewLabel = collab.currentView === 'day' ? 'Day view' : 'Week view'
                  return (
                    <div
                      key={collab.userId}
                      className="group relative flex items-center justify-center h-7 w-7 rounded-full text-[11px] font-semibold text-white select-none ring-2 ring-white dark:ring-[#0a1520]"
                      style={{
                        backgroundColor: collab.color,
                        opacity: collab.isOnline ? 1 : 0.45,
                        marginLeft: index === 0 ? 0 : '-8px',
                        zIndex: collaborators.length - index,
                      }}
                    >
                      {collab.avatarInitial}
                      <span
                        className={[
                          'absolute bottom-0 right-0 h-2 w-2 rounded-full ring-1 ring-white dark:ring-[#0a1520]',
                          collab.isOnline ? 'bg-green-500' : 'bg-gray-500',
                        ].join(' ')}
                      />
                      {/* Hover tooltip */}
                      <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-50 hidden group-hover:flex flex-col gap-0.5 bg-white dark:bg-[#0f1a28] border border-gray-200 dark:border-[#1e3a5f]/40 rounded-lg shadow-md px-2.5 py-2 min-w-[120px] whitespace-nowrap">
                        <span className="text-xs font-semibold text-gray-800 dark:text-[#f5efe8]">{collab.name}</span>
                        <span className="text-[10px] text-gray-400 dark:text-[#4a7ab5]">
                          {viewLabel}{dayLabel ? ` · ${dayLabel}` : ''}
                        </span>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-200 dark:border-t-[#1e3a5f]/40" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Share */}
            <button
              onClick={onShare}
              className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#D97706] transition-colors shrink-0"
            >
              <ShareAndroid width={12} height={12} />
              Share
            </button>

            {/* Avatar dropdown */}
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setAvatarDropdownOpen((o) => !o)}
                className="rounded-full hover:ring-2 hover:ring-[#1e3a5f]/20 transition-all"
              >
                <AvatarCircle />
              </button>

              {avatarDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#0f1a28] rounded-xl shadow-xl border border-gray-100 dark:border-[#1e3a5f]/30 py-1.5 z-50">
                  {/* User info */}
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-[#1e3a5f]/20">
                    <div className="flex items-center gap-2.5">
                      <AvatarCircle size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-[#f5efe8] truncate">
                          {displayName || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-[#4a7ab5] truncate">{email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="py-0.5">
                    <Link
                      href="/profile"
                      onClick={() => setAvatarDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 transition-colors"
                    >
                      <User width={15} height={15} className="text-gray-400" />
                      Your Profile
                    </Link>
                    <Link
                      href="/profile/settings"
                      onClick={() => setAvatarDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 transition-colors"
                    >
                      <Settings width={15} height={15} className="text-gray-400" />
                      Settings
                    </Link>
                  </div>
                  <div className="border-t border-gray-100 dark:border-[#1e3a5f]/20 py-1">
                    <button
                      onClick={onToggleTheme}
                      className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        {theme === 'dark'
                          ? <Moon width={15} height={15} className="text-gray-400" />
                          : <Sun width={15} height={15} className="text-gray-400" />}
                        {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                      </span>
                    </button>
                  </div>
                  <div className="border-t border-gray-100 dark:border-[#1e3a5f]/20 py-0.5">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                    >
                      <LogOut width={15} height={15} />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npm run typecheck
  ```
  Expected: no errors. If `PaperPlane` or `ThemeToggle` imports have issues, check their paths — they should be relative to `apps/web/components/calendar/`.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/web/components/calendar/TripNavbar.tsx
  git commit -m "feat: add TripNavbar with TripMenuBar sub-component"
  ```

---

## Chunk 4: CalendarDashboard Wiring

### Task 8: Wire everything into `CalendarDashboard`

**Files:**
- Modify: `apps/web/components/calendar/CalendarDashboard.tsx`

This is the integration task. Replace `CalendarHeader` with `TripNavbar`, add `isPaletteOpen` state, wire `useCalendarCommands`, `useKeyboardShortcuts`, and `CommandPalette`.

**Read the current `CalendarDashboard.tsx` carefully** before editing — it is 350+ lines. The changes are surgical:
1. Update imports
2. Destructure `duplicateActivity` from `useActivityMutations`
3. Add `isPaletteOpen` state
4. Add `useCalendarCommands` call
5. Add `useKeyboardShortcuts` call
6. Replace `<CalendarHeader>` with `<TripNavbar>`
7. Add `<CommandPalette>` before the closing tag
8. Update `handleBack` to navigate to `/trips`
9. Update `handleAddEvent` to call `handleCreateActivity`

- [ ] **Step 1: Update imports**

  Replace this block at the top of `CalendarDashboard.tsx`:
  ```tsx
  import { TripSidebar } from './TripSidebar'
  import { CalendarHeader } from './CalendarHeader'
  ```
  With:
  ```tsx
  import { useRouter } from 'next/navigation'
  import { TripSidebar } from './TripSidebar'
  import { TripNavbar } from './TripNavbar'
  import { CommandPalette } from './CommandPalette'
  import { useCalendarCommands } from './hooks/useCalendarCommands'
  import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
  ```

- [ ] **Step 2: Destructure `duplicateActivity` from `useActivityMutations`**

  Change line 66:
  ```tsx
  const { addActivity, updateActivity, moveActivity, removeActivity } = useActivityMutations(tripId, tripStartDate, userId)
  ```
  To:
  ```tsx
  const { addActivity, updateActivity, moveActivity, removeActivity, duplicateActivity } = useActivityMutations(tripId, tripStartDate, userId)
  ```

- [ ] **Step 3: Add `isPaletteOpen` state**

  After line 61 (`const [activeNav, setActiveNav] = useState('calendar')`), add:
  ```tsx
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)
  ```

- [ ] **Step 4: Add `useCalendarCommands` before the early returns**

  React hooks must be called unconditionally and before any early returns. In the current file:
  - Line 190: `const selectedActivity = useMemo(...)` — place AFTER this
  - Line 219: `if (isLoading) return <CalendarSkeleton />` — place BEFORE this

  Add between lines 218 and 219. Use `setViewMode` directly (not `handleViewModeChange`, which is defined after the early returns). Use `handleCreateActivity` for `onAddEvent` (it IS defined before the early returns as a `useCallback` at line 206):

  ```tsx
  const commands = useCalendarCommands({
    selectedActivity,
    isPaletteOpen,
    moveActivity,
    removeActivity,
    updateActivity,
    duplicateActivity,
    onViewModeChange: setViewMode,
    selectDay,
    tripDays: TRIP_DAYS,
    tripStartDate: parsedStartDate,
    onAddEvent: () => handleCreateActivity(selectedDayIndex ?? 0, 12),
    onOpenPalette: () => setIsPaletteOpen(true),
  })
  ```

  **Why `setViewMode` not `handleViewModeChange`:** `handleViewModeChange` is defined after the early returns (line 241) so it cannot be referenced here. `setViewMode` (from `useCalendarNavigation`) does the same thing.

- [ ] **Step 5: Add `useKeyboardShortcuts` immediately after `useCalendarCommands`**

  ```tsx
  useKeyboardShortcuts(
    commands,
    isPaletteOpen,
    () => setIsPaletteOpen(false),
    () => selectEvent(null),
  )
  ```

- [ ] **Step 6: Add `useRouter` and update `handleBack`**

  Add `const router = useRouter()` near the top of the component body, immediately after `const scrollRef = useRef<HTMLDivElement>(null)` (line 60):
  ```tsx
  const router = useRouter()
  ```

  Then replace:
  ```tsx
  const handleBack = () => {
    if (viewMode === 'day') {
      goToWeekView()
    }
    // In week view, back could navigate to trip overview -- no-op for now
  }
  ```
  With:
  ```tsx
  const handleBack = () => {
    router.push('/trips')
  }
  ```

- [ ] **Step 7: Update `handleAddEvent`**

  Replace:
  ```tsx
  const handleAddEvent = () => {
    // TODO: open add-event modal
  }
  ```
  With:
  ```tsx
  const handleAddEvent = () => {
    handleCreateActivity(selectedDayIndex ?? 0, 12)
  }
  ```

- [ ] **Step 8: Replace `<CalendarHeader>` with `<TripNavbar>`**

  Replace (lines 295–308):
  ```tsx
  {/* Header */}
  <CalendarHeader
    tripName={trip?.title ?? 'Loading...'}
    dateRange={viewMode === 'day' ? currentDayLabel : dateRange}
    viewMode={viewMode}
    onViewModeChange={handleViewModeChange}
    onBack={handleBack}
    onAddEvent={handleAddEvent}
    connectionStatus={connectionStatus}
    collaborators={collaborators}
    onShare={() => {}}
    theme={theme}
    onToggleTheme={toggleTheme}
    tripDays={TRIP_DAYS}
  />
  ```
  With:
  ```tsx
  {/* Navbar */}
  <TripNavbar
    tripName={trip?.title ?? 'Loading...'}
    dateRange={viewMode === 'day' ? currentDayLabel : dateRange}
    commands={commands}
    onOpenPalette={() => setIsPaletteOpen(true)}
    viewMode={viewMode}
    onViewModeChange={handleViewModeChange}
    onAddEvent={handleAddEvent}
    onBack={handleBack}
    connectionStatus={connectionStatus}
    collaborators={collaborators}
    onShare={() => {}}
    selectedActivity={selectedActivity}
    onDeselect={() => selectEvent(null)}
    theme={theme}
    onToggleTheme={toggleTheme}
    tripDays={TRIP_DAYS}
  />
  ```

- [ ] **Step 9: Add `<CommandPalette>` to the JSX**

  Inside `<div className="flex h-screen overflow-hidden bg-[var(--cal-bg)] text-[var(--cal-text)]">` (the innermost of the three wrapper divs at the start of the return), add as the last child just before its closing `</div>`:
  ```tsx
  <CommandPalette
    isOpen={isPaletteOpen}
    onClose={() => setIsPaletteOpen(false)}
    commands={commands}
  />
  ```

- [ ] **Step 10: Verify `CalendarHeader` import is gone**

  Step 1 replaced the import block, which should have removed `CalendarHeader`. Confirm it is no longer present:
  ```bash
  grep "CalendarHeader" apps/web/components/calendar/CalendarDashboard.tsx
  ```
  Expected: no output. If the import is still present, remove that line manually.

- [ ] **Step 11: Verify TypeScript compiles**

  ```bash
  npm run typecheck
  ```
  Fix any errors:
  - If `commands` is used before `TRIP_DAYS` is defined, move the `useCalendarCommands` call to after line 133 (`TRIP_DAYS` useMemo).
  - If `handleCreateActivity` is used before it's defined in `handleAddEvent`, extract it into a `useCallback` earlier in the component.

- [ ] **Step 12: Manual smoke test in browser**

  ```bash
  npm run web
  ```
  Navigate to a trip page (`/trip/<id>`). Verify:
  - [ ] The floating pill navbar is gone
  - [ ] TripNavbar is visible at the top with TRAVYL logo, back arrow, Edit/Activity/View/Insert menus, trip name, Week/Day toggle, Share, avatar
  - [ ] Clicking Edit menu opens dropdown with Undo/Redo grayed out, Delete/Duplicate active
  - [ ] Clicking Activity menu: all items grayed when nothing selected
  - [ ] Click an activity block → it gets selected (blue ring)
  - [ ] Activity menu items become active after selecting
  - [ ] Press `↑`/`↓` → activity moves 30 min up/down
  - [ ] Press `←`/`→` → activity moves to prev/next day
  - [ ] Press `Del` → activity is deleted, detail panel closes
  - [ ] Press `Ctrl+D` → activity is duplicated in same slot
  - [ ] Press `Ctrl+K` → command palette opens
  - [ ] Type in palette → commands filter by name
  - [ ] Press `Esc` → palette closes (if open), or activity deselects (if selected)
  - [ ] Press `W` or `D` → switches view mode
  - [ ] Back button navigates to `/trips`

- [ ] **Step 13: Commit**

  ```bash
  git add apps/web/components/calendar/CalendarDashboard.tsx
  git commit -m "feat: wire TripNavbar, CommandPalette, and keyboard commands into CalendarDashboard"
  ```

---

### Task 9: Final cleanup and lint

- [ ] **Step 1: Run lint**

  ```bash
  npm run lint
  ```
  Fix any warnings in the files touched by this feature.

- [ ] **Step 2: Run full typecheck**

  ```bash
  npm run typecheck
  ```
  Expected: clean.

- [ ] **Step 3: Verify `CalendarHeader.tsx` is still present (not deleted)**

  `CalendarHeader.tsx` is no longer imported by `CalendarDashboard` but keep the file — it may be used in tests or other pages. Do not delete it unless you confirm no other imports exist:
  ```bash
  # Check for other importers
  grep -r "CalendarHeader" apps/web/components apps/web/app
  ```
  If only used in `CalendarDashboard` (which now uses `TripNavbar`), it can be deleted. Otherwise keep it.

- [ ] **Step 4: Final commit**

  ```bash
  git add \
    apps/web/components/calendar/types.ts \
    apps/web/components/calendar/hooks/useActivityMutations.ts \
    apps/web/components/calendar/hooks/useCalendarCommands.ts \
    apps/web/components/calendar/hooks/useKeyboardShortcuts.ts \
    apps/web/components/calendar/TripNavbar.tsx \
    apps/web/components/calendar/CommandPalette.tsx \
    apps/web/components/calendar/CalendarDashboard.tsx \
    "apps/web/app/(trips-app)/"
  git commit -m "chore: lint cleanup for calendar keyboard commands feature"
  ```
