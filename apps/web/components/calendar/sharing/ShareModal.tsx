'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import type { Trip, CollaboratorRole, LinkPermission } from '@travyl/shared'
import { useCollaborators, useAuthStore, updateTripVisibility, ensureShareLinkToken, supabase } from '@travyl/shared'
import { InviteBar } from './InviteBar'
import { CollaboratorList } from './CollaboratorList'
import { LinkSharingSection } from './LinkSharingSection'

const API_URL = process.env.NEXT_PUBLIC_RECOMMENDATION_API_URL

interface ShareModalProps {
  trip: Trip
  isOpen: boolean
  onClose: () => void
  onSettingsChange?: () => Promise<void>
}

export function ShareModal({ trip, isOpen, onClose, onSettingsChange }: ShareModalProps) {
  const user = useAuthStore((s) => s.user)
  const { collaborators, updateRole, removeCollaborator } = useCollaborators(isOpen ? trip.id : undefined)
  const queryClient = useQueryClient()
  const [isInviting, setIsInviting] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose()
  }, [onClose])

  const handleInvite = async (email: string, role: CollaboratorRole) => {
    setIsInviting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${API_URL}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tripId: trip.id, email, role }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Invite failed (${res.status})`)
      }

      await queryClient.invalidateQueries({ queryKey: ['collaborators', trip.id] })
    } catch (err) {
      console.error('Invite failed:', err instanceof Error ? err.message : JSON.stringify(err))
      throw err
    } finally {
      setIsInviting(false)
    }
  }

  const handleToggleLinkSharing = async () => {
    await updateTripVisibility(trip.id, 'link')
    await ensureShareLinkToken(trip.id)
    await onSettingsChange?.()
  }

  const handleChangeLinkPermission = async (permission: LinkPermission) => {
    await updateTripVisibility(trip.id, trip.visibility, permission)
    await onSettingsChange?.()
  }

  const handleCopyLink = async () => {
    const token = await ensureShareLinkToken(trip.id)
    const url = `${window.location.origin}/trip/${trip.id}/share/${token}`
    await navigator.clipboard.writeText(url)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleBackdropClick}>
          <motion.div ref={modalRef} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md rounded-xl border border-white/10 bg-[#1a1a2e] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Share &ldquo;{trip.title}&rdquo;</h2>
              <button onClick={onClose} className="text-white/40 transition-colors hover:text-white">&times;</button>
            </div>
            <div className="mb-5"><InviteBar onInvite={handleInvite} isLoading={isInviting} /></div>
            <div className="mb-5">
              <CollaboratorList
                ownerName={user?.user_metadata?.display_name ?? user?.email ?? 'You'}
                ownerEmail={user?.email ?? ''}
                collaborators={collaborators}
                onChangeRole={(id, role) => updateRole({ collaboratorId: id, role })}
                onRemove={removeCollaborator}
              />
            </div>
            <LinkSharingSection
              visibility={trip.visibility}
              linkPermission={trip.link_permission}
              shareToken={trip.share_link_token}
              onToggleLinkSharing={handleToggleLinkSharing}
              onChangeLinkPermission={handleChangeLinkPermission}
              onCopyLink={handleCopyLink}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
