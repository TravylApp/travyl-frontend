import { create } from 'zustand'
import type { Command } from '@/components/calendar/types'

interface CalendarCommandsState {
  commands: Command[] | null
  paletteOpen: boolean
  setCommands: (commands: Command[]) => void
  clearCommands: () => void
  setPaletteOpen: (open: boolean) => void
}

export const useCalendarCommandsStore = create<CalendarCommandsState>((set) => ({
  commands: null,
  paletteOpen: false,
  setCommands: (commands) => set({ commands }),
  clearCommands: () => set({ commands: null }),
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
}))
