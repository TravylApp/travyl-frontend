'use client'

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { updateTripDetails, detectOperation, getConflictingActivities, computeNewTotalDays } from '@travyl/shared'
import type { Trip } from '@travyl/shared'
import type { CalendarActivity } from '../types'
import { useActivityMutations } from './useActivityMutations'

export interface RescopePatch {
  destination?: string
  startDate: Date
  endDate: Date
}

export type ConflictResolution = 'moveToLastDay' | 'unscheduled'
export type RescoperStatus = 'idle' | 'pending-conflict' | 'loading' | 'error'

export interface UseRescopeReturn {
  status: RescoperStatus
  conflicts: CalendarActivity[]
  // oldStartDate / oldEndDate tell the hook how to classify the change
  rescope: (patch: RescopePatch, oldStartDate: Date, oldEndDate: Date) => void
  confirmRescope: (resolution: ConflictResolution) => Promise<void>
  cancelRescope: () => void
}

/**
 * tripStartDate — ISO date string from the trip record (e.g. "2026-06-12").
 *   Passed to useActivityMutations so it can compute absolute dates for Yjs flush.
 * userId — required by useActivityMutations to stamp mutations.
 * scheduledActivities — activities where !a.unscheduled (filtered by CalendarDashboard).
 */
export function useRescope(
  tripId: string,
  tripStartDate: string,
  userId: string,
  scheduledActivities: CalendarActivity[],
): UseRescopeReturn {
  const queryClient = useQueryClient()
  const { updateActivity } = useActivityMutations(tripId, tripStartDate, userId)

  const [status, setStatus] = useState<RescoperStatus>('idle')
  const [conflicts, setConflicts] = useState<CalendarActivity[]>([])
  const [pendingPatch, setPendingPatch] = useState<RescopePatch | null>(null)

  // Direct execute — no conflict modal, called from rescope() when no conflicts found
  const executeDirectly = useCallback(
    async (patch: RescopePatch) => {
      setStatus('loading')
      try {
        const tripUpdate: Partial<Pick<Trip, 'destination' | 'start_date' | 'end_date'>> = {
          start_date: patch.startDate.toISOString().slice(0, 10),
          end_date: patch.endDate.toISOString().slice(0, 10),
        }
        if (patch.destination !== undefined) tripUpdate.destination = patch.destination
        await updateTripDetails(tripId, tripUpdate)
        await queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
        setStatus('idle')
        setPendingPatch(null)
      } catch {
        setStatus('error')
      }
    },
    [tripId, queryClient],
  )

  const rescope = useCallback(
    (patch: RescopePatch, oldStartDate: Date, oldEndDate: Date) => {
      const op = detectOperation(oldStartDate, oldEndDate, patch.startDate, patch.endDate)

      if (op === 'shrink') {
        const newTotalDays = computeNewTotalDays(patch.startDate, patch.endDate)
        const found = getConflictingActivities(scheduledActivities, newTotalDays)
        if (found.length > 0) {
          setConflicts(found)
          setPendingPatch(patch)
          setStatus('pending-conflict')
          return
        }
      }

      void executeDirectly(patch)
    },
    [scheduledActivities, executeDirectly],
  )

  // confirmRescope lists pendingPatch and conflicts as deps — React recreates this
  // callback after the state update in rescope(), so it always has fresh values.
  const confirmRescope = useCallback(
    async (resolution: ConflictResolution) => {
      if (!pendingPatch) return
      setStatus('loading')
      try {
        const tripUpdate: Partial<Pick<Trip, 'destination' | 'start_date' | 'end_date'>> = {
          start_date: pendingPatch.startDate.toISOString().slice(0, 10),
          end_date: pendingPatch.endDate.toISOString().slice(0, 10),
        }
        if (pendingPatch.destination !== undefined) {
          tripUpdate.destination = pendingPatch.destination
        }
        // 1. Write trip first
        await updateTripDetails(tripId, tripUpdate)
        // 2. Invalidate trip query — CalendarDashboard will re-render with updated dates
        //    after the current execution completes. The activity mutations below use the
        //    tripStartDate captured when useRescope mounted; since the popover was open
        //    before the trip write, this value correctly reflects the old start date.
        await queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
        // 3. Write activity mutations immediately after the trip date is committed
        const newTotalDays = computeNewTotalDays(pendingPatch.startDate, pendingPatch.endDate)
        for (const act of conflicts) {
          if (resolution === 'moveToLastDay') {
            updateActivity(act.id, { day: newTotalDays - 1, endDay: newTotalDays - 1 })
          } else {
            updateActivity(act.id, { unscheduled: true })
          }
        }
        setStatus('idle')
        setConflicts([])
        setPendingPatch(null)
      } catch {
        setStatus('error')
      }
    },
    [tripId, queryClient, updateActivity, pendingPatch, conflicts],
  )

  const cancelRescope = useCallback(() => {
    setStatus('idle')
    setConflicts([])
    setPendingPatch(null)
  }, [])

  return { status, conflicts, rescope, confirmRescope, cancelRescope }
}
