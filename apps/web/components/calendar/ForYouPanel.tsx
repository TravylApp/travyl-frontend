'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useDraggable, useDndMonitor } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Search, NavArrowLeft, NavArrowRight } from 'iconoir-react'
import { usePlaceImages } from '@travyl/shared'
import { FOR_YOU_PANEL_DEFAULT_WIDTH } from './constants'
import { SuggestionCard } from './SuggestionCard'
import { SuggestionDetailDrawer } from './SuggestionDetailDrawer'
import { useSuggestions } from './hooks/useSuggestions'
import { useInteractionTracking } from './hooks/useInteractionTracking'
import type { SuggestionCard as SuggestionCardType } from './types'

interface ForYouPanelProps {
  destination: string
  tripId: string
  scheduledActivityIds?: string[]
  width?: number
}

/** Map the wide variety of category strings the places API returns into a
 * fixed set of "bundle" keys so the For-You hub shows clear sections. */
function bucketCategory(raw: string): string {
  const c = (raw || '').toLowerCase()
  if (/(restaurant|food|dining|cafe|caf\xe9|bar\b|eatery|cuisine|culinary|bakery|brunch)/.test(c)) return 'eats'
  if (/(museum|gallery|culture|theater|theatre|art\b|exhibit|historic)/.test(c)) return 'culture'
  if (/(park|outdoor|nature|beach|hike|trail|garden|mountain)/.test(c)) return 'outdoor'
  if (/(nightlife|club\b|lounge|nightclub)/.test(c)) return 'nightlife'
  if (/(shop|market|mall|boutique|store)/.test(c)) return 'shopping'
  return 'sights'
}

interface BucketDef {
  id: string
  label: string
  /** Per-bucket gradient used when no hero image is available. */
  fallbackGradient: string
}

const BUCKETS: BucketDef[] = [
  { id: 'sights',    label: 'Sights to see',  fallbackGradient: 'linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)' },
  { id: 'eats',      label: 'Where to eat',   fallbackGradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)' },
  { id: 'culture',   label: 'Arts & culture', fallbackGradient: 'linear-gradient(135deg, #6d28d9 0%, #a78bfa 100%)' },
  { id: 'outdoor',   label: 'Outdoors',       fallbackGradient: 'linear-gradient(135deg, #047857 0%, #10b981 100%)' },
  { id: 'nightlife', label: 'Nightlife',      fallbackGradient: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)' },
  { id: 'shopping',  label: 'Shopping',       fallbackGradient: 'linear-gradient(135deg, #475569 0%, #94a3b8 100%)' },
]

const PER_BUNDLE_LIMIT = 12

export function ForYouPanel({
  destination,
  tripId,
  scheduledActivityIds,
  width,
}: ForYouPanelProps) {
  const {
    suggestions,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    commitSearch,
    refetch,
  } = useSuggestions({ destination, scheduledActivityIds })

  const { trackEvent } = useInteractionTracking(tripId)

  const suggestionNames = useMemo(() => suggestions.map((s) => s.name), [suggestions])
  const imageResults = usePlaceImages(suggestionNames)

  const categoryImageQueries = useMemo(
    () => suggestions.map((s) => `${s.name} ${s.category} travel`),
    [suggestions],
  )
  const categoryImageResults = usePlaceImages(categoryImageQueries)

  const enrichedSuggestions = useMemo(() => {
    if (!imageResults.length) return suggestions
    return suggestions.map((suggestion, i) => {
      const mainUrl = imageResults[i]?.data?.url
      const catUrl = categoryImageResults[i]?.data?.url
      const existingUrls = suggestion.imageUrls?.length
        ? suggestion.imageUrls
        : suggestion.imageUrl ? [suggestion.imageUrl] : []
      const merged = [mainUrl, catUrl, ...existingUrls].filter((u): u is string => !!u)
      const deduped = [...new Set(merged)]
      return {
        ...suggestion,
        imageUrl: mainUrl ?? suggestion.imageUrl,
        imageUrls: deduped,
      }
    })
  }, [suggestions, imageResults, categoryImageResults])

  // Group items by bucket and pick a hero image for each tile.
  const bundles = useMemo(() => {
    const map = new Map<string, SuggestionCardType[]>()
    for (const s of enrichedSuggestions) {
      const bucket = bucketCategory(s.category)
      const arr = map.get(bucket) ?? []
      arr.push(s)
      map.set(bucket, arr)
    }
    return BUCKETS
      .map((b) => {
        const items = (map.get(b.id) ?? []).slice(0, PER_BUNDLE_LIMIT)
        const heroImage = items.find((it) => !!it.imageUrl)?.imageUrl ?? null
        return { ...b, items, heroImage }
      })
      .filter((b) => b.items.length > 0)
  }, [enrichedSuggestions])

  const [selectedBucket, setSelectedBucket] = useState<string | null>(null)
  const isSearching = !!searchQuery.trim()
  // Drill-in is overridden by an active search.
  const drilledBundle = !isSearching && selectedBucket
    ? bundles.find((b) => b.id === selectedBucket) ?? null
    : null

  // Clear drill state if the bucket disappeared (data refresh, etc.).
  useEffect(() => {
    if (selectedBucket && !bundles.some((b) => b.id === selectedBucket)) {
      setSelectedBucket(null)
    }
  }, [bundles, selectedBucket])

  const [selectedSuggestion, setSelectedSuggestion] = useState<SuggestionCardType | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openDrawer = useCallback((suggestion: SuggestionCardType) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setSelectedSuggestion(suggestion)
    setIsClosing(false)
  }, [])

  const closeDrawer = useCallback(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    setIsClosing(true)
    closeTimerRef.current = setTimeout(() => {
      setSelectedSuggestion(null)
      setIsClosing(false)
    }, 300)
  }, [])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const cityName = destination.split(',')[0]
  const showHub = !drilledBundle && !isSearching

  return (
    <aside
      style={{ width: width ?? FOR_YOU_PANEL_DEFAULT_WIDTH }}
      className="relative flex flex-col h-full shrink-0 self-stretch border-l border-cal-border-light bg-cal-surface-elevated overflow-hidden"
      aria-label="Activity suggestions"
    >
      {/* Header — back button when drilled in, otherwise destination headline */}
      <div className="px-3.5 pt-3.5 pb-2 flex items-center gap-2">
        {drilledBundle ? (
          <button
            onClick={() => setSelectedBucket(null)}
            className="flex items-center gap-1 text-[12.5px] font-medium text-cal-text-secondary hover:text-cal-text transition-colors"
            aria-label="Back to all categories"
          >
            <NavArrowLeft width={14} height={14} />
            <span>All categories</span>
          </button>
        ) : (
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-cal-text truncate">
              Discover {cityName || 'this trip'}
            </h2>
            <p className="text-[11px] text-cal-text-tertiary mt-px">
              Drag any card onto a day to schedule it
            </p>
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="px-3.5 pb-2.5">
        <div className="relative">
          <Search
            width={14}
            height={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-cal-text-tertiary pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') commitSearch() }}
            placeholder={drilledBundle ? `Search ${drilledBundle.label.toLowerCase()}...` : 'Search activities...'}
            className="w-full bg-cal-bg border border-cal-border rounded-full pl-9 pr-3 py-2 text-[13px] text-cal-text placeholder-cal-text-tertiary outline-none transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      {/* Drill-in section title */}
      {drilledBundle && !isSearching && (
        <div className="px-3.5 pb-1.5">
          <h3 className="text-[15px] font-bold text-cal-text">{drilledBundle.label}</h3>
          <p className="text-[11px] text-cal-text-tertiary">
            {drilledBundle.items.length} {drilledBundle.items.length === 1 ? 'place' : 'places'} in {cityName || 'this city'}
          </p>
        </div>
      )}

      {/* Body */}
      <div className="h-0 grow overflow-y-auto px-3 pb-3 scrollbar-thin">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl bg-cal-border-light animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <ErrorState onRetry={() => refetch()} />
        ) : suggestions.length === 0 ? (
          <EmptyState searchQuery={searchQuery} />
        ) : isSearching ? (
          <SearchResults
            items={enrichedSuggestions}
            tripId={tripId}
            trackEvent={trackEvent}
            onSelect={openDrawer}
          />
        ) : drilledBundle ? (
          <div className="flex flex-col gap-2">
            {drilledBundle.items.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onVisible={() => trackEvent(suggestion.id, 'impression', suggestion.category)}
                onSelect={openDrawer}
              />
            ))}
          </div>
        ) : (
          <BundleSections
            bundles={bundles}
            onSeeAll={setSelectedBucket}
            onOpenDetail={openDrawer}
            onImpression={(s) => trackEvent(s.id, 'impression', s.category)}
          />
        )}
      </div>

      {showHub && enrichedSuggestions.length > 0 && (
        <div className="text-center text-[10px] text-cal-text-tertiary/50 py-2 border-t border-cal-border-light">
          Tap a tile to browse · drag any card onto a day
        </div>
      )}

      {selectedSuggestion && (
        <SuggestionDetailDrawer
          suggestion={selectedSuggestion}
          isClosing={isClosing}
          onClose={closeDrawer}
        />
      )}
    </aside>
  )
}

// ── Sub-components ────────────────────────────────────────

interface BundleSectionsProps {
  bundles: Array<BucketDef & { items: SuggestionCardType[]; heroImage: string | null }>
  onSeeAll: (bucketId: string) => void
  onOpenDetail: (s: SuggestionCardType) => void
  onImpression: (s: SuggestionCardType) => void
}

/** Stacked category cards. Each card has a header ("Sights to see") and a
 * 2×2 grid of mini-tiles underneath — picture-led, draggable straight onto
 * the calendar. A "See all N →" footer drills into the full bucket list. */
function BundleSections({ bundles, onSeeAll, onOpenDetail, onImpression }: BundleSectionsProps) {
  if (bundles.length === 0) return null
  return (
    <div className="flex flex-col gap-3 pt-1">
      {bundles.map((bundle) => (
        <BundleSection
          key={bundle.id}
          bundle={bundle}
          onSeeAll={() => onSeeAll(bundle.id)}
          onOpenDetail={onOpenDetail}
          onImpression={onImpression}
        />
      ))}
    </div>
  )
}

interface BundleSectionProps {
  bundle: BucketDef & { items: SuggestionCardType[]; heroImage: string | null }
  onSeeAll: () => void
  onOpenDetail: (s: SuggestionCardType) => void
  onImpression: (s: SuggestionCardType) => void
}

function BundleSection({ bundle, onSeeAll, onOpenDetail, onImpression }: BundleSectionProps) {
  const featured = bundle.items.slice(0, 4)
  const remaining = bundle.items.length - featured.length

  return (
    <section className="rounded-2xl border border-cal-border-light bg-cal-surface shadow-sm overflow-hidden">
      <div className="flex items-baseline justify-between px-3 pt-2.5 pb-1.5">
        <h3 className="text-[13px] font-semibold text-cal-text">{bundle.label}</h3>
        <span className="text-[10.5px] text-cal-text-tertiary">
          {bundle.items.length} {bundle.items.length === 1 ? 'place' : 'places'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 px-2 pb-2">
        {featured.map((item) => (
          <MiniTile
            key={item.id}
            suggestion={item}
            fallbackGradient={bundle.fallbackGradient}
            onSelect={onOpenDetail}
            onImpression={onImpression}
          />
        ))}
        {/* Pad to 4 cells so the 2×2 stays geometrically clean if a bucket
            happens to return < 4 items. */}
        {Array.from({ length: Math.max(0, 4 - featured.length) }).map((_, i) => (
          <div
            key={`pad-${i}`}
            className="aspect-[4/3] rounded-lg bg-cal-bg/60"
            aria-hidden="true"
          />
        ))}
      </div>
      {remaining > 0 && (
        <button
          onClick={onSeeAll}
          className="w-full flex items-center justify-center gap-1 px-3 py-2 text-[11.5px] font-medium text-cal-text-secondary border-t border-cal-border-light hover:bg-cal-bg hover:text-cal-text transition-colors"
        >
          See all {bundle.items.length}
          <NavArrowRight width={12} height={12} />
        </button>
      )}
    </section>
  )
}

interface MiniTileProps {
  suggestion: SuggestionCardType
  fallbackGradient: string
  onSelect: (s: SuggestionCardType) => void
  onImpression: (s: SuggestionCardType) => void
}

/** A small picture-led tile: hero image with title overlay. Draggable onto a
 * calendar day (uses the same `'suggestion'` drag type as SuggestionCard, so
 * the existing drop handler in useCalendarDnd handles the rest). */
function MiniTile({ suggestion, fallbackGradient, onSelect, onImpression }: MiniTileProps) {
  const draggableId = `suggestion-${suggestion.id}`
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: draggableId,
    data: { type: 'suggestion' as const, suggestion },
  })

  // Drag-vs-click detection (same trick as SuggestionCard / EventCard).
  const didDragRef = useRef(false)
  useDndMonitor({
    onDragStart(event) { if (event.active.id === draggableId) didDragRef.current = true },
  })
  const extendedListeners = listeners
    ? {
        ...listeners,
        onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
          didDragRef.current = false
          listeners.onPointerDown?.(e)
        },
      }
    : {}

  // Fire impression once.
  const impressionRef = useRef(false)
  useEffect(() => {
    if (impressionRef.current) return
    impressionRef.current = true
    onImpression(suggestion)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [imgFailed, setImgFailed] = useState(false)
  const heroImage = suggestion.imageUrls?.find(Boolean) ?? suggestion.imageUrl
  const showImage = !!heroImage && !imgFailed

  const handleClick = () => {
    if (didDragRef.current) {
      didDragRef.current = false
      return
    }
    onSelect(suggestion)
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...extendedListeners}
      onClick={handleClick}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        ...(showImage ? null : { background: fallbackGradient }),
      }}
      className={[
        'group relative aspect-[4/3] rounded-lg overflow-hidden cursor-grab active:cursor-grabbing',
        'transition-shadow shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:shadow-md',
        'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/50',
      ].join(' ')}
      role="button"
      tabIndex={0}
      title={`${suggestion.name} · drag onto a day to schedule`}
    >
      {showImage && (
        <>
          <Image
            src={heroImage!}
            alt=""
            fill
            sizes="160px"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
            onError={() => setImgFailed(true)}
            draggable={false}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.30) 55%, rgba(0,0,0,0.05) 100%)',
            }}
          />
        </>
      )}
      <div className="absolute inset-x-2 bottom-1.5">
        <p className="text-white text-[11.5px] font-semibold leading-tight line-clamp-2 [text-shadow:0_1px_2px_rgba(0,0,0,0.55)]">
          {suggestion.name}
        </p>
      </div>
    </div>
  )
}

interface SearchResultsProps {
  items: SuggestionCardType[]
  tripId: string
  trackEvent: (id: string, type: 'impression', cat: string) => void
  onSelect: (s: SuggestionCardType) => void
}

function SearchResults({ items, tripId, trackEvent, onSelect }: SearchResultsProps) {
  void tripId // tracked via trackEvent below
  return (
    <div className="flex flex-col gap-2">
      {items.map((suggestion) => (
        <SuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          onVisible={() => trackEvent(suggestion.id, 'impression', suggestion.category)}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/10 flex items-center justify-center mb-4">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-medium text-cal-text mb-1">Couldn&apos;t load suggestions</p>
      <p className="text-xs text-cal-text-tertiary mb-4">Something went wrong. Check your connection.</p>
      <button
        onClick={onRetry}
        className="text-xs font-medium text-white bg-primary px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
      >
        Try again
      </button>
    </div>
  )
}

function EmptyState({ searchQuery }: { searchQuery: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/40">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88" opacity="0.6" />
        </svg>
      </div>
      <p className="text-sm font-medium text-cal-text mb-1">
        {searchQuery.trim() ? `No results for '${searchQuery}'` : 'No suggestions yet'}
      </p>
      <p className="text-xs text-cal-text-tertiary max-w-[200px]">
        {searchQuery.trim()
          ? 'Try different keywords'
          : 'Try searching for things to do'}
      </p>
    </div>
  )
}
