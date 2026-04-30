'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as Y from 'yjs'
import { SupabaseProvider } from '@supabase-labs/y-supabase'
import { supabase } from '@travyl/shared'
import { useAuthStore } from '@travyl/shared'

interface YjsTripContextValue {
  doc: Y.Doc
  activitiesMap: Y.Map<Y.Map<unknown>>
  pollsMap: Y.Map<Y.Map<unknown>>
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
}

const YjsTripContext = createContext<YjsTripContextValue | null>(null)

export function useYjsTripContext(): YjsTripContextValue {
  const ctx = useContext(YjsTripContext)
  if (!ctx)
    throw new Error('useYjsTripContext must be used within YjsTripProvider')
  return ctx
}

interface YjsTripProviderProps {
  tripId: string
  children: ReactNode
}

export function YjsTripProvider({ tripId, children }: YjsTripProviderProps) {
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'reconnecting' | 'disconnected'
  >('disconnected')

  const user = useAuthStore((s) => s.user)
  const session = useAuthStore((s) => s.session)

  const docRef = useRef<Y.Doc | null>(null)
  const docTripIdRef = useRef<string>('')
  if (docTripIdRef.current !== tripId) {
    docRef.current?.destroy()
    docRef.current = new Y.Doc()
    docTripIdRef.current = tripId
  }
  const doc = docRef.current!

  useEffect(() => {
    return () => { docRef.current?.destroy() }
  }, [])

  useEffect(() => {
    // Only connect when user is authenticated
    if (!user || !session) {
      console.log('[YjsTripProvider] No user/session, skipping connection')
      setConnectionStatus('disconnected')
      return
    }

    console.log('[YjsTripProvider] Initializing real-time sync for trip:', tripId, 'user:', user.id)
    let provider: SupabaseProvider | null = null
    let destroyed = false

    try {
      provider = new SupabaseProvider(`trip:${tripId}`, doc, supabase, {
        awareness: true,
        persistence: {
          table: 'yjs_documents',
          roomColumn: 'room',
          stateColumn: 'state',
          storeTimeout: 1000,
        },
      })

      provider.on('status', (status) => {
        if (destroyed) return
        console.log('[YjsTripProvider] Connection status:', status, 'for trip:', tripId)
        if (status === 'connected') setConnectionStatus('connected')
        else if (status === 'connecting') setConnectionStatus('reconnecting')
        else if (status === 'disconnected') setConnectionStatus('disconnected')
      })

      provider.on('error', (err) => {
        // Log once and destroy — prevents infinite reconnect loop when channel is unavailable
        console.error('[YjsTripProvider] Sync error for trip', tripId, ':', err)
        if (!destroyed && provider) {
          provider.destroy()
          provider = null
          setConnectionStatus('disconnected')
        }
        // Don't throw - allow app to function without real-time sync
      })

      // Log successful initialization
      console.log('[YjsTripProvider] Provider created successfully for trip:', tripId)
    } catch (err) {
      console.error('[YjsTripProvider] Failed to initialise for trip', tripId, ':', err)
      setConnectionStatus('disconnected')
    }

    return () => {
      console.log('[YjsTripProvider] Cleaning up provider for trip:', tripId)
      destroyed = true
      provider?.destroy()
    }
  }, [tripId, doc, user, session])

  const value = useMemo(
    () => ({
      doc,
      activitiesMap: doc.getMap('activities') as Y.Map<Y.Map<unknown>>,
      pollsMap: doc.getMap('polls') as Y.Map<Y.Map<unknown>>,
      connectionStatus,
    }),
    [doc, connectionStatus],
  )

  return (
    <YjsTripContext.Provider value={value}>
      {children}
    </YjsTripContext.Provider>
  )
}
