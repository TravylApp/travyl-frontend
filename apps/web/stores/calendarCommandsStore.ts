import { create } from 'zustand'
import type { Command } from '@/components/calendar/types'

interface CalendarCommandsState {
  commands: Command[] | null
  setCommands: (commands: Command[]) => void
  clearCommands: () => void
}

export const useCalendarCommandsStore = create<CalendarCommandsState>((set) => ({
  commands: null,
  setCommands: (commands) => set({ commands }),
  clearCommands: () => set({ commands: null }),
}))
