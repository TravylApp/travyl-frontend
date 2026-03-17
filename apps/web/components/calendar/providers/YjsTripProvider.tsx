'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react'
import * as Y from 'yjs'
import SupabaseProvider from 'y-supabase'
import { supabase } from '@travyl/shared/services/supabase'

interface YjsTripContextValue {
  doc: Y.Doc
  activitiesMap: Y.Map<Y.Map<unknown>>
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
  const docRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<SupabaseProvider | null>(null)

  const { doc, activitiesMap } = useMemo(() => {
    if (providerRef.current) providerRef.current.destroy()
    if (docRef.current) docRef.current.destroy()

    const newDoc = new Y.Doc()
    const newProvider = new SupabaseProvider(newDoc, supabase as any, {
      channel: `trip:${tripId}`,
      tableName: 'yjs_documents',
      columnName: 'content',
      id: tripId,
    })

    docRef.current = newDoc
    providerRef.current = newProvider

    return {
      doc: newDoc,
      activitiesMap: newDoc.getMap('activities') as Y.Map<Y.Map<unknown>>,
    }
  }, [tripId])

  useEffect(() => {
    return () => {
      providerRef.current?.destroy()
      docRef.current?.destroy()
    }
  }, [tripId])

  // y-supabase alpha does not expose connection status events.
  // Hardcoded as known limitation.
  const connectionStatus: 'connected' | 'reconnecting' | 'disconnected' =
    'connected'

  const value = useMemo(
    () => ({ doc, activitiesMap, connectionStatus }),
    [doc, activitiesMap, connectionStatus],
  )

  return (
    <YjsTripContext.Provider value={value}>
      {children}
    </YjsTripContext.Provider>
  )
}
