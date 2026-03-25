'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import type { SpotlightResult } from '@travyl/shared'
import { useSpotlightSearch } from '@/hooks/useSpotlightSearch'
import { SpotlightInput } from './SpotlightInput'
import { SpotlightResults } from './SpotlightResults'
import { SpotlightEmptyState } from './SpotlightEmptyState'

const CATEGORY_ORDER = ['trip', 'hotel', 'flight', 'restaurant', 'activity', 'destination', 'navigation', 'command', 'setting']

export function SpotlightSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const router = useRouter()
  const {
    query,
    setQuery,
    results,
    isLoading,
    recentSearches,
    addRecentSearch,
    clearRecent,
  } = useSpotlightSearch()

  // Flatten results for keyboard navigation
  const flatResults = useMemo(() => {
    const flat: SpotlightResult[] = []
    for (const type of CATEGORY_ORDER) {
      if (results[type]) flat.push(...results[type])
    }
    return flat
  }, [results])

  // Ctrl+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setActiveIndex(0)
    }
  }, [isOpen, setQuery])

  const handleSelect = useCallback(
    (result: SpotlightResult) => {
      if (query.length >= 3) addRecentSearch(query)
      setIsOpen(false)
      router.push(result.href)
    },
    [query, addRecentSearch, router],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((prev) => Math.min(prev + 1, flatResults.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Tab': {
          e.preventDefault()
          const categories = CATEGORY_ORDER.filter((t) => results[t]?.length)
          let runIdx = 0
          let currentCat = 0
          for (let c = 0; c < categories.length; c++) {
            if (activeIndex < runIdx + results[categories[c]].length) { currentCat = c; break }
            runIdx += results[categories[c]].length
          }
          const nextCat = (currentCat + (e.shiftKey ? -1 : 1) + categories.length) % categories.length
          let nextIdx = 0
          for (let c = 0; c < nextCat; c++) nextIdx += results[categories[c]].length
          setActiveIndex(nextIdx)
          break
        }
        case 'Enter':
          e.preventDefault()
          if (flatResults[activeIndex]) handleSelect(flatResults[activeIndex])
          break
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          break
      }
    },
    [flatResults, activeIndex, handleSelect, results],
  )

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [results])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50"
            onKeyDown={handleKeyDown}
          >
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <SpotlightInput
                query={query}
                onQueryChange={setQuery}
                isLoading={isLoading}
              />
              {query.length < 3 ? (
                <SpotlightEmptyState
                  recentSearches={recentSearches}
                  onSelectRecent={(q) => setQuery(q)}
                  onClearRecent={clearRecent}
                />
              ) : (
                <SpotlightResults
                  results={results}
                  activeIndex={activeIndex}
                  onSelect={handleSelect}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
