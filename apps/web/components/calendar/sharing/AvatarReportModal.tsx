'use client'

import { useState } from 'react'

export interface AvatarReportDraft {
  reportedUserId: string | null
  reportedLabel: string
  reason: string
}

interface ReportTarget {
  collaboratorId: string
  reportedUserId: string | null
  reportedLabel: string
  avatarUrl?: string | null
  sourceTripId?: string
}

interface AvatarReportModalProps {
  isOpen: boolean
  target: ReportTarget | null
  onClose: () => void
  onSubmit: (draft: AvatarReportDraft) => void
}

export function AvatarReportModal({ isOpen, target, onClose, onSubmit }: AvatarReportModalProps) {
  const [reason, setReason] = useState('')

  if (!isOpen || !target) return null

  const handleSubmit = () => {
    onSubmit({ reportedUserId: target.reportedUserId, reportedLabel: target.reportedLabel, reason })
    onClose()
    setReason('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-[#1a2535] rounded-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Report Avatar</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Report inappropriate avatar for {target.reportedLabel}
        </p>
        {target.avatarUrl && (
          <img src={target.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover mx-auto mb-4" />
        )}
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Describe the issue..."
          className="w-full h-24 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0c1117] text-sm text-gray-900 dark:text-white resize-none"
        />
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium disabled:opacity-50"
          >
            Report
          </button>
        </div>
      </div>
    </div>
  )
}
