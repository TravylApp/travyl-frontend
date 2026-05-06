'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import {
  usePackingList,
  usePackingSuggestions,
  useItineraryScreen,
  useAuthStore,
  supabase,
  seedDefaultPackingItems,
} from '@travyl/shared'
import { Module } from '@/components/trip/Module'
import { PackingListModule } from './PackingListModule'
import { PackingGlance } from './PackingGlance'
import { PackingSuggestions, SuggestionsHeaderAction } from './PackingSuggestions'
import { PackingActivityFeed } from './PackingActivityFeed'
import type { SpotlightSearchHandle } from './SpotlightSearch'

interface PackingPageProps {
  tripId: string
}

export function PackingPage({ tripId }: PackingPageProps) {
  const { user } = useAuthStore()
  const userId = user?.id
  const [filterBy, setFilterBy] = useState<string>('all')
  const { trip } = useItineraryScreen(tripId)
  const queryClient = useQueryClient()
  const searchRef = useRef<SpotlightSearchHandle>(null)

  const {
    items,
    filteredItems,
    auditLog,
    progress,
    isLoading,
    error,
    addItem,
    togglePacked,
    incrementPacked,
    updateQuantity,
    removeItem,
    claimItem,
    releaseItem,
  } = usePackingList(tripId, userId, filterBy)

  // Auto-seed default items once when the trip's packing_items table is empty.
  // Preserved verbatim from the previous version.
  const seedAttempted = useRef(false)
  useEffect(() => {
    if (seedAttempted.current) return
    if (isLoading || !trip || !userId || !tripId) return
    if (items.length > 0) { seedAttempted.current = true; return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (trip.trip_context as any) || {}
    if (ctx.packing_seeded) { seedAttempted.current = true; return }
    seedAttempted.current = true
    ;(async () => {
      try {
        const days = trip.start_date && trip.end_date
          ? Math.max(1, Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000))
          : (ctx.weather?.forecast?.length ?? 5)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const forecast: any[] = ctx.weather?.forecast ?? []
        const avgTemp = forecast.length > 0
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? forecast.reduce((sum: number, d: any) => sum + (d.high ?? 20), 0) / forecast.length
          : 20
        const isWarm = avgTemp > 22
        const isCold = avgTemp < 12
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  } = usePackingSuggestions(
    tripId,
    items,
    addItem as (name: string, category: string) => void,
  )

  // Compute itemsByCategory + ordered category list from filteredItems
  const filteredItemsByCategory: Record<string, typeof filteredItems> = {}
  for (const item of filteredItems) {
    if (!filteredItemsByCategory[item.category]) filteredItemsByCategory[item.category] = []
    filteredItemsByCategory[item.category].push(item)
  }
  const orderedCategories = Object.keys(filteredItemsByCategory)

  if (error) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-10 py-12">
        <Module title="Packing" description="Failed to load packing list.">
          <p className="text-sm text-red-500 dark:text-red-400">Try refreshing the page.</p>
        </Module>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-10 py-12">
        <Module title="Packing list" description="Loading…">
          <div className="h-40 animate-pulse bg-gray-100 dark:bg-white/[0.04] rounded-xl" />
        </Module>
      </div>
    )
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left column — packing list */}
        <div className="lg:col-span-7">
          <Module
            title="Packing list"
            description={progress.total > 0 ? `${progress.packed} of ${progress.total} items packed` : 'No items yet'}
            action={
              <button
                onClick={() => searchRef.current?.focus()}
                className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-[12px] font-semibold text-white shadow-sm hover:shadow-md transition-shadow"
                style={{ backgroundColor: 'var(--trip-base)' }}
              >
                <Plus size={13} /> Item
              </button>
            }
          >
            <div className="-mt-2 mb-5 flex items-center gap-3 text-[11px] text-gray-500">
              <div className="flex-1 h-[4px] rounded-full bg-[#f0eee9] dark:bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%`, backgroundColor: 'var(--trip-base)' }}
                />
              </div>
              <span className="font-semibold tabular-nums text-[var(--trip-base)]">{progress.percent}%</span>
            </div>

            <PackingListModule
              ref={searchRef}
              filterBy={filterBy}
              onFilterChange={setFilterBy}
              isLoggedIn={!!userId}
              existingItems={items}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onAddItem={(name: string, category: string) => addItem(name, category as any, filterBy === 'mine')}
              orderedCategories={orderedCategories}
              itemsByCategory={filteredItemsByCategory}
              onToggle={togglePacked}
              onIncrementPacked={incrementPacked}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
              onClaim={claimItem}
              onRelease={releaseItem}
              currentUserId={userId}
            />
          </Module>
        </div>

        {/* Right column — sticky stack */}
        <div className="lg:col-span-5 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto space-y-6 lg:space-y-8">
          <Module title="At a glance" titleSize="sm">
            <PackingGlance
              trip={trip}
              packed={progress.packed}
              total={progress.total}
              percent={progress.percent}
            />
          </Module>

          <Module
            title="Suggestions"
            description="From AI based on your trip"
            titleSize="sm"
            action={<SuggestionsHeaderAction onGenerate={generateSuggestions} isGenerating={isGenerating} />}
          >
            <PackingSuggestions
              suggestionsByCategory={suggestionsByCategory}
              isGenerating={isGenerating}
              hasGenerated={hasGenerated}
              onAccept={acceptSuggestion}
              onDismiss={dismissSuggestion}
            />
          </Module>

          <Module
            title="Activity"
            titleSize="sm"
            description={auditLog.length > 0 ? `Last ${Math.min(auditLog.length, 6)} of ${auditLog.length}` : undefined}
          >
            <PackingActivityFeed entries={auditLog} currentUserId={userId} />
          </Module>
        </div>
      </div>
    </div>
  )
}
