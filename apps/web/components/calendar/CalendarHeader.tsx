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
  tripDays: { dayIndex: number; label: string }[]
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
  tripDays,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col shrink-0">
      {/* Connection status banner */}
      {connectionStatus !== 'connected' && (
        <div className="flex items-center justify-center gap-2 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-sm text-yellow-600">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          {connectionStatus === 'reconnecting'
            ? 'Reconnecting to collaboration server…'
            : 'Disconnected — changes may not sync'}
        </div>
      )}

      {/* Single-row header */}
      <div className="flex items-center gap-3 border-b border-[var(--cal-border)] bg-[var(--cal-surface-elevated)] px-4 py-3">
        {/* Back button */}
        <button
          onClick={onBack}
          aria-label="Back"
          className="flex items-center justify-center h-8 w-8 rounded-lg text-[var(--cal-nav-inactive)] hover:bg-[var(--cal-border-light)] hover:text-[var(--cal-text)] transition-colors shrink-0"
        >
          <NavArrowLeft width={16} height={16} aria-hidden="true" />
        </button>

        {/* Trip name + date range */}
        <div className="flex flex-col min-w-0 shrink-0">
          <span className="truncate text-[15px] font-serif font-normal text-[var(--cal-text)] leading-tight">
            {tripName}
          </span>
          <span className="text-[10px] text-[var(--cal-text-secondary)] leading-tight">{dateRange}</span>
        </div>

        {/* Vertical divider */}
        <div className="w-px h-6 bg-[var(--cal-border)] shrink-0" />

        {/* Week / Day segmented toggle */}
        <div
          role="group"
          aria-label="View mode"
          className="flex rounded-lg overflow-hidden border border-[var(--cal-border)] text-sm shrink-0"
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
                  : 'text-[var(--cal-text-secondary)] hover:bg-[var(--cal-border-light)] hover:text-[var(--cal-text)]',
              ].join(' ')}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* + New Activity outlined button */}
        <button
          onClick={onAddEvent}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--cal-border)] px-3 py-1.5 text-sm font-medium text-[var(--cal-text-secondary)] hover:bg-[var(--cal-border-light)] hover:text-[var(--cal-text)] transition-colors shrink-0"
        >
          <Plus width={14} height={14} aria-hidden="true" />
          New Activity
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Theme toggle */}
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />

        {/* Collaborator avatars — inline, overlapping, with hover tooltip */}
        {collaborators.length > 0 && (
          <div className="flex items-center shrink-0" style={{ marginRight: '4px' }}>
            {collaborators.map((user, index) => {
              const dayLabel = tripDays.find(
                (d) => d.dayIndex === (user.selectedDayIndex ?? 0),
              )?.label ?? ''
              const viewLabel =
                user.currentView === 'day' ? 'Day view' : 'Week view'
              return (
                <div
                  key={user.userId}
                  className="group relative flex items-center justify-center h-7 w-7 rounded-full text-[11px] font-semibold text-white select-none ring-2 ring-[var(--cal-surface)]"
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
                      'absolute bottom-0 right-0 h-2 w-2 rounded-full ring-1 ring-[var(--cal-surface)]',
                      user.isOnline ? 'bg-green-500' : 'bg-gray-500',
                    ].join(' ')}
                  />
                  {/* Hover tooltip */}
                  <div
                    className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-50 hidden group-hover:flex flex-col gap-0.5 bg-[var(--cal-surface-elevated)] border border-[var(--cal-border)] rounded-lg shadow-md px-2.5 py-2 min-w-[120px] whitespace-nowrap"
                  >
                    <span className="text-xs font-semibold text-[var(--cal-text)]">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-[var(--cal-text-secondary)]">
                      {viewLabel}{dayLabel ? ` · ${dayLabel}` : ''}
                    </span>
                    {/* Triangle pointer */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[var(--cal-border)]" />
                  </div>
                </div>
              )
            })}
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
          className="flex items-center justify-center h-8 w-8 rounded-lg text-[var(--cal-nav-inactive)] hover:bg-[var(--cal-border-light)] hover:text-[var(--cal-text)] transition-colors shrink-0"
        >
          <MoreHoriz width={16} height={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
