'use client'

import { useEffect, useRef, useState } from 'react'
import { Plane } from 'lucide-react'
import { FieldLabel } from '@/components/trip/BookingFormPrimitives'
import { searchAirports, type Airport } from './airportSearch'

export interface AirportAutocompleteProps {
  label: string
  value: { iata: string; name: string; city: string } | null
  onChange: (v: AirportAutocompleteProps['value']) => void
  invalid?: boolean
}

function formatAirportLabel(v: { iata: string; city: string } | null): string {
  if (!v) return ''
  return v.city ? `${v.iata} · ${v.city}` : v.iata
}

export function AirportAutocomplete({ label, value, onChange, invalid }: AirportAutocompleteProps) {
  const [query, setQuery] = useState(formatAirportLabel(value))
  const [results, setResults] = useState<Airport[]>([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync the input text when the parent updates the selected value
  // (e.g. defaultFrom resolves async after profile loads).
  useEffect(() => {
    setQuery(formatAirportLabel(value))
  }, [value?.iata, value?.city])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (query.length < 2) {
        setResults([])
        return
      }
      const res = await searchAirports(query)
      setResults(res)
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const select = (a: Airport) => {
    onChange({ iata: a.iata, name: a.name, city: a.city })
    setQuery(`${a.iata} · ${a.city}`)
    setOpen(false)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      select(results[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <FieldLabel>{label}</FieldLabel>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setActiveIdx(0)
          if (e.target.value === '') onChange(null)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        placeholder="Type a city or airport"
        className={`w-full h-10 px-3 rounded-lg border bg-white dark:bg-white/[0.04] text-[13px] text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--trip-base)]/30 ${invalid ? 'border-red-400' : 'border-gray-200 dark:border-white/[0.10]'}`}
      />
      {open && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-[var(--background)] shadow-lg">
          {results.map((a, i) => (
            <button
              key={`${a.iata}-${i}`}
              type="button"
              onClick={() => select(a)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] ${i === activeIdx ? 'bg-gray-100 dark:bg-white/[0.06]' : ''}`}
            >
              <Plane size={12} className="text-gray-400 shrink-0" />
              <span className="font-mono font-semibold text-gray-900 dark:text-white">{a.iata}</span>
              <span className="text-gray-700 dark:text-gray-300 truncate">{a.city}</span>
              <span className="text-gray-400 truncate">{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
