'use client'
import { NavArrowLeft, Plus, ShareAndroid, MoreHoriz } from 'iconoir-react'
import type { ViewMode, UserAwareness } from './types'
import { ThemeToggle } from './ThemeToggle'
import type { CalendarTheme } from './hooks/useCalendarTheme'

interface CalendarHeaderProps {
  tripName: string
  dateRange: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onBack: () => void
  onAddEvent: () => void
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
  collaborators: UserAwareness[]
  onShare: () => void
  theme: CalendarTheme
  onToggleTheme: () => void
}

export function CalendarHeader({
  tripName,
  dateRange,
  viewMode,
  onViewModeChange,
  onBack,
  onAddEvent,
  connectionStatus,
  collaborators,
  onShare,
  theme,
  onToggleTheme,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col shrink-0">
      {/* Connection status banner */}
      {connectionStatus !== 'connected' && (
        <div className="flex items-center justify-center gap-2 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          {connectionStatus === 'reconnecting'
            ? 'Reconnecting to collaboration server…'
            : 'Disconnected — changes may not sync'}
        </div>
      )}

      {/* Single-row header */}
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-[#1e3a5f]/30 bg-white dark:bg-[#0f1a28] px-4 py-3">
        {/* Back button */}
        <button
          onClick={onBack}
          aria-label="Back"
          className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 dark:text-[#4a7ab5] hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#1e3a5f]/25 dark:hover:text-white transition-colors shrink-0"
        >
          <NavArrowLeft width={16} height={16} aria-hidden="true" />
        </button>

        {/* Trip name + date range */}
        <div className="flex flex-col min-w-0 shrink-0">
          <span className="truncate text-[15px] font-serif font-normal text-[#1e3a5f] dark:text-[#f5efe8] leading-tight">
            {tripName}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-[#4a7ab5] leading-tight">{dateRange}</span>
        </div>

        {/* Vertical divider */}
        <div className="w-px h-6 bg-gray-200 dark:bg-[#1e3a5f]/30 shrink-0" />

        {/* Week / Day segmented toggle */}
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
                'px-3 py-1.5 capitalize transition-colors',
                viewMode === mode
                  ? 'bg-[#003594] text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-[#4a7ab5] dark:hover:bg-[#1e3a5f]/25 dark:hover:text-white',
              ].join(' ')}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* + New Activity outlined button */}
        <button
          onClick={onAddEvent}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-[#1e3a5f]/30 px-3 py-1.5 text-sm font-medium text-gray-500 dark:text-[#4a7ab5] hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#1e3a5f]/25 dark:hover:text-white transition-colors shrink-0"
        >
          <Plus width={14} height={14} aria-hidden="true" />
          New Activity
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Theme toggle */}
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />

        {/* Collaborator avatars — inline, overlapping */}
        {collaborators.length > 0 && (
          <div className="flex items-center shrink-0" style={{ marginRight: '4px' }}>
            {collaborators.map((user, index) => (
              <div
                key={user.userId}
                title={user.name}
                className="relative flex items-center justify-center h-7 w-7 rounded-full text-[11px] font-semibold text-white select-none ring-2 ring-white dark:ring-[#0a1520]"
                style={{
                  backgroundColor: user.color,
                  opacity: user.isOnline ? 1 : 0.45,
                  marginLeft: index === 0 ? 0 : '-8px',
                  zIndex: collaborators.length - index,
                }}
              >
                {user.avatarInitial}
                {/* Online/offline dot */}
                <span
                  className={[
                    'absolute bottom-0 right-0 h-2 w-2 rounded-full ring-1 ring-white dark:ring-[#0a1520]',
                    user.isOnline ? 'bg-green-500' : 'bg-gray-500',
                  ].join(' ')}
                />
              </div>
            ))}
          </div>
        )}

        {/* Share button */}
        <button
          onClick={onShare}
          className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#D97706] transition-colors shrink-0"
        >
          <ShareAndroid width={14} height={14} aria-hidden="true" />
          Share
        </button>

        {/* More menu */}
        <button
          aria-label="More options"
          className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 dark:text-[#4a7ab5] hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-[#1e3a5f]/25 dark:hover:text-white transition-colors shrink-0"
        >
          <MoreHoriz width={16} height={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
