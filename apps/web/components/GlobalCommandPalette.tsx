// apps/web/components/GlobalCommandPalette.tsx
'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { useContextSearch } from '@/hooks/useContextSearch'
import type { ContextSearchResult } from '@/hooks/useContextSearch'
import { useCalendarCommandsStore } from '@/stores/calendarCommandsStore'
import { useTripSettingsStore } from '@/stores/tripSettingsStore'
import type { Command } from './calendar/types'
import { useSettingsStore, useAuthStore, TRIP_THEMES, THEME_ORDER } from '@travyl/shared'
import type { Currency, DistanceUnits, TravelStyle, Trip } from '@travyl/shared'

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
  variant?: 'swatches' | 'pills' | 'segmented' | 'chips' | 'scrollable-pills'
}

interface SettingLinkItem {
  type: 'setting-link'
  id: string
  label: string
  keywords: string[]
  path: string
}

type SettingItem = SettingToggleItem | SettingPickerItem | SettingLinkItem

type PaletteItem = NavItem | TripItem | CommandItem | SettingItem

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

// ─── Trip settings tab config ────────────────────────────────

const CONFIGURABLE_TABS = [
  { segment: 'itinerary',   label: 'Itinerary Tab' },
  { segment: 'hotels',      label: 'Hotels Tab' },
  { segment: 'flights',     label: 'Flights Tab' },
  { segment: 'restaurants', label: 'Restaurants Tab' },
  { segment: 'activities',  label: 'Explore Tab' },
  { segment: 'packing',     label: 'Packing Tab' },
  { segment: 'budget',      label: 'Budget Tab' },
  { segment: 'cars',        label: 'Car Rental Tab' },
  { segment: 'favorites',   label: 'Favorites Tab' },
] as const

// ─── Status colors ────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  planning:  '#9CA3AF',
  booked:    '#F59E0B',
  active:    '#10B981',
  completed: '#003594',
  abandoned: '#EF4444',
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

// ─── Inline control components ────────────────────────────────

// ToggleSwitch: track is a soft tint (emerald-100 on, gray off), emerald thumb when on, gray when off.
// pointer-events-none — the row button handles the click via executeItem → onToggle.
function ToggleSwitch({ enabled }: { enabled: boolean }) {
  return (
    <div
      className={[
        'relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors duration-150 pointer-events-none',
        enabled
          ? 'bg-emerald-100 dark:bg-emerald-900/30'
          : 'bg-gray-300 dark:bg-[#1e3a5f]/60',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-3 w-3 rounded-full shadow transition-transform duration-150 mt-0.5',
          enabled
            ? 'translate-x-3.5 bg-emerald-500'
            : 'translate-x-0.5 bg-gray-400 dark:bg-gray-500',
        ].join(' ')}
      />
    </div>
  )
}

// renderPickerControl: renders the right-side inline control for a SettingPickerItem.
// Depends on: TRIP_THEMES (module import), STATUS_COLORS (module constant)
function renderPickerControl(item: SettingPickerItem) {
  function isActive(opt: { value: string; label: string }) {
    return (
      opt.value === item.currentValue ||
      opt.label.toLowerCase() === item.currentValue.toLowerCase()
    )
  }

  if (item.variant === 'swatches') {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {item.options.map((opt) => {
          const color = TRIP_THEMES[opt.value]?.base ?? '#888'
          const active = isActive(opt)
          return (
            <button
              key={opt.value}
              onClick={(e) => { e.stopPropagation(); item.onSelect(opt.value) }}
              title={opt.label}
              style={{ backgroundColor: color }}
              className={[
                'w-4 h-4 rounded-full transition-all shrink-0',
                active
                  ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-100 dark:ring-offset-[#0f1a28] shadow'
                  : 'opacity-60 hover:opacity-100',
              ].join(' ')}
            />
          )
        })}
      </div>
    )
  }

  if (item.variant === 'pills') {
    return (
      <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onClick={(e) => e.stopPropagation()}>
        {item.options.map((opt) => {
          const color = STATUS_COLORS[opt.value] ?? '#888'
          const active = isActive(opt)
          return (
            <button
              key={opt.value}
              onClick={(e) => { e.stopPropagation(); item.onSelect(opt.value) }}
              style={active
                ? { backgroundColor: color, borderColor: color }
                : { borderColor: color }
              }
              className={[
                'text-[10px] px-1.5 py-0.5 rounded-full border transition-colors whitespace-nowrap shrink-0',
                active ? 'text-white' : 'text-gray-500 dark:text-[#4a7ab5]',
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  if (item.variant === 'segmented') {
    return (
      <div
        className="flex items-center rounded overflow-hidden border border-gray-200 dark:border-[#1e3a5f]/40 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {item.options.map((opt, i) => {
          const active = isActive(opt)
          return (
            <button
              key={opt.value}
              onClick={(e) => { e.stopPropagation(); item.onSelect(opt.value) }}
              className={[
                'text-[10px] px-2 py-0.5 transition-colors',
                i > 0 ? 'border-l border-gray-200 dark:border-[#1e3a5f]/40' : '',
                active
                  ? 'bg-[#1e3a5f] text-white dark:bg-[#4a7ab5]'
                  : 'text-gray-500 dark:text-[#4a7ab5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20',
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  if (item.variant === 'chips') {
    return (
      <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onClick={(e) => e.stopPropagation()}>
        {item.options.map((opt) => {
          const active = isActive(opt)
          return (
            <button
              key={opt.value}
              onClick={(e) => { e.stopPropagation(); item.onSelect(opt.value) }}
              className={[
                'text-[10px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap shrink-0',
                active
                  ? 'bg-[#1e3a5f] dark:bg-[#4a7ab5] text-white border-transparent'
                  : 'border-gray-300 dark:border-[#1e3a5f]/40 text-gray-500 dark:text-[#4a7ab5] hover:border-gray-400',
              ].join(' ')}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    )
  }

  // variant === 'scrollable-pills' (default) — used for currency.
  // Intentionally renders opt.value (e.g. "USD") not opt.label ("USD — US Dollar")
  // so pills are compact enough to fit in a scrollable row.
  return (
    <div
      className="flex items-center gap-1 overflow-x-auto max-w-[200px] pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {item.options.map((opt) => {
        const active = isActive(opt)
        return (
          <button
            key={opt.value}
            onClick={(e) => { e.stopPropagation(); item.onSelect(opt.value) }}
            className={[
              'text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors shrink-0',
              active
                ? 'bg-[#1e3a5f] dark:bg-[#4a7ab5] text-white border-transparent'
                : 'border-gray-300 dark:border-[#1e3a5f]/40 text-gray-500 dark:text-[#4a7ab5]',
            ].join(' ')}
          >
            {opt.value}
          </button>
        )
      })}
    </div>
  )
}

// renderItemRight: renders the right-side inline control for a PaletteItem.
// Depends on: ToggleSwitch, renderPickerControl (both module-level)
function renderItemRight(item: PaletteItem) {
  if (item.type === 'setting-toggle') {
    return <ToggleSwitch enabled={item.enabled} />
  }
  if (item.type === 'setting-picker') {
    return renderPickerControl(item)
  }
  if (item.type === 'setting-link') {
    return (
      <span className="text-[10px] text-gray-400 dark:text-[#484f58]">→</span>
    )
  }
  if (item.type === 'command' && item.command.shortcut) {
    return (
      <kbd className="text-[10px] text-gray-400 dark:text-[#484f58] bg-gray-100 dark:bg-[#0a1520] border border-gray-200 dark:border-[#1e3a5f]/30 px-1.5 py-0.5 rounded ml-4 shrink-0">
        {item.command.shortcut.display}
      </kbd>
    )
  }
  return null
}

// ─── Component ───────────────────────────────────────────────

export function GlobalCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const calendarCommands = useCalendarCommandsStore((s) => s.commands)
  const setPaletteOpen = useCalendarCommandsStore((s) => s.setPaletteOpen)
  const tripRegistration = useTripSettingsStore((s) => s.registration)

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
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  // ─── Profile settings registry ───────────────────────────

  const settingItems = useMemo<SettingItem[]>(() => {
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
        variant: 'scrollable-pills',
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
        variant: 'segmented',
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
        variant: 'chips',
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

  // ─── Trip settings items ──────────────────────────────────

  const tripSettingItems = useMemo<SettingItem[]>(() => {
    if (!tripRegistration) return []
    const reg = tripRegistration
    const items: SettingItem[] = []

    if (reg.canEdit) {
      // Theme picker
      items.push({
        type: 'setting-picker' as const,
        id: 'trip-theme',
        label: 'Trip Theme',
        keywords: ['theme', 'colors', 'appearance'],
        currentValue: TRIP_THEMES[reg.themeId]?.name ?? 'Custom',
        options: THEME_ORDER.map((id) => ({
          value: id,
          label: TRIP_THEMES[id].name,
        })),
        onSelect: (v: string) => reg.setTripTheme(v),
        variant: 'swatches',
      })

      // Tab toggles
      for (const tab of CONFIGURABLE_TABS) {
        const isEnabled = !reg.hiddenTabs[tab.segment]
        items.push({
          type: 'setting-toggle' as const,
          id: `trip-tab-${tab.segment}`,
          label: tab.label,
          keywords: [tab.label.toLowerCase().replace(' tab', ''), 'tab', 'show', 'hide'],
          enabled: isEnabled,
          onToggle: () => reg.setTabHidden(tab.segment, isEnabled),
        })
      }

      // Status picker
      items.push({
        type: 'setting-picker' as const,
        id: 'trip-status',
        label: 'Trip Status',
        keywords: ['status', 'planning', 'booked', 'active', 'completed', 'abandoned'],
        currentValue: reg.status.charAt(0).toUpperCase() + reg.status.slice(1),
        options: [
          { value: 'planning', label: 'Planning' },
          { value: 'booked', label: 'Booked' },
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' },
          { value: 'abandoned', label: 'Abandoned' },
        ],
        onSelect: (v: string) => reg.setStatus(v as Trip['status']),
        variant: 'pills',
      })
    }

    // Link items (always shown when on trip)
    items.push(
      {
        type: 'setting-link' as const,
        id: 'trip-sharing',
        label: 'Trip Sharing',
        keywords: ['sharing', 'share', 'link', 'public'],
        path: `/trip/${reg.tripId}/settings`,
      },
      {
        type: 'setting-link' as const,
        id: 'trip-details',
        label: 'Trip Details',
        keywords: ['details', 'title', 'destination', 'dates', 'budget'],
        path: `/trip/${reg.tripId}/settings`,
      },
      {
        type: 'setting-link' as const,
        id: 'trip-colors',
        label: 'Trip Colors',
        keywords: ['colors', 'tab colors', 'itinerary colors', 'customize'],
        path: `/trip/${reg.tripId}/settings`,
      },
    )

    if (reg.isOwner) {
      items.push({
        type: 'setting-link' as const,
        id: 'trip-delete',
        label: 'Delete Trip',
        keywords: ['delete', 'remove', 'archive'],
        path: `/trip/${reg.tripId}/settings`,
      })
    }

    return items
  }, [tripRegistration])

  // ─── Build grouped items ─────────────────────────────────

  const groups = useMemo<PaletteGroup[]>(() => {
    const q = query.toLowerCase()
    const result: PaletteGroup[] = []

    // Navigation
    const filteredNav = NAV_ITEMS.filter((n) => n.label.toLowerCase().includes(q))
    if (filteredNav.length > 0) {
      result.push({ key: 'navigation', label: 'Navigation', items: filteredNav })
    }

    // Profile Settings
    const filteredSettings = settingItems.filter((s) =>
      s.label.toLowerCase().includes(q) ||
      s.keywords.some((kw) => kw.includes(q))
    )
    if (filteredSettings.length > 0) {
      result.push({ key: 'settings', label: 'Settings', items: filteredSettings })
    }

    // Trip Settings (only when on a trip)
    const filteredTripSettings = tripSettingItems.filter((s) =>
      s.label.toLowerCase().includes(q) ||
      s.keywords.some((kw) => kw.includes(q))
    )
    if (filteredTripSettings.length > 0) {
      result.push({ key: 'trip-settings', label: 'Trip Settings', items: filteredTripSettings })
    }

    // Trips (search results)
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

    // Commands (calendar)
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
  }, [query, tripResults, calendarCommands, settingItems, tripSettingItems])

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
      // Keep palette open after toggle
    } else if (item.type === 'setting-picker') {
      // no-op — inline controls handle onSelect directly via their own onClick
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
            {/* ─── Input header ─── */}
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
                placeholder="Search trips, settings, navigate..."
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
                        onMouseEnter={() => {
                          if (!disabled) setHighlightedIndex(index)
                        }}
                        className={[
                          'w-full flex items-center justify-between px-4 text-sm text-left transition-colors',
                          (item.type === 'setting-toggle' || item.type === 'setting-picker' || item.type === 'setting-link')
                            ? 'py-2.5'
                            : 'py-2',
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
                        {renderItemRight(item)}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
