'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { X, MapPin } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { PaperPlane } from '@/components/ui'
import { useAuthStore } from '@travyl/shared'
import { supabase } from '@travyl/shared'
import { useIndexTrip } from '@/hooks/useIndexTrip'

const LeafletMap = dynamic(() => import('@/components/leaflet-map'), { ssr: false })

interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

interface CreateTripModalProps {
  open: boolean
  onClose: () => void
}

interface FieldErrors {
  title?: string
  destination?: string
  start_date?: string
  end_date?: string
}

export function CreateTripModal({ open, onClose }: CreateTripModalProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { indexTrip } = useIndexTrip()

  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [landmarks, setLandmarks] = useState<{ id: string; lat: number; lng: number; name: string; color: string; category: string }[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const destinationWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setTitle('')
      setDestination('')
      setStartDate('')
      setEndDate('')
      setFieldErrors({})
      setError(null)
      setSubmitting(false)
      setSuggestions([])
      setSuggestionsOpen(false)
      setSelectedCoords(null)
      setLandmarks([])
    }
  }, [open])

  // Debounced Nominatim fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = destination.trim()
    if (q.length < 2) {
      setSuggestions([])
      setSuggestionsOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        )
        const data: NominatimResult[] = await res.json()
        setSuggestions(data)
        setSuggestionsOpen(data.length > 0)
      } catch {
        setSuggestions([])
        setSuggestionsOpen(false)
      }
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [destination])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (destinationWrapperRef.current && !destinationWrapperRef.current.contains(e.target as Node)) {
        setSuggestionsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function selectSuggestion(s: NominatimResult) {
    setDestination(s.display_name)
    setSelectedCoords({ lat: parseFloat(s.lat), lon: parseFloat(s.lon) })
    setSuggestions([])
    setSuggestionsOpen(false)
    setFieldErrors((prev) => ({ ...prev, destination: undefined }))
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Landmark fetching
  const POI_CATEGORIES = [
    { q: 'museum', emoji: '🏛️', color: '#8B5CF6', category: 'museum' },
    { q: 'landmark monument', emoji: '🗽', color: '#EF4444', category: 'landmark' },
    { q: 'park garden', emoji: '🌳', color: '#22C55E', category: 'park' },
    { q: 'restaurant', emoji: '🍽️', color: '#F59E0B', category: 'dining' },
    { q: 'cathedral church temple', emoji: '⛪', color: '#0EA5E9', category: 'worship' },
  ]

  useEffect(() => {
    if (!selectedCoords) { setLandmarks([]); return }
    const { lat, lon } = selectedCoords
    const bbox = `${lat - 0.05},${lon - 0.05},${lat + 0.05},${lon + 0.05}`
    const seen = new Set<string>()

    Promise.all(
      POI_CATEGORIES.map(async ({ q, emoji, color, category }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=4&viewbox=${bbox}&bounded=1`,
            { headers: { 'Accept-Language': 'en' } }
          )
          const data: { place_id: number; display_name: string; lat: string; lon: string }[] = await res.json()
          return data.map((p) => {
            const name = p.display_name.split(',')[0]
            return { id: String(p.place_id), lat: parseFloat(p.lat), lng: parseFloat(p.lon), name: `${emoji} ${name}`, color, category }
          })
        } catch { return [] }
      })
    ).then((results) => {
      const all = results.flat().filter((p) => {
        if (seen.has(p.name)) return false
        seen.add(p.name)
        return true
      })
      setLandmarks(all.slice(0, 12))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoords])

  function validate(): boolean {
    const errors: FieldErrors = {}
    if (!title.trim()) errors.title = 'Trip name is required'
    if (!destination.trim()) errors.destination = 'Destination is required'
    if (!startDate) errors.start_date = 'Start date is required'
    if (!endDate) errors.end_date = 'End date is required'
    else if (startDate && endDate < startDate) errors.end_date = 'End date cannot be before start date'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!validate()) return

    if (!user?.id) {
      setError('You must be signed in to create a trip.')
      return
    }

    setSubmitting(true)
    try {
      const { data, error: insertError } = await supabase
        .from('trips')
        .insert({
          title: title.trim(),
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

      // Fetch and store a destination cover image (non-fatal if it fails)
      const shortDest = destination.split(',')[0].trim()
      try {
        const imgRes = await fetch(`/api/destination-image?destination=${encodeURIComponent(shortDest)}`)
        const { url } = await imgRes.json() as { url: string | null }
        if (url) {
          const { error: imgUpdateError } = await supabase
            .from('trips')
            .update({ cover_image_url: url })
            .eq('id', data.id)
          if (imgUpdateError) console.warn('cover_image_url update failed:', imgUpdateError.message)
        }
      } catch {
        // Non-fatal: trip was created, it will show the fallback image
      }

      await queryClient.invalidateQueries({ queryKey: ['trips'] })
      indexTrip(data.id)
      onClose()
      router.push(`/trip/${data.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />

      <motion.div
        className="relative flex bg-white rounded-2xl shadow-2xl overflow-hidden"
        layout
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Form panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-trip-title"
          className="w-[28rem] p-6 shrink-0"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center">
                <PaperPlane size={14} className="text-white -rotate-12" />
              </div>
              <h2 id="create-trip-title" className="text-lg font-bold text-[#1e3a5f]">Plan a Trip</h2>
            </div>
            <button aria-label="Close dialog" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X size={18} aria-hidden />
            </button>
          </div>

          {error && (
            <div role="alert" className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="trip-title" className="block text-sm font-medium text-gray-700 mb-1">Trip name</label>
              <input id="trip-title" type="text" value={title}
                onChange={(e) => { setTitle(e.target.value); setFieldErrors((prev) => ({ ...prev, title: undefined })) }}
                placeholder="e.g. Paris Adventure" disabled={submitting}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 disabled:opacity-50 transition-all"
              />
              {fieldErrors.title && <p className="mt-1 text-xs text-red-500">{fieldErrors.title}</p>}
            </div>

            <div ref={destinationWrapperRef} className="relative">
              <label htmlFor="trip-destination" className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
              <input id="trip-destination" type="text" value={destination}
                onChange={(e) => { setDestination(e.target.value); setSelectedCoords(null); setFieldErrors((prev) => ({ ...prev, destination: undefined })) }}
                onFocus={() => { if (suggestions.length > 0) setSuggestionsOpen(true) }}
                placeholder="e.g. Paris, France" disabled={submitting} autoComplete="off"
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 disabled:opacity-50 transition-all"
              />
              {suggestionsOpen && (
                <ul role="listbox" aria-label="Destination suggestions"
                  className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden text-sm">
                  {suggestions.map((s) => (
                    <li key={s.place_id} role="option" aria-selected={false} onMouseDown={() => selectSuggestion(s)}
                      className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50 text-gray-800">
                      <MapPin size={13} className="shrink-0 text-gray-400" aria-hidden />
                      <span className="truncate">{s.display_name}</span>
                    </li>
                  ))}
                </ul>
              )}
              {fieldErrors.destination && <p className="mt-1 text-xs text-red-500">{fieldErrors.destination}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="trip-start-date" className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <input id="trip-start-date" type="date" value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setFieldErrors((prev) => ({ ...prev, start_date: undefined })) }}
                  disabled={submitting}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 disabled:opacity-50 transition-all"
                />
                {fieldErrors.start_date && <p className="mt-1 text-xs text-red-500">{fieldErrors.start_date}</p>}
              </div>
              <div>
                <label htmlFor="trip-end-date" className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                <input id="trip-end-date" type="date" value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setFieldErrors((prev) => ({ ...prev, end_date: undefined })) }}
                  disabled={submitting}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40 disabled:opacity-50 transition-all"
                />
                {fieldErrors.end_date && <p className="mt-1 text-xs text-red-500">{fieldErrors.end_date}</p>}
              </div>
            </div>

            <button type="submit" disabled={submitting}
              className="w-full h-11 rounded-xl bg-[#1e3a5f] text-white text-sm font-semibold hover:bg-[#2a4d78] disabled:opacity-50 transition-all mt-2">
              {submitting ? 'Creating...' : 'Create Trip'}
            </button>
          </form>
        </div>

        {/* Map panel */}
        <AnimatePresence>
          {selectedCoords && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '28rem', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-l border-gray-100 hidden sm:flex"
            >
              <div className="w-full h-full relative flex-1" style={{ minHeight: 420 }}>
                <LeafletMap
                  locations={[
                    { id: 'dest', lat: selectedCoords.lat, lng: selectedCoords.lon, name: `📍 ${destination.split(',')[0]}`, color: '#1e3a5f', category: 'destination' },
                    ...landmarks,
                  ]}
                  zoom={13}
                  height="100%"
                  className="rounded-r-2xl"
                  labelMarkers
                />
                <div className="absolute bottom-4 left-4 right-4 z-[1000]">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-[#1e3a5f] shrink-0" />
                      <span className="text-xs font-medium text-[#1e3a5f] truncate">{destination.split(',')[0]}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
