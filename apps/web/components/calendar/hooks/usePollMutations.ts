import { useCallback } from 'react'
import * as Y from 'yjs'
import { useYjsTripContext } from '../providers/YjsTripProvider'
import { resolveVotes, parseVotesFromYMap } from '@travyl/shared'

interface UsePollMutationsReturn {
  startPoll: (activityId: string, userId: string) => void
  vote: (activityId: string, userId: string, value: 'yes' | 'no') => void
  closePoll: (activityId: string) => void
  restoreActivity: (activityId: string) => void
}

export function usePollMutations(): UsePollMutationsReturn {
  const { pollsMap, activitiesMap } = useYjsTripContext()

  const startPoll = useCallback(
    (activityId: string, userId: string) => {
      const doc = pollsMap.doc!
      doc.transact(() => {
        // Delete any existing resolved poll for this activity
        if (pollsMap.has(activityId)) {
          pollsMap.delete(activityId)
        }
        const yMap = new Y.Map<unknown>()
        yMap.set('activityId', activityId)
        yMap.set('startedBy', userId)
        yMap.set('startedAt', new Date().toISOString())
        yMap.set('status', 'active')
        yMap.set('result', '')
        pollsMap.set(activityId, yMap as any)
      })
    },
    [pollsMap],
  )

  const vote = useCallback(
    (activityId: string, userId: string, value: 'yes' | 'no') => {
      const poll = pollsMap.get(activityId)
      if (!poll) return
      const status = poll.get('status') as string
      if (status !== 'active') return

      const voteKey = `vote:${userId}`
      const currentVote = poll.get(voteKey) as string | undefined

      // Toggle off if voting the same way
      if (currentVote === value) {
        poll.delete(voteKey)
      } else {
        poll.set(voteKey, value)
      }
    },
    [pollsMap],
  )

  const closePoll = useCallback(
    (activityId: string) => {
      const poll = pollsMap.get(activityId)
      if (!poll) return

      const entries = new Map<string, unknown>()
      poll.forEach((v, k) => entries.set(k, v))
      const votes = parseVotesFromYMap(entries)
      const hasVotes = Object.keys(votes).length > 0

      if (!hasVotes) {
        // No votes — cancel the poll
        pollsMap.delete(activityId)
        return
      }

      const result = resolveVotes(votes)
      const doc = pollsMap.doc!
      doc.transact(() => {
        if (result === 'remove') {
          poll.set('status', 'resolved')
          poll.set('result', result)
          const activity = activitiesMap.get(activityId)
          if (activity) {
            activity.set('pollResult', 'remove')
          }
        } else {
          // "keep" — delete poll immediately (spec requirement)
          pollsMap.delete(activityId)
        }
      })
    },
    [pollsMap, activitiesMap],
  )

  const restoreActivity = useCallback(
    (activityId: string) => {
      const doc = pollsMap.doc!
      doc.transact(() => {
        // Clear pollResult from activity
        const activity = activitiesMap.get(activityId)
        if (activity) {
          activity.delete('pollResult')
        }
        // Delete the poll
        pollsMap.delete(activityId)
      })
    },
    [pollsMap, activitiesMap],
  )

  return { startPoll, vote, closePoll, restoreActivity }
}
