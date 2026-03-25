'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { MapPin, Loader2, Check, ArrowLeft, Sparkles } from 'lucide-react'
import { supabase, useAuthStore } from '@travyl/shared'
import { useIndexTrip } from '@/hooks/useIndexTrip'

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

interface Props {
  prefillDestination: string
  onClose: () => void
  onBack: () => void
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
}

const DURATION_CHIPS = [
  { label: 'Weekend', days: 2 },
  { label: 'Week', days: 7 },
  { label: '2 Weeks', days: 14 },
] as const

async function searchDestinations(query: string): Promise<NominatimResult[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`,
    { headers: { 'Accept-Language': 'en' } },
  )
  return res.json()
}

export function SpotlightTripCreator({ prefillDestination, onClose, onBack }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { indexTrip } = useIndexTrip()

  const tomorrow = formatDate(addDays(new Date(), 1))
  const defaultEnd = formatDate(addDays(new Date(), 8))

  const [destination, setDestination] = useState(prefillDestination)
  const [destinationConfirmed, setDestinationConfirmed] = useState(false)
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [activeSuggestion, setActiveSuggestion] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [startDate, setStartDate] = useState(tomorrow)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const destinationRef = useRef<HTMLInputElement>(null)
  const startDateRef = useRef<HTMLInputElement>(null)
  const endDateRef = useRef<HTMLInputElement>(null)
  const createBtnRef = useRef<HTMLButtonElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestionsRef = useRef<HTMLUListElement>(null)

  // Focus destination input on mount
  useEffect(() => {
    setTimeout(() => destinationRef.current?.focus(), 50)
  }, [])

  // Debounced destination search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = destination.trim()
    if (q.length < 2 || destinationConfirmed) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchDestinations(q)
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
        setActiveSuggestion(0)
      } catch {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [destination, destinationConfirmed])

  // Prefill: auto-search on mount if destination provided
  useEffect(() => {
    if (prefillDestination.trim().length >= 2) {
      searchDestinations(prefillDestination.trim()).then((results) => {
        if (results.length > 0) {
          setSuggestions(results)
          setShowSuggestions(true)
          setActiveSuggestion(0)
        }
      }).catch(() => {})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectSuggestion = useCallback((s: NominatimResult) => {
    setDestination(s.display_name)
    setDestinationConfirmed(true)
    setSuggestions([])
    setShowSuggestions(false)
    // Move focus to start date
    setTimeout(() => startDateRef.current?.focus(), 50)
  }, [])

  const handleDestinationKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showSuggestions || suggestions.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          e.stopPropagation()
          setActiveSuggestion((prev) => Math.min(prev + 1, suggestions.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          e.stopPropagation()
          setActiveSuggestion((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          e.stopPropagation()
          if (suggestions[activeSuggestion]) {
            selectSuggestion(suggestions[activeSuggestion])
          }
          break
      }
    },
    [showSuggestions, suggestions, activeSuggestion, selectSuggestion],
  )

  const handleDurationChip = useCallback(
    (days: number) => {
      if (startDate) {
        setEndDate(formatDate(addDays(new Date(startDate), days)))
      }
    },
    [startDate],
  )

  const handleCreate = useCallback(async () => {
    setError(null)

    if (!destination.trim()) {
      setError('Please enter a destination')
      destinationRef.current?.focus()
      return
    }
    if (!startDate) {
      setError('Please select a start date')
      startDateRef.current?.focus()
      return
    }
    if (!endDate) {
      setError('Please select an end date')
      endDateRef.current?.focus()
      return
    }
    if (endDate < startDate) {
      setError('End date must be after start date')
      endDateRef.current?.focus()
      return
    }
    if (!user?.id) {
      setError('You must be signed in')
      return
    }

    setIsCreating(true)
    try {
      const shortDest = destination.split(',')[0].trim()
      const { data, error: insertError } = await supabase
        .from('trips')
        .insert({
          title: `Trip to ${shortDest}`,
          destination: destination.trim(),
          start_date: startDate,
          end_date: endDate,
          status: 'planning',
          user_id: user.id,
        })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        return
      }

      // Fetch cover image (non-fatal)
      try {
        const imgRes = await fetch(`/api/destination-image?destination=${encodeURIComponent(shortDest)}`)
        const { url } = (await imgRes.json()) as { url: string | null }
        if (url) {
          await supabase.from('trips').update({ cover_image_url: url }).eq('id', data.id)
        }
      } catch {
        // Non-fatal
      }

      await queryClient.invalidateQueries({ queryKey: ['trips'] })
      indexTrip(data.id)
      onClose()
      router.push(`/trip/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip')
    } finally {
      setIsCreating(false)
    }
  }, [destination, startDate, endDate, user, queryClient, indexTrip, onClose, router])

  const duration = startDate && endDate ? daysBetween(startDate, endDate) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="flex-1 text-center">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Create a Trip</span>
        </div>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
          ESC
        </kbd>
      </div>

      {/* Form */}
      <div className="px-5 py-4 space-y-4 max-h-[400px] overflow-y-auto bg-gradient-to-b from-indigo-50/30 to-transparent dark:from-indigo-950/20 dark:to-transparent">
        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Destination */}
        <div className="relative">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            Where to?
          </label>
          <div className="relative">
            <input
              ref={destinationRef}
              type="text"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value)
                setDestinationConfirmed(false)
                setError(null)
              }}
              onFocus={() => {
                if (suggestions.length > 0 && !destinationConfirmed) setShowSuggestions(true)
              }}
              onKeyDown={handleDestinationKeyDown}
              placeholder="Paris, Tokyo, New York..."
              className="w-full h-10 pl-3 pr-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all"
            />
            {destinationConfirmed && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <Check className="w-4 h-4 text-green-500" />
              </div>
            )}
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul
              ref={suggestionsRef}
              role="listbox"
              className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden text-sm"
            >
              {suggestions.map((s, i) => (
                <li
                  key={s.place_id}
                  role="option"
                  aria-selected={i === activeSuggestion}
                  onMouseDown={() => selectSuggestion(s)}
                  onMouseEnter={() => setActiveSuggestion(i)}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                    i === activeSuggestion
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                  <span className="truncate">{s.display_name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Dates */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            When?
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={startDateRef}
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setError(null)
                // If end date is before new start, adjust it
                if (endDate && e.target.value > endDate) {
                  setEndDate(formatDate(addDays(new Date(e.target.value), 7)))
                }
              }}
              min={formatDate(new Date())}
              className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all"
            />
            <span className="text-gray-400 text-sm">-</span>
            <input
              ref={endDateRef}
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setError(null)
              }}
              min={startDate || formatDate(new Date())}
              className="flex-1 h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Duration chips */}
          <div className="flex items-center gap-2 mt-2">
            {DURATION_CHIPS.map((chip) => {
              const isActive = duration === chip.days
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleDurationChip(chip.days)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-700'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {chip.label} ({chip.days})
                </button>
              )
            })}
            {duration !== null && duration > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                {duration} day{duration !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Create button */}
        <button
          ref={createBtnRef}
          type="button"
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full h-10 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Create Trip</span>
            </>
          )}
        </button>
      </div>

      {/* Subtle bottom glow */}
      <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
    </motion.div>
  )
}
