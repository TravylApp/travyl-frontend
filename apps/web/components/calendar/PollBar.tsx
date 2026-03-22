'use client'

import type { Poll, UserAwareness } from '@travyl/shared'

interface PollBarProps {
  poll: Poll
  userId: string
  onVote: (vote: 'yes' | 'no') => void
  collaborators: UserAwareness[]
  compact?: boolean // true when card height < 40px
}

interface ResolvedBarProps {
  onRestore: () => void
  onRemove: () => void
}

// ─── Active vote bar ──────────────────────────────────────────

function ActivePollBar({ poll, userId, onVote, collaborators, compact }: PollBarProps) {
  const myVote = poll.votes[userId] as 'yes' | 'no' | undefined
  const yesCount = Object.values(poll.votes).filter((v) => v === 'yes').length
  const noCount = Object.values(poll.votes).filter((v) => v === 'no').length

  // Voter avatars (non-compact only)
  const voterIds = Object.keys(poll.votes)

  return (
    <div
      className="flex items-center gap-2 px-2 py-1 border-t border-white/10 bg-black/20"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onVote('yes')
        }}
        className={[
          'flex items-center gap-1 text-xs rounded px-1.5 py-0.5 transition-colors',
          myVote === 'yes'
            ? 'bg-emerald-500/30 text-emerald-300'
            : 'text-white/60 hover:text-emerald-300 hover:bg-emerald-500/10',
        ].join(' ')}
      >
        <span className="text-sm">👍</span>
        <span>{yesCount}</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onVote('no')
        }}
        className={[
          'flex items-center gap-1 text-xs rounded px-1.5 py-0.5 transition-colors',
          myVote === 'no'
            ? 'bg-red-500/30 text-red-300'
            : 'text-white/60 hover:text-red-300 hover:bg-red-500/10',
        ].join(' ')}
      >
        <span className="text-sm">👎</span>
        <span>{noCount}</span>
      </button>

      {!compact && voterIds.length > 0 && (
        <div className="ml-auto flex -space-x-1">
          {voterIds.slice(0, 5).map((voterId) => {
            const collab = collaborators.find((c) => c.userId === voterId)
            const initial = collab?.avatarInitial ?? voterId.charAt(0).toUpperCase()
            const color = collab?.color ?? '#6366f1'
            return (
              <div
                key={voterId}
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white border border-[#1e3a5f]"
                style={{ backgroundColor: color }}
                title={collab?.name ?? voterId}
              >
                {initial}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Resolved "remove" bar ────────────────────────────────────

function ResolvedRemoveBar({ onRestore, onRemove }: ResolvedBarProps) {
  return (
    <div
      className="flex items-center justify-center gap-3 px-2 py-1 border-t border-white/10 bg-black/20"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRestore()
        }}
        className="flex items-center gap-1 text-xs text-white/60 hover:text-emerald-300 transition-colors"
      >
        <span>↩</span> Restore
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        className="flex items-center gap-1 text-xs text-white/60 hover:text-red-300 transition-colors"
      >
        <span>✕</span> Remove
      </button>
    </div>
  )
}

// ─── Exported PollBar ─────────────────────────────────────────

export interface PollBarExportProps extends PollBarProps {
  isResolved: boolean
  canManage: boolean // true if user is poll starter or trip owner
  onRestore: () => void
  onRemove: () => void
}

export function PollBar({
  poll,
  userId,
  onVote,
  collaborators,
  compact,
  isResolved,
  canManage,
  onRestore,
  onRemove,
}: PollBarExportProps) {
  if (isResolved && canManage) {
    return <ResolvedRemoveBar onRestore={onRestore} onRemove={onRemove} />
  }

  if (isResolved) {
    // Other collaborators see no bar — just the grayed-out card
    return null
  }

  return (
    <ActivePollBar
      poll={poll}
      userId={userId}
      onVote={onVote}
      collaborators={collaborators}
      compact={compact}
    />
  )
}
