import type { CalendarActivity } from '@/components/calendar/types'

export interface CommandMutations {
  addActivity: (activity: CalendarActivity) => Promise<void>
  moveActivity: (id: string, newDay: number, newStartHour: number) => void
  removeActivity: (id: string) => Promise<void>
  getAllActivities: () => CalendarActivity[]
  getActivityByTitle: (title: string) => CalendarActivity | undefined
  /** Start a batch for atomic undo. All operations in a batch are wrapped
   *  in a single undo entry when commitBatch() is called. */
  startBatch: () => void
  /** Commit the current batch, creating one undo entry for all operations.*/
  commitBatch: () => void
}

let _mutations: CommandMutations | null = null

export function setCommandMutations(m: CommandMutations | null) {
  _mutations = m
}

export function getCommandMutations(): CommandMutations | null {
  return _mutations
}
