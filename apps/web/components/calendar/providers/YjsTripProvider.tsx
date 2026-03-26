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

  // One Y.Doc per tripId, created synchronously during render so it is
  // immediately available to context consumers without waiting for an effect.
  // Replacing docRef here (not in an effect) means consumers always see the
  // correct doc on the very first render — no second doc swapped in later.
  const docRef = useRef<Y.Doc | null>(null)
  const docTripIdRef = useRef<string>('')
  if (docTripIdRef.current !== tripId) {
    docRef.current?.destroy()
    docRef.current = new Y.Doc()
    docTripIdRef.current = tripId
  }
  const doc = docRef.current!

  // Destroy the doc when the component unmounts (tripId-change destroys happen in render body above)
  useEffect(() => {
    return () => { docRef.current?.destroy() }
  }, [])

  useEffect(() => {
    let isMounted = true

    // Load persisted Yjs state from Supabase
    supabase
      .from('yjs_documents')
      .select('content')
      .eq('id', tripId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.content && isMounted) {
          Y.applyUpdate(doc, new Uint8Array(data.content as number[]), 'hydration')
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
      if (origin === 'remote' || origin === 'hydration') return

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
