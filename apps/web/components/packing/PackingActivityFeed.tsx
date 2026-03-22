'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { NavArrowDown, NavArrowRight } from 'iconoir-react'
import type { PackingAuditEntry } from '@travyl/shared'
import { stringToColor } from './utils'

interface PackingActivityFeedProps {
  entries: PackingAuditEntry[]
  defaultCollapsed?: boolean
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
  }
}

export function PackingActivityFeed({ entries, defaultCollapsed = false }: PackingActivityFeedProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  const content = (
    <div className="flex flex-col gap-2">
      {entries.length === 0 ? (
        <p className="text-xs text-[var(--cal-text-muted)] py-1">No activity yet.</p>
      ) : (
        entries.map((entry) => {
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
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--cal-text-muted)] mb-3">
          Activity
        </h3>
        {content}
      </div>
    )
  }

  return (
    <div>
      {/* Collapsible toggle */}
      <button
        onClick={() => setIsCollapsed((v) => !v)}
        className="flex items-center gap-1.5 w-full text-left mb-2"
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
