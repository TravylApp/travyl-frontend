'use client'

import { Search, X, Loader2 } from 'lucide-react'
import { useRef, useEffect, useState, useCallback } from 'react'
import type { SearchScope } from '@/hooks/useSpotlightSearch'

const KNOWN_PREFIXES: SearchScope[] = ['hotels', 'flights', 'trips', 'restaurants', 'activities', 'commands']

const SCOPE_COLORS: Record<string, string> = {
  hotels: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
  flights: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',
  trips: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
  restaurants: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  activities: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  commands: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
}

interface Props {
  query: string
  onQueryChange: (q: string) => void
  isLoading: boolean
  scope: SearchScope
  onScopeChange: (scope: SearchScope) => void
  tripContextName: string | null
  onRemoveTripContext: () => void
  showTripContext: boolean
}

function useIsMac() {
  const [isMac, setIsMac] = useState(false)
  useEffect(() => {
    setIsMac(navigator.platform?.toUpperCase().includes('MAC') ?? false)
  }, [])
  return isMac
}

export function SpotlightInput({
  query,
  onQueryChange,
  isLoading,
  scope,
  onScopeChange,
  tripContextName,
  onRemoveTripContext,
  showTripContext,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isMac = useIsMac()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value

      // Detect scope prefix: @hotels, @flights, etc.
      if (!scope && value.startsWith('@')) {
        const match = value.match(/^@(\w+)\s/)
        if (match) {
          const prefix = match[1].toLowerCase() as SearchScope
          if (prefix && KNOWN_PREFIXES.includes(prefix)) {
            onScopeChange(prefix)
            // Strip the prefix from the query
            onQueryChange(value.slice(match[0].length))
            return
          }
        }
      }

      onQueryChange(value)
    },
    [scope, onScopeChange, onQueryChange],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Backspace on empty input removes scope
      if (e.key === 'Backspace' && query === '' && scope) {
        e.preventDefault()
        onScopeChange(null)
      }
    },
    [query, scope, onScopeChange],
  )

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-200 dark:border-gray-700 relative">
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 flex-shrink-0">
        {isMac ? '\u2318K' : 'Ctrl K'}
      </kbd>
      {isLoading ? (
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
      ) : (
        <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
      )}

      {/* Trip context pill */}
      {showTripContext && tripContextName && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full flex-shrink-0">
          In: {tripContextName}
          <button
            onClick={onRemoveTripContext}
            className="hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}

      {/* Scope pill */}
      {scope && (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full flex-shrink-0 capitalize ${SCOPE_COLORS[scope] ?? SCOPE_COLORS.commands}`}>
          {scope}
          <button
            onClick={() => onScopeChange(null)}
            className="hover:opacity-70 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={scope ? `Search ${scope}...` : 'Search trips, hotels, flights...'}
        className="flex-1 bg-transparent text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none"
      />
      {query && (
        <button onClick={() => onQueryChange('')} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      )}
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
        ESC
      </kbd>
      {/* Subtle bottom glow */}
      <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
    </div>
  )
}
