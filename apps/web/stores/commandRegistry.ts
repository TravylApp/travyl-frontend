import { create } from 'zustand'
import type { GlobalCommand } from '@/lib/commands/types'

interface CommandRegistryState {
  globalCommands: GlobalCommand[]
  pageCommands: GlobalCommand[]
  chordBuffer: string
  chordActive: boolean

  setGlobalCommands: (commands: GlobalCommand[]) => void
  registerPageCommands: (commands: GlobalCommand[]) => () => void
  pushChord: (key: string) => GlobalCommand | null
  setChordBuffer: (buffer: string, active: boolean) => void
  clearChord: () => void
}

export const useCommandRegistry = create<CommandRegistryState>((set, get) => ({
  globalCommands: [],
  pageCommands: [],
  chordBuffer: '',
  chordActive: false,

  setGlobalCommands: (commands) => set({ globalCommands: commands }),

  registerPageCommands: (commands) => {
    set({ pageCommands: commands })
    return () => { set({ pageCommands: [] }) }
  },

  pushChord: (key) => {
    const state = get()
    const newBuffer = state.chordBuffer + key

    const allCommands = [...state.globalCommands, ...state.pageCommands]
    const match = allCommands.find(
      (cmd) => cmd.chord === newBuffer && cmd.isEnabled,
    )

    if (match) {
      set({ chordBuffer: '', chordActive: false })
      return match
    }

    const hasPartial = allCommands.some(
      (cmd) => cmd.chord?.startsWith(newBuffer) && cmd.isEnabled,
    )

    if (!hasPartial) {
      set({ chordBuffer: '', chordActive: false })
      return null
    }

    set({ chordBuffer: newBuffer, chordActive: true })
    return null
  },

  setChordBuffer: (buffer, active) => set({ chordBuffer: buffer, chordActive: active }),

  clearChord: () => {
    set({ chordBuffer: '', chordActive: false })
  },
}))
