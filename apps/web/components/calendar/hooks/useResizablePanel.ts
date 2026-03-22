'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FOR_YOU_PANEL_MIN_WIDTH,
  FOR_YOU_PANEL_MAX_WIDTH,
  FOR_YOU_PANEL_DEFAULT_WIDTH,
  FOR_YOU_PANEL_3COL_BREAKPOINT,
} from '../constants'

const STORAGE_KEY = 'travyl:forYouPanelWidth'

function getStoredWidth(): number {
  if (typeof window === 'undefined') return FOR_YOU_PANEL_DEFAULT_WIDTH
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return FOR_YOU_PANEL_DEFAULT_WIDTH
  const num = parseInt(stored, 10)
  if (isNaN(num)) return FOR_YOU_PANEL_DEFAULT_WIDTH
  return Math.max(FOR_YOU_PANEL_MIN_WIDTH, Math.min(FOR_YOU_PANEL_MAX_WIDTH, num))
}

export function useResizablePanel() {
  const [width, setWidth] = useState(getStoredWidth)
  const [columnCount, setColumnCount] = useState(width >= FOR_YOU_PANEL_3COL_BREAKPOINT ? 3 : 2)
  const [isDragging, setIsDragging] = useState(false)
  const panelRef = useRef<HTMLElement>(null)

  // Persist width and update column count
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width))
    setColumnCount(width >= FOR_YOU_PANEL_3COL_BREAKPOINT ? 3 : 2)
  }, [width])

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleDrag = useCallback((deltaX: number) => {
    // Dragging left (negative deltaX) = wider panel
    setWidth((prev) => {
      const next = prev - deltaX
      return Math.max(FOR_YOU_PANEL_MIN_WIDTH, Math.min(FOR_YOU_PANEL_MAX_WIDTH, next))
    })
  }, [])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  return {
    width,
    columnCount,
    isDragging,
    panelRef,
    handleDragStart,
    handleDrag,
    handleDragEnd,
  }
}
