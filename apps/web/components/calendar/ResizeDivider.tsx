'use client'

import { useCallback, useRef } from 'react'

interface ResizeDividerProps {
  width: number
  onDragStart: () => void
  onDrag: (deltaX: number) => void
  onDragEnd: () => void
}

export function ResizeDivider({ width, onDragStart, onDrag, onDragEnd }: ResizeDividerProps) {
  const lastXRef = useRef(0)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      lastXRef.current = e.clientX
      onDragStart()

      const handlePointerMove = (ev: PointerEvent) => {
        const deltaX = ev.clientX - lastXRef.current
        lastXRef.current = ev.clientX
        onDrag(deltaX)
      }

      const handlePointerUp = () => {
        document.removeEventListener('pointermove', handlePointerMove)
        document.removeEventListener('pointerup', handlePointerUp)
        onDragEnd()
      }

      document.addEventListener('pointermove', handlePointerMove)
      document.addEventListener('pointerup', handlePointerUp)
    },
    [onDragStart, onDrag, onDragEnd],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onDrag(-20)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onDrag(20)
      }
    },
    [onDrag],
  )

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      className="w-[5px] shrink-0 cursor-col-resize relative group"
      style={{ touchAction: 'none' }}
    >
      {/* Visible handle line */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-cal-border group-hover:w-[3px] group-hover:bg-cal-accent transition-all rounded-full" />
      {/* Wider hit target */}
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  )
}
