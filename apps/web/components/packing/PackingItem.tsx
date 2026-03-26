'use client'

import { motion } from 'motion/react'
import { Xmark } from 'iconoir-react'
import type { DbPackingItem } from '@travyl/shared'
import { stringToColor } from './utils'

interface PackingItemProps {
  item: DbPackingItem
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onClaim?: (id: string) => void
  onRelease?: (id: string) => void
  currentUserId?: string
}

export function PackingItem({ item, onToggle, onRemove, onClaim, onRelease, currentUserId }: PackingItemProps) {
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

      {/* Ownership pill */}
      {item.group_tag ? (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400 shrink-0">
          {item.group_tag === 'kids' ? 'Kids' : 'Adults'}
        </span>
      ) : item.owner_id ? (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 shrink-0">
          {item.owner_display_name || 'Claimed'}
        </span>
      ) : (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 shrink-0">
          Shared
        </span>
      )}

      {/* User avatar */}
      <span
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
        style={{ backgroundColor: avatarColor }}
        title={displayName}
      >
        {displayName[0].toUpperCase()}
      </span>

      {/* Claim/Release buttons — appear on hover */}
      {!item.owner_id && !item.group_tag && onClaim && (
        <button onClick={() => onClaim(item.id)}
          className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-600 hover:text-blue-800 transition-opacity">
          Claim
        </button>
      )}
      {item.owner_id === currentUserId && onRelease && (
        <button onClick={() => onRelease(item.id)}
          className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-500 hover:text-gray-700 transition-opacity">
          Release
        </button>
      )}

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
