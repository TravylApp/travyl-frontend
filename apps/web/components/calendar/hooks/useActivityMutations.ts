import { useCallback } from 'react'
import * as Y from 'yjs'
import { supabase, toActivityRow } from '@travyl/shared'
import type { CalendarActivity } from '../types'
import { useYjsTripContext } from '../providers/YjsTripProvider'

const CALENDAR_ACTIVITY_KEYS = [
  'id',
  'title',
  'type',
  'day',
  'endDay',
  'startHour',
  'duration',
  'location',
  'image',
  'rating',
  'price',
  'notes',
  'color',
  'latitude',
  'longitude',
  'sortOrder',
  'pollResult',
] as const

interface UseActivityMutationsReturn {
  addActivity: (activity: CalendarActivity) => Promise<void>
  updateActivity: (id: string, patch: Partial<CalendarActivity>) => void
  moveActivity: (id: string, newDay: number, newStartHour: number) => void
  removeActivity: (id: string) => Promise<void>
  duplicateActivity: (source: CalendarActivity) => Promise<void>
}

export function useActivityMutations(
  tripId: string,
  tripStartDate: string,
  userId: string,
): UseActivityMutationsReturn {
  const { activitiesMap, pollsMap } = useYjsTripContext()

  const addActivity = useCallback(
    async (activity: CalendarActivity): Promise<void> => {
      // Immediate Supabase insert
      const row = toActivityRow(activity, tripId, userId, tripStartDate)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from('activity').insert(row as any)
      if (error) {
        console.error('[useActivityMutations] insert error:', error.message)
        throw error
      }

      // Hydrate Y.Map
      activitiesMap.doc?.transact(() => {
        const yMap = new Y.Map<unknown>()
        for (const key of CALENDAR_ACTIVITY_KEYS) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const val = (activity as any)[key]
          if (val !== undefined) yMap.set(key, val)
        }
        activitiesMap.set(activity.id, yMap)
      })
    },
    [activitiesMap, tripId, tripStartDate, userId],
  )

  const updateActivity = useCallback(
    (id: string, patch: Partial<CalendarActivity>): void => {
      const yMap = activitiesMap.get(id)
      if (!yMap) {
        console.warn(
          `[useActivityMutations] updateActivity: no Y.Map for id=${id}`,
        )
        return
      }

      activitiesMap.doc?.transact(() => {
        for (const [key, val] of Object.entries(patch)) {
          if (val !== undefined) yMap.set(key, val)
        }
      })
      // Persistence handled by useYjsSync debounced flush
    },
    [activitiesMap],
  )

  const moveActivity = useCallback(
    (id: string, newDay: number, newStartHour: number): void => {
      const yMap = activitiesMap.get(id)
      if (!yMap) {
        console.warn(
          `[useActivityMutations] moveActivity: no Y.Map for id=${id}`,
        )
        return
      }

      const oldDay = (yMap.get('day') as number) ?? 0
      const oldEndDay = (yMap.get('endDay') as number) ?? oldDay
      const newEndDay = oldEndDay + (newDay - oldDay)

      activitiesMap.doc?.transact(() => {
        yMap.set('day', newDay)
        yMap.set('endDay', newEndDay)
        yMap.set('startHour', newStartHour)
      })
      // Persistence handled by useYjsSync debounced flush
    },
    [activitiesMap],
  )

  const removeActivity = useCallback(
    async (id: string): Promise<void> => {
      // Immediate Supabase delete
      const { error } = await supabase
        .from('activity')
        .delete()
        .eq('id', id)

      // Ignore "not found" errors (row may already be deleted)
      if (error && !error.message.includes('not found')) {
        console.error('[useActivityMutations] delete error:', error.message)
        throw error
      }

      // Remove from Y.Map + clean up any associated poll atomically
      activitiesMap.doc?.transact(() => {
        activitiesMap.delete(id)
        if (pollsMap.has(id)) {
          pollsMap.delete(id)
        }
      })
    },
    [activitiesMap, pollsMap],
  )

  const duplicateActivity = useCallback(
    async (source: CalendarActivity): Promise<void> => {
      // Compute max sortOrder from the live Yjs activitiesMap
      let maxSortOrder = 0
      activitiesMap.forEach((yMap) => {
        const so = yMap.get('sortOrder') as number | undefined
        if (so !== undefined && so > maxSortOrder) maxSortOrder = so
      })
      const clone: CalendarActivity = {
        ...source,
        id: crypto.randomUUID(),
        sortOrder: maxSortOrder + 1,
      }
      await addActivity(clone)
    },
    [activitiesMap, addActivity],
  )

  return { addActivity, updateActivity, moveActivity, removeActivity, duplicateActivity }
}
