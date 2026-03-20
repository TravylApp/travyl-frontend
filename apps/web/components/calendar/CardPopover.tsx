'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { getActivityColor } from '@travyl/shared/viewmodels/calendarViewModel'

interface PopoverAction {
  label: string
  onClick: () => void
  variant: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
  tooltip?: string
}

interface CardPopoverProps {
  anchorEl: HTMLElement | null
  isOpen: boolean
  onClose: () => void
  position: 'left' | 'right'
  image?: string | null
  title: string
  category: string
  rating?: number
  price?: string
  duration?: string
  description?: string
  actions: PopoverAction[]
}

const POPOVER_WIDTH = 280
const ARROW_SIZE = 8
const VIEWPORT_PADDING = 12

function computePosition(
  anchorEl: HTMLElement,
  preferredSide: 'left' | 'right',
): { top: number; left: number; side: 'left' | 'right' } {
  const rect = anchorEl.getBoundingClientRect()
  const anchorCenterY = rect.top + rect.height / 2

  let side = preferredSide
  if (preferredSide === 'left' && rect.left < POPOVER_WIDTH + VIEWPORT_PADDING + ARROW_SIZE) {
    side = 'right'
  } else if (preferredSide === 'right' && window.innerWidth - rect.right < POPOVER_WIDTH + VIEWPORT_PADDING + ARROW_SIZE) {
    side = 'left'
  }

  const left = side === 'left'
    ? rect.left - POPOVER_WIDTH - ARROW_SIZE
    : rect.right + ARROW_SIZE

  let top = anchorCenterY - 150
  top = Math.max(VIEWPORT_PADDING, Math.min(top, window.innerHeight - 400 - VIEWPORT_PADDING))

  return { top, left, side }
}

export function CardPopover({
  anchorEl,
  isOpen,
  onClose,
  position,
  image,
  title,
  category,
  rating,
  price,
  duration,
  description,
  actions,
}: CardPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; side: 'left' | 'right' } | null>(null)

  useEffect(() => {
    if (isOpen && anchorEl) {
      setPos(computePosition(anchorEl, position))
    }
  }, [isOpen, anchorEl, position])

  useEffect(() => {
    if (!isOpen) return
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen, onClose, anchorEl])

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Scroll to close — delay listener registration so layout-induced scrolls
  // (e.g. panel swaps) don't immediately close the popover
  useEffect(() => {
    if (!isOpen) return
    function handleScroll() {
      onClose()
    }
    const timer = setTimeout(() => {
      document.addEventListener('scroll', handleScroll, { capture: true })
    }, 100)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('scroll', handleScroll, { capture: true })
    }
  }, [isOpen, onClose])

  const tagColor = getActivityColor(category)

  return (
    <AnimatePresence>
      {isOpen && pos && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: POPOVER_WIDTH,
            zIndex: 100,
            transformOrigin: pos.side === 'left' ? 'right center' : 'left center',
          }}
          className="rounded-xl border border-[var(--cal-border)] bg-[var(--cal-surface-elevated)] shadow-xl overflow-hidden"
        >
          {/* Arrow */}
          <div
            className="absolute top-1/2 -translate-y-1/2"
            style={{
              [pos.side === 'left' ? 'right' : 'left']: -ARROW_SIZE,
              width: 0,
              height: 0,
              borderTop: `${ARROW_SIZE}px solid transparent`,
              borderBottom: `${ARROW_SIZE}px solid transparent`,
              [pos.side === 'left' ? 'borderLeft' : 'borderRight']: `${ARROW_SIZE}px solid var(--cal-surface-elevated)`,
            }}
          />

          {/* Image */}
          {image ? (
            <img
              src={image}
              alt=""
              className="w-full object-cover"
              style={{ height: 200 }}
              draggable={false}
            />
          ) : (
            <div
              className="w-full flex items-center justify-center text-white/60 text-3xl"
              style={{ height: 200, backgroundColor: tagColor }}
            >
              {category.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Content */}
          <div className="px-3 pt-2.5 pb-3">
            <h3 className="text-sm font-bold text-[var(--cal-text)] leading-tight">
              {title}
            </h3>

            <div className="flex items-center gap-1.5 mt-1.5">
              <span
                className="inline-flex text-[10px] font-semibold px-[6px] py-[1px] rounded"
                style={{
                  background: `${tagColor}30`,
                  color: tagColor,
                }}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </span>
              {duration && (
                <>
                  <span className="text-[10px] text-[var(--cal-text-tertiary)]">·</span>
                  <span className="text-[10px] text-[var(--cal-text-secondary)]">{duration}</span>
                </>
              )}
            </div>

            {(rating != null || price) && (
              <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                {rating != null && (
                  <span className="text-amber-500 font-semibold flex items-center gap-0.5">
                    ★ {rating}
                  </span>
                )}
                {price && (
                  <span className="text-[var(--cal-text-secondary)] font-medium">{price}</span>
                )}
              </div>
            )}

            {description && (
              <p className="text-[11px] text-[var(--cal-text-secondary)] mt-2 line-clamp-3 leading-relaxed">
                {description}
              </p>
            )}

            {actions.length > 0 && (
              <>
                <div className="border-t border-[var(--cal-border-light)] mt-2.5 mb-2" />
                <div className="flex justify-end gap-1.5">
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      onClick={(e) => {
                        e.stopPropagation()
                        action.onClick()
                      }}
                      disabled={action.disabled}
                      title={action.disabled ? action.tooltip : undefined}
                      className={[
                        'text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors',
                        action.variant === 'primary'
                          ? 'bg-[#003594] text-white hover:bg-[#002a7a] disabled:opacity-50 disabled:cursor-not-allowed'
                          : action.variant === 'danger'
                            ? 'text-[var(--cal-text-secondary)] hover:text-red-500 hover:bg-red-500/10'
                            : 'text-[var(--cal-text-secondary)] hover:text-[var(--cal-text)] hover:bg-[var(--cal-border-light)]',
                      ].join(' ')}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
