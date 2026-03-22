import { useEffect } from 'react'
import type { Command } from '../types'

export function useKeyboardShortcuts(
  commands: Command[],
  isPaletteOpen: boolean,
  onClosePalette: () => void,
  onDeselect: () => void,
  hasMarqueeSelection?: boolean,
  onClearMarquee?: () => void,
): void {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true'

      // Escape is always handled, even inside inputs
      if (e.key === 'Escape') {
        e.preventDefault()
        if (isPaletteOpen) {
          onClosePalette()
        } else if (hasMarqueeSelection && onClearMarquee) {
          onClearMarquee()
        } else if (commands.some((c) => c.id === 'delete' && c.isEnabled)) {
          // 'delete' command is only enabled when an activity is selected
          onDeselect()
        }
        return
      }

      // Skip all other shortcuts when focus is in a text input
      if (isInput) return

      // Find matching enabled command
      const match = commands.find((cmd) => {
        if (!cmd.shortcut || !cmd.isEnabled) return false
        // delete command also fires on Backspace
        const keyMatch =
          e.key === cmd.shortcut.key ||
          (cmd.id === 'delete' && e.key === 'Backspace')
        const metaMatch = !!cmd.shortcut.meta === (e.ctrlKey || e.metaKey)
        const shiftMatch = !!cmd.shortcut.shift === e.shiftKey
        return keyMatch && metaMatch && shiftMatch
      })

      if (match) {
        e.preventDefault()
        match.execute()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [commands, isPaletteOpen, onClosePalette, onDeselect, hasMarqueeSelection, onClearMarquee])
}
