'use client'
import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, ShareAndroid, Clock, MagicWand, Calendar } from 'iconoir-react'
import type { Trip } from '@travyl/shared'
import type { ViewMode, UserAwareness, CalendarActivity } from './types'
import type { Command } from './types'
import { useEffectivePermission } from './providers/TripPermissionContext'
import { RescoperPopover } from './RescoperPopover'
import { UnscheduledPopover } from './UnscheduledPopover'

// ─── TripMenuBar (inlined from TripNavbar) ──────────────────────

const MENU_GROUPS = ['edit', 'activity', 'view', 'insert'] as const
type MenuGroup = (typeof MENU_GROUPS)[number]

const MENU_LABELS: Record<MenuGroup, string> = {
  edit: 'Edit',
  activity: 'Activity',
  view: 'View',
  insert: 'Insert',
}

interface TripMenuBarProps {
  commands: Command[]
}

function TripMenuBar({ commands }: TripMenuBarProps) {
  const [openGroup, setOpenGroup] = useState<MenuGroup | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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
                        : 'text-gray-400 dark:text-[#484f58] cursor-default pointer-events-none',
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

// ─── CalendarToolbar ────────────────────────────────────────────

export interface CalendarToolbarProps {
  tripName: string
  dateRange: string
  commands: Command[]
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onAddEvent: () => void
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
  collaborators: UserAwareness[]
  onShare: () => void
  selectedActivity: CalendarActivity | null
  onDeselect: () => void
  tripDays: { dayIndex: number; label: string }[]
  trip: Trip | null
  scheduledActivities: CalendarActivity[]
  unscheduledActivities: CalendarActivity[]
  /** Same userId CalendarDashboard receives — threaded to RescoperPopover */
  userId: string
  onAssignUnscheduled: (id: string, dayOffset: number) => void
  onDeleteUnscheduled: (id: string) => void
  /** When true: read-only shared view — hides share and new activity controls */
  isSharedView?: boolean
  onOpenHistory?: () => void
  onFillGaps?: () => void
  isGapFilling?: boolean
  hasGhosts?: boolean
  hasGaps?: boolean
  /** Called when user clicks "Book My Trip" */
  onBookTrip?: () => void
  /** When true, shows "View Bookings" button */
  hasBookingMatches?: boolean
  /** When true, "Book My Trip" button is disabled (match run in progress) */
  isBookingInProgress?: boolean
  /** Called when user clicks "View Bookings" */
  onViewBookings?: () => void
  showEvents?: boolean
  onToggleEvents?: () => void
}

export function CalendarToolbar({
  tripName,
  dateRange,
  commands,
  viewMode,
  onViewModeChange,
  onAddEvent,
  connectionStatus,
  collaborators,
  onShare,
  selectedActivity,
  onDeselect,
  tripDays,
  trip,
  scheduledActivities,
  unscheduledActivities,
  userId,
  onAssignUnscheduled,
  onDeleteUnscheduled,
  isSharedView = false,
  onOpenHistory,
  onFillGaps,
  isGapFilling = false,
  hasGhosts = false,
  hasGaps = false,
  onBookTrip,
  hasBookingMatches = false,
  isBookingInProgress = false,
  onViewBookings,
  showEvents = true,
  onToggleEvents,
}: CalendarToolbarProps) {
  const { canEdit } = useEffectivePermission()
  const [rescoperOpen, setRescoperOpen] = useState(false)
  const [unscheduledOpen, setUnscheduledOpen] = useState(false)

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

      {/* Main toolbar row */}
      <div className="flex items-center h-11 border-b border-gray-200/60 dark:border-[#1e3a5f]/30 bg-white/70 dark:bg-[#0f1a28]/80 backdrop-blur-xl shrink-0">

        {/* Menu bar */}
        <TripMenuBar commands={commands} />

        {/* Trip info */}
        <div className="relative flex flex-col justify-center px-4 h-full border-r border-gray-200 dark:border-[#1e3a5f]/30 shrink-0 min-w-0">
          <span className="truncate text-[13px] font-serif font-normal tracking-wide text-[#1e3a5f] dark:text-[#f5efe8] leading-tight">
            {tripName}
          </span>
          {canEdit ? (
            <button
              onClick={() => setRescoperOpen((v) => !v)}
              className="text-[10px] text-[#4a7ab5] leading-tight hover:text-[#003594] dark:hover:text-[#f5efe8] transition-colors text-left"
              aria-label="Edit trip dates and destination"
            >
              {dateRange}
            </button>
          ) : (
            <span className="text-[10px] text-[#4a7ab5] leading-tight">{dateRange}</span>
          )}

          {rescoperOpen && trip && (
            <RescoperPopover
              trip={trip}
              userId={userId}
              scheduledActivities={scheduledActivities}
              onClose={() => setRescoperOpen(false)}
            />
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Selection indicator */}
        <AnimatePresence>
          {selectedActivity && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 px-3 h-full border-l border-gray-200 dark:border-[#1e3a5f]/30 shrink-0"
            >
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right controls */}
        <div className="flex items-center gap-2 px-3 h-full shrink-0">

          {/* Unscheduled activities pill */}
          {unscheduledActivities.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setUnscheduledOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 text-[11px] text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors shrink-0"
              >
                <span className="font-medium">{unscheduledActivities.length}</span>
                <span>unscheduled</span>
              </button>

              {unscheduledOpen && trip && (
                <UnscheduledPopover
                  activities={unscheduledActivities}
                  tripStartDate={new Date(trip.start_date + 'T00:00:00Z')}
                  tripEndDate={new Date(trip.end_date + 'T00:00:00Z')}
                  onAssign={onAssignUnscheduled}
                  onDelete={onDeleteUnscheduled}
                  onClose={() => setUnscheduledOpen(false)}
                />
              )}
            </div>
          )}

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
          {!isSharedView && (
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
          )}

          {/* Change history */}
          {onOpenHistory && !isSharedView && (
            <button
              onClick={onOpenHistory}
              title="Change history"
              aria-label="Change history"
              className="p-1.5 rounded-lg text-gray-500 dark:text-[#7a9cc0] hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/30 transition-colors"
            >
              <Clock className="w-4 h-4" />
            </button>
          )}

          {/* Events toggle */}
          {onToggleEvents && (
            <button
              onClick={onToggleEvents}
              title={showEvents ? 'Hide events' : 'Show events'}
              className={[
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                showEvents
                  ? 'bg-[#003594]/10 text-[#003594]'
                  : 'text-gray-500 dark:text-[#7a9cc0] hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/30',
              ].join(' ')}
            >
              <Calendar width={14} height={14} strokeWidth={1.5} />
              <span>Events</span>
            </button>
          )}

          {/* Magic wand — gap filler */}
          {!isSharedView && onFillGaps && (
            <button
              onClick={onFillGaps}
              disabled={isGapFilling || (!hasGaps && !hasGhosts)}
              title={
                isGapFilling
                  ? 'Finding suggestions…'
                  : hasGhosts
                  ? 'Clear suggestions'
                  : hasGaps
                  ? 'Fill day with AI suggestions'
                  : 'Day is fully scheduled'
              }
              aria-label="Fill day with AI suggestions"
              className={[
                'p-1.5 rounded-lg transition-colors',
                hasGhosts && !isGapFilling
                  ? 'text-[var(--cal-accent)] bg-[color-mix(in_srgb,var(--cal-accent)_12%,transparent)]'
                  : 'text-gray-500 dark:text-[#7a9cc0] hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/30',
                (isGapFilling || (!hasGaps && !hasGhosts)) ? 'opacity-40 cursor-not-allowed' : '',
              ].join(' ')}
            >
              {isGapFilling ? (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <MagicWand className="w-4 h-4" />
              )}
            </button>
          )}

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

          {/* Book My Trip */}
          {!isSharedView && onBookTrip && (
            <button
              onClick={isBookingInProgress ? undefined : onBookTrip}
              disabled={isBookingInProgress}
              className={[
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shrink-0',
                isBookingInProgress
                  ? 'bg-gray-100 dark:bg-[#1e3a5f]/20 text-gray-400 dark:text-[#4a7ab5] cursor-not-allowed'
                  : 'border border-[#003594]/30 text-[#003594] dark:text-[#4a7ab5] hover:bg-[#003594]/5 dark:hover:bg-[#1e3a5f]/20',
              ].join(' ')}
            >
              {isBookingInProgress ? 'Matching…' : 'Book My Trip'}
            </button>
          )}

          {/* View Bookings (appears once matches exist) */}
          {!isSharedView && hasBookingMatches && onViewBookings && (
            <button
              onClick={onViewBookings}
              className="flex items-center gap-1.5 rounded-lg border border-green-300 dark:border-green-700/40 bg-green-50 dark:bg-green-900/10 px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors shrink-0"
            >
              View Bookings
            </button>
          )}

          {/* Share */}
          {!isSharedView && (
            <button
              onClick={onShare}
              className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#D97706] transition-colors shrink-0"
            >
              <ShareAndroid width={12} height={12} />
              Share
            </button>
          )}

          {/* Shared view indicator */}
          {isSharedView && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-[#1e3a5f]/20">
              <span className="text-xs text-gray-500 dark:text-[#4a7ab5]">Viewing</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
