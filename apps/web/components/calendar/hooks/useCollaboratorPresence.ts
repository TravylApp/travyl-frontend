/**
 * useCollaboratorPresence — stub hook for the Yjs awareness protocol.
 *
 * TODO: Wire setSelectedEvent and setCurrentView to broadcast local awareness
 * state through the y-supabase provider once the backend is connected.
 */

import { useCallback } from 'react'
import type { UserAwareness, ViewMode } from '../types'

interface UseCollaboratorPresenceOptions {
  collaborators: UserAwareness[]
}

interface UseCollaboratorPresenceReturn {
  /** Broadcast the locally selected event to all collaborators. */
  setSelectedEvent: (eventId: string | null) => void
  /** Broadcast the current view mode to all collaborators. */
  setCurrentView: (view: ViewMode) => void
}

export function useCollaboratorPresence(
  _options: UseCollaboratorPresenceOptions,
): UseCollaboratorPresenceReturn {
  // TODO: obtain awareness instance from y-supabase provider context
  // and call awareness.setLocalStateField('selectedEventId', eventId) etc.

  const setSelectedEvent = useCallback((_eventId: string | null) => {
    // no-op stub — TODO: broadcast via y-supabase awareness
  }, [])

  const setCurrentView = useCallback((_view: ViewMode) => {
    // no-op stub — TODO: broadcast via y-supabase awareness
  }, [])

  return { setSelectedEvent, setCurrentView }
}
