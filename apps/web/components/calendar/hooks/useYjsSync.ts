/**
 * useYjsSync — stub hook with a y-supabase-compatible interface.
 *
 * TODO: Replace local useState with a real Yjs Doc + y-supabase provider
 * once the backend is wired. The public API surface is intentionally
 * identical to what the real implementation will expose so that
 * CalendarDashboard needs zero changes at that point.
 */

import { useState, useCallback } from 'react'
import {
  MOCK_CALENDAR_ACTIVITIES,
  MOCK_COLLABORATORS,
} from '@travyl/shared/config/mockItineraryData'
import type { CalendarActivity, UserAwareness } from '../types'

type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected'

interface UseYjsSyncReturn {
  activities: CalendarActivity[]
  collaborators: UserAwareness[]
  connectionStatus: ConnectionStatus
  isLoading: boolean
  error: string | null
  addActivity: (activity: CalendarActivity) => void
  updateActivity: (id: string, patch: Partial<CalendarActivity>) => void
  moveActivity: (id: string, newDay: number, newStartHour: number) => void
  removeActivity: (id: string) => void
}

export function useYjsSync(): UseYjsSyncReturn {
  // TODO: replace with Yjs Y.Array synced via y-supabase
  const [activities, setActivities] = useState<CalendarActivity[]>(
    MOCK_CALENDAR_ACTIVITIES,
  )

  // TODO: replace with Yjs awareness state synced via y-supabase
  const [collaborators] = useState<UserAwareness[]>(MOCK_COLLABORATORS)

  // Stub: always "connected" since we're using local state
  // TODO: derive from y-supabase provider status
  const connectionStatus: ConnectionStatus = 'connected'

  const updateActivity = useCallback(
    (id: string, patch: Partial<CalendarActivity>) => {
      setActivities((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      )
    },
    [],
  )

  const moveActivity = useCallback(
    (id: string, newDay: number, newStartHour: number) => {
      setActivities((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, day: newDay, startHour: newStartHour } : a,
        ),
      )
    },
    [],
  )

  const addActivity = useCallback((activity: CalendarActivity) => {
    setActivities((prev) => [...prev, activity])
  }, [])

  const removeActivity = useCallback((id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id))
  }, [])

  // Stub: always false/null since we're using local state
  // TODO: derive from y-supabase provider loading/error state
  const isLoading = false
  const error: string | null = null

  return {
    activities,
    collaborators,
    connectionStatus,
    isLoading,
    error,
    addActivity,
    updateActivity,
    moveActivity,
    removeActivity,
  }
}
