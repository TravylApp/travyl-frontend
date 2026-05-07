'use client'

import { Plus, ShareAndroid } from 'iconoir-react'
import { Tooltip } from '@/components/ui/tooltip'

interface CalendarTopBarProps {
  tripName: string
  dateRange: string
  viewMode: 'week' | 'day'
  onViewModeChange: (mode: 'week' | 'day') => void
  onWeekChange: (direction: -1 | 1) => void
  onToday: () => void
  onNewActivity: () => void
  onShare: () => void
}

export function CalendarTopBar({
  tripName,
  dateRange,
  viewMode,
  onViewModeChange,
  onWeekChange,
  onToday,
  onNewActivity,
  onShare,
}: CalendarTopBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--cal-border)] bg-[var(--cal-surface)]">
      {/* Left: Trip name + date range */}
      <div className="flex items-center gap-2 min-w-0">
        <h2 className="text-sm font-semibold text-[var(--cal-text)] truncate">{tripName}</h2>
        <span className="text-xs text-[var(--cal-text-tertiary)] hidden sm:inline">·</span>
        <span className="text-xs text-[var(--cal-text-tertiary)] hidden sm:inline truncate">{dateRange}</span>
      </div>

      {/* Center: Week navigation + view toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Tooltip content="Previous week">
            <button
              onClick={() => onWeekChange(-1)}
              className="p-1.5 rounded-md hover:bg-[var(--cal-nav-active-bg)] text-[var(--cal-nav-inactive)] transition-colors text-sm leading-none"
              aria-label="Previous week"
            >
              ‹
            </button>
          </Tooltip>
          <button
            onClick={onToday}
            className="px-2 py-1 text-xs font-medium text-[var(--cal-accent)] hover:bg-[var(--cal-accent-bg)] rounded-md transition-colors"
          >
            Today
          </button>
          <Tooltip content="Next week">
            <button
              onClick={() => onWeekChange(1)}
              className="p-1.5 rounded-md hover:bg-[var(--cal-nav-active-bg)] text-[var(--cal-nav-inactive)] transition-colors text-sm leading-none"
              aria-label="Next week"
            >
              ›
            </button>
          </Tooltip>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-[var(--cal-accent-bg)] rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange('week')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              viewMode === 'week'
                ? 'bg-[var(--cal-surface)] text-[var(--cal-text)] shadow-sm'
                : 'text-[var(--cal-text-secondary)] hover:text-[var(--cal-text)]'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onViewModeChange('day')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              viewMode === 'day'
                ? 'bg-[var(--cal-surface)] text-[var(--cal-text)] shadow-sm'
                : 'text-[var(--cal-text-secondary)] hover:text-[var(--cal-text)]'
            }`}
          >
            Day
          </button>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNewActivity}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003594] text-white text-xs font-medium rounded-lg hover:bg-[#002B7A] transition-colors"
        >
          <Plus width={14} height={14} />
          <span className="hidden sm:inline">New</span>
        </button>
        <Tooltip content="Share trip">
          <button
            onClick={onShare}
            className="p-1.5 rounded-md hover:bg-[var(--cal-accent-bg)] text-[var(--cal-text-secondary)] transition-colors"
            aria-label="Share"
          >
            <ShareAndroid width={16} height={16} />
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
