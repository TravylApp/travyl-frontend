import { useState, useEffect, useRef, useCallback } from 'react'
import * as Y from 'yjs'
import { supabase, toActivityRow, toCalendarActivity, type ActivityRow } from '@travyl/shared'
import type { CalendarActivity } from '../types'
import { useYjsTripContext } from '../providers/YjsTripProvider'
import { yMapToCalendarActivity, CALENDAR_ACTIVITY_KEYS } from './yMapToCalendarActivity'

type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected'

interface UseYjsSyncReturn {
  activities: CalendarActivity[]
  connectionStatus: ConnectionStatus
  isLoading: boolean
  error: string | null
}

// ─── Helpers ────────────────────────────────────────────────

function readAllActivities(
  activitiesMap: Y.Map<Y.Map<unknown>>,
): CalendarActivity[] {
  const result: CalendarActivity[] = []
  activitiesMap.forEach((yMap, id) => {
    result.push(yMapToCalendarActivity(id, yMap))
  })
  return result
}

// ─── Hook ───────────────────────────────────────────────────

const FLUSH_DELAY_MS = 1000

export function useYjsSync(
  tripId: string,
  tripStartDate: string,
  userId: string,
  readOnly = false,
): UseYjsSyncReturn {
  const { activitiesMap, connectionStatus } = useYjsTripContext()
  const [activities, setActivities] = useState<CalendarActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const dirtyRef = useRef<Set<string>>(new Set())
  const beforeSnapshotRef = useRef<Map<string, Partial<CalendarActivity>>>(new Map())
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Stable refs for values used in callbacks
  const tripIdRef = useRef(tripId)
  const tripStartDateRef = useRef(tripStartDate)
  const userIdRef = useRef(userId)
  useEffect(() => {
    tripIdRef.current = tripId
    tripStartDateRef.current = tripStartDate
    userIdRef.current = userId
  }, [tripId, tripStartDate, userId])

  // ── Debounced flush ──────────────────────────────────────
  const flush = useCallback(async () => {
    if (readOnly) return
    const ids = Array.from(dirtyRef.current)
    if (ids.length === 0) return
    dirtyRef.current.clear()

    const rows: ReturnType<typeof toActivityRow>[] = []
    for (const id of ids) {
      const yMap = activitiesMap.get(id)
      if (!yMap) continue
      const cal = yMapToCalendarActivity(id, yMap)
      rows.push(
        toActivityRow(
          cal,
          tripIdRef.current,
          userIdRef.current,
          tripStartDateRef.current,
        ),
      )
    }

    if (rows.length === 0) return

    const { error: upsertError } = await supabase
      .from('activity')
      .upsert(rows as any)

    if (upsertError) {
      console.error('[useYjsSync] flush upsert error:', upsertError.message)
      setError(upsertError.message)
    } else {
      // Write audit rows for each flushed activity
      const isMoveFields = ['day', 'endDay', 'startHour']
      const auditRows = ids
        .map((id) => {
          const yMap = activitiesMap.get(id)
          if (!yMap) return null
          const after = yMapToCalendarActivity(id, yMap)
          const before = beforeSnapshotRef.current.get(id) ?? {}
          beforeSnapshotRef.current.delete(id)

          const changedKeys = Object.keys(before)
          if (changedKeys.length === 0) return null  // No before-state captured (e.g. new activity — handled by useActivityMutations)

          const isMove = changedKeys.some((k) => isMoveFields.includes(k))

          return {
            trip_id: tripIdRef.current,
            activity_id: id,
            edit_type: isMove ? 'move' : 'edit',
            original_data: before,
            new_data: isMove
              ? { day: after.day, endDay: after.endDay, startHour: after.startHour }
              : after,
            user_id: userIdRef.current,
          }
        })
        .filter(Boolean)

      if (auditRows.length > 0) {
        supabase.from('itinerary_edits').insert(auditRows).then(({ error }) => {
          if (error) console.warn('[useYjsSync] audit insert error:', error.message)
        })
      }
    }
  }, [activitiesMap])

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    flushTimerRef.current = setTimeout(() => {
      flush()
    }, FLUSH_DELAY_MS)
  }, [flush])

  // ── Observe Y.Map deep changes ───────────────────────────
  useEffect(() => {
    // Initial read — only update if the map has data to avoid clearing the screen
    // while a fresh Y.Doc (MapB) is being re-hydrated from the DB.
    const initial = readAllActivities(activitiesMap)
    if (initial.length > 0) {
      setActivities(initial)
    }
    setIsLoading(false)

    const observer = (
      events: Y.YEvent<any>[],
      transaction: Y.Transaction,
    ) => {
      // Only flush local changes. Remote updates (from broadcast) and hydration
      // transactions (initial DB load) must not be re-persisted here.
      const isRemote = transaction.origin === 'remote' || transaction.origin === 'hydration'

      if (!isRemote) {
        for (const event of events) {
          if (event.target === activitiesMap) {
            // Top-level add/delete on the activities map
            if (event instanceof Y.YMapEvent) {
              for (const key of event.keysChanged) {
                dirtyRef.current.add(key)
              }
            }
          } else if (event.target instanceof Y.Map) {
            // Nested Y.Map field edit — find parent key
            const parentMap = event.target
            activitiesMap.forEach((yMap, key) => {
              if (yMap === parentMap) {
                dirtyRef.current.add(key)
              }
            })
          }
        }
        // Capture before-state from Yjs change events (first-write-wins per flush window)
        for (const event of events) {
          if (event.target instanceof Y.Map && event instanceof Y.YMapEvent) {
            activitiesMap.forEach((yMap, key) => {
              if (yMap === event.target) {
                if (!beforeSnapshotRef.current.has(key)) {
                  const before: Record<string, unknown> = {}
                  event.changes.keys.forEach(({ oldValue }, field) => {
                    before[field] = oldValue
                  })
                  beforeSnapshotRef.current.set(key, before as Partial<CalendarActivity>)
                }
              }
            })
          }
        }
        scheduleFlush()
      }

      setActivities(readAllActivities(activitiesMap))
    }

    activitiesMap.observeDeep(observer)

    return () => {
      activitiesMap.unobserveDeep(observer)
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current)
        // Flush remaining dirty entries synchronously on unmount
        flush()
      }
    }
  }, [activitiesMap, scheduleFlush, flush])

  // ── Tab refocus reconciliation ───────────────────────────
  useEffect(() => {
    if (readOnly) return
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return

      const { data, error: fetchError } = await supabase
        .from('activity')
        .select('*')
        .eq('trip_id', tripIdRef.current)

      if (fetchError) {
        console.error(
          '[useYjsSync] refocus fetch error:',
          fetchError.message,
        )
        return
      }

      if (!data) return

      const dirtyIds = dirtyRef.current
      const rows = data as ActivityRow[]

      activitiesMap.doc?.transact(() => {
        for (const row of rows) {
          // Skip entries that have pending local changes
          if (dirtyIds.has(row.id)) continue

          const cal = toCalendarActivity(row, tripStartDateRef.current)
          let yMap = activitiesMap.get(cal.id)
          if (!yMap) {
            yMap = new Y.Map<unknown>()
            activitiesMap.set(cal.id, yMap)
          }
          for (const key of CALENDAR_ACTIVITY_KEYS) {
            const val = (cal as any)[key]
            if (val !== undefined) yMap.set(key, val)
          }
        }

        // Remove activities deleted by other users
        const serverIds = new Set(rows.map((r) => r.id))
        activitiesMap.forEach((_yMap, key) => {
          if (!serverIds.has(key) && !dirtyIds.has(key)) {
            activitiesMap.delete(key)
          }
        })
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [activitiesMap])

  return { activities, connectionStatus, isLoading, error }
}
