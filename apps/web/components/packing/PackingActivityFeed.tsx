'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { NavArrowDown, NavArrowRight } from 'iconoir-react'
import type { PackingAuditEntry } from '@travyl/shared'
import { stringToColor } from './utils'

interface PackingActivityFeedProps {
  entries: PackingAuditEntry[]
  defaultCollapsed?: boolean
  currentUserId?: string
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`

  return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function actionLabel(action: PackingAuditEntry['action']): string {
  switch (action) {
    case 'added': return 'added'
    case 'packed': return 'packed'
    case 'unpacked': return 'unpacked'
    case 'removed': return 'removed'
    case 'claimed': return 'claimed'
    case 'released': return 'released'
    case 'transferred': return 'transferred'
    default: return action
  }
}

export function PackingActivityFeed({ entries, defaultCollapsed = false, currentUserId }: PackingActivityFeedProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [filterMine, setFilterMine] = useState(false)

  const displayEntries = filterMine && currentUserId
    ? entries.filter((e) => e.user_id === currentUserId)
    : entries

  const content = (
    <div className="flex flex-col gap-2">
      {displayEntries.length === 0 ? (
        <p className="text-xs text-[var(--cal-text-muted)] py-1">No activity yet.</p>
      ) : (
        displayEntries.map((entry) => {
          const displayName = entry.user_display_name ?? 'Someone'
          const avatarColor = stringToColor(displayName)

          return (
            <div key={entry.id} className="flex items-start gap-2">
              {/* Avatar */}
              <span
                className="shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
                style={{ backgroundColor: avatarColor }}
                title={displayName}
              >
                {displayName[0].toUpperCase()}
              </span>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--cal-text)] leading-snug">
                  <span className="font-medium">{displayName}</span>{' '}
                  <span className="text-[var(--cal-text-muted)]">{actionLabel(entry.action)}</span>{' '}
                  <span className="font-medium">{entry.item_name}</span>
                  {entry.action === 'transferred' && entry.target_display_name && (
                    <> → <span className="font-medium">{entry.target_display_name}</span></>
                  )}
                </p>
                <p className="text-[10px] text-[var(--cal-text-muted)] mt-0.5">
                  {formatRelativeTime(entry.created_at)}
                </p>
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  if (!defaultCollapsed) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--cal-text-muted)]">
            Activity
          </h3>
          <div className="flex gap-1">
            <button onClick={() => setFilterMine(false)}
              className={`text-[10px] px-2 py-0.5 rounded-full ${!filterMine ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              All
            </button>
            <button onClick={() => setFilterMine(true)}
              className={`text-[10px] px-2 py-0.5 rounded-full ${filterMine ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              Mine
            </button>
          </div>
        </div>
        {content}
      </div>
    )
  }

  return (
    <div>
      {/* Collapsible toggle */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          className="flex items-center gap-1.5 text-left"
        >
          {isCollapsed ? (
            <NavArrowRight width={13} height={13} className="text-[var(--cal-text-muted)] shrink-0" />
          ) : (
            <NavArrowDown width={13} height={13} className="text-[var(--cal-text-muted)] shrink-0" />
          )}
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--cal-text-muted)]">
            Activity Feed
          </span>
        </button>
        <div className="flex gap-1">
          <button onClick={() => setFilterMine(false)}
            className={`text-[10px] px-2 py-0.5 rounded-full ${!filterMine ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            All
          </button>
          <button onClick={() => setFilterMine(true)}
            className={`text-[10px] px-2 py-0.5 rounded-full ${filterMine ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
            Mine
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            key="feed"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
