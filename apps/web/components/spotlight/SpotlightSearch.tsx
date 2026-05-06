'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, LayoutGroup } from 'motion/react'
import type { SpotlightResult } from '@travyl/shared'
import { useSpotlightSearch } from '@/hooks/useSpotlightSearch'
import { useDocumentUpload } from '@/hooks/useDocumentUpload'
import { DocumentReviewModal } from '@/components/documents/DocumentReviewModal'
import { SpotlightInput } from './SpotlightInput'
import { SpotlightResults } from './SpotlightResults'
import { SpotlightEmptyState } from './SpotlightEmptyState'
import { SpotlightPreview, hasPreview } from './SpotlightPreview'
import { SpotlightFooter } from './SpotlightFooter'
import { SpotlightActionMenu, getActionsForResult, type SpotlightAction } from './SpotlightActionMenu'
import { SpotlightTripCreator } from './SpotlightTripCreator'

const CATEGORY_ORDER = ['action', 'trip', 'restaurant', 'activity', 'destination', 'navigation', 'command', 'setting']

interface ActionMode {
  result: SpotlightResult
  activeActionIndex: number
  actions: SpotlightAction[]
}

export function SpotlightSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [actionMode, setActionMode] = useState<ActionMode | null>(null)
  const [creatorMode, setCreatorMode] = useState<{ prefillDestination: string } | null>(null)
  const [creatorPhase, setCreatorPhase] = useState<string>('idle')
  const router = useRouter()
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const resultsRef = useRef<HTMLDivElement>(null)
  const {
    query,
    setQuery,
    results,
    isLoading,
    quickLoading,
    deepLoading,
    recentSearches,
    addRecentSearch,
    clearRecent,
    isInTripContext,
    tripId,
    tripName,
    clearTripScope,
    removeTripScope,
    scope,
    setScope,
    pinnedResults,
    pinResult,
    unpinResult,
    isPinned,
  } = useSpotlightSearch()

  const {
    phase: uploadPhase,
    error: uploadError,
    result: parseResult,
    triggerFilePicker,
    handleFileInputChange,
    handlePaste,
    confirmPaste,
    cancelPaste,
    reparseWithHint,
    reset: resetUpload,
  } = useDocumentUpload(isInTripContext ? tripId ?? undefined : undefined)

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
  const showPreview = !actionMode && hasPreview(activeResult)

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
      setActionMode(null)
      setCreatorMode(null)
      setCreatorPhase('idle')
      setScope(null)
    }
  }, [isOpen, setQuery, setScope])

  const handleSelect = useCallback(
    (result: SpotlightResult) => {
      // Handle create-trip action
      if (result.id === 'create-trip' && result.type === 'action') {
        const prefill = (result.metadata as Record<string, unknown>)?.prefillDestination as string ?? ''
        setCreatorMode({ prefillDestination: prefill })
        return
      }

      if (query.length >= 2) addRecentSearch(query)
      setIsOpen(false)
      if (result.execute) {
        result.execute()
      } else {
        router.push(result.href)
      }
    },
    [query, addRecentSearch, router],
  )

  const enterActionMode = useCallback(
    (result: SpotlightResult) => {
      const actions = getActionsForResult(result, {
        isPinned: isPinned(result.id),
        onPin: () => {
          pinResult(result)
          setActionMode(null)
        },
        onUnpin: () => {
          unpinResult(result.id)
          setActionMode(null)
        },
        onSelect: () => handleSelect(result),
      })
      setActionMode({ result, activeActionIndex: 0, actions })
    },
    [isPinned, pinResult, unpinResult, handleSelect],
  )

  const exitActionMode = useCallback(() => {
    setActionMode(null)
  }, [])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Creator mode keyboard handling
      if (creatorMode) {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          setCreatorMode(null)
          setCreatorPhase('idle')
          return
        }
        // During clarifying phase, intercept A-E and 1-5 keys
        if (creatorPhase === 'clarifying') {
          const key = e.key.toLowerCase()
          let idx = -1
          if (key >= '1' && key <= '5') idx = parseInt(key) - 1
          else if (key >= 'a' && key <= 'e') idx = key.charCodeAt(0) - 97
          if (idx >= 0) {
            e.preventDefault()
            e.stopPropagation()
            const selectFn = (window as any).__spotlightSelectByIndex
            if (typeof selectFn === 'function') selectFn(idx)
            return
          }
        }
        // All other keys are handled by the creator form inputs
        return
      }

      // Action mode keyboard handling
      if (actionMode) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            setActionMode((prev) => prev ? {
              ...prev,
              activeActionIndex: Math.min(prev.activeActionIndex + 1, prev.actions.length - 1),
            } : null)
            break
          case 'ArrowUp':
            e.preventDefault()
            setActionMode((prev) => prev ? {
              ...prev,
              activeActionIndex: Math.max(prev.activeActionIndex - 1, 0),
            } : null)
            break
          case 'Enter':
            e.preventDefault()
            if (actionMode.actions[actionMode.activeActionIndex]) {
              actionMode.actions[actionMode.activeActionIndex].execute()
              // Close spotlight if the action navigates or executes
              if (['open', 'open-details', 'execute'].includes(actionMode.actions[actionMode.activeActionIndex].id)) {
                setIsOpen(false)
              }
            }
            break
          case 'ArrowLeft':
          case 'Escape':
            e.preventDefault()
            exitActionMode()
            break
        }
        return
      }

      // Cmd+Enter: open in new tab
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (activeResult?.href) {
          window.open(activeResult.href, '_blank')
        }
        return
      }

      // Cmd+C: copy link (only when no text selected)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        const selection = window.getSelection()
        if (!selection || selection.toString().length === 0) {
          if (activeResult?.href) {
            e.preventDefault()
            navigator.clipboard.writeText(window.location.origin + activeResult.href)
          }
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((prev) => Math.min(prev + 1, flatResults.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'ArrowRight':
          e.preventDefault()
          if (activeResult) {
            enterActionMode(activeResult)
          }
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
    [flatResults, activeIndex, handleSelect, results, actionMode, exitActionMode, enterActionMode, activeResult, creatorMode, creatorPhase],
  )

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [results])

  const hasResults = query.length >= 1 && flatResults.length > 0
  const showEmptyState = query.length < 1
  const showTripContext = isInTripContext && !clearTripScope

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
            <LayoutGroup>
              <motion.div
                layout
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className={`bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden ${
                  showPreview ? 'w-[680px] max-w-[90vw]' : 'w-[560px] max-w-[90vw]'
                }`}
              >
                {creatorMode ? (
                  <>
                    <SpotlightTripCreator
                      prefillDestination={creatorMode.prefillDestination}
                      query={query}
                      onClose={() => setIsOpen(false)}
                      onBack={() => { setCreatorMode(null); setCreatorPhase('idle') }}
                      onPhaseChange={setCreatorPhase}
                    />
                    <SpotlightFooter
                      resultCount={0}
                      isActionMode={false}
                      isCreatorMode
                      creatorPhase={creatorPhase}
                    />
                  </>
                ) : (
                  <>
                    <SpotlightInput
                      query={query}
                      onQueryChange={setQuery}
                      isLoading={isLoading}
                      scope={scope}
                      onScopeChange={setScope}
                      tripContextName={tripName}
                      onRemoveTripContext={removeTripScope}
                      showTripContext={showTripContext}
                      onUploadClick={triggerFilePicker}
                      onPaste={handlePaste}
                    />
                    <div className="flex">
                      {/* Left: results / empty state / action menu / upload states */}
                      <div className={showPreview ? 'w-[360px] flex-shrink-0' : 'flex-1'}>
                        {uploadPhase === 'confirm-paste' ? (
                          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              Upload this pasted image as a travel document?
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={confirmPaste}
                                className="px-3 py-1.5 text-xs font-medium text-white rounded-lg"
                                style={{ backgroundColor: 'var(--trip-base, #1e3a5f)' }}
                              >
                                Upload
                              </button>
                              <button
                                onClick={cancelPaste}
                                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 dark:bg-gray-800 rounded-lg"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : uploadPhase === 'uploading' ? (
                          <div className="px-4 py-8 text-center">
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-gray-400">Uploading document...</p>
                          </div>
                        ) : uploadPhase === 'parsing' ? (
                          <div className="px-4 py-8 text-center">
                            <Loader2 className="w-5 h-5 text-gray-400 animate-spin mx-auto mb-2" />
                            <p className="text-sm text-gray-400">Reading document with AI...</p>
                          </div>
                        ) : uploadPhase === 'error' ? (
                          <div className="px-4 py-8 text-center">
                            <p className="text-sm text-red-400 mb-2">{uploadError}</p>
                            <button
                              onClick={resetUpload}
                              className="text-xs text-gray-400 hover:text-gray-600 underline"
                            >
                              Dismiss
                            </button>
                          </div>
                        ) : actionMode ? (
                          <SpotlightActionMenu
                            result={actionMode.result}
                            actions={actionMode.actions}
                            activeActionIndex={actionMode.activeActionIndex}
                            onBack={exitActionMode}
                          />
                        ) : showEmptyState ? (
                          <SpotlightEmptyState
                            recentSearches={recentSearches}
                            onSelectRecent={(q) => setQuery(q)}
                            onClearRecent={clearRecent}
                            onClose={() => setIsOpen(false)}
                            pinnedResults={pinnedResults}
                            onSelectPinned={(pinned) => {
                              setIsOpen(false)
                              router.push(pinned.href)
                            }}
                          />
                        ) : hasResults ? (
                          <SpotlightResults
                            ref={resultsRef}
                            results={results}
                            activeIndex={activeIndex}
                            onSelect={handleSelect}
                            query={query}
                            itemRefs={itemRefs}
                            isPinned={isPinned}
                            deepLoading={deepLoading}
                          />
                        ) : query.length >= 1 && !isLoading && !quickLoading ? (
                          <div className="px-4 py-8 text-center">
                            <p className="text-sm text-gray-400">No results in your trips</p>
                            <p className="text-xs text-gray-400/70 mt-1">
                              {deepLoading
                                ? 'Still searching external sources...'
                                : 'Try a different search term or check spelling'}
                            </p>
                          </div>
                        ) : query.length >= 1 && isLoading ? (
                          <div className="px-4 py-8 text-center">
                            <p className="text-sm text-gray-400">
                              {quickLoading ? 'Searching...' : 'Searching external places...'}
                            </p>
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
                    <SpotlightFooter
                      resultCount={flatResults.length}
                      isActionMode={!!actionMode}
                    />
                  </>
                )}
              </motion.div>
            </LayoutGroup>
          </motion.div>

          {/* Hidden file input for document upload */}
          <input
            id="document-upload-input"
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* Document review modal */}
          {uploadPhase === 'review' && parseResult && (
            <DocumentReviewModal
              result={parseResult}
              tripId={isInTripContext ? tripId ?? undefined : undefined}
              onClose={() => { resetUpload(); setIsOpen(false) }}
              onConfirm={() => { resetUpload(); setIsOpen(false) }}
              onReparse={reparseWithHint}
            />
          )}
        </>
      )}
    </AnimatePresence>
  )
}
