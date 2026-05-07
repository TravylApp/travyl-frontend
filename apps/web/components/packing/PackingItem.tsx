'use client'

import { useState, useRef } from 'react'
import { motion } from 'motion/react'
import { Xmark } from 'iconoir-react'
import type { DbPackingItem } from '@travyl/shared'
import { PlaceholderAvatar } from '@/components/ui/PlaceholderAvatar'

interface PackingItemProps {
  item: DbPackingItem
  onToggle: (id: string) => void
  onIncrementPacked: (id: string) => void
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  onClaim?: (id: string) => void
  onRelease?: (id: string) => void
  currentUserId?: string
}

export function PackingItem({ item, onToggle, onIncrementPacked, onUpdateQuantity, onRemove, onClaim, onRelease, currentUserId }: PackingItemProps) {
  const displayName = item.user_display_name ?? 'User'
  const avatarUrl = item.user_avatar_url ?? null
  const [qtyHover, setQtyHover] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    setEditValue(String(item.quantity))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitEdit() {
    const parsed = parseInt(editValue, 10)
    const clamped = isNaN(parsed) || parsed <= 0 ? 1 : Math.min(99, parsed)
    if (clamped !== item.quantity) onUpdateQuantity(item.id, clamped)
    setEditing(false)
  }

  function cancelEdit() {
    setEditing(false)
  }

  // Ownership pill: theme tint for current user's items, neutral gray for everything else.
  const isMine = item.owner_id === currentUserId
  const pillClass = isMine && !item.group_tag
    ? 'text-[var(--trip-base)]'
    : 'bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300'
  const pillStyle = isMine ? { backgroundColor: 'rgb(var(--trip-base-rgb) / 0.10)' } : undefined
  const pillLabel = item.group_tag
    ? (item.group_tag === 'kids' ? 'Kids' : 'Adults')
    : isMine
      ? 'Mine'
      : item.owner_id
        ? (item.owner_display_name || 'Claimed')
        : 'Shared'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="group flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors duration-150"
    >
      {/* Checkbox (qty=1) or packed-count pill (qty>1) */}
      {item.quantity === 1 ? (
        <button
          onClick={() => onToggle(item.id)}
          aria-label={item.is_packed ? 'Unpack item' : 'Pack item'}
          className="shrink-0 w-5 h-5 rounded-[4px] border transition-all duration-150 flex items-center justify-center"
          style={{
            backgroundColor: item.is_packed ? 'var(--trip-base)' : 'transparent',
            borderColor: item.is_packed ? 'var(--trip-base)' : 'rgb(209 213 219)',
          }}
        >
          {item.is_packed && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 3.5L3.8 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      ) : (
        <button
          onClick={() => onIncrementPacked(item.id)}
          aria-label={`Packed ${item.packed_count} of ${item.quantity}`}
          className="shrink-0 px-1.5 h-5 rounded-full border text-[10px] font-semibold tabular-nums transition-all duration-150 flex items-center"
          style={{
            backgroundColor: item.packed_count > 0 ? 'var(--trip-base)' : 'transparent',
            borderColor: item.packed_count > 0 ? 'var(--trip-base)' : 'rgb(209 213 219)',
            color: item.packed_count > 0 ? 'white' : 'rgb(107 114 128)',
          }}
        >
          {item.packed_count}/{item.quantity}
        </button>
      )}

      {/* Item name */}
      <span
        className={`flex-1 text-sm transition-colors duration-150 ${item.is_packed ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}
      >
        {item.name}
      </span>

      {/* Quantity stepper — always visible */}
      <div
        className="flex items-center gap-0.5"
        onMouseEnter={() => setQtyHover(true)}
        onMouseLeave={() => { if (!editing) setQtyHover(false) }}
      >
        {qtyHover || editing ? (
          <>
            <button
              onClick={() => { if (item.quantity > 1) onUpdateQuantity(item.id, item.quantity - 1) }}
              disabled={item.quantity <= 1}
              className="w-4 h-4 flex items-center justify-center rounded text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >−</button>
            {editing ? (
              <input
                ref={inputRef}
                type="number"
                min={1}
                max={99}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                  else if (e.key === 'Escape') cancelEdit()
                }}
                className="w-8 text-center text-xs bg-transparent border-b border-gray-300 text-gray-900 dark:text-white outline-none"
              />
            ) : (
              <button
                onClick={startEditing}
                className="w-5 text-center text-xs text-gray-500 dark:text-gray-400"
              >{item.quantity}</button>
            )}
            <button
              onClick={() => { if (item.quantity < 99) onUpdateQuantity(item.id, item.quantity + 1) }}
              disabled={item.quantity >= 99}
              className="w-4 h-4 flex items-center justify-center rounded text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >+</button>
          </>
        ) : (
          <span className="text-xs text-gray-400">× {item.quantity}</span>
        )}
      </div>

      {/* Ownership pill */}
      <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium ${pillClass}`} style={pillStyle}>
        {pillLabel}
      </span>

      {/* User avatar — shows actual profile photo when available */}
      <PlaceholderAvatar
        userId={item.user_id}
        name={displayName}
        avatarUrl={avatarUrl}
        size={20}
        className="shrink-0"
      />

      {/* Claim/Release buttons — appear on hover */}
      {!item.owner_id && !item.group_tag && onClaim && (
        <button onClick={() => onClaim(item.id)}
          className="opacity-0 group-hover:opacity-100 text-[10px] text-[var(--trip-base)] hover:underline transition-opacity">
          Claim
        </button>
      )}
      {item.owner_id === currentUserId && onRelease && (
        <button onClick={() => onRelease(item.id)}
          className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-opacity">
          Release
        </button>
      )}

      {/* Remove button — appears on hover */}
      <button
        onClick={() => onRemove(item.id)}
        aria-label="Remove item"
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-gray-400 hover:text-red-500"
      >
        <Xmark width={14} height={14} />
      </button>
    </motion.div>
  )
}
