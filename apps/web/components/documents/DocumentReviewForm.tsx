'use client'

import { type DocumentType } from '@travyl/shared'

const DOCUMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'hotel', label: 'Hotel Booking' },
  { value: 'flight', label: 'Flight Itinerary' },
  { value: 'car', label: 'Car Rental' },
  { value: 'activity', label: 'Activity / Tour' },
]

interface Props {
  documentType: string
  onSelectType: (hint: string) => void
}

/**
 * Shown inside the review modal when the document was classified as "other".
 * Lets the user pick what kind of document it actually is and re-parse with that hint.
 */
export function DocumentReviewForm({ documentType, onSelectType }: Props) {
  if (documentType !== 'other') return null

  return (
    <div className="space-y-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
        What type of document is this?
      </p>
      <div className="flex flex-wrap gap-1.5">
        {DOCUMENT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelectType(opt.value)}
            className="px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/40 rounded-full hover:bg-blue-200 dark:hover:bg-blue-700/40 transition-colors"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
