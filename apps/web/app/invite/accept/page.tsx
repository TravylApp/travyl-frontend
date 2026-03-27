'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { supabase, acceptInviteByToken } from '@travyl/shared'

type Status = 'loading' | 'success' | 'invalid' | 'already-accepted' | 'error'

function AcceptInviteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      return
    }

    async function accept() {
      try {
        const { data: { session } } = await supabase!.auth.getSession()

        if (!session) {
          const next = `/invite/accept?token=${token}`
          router.replace(`/login?next=${encodeURIComponent(next)}`)
          return
        }

        const { tripId } = await acceptInviteByToken(token!)
        setStatus('success')
        setTimeout(() => router.replace(`/trip/${tripId}`), 1200)
      } catch (err: any) {
        const msg = err?.message ?? ''
        if (msg.includes('Results contain 0 rows') || msg.includes('PGRST116') || msg.includes('not found or already accepted')) {
          setStatus('already-accepted')
        } else {
          console.error('accept invite error:', err)
          setStatus('error')
        }
      }
    }

    accept()
  }, [token, router])

  return (
    <div className="min-h-screen bg-[#f8f6f3] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="mb-8">
          <span className="text-[#1e3a5f] font-black text-2xl tracking-[2px]">TRAVYL</span>
        </div>

        {status === 'loading' && (
          <div className="space-y-3">
            <Loader2 size={36} className="mx-auto animate-spin text-[#1e3a5f]" />
            <p className="text-[#1e3a5f] font-semibold text-base">Accepting invite&hellip;</p>
            <p className="text-[#1e3a5f]/50 text-sm">Just a moment</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3">
            <CheckCircle size={36} className="mx-auto text-emerald-500" />
            <p className="text-[#1e3a5f] font-semibold text-base">You&apos;re in!</p>
            <p className="text-[#1e3a5f]/50 text-sm">Redirecting to your trip&hellip;</p>
          </div>
        )}

        {status === 'already-accepted' && (
          <div className="space-y-4">
            <CheckCircle size={36} className="mx-auto text-[#003594]" />
            <p className="text-[#1e3a5f] font-semibold text-base">Already accepted</p>
            <p className="text-[#1e3a5f]/50 text-sm">
              This invite has already been used. Head to your trips to find it.
            </p>
            <Link
              href="/trips"
              className="inline-block mt-2 px-6 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#2a4d78] transition-colors"
            >
              My Trips
            </Link>
          </div>
        )}

        {status === 'invalid' && (
          <div className="space-y-4">
            <XCircle size={36} className="mx-auto text-red-400" />
            <p className="text-[#1e3a5f] font-semibold text-base">Invalid invite link</p>
            <p className="text-[#1e3a5f]/50 text-sm">
              This invite link is invalid or has expired. Ask the trip owner to send a new one.
            </p>
            <Link
              href="/"
              className="inline-block mt-2 px-6 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#2a4d78] transition-colors"
            >
              Go Home
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <XCircle size={36} className="mx-auto text-red-400" />
            <p className="text-[#1e3a5f] font-semibold text-base">Something went wrong</p>
            <p className="text-[#1e3a5f]/50 text-sm">
              We couldn&apos;t process your invite. Please try clicking the link again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-6 py-2.5 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#2a4d78] transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8f6f3] flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-[#1e3a5f]" />
        </div>
      }
    >
      <AcceptInviteInner />
    </Suspense>
  )
}
