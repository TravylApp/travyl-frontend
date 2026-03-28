'use client'
import { useState, useEffect } from 'react'
import { Xmark, BookmarkSolid } from 'iconoir-react'
import type { BookingMatch } from './hooks/useBookingMatches'

const PROVIDER_LABELS: Record<string, string> = {
  opentable: 'OpenTable',
  ticketmaster: 'Ticketmaster',
}

const PROVIDER_COLORS: Record<string, string> = {
  opentable: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ticketmaster: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
}

export type BookingPanelMode = 'loading' | 'summary' | 'done'

interface ActivityInfo {
  id: string
  title: string
}

interface BookingPanelProps {
  isOpen: boolean
  onClose: () => void
  mode: BookingPanelMode
  activities: ActivityInfo[]
  matches: Map<string, BookingMatch>
  receivedCount: number
  total: number
  onBookAll: () => void
  onBookOne: (activityId: string) => void
  failedToOpenIds: string[]
}

export function BookingPanel({
  isOpen,
  onClose,
  mode,
  activities,
  matches,
  receivedCount,
  total,
  onBookAll,
  onBookOne,
  failedToOpenIds,
}: BookingPanelProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setIsVisible(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setIsVisible(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const matchedActivities = activities.filter((a) => matches.get(a.id)?.status === 'matched' || matches.get(a.id)?.status === 'opened')
  const unmatchedActivities = activities.filter((a) => {
    const m = matches.get(a.id)
    return !m || m.status === 'unmatched'
  })
  const bookableCount = matchedActivities.filter((a) => matches.get(a.id)?.status === 'matched').length

  const progress = total > 0 ? Math.round((receivedCount / total) * 100) : 0

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div
        className={[
          'absolute right-0 top-0 h-full w-96 bg-white dark:bg-[#0f1a28] border-l border-gray-200 dark:border-[#1e3a5f]/40 shadow-xl pointer-events-auto flex flex-col transition-transform duration-300',
          isVisible ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1e3a5f]/30 shrink-0">
          <div className="flex items-center gap-2">
            <BookmarkSolid className="w-4 h-4 text-[#003594] dark:text-[#4a7ab5]" />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-[#f5efe8]">Book My Trip</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close booking panel"
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#1e3a5f]/30"
          >
            <Xmark className="w-4 h-4 text-gray-500 dark:text-[#7a9cc0]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* Loading state */}
          {mode === 'loading' && (
            <div className="px-4 py-4 space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-[#cdd9e5] mb-2">Matching your activities…</p>
                <div className="h-1.5 bg-gray-100 dark:bg-[#1e3a5f]/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#003594] rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 dark:text-[#4a7ab5] mt-1">{receivedCount} of {total} checked</p>
              </div>

              {/* Live rows as they arrive */}
              <div className="space-y-1">
                {activities.map((a) => {
                  const m = matches.get(a.id)
                  return (
                    <div key={a.id} className="flex items-center gap-2 py-2 border-b border-gray-50 dark:border-[#1e3a5f]/20">
                      {m ? (
                        m.status === 'matched' ? (
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-gray-300 dark:bg-[#2a4a6a] shrink-0" />
                        )
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-gray-200 dark:bg-[#1e3a5f]/40 animate-pulse shrink-0" />
                      )}
                      <span className="text-xs text-gray-700 dark:text-[#cdd9e5] truncate">{a.title || 'Untitled'}</span>
                      {m?.provider && (
                        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${PROVIDER_COLORS[m.provider] ?? ''}`}>
                          {PROVIDER_LABELS[m.provider] ?? m.provider}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Summary state */}
          {(mode === 'summary' || mode === 'done') && (
            <div className="px-4 py-4 space-y-4">
              {/* Count summary */}
              <p className="text-xs text-gray-500 dark:text-[#7a9cc0]">
                <span className="font-semibold text-gray-800 dark:text-[#f5efe8]">{bookableCount}</span> of{' '}
                <span className="font-semibold text-gray-800 dark:text-[#f5efe8]">{total}</span> activities can be booked
              </p>

              {/* Ready to Book */}
              {matchedActivities.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#4a7ab5] mb-2">Ready to Book</h3>
                  <div className="space-y-1">
                    {matchedActivities.map((a) => {
                      const m = matches.get(a.id)!
                      const isOpened = m.status === 'opened'
                      const isUncertain = m.confidence !== undefined && m.confidence >= 0.6 && m.confidence < 0.75
                      return (
                        <div key={a.id} className="flex items-start gap-2 py-2 border-b border-gray-50 dark:border-[#1e3a5f]/20">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 dark:text-[#f5efe8] truncate">{a.title || 'Untitled'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {m.provider && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${PROVIDER_COLORS[m.provider] ?? ''}`}>
                                  {PROVIDER_LABELS[m.provider] ?? m.provider}
                                </span>
                              )}
                              {m.matchedName && m.matchedName !== a.title && (
                                <span className="text-[10px] text-gray-400 dark:text-[#4a7ab5] truncate">→ {m.matchedName}</span>
                              )}
                            </div>
                            {isUncertain && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                                Uncertain match — {m.matchedName}
                              </p>
                            )}
                          </div>
                          {isOpened ? (
                            <span className="text-[10px] text-green-600 dark:text-green-400 shrink-0 mt-0.5">Opened</span>
                          ) : (
                            <button
                              onClick={() => onBookOne(a.id)}
                              className="text-[11px] font-medium text-[#003594] dark:text-[#4a7ab5] hover:underline shrink-0 mt-0.5"
                            >
                              Book
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Not Available */}
              {unmatchedActivities.length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-[#4a7ab5] mb-2">Not Available</h3>
                  <div className="space-y-1">
                    {unmatchedActivities.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 py-1.5">
                        <span className="h-2 w-2 rounded-full bg-gray-200 dark:bg-[#2a4a6a] shrink-0" />
                        <span className="text-xs text-gray-400 dark:text-[#4a7ab5] truncate">{a.title || 'Untitled'}</span>
                        <span className="ml-auto text-[10px] text-gray-400 dark:text-[#4a7ab5] shrink-0">No booking found</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Popup blocker fallback */}
              {failedToOpenIds.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-lg p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">Couldn't open automatically — click each below to book manually:</p>
                  <div className="space-y-1">
                    {failedToOpenIds.map((id) => {
                      const a = activities.find((x) => x.id === id)
                      const m = matches.get(id)
                      if (!a || !m?.affiliateUrl) return null
                      return (
                        <a
                          key={id}
                          href={m.affiliateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-[#003594] dark:text-[#4a7ab5] hover:underline truncate"
                        >
                          {a.title || 'Untitled'}
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {(mode === 'summary') && bookableCount > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-[#1e3a5f]/30 shrink-0">
            <button
              onClick={onBookAll}
              className="w-full rounded-lg bg-[#003594] text-white text-sm font-medium py-2 hover:bg-[#002a7a] transition-colors"
            >
              Book All ({bookableCount})
            </button>
          </div>
        )}

        {mode === 'done' && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-[#1e3a5f]/30 shrink-0">
            <p className="text-xs text-center text-green-600 dark:text-green-400 mb-2 font-medium">Booking links opened</p>
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-gray-200 dark:border-[#1e3a5f]/30 text-gray-600 dark:text-[#cdd9e5] text-sm py-2 hover:bg-gray-50 dark:hover:bg-[#1e3a5f]/20 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
