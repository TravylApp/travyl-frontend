'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Check, AlertTriangle, Loader2, CalendarClock } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, type DocumentParseResult, type DocumentType } from '@travyl/shared'
import { writeDocumentToTrip, invalidateDocumentCaches } from './WriteActions'
import { DocumentReviewForm } from './DocumentReviewForm'

function extractValue(val: any): number | null {
  if (val == null) return null
  if (typeof val === 'number') return val
  if (typeof val === 'object' && 'value' in val) return val.value
  const n = Number(val)
  return isNaN(n) ? null : n
}

const TYPE_COLORS: Record<DocumentType, string> = {
  hotel: '#3B82F6',
  flight: '#8B5CF6',
  car: '#F59E0B',
  activity: '#10B981',
  other: '#6B7280',
}

const TYPE_LABELS: Record<DocumentType, string> = {
  hotel: 'Hotel Booking',
  flight: 'Flight Itinerary',
  car: 'Car Rental',
  activity: 'Activity / Tour',
  other: 'Document',
}

interface Props {
  result: DocumentParseResult
  tripId?: string
  onClose: () => void
  onConfirm: () => void
  onReparse?: (hint: string) => void
}

interface TripOption {
  id: string
  title: string
  startDate: string | null
  endDate: string | null
}

export function DocumentReviewModal({ result, tripId, onClose, onConfirm, onReparse }: Props) {
  const queryClient = useQueryClient()
  const [isWriting, setIsWriting] = useState(false)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [localData, setLocalData] = useState(result.data as Record<string, any>)
  const [selectedTripId, setSelectedTripId] = useState(tripId ?? '')
  const [userTrips, setUserTrips] = useState<TripOption[]>([])
  const [loadingTrips, setLoadingTrips] = useState(false)
  const [existingActivities, setExistingActivities] = useState<Array<{ starting_date: string; ending_date: string }>>([])
  const [dateOverlapWarning, setDateOverlapWarning] = useState<string | null>(null)

  // Fetch user's trips when no tripId provided
  useEffect(() => {
    if (tripId) return
    const fetchTrips = async () => {
      setLoadingTrips(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('trips')
        .select('id, title, start_date, end_date')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })
        .limit(50)
      if (!error && data) {
        setUserTrips(data.map((t: any) => ({
          id: t.id,
          title: t.title,
          startDate: t.start_date,
          endDate: t.end_date,
        })))
        if (data.length > 0 && !selectedTripId) {
          setSelectedTripId(data[0].id)
        }
      }
      setLoadingTrips(false)
    }
    fetchTrips()
  }, [tripId, selectedTripId])

  // Check for date conflicts
  const docStartDate = localData.checkIn ?? localData.departureAt?.split('T')[0] ?? localData.pickupAt?.split('T')[0] ?? localData.date ?? null
  const docEndDate = localData.checkOut ?? localData.arrivalAt?.split('T')[0] ?? localData.dropoffAt?.split('T')[0] ?? localData.date ?? null

  useEffect(() => {
    if (!docStartDate || !selectedTripId) return
    const fetchActivities = async () => {
      const { data } = await supabase
        .from('activity')
        .select('starting_date, ending_date')
        .eq('trip_id', selectedTripId)
        .not('is_activity_deleted', 'eq', true)
      if (data) {
        setExistingActivities(data)
        const start = new Date(docStartDate)
        const end = docEndDate ? new Date(docEndDate) : start
        const overlaps = data.filter((a) => {
          const aStart = new Date(a.starting_date)
          const aEnd = new Date(a.ending_date ?? a.starting_date)
          return start <= aEnd && end >= aStart
        })
        if (overlaps.length > 0) {
          setDateOverlapWarning(`Dates overlap with ${overlaps.length} existing ${overlaps.length === 1 ? 'activity' : 'activities'} on this trip`)
        } else {
          setDateOverlapWarning(null)
        }
      }
    }
    fetchActivities()
  }, [selectedTripId, docStartDate, docEndDate])

  const confidenceLevel = result.confidence >= 0.8 ? 'high' : result.confidence >= 0.5 ? 'medium' : 'low'
  const confidenceColor = confidenceLevel === 'high' ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
    : confidenceLevel === 'medium' ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
    : 'text-red-600 bg-red-50 dark:bg-red-900/20'

  const handleFieldChange = (field: string, value: any) => {
    setLocalData((prev) => ({ ...prev, [field]: value }))
  }

  const handleConfirm = async () => {
    if (!selectedTripId) {
      setWriteError('Please select a trip first')
      return
    }
    setIsWriting(true)
    setWriteError(null)
    try {
      await writeDocumentToTrip(result.documentType, localData, selectedTripId)
      invalidateDocumentCaches(queryClient, selectedTripId)
      onConfirm()
    } catch (err: any) {
      setWriteError(err.message ?? 'Failed to save')
    } finally {
      setIsWriting(false)
    }
  }

  const skipFields = new Set(['alternatives', 'note'])

  const renderField = (key: string, value: any) => {
    if (skipFields.has(key)) return null
    if (key === 'value') return null

    // Handle AlternativeValue objects
    if (value && typeof value === 'object' && 'value' in value) {
      const alt = value as { value: any; alternatives?: any[]; note?: string }
      return (
        <div key={key} className="space-y-1">
          <label className="block text-xs font-medium text-gray-500 capitalize">{key}</label>
          <div className="flex gap-2 items-center">
            <input
              type={typeof alt.value === 'number' ? 'number' : 'text'}
              value={localData[key] ?? alt.value ?? ''}
              onChange={(e) => handleFieldChange(key, e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            />
            {alt.alternatives?.length ? (
              <select
                onChange={(e) => {
                  if (e.target.value) handleFieldChange(key, Number(e.target.value))
                }}
                className="px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="">Alternatives</option>
                {alt.alternatives.map((a: any, i: number) => (
                  <option key={i} value={a}>{a}</option>
                ))}
              </select>
            ) : null}
          </div>
          {alt.note && <p className="text-xs text-gray-400">{alt.note}</p>}
        </div>
      )
    }

    return (
      <div key={key} className="space-y-1">
        <label className="block text-xs font-medium text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
        <input
          type={typeof value === 'number' ? 'number' : 'text'}
          value={localData[key] ?? value ?? ''}
          onChange={(e) => handleFieldChange(key, e.target.value)}
          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        />
      </div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: TYPE_COLORS[result.documentType] }}
              >
                {TYPE_LABELS[result.documentType]}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${confidenceColor}`}>
                {confidenceLevel === 'high' ? 'High confidence' : confidenceLevel === 'medium' ? 'Medium confidence' : 'Low confidence — verify'}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Low confidence warning */}
          {confidenceLevel === 'low' && (
            <div className="mx-5 mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-600 dark:text-red-400">
                This document was hard to read. Please carefully verify all fields before saving.
              </p>
            </div>
          )}

          {/* Date conflict warning */}
          {dateOverlapWarning && (
            <div className="mx-5 mt-3 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-2">
              <CalendarClock className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-600 dark:text-yellow-400">{dateOverlapWarning}</p>
            </div>
          )}

          {/* Trip selector (when no trip context) */}
          {!tripId && (
            <div className="px-5 pt-4 space-y-2">
              <label className="block text-xs font-medium text-gray-500">Add to Trip</label>
              {loadingTrips ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                  <span className="text-xs text-gray-400">Loading trips...</span>
                </div>
              ) : userTrips.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  Create a trip first, then come back to add this document.
                </p>
              ) : (
                <select
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                >
                  {userTrips.map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Fields */}
          <div className="px-5 py-4 space-y-3">
            {result.documentType === 'other' && onReparse && (
              <DocumentReviewForm documentType="other" onSelectType={onReparse} />
            )}
            {Object.entries(result.data).map(([key, value]) => renderField(key, value))}
            {result.rawText && result.documentType === 'other' && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500">Extracted Text</label>
                <textarea
                  readOnly
                  value={result.rawText}
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 h-24 resize-none"
                />
              </div>
            )}
          </div>

          {/* Error */}
          {writeError && (
            <div className="px-5 pb-2">
              <p className="text-xs text-red-500">{writeError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 h-9 text-sm font-medium text-gray-600 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isWriting}
              className="flex items-center gap-1.5 px-4 h-9 text-sm font-semibold text-white rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--trip-base, #1e3a5f)' }}
            >
              {isWriting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isWriting ? 'Adding...' : 'Add to Trip'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
