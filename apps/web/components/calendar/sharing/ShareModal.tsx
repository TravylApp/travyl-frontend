'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import type { Trip, CollaboratorRole, LinkPermission } from '@travyl/shared'
import { useCollaborators, useAuthStore, updateTripVisibility, ensureShareLinkToken, rotateShareLinkToken, supabase } from '@travyl/shared'
import { InviteBar } from './InviteBar'
import { CollaboratorList } from './CollaboratorList'
import { LinkSharingSection } from './LinkSharingSection'
import { PublicSharingSection } from './PublicSharingSection'

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
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [revokeUrl, setRevokeUrl] = useState<string | null>(null)
  const isOwner = user?.id === trip.user_id
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) setRevokeUrl(null)
  }, [isOpen])

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose()
  }, [onClose])

  const handleInvite = async (email: string, role: CollaboratorRole) => {
    setIsInviting(true)
    setInviteError(null)
    setInviteLink(null)
    try {
      if (!API_URL) throw new Error('Invite service not configured (missing NEXT_PUBLIC_RECOMMENDATION_API_URL)')

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

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || `Invite failed (${res.status})`)
      }

      await queryClient.invalidateQueries({ queryKey: ['collaborators', trip.id] })

      // If SES couldn't send the email, surface the invite link so the user can share it manually
      if (data.emailWarning && data.acceptUrl) {
        setInviteLink(data.acceptUrl)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setInviteError(msg)
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

  const handleRevokeLink = async () => {
    try {
      const newToken = await rotateShareLinkToken(trip.id)
      const url = `${window.location.origin}/trip/${trip.id}/share/${newToken}`
      try {
        await navigator.clipboard.writeText(url)
        setRevokeUrl(null)
      } catch {
        setRevokeUrl(url)
      }
      await onSettingsChange?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke link'
      setInviteError(msg)
    }
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
            <div className="mb-1"><InviteBar onInvite={handleInvite} isLoading={isInviting} /></div>
            {inviteError && (
              <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{inviteError}</p>
            )}
            {inviteLink && (
              <div className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2">
                <p className="text-xs text-amber-400 mb-1">Email delivery unavailable — share this link directly:</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={inviteLink} className="flex-1 rounded bg-white/5 px-2 py-1 text-xs text-white/70 outline-none" onClick={(e) => (e.target as HTMLInputElement).select()} />
                  <button onClick={() => { navigator.clipboard.writeText(inviteLink); setInviteLink(null) }} className="shrink-0 rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/30 transition-colors">Copy</button>
                </div>
              </div>
            )}
            {revokeUrl && (
              <div className="mb-4 rounded-lg bg-amber-500/10 px-3 py-2">
                <p className="text-xs text-amber-400 mb-1">Clipboard unavailable — copy your new link:</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={revokeUrl} className="flex-1 rounded bg-white/5 px-2 py-1 text-xs text-white/70 outline-none" onClick={(e) => (e.target as HTMLInputElement).select()} />
                  <button onClick={() => { navigator.clipboard.writeText(revokeUrl); setRevokeUrl(null) }} className="shrink-0 rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/30 transition-colors">Copy</button>
                </div>
              </div>
            )}
            <div className="mb-5">
              <CollaboratorList
                ownerName={user?.user_metadata?.display_name ?? user?.email ?? 'You'}
                ownerEmail={user?.email ?? ''}
                collaborators={collaborators}
                onChangeRole={(id, role) => updateRole({ collaboratorId: id, role })}
                onRemove={removeCollaborator}
              />
            </div>
            <PublicSharingSection
              tripId={trip.id}
              currentVisibility={trip.visibility}
              currentLinkPermission={trip.link_permission}
              isOwner={isOwner}
              onSettingsChange={onSettingsChange ?? (() => Promise.resolve())}
            />
            <LinkSharingSection
              visibility={trip.visibility}
              linkPermission={trip.link_permission}
              shareToken={trip.share_link_token}
              isOwner={isOwner}
              onToggleLinkSharing={handleToggleLinkSharing}
              onChangeLinkPermission={handleChangeLinkPermission}
              onCopyLink={handleCopyLink}
              onRevokeLink={handleRevokeLink}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
