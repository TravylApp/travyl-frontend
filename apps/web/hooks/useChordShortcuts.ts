'use client'

import { useEffect, useRef } from 'react'
import { useCommandRegistry } from '@/stores/commandRegistry'

const CHORD_TIMEOUT_MS = 500
const CHORD_PREFIX_KEYS = new Set(['g'])  // Only 'g' prefix activates chord mode

export function useChordShortcuts() {
  const pushChord = useCommandRegistry((s) => s.pushChord)
  const clearChord = useCommandRegistry((s) => s.clearChord)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // SSR guard — only runs in browser
      if (typeof window === 'undefined') return

      // Skip if focus is in an input/textarea/contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // Skip if Spotlight is open (check data attribute set by SpotlightSearch)
      if (document.querySelector('[data-spotlight-open="true"]')) {
        clearChordWithTimeout()
        return
      }

      // Escape clears chord buffer
      if (e.key === 'Escape') {
        clearChordWithTimeout()
        return
      }

      // Only 'g' prefix starts a chord sequence (avoids conflicts with calendar shortcuts like T, D, W)
      if (e.key === 'g') {
        pushChord('g')
        startTimeout()
        return
      }

      // If chord mode is active, accept second key
      if (isChordActive() && (e.key.length === 1 || e.key === '+')) {
        const match = pushChord(e.key.toLowerCase())
        if (match) {
          // Chord matched — execute and clear
          clearChordWithTimeout()
          match.execute()
        } else {
          // Either matched fully (already handled above) or no match — clear
          clearChordWithTimeout()
        }
      }
    }

    function isChordActive(): boolean {
      return useCommandRegistry.getState().chordActive
    }

    function startTimeout() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        clearChordWithTimeout()
      }, CHORD_TIMEOUT_MS)
    }

    function clearChordWithTimeout() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = null
      clearChord()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [pushChord, clearChord])
}
