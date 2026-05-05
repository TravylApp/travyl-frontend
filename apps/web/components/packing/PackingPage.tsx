'use client'

import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Sparks, SidebarCollapse, SidebarExpand } from 'iconoir-react'
import { usePackingList, useAuthStore, usePackingSuggestions, useItineraryScreen, supabase, seedDefaultPackingItems } from '@travyl/shared'
import { SpotlightSearch } from './SpotlightSearch'
import { PackingProgress } from './PackingProgress'
import { PackingCategoryList } from './PackingCategoryList'
import { PackingActivityFeed } from './PackingActivityFeed'

interface PackingPageProps {
  tripId: string
}

export function PackingPage({ tripId }: PackingPageProps) {
  const { user } = useAuthStore()
  const userId = user?.id
  const [filterBy, setFilterBy] = useState<string>('all')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { trip } = useItineraryScreen(tripId)
  const queryClient = useQueryClient()

  const { items, itemsByCategory, orderedCategories, filteredItems, auditLog, progress, isLoading, error, addItem, togglePacked, incrementPacked, updateQuantity, removeItem, claimItem, releaseItem, transferItem } = usePackingList(tripId, userId, filterBy)

  // Auto-seed default items once when the trip's packing_items table is empty.
  // Mobile auto-generates a list from trip_context.packing_data when the
  // trip loads; the web equivalent is the packing_items table, which has
  // never been seeded for new trips — so users were landing on a blank
  // tab. Gate via trip_context.packing_seeded so this runs at most once,
  // even if the user later deletes everything.
  const seedAttempted = useRef(false)
  useEffect(() => {
    if (seedAttempted.current) return
    if (isLoading || !trip || !userId || !tripId) return
    if (items.length > 0) { seedAttempted.current = true; return }
    const ctx = (trip.trip_context as any) || {}
    if (ctx.packing_seeded) { seedAttempted.current = true; return }
    seedAttempted.current = true
    ;(async () => {
      try {
        const days = trip.start_date && trip.end_date
          ? Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000))
          : (ctx.weather?.forecast?.length ?? 5)
        const forecast: any[] = ctx.weather?.forecast ?? []
        const avgTemp = forecast.length > 0
          ? forecast.reduce((sum: number, d: any) => sum + (d.high ?? 20), 0) / forecast.length
          : 20
        const isWarm = avgTemp > 22
        const isCold = avgTemp < 12
        const hasRain = forecast.some((d: any) => (d.conditions || d.icon || '').toLowerCase().includes('rain'))
        await seedDefaultPackingItems(tripId, userId, { days, isWarm, isCold, hasRain })
        await supabase.from('trips').update({ trip_context: { ...ctx, packing_seeded: true } }).eq('id', tripId)
        queryClient.invalidateQueries({ queryKey: ['packingItems', tripId] })
        queryClient.invalidateQueries({ queryKey: ['trip', tripId] })
      } catch (e) {
        console.error('Failed to seed packing items', e)
        seedAttempted.current = false
      }
    })()
  }, [isLoading, trip, userId, tripId, items.length, queryClient])
  const {
    suggestionsByCategory,
    isGenerating,
    hasGenerated,
    generateSuggestions,
    acceptSuggestion,
    dismissSuggestion,
  } = usePackingSuggestions(tripId, items, addItem as (name: string, category: string) => void)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-gray-200 dark:border-white/[0.08] border-t-[#003594] rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-red-500 dark:text-red-400">Failed to load packing list.</p>
      </div>
    )
  }

  // Compute itemsByCategory and orderedCategories based on filteredItems for display
  const filteredItemsByCategory: Record<string, typeof filteredItems> = {}
  for (const item of filteredItems) {
    if (!filteredItemsByCategory[item.category]) filteredItemsByCategory[item.category] = []
    filteredItemsByCategory[item.category].push(item)
  }
  // Include categories that have items OR suggestions
  const suggestionCats = Object.keys(suggestionsByCategory)
  const allCats = new Set([...orderedCategories, ...suggestionCats])
  const filteredOrderedCategories = [...allCats].filter(
    (cat) => (filteredItemsByCategory[cat]?.length ?? 0) > 0 || (suggestionsByCategory[cat]?.length ?? 0) > 0
  )

  return (
    <div className="flex flex-col h-full p-6">
      {/* Header row with sidebar toggle */}
      <div className="flex items-center justify-between mb-3">
        <PackingProgress packed={progress.packed} total={progress.total} percent={progress.percent} />
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="p-1.5 rounded-lg text-[var(--cal-text-muted)] hover:text-[var(--cal-text)] hover:bg-[var(--cal-surface)] transition-colors"
          aria-label={sidebarOpen ? 'Hide activity sidebar' : 'Show activity sidebar'}
          title={sidebarOpen ? 'Hide activity' : 'Show activity'}
        >
          {sidebarOpen ? <SidebarCollapse width={16} height={16} /> : <SidebarExpand width={16} height={16} />}
        </button>
      </div>

      {/* Filter toolbar — show personal filters only when logged in */}
      <div className="flex items-center gap-1.5 mb-4">
        {(userId ? ['all', 'mine', 'shared', 'kids', 'adults'] : ['all', 'kids', 'adults']).map((filter) => (
          <button key={filter} onClick={() => setFilterBy(filter)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterBy === filter
                ? 'bg-[#1e3a5f] text-white'
                : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.06]'
            }`}>
            {filter === 'all' ? 'All' : filter === 'mine' ? 'My Items' : filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Main layout: list + optional sidebar */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Main list area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-auto">
          <SpotlightSearch existingItems={items} onAddItem={(name: string, category: string) => addItem(name, category as any, filterBy === 'mine')} />
          <div className="flex-1 overflow-auto mt-4">
            <PackingCategoryList
              orderedCategories={filteredOrderedCategories}
              itemsByCategory={filteredItemsByCategory}
              suggestionsByCategory={suggestionsByCategory}
              onToggle={togglePacked}
              onIncrementPacked={incrementPacked}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
              onAcceptSuggestion={acceptSuggestion}
              onDismissSuggestion={dismissSuggestion}
              isGenerating={isGenerating}
              onClaim={claimItem}
              onRelease={releaseItem}
              currentUserId={userId}
            />
          </div>
          {/* Suggest button */}
          <div className="py-3">
            <button
              onClick={generateSuggestions}
              disabled={isGenerating}
              className="flex items-center gap-1.5 text-xs text-[var(--cal-text-muted)] hover:text-[var(--cal-text)] transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparks width={14} height={14} />
              )}
              {isGenerating ? 'Generating...' : hasGenerated ? 'Suggest more' : 'Suggest items'}
            </button>
          </div>
        </div>

        {/* Collapsible activity sidebar */}
        {sidebarOpen && (
          <div className="w-72 shrink-0 border-l border-gray-200 dark:border-white/[0.08] pl-4 overflow-auto">
            <PackingActivityFeed entries={auditLog} currentUserId={userId} />
          </div>
        )}
      </div>
    </div>
  )
}
