'use client'

import { Search, X, Loader2 } from 'lucide-react'
import { useRef, useEffect } from 'react'

interface Props {
  query: string
  onQueryChange: (q: string) => void
  isLoading: boolean
}

export function SpotlightInput({ query, onQueryChange, isLoading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      {isLoading ? (
        <Loader2 className="w-5 h-5 text-gray-400 animate-spin flex-shrink-0" />
      ) : (
        <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
      )}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search trips, hotels, flights..."
        className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none"
      />
      {query && (
        <button onClick={() => onQueryChange('')} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      )}
      <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
        ESC
      </kbd>
    </div>
  )
}
