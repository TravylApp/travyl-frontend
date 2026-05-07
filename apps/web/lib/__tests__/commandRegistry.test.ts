import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCommandRegistry } from '../../stores/commandRegistry'
import type { GlobalCommand } from '../commands/types'

function makeCmd(overrides: Partial<GlobalCommand> = {}): GlobalCommand {
  return {
    id: 'test', label: 'Test', description: 'Test command',
    group: 'navigation', isEnabled: true, execute: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  useCommandRegistry.setState({
    globalCommands: [], pageCommands: [],
    chordBuffer: '', chordActive: false,
  })
})

describe('registerPageCommands', () => {
  it('registers and cleans up page commands', () => {
    const cmd = makeCmd({ id: 'page-cmd' })
    const cleanup = useCommandRegistry.getState().registerPageCommands([cmd])
    expect(useCommandRegistry.getState().pageCommands).toHaveLength(1)
    cleanup()
    expect(useCommandRegistry.getState().pageCommands).toHaveLength(0)
  })

  it('replaces previous page commands on re-registration', () => {
    const cmd1 = makeCmd({ id: 'cmd1' })
    const cmd2 = makeCmd({ id: 'cmd2' })
    useCommandRegistry.getState().registerPageCommands([cmd1])
    useCommandRegistry.getState().registerPageCommands([cmd2])
    expect(useCommandRegistry.getState().pageCommands.map((c) => c.id)).toEqual(['cmd2'])
  })
})

describe('pushChord', () => {
  it('returns null for no match', () => {
    expect(useCommandRegistry.getState().pushChord('z')).toBeNull()
  })

  it('matches and returns a command, clearing buffer', () => {
    const cmd = makeCmd({ id: 'go-trips', chord: 'gt', execute: vi.fn() })
    useCommandRegistry.getState().setGlobalCommands([cmd])
    expect(useCommandRegistry.getState().pushChord('g')).toBeNull()
    expect(useCommandRegistry.getState().chordActive).toBe(true)
    expect(useCommandRegistry.getState().chordBuffer).toBe('g')
    const match = useCommandRegistry.getState().pushChord('t')
    expect(match?.id).toBe('go-trips')
    expect(useCommandRegistry.getState().chordActive).toBe(false)
    expect(useCommandRegistry.getState().chordBuffer).toBe('')
  })

  it('clears buffer on no partial match', () => {
    useCommandRegistry.getState().pushChord('x')
    expect(useCommandRegistry.getState().chordActive).toBe(false)
    expect(useCommandRegistry.getState().chordBuffer).toBe('')
  })
})

describe('clearChord', () => {
  it('clears chord state', () => {
    useCommandRegistry.getState().pushChord('g')
    useCommandRegistry.getState().clearChord()
    expect(useCommandRegistry.getState().chordActive).toBe(false)
    expect(useCommandRegistry.getState().chordBuffer).toBe('')
  })
})
