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
import { useQueryClient } from '@tanstack/react-query'

const BRAND = '#1e3a5f'

// ─── Derived permission for share page ────────────────────────
type ShareRole = 'owner' | 'editor' | 'viewer' | 'link-editor'

function resolveShareRole(
  trip: Trip,
  user: User | null,
  collaborators: TripCollaborator[],
): ShareRole {
  console.log('[resolveShareRole] DETAILED CHECK:', {
    tripId: trip.id,
    userId: user?.id,
    isAnonymous: user?.is_anonymous,
    tripOwnerId: trip.user_id,
    linkPermission: trip.link_permission,
    linkPermissionType: typeof trip.link_permission,
    linkPermissionValue: `"${trip.link_permission}"`,
    isEditor: trip.link_permission === 'editor',
    collaboratorsCount: collaborators.length
  })

  if (!user || user.is_anonymous) {
    const shouldEdit = trip.link_permission === 'editor'
    console.log('[resolveShareRole] Anonymous check:', { shouldEdit, actualPermission: trip.link_permission })
    const role = shouldEdit ? 'link-editor' : 'viewer'
    console.log('[resolveShareRole] Anonymous user, role:', role)
    return role
  }
  if (trip.user_id === user.id) {
    console.log('[resolveShareRole] User is owner')
    return 'owner'
  }
  const collab = collaborators.find((c) => c.user_id === user.id && c.invite_status === 'accepted')
  if (collab) {
    const role = collab.role_type === 'editor' ? 'editor' : 'viewer'
    console.log('[resolveShareRole] User is collaborator, role:', role)
    return role
  }
  const shouldEdit = trip.link_permission === 'editor'
  console.log('[resolveShareRole] Non-collaborator check:', { shouldEdit, actualPermission: trip.link_permission })
  const role = shouldEdit ? 'link-editor' : 'viewer'
  console.log('[resolveShareRole] Non-collaborator user, role:', role)
  return role
}

// ─── "Open in App" banner ───────────────────────────────────────
// Shown on iOS / Android browsers when someone taps a shared link.
// Until the mobile app has Universal Links / App Links wired (which
// requires a new native build with associatedDomains entitlements),
// this banner is the bridge: tapping fires the `travyl://trip/<id>`
// custom-scheme URL — if Travyl is installed on the device, the OS
// hands the link off to the app; otherwise the page stays open.
function OpenInAppBanner({ tripId }: { tripId: string }) {
  const [isMobile, setIsMobile] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '') || ''
    const mobile = /iPhone|iPad|iPod|Android/i.test(ua)
    setIsMobile(mobile)
    // Remember dismissal for the rest of the session.
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('travyl-open-in-app-dismissed') === '1') {
      setDismissed(true)
    }
  }, [])

  if (!isMobile || dismissed) return null

  const handleOpen = () => {
    // Try the deep link. iOS will prompt "Open in Travyl?"; Android
    // routes to the app if installed, falls back to staying on the
    // page otherwise. We don't auto-redirect to the App Store because
    // the user might prefer the web view.
    window.location.href = `travyl://trip/${tripId}`
  }

  const handleDismiss = () => {
    setDismissed(true)
    try { sessionStorage.setItem('travyl-open-in-app-dismissed', '1') } catch {}
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-[#142846] text-white text-sm shrink-0 relative z-[101] border-b border-white/10">
      <div className="flex items-center gap-2">
        <span className="font-semibold">Open in Travyl app</span>
        <span className="opacity-70 hidden sm:inline">— better experience</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleOpen}
          className="px-4 py-1.5 rounded-lg bg-white text-[#142846] text-xs font-bold hover:bg-gray-100 transition-colors"
        >
          Open
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="px-2 py-1.5 rounded-lg text-white/70 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// ─── Inner view (only rendered once trip + role are resolved) ──
interface SharedCalendarViewProps {
  trip: Trip
  user: User | null
  token: string
  shareRole: ShareRole
  joinError: string | null
  setJoinError: (error: string | null) => void
  onClearError: () => void
}

function SharedCalendarView({ trip, user, token, shareRole, joinError, setJoinError, onClearError }: SharedCalendarViewProps) {
  console.log('[SharedCalendarView] Rendering with shareRole:', shareRole, 'userId:', user?.id, 'trip.link_permission:', trip.link_permission)
  const router = useRouter()
  const queryClient = useQueryClient()
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
      console.log('[SharePage] User joining trip:', trip.id, 'user:', user.id)

      // Check if already a collaborator using the SECURITY DEFINER function
      // This bypasses RLS to avoid infinite recursion
      const { data: existingCollabList, error: checkError } = await supabase
        .rpc('get_user_collaboration', {
          p_trip_id: trip.id,
          p_user_id: user.id
        })

      // Get the first collaboration record (if any)
      const existingCollab = existingCollabList && existingCollabList.length > 0 ? existingCollabList[0] : null

      console.log('[SharePage] Existing collaborator check:', {
        hasData: !!existingCollab,
        data: existingCollab,
        hasError: !!checkError,
        error: checkError ? {
          message: checkError.message,
          code: checkError.code,
          details: checkError.details,
          hint: checkError.hint
        } : null
      })

      if (checkError) {
        console.error('[SharePage] Error checking existing collaborator:', JSON.stringify({
          message: checkError.message,
          code: checkError.code,
          details: checkError.details,
          hint: checkError.hint,
          timestamp: new Date().toISOString()
        }, null, 2))
      }

      if (existingCollab) {
        console.log('[SharePage] User already a collaborator, redirecting to trip. Status:', existingCollab.invite_status)
        // If already accepted, just redirect to trip
        if (existingCollab.invite_status === 'accepted') {
          router.push(`/trip/${trip.id}`)
          return
        }
        // If pending or cancelled, update to accepted via SECURITY DEFINER RPC.
        // Direct UPDATE would fail because RLS requires user_id = auth.uid(),
        // and the pending row has user_id = NULL.  The RPC also sets user_id
        // so get_collaborator_trips later includes this trip.
        if (existingCollab.invite_status === 'pending' || existingCollab.invite_status === 'cancelled') {
          const { error: updateError } = await supabase
            .rpc('accept_pending_collaboration', { p_collab_id: existingCollab.id })

          if (updateError) {
            console.error('[SharePage] Failed to update existing collaborator:', JSON.stringify({
              message: updateError.message,
              code: updateError.code,
              details: updateError.details,
              hint: updateError.hint
            }, null, 2))
            setJoinError('Failed to join trip. Please try again.')
            setIsJoining(false)
            return
          }

          console.log('[SharePage] Updated existing collaborator to accepted, redirecting to trip')
          router.push(`/trip/${trip.id}`)
          return
        }
      }

      await joinTripViaLink(trip.id, user.id, 'editor')
      console.log('[SharePage] Successfully joined, invalidating trips cache')
      // Invalidate trips cache to include the newly joined trip
      await queryClient.invalidateQueries({ queryKey: ['trips'] })
      // Also refetch the trips to ensure the cache is updated
      await queryClient.refetchQueries({ queryKey: ['trips'] })
      console.log('[SharePage] Cache invalidated and refetched, navigating to trip')
      router.push(`/trip/${trip.id}`)
    } catch (err) {
      console.error('[SharePage] joinTripViaLink failed:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2))
      setJoinError(err instanceof Error ? err.message : 'Failed to join trip. Please try again.')
      setIsJoining(false)
    }
  }

  const isReadOnly = shareRole === 'viewer' || shareRole === 'link-editor'

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Open in app — only renders on iOS/Android browsers when the
          Travyl app is plausibly installed. Tapping fires the
          `travyl://trip/<id>` scheme; if the app handles it the OS
          switches; otherwise the page stays open. */}
      <OpenInAppBanner tripId={trip.id} />
      {/* Top banner — contextual based on role */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-[#1e3a5f] text-white text-sm shrink-0 relative z-[100]">
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
          {shareRole === 'link-editor' && !joinError && (
            <>
              {console.log('[Banner] Rendering Join to edit button')}
              <button
                onClick={handleJoinToEdit}
                disabled={isJoining}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#003594] hover:bg-[#002B7A] transition-colors text-xs font-semibold disabled:opacity-50"
              >
                {isJoining ? <Loader2 size={12} className="animate-spin" /> : <Edit2 size={12} />}
                {user && !user.is_anonymous ? 'Join to edit' : 'Sign in to edit'}
              </button>
            </>
          )}
          {joinError && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <span>{joinError}</span>
              <button onClick={onClearError} className="underline hover:no-underline">✕</button>
            </div>
          )}
          {shareRole !== 'link-editor' && (
            <>{console.log('[Banner] NOT rendering Join to edit button, shareRole:', shareRole)}</>
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
          userName={user?.user_metadata?.display_name ?? user?.user_metadata?.full_name ?? user?.email ?? ''}
          userAvatarUrl={user?.user_metadata?.avatar_url ?? null}
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
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      try {
        // Resolve session. Try anonymous sign-in for unauthenticated visitors so
        // they get a Supabase user (needed for presence + collab writes). If the
        // project has anonymous sign-ins disabled, fall through as a logged-out
        // viewer — read-only access via fetchTripByShareToken still works.
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          const { error: anonError } = await supabase.auth.signInAnonymously()
          if (anonError) {
            // eslint-disable-next-line no-console
            console.warn('[SharePage] Anonymous sign-in unavailable; viewing as logged-out user', anonError.message)
          }
        }
        const { data: { session: resolvedSession } } = await supabase.auth.getSession()
        const user = resolvedSession?.user ?? null
        setResolvedUser(user)

        const fetchedTrip = await fetchTripByShareToken(token)
        console.log('[SharePage] Fetched trip:', { id: fetchedTrip?.id, link_permission: fetchedTrip?.link_permission, visibility: fetchedTrip?.visibility })
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

        const resolvedRole = resolveShareRole(fetchedTrip, user, collaborators)
        console.log('[SharePage] Setting shareRole to:', resolvedRole)
        setTrip(fetchedTrip)
        setShareRole(resolvedRole)
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

  const handleClearError = () => {
    setJoinError(null)
  }

  return <SharedCalendarView trip={trip} user={resolvedUser} token={token} shareRole={shareRole} joinError={joinError} setJoinError={setJoinError} onClearError={handleClearError} />
}
