'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Command } from './types'

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  commands: Command[]
}

const GROUP_ORDER = ['edit', 'activity', 'view', 'insert'] as const
const GROUP_LABELS: Record<string, string> = {
  edit: 'Edit',
  activity: 'Activity',
  view: 'View',
  insert: 'Insert',
}

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset query and highlight on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setHighlightedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  // Filtered commands
  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return commands.filter((c) => c.label.toLowerCase().includes(q))
  }, [commands, query])

  // Grouped: edit → activity → view → insert, with disabled at end of each group
  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>()
    for (const g of GROUP_ORDER) map.set(g, [])
    for (const cmd of filtered) {
      map.get(cmd.group)?.push(cmd)
    }
    // Within each group: enabled first, disabled last
    for (const g of GROUP_ORDER) {
      const cmds = map.get(g)!
      cmds.sort((a, b) => {
        if (a.isEnabled && !b.isEnabled) return -1
        if (!a.isEnabled && b.isEnabled) return 1
        return 0
      })
      map.set(g, cmds)
    }
    return map
  }, [filtered])

  // Flat ordered list for index tracking
  const flatCommands = useMemo(() => {
    const result: Command[] = []
    for (const g of GROUP_ORDER) {
      result.push(...(grouped.get(g) ?? []))
    }
    return result
  }, [grouped])

  // Reset highlight to first enabled when filtered list changes
  useEffect(() => {
    let flatIdx = 0
    for (const g of GROUP_ORDER) {
      for (const cmd of (grouped.get(g) ?? [])) {
        if (cmd.isEnabled) {
          setHighlightedIndex(flatIdx)
          return
        }
        flatIdx++
      }
    }
    setHighlightedIndex(0)
  }, [filtered, grouped])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => {
        for (let i = prev + 1; i < flatCommands.length; i++) {
          if (flatCommands[i].isEnabled) return i
        }
        return prev
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => {
        for (let i = prev - 1; i >= 0; i--) {
          if (flatCommands[i].isEnabled) return i
        }
        return prev
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = flatCommands[highlightedIndex]
      if (cmd?.isEnabled) {
        cmd.execute()
        onClose()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-[480px] mx-4 bg-white dark:bg-[#0f1a28] rounded-xl border border-gray-200 dark:border-[#1e3a5f]/40 shadow-2xl overflow-hidden"
            initial={{ scale: 0.96, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: -8 }}
            transition={{ duration: 0.12 }}
            onKeyDown={handleKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-[#1e3a5f]/30">
              <svg
                width="16" height="16" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                className="text-gray-400 dark:text-[#4a7ab5] shrink-0"
              >
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands..."
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-[#f5efe8] placeholder-gray-400 dark:placeholder-[#4a7ab5] outline-none"
              />
              <kbd className="text-[10px] text-gray-400 dark:text-[#484f58] bg-gray-100 dark:bg-[#0a1520] border border-gray-200 dark:border-[#1e3a5f]/30 px-1.5 py-0.5 rounded">
                Esc
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-[360px] overflow-y-auto py-1">
              {flatCommands.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-[#4a7ab5]">
                  No commands found
                </div>
              )}
              {GROUP_ORDER.map((group) => {
                const cmds = grouped.get(group)
                if (!cmds?.length) return null
                return (
                  <div key={group}>
                    <div className="px-3 py-1.5 text-[11px] font-medium text-gray-400 dark:text-[#4a7ab5] uppercase tracking-[0.08em]">
                      {GROUP_LABELS[group]}
                    </div>
                    {cmds.map((cmd) => {
                      const index = flatCommands.indexOf(cmd)
                      const isHighlighted = index === highlightedIndex
                      return (
                        <button
                          key={cmd.id}
                          disabled={!cmd.isEnabled}
                          onClick={() => {
                            if (cmd.isEnabled) {
                              cmd.execute()
                              onClose()
                            }
                          }}
                          onMouseEnter={() => {
                            if (cmd.isEnabled) setHighlightedIndex(index)
                          }}
                          className={[
                            'w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors',
                            cmd.isEnabled
                              ? isHighlighted
                                ? 'bg-gray-100 dark:bg-[#1e3a5f]/30 text-gray-900 dark:text-[#f5efe8]'
                                : 'text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20'
                              : 'text-gray-400 dark:text-[#484f58] cursor-default pointer-events-none',
                            cmd.id === 'delete' && cmd.isEnabled ? 'text-red-600 dark:text-red-400' : '',
                          ].join(' ')}
                        >
                          <span>{cmd.label}</span>
                          {cmd.shortcut && (
                            <kbd className="text-[10px] text-gray-400 dark:text-[#484f58] bg-gray-100 dark:bg-[#0a1520] border border-gray-200 dark:border-[#1e3a5f]/30 px-1.5 py-0.5 rounded ml-4 shrink-0">
                              {cmd.shortcut.display}
                            </kbd>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
