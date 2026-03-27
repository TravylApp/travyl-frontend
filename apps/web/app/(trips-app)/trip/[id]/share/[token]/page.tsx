'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, GitFork, Edit2 } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase, fetchTripByShareToken, fetchCollaborators, joinTripViaLink, useForkTrip } from '@travyl/shared'
import type { Trip, TripCollaborator } from '@travyl/shared'
import { YjsTripProvider } from '@/components/calendar/providers/YjsTripProvider'
import { CalendarDashboard } from '@/components/calendar/CalendarDashboard'

const BRAND = '#1e3a5f'

// ─── Derived permission for share page ────────────────────────
type ShareRole = 'owner' | 'editor' | 'viewer' | 'link-editor'

function resolveShareRole(
  trip: Trip,
  user: User | null,
  collaborators: TripCollaborator[],
): ShareRole {
  if (!user || user.is_anonymous) {
    return trip.link_permission === 'editor' ? 'link-editor' : 'viewer'
  }
  if (trip.user_id === user.id) return 'owner'
  const collab = collaborators.find((c) => c.user_id === user.id && c.invite_status === 'accepted')
  if (collab) return collab.role_type === 'editor' ? 'editor' : 'viewer'
  return trip.link_permission === 'editor' ? 'link-editor' : 'viewer'
}

// ─── Inner view (only rendered once trip + role are resolved) ──
interface SharedCalendarViewProps {
  trip: Trip
  user: User | null
  token: string
  shareRole: ShareRole
}

function SharedCalendarView({ trip, user, token, shareRole }: SharedCalendarViewProps) {
  const router = useRouter()
  const { mutate: forkTripMutation, isPending: isForkPending } = useForkTrip()
  const [isJoining, setIsJoining] = useState(false)

  const handleFork = () => {
    forkTripMutation({ tripId: trip.id }, { onSuccess: () => router.push('/trips') })
  }

  const handleJoinToEdit = async () => {
    if (!user || user.is_anonymous) {
      router.push(`/login?next=${encodeURIComponent(`/trip/${trip.id}/share/${token}`)}`)
      return
    }
    setIsJoining(true)
    try {
      await joinTripViaLink(trip.id, user.id, 'editor')
      router.push(`/trip/${trip.id}`)
    } catch (err) {
      console.error('joinTripViaLink failed:', err)
      setIsJoining(false)
    }
  }

  const isReadOnly = shareRole === 'viewer' || shareRole === 'link-editor'

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top banner — contextual based on role */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-[#1e3a5f] text-white text-sm shrink-0">
        <div className="flex items-center gap-2 opacity-80">
          {shareRole === 'link-editor' ? (
            <Edit2 size={13} />
          ) : (
            <Lock size={13} />
          )}
          <span>
            {shareRole === 'link-editor'
              ? 'Anyone with this link can edit'
              : 'Viewing shared trip — read only'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Join to edit — for link-editor permission */}
          {shareRole === 'link-editor' && (
            <button
              onClick={handleJoinToEdit}
              disabled={isJoining}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#003594] hover:bg-[#002B7A] transition-colors text-xs font-semibold disabled:opacity-50"
            >
              {isJoining ? <Loader2 size={12} className="animate-spin" /> : <Edit2 size={12} />}
              {user && !user.is_anonymous ? 'Join to edit' : 'Sign in to edit'}
            </button>
          )}

          {/* Fork — only for read-only viewers */}
          {shareRole === 'viewer' && (
            user && !user.is_anonymous ? (
              <button
                onClick={handleFork}
                disabled={isForkPending}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs font-medium disabled:opacity-50"
              >
                {isForkPending ? <Loader2 size={12} className="animate-spin" /> : <GitFork size={12} />}
                Fork this trip
              </button>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/trip/${trip.id}/share/${token}`)}`}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs font-medium"
              >
                Sign in to fork
              </Link>
            )
          )}
        </div>
      </div>

      {/* Calendar */}
      <YjsTripProvider tripId={trip.id}>
        <CalendarDashboard
          tripId={trip.id}
          userId={user?.id ?? 'anonymous'}
          userName={user?.user_metadata?.display_name ?? ''}
          isSharedView={isReadOnly}
        />
      </YjsTripProvider>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────
export default function SharedTripPage({ params }: { params: Promise<{ id: string; token: string }> }) {
  const { id, token } = use(params)
  const router = useRouter()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [resolvedUser, setResolvedUser] = useState<User | null>(null)
  const [shareRole, setShareRole] = useState<ShareRole>('viewer')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<'invalid' | 'error' | null>(null)

  useEffect(() => {
    async function init() {
      try {
        // Resolve session (anonymous sign-in for unauthenticated visitors)
        const { data: { session } } = await supabase!.auth.getSession()
        if (!session) {
          const { error: anonError } = await supabase!.auth.signInAnonymously()
          if (anonError) throw anonError
        }
        const { data: { session: resolvedSession } } = await supabase!.auth.getSession()
        const user = resolvedSession?.user ?? null
        setResolvedUser(user)

        const fetchedTrip = await fetchTripByShareToken(token)
        if (!fetchedTrip || fetchedTrip.id !== id) {
          setError('invalid')
          return
        }

        // Owner visiting their own share link → send them to the real trip page
        if (user && !user.is_anonymous && user.id === fetchedTrip.user_id) {
          router.replace(`/trip/${fetchedTrip.id}`)
          return
        }

        // Fetch collaborators to check if the visitor is already a member
        let collaborators: TripCollaborator[] = []
        if (user && !user.is_anonymous) {
          try {
            collaborators = await fetchCollaborators(fetchedTrip.id)
          } catch {
            // non-fatal — fall back to link_permission
          }

          // Accepted collaborators → send them to the normal trip page
          const collab = collaborators.find(
            (c) => c.user_id === user.id && c.invite_status === 'accepted',
          )
          if (collab) {
            router.replace(`/trip/${fetchedTrip.id}`)
            return
          }
        }

        setTrip(fetchedTrip)
        setShareRole(resolveShareRole(fetchedTrip, user, collaborators))
      } catch (err) {
        console.error('share page init error:', err)
        setError('error')
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [id, token, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (error === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-xl font-serif font-normal text-gray-900 mb-2 tracking-wide">Something went wrong</h2>
          <p className="text-gray-500 mb-6">Unable to load this trip. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block px-6 py-2.5 rounded-xl text-white font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (error === 'invalid' || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-serif font-normal text-gray-900 mb-2 tracking-wide">Invalid or Expired Link</h2>
          <p className="text-gray-500 mb-6">
            This share link is invalid or the trip is no longer shared.
          </p>
          <Link
            href="/explore"
            className="inline-block px-6 py-2.5 rounded-xl text-white font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: BRAND }}
          >
            Explore Trips
          </Link>
        </div>
      </div>
    )
  }

  return <SharedCalendarView trip={trip} user={resolvedUser} token={token} shareRole={shareRole} />
}
