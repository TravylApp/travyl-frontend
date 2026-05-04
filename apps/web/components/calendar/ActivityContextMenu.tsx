'use client'

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'

export interface ContextMenuAction {
  id: string
  label: string
  disabled?: boolean
  danger?: boolean
  separator?: boolean
}

interface ActivityContextMenuProps {
  x: number
  y: number
  actions: ContextMenuAction[]
  onAction: (actionId: string) => void
  onClose: () => void
}

export function ActivityContextMenu({
  x,
  y,
  actions,
  onAction,
  onClose,
}: ActivityContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  // Filter out separators for keyboard navigation (memoized to avoid effect re-registration)
  const navigableActions = useMemo(
    () => actions.filter((a) => !a.separator && !a.disabled),
    [actions],
  )

  // Clamp menu to viewport
  const [position, setPosition] = useState({ top: y, left: x })

  useEffect(() => {
    const el = menuRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const clampedX = Math.min(x, window.innerWidth - rect.width - 8)
    const clampedY = Math.min(y, window.innerHeight - rect.height - 8)
    setPosition({ top: Math.max(8, clampedY), left: Math.max(8, clampedX) })
  }, [x, y])

  // Close on click outside, Escape, scroll
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < navigableActions.length - 1 ? prev + 1 : prev,
        )
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const action = navigableActions[highlightedIndex]
        if (action) {
          onAction(action.id)
          onClose()
        }
      }
    }
    const handleScroll = () => onClose()

    document.addEventListener('mousedown', handleClick, true)
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handleClick, true)
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('scroll', handleScroll, true)
    }
  }, [onClose, onAction, navigableActions, highlightedIndex])

  // Render via portal to escape EventBlock's overflow-hidden and transform stacking context
  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[160px] bg-white dark:bg-cal-surface-elevated rounded-lg border border-gray-200 dark:border-cal-border shadow-xl py-1 text-sm"
      style={position}
    >
      {actions.map((action, i) => {
        if (action.separator) {
          return (
            <div
              key={`sep-${i}`}
              className="h-px bg-gray-200 dark:bg-cal-accent-bg my-1"
            />
          )
        }

        const navIndex = navigableActions.indexOf(action)
        const isHighlighted = navIndex === highlightedIndex

        return (
          <button
            key={action.id}
            disabled={action.disabled}
            onClick={() => {
              if (!action.disabled) {
                onAction(action.id)
                onClose()
              }
            }}
            onMouseEnter={() => {
              if (!action.disabled) setHighlightedIndex(navIndex)
            }}
            className={[
              'w-full text-left px-3 py-1.5 transition-colors',
              action.disabled
                ? 'text-gray-400 dark:text-cal-text-tertiary cursor-default'
                : isHighlighted
                  ? 'bg-gray-100 dark:bg-cal-accent-bg'
                  : '',
              action.danger && !action.disabled
                ? 'text-red-500 dark:text-red-400'
                : action.disabled
                  ? ''
                  : 'text-gray-700 dark:text-cal-text',
            ].join(' ')}
          >
            {action.label}
          </button>
        )
      })}
    </div>,
    document.body,
  )
}
