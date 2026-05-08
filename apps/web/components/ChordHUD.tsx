'use client'

import { useCommandRegistry } from '@/stores/commandRegistry'
import { AnimatePresence, motion } from 'motion/react'

export function ChordHUD() {
  const chordBuffer = useCommandRegistry((s) => s.chordBuffer)
  const chordActive = useCommandRegistry((s) => s.chordActive)

  return (
    <AnimatePresence>
      {chordActive && chordBuffer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.15 }}
          className="fixed bottom-4 left-4 z-50 pointer-events-none"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/90 dark:bg-gray-100/90 backdrop-blur-sm rounded-lg shadow-lg">
            <span className="text-xs font-mono text-white dark:text-gray-900 font-semibold">
              {chordBuffer}...
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
