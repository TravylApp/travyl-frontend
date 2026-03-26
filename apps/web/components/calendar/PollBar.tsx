'use client'

import { ThumbsUp, ThumbsDown } from 'iconoir-react'
import type { Poll } from '@travyl/shared'

interface FloatingVoteButtonsProps {
  poll: Poll
  userId: string
  onVote: (vote: 'yes' | 'no') => void
  compact?: boolean
  isResolved: boolean
}

export function FloatingVoteButtons({
  poll,
  userId,
  onVote,
  compact,
  isResolved,
}: FloatingVoteButtonsProps) {
  if (isResolved) return null

  const myVote = poll.votes[userId] as 'yes' | 'no' | undefined
  const yesCount = Object.values(poll.votes).filter((v) => v === 'yes').length
  const noCount = Object.values(poll.votes).filter((v) => v === 'no').length

  const positionClass = compact ? 'top-1' : 'top-1/2 -translate-y-1/2'

  return (
    <div
      className={[
        'absolute left-full ml-1.5 flex flex-col gap-1 z-20',
        'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
        'pointer-events-none group-hover:pointer-events-auto',
        positionClass,
      ].join(' ')}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col items-center">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onVote('yes')
          }}
          className={[
            'w-7 h-7 rounded-md flex items-center justify-center transition-colors duration-150',
            myVote === 'yes'
              ? 'bg-emerald-500/80 text-white hover:bg-emerald-500/60'
              : 'bg-black/60 backdrop-blur-sm text-white/60 hover:text-white hover:bg-black/80',
          ].join(' ')}
          aria-label="Vote yes"
        >
          <ThumbsUp width={13} height={13} />
        </button>
        {yesCount > 0 && (
          <span className="text-[9px] text-white/70 text-center leading-none mt-0.5">
            {yesCount}
          </span>
        )}
      </div>

      <div className="flex flex-col items-center">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onVote('no')
          }}
          className={[
            'w-7 h-7 rounded-md flex items-center justify-center transition-colors duration-150',
            myVote === 'no'
              ? 'bg-red-500/80 text-white hover:bg-red-500/60'
              : 'bg-black/60 backdrop-blur-sm text-white/60 hover:text-white hover:bg-black/80',
          ].join(' ')}
          aria-label="Vote no"
        >
          <ThumbsDown width={13} height={13} />
        </button>
        {noCount > 0 && (
          <span className="text-[9px] text-white/70 text-center leading-none mt-0.5">
            {noCount}
          </span>
        )}
      </div>
    </div>
  )
}
