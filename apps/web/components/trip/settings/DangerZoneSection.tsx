'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Archive, LogOut } from 'lucide-react'
import { deleteTrip, leaveTrip, updateTripDetails } from '@travyl/shared'
import type { Trip } from '@travyl/shared'
import { SectionHeading, SectionDescription, ConfirmDialog, Input } from './shared'

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
      <SectionDescription>Irreversible actions for this trip.</SectionDescription>
      <div className="space-y-4">
        {/* Archive Trip — owner only */}
        {isOwner && (
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-900">Archive Trip</p>
              <p className="text-xs text-gray-500 mt-0.5">Mark as completed and archive</p>
            </div>
            <button
              onClick={() => setArchiveOpen(true)}
              className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
            >
              Archive
            </button>
          </div>
        )}

        {/* Delete Trip — owner only */}
        {isOwner && (
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-red-600">Delete Trip</p>
              <p className="text-xs text-gray-500 mt-0.5">Permanently delete this trip and all data</p>
            </div>
            <button
              onClick={() => setDeleteOpen(true)}
              className="text-sm font-medium px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
            >
              Delete
            </button>
          </div>
        )}

        {/* Leave Trip — collaborator only */}
        {!isOwner && (
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-gray-900">Leave Trip</p>
              <p className="text-xs text-gray-500 mt-0.5">Remove yourself from this trip</p>
            </div>
            <button
              onClick={() => setLeaveOpen(true)}
              className="text-sm font-medium px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition"
            >
              Leave
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={archiveOpen}
        title="Archive Trip"
        description="Are you sure you want to archive this trip? It will be marked as completed."
        confirmLabel={loading ? 'Archiving...' : 'Archive Trip'}
        confirmColor="bg-gray-900 hover:bg-gray-800"
        onConfirm={handleArchive}
        onCancel={() => setArchiveOpen(false)}
      />

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
