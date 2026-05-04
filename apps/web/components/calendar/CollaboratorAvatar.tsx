'use client'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { UserAwareness } from './types'

interface CollaboratorAvatarProps {
  collaborator: UserAwareness
  index: number
  totalCollaborators: number
  dayLabel: string
}

export function CollaboratorAvatar({ collaborator, index, totalCollaborators, dayLabel }: CollaboratorAvatarProps) {
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const viewLabel = collaborator.currentView === 'day' ? 'Day view' : 'Week view'

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    })
  }

  const handleMouseLeave = () => {
    setTooltipPosition(null)
  }

  return (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="group relative flex items-center justify-center h-7 w-7 overflow-hidden rounded-full text-[11px] font-semibold text-white select-none ring-2 ring-white dark:ring-cal-bg cursor-pointer"
        style={{
          backgroundColor: collaborator.color,
          opacity: collaborator.isOnline ? 1 : 0.45,
          marginLeft: index === 0 ? 0 : '-8px',
          zIndex: totalCollaborators - index,
        }}
      >
        {collaborator.avatarUrl ? (
          <img
            src={collaborator.avatarUrl}
            alt={collaborator.name}
            className="h-full w-full object-cover"
          />
        ) : (
          collaborator.avatarInitial
        )}
        <span
          className={[
            'absolute bottom-0 right-0 h-2 w-2 rounded-full ring-1 ring-white dark:ring-cal-bg',
            collaborator.isOnline ? 'bg-green-500' : 'bg-gray-500',
          ].join(' ')}
        />
      </div>

      {/* Render tooltip via portal to escape overflow containers */}
      {tooltipPosition &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[100] flex flex-col gap-0.5 bg-white dark:bg-cal-surface-elevated border border-gray-200 dark:border-cal-border rounded-lg shadow-md px-2.5 py-2 min-w-[120px] whitespace-nowrap"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <span className="text-xs font-semibold text-gray-800 dark:text-cal-text">{collaborator.name}</span>
            <span className="text-[10px] text-gray-400 dark:text-cal-text-secondary">
              {viewLabel}
              {dayLabel ? ` · ${dayLabel}` : ''}
            </span>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-200 dark:border-t-cal-border" />
          </div>,
          document.body
        )}
    </>
  )
}
