'use client'

import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { updateTripDetails, detectOperation, getConflictingActivities, computeNewTotalDays, supabase } from '@travyl/shared'
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

  const logTripEdit = useCallback(async (oldData: any, newData: any) => {
    await supabase.from('itinerary_edits').insert({
      trip_id: tripId,
      activity_id: null,
      edit_type: 'edit',
      original_data: oldData,
      new_data: newData,
      user_id: userId,
    })
  }, [tripId, userId])

  // Direct execute — no conflict modal, called from rescope() when no conflicts found
  const executeDirectly = useCallback(
    async (patch: RescopePatch, oldStartDate: Date, oldEndDate: Date, oldDestination: string) => {
      setStatus('loading')
      try {
        const tripUpdate: Partial<Pick<Trip, 'destination' | 'start_date' | 'end_date'>> = {
          start_date: patch.startDate.toISOString().slice(0, 10),
          end_date: patch.endDate.toISOString().slice(0, 10),
        }
        if (patch.destination !== undefined) tripUpdate.destination = patch.destination

        await updateTripDetails(tripId, tripUpdate)
        await logTripEdit(
          { start_date: oldStartDate.toISOString().slice(0, 10), end_date: oldEndDate.toISOString().slice(0, 10), destination: oldDestination },
          tripUpdate
        )

        await queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
        setStatus('idle')
        setPendingPatch(null)
      } catch {
        setStatus('error')
      }
    },
    [tripId, queryClient, logTripEdit],
  )

  const rescope = useCallback(
    (patch: RescopePatch, oldStartDate: Date, oldEndDate: Date, oldDestination: string) => {
      const op = detectOperation(oldStartDate, oldEndDate, patch.startDate, patch.endDate)

      if (op === 'shrink') {
        const newTotalDays = computeNewTotalDays(patch.startDate, patch.endDate)
        const found = getConflictingActivities(scheduledActivities, newTotalDays)
        if (found.length > 0) {
          setConflicts(found)
          setPendingPatch(patch)
          setStatus('pending-conflict')
          // We'll need the old dates/destination for logging in confirmRescope too
          return
        }
      }

      void executeDirectly(patch, oldStartDate, oldEndDate, oldDestination)
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

        // We don't have oldData easily accessible here without more props or state,
        // but for now we'll just log the update itself.
        await updateTripDetails(tripId, tripUpdate)
        await logTripEdit({}, tripUpdate)

        await queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
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
    [tripId, queryClient, updateActivity, pendingPatch, conflicts, logTripEdit],
  )

  const cancelRescope = useCallback(() => {
    setStatus('idle')
    setConflicts([])
    setPendingPatch(null)
  }, [])

  return { status, conflicts, rescope, confirmRescope, cancelRescope }
}
