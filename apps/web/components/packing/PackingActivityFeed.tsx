'use client'

import type { PackingAuditEntry } from '@travyl/shared'
import { PlaceholderAvatar } from '@/components/ui/PlaceholderAvatar'

interface PackingActivityFeedProps {
  entries: PackingAuditEntry[]
  currentUserId?: string
  maxVisible?: number
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`

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

export function PackingActivityFeed({ entries, currentUserId, maxVisible = 6 }: PackingActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <p className="text-[12px] text-gray-400 py-2">
        No activity yet — start packing to see updates here.
      </p>
    )
  }

  const visible = entries.slice(0, maxVisible)

  return (
    <div className="flex flex-col">
      {visible.map((entry, idx) => {
        const displayName = entry.user_display_name ?? 'User'
        const avatarUrl = entry.user_avatar_url ?? null
        const isMe = entry.user_id === currentUserId
        return (
          <div
            key={`${entry.created_at}-${idx}`}
            className="flex items-center gap-2.5 py-2 text-[12px] text-gray-600 dark:text-gray-300"
          >
            <PlaceholderAvatar
              userId={entry.user_id}
              name={displayName}
              avatarUrl={avatarUrl}
              size={18}
            />
            <span className="flex-1 min-w-0 truncate">
              <span className="font-semibold text-[var(--trip-base)]">
                {isMe ? 'You' : displayName}
              </span>{' '}
              {actionLabel(entry.action)}{' '}
              <span className="text-gray-900 dark:text-gray-100">{entry.item_name}</span>
            </span>
            <span className="text-[10px] text-gray-300 shrink-0 tabular-nums">
              {formatRelativeTime(entry.created_at)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
