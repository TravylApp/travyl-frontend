'use client'

import { motion } from 'motion/react'
import { Plus, X, Shirt, Droplets, Smartphone, FileText, Watch, Package } from 'lucide-react'
import type { PackingSuggestion } from '@travyl/shared'

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  clothing: Shirt,
  toiletries: Droplets,
  electronics: Smartphone,
  documents: FileText,
  accessories: Watch,
  essentials: Package,
}

function getIcon(category: string) {
  const Icon = CATEGORY_ICONS[category]
  return Icon ?? Package
}

interface SuggestionChipProps {
  suggestion: PackingSuggestion
  onAccept: (id: string) => void
  onDismiss: (id: string) => void
}

export function SuggestionChip({ suggestion, onAccept, onDismiss }: SuggestionChipProps) {
  const Icon = getIcon(suggestion.category)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="group grid grid-cols-[18px_1fr_auto_22px] items-center gap-2.5 py-1.5 px-1.5 -mx-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors"
    >
      <div className="w-[18px] h-[18px] rounded-md bg-gray-100 dark:bg-white/[0.08] text-gray-400 dark:text-gray-500 flex items-center justify-center">
        <Icon size={10} />
      </div>
      <span className="text-[12px] text-gray-700 dark:text-gray-300 truncate">
        {suggestion.name}
      </span>
      <button
        onClick={() => onAccept(suggestion.id)}
        className="text-[11px] font-semibold text-[var(--trip-base)] hover:underline flex items-center gap-1"
      >
        <Plus size={11} />
        Add
      </button>
      <button
        onClick={() => onDismiss(suggestion.id)}
        aria-label="Dismiss suggestion"
        className="text-gray-300 hover:text-red-500 transition-colors flex items-center justify-center"
      >
        <X size={11} />
      </button>
    </motion.div>
  )
}
