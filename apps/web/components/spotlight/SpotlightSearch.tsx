'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import type { SpotlightResult } from '@travyl/shared'
import { useSpotlightSearch } from '@/hooks/useSpotlightSearch'
import { SpotlightInput } from './SpotlightInput'
import { SpotlightResults } from './SpotlightResults'
import { SpotlightEmptyState } from './SpotlightEmptyState'
import { SpotlightPreview, hasPreview } from './SpotlightPreview'
import { SpotlightFooter } from './SpotlightFooter'

const CATEGORY_ORDER = ['trip', 'hotel', 'flight', 'restaurant', 'activity', 'destination', 'navigation', 'command', 'setting']

export function SpotlightSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const router = useRouter()
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const resultsRef = useRef<HTMLDivElement>(null)
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

  // Active result for preview
  const activeResult = flatResults[activeIndex] ?? null
  const showPreview = hasPreview(activeResult)

  // Scroll active item into view
  useEffect(() => {
    const el = itemRefs.current[activeIndex]
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [activeIndex])

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
      if (query.length >= 2) addRecentSearch(query)
      setIsOpen(false)
      // If the result has an execute function (command), call it instead of navigating
      if (result.execute) {
        result.execute()
      } else {
        router.push(result.href)
      }
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
          if (!categories.length) break
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

  const hasResults = query.length >= 1 && flatResults.length > 0
  const showEmptyState = query.length < 1

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
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50"
            onKeyDown={handleKeyDown}
          >
            <motion.div
              layout
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className={`bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden ${
                showPreview ? 'w-[680px] max-w-[90vw]' : 'w-[560px] max-w-[90vw]'
              }`}
            >
              <SpotlightInput
                query={query}
                onQueryChange={setQuery}
                isLoading={isLoading}
              />
              <div className="flex">
                {/* Left: results / empty state */}
                <div className={showPreview ? 'w-[360px] flex-shrink-0' : 'flex-1'}>
                  {showEmptyState ? (
                    <SpotlightEmptyState
                      recentSearches={recentSearches}
                      onSelectRecent={(q) => setQuery(q)}
                      onClearRecent={clearRecent}
                      onClose={() => setIsOpen(false)}
                    />
                  ) : hasResults ? (
                    <SpotlightResults
                      ref={resultsRef}
                      results={results}
                      activeIndex={activeIndex}
                      onSelect={handleSelect}
                      query={query}
                      itemRefs={itemRefs}
                    />
                  ) : query.length >= 1 && !isLoading ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-gray-400">No results found</p>
                      <p className="text-xs text-gray-400/70 mt-1">
                        Try a different search term
                      </p>
                    </div>
                  ) : query.length >= 1 && isLoading ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-gray-400">Searching...</p>
                    </div>
                  ) : null}
                </div>

                {/* Right: preview pane */}
                <AnimatePresence mode="wait">
                  {showPreview && activeResult && (
                    <motion.div
                      key={activeResult.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.15 }}
                      className="w-[300px] flex-shrink-0 border-l border-gray-200 dark:border-gray-700 p-4 max-h-[400px] overflow-y-auto"
                    >
                      <SpotlightPreview result={activeResult} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <SpotlightFooter resultCount={flatResults.length} />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
