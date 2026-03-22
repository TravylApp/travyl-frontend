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
import { supabase } from '@travyl/shared'

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
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'reconnecting' | 'disconnected'
  >('disconnected')

  // Create/recreate doc when tripId changes
  if (!docRef.current) {
    docRef.current = new Y.Doc()
  }

  useEffect(() => {
    const doc = new Y.Doc()
    docRef.current = doc
    let isMounted = true

    // Load persisted state from Supabase (maybeSingle: no row = new trip, not an error)
    supabase
      .from('yjs_documents')
      .select('content')
      .eq('id', tripId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.content && isMounted) {
          Y.applyUpdate(doc, new Uint8Array(data.content as number[]))
        }
      })

    // Subscribe to realtime updates from other clients
    const channel = supabase.channel(`trip:${tripId}`)

    channel
      .on('broadcast', { event: 'yjs-update' }, ({ payload }) => {
        if (payload?.update) {
          Y.applyUpdate(doc, new Uint8Array(payload.update as number[]), 'remote')
        }
      })
      .subscribe((status) => {
        if (!isMounted) return
        if (status === 'SUBSCRIBED') setConnectionStatus('connected')
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')
          setConnectionStatus('reconnecting')
        else if (status === 'CLOSED') setConnectionStatus('disconnected')
      })

    // Broadcast local updates + debounced persist
    let persistTimeout: ReturnType<typeof setTimeout>
    const onUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote') return

      channel.send({
        type: 'broadcast',
        event: 'yjs-update',
        payload: { update: Array.from(update) },
      })

      clearTimeout(persistTimeout)
      persistTimeout = setTimeout(() => {
        const state = Y.encodeStateAsUpdate(doc)
        supabase
          .from('yjs_documents')
          .upsert({ id: tripId, content: Array.from(state) })
      }, 1000)
    }

    doc.on('update', onUpdate)

    return () => {
      isMounted = false
      clearTimeout(persistTimeout)
      doc.off('update', onUpdate)
      channel.unsubscribe()
      doc.destroy()
    }
  }, [tripId])

  const value = useMemo(
    () => ({
      doc: docRef.current!,
      activitiesMap: docRef.current!.getMap('activities') as Y.Map<Y.Map<unknown>>,
      connectionStatus,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tripId, connectionStatus],
  )

  return (
    <YjsTripContext.Provider value={value}>
      {children}
    </YjsTripContext.Provider>
  )
}
