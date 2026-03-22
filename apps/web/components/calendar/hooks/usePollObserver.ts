import { useState, useEffect, useCallback, useRef } from 'react'
import { useYjsTripContext } from '../providers/YjsTripProvider'
import type { Poll } from '@travyl/shared'
import { parseVotesFromYMap, resolveVotes, isVoteKey } from '@travyl/shared'
import type * as Y from 'yjs'

const STALE_POLL_MS = 24 * 60 * 60 * 1000 // 24 hours
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

interface UsePollObserverOptions {
  editorCount: number // total editors including owner
  editorIds: string[] // all current editor user IDs (for pruning stale votes)
}

export function usePollObserver(options: UsePollObserverOptions) {
  const { editorCount, editorIds } = options
  const { pollsMap, activitiesMap } = useYjsTripContext()
  const [polls, setPolls] = useState<Map<string, Poll>>(new Map())
  const editorIdsRef = useRef(editorIds)
  editorIdsRef.current = editorIds

  // Convert a Y.Map poll entry to a Poll object
  const yMapToPoll = useCallback((yMap: Y.Map<unknown>): Poll => {
    const entries = new Map<string, unknown>()
    yMap.forEach((value, key) => {
      entries.set(key, value)
    })
    return {
      activityId: (yMap.get('activityId') as string) ?? '',
      startedBy: (yMap.get('startedBy') as string) ?? '',
      startedAt: (yMap.get('startedAt') as string) ?? '',
      status: (yMap.get('status') as Poll['status']) ?? 'active',
      result: (yMap.get('result') as Poll['result']) ?? '',
      votes: parseVotesFromYMap(entries),
    }
  }, [])

  // Check if a poll should auto-resolve
  const checkAutoResolve = useCallback(
    (activityId: string, yMap: Y.Map<unknown>) => {
      const status = yMap.get('status') as string
      if (status !== 'active') return

      const entries = new Map<string, unknown>()
      yMap.forEach((value, key) => entries.set(key, value))
      const votes = parseVotesFromYMap(entries)
      const voterCount = Object.keys(votes).length

      // Check stale expiration
      const startedAt = yMap.get('startedAt') as string
      const isStale = Date.now() - new Date(startedAt).getTime() > STALE_POLL_MS

      // Guard against resolving before editors are loaded
      if (editorCount === 0) return

      // Auto-resolve if all editors voted OR poll is stale
      if (voterCount >= editorCount || isStale) {
        const result = resolveVotes(votes)
        const doc = pollsMap.doc!
        doc.transact(() => {
          if (result === 'remove') {
            yMap.set('status', 'resolved')
            yMap.set('result', result)
            const activity = activitiesMap.get(activityId)
            if (activity) activity.set('pollResult', 'remove')
          } else {
            // "keep" — delete the poll immediately, no need to set status
            pollsMap.delete(activityId)
          }
        })
      }
    },
    [editorCount, pollsMap, activitiesMap],
  )

  // Prune votes from removed editors + orphaned polls
  const runCleanup = useCallback(() => {
    const editorSet = new Set(editorIdsRef.current)

    // Collect orphaned poll IDs first (don't mutate during forEach)
    const orphanIds: string[] = []
    const pollsToCheck: Array<[string, Y.Map<unknown>]> = []

    pollsMap.forEach((yMap, activityId) => {
      if (!activitiesMap.has(activityId)) {
        orphanIds.push(activityId)
      } else {
        pollsToCheck.push([activityId, yMap])
      }
    })

    // Delete orphans
    for (const id of orphanIds) pollsMap.delete(id)

    // Prune votes from removed editors
    for (const [activityId, yMap] of pollsToCheck) {
      const status = yMap.get('status') as string
      if (status !== 'active') continue

      const keysToDelete: string[] = []
      yMap.forEach((_value, key) => {
        if (isVoteKey(key)) {
          const voterId = key.slice(5) // 'vote:'.length
          if (!editorSet.has(voterId)) {
            keysToDelete.push(key)
          }
        }
      })
      if (keysToDelete.length > 0) {
        const doc = pollsMap.doc!
        doc.transact(() => {
          for (const key of keysToDelete) yMap.delete(key)
        })
      }

      // Re-check auto-resolve after pruning
      checkAutoResolve(activityId, yMap)
    }
  }, [pollsMap, activitiesMap, checkAutoResolve])

  // Rebuild polls state from pollsMap
  const rebuildPolls = useCallback(() => {
    const next = new Map<string, Poll>()
    pollsMap.forEach((yMap, activityId) => {
      next.set(activityId, yMapToPoll(yMap))
    })
    setPolls(next)
  }, [pollsMap, yMapToPoll])

  // Observe pollsMap changes
  useEffect(() => {
    const handler = () => {
      rebuildPolls()
      // Check auto-resolve for all active polls
      pollsMap.forEach((yMap, activityId) => {
        checkAutoResolve(activityId, yMap)
      })
    }

    pollsMap.observeDeep(handler)
    // Initial build
    rebuildPolls()

    return () => {
      pollsMap.unobserveDeep(handler)
    }
  }, [pollsMap, rebuildPolls, checkAutoResolve])

  // Periodic cleanup interval (stale polls, orphans, removed editors)
  useEffect(() => {
    runCleanup() // run on mount
    const interval = setInterval(runCleanup, CLEANUP_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [runCleanup])

  return { polls }
}
