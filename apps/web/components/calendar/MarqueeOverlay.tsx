'use client'
import { useRef, useCallback, useEffect, useState } from 'react'
import type { MarqueeRect } from './hooks/useMarqueeSelection'

interface MarqueeOverlayProps {
  gridRef: React.RefObject<HTMLDivElement | null>
  onStartMarquee: (x: number, y: number, containerRect: DOMRect) => void
  onUpdateMarquee: (x: number, y: number) => void
  onEndMarquee: () => void
  marqueeRect: MarqueeRect | null
}

const DRAG_THRESHOLD = 5

export function MarqueeOverlay({
  gridRef,
  onStartMarquee,
  onUpdateMarquee,
  onEndMarquee,
  marqueeRect,
}: MarqueeOverlayProps) {
  const isDragging = useRef(false)
  const anchorScreen = useRef<{ x: number; y: number } | null>(null)
  const [shiftHeld, setShiftHeld] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setShiftHeld(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!e.shiftKey) return
      const target = e.target as HTMLElement
      if (target !== e.currentTarget) return

      e.preventDefault()
      anchorScreen.current = { x: e.clientX, y: e.clientY }
    },
    [],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!anchorScreen.current) return

      const grid = gridRef.current
      if (!grid) return

      const dx = Math.abs(e.clientX - anchorScreen.current.x)
      const dy = Math.abs(e.clientY - anchorScreen.current.y)

      if (!isDragging.current) {
        if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return
        isDragging.current = true
        const gridRect = grid.getBoundingClientRect()
        const scrollLeft = grid.scrollLeft
        const scrollTop = grid.scrollTop
        const startX = anchorScreen.current.x - gridRect.left + scrollLeft
        const startY = anchorScreen.current.y - gridRect.top + scrollTop
        onStartMarquee(startX, startY, gridRect)
      }

      const gridRect = grid.getBoundingClientRect()
      const scrollLeft = grid.scrollLeft
      const scrollTop = grid.scrollTop
      const currentX = e.clientX - gridRect.left + scrollLeft
      const currentY = e.clientY - gridRect.top + scrollTop
      onUpdateMarquee(currentX, currentY)
    },
    [gridRef, onStartMarquee, onUpdateMarquee],
  )

  const handleMouseUp = useCallback(() => {
    if (isDragging.current) {
      onEndMarquee()
    }
    isDragging.current = false
    anchorScreen.current = null
  }, [onEndMarquee])

  const rectStyle = marqueeRect
    ? {
        left: Math.min(marqueeRect.startX, marqueeRect.endX),
        top: Math.min(marqueeRect.startY, marqueeRect.endY),
        width: Math.abs(marqueeRect.endX - marqueeRect.startX),
        height: Math.abs(marqueeRect.endY - marqueeRect.startY),
      }
    : null

  return (
    <>
      <div
        className={[
          'absolute inset-0 z-20',
          shiftHeld ? 'cursor-crosshair' : '',
        ].join(' ')}
        style={{ pointerEvents: shiftHeld ? 'auto' : 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      {rectStyle && (
        <div
          className="absolute border border-blue-500/50 bg-blue-500/10 pointer-events-none z-30 rounded-sm"
          style={rectStyle}
        />
      )}
    </>
  )
}
