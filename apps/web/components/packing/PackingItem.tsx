'use client'

import { motion } from 'motion/react'
import { Xmark } from 'iconoir-react'
import type { DbPackingItem } from '@travyl/shared'
import { stringToColor } from './utils'

interface PackingItemProps {
  item: DbPackingItem
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

export function PackingItem({ item, onToggle, onRemove }: PackingItemProps) {
  const displayName = item.user_display_name ?? 'User'
  const avatarColor = stringToColor(displayName)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="group flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-[var(--cal-surface)] transition-colors duration-150"
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(item.id)}
        className="shrink-0 w-5 h-5 rounded-[4px] border transition-all duration-150 flex items-center justify-center"
        style={{
          backgroundColor: item.is_packed ? '#003594' : 'transparent',
          borderColor: item.is_packed ? '#003594' : 'var(--cal-border)',
        }}
        aria-label={item.is_packed ? 'Unpack item' : 'Pack item'}
      >
        {item.is_packed && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path
              d="M1 3.5L3.8 6.5L9 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Item name */}
      <span
        className="flex-1 text-sm transition-colors duration-150"
        style={{
          color: item.is_packed ? 'var(--cal-text-muted)' : 'var(--cal-text)',
          textDecoration: item.is_packed ? 'line-through' : 'none',
        }}
      >
        {item.name}
      </span>

      {/* User avatar */}
      <span
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
        style={{ backgroundColor: avatarColor }}
        title={displayName}
      >
        {displayName[0].toUpperCase()}
      </span>

      {/* Remove button — appears on hover */}
      <button
        onClick={() => onRemove(item.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[var(--cal-text-muted)] hover:text-red-500"
        aria-label="Remove item"
      >
        <Xmark width={14} height={14} />
      </button>
    </motion.div>
  )
}
