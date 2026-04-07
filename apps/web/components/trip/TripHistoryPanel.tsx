'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { History, X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@travyl/shared'
import { formatDistanceToNow } from 'date-fns'

// ── Types ───────────────────────────────────────────────────

interface HistoryEntry {
  id: string
  type: 'audit' | 'activity'
  action: string       // human-readable description
  activityName: string
  displayName: string
  timestamp: string    // ISO string
}

// ── Badge colors per action type ───────────────────────────

function actionBadge(action: string): { label: string; color: string; bg: string } {
  if (action.startsWith('Added'))    return { label: 'Added', color: '#34d399', bg: 'rgba(52,211,153,0.12)' }
  if (action.startsWith('Removed'))  return { label: 'Removed', color: '#f87171', bg: 'rgba(248,113,113,0.12)' }
  if (action.startsWith('Moved'))    return { label: 'Moved', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' }
  if (action.startsWith('Edited'))   return { label: 'Edited', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' }
  if (action.startsWith('Reverted')) return { label: 'Reverted', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' }
  return { label: 'Changed', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
}

// ── Data fetcher ────────────────────────────────────────────

async function fetchTripHistory(tripId: string): Promise<HistoryEntry[]> {
  const entries: HistoryEntry[] = []

  // 1. Fetch audit entries from itinerary_edits
  const { data: edits } = await supabase
    .from('itinerary_edits')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(50)

  // 2. Fetch activity records for created_at timestamps (supplements audit)
  const { data: activities } = await supabase
    .from('activity')
    .select('id, activity_name, user_id, created_at, activity_type')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(50)

  // Collect all user IDs for profile lookup
  const userIds = new Set<string>()
  for (const e of edits ?? []) if (e.user_id) userIds.add(e.user_id)
  for (const a of activities ?? []) if (a.user_id) userIds.add(a.user_id)

  const nameMap: Record<string, string> = {}
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', [...userIds])
    for (const p of profiles ?? []) {
      nameMap[p.id] = p.display_name ?? 'Unknown'
    }
  }

  // Build audit entries
  const auditActivityIds = new Set<string>()
  for (const e of edits ?? []) {
    const name =
      (e.new_data as any)?.title ??
      (e.original_data as any)?.title ??
      (e.new_data as any)?.activity_name ??
      (e.original_data as any)?.activity_name ??
      'Activity'
    const displayName = e.user_id ? (nameMap[e.user_id] ?? 'Someone') : 'Someone'

    let action = ''
    switch (e.edit_type) {
      case 'create':  action = `Added "${name}"`; break
      case 'delete':  action = `Removed "${name}"`; break
      case 'move':    action = `Moved "${name}"`; break
      case 'edit':    action = `Edited "${name}"`; break
      case 'revert':  action = `Reverted "${name}"`; break
      default:        action = `Changed "${name}"`
    }

    entries.push({
      id: `audit-${e.id}`,
      type: 'audit',
      action,
      activityName: name,
      displayName,
      timestamp: e.created_at,
    })

    if (e.edit_type === 'create') auditActivityIds.add(e.activity_id)
  }

  // Add activity creation entries that have no audit trail (pre-audit activities)
  for (const a of activities ?? []) {
    if (auditActivityIds.has(a.id)) continue
    const displayName = a.user_id ? (nameMap[a.user_id] ?? 'Someone') : 'Someone'
    entries.push({
      id: `activity-${a.id}`,
      type: 'activity',
      action: `Added "${a.activity_name}"`,
      activityName: a.activity_name,
      displayName,
      timestamp: a.created_at,
    })
  }

  // 3. Always pull from trip_context — user_history (manual actions) + itinerary (planner)
  {
    const { data: trip } = await supabase
      .from('trips')
      .select('trip_context, created_at, updated_at')
      .eq('id', tripId)
      .single()

    if (trip) {
      const ctx = trip.trip_context as any

      // User actions (manual adds/removes)
      const userHistory = (ctx?.user_history ?? []) as { action: string; timestamp: string; actor: string }[]
      for (const h of userHistory) {
        entries.push({
          id: `user-${h.timestamp}`,
          type: 'audit',
          action: h.action,
          activityName: '',
          displayName: h.actor || 'You',
          timestamp: h.timestamp,
        })
      }

      // Planner-generated itinerary items (only if no audit data)
      if (entries.length === userHistory.length) {
        const itinerary = ctx?.itinerary ?? []
        for (const day of itinerary) {
          for (const slot of (day.slots ?? [])) {
            const name = slot.poi?.name ?? slot.title ?? 'Activity'
            entries.push({
              id: `ctx-${day.day}-${name}`,
              type: 'activity',
              action: `Added "${name}"`,
              activityName: name,
              displayName: 'Trip planner',
              timestamp: trip.created_at,
            })
          }
        }
      }

      // Trip lifecycle events
      entries.push({
        id: 'trip-created',
        type: 'audit',
        action: 'Trip created',
        activityName: '',
        displayName: 'You',
        timestamp: trip.created_at,
      })

      if (trip.updated_at && trip.updated_at !== trip.created_at) {
        entries.push({
          id: 'trip-enriched',
          type: 'audit',
          action: 'Trip enriched with details',
          activityName: '',
          displayName: 'Travyl',
          timestamp: trip.updated_at,
        })
      }
    }
  }

  // Sort all entries by timestamp, newest first
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return entries
}

// ── Hook ────────────────────────────────────────────────────

function useTripHistory(tripId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['trip-history', tripId],
    queryFn: () => fetchTripHistory(tripId),
    enabled,
    staleTime: 30_000,
  })
}

// ── Panel Component ─────────────────────────────────────────

// Compact floating panel — top-right corner, no backdrop, doesn't block the page
function HistoryPanel({ tripId, isOpen, onClose }: { tripId: string; isOpen: boolean; onClose: () => void }) {
  const { data: entries = [], isLoading } = useTripHistory(tripId, isOpen)

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed top-16 right-4 z-40 w-[300px] max-h-[70vh] flex flex-col rounded-xl overflow-hidden shadow-2xl"
      style={{ backgroundColor: 'rgba(12,24,41,0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <History size={13} style={{ color: 'var(--magazine-accent, #c8a96a)' }} />
          <span className="text-[12px] font-semibold text-white/80">Trip History</span>
          {!isLoading && entries.length > 0 && (
            <span className="text-[9px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{entries.length}</span>
          )}
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors">
          <X size={12} />
        </button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-3.5 py-2">
        {isLoading && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-2 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-white/10 mt-1.5 shrink-0" />
                <div className="flex-1"><div className="h-2.5 rounded bg-white/8 w-3/4" /></div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && entries.length === 0 && (
          <p className="text-[10px] text-white/25 text-center py-6">No changes yet</p>
        )}

        {!isLoading && entries.length > 0 && (
          <div className="flex flex-col">
            {entries.map((entry, idx) => {
              const badge = actionBadge(entry.action)
              return (
                <div key={entry.id} className="flex items-start gap-2.5 py-1.5">
                  <div className="w-[7px] h-[7px] rounded-full shrink-0 mt-1" style={{
                    backgroundColor: idx === 0 ? badge.color : 'transparent',
                    border: `1.5px solid ${badge.color}`,
                  }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/55 leading-snug">
                      <span className="font-medium" style={{ color: 'var(--magazine-accent, #c8a96a)' }}>{entry.displayName}</span>{' '}
                      {entry.action.toLowerCase()}
                    </p>
                    <p className="text-[8px] text-white/20">{formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

// ── Exported Toggle + Panel ──────────────────────────────────

export function TripHistoryToggle({ tripId, variant = 'pill', dark = false }: { tripId: string; variant?: 'pill' | 'icon'; dark?: boolean }) {
  const [open, setOpen] = useState(false)

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setOpen(!open)}
          title="Trip History"
          className="flex items-center justify-center transition-all duration-200 hover:scale-105 rounded-lg mx-0.5"
          style={{
            backgroundColor: open
              ? 'rgba(200,169,106,0.25)'
              : dark ? 'rgba(255,255,255,0.08)' : 'rgba(30,58,95,0.18)',
            height: 44,
            boxShadow: open ? '0 0 8px rgba(200,169,106,0.3)' : 'none',
          }}
        >
          <History size={16} style={{ color: open ? '#c8a96a' : dark ? 'rgba(255,255,255,0.5)' : 'rgba(30,58,95,0.7)' }} />
        </button>
        <HistoryPanel tripId={tripId} isOpen={open} onClose={() => setOpen(false)} />
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-semibold transition-all duration-200"
        style={{
          color: 'rgba(255,255,255,0.85)',
          backgroundColor: open ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
          border: `1px solid ${open ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.15)'}`,
        }}
        title="View trip history"
      >
        <History size={12} />
        <span>{open ? 'Hide' : 'History'}</span>
      </button>
      <HistoryPanel tripId={tripId} isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
