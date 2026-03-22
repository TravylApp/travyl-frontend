'use client'

import { motion } from 'motion/react'
import { Plus, Xmark } from 'iconoir-react'
import type { PackingSuggestion } from '@travyl/shared'

interface SuggestionChipProps {
  suggestion: PackingSuggestion
  onAccept: (id: string) => void
  onDismiss: (id: string) => void
}

export function SuggestionChip({ suggestion, onAccept, onDismiss }: SuggestionChipProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="group flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg border border-dashed border-[var(--cal-border)] bg-[var(--cal-surface)]/50 hover:bg-[var(--cal-surface)] transition-colors duration-150"
    >
      {/* Accept button */}
      <button
        onClick={() => onAccept(suggestion.id)}
        className="shrink-0 w-5 h-5 rounded-[4px] border border-[var(--cal-border)] flex items-center justify-center text-[var(--cal-text-muted)] hover:border-[#003594] hover:text-[#003594] transition-colors duration-150"
        aria-label="Accept suggestion"
      >
        <Plus width={12} height={12} />
      </button>

      {/* Name + reason */}
      <div className="flex-1 min-w-0">
        <span className="text-sm text-[var(--cal-text)]">{suggestion.name}</span>
        <p className="text-[11px] text-[var(--cal-text-muted)] truncate">{suggestion.reason}</p>
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(suggestion.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[var(--cal-text-muted)] hover:text-red-500"
        aria-label="Dismiss suggestion"
      >
        <Xmark width={14} height={14} />
      </button>
    </motion.div>
  )
}
