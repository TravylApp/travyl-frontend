'use client'
import type { ViewMode } from './types'

interface CalendarHeaderProps {
  tripName: string
  dateRange: string
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onBack: () => void
  onAddEvent: () => void
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
}

export function CalendarHeader({
  tripName,
  dateRange,
  viewMode,
  onViewModeChange,
  onBack,
  onAddEvent,
  connectionStatus,
}: CalendarHeaderProps) {
  return (
    <div className="flex flex-col shrink-0">
      {connectionStatus !== 'connected' && (
        <div className="flex items-center justify-center gap-2 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400">
          <span className="inline-block h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
          {connectionStatus === 'reconnecting'
            ? 'Reconnecting to collaboration server…'
            : 'Disconnected — changes may not sync'}
        </div>
      )}

      <div className="flex items-center gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
        {/* Back button */}
        <button
          onClick={onBack}
          aria-label="Back"
          className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10 3L5 8L10 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Trip name + date range */}
        <div className="flex flex-col min-w-0">
          <span className="truncate text-sm font-semibold text-white leading-tight">
            {tripName}
          </span>
          <span className="text-xs text-gray-400 leading-tight">{dateRange}</span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Day / Week toggle */}
        <div
          role="group"
          aria-label="View mode"
          className="flex rounded-lg overflow-hidden border border-white/10 text-sm"
        >
          {(['week', 'day'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              aria-pressed={viewMode === mode}
              className={[
                'px-3 py-1.5 capitalize transition-colors',
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Add event button */}
        <button
          onClick={onAddEvent}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M7 2V12M2 7H12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          Add
        </button>
      </div>
    </div>
  )
}
