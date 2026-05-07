'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: string
  children: React.ReactNode
}

export function Tooltip({ content, children }: TooltipProps) {
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLElement>) => {
    clearTimer()
    const target = e.currentTarget
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) return
      const rect = target.getBoundingClientRect()
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      })
    }, 300)
  }, [clearTimer])

  const handleMouseLeave = useCallback(() => {
    clearTimer()
    setTooltipPosition(null)
  }, [clearTimer])

  return (
    <>
      {/* Keyframe for tooltip fade-in animation */}
      <style>{`
        @keyframes tooltip-fade-in {
          from { opacity: 0; transform: translate(-50%, -100%) translateY(0px); }
          to   { opacity: 1; transform: translate(-50%, -100%) translateY(-4px); }
        }
      `}</style>

      <span
        className="inline-flex"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </span>

      {tooltipPosition &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-800 px-2 py-1 text-xs text-white shadow-lg"
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y}px`,
              transform: 'translate(-50%, -100%) translateY(-4px)',
              opacity: 0,
              animation: 'tooltip-fade-in 200ms ease forwards',
            }}
          >
            {content}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 dark:border-t-gray-800"
            />
          </div>,
          document.body
        )}
    </>
  )
}
