'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Archive, LogOut, AlertTriangle } from 'lucide-react'
import { deleteTrip, leaveTrip, updateTripDetails } from '@travyl/shared'
import type { Trip } from '@travyl/shared'
import { SectionHeading, ConfirmDialog, Input } from './shared'

interface DangerZoneSectionProps {
  trip: Trip
  userId: string
  isOwner: boolean
}

export function DangerZoneSection({ trip, userId, isOwner }: DangerZoneSectionProps) {
  const router = useRouter()
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  const deleteMatch = deleteConfirmText.toLowerCase().trim() === trip.title.toLowerCase().trim()

  const handleArchive = async () => {
    setLoading(true)
    try {
      await updateTripDetails(trip.id, { status: 'completed' })
      setArchiveOpen(false)
      router.push('/trips')
    } catch {
      alert('Failed to archive trip')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteMatch) return
    setLoading(true)
    try {
      await deleteTrip(trip.id)
      setDeleteOpen(false)
      router.push('/trips')
    } catch {
      alert('Failed to delete trip')
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async () => {
    setLoading(true)
    try {
      await leaveTrip(trip.id, userId)
      setLeaveOpen(false)
      router.push('/trips')
    } catch {
      alert('Failed to leave trip')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <SectionHeading>Danger Zone</SectionHeading>
      <div className="space-y-4">
        {/* Archive Trip — owner only */}
        {isOwner && (
          <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Archive Trip</p>
              <p className="text-xs text-gray-600 mt-0.5">Mark this trip as completed and archive it</p>
            </div>
            <button
              onClick={() => setArchiveOpen(true)}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition"
            >
              <Archive size={14} />
              Archive
            </button>
          </div>
        )}

        {/* Delete Trip — owner only */}
        {isOwner && (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-600" />
              <p className="text-sm font-bold text-red-700">Delete Trip</p>
            </div>
            <p className="text-xs text-red-600 mb-3">
              Permanently delete this trip and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
            >
              <Trash2 size={14} />
              Delete Trip
            </button>
          </div>
        )}

        {/* Leave Trip — collaborator only */}
        {!isOwner && (
          <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Leave Trip</p>
              <p className="text-xs text-gray-600 mt-0.5">Remove yourself from this trip</p>
            </div>
            <button
              onClick={() => setLeaveOpen(true)}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition"
            >
              <LogOut size={14} />
              Leave
            </button>
          </div>
        )}
      </div>

      {/* Archive Confirmation */}
      <ConfirmDialog
        open={archiveOpen}
        title="Archive Trip"
        description="Are you sure you want to archive this trip? It will be marked as completed."
        confirmLabel={loading ? 'Archiving...' : 'Archive Trip'}
        confirmColor="bg-amber-600 hover:bg-amber-700"
        onConfirm={handleArchive}
        onCancel={() => setArchiveOpen(false)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        title="Delete Trip"
        description={`This will permanently delete "${trip.title}" and all its data. Type the trip name to confirm.`}
        confirmLabel={loading ? 'Deleting...' : 'Delete Forever'}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteOpen(false); setDeleteConfirmText('') }}
      >
        <Input
          value={deleteConfirmText}
          onChange={setDeleteConfirmText}
          placeholder={trip.title}
        />
        {deleteConfirmText.length > 0 && !deleteMatch && (
          <p className="text-xs text-red-500 mt-1">Trip name doesn&apos;t match</p>
        )}
      </ConfirmDialog>

      {/* Leave Confirmation */}
      <ConfirmDialog
        open={leaveOpen}
        title="Leave Trip"
        description="Are you sure you want to leave this trip? You&apos;ll lose access unless invited again."
        confirmLabel={loading ? 'Leaving...' : 'Leave Trip'}
        onConfirm={handleLeave}
        onCancel={() => setLeaveOpen(false)}
      />
    </div>
  )
}
