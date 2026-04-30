'use client'

interface UnsavedChangesDialogProps {
  isOpen: boolean
  onDiscard: () => void
  onSave?: () => void
  onSaveAndContinue?: () => void
  onCancel: () => void
  isSaving?: boolean
  targetLabel?: string
}

export function UnsavedChangesDialog({ isOpen, onDiscard, onSave, onSaveAndContinue, onCancel, isSaving, targetLabel }: UnsavedChangesDialogProps) {
  const handleSave = onSaveAndContinue || onSave || (() => {})
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-white dark:bg-[#1a2535] rounded-xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unsaved Changes</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          You have unsaved changes. What would you like to do?
        </p>
        <div className="flex gap-2">
          <button onClick={onDiscard} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-red-500">
            Discard
          </button>
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
            Cancel
          </button>
          <button onClick={handleSave} disabled={isSaving} className="flex-1 px-4 py-2 rounded-lg bg-[#1e3a5f] text-white text-sm font-medium disabled:opacity-50">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
