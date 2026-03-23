'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, GitFork } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase, fetchTripByShareToken, useForkTrip } from '@travyl/shared'
import type { Trip } from '@travyl/shared'
import { YjsTripProvider } from '@/components/calendar/providers/YjsTripProvider'
import { CalendarDashboard } from '@/components/calendar/CalendarDashboard'

const BRAND = '#1e3a5f'

function SharedCalendarView({ trip, resolvedUser: user, token }: { trip: Trip; resolvedUser: User | null; token: string }) {
  const router = useRouter()
  const { mutate: forkTripMutation, isPending } = useForkTrip()

  const handleFork = () => {
    forkTripMutation(
      { tripId: trip.id },
      { onSuccess: () => router.push('/trips') },
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Read-only banner */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-[#1e3a5f] text-white text-sm shrink-0">
        <div className="flex items-center gap-2">
          <Lock size={13} className="opacity-70" />
          <span className="opacity-80">Viewing shared trip — read only</span>
        </div>
        <div className="flex items-center gap-3">
          {user && !user.is_anonymous ? (
            <button
              onClick={handleFork}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs font-medium disabled:opacity-50"
            >
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <GitFork size={12} />}
              Fork this trip
            </button>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(`/trip/${trip.id}/share/${token}`)}`}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs font-medium"
            >
              Sign in to fork
            </Link>
          )}
        </div>
      </div>

      {/* Calendar */}
      <YjsTripProvider tripId={trip.id}>
        <CalendarDashboard
          tripId={trip.id}
          userId={user?.id ?? 'anonymous'}
          userName={user?.user_metadata?.display_name ?? ''}
          isSharedView={true}
        />
      </YjsTripProvider>
    </div>
  )
}

export default function SharedTripPage({ params }: { params: Promise<{ id: string; token: string }> }) {
  const { id, token } = use(params)
  const [trip, setTrip] = useState<Trip | null>(null)
  const [resolvedUser, setResolvedUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<'invalid' | 'error' | null>(null)

  useEffect(() => {
    async function init() {
      try {
        // Check if user already has a session (authenticated users skip anonymous sign-in)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          const { error: anonError } = await supabase.auth.signInAnonymously()
          if (anonError) throw anonError
        }

        // Re-read session after potential anonymous sign-in to get the resolved user
        const { data: { session: resolvedSession } } = await supabase.auth.getSession()
        setResolvedUser(resolvedSession?.user ?? null)

        const fetchedTrip = await fetchTripByShareToken(token)
        if (!fetchedTrip) {
          setError('invalid')
        } else if (fetchedTrip.id !== id) {
          console.warn('share page: token/id mismatch', { urlId: id, tripId: fetchedTrip.id })
          setError('invalid')
        } else {
          setTrip(fetchedTrip)
        }
      } catch (err) {
        console.error('share page init error:', err)
        setError('error')
      } finally {
        setIsLoading(false)
      }
    }

    init()
  }, [id, token])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-gray-400" />
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invalid or Expired Link</h2>
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

  if (error === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
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

  return <SharedCalendarView trip={trip} resolvedUser={resolvedUser} token={token} />
}
