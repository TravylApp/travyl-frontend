// apps/web/components/GlobalCommandPalette.tsx
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { useContextSearch } from '@/hooks/useContextSearch'
import type { ContextSearchResult } from '@/hooks/useContextSearch'
import { useCalendarCommandsStore } from '@/stores/calendarCommandsStore'
import type { Command } from './calendar/types'

// ─── Types ───────────────────────────────────────────────────

interface NavItem {
  type: 'navigation'
  id: string
  label: string
  path: string
}

interface TripItem {
  type: 'trip'
  id: string
  label: string
  data: ContextSearchResult
}

interface CommandItem {
  type: 'command'
  id: string
  label: string
  command: Command
}

type PaletteItem = NavItem | TripItem | CommandItem

interface PaletteGroup {
  key: string
  label: string
  items: PaletteItem[]
}

// ─── Static nav items ────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { type: 'navigation', id: 'home', label: 'Home', path: '/' },
  { type: 'navigation', id: 'trips', label: 'Trips', path: '/trips' },
  { type: 'navigation', id: 'profile', label: 'Profile', path: '/profile' },
  { type: 'navigation', id: 'settings', label: 'Settings', path: '/settings' },
]

// ─── Status badge colors ─────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-gray-400',
  booked: 'bg-amber-500',
  active: 'bg-emerald-500',
  completed: 'bg-[#003594]',
  abandoned: 'bg-red-500',
}

// ─── Date formatting ─────────────────────────────────────────

function formatTripDates(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T00:00:00Z')
  const end = new Date(endDate + 'T00:00:00Z')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }
  const startStr = start.toLocaleDateString('en-US', opts)
  const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${startStr} - ${endStr}`
}

// ─── Exported open state for external coordination ───────────

let globalPaletteOpen = false
export function isGlobalPaletteOpen() { return globalPaletteOpen }

// ─── Component ───────────────────────────────────────────────

export function GlobalCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [hoveredTrip, setHoveredTrip] = useState<ContextSearchResult | null>(null)
  const [hoverAnchor, setHoverAnchor] = useState<HTMLElement | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Sync exported flag
  useEffect(() => { globalPaletteOpen = isOpen }, [isOpen])

  const calendarCommands = useCalendarCommandsStore((s) => s.commands)
  const { results: tripResults, isLoading: tripSearchLoading } = useContextSearch(query)

  // ─── Global Ctrl+K listener (capture phase) ──────────────

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        e.stopPropagation()
        setIsOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [])

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setHighlightedIndex(0)
      setHoveredTrip(null)
      setHoverAnchor(null)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  // ─── Build grouped items ─────────────────────────────────

  const groups = useMemo<PaletteGroup[]>(() => {
    const q = query.toLowerCase()
    const result: PaletteGroup[] = []

    const filteredNav = NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(q))
    if (filteredNav.length > 0) {
      result.push({ key: 'navigation', label: 'Navigation', items: filteredNav })
    }

    if (tripResults.length > 0) {
      result.push({
        key: 'trips',
        label: 'Trips',
        items: tripResults.map((t) => ({
          type: 'trip' as const,
          id: `trip-${t.tripId}`,
          label: t.title,
          data: t,
        })),
      })
    }

    if (calendarCommands) {
      const filtered = calendarCommands
        .filter((c) => c.label.toLowerCase().includes(q))
      if (filtered.length > 0) {
        filtered.sort((a, b) => {
          if (a.isEnabled && !b.isEnabled) return -1
          if (!a.isEnabled && b.isEnabled) return 1
          return 0
        })
        result.push({
          key: 'commands',
          label: 'Commands',
          items: filtered.map((c) => ({
            type: 'command' as const,
            id: `cmd-${c.id}`,
            label: c.label,
            command: c,
          })),
        })
      }
    }

    return result
  }, [query, tripResults, calendarCommands])

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [flatItems.length])

  // ─── Show preview for keyboard-highlighted trip ──────────
  useEffect(() => {
    const item = flatItems[highlightedIndex]
    if (item?.type === 'trip') {
      setHoveredTrip(item.data)
    } else {
      setHoveredTrip(null)
      setHoverAnchor(null)
    }
  }, [highlightedIndex, flatItems])

  // ─── Execute item ────────────────────────────────────────

  function executeItem(item: PaletteItem) {
    setIsOpen(false)
    if (item.type === 'navigation') {
      router.push(item.path)
    } else if (item.type === 'trip') {
      router.push(`/trip/${item.data.tripId}`)
    } else if (item.type === 'command') {
      if (item.command.isEnabled) {
        item.command.execute()
      }
    }
  }

  function isItemDisabled(item: PaletteItem): boolean {
    return item.type === 'command' && !item.command.isEnabled
  }

  // ─── Keyboard navigation ────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => {
        for (let i = prev + 1; i < flatItems.length; i++) {
          if (!isItemDisabled(flatItems[i])) return i
        }
        return prev
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => {
        for (let i = prev - 1; i >= 0; i--) {
          if (!isItemDisabled(flatItems[i])) return i
        }
        return prev
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = flatItems[highlightedIndex]
      if (item && !isItemDisabled(item)) {
        executeItem(item)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setIsOpen(false)
    }
  }

  // ─── Hover preview position ──────────────────────────────

  const previewStyle = useMemo(() => {
    if (!hoveredTrip) return { display: 'none' as const }
    if (!hoverAnchor) {
      return { top: '15vh', left: 'calc(50% + 280px)', display: 'block' as const }
    }
    const rect = hoverAnchor.getBoundingClientRect()
    const spaceRight = window.innerWidth - rect.right
    if (spaceRight > 260) {
      return { top: rect.top, left: rect.right + 8, display: 'block' as const }
    }
    return { top: rect.top, right: window.innerWidth - rect.left + 8, display: 'block' as const }
  }, [hoverAnchor, hoveredTrip])

  // ─── Render ──────────────────────────────────────────────

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
            if (e.target === e.currentTarget) setIsOpen(false)
          }}
        >
          <div className="absolute inset-0 bg-black/40" />

          <motion.div
            className="relative w-full max-w-[520px] mx-4 bg-white dark:bg-[#0f1a28] rounded-xl border border-gray-200 dark:border-[#1e3a5f]/40 shadow-2xl overflow-hidden"
            initial={{ scale: 0.96, y: -8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: -8 }}
            transition={{ duration: 0.12 }}
            onKeyDown={handleKeyDown}
          >
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
                placeholder="Search trips, navigate..."
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-[#f5efe8] placeholder-gray-400 dark:placeholder-[#4a7ab5] outline-none"
              />
              <kbd className="text-[10px] text-gray-400 dark:text-[#484f58] bg-gray-100 dark:bg-[#0a1520] border border-gray-200 dark:border-[#1e3a5f]/30 px-1.5 py-0.5 rounded">
                Esc
              </kbd>
            </div>

            <div className="max-h-[360px] overflow-y-auto py-1">
              {flatItems.length === 0 && !tripSearchLoading && (
                <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-[#4a7ab5]">
                  No results found
                </div>
              )}

              {tripSearchLoading && query.length >= 3 && tripResults.length === 0 && (
                <div className="px-4 py-3 text-center text-sm text-gray-400 dark:text-[#4a7ab5]">
                  Searching trips...
                </div>
              )}

              {groups.map((group) => (
                <div key={group.key}>
                  <div className="px-3 py-1.5 text-[10px] font-medium text-gray-400 dark:text-[#4a7ab5] uppercase tracking-wider">
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const index = flatItems.indexOf(item)
                    const isHighlighted = index === highlightedIndex
                    const disabled = isItemDisabled(item)

                    return (
                      <button
                        key={item.id}
                        disabled={disabled}
                        onClick={() => {
                          if (!disabled) executeItem(item)
                        }}
                        onMouseEnter={(e) => {
                          if (!disabled) setHighlightedIndex(index)
                          if (item.type === 'trip') {
                            setHoveredTrip(item.data)
                            setHoverAnchor(e.currentTarget)
                          }
                        }}
                        onMouseLeave={() => {
                          if (item.type === 'trip') {
                            setHoveredTrip(null)
                            setHoverAnchor(null)
                          }
                        }}
                        className={[
                          'w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors',
                          disabled
                            ? 'text-gray-400 dark:text-[#484f58] cursor-default pointer-events-none'
                            : isHighlighted
                              ? 'bg-gray-100 dark:bg-[#1e3a5f]/30 text-gray-900 dark:text-[#f5efe8]'
                              : 'text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20',
                        ].join(' ')}
                      >
                        <span className="flex items-center gap-2">
                          {item.type === 'trip' && (
                            <span className="text-xs text-gray-400 dark:text-[#4a7ab5]">
                              {item.data.destination}
                            </span>
                          )}
                          <span>{item.label}</span>
                        </span>
                        {item.type === 'command' && item.command.shortcut && (
                          <kbd className="text-[10px] text-gray-400 dark:text-[#484f58] bg-gray-100 dark:bg-[#0a1520] border border-gray-200 dark:border-[#1e3a5f]/30 px-1.5 py-0.5 rounded ml-4 shrink-0">
                            {item.command.shortcut.display}
                          </kbd>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </motion.div>

          {hoveredTrip && (
            <div
              className="fixed z-[60] w-[240px] bg-white dark:bg-[#0f1a28] rounded-lg border border-gray-200 dark:border-[#1e3a5f]/40 shadow-xl p-3 pointer-events-none"
              style={previewStyle}
            >
              <div className="font-medium text-sm text-gray-900 dark:text-[#f5efe8]">
                {hoveredTrip.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-[#4a7ab5] mt-0.5">
                {hoveredTrip.destination}
              </div>
              <div className="text-xs text-gray-500 dark:text-[#4a7ab5] mt-1">
                {formatTripDates(hoveredTrip.startDate, hoveredTrip.endDate)}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-block w-2 h-2 rounded-full ${STATUS_COLORS[hoveredTrip.status] ?? STATUS_COLORS.planning}`} />
                <span className="text-xs text-gray-500 dark:text-[#4a7ab5] capitalize">
                  {hoveredTrip.status}
                </span>
                <span className="text-xs text-gray-400 dark:text-[#484f58] ml-auto">
                  {hoveredTrip.activityCount} activities
                </span>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
