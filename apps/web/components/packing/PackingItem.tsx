'use client'

import { useState, useRef } from 'react'
import { motion } from 'motion/react'
import { Xmark } from 'iconoir-react'
import type { DbPackingItem } from '@travyl/shared'
import { stringToColor } from './utils'

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
  const avatarColor = stringToColor(displayName)
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="group flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-[var(--cal-surface)] transition-colors duration-150"
    >
      {/* Checkbox (quantity=1) or packed-count pill (quantity>1) */}
      {item.quantity === 1 ? (
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
              <path d="M1 3.5L3.8 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      ) : (
        <button
          onClick={() => onIncrementPacked(item.id)}
          className="shrink-0 px-1.5 h-5 rounded-full border text-[10px] font-semibold tabular-nums transition-all duration-150 flex items-center"
          style={{
            backgroundColor: item.packed_count > 0 ? '#003594' : 'transparent',
            borderColor: item.packed_count > 0 ? '#003594' : 'var(--cal-border)',
            color: item.packed_count > 0 ? 'white' : 'var(--cal-text-muted)',
          }}
          aria-label={`Packed ${item.packed_count} of ${item.quantity}`}
        >
          {item.packed_count}/{item.quantity}
        </button>
      )}

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

      {/* Quantity stepper — only for quantity > 1, shown on item hover */}
      {item.quantity > 1 && (
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          onMouseEnter={() => setQtyHover(true)}
          onMouseLeave={() => { if (!editing) setQtyHover(false) }}
        >
          {qtyHover || editing ? (
            <>
              <button
                onClick={() => { if (item.quantity > 1) onUpdateQuantity(item.id, item.quantity - 1) }}
                disabled={item.quantity <= 1}
                className="w-4 h-4 flex items-center justify-center rounded text-xs text-[var(--cal-text-muted)] hover:text-[var(--cal-text)] hover:bg-[var(--cal-border)] disabled:opacity-30 disabled:cursor-not-allowed"
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
                  className="w-8 text-center text-xs bg-transparent border-b border-[var(--cal-border)] text-[var(--cal-text)] outline-none"
                />
              ) : (
                <button
                  onClick={startEditing}
                  className="w-5 text-center text-xs text-[var(--cal-text)] hover:text-[var(--cal-text)]"
                >{item.quantity}</button>
              )}
              <button
                onClick={() => { if (item.quantity < 99) onUpdateQuantity(item.id, item.quantity + 1) }}
                disabled={item.quantity >= 99}
                className="w-4 h-4 flex items-center justify-center rounded text-xs text-[var(--cal-text-muted)] hover:text-[var(--cal-text)] hover:bg-[var(--cal-border)] disabled:opacity-30 disabled:cursor-not-allowed"
              >+</button>
            </>
          ) : (
            <span className="text-xs text-[var(--cal-text-muted)]">× {item.quantity}</span>
          )}
        </div>
      )}

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
          className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-opacity">
          Claim
        </button>
      )}
      {item.owner_id === currentUserId && onRelease && (
        <button onClick={() => onRelease(item.id)}
          className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-opacity">
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
