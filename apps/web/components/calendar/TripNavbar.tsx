'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { NavArrowLeft, Plus, ShareAndroid, Settings, LogOut, SunLight, HalfMoon, User } from 'iconoir-react'
import { useAuthStore } from '@travyl/shared'
import type { ViewMode, UserAwareness, CalendarActivity } from './types'
import type { Command } from './types'
import type { CalendarTheme } from './hooks/useCalendarTheme'

// ─── TripMenuBar ────────────────────────────────────────────────
// Internal sub-component. Not exported.

const MENU_GROUPS = ['edit', 'activity', 'view', 'insert'] as const
type MenuGroup = typeof MENU_GROUPS[number]

const MENU_LABELS: Record<MenuGroup, string> = {
  edit: 'Edit',
  activity: 'Activity',
  view: 'View',
  insert: 'Insert',
}

interface TripMenuBarProps {
  commands: Command[]
  onOpenPalette: () => void
}

function TripMenuBar({ commands, onOpenPalette: _ }: TripMenuBarProps) {
  const [openGroup, setOpenGroup] = useState<MenuGroup | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenGroup(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function toggleGroup(group: MenuGroup) {
    setOpenGroup((prev) => (prev === group ? null : group))
  }

  const hasAnyEnabled = (group: MenuGroup) =>
    commands.some((c) => c.group === group && c.isEnabled)

  return (
    <div ref={menuRef} className="flex items-center h-full px-1 border-r border-gray-200 dark:border-[#1e3a5f]/30">
      {MENU_GROUPS.map((group) => {
        const groupCommands = commands.filter((c) => c.group === group)
        const isOpen = openGroup === group
        const hasEnabled = hasAnyEnabled(group)

        return (
          <div key={group} className="relative h-full flex items-center">
            <button
              onClick={() => toggleGroup(group)}
              className={[
                'px-3 h-full text-[13px] transition-colors rounded',
                isOpen
                  ? 'bg-gray-100 dark:bg-[#1e3a5f]/30 text-gray-900 dark:text-[#f5efe8]'
                  : hasEnabled
                  ? 'text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20'
                  : 'text-gray-400 dark:text-[#4a7ab5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20',
              ].join(' ')}
            >
              {MENU_LABELS[group]}
            </button>

            {isOpen && (
              <div className="absolute top-[calc(100%+2px)] left-0 z-50 w-56 bg-white dark:bg-[#0f1a28] border border-gray-200 dark:border-[#1e3a5f]/40 rounded-xl shadow-xl py-1 overflow-hidden">
                {groupCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    disabled={!cmd.isEnabled}
                    onClick={() => {
                      if (cmd.isEnabled) {
                        cmd.execute()
                        setOpenGroup(null)
                      }
                    }}
                    className={[
                      'w-full flex items-center justify-between px-3 py-1.5 text-sm text-left transition-colors',
                      cmd.isEnabled
                        ? cmd.id === 'delete'
                          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20'
                        : 'text-gray-400 dark:text-[#484f58] cursor-default',
                    ].join(' ')}
                  >
                    <span>{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="text-[10px] text-gray-400 dark:text-[#484f58] bg-gray-100 dark:bg-[#0a1520] border border-gray-200 dark:border-[#1e3a5f]/30 px-1.5 py-0.5 rounded ml-4 shrink-0">
                        {cmd.shortcut.display}
                      </kbd>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── TripNavbar ─────────────────────────────────────────────────

export interface TripNavbarProps {
  tripName: string
  dateRange: string
  commands: Command[]
  onOpenPalette: () => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onAddEvent: () => void
  onBack: () => void
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
  collaborators: UserAwareness[]
  onShare: () => void
  selectedActivity: CalendarActivity | null
  onDeselect: () => void
  theme: CalendarTheme
  onToggleTheme: () => void
  tripDays: { dayIndex: number; label: string }[]
}

function getInitials(name: string | undefined): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function TripNavbar({
  tripName,
  dateRange,
  commands,
  onOpenPalette,
  viewMode,
  onViewModeChange,
  onAddEvent,
  onBack,
  connectionStatus,
  collaborators,
  onShare,
  selectedActivity,
  onDeselect,
  theme,
  onToggleTheme,
  tripDays,
}: TripNavbarProps) {
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  const avatarUrl = user?.user_metadata?.avatar_url
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name
  const email = user?.email
  const initials = getInitials(displayName)

  // Close avatar dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    setAvatarDropdownOpen(false)
    await signOut()
  }

  const AvatarCircle = ({ size = 28 }: { size?: number }) => (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full overflow-hidden bg-[#1e3a5f] text-white font-medium text-[11px]"
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={displayName || 'User'} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  )

  return (
    <div className="flex flex-col shrink-0">
      {/* Connection status banner */}
      {connectionStatus !== 'connected' && (
        <div className="flex items-center justify-center gap-2 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          {connectionStatus === 'reconnecting'
            ? 'Reconnecting to collaboration server\u2026'
            : 'Disconnected \u2014 changes may not sync'}
        </div>
      )}

      {/* Main navbar row */}
      <div className="flex items-center h-11 border-b border-gray-200 dark:border-[#1e3a5f]/30 bg-white dark:bg-[#0f1a28] shrink-0">

        {/* Logo */}
        <Link
          href="/trips"
          className="flex items-center gap-1 px-3 h-full border-r border-gray-200 dark:border-[#1e3a5f]/30 text-[#1e3a5f] dark:text-[#f5efe8] shrink-0"
          style={{ fontFamily: 'var(--font-brand)', fontWeight: 800, fontSize: 13, letterSpacing: 2 }}
        >
          <span className="hidden sm:inline">TRAVYL</span>
          <span>&#9992;</span>
        </Link>

        {/* Back button */}
        <button
          onClick={onBack}
          aria-label="Back to trips"
          className="flex items-center justify-center h-full w-10 border-r border-gray-200 dark:border-[#1e3a5f]/30 text-gray-400 dark:text-[#4a7ab5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 hover:text-gray-700 dark:hover:text-white transition-colors shrink-0"
        >
          <NavArrowLeft width={16} height={16} />
        </button>

        {/* Menu bar */}
        <TripMenuBar commands={commands} onOpenPalette={onOpenPalette} />

        {/* Trip info */}
        <div className="flex flex-col justify-center px-4 h-full border-r border-gray-200 dark:border-[#1e3a5f]/30 shrink-0 min-w-0">
          <span
            className="truncate text-[13px] text-[#1e3a5f] dark:text-[#f5efe8] leading-tight"
            style={{ fontFamily: 'var(--font-brand)' }}
          >
            {tripName}
          </span>
          <span className="text-[10px] text-[#4a7ab5] leading-tight">{dateRange}</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Selection indicator */}
        {selectedActivity && (
          <div className="flex items-center gap-2 px-3 h-full border-l border-gray-200 dark:border-[#1e3a5f]/30 shrink-0">
            <div className="w-2 h-2 rounded-sm bg-blue-500 shrink-0" />
            <span className="text-[12px] text-gray-700 dark:text-[#cdd9e5] truncate max-w-[140px]">
              {selectedActivity.title || 'Untitled'}
            </span>
            <button
              onClick={onDeselect}
              aria-label="Deselect activity"
              className="text-gray-400 dark:text-[#4a7ab5] hover:text-gray-600 dark:hover:text-white transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Right controls */}
        <div className="flex items-center gap-2 px-3 h-full shrink-0">

          {/* View toggle */}
          <div
            role="group"
            aria-label="View mode"
            className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-[#1e3a5f]/30 text-sm shrink-0"
          >
            {(['week', 'day'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                aria-pressed={viewMode === mode}
                className={[
                  'px-3 py-1.5 capitalize transition-colors text-xs',
                  viewMode === mode
                    ? 'bg-[#003594] text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-[#4a7ab5] dark:hover:bg-[#1e3a5f]/25 dark:hover:text-white',
                ].join(' ')}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* New Activity */}
          <button
            onClick={onAddEvent}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-[#1e3a5f]/30 px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-[#4a7ab5] hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#1e3a5f]/25 dark:hover:text-white transition-colors shrink-0"
          >
            <Plus width={12} height={12} />
            <span className="hidden sm:inline">New Activity</span>
            <kbd className="text-[9px] text-gray-400 dark:text-[#484f58] bg-gray-100 dark:bg-[#0a1520] border border-gray-200 dark:border-[#1e3a5f]/30 px-1 rounded hidden sm:inline">
              N
            </kbd>
          </button>

          {/* Theme toggle - inline light/dark button */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="flex items-center justify-center h-7 w-7 rounded-lg border border-gray-200 dark:border-[#1e3a5f]/30 text-gray-400 dark:text-[#4a7ab5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 transition-colors"
          >
            {theme === 'dark'
              ? <SunLight width={14} height={14} />
              : <HalfMoon width={14} height={14} />}
          </button>

          {/* Collaborator avatars */}
          {collaborators.length > 0 && (
            <div className="flex items-center shrink-0">
              {collaborators.map((collab, index) => {
                const dayLabel = tripDays.find((d) => d.dayIndex === (collab.selectedDayIndex ?? 0))?.label ?? ''
                const viewLabel = collab.currentView === 'day' ? 'Day view' : 'Week view'
                return (
                  <div
                    key={collab.userId}
                    className="group relative flex items-center justify-center h-7 w-7 rounded-full text-[11px] font-semibold text-white select-none ring-2 ring-white dark:ring-[#0a1520]"
                    style={{
                      backgroundColor: collab.color,
                      opacity: collab.isOnline ? 1 : 0.45,
                      marginLeft: index === 0 ? 0 : '-8px',
                      zIndex: collaborators.length - index,
                    }}
                  >
                    {collab.avatarInitial}
                    <span
                      className={[
                        'absolute bottom-0 right-0 h-2 w-2 rounded-full ring-1 ring-white dark:ring-[#0a1520]',
                        collab.isOnline ? 'bg-green-500' : 'bg-gray-500',
                      ].join(' ')}
                    />
                    {/* Hover tooltip */}
                    <div className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-50 hidden group-hover:flex flex-col gap-0.5 bg-white dark:bg-[#0f1a28] border border-gray-200 dark:border-[#1e3a5f]/40 rounded-lg shadow-md px-2.5 py-2 min-w-[120px] whitespace-nowrap">
                      <span className="text-xs font-semibold text-gray-800 dark:text-[#f5efe8]">{collab.name}</span>
                      <span className="text-[10px] text-gray-400 dark:text-[#4a7ab5]">
                        {viewLabel}{dayLabel ? ` \u00b7 ${dayLabel}` : ''}
                      </span>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-200 dark:border-t-[#1e3a5f]/40" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Share */}
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#D97706] transition-colors shrink-0"
          >
            <ShareAndroid width={12} height={12} />
            Share
          </button>

          {/* Avatar dropdown */}
          <div className="relative" ref={avatarRef}>
            <button
              onClick={() => setAvatarDropdownOpen((o) => !o)}
              className="rounded-full hover:ring-2 hover:ring-[#1e3a5f]/20 transition-all"
            >
              <AvatarCircle />
            </button>

            {avatarDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#0f1a28] rounded-xl shadow-xl border border-gray-100 dark:border-[#1e3a5f]/30 py-1.5 z-50">
                {/* User info */}
                <div className="px-3 py-2 border-b border-gray-100 dark:border-[#1e3a5f]/20">
                  <div className="flex items-center gap-2.5">
                    <AvatarCircle size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-[#f5efe8] truncate">
                        {displayName || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-[#4a7ab5] truncate">{email}</p>
                    </div>
                  </div>
                </div>
                <div className="py-0.5">
                  <Link
                    href="/profile"
                    onClick={() => setAvatarDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 transition-colors"
                  >
                    <User width={15} height={15} className="text-gray-400" />
                    Your Profile
                  </Link>
                  <Link
                    href="/profile/settings"
                    onClick={() => setAvatarDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 transition-colors"
                  >
                    <Settings width={15} height={15} className="text-gray-400" />
                    Settings
                  </Link>
                </div>
                <div className="border-t border-gray-100 dark:border-[#1e3a5f]/20 py-1">
                  <button
                    onClick={onToggleTheme}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-700 dark:text-[#cdd9e5] hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      {theme === 'dark'
                        ? <HalfMoon width={15} height={15} className="text-gray-400" />
                        : <SunLight width={15} height={15} className="text-gray-400" />}
                      {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </span>
                  </button>
                </div>
                <div className="border-t border-gray-100 dark:border-[#1e3a5f]/20 py-0.5">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                  >
                    <LogOut width={15} height={15} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
