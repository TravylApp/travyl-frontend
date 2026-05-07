'use client'
import { useState, useRef, useEffect } from 'react'
import { Plus, ShareAndroid, Clock } from 'iconoir-react'
import { TrainFront } from 'lucide-react'
import { Tooltip } from '@/components/ui/tooltip'
import type { Trip } from '@travyl/shared'
import { useAuthStore, useProfile } from '@travyl/shared'
import type { CalendarActivity } from './types'
import type { Command } from './types'
import { CollaboratorAvatar } from './CollaboratorAvatar'
import type { UserAwareness } from './types'

function getInitials(name: string | undefined): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface CalendarToolbarProps {
  tripName: string
  dateRange: string
  onAddEvent: () => void
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected'
  collaborators: UserAwareness[]
  onShare: () => void
  tripDays: { dayIndex: number; label: string }[]
  onOpenHistory?: () => void
  trip?: Trip | null
  isSharedView?: boolean
  /** When true, unscheduled items exist */
  hasUnscheduled?: boolean
  onOpenUnscheduled?: () => void
  /** Callback to auto-fill transit gaps between activities */
  onAutoTransit?: () => void
  /** Whether auto-transit is currently in progress */
  isAutoTransitPending?: boolean
}

export function CalendarToolbar({
  tripName,
  dateRange,
  onAddEvent,
  connectionStatus,
  collaborators,
  onShare,
  tripDays,
  onOpenHistory,
  trip,
  isSharedView = false,
  hasUnscheduled = false,
  onOpenUnscheduled,
  onAutoTransit,
  isAutoTransitPending = false,
}: CalendarToolbarProps) {
  const user = useAuthStore((s) => s.user)
  const { data: profile } = useProfile()
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name
  const initials = getInitials(displayName)

  return (
    <div className="flex flex-col shrink-0">
      {/* Connection status banner */}
      {connectionStatus !== 'connected' && typeof window !== 'undefined' && performance.now() > 3000 && (
        <div className="flex items-center justify-center gap-2 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-1.5 text-xs text-yellow-600 dark:text-yellow-400">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
          {connectionStatus === 'reconnecting'
            ? 'Reconnecting\u2026'
            : 'Offline \u2014 changes saved locally'}
        </div>
      )}

      {/* Main toolbar row */}
      <div
        className="flex items-center h-12 bg-white/70 dark:bg-cal-surface-elevated/80 backdrop-blur-xl shrink-0 px-4 gap-3"
        style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.04)' }}
      >
        {/* User avatar */}
        {!isSharedView && user && (
          <div className="h-7 w-7 flex items-center justify-center rounded-full overflow-hidden bg-[#1e3a5f] text-white font-medium text-[11px] shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName || 'User'} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
        )}

        {/* Trip info */}
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-serif font-normal tracking-wide text-trip-base dark:text-cal-text leading-tight">
              {tripName}
            </span>
            <span className="text-[10px] text-cal-text-secondary leading-tight hidden sm:inline">
              {dateRange}
            </span>
            {trip?.destination && (
              <span className="text-[10px] text-cal-text-tertiary leading-tight hidden md:inline">
                · {trip.destination}
              </span>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Unscheduled indicator */}
        {hasUnscheduled && onOpenUnscheduled && (
          <button
            onClick={onOpenUnscheduled}
            className="flex items-center gap-1.5 rounded-full border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 text-[11px] text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors shrink-0"
          >
            <span>Unscheduled</span>
          </button>
        )}

        {/* New Activity */}
        {!isSharedView && (
          <button
            onClick={onAddEvent}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-cal-border px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-cal-text-secondary hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-cal-accent-bg/80 dark:hover:text-cal-text transition-colors shrink-0"
          >
            <Plus width={12} height={12} />
            <span className="hidden sm:inline">New</span>
            <kbd className="text-[9px] text-gray-400 dark:text-cal-text-tertiary bg-gray-100 dark:bg-cal-bg border border-gray-200 dark:border-cal-border px-1 rounded hidden sm:inline">
              N
            </kbd>
          </button>
        )}

        {/* Auto Transit */}
        {!isSharedView && onAutoTransit && (
          <Tooltip content="Auto-fill transit gaps">
            <button
              onClick={onAutoTransit}
              disabled={isAutoTransitPending}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-cal-border px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-cal-text-secondary hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-cal-accent-bg/80 dark:hover:text-cal-text transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TrainFront className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isAutoTransitPending ? 'Transiting...' : 'Auto Transit'}</span>
            </button>
          </Tooltip>
        )}

        {/* Change history */}
        {onOpenHistory && !isSharedView && (
          <Tooltip content="Change history">
            <button
              onClick={onOpenHistory}
              className="p-1.5 rounded-lg text-gray-500 dark:text-cal-text-secondary hover:bg-gray-100 dark:hover:bg-cal-accent-bg transition-colors"
            >
              <Clock className="w-4 h-4" />
            </button>
          </Tooltip>
        )}

        {/* Collaborator avatars */}
        {collaborators.length > 0 && (
          <div className="flex items-center shrink-0">
            {collaborators.slice(0, 5).map((collab, index) => (
              <CollaboratorAvatar
                key={collab.userId}
                collaborator={collab}
                index={index}
                totalCollaborators={Math.min(collaborators.length, 5)}
                dayLabel=""
              />
            ))}
            {collaborators.length > 5 && (
              <span className="text-[10px] text-cal-text-secondary ml-1 font-medium">
                +{collaborators.length - 5}
              </span>
            )}
          </div>
        )}

        {/* Share */}
        {!isSharedView && (
          <Tooltip content="Share this trip">
            <button
              onClick={onShare}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors shrink-0"
            >
              <ShareAndroid width={12} height={12} />
              Share
            </button>
          </Tooltip>
        )}

        {/* Shared view indicator */}
        {isSharedView && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-cal-accent-bg/60">
            <span className="text-xs text-gray-500 dark:text-cal-text-secondary">Viewing</span>
          </div>
        )}
      </div>
    </div>
  )
}
