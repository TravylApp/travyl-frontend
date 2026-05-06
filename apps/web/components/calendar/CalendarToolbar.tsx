'use client'
import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Plus, ShareAndroid, Clock, MagicWand, Calendar } from 'iconoir-react'
import type { Trip } from '@travyl/shared'
import { useAuthStore, useProfile } from '@travyl/shared'
import type { ViewMode, UserAwareness, CalendarActivity } from './types'
import type { Command } from './types'
import { useEffectivePermission } from './providers/TripPermissionContext'
import { RescoperPopover } from './RescoperPopover'
import { UnscheduledPopover } from './UnscheduledPopover'
import { CollaboratorAvatar } from './CollaboratorAvatar'

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

function getInitials(name: string | undefined): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
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
    <div ref={menuRef} className="flex items-center h-full px-1">
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
                  ? 'bg-gray-100 dark:bg-cal-accent-bg text-gray-900 dark:text-cal-text'
                  : hasEnabled
                  ? 'text-gray-700 dark:text-cal-text hover:bg-gray-50 dark:hover:bg-cal-accent-bg/60'
                  : 'text-gray-400 dark:text-cal-text-secondary hover:bg-gray-50 dark:hover:bg-cal-accent-bg/60',
              ].join(' ')}
            >
              {MENU_LABELS[group]}
            </button>

            {isOpen && (
              <div className="absolute top-[calc(100%+2px)] left-0 z-50 w-56 bg-white dark:bg-cal-surface-elevated border border-gray-200 dark:border-cal-border rounded-xl shadow-xl py-1 overflow-hidden">
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
                          : 'text-gray-700 dark:text-cal-text hover:bg-gray-50 dark:hover:bg-cal-accent-bg/60'
                        : 'text-gray-400 dark:text-cal-text-tertiary cursor-default pointer-events-none',
                    ].join(' ')}
                  >
                    <span>{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="text-[10px] text-gray-400 dark:text-cal-text-tertiary bg-gray-100 dark:bg-cal-bg border border-gray-200 dark:border-cal-border px-1.5 py-0.5 rounded ml-4 shrink-0">
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
  const user = useAuthStore((s) => s.user)
  const { data: profile } = useProfile()
  const [rescoperOpen, setRescoperOpen] = useState(false)
  const [unscheduledOpen, setUnscheduledOpen] = useState(false)
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name
  const initials = getInitials(displayName)

  return (
    <div className="flex flex-col shrink-0">
      {/* Connection status banner */}
      {/* Connection banner — only show after 3s to avoid flash on initial load */}
      {connectionStatus !== 'connected' && typeof window !== 'undefined' && performance.now() > 3000 && (
        <div className="flex items-center justify-center gap-2 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-1.5 text-xs text-yellow-600 dark:text-yellow-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
          {connectionStatus === 'reconnecting'
            ? 'Reconnecting\u2026'
            : 'Offline \u2014 changes saved locally'}
        </div>
      )}

      {/* Main toolbar row */}
      <div className="flex items-center h-11 bg-white/70 dark:bg-cal-surface-elevated/80 backdrop-blur-xl shrink-0"
        style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.04)' }}>

        {/* User avatar — visible on trip pages (GlobalNavbar is hidden) */}
        {!isSharedView && user && (
          <div className="flex items-center px-3 h-full shrink-0">
            <div className="h-7 w-7 flex items-center justify-center rounded-full overflow-hidden bg-[#1e3a5f] text-white font-medium text-[11px]">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName || 'User'} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
          </div>
        )}

        {/* Menu bar */}
        <TripMenuBar commands={commands} />

        {/* Trip info */}
        <div className="relative flex flex-col justify-center px-4 h-full shrink-0 min-w-0">
          <span className="truncate text-[13px] font-serif font-normal tracking-wide text-trip-base dark:text-cal-text leading-tight">
            {tripName}
          </span>
          {canEdit ? (
            <button
              onClick={() => setRescoperOpen((v) => !v)}
              className="text-[10px] text-cal-text-secondary leading-tight hover:text-primary dark:hover:text-cal-text transition-colors text-left"
              aria-label="Edit trip dates and destination"
            >
              {dateRange}
            </button>
          ) : (
            <span className="text-[10px] text-cal-text-secondary leading-tight">{dateRange}</span>
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
              className="flex items-center gap-2 px-3 h-full shrink-0"
            >
              <div className="w-2 h-2 rounded-sm bg-blue-500 shrink-0" />
              <span className="text-[12px] text-gray-700 dark:text-cal-text truncate max-w-[140px]">
                {selectedActivity.title || 'Untitled'}
              </span>
              <button
                onClick={onDeselect}
                aria-label="Deselect activity"
                className="text-gray-400 dark:text-cal-text-secondary hover:text-gray-600 dark:hover:text-cal-text transition-colors"
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
            className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-cal-border text-sm shrink-0"
          >
            {(['week', 'day'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onViewModeChange(mode)}
                aria-pressed={viewMode === mode}
                className={[
                  'px-3 py-1.5 capitalize transition-colors text-xs',
                  viewMode === mode
                    ? 'bg-primary text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-cal-text-secondary dark:hover:bg-cal-accent-bg/80 dark:hover:text-cal-text',
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
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-cal-border px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-cal-text-secondary hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-cal-accent-bg/80 dark:hover:text-cal-text transition-colors shrink-0"
            >
              <Plus width={12} height={12} />
              <span className="hidden sm:inline">New Activity</span>
              <kbd className="text-[9px] text-gray-400 dark:text-cal-text-tertiary bg-gray-100 dark:bg-cal-bg border border-gray-200 dark:border-cal-border px-1 rounded hidden sm:inline">
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
              className="p-1.5 rounded-lg text-gray-500 dark:text-cal-text-secondary hover:bg-gray-100 dark:hover:bg-cal-accent-bg transition-colors"
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
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-500 dark:text-cal-text-secondary hover:bg-gray-100 dark:hover:bg-cal-accent-bg',
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
                  ? 'text-cal-accent bg-cal-accent/10'
                  : 'text-gray-500 dark:text-cal-text-secondary hover:bg-gray-100 dark:hover:bg-cal-accent-bg',
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
                return (
                  <CollaboratorAvatar
                    key={collab.userId}
                    collaborator={collab}
                    index={index}
                    totalCollaborators={collaborators.length}
                    dayLabel={dayLabel}
                  />
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
                  ? 'bg-gray-100 dark:bg-cal-accent-bg/60 text-gray-400 dark:text-cal-text-secondary cursor-not-allowed'
                  : 'border border-primary/30 text-primary dark:text-cal-text-secondary hover:bg-primary/5 dark:hover:bg-cal-accent-bg/60',
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
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors shrink-0"
            >
              <ShareAndroid width={12} height={12} />
              Share
            </button>
          )}

          {/* Shared view indicator */}
          {isSharedView && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-cal-accent-bg/60">
              <span className="text-xs text-gray-500 dark:text-cal-text-secondary">Viewing</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
