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
