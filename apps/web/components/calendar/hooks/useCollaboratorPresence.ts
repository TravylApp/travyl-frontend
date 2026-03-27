/**
 * useCollaboratorPresence — Supabase Realtime presence for trip collaboration.
 *
 * Subscribes to a presence channel scoped to the trip, tracks the local user's
 * selected event and current view, and returns a list of all connected users.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@travyl/shared'
import type { UserAwareness, ViewMode } from '../types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseCollaboratorPresenceOptions {
  tripId: string
  userId: string
  userName: string
  userColor?: string
  /** When true, skip the presence channel entirely (e.g. share page viewers) */
  disabled?: boolean
}

interface UseCollaboratorPresenceReturn {
  collaborators: UserAwareness[]
  /** Broadcast the locally selected event to all collaborators. */
  setSelectedEvent: (eventId: string | null) => void
  /** Broadcast the current view mode to all collaborators. */
  setCurrentView: (view: ViewMode) => void
  /** Broadcast the currently focused day index to all collaborators. */
  setSelectedDay: (dayIndex: number) => void
}

/** Default palette for collaborator cursors. */
const DEFAULT_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
]

function pickColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0
  }
  return DEFAULT_COLORS[Math.abs(hash) % DEFAULT_COLORS.length]
}

export function useCollaboratorPresence(
  options: UseCollaboratorPresenceOptions,
): UseCollaboratorPresenceReturn {
  const { tripId, userId, userName, userColor, disabled } = options
  const [collaborators, setCollaborators] = useState<UserAwareness[]>([])

  const channelRef = useRef<RealtimeChannel | null>(null)
  // Stable per-tab ID — unique even when the same user has multiple windows open
  const tabIdRef = useRef<string>(crypto.randomUUID())
  const localStateRef = useRef({
    selectedEventId: null as string | null,
    currentView: 'week' as ViewMode,
    selectedDayIndex: 0,
  })

  const color = userColor ?? pickColor(userId)

  useEffect(() => {
    if (disabled) return

    const tabId = tabIdRef.current
    const channel = supabase!.channel(`presence:trip:${tripId}`, {
      config: { presence: { key: tabId } },
    })

    channelRef.current = channel

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{
        userId: string
        userName: string
        color: string
        selectedEventId: string | null
        currentView: ViewMode
        selectedDayIndex?: number
      }>()

      const users: UserAwareness[] = []
      for (const key of Object.keys(state)) {
        const entries = state[key]
        if (!entries || entries.length === 0) continue
        const entry = entries[entries.length - 1]
        if (key === tabId) continue
        users.push({
          userId: entry.userId,
          name: entry.userName,
          avatarInitial: (entry.userName ?? '?').charAt(0).toUpperCase(),
          color: entry.color,
          isOnline: true,
          selectedEventId: entry.selectedEventId ?? null,
          currentView: entry.currentView ?? 'week',
          selectedDayIndex: entry.selectedDayIndex ?? 0,
        })
      }
      setCollaborators(users)
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId,
          userName,
          color,
          selectedEventId: localStateRef.current.selectedEventId,
          currentView: localStateRef.current.currentView,
          selectedDayIndex: localStateRef.current.selectedDayIndex,
        })
      }
    })

    return () => {
      channelRef.current = null
      channel.unsubscribe()
    }
  }, [tripId, userId, userName, color, disabled])

  const setSelectedEvent = useCallback(
    (eventId: string | null) => {
      localStateRef.current.selectedEventId = eventId
      channelRef.current?.track({
        userId,
        userName,
        color,
        selectedEventId: eventId,
        currentView: localStateRef.current.currentView,
        selectedDayIndex: localStateRef.current.selectedDayIndex,
      })
    },
    [userId, userName, color],
  )

  const setCurrentView = useCallback(
    (view: ViewMode) => {
      localStateRef.current.currentView = view
      channelRef.current?.track({
        userId,
        userName,
        color,
        selectedEventId: localStateRef.current.selectedEventId,
        currentView: view,
        selectedDayIndex: localStateRef.current.selectedDayIndex,
      })
    },
    [userId, userName, color],
  )

  const setSelectedDay = useCallback(
    (dayIndex: number) => {
      localStateRef.current.selectedDayIndex = dayIndex
      channelRef.current?.track({
        userId,
        userName,
        color,
        selectedEventId: localStateRef.current.selectedEventId,
        currentView: localStateRef.current.currentView,
        selectedDayIndex: dayIndex,
      })
    },
    [userId, userName, color],
  )

  return { collaborators, setSelectedEvent, setCurrentView, setSelectedDay }
}
