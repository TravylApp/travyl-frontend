import { useEffect, useRef, useCallback } from 'react'
import * as Y from 'yjs'
import { supabase } from '@travyl/shared'
import { useYjsTripContext } from '../providers/YjsTripProvider'
import { parseVotesFromYMap } from '@travyl/shared'

const FLUSH_DELAY_MS = 1000

export function usePollSync(tripId: string) {
  const { pollsMap } = useYjsTripContext()
  const dirtyIds = useRef(new Set<string>())
  const deletedIds = useRef(new Set<string>())
  const flushTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const flush = useCallback(async () => {
    const toUpsert = [...dirtyIds.current]
    const toDelete = [...deletedIds.current]
    dirtyIds.current.clear()
    deletedIds.current.clear()

    // Upsert dirty polls
    if (toUpsert.length > 0) {
      const rows = toUpsert
        .map((activityId) => {
          const yMap = pollsMap.get(activityId)
          if (!yMap) return null
          const entries = new Map<string, unknown>()
          yMap.forEach((v, k) => entries.set(k, v))
          return {
            trip_id: tripId,
            activity_id: activityId,
            started_by: (yMap.get('startedBy') as string) ?? '',
            votes: parseVotesFromYMap(entries),
            status: (yMap.get('status') as string) ?? 'active',
            result: (yMap.get('result') as string) || null,
            resolved_at:
              (yMap.get('status') as string) === 'resolved'
                ? new Date().toISOString()
                : null,
          }
        })
        .filter(Boolean) as any[]

      if (rows.length > 0) {
        // Use individual upserts since the unique index is partial (WHERE status = 'active')
        for (const row of rows) {
          const { error } = await supabase
            .from('activity_polls')
            .upsert(row, { onConflict: 'id' })
          if (error) console.error('[usePollSync] upsert error:', error.message)
        }
      }
    }

    // Delete removed polls
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('activity_polls')
        .delete()
        .eq('trip_id', tripId)
        .in('activity_id', toDelete)
      if (error) console.error('[usePollSync] delete error:', error.message)
    }
  }, [tripId, pollsMap])

  const scheduleFlush = useCallback(() => {
    clearTimeout(flushTimer.current)
    flushTimer.current = setTimeout(flush, FLUSH_DELAY_MS)
  }, [flush])

  // Observe pollsMap for dirty tracking
  useEffect(() => {
    const handler = (events: Y.YEvent<any>[]) => {
      for (const event of events) {
        // Y.Map event on pollsMap itself (add/delete poll entries)
        if (event.target === pollsMap) {
          for (const [key, { action }] of event.changes.keys) {
            if (action === 'delete') {
              deletedIds.current.add(key)
              dirtyIds.current.delete(key)
            } else {
              dirtyIds.current.add(key)
            }
          }
        } else if (event.target instanceof Y.Map) {
          // Nested Y.Map event (vote/status change within a poll)
          // The parent of the nested Y.Map is pollsMap — find the key
          pollsMap.forEach((yMap, activityId) => {
            if (yMap === event.target) {
              dirtyIds.current.add(activityId)
            }
          })
        }
      }
      scheduleFlush()
    }

    pollsMap.observeDeep(handler)
    return () => {
      pollsMap.unobserveDeep(handler)
      clearTimeout(flushTimer.current)
    }
  }, [pollsMap, scheduleFlush])

  // Tab-refocus reconciliation
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return

      const { data: serverPolls } = await supabase
        .from('activity_polls')
        .select('*')
        .eq('trip_id', tripId)

      if (!serverPolls) return

      const serverIds = new Set(serverPolls.map((p) => p.activity_id))

      // Collect polls to remove (don't mutate during forEach)
      const toRemove: string[] = []
      pollsMap.forEach((_yMap, activityId) => {
        if (!serverIds.has(activityId) && !dirtyIds.current.has(activityId)) {
          toRemove.push(activityId)
        }
      })
      for (const id of toRemove) pollsMap.delete(id)

      // Reconcile server polls into Yjs (server wins unless locally dirty)
      const doc = pollsMap.doc!
      doc.transact(() => {
        for (const row of serverPolls) {
          if (dirtyIds.current.has(row.activity_id)) continue

          let yMap = pollsMap.get(row.activity_id)
          if (!yMap) {
            yMap = new Y.Map<unknown>()
            pollsMap.set(row.activity_id, yMap as any)
          }
          yMap.set('activityId', row.activity_id)
          yMap.set('startedBy', row.started_by)
          yMap.set('startedAt', row.created_at)
          yMap.set('status', row.status)
          yMap.set('result', row.result ?? '')

          // Clear existing votes, re-apply from server
          const keysToDelete: string[] = []
          yMap.forEach((_v, k) => {
            if (k.startsWith('vote:')) keysToDelete.push(k)
          })
          for (const k of keysToDelete) yMap.delete(k)

          const votes = (row.votes ?? {}) as Record<string, string>
          for (const [userId, value] of Object.entries(votes)) {
            yMap.set(`vote:${userId}`, value)
          }
        }
      })
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [tripId, pollsMap])

  return null
}
