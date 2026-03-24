// apps/web/components/GlobalCommandPalette.tsx
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { useContextSearch } from '@/hooks/useContextSearch'
import type { ContextSearchResult } from '@/hooks/useContextSearch'
import { useCalendarCommandsStore } from '@/stores/calendarCommandsStore'
import type { Command } from './calendar/types'
import { useSettingsStore, useAuthStore } from '@travyl/shared'
import type { Currency, DistanceUnits, TravelStyle } from '@travyl/shared'

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

interface SettingToggleItem {
  type: 'setting-toggle'
  id: string
  label: string
  keywords: string[]
  enabled: boolean
  onToggle: () => void
}

interface SettingPickerItem {
  type: 'setting-picker'
  id: string
  label: string
  keywords: string[]
  currentValue: string
  options: { value: string; label: string }[]
  onSelect: (value: string) => void
}

interface SettingLinkItem {
  type: 'setting-link'
  id: string
  label: string
  keywords: string[]
  path: string
}

type PaletteItem = NavItem | TripItem | CommandItem | SettingToggleItem | SettingPickerItem | SettingLinkItem

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

// ─── Date formatting ─────────────────────────────────────────

function formatTripDates(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T00:00:00Z')
  const end = new Date(endDate + 'T00:00:00Z')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }
  const startStr = start.toLocaleDateString('en-US', opts)
  const endStr = end.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${startStr} - ${endStr}`
}

// ─── Component ───────────────────────────────────────────────

export function GlobalCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [activePicker, setActivePicker] = useState<SettingPickerItem | null>(null)
  const [savedQuery, setSavedQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const calendarCommands = useCalendarCommandsStore((s) => s.commands)
  const setPaletteOpen = useCalendarCommandsStore((s) => s.setPaletteOpen)

  const user = useAuthStore((s) => s.user)
  const currency = useSettingsStore((s) => s.currency)
  const distanceUnits = useSettingsStore((s) => s.distanceUnits)
  const travelStyle = useSettingsStore((s) => s.travelStyle)
  const pushNotifications = useSettingsStore((s) => s.pushNotifications)
  const emailNotifications = useSettingsStore((s) => s.emailNotifications)
  const setCurrency = useSettingsStore((s) => s.setCurrency)
  const setDistanceUnits = useSettingsStore((s) => s.setDistanceUnits)
  const setTravelStyle = useSettingsStore((s) => s.setTravelStyle)
  const togglePush = useSettingsStore((s) => s.togglePushNotifications)
  const toggleEmail = useSettingsStore((s) => s.toggleEmailNotifications)

  // Sync palette open state to store so calendar commands can check it
  useEffect(() => { setPaletteOpen(isOpen) }, [isOpen, setPaletteOpen])
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
      setActivePicker(null)
      setSavedQuery('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  // ─── Settings registry ─────────────────────────────────────

  const settingItems = useMemo<(SettingToggleItem | SettingPickerItem | SettingLinkItem)[]>(() => {
    if (!user) return []
    return [
      {
        type: 'setting-picker' as const,
        id: 'setting-currency',
        label: 'Currency',
        keywords: ['currency', 'money', 'usd', 'eur', 'gbp', 'jpy', 'cad', 'aud', 'mxn'],
        currentValue: currency,
        options: [
          { value: 'USD', label: 'USD — US Dollar' },
          { value: 'EUR', label: 'EUR — Euro' },
          { value: 'GBP', label: 'GBP — British Pound' },
          { value: 'JPY', label: 'JPY — Japanese Yen' },
          { value: 'CAD', label: 'CAD — Canadian Dollar' },
          { value: 'AUD', label: 'AUD — Australian Dollar' },
          { value: 'MXN', label: 'MXN — Mexican Peso' },
        ],
        onSelect: (v: string) => setCurrency(v as Currency),
      },
      {
        type: 'setting-picker' as const,
        id: 'setting-distance',
        label: 'Distance Units',
        keywords: ['distance', 'units', 'miles', 'kilometers', 'km'],
        currentValue: distanceUnits === 'miles' ? 'Miles' : 'Kilometers',
        options: [
          { value: 'miles', label: 'Miles' },
          { value: 'kilometers', label: 'Kilometers' },
        ],
        onSelect: (v: string) => setDistanceUnits(v as DistanceUnits),
      },
      {
        type: 'setting-picker' as const,
        id: 'setting-travel-style',
        label: 'Travel Style',
        keywords: ['travel', 'style', 'balanced', 'budget', 'luxury', 'adventure', 'relaxed'],
        currentValue: travelStyle.charAt(0).toUpperCase() + travelStyle.slice(1),
        options: [
          { value: 'balanced', label: 'Balanced' },
          { value: 'budget', label: 'Budget' },
          { value: 'luxury', label: 'Luxury' },
          { value: 'adventure', label: 'Adventure' },
          { value: 'relaxed', label: 'Relaxed' },
        ],
        onSelect: (v: string) => setTravelStyle(v as TravelStyle),
      },
      {
        type: 'setting-toggle' as const,
        id: 'setting-push',
        label: 'Push Notifications',
        keywords: ['push', 'notifications', 'alerts'],
        enabled: pushNotifications,
        onToggle: togglePush,
      },
      {
        type: 'setting-toggle' as const,
        id: 'setting-email-notif',
        label: 'Email Notifications',
        keywords: ['email', 'notifications', 'alerts', 'mail'],
        enabled: emailNotifications,
        onToggle: toggleEmail,
      },
      {
        type: 'setting-link' as const,
        id: 'setting-email-account',
        label: 'Email (Account)',
        keywords: ['email', 'account'],
        path: '/profile/settings',
      },
      {
        type: 'setting-link' as const,
        id: 'setting-password',
        label: 'Change Password',
        keywords: ['password', 'security'],
        path: '/profile/settings',
      },
      {
        type: 'setting-link' as const,
        id: 'setting-delete-account',
        label: 'Delete Account',
        keywords: ['delete', 'account', 'remove'],
        path: '/profile/settings',
      },
      {
        type: 'setting-link' as const,
        id: 'setting-terms',
        label: 'Terms of Service',
        keywords: ['terms', 'legal'],
        path: '/profile/settings',
      },
      {
        type: 'setting-link' as const,
        id: 'setting-privacy',
        label: 'Privacy Policy',
        keywords: ['privacy', 'legal', 'policy'],
        path: '/profile/settings',
      },
    ]
  }, [user, currency, distanceUnits, travelStyle, pushNotifications, emailNotifications, setCurrency, setDistanceUnits, setTravelStyle, togglePush, toggleEmail])

  // ─── Build grouped items ─────────────────────────────────

  const groups = useMemo<PaletteGroup[]>(() => {
    const q = query.toLowerCase()
    const result: PaletteGroup[] = []

    const filteredNav = NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(q))
    if (filteredNav.length > 0) {
      result.push({ key: 'navigation', label: 'Navigation', items: filteredNav })
    }

    const filteredSettings = settingItems.filter((s) =>
      s.label.toLowerCase().includes(q) ||
      s.keywords.some((kw) => kw.includes(q))
    )
    if (filteredSettings.length > 0) {
      result.push({ key: 'settings', label: 'Settings', items: filteredSettings })
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
  }, [query, tripResults, calendarCommands, settingItems])

  const flatItems = useMemo(() => groups.flatMap((g) => g.items), [groups])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [flatItems.length])

  // ─── Execute item ────────────────────────────────────────

  function executeItem(item: PaletteItem) {
    if (item.type === 'navigation') {
      setIsOpen(false)
      router.push(item.path)
    } else if (item.type === 'trip') {
      setIsOpen(false)
      router.push(`/trip/${item.data.tripId}`)
    } else if (item.type === 'command') {
      setIsOpen(false)
      if (item.command.isEnabled) {
        item.command.execute()
      }
    } else if (item.type === 'setting-toggle') {
      item.onToggle()
      // Palette stays open after toggling
    } else if (item.type === 'setting-picker') {
      setSavedQuery(query)
      setQuery('')
      setActivePicker(item)
      setHighlightedIndex(0)
    } else if (item.type === 'setting-link') {
      setIsOpen(false)
      router.push(item.path)
    }
  }

  function isItemDisabled(item: PaletteItem): boolean {
    return item.type === 'command' && !item.command.isEnabled
  }

  // ─── Keyboard navigation ────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (activePicker) {
        setHighlightedIndex((prev) => Math.min(prev + 1, activePicker.options.length - 1))
      } else {
        setHighlightedIndex((prev) => {
          for (let i = prev + 1; i < flatItems.length; i++) {
            if (!isItemDisabled(flatItems[i])) return i
          }
          return prev
        })
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (activePicker) {
        setHighlightedIndex((prev) => Math.max(prev - 1, 0))
      } else {
        setHighlightedIndex((prev) => {
          for (let i = prev - 1; i >= 0; i--) {
            if (!isItemDisabled(flatItems[i])) return i
          }
          return prev
        })
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activePicker) {
        const option = activePicker.options[highlightedIndex]
        if (option) {
          activePicker.onSelect(option.value)
          setActivePicker(null)
          setQuery(savedQuery)
          setHighlightedIndex(0)
        }
      } else {
        const item = flatItems[highlightedIndex]
        if (item && !isItemDisabled(item)) {
          executeItem(item)
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (activePicker) {
        setActivePicker(null)
        setQuery(savedQuery)
        setHighlightedIndex(0)
      } else {
        setIsOpen(false)
      }
    }
  }

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
              {activePicker ? (
                <>
                  <button
                    onClick={() => {
                      setActivePicker(null)
                      setQuery(savedQuery)
                      setHighlightedIndex(0)
                    }}
                    className="text-gray-400 dark:text-[#4a7ab5] hover:text-gray-600 dark:hover:text-[#f5efe8] shrink-0"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                  <span className="text-sm text-gray-900 dark:text-[#f5efe8]">{activePicker.label}</span>
                </>
              ) : (
                <>
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
                    placeholder="Search trips, settings, navigate..."
                    className="flex-1 bg-transparent text-sm text-gray-900 dark:text-[#f5efe8] placeholder-gray-400 dark:placeholder-[#4a7ab5] outline-none"
                  />
                </>
              )}
              <kbd className="text-[10px] text-gray-400 dark:text-[#484f58] bg-gray-100 dark:bg-[#0a1520] border border-gray-200 dark:border-[#1e3a5f]/30 px-1.5 py-0.5 rounded">
                Esc
              </kbd>
            </div>

            <div className="max-h-[360px] overflow-y-auto py-1">
              {activePicker ? (
                activePicker.options.map((option, index) => {
                  const isSelected = option.value === activePicker.currentValue ||
                    option.label === activePicker.currentValue
                  const isHighlighted = index === highlightedIndex

                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        activePicker.onSelect(option.value)
                        setActivePicker(null)
                        setQuery(savedQuery)
                        setHighlightedIndex(0)
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={[
                        'w-full flex items-center justify-between px-4 py-2 text-sm text-left transition-colors',
                        isHighlighted
                          ? 'bg-gray-100 dark:bg-[#1e3a5f]/30 text-gray-900 dark:text-[#f5efe8]'
                          : 'text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20',
                      ].join(' ')}
                    >
                      <span>{option.label}</span>
                      {isSelected && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2"
                          className="text-green-500 dark:text-green-400 shrink-0">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  )
                })
              ) : (
                <>
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
                            onMouseEnter={() => {
                              if (!disabled) setHighlightedIndex(index)
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
                            <span className="flex items-center gap-2.5">
                              {item.type === 'trip' && item.data.imageUrl && (
                                <img
                                  src={item.data.imageUrl}
                                  alt={item.data.destination}
                                  className="w-[46px] h-[36px] rounded object-cover shrink-0"
                                />
                              )}
                              <span className="flex flex-col min-w-0">
                                <span>{item.label}</span>
                                {item.type === 'trip' && (item.data.startDate && item.data.endDate) && (
                                  <span className="text-[10px] text-gray-400 dark:text-[#4a7ab5] truncate">
                                    {item.data.destination} · {formatTripDates(item.data.startDate, item.data.endDate)}
                                  </span>
                                )}
                              </span>
                            </span>
                            {item.type === 'setting-toggle' && (
                              <span className={`ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                item.enabled
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-500 dark:bg-[#0a1520] dark:text-[#484f58]'
                              }`}>
                                {item.enabled ? 'On' : 'Off'}
                              </span>
                            )}
                            {item.type === 'setting-picker' && (
                              <span className="ml-auto text-[11px] text-gray-400 dark:text-[#4a7ab5]">
                                {item.currentValue}
                              </span>
                            )}
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
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
