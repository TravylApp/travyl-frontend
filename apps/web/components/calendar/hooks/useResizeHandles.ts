'use client'

import { useRef, useState, useCallback } from 'react'
import { HOUR_HEIGHT } from '../constants'

interface UseResizeHandlesOptions {
  startHour: number
  duration: number
  timeRangeStartHour: number
  timeRangeEndHour: number
  onResize: (newStartHour: number, newDuration: number) => void
}

interface HandleProps {
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  onPointerCancel: (e: React.PointerEvent) => void
}

interface UseResizeHandlesReturn {
  isResizing: boolean
  previewStartHour: number | null
  previewDuration: number | null
  topHandleProps: HandleProps
  bottomHandleProps: HandleProps
}

type Edge = 'top' | 'bottom'

const MIN_DURATION = 0.25

function snap(value: number): number {
  return Math.round(value * 4) / 4
}

export function useResizeHandles({
  startHour,
  duration,
  timeRangeStartHour,
  timeRangeEndHour,
  onResize,
}: UseResizeHandlesOptions): UseResizeHandlesReturn {
  const [isResizing, setIsResizing] = useState(false)
  const [previewStartHour, setPreviewStartHour] = useState<number | null>(null)
  const [previewDuration, setPreviewDuration] = useState<number | null>(null)

  const edgeRef = useRef<Edge>('bottom')
  const startYRef = useRef(0)
  const origStartHourRef = useRef(0)
  const origDurationRef = useRef(0)
  const bottomEdgeRef = useRef(0)

  const computePreview = useCallback(
    (clientY: number) => {
      const deltaY = clientY - startYRef.current
      const deltaHours = snap(deltaY / HOUR_HEIGHT)

      if (edgeRef.current === 'top') {
        let newStart = origStartHourRef.current + deltaHours
        let newDuration = bottomEdgeRef.current - newStart

        newStart = Math.max(timeRangeStartHour, newStart)
        newDuration = bottomEdgeRef.current - newStart

        if (newDuration < MIN_DURATION) {
          newDuration = MIN_DURATION
          newStart = bottomEdgeRef.current - MIN_DURATION
        }

        setPreviewStartHour(newStart)
        setPreviewDuration(newDuration)
      } else {
        const rawDuration = origDurationRef.current + deltaHours
        const newDuration = Math.max(
          MIN_DURATION,
          Math.min(rawDuration, timeRangeEndHour - origStartHourRef.current),
        )

        setPreviewStartHour(origStartHourRef.current)
        setPreviewDuration(newDuration)
      }
    },
    [timeRangeStartHour, timeRangeEndHour],
  )

  const handlePointerDown = useCallback(
    (edge: Edge) => (e: React.PointerEvent) => {
      e.stopPropagation()
      e.nativeEvent.stopImmediatePropagation()
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

      edgeRef.current = edge
      startYRef.current = e.clientY
      origStartHourRef.current = startHour
      origDurationRef.current = duration
      bottomEdgeRef.current = startHour + duration

      setPreviewStartHour(startHour)
      setPreviewDuration(duration)
      setIsResizing(true)
    },
    [startHour, duration],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isResizing) return
      computePreview(e.clientY)
    },
    [isResizing, computePreview],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isResizing) return
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)

      computePreview(e.clientY)

      const deltaY = e.clientY - startYRef.current
      const deltaHours = snap(deltaY / HOUR_HEIGHT)

      let finalStart: number
      let finalDuration: number

      if (edgeRef.current === 'top') {
        finalStart = origStartHourRef.current + deltaHours
        finalDuration = bottomEdgeRef.current - finalStart
        finalStart = Math.max(timeRangeStartHour, finalStart)
        finalDuration = bottomEdgeRef.current - finalStart
        if (finalDuration < MIN_DURATION) {
          finalDuration = MIN_DURATION
          finalStart = bottomEdgeRef.current - MIN_DURATION
        }
      } else {
        finalStart = origStartHourRef.current
        const rawDuration = origDurationRef.current + deltaHours
        finalDuration = Math.max(
          MIN_DURATION,
          Math.min(rawDuration, timeRangeEndHour - origStartHourRef.current),
        )
      }

      onResize(finalStart, finalDuration)
      setPreviewStartHour(null)
      setPreviewDuration(null)
      setIsResizing(false)
    },
    [isResizing, computePreview, onResize, timeRangeStartHour, timeRangeEndHour],
  )

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (!isResizing) return
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      setPreviewStartHour(null)
      setPreviewDuration(null)
      setIsResizing(false)
    },
    [isResizing],
  )

  const topHandleProps: HandleProps = {
    onPointerDown: handlePointerDown('top'),
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  }

  const bottomHandleProps: HandleProps = {
    onPointerDown: handlePointerDown('bottom'),
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  }

  return {
    isResizing,
    previewStartHour,
    previewDuration,
    topHandleProps,
    bottomHandleProps,
  }
}
