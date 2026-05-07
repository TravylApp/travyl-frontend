'use client'

import { PanelRight, PanelRightClose } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'

interface CalendarTopBarProps {
  /** What the calendar is currently showing — e.g. "Jun 1 – 7" or "Wed, Jun 5". */
  viewLabel: string
  /** Number of scheduled activities in the visible range. */
  activityCount: number
  viewMode: 'week' | 'day'
  onViewModeChange: (mode: 'week' | 'day') => void
  onWeekChange: (direction: -1 | 1) => void
  onToday: () => void
  panelCollapsed: boolean
  onTogglePanel: () => void
}

export function CalendarTopBar({
  viewLabel,
  activityCount,
  viewMode,
  onViewModeChange,
  onWeekChange,
  onToday,
  panelCollapsed,
  onTogglePanel,
}: CalendarTopBarProps) {
  return (
    <div className="flex items-center px-4 py-2 border-b border-[var(--cal-border)] bg-[var(--cal-surface)]">
      {/* Left: Current view context (date range + activity density) */}
      <div className="flex items-baseline gap-2 min-w-0">
        <h2 className="text-sm font-semibold text-[var(--cal-text)] truncate">{viewLabel}</h2>
        <span className="text-xs text-[var(--cal-text-tertiary)] hidden sm:inline truncate">
          {activityCount === 0
            ? 'Nothing scheduled'
            : `${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`}
        </span>
      </div>

      {/* Right: Week navigation + view toggle + panel collapse */}
      <div className="ml-auto flex items-center gap-3">
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

        {/* Panel collapse toggle */}
        <Tooltip content={panelCollapsed ? 'Show side panel' : 'Hide side panel'}>
          <button
            onClick={onTogglePanel}
            aria-label={panelCollapsed ? 'Show side panel' : 'Hide side panel'}
            aria-expanded={!panelCollapsed}
            className="p-1.5 rounded-md hover:bg-[var(--cal-accent-bg)] text-[var(--cal-text-secondary)] hover:text-[var(--cal-text)] transition-colors"
          >
            {panelCollapsed
              ? <PanelRight width={16} height={16} />
              : <PanelRightClose width={16} height={16} />}
          </button>
        </Tooltip>
      </div>
    </div>
  )
}
