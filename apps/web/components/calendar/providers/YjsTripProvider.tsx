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
    const provider = new SupabaseProvider(`trip:${tripId}`, doc, supabase, {
      awareness: true,
      persistence: {
        table: 'yjs_documents',
        roomColumn: 'room',
        stateColumn: 'state',
        storeTimeout: 1000,
      },
    })

    provider.on('status', (status) => {
      if (status === 'connected') setConnectionStatus('connected')
      else if (status === 'connecting') setConnectionStatus('reconnecting')
      else if (status === 'disconnected') setConnectionStatus('disconnected')
    })

    provider.on('error', (err) => {
      console.error('[YjsTripProvider]', err.message)
    })

    return () => {
      provider.destroy()
    }
  }, [tripId, doc])

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
