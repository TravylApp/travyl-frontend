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
  const hasWarnedRef = useRef(false)

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
      setConnectionStatus('disconnected')
      return
    }

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
        if (status === 'connected') setConnectionStatus('connected')
        else if (status === 'connecting') setConnectionStatus('reconnecting')
        else if (status === 'disconnected') setConnectionStatus('disconnected')
      })

      provider.on('error', (err) => {
        // Realtime sync is optional; fall back to non-realtime mode without surfacing
        // a dev overlay for expected local/channel failures.
        if (!destroyed && provider) {
          provider.destroy()
          provider = null
          setConnectionStatus('disconnected')
        }
        if (!hasWarnedRef.current) {
          hasWarnedRef.current = true
          console.warn('[YjsTripProvider] Realtime sync unavailable; continuing without live sync for trip:', tripId)
        }
      })
    } catch (err) {
      setConnectionStatus('disconnected')
      if (!hasWarnedRef.current) {
        hasWarnedRef.current = true
        console.warn('[YjsTripProvider] Failed to initialize realtime sync; continuing without live sync for trip:', tripId)
      }
    }

    return () => {
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
